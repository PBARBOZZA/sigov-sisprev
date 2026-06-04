# Auditoria do Sistema SIGOV-SISPREV

Analise realizada em 04/06/2026 no projeto `C:\Users\peric\sigov-sisprev`.

Observacao: nao foi possivel executar `npm run lint` porque `npm` nao esta disponivel no PATH do ambiente. A auditoria abaixo e baseada em leitura estatica do codigo, migrations e configuracoes.

## 1. Bugs e riscos funcionais

### Alta prioridade

1. Cadastro publico libera acesso inicial ao sistema
   - Arquivo: `src/routes/auth.tsx`, linhas 52-63.
   - O signup publico cria usuario e o trigger do banco atribui role padrao `responsavel`.
   - Como varias tabelas permitem SELECT para qualquer autenticado, um usuario externo pode acessar dados internos depois de criar conta.
   - Correcao: desabilitar signup publico ou criar fluxo de aprovacao antes de liberar acesso.

2. Usuario inativo ainda consegue acessar
   - Arquivos: `src/lib/auth.tsx`, `src/routes/_authenticated.tsx`, `src/routes/_authenticated/usuarios.tsx`.
   - A tela permite alterar `profiles.status`, mas o AuthProvider nao bloqueia usuarios com status false.
   - Correcao: validar `profiles.status` no carregamento da sessao e/ou nas policies RLS.

3. Criacao administrativa de usuario pode falhar em ambiente local/producao
   - Arquivo: `src/integrations/supabase/client.server.ts`, linhas 9-15.
   - `SUPABASE_SERVICE_ROLE_KEY` e obrigatoria para `createUsuario`, mas nao aparece no `.env` local.
   - Correcao: configurar secret no ambiente server-side e documentar obrigatoriedade.

4. Validacao server-side fraca na criacao de usuario
   - Arquivo: `src/lib/usuarios.functions.ts`, linha 16.
   - `inputValidator((d: CreateUserInput) => d)` apenas faz cast, nao valida email, senha, nome, role, area ou status.
   - Correcao: trocar por schema Zod no servidor.

5. Kanban permite tentativa de alteracao por usuarios sem permissao
   - Arquivo: `src/routes/_authenticated/kanban.tsx`, linhas 27-43 e 68.
   - Qualquer usuario consegue arrastar cards; a RLS deve bloquear, mas a UI oferece acao indevida.
   - Correcao: usar `useAuth()` e permitir drag/drop apenas para admin, diretoria ou responsavel da acao.

6. Evidencias podem expor metadados para todos os autenticados
   - Arquivo: `supabase/migrations/20260603134143_6625aa97-20d9-44ec-846d-de6d2f826532.sql`, linha 229.
   - A policy `Auth view evidencias` permite SELECT global nos metadados.
   - Correcao: restringir por dono, responsavel da acao, admin/diretoria ou area.

7. Texto com codificacao quebrada em varios arquivos/migrations
   - Exemplos: `src/routes/auth.tsx`, `src/routes/__root.tsx`, `src/lib/acao-helpers.ts`, migrations de seed.
   - O terminal exibiu textos de governanca, acao e area com caracteres quebrados.
   - Correcao: confirmar encoding real dos arquivos, salvar como UTF-8 e revisar dados ja inseridos no banco.

### Media prioridade

8. Upload de evidencias nao valida tamanho nem MIME real
   - Arquivo: `src/routes/_authenticated/plano-acao/$id.tsx`, linhas 79-90 e 217.
   - O input aceita extensoes, mas isso nao garante seguranca nem limite de tamanho.
   - Correcao: validar `file.size`, MIME, extensao e, idealmente, usar policy/processamento server-side.

9. Cadastro de acao pode enviar codigo nulo apesar do campo estar visualmente obrigatorio
   - Arquivo: `src/routes/_authenticated/plano-acao/index.tsx`, linhas 91-105 e 127.
   - O banco exige `codigo NOT NULL UNIQUE`; o frontend marca required, mas a validacao manual nao checa `codigo`.
   - Correcao: validar `codigo` explicitamente antes de inserir.

10. Percentual de execucao pode virar valor invalido no cliente
   - Arquivo: `src/routes/_authenticated/plano-acao/index.tsx`, linha 105.
   - `Number(f.get("percentual") || 0)` pode virar `NaN` se payload manipulado.
   - O banco tem CHECK 0-100, mas a UX quebra com erro bruto.
   - Correcao: validar numero inteiro entre 0 e 100 no frontend e servidor.

11. Edicao de acao envia campos demais no update
   - Arquivo: `src/routes/_authenticated/plano-acao/$id.tsx`, linha 111.
   - `save()` remove alguns campos, mas ainda pode enviar campos nao editaveis presentes em `form`.
   - Correcao: montar patch explicito apenas com campos permitidos.

12. Exclusao de acao usa `confirm()` nativo
   - Arquivo: `src/routes/_authenticated/plano-acao/$id.tsx`, linha 120.
   - UX inconsistente e pouco controlavel.
   - Correcao: usar `AlertDialog` do design system.

13. Tela de notificacoes promete envio de email sem implementacao
   - Arquivo: `src/routes/_authenticated/notificacoes.tsx`, texto de politica de alertas.
   - A tela calcula prazos, mas nao usa tabela `notificacoes`, `historico_alertas` nem servico de email.
   - Correcao: implementar job/envio ou ajustar texto para "previsto".

14. Relatorio CSV pode omitir responsavel por texto livre
   - Arquivo: `src/routes/_authenticated/relatorios.tsx`, exportacao usa `a.responsavel?.nome`.
   - Acoes criadas com `responsavel_nome` podem exportar responsavel vazio.
   - Correcao: usar fallback `a.responsavel?.nome ?? a.responsavel_nome`.

15. Listagem de usuarios associa apenas uma role
   - Arquivo: `src/routes/_authenticated/usuarios.tsx`, linha 47.
   - A tabela permite multiplas roles por usuario, mas a UI usa apenas a primeira encontrada.
   - Correcao: decidir se usuario tera uma ou varias roles; se uma, impor constraint unica por user_id ou adaptar UI.

16. Troca de role apaga todas as roles antes de inserir nova
   - Arquivo: `src/routes/_authenticated/usuarios.tsx`, linhas 59-61.
   - Se a insercao falhar apos o delete, usuario fica sem role.
   - Correcao: usar RPC/transacao no banco ou upsert com modelo de role unica.

17. Storage e metadados podem ficar inconsistentes
   - Arquivo: `src/routes/_authenticated/plano-acao/$id.tsx`, linhas 84-91.
   - Se upload no storage funciona e insert em `evidencias` falha, sobra arquivo orfao.
   - Correcao: apagar arquivo em caso de falha no insert ou mover upload para server function transacional compensada.

18. Download de evidencia nao tem estado de loading por item
   - Arquivos: `src/routes/_authenticated/evidencias.tsx`, `src/routes/_authenticated/plano-acao/$id.tsx`.
   - O usuario pode clicar repetidas vezes sem feedback.
   - Correcao: estado de loading por evidencia.

## 2. Campos sem validacao suficiente

### Auth

- Login: email e senha tem Zod em `src/routes/auth.tsx`, linhas 20-24. OK basico.
- Signup: nome, email e senha tem Zod em `src/routes/auth.tsx`, linhas 20-27. Falta regra forte de senha, confirmacao de senha e dominio permitido, se for sistema interno.

### Usuarios

- `nome`: required no HTML e checagem simples no submit. Falta limite/tamanho no server.
- `email`: type email no HTML, sem validacao server-side propria em `createUsuario`.
- `password`: minimo 6 no HTML, sem politica forte no server.
- `cargo`: sem limite de tamanho.
- `area_id`: sem validacao server-side de UUID existente.
- `role`: sem validacao server-side real; o tipo TypeScript nao protege payload externo.
- `status`: aceita valor derivado do form, sem schema server.

### Areas

- `nome`: required e trim no submit, mas sem limite e sem unicidade.
- `descricao`: sem limite.
- `responsavel_id`: sem validacao de perfil ativo.
- `status`: controlado por select/switch, mas sem validacao server-side alem da RLS.

### Plano de acao

- `codigo`: campo required, mas sem validacao manual antes do insert.
- `titulo`: validado como obrigatorio, mas sem limite.
- `descricao`, `objetivo`, `observacoes`: sem limite.
- `programa`, `eixo_estrategico`, `periodicidade`: selecionados na UI, mas sem constraint no banco.
- `area_id`: obrigatorio na UI, mas banco permite null; precisa regra de negocio.
- `responsavel_id` e `responsavel_nome`: a UI exige um deles, mas o banco permite ambos nulos.
- `data_inicio` e `prazo_final`: sem regra para `data_inicio <= prazo_final`.
- `status` e `prioridade`: protegidos por enum no banco, mas sem schema frontend/server.
- `percentual_execucao`: input min/max e CHECK no banco, mas sem parse robusto.

### Edicao de acao

- Campos editaveis no detalhe nao passam por schema antes do update.
- `percentual_execucao` via slider e seguro na UI, mas update poderia receber payload manipulado.
- `status`, `prioridade`, datas e textos precisam schema explicito.

### Evidencias

- `file.name`: usado no path sem sanitizacao extra.
- `file.size`: sem limite.
- `file.type`: registrado como informado pelo navegador.
- Conteudo real do arquivo: nao validado.
- `observacao`: existe na tabela, mas nao aparece no formulario de upload.

### Indicadores e Pro-Gestao

- As tabelas existem, mas como nao ha CRUD no app, tambem nao ha validacao de entrada implementada.

## 3. Telas incompletas

1. Pro-Gestao RPPS
   - Arquivo: `src/routes/_authenticated/progestao.tsx`.
   - Tela so lista dados existentes e mostra card "modulo preparado".
   - Falta CRUD, filtros, responsavel, evidencias e relatorios.

2. Indicadores
   - Arquivo: `src/routes/_authenticated/indicadores.tsx`.
   - Tela so lista dados existentes ou estado vazio.
   - Falta CRUD, historico de resultados, calculo por formula, graficos e exportacao.

3. Relatorios
   - Arquivo: `src/routes/_authenticated/relatorios.tsx`.
   - Apenas "Plano de Acao completo" exporta CSV.
   - Cards de responsavel, area, atrasadas, concluidas e Pro-Gestao estao "Em breve".

4. Notificacoes
   - Arquivo: `src/routes/_authenticated/notificacoes.tsx`.
   - E uma central calculada, nao uma central persistida.
   - Falta marcar como lida, historico, envio de email, escalonamento e uso da tabela `notificacoes`.

5. Usuarios
   - Arquivo: `src/routes/_authenticated/usuarios.tsx`.
   - Cria usuario, muda role e status.
   - Falta editar nome, email, cargo, area, resetar senha, remover usuario e auditar alteracoes.

6. Areas
   - Arquivo: `src/routes/_authenticated/areas.tsx`.
   - Cria area e alterna status.
   - Falta editar nome, descricao, responsavel e excluir/arquivar com seguranca.

7. Evidencias
   - Arquivos: `src/routes/_authenticated/evidencias.tsx` e `src/routes/_authenticated/plano-acao/$id.tsx`.
   - Upload/download existem.
   - Falta excluir evidencia, observacao, preview, versionamento e validacao robusta.

8. Apoiadores de acoes
   - Tabela `acoes_apoiadores` existe.
   - Nao ha tela, campo ou fluxo usando apoiadores.

9. Modulos "Em breve" da sidebar
   - Arquivo: `src/components/app-layout.tsx`.
   - Demandas TCE, Ministerio Publico, Contratos, Licitacoes, Conselhos, Investimentos, Educacao Previdenciaria e Gestao de Riscos aparecem como futuros.

## 4. Funcoes, tabelas e constantes nao utilizadas ou subutilizadas

1. `getGreeting`
   - Arquivo: `src/lib/api/example.functions.ts`.
   - Funcao exemplo nao referenciada por telas.
   - Acao: remover ou mover para documentacao de exemplo.

2. `lovable.auth.signInWithOAuth`
   - Arquivo: `src/integrations/lovable/index.ts`.
   - Integracao existe, mas nao ha botao de OAuth na tela de auth.
   - Acao: implementar OAuth ou remover dependencia/arquivo se nao for usado.

3. `STATUS_COLORS` e `PRIORIDADE_COLORS`
   - Arquivo: `src/lib/acao-helpers.ts`.
   - Exportadas, mas a busca nao encontrou uso fora do arquivo.
   - Acao: usar nos badges ou remover.

4. `notificacoes`
   - Tabela existe, mas a tela nao consulta essa tabela.
   - Acao: implementar persistencia de notificacoes ou remover do escopo inicial.

5. `historico_alertas`
   - Tabela e policies existem, mas nao ha job/envio de alerta.
   - Acao: implementar rotina agendada e tela de auditoria.

6. `historico_acoes`
   - Tabela e policies existem, mas updates de acoes nao inserem historico.
   - Acao: trigger/RPC para registrar alteracoes automaticamente.

7. `acoes_apoiadores`
   - Tabela existe, sem uso no frontend.
   - Acao: implementar apoiadores por acao ou retirar ate o modulo nascer.

8. `getServerConfig`
   - Arquivo: `src/lib/config.server.ts`.
   - Usada apenas pelo exemplo `getGreeting`.
   - Acao: remover junto com exemplo ou expandir para configuracao real.

## 5. Melhorias para producao

### Seguranca e acesso

1. Desabilitar cadastro publico ou exigir aprovacao administrativa.
2. Bloquear usuarios com `profiles.status = false`.
3. Revisar RLS de SELECT amplo para `acoes`, `evidencias`, `indicadores`, `requisitos_progestao`, `historico_acoes` e `areas`.
4. Validar todos os server functions com Zod.
5. Criar RPCs/server functions para operacoes sensiveis, como trocar role, criar usuario, atualizar acao e registrar historico.
6. Garantir que `SUPABASE_SERVICE_ROLE_KEY` exista somente no ambiente server-side.
7. Implementar politica de senha, recuperacao de senha e confirmacao de email.
8. Reduzir exposicao de mensagens brutas de erro do Supabase para o usuario final.

### Banco e desempenho

1. Adicionar indices:
   - `acoes(status)`.
   - `acoes(prazo_final)`.
   - `acoes(area_id)`.
   - `acoes(responsavel_id)`.
   - `evidencias(acao_id, created_at)`.
   - `notificacoes(usuario_id, lida, created_at)`.
   - `historico_acoes(acao_id, created_at)`.
2. Adicionar paginacao nas listas.
3. Levar filtros do Plano de Acao para o banco.
4. Criar views/RPCs agregadas para dashboard.
5. Evitar `select("*")` em telas de alto volume.
6. Criar constraints de negocio ausentes: area obrigatoria, responsavel obrigatorio, datas coerentes e unicidade de area por nome se desejado.

### Operacao e confiabilidade

1. Criar testes automatizados:
   - Auth e roles.
   - RLS.
   - Criacao/edicao/exclusao de acoes.
   - Upload/download de evidencias.
   - Criacao administrativa de usuario.
2. Configurar CI com lint, typecheck e build.
3. Documentar variaveis de ambiente e separar `.env.example`.
4. Definir estrategia de backup e restore do Supabase.
5. Monitorar erros client/server.
6. Criar logs/auditoria para alteracoes de roles, usuarios, acoes e evidencias.
7. Corrigir codificacao UTF-8 antes de popular banco de producao.

### Produto e UX

1. Substituir `confirm()` por modal padronizado.
2. Adicionar estados de loading em botoes de download e mudanca de role/status.
3. Esconder acoes de UI que o usuario nao tem permissao para executar.
4. Padronizar mensagens de erro em portugues amigavel.
5. Adicionar busca/paginacao em usuarios, areas, evidencias e relatorios.
6. Adicionar feedback para email de confirmacao, recuperacao de senha e conta aguardando aprovacao.
7. Melhorar exportacoes com filtros e fallback para `responsavel_nome`.

## 6. Backlog recomendado por ordem

1. Corrigir acesso: cadastro publico, usuario inativo e RLS de leitura.
2. Adicionar Zod server-side em `createUsuario` e operacoes criticas.
3. Corrigir codificacao dos arquivos e seeds.
4. Implementar historico de acoes via trigger/RPC.
5. Implementar validacoes completas do Plano de Acao.
6. Fortalecer upload de evidencias.
7. Adicionar indices e paginacao.
8. Concluir Notificacoes, Pro-Gestao, Indicadores e Relatorios.
9. Criar testes e pipeline de CI.
10. Preparar `.env.example`, runbook de deploy e monitoramento.
