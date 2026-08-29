# Relatorio de Correcao do Controle de Permissoes

Data: 04/06/2026.

## Objetivo atendido

O signup publico permanece desabilitado, mas o administrador inicial `periclescep@gmail.com` passa a ter acesso administrativo garantido para entrar no sistema, visualizar menus gerenciais e cadastrar novos usuarios.

## Arquivos alterados

- `src/lib/permissions.ts`
- `src/lib/auth.tsx`
- `src/integrations/supabase/auth-middleware.ts`
- `src/lib/usuarios.functions.ts`
- `src/lib/acoes.functions.ts`
- `src/components/app-layout.tsx`
- `src/routes/auth.tsx`
- `src/routes/_authenticated/usuarios.tsx`
- `supabase/migrations/20260604183000_bootstrap_admin_permissions.sql`
- `supabase/migrations/20260604184500_action_visibility_permissions.sql`
- `RELATORIO_PERMISSOES.md`

## Logica final de permissoes

### Administrador inicial

- O e-mail `periclescep@gmail.com` e tratado como administrador inicial.
- No cliente, esse e-mail recebe `permissionLevel = admin` mesmo que a role ainda nao tenha sido carregada.
- Nas server functions, esse e-mail passa pela validacao `assertAdmin`.
- No banco, a migration `20260604183000_bootstrap_admin_permissions.sql` cria/atualiza:
  - `is_bootstrap_admin`.
  - `has_role`.
  - `is_admin_or_diretoria`.
  - `is_active_user`.
- Se o usuario ja existir em `auth.users`, a migration tambem garante:
  - profile ativo em `profiles`;
  - role `admin` em `user_roles`.

### Niveis de permissao

- `admin`
  - Acesso total.
  - Pode ver e gerenciar Usuarios, Areas, Pro-Gestao, Indicadores, Relatorios, Plano de Acao, Kanban, Evidencias e Notificacoes.
  - Pode cadastrar novos usuarios.

- `manage`
  - Aplicado a usuarios com role `diretoria`.
  - Acesso a modulos gerenciais:
    - Areas.
    - Pro-Gestao.
    - Indicadores.
    - Relatorios.
    - Dashboard.
    - Plano de Acao.
    - Kanban.
    - Evidencias.
    - Notificacoes.
  - Nao acessa o modulo Usuarios, reservado a admin.

- `responsavel`
  - Acesso operacional.
  - Ve na sidebar os modulos sem permissao como bloqueados, em vez de eles desaparecerem.
  - Acesso permitido a:
    - Dashboard.
    - Plano de Acao.
    - Kanban.
    - Evidencias.
    - Notificacoes.
  - No banco, a visibilidade de acoes foi restringida para acoes em que o usuario e responsavel ou apoiador, salvo admin/diretoria.

## Menus

Administradores veem normalmente:

- Usuarios.
- Areas.
- Pro-Gestao.
- Indicadores.
- Relatorios.

Usuarios sem permissao nao perdem totalmente a referencia do modulo: a sidebar mostra o item bloqueado com icone de cadeado e tooltip `Acesso restrito`.

## Tela funcional para cadastro de usuarios

- A tela `src/routes/_authenticated/usuarios.tsx` continua com o botao `Novo Usuario`.
- O botao aparece para `admin`.
- `periclescep@gmail.com` e reconhecido como admin, portanto consegue abrir o formulario e criar usuarios.
- Usuarios nao admin veem mensagem de `Acesso restrito` nessa tela.

## Signup publico

- O fluxo publico continua removido da UI.
- A tela `/auth` nao chama `supabase.auth.signUp`.
- A aba `Cadastrar` mostra apenas aviso de que novos usuarios devem ser criados por administrador.

## Banco de dados e RLS

### Migration de bootstrap admin

Arquivo: `supabase/migrations/20260604183000_bootstrap_admin_permissions.sql`.

Efeitos:

- Reconhece `periclescep@gmail.com` como admin inicial.
- Recria helpers de role para considerar o bootstrap admin.
- Mantem usuario bootstrap ativo.
- Insere role `admin` caso o usuario ja exista.

### Migration de visibilidade de acoes

Arquivo: `supabase/migrations/20260604184500_action_visibility_permissions.sql`.

Efeitos:

- Admin/diretoria veem todas as acoes.
- Responsavel ve apenas acoes em que `responsavel_id = auth.uid()`.
- Apoiador ve acoes vinculadas em `acoes_apoiadores`.
- Policy de apoiadores evita recursao e permite leitura por admin/diretoria ou pelo proprio apoiador.

## Como testar no Lovable

1. Aplicar as migrations novas no Supabase/Lovable:
   - `20260604183000_bootstrap_admin_permissions.sql`
   - `20260604184500_action_visibility_permissions.sql`

2. Entrar com `periclescep@gmail.com`.
   - Esperado: login permitido.
   - Esperado: menus Usuarios, Areas, Pro-Gestao, Indicadores e Relatorios visiveis e navegaveis.

3. Acessar `Usuarios`.
   - Esperado: botao `Novo Usuario` visivel.
   - Esperado: formulario abre e permite cadastro.

4. Criar um usuario `diretoria`.
   - Esperado: usuario consegue acessar modulos gerenciais.
   - Esperado: modulo Usuarios aparece bloqueado.

5. Criar um usuario `responsavel`.
   - Esperado: modulos gerenciais aparecem bloqueados na sidebar.
   - Esperado: usuario nao ve botao de cadastro de usuario.
   - Esperado: usuario ve apenas acoes em que e responsavel ou apoiador.

6. Confirmar que signup publico segue desabilitado.
   - Acessar `/auth`, aba `Cadastrar`.
   - Esperado: nao ha formulario de cadastro publico.

7. Testar tentativa manual de acesso a `/usuarios` por usuario nao admin.
   - Esperado: mensagem `Acesso restrito`.

## Riscos e observacoes

- O signup foi desabilitado na UI. Ainda e recomendado revisar a configuracao do Supabase Auth para bloquear cadastro direto pela API publica.
- A regra de responsavel depende de `responsavel_id` ou `acoes_apoiadores`. Acoes com apenas `responsavel_nome` em texto livre nao ficam atribuiveis a um usuario responsavel para fins de RLS.
- Nao foi executado build/lint porque `npm` e `bun` nao estao disponiveis no PATH do ambiente atual.

