# Roadmap SIGOV-SISPREV

Roadmap criado em 04/06/2026 com base na documentacao e auditoria do projeto.

## Objetivo

Evoluir o SIGOV-SISPREV de uma aplicacao funcional inicial para um sistema pronto para producao, com acesso seguro, dados consistentes, modulos principais completos, auditoria operacional e desempenho adequado para uso institucional.

## Fase 1 - Estabilizacao e seguranca critica

Prioridade: alta.

Prazo sugerido: curto prazo.

### Entregaveis

1. Revisar cadastro publico
   - Desabilitar signup publico ou criar fluxo de aprovacao administrativa.
   - Garantir que novos usuarios nao acessem dados internos sem aprovacao.

2. Bloquear usuarios inativos
   - Fazer `profiles.status = false` impedir acesso real ao sistema.
   - Aplicar regra no AuthProvider e, preferencialmente, em policies/RPCs.

3. Corrigir validacao server-side de usuarios
   - Substituir `inputValidator((d) => d)` por schema Zod em `createUsuario`.
   - Validar nome, email, senha, role, area e status.

4. Configurar secrets de producao
   - Garantir `SUPABASE_SERVICE_ROLE_KEY` apenas no runtime server-side.
   - Criar `.env.example` sem valores reais.

5. Revisar RLS inicial
   - Restringir leitura ampla de evidencias, historicos e dados sensiveis.
   - Confirmar quais perfis podem visualizar cada modulo.

6. Corrigir problemas de codificacao
   - Padronizar arquivos e migrations em UTF-8.
   - Revisar seeds ja aplicados no banco.

### Criterios de pronto

- Usuario externo nao consegue acessar dados apenas criando conta.
- Usuario inativo nao acessa rotas nem dados.
- Criacao de usuario falha com mensagens controladas quando payload e invalido.
- Secrets nao aparecem em variaveis publicas `VITE_`.
- Textos da UI e seeds aparecem corretamente em portugues.

## Fase 2 - Integridade dos dados e regras de negocio

Prioridade: alta.

Prazo sugerido: curto a medio prazo.

### Entregaveis

1. Validacoes completas do Plano de Acao
   - Validar `codigo`, `titulo`, `area`, responsavel, status, prioridade, datas e percentual.
   - Garantir `data_inicio <= prazo_final` quando ambas existirem.
   - Definir se `area_id` e responsavel sao obrigatorios tambem no banco.

2. Atualizacao segura de acoes
   - Enviar patches explicitos em vez de espalhar o objeto completo do formulario.
   - Bloquear no frontend acoes que o usuario nao pode executar.

3. Historico de alteracoes
   - Implementar registro automatico em `historico_acoes`.
   - Registrar usuario, campo alterado, valor anterior e valor novo.

4. Roles de usuario
   - Decidir se usuario pode ter uma ou multiplas roles.
   - Se for role unica, ajustar banco e UI para refletir isso.
   - Tornar troca de role transacional.

5. Evidencias consistentes
   - Validar tamanho, tipo e nome do arquivo.
   - Remover arquivo do storage se insert de metadados falhar.
   - Adicionar exclusao de evidencia com remocao de storage e banco.

### Criterios de pronto

- Formularios bloqueiam dados invalidos antes de enviar.
- Banco reforca regras essenciais.
- Toda alteracao de acao relevante gera historico.
- Troca de role nao deixa usuario sem perfil por falha intermediaria.
- Evidencias nao deixam arquivos orfaos em fluxo normal.

## Fase 3 - Conclusao dos modulos principais

Prioridade: media/alta.

Prazo sugerido: medio prazo.

### Entregaveis

1. Pro-Gestao RPPS
   - CRUD de requisitos.
   - Responsaveis, prazos, situacao, evidencias e observacoes.
   - Filtros por dimensao, situacao e responsavel.

2. Indicadores
   - CRUD de indicadores.
   - Registro de resultados.
   - Historico de medicoes.
   - Graficos por periodo, area e meta.

3. Notificacoes
   - Usar tabela `notificacoes`.
   - Marcar como lida.
   - Gerar notificacoes por prazo.
   - Registrar envios em `historico_alertas`.

4. Relatorios
   - Exportar por responsavel.
   - Exportar por area.
   - Exportar acoes atrasadas.
   - Exportar acoes concluidas.
   - Exportar Pro-Gestao.
   - Corrigir fallback de responsavel por texto livre.

5. Usuarios e areas
   - Editar nome, cargo, area e status do usuario.
   - Resetar senha ou disparar recuperacao.
   - Editar area, descricao e responsavel.

### Criterios de pronto

- Pro-Gestao e Indicadores deixam de ser apenas telas preparadas.
- Central de notificacoes usa dados persistidos.
- Relatorios prometidos nos cards deixam de estar "Em breve".
- Administradores conseguem manter usuarios e areas sem mexer no banco.

## Fase 4 - Desempenho e escalabilidade

Prioridade: media.

Prazo sugerido: medio prazo.

### Entregaveis

1. Indices no banco
   - `acoes(status)`.
   - `acoes(prazo_final)`.
   - `acoes(area_id)`.
   - `acoes(responsavel_id)`.
   - `evidencias(acao_id, created_at)`.
   - `notificacoes(usuario_id, lida, created_at)`.
   - `historico_acoes(acao_id, created_at)`.

2. Paginacao
   - Plano de Acao.
   - Evidencias.
   - Usuarios.
   - Areas.
   - Relatorios.

3. Filtros server-side
   - Busca textual.
   - Status.
   - Area.
   - Responsavel.
   - Prazo.

4. Agregacoes no banco
   - Dashboard por status.
   - Dashboard por area.
   - Dashboard por responsavel.
   - Percentual geral.

5. Reducao de `select("*")`
   - Selecionar apenas campos usados por cada tela.
   - Criar views quando necessario.

### Criterios de pronto

- Telas principais continuam rapidas com grande volume de acoes.
- Dashboard nao precisa baixar todas as acoes para calcular KPIs.
- Relatorios grandes nao travam o navegador.

## Fase 5 - Qualidade, testes e producao

Prioridade: alta para go-live.

Prazo sugerido: antes da publicacao oficial.

### Entregaveis

1. Testes automatizados
   - Auth e roles.
   - RLS.
   - Criacao e edicao de acoes.
   - Upload e download de evidencias.
   - Criacao administrativa de usuarios.

2. CI/CD
   - Rodar lint.
   - Rodar typecheck.
   - Rodar build.
   - Rodar testes.

3. Observabilidade
   - Captura de erros client-side.
   - Logs server-side.
   - Alertas para falhas criticas.

4. Operacao
   - Runbook de deploy.
   - Politica de backup e restore.
   - Checklist de variaveis de ambiente.
   - Procedimento para aplicar migrations.

5. UX de producao
   - Substituir `confirm()` por dialog padronizado.
   - Melhorar mensagens de erro.
   - Adicionar loading por item em downloads e mutacoes.
   - Esconder comandos sem permissao.

### Criterios de pronto

- Build e testes passam em pipeline.
- Equipe sabe restaurar backup e aplicar migrations.
- Erros criticos sao rastreaveis.
- UI nao mostra comandos que o usuario nao pode executar.

## Fase 6 - Expansao funcional

Prioridade: media/baixa, apos estabilizacao.

Prazo sugerido: longo prazo.

### Modulos previstos

1. Demandas TCE.
2. Ministerio Publico.
3. Contratos.
4. Licitacoes.
5. Conselhos.
6. Investimentos.
7. Educacao Previdenciaria.
8. Gestao de Riscos.
9. Apoiadores de acoes.

### Criterios de pronto

- Cada modulo deve ter modelagem de dados, RLS, CRUD, relatorios e auditoria.
- Nenhum modulo novo deve ser publicado apenas como tela placeholder em producao.

## Backlog imediato recomendado

1. Bloquear signup publico ou criar aprovacao.
2. Bloquear usuarios inativos.
3. Criar `.env.example`.
4. Adicionar Zod em `createUsuario`.
5. Corrigir codificacao UTF-8.
6. Ajustar permissao visual do Kanban.
7. Validar campos do Plano de Acao.
8. Corrigir exportacao CSV com `responsavel_nome`.
9. Implementar historico de acoes.
10. Adicionar indices essenciais.

## Atualizacao de progresso - 04/06/2026

Itens concluidos nesta rodada:

- Signup publico desabilitado na UI.
- Usuarios inativos bloqueados no cliente e em server functions.
- Zod server-side criado para usuarios, acoes e evidencias.
- Criacao/atualizacao de usuarios protegida por server functions.
- Criacao/atualizacao de acoes protegida por server functions.
- Upload/registro de evidencias com validacao e compensacao contra arquivos orfaos.
- Kanban ajustado para respeitar permissao visual de edicao.
- RLS revisada via migration para usuarios ativos e acesso mais restrito.
- Historico automatico de acoes criado via trigger.
- CSV ajustado para responsavel em texto livre.
- Relatorio de correcoes gerado em `CORRECOES_SEGURANCA.md`.

Itens que permanecem no roadmap:

- Revisar/desabilitar signup diretamente no painel Supabase Auth.
- Criar `.env.example`.
- Implementar server function para exclusao de acao.
- Adicionar indices essenciais.
- Criar testes e pipeline de CI.
- Concluir Pro-Gestao, Indicadores, Notificacoes e Relatorios avancados.

## Indicadores de sucesso

- Zero usuarios nao aprovados acessando dados internos.
- Zero usuarios inativos acessando o sistema.
- Todas as mutacoes criticas com validacao server-side.
- Dashboard carregando em tempo aceitavel com base real.
- Historico de alteracoes disponivel para auditoria.
- Modulos Pro-Gestao, Indicadores, Notificacoes e Relatorios operacionais.
