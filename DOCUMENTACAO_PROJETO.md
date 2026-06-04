# Documentacao do Projeto SIGOV-SISPREV

Analise realizada em 04/06/2026 sobre o workspace `C:\Users\peric\sigov-sisprev`.

## 1. Visao geral

O projeto e uma aplicacao web para governanca previdenciaria do SISPREV-TO. O foco atual e o acompanhamento do Plano de Gestao Anual, com modulos de acoes, kanban, evidencias, usuarios, areas, dashboard executivo, indicadores, Pro-Gestao RPPS, notificacoes e relatorios.

A aplicacao usa TanStack Start/Router com React, Supabase para autenticacao, banco PostgreSQL, RLS e storage, alem de componentes de UI baseados em shadcn/Radix.

## 2. Estrutura de pastas

```text
sigov-sisprev/
+-- .lovable/                         # Metadados/configuracoes da plataforma Lovable
+-- src/
|   +-- assets/                       # Assets referenciados pela aplicacao
|   +-- components/
|   |   +-- app-layout.tsx            # Layout autenticado com sidebar, header e outlet
|   |   +-- ui/                       # Componentes base shadcn/Radix
|   +-- hooks/                        # Hooks auxiliares, ex.: use-mobile
|   +-- integrations/
|   |   +-- lovable/                  # Integracao de autenticacao Lovable Cloud
|   |   +-- supabase/                 # Clientes Supabase, tipos e middlewares auth
|   +-- lib/
|   |   +-- api/                      # Exemplo de server function
|   |   +-- acao-helpers.ts           # Labels, cores e helpers de prazo/status
|   |   +-- auth.tsx                  # AuthProvider e controle de roles no cliente
|   |   +-- usuarios.functions.ts     # Server function para criacao administrativa de usuarios
|   |   +-- config.server.ts          # Helper de configuracao server-only
|   |   +-- error-*                   # Captura e pagina de erro SSR
|   +-- routes/
|   |   +-- __root.tsx                # Root route, providers, metadados e error boundary
|   |   +-- index.tsx                 # Redirecionamento inicial
|   |   +-- auth.tsx                  # Login e cadastro
|   |   +-- _authenticated.tsx        # Guard de autenticacao client-side
|   |   +-- _authenticated/
|   |       +-- dashboard.tsx         # Indicadores executivos e graficos
|   |       +-- plano-acao/
|   |       |   +-- index.tsx         # Lista, filtros e criacao de acoes
|   |       |   +-- $id.tsx           # Detalhe, edicao e evidencias da acao
|   |       +-- kanban.tsx            # Kanban por status
|   |       +-- areas.tsx             # Cadastro/listagem de areas
|   |       +-- usuarios.tsx          # Gestao de usuarios e roles
|   |       +-- evidencias.tsx        # Listagem/download de evidencias
|   |       +-- progestao.tsx         # Painel de requisitos Pro-Gestao
|   |       +-- indicadores.tsx       # Listagem de indicadores
|   |       +-- notificacoes.tsx      # Central calculada de alertas de prazo
|   |       +-- relatorios.tsx        # Exportacao CSV do plano de acao
|   +-- router.tsx                    # Configuracao do roteador
|   +-- routeTree.gen.ts              # Arquivo gerado pelo TanStack Router
|   +-- server.ts                     # Wrapper SSR com normalizacao de erro
|   +-- start.ts                      # TanStack Start middlewares
|   +-- styles.css                    # Tailwind 4 e tokens visuais
+-- supabase/
|   +-- config.toml                   # Configuracao Supabase local/projeto
|   +-- migrations/                   # DDL, RLS, policies e seeds
+-- package.json                      # Scripts e dependencias
+-- vite.config.ts                    # Configuracao Lovable/TanStack/Vite
+-- tsconfig.json                     # TypeScript
+-- components.json                   # Configuracao shadcn/ui
+-- eslint.config.js                  # ESLint + Prettier
+-- bun.lock                          # Lockfile Bun
+-- package-lock.json                 # Lockfile npm
```

## 3. Tecnologias utilizadas

### Frontend e runtime

- React 19.
- TypeScript 5.
- Vite 7.
- TanStack Start, TanStack Router e TanStack React Query.
- Tailwind CSS 4.
- shadcn/ui com Radix UI.
- Lucide React para icones.
- Recharts para graficos.
- date-fns para datas.
- Sonner para toasts.
- Zod para validacao dos formularios de autenticacao.

### Backend e dados

- Supabase Auth.
- Supabase Database, PostgreSQL.
- Supabase Row Level Security.
- Supabase Storage, bucket `evidencias`.
- TanStack Start `createServerFn` para operacoes server-side.
- Cliente server-side Supabase com `SUPABASE_SERVICE_ROLE_KEY` para operacoes administrativas.

### Ferramentas

- ESLint 9.
- Prettier 3.
- Bun e npm estao presentes como lockfiles.
- Configuracao gerada por `@lovable.dev/vite-tanstack-config`.

## 4. Banco de dados

O banco e PostgreSQL gerenciado via Supabase. As migrations criam enums, tabelas publicas, funcoes auxiliares, triggers, grants, policies RLS e seeds iniciais.

### Enums

- `app_role`: `admin`, `diretoria`, `responsavel`, `conselheiro`.
- `acao_status`: `nao_iniciada`, `em_andamento`, `concluida`, `atrasada`, `cancelada`.
- `acao_prioridade`: `baixa`, `media`, `alta`, `critica`.
- `progestao_situacao`: `atendido`, `parcial`, `nao_atendido`, `em_implantacao`.

### Funcoes e triggers

- `has_role(_user_id, _role)`: verifica role do usuario.
- `is_admin_or_diretoria(_user_id)`: verifica se usuario tem perfil de admin ou diretoria.
- `handle_new_user()`: cria `profiles` e role padrao `responsavel` quando um usuario e criado em `auth.users`.
- `set_updated_at()`: atualiza `updated_at` em tabelas com auditoria temporal.

Triggers aplicados em `areas`, `profiles`, `acoes`, `requisitos_progestao` e `indicadores`.

## 5. Tabelas existentes

### `areas`

Setores institucionais.

- Campos principais: `id`, `nome`, `descricao`, `responsavel_id`, `status`, `created_at`, `updated_at`.
- Relacionamentos: `responsavel_id` aponta para usuario.
- Uso no app: listagem, cadastro por admin, ativacao/inativacao, filtros de acoes, usuarios e indicadores.
- RLS: qualquer autenticado visualiza; apenas admin gerencia.

### `profiles`

Perfil publico/operacional do usuario.

- Campos principais: `id`, `nome`, `email`, `cargo`, `area_id`, `status`, `created_at`, `updated_at`.
- Relacionamentos: `id` referencia `auth.users(id)`; `area_id` referencia `areas(id)`.
- Uso no app: responsaveis de acoes, listagem de usuarios, cadastro administrativo.
- RLS atual: usuario ve o proprio perfil; admin/diretoria ve perfis; usuario atualiza o proprio perfil; admin gerencia.

### `user_roles`

Roles de autorizacao.

- Campos principais: `id`, `user_id`, `role`, `created_at`.
- Restricao: `UNIQUE(user_id, role)`.
- Uso no app: `AuthProvider`, permissao de menus/acoes, server function de criacao de usuarios.
- RLS: usuario ve suas roles; admin ve e gerencia roles.

### `acoes`

Plano de acao institucional.

- Campos principais: `id`, `codigo`, `programa`, `eixo_estrategico`, `area_id`, `projeto`, `titulo`, `descricao`, `objetivo`, `responsavel_id`, `responsavel_nome`, `data_inicio`, `prazo_final`, `status`, `prioridade`, `percentual_execucao`, `periodicidade`, `observacoes`, `created_at`, `updated_at`.
- Restricoes: `codigo` unico; `percentual_execucao` entre 0 e 100.
- Uso no app: dashboard, plano de acao, detalhe, kanban, notificacoes calculadas e relatorios.
- RLS: qualquer autenticado visualiza; admin/diretoria insere; responsavel ou admin/diretoria atualiza; admin exclui.

### `acoes_apoiadores`

Usuarios apoiadores vinculados a uma acao.

- Campos principais: `id`, `acao_id`, `usuario_id`.
- Restricao: `UNIQUE(acao_id, usuario_id)`.
- Uso no app: tabela existe, mas nao ha tela ou fluxo implementado usando apoiadores.
- RLS: qualquer autenticado visualiza; admin/diretoria gerencia.

### `evidencias`

Metadados dos arquivos comprobatorios anexados.

- Campos principais: `id`, `acao_id`, `usuario_id`, `nome_arquivo`, `caminho_arquivo`, `tipo_arquivo`, `observacao`, `created_at`.
- Relacionamentos: `acao_id` referencia `acoes(id)`; `usuario_id` referencia `auth.users(id)`.
- Uso no app: upload no detalhe da acao, listagem geral e download por signed URL.
- RLS: qualquer autenticado visualiza metadados; usuario autenticado insere suas evidencias; autor ou admin exclui.

### `requisitos_progestao`

Requisitos do Pro-Gestao RPPS.

- Campos principais: `id`, `item`, `dimensao`, `descricao`, `responsavel_id`, `situacao`, `prazo`, `evidencia`, `observacoes`, `created_at`, `updated_at`.
- Uso no app: painel e estatisticas basicas. Ainda sem CRUD de requisitos.
- RLS: qualquer autenticado visualiza; admin/diretoria gerencia.

### `indicadores`

Indicadores institucionais.

- Campos principais: `id`, `nome`, `descricao`, `area_id`, `formula`, `meta`, `resultado_atual`, `unidade_medida`, `periodicidade`, `responsavel_id`, `status`, `created_at`, `updated_at`.
- Uso no app: listagem de indicadores se houver dados. Ainda sem CRUD.
- RLS: qualquer autenticado visualiza; admin/diretoria gerencia.

### `notificacoes`

Notificacoes persistidas por usuario.

- Campos principais: `id`, `usuario_id`, `tipo`, `titulo`, `mensagem`, `lida`, `referencia_tipo`, `referencia_id`, `created_at`.
- Uso no app: a tabela existe, mas a tela atual calcula alertas diretamente a partir de `acoes`; nao consome nem atualiza a tabela.
- RLS: usuario ve e atualiza suas notificacoes; insercao apenas para o proprio `usuario_id`.

### `historico_alertas`

Historico de alertas enviados.

- Campos principais: `id`, `referencia_tipo`, `referencia_id`, `usuario_id`, `email`, `tipo_alerta`, `data_envio`, `status_envio`.
- Uso no app: tabela existe, mas nao ha rotina de envio ou tela de auditoria.
- RLS: admin/diretoria visualiza e insere.

### `historico_acoes`

Historico de alteracoes nas acoes.

- Campos principais: `id`, `acao_id`, `usuario_id`, `campo_alterado`, `valor_anterior`, `valor_novo`, `created_at`.
- Uso no app: tabela existe, mas as edicoes atuais nao gravam historico.
- RLS: qualquer autenticado visualiza; insercao restrita ao usuario responsavel pela acao ou admin/diretoria.

### `storage.objects` / bucket `evidencias`

Arquivos das evidencias.

- Caminho usado no app: `{user.id}/{acao.id}/{timestamp}-{file.name}`.
- Policies: leitura apenas do proprio caminho ou admin/diretoria; upload apenas em pasta do proprio usuario; exclusao/atualizacao pelo dono ou admin.
- Observacao: a tabela `evidencias` permite visualizar metadados para todos os autenticados, mas o storage restringe o arquivo por dono/admin/diretoria.

## 6. APIs utilizadas

### Supabase Auth

- `signInWithPassword`: login por email/senha.
- `signUp`: cadastro publico com metadata `nome` e redirect para `/dashboard`.
- `getSession`: restaura sessao no cliente.
- `onAuthStateChange`: acompanha login/logout.
- `signOut`: encerra sessao.
- `auth.admin.createUser`: criacao administrativa de usuario no servidor.
- `getClaims`: validacao do bearer token no middleware server-side.

### Supabase Database

Chamadas diretas pelo SDK no cliente para:

- `areas`: listar, inserir, atualizar status.
- `profiles`: listar, atualizar status.
- `user_roles`: listar, inserir, excluir roles.
- `acoes`: listar, inserir, atualizar, excluir.
- `evidencias`: listar e inserir metadados.
- `requisitos_progestao`: listar.
- `indicadores`: listar.

### Supabase Storage

- `upload`: envio de arquivos de evidencia para o bucket `evidencias`.
- `createSignedUrl`: download temporario de evidencias com validade de 60 segundos.

### TanStack Start Server Functions

- `createUsuario`: endpoint server-side `POST` que exige token Supabase, valida role admin e cria usuario usando service role.
- `getGreeting`: exemplo em `src/lib/api/example.functions.ts`, sem uso funcional relevante.

### Lovable Cloud Auth

- `createLovableAuth` em `src/integrations/lovable/index.ts` suporta OAuth com `google`, `apple`, `microsoft` e `lovable`.
- No codigo analisado, a tela `/auth` usa email/senha do Supabase; a integracao Lovable existe, mas nao aparece conectada a um botao/fluxo visivel.

### APIs externas ausentes

Nao ha integracao implementada com API de email, TCE, Ministerio Publico, contratos, licitacoes, conselhos, investimentos ou webhooks. A tela de notificacoes descreve politica de envio de email, mas o envio ainda nao esta implementado.

## 7. Fluxo de autenticacao

1. O usuario acessa `/`.
2. `src/routes/index.tsx` verifica `useAuth()`:
   - se autenticado, redireciona para `/dashboard`;
   - se nao autenticado, redireciona para `/auth`.
3. Em `/auth`, o usuario pode:
   - entrar com email/senha via `supabase.auth.signInWithPassword`;
   - criar conta via `supabase.auth.signUp`.
4. Ao criar conta, o trigger `handle_new_user()` cria:
   - registro em `profiles`;
   - role padrao `responsavel` em `user_roles`.
5. `AuthProvider` escuta alteracoes de sessao e carrega roles da tabela `user_roles`.
6. Rotas autenticadas passam por `/_authenticated`, que redireciona para `/auth` quando nao ha usuario.
7. Permissoes no frontend:
   - `isAdmin`: role `admin`;
   - `isDiretoria`: role `diretoria`;
   - `canManage`: admin ou diretoria.
8. Permissoes reais de dados sao reforcadas por RLS no Supabase.
9. Server functions recebem bearer token pelo middleware client `attachSupabaseAuth`.
10. O middleware server `requireSupabaseAuth` valida token, cria cliente Supabase com Authorization e injeta `supabase`, `userId` e `claims` no contexto.

## 8. Funcionalidades implementadas

### Autenticacao

- Login com email/senha.
- Cadastro publico com role padrao.
- Logout.
- Redirecionamento basico por sessao.
- Controle de roles no contexto React.

### Dashboard

- KPIs de total, nao iniciadas, em andamento, concluidas, atrasadas e vencendo em 30 dias.
- Percentual geral de execucao.
- Grafico de pizza por status.
- Grafico de barras por area.
- Ranking de responsaveis por carga de acoes.
- Listas de acoes vencendo e ultimas atualizadas.

### Plano de acao

- Listagem de acoes com joins de area e responsavel.
- Filtros por texto, status, eixo, area e responsavel.
- Criacao de novas acoes para admin/diretoria.
- Detalhe da acao.
- Edicao de status, prioridade, datas, percentual, descricao, objetivo e observacoes.
- Exclusao por admin.
- Suporte a responsavel cadastrado e responsavel em texto livre.

### Kanban

- Colunas por status.
- Drag and drop para alterar status.
- Cards com codigo, titulo, responsavel, percentual e prazo.

### Evidencias

- Upload de arquivos no detalhe da acao.
- Tipos aceitos no input: PDF, DOCX, XLSX, JPG, JPEG, PNG.
- Registro de metadados em `evidencias`.
- Listagem de evidencias por acao.
- Listagem geral de evidencias.
- Download via signed URL de 60 segundos.

### Areas

- Listagem em cards.
- Cadastro de area por admin.
- Vinculo opcional de responsavel.
- Ativacao/inativacao por admin.

### Usuarios

- Listagem de usuarios com cargo, area, status e role.
- Criacao administrativa de usuario via server function.
- Alteracao de role por admin.
- Ativacao/inativacao de perfil por admin.

### Pro-Gestao RPPS

- Painel preparado para requisitos.
- KPIs de total, atendidos, parcialmente atendidos e nao atendidos.
- Percentual de conformidade.
- Listagem se houver requisitos cadastrados.

### Indicadores

- Listagem de indicadores cadastrados.
- Exibicao de meta, resultado atual, unidade, periodicidade, area e status.

### Notificacoes

- Central calculada por prazos de acoes nao concluidas/canceladas.
- Agrupamento por vencidas, em 3 dias, em 7 dias e em 30 dias.
- Texto de politica moderada de alertas.

### Relatorios

- Exportacao CSV do Plano de Acao completo.
- Cards de relatorios futuros em estado "Em breve".

## 9. Funcionalidades faltantes ou incompletas

- Recuperacao de senha/esqueci minha senha.
- Confirmacao visual de email/cadastro pendente, se o Supabase exigir confirmacao.
- OAuth Lovable/Google/Apple/Microsoft na UI.
- Edicao completa de area, nao apenas criacao/status.
- Edicao completa de usuario/perfil/cargo/area apos criacao.
- Bloqueio real de login por `profiles.status`; hoje status inativo nao impede autenticacao automaticamente.
- CRUD de requisitos Pro-Gestao.
- CRUD de indicadores.
- Uso real de `notificacoes`; a tela calcula alertas, mas nao usa a tabela persistida.
- Rotina agendada para envio de emails/notificacoes.
- Registro em `historico_alertas`.
- Registro automatico em `historico_acoes`.
- Uso de `acoes_apoiadores`.
- Exclusao de evidencia pelo app.
- Sincronizacao entre exclusao de metadado de evidencia e arquivo no storage.
- Validacao de tamanho de arquivo no frontend.
- Validacao mais forte de MIME/tipo real do arquivo no backend/storage.
- Relatorios especificos por responsavel, area, atrasadas, concluidas e Pro-Gestao.
- Modulos listados como "Em breve": Demandas TCE, Ministerio Publico, Contratos, Licitacoes, Conselhos, Investimentos, Educacao Previdenciaria e Gestao de Riscos.
- Testes automatizados unitarios, integracao e E2E.
- Documentacao operacional de deploy, variaveis e backup.

## 10. Possiveis problemas de seguranca

### 10.1 Protecao de rotas apenas client-side

`/_authenticated` usa `ssr: false` e redirecionamento client-side. Isso e aceitavel para UX, mas a protecao real precisa continuar dependendo de RLS e server middleware. Qualquer dado sensivel deve ser protegido no Supabase ou em server functions, nao apenas pela rota.

### 10.2 `profiles.status` nao bloqueia usuario

O app permite marcar perfil como inativo, mas o fluxo de auth nao impede login, carregamento de roles ou acesso aos dados se a RLS permitir. O ideal e verificar `profiles.status = true` no AuthProvider, nas policies, ou em uma camada server-side.

### 10.3 Metadados de evidencias visiveis para todos os autenticados

A policy de `evidencias` permite SELECT para qualquer autenticado. Mesmo que o arquivo no storage esteja restrito, nomes de arquivo, acao vinculada, usuario e observacoes podem vazar informacoes internas.

### 10.4 Kanban atualiza status sem checagem visual de permissao

A tela de kanban permite arrastar cards para qualquer usuario autenticado. A RLS deve bloquear quem nao pode alterar, mas a UI gera tentativa e erro. Melhor esconder/impedir drag para usuarios sem permissao.

### 10.5 Criacao publica de contas

A tela `/auth` permite cadastro publico. O trigger atribui role `responsavel`. Se o sistema for interno, isso pode permitir entrada de usuarios externos autenticados com permissao de leitura ampla em `acoes`, `areas`, `evidencias`, `indicadores` e Pro-Gestao.

### 10.6 Leitura ampla de acoes e historico

Policies de SELECT em `acoes`, `historico_acoes`, `indicadores`, `requisitos_progestao` e `areas` permitem leitura por qualquer autenticado. Para sistema interno isso pode ser aceitavel; para dados sensiveis, segmentar por area, papel ou responsabilidade.

### 10.7 Service role depende de isolamento correto

`supabaseAdmin` usa service role e bypassa RLS. O arquivo esta em `client.server.ts`, o que reduz risco de bundle no cliente, mas e essencial garantir que `SUPABASE_SERVICE_ROLE_KEY` nunca seja prefixada com `VITE_` nem exposta no navegador.

### 10.8 Variavel local ausente para service role

As chaves listadas no `.env` local incluem apenas URL e publishable key, alem de VITE. A funcao `createUsuario` precisa de `SUPABASE_SERVICE_ROLE_KEY` no runtime. Sem ela, a criacao administrativa falha.

### 10.9 Validacao server-side insuficiente na criacao de usuario

`createUsuario` usa um `inputValidator` que apenas faz cast de tipo, sem validar formato de email, tamanho de senha, role permitida, nome minimo etc. O frontend valida parcialmente, mas chamadas diretas a server function devem ser validadas no servidor.

### 10.10 Upload de arquivos sem varredura

O app limita extensoes no input HTML, mas isso nao e controle de seguranca. Falta validacao server-side/storage para tamanho, MIME real, conteudo malicioso e politicas de antivirus, se necessario.

### 10.11 Mensagens de erro expostas

Varias mutations exibem `error.message` diretamente ao usuario. Isso ajuda no desenvolvimento, mas pode revelar detalhes internos de RLS, constraints ou estrutura de banco.

### 10.12 Codificacao de texto

Ha sinais de mojibake em migrations e arquivos exibidos pelo terminal, por exemplo textos de governanca, acao e area renderizados com caracteres quebrados. Se estiver persistido nos arquivos e nao for apenas problema de console, isso afeta dados, UI, relatorios e confiabilidade.

## 11. Possiveis problemas de desempenho

### 11.1 Consultas sem paginacao

Listagens carregam todos os registros de `acoes`, `evidencias`, `profiles`, `user_roles`, `indicadores` e `requisitos_progestao`. Com crescimento de dados, dashboard, plano de acao, relatorios e evidencias podem ficar lentos.

### 11.2 Filtros no cliente

O Plano de Acao busca todas as acoes e filtra no navegador. Para bases maiores, filtros por texto/status/eixo/area/responsavel deveriam ir para a query.

### 11.3 Dashboard faz agregacoes no cliente

KPIs e graficos sao calculados apos baixar todas as acoes. Melhor criar views, RPCs ou queries agregadas no banco.

### 11.4 Relatorio CSV monta tudo no navegador

Exportacao CSV baixa todas as acoes e monta arquivo localmente. Para grande volume, considerar endpoint server-side com streaming/paginacao.

### 11.5 Falta de indices explicitos

As migrations criam PKs, FKs e unique, mas nao ha indices especificos para campos muito filtrados/ordenados como `acoes.status`, `acoes.prazo_final`, `acoes.area_id`, `acoes.responsavel_id`, `evidencias.acao_id`, `evidencias.created_at`, `notificacoes.usuario_id` e `historico_acoes.acao_id`.

### 11.6 Queries duplicadas

Diferentes telas repetem queries semelhantes em `acoes` com joins para area/responsavel. Pode ser aceitavel no inicio, mas views ou hooks compartilhados ajudariam consistencia e cache.

### 11.7 Kanban carrega todas as acoes

O kanban carrega todo o plano e separa em colunas no cliente. Em bases grandes, convem paginacao por coluna ou limites por status.

### 11.8 Signed URLs geradas sob demanda

Cada download gera signed URL. Isso e seguro, mas pode causar latencia perceptivel. Para UX, manter feedback de loading por item.

## 12. Recomendacoes prioritarias

1. Corrigir codificacao dos arquivos/migrations e validar se dados ja foram gravados com texto quebrado no banco.
2. Decidir se cadastro publico deve existir. Se o sistema for interno, desabilitar signup publico ou exigir aprovacao antes de conceder leitura ampla.
3. Fazer `profiles.status` bloquear acesso de usuarios inativos.
4. Adicionar validacao server-side robusta em `createUsuario`.
5. Adicionar `SUPABASE_SERVICE_ROLE_KEY` ao ambiente seguro de runtime, sem prefixo `VITE_`.
6. Restringir SELECT de `evidencias` se metadados forem sensiveis.
7. Implementar paginacao/filtros server-side nas listas principais.
8. Criar indices para campos de filtros, joins e ordenacao.
9. Implementar historico real de alteracoes em `historico_acoes`.
10. Implementar rotina real de notificacoes/alertas ou ajustar texto da tela para nao prometer envio ainda inexistente.
11. Adicionar testes de permissoes RLS e fluxos criticos: login, criacao de acao, edicao por responsavel, bloqueio de usuario comum, upload de evidencia.
12. Revisar UI de permissoes para esconder acoes que a RLS bloquearia, especialmente no kanban.

## 13. Variaveis de ambiente identificadas

Variaveis lidas/esperadas no codigo:

- `VITE_SUPABASE_URL`: URL publica do Supabase para o cliente.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave publica/publishable para o cliente.
- `VITE_SUPABASE_PROJECT_ID`: identificador publico do projeto.
- `SUPABASE_URL`: URL do Supabase para server-side.
- `SUPABASE_PUBLISHABLE_KEY`: chave publishable para server-side.
- `SUPABASE_SERVICE_ROLE_KEY`: esperada por `client.server.ts`, mas nao listada no `.env` local analisado.
- `NODE_ENV`: lida por `config.server.ts`.

Nunca usar prefixo `VITE_` para secrets.

## 14. Scripts disponiveis

```bash
npm run dev        # inicia Vite em desenvolvimento
npm run build      # build de producao
npm run build:dev  # build em modo development
npm run preview    # preview do build
npm run lint       # ESLint
npm run format     # Prettier
```

O `package.json` tambem e compativel com Bun, pois ha `bun.lock` e `bunfig.toml`.

## 15. Atualizacao de seguranca - 04/06/2026

Foram implementadas correcoes criticas de seguranca e controle de acesso registradas em `CORRECOES_SEGURANCA.md`.

### Principais mudancas

- Cadastro publico desabilitado na tela `/auth`.
- Criacao de usuarios mantida apenas para administradores no modulo `Usuarios`.
- Bloqueio de usuarios inativos no cliente e nas server functions.
- Validacoes server-side com Zod para usuarios, acoes e evidencias.
- Criacao e atualizacao de usuarios movidas para server functions.
- Criacao e atualizacao de acoes movidas para server functions.
- Mudanca de status pelo Kanban movida para a server function de atualizacao de acoes.
- Upload de evidencias passou a validar tamanho, MIME type, nome e permissao antes do envio.
- Registro de evidencias passou a remover arquivo do storage quando o insert de metadados falha.
- Kanban passou a permitir drag/drop apenas para admin, diretoria ou responsavel da acao.
- Exportacao CSV passou a usar `responsavel_nome` como fallback.
- Nova migration `20260604170000_security_access_audit.sql` adicionou `is_active_user`, revisou RLS e criou auditoria automatica em `historico_acoes`.

### Observacoes

- O signup foi removido da aplicacao, mas recomenda-se revisar tambem a configuracao do Supabase Auth para impedir cadastro direto pela API publica.
- Nao foi possivel executar lint/build neste ambiente porque `npm` e `bun` nao estao disponiveis no PATH.
