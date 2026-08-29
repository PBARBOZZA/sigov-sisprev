# Correcoes de Seguranca e Controle de Acesso

Data: 04/06/2026.

## Objetivo

Implementar as correcoes criticas da auditoria relacionadas a seguranca de acesso, validacoes server-side, evidencias, historico de acoes e endurecimento das policies Supabase, preservando a arquitetura React/TanStack/Supabase existente.

## Arquivos alterados

- `src/routes/auth.tsx`
- `src/lib/auth.tsx`
- `src/integrations/supabase/auth-middleware.ts`
- `src/lib/security-schemas.ts`
- `src/lib/usuarios.functions.ts`
- `src/lib/acoes.functions.ts`
- `src/routes/_authenticated/usuarios.tsx`
- `src/routes/_authenticated/plano-acao/index.tsx`
- `src/routes/_authenticated/plano-acao/$id.tsx`
- `src/routes/_authenticated/kanban.tsx`
- `src/routes/_authenticated/relatorios.tsx`
- `supabase/migrations/20260604170000_security_access_audit.sql`
- `DOCUMENTACAO_PROJETO.md`
- `roadmap.md`
- `CORRECOES_SEGURANCA.md`

## Alteracoes realizadas

### 1. Cadastro publico desabilitado

- Removido o fluxo `supabase.auth.signUp` da tela `/auth`.
- A aba "Cadastrar" agora informa que novos usuarios devem ser criados por administradores.
- A criacao de usuarios permanece disponivel no modulo administrativo `Usuarios`.

### 2. Bloqueio de usuarios inativos

- `AuthProvider` passou a consultar `profiles.status` ao aplicar a sessao.
- Usuarios sem perfil ativo sao desconectados automaticamente.
- O login tambem valida o status antes de navegar para o dashboard.
- O middleware server-side `requireSupabaseAuth` bloqueia server functions para usuarios inativos.

### 3. Validacoes server-side com Zod

Criado `src/lib/security-schemas.ts` com schemas para:

- Criacao de usuario.
- Atualizacao de usuario.
- Criacao de acao.
- Atualizacao de acao.
- Preparacao/registro de upload de evidencias.

As validacoes cobrem:

- Campos obrigatorios.
- Tamanho minimo e maximo.
- E-mails validos.
- UUIDs validos.
- Datas validas.
- Percentual entre 0 e 100.
- MIME types permitidos.
- Tamanho maximo de evidencia de 10 MB.

### 4. Usuarios via server functions

- `createUsuario` agora usa Zod e valida area existente.
- Criacao continua restrita a administradores.
- Adicionado `updateUsuario` para alteracoes administrativas de status e perfil.
- A tela de usuarios deixou de alterar `profiles` e `user_roles` diretamente pelo cliente.
- A troca de role agora usa `upsert` antes de remover roles antigas, reduzindo risco de usuario sem role por falha intermediaria.

### 5. Acoes via server functions

- Criacao de acao agora usa `createAcao` com validacao server-side.
- Atualizacao de acao agora usa `updateAcao` com patch explicito.
- Validada coerencia de datas: prazo final deve ser igual ou posterior a data de inicio.
- O detalhe da acao deixou de enviar objetos completos para update.

### 6. Evidencias

- Adicionadas server functions `prepareEvidenceUpload` e `registerEvidenceUpload`.
- O servidor valida nome, tamanho, MIME type e permissao antes de preparar o path.
- O registro de metadados tambem e validado no servidor.
- Se o registro de metadados falhar apos upload, o arquivo e removido do storage para reduzir arquivos orfaos.
- Upload permitido apenas para responsavel da acao, admin ou diretoria.

### 7. Kanban

- Cards so podem ser arrastados por admin, diretoria ou responsavel da acao.
- Mudanca de status pelo Kanban passou a usar a server function `updateAcao`.
- A RLS continua sendo a protecao final no banco.

### 8. Relatorio CSV

- Exportacao do Plano de Acao agora usa fallback `responsavel_nome` quando nao existe usuario cadastrado vinculado.

### 9. RLS e policies Supabase

Adicionada migration `20260604170000_security_access_audit.sql` com:

- Funcao `is_active_user`.
- Policies que exigem usuario ativo para leitura/escrita.
- Revisao de policies para usuarios, roles, areas, acoes, evidencias, indicadores e requisitos Pro-Gestao.
- Restricao de metadados de evidencias para dono, responsavel da acao, admin ou diretoria.
- Restricao de storage para usuarios ativos e autorizados.

### 10. Historico e auditoria de acoes

Adicionada funcao trigger `audit_acoes_changes` para registrar:

- Criacao de acao.
- Alteracao geral de acao.
- Mudanca de status.
- Alteracao de responsavel por UUID.
- Alteracao de responsavel em texto livre.
- Alteracao de prazo final.

Os registros sao gravados em `historico_acoes`.

## Riscos ainda existentes

1. O cadastro publico foi removido da aplicacao, mas a configuracao do Supabase Auth tambem deve ser revisada no painel do Supabase para impedir signup direto pela API publica, se aplicavel.
2. Exclusao de acao ainda usa chamada direta ao Supabase protegida por RLS. Recomenda-se mover exclusao para server function em etapa futura.
3. O app ainda possui algumas telas incompletas: Pro-Gestao, Indicadores, Notificacoes persistidas e Relatorios avancados.
4. Nao foi possivel executar lint/build porque `npm` e `bun` nao estao disponiveis no PATH do ambiente.
5. A validacao de conteudo real de arquivo ainda nao faz antivirus ou inspecao binaria; valida MIME e tamanho informados pelo navegador.
6. Algumas strings antigas do projeto continuam com sinais de mojibake em arquivos nao reescritos nesta entrega.

## Recomendacoes futuras

1. Desabilitar signup no painel Supabase Auth ou restringir por dominio/convite.
2. Criar server function para exclusao de acoes e evidencias.
3. Criar testes automatizados para Auth, RLS, usuarios, acoes e evidencias.
4. Implementar CI com lint, typecheck e build.
5. Criar `.env.example` e checklist de secrets.
6. Implementar notificacoes persistidas e historico de alertas.
7. Implementar auditoria de alteracoes de usuarios e roles.
8. Adicionar antivirus ou pipeline de verificacao para evidencias, caso o ambiente institucional exija.

## Checklist de testes no Lovable

1. Tentar criar conta pela tela `/auth`.
   - Esperado: nao existe formulario de cadastro publico; aparece aviso de cadastro por administrador.

2. Login com usuario ativo.
   - Esperado: acesso normal ao dashboard.

3. Login com usuario marcado como inativo em `profiles.status = false`.
   - Esperado: login bloqueado/desconectado e sem acesso ao dashboard.

4. Criar usuario como admin.
   - Esperado: usuario criado, perfil salvo, role aplicada.

5. Tentar criar usuario como nao admin.
   - Esperado: acao bloqueada.

6. Alterar role/status de usuario como admin.
   - Esperado: alteracao salva e lista atualizada.

7. Criar acao com dados validos como admin/diretoria.
   - Esperado: acao criada e historico com `criacao`.

8. Criar acao sem codigo, sem area ou sem responsavel.
   - Esperado: erro de validacao.

9. Atualizar status, prazo e percentual de uma acao como responsavel.
   - Esperado: alteracao salva e historico gravado.

10. Tentar atualizar acao sem permissao.
    - Esperado: bloqueio por UI/RLS/server function.

11. Arrastar card no Kanban como usuario sem permissao.
    - Esperado: card nao inicia drag efetivo.

12. Enviar evidencia PDF/PNG/JPG/DOCX/XLSX menor que 10 MB como responsavel/admin/diretoria.
    - Esperado: upload e registro com sucesso.

13. Enviar evidencia com MIME nao permitido ou maior que 10 MB.
    - Esperado: erro de validacao antes do registro.

14. Simular falha no registro de evidencia apos upload.
    - Esperado: arquivo removido do storage pela compensacao.

15. Exportar CSV de acao com `responsavel_nome`.
    - Esperado: responsavel aparece no CSV.
