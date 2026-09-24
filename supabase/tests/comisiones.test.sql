-- Test Suite: pgTAP Tests para Comisiones Bancarias y RPC registrar_operacion_con_comision
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(37); -- 37 aserciones

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
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'Banesco', 'banco', 'VES', 500000.00),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'Zelle', 'banco', 'USD', 50000.00) 
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

-- TEST 2: Control Positivo (El usuario 1 ve sus filas, son 8 semillas)
PREPARE test_positivo AS SELECT count(*) FROM comisiones_config WHERE user_id = '00000000-0000-0000-0000-000000000001';
SELECT results_eq('test_positivo', 'VALUES (8::bigint)', 'Usuario 1 ve sus 8 filas sembradas de comisiones_config');

-- TEST 3: RLS Isolation
PREPARE test_hacker AS SELECT * FROM comisiones_config WHERE user_id = '00000000-0000-0000-0000-000000000002';
SELECT is_empty('test_hacker', 'RLS protege lectura de otros usuarios');

-- TEST 3: Parámetro de monto inválido (negativo)
PREPARE test_monto_negativo AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', -50.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE);
SELECT throws_ok('test_monto_negativo', 'P0001', NULL, 'Rechaza monto negativo');

-- TEST 4: Monto que redondea a 0 (0.004 -> ROUND -> 0.00 -> rechazado)
PREPARE test_monto_cero AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 0.004, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE);
SELECT throws_ok('test_monto_cero', 'P0001', 'El monto debe ser mayor a 0 (redondeado: 0.00)', 'Rechaza monto que redondea a 0.00');

-- TEST 5: Tasa obligatoria para VES
PREPARE test_sin_tasa AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', NULL, now(), 'Test', NULL, FALSE);
SELECT throws_like('test_sin_tasa', 'p_tasa_cambio es obligatoria%', 'Rechaza operación VES si falta tasa');

-- TEST 6: Operación Exitosa / Default Seed Values (14.00 Mínimo P2P)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 10.00, 'VES', 'pm_p2p', 40.1234, now(), 'Test Min', NULL, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Min'')', 'VALUES (14.00::numeric)', 'Mínimo semilla de 14.00 Bs aplicado a P2P');

-- TEST 7: Half-Up Boundary Check (4675.00 * 0.003 = 14.025 -> 14.03)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 4675.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Math Half-up', NULL, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Math Half-up'')', 'VALUES (14.03::numeric)', 'Matemática porcentual Half-up exacta redondea 14.025 a 14.03');

-- TEST 8: Operación Fallida cobra minimo_ves (14.00), no porcentaje (500 * 0.003 = 1.50)
DO $$ 
DECLARE v_res JSONB; 
BEGIN 
    v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 500.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Fail', NULL, TRUE); 
    CREATE TEMP TABLE tmp_fail(id UUID); INSERT INTO tmp_fail VALUES ((v_res->>'comision_id')::uuid); 
END; 
$$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE id = (SELECT id FROM tmp_fail LIMIT 1)', 'VALUES (14.00::numeric)', 'Fallida cobra minimo_ves (14.00), no porcentaje');

-- TEST 9: Operación Fallida con monto grande (100000 Bs) aún cobra 14.00 (minimo, no 300.00)
DO $$ 
DECLARE v_res JSONB; 
BEGIN 
    v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100000.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Fail Grande', NULL, TRUE); 
    CREATE TEMP TABLE tmp_fail_big(id UUID); INSERT INTO tmp_fail_big VALUES ((v_res->>'comision_id')::uuid); 
END; 
$$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE id = (SELECT id FROM tmp_fail_big LIMIT 1)', 'VALUES (14.00::numeric)', 'Fallida con 100000 Bs cobra minimo_ves (14.00), no 300.00 de porcentaje');

-- TEST 10: Validación Saldo Insuficiente FOR UPDATE
PREPARE test_saldo AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 999999.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE);
SELECT throws_like('test_saldo', 'Saldo insuficiente%', 'Excede el saldo bloqueado FOR UPDATE');

-- TEST 11: Override Rechazado en pm_p2p (permite_override = false)
PREPARE test_override AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', 200.00, FALSE);
SELECT throws_like('test_override', 'Override rechazado%', 'Rechaza override en pm_p2p (permite_override = false)');

-- TEST 12: Override Rechazado en biopago (permite_override = false, lo paga el comercio)
PREPARE test_override_biopago AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'biopago', 40.00, now(), 'Test', 5.00, FALSE);
SELECT throws_like('test_override_biopago', 'Override rechazado%', 'Rechaza override en biopago (comercio lo paga)');

-- TEST 14: Cuenta USD ignora comisión
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'USD', 'pm_p2p', 40.00, now(), 'Test USD', NULL, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''Test USD''', 'USD inserta principal exitosamente');
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test USD'')', 'USD inserta principal pero comisión es 0');

-- TEST 15: Subtipo sin configuración vigente (fecha anterior al seed)
PREPARE test_sin_config AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, '2020-01-01 00:00:00+00', 'Test', NULL, FALSE);
SELECT throws_like('test_sin_config', 'No se encontró configuración de comisiones vigente%', 'Rechaza fecha anterior a la vigencia del tarifario');

-- TEST 16: Ingreso (Valida y escribe, pero comisión = 0)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ingreso', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Ingreso', NULL, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''Test Ingreso''', 'Ingreso inserta la transacción principal exitosamente');
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Ingreso'')', 'Ingreso no deduce comisiones en P2P');

-- TEST 17: ON DELETE NO ACTION (Fallo de integridad 23503)
DO $$
DECLARE v_padre JSONB;
BEGIN
    v_padre := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 10.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Delete', NULL, FALSE);
    CREATE TEMP TABLE tmp_padre (id UUID); INSERT INTO tmp_padre VALUES ((v_padre->>'principal_id')::uuid);
END;
$$;
RESET ROLE; -- Cambia a postgres temporalmente para forzar el DELETE que superaría el RLS
PREPARE test_delete_restrict AS DELETE FROM transacciones WHERE id = (SELECT id FROM tmp_padre LIMIT 1);
SELECT throws_ok('test_delete_restrict', '23503', NULL, 'ON DELETE NO ACTION previene borrar la principal con hijas');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- TEST 17: Cajero (54 Bs Fijos)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'cajero', 40.00, now(), 'Cajero', NULL, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Cajero'')', 'VALUES (54.00::numeric)', 'Cajero extrae 54 fijos');

-- TEST 18: C2P Mismo Banco (1.75% -> 1000 * 0.0175 = 17.50)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_c2p_mismo_banco', 40.00, now(), 'C2P_MB', NULL, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''C2P_MB'')', 'VALUES (17.50::numeric)', 'Aplica 1.75% a C2P mismo banco');

-- TEST 19: Fecha atrasada válida (2026-08-15 > 2026-08-01 seed)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, '2026-08-15 12:00:00-04', 'Retroactiva', NULL, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Retroactiva'')', 'Acepta operaciones con fechas pasadas vigentes');

-- TEST 20: P2C override exitoso (permite_override = true, 1.5% de 1000 = 15.00, override 14.50)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_p2c', 40.00, now(), 'P2C Override', 14.50, FALSE); END; $$;
SELECT results_eq('SELECT monto_original FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''P2C Override'')', 'VALUES (14.50::numeric)', 'Acepta override P2C dentro del tope');

-- TEST 21: P2C override rechazado (Fuera de tope: 1.5% de 1000 = 15.00, enviando 16.00)
PREPARE test_p2c_fueratope AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'pm_p2c', 40.00, now(), 'Test', 16.00, FALSE);
SELECT throws_ok('test_p2c_fueratope', 'P0001', 'Override rechazado: monto 16.00 fuera del rango permitido (0 a 15.00)', 'Rechaza override P2C si supera el tope calculado');

-- TEST 23: Biopago no cobra comisión (asume el comercio)
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 1000.00, 'VES', 'biopago', 40.00, now(), 'Test Biopago', NULL, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''Test Biopago''', 'Biopago inserta la transacción principal exitosamente');
SELECT is_empty('SELECT id FROM transacciones WHERE transaccion_padre_id = (SELECT id FROM transacciones WHERE descripcion = ''Test Biopago'')', 'Biopago no genera fila de comisión porque lo paga el comercio');

-- TEST 23: TODO: Migración NUMERIC Fase 5 - Test de 8 decimales guardados intactos
SELECT todo('Fase 5: Migración de la columna tasa_al_momento a NUMERIC(20,8) requerida para este test');
SELECT col_type_is('transacciones', 'tasa_al_momento', 'numeric(20,8)', 'tasa_al_momento debe ser NUMERIC(20,8) (Pendiente Fase 5)');

-- TEST 24: Verificación ACTIVA de que la tasa 40.12345678 se redondea a 4 decimales HOY
DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.12345678, now(), 'Test Tasa 4 Decimales Hoy', NULL, FALSE); END; $$;
SELECT results_eq(
    'SELECT tasa_al_momento FROM transacciones WHERE id = (SELECT id FROM transacciones WHERE descripcion = ''Test Tasa 4 Decimales Hoy'')', 
    'VALUES (40.1235::numeric)', 
    'Mientras tasa sea NUMERIC(18,4), 40.12345678 se guarda como 40.1235'
);

-- TEST 25: Check Saldo con Aritmética (no hardcodear el resultado)
DO $$ DECLARE v_saldo_antes NUMERIC; v_res JSONB; BEGIN SELECT saldo_cache INTO v_saldo_antes FROM cuentas WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'; v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test Saldo', NULL, FALSE); CREATE TEMP TABLE tmp_saldo(antes NUMERIC); INSERT INTO tmp_saldo VALUES (v_saldo_antes); END; $$;
SELECT results_eq(
    'SELECT saldo_cache FROM cuentas WHERE id = ''cccccccc-cccc-cccc-cccc-cccccccccccc''', 
    'SELECT antes - 100.00 - 14.00 FROM tmp_saldo', 
    'El saldo se redujo proporcionalmente al monto y la comisión'
);

-- TEST 26: Validación monto_usd_calculado en cuenta USD (igual al monto original)
SELECT results_eq(
    'SELECT monto_usd_calculado FROM transacciones WHERE descripcion = ''Test USD''', 
    'VALUES (100.00::numeric)', 
    'En cuenta USD, monto_usd_calculado = monto_original'
);

-- TEST 27: Zona horaria límite (2026-07-31 23:00-04 rechazado; 2026-08-01 00:30-04 aceptado)
PREPARE test_timezone_rechazado AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, '2026-07-31 23:00:00-04', 'TZ Reject', NULL, FALSE);
SELECT throws_like('test_timezone_rechazado', 'No se encontró configuración de comisiones vigente%', 'Rechaza 2026-07-31 23:00-04 (previo a semilla de 2026-08-01)');

DO $$ DECLARE v_res JSONB; BEGIN v_res := registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, '2026-08-01 00:30:00-04', 'TZ Accept', NULL, FALSE); END; $$;
SELECT isnt_empty('SELECT id FROM transacciones WHERE descripcion = ''TZ Accept''', 'Acepta 2026-08-01 00:30-04 (Vigencia activa)');

-- TEST 28: RPC con JWT usuario 2 sobre cuenta de usuario 1
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002"}';
PREPARE test_hacker_op AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE);
SELECT throws_like('test_hacker_op', 'Cuenta no encontrada o no autorizada', 'Usuario 2 no puede operar la cuenta del Usuario 1');
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- TEST 29: Categoría ajena
PREPARE test_cat_ajena AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE);
SELECT throws_like('test_cat_ajena', 'La categoría principal no fue encontrada o no pertenece al usuario', 'Usuario 1 no puede usar categoría del Usuario 2');

-- TEST 30: p_tipo = 'transferencia' no calza con enum y es invalido
PREPARE test_tipo_invalido AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'transferencia', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE);
SELECT throws_like('test_tipo_invalido', 'Tipo de transacción inválido o nulo', 'Rechaza si el p_tipo no es ingreso o gasto al invocar la rpc');

-- TEST 31: Categoría es de ingreso y operacion es gasto
PREPARE test_tipo_mismatch AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', NULL, FALSE);
SELECT throws_like('test_tipo_mismatch', 'El tipo de la categoría principal (%) no coincide con el tipo de operación (%)', 'Rechaza si el p_tipo es gasto pero la categoría es ingreso');

-- TEST 32: Operación fallida rechaza override
PREPARE test_fallida_override AS SELECT registrar_operacion_con_comision('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gasto', 100.00, 'VES', 'pm_p2p', 40.00, now(), 'Test', 15.00, TRUE);
SELECT throws_like('test_fallida_override', 'No se permite override de comisión en operaciones fallidas', 'Rechaza override en operaciones fallidas');

-- CLEANUP
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
