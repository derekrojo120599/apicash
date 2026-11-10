-- Migración: Cuentas Compartidas y Gastos Grupales con Confirmación Bilateral (tipo Splitwise)
-- Fecha: 10/11/2026
-- Objetivo: Soporte de gastos compartidos con máquina de estados estricta y código de invitación.

BEGIN;

-- ==============================================================================
-- 1. TABLA: grupos_compartidos
-- ==============================================================================
CREATE TABLE IF NOT EXISTS grupos_compartidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_admin UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    codigo_invitacion TEXT NOT NULL UNIQUE,
    moneda moneda_enum NOT NULL DEFAULT 'USD',
    color TEXT DEFAULT '#10b981',
    icono TEXT DEFAULT 'Users',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE grupos_compartidos ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. TABLA: miembros_grupo
-- ==============================================================================
CREATE TABLE IF NOT EXISTS miembros_grupo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos_compartidos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_alias TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'miembro' CHECK (rol IN ('admin', 'miembro')),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(grupo_id, user_id)
);

ALTER TABLE miembros_grupo ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura para grupos y miembros
CREATE POLICY "Miembros ven sus grupos"
ON grupos_compartidos FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM miembros_grupo mg 
        WHERE mg.grupo_id = grupos_compartidos.id AND mg.user_id = auth.uid() AND mg.activo = true
    )
);

CREATE POLICY "Admin gestiona su grupo"
ON grupos_compartidos FOR ALL
TO authenticated
USING (user_id_admin = auth.uid())
WITH CHECK (user_id_admin = auth.uid());

CREATE POLICY "Miembros ven integrantes de sus grupos"
ON miembros_grupo FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM miembros_grupo mg 
        WHERE mg.grupo_id = miembros_grupo.grupo_id AND mg.user_id = auth.uid() AND mg.activo = true
    )
);

-- ==============================================================================
-- 3. TABLA: gastos_grupo y divisiones_gasto_grupo
-- ==============================================================================
CREATE TABLE IF NOT EXISTS gastos_grupo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos_compartidos(id) ON DELETE CASCADE,
    pagado_por_miembro_id UUID NOT NULL REFERENCES miembros_grupo(id) ON DELETE RESTRICT,
    categoria_id UUID REFERENCES categorias(id),
    monto_total NUMERIC(18,2) NOT NULL CHECK (monto_total > 0),
    moneda moneda_enum NOT NULL DEFAULT 'USD',
    descripcion TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gastos_grupo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Miembros ven gastos de su grupo"
ON gastos_grupo FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM miembros_grupo mg 
        WHERE mg.grupo_id = gastos_grupo.grupo_id AND mg.user_id = auth.uid() AND mg.activo = true
    )
);

CREATE TABLE IF NOT EXISTS divisiones_gasto_grupo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gasto_grupo_id UUID NOT NULL REFERENCES gastos_grupo(id) ON DELETE CASCADE,
    miembro_id UUID NOT NULL REFERENCES miembros_grupo(id) ON DELETE RESTRICT,
    monto_debe NUMERIC(18,2) NOT NULL CHECK (monto_debe >= 0),
    saldado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE divisiones_gasto_grupo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Miembros ven divisiones de gastos de su grupo"
ON divisiones_gasto_grupo FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM gastos_grupo gg
        JOIN miembros_grupo mg ON mg.grupo_id = gg.grupo_id
        WHERE gg.id = divisiones_gasto_grupo.gasto_grupo_id 
          AND mg.user_id = auth.uid() 
          AND mg.activo = true
    )
);

-- ==============================================================================
-- 4. TABLA: pagos_grupo (Máquina de estados bilateral)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pagos_grupo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES grupos_compartidos(id) ON DELETE CASCADE,
    emisor_miembro_id UUID NOT NULL REFERENCES miembros_grupo(id) ON DELETE RESTRICT,
    receptor_miembro_id UUID NOT NULL REFERENCES miembros_grupo(id) ON DELETE RESTRICT,
    monto NUMERIC(18,2) NOT NULL CHECK (monto > 0),
    moneda moneda_enum NOT NULL DEFAULT 'USD',
    estado TEXT NOT NULL DEFAULT 'pendiente_confirmacion' CHECK (estado IN ('pendiente_confirmacion', 'confirmado', 'rechazado')),
    cuenta_origen_id UUID REFERENCES cuentas(id),
    nota TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_confirmacion TIMESTAMPTZ,
    CONSTRAINT emisor_distinto_receptor CHECK (emisor_miembro_id <> receptor_miembro_id)
);

ALTER TABLE pagos_grupo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Miembros ven pagos de su grupo"
ON pagos_grupo FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM miembros_grupo mg 
        WHERE mg.grupo_id = pagos_grupo.grupo_id AND mg.user_id = auth.uid() AND mg.activo = true
    )
);

-- ==============================================================================
-- 5. RPCs: Operaciones de Cuentas Compartidas
-- ==============================================================================

-- Generador de código aleatorio corto seguro
CREATE OR REPLACE FUNCTION generar_codigo_grupo_invitacion()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    caracteres TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    codigo TEXT := 'APICAS-';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        codigo := codigo || substr(caracteres, floor(random() * length(caracteres) + 1)::INT, 1);
    END LOOP;
    RETURN codigo;
END;
$$;

-- Crear nuevo grupo
CREATE OR REPLACE FUNCTION crear_grupo_compartido(
    p_nombre TEXT,
    p_descripcion TEXT,
    p_moneda moneda_enum DEFAULT 'USD',
    p_color TEXT DEFAULT '#10b981'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grupo_id UUID;
    v_codigo TEXT;
    v_alias TEXT;
    v_miembro_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Obtener nombre del perfil
    SELECT COALESCE(nombre_completo, 'Tú (Admin)') INTO v_alias
    FROM perfiles WHERE id = auth.uid();

    IF v_alias IS NULL OR v_alias = '' THEN
        v_alias := 'Admin';
    END IF;

    v_codigo := generar_codigo_grupo_invitacion();

    -- Insertar grupo
    INSERT INTO grupos_compartidos (
        user_id_admin, nombre, descripcion, codigo_invitacion, moneda, color
    ) VALUES (
        auth.uid(), p_nombre, p_descripcion, v_codigo, p_moneda, p_color
    ) RETURNING id INTO v_grupo_id;

    -- Insertar creador como primer miembro admin
    INSERT INTO miembros_grupo (
        grupo_id, user_id, nombre_alias, rol, activo
    ) VALUES (
        v_grupo_id, auth.uid(), v_alias, 'admin', true
    ) RETURNING id INTO v_miembro_id;

    RETURN jsonb_build_object(
        'grupo_id', v_grupo_id,
        'codigo_invitacion', v_codigo,
        'miembro_id', v_miembro_id,
        'nombre', p_nombre
    );
END;
$$;

-- Unirse a grupo por código
CREATE OR REPLACE FUNCTION unirse_grupo_por_codigo(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grupo RECORD;
    v_alias TEXT;
    v_miembro_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    SELECT * INTO v_grupo 
    FROM grupos_compartidos 
    WHERE upper(trim(codigo_invitacion)) = upper(trim(p_codigo));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Código de grupo inválido o no existe';
    END IF;

    -- Verificar si ya es miembro
    SELECT id INTO v_miembro_id 
    FROM miembros_grupo 
    WHERE grupo_id = v_grupo.id AND user_id = auth.uid();

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'mensaje', 'Ya eres miembro de este grupo', 'grupo_id', v_grupo.id);
    END IF;

    SELECT COALESCE(nombre_completo, 'Nuevo Miembro') INTO v_alias
    FROM perfiles WHERE id = auth.uid();

    INSERT INTO miembros_grupo (
        grupo_id, user_id, nombre_alias, rol, activo
    ) VALUES (
        v_grupo.id, auth.uid(), v_alias, 'miembro', true
    ) RETURNING id INTO v_miembro_id;

    RETURN jsonb_build_object(
        'success', true,
        'grupo_id', v_grupo.id,
        'miembro_id', v_miembro_id,
        'nombre_grupo', v_grupo.nombre
    );
END;
$$;

-- Responder a pago bilateral (Confirmar o Rechazar)
CREATE OR REPLACE FUNCTION responder_pago_grupal(
    p_pago_id UUID,
    p_accion TEXT -- 'confirmar' | 'rechazar'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pago RECORD;
    v_receptor_user_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Obtener pago y bloquear
    SELECT p.*, mg.user_id as receptor_user_id 
    INTO v_pago
    FROM pagos_grupo p
    JOIN miembros_grupo mg ON mg.id = p.receptor_miembro_id
    WHERE p.id = p_pago_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pago no encontrado';
    END IF;

    IF v_pago.receptor_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Solo el miembro que recibe el pago puede confirmarlo o rechazarlo';
    END IF;

    IF v_pago.estado <> 'pendiente_confirmacion' THEN
        RAISE EXCEPTION 'Este pago ya fue procesado anteriormente (%s)', v_pago.estado;
    END IF;

    IF p_accion = 'confirmar' THEN
        UPDATE pagos_grupo 
        SET estado = 'confirmado', fecha_confirmacion = now() 
        WHERE id = p_pago_id;

        RETURN jsonb_build_object('success', true, 'estado', 'confirmado');
    ELSIF p_accion = 'rechazar' THEN
        UPDATE pagos_grupo 
        SET estado = 'rechazado', fecha_confirmacion = now() 
        WHERE id = p_pago_id;

        RETURN jsonb_build_object('success', true, 'estado', 'rechazado');
    ELSE
        RAISE EXCEPTION 'Acción no válida. Use confirmar o rechazar.';
    END IF;
END;
$$;

COMMIT;
