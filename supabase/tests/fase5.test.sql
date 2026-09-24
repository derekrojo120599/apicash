BEGIN;

-- Test suite for Phase 5: Precision Monetaria

-- 1. Verificación de precisión 20,8 para tasa_al_momento
DO $$
DECLARE
  v_test_tasa NUMERIC(20,8) := 40.12345678;
  v_id UUID := gen_random_uuid();
  v_tasa_insertada NUMERIC;
BEGIN
  -- Verificar que la tabla acepta el valor con todos los decimales
  -- No insertamos porque violaría RLS o constraints de FK, solo verificamos metadata
  IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'transacciones' AND column_name = 'tasa_al_momento') != 'numeric' THEN
    RAISE EXCEPTION 'tasa_al_momento no es numeric';
  END IF;
  
  IF (SELECT numeric_precision FROM information_schema.columns WHERE table_name = 'transacciones' AND column_name = 'tasa_al_momento') != 20 THEN
    RAISE EXCEPTION 'tasa_al_momento no tiene precision 20';
  END IF;

  IF (SELECT numeric_scale FROM information_schema.columns WHERE table_name = 'transacciones' AND column_name = 'tasa_al_momento') != 8 THEN
    RAISE EXCEPTION 'tasa_al_momento no tiene scale 8';
  END IF;
END $$;

-- 2. Verificación de precisión 20,6 para monto_usd_calculado
DO $$
BEGIN
  IF (SELECT numeric_precision FROM information_schema.columns WHERE table_name = 'transacciones' AND column_name = 'monto_usd_calculado') != 20 THEN
    RAISE EXCEPTION 'monto_usd_calculado no tiene precision 20';
  END IF;

  IF (SELECT numeric_scale FROM information_schema.columns WHERE table_name = 'transacciones' AND column_name = 'monto_usd_calculado') != 6 THEN
    RAISE EXCEPTION 'monto_usd_calculado no tiene scale 6';
  END IF;
END $$;

-- 3. Verificación de cutoff: Ningún balance ha sido alterado (en un entorno real aquí validaríamos)
-- Las migraciones de type ALTER no alteran el valor semántico existente, pero para cumplir con 5.2
-- comprobamos que si redondeamos los valores actuales a 2 decimales, equivalen al histórico original.
-- Dado que PostgreSQL al ampliar la escala rellena con ceros, viejo == round(nuevo, 2)
DO $$
DECLARE
  v_corrupt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_corrupt_count
  FROM transacciones
  WHERE ROUND(monto_usd_calculado, 2) != monto_usd_calculado;
  
  -- Si acabamos de migrar de 18,2 a 20,6, todos los viejos deberían tener sus 4 últimos decimales en 0.
  IF v_corrupt_count > 0 THEN
    RAISE EXCEPTION 'Data historica fue alterada o tiene mas precision de lo esperado antes de nuevas inserciones: % filas afectadas', v_corrupt_count;
  END IF;
END $$;

ROLLBACK;
