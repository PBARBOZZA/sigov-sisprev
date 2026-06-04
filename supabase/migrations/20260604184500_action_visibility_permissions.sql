-- Restrict action visibility for responsavel users while keeping admin/manage access.

DROP POLICY IF EXISTS "Active view acoes" ON public.acoes;

CREATE POLICY "View permitted acoes"
ON public.acoes FOR SELECT TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_diretoria(auth.uid())
    OR responsavel_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.acoes_apoiadores ap
      WHERE ap.acao_id = acoes.id
        AND ap.usuario_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Auth view apoiadores" ON public.acoes_apoiadores;

CREATE POLICY "View permitted apoiadores"
ON public.acoes_apoiadores FOR SELECT TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    public.is_admin_or_diretoria(auth.uid())
    OR usuario_id = auth.uid()
  )
);
