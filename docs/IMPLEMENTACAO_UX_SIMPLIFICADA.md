# Implementacao UX Simplificada - SIGOV-SISPREV

## Objetivo

Simplificar a experiencia visual do SIGOV-SISPREV com foco em navegacao objetiva, leitura rapida do Dashboard e filtros mais claros no PGA / Plano de Acao.

## Escopo preservado

- Nenhuma alteracao de banco de dados.
- Nenhuma migration criada ou modificada.
- Nenhuma alteracao em autenticacao.
- Nenhuma alteracao em permissoes ou regras de acesso.
- Nenhuma funcionalidade removida.
- Mudancas restritas a organizacao visual, hierarquia de informacao e clareza dos controles.

## Arquivos alterados

- `src/components/app-layout.tsx`
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/plano-acao/index.tsx`

## Navegacao lateral

A navegacao foi reorganizada em dois grupos:

- Principal: Dashboard, PGA / Plano de Acao, Kanban, Evidencias, Relatorios, Usuarios e Areas.
- Gestao e apoio: Pro-Gestao RPPS e Indicadores.

Os itens futuros continuam visiveis na area "Em breve", mas com menor prioridade visual. A validacao de acesso por modulo continua usando `canAccessModule`, preservando o comportamento atual de permissoes.

## Dashboard

O topo do Dashboard foi simplificado para leitura executiva:

- Total de acoes.
- Acoes em andamento.
- Acoes concluidas.
- Acoes atrasadas.
- Acoes vencendo em 30 dias.
- Acoes nao iniciadas.

Tambem foi adicionada uma area de resumo da execucao geral com percentuais de concluidas, em aberto e itens de atencao. Os graficos e listas existentes foram mantidos como apoio analitico.

## PGA / Plano de Acao

A tela ganhou uma area de filtros mais visivel, com rotulos, busca destacada e botao para limpar filtros. Abaixo dos filtros, foram adicionados cards de resumo baseados no resultado filtrado:

- Acoes filtradas.
- Em andamento.
- Concluidas.
- Atrasadas.

A tabela, a criacao de acoes e a navegacao para detalhes foram preservadas.

## Identidade visual

As mudancas reaproveitam a paleta institucional ja definida em `src/styles.css`, mantendo o verde do SISPREV, a sidebar escura e os tons de status ja existentes no sistema.

## Observacoes tecnicas

Todas as novas metricas sao derivadas em memoria a partir dos dados ja consultados pelas telas. Nao foram adicionadas consultas novas obrigatorias, schemas, tabelas ou campos.
