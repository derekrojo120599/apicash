-- ==============================================================================
-- APICASH: MIGRACIÓN DEFINITIVA Y CONSOLIDADA (CRÉDITO, PAPELERA Y GRUPOS)
-- Fecha: 10/11/2026
-- Instrucciones: Copiar y ejecutar en el SQL Editor de tu Dashboard de Supabase.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. TABLA: compras_credito (Compras financiadas a cuotas tipo Cashea / Krece)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS compras_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comercio TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    categoria_id UUID REFERENCES categorias(id),
    moneda moneda_enum NOT NULL DEFAULT 'USD',
    monto_total NUMERIC(18,2) NOT NULL CHECK (monto_total > 0),
    monto_inicial NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (monto_inicial >= 0),
    saldo_pendiente NUMERIC(18,2) NOT NULL CHECK (saldo_pendiente >= 0),
    numero_cuotas INT NOT NULL CHECK (numero_cuotas >= 1),
    intervalo_dias INT NOT NULL DEFAULT 14 CHECK (intervalo_dias >= 1),
    cuenta_inicial_id UUID REFERENCES cuentas(id),
    fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'cancelada')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE compras_credito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan sus propias compras a credito" ON compras_credito;
CREATE POLICY "Usuarios gestionan sus propias compras a credito"
ON compras_credito FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_compras_credito_user ON compras_credito(user_id);

-- ==============================================================================
-- 2. TABLA: cuotas_compra (Cronograma de amortización)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS cuotas_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_credito_id UUID NOT NULL REFERENCES compras_credito(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero_cuota INT NOT NULL CHECK (numero_cuota >= 1),
    monto NUMERIC(18,2) NOT NULL CHECK (monto > 0),
    fecha_vencimiento DATE NOT NULL,
    fecha_pago TIMESTAMPTZ,
    transaccion_id UUID,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cuotas_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan las cuotas de sus compras" ON cuotas_compra;
CREATE POLICY "Usuarios gestionan las cuotas de sus compras"
ON cuotas_compra FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cuotas_compra_vencimiento ON cuotas_compra(user_id, fecha_vencimiento, estado);

-- ==============================================================================
-- 3. EXTENSIÓN DE TABLA transacciones (Soft-Delete & Vínculo de compras)
-- ==============================================================================
ALTER TABLE transacciones 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS compra_credito_id UUID REFERENCES compras_credito(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacciones_deleted_at ON transacciones(user_id, deleted_at);

-- Vincular transaccion_id en cuotas_compra si no existe la FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cuotas_compra_transaccion'
    ) THEN
        ALTER TABLE cuotas_compra 
        ADD CONSTRAINT fk_cuotas_compra_transaccion 
        FOREIGN KEY (transaccion_id) REFERENCES transacciones(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ==============================================================================
-- 4. RPCs: PAPELERA REACTIVA (Soft-Delete, Restaurar y Purgar)
-- ==============================================================================
CREATE OR REPLACE FUNCTION soft_delete_transaccion(p_transaccion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx RECORD;
BEGIN
    SELECT * INTO v_tx 
    FROM transacciones 
    WHERE id = p_transaccion_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transacción no encontrada o no pertenece al usuario autenticado';
    END IF;

    IF v_tx.deleted_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'mensaje', 'La transacción ya estaba en la papelera');
    END IF;

    -- Revertir impacto en cuentas
    IF v_tx.cuenta_id IS NOT NULL AND NOT v_tx.anulada THEN
        IF v_tx.tipo = 'gasto' THEN
            UPDATE cuentas SET saldo_cache = saldo_cache + v_tx.monto_original WHERE id = v_tx.cuenta_id;
        ELSIF v_tx.tipo = 'ingreso' THEN
            UPDATE cuentas SET saldo_cache = saldo_cache - v_tx.monto_original WHERE id = v_tx.cuenta_id;
        END IF;
    END IF;

    UPDATE transacciones SET deleted_at = now() WHERE id = p_transaccion_id;

    RETURN jsonb_build_object('success', true, 'transaccion_id', p_transaccion_id, 'deleted_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION restaurar_transaccion(p_transaccion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx RECORD;
BEGIN
    SELECT * INTO v_tx 
    FROM transacciones 
    WHERE id = p_transaccion_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transacción no encontrada o no pertenece al usuario autenticado';
    END IF;

    IF v_tx.deleted_at IS NULL THEN
        RETURN jsonb_build_object('success', true, 'mensaje', 'La transacción no estaba en la papelera');
    END IF;

    -- Reaplicar impacto contable
    IF v_tx.cuenta_id IS NOT NULL AND NOT v_tx.anulada THEN
        IF v_tx.tipo = 'gasto' THEN
            UPDATE cuentas SET saldo_cache = saldo_cache - v_tx.monto_original WHERE id = v_tx.cuenta_id;
        ELSIF v_tx.tipo = 'ingreso' THEN
            UPDATE cuentas SET saldo_cache = saldo_cache + v_tx.monto_original WHERE id = v_tx.cuenta_id;
        END IF;
    END IF;

    UPDATE transacciones SET deleted_at = NULL WHERE id = p_transaccion_id;

    RETURN jsonb_build_object('success', true, 'transaccion_id', p_transaccion_id, 'restored_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION purgar_transaccion_definitiva(p_transaccion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM transacciones 
    WHERE id = p_transaccion_id 
      AND user_id = auth.uid() 
      AND deleted_at IS NOT NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transacción no encontrada en la papelera o no autorizada';
    END IF;

    RETURN jsonb_build_object('success', true, 'purgada_id', p_transaccion_id);
END;
$$;

-- ==============================================================================
-- 5. TABLAS Y RPCS: GRUPOS COMPARTIDOS BILATERALES (Splitwise)
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

DROP POLICY IF EXISTS "Miembros ven sus grupos" ON grupos_compartidos;
CREATE POLICY "Miembros ven sus grupos"
ON grupos_compartidos FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM miembros_grupo mg 
        WHERE mg.grupo_id = grupos_compartidos.id AND mg.user_id = auth.uid() AND mg.activo = true
    )
);

DROP POLICY IF EXISTS "Admin gestiona su grupo" ON grupos_compartidos;
CREATE POLICY "Admin gestiona su grupo"
ON grupos_compartidos FOR ALL
TO authenticated
USING (user_id_admin = auth.uid())
WITH CHECK (user_id_admin = auth.uid());

DROP POLICY IF EXISTS "Miembros ven integrantes de sus grupos" ON miembros_grupo;
CREATE POLICY "Miembros ven integrantes de sus grupos"
ON miembros_grupo FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM miembros_grupo mg 
        WHERE mg.grupo_id = miembros_grupo.grupo_id AND mg.user_id = auth.uid() AND mg.activo = true
    )
);

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

DROP POLICY IF EXISTS "Miembros ven gastos de su grupo" ON gastos_grupo;
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

DROP POLICY IF EXISTS "Miembros ven divisiones de gastos de su grupo" ON divisiones_gasto_grupo;
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

DROP POLICY IF EXISTS "Miembros ven pagos de su grupo" ON pagos_grupo;
CREATE POLICY "Miembros ven pagos de su grupo"
ON pagos_grupo FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM miembros_grupo mg 
        WHERE mg.grupo_id = pagos_grupo.grupo_id AND mg.user_id = auth.uid() AND mg.activo = true
    )
);

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

    SELECT COALESCE(nombre_completo, 'Tú (Admin)') INTO v_alias
    FROM perfiles WHERE id = auth.uid();

    IF v_alias IS NULL OR v_alias = '' THEN
        v_alias := 'Admin';
    END IF;

    v_codigo := generar_codigo_grupo_invitacion();

    INSERT INTO grupos_compartidos (
        user_id_admin, nombre, descripcion, codigo_invitacion, moneda, color
    ) VALUES (
        auth.uid(), p_nombre, p_descripcion, v_codigo, p_moneda, p_color
    ) RETURNING id INTO v_grupo_id;

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

CREATE OR REPLACE FUNCTION responder_pago_grupal(
    p_pago_id UUID,
    p_accion TEXT
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
