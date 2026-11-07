-- Test Suite: pgTAP Tests para Comisiones Bancarias y RPC registrar_operacion_con_comision
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(45); -- 45 aserciones

-- SETUP ISOLATED ENVIRONMENT como SUPERUSER antes de cambiar a AUTHENTICATED
DO $$
BEGIN
    INSERT INTO auth.users (id, email) VALUES 
        ('00000000-0000-0000-0000-000000000001', 'test@apicasch.com'),
        ('00000000-0000-0000-0000-000000000002', 'hacker@apicasch.com')
    ON CONFLICT DO NOTHING;

    INSERT INTO perfiles (id, nombre_completo, moneda_principal) VALUES 
        ('00000000-0000-0000-0000-000000000001', 'User 1', 'USD'),
        ('00000000-0000-0000-0000-000000000002', 'Hacker', 'USD')
    ON CONFLICT DO NOTHING;

    INSERT INTO categorias (id, user_id, nombre, tipo) VALUES 
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'Test Cat Gasto', 'gasto'),
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000001', 'Test Cat Ingreso', 'ingreso'),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000002', 'Test Cat Otro User', 'gasto')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO cuentas (id, user_id, nombre, tipo, moneda, saldo_cache) VALUES 
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Banesco', 'banco', 'VES', 0),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'Zelle', 'banco', 'USD', 0) 
    ON CONFLICT DO NOTHING;

    INSERT INTO tasas_cambio (tasa, fuente) VALUES (40.00, 'Cotizave API - Mediana P2P');

    -- Proveer fondos iniciales reales a través de transacciones para que los triggers cuadren el saldo_cache
    INSERT INTO transacciones (id, cuenta_id, user_id, categoria_id, tipo, monto_original, moneda_original, monto_usd_calculado, descripcion) VALUES 
        (gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ingreso', 500000.00, 'VES', 12500.00, 'Saldo Inicial VES'),
        (gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ingreso', 50000.00, 'USD', 50000.00, 'Saldo Inicial USD')
    ON CONFLICT DO NOTHING;

    PERFORM seed_comisiones_config_default('00000000-0000-0000-0000-000000000001');
    PERFORM seed_comisiones_config_default('00000000-0000-0000-0000-000000000002');
END;
$$;

-- ACTIVATE ROLE AND JWT
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- TEST 1: btree_gist overlaps
PREPARE test_solapamiento AS INSERT INTO comisiones_config (user_id, subtipo_operacion, porcentaje, vigente_desde, vigente_hasta) VALUES ('00000000-0000-0000-0000-000000000001', 'pm_p2p', 0.003, '2026-09-01', '2026-12-01');
SELECT throws_ok('test_solapamiento', '23P01', NULL, 'GiST debe rechazar solapamientos en fechas');

-- TEST 2: Control Positivo (El usuario 1 ve sus filas, son 9 semillas)
PREPARE test_positivo AS SELECT count(*) FROM comisiones_config WHERE user_id = '00000000-0000-0000-0000-000000000001';
SELECT results_eq('test_positivo', 'VALUES (9::bigint)', 'Usuario 1 ve sus 9 filas sembradas de comisiones_config');

-- TEST 3: RLS Isolation
PREPARE test_hacker AS SELECT * FROM comisiones_config WHERE user_id = '00000000-0000-0000-0000-000000000002';
SELECT is_empty('test_hacker', 'RLS protege lectura de otros usuarios');

-- TEST 4: Parámetro de monto inválido (negativo)
PREPARE test_monto_negativo AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', -50.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE, FALSE);
SELECT throws_ok('test_monto_negativo', 'P0001', NULL, 'Rechaza monto negativo');

-- TEST 5: Monto que redondea a 0 (0.004 -> ROUND -> 0.00 -> rechazado)
PREPARE test_monto_cero AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 0.004, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE, FALSE);
SELECT throws_ok('test_monto_cero', 'P0001', 'El monto debe ser mayor a 0 (redondeado: 0.00)', 'Rechaza monto que redondea a 0.00');

-- TEST 6: Tasa obligatoria para VES
PREPARE test_sin_tasa AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', NULL, now(), 'Test', NULL, FALSE, FALSE);
SELECT throws_like('test_sin_tasa', 'p_tasa_cambio es obligatoria%', 'Rechaza operación VES si falta tasa');

-- TEST 7: Operación Exitosa / Default Seed Values (14.00 Mínimo P2P)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 10.00, 'VES', 'pm_p2p', 40.1234, now(), 'Test Min', NULL, FALSE, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Min'')', 'VALUES (14.00::numeric)', 'Mínimo semilla de 14.00 Bs aplicado a P2P');

-- TEST 8: Half-Up Boundary Check (4675.00 * 0.003 = 14.025 -> 14.03)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 4675.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Math Half-up', NULL, FALSE, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Math Half-up'')', 'VALUES (14.03::numeric)', 'Matemática porcentual Half-up exacta redondea 14.025 a 14.03');

-- TEST 9: Operación Fallida cobra minimo_ves (14.00), no porcentaje (500 * 0.003 = 1.50)
DO $$ 
DECLARE v_res JSONB; 
BEGIN 
    v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 500.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Fail', NULL, TRUE, FALSE); 
    CREATE TEMP TABLE tmp_fail(id UUID); INSERT INTO tmp_fail VALUES ((v_res->>'comision_id')::uuid); 
END; 
$$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE id = (SELECT id FROM tmp_fail LIMIT 1)', 'VALUES (14.00::numeric)', 'Fallida cobra minimo_ves (14.00), no porcentaje');

-- TEST 10: Operación Fallida con monto grande (100000 Bs) aún cobra 14.00 (minimo, no 300.00)
DO $$ 
DECLARE v_res JSONB; 
BEGIN 
    v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100000.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Fail Grande', NULL, TRUE, FALSE); 
    CREATE TEMP TABLE tmp_fail_big(id UUID); INSERT INTO tmp_fail_big VALUES ((v_res->>'comision_id')::uuid); 
END; 
$$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE id = (SELECT id FROM tmp_fail_big LIMIT 1)', 'VALUES (14.00::numeric)', 'Fallida con 100000 Bs cobra minimo_ves (14.00), no 300.00 de porcentaje');

-- TEST 11: P2C por defecto NO cobra comisión al usuario (asume el comercio)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_p2c', 40.00, now(), 'Test P2C Gratis', NULL, FALSE, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''Test P2C Gratis''', 'P2C inserta la transacción principal exitosamente');
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test P2C Gratis'')', 'P2C por defecto no debita comisión al usuario');

-- TEST 12: C2P por defecto NO cobra comisión al usuario (asume el comercio)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_c2p_interbancario', 40.00, now(), 'Test C2P Gratis', NULL, FALSE, FALSE); END; $$;
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test C2P Gratis'')', 'C2P por defecto no debita comisión al usuario');

-- TEST 13: P2C con Toggle Activo (p_asumir_comision_comercio = true) cobra 1.5% (1000 * 1.5% = 15.00)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_p2c', 40.00, now(), 'Test P2C Asumido', NULL, FALSE, TRUE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test P2C Asumido'')', 'VALUES (15.00::numeric)', 'P2C con toggle activo debita 15.00 Bs de comisión');

-- TEST 14: P2C con Toggle Activo en monto bajo respeta mínimo de Bs. 14
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2c', 40.00, now(), 'Test P2C Min Asumido', NULL, FALSE, TRUE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test P2C Min Asumido'')', 'VALUES (14.00::numeric)', 'P2C con toggle activo respeta el mínimo legal de Bs. 14');

-- TEST 15: Toggle activo sobre P2P (que ya asume el usuario) no duplica ni falla
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 4675.00, 'VES', 'pm_p2p', 40.00, now(), 'Test P2P Con Toggle', NULL, FALSE, TRUE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test P2P Con Toggle'')', 'VALUES (14.03::numeric)', 'Toggle sobre P2P no altera el cálculo');

-- TEST 16: Transferencia mismo banco por defecto cobra Bs. 0.00
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 10000.00, 'VES', 'transferencia_mismo_banco', 40.00, now(), 'Test Trans Mismo Banco Default', NULL, FALSE, FALSE); END; $$;
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Trans Mismo Banco Default'')', 'Transferencia mismo banco es 0 Bs por defecto');

-- TEST 17: Transferencia mismo banco acepta override válido de Bs. 30.00
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 10000.00, 'VES', 'transferencia_mismo_banco', 40.00, now(), 'Test Trans MB Override 30', 30.00, FALSE, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Trans MB Override 30'')', 'VALUES (30.00::numeric)', 'Transferencia mismo banco acepta override de 30 Bs');

-- TEST 18: Transferencia mismo banco rechaza override mayor a Bs. 54.00 (ej. 60.00)
PREPARE test_trans_mb_override_invalido AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 10000.00, 'VES', 'transferencia_mismo_banco', 40.00, now(), 'Test', 60.00, FALSE, FALSE);
SELECT throws_like('test_trans_mb_override_invalido', 'Override rechazado: monto 60.00 fuera del rango permitido%', 'Rechaza override de 60 Bs en transferencia mismo banco (tope 54)');

-- TEST 19: Validación Saldo Insuficiente FOR UPDATE
PREPARE test_saldo AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 999999.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE, FALSE);
SELECT throws_like('test_saldo', 'Saldo insuficiente%', 'Excede el saldo bloqueado FOR UPDATE');

-- TEST 20: Override Rechazado en pm_p2p (permite_override = false)
PREPARE test_override AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', 200.00, FALSE, FALSE);
SELECT throws_like('test_override', 'Override rechazado%', 'Rechaza override en pm_p2p (permite_override = false)');

-- TEST 21: Override Rechazado en biopago (permite_override = false, lo paga el comercio)
PREPARE test_override_biopago AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'biopago', 40.00, now(), 'Test', 5.00, FALSE, FALSE);
SELECT throws_like('test_override_biopago', 'Override rechazado%', 'Rechaza override en biopago (comercio lo paga)');

-- TEST 22: Cuenta USD ignora comisión
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'USD', 'pm_p2p', 40.00, now(), 'Test USD', NULL, FALSE, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''Test USD''', 'USD inserta principal exitosamente');
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test USD'')', 'USD inserta principal pero comisión es 0');

-- TEST 23: Subtipo sin configuración vigente (fecha anterior al seed)
PREPARE test_sin_config AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, '2020-01-01 00:00:00+00', 'Test', NULL, FALSE, FALSE);
SELECT throws_like('test_sin_config', 'No se encontró configuración de comisiones vigente%', 'Rechaza fecha anterior a la vigencia del tarifario');

-- TEST 24: Ingreso (Valida y escribe, pero comisión = 0)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ingreso', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Ingreso', NULL, FALSE, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''Test Ingreso''', 'Ingreso inserta la transacción principal exitosamente');
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Ingreso'')', 'Ingreso no deduce comisiones en P2P');

-- TEST 25: ON DELETE NO ACTION (Fallo de integridad 23503)
DO $$
DECLARE v_padre JSONB;
BEGIN
    v_padre := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 10.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Delete', NULL, FALSE, FALSE);
    CREATE TEMP TABLE tmp_padre (id UUID); INSERT INTO tmp_padre VALUES ((v_padre->>'principal_id')::uuid);
END;
$$;
RESET ROLE;
PREPARE test_delete_restrict AS DELETE FROM transacciones WHERE id = (SELECT id FROM tmp_padre LIMIT 1);
SELECT throws_ok('test_delete_restrict', '23503', NULL, 'ON DELETE NO ACTION previene borrar la principal con hijas');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- TEST 26: Cajero (54 Bs Fijos)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'cajero', 40.00, now(), 'Cajero', NULL, FALSE, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Cajero'')', 'VALUES (54.00::numeric)', 'Cajero extrae 54 fijos');

-- TEST 27: Biopago no cobra comisión (asume el comercio)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'biopago', 40.00, now(), 'Test Biopago', NULL, FALSE, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''Test Biopago''', 'Biopago inserta la transacción principal exitosamente');
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Biopago'')', 'Biopago no genera fila de comisión porque lo paga el comercio');

-- TEST 28: Marcar como fallida una P2C donde el usuario NO asumió comisión (anula sin comisión)
DO $$ 
DECLARE 
    v_res JSONB; 
    v_pid UUID;
BEGIN 
    v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 500.00, 'VES', 'pm_p2c', 40.00, now(), 'P2C Sin Comision Fallida', NULL, FALSE, FALSE);
    v_pid := (v_res->>'principal_id')::uuid;
    PERFORM marcar_operacion_como_fallida(v_pid);
    CREATE TEMP TABLE tmp_p2c_fail (anulada BOOLEAN);
    INSERT INTO tmp_p2c_fail SELECT anulada FROM transacciones WHERE id = v_pid;
END; 
$$;
SELECT results_eq('SELECT anulada FROM tmp_p2c_fail', 'VALUES (true)', 'Marcar como fallida P2C sin comisión anula la principal exitosamente sin error');

-- TEST 29: Marcar como fallida una P2C donde el usuario SÍ asumió comisión (ajusta al mínimo legal Bs. 14)
DO $$ 
DECLARE 
    v_res JSONB; 
    v_pid UUID;
    v_cid UUID;
BEGIN 
    v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 2000.00, 'VES', 'pm_p2c', 40.00, now(), 'P2C Con Comision Fallida', NULL, FALSE, TRUE);
    v_pid := (v_res->>'principal_id')::uuid;
    v_cid := (v_res->>'comision_id')::uuid;
    PERFORM marcar_operacion_como_fallida(v_pid);
    CREATE TEMP TABLE tmp_p2c_fail_ajustada (monto NUMERIC);
    INSERT INTO tmp_p2c_fail_ajustada SELECT monto_original FROM transacciones WHERE id = v_cid;
END; 
$$;
SELECT results_eq('SELECT monto FROM tmp_p2c_fail_ajustada', 'VALUES (14.00::numeric)', 'Marcar como fallida P2C con comisión ajusta el cobro al mínimo legal de 14 Bs');

-- CLEANUP
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
