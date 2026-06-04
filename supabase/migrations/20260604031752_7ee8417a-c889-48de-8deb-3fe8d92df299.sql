
-- 1. Novas colunas
ALTER TABLE public.acoes
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS periodicidade text;

-- 2. Unicidade do código
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acoes_codigo_key') THEN
    ALTER TABLE public.acoes ADD CONSTRAINT acoes_codigo_key UNIQUE (codigo);
  END IF;
END $$;

-- 3. Áreas padrão (idempotente por nome)
INSERT INTO public.areas (nome, descricao)
SELECT v.nome, v.descricao FROM (VALUES
  ('Controle Interno','Setor de controle interno do SISPREV-TO'),
  ('Tecnologia da Informação','Setor de TI'),
  ('Governança','Governança institucional'),
  ('Diretoria Executiva','Direção executiva do SISPREV'),
  ('Investimentos','Gestão de investimentos'),
  ('Benefícios','Concessão e manutenção de benefícios'),
  ('Educação Previdenciária','Programa de educação previdenciária'),
  ('Comunicação/Ouvidoria','Comunicação e ouvidoria'),
  ('Licitações e Contratos','Licitações e contratos'),
  ('Legislação','Comissão de legislação'),
  ('Conselhos','Conselhos previdenciários'),
  ('Administração','Administração geral'),
  ('Jurídico','Assessoria jurídica'),
  ('Prefeitura Municipal / RPPS','Ações com a Prefeitura Municipal acompanhadas pelo RPPS')
) AS v(nome, descricao)
WHERE NOT EXISTS (SELECT 1 FROM public.areas a WHERE a.nome = v.nome);

-- 4. Seed das ações do Plano de Metas Institucionais 2026
INSERT INTO public.acoes (codigo, titulo, eixo_estrategico, programa, area_id, responsavel_nome, data_inicio, prazo_final, status, prioridade, percentual_execucao, periodicidade, observacoes)
SELECT v.codigo, v.titulo, v.eixo, v.programa,
  (SELECT id FROM public.areas WHERE nome = v.area LIMIT 1),
  v.resp, v.data_inicio, v.prazo_final, v.status::acao_status, v.prio::acao_prioridade,
  v.perc, v.period, v.obs
FROM (VALUES
  -- EIXO 1 - Controles Internos
  ('A1-T1','Mapear e revisar processos das 08 áreas do RPPS','Controles Internos','Programa de Fortalecimento do Controle Interno','Controle Interno','RUTH', DATE '2026-01-02', DATE '2026-03-05','concluida','alta',100,NULL,NULL),
  ('A1-T2','Manualizar e revisar 08 áreas do RPPS','Controles Internos','Programa de Fortalecimento do Controle Interno','Controle Interno','RUTH', DATE '2026-01-02', DATE '2026-03-05','concluida','alta',100,NULL,NULL),
  ('A2-T1','Realizar 4 auditorias internas trimestrais — 1ª auditoria','Controles Internos','Programa de Fortalecimento do Controle Interno','Controle Interno','JARDEL', DATE '2026-05-01', DATE '2026-05-31','concluida','alta',100,NULL,NULL),
  ('A2-T2','Realizar 4 auditorias internas trimestrais — 2ª auditoria','Controles Internos','Programa de Fortalecimento do Controle Interno','Controle Interno','JARDEL', DATE '2026-08-01', DATE '2026-08-31','nao_iniciada','alta',0,NULL,NULL),
  ('A2-T3','Realizar 4 auditorias internas trimestrais — 3ª auditoria','Controles Internos','Programa de Fortalecimento do Controle Interno','Controle Interno','JARDEL', DATE '2026-11-01', DATE '2026-11-30','nao_iniciada','alta',0,NULL,NULL),
  ('A2-T4','Realizar 4 auditorias internas trimestrais — 4ª auditoria','Controles Internos','Programa de Fortalecimento do Controle Interno','Controle Interno','JARDEL', DATE '2027-02-01', DATE '2027-02-28','nao_iniciada','alta',0,NULL,NULL),
  ('A3-T1','Implantar Política de Segurança da Informação','Controles Internos','Programa de Fortalecimento do Controle Interno','Tecnologia da Informação','PERICLES', DATE '2026-02-18', DATE '2026-12-31','em_andamento','alta',25,NULL,NULL),
  ('A3-T2','Capacitar servidores em Segurança da Informação','Controles Internos','Programa de Fortalecimento do Controle Interno','Tecnologia da Informação','PERICLES', DATE '2026-02-09', DATE '2026-12-31','em_andamento','alta',25,NULL,NULL),
  ('A4-T1','Atualizar cadastro de aposentados e pensionistas — prova de vida 100%','Controles Internos','Programa de Fortalecimento do Controle Interno','Benefícios','LETICIA', NULL, NULL,'em_andamento','alta',25,'Mensal',NULL),
  ('A4-T2','Atualizar cadastro de segurados ativos 80%','Controles Internos','Programa de Fortalecimento do Controle Interno','Benefícios','2026-CGM', DATE '2026-04-06', DATE '2026-07-20','em_andamento','alta',25,NULL,NULL),
  ('A5-T1','Designar 01 servidor como agente de conformidade no Controle Interno do RPPS','Controles Internos','Programa de Fortalecimento do Controle Interno','Controle Interno','GISLENE', DATE '2026-06-01', DATE '2026-12-31','nao_iniciada','alta',0,NULL,NULL),
  -- EIXO 2 - Governança Corporativa
  ('A6-T1','Implantar Programa de Integridade','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Governança','LAURO', DATE '2026-06-01', DATE '2026-12-31','nao_iniciada','alta',0,NULL,NULL),
  ('A6-T2','Criar o código de ética próprio do SISPREV','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Governança','GISLENE', DATE '2026-06-01', DATE '2026-12-31','nao_iniciada','alta',0,NULL,NULL),
  ('A6-T3','Formar Comissão de ética e compliance','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Governança','GISLENE', DATE '2026-03-01', DATE '2026-03-31','concluida','alta',100,NULL,NULL),
  ('A6-T4','Treinar 100% dos servidores do SISPREV','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Governança','DIRETORIA EXEC', DATE '2026-04-08', DATE '2026-12-31','em_andamento','alta',25,NULL,NULL),
  ('A7-T1','Publicar relatórios institucionais no prazo legal','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Diretoria Executiva','DIRETORIA EXEC', DATE '2026-01-02', DATE '2026-12-31','em_andamento','alta',25,NULL,NULL),
  ('A7-T2','Ampliar acesso ao portal','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Tecnologia da Informação','PERICLES', DATE '2026-01-02', DATE '2026-12-31','em_andamento','alta',25,NULL,NULL),
  ('A8-T1','Monitorar cumprimento dos requisitos Nível IV — Manual 4.1 (24 ações)','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Governança','GISLENE', DATE '2025-01-02', DATE '2025-05-28','concluida','alta',100,NULL,NULL),
  ('A9-T1','Capacitar os servidores e gestores','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Diretoria Executiva','DIRETORIA EXEC', DATE '2026-01-02', DATE '2026-12-31','em_andamento','media',25,NULL,NULL),
  ('A9-T2','Monitorar certificação obrigatória para os cargos exigidos','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Governança','JARDEL', DATE '2025-01-02', DATE '2025-05-31','concluida','alta',100,NULL,NULL),
  ('A9-T3','Promover mínimo 30h anuais de capacitação por servidor do SISPREV','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Governança','GISLENE', DATE '2026-01-02', DATE '2026-12-31','em_andamento','media',25,NULL,NULL),
  ('A10-T1','Realização do Processo Eleitoral dos Conselhos Previdenciários','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Conselhos','COMISSÃO ELEITORAL', DATE '2026-10-01', DATE '2026-12-31','nao_iniciada','alta',0,NULL,NULL),
  ('A10-T2','Realizar no mínimo 01 seminário','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Educação Previdenciária','DIRETORIA EXEC', DATE '2026-09-01', DATE '2026-09-30','nao_iniciada','media',0,NULL,NULL),
  ('A10-T3','Promover o Preparaprev — 1º semestre','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Educação Previdenciária','DIRETORIA EXEC', DATE '2026-01-01', DATE '2026-04-30','concluida','media',100,NULL,NULL),
  ('A10-T4','Promover o Preparaprev — 2º semestre','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Educação Previdenciária','DIRETORIA EXEC', DATE '2026-09-01', DATE '2026-09-30','nao_iniciada','media',0,NULL,NULL),
  ('A10-T5','Promover a rentabilidade mínima atuarial mensal — IPCA + 5,57','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Investimentos','COMITÊ DE INVESTIMENTOS', NULL, NULL,'em_andamento','alta',25,'Mensal','Registrar mensalmente rentabilidade/meta.'),
  ('A10-T6','Assegurar aderência à Política de Investimentos','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Investimentos','COMITÊ DE INVESTIMENTOS', NULL, NULL,'em_andamento','alta',25,'Mensal',NULL),
  ('A11-T1','Designar 01 servidor para acompanhamento e controle da gestão dos investimentos do RPPS','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Investimentos','GISLENE', DATE '2026-06-01', DATE '2026-12-31','nao_iniciada','alta',0,NULL,NULL),
  ('A12-T1','Revisão de benefícios','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Benefícios','KETLYN', DATE '2026-01-14', DATE '2026-12-31','em_andamento','alta',25,NULL,NULL),
  ('A12-T2','Cobrança de contribuições LIP e cedidos','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Benefícios','KETLYN', NULL, NULL,'em_andamento','alta',25,'Mensal',NULL),
  ('A12-T3','Cobrança de contribuições em ações judiciais — quando houver condenação','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Jurídico','KETLYN/POLY', NULL, NULL,'em_andamento','media',25,'Esporádica',NULL),
  ('A12-T4','Conferência da folha de pagamento','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Controle Interno','JARDEL', NULL, NULL,'em_andamento','alta',25,'Mensal',NULL),
  ('A12-T5','Viabilizar a compensação financeira — COMPREV','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Benefícios','KLEDSON', NULL, NULL,'em_andamento','alta',25,'Diária',NULL),
  ('A13-T1','Reduzir tempo médio de concessão de benefícios em 5% (de 60 para 57 dias)','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Benefícios','GREICIANE', NULL, DATE '2026-12-31','em_andamento','alta',25,NULL,NULL),
  ('A13-T2','Atualizar normas internas','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Legislação','COM. DE LEGISLAÇÃO-GISELE', NULL, NULL,'em_andamento','media',25,'Anual',NULL),
  ('A13-T3','Implantar processos internos digitais','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Administração','PATRICIA', DATE '2026-06-01', DATE '2026-12-31','nao_iniciada','alta',0,NULL,NULL),
  ('A14-T1','Realizar licitação para construção da sede própria','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Licitações e Contratos','COM.LICITAÇÃO-POLIANA', DATE '2026-05-01', DATE '2026-08-31','em_andamento','alta',25,NULL,NULL),
  ('A14-T2','Elaboração e proposição de PCCR para servidores do SISPREV','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Legislação','COM. LEGISLAÇÃO-LAURO', DATE '2026-06-01', DATE '2026-08-30','nao_iniciada','alta',0,NULL,NULL),
  ('A14-T3','Proposição de minuta de Projeto de Reforma Previdenciária','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Legislação','COM.LEGISLAÇÃO', DATE '2026-06-01', DATE '2026-07-31','nao_iniciada','alta',0,NULL,NULL),
  ('A14-T4','Promover a comemoração institucional dos 25 anos do SISPREV','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Diretoria Executiva','DIRETORIA EXEC', DATE '2026-10-01', DATE '2026-10-31','nao_iniciada','media',0,NULL,NULL),
  ('A15-T1','Promover ginástica laboral para os servidores da Prefeitura Municipal','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Prefeitura Municipal / RPPS','PMTO/RPPS (KLEDSON – ACOMPANHAR)', DATE '2026-08-01', DATE '2026-12-31','nao_iniciada','media',0,NULL,'Ação realizada pelo Executivo Municipal, cabendo ao RPPS o acompanhamento.'),
  ('A15-T2','Promover capacitação nas entregas dos materiais EPI’s','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Prefeitura Municipal / RPPS','PMTO/RPPS (KLEDSON – ACOMPANHAR)', DATE '2026-08-01', DATE '2026-12-31','nao_iniciada','media',0,NULL,'Ação realizada pelo Executivo Municipal, cabendo ao RPPS o acompanhamento.'),
  ('A15-T3','Palestra com psicólogo sobre incapacidade psíquica no Seminário do SISPREV','Governança Corporativa','Programa de Governança, Integridade e Modernização Administrativa','Educação Previdenciária','PMTO/RPPS (KLEDSON – ACOMPANHAR)', DATE '2026-08-01', DATE '2026-09-30','nao_iniciada','media',0,NULL,'Ação realizada pelo Executivo Municipal, cabendo ao RPPS o acompanhamento.'),
  -- EIXO 3 - Educação Previdenciária
  ('A16-T1','Realizar ações educativas no ano','Educação Previdenciária','Programa de Educação Previdenciária','Educação Previdenciária','RUTHNEIA', NULL, NULL,'em_andamento','media',25,'Anual',NULL),
  ('A16-T2','Promover curso preparatório para certificação de conselheiros','Educação Previdenciária','Programa de Educação Previdenciária','Conselhos','ESCOLA DE GESTÃO', DATE '2026-07-01', DATE '2026-08-30','nao_iniciada','media',0,NULL,NULL),
  ('A16-T3','Medir nível de satisfação dos participantes','Educação Previdenciária','Programa de Educação Previdenciária','Educação Previdenciária','LETICIA', NULL, NULL,'em_andamento','media',25,'Diária',NULL),
  ('A17-T1','Ampliar canais digitais — Ouvidoria','Educação Previdenciária','Programa de Educação Previdenciária','Comunicação/Ouvidoria','JARDEL', DATE '2026-01-02', DATE '2026-12-30','em_andamento','alta',25,NULL,NULL),
  ('A17-T2','Realizar no mínimo 01 audiência pública','Educação Previdenciária','Programa de Educação Previdenciária','Educação Previdenciária','DIRETORIA EXEC', DATE '2026-06-01', DATE '2026-06-30','nao_iniciada','alta',0,NULL,NULL)
) AS v(codigo, titulo, eixo, programa, area, resp, data_inicio, prazo_final, status, prio, perc, period, obs)
ON CONFLICT (codigo) DO NOTHING;
