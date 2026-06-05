# Relatorio - Correcao Admin Bootstrap

Data: 04/06/2026.

## Problema encontrado

O usuario `periclescep@gmail.com` podia continuar vendo `/usuarios` como acesso restrito mesmo apos a regra de bootstrap admin.

Foram encontrados dois pontos principais:

1. `src/components/app-layout.tsx` continha marcadores de conflito Git (`<<<<<<<`, `=======`, `>>>>>>>`) misturando duas versoes da permissao.
2. `src/routes/_authenticated/usuarios.tsx` usa `RequireRole require="admin"`, entao o guard precisava consultar diretamente o `permissionLevel` final, que considera o bootstrap admin.

## Arquivos alterados

- `src/components/app-layout.tsx`
- `src/components/require-role.tsx`
- `RELATORIO_CORRECAO_ADMIN_BOOTSTRAP.md`

## Logica final

- `periclescep@gmail.com` e reconhecido como admin no cliente por `isBootstrapAdminEmail`.
- `getPermissionLevel([], "periclescep@gmail.com")` retorna `admin`, mesmo sem migration aplicada.
- `AuthProvider` expoe:
  - `permissionLevel = "admin"`;
  - `isAdmin = true`;
  - `canManage = true`.
- `RequireRole require="admin"` agora valida `permissionLevel === "admin"` diretamente.
- A sidebar usa `canAccessModule(permissionLevel, item.to)` e nao filtra totalmente os itens importantes.

## Garantias

- Signup publico continua desabilitado.
- `/usuarios` fica acessivel para admin.
- Sidebar mostra `Usuarios` e `Areas` como navegaveis para admin.
- Usuarios sem permissao continuam vendo itens bloqueados, em vez de menus desaparecerem.

## Como testar no Lovable

1. Entrar com `periclescep@gmail.com`.
2. Confirmar que a sidebar mostra `Usuarios` e `Areas` sem cadeado.
3. Abrir `/usuarios`.
4. Confirmar que a tela mostra a tabela e o botao `Novo Usuario`.
5. Confirmar que a aba `Cadastrar` de `/auth` continua sem formulario de signup publico.

## Observacao

Mesmo sem a migration de bootstrap aplicada, o cliente reconhece `periclescep@gmail.com` como admin. Para permissoes definitivas no banco e RLS, as migrations de bootstrap ainda devem ser aplicadas no Supabase/Lovable.

