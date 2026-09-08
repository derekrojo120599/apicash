# Esquema de Base de Datos — Supabase (v1)

Ejecutar en el SQL Editor de Supabase, en orden. Todo el dinero se maneja como `NUMERIC`, nunca `FLOAT`.

## 1. Enums

```sql
CREATE TYPE moneda_enum AS ENUM ('USD', 'VES');
CREATE TYPE tipo_cuenta_enum AS ENUM ('banco', 'efectivo', 'exchange', 'billetera_digital');
CREATE TYPE tipo_transaccion_enum AS ENUM ('ingreso', 'gasto', 'transferencia', 'ajuste');
CREATE TYPE categoria_tipo_enum AS ENUM ('gasto', 'ingreso', 'ahorro', 'deuda');
```

## 2. Tablas

```sql
-- Perfiles (metadata de usuario)
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT,
  moneda_principal moneda_enum NOT NULL DEFAULT 'USD',
  onboarding_completado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuentas
CREATE TABLE cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  tipo tipo_cuenta_enum NOT NULL,
  moneda moneda_enum NOT NULL,
  saldo_cache NUMERIC(18,2) NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorías
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  tipo categoria_tipo_enum NOT NULL,
  icono TEXT
);

-- Transacciones (núcleo del sistema)
CREATE TABLE transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cuenta_id UUID NOT NULL REFERENCES cuentas(id),
  categoria_id UUID REFERENCES categorias(id),
  tipo tipo_transaccion_enum NOT NULL,
  monto_original NUMERIC(18,2) NOT NULL,
  moneda_original moneda_enum NOT NULL,
  tasa_al_momento NUMERIC(18,4),
  monto_usd_calculado NUMERIC(18,2) NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  anulada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT monto_positivo CHECK (monto_original > 0)
);

-- Tasas de cambio (histórico + auditoría)
CREATE TABLE tasas_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasa NUMERIC(18,4) NOT NULL,
  fuente TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deudas
CREATE TABLE deudas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  monto_total NUMERIC(18,2) NOT NULL,
  moneda moneda_enum NOT NULL,
  saldo_pendiente NUMERIC(18,2) NOT NULL,
  fecha_limite DATE
);

-- Metas de ahorro
CREATE TABLE metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  monto_objetivo NUMERIC(18,2) NOT NULL,
  monto_actual NUMERIC(18,2) NOT NULL DEFAULT 0,
  moneda moneda_enum NOT NULL,
  fecha_objetivo DATE
);

-- Presupuesto programado por categoría
CREATE TABLE presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  monto_planeado NUMERIC(18,2) NOT NULL,
  moneda moneda_enum NOT NULL DEFAULT 'USD',
  mes DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, categoria_id, mes)
);

-- Snapshots mensuales (cierre de mes)
CREATE TABLE snapshots_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  mes DATE NOT NULL,
  balance_neto_usd NUMERIC(18,2) NOT NULL,
  ahorros_acumulados_usd NUMERIC(18,2) NOT NULL,
  deuda_acumulada_usd NUMERIC(18,2) NOT NULL,
  tasa_cierre NUMERIC(18,4) NOT NULL,
  UNIQUE(user_id, mes)
);
```

## 3. Índices

```sql
CREATE INDEX idx_transacciones_user_fecha ON transacciones(user_id, fecha);
CREATE INDEX idx_transacciones_cuenta ON transacciones(cuenta_id);
CREATE INDEX idx_tasas_cambio_fecha ON tasas_cambio(fecha DESC);
```

## 4. Constraint de integridad adicional

```sql
ALTER TABLE transacciones
  ADD CONSTRAINT tasa_requerida_si_ves
  CHECK (moneda_original = 'USD' OR tasa_al_momento IS NOT NULL);
```

## 5. RLS — Habilitar en todas las tablas

```sql
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasas_cambio ENABLE ROW LEVEL SECURITY;
```

## 6. Políticas RLS (patrón estándar por tabla con user_id)

```sql
-- Perfiles (solo select/update, no insert/delete directo del cliente)
CREATE POLICY "usuarios_ven_su_perfil" ON perfiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "usuarios_actualizan_su_perfil" ON perfiles FOR UPDATE USING (auth.uid() = id);

-- Cuentas
CREATE POLICY "usuarios_ven_su_cuentas" ON cuentas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_insertan_su_cuentas" ON cuentas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_actualizan_su_cuentas" ON cuentas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borran_su_cuentas" ON cuentas FOR DELETE USING (auth.uid() = user_id);

-- Categorías
CREATE POLICY "usuarios_ven_su_categorias" ON categorias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_insertan_su_categorias" ON categorias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_actualizan_su_categorias" ON categorias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borran_su_categorias" ON categorias FOR DELETE USING (auth.uid() = user_id);

-- Transacciones
CREATE POLICY "usuarios_ven_su_transacciones" ON transacciones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_insertan_su_transacciones" ON transacciones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_actualizan_su_transacciones" ON transacciones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borran_su_transacciones" ON transacciones FOR DELETE USING (auth.uid() = user_id);

-- Deudas
CREATE POLICY "usuarios_ven_su_deudas" ON deudas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_insertan_su_deudas" ON deudas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_actualizan_su_deudas" ON deudas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borran_su_deudas" ON deudas FOR DELETE USING (auth.uid() = user_id);

-- Metas
CREATE POLICY "usuarios_ven_su_metas" ON metas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_insertan_su_metas" ON metas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_actualizan_su_metas" ON metas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borran_su_metas" ON metas FOR DELETE USING (auth.uid() = user_id);

-- Presupuestos
CREATE POLICY "usuarios_ven_su_presupuestos" ON presupuestos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_insertan_su_presupuestos" ON presupuestos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_actualizan_su_presupuestos" ON presupuestos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_borran_su_presupuestos" ON presupuestos FOR DELETE USING (auth.uid() = user_id);

-- Snapshots mensuales (solo lectura del cliente; se escriben vía función SECURITY DEFINER)
CREATE POLICY "usuarios_ven_su_snapshots" ON snapshots_mensuales FOR SELECT USING (auth.uid() = user_id);

-- Tasas de cambio (data global, solo lectura para todos, solo service_role inserta)
CREATE POLICY "todos_leen_tasas" ON tasas_cambio FOR SELECT USING (true);
CREATE POLICY "solo_service_role_inserta_tasas" ON tasas_cambio FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

## 7. Trigger: crear perfil automáticamente al registrarse

```sql
CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_crear_perfil
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION crear_perfil_nuevo_usuario();
```

## 8. Trigger: calcular monto_usd_calculado (inmutable, solo en INSERT)

```sql
CREATE OR REPLACE FUNCTION calcular_monto_usd()
RETURNS TRIGGER AS $$
DECLARE
  tasa_actual NUMERIC(18,4);
BEGIN
  IF NEW.moneda_original = 'USD' THEN
    NEW.monto_usd_calculado := NEW.monto_original;
    NEW.tasa_al_momento := NULL;
  ELSE
    IF NEW.tasa_al_momento IS NULL THEN
      SELECT tasa INTO tasa_actual FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;
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

CREATE TRIGGER trg_calcular_usd
BEFORE INSERT ON transacciones
FOR EACH ROW EXECUTE FUNCTION calcular_monto_usd();
```

## 9. Trigger: mantener saldo_cache de cuentas sincronizado

```sql
CREATE OR REPLACE FUNCTION actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cuentas
  SET saldo_cache = (
    SELECT COALESCE(SUM(
      CASE
        WHEN tipo = 'ingreso' THEN monto_original
        WHEN tipo = 'gasto' THEN -monto_original
        ELSE 0
      END
    ), 0)
    FROM transacciones
    WHERE cuenta_id = COALESCE(NEW.cuenta_id, OLD.cuenta_id)
      AND anulada = false
  )
  WHERE id = COALESCE(NEW.cuenta_id, OLD.cuenta_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_saldo
AFTER INSERT OR UPDATE OR DELETE ON transacciones
FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cuenta();
```

## 10. Función: seed de categorías por defecto (invocar desde onboarding)

```sql
CREATE OR REPLACE FUNCTION seed_categorias_default(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO categorias (user_id, nombre, tipo) VALUES
    (p_user_id, 'Comida', 'gasto'),
    (p_user_id, 'Transporte', 'gasto'),
    (p_user_id, 'Servicios', 'gasto'),
    (p_user_id, 'Salario', 'ingreso'),
    (p_user_id, 'Ahorro', 'ahorro'),
    (p_user_id, 'Deuda', 'deuda');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 11. Función RPC: balance neto en vivo

```sql
CREATE OR REPLACE FUNCTION obtener_balance_neto(p_user_id UUID)
RETURNS TABLE(
  usd_fijo NUMERIC,
  ves_total NUMERIC,
  ves_en_usd NUMERIC,
  balance_neto NUMERIC,
  tasa_usada NUMERIC,
  tasa_fecha TIMESTAMPTZ
) AS $$
DECLARE
  v_tasa NUMERIC(18,4);
  v_tasa_fecha TIMESTAMPTZ;
  v_usd NUMERIC;
  v_ves NUMERIC;
BEGIN
  SELECT tasa, fecha INTO v_tasa, v_tasa_fecha
  FROM tasas_cambio ORDER BY fecha DESC LIMIT 1;

  SELECT COALESCE(SUM(saldo_cache), 0) INTO v_usd
  FROM cuentas WHERE user_id = p_user_id AND moneda = 'USD' AND activa = true;

  SELECT COALESCE(SUM(saldo_cache), 0) INTO v_ves
  FROM cuentas WHERE user_id = p_user_id AND moneda = 'VES' AND activa = true;

  RETURN QUERY SELECT
    v_usd,
    v_ves,
    ROUND(v_ves / NULLIF(v_tasa, 0), 2),
    ROUND(v_usd + (v_ves / NULLIF(v_tasa, 0)), 2),
    v_tasa,
    v_tasa_fecha;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 12. Función RPC: progreso de presupuesto por categoría

```sql
CREATE OR REPLACE FUNCTION obtener_progreso_presupuesto(p_user_id UUID, p_mes DATE)
RETURNS TABLE(
  categoria_id UUID,
  categoria_nombre TEXT,
  monto_planeado NUMERIC,
  monto_gastado NUMERIC,
  porcentaje_usado NUMERIC,
  restante NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.categoria_id,
    c.nombre,
    p.monto_planeado,
    COALESCE(SUM(t.monto_usd_calculado), 0) AS monto_gastado,
    ROUND(COALESCE(SUM(t.monto_usd_calculado), 0) / NULLIF(p.monto_planeado, 0) * 100, 1),
    p.monto_planeado - COALESCE(SUM(t.monto_usd_calculado), 0)
  FROM presupuestos p
  JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN transacciones t ON t.categoria_id = p.categoria_id
    AND t.user_id = p.user_id
    AND t.tipo = 'gasto'
    AND t.anulada = false
    AND t.fecha >= p.mes
    AND t.fecha < p.mes + interval '1 month'
  WHERE p.user_id = p_user_id AND p.mes = p_mes
  GROUP BY p.categoria_id, c.nombre, p.monto_planeado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 13. Función RPC: cierre de mes (snapshot)

```sql
CREATE OR REPLACE FUNCTION cerrar_mes(p_user_id UUID, p_mes DATE)
RETURNS VOID AS $$
DECLARE
  v_balance NUMERIC;
  v_tasa NUMERIC;
  v_ahorros NUMERIC;
  v_deuda NUMERIC;
BEGIN
  SELECT balance_neto, tasa_usada INTO v_balance, v_tasa
  FROM obtener_balance_neto(p_user_id);

  SELECT COALESCE(SUM(monto_actual), 0) INTO v_ahorros
  FROM metas WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_deuda
  FROM deudas WHERE user_id = p_user_id;

  INSERT INTO snapshots_mensuales (user_id, mes, balance_neto_usd, ahorros_acumulados_usd, deuda_acumulada_usd, tasa_cierre)
  VALUES (p_user_id, p_mes, v_balance, v_ahorros, v_deuda, v_tasa)
  ON CONFLICT (user_id, mes) DO UPDATE
    SET balance_neto_usd = EXCLUDED.balance_neto_usd,
        ahorros_acumulados_usd = EXCLUDED.ahorros_acumulados_usd,
        deuda_acumulada_usd = EXCLUDED.deuda_acumulada_usd,
        tasa_cierre = EXCLUDED.tasa_cierre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Nota importante
La tabla `tasas_cambio` solo debe recibir inserts desde el backend (Edge Function con `service_role`), nunca desde el cliente Next.js directamente, para evitar que un usuario manipule su balance insertando una tasa falsa.
