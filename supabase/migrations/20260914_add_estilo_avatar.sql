ALTER TABLE perfiles ADD COLUMN estilo_avatar TEXT DEFAULT 'bottts';

CREATE OR REPLACE FUNCTION actualizar_perfil(
  p_nombre_completo TEXT DEFAULT NULL,
  p_fuente_tasa_preferida TEXT DEFAULT NULL,
  p_tema TEXT DEFAULT NULL,
  p_avatar_seed TEXT DEFAULT NULL,
  p_estilo_avatar TEXT DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE perfiles
  SET
    nombre_completo = COALESCE(p_nombre_completo, nombre_completo),
    fuente_tasa_preferida = COALESCE(p_fuente_tasa_preferida, fuente_tasa_preferida),
    tema = COALESCE(p_tema, tema),
    avatar_seed = COALESCE(p_avatar_seed, avatar_seed),
    estilo_avatar = COALESCE(p_estilo_avatar, estilo_avatar)
  WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql;
