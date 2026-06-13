-- Evidence metadata can be registered even when Supabase Storage is not configured.

ALTER TABLE public.evidencias
  ALTER COLUMN caminho_arquivo DROP NOT NULL;

ALTER TABLE public.evidencias
  DROP CONSTRAINT IF EXISTS evidencias_registry_location_check;
