DROP POLICY IF EXISTS "Auth read evidencias" ON storage.objects;

CREATE POLICY "Update own or admin evidencias files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'evidencias' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  bucket_id = 'evidencias' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);