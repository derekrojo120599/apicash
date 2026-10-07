-- ==============================================================================
-- Migración: Partida doble para transferencias internas (traspasos entre cuentas)
-- Evita inflar ingresos y gastos operativos manteniendo la integridad del saldo_cache
-- ==============================================================================

-- 1. Agregar columnas para la vinculación y dirección de transferencias
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS transferencia_vinculada_id UUID REFERENCES transacciones(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  ADD COLUMN IF NOT EXISTS transferencia_direccion VARCHAR(10) CHECK (transferencia_direccion IS NULL OR transferencia_direccion IN ('salida', 'entrada')),
  ADD COLUMN IF NOT EXISTS cuenta_destino_id UUID REFERENCES cuentas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacciones_transferencia_vinculada ON transacciones(transferencia_vinculada_id);

-- 2. Actualizar la función trigger del saldo_cache para contemplar 'transferencia'
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Actualizar cuenta afectada en NEW (INSERT o UPDATE)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.cuenta_id IS NOT NULL THEN
    UPDATE cuentas
    SET saldo_cache = (
      SELECT COALESCE(SUM(
        CASE
          WHEN tipo = 'ingreso' THEN monto_original
          WHEN tipo = 'ajuste' THEN monto_original
          WHEN tipo = 'gasto' THEN -monto_original
          WHEN tipo = 'transferencia' AND transferencia_direccion = 'entrada' THEN monto_original
          WHEN tipo = 'transferencia' AND transferencia_direccion = 'salida' THEN -monto_original
          ELSE 0
        END
      ), 0)
      FROM transacciones
      WHERE cuenta_id = NEW.cuenta_id
        AND anulada = false
    )
    WHERE id = NEW.cuenta_id;
  END IF;

  -- 2. Si cambió la cuenta o se eliminó la fila, actualizar la cuenta en OLD
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.cuenta_id IS DISTINCT FROM NEW.cuenta_id)) AND OLD.cuenta_id IS NOT NULL THEN
    UPDATE cuentas
    SET saldo_cache = (
      SELECT COALESCE(SUM(
        CASE
          WHEN tipo = 'ingreso' THEN monto_original
          WHEN tipo = 'ajuste' THEN monto_original
          WHEN tipo = 'gasto' THEN -monto_original
          WHEN tipo = 'transferencia' AND transferencia_direccion = 'entrada' THEN monto_original
          WHEN tipo = 'transferencia' AND transferencia_direccion = 'salida' THEN -monto_original
          ELSE 0
        END
      ), 0)
      FROM transacciones
      WHERE cuenta_id = OLD.cuenta_id
        AND anulada = false
    )
    WHERE id = OLD.cuenta_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- 3. Trigger para anular / restaurar atómicamente la contraparte vinculada
CREATE OR REPLACE FUNCTION sincronizar_anulacion_transferencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.anulada IS DISTINCT FROM OLD.anulada AND NEW.transferencia_vinculada_id IS NOT NULL THEN
    UPDATE transacciones
    SET anulada = NEW.anulada
    WHERE id = NEW.transferencia_vinculada_id
      AND anulada IS DISTINCT FROM NEW.anulada;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_sincronizar_anulacion_transferencia ON transacciones;
CREATE TRIGGER trg_sincronizar_anulacion_transferencia
AFTER UPDATE OF anulada ON transacciones
FOR EACH ROW
WHEN (NEW.tipo = 'transferencia')
EXECUTE FUNCTION sincronizar_anulacion_transferencia();

-- 4. RPC atómica para registrar transferencias internas
CREATE OR REPLACE FUNCTION registrar_transferencia(
  p_cuenta_origen_id UUID,
  p_cuenta_destino_id UUID,
  p_monto NUMERIC,
  p_moneda moneda_enum,
  p_descripcion TEXT DEFAULT NULL,
  p_fecha TIMESTAMPTZ DEFAULT NULL,
  p_tasa_cambio NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_fecha TIMESTAMPTZ := COALESCE(p_fecha, now());
  v_tx_origen_id UUID := gen_random_uuid();
  v_tx_destino_id UUID := gen_random_uuid();
  v_cta_origen RECORD;
  v_cta_destino RECORD;
  v_desc_origen TEXT;
  v_desc_destino TEXT;
  -- Variables para cálculo multimoneda si difieren
  v_monto_destino NUMERIC := p_monto;
  v_moneda_destino moneda_enum := p_moneda;
  v_tasa_efectiva NUMERIC := p_tasa_cambio;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_cuenta_origen_id = p_cuenta_destino_id THEN RAISE EXCEPTION 'La cuenta origen y destino deben ser distintas'; END IF;
  IF p_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor a cero'; END IF;

  -- Bloqueo ordenado por ID para prevenir condiciones de carrera y deadlocks
  PERFORM 1 FROM cuentas
  WHERE id IN (p_cuenta_origen_id, p_cuenta_destino_id) AND user_id = v_user_id
  ORDER BY id
  FOR UPDATE;

  SELECT id, nombre, moneda, saldo_cache, activa INTO v_cta_origen
  FROM cuentas WHERE id = p_cuenta_origen_id AND user_id = v_user_id;
  IF NOT FOUND OR NOT v_cta_origen.activa THEN RAISE EXCEPTION 'Cuenta origen inválida o inactiva'; END IF;

  SELECT id, nombre, moneda, activa INTO v_cta_destino
  FROM cuentas WHERE id = p_cuenta_destino_id AND user_id = v_user_id;
  IF NOT FOUND OR NOT v_cta_destino.activa THEN RAISE EXCEPTION 'Cuenta destino inválida o inactiva'; END IF;

  -- Validar que la moneda indicada coincida con la cuenta de origen
  IF v_cta_origen.moneda != p_moneda THEN
    RAISE EXCEPTION 'La moneda de la transferencia debe coincidir con la de la cuenta origen';
  END IF;

  IF v_cta_origen.saldo_cache < p_monto THEN
    RAISE EXCEPTION 'Saldo insuficiente en la cuenta de origen';
  END IF;

  -- Manejo de monedas: misma moneda o multimoneda con conversión
  IF v_cta_origen.moneda = v_cta_destino.moneda THEN
    v_monto_destino := p_monto;
    v_moneda_destino := v_cta_destino.moneda;
  ELSE
    -- Cuentas con distinta moneda (USD <-> VES)
    IF v_tasa_efectiva IS NULL OR v_tasa_efectiva <= 0 THEN
      -- Buscar tasa preferida o más reciente si no fue provista
      SELECT t.tasa INTO v_tasa_efectiva
      FROM tasas_cambio t
      JOIN perfiles p ON p.id = v_user_id AND p.fuente_tasa_preferida = t.fuente
      ORDER BY t.fecha DESC
      LIMIT 1;

      IF v_tasa_efectiva IS NULL THEN
        SELECT tasa INTO v_tasa_efectiva FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
      END IF;

      IF v_tasa_efectiva IS NULL OR v_tasa_efectiva <= 0 THEN
        RAISE EXCEPTION 'Se requiere una tasa de cambio válida para transferencias entre distintas monedas';
      END IF;
    END IF;

    IF v_cta_origen.moneda = 'USD' AND v_cta_destino.moneda = 'VES' THEN
      -- Origen USD, Destino VES: multiplicar por la tasa
      v_monto_destino := ROUND(p_monto * v_tasa_efectiva, 2);
      v_moneda_destino := 'VES';
    ELSIF v_cta_origen.moneda = 'VES' AND v_cta_destino.moneda = 'USD' THEN
      -- Origen VES, Destino USD: dividir entre la tasa
      v_monto_destino := ROUND(p_monto / v_tasa_efectiva, 2);
      v_moneda_destino := 'USD';
    END IF;
  END IF;

  v_desc_origen := COALESCE(NULLIF(p_descripcion, ''), 'Transferencia a ' || v_cta_destino.nombre);
  v_desc_destino := COALESCE(NULLIF(p_descripcion, ''), 'Transferencia desde ' || v_cta_origen.nombre);

  -- 1. Pierna Saliente (Origen) - primero sin vincular para evitar aborto de FK
  INSERT INTO transacciones (
    id, user_id, cuenta_id, cuenta_destino_id, transferencia_vinculada_id,
    tipo, transferencia_direccion, monto_original, moneda_original,
    tasa_al_momento, descripcion, fecha
  ) VALUES (
    v_tx_origen_id, v_user_id, p_cuenta_origen_id, p_cuenta_destino_id, NULL,
    'transferencia', 'salida', p_monto, p_moneda,
    v_tasa_efectiva, v_desc_origen, v_fecha
  );

  -- 2. Pierna Entrante (Destino) - vinculando a la pierna origen ya insertada
  INSERT INTO transacciones (
    id, user_id, cuenta_id, cuenta_destino_id, transferencia_vinculada_id,
    tipo, transferencia_direccion, monto_original, moneda_original,
    tasa_al_momento, descripcion, fecha
  ) VALUES (
    v_tx_destino_id, v_user_id, p_cuenta_destino_id, p_cuenta_origen_id, v_tx_origen_id,
    'transferencia', 'entrada', v_monto_destino, v_moneda_destino,
    v_tasa_efectiva, v_desc_destino, v_fecha
  );

  -- 3. Vincular de vuelta la pierna de origen con la de destino
  UPDATE transacciones
  SET transferencia_vinculada_id = v_tx_destino_id
  WHERE id = v_tx_origen_id;

  RETURN jsonb_build_object(
    'origen_id', v_tx_origen_id,
    'destino_id', v_tx_destino_id,
    'monto_origen', p_monto,
    'moneda_origen', p_moneda,
    'monto_destino', v_monto_destino,
    'moneda_destino', v_moneda_destino,
    'tasa_cambio', v_tasa_efectiva
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_transferencia(UUID, UUID, NUMERIC, moneda_enum, TEXT, TIMESTAMPTZ, NUMERIC) TO authenticated;
NOTIFY pgrst, 'reload schema';
