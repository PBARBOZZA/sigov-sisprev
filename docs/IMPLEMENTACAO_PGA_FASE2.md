# Implementacao PGA Fase 2

Relatorio da Fase 2 da evolucao do SIGOV-SISPREV para tornar visivel e utilizavel a estrutura criada na Fase 1: Plano Anual, Eixos e Programas.

## 1. Escopo implementado

A Fase 2 integrou a estrutura normalizada do PGA nas telas operacionais, mantendo os campos legados como fallback.

Foram alterados:

- Tela de Plano de Acao.
- Dashboard Executivo.
- Relatorio CSV do Plano de Acao.

Nao foram alterados:

- Autenticacao.
- Permissoes.
- Evidencias.
- Pro-Gestao.
- Indicadores.
- Kanban.
- Usuarios.
- Banco de dados.
- Migrations.

## 2. Arquivos alterados

- `src/routes/_authenticated/plano-acao/index.tsx`
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/relatorios.tsx`
- `IMPLEMENTACAO_PGA_FASE2.md`

## 3. Filtros criados no Plano de Acao

### 3.1 Plano Anual

Foi adicionado filtro por Plano Anual usando a tabela `plano_anual`.

O filtro usa:

- `acoes.plano_anual_id`
- `plano_anual.id`
- `plano_anual.nome`
- `plano_anual.ano`

### 3.2 Eixo

Foi adicionado filtro por Eixo usando a estrutura normalizada e fallback textual.

Regra:

- Se existir `acoes.eixo_id`, o nome vem de `pga_eixos.nome`.
- Se nao existir `acoes.eixo_id`, o filtro usa `acoes.eixo_estrategico`.

### 3.3 Programa

Foi adicionado filtro por Programa usando a estrutura normalizada e fallback textual.

Regra:

- Se existir `acoes.programa_id`, o nome vem de `pga_programas.nome`.
- Se nao existir `acoes.programa_id`, o filtro usa `acoes.programa`.

### 3.4 Prazo

Foi adicionado filtro operacional de prazo:

- Todos prazos.
- Atrasadas.
- Vencem em 30 dias.
- Sem prazo.

### 3.5 Filtros preservados

Foram preservados os filtros ja existentes:

- Busca textual.
- Status.
- Area.
- Responsavel.

## 4. Alteracoes na listagem de acoes

A listagem do Plano de Acao passou a exibir uma coluna propria para:

- Plano Anual.
- Eixo.
- Programa.

Foram mantidos:

- Codigo.
- Titulo.
- Area.
- Responsavel.
- Prazo.
- Percentual.
- Status.
- Descricao abaixo do titulo.

## 5. Regras de compatibilidade

A compatibilidade com o modelo antigo foi preservada.

### 5.1 Eixo

Uso preferencial:

```text
acoes.eixo_id -> pga_eixos.nome
```

Fallback:

```text
acoes.eixo_estrategico
```

### 5.2 Programa

Uso preferencial:

```text
acoes.programa_id -> pga_programas.nome
```

Fallback:

```text
acoes.programa
```

### 5.3 Plano Anual

Uso:

```text
acoes.plano_anual_id -> plano_anual.nome
```

Se a acao ainda nao estiver vinculada a um plano, a tela exibe `Sem plano`.

## 6. Alteracoes no Dashboard

O Dashboard manteve os cards e graficos atuais:

- Total de acoes.
- Nao iniciadas.
- Em andamento.
- Concluidas.
- Atrasadas.
- Vencendo em 30 dias.
- Percentual geral de execucao.
- Acoes por status.
- Acoes por area.
- Ranking de responsaveis.
- Acoes proximas do vencimento.
- Ultimas acoes atualizadas.

Foram adicionadas duas secoes simples:

### 6.1 Execucao por Eixo

Exibe, para cada eixo:

- Nome do eixo.
- Quantidade de acoes concluidas.
- Total de acoes.
- Percentual medio de execucao.
- Barra de progresso.

Usa `pga_eixos.nome` quando disponivel e `acoes.eixo_estrategico` como fallback.

### 6.2 Acoes por Programa

Exibe, para cada programa:

- Nome do programa.
- Total de acoes.
- Quantidade de acoes concluidas.

Usa `pga_programas.nome` quando disponivel e `acoes.programa` como fallback.

## 7. Alteracoes no Relatorio CSV

A exportacao CSV do Plano de Acao completo foi ajustada para incluir:

- Plano Anual.
- Eixo.
- Programa.

Campos atuais preservados:

- Codigo.
- Titulo.
- Area.
- Responsavel.
- Status.
- Prioridade.
- Percentual de execucao.
- Prazo final.

Tambem foi preservado o fallback de responsavel:

```text
responsavel.nome -> responsavel_nome
```

## 8. Como testar no localhost

### 8.1 Pre-requisito

Aplicar a migration da Fase 1 antes de testar a Fase 2.

Exemplo:

```bash
supabase db push
```

ou, em ambiente local:

```bash
supabase migration up
```

### 8.2 Iniciar o projeto

```bash
npm run dev
```

Se o PowerShell bloquear `npm.ps1`, usar:

```bash
npm.cmd run dev
```

### 8.3 Validar Plano de Acao

Abrir:

```text
http://localhost:3000/plano-acao
```

Validar:

- Filtro por Plano Anual aparece.
- Filtro por Eixo aparece.
- Filtro por Programa aparece.
- Filtro por Prazo aparece.
- Filtros de Status, Area e Responsavel continuam funcionando.
- A listagem mostra Plano, Eixo e Programa.
- Acoes sem vinculo normalizado continuam exibindo eixo/programa legados.

### 8.4 Validar Dashboard

Abrir:

```text
http://localhost:3000/dashboard
```

Validar:

- Cards atuais continuam carregando.
- Secao `Execucao por Eixo` aparece.
- Secao `Acoes por Programa` aparece.
- Dados antigos continuam aparecendo por fallback quando necessario.

### 8.5 Validar Relatorios

Abrir:

```text
http://localhost:3000/relatorios
```

Validar:

- Exportacao CSV continua funcionando.
- CSV contem colunas Plano Anual, Eixo e Programa.
- Campos antigos do relatorio continuam presentes.

### 8.6 Validar telas nao alteradas

Abrir e verificar carregamento basico:

- `/kanban`
- `/usuarios`
- `/evidencias`
- `/progestao`
- `/indicadores`

## 9. Validacao tecnica realizada

Executar:

```bash
npm.cmd run build
```

Resultado esperado:

- Build client concluido.
- Build SSR concluido.
- Sem erros TypeScript ou Vite relacionados a Fase 2.

## 10. Observacoes

A Fase 2 nao cria tabelas nem altera permissoes. Ela apenas consome a estrutura criada na Fase 1.

O sistema continua preparado para funcionar com registros parcialmente migrados, porque os campos legados `eixo_estrategico` e `programa` permanecem como fallback.
