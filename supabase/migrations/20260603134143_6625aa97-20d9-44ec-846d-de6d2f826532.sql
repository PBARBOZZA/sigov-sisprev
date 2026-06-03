
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','diretoria','responsavel','conselheiro');
CREATE TYPE public.acao_status AS ENUM ('nao_iniciada','em_andamento','concluida','atrasada','cancelada');
CREATE TYPE public.acao_prioridade AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.progestao_situacao AS ENUM ('atendido','parcial','nao_atendido','em_implantacao');

-- AREAS
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  responsavel_id uuid,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  cargo text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_diretoria(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','diretoria')
  )
$$;

-- ACOES
CREATE TABLE public.acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  programa text,
  eixo_estrategico text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  projeto text,
  titulo text NOT NULL,
  descricao text,
  objetivo text,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_inicio date,
  prazo_final date,
  status public.acao_status NOT NULL DEFAULT 'nao_iniciada',
  prioridade public.acao_prioridade NOT NULL DEFAULT 'media',
  percentual_execucao int NOT NULL DEFAULT 0 CHECK (percentual_execucao BETWEEN 0 AND 100),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acoes TO authenticated;
GRANT ALL ON public.acoes TO service_role;
ALTER TABLE public.acoes ENABLE ROW LEVEL SECURITY;

-- APOIADORES
CREATE TABLE public.acoes_apoiadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(acao_id, usuario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acoes_apoiadores TO authenticated;
GRANT ALL ON public.acoes_apoiadores TO service_role;
ALTER TABLE public.acoes_apoiadores ENABLE ROW LEVEL SECURITY;

-- EVIDENCIAS
CREATE TABLE public.evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  nome_arquivo text NOT NULL,
  caminho_arquivo text NOT NULL,
  tipo_arquivo text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidencias TO authenticated;
GRANT ALL ON public.evidencias TO service_role;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;

-- PROGESTAO
CREATE TABLE public.requisitos_progestao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  dimensao text,
  descricao text,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  situacao public.progestao_situacao NOT NULL DEFAULT 'nao_atendido',
  prazo date,
  evidencia text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisitos_progestao TO authenticated;
GRANT ALL ON public.requisitos_progestao TO service_role;
ALTER TABLE public.requisitos_progestao ENABLE ROW LEVEL SECURITY;

-- INDICADORES
CREATE TABLE public.indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  formula text,
  meta numeric,
  resultado_atual numeric,
  unidade_medida text,
  periodicidade text,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicadores TO authenticated;
GRANT ALL ON public.indicadores TO service_role;
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;

-- NOTIFICACOES
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  lida boolean NOT NULL DEFAULT false,
  referencia_tipo text,
  referencia_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- HISTORICO ALERTAS
CREATE TABLE public.historico_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_tipo text NOT NULL,
  referencia_id uuid NOT NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  tipo_alerta text NOT NULL,
  data_envio timestamptz NOT NULL DEFAULT now(),
  status_envio text
);
GRANT SELECT, INSERT ON public.historico_alertas TO authenticated;
GRANT ALL ON public.historico_alertas TO service_role;
ALTER TABLE public.historico_alertas ENABLE ROW LEVEL SECURITY;

-- HISTORICO ACOES
CREATE TABLE public.historico_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id uuid NOT NULL REFERENCES public.acoes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  campo_alterado text NOT NULL,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.historico_acoes TO authenticated;
GRANT ALL ON public.historico_acoes TO service_role;
ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;

-- POLICIES: PROFILES
CREATE POLICY "Auth view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Self update profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: USER_ROLES
CREATE POLICY "View own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: AREAS
CREATE POLICY "Auth view areas" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage areas" ON public.areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: ACOES
CREATE POLICY "Auth view acoes" ON public.acoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/diretoria insert acoes" ON public.acoes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_diretoria(auth.uid()));
CREATE POLICY "Update own or admin/diretoria" ON public.acoes FOR UPDATE TO authenticated
  USING (responsavel_id = auth.uid() OR public.is_admin_or_diretoria(auth.uid()))
  WITH CHECK (responsavel_id = auth.uid() OR public.is_admin_or_diretoria(auth.uid()));
CREATE POLICY "Admin delete acoes" ON public.acoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- POLICIES: APOIADORES
CREATE POLICY "Auth view apoiadores" ON public.acoes_apoiadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/diretoria manage apoiadores" ON public.acoes_apoiadores FOR ALL TO authenticated
  USING (public.is_admin_or_diretoria(auth.uid())) WITH CHECK (public.is_admin_or_diretoria(auth.uid()));

-- POLICIES: EVIDENCIAS
CREATE POLICY "Auth view evidencias" ON public.evidencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert evidencias" ON public.evidencias FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "Delete own evidencias or admin" ON public.evidencias FOR DELETE TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- POLICIES: PROGESTAO
CREATE POLICY "Auth view progestao" ON public.requisitos_progestao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/diretoria manage progestao" ON public.requisitos_progestao FOR ALL TO authenticated
  USING (public.is_admin_or_diretoria(auth.uid())) WITH CHECK (public.is_admin_or_diretoria(auth.uid()));

-- POLICIES: INDICADORES
CREATE POLICY "Auth view indicadores" ON public.indicadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/diretoria manage indicadores" ON public.indicadores FOR ALL TO authenticated
  USING (public.is_admin_or_diretoria(auth.uid())) WITH CHECK (public.is_admin_or_diretoria(auth.uid()));

-- POLICIES: NOTIFICACOES
CREATE POLICY "View own notifications" ON public.notificacoes FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notificacoes FOR UPDATE TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "Insert notifications" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);

-- POLICIES: HISTORICO ALERTAS
CREATE POLICY "Admin view historico_alertas" ON public.historico_alertas FOR SELECT TO authenticated
  USING (public.is_admin_or_diretoria(auth.uid()));
CREATE POLICY "Insert historico_alertas" ON public.historico_alertas FOR INSERT TO authenticated WITH CHECK (true);

-- POLICIES: HISTORICO ACOES
CREATE POLICY "Auth view historico_acoes" ON public.historico_acoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert historico_acoes" ON public.historico_acoes FOR INSERT TO authenticated WITH CHECK (true);

-- TRIGGER: handle new user creates profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);
  -- default role: responsavel
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'responsavel');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_acoes_updated BEFORE UPDATE ON public.acoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_progestao_updated BEFORE UPDATE ON public.requisitos_progestao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_indicadores_updated BEFORE UPDATE ON public.indicadores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed areas
INSERT INTO public.areas (nome, descricao) VALUES
('Diretoria Executiva','Diretoria executiva do SISPREV-TO'),
('Controle Interno','Controle interno e auditoria'),
('Benefícios','Concessão e manutenção de benefícios'),
('Jurídico','Assessoria jurídica'),
('Tecnologia da Informação','TI e segurança da informação'),
('Investimentos','Gestão de investimentos e ALM'),
('Educação Previdenciária','Programas de educação previdenciária'),
('Conselhos','Conselhos deliberativo e fiscal'),
('Administração','Administração geral'),
('Licitações e Contratos','Compras, licitações e contratos');
