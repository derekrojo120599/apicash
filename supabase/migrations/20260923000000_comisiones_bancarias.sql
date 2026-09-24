-- Migration: Comisiones Bancarias y Registro Atómico de Operaciones
-- Fecha: 2026-09-23

/* =====================================================================
   PLAN DE REVERSA (ROLLBACK) POR FASE:
   Si algo falla en producción, ejecutar este bloque en orden inverso:
   1. DROP FUNCTION registrar_operacion_con_comision;
   2. DROP TRIGGER trigger_seed_comisiones ON auth.users;
   3. DROP FUNCTION on_auth_user_created_seed_comisiones;
   4. DROP FUNCTION seed_comisiones_config_default;
   5. ALTER TABLE transacciones DROP COLUMN es_comision, DROP COLUMN transaccion_padre_id, DROP COLUMN subtipo_operacion;
   6. DROP TABLE comisiones_config;
===================================================================== */

BEGIN;

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Tabla de configuración de comisiones bancarias
CREATE TABLE IF NOT EXISTS comisiones_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subtipo_operacion TEXT NOT NULL CHECK (
        subtipo_operacion IN (
            'pm_p2p', 'pm_p2c', 'pm_c2p_interbancario', 'pm_c2p_mismo_banco',
            'transferencia_interbancaria', 'transferencia_mismo_banco', 'cajero', 'biopago'
        )
    ),
    porcentaje NUMERIC(7,6) NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 1),
    minimo_ves NUMERIC(20,2) NOT NULL DEFAULT 0 CHECK (minimo_ves >= 0),
    maximo_ves NUMERIC(20,2) CHECK (maximo_ves IS NULL OR maximo_ves >= minimo_ves),
    es_tope BOOLEAN NOT NULL DEFAULT false,
    permite_override BOOLEAN NOT NULL DEFAULT false,
    aplica_a_fallidas BOOLEAN NOT NULL DEFAULT false,
    verificada BOOLEAN NOT NULL DEFAULT true,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE,
    fuente TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_vigencia_valida CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde),
    CONSTRAINT exclude_overlapping_vigencia EXCLUDE USING gist (
        user_id WITH =,
        subtipo_operacion WITH =,
        (daterange(vigente_desde, COALESCE(vigente_hasta, 'infinity'::date), '[)')) WITH &&
    )
);

-- RLS
ALTER TABLE comisiones_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_select_config" ON comisiones_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usuarios_insert_config" ON comisiones_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usuarios_update_config" ON comisiones_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usuarios_delete_config" ON comisiones_config FOR DELETE USING (auth.uid() = user_id);

-- 3. Detección de duplicados antes de índice único
DO $$
DECLARE
    duplicados TEXT;
BEGIN
    SELECT string_agg(user_id::text || ' (' || nombre || ')', ', ') INTO duplicados
    FROM (
        SELECT user_id, tipo, lower(nombre) as nombre
        FROM categorias
        GROUP BY user_id, tipo, lower(nombre)
        HAVING count(*) > 1
    ) dupes;

    IF duplicados IS NOT NULL THEN
        RAISE EXCEPTION 'No se puede aplicar índice único. Categorías duplicadas encontradas para: %', duplicados;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_user_tipo_nombre ON categorias(user_id, tipo, lower(nombre));

-- 4. Columnas en transacciones
ALTER TABLE transacciones
    ADD COLUMN IF NOT EXISTS subtipo_operacion TEXT CHECK (
        subtipo_operacion IS NULL OR subtipo_operacion IN (
            'pm_p2p', 'pm_p2c', 'pm_c2p_interbancario', 'pm_c2p_mismo_banco',
            'transferencia_interbancaria', 'transferencia_mismo_banco', 'cajero', 'biopago'
        )
    ),
    ADD COLUMN IF NOT EXISTS transaccion_padre_id UUID REFERENCES transacciones(id) ON DELETE NO ACTION,
    ADD COLUMN IF NOT EXISTS es_comision BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_transacciones_padre_id ON transacciones(transaccion_padre_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_es_comision_parcial ON transacciones(es_comision) WHERE es_comision = true;

-- 5. Seed function
CREATE OR REPLACE FUNCTION seed_comisiones_config_default(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO comisiones_config (user_id, subtipo_operacion, porcentaje, minimo_ves, maximo_ves, es_tope, permite_override, aplica_a_fallidas, fuente, verificada, vigente_desde)
    VALUES
        (p_user_id, 'pm_p2p', 0.003000, 14.00, NULL, false, false, true, 'Tarifario BCV Gaceta 43.427', true, '2026-08-01'),
        (p_user_id, 'pm_p2c', 0.015000, 14.00, NULL, true, true, true, 'Tarifario BCV Gaceta 43.427 (Pendiente de verificar)', false, '2026-08-01'),
        (p_user_id, 'pm_c2p_interbancario', 0.020000, 14.00, NULL, true, true, true, 'Tarifario BCV Gaceta 43.427 (Pendiente de verificar)', false, '2026-08-01'),
        (p_user_id, 'pm_c2p_mismo_banco', 0.017500, 14.00, NULL, true, true, false, 'Tarifario BCV Gaceta 43.427', true, '2026-08-01'),
        (p_user_id, 'transferencia_interbancaria', 0.003000, 14.00, NULL, false, false, true, 'Tarifario BCV Gaceta 43.427', true, '2026-08-01'),
        (p_user_id, 'transferencia_mismo_banco', 0.000000, 0.00, NULL, false, false, false, 'Tarifario BCV Gaceta 43.427', true, '2026-08-01'),
        (p_user_id, 'cajero', 0.000000, 54.00, 54.00, false, false, false, 'Tarifario BCV Gaceta 43.427', true, '2026-08-01'),
        (p_user_id, 'biopago', 0.000000, 0.00, NULL, false, false, false, 'Tarifario BCV Gaceta 43.427 (Lo asume el comercio)', true, '2026-08-01')
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al sembrar comisiones_config para usuario %: %', p_user_id, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION seed_comisiones_config_default(UUID) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION on_auth_user_created_seed_comisiones()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM seed_comisiones_config_default(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_seed_comisiones ON auth.users;
CREATE TRIGGER trigger_seed_comisiones
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION on_auth_user_created_seed_comisiones();

DO $$
DECLARE 
    rec RECORD;
    v_count INT;
BEGIN
    FOR rec IN SELECT id FROM auth.users LOOP
        PERFORM seed_comisiones_config_default(rec.id);
        
        -- Verificación estricta del backfill
        SELECT COUNT(*) INTO v_count FROM comisiones_config WHERE user_id = rec.id;
        IF v_count != 8 THEN
            RAISE EXCEPTION 'Backfill fallido para usuario %. Filas esperadas: 8, encontradas: %', rec.id, v_count;
        END IF;
    END LOOP;
END;
$$;

-- 6. RPC: registrar_operacion_con_comision
CREATE OR REPLACE FUNCTION registrar_operacion_con_comision(
    p_cuenta_id UUID,
    p_categoria_principal_id UUID,
    p_tipo tipo_transaccion_enum,
    p_monto NUMERIC,
    p_moneda moneda_enum,
    p_subtipo_operacion TEXT,
    p_tasa_cambio NUMERIC,
    p_fecha TIMESTAMPTZ,
    p_descripcion TEXT,
    p_override_comision NUMERIC DEFAULT NULL,
    p_es_fallida BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_fecha TIMESTAMPTZ := COALESCE(p_fecha, now());
    v_fecha_date DATE := (v_fecha AT TIME ZONE 'America/Caracas')::DATE;
    
    v_saldo_cache NUMERIC;
    v_cuenta_moneda moneda_enum;
    v_cuenta_activa BOOLEAN;
    
    v_monto_principal NUMERIC(20,2);
    v_tasa_cambio NUMERIC(20,8);
    
    v_config RECORD;
    v_comision_calculada NUMERIC(20,2) := 0;
    v_comision_final NUMERIC(20,2) := 0;
    v_tope_calculado NUMERIC(20,2);
    v_total_requerido NUMERIC;
    
    v_categoria_comision_id UUID;
    v_categoria_owner UUID;
    v_categoria_tipo TEXT;
    v_principal_id UUID := NULL;
    v_comision_id UUID := NULL;
    v_resultado JSONB;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_moneda IS NULL THEN RAISE EXCEPTION 'p_moneda no puede ser nula'; END IF;
    IF p_tipo IS NULL OR p_tipo NOT IN ('gasto', 'ingreso') THEN RAISE EXCEPTION 'Tipo de transacción inválido o nulo'; END IF;
    
    IF p_monto IS NULL THEN 
        RAISE EXCEPTION 'El monto no puede ser nulo'; 
    END IF;
    v_monto_principal := ROUND(p_monto, 2);
    IF v_monto_principal <= 0 THEN 
        RAISE EXCEPTION 'El monto debe ser mayor a 0 (redondeado: %)', v_monto_principal; 
    END IF;

    IF p_categoria_principal_id IS NOT NULL THEN
        SELECT user_id, tipo INTO v_categoria_owner, v_categoria_tipo
        FROM categorias WHERE id = p_categoria_principal_id;
        
        IF NOT FOUND OR v_categoria_owner != v_user_id THEN
            RAISE EXCEPTION 'La categoría principal no fue encontrada o no pertenece al usuario';
        END IF;
        IF v_categoria_tipo::text != p_tipo::text THEN
            RAISE EXCEPTION 'El tipo de la categoría principal (%) no coincide con el tipo de operación (%)', v_categoria_tipo, p_tipo;
        END IF;
    END IF;

    IF p_tipo = 'gasto' THEN
        SELECT saldo_cache, moneda, activa
        INTO v_saldo_cache, v_cuenta_moneda, v_cuenta_activa
        FROM cuentas
        WHERE id = p_cuenta_id AND user_id = v_user_id
        FOR UPDATE;
    ELSE
        SELECT saldo_cache, moneda, activa
        INTO v_saldo_cache, v_cuenta_moneda, v_cuenta_activa
        FROM cuentas
        WHERE id = p_cuenta_id AND user_id = v_user_id;
    END IF;

    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no encontrada o no autorizada'; END IF;
    IF NOT v_cuenta_activa THEN RAISE EXCEPTION 'La cuenta no está activa'; END IF;
    IF p_moneda != v_cuenta_moneda THEN RAISE EXCEPTION 'Moneda desajustada'; END IF;

    IF v_cuenta_moneda = 'VES' THEN
        v_tasa_cambio := ROUND(p_tasa_cambio, 8);
        IF v_tasa_cambio IS NULL OR v_tasa_cambio <= 0 THEN
            RAISE EXCEPTION 'p_tasa_cambio es obligatoria y debe ser > 0 para operaciones en VES';
        END IF;
    END IF;

    -- Lógica de Comisiones
    IF p_tipo = 'gasto' AND p_subtipo_operacion IS NOT NULL AND v_cuenta_moneda = 'VES' THEN
        SELECT * INTO v_config
        FROM comisiones_config
        WHERE user_id = v_user_id
          AND subtipo_operacion = p_subtipo_operacion
          AND vigente_desde <= v_fecha_date
          AND (vigente_hasta IS NULL OR vigente_hasta > v_fecha_date)
        ORDER BY vigente_desde DESC LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No se encontró configuración de comisiones vigente para %', p_subtipo_operacion;
        END IF;

        IF NOT (p_es_fallida AND NOT v_config.aplica_a_fallidas) THEN
            IF p_es_fallida THEN
                IF p_override_comision IS NOT NULL THEN
                    RAISE EXCEPTION 'No se permite override de comisión en operaciones fallidas';
                END IF;
                -- Operación fallida: cobra solo el mínimo, sin porcentaje ni override
                v_comision_final := v_config.minimo_ves;
            ELSE
                v_comision_calculada := ROUND(v_monto_principal * v_config.porcentaje, 2);
                v_comision_final := GREATEST(v_comision_calculada, v_config.minimo_ves);
                
                -- Calcular tope estricto para posibles overrides
                v_tope_calculado := v_comision_final;
                IF v_config.maximo_ves IS NOT NULL THEN
                    v_tope_calculado := LEAST(v_comision_final, v_config.maximo_ves);
                    v_comision_final := v_tope_calculado;
                END IF;

                IF p_override_comision IS NOT NULL THEN
                    IF NOT v_config.permite_override THEN
                        RAISE EXCEPTION 'Override rechazado: subtipo % no permite override', p_subtipo_operacion;
                    END IF;
                    
                    IF p_override_comision < 0 OR p_override_comision > v_tope_calculado THEN
                        RAISE EXCEPTION 'Override rechazado: monto % fuera del rango permitido (0 a %)', p_override_comision, v_tope_calculado;
                    END IF;
                    
                    v_comision_final := ROUND(p_override_comision, 2);
                END IF;
            END IF;
        END IF;
    END IF;

    IF p_tipo = 'gasto' THEN
        v_total_requerido := v_comision_final;
        IF NOT p_es_fallida THEN
            v_total_requerido := v_total_requerido + v_monto_principal;
        END IF;

        IF v_saldo_cache < v_total_requerido THEN
            RAISE EXCEPTION 'Saldo insuficiente. Disponible: %, Requerido: %', v_saldo_cache, v_total_requerido;
        END IF;
    END IF;

    -- Buscar/crear categoría "Comisiones bancarias" (Segura por ON CONFLICT DO NOTHING)
    IF v_comision_final > 0 THEN
        INSERT INTO categorias (user_id, nombre, tipo, icono)
        VALUES (v_user_id, 'Comisiones bancarias', 'gasto', 'receipt')
        ON CONFLICT (user_id, tipo, lower(nombre)) DO NOTHING;
        
        SELECT id INTO v_categoria_comision_id FROM categorias 
        WHERE user_id = v_user_id AND tipo = 'gasto' AND lower(nombre) = 'comisiones bancarias' LIMIT 1;

        IF v_categoria_comision_id IS NULL THEN
            RAISE EXCEPTION 'No se pudo resolver la categoría de Comisiones bancarias';
        END IF;
    END IF;

    IF p_es_fallida THEN
        IF v_comision_final > 0 THEN
            INSERT INTO transacciones (
                user_id, cuenta_id, categoria_id, tipo, subtipo_operacion, monto_original, moneda_original,
                tasa_al_momento, descripcion, fecha, transaccion_padre_id, es_comision
            ) VALUES (
                v_user_id, p_cuenta_id, v_categoria_comision_id, 'gasto', p_subtipo_operacion, v_comision_final, v_cuenta_moneda,
                v_tasa_cambio, COALESCE(p_descripcion, 'Operación') || ' (Fallida - Comisión)',
                v_fecha, NULL, true
            ) RETURNING id INTO v_comision_id;
        END IF;
    ELSE
        INSERT INTO transacciones (
            user_id, cuenta_id, categoria_id, tipo, subtipo_operacion, monto_original, moneda_original,
            tasa_al_momento, descripcion, fecha, transaccion_padre_id, es_comision
        ) VALUES (
            v_user_id, p_cuenta_id, p_categoria_principal_id, p_tipo, p_subtipo_operacion, v_monto_principal, v_cuenta_moneda,
            v_tasa_cambio, p_descripcion, v_fecha, NULL, false
        ) RETURNING id INTO v_principal_id;

        IF v_comision_final > 0 THEN
            INSERT INTO transacciones (
                user_id, cuenta_id, categoria_id, tipo, subtipo_operacion, monto_original, moneda_original,
                tasa_al_momento, descripcion, fecha, transaccion_padre_id, es_comision
            ) VALUES (
                v_user_id, p_cuenta_id, v_categoria_comision_id, 'gasto', p_subtipo_operacion, v_comision_final, v_cuenta_moneda,
                v_tasa_cambio, 'Comisión: ' || COALESCE(p_descripcion, 'Operación'),
                v_fecha, v_principal_id, true
            ) RETURNING id INTO v_comision_id;
        END IF;
    END IF;

    v_resultado := jsonb_build_object(
        'principal_id', v_principal_id,
        'comision_id', v_comision_id
    );

    RETURN v_resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION registrar_operacion_con_comision FROM public, anon;

COMMIT;
