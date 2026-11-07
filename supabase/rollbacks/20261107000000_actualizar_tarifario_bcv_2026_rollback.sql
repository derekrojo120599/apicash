-- Script de Reversión (Rollback) para migración 20261107000000_actualizar_tarifario_bcv_2026.sql
-- Restaura datos y funciones desde el esquema seguro 'backups'

BEGIN;

-- 1. Eliminar la nueva RPC con firma de 12 parámetros
DROP FUNCTION IF EXISTS registrar_operacion_con_comision(
    UUID, UUID, tipo_transaccion_enum, NUMERIC, moneda_enum, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, NUMERIC, BOOLEAN, BOOLEAN
);

-- 2. Restaurar funciones DDL originales directamente desde el respaldo guardado
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT definition FROM backups.function_definitions_backup_20261107 LOOP
        EXECUTE r.definition;
    END LOOP;
END;
$$;

-- 3. Restaurar los valores exactos de comisiones_config desde la tabla de respaldo
UPDATE comisiones_config c
SET porcentaje = b.porcentaje,
    minimo_ves = b.minimo_ves,
    maximo_ves = b.maximo_ves,
    es_tope = b.es_tope,
    permite_override = b.permite_override,
    aplica_a_fallidas = b.aplica_a_fallidas,
    fuente = b.fuente,
    verificada = b.verificada,
    vigente_desde = b.vigente_desde,
    vigente_hasta = b.vigente_hasta
FROM backups.comisiones_config_backup_20261107 b
WHERE c.id = b.id;

-- 4. Eliminar columna asume_usuario
ALTER TABLE comisiones_config DROP COLUMN IF EXISTS asume_usuario;

COMMIT;
