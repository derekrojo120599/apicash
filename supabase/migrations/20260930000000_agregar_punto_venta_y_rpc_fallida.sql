-- Migration: Agregar Punto de Venta y RPC para Operaciones Fallidas (Fijado)
-- Fecha: 2026-09-30

BEGIN;

-- 1. Eliminar restricciones CHECK anteriores explícitamente
ALTER TABLE comisiones_config DROP CONSTRAINT IF EXISTS comisiones_config_subtipo_operacion_check;
ALTER TABLE transacciones DROP CONSTRAINT IF EXISTS transacciones_subtipo_operacion_check;

-- 2. Añadir nuevas restricciones CHECK con 'punto_venta'
ALTER TABLE comisiones_config
    ADD CONSTRAINT comisiones_config_subtipo_operacion_check CHECK (
        subtipo_operacion IN (
            'pm_p2p', 'pm_p2c', 'pm_c2p_interbancario', 'pm_c2p_mismo_banco',
            'transferencia_interbancaria', 'transferencia_mismo_banco', 'cajero', 'biopago', 'punto_venta'
        )
    );

ALTER TABLE transacciones
    ADD CONSTRAINT transacciones_subtipo_operacion_check CHECK (
        subtipo_operacion IS NULL OR subtipo_operacion IN (
            'pm_p2p', 'pm_p2c', 'pm_c2p_interbancario', 'pm_c2p_mismo_banco',
            'transferencia_interbancaria', 'transferencia_mismo_banco', 'cajero', 'biopago', 'punto_venta'
        )
    );

-- 3. Actualizar la función seed
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
        (p_user_id, 'biopago', 0.000000, 0.00, NULL, false, false, false, 'Tarifario BCV Gaceta 43.427 (Lo asume el comercio)', true, '2026-08-01'),
        (p_user_id, 'punto_venta', 0.000000, 0.00, NULL, false, false, false, 'Tarifario BCV Gaceta 43.427 (Lo asume el comercio)', true, '2026-08-01')
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al sembrar comisiones_config para usuario %: %', p_user_id, SQLERRM;
END;
$$;

-- 4. Sembrar punto_venta para los usuarios existentes
DO $$
DECLARE 
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM auth.users LOOP
        PERFORM seed_comisiones_config_default(rec.id);
    END LOOP;
END;
$$;

-- 5. RPC para marcar operaciones retroactivamente como fallidas
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

    -- Buscar la transacción padre
    SELECT * INTO v_padre 
    FROM transacciones 
    WHERE id = p_transaccion_id AND user_id = v_user_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Transacción no encontrada o no pertenece al usuario.'; END IF;
    IF v_padre.anulada THEN RAISE EXCEPTION 'La transacción ya está anulada.'; END IF;
    IF v_padre.es_comision THEN RAISE EXCEPTION 'No puedes marcar una comisión directamente como fallida, selecciona la operación principal.'; END IF;
    IF v_padre.subtipo_operacion IS NULL THEN RAISE EXCEPTION 'Esta operación no tiene método de pago bancario asociado.'; END IF;

    -- Buscar la comisión asociada
    SELECT * INTO v_comision
    FROM transacciones
    WHERE transaccion_padre_id = v_padre.id AND es_comision = true AND anulada = false;

    IF NOT FOUND THEN 
        RAISE EXCEPTION 'No se encontró una comisión cobrada para esta operación, o ya fue anulada.'; 
    END IF;

    -- Buscar el tarifario vigente
    SELECT * INTO v_config
    FROM comisiones_config
    WHERE user_id = v_user_id
      AND subtipo_operacion = v_padre.subtipo_operacion
      AND vigente_desde <= (v_padre.fecha AT TIME ZONE 'America/Caracas')::DATE
      AND (vigente_hasta IS NULL OR vigente_hasta > (v_padre.fecha AT TIME ZONE 'America/Caracas')::DATE)
    ORDER BY vigente_desde DESC LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró tarifario para %', v_padre.subtipo_operacion;
    END IF;

    v_minimo_ves := v_config.minimo_ves;

    -- Anular la transacción padre (restituye el dinero principal al saldo mediante los triggers existentes)
    UPDATE transacciones 
    SET anulada = true 
    WHERE id = v_padre.id;

    -- Ajustar la comisión
    IF v_minimo_ves > 0 AND v_config.aplica_a_fallidas THEN
        -- Reconvertir la comisión al monto mínimo, desvincularla del padre y cambiar su descripción
        UPDATE transacciones
        SET 
            monto_original = v_minimo_ves,
            descripcion = COALESCE(v_padre.descripcion, 'Operación') || ' (Fallida - Comisión por intento)',
            transaccion_padre_id = NULL
        WHERE id = v_comision.id;
    ELSE
        -- Si el tarifario dice que no aplica a fallidas o el mínimo es 0, anulamos la comisión también
        UPDATE transacciones SET anulada = true WHERE id = v_comision.id;
    END IF;

END;
$$;

COMMIT;