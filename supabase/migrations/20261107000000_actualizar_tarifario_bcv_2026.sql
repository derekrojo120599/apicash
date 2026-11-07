-- Migración: Actualización Tarifario BCV Gaceta Oficial 46.427 (Vigente desde agosto 2026)
-- Fecha: 07/11/2026

BEGIN;

-- ==============================================================================
-- 1. ESQUEMA Y TABLAS DE RESPALDO (SEGURO, SIN EXPOSICIÓN PÚBLICA)
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS backups;
REVOKE ALL ON SCHEMA backups FROM public, anon, authenticated;

-- Respaldar datos actuales de comisiones_config
CREATE TABLE IF NOT EXISTS backups.comisiones_config_backup_20261107 AS 
SELECT * FROM comisiones_config;

ALTER TABLE backups.comisiones_config_backup_20261107 ENABLE ROW LEVEL SECURITY;

-- Respaldar código DDL exacto de las funciones actuales
CREATE TABLE IF NOT EXISTS backups.function_definitions_backup_20261107 (
    function_name TEXT PRIMARY KEY,
    definition TEXT NOT NULL,
    backed_up_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE backups.function_definitions_backup_20261107 ENABLE ROW LEVEL SECURITY;

INSERT INTO backups.function_definitions_backup_20261107 (function_name, definition)
VALUES 
    (
        'registrar_operacion_con_comision',
        pg_get_functiondef('registrar_operacion_con_comision(UUID, UUID, tipo_transaccion_enum, NUMERIC, moneda_enum, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, NUMERIC, BOOLEAN)'::regprocedure)
    ),
    (
        'marcar_operacion_como_fallida',
        pg_get_functiondef('marcar_operacion_como_fallida(UUID)'::regprocedure)
    ),
    (
        'seed_comisiones_config_default',
        pg_get_functiondef('seed_comisiones_config_default(UUID)'::regprocedure)
    )
ON CONFLICT (function_name) DO UPDATE 
SET definition = EXCLUDED.definition, backed_up_at = now();

-- ==============================================================================
-- 2. VERIFICACIÓN DE INTEGRIDAD PREVIA
-- ==============================================================================
-- Verifica que no existan filas vigentes duplicadas por usuario y subtipo
DO $$
DECLARE
    v_duplicados INT;
BEGIN
    WITH dupes AS (
        SELECT user_id, subtipo_operacion, COUNT(*) as cant
        FROM comisiones_config
        WHERE (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE)
        GROUP BY user_id, subtipo_operacion
        HAVING COUNT(*) > 1
    )
    SELECT COUNT(*) INTO v_duplicados FROM dupes;

    IF v_duplicados > 0 THEN
        RAISE EXCEPTION 'Abortando migración: se detectaron % subtipos con filas vigentes solapadas', v_duplicados;
    END IF;
END;
$$;

-- ==============================================================================
-- 3. AGREGAR COLUMNA asume_usuario A comisiones_config
-- ==============================================================================
ALTER TABLE comisiones_config 
ADD COLUMN IF NOT EXISTS asume_usuario BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN comisiones_config.asume_usuario IS 'Indica si la comisión la paga el usuario emisor (true) o el comercio/receptor (false).';

-- ==============================================================================
-- 4. ACTUALIZAR FILAS VIGENTES DE USUARIOS EXISTENTES
-- ==============================================================================
-- pm_p2p: 0.30%, mín. Bs. 14,00 (Asume el usuario)
UPDATE comisiones_config
SET porcentaje = 0.003000,
    minimo_ves = 14.00,
    maximo_ves = NULL,
    es_tope = false,
    permite_override = false,
    aplica_a_fallidas = true,
    asume_usuario = true,
    verificada = true,
    fuente = 'Tarifario BCV Gaceta Oficial 46.427'
WHERE subtipo_operacion = 'pm_p2p'
  AND (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE);

-- pm_p2c: 1.50%, mín. Bs. 14,00 (Asume el comercio, configurable por excepción)
UPDATE comisiones_config
SET porcentaje = 0.015000,
    minimo_ves = 14.00,
    maximo_ves = NULL,
    es_tope = true,
    permite_override = true,
    aplica_a_fallidas = true,
    asume_usuario = false,
    verificada = true,
    fuente = 'Tarifario BCV Gaceta Oficial 46.427'
WHERE subtipo_operacion = 'pm_p2c'
  AND (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE);

-- pm_c2p_interbancario: 2.00%, mín. Bs. 14,00 (Asume el comercio)
UPDATE comisiones_config
SET porcentaje = 0.020000,
    minimo_ves = 14.00,
    maximo_ves = NULL,
    es_tope = true,
    permite_override = true,
    aplica_a_fallidas = true,
    asume_usuario = false,
    verificada = true,
    fuente = 'Tarifario BCV Gaceta Oficial 46.427'
WHERE subtipo_operacion = 'pm_c2p_interbancario'
  AND (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE);

-- pm_c2p_mismo_banco: 1.75%, mín. Bs. 14,00 (Asume el comercio)
UPDATE comisiones_config
SET porcentaje = 0.017500,
    minimo_ves = 14.00,
    maximo_ves = NULL,
    es_tope = true,
    permite_override = true,
    aplica_a_fallidas = false,
    asume_usuario = false,
    verificada = true,
    fuente = 'Tarifario BCV Gaceta Oficial 46.427'
WHERE subtipo_operacion = 'pm_c2p_mismo_banco'
  AND (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE);

-- transferencia_mismo_banco: Bs. 0,00 por defecto, pero editable hasta tope de Bs. 54,00
UPDATE comisiones_config
SET porcentaje = 0.000000,
    minimo_ves = 0.00,
    maximo_ves = 54.00,
    es_tope = false,
    permite_override = true,
    aplica_a_fallidas = false,
    asume_usuario = true,
    verificada = true,
    fuente = 'Tarifario BCV Gaceta Oficial 46.427'
WHERE subtipo_operacion = 'transferencia_mismo_banco'
  AND (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE);

-- Subtipos no verificados: se mantienen tasas intactas y se marcan como pendientes
-- TODO: transferencia_interbancaria y cajero pendientes de confirmación en tarifario
UPDATE comisiones_config
SET verificada = false,
    asume_usuario = true,
    fuente = 'Tarifario BCV (Pendiente de confirmar)'
WHERE subtipo_operacion IN ('transferencia_interbancaria', 'cajero')
  AND (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE);

-- Punto de Venta y Biopago: Asume el comercio
UPDATE comisiones_config
SET asume_usuario = false,
    verificada = true,
    fuente = 'Tarifario BCV Gaceta Oficial 46.427 (Lo asume el comercio)'
WHERE subtipo_operacion IN ('punto_venta', 'biopago')
  AND (vigente_hasta IS NULL OR vigente_hasta > (now() AT TIME ZONE 'America/Caracas')::DATE);

-- ==============================================================================
-- 5. ACTUALIZAR FUNCIÓN seed_comisiones_config_default
-- ==============================================================================
CREATE OR REPLACE FUNCTION seed_comisiones_config_default(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO comisiones_config (
        user_id, subtipo_operacion, porcentaje, minimo_ves, maximo_ves, 
        es_tope, permite_override, aplica_a_fallidas, asume_usuario, fuente, verificada, vigente_desde
    ) VALUES
        (p_user_id, 'pm_p2p', 0.003000, 14.00, NULL, false, false, true, true, 'Tarifario BCV Gaceta Oficial 46.427', true, '2026-08-01'),
        (p_user_id, 'pm_p2c', 0.015000, 14.00, NULL, true, true, true, false, 'Tarifario BCV Gaceta Oficial 46.427', true, '2026-08-01'),
        (p_user_id, 'pm_c2p_interbancario', 0.020000, 14.00, NULL, true, true, true, false, 'Tarifario BCV Gaceta Oficial 46.427', true, '2026-08-01'),
        (p_user_id, 'pm_c2p_mismo_banco', 0.017500, 14.00, NULL, true, true, false, false, 'Tarifario BCV Gaceta Oficial 46.427', true, '2026-08-01'),
        -- TODO: Subtipos pendientes de confirmación específica
        (p_user_id, 'transferencia_interbancaria', 0.003000, 14.00, NULL, false, false, true, true, 'Tarifario BCV (Pendiente de confirmar)', false, '2026-08-01'),
        (p_user_id, 'transferencia_mismo_banco', 0.000000, 0.00, 54.00, false, true, false, true, 'Tarifario BCV Gaceta Oficial 46.427', true, '2026-08-01'),
        (p_user_id, 'cajero', 0.000000, 54.00, 54.00, false, false, false, true, 'Tarifario BCV (Pendiente de confirmar)', false, '2026-08-01'),
        (p_user_id, 'biopago', 0.000000, 0.00, NULL, false, false, false, false, 'Tarifario BCV Gaceta Oficial 46.427 (Lo asume el comercio)', true, '2026-08-01'),
        (p_user_id, 'punto_venta', 0.000000, 0.00, NULL, false, false, false, false, 'Tarifario BCV Gaceta Oficial 46.427 (Lo asume el comercio)', true, '2026-08-01')
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al sembrar comisiones_config para usuario %: %', p_user_id, SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION seed_comisiones_config_default(UUID) FROM public, anon, authenticated;

-- ==============================================================================
-- 6. ELIMINAR SOBRECARGA ANTERIOR Y CREAR NUEVA RPC registrar_operacion_con_comision
-- ==============================================================================
DROP FUNCTION IF EXISTS registrar_operacion_con_comision(
    UUID, UUID, tipo_transaccion_enum, NUMERIC, moneda_enum, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, NUMERIC, BOOLEAN
);

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
    p_es_fallida BOOLEAN DEFAULT FALSE,
    p_asumir_comision_comercio BOOLEAN DEFAULT FALSE
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
    
    IF p_monto IS NULL THEN RAISE EXCEPTION 'El monto no puede ser nulo'; END IF;
    v_monto_principal := ROUND(p_monto, 2);
    IF v_monto_principal <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor a 0 (redondeado: %)', v_monto_principal; END IF;

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
        SELECT saldo_cache, moneda, activa INTO v_saldo_cache, v_cuenta_moneda, v_cuenta_activa
        FROM cuentas WHERE id = p_cuenta_id AND user_id = v_user_id FOR UPDATE;
    ELSE
        SELECT saldo_cache, moneda, activa INTO v_saldo_cache, v_cuenta_moneda, v_cuenta_activa
        FROM cuentas WHERE id = p_cuenta_id AND user_id = v_user_id;
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

        -- 1. Si la comisión no la asume el usuario y NO activó el flag de asumirla, la comisión es 0.00
        IF NOT v_config.asume_usuario AND NOT p_asumir_comision_comercio THEN
            v_comision_final := 0.00;
        ELSIF NOT (p_es_fallida AND NOT v_config.aplica_a_fallidas) THEN
            IF p_es_fallida THEN
                IF p_override_comision IS NOT NULL THEN
                    RAISE EXCEPTION 'No se permite override de comisión en operaciones fallidas';
                END IF;
                v_comision_final := v_config.minimo_ves;
            ELSE
                v_comision_calculada := ROUND(v_monto_principal * v_config.porcentaje, 2);
                v_comision_final := GREATEST(v_comision_calculada, v_config.minimo_ves);
                
                -- CORRECCIÓN DEL BUG: El tope para el override es maximo_ves si está definido;
                -- si maximo_ves es NULL, el tope es la comisión calculada/mínima.
                IF v_config.maximo_ves IS NOT NULL THEN
                    v_tope_calculado := v_config.maximo_ves;
                    v_comision_final := LEAST(v_comision_final, v_config.maximo_ves);
                ELSE
                    v_tope_calculado := v_comision_final;
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

-- Permisos estrictos de la RPC
REVOKE EXECUTE ON FUNCTION registrar_operacion_con_comision(
    UUID, UUID, tipo_transaccion_enum, NUMERIC, moneda_enum, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, NUMERIC, BOOLEAN, BOOLEAN
) FROM public, anon;

GRANT EXECUTE ON FUNCTION registrar_operacion_con_comision(
    UUID, UUID, tipo_transaccion_enum, NUMERIC, moneda_enum, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, NUMERIC, BOOLEAN, BOOLEAN
) TO authenticated;

-- ==============================================================================
-- 7. ACTUALIZAR RPC marcar_operacion_como_fallida PARA RESPETAR asume_usuario
-- ==============================================================================
CREATE OR REPLACE FUNCTION marcar_operacion_como_fallida(p_transaccion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_padre RECORD;
    v_comision RECORD;
    v_config RECORD;
    v_minimo_ves NUMERIC(20,2);
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT * INTO v_padre 
    FROM transacciones 
    WHERE id = p_transaccion_id AND user_id = v_user_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Transacción no encontrada o no pertenece al usuario.'; END IF;
    IF v_padre.anulada THEN RAISE EXCEPTION 'La transacción ya está anulada.'; END IF;
    IF v_padre.es_comision THEN RAISE EXCEPTION 'No puedes marcar una comisión directamente como fallida, selecciona la operación principal.'; END IF;
    IF v_padre.subtipo_operacion IS NULL THEN RAISE EXCEPTION 'Esta operación no tiene método de pago bancario asociado.'; END IF;

    -- Buscar tarifario vigente al momento de la operación
    SELECT * INTO v_config
    FROM comisiones_config
    WHERE user_id = v_user_id
      AND subtipo_operacion = v_padre.subtipo_operacion
      AND vigente_desde <= (v_padre.fecha AT TIME ZONE 'America/Caracas')::DATE
      AND (vigente_hasta IS NULL OR vigente_hasta > (v_padre.fecha AT TIME ZONE 'America/Caracas')::DATE)
    ORDER BY vigente_desde DESC LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró configuración de comisiones para este método de pago.'; END IF;
    IF NOT v_config.aplica_a_fallidas THEN RAISE EXCEPTION 'Este tipo de operación no cobra comisión bancaria por intento fallido.'; END IF;

    -- Buscar la comisión asociada si existía
    SELECT * INTO v_comision
    FROM transacciones
    WHERE transaccion_padre_id = v_padre.id AND es_comision = true AND anulada = false;

    -- Si la comisión no la asume el usuario por defecto y no hubo comisión cobrada al usuario:
    IF NOT v_config.asume_usuario AND NOT FOUND THEN
        -- Simplemente anular la transacción principal sin debitar comisión
        UPDATE transacciones
        SET anulada = true,
            descripcion = v_padre.descripcion || ' (Fallida)'
        WHERE id = v_padre.id;
        RETURN;
    END IF;

    IF NOT FOUND THEN 
        RAISE EXCEPTION 'No se encontró una comisión cobrada para esta operación, o ya fue anulada.'; 
    END IF;

    v_minimo_ves := v_config.minimo_ves;

    -- Anular la operación principal (devuelve el monto de la compra)
    UPDATE transacciones
    SET anulada = true,
        descripcion = v_padre.descripcion || ' (Fallida)'
    WHERE id = v_padre.id;

    -- Ajustar la comisión al mínimo legal de intento fallido
    IF v_comision.monto_original != v_minimo_ves THEN
        UPDATE transacciones
        SET monto_original = v_minimo_ves,
            monto_usd_calculado = CASE 
                WHEN v_comision.tasa_al_momento > 0 THEN ROUND(v_minimo_ves / v_comision.tasa_al_momento, 2)
                ELSE v_comision.monto_usd_calculado 
            END,
            descripcion = 'Comisión por intento fallido: ' || v_padre.descripcion
        WHERE id = v_comision.id;
    ELSE
        UPDATE transacciones
        SET descripcion = 'Comisión por intento fallido: ' || v_padre.descripcion
        WHERE id = v_comision.id;
    END IF;
END;
$$;

COMMIT;
