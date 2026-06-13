-- Ensure the evidencias registry supports metadata-only records.
-- This migration is intentionally additive and preserves existing data.

ALTER TABLE public.evidencias
  ADD COLUMN IF NOT EXISTS tipo_evidencia text,
  ADD COLUMN IF NOT EXISTS link_externo text,
  ADD COLUMN IF NOT EXISTS caminho_pasta text,
  ADD COLUMN IF NOT EXISTS numero_processo text,
  ADD COLUMN IF NOT EXISTS data_evidencia date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.evidencias
  ALTER COLUMN caminho_arquivo DROP NOT NULL;

UPDATE public.evidencias
SET status = 'enviada'
WHERE status = 'pendente'
  AND caminho_arquivo IS NOT NULL;

UPDATE public.evidencias
SET observacoes = observacao
WHERE observacoes IS NULL
  AND observacao IS NOT NULL;

ALTER TABLE public.evidencias
  DROP CONSTRAINT IF EXISTS evidencias_registry_location_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'evidencias_status_check'
      AND conrelid = 'public.evidencias'::regclass
  ) THEN
    ALTER TABLE public.evidencias
      ADD CONSTRAINT evidencias_status_check
      CHECK (status IN ('pendente', 'enviada', 'validada', 'rejeitada'));
  END IF;
END $$;
