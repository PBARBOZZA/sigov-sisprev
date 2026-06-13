-- Evidence registry: uploaded files are optional; external links/network paths are accepted.

ALTER TABLE public.evidencias
  ADD COLUMN IF NOT EXISTS tipo_evidencia text,
  ADD COLUMN IF NOT EXISTS link_externo text,
  ADD COLUMN IF NOT EXISTS caminho_pasta text,
  ADD COLUMN IF NOT EXISTS numero_processo text,
  ADD COLUMN IF NOT EXISTS data_evidencia date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

ALTER TABLE public.evidencias
  ALTER COLUMN caminho_arquivo DROP NOT NULL;

UPDATE public.evidencias
SET status = 'enviada'
WHERE status = 'pendente'
  AND caminho_arquivo IS NOT NULL;

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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'evidencias_registry_location_check'
      AND conrelid = 'public.evidencias'::regclass
  ) THEN
    ALTER TABLE public.evidencias
      ADD CONSTRAINT evidencias_registry_location_check
      CHECK (
        caminho_arquivo IS NOT NULL
        OR nullif(btrim(link_externo), '') IS NOT NULL
        OR nullif(btrim(caminho_pasta), '') IS NOT NULL
      );
  END IF;
END $$;

-- Keep completion governance based on any registered evidence, not only uploaded files.
CREATE OR REPLACE FUNCTION public.enforce_acoes_governance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_is_manager boolean := false;
  actor_is_responsavel boolean := false;
  actor_is_apoiador boolean := false;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  actor_is_manager := public.is_admin_or_diretoria(actor);
  actor_is_responsavel := OLD.responsavel_id = actor;
  SELECT EXISTS (
    SELECT 1
    FROM public.acoes_apoiadores ap
    WHERE ap.acao_id = OLD.id
      AND ap.usuario_id = actor
  ) INTO actor_is_apoiador;

  IF NEW.status = 'concluida'::public.acao_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NOT EXISTS (SELECT 1 FROM public.evidencias e WHERE e.acao_id = OLD.id)
     AND length(trim(coalesce(NEW.observacoes, ''))) = 0 THEN
    RAISE EXCEPTION 'Para concluir sem evidencia cadastrada, informe uma justificativa em Observacoes.';
  END IF;

  IF actor_is_manager THEN
    RETURN NEW;
  END IF;

  IF actor_is_responsavel THEN
    IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id
       OR OLD.responsavel_nome IS DISTINCT FROM NEW.responsavel_nome
       OR OLD.area_id IS DISTINCT FROM NEW.area_id
       OR OLD.plano_anual_id IS DISTINCT FROM NEW.plano_anual_id
       OR OLD.eixo_id IS DISTINCT FROM NEW.eixo_id
       OR OLD.programa_id IS DISTINCT FROM NEW.programa_id
       OR OLD.eixo_estrategico IS DISTINCT FROM NEW.eixo_estrategico
       OR OLD.programa IS DISTINCT FROM NEW.programa
       OR OLD.projeto IS DISTINCT FROM NEW.projeto
       OR OLD.codigo IS DISTINCT FROM NEW.codigo
       OR OLD.titulo IS DISTINCT FROM NEW.titulo THEN
      RAISE EXCEPTION 'Responsaveis nao podem alterar responsavel, area ou vinculos estrategicos da acao.';
    END IF;
    RETURN NEW;
  END IF;

  IF actor_is_apoiador THEN
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.percentual_execucao IS DISTINCT FROM NEW.percentual_execucao
       OR OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
      IF OLD.prioridade IS NOT DISTINCT FROM NEW.prioridade
         AND OLD.data_inicio IS NOT DISTINCT FROM NEW.data_inicio
         AND OLD.prazo_final IS NOT DISTINCT FROM NEW.prazo_final
         AND OLD.descricao IS NOT DISTINCT FROM NEW.descricao
         AND OLD.objetivo IS NOT DISTINCT FROM NEW.objetivo
         AND OLD.periodicidade IS NOT DISTINCT FROM NEW.periodicidade
         AND OLD.responsavel_id IS NOT DISTINCT FROM NEW.responsavel_id
         AND OLD.responsavel_nome IS NOT DISTINCT FROM NEW.responsavel_nome
         AND OLD.area_id IS NOT DISTINCT FROM NEW.area_id
         AND OLD.plano_anual_id IS NOT DISTINCT FROM NEW.plano_anual_id
         AND OLD.eixo_id IS NOT DISTINCT FROM NEW.eixo_id
         AND OLD.programa_id IS NOT DISTINCT FROM NEW.programa_id
         AND OLD.eixo_estrategico IS NOT DISTINCT FROM NEW.eixo_estrategico
         AND OLD.programa IS NOT DISTINCT FROM NEW.programa
         AND OLD.projeto IS NOT DISTINCT FROM NEW.projeto
         AND OLD.codigo IS NOT DISTINCT FROM NEW.codigo
         AND OLD.titulo IS NOT DISTINCT FROM NEW.titulo THEN
        RETURN NEW;
      END IF;
    END IF;
    RAISE EXCEPTION 'Apoiadores podem alterar apenas status, percentual e observacoes.';
  END IF;

  RAISE EXCEPTION 'Perfil sem permissao para alterar esta acao.';
END;
$$;
