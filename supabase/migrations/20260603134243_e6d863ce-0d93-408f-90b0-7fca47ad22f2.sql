
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_diretoria(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_diretoria(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;

-- Storage RLS for evidencias bucket
CREATE POLICY "Auth read evidencias" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidencias');
CREATE POLICY "Auth upload evidencias" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidencias');
CREATE POLICY "Auth delete own evidencias" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidencias' AND owner = auth.uid());
