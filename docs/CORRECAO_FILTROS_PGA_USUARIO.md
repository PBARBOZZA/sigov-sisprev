# Correção dos filtros PGA e experiência por usuário

## Arquivos alterados

- `src/routes/_authenticated/plano-acao/index.tsx`
- `src/lib/permissions.ts`

## Regra de fallback implementada

- Para eixo:
  - se `eixo_id` existir, a ação usa `pga_eixos.nome`;
  - se `eixo_id` não existir, a ação usa `acoes.eixo_estrategico`;
  - se nenhum valor existir, exibe `Sem eixo`.
- Para programa:
  - se `programa_id` existir, a ação usa `pga_programas.nome`;
  - se `programa_id` não existir, a ação usa `acoes.programa`;
  - se nenhum valor existir, exibe `Sem programa`.

## Regra de filtros

- Os filtros iniciam limpos por padrão usando `DEFAULT_FILTERS`.
- Parâmetros explícitos na URL continuam sendo aceitos por `validateSearch`.
- Com todos os filtros limpos, a tela mostra todas as ações retornadas pela RLS para o usuário logado.
- Filtros por eixo e programa aceitam:
  - ID normalizado vindo de `pga_eixos.id` ou `pga_programas.id`;
  - texto legado vindo de `acoes.eixo_estrategico` ou `acoes.programa`;
  - comparação textual normalizada, sem acentos e sem diferenciar maiúsculas/minúsculas.
- Quando o usuário escolhe um eixo/programa normalizado por ID, ações legadas com o mesmo nome textual também são consideradas.
- A consulta principal de ações usa `acoes.*` e não exige relacionamento obrigatório com `plano_anual`, `pga_eixos` ou `pga_programas`.
- Erros na consulta de ações são enviados ao console com prefixo `[PGA/Plano de Ação]` e exibidos na tela como erro de carregamento.
- A mensagem de resultado vazio foi alterada para:
  - "Nenhuma ação encontrada com os filtros atuais. Tente limpar os filtros ou escolher outro eixo/programa."

## Causa do bug

- A tela mascarava erro da consulta Supabase: quando a query retornava `error`, o código ignorava o erro e retornava `[]`.
- Na prática, qualquer problema no `select` com relacionamentos podia aparecer para o usuário como "0 ações filtradas", mesmo com filtros limpos e ações existentes.
- A correção removeu a dependência de embeds na consulta principal de `acoes`, mantendo a resolução dos nomes por meio das tabelas auxiliares já carregadas para filtros.

## Regra corrigida

- A listagem base vem sempre da tabela `acoes`, limitada apenas pela RLS do usuário logado.
- Vínculos normalizados são usados para exibição e filtro quando existem.
- Campos legados continuam sendo usados como fallback quando não há vínculo normalizado.
- Para usuário comum, filtros administrativos ocultos não são aplicados ao resultado efetivo.

## Regra de visibilidade por perfil

- Admin e gestores (`permissionLevel` `admin` ou `manage`) continuam vendo a tela PGA completa:
  - criação de ação;
  - filtros gerenciais;
  - cards de resumo.
- Usuário comum (`permissionLevel` `responsavel`) continua podendo acessar a URL do PGA, mas vê uma experiência simplificada:
  - chamada para priorizar `Minhas Ações`;
  - filtros reduzidos a busca, status e prazo;
  - sem cards gerenciais.
- No menu, `PGA / Plano de Ação` deixa de ser módulo permitido para usuário comum, priorizando `Minhas Ações`. A rota direta não foi bloqueada e continua limitada pela RLS.

## Como testar com admin

1. Entrar com usuário admin.
2. Acessar `/plano-acao`.
3. Confirmar que os filtros iniciam limpos sem query string e que ações permitidas aparecem na lista.
4. Filtrar por eixo/programa normalizado e verificar ações com `eixo_id`/`programa_id`.
5. Filtrar por eixo/programa legado e verificar ações preenchidas apenas em `eixo_estrategico`/`programa`.
6. Sair da tela e voltar para `/plano-acao` sem parâmetros; os filtros devem voltar limpos.
7. Acessar com URL explícita, por exemplo `/plano-acao?status=em_andamento`; o filtro da URL deve ser aplicado.

## Como testar com filtros limpos

1. Acessar `/plano-acao` sem query string.
2. Confirmar que todos os selects estão em `Todos`.
3. Confirmar que a quantidade exibida corresponde às ações retornadas pela RLS.
4. Confirmar que ações sem `plano_anual_id`, `eixo_id` ou `programa_id` continuam aparecendo.

## Como testar com filtro por eixo

1. Acessar `/plano-acao` como admin ou gestor.
2. Selecionar um eixo cadastrado em `pga_eixos`.
3. Confirmar que aparecem ações com `eixo_id` correspondente.
4. Confirmar que também aparecem ações legadas cujo `acoes.eixo_estrategico` tenha o mesmo nome.
5. Limpar filtros e confirmar que a lista volta a mostrar todas as ações permitidas.

## Como testar com usuário comum

1. Entrar com usuário de perfil comum.
2. Confirmar que o menu prioriza `Minhas Ações`.
3. Acessar diretamente `/plano-acao`.
4. Confirmar que a tela mostra apenas ações permitidas pela RLS.
5. Confirmar que aparecem apenas busca, status e prazo como filtros.
6. Confirmar que o atalho para `Minhas Ações` funciona.
7. Aplicar filtros sem resultados e verificar a nova mensagem.
8. Acessar `/plano-acao` sem filtros e confirmar que ações permitidas pela RLS não somem artificialmente.

## Riscos restantes

- A equivalência entre cadastro normalizado e legado depende de nomes consistentes entre `pga_eixos.nome`/`pga_programas.nome` e os textos antigos em `acoes`.
- Se existirem eixos ou programas diferentes com nomes idênticos, a comparação textual poderá incluir ações legadas de ambos.
- Usuário comum ainda consegue abrir `/plano-acao` por URL direta; isso é intencional e preserva a RLS como fonte de autorização dos dados.
