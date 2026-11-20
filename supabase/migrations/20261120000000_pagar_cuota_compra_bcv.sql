-- ==============================================================================
-- Pago de cuotas de compras a credito (Cashea / Krece)
--
-- Regla de negocio: las cuotas se pagan SIEMPRE en bolivares (VES) desde una
-- cuenta en VES. Cualquier equivalencia USD dentro de esta seccion usa la tasa
-- oficial BCV ('Banco Central de Venezuela'), independientemente de la fuente
-- de tasa preferida del perfil del usuario.
--
-- La transaccion se inserta con tipo 'gasto' y compra_credito_id vinculado,
-- por lo que el trigger trg_actualizar_saldo mantiene el saldo_cache al dia.
-- El trigger trg_calcular_usd respeta la tasa_al_momento que le pasamos (BCV),
-- por lo que monto_usd_calculado queda siempre a tasa BCV.
-- ==============================================================================

CREATE OR REPLACE FUNCTION pagar_cuota_compra(
  p_cuota_id UUID,
  p_cuenta_id UUID,
  p_categoria_id UUID DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cuota cuotas_compra%ROWTYPE;
  v_compra compras_credito%ROWTYPE;
  v_cuenta cuentas%ROWTYPE;
  v_tasa_bcv NUMERIC(18,4);
  v_monto_pagado NUMERIC(18,2);
  v_monto_usd NUMERIC(18,2);
  v_txn_id UUID;
  v_saldo_restante NUMERIC(18,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_cuota FROM cuotas_compra WHERE id = p_cuota_id;
  IF v_cuota IS NULL OR v_cuota.user_id != v_user_id THEN
    RAISE EXCEPTION 'Cuota no encontrada o sin permiso';
  END IF;
  IF v_cuota.estado != 'pendiente' THEN
    RAISE EXCEPTION 'La cuota ya fue pagada';
  END IF;

  SELECT * INTO v_compra FROM compras_credito WHERE id = v_cuota.compra_credito_id;
  IF v_compra IS NULL OR v_compra.user_id != v_user_id THEN
    RAISE EXCEPTION 'Compra no encontrada o sin permiso';
  END IF;

  SELECT * INTO v_cuenta FROM cuentas WHERE id = p_cuenta_id;
  IF v_cuenta IS NULL OR v_cuenta.user_id != v_user_id THEN
    RAISE EXCEPTION 'Cuenta no encontrada o sin permiso';
  END IF;
  IF v_cuenta.moneda != 'VES' THEN
    RAISE EXCEPTION 'Las cuotas se pagan en bolivares: selecciona una cuenta en VES';
  END IF;

  -- Tasa oficial BCV. Fallback: la ultima tasa disponible cuando la fuente
  -- BCV todavia no tenga registros en tasas_cambio.
  SELECT tasa INTO v_tasa_bcv
  FROM tasas_cambio
  WHERE fuente = 'Banco Central de Venezuela'
  ORDER BY fecha DESC
  LIMIT 1;

  IF v_tasa_bcv IS NULL THEN
    SELECT tasa INTO v_tasa_bcv FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
  END IF;
  IF v_tasa_bcv IS NULL THEN
    RAISE EXCEPTION 'No hay tasa BCV disponible para la conversion';
  END IF;

  IF v_compra.moneda = 'USD' THEN
    -- Cuota definida en USD: se paga en Bs a tasa BCV
    v_monto_pagado := ROUND(v_cuota.monto * v_tasa_bcv, 2);
    v_monto_usd := v_cuota.monto;
  ELSE
    -- Cuota definida en Bs (Cashea / Krece)
    v_monto_pagado := v_cuota.monto;
    v_monto_usd := ROUND(v_cuota.monto / v_tasa_bcv, 2);
  END IF;

  INSERT INTO transacciones (
    user_id, cuenta_id, categoria_id, tipo,
    monto_original, moneda_original,
    tasa_al_momento, monto_usd_calculado,
    descripcion, fecha, compra_credito_id
  )
  VALUES (
    v_user_id,
    p_cuenta_id,
    COALESCE(p_categoria_id, v_compra.categoria_id),
    'gasto',
    v_monto_pagado,
    'VES',
    v_tasa_bcv,
    v_monto_usd,
    'Cuota ' || v_cuota.numero_cuota || '/' || v_compra.numero_cuotas || ' - ' || v_compra.comercio,
    now(),
    v_compra.id
  )
  RETURNING id INTO v_txn_id;

  UPDATE cuotas_compra
  SET estado = 'pagada',
      fecha_pago = now(),
      transaccion_id = v_txn_id
  WHERE id = p_cuota_id;

  v_saldo_restante := GREATEST(v_compra.saldo_pendiente - v_cuota.monto, 0);

  UPDATE compras_credito
  SET saldo_pendiente = v_saldo_restante,
      estado = CASE WHEN v_saldo_restante <= 0 THEN 'completada' ELSE estado END
  WHERE id = v_compra.id;
END;
$$ LANGUAGE plpgsql;
