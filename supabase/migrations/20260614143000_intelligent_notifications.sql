-- Intelligent internal notifications for action deadlines, missing evidence and inactive users.

ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS acao_id uuid REFERENCES public.acoes(id) ON DELETE CASCADE;

UPDATE public.notificacoes n
SET acao_id = n.referencia_id
WHERE n.acao_id IS NULL
  AND n.referencia_tipo = 'acao'
  AND EXISTS (SELECT 1 FROM public.acoes a WHERE a.id = n.referencia_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida_created
  ON public.notificacoes (usuario_id, lida, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_acao_tipo
  ON public.notificacoes (acao_id, tipo);

DROP POLICY IF EXISTS "View own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Update own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Insert notifications" ON public.notificacoes;

CREATE POLICY "View own or governance notifications"
ON public.notificacoes FOR SELECT TO authenticated
USING (
  usuario_id = auth.uid()
  OR public.is_admin_or_diretoria(auth.uid())
);

CREATE POLICY "Update own or governance notifications"
ON public.notificacoes FOR UPDATE TO authenticated
USING (
  usuario_id = auth.uid()
  OR public.is_admin_or_diretoria(auth.uid())
)
WITH CHECK (
  usuario_id = auth.uid()
  OR public.is_admin_or_diretoria(auth.uid())
);

CREATE POLICY "Insert notifications"
ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.gerar_notificacoes_inteligentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  step_count integer := 0;
BEGIN
  WITH recipients AS (
    SELECT a.id AS acao_id, a.titulo, a.prazo_final, a.responsavel_id AS usuario_id
    FROM public.acoes a
    WHERE a.responsavel_id IS NOT NULL

    UNION

    SELECT a.id AS acao_id, a.titulo, a.prazo_final, ap.usuario_id
    FROM public.acoes a
    JOIN public.acoes_apoiadores ap ON ap.acao_id = a.id

    UNION

    SELECT a.id AS acao_id, a.titulo, a.prazo_final, ur.user_id AS usuario_id
    FROM public.acoes a
    JOIN public.user_roles ur ON ur.role = ANY (ARRAY['admin','diretoria']::public.app_role[])
  ),
  candidates AS (
    SELECT DISTINCT
      r.usuario_id,
      r.acao_id,
      'acao_vencendo'::text AS tipo,
      'Ação vencendo'::text AS titulo,
      format('A ação "%s" vence em %s.', r.titulo, to_char(r.prazo_final, 'DD/MM/YYYY')) AS mensagem
    FROM recipients r
    JOIN public.profiles p ON p.id = r.usuario_id AND p.status = true
    JOIN public.acoes a ON a.id = r.acao_id
    WHERE a.status NOT IN ('concluida','cancelada')
      AND a.prazo_final BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.usuario_id = r.usuario_id
          AND n.tipo = 'acao_vencendo'
          AND n.acao_id = r.acao_id
      )
  )
  INSERT INTO public.notificacoes (usuario_id, acao_id, referencia_tipo, referencia_id, tipo, titulo, mensagem)
  SELECT usuario_id, acao_id, 'acao', acao_id, tipo, titulo, mensagem
  FROM candidates;

  GET DIAGNOSTICS step_count = ROW_COUNT;
  inserted_count := inserted_count + step_count;

  WITH recipients AS (
    SELECT a.id AS acao_id, a.titulo, a.prazo_final, a.responsavel_id AS usuario_id
    FROM public.acoes a
    WHERE a.responsavel_id IS NOT NULL

    UNION

    SELECT a.id AS acao_id, a.titulo, a.prazo_final, ap.usuario_id
    FROM public.acoes a
    JOIN public.acoes_apoiadores ap ON ap.acao_id = a.id

    UNION

    SELECT a.id AS acao_id, a.titulo, a.prazo_final, ur.user_id AS usuario_id
    FROM public.acoes a
    JOIN public.user_roles ur ON ur.role = ANY (ARRAY['admin','diretoria']::public.app_role[])
  ),
  candidates AS (
    SELECT DISTINCT
      r.usuario_id,
      r.acao_id,
      'acao_vencendo_30'::text AS tipo,
      'Ação vencendo em 30 dias'::text AS titulo,
      format('A ação "%s" vence em %s.', r.titulo, to_char(r.prazo_final, 'DD/MM/YYYY')) AS mensagem
    FROM recipients r
    JOIN public.profiles p ON p.id = r.usuario_id AND p.status = true
    JOIN public.acoes a ON a.id = r.acao_id
    WHERE a.status NOT IN ('concluida','cancelada')
      AND a.prazo_final > CURRENT_DATE + 7
      AND a.prazo_final <= CURRENT_DATE + 30
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.usuario_id = r.usuario_id
          AND n.tipo = 'acao_vencendo_30'
          AND n.acao_id = r.acao_id
      )
  )
  INSERT INTO public.notificacoes (usuario_id, acao_id, referencia_tipo, referencia_id, tipo, titulo, mensagem)
  SELECT usuario_id, acao_id, 'acao', acao_id, tipo, titulo, mensagem
  FROM candidates;

  GET DIAGNOSTICS step_count = ROW_COUNT;
  inserted_count := inserted_count + step_count;

  WITH recipients AS (
    SELECT a.id AS acao_id, a.titulo, a.prazo_final, a.responsavel_id AS usuario_id
    FROM public.acoes a
    WHERE a.responsavel_id IS NOT NULL

    UNION

    SELECT a.id AS acao_id, a.titulo, a.prazo_final, ap.usuario_id
    FROM public.acoes a
    JOIN public.acoes_apoiadores ap ON ap.acao_id = a.id

    UNION

    SELECT a.id AS acao_id, a.titulo, a.prazo_final, ur.user_id AS usuario_id
    FROM public.acoes a
    JOIN public.user_roles ur ON ur.role = ANY (ARRAY['admin','diretoria']::public.app_role[])
  ),
  candidates AS (
    SELECT DISTINCT
      r.usuario_id,
      r.acao_id,
      'acao_atrasada'::text AS tipo,
      'Ação atrasada'::text AS titulo,
      format('A ação "%s" venceu em %s.', r.titulo, to_char(r.prazo_final, 'DD/MM/YYYY')) AS mensagem
    FROM recipients r
    JOIN public.profiles p ON p.id = r.usuario_id AND p.status = true
    JOIN public.acoes a ON a.id = r.acao_id
    WHERE a.status NOT IN ('concluida','cancelada')
      AND a.prazo_final < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.usuario_id = r.usuario_id
          AND n.tipo = 'acao_atrasada'
          AND n.acao_id = r.acao_id
      )
  )
  INSERT INTO public.notificacoes (usuario_id, acao_id, referencia_tipo, referencia_id, tipo, titulo, mensagem)
  SELECT usuario_id, acao_id, 'acao', acao_id, tipo, titulo, mensagem
  FROM candidates;

  GET DIAGNOSTICS step_count = ROW_COUNT;
  inserted_count := inserted_count + step_count;

  WITH recipients AS (
    SELECT a.id AS acao_id, a.titulo, a.responsavel_id AS usuario_id
    FROM public.acoes a
    WHERE a.responsavel_id IS NOT NULL

    UNION

    SELECT a.id AS acao_id, a.titulo, ap.usuario_id
    FROM public.acoes a
    JOIN public.acoes_apoiadores ap ON ap.acao_id = a.id

    UNION

    SELECT a.id AS acao_id, a.titulo, ur.user_id AS usuario_id
    FROM public.acoes a
    JOIN public.user_roles ur ON ur.role = ANY (ARRAY['admin','diretoria']::public.app_role[])
  ),
  candidates AS (
    SELECT DISTINCT
      r.usuario_id,
      r.acao_id,
      'evidencia_pendente'::text AS tipo,
      'Evidência pendente'::text AS titulo,
      format('A ação concluída "%s" ainda não possui evidência registrada.', r.titulo) AS mensagem
    FROM recipients r
    JOIN public.profiles p ON p.id = r.usuario_id AND p.status = true
    JOIN public.acoes a ON a.id = r.acao_id
    WHERE a.status = 'concluida'
      AND NOT EXISTS (SELECT 1 FROM public.evidencias e WHERE e.acao_id = a.id)
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.usuario_id = r.usuario_id
          AND n.tipo = 'evidencia_pendente'
          AND n.acao_id = r.acao_id
      )
  )
  INSERT INTO public.notificacoes (usuario_id, acao_id, referencia_tipo, referencia_id, tipo, titulo, mensagem)
  SELECT usuario_id, acao_id, 'acao', acao_id, tipo, titulo, mensagem
  FROM candidates;

  GET DIAGNOSTICS step_count = ROW_COUNT;
  inserted_count := inserted_count + step_count;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'ultimo_acesso'
  ) THEN
    EXECUTE $sql$
      WITH governance_users AS (
        SELECT DISTINCT ur.user_id AS usuario_id
        FROM public.user_roles ur
        JOIN public.profiles gp ON gp.id = ur.user_id AND gp.status = true
        WHERE ur.role = ANY (ARRAY['admin','diretoria']::public.app_role[])
      ),
      inactive_users AS (
        SELECT p.id, p.nome, p.email
        FROM public.profiles p
        WHERE p.status = true
          AND COALESCE(p.ultimo_acesso::timestamptz, p.created_at) < now() - interval '30 days'
      ),
      candidates AS (
        SELECT DISTINCT
          gu.usuario_id,
          iu.id AS inactive_user_id,
          'usuario_inativo'::text AS tipo,
          'Usuário sem acesso há 30 dias'::text AS titulo,
          format('%s (%s) não acessa o sistema há mais de 30 dias.', iu.nome, iu.email) AS mensagem
        FROM governance_users gu
        CROSS JOIN inactive_users iu
        WHERE NOT EXISTS (
          SELECT 1 FROM public.notificacoes n
          WHERE n.usuario_id = gu.usuario_id
            AND n.tipo = 'usuario_inativo'
            AND n.referencia_tipo = 'usuario'
            AND n.referencia_id = iu.id
        )
      )
      INSERT INTO public.notificacoes (usuario_id, referencia_tipo, referencia_id, tipo, titulo, mensagem)
      SELECT usuario_id, 'usuario', inactive_user_id, tipo, titulo, mensagem
      FROM candidates
    $sql$;
  ELSE
    WITH governance_users AS (
      SELECT DISTINCT ur.user_id AS usuario_id
      FROM public.user_roles ur
      JOIN public.profiles gp ON gp.id = ur.user_id AND gp.status = true
      WHERE ur.role = ANY (ARRAY['admin','diretoria']::public.app_role[])
    ),
    inactive_users AS (
      SELECT p.id, p.nome, p.email
      FROM public.profiles p
      JOIN auth.users au ON au.id = p.id
      WHERE p.status = true
        AND COALESCE(au.last_sign_in_at, au.created_at) < now() - interval '30 days'
    ),
    candidates AS (
      SELECT DISTINCT
        gu.usuario_id,
        iu.id AS inactive_user_id,
        'usuario_inativo'::text AS tipo,
        'Usuário sem acesso há 30 dias'::text AS titulo,
        format('%s (%s) não acessa o sistema há mais de 30 dias.', iu.nome, iu.email) AS mensagem
      FROM governance_users gu
      CROSS JOIN inactive_users iu
      WHERE NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.usuario_id = gu.usuario_id
          AND n.tipo = 'usuario_inativo'
          AND n.referencia_tipo = 'usuario'
          AND n.referencia_id = iu.id
      )
    )
    INSERT INTO public.notificacoes (usuario_id, referencia_tipo, referencia_id, tipo, titulo, mensagem)
    SELECT usuario_id, 'usuario', inactive_user_id, tipo, titulo, mensagem
    FROM candidates;
  END IF;

  GET DIAGNOSTICS step_count = ROW_COUNT;
  inserted_count := inserted_count + step_count;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gerar_notificacoes_inteligentes() TO authenticated;
