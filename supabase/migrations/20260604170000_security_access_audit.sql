-- Security hardening and action audit trail

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND status = true
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_user(uuid) FROM anon;

-- Profiles / users
DROP POLICY IF EXISTS "View own or admin profiles" ON public.profiles;
DROP POLICY IF EXISTS "Self update profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;

CREATE POLICY "Active view own or management profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (id = auth.uid() OR public.is_admin_or_diretoria(auth.uid()))
);

CREATE POLICY "Active self update profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_active_user(auth.uid()) AND id = auth.uid())
WITH CHECK (public.is_active_user(auth.uid()) AND id = auth.uid());

CREATE POLICY "Admin manage profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_active_user(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- User roles
DROP POLICY IF EXISTS "View own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin manage roles" ON public.user_roles;

CREATE POLICY "Active view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admin manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_active_user(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Areas
DROP POLICY IF EXISTS "Auth view areas" ON public.areas;
DROP POLICY IF EXISTS "Admin manage areas" ON public.areas;

CREATE POLICY "Active view areas"
ON public.areas FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Admin manage areas"
ON public.areas FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.is_active_user(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Actions
DROP POLICY IF EXISTS "Auth view acoes" ON public.acoes;
DROP POLICY IF EXISTS "Admin/diretoria insert acoes" ON public.acoes;
DROP POLICY IF EXISTS "Update own or admin/diretoria" ON public.acoes;
DROP POLICY IF EXISTS "Admin delete acoes" ON public.acoes;

CREATE POLICY "Active view acoes"
ON public.acoes FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Management insert acoes"
ON public.acoes FOR INSERT TO authenticated
WITH CHECK (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()));

CREATE POLICY "Responsible or management update acoes"
ON public.acoes FOR UPDATE TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (responsavel_id = auth.uid() OR public.is_admin_or_diretoria(auth.uid()))
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND (responsavel_id = auth.uid() OR public.is_admin_or_diretoria(auth.uid()))
);

CREATE POLICY "Admin delete acoes"
ON public.acoes FOR DELETE TO authenticated
USING (public.is_active_user(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Evidencias metadata
DROP POLICY IF EXISTS "Auth view evidencias" ON public.evidencias;
DROP POLICY IF EXISTS "Auth insert evidencias" ON public.evidencias;
DROP POLICY IF EXISTS "Delete own evidencias or admin" ON public.evidencias;

CREATE POLICY "View permitted evidencias"
ON public.evidencias FOR SELECT TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (
    usuario_id = auth.uid()
    OR public.is_admin_or_diretoria(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.acoes a
      WHERE a.id = evidencias.acao_id
        AND a.responsavel_id = auth.uid()
    )
  )
);

CREATE POLICY "Insert permitted evidencias"
ON public.evidencias FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user(auth.uid())
  AND usuario_id = auth.uid()
  AND (
    public.is_admin_or_diretoria(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.acoes a
      WHERE a.id = acao_id
        AND a.responsavel_id = auth.uid()
    )
  )
);

CREATE POLICY "Delete permitted evidencias"
ON public.evidencias FOR DELETE TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

-- Indicadores
DROP POLICY IF EXISTS "Auth view indicadores" ON public.indicadores;
DROP POLICY IF EXISTS "Admin/diretoria manage indicadores" ON public.indicadores;

CREATE POLICY "Active view indicadores"
ON public.indicadores FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Management manage indicadores"
ON public.indicadores FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()))
WITH CHECK (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()));

-- Pro-Gestao
DROP POLICY IF EXISTS "Auth view progestao" ON public.requisitos_progestao;
DROP POLICY IF EXISTS "Admin/diretoria manage progestao" ON public.requisitos_progestao;

CREATE POLICY "Active view progestao"
ON public.requisitos_progestao FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Management manage progestao"
ON public.requisitos_progestao FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()))
WITH CHECK (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()));

-- Storage evidencias: require active users too.
DROP POLICY IF EXISTS "View own or admin evidencias files" ON storage.objects;
DROP POLICY IF EXISTS "Upload own evidencias files" ON storage.objects;
DROP POLICY IF EXISTS "Delete own or admin evidencias files" ON storage.objects;
DROP POLICY IF EXISTS "Update own or admin evidencias files" ON storage.objects;

CREATE POLICY "View permitted evidencias files"
ON storage.objects FOR SELECT TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND bucket_id = 'evidencias'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin_or_diretoria(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.evidencias e
      JOIN public.acoes a ON a.id = e.acao_id
      WHERE e.caminho_arquivo = storage.objects.name
        AND a.responsavel_id = auth.uid()
    )
  )
);

CREATE POLICY "Upload own evidencias files"
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
  )
);

CREATE POLICY "Delete own or admin evidencias files"
ON storage.objects FOR DELETE TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND bucket_id = 'evidencias'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Update own or admin evidencias files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  public.is_active_user(auth.uid())
  AND bucket_id = 'evidencias'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
)
WITH CHECK (
  public.is_active_user(auth.uid())
  AND bucket_id = 'evidencias'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Audit trail for actions
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
    INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, actor, 'alteracao', NULL, NULL);

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.historico_acoes (acao_id, usuario_id, campo_alterado, valor_anterior, valor_novo)
      VALUES (NEW.id, actor, 'status', OLD.status::text, NEW.status::text);
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

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_acoes_insert ON public.acoes;
DROP TRIGGER IF EXISTS trg_audit_acoes_update ON public.acoes;

CREATE TRIGGER trg_audit_acoes_insert
AFTER INSERT ON public.acoes
FOR EACH ROW EXECUTE FUNCTION public.audit_acoes_changes();

CREATE TRIGGER trg_audit_acoes_update
AFTER UPDATE ON public.acoes
FOR EACH ROW EXECUTE FUNCTION public.audit_acoes_changes();

REVOKE EXECUTE ON FUNCTION public.audit_acoes_changes() FROM public, anon, authenticated;
