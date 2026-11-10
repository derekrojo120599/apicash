-- Migración: Tarjetas de Crédito, Compras Financiadas a Cuotas y Papelera Soft-Delete
-- Fecha: 10/11/2026
-- Objetivo: Evolución contable para desacoplar deuda revolvente de cuentas bancarias líquidas,
--           soportar créditos tipo Cashea (inicial + cuotas quincenales/mensuales) y soft-delete reactivo.

BEGIN;

-- ==============================================================================
-- 1. TABLA: tarjetas_credito
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tarjetas_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    banco TEXT,
    moneda moneda_enum NOT NULL DEFAULT 'USD',
    limite_credito NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (limite_credito >= 0),
    saldo_deuda NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (saldo_deuda >= 0),
    dia_corte INT NOT NULL CHECK (dia_corte >= 1 AND dia_corte <= 31),
    dia_pago INT NOT NULL CHECK (dia_pago >= 1 AND dia_pago <= 31),
    pago_minimo_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (pago_minimo_pct >= 0 AND pago_minimo_pct <= 100),
    interes_mensual_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (interes_mensual_pct >= 0 AND interes_mensual_pct <= 100),
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tarjetas_credito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan sus propias tarjetas de credito"
ON tarjetas_credito FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tarjetas_credito_user ON tarjetas_credito(user_id);

-- ==============================================================================
-- 2. TABLA: compras_credito (Financiamiento tipo Cashea / Krece)
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

CREATE POLICY "Usuarios gestionan sus propias compras a credito"
ON compras_credito FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_compras_credito_user ON compras_credito(user_id);

-- ==============================================================================
-- 3. TABLA: cuotas_compra (Cronograma de amortización)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS cuotas_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_credito_id UUID NOT NULL REFERENCES compras_credito(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero_cuota INT NOT NULL CHECK (numero_cuota >= 1),
    monto NUMERIC(18,2) NOT NULL CHECK (monto > 0),
    fecha_vencimiento DATE NOT NULL,
    fecha_pago TIMESTAMPTZ,
    transaccion_id UUID, -- Se asignará FK una vez verificada transacciones
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cuotas_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gestionan las cuotas de sus compras"
ON cuotas_compra FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cuotas_compra_vencimiento ON cuotas_compra(user_id, fecha_vencimiento, estado);

-- ==============================================================================
-- 4. EXTENSIÓN DE TABLA: transacciones (Soft-Delete y Vínculos de Crédito)
-- ==============================================================================
ALTER TABLE transacciones 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tarjeta_credito_id UUID REFERENCES tarjetas_credito(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS compra_credito_id UUID REFERENCES compras_credito(id) ON DELETE SET NULL;

-- Vincular transaccion_id en cuotas_compra
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

CREATE INDEX IF NOT EXISTS idx_transacciones_deleted_at ON transacciones(user_id, deleted_at);

-- ==============================================================================
-- 5. RPCs CONTABLES: Papelera Reactiva (Soft-Delete & Restore)
-- ==============================================================================

-- Función para enviar transacción a papelera
CREATE OR REPLACE FUNCTION soft_delete_transaccion(p_transaccion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx RECORD;
    v_cuenta RECORD;
    v_tarjeta RECORD;
BEGIN
    -- 1. Obtener y bloquear la transacción
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

    -- 2. Revertir saldo contable
    IF v_tx.tarjeta_credito_id IS NOT NULL THEN
        -- Gasto pagado con tarjeta: reduce la deuda acumulada
        UPDATE tarjetas_credito
        SET saldo_deuda = GREATEST(0, saldo_deuda - v_tx.monto_original)
        WHERE id = v_tx.tarjeta_credito_id;
    ELSIF v_tx.cuenta_id IS NOT NULL AND NOT v_tx.anulada THEN
        -- Movimiento en cuenta bancaria/líquida
        IF v_tx.tipo = 'gasto' THEN
            -- Se devuelve el dinero a la cuenta
            UPDATE cuentas
            SET saldo_cache = saldo_cache + v_tx.monto_original
            WHERE id = v_tx.cuenta_id;
        ELSIF v_tx.tipo = 'ingreso' THEN
            -- Se descuenta el ingreso que fue enviado a papelera
            UPDATE cuentas
            SET saldo_cache = saldo_cache - v_tx.monto_original
            WHERE id = v_tx.cuenta_id;
        END IF;
    END IF;

    -- 3. Marcar como eliminada suavemente
    UPDATE transacciones 
    SET deleted_at = now() 
    WHERE id = p_transaccion_id;

    RETURN jsonb_build_object(
        'success', true, 
        'transaccion_id', p_transaccion_id, 
        'deleted_at', now()
    );
END;
$$;

-- Función para restaurar transacción desde la papelera
CREATE OR REPLACE FUNCTION restaurar_transaccion(p_transaccion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx RECORD;
BEGIN
    -- 1. Obtener transacción eliminada
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

    -- 2. Restituir impacto contable
    IF v_tx.tarjeta_credito_id IS NOT NULL THEN
        -- Re-incrementar la deuda en la tarjeta
        UPDATE tarjetas_credito
        SET saldo_deuda = saldo_deuda + v_tx.monto_original
        WHERE id = v_tx.tarjeta_credito_id;
    ELSIF v_tx.cuenta_id IS NOT NULL AND NOT v_tx.anulada THEN
        IF v_tx.tipo = 'gasto' THEN
            -- Volver a debitar el gasto
            UPDATE cuentas
            SET saldo_cache = saldo_cache - v_tx.monto_original
            WHERE id = v_tx.cuenta_id;
        ELSIF v_tx.tipo = 'ingreso' THEN
            -- Volver a acreditar el ingreso
            UPDATE cuentas
            SET saldo_cache = saldo_cache + v_tx.monto_original
            WHERE id = v_tx.cuenta_id;
        END IF;
    END IF;

    -- 3. Limpiar marca de papelera
    UPDATE transacciones 
    SET deleted_at = NULL 
    WHERE id = p_transaccion_id;

    RETURN jsonb_build_object(
        'success', true, 
        'transaccion_id', p_transaccion_id, 
        'restored_at', now()
    );
END;
$$;

-- Función para purgar transacciones definitivamente
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

COMMIT;
