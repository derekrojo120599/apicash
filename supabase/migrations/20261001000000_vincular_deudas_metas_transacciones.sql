-- ==============================================================================
-- Migración: Sincronización y reversión automática de Deudas y Metas de Ahorro
-- al anular o restaurar transacciones asociadas.
-- ==============================================================================

-- 1. Añadir columnas de vinculación en transacciones
ALTER TABLE transacciones 
ADD COLUMN IF NOT EXISTS deuda_id UUID REFERENCES deudas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS meta_id UUID REFERENCES metas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS monto_impacto_auxiliar NUMERIC(20,6);

CREATE INDEX IF NOT EXISTS idx_transacciones_deuda_id ON transacciones(deuda_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_meta_id ON transacciones(meta_id);

-- 2. Función Trigger para sincronizar saldos de Deudas y Metas al anular/restaurar
CREATE OR REPLACE FUNCTION sincronizar_saldo_auxiliar_transaccion()
RETURNS TRIGGER AS $$
DECLARE
  v_impacto NUMERIC;
BEGIN
  -- Solo actuar si el estado de anulación cambió
  IF (TG_OP = 'UPDATE' AND OLD.anulada IS DISTINCT FROM NEW.anulada) THEN
    v_impacto := COALESCE(NEW.monto_impacto_auxiliar, NEW.monto_original);

    -- Caso A: Transacción vinculada a una DEUDA
    IF NEW.deuda_id IS NOT NULL THEN
      IF NEW.anulada = true THEN
        -- Se anula el pago: restaurar (aumentar) el saldo pendiente de la deuda
        UPDATE deudas
        SET saldo_pendiente = saldo_pendiente + v_impacto
        WHERE id = NEW.deuda_id;
      ELSE
        -- Se restaura el pago: volver a descontar de la deuda
        UPDATE deudas
        SET saldo_pendiente = GREATEST(saldo_pendiente - v_impacto, 0)
        WHERE id = NEW.deuda_id;
      END IF;
    END IF;

    -- Caso B: Transacción vinculada a una META DE AHORRO
    IF NEW.meta_id IS NOT NULL THEN
      -- Si era un aporte (gasto)
      IF NEW.tipo = 'gasto' THEN
        IF NEW.anulada = true THEN
          -- Se anula el aporte: restar el monto de la meta
          UPDATE metas
          SET monto_actual = GREATEST(monto_actual - v_impacto, 0)
          WHERE id = NEW.meta_id;
        ELSE
          -- Se restaura el aporte: volver a sumar a la meta
          UPDATE metas
          SET monto_actual = monto_actual + v_impacto
          WHERE id = NEW.meta_id;
        END IF;

      -- Si era un retiro de ahorro (ajuste/ingreso a cuenta)
      ELSIF NEW.tipo = 'ajuste' OR NEW.tipo = 'ingreso' THEN
        IF NEW.anulada = true THEN
          -- Se anula el retiro: devolver el dinero a la meta
          UPDATE metas
          SET monto_actual = monto_actual + v_impacto
          WHERE id = NEW.meta_id;
        ELSE
          -- Se restaura el retiro: volver a descontar de la meta
          UPDATE metas
          SET monto_actual = GREATEST(monto_actual - v_impacto, 0)
          WHERE id = NEW.meta_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sincronizar_saldo_auxiliar ON transacciones;

CREATE TRIGGER trg_sincronizar_saldo_auxiliar
AFTER UPDATE OF anulada ON transacciones
FOR EACH ROW EXECUTE FUNCTION sincronizar_saldo_auxiliar_transaccion();

-- 3. Actualizar registrar_pago_deuda para registrar deuda_id y monto_impacto_auxiliar
CREATE OR REPLACE FUNCTION registrar_pago_deuda(
  p_deuda_id UUID,
  p_cuenta_id UUID,
  p_categoria_id UUID,
  p_monto NUMERIC,
  p_moneda_original moneda_enum,
  p_fecha TIMESTAMPTZ
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_deuda RECORD;
  v_cuenta_owner UUID;
  v_tasa NUMERIC(20,8);
  v_monto_convertido NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_deuda FROM deudas WHERE id = p_deuda_id;
  IF v_deuda IS NULL OR v_deuda.user_id != v_user_id THEN
    RAISE EXCEPTION 'Deuda no encontrada o sin permiso';
  END IF;

  SELECT user_id INTO v_cuenta_owner FROM cuentas WHERE id = p_cuenta_id;
  IF v_cuenta_owner IS NULL OR v_cuenta_owner != v_user_id THEN
    RAISE EXCEPTION 'Cuenta no encontrada o sin permiso';
  END IF;

  IF p_moneda_original = v_deuda.moneda THEN
    v_monto_convertido := p_monto;
  ELSE
    SELECT t.tasa INTO v_tasa
    FROM tasas_cambio t
    JOIN perfiles p ON p.id = v_user_id AND p.fuente_tasa_preferida = t.fuente
    ORDER BY t.fecha DESC
    LIMIT 1;

    IF v_tasa IS NULL THEN
      SELECT tasa INTO v_tasa FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
    END IF;

    IF v_tasa IS NULL THEN
      RAISE EXCEPTION 'No hay tasa de cambio disponible para la conversión';
    END IF;

    IF p_moneda_original = 'USD' AND v_deuda.moneda = 'VES' THEN
      v_monto_convertido := p_monto * v_tasa;
    ELSIF p_moneda_original = 'VES' AND v_deuda.moneda = 'USD' THEN
      v_monto_convertido := p_monto / v_tasa;
    END IF;
  END IF;

  UPDATE deudas
  SET saldo_pendiente = GREATEST(saldo_pendiente - v_monto_convertido, 0)
  WHERE id = p_deuda_id;

  INSERT INTO transacciones (
    user_id, cuenta_id, categoria_id, tipo, monto_original, moneda_original, fecha, descripcion, deuda_id, monto_impacto_auxiliar
  ) VALUES (
    v_user_id, p_cuenta_id, p_categoria_id, 'gasto', p_monto, p_moneda_original, p_fecha, 'Pago de deuda', p_deuda_id, v_monto_convertido
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Actualizar registrar_aporte_meta para registrar meta_id y monto_impacto_auxiliar
CREATE OR REPLACE FUNCTION registrar_aporte_meta(
  p_meta_id UUID,
  p_cuenta_id UUID,
  p_categoria_id UUID,
  p_monto NUMERIC,
  p_moneda_original moneda_enum,
  p_fecha TIMESTAMPTZ
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_meta RECORD;
  v_cuenta_owner UUID;
  v_tasa NUMERIC(20,8);
  v_monto_convertido NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_meta FROM metas WHERE id = p_meta_id;
  IF v_meta IS NULL OR v_meta.user_id != v_user_id THEN
    RAISE EXCEPTION 'Meta no encontrada o sin permiso';
  END IF;

  SELECT user_id INTO v_cuenta_owner FROM cuentas WHERE id = p_cuenta_id;
  IF v_cuenta_owner IS NULL OR v_cuenta_owner != v_user_id THEN
    RAISE EXCEPTION 'Cuenta no encontrada o sin permiso';
  END IF;

  IF p_moneda_original = v_meta.moneda THEN
    v_monto_convertido := p_monto;
  ELSE
    SELECT t.tasa INTO v_tasa
    FROM tasas_cambio t
    JOIN perfiles p ON p.id = v_user_id AND p.fuente_tasa_preferida = t.fuente
    ORDER BY t.fecha DESC
    LIMIT 1;

    IF v_tasa IS NULL THEN
      SELECT tasa INTO v_tasa FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
    END IF;

    IF v_tasa IS NULL THEN
      RAISE EXCEPTION 'No hay tasa de cambio disponible para la conversión';
    END IF;

    IF p_moneda_original = 'USD' AND v_meta.moneda = 'VES' THEN
      v_monto_convertido := p_monto * v_tasa;
    ELSIF p_moneda_original = 'VES' AND v_meta.moneda = 'USD' THEN
      v_monto_convertido := p_monto / v_tasa;
    END IF;
  END IF;

  UPDATE metas
  SET monto_actual = monto_actual + v_monto_convertido
  WHERE id = p_meta_id;

  INSERT INTO transacciones (
    user_id, cuenta_id, categoria_id, tipo, monto_original, moneda_original, fecha, descripcion, meta_id, monto_impacto_auxiliar
  ) VALUES (
    v_user_id, p_cuenta_id, p_categoria_id, 'gasto', p_monto, p_moneda_original, p_fecha, 'Aporte a meta de ahorro', p_meta_id, v_monto_convertido
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar retirar_ahorro para registrar meta_id y monto_impacto_auxiliar
CREATE OR REPLACE FUNCTION retirar_ahorro(
  p_meta_id UUID,
  p_cuenta_id UUID,
  p_categoria_id UUID,
  p_monto NUMERIC,
  p_moneda_original moneda_enum,
  p_fecha TIMESTAMPTZ,
  p_descripcion TEXT DEFAULT 'Retiro de ahorro'
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_meta RECORD;
  v_cuenta_owner UUID;
  v_tasa NUMERIC(20,8);
  v_monto_convertido NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_meta FROM metas WHERE id = p_meta_id;
  IF v_meta IS NULL OR v_meta.user_id != v_user_id THEN
    RAISE EXCEPTION 'Meta no encontrada o sin permiso';
  END IF;

  SELECT user_id INTO v_cuenta_owner FROM cuentas WHERE id = p_cuenta_id;
  IF v_cuenta_owner IS NULL OR v_cuenta_owner != v_user_id THEN
    RAISE EXCEPTION 'Cuenta no encontrada o sin permiso';
  END IF;

  IF p_moneda_original = v_meta.moneda THEN
    v_monto_convertido := p_monto;
  ELSE
    SELECT t.tasa INTO v_tasa
    FROM tasas_cambio t
    JOIN perfiles p ON p.id = v_user_id AND p.fuente_tasa_preferida = t.fuente
    ORDER BY t.fecha DESC
    LIMIT 1;

    IF v_tasa IS NULL THEN
      SELECT tasa INTO v_tasa FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
    END IF;

    IF v_tasa IS NULL THEN
      RAISE EXCEPTION 'No hay tasa de cambio disponible para la conversión';
    END IF;

    IF p_moneda_original = 'USD' AND v_meta.moneda = 'VES' THEN
      v_monto_convertido := p_monto * v_tasa;
    ELSIF p_moneda_original = 'VES' AND v_meta.moneda = 'USD' THEN
      v_monto_convertido := p_monto / v_tasa;
    END IF;
  END IF;

  IF v_meta.monto_actual < v_monto_convertido THEN
    RAISE EXCEPTION 'Fondos insuficientes en la meta';
  END IF;

  UPDATE metas
  SET monto_actual = GREATEST(v_meta.monto_actual - v_monto_convertido, 0)
  WHERE id = p_meta_id;

  INSERT INTO transacciones (
    user_id, cuenta_id, categoria_id, tipo, monto_original, moneda_original, fecha, descripcion, meta_id, monto_impacto_auxiliar
  ) VALUES (
    v_user_id, p_cuenta_id, p_categoria_id, 'ajuste', p_monto, p_moneda_original, p_fecha, p_descripcion, p_meta_id, v_monto_convertido
  );
END;
$$ LANGUAGE plpgsql;
