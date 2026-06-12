-- Governance permissions for real SIGOV-SISPREV operation.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'apoiador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consulta';

-- All active users can view the institutional action plan.
DROP POLICY IF EXISTS "Active view acoes" ON public.acoes;
DROP POLICY IF EXISTS "View permitted acoes" ON public.acoes;

CREATE POLICY "Active view all acoes"
ON public.acoes FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

DROP POLICY IF EXISTS "Responsible or management update acoes" ON public.acoes;
DROP POLICY IF EXISTS "Update own or admin/diretoria" ON public.acoes;

CREATE POLICY "Governance update permitted acoes"
ON public.acoes FOR UPDATE TO authenticated
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
)
WITH CHECK (
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

-- Apoiadores must be visible to the Kanban/detail permission checks.
DROP POLICY IF EXISTS "View permitted apoiadores" ON public.acoes_apoiadores;
DROP POLICY IF EXISTS "Auth view apoiadores" ON public.acoes_apoiadores;

CREATE POLICY "Active view all apoiadores"
ON public.acoes_apoiadores FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

-- Evidence metadata: active users can view; only managers, responsaveis and apoiadores can insert.
DROP POLICY IF EXISTS "View permitted evidencias" ON public.evidencias;
DROP POLICY IF EXISTS "Insert permitted evidencias" ON public.evidencias;

CREATE POLICY "Active view all evidencias"
ON public.evidencias FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Governance insert evidencias"
ON public.evidencias FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND usuario_id = auth.uid()
  AND (
    public.is_admin_or_diretoria(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.acoes a
      WHERE a.id = evidencias.acao_id
        AND a.responsavel_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.acoes_apoiadores ap
      WHERE ap.acao_id = evidencias.acao_id
        AND ap.usuario_id = auth.uid()
    )
  )
);

-- Storage files follow the same evidence governance.
DROP POLICY IF EXISTS "View permitted evidencias files" ON storage.objects;
DROP POLICY IF EXISTS "Upload own evidencias files" ON storage.objects;

CREATE POLICY "Active view all evidencias files"
ON storage.objects FOR SELECT TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND bucket_id = 'evidencias'
);

CREATE POLICY "Governance upload evidencias files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND bucket_id = 'evidencias'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    public.is_admin_or_diretoria(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.acoes a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.responsavel_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.acoes_apoiadores ap
      WHERE ap.acao_id::text = (storage.foldername(name))[2]
        AND ap.usuario_id = auth.uid()
    )
  )
);

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
    RAISE EXCEPTION 'Para concluir sem evidencia, informe uma justificativa em Observacoes.';
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

DROP TRIGGER IF EXISTS trg_enforce_acoes_governance ON public.acoes;

CREATE TRIGGER trg_enforce_acoes_governance
BEFORE UPDATE ON public.acoes
FOR EACH ROW EXECUTE FUNCTION public.enforce_acoes_governance();

CREATE OR REPLACE FUNCTION public.audit_acoes_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, actor, 'criacao', NULL, NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'status', OLD.status::text, NEW.status::text);
    END IF;

    IF OLD.percentual_execucao IS DISTINCT FROM NEW.percentual_execucao THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'percentual_execucao', OLD.percentual_execucao::text, NEW.percentual_execucao::text);
    END IF;

    IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'observacoes', OLD.observacoes, NEW.observacoes);
    END IF;

    IF OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'responsavel_id', OLD.responsavel_id::text, NEW.responsavel_id::text);
    END IF;

    IF OLD.responsavel_nome IS DISTINCT FROM NEW.responsavel_nome THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'responsavel_nome', OLD.responsavel_nome, NEW.responsavel_nome);
    END IF;

    IF OLD.prazo_final IS DISTINCT FROM NEW.prazo_final THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'prazo_final', OLD.prazo_final::text, NEW.prazo_final::text);
    END IF;

    IF OLD.prioridade IS DISTINCT FROM NEW.prioridade THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'prioridade', OLD.prioridade::text, NEW.prioridade::text);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
