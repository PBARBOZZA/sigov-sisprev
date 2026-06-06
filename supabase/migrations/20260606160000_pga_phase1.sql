-- PGA Phase 1: formal annual plan, axes and programs.
-- This migration preserves public.acoes as the operational core.

CREATE TABLE IF NOT EXISTS public.plano_anual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano int NOT NULL,
  nome text NOT NULL,
  descricao text,
  data_inicio date,
  data_fim date,
  status text NOT NULL DEFAULT 'em_execucao',
  versao text NOT NULL DEFAULT '1.0',
  data_aprovacao date,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plano_anual_ano_key UNIQUE (ano),
  CONSTRAINT plano_anual_status_check CHECK (status IN ('rascunho', 'aprovado', 'em_execucao', 'revisado', 'encerrado', 'cancelado'))
);

CREATE TABLE IF NOT EXISTS public.pga_eixos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_anual_id uuid NOT NULL REFERENCES public.plano_anual(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ordem int,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pga_eixos_plano_codigo_key UNIQUE (plano_anual_id, codigo),
  CONSTRAINT pga_eixos_plano_nome_key UNIQUE (plano_anual_id, nome)
);

CREATE TABLE IF NOT EXISTS public.pga_programas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_anual_id uuid NOT NULL REFERENCES public.plano_anual(id) ON DELETE CASCADE,
  eixo_id uuid NOT NULL REFERENCES public.pga_eixos(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  objetivo text,
  ordem int,
  area_responsavel_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pga_programas_plano_codigo_key UNIQUE (plano_anual_id, codigo),
  CONSTRAINT pga_programas_eixo_nome_key UNIQUE (eixo_id, nome)
);

ALTER TABLE public.acoes
  ADD COLUMN IF NOT EXISTS plano_anual_id uuid REFERENCES public.plano_anual(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eixo_id uuid REFERENCES public.pga_eixos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programa_id uuid REFERENCES public.pga_programas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pga_eixos_plano_anual_id ON public.pga_eixos(plano_anual_id);
CREATE INDEX IF NOT EXISTS idx_pga_programas_plano_anual_id ON public.pga_programas(plano_anual_id);
CREATE INDEX IF NOT EXISTS idx_pga_programas_eixo_id ON public.pga_programas(eixo_id);
CREATE INDEX IF NOT EXISTS idx_acoes_plano_anual_id ON public.acoes(plano_anual_id);
CREATE INDEX IF NOT EXISTS idx_acoes_eixo_id ON public.acoes(eixo_id);
CREATE INDEX IF NOT EXISTS idx_acoes_programa_id ON public.acoes(programa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_anual TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pga_eixos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pga_programas TO authenticated;
GRANT ALL ON public.plano_anual TO service_role;
GRANT ALL ON public.pga_eixos TO service_role;
GRANT ALL ON public.pga_programas TO service_role;

ALTER TABLE public.plano_anual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pga_eixos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pga_programas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active view plano anual" ON public.plano_anual;
DROP POLICY IF EXISTS "Management manage plano anual" ON public.plano_anual;
DROP POLICY IF EXISTS "Active view pga eixos" ON public.pga_eixos;
DROP POLICY IF EXISTS "Management manage pga eixos" ON public.pga_eixos;
DROP POLICY IF EXISTS "Active view pga programas" ON public.pga_programas;
DROP POLICY IF EXISTS "Management manage pga programas" ON public.pga_programas;

CREATE POLICY "Active view plano anual"
ON public.plano_anual FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Management manage plano anual"
ON public.plano_anual FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()))
WITH CHECK (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()));

CREATE POLICY "Active view pga eixos"
ON public.pga_eixos FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Management manage pga eixos"
ON public.pga_eixos FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()))
WITH CHECK (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()));

CREATE POLICY "Active view pga programas"
ON public.pga_programas FOR SELECT TO authenticated
USING (public.is_active_user(auth.uid()));

CREATE POLICY "Management manage pga programas"
ON public.pga_programas FOR ALL TO authenticated
USING (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()))
WITH CHECK (public.is_active_user(auth.uid()) AND public.is_admin_or_diretoria(auth.uid()));

DROP TRIGGER IF EXISTS trg_plano_anual_updated ON public.plano_anual;
DROP TRIGGER IF EXISTS trg_pga_eixos_updated ON public.pga_eixos;
DROP TRIGGER IF EXISTS trg_pga_programas_updated ON public.pga_programas;

CREATE TRIGGER trg_plano_anual_updated
BEFORE UPDATE ON public.plano_anual
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pga_eixos_updated
BEFORE UPDATE ON public.pga_eixos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pga_programas_updated
BEFORE UPDATE ON public.pga_programas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plano_anual (
  ano,
  nome,
  descricao,
  data_inicio,
  data_fim,
  status,
  versao,
  observacoes
)
VALUES (
  2026,
  'Plano Anual de Gestão 2026',
  'Plano Anual de Gestão do SISPREV para acompanhamento institucional do exercício de 2026.',
  DATE '2026-01-01',
  DATE '2026-12-31',
  'em_execucao',
  '1.0',
  'Registro inicial criado para formalizar a Fase 1 da modelagem PGA.'
)
ON CONFLICT (ano) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descricao = COALESCE(public.plano_anual.descricao, EXCLUDED.descricao),
  data_inicio = COALESCE(public.plano_anual.data_inicio, EXCLUDED.data_inicio),
  data_fim = COALESCE(public.plano_anual.data_fim, EXCLUDED.data_fim),
  updated_at = now();

WITH plano AS (
  SELECT id FROM public.plano_anual WHERE ano = 2026
)
INSERT INTO public.pga_eixos (plano_anual_id, codigo, nome, descricao, ordem)
SELECT plano.id, v.codigo, v.nome, v.descricao, v.ordem
FROM plano
CROSS JOIN (VALUES
  ('E1', 'Controles Internos', 'Eixo voltado ao fortalecimento dos controles internos do RPPS.', 1),
  ('E2', 'Governança Corporativa', 'Eixo voltado à governança, integridade e modernização administrativa.', 2),
  ('E3', 'Educação Previdenciária', 'Eixo voltado à educação previdenciária e relacionamento institucional.', 3)
) AS v(codigo, nome, descricao, ordem)
ON CONFLICT (plano_anual_id, codigo) DO UPDATE
SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem,
  updated_at = now();

WITH plano AS (
  SELECT id FROM public.plano_anual WHERE ano = 2026
),
eixos AS (
  SELECT id, nome FROM public.pga_eixos WHERE plano_anual_id = (SELECT id FROM plano)
)
INSERT INTO public.pga_programas (
  plano_anual_id,
  eixo_id,
  codigo,
  nome,
  descricao,
  ordem
)
SELECT plano.id, eixos.id, v.codigo, v.nome, v.descricao, v.ordem
FROM plano
JOIN (VALUES
  ('P1', 'Controles Internos', 'Programa de Fortalecimento do Controle Interno', 'Programa destinado a estruturar, revisar, auditar e fortalecer controles internos.', 1),
  ('P2', 'Governança Corporativa', 'Programa de Governança, Integridade e Modernização Administrativa', 'Programa destinado à governança corporativa, integridade, transparência, investimentos e modernização administrativa.', 2),
  ('P3', 'Educação Previdenciária', 'Programa de Educação Previdenciária', 'Programa destinado à educação previdenciária, capacitação, comunicação e participação social.', 3)
) AS v(codigo, eixo_nome, nome, descricao, ordem) ON true
JOIN eixos ON eixos.nome = v.eixo_nome
ON CONFLICT (plano_anual_id, codigo) DO UPDATE
SET
  eixo_id = EXCLUDED.eixo_id,
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem,
  updated_at = now();

WITH plano AS (
  SELECT id FROM public.plano_anual WHERE ano = 2026
),
eixos AS (
  SELECT id, nome FROM public.pga_eixos WHERE plano_anual_id = (SELECT id FROM plano)
),
programas AS (
  SELECT id, nome, eixo_id FROM public.pga_programas WHERE plano_anual_id = (SELECT id FROM plano)
),
mapeamento AS (
  SELECT
    a.id AS acao_id,
    plano.id AS plano_anual_id,
    eixos.id AS eixo_id,
    programas.id AS programa_id
  FROM public.acoes a
  CROSS JOIN plano
  LEFT JOIN eixos ON eixos.nome = a.eixo_estrategico
  LEFT JOIN programas ON programas.nome = a.programa
  WHERE
    (
      a.eixo_estrategico IN ('Controles Internos', 'Governança Corporativa', 'Educação Previdenciária')
      OR a.programa IN (
        'Programa de Fortalecimento do Controle Interno',
        'Programa de Governança, Integridade e Modernização Administrativa',
        'Programa de Educação Previdenciária'
      )
    )
)
UPDATE public.acoes a
SET
  plano_anual_id = mapeamento.plano_anual_id,
  eixo_id = mapeamento.eixo_id,
  programa_id = mapeamento.programa_id
FROM mapeamento
WHERE
  a.id = mapeamento.acao_id
  AND (
    a.plano_anual_id IS DISTINCT FROM mapeamento.plano_anual_id
    OR a.eixo_id IS DISTINCT FROM mapeamento.eixo_id
    OR a.programa_id IS DISTINCT FROM mapeamento.programa_id
  );
