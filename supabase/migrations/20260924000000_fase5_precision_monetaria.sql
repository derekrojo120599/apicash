-- Migration Phase 5: Precision Monetaria
ALTER TABLE transacciones ALTER COLUMN tasa_al_momento TYPE NUMERIC(20,8);
ALTER TABLE transacciones ALTER COLUMN monto_usd_calculado TYPE NUMERIC(20,6);
ALTER TABLE tasas_cambio ALTER COLUMN tasa TYPE NUMERIC(20,8);
ALTER TABLE snapshots_mensuales ALTER COLUMN balance_neto_usd TYPE NUMERIC(20,6);
ALTER TABLE snapshots_mensuales ALTER COLUMN ahorros_acumulados_usd TYPE NUMERIC(20,6);
ALTER TABLE snapshots_mensuales ALTER COLUMN deuda_acumulada_usd TYPE NUMERIC(20,6);
ALTER TABLE snapshots_mensuales ALTER COLUMN tasa_cierre TYPE NUMERIC(20,8);

CREATE OR REPLACE FUNCTION calcular_monto_usd()
RETURNS TRIGGER AS $$
DECLARE
  tasa_actual NUMERIC(20,8);
BEGIN
  IF NEW.moneda_original = 'USD' THEN
    NEW.monto_usd_calculado := NEW.monto_original;
    NEW.tasa_al_momento := NULL;
  ELSE
    IF NEW.tasa_al_momento IS NULL THEN
      -- Intentar usar la fuente preferida del usuario
      SELECT t.tasa INTO tasa_actual
      FROM tasas_cambio t
      JOIN perfiles p ON p.id = NEW.user_id AND p.fuente_tasa_preferida = t.fuente
      ORDER BY t.fecha DESC
      LIMIT 1;

      -- Fallback: cualquier tasa más reciente
      IF tasa_actual IS NULL THEN
        SELECT tasa INTO tasa_actual FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
      END IF;

      IF tasa_actual IS NULL THEN
        RAISE EXCEPTION 'No hay tasa de cambio disponible. Contacte soporte.';
      END IF;
      NEW.tasa_al_momento := tasa_actual;
    END IF;
    NEW.monto_usd_calculado := NEW.monto_original / NEW.tasa_al_momento;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION obtener_balance_neto(p_user_id UUID)
RETURNS TABLE(
  usd_fijo NUMERIC,
  ves_total NUMERIC,
  ves_en_usd NUMERIC,
  balance_neto NUMERIC,
  tasa_usada NUMERIC,
  tasa_fecha TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tasa NUMERIC(20,8);
  v_tasa_fecha TIMESTAMPTZ;
  v_usd NUMERIC;
  v_ves NUMERIC;
BEGIN
  -- Intentar usar la fuente preferida del usuario
  SELECT t.tasa, t.fecha INTO v_tasa, v_tasa_fecha
  FROM tasas_cambio t
  JOIN perfiles p ON p.id = p_user_id AND p.fuente_tasa_preferida = t.fuente
  ORDER BY t.fecha DESC
  LIMIT 1;

  -- Fallback: cualquier tasa más reciente
  IF v_tasa IS NULL THEN
    SELECT tasa, fecha INTO v_tasa, v_tasa_fecha
    FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
  END IF;

  SELECT COALESCE(SUM(saldo_cache), 0) INTO v_usd
  FROM cuentas WHERE user_id = p_user_id AND moneda = 'USD' AND activa = true;

  SELECT COALESCE(SUM(saldo_cache), 0) INTO v_ves
  FROM cuentas WHERE user_id = p_user_id AND moneda = 'VES' AND activa = true;

  RETURN QUERY SELECT
    v_usd,
    v_ves,
    ROUND(v_ves / NULLIF(v_tasa, 0), 6),
    ROUND(v_usd + (v_ves / NULLIF(v_tasa, 0)), 6),
    v_tasa,
    v_tasa_fecha;
END;
$$ LANGUAGE plpgsql;

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
    user_id, cuenta_id, categoria_id, tipo, monto_original, moneda_original, fecha, descripcion
  ) VALUES (
    v_user_id, p_cuenta_id, p_categoria_id, 'gasto', p_monto, p_moneda_original, p_fecha, 'Aporte a meta de ahorro'
  );
END;
$$ LANGUAGE plpgsql;

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
    user_id, cuenta_id, categoria_id, tipo, monto_original, moneda_original, fecha, descripcion
  ) VALUES (
    v_user_id, p_cuenta_id, p_categoria_id, 'gasto', p_monto, p_moneda_original, p_fecha, 'Pago de deuda'
  );
END;
$$ LANGUAGE plpgsql;

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
    user_id, cuenta_id, categoria_id, tipo, monto_original, moneda_original, fecha, descripcion
  ) VALUES (
    v_user_id, p_cuenta_id, p_categoria_id, 'ajuste', p_monto, p_moneda_original, p_fecha, p_descripcion
  );
END;
$$ LANGUAGE plpgsql;

