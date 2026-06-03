
-- 1. profiles: restrict SELECT to self or admin/diretoria
DROP POLICY IF EXISTS "Auth view profiles" ON public.profiles;
CREATE POLICY "View own or admin profiles"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin_or_diretoria(auth.uid()));

-- 2. historico_alertas: restrict INSERT
DROP POLICY IF EXISTS "Insert historico_alertas" ON public.historico_alertas;
CREATE POLICY "Admin insert historico_alertas"
ON public.historico_alertas FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_diretoria(auth.uid()));

-- 3. notificacoes: enforce own user
DROP POLICY IF EXISTS "Insert notifications" ON public.notificacoes;
CREATE POLICY "Insert own notifications"
ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- 4. historico_acoes: restrict insertion
DROP POLICY IF EXISTS "Insert historico_acoes" ON public.historico_acoes;
CREATE POLICY "Insert historico_acoes"
ON public.historico_acoes FOR INSERT TO authenticated
WITH CHECK (
  usuario_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.acoes
    WHERE id = acao_id
      AND (responsavel_id = auth.uid() OR public.is_admin_or_diretoria(auth.uid()))
  )
);

-- 5. Storage evidencias: path-based ownership (first folder = user id)
DROP POLICY IF EXISTS "Auth view evidencias storage" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload evidencias" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own evidencias" ON storage.objects;

CREATE POLICY "View own or admin evidencias files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'evidencias'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin_or_diretoria(auth.uid())
  )
);

CREATE POLICY "Upload own evidencias files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evidencias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Delete own or admin evidencias files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'evidencias'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
