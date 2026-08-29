# Implementacao - Minhas Acoes

## Arquivos alterados

- `src/routes/_authenticated/minhas-acoes.tsx`
- `src/components/app-layout.tsx`
- `src/lib/permissions.ts`

## Logica de consulta

A tela `/minhas-acoes` usa o usuario autenticado vindo de `useAuth()`.

Para montar a lista, a tela faz duas leituras:

1. Acoes em que o usuario logado e responsavel principal:
   - `acoes.responsavel_id = user.id`

2. Vinculos em que o usuario logado e apoiador:
   - `acoes_apoiadores.usuario_id = user.id`
   - depois busca as acoes correspondentes por `acao_id`

As duas listas sao combinadas em memoria. Se o usuario estiver na mesma acao como responsavel e apoiador, prevalece o papel `Responsavel`.

A consulta respeita a RLS existente. Nenhuma policy foi alterada.

## Regras da tela

A tela mostra apenas acoes relacionadas ao usuario logado como:

- `Responsavel`
- `Apoiador`

Cards de resumo exibidos:

- Total de minhas acoes.
- Em andamento.
- Atrasadas.
- Vencendo nos proximos 30 dias.
- Concluidas.

Filtros rapidos disponiveis:

- Todas.
- Sou responsavel.
- Sou apoiador.
- Atrasadas.
- Vencendo em breve.
- Concluidas.

Tabela exibida:

- Codigo.
- Titulo.
- Eixo.
- Programa.
- Area.
- Papel do usuario na acao.
- Status.
- Percentual.
- Prazo.

Cada titulo aponta para o detalhe existente da acao em `/plano-acao/$id`.

## Limites respeitados

- Nao foi alterada autenticacao.
- Nao foi alterada RLS.
- Nao foi alterado banco.
- Nao foi criada migration.
- Nao foram alteradas permissoes de edicao.
- Nao foi alterado o Dashboard geral.
- Nao foi alterado o Plano de Acao geral.

## Como testar com usuario responsavel

1. Acesse com um usuario ativo que tenha ao menos uma acao com `acoes.responsavel_id` igual ao seu `auth.uid()`.
2. Abra `/minhas-acoes`.
3. Confirme que a acao aparece na lista.
4. Confirme que a coluna `Papel` mostra `Responsavel`.
5. Clique no filtro `Sou responsavel`.
6. Confirme que a acao continua visivel.
7. Clique no titulo da acao e confirme que abre o detalhe existente.

## Como testar com usuario apoiador

1. Crie ou garanta um registro em `acoes_apoiadores` com:
   - `acao_id` de uma acao existente.
   - `usuario_id` igual ao `auth.uid()` do usuario apoiador.
2. Acesse com esse usuario ativo.
3. Abra `/minhas-acoes`.
4. Confirme que a acao aparece na lista.
5. Confirme que a coluna `Papel` mostra `Apoiador`.
6. Clique no filtro `Sou apoiador`.
7. Confirme que a acao continua visivel.
8. Use os filtros `Atrasadas`, `Vencendo em breve` e `Concluidas` conforme o status/prazo da acao para validar os cards e a filtragem.
