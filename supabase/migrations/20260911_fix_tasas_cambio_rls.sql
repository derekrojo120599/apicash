-- Corregir política RLS de tasas_cambio
-- La política anterior usaba auth.role() = 'service_role', lo cual es frágil
-- porque auth.role() puede no evaluarse correctamente cuando el service role
-- bypassa RLS desde una Edge Function.
--
-- Aplicar en Supabase Dashboard → SQL Editor.

DROP POLICY IF EXISTS "solo_service_role_inserta_tasas" ON tasas_cambio;

CREATE POLICY "solo_service_role_inserta_tasas" ON tasas_cambio
  FOR INSERT
  TO service_role
  WITH CHECK (true);
