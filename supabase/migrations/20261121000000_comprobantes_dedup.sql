-- Business rule: a receipt reference number can only be registered once per user
-- (already-referenced receipts are rejected to prevent duplicate transactions).
-- References shorter than 4 characters (e.g. empty / 'S/REF') are never blocked.

CREATE TABLE public.comprobantes_procesados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referencia TEXT NOT NULL,
  transaccion_id UUID REFERENCES public.transacciones(id) ON DELETE SET NULL,
  procesado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX comprobantes_procesados_user_referencia_unicos
  ON public.comprobantes_procesados (user_id, referencia)
  WHERE length(referencia) >= 4;

ALTER TABLE public.comprobantes_procesados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ven_sus_comprobantes_procesados"
  ON public.comprobantes_procesados FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usuarios_insertan_sus_comprobantes_procesados"
  ON public.comprobantes_procesados FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios_actualizan_sus_comprobantes_procesados"
  ON public.comprobantes_procesados FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios_borran_sus_comprobantes_procesados"
  ON public.comprobantes_procesados FOR DELETE
  USING (auth.uid() = user_id);
