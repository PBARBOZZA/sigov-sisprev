# Implementação de vínculo de responsáveis e apoiadores

## Arquivos alterados

- `src/routes/_authenticated/plano-acao/$id.tsx`
- `src/lib/acoes.functions.ts`
- `src/lib/security-schemas.ts`

## Como funciona a vinculação de responsável

- A vinculação foi incorporada no detalhe da ação, em `/plano-acao/$id`.
- Admin e gestores veem o card `Vinculos de usuarios`.
- O campo `Responsavel real` lista usuários ativos da tabela `profiles`.
- Ao clicar em `Vincular`, o sistema chama a server function `vincularResponsavelAcao`.
- A função valida no server-side se o usuário logado é `admin` ou `diretoria`.
- A ação é atualizada com:
  - `acoes.responsavel_id` recebendo o `profiles.id` selecionado;
  - `acoes.responsavel_nome` recebendo o nome do usuário selecionado, mantendo o campo legado preenchido como fallback.
- Após salvar, são invalidadas as queries de detalhe, PGA, Dashboard e Minhas Ações.

## Como funciona a gestão de apoiadores

- No mesmo card administrativo, a seção `Apoiadores` lista os vínculos atuais da tabela `acoes_apoiadores`.
- O select `Adicionar apoiador` lista usuários ativos de `profiles` que ainda não estão vinculados como apoiadores e que não são o responsável atual.
- Ao adicionar, o sistema chama a server function `adicionarApoiadorAcao`.
- Ao remover, o sistema chama a server function `removerApoiadorAcao`.
- As server functions validam `admin` ou `diretoria` no server-side antes de inserir/remover registros.
- Após adicionar ou remover apoiador, são invalidadas as queries de apoiadores e Minhas Ações.

## Regras de permissão

- A interface de vínculo aparece apenas quando `canManage` é verdadeiro.
- `canManage` corresponde a `admin` ou `manage` no frontend.
- No server-side, as funções validam os papéis reais do usuário autenticado:
  - `admin`;
  - `diretoria`.
- Usuário comum não vê o card administrativo e não consegue executar as server functions sem permissão.
- Não houve alteração em autenticação, RLS ou migrations.

## Como testar com admin

1. Entrar como usuário administrador.
2. Abrir uma ação em `/plano-acao/$id`.
3. Confirmar que o card `Vinculos de usuarios` aparece.
4. Selecionar um usuário em `Responsavel real` e clicar em `Vincular`.
5. Confirmar mensagem de sucesso.
6. Recarregar o detalhe e conferir que o responsável real foi atualizado.
7. Abrir `Minhas Ações` com o usuário escolhido e confirmar que a ação aparece como responsável.

## Como testar com usuário responsável

1. Vincular uma ação a um usuário comum em `Responsavel real`.
2. Entrar como esse usuário.
3. Abrir `Minhas Ações`.
4. Confirmar que a ação aparece com papel `Responsável`.
5. Abrir a ação pelo link e confirmar que o card administrativo de vínculos não aparece.

## Como testar com apoiador

1. Entrar como admin ou gestor.
2. Abrir uma ação em `/plano-acao/$id`.
3. Adicionar um usuário na seção `Apoiadores`.
4. Entrar como o usuário apoiador.
5. Abrir `Minhas Ações`.
6. Confirmar que a ação aparece com papel `Apoiador`.
7. Remover o apoiador como admin/gestor e confirmar que a ação deixa de aparecer como apoiador após atualização.

## Riscos restantes

- A permissão final de escrita ainda depende das policies RLS existentes no Supabase. As server functions validam perfil, mas usam o cliente autenticado e respeitam a RLS atual.
- Se existirem duplicidades antigas em `acoes_apoiadores`, a remoção por `acao_id` e `usuario_id` remove todos os vínculos duplicados daquele usuário naquela ação.
- A vinculação em lote por nomes legados distintos (`PERICLES`, `RUTH`, etc.) não foi criada nesta etapa; a manutenção foi implementada por ação no detalhe para reduzir risco operacional.
- Usuários inativos não são listados e também são recusados pelas server functions.

## Correção da abertura do detalhe da ação

### Causa provável do erro 400

- A página de detalhe usava consultas com embeds do PostgREST, como relacionamento direto de `evidencias` para `profiles`.
- Pelos tipos atuais do Supabase, `evidencias` não possui relationship declarada para `profiles`, então o embed `usuario:profiles(nome)` podia gerar erro 400.
- Quando a ação principal falhava ou não preenchia `form`, o componente ficava em loading indefinido porque a condição `isLoading || !form` não tinha saída de erro amigável.

### Consultas corrigidas

- A consulta principal da ação passou a buscar somente `acoes.*` por `id`.
- Área e responsável são carregados em consulta auxiliar por `area_id` e `responsavel_id`, sem impedir a abertura da ação.
- Evidências são carregadas com `select("*")` em `evidencias`; os nomes dos usuários são buscados depois em `profiles` por `usuario_id`.
- Apoiadores continuam vindo de `acoes_apoiadores`, e os usuários são buscados depois em `profiles`.
- A ordenação de evidências por `created_at` passou a ser feita no cliente, evitando `order` frágil no PostgREST.
- Erros de consultas secundárias são logados no console com prefixo `[PGA/Detalhe]` e exibidos apenas na seção afetada.

### Como testar abertura de ação

1. Acessar `/plano-acao`.
2. Clicar no título/código de uma ação.
3. Confirmar que o detalhe abre e mostra os dados principais da ação.
4. Confirmar que não há spinner infinito.
5. Se alguma seção secundária falhar, confirmar que a ação principal continua visível.

### Como testar ação sem responsável_id

1. Abrir uma ação com `responsavel_id` nulo e `responsavel_nome` preenchido.
2. Confirmar que a página de detalhe abre.
3. Confirmar que o campo de responsável mostra o texto legado.
4. Como admin/gestor, selecionar um responsável real e clicar em `Vincular`.
5. Confirmar que a ação passa a aparecer em `Minhas Ações` do usuário escolhido.

### Como testar ação sem apoiadores

1. Abrir uma ação sem registros em `acoes_apoiadores`.
2. Confirmar que o card de vínculos mostra `Nenhum apoiador vinculado`.
3. Adicionar um apoiador como admin/gestor.
4. Confirmar que o apoiador aparece na lista.
5. Entrar como apoiador e confirmar que a ação aparece em `Minhas Ações` com papel `Apoiador`.
