# Implementacao PGA Fase 1

Relatorio da Fase 1 da evolucao do SIGOV-SISPREV para aderencia ao Plano Anual de Gestao 2026.

## 1. Escopo implementado

A Fase 1 formaliza a estrutura superior do PGA sem substituir a tabela `acoes`, que continua sendo o nucleo operacional do sistema.

Foram implementados:

- Criacao da tabela `plano_anual`.
- Criacao da tabela `pga_eixos`.
- Criacao da tabela `pga_programas`.
- Adicao de vinculos opcionais em `acoes`.
- Seed inicial do Plano Anual de Gestao 2026.
- Seed dos tres eixos iniciais do PGA 2026.
- Seed dos tres programas iniciais do PGA 2026.
- Vinculacao das acoes existentes por correspondencia textual.

Nao foram alterados:

- Autenticacao.
- Evidencias.
- Kanban.
- Indicadores.
- Pro-Gestao.
- Layout.
- Funcionalidades atuais de Dashboard, Plano de Acao, Kanban ou Relatorios.

## 2. Tabelas criadas

### 2.1 `plano_anual`

Representa o ciclo anual formal de planejamento.

Campos principais:

- `id`.
- `ano`.
- `nome`.
- `descricao`.
- `data_inicio`.
- `data_fim`.
- `status`.
- `versao`.
- `data_aprovacao`.
- `responsavel_id`.
- `observacoes`.
- `created_at`.
- `updated_at`.

Restricoes:

- `ano` unico.
- `status` limitado a `rascunho`, `aprovado`, `em_execucao`, `revisado`, `encerrado`, `cancelado`.

### 2.2 `pga_eixos`

Representa os eixos estrategicos vinculados a um plano anual.

Campos principais:

- `id`.
- `plano_anual_id`.
- `codigo`.
- `nome`.
- `descricao`.
- `ordem`.
- `responsavel_id`.
- `status`.
- `created_at`.
- `updated_at`.

Restricoes:

- Codigo unico por plano.
- Nome unico por plano.

### 2.3 `pga_programas`

Representa os programas vinculados a um plano anual e a um eixo.

Campos principais:

- `id`.
- `plano_anual_id`.
- `eixo_id`.
- `codigo`.
- `nome`.
- `descricao`.
- `objetivo`.
- `ordem`.
- `area_responsavel_id`.
- `responsavel_id`.
- `status`.
- `created_at`.
- `updated_at`.

Restricoes:

- Codigo unico por plano.
- Nome unico por eixo.

## 3. Campos adicionados em `acoes`

Foram adicionados tres campos opcionais:

- `plano_anual_id`: referencia `plano_anual(id)`.
- `eixo_id`: referencia `pga_eixos(id)`.
- `programa_id`: referencia `pga_programas(id)`.

Esses campos sao opcionais para preservar compatibilidade com os dados atuais e evitar quebra de fluxos existentes.

## 4. Dados iniciais criados

### 4.1 Plano

- Ano: `2026`.
- Nome: `Plano Anual de Gestao 2026`.
- Status: `em_execucao`.
- Versao: `1.0`.

### 4.2 Eixos

- `E1`: Controles Internos.
- `E2`: Governanca Corporativa.
- `E3`: Educacao Previdenciaria.

### 4.3 Programas

- `P1`: Programa de Fortalecimento do Controle Interno.
- `P2`: Programa de Governanca, Integridade e Modernizacao Administrativa.
- `P3`: Programa de Educacao Previdenciaria.

## 5. Regras de compatibilidade

### 5.1 `acoes` continua sendo o nucleo operacional

O sistema continua usando `acoes` para Dashboard, Plano de Acao, Kanban, Evidencias, Notificacoes calculadas e Relatorios.

### 5.2 Campos antigos foram preservados

Os campos abaixo nao foram removidos nem alterados:

- `acoes.eixo_estrategico`.
- `acoes.programa`.

Eles continuam funcionando como fallback para consultas e telas existentes.

### 5.3 Novos campos sao vinculos complementares

Os novos campos `plano_anual_id`, `eixo_id` e `programa_id` adicionam normalizacao, mas nao substituem imediatamente os textos atuais.

### 5.4 Vinculacao das acoes existentes

A migration preenche os novos campos por correspondencia textual:

- `acoes.eixo_estrategico` -> `pga_eixos.nome`.
- `acoes.programa` -> `pga_programas.nome`.
- Todas as acoes correspondentes sao vinculadas ao Plano Anual 2026.

### 5.5 Fallback recomendado para etapas futuras

Ao evoluir telas futuramente, usar a regra:

- Se `eixo_id` existir, usar o eixo normalizado.
- Se `eixo_id` nao existir, usar `eixo_estrategico`.
- Se `programa_id` existir, usar o programa normalizado.
- Se `programa_id` nao existir, usar `programa`.

## 6. Arquivos alterados

- `supabase/migrations/20260606160000_pga_phase1.sql`
- `src/integrations/supabase/types.ts`
- `IMPLEMENTACAO_PGA_FASE1.md`

Arquivos de documentacao estrategica ja existentes permanecem como referencia:

- `ANALISE_ADERENCIA_PGA.md`
- `PROPOSTA_MODELAGEM_PGA.md`
- `PLANO_IMPLEMENTACAO_PGA.md`

## 7. Como testar no localhost

### 7.1 Aplicar banco local

Se estiver usando Supabase local:

```bash
supabase db reset
```

ou, se o ambiente local ja estiver iniciado e permitir aplicar migrations pendentes:

```bash
supabase migration up
```

### 7.2 Iniciar a aplicacao

```bash
npm run dev
```

### 7.3 Validacoes funcionais

No navegador, validar:

- Login continua funcionando.
- Dashboard carrega normalmente.
- Plano de Acao lista as acoes existentes.
- Filtros por eixo textual continuam funcionando.
- Kanban carrega as colunas e cards.
- Relatorios continuam exportando CSV.
- Evidencias continuam vinculadas as acoes.

### 7.4 Validacoes no banco

Consultas sugeridas:

```sql
select ano, nome, status from public.plano_anual where ano = 2026;
```

```sql
select codigo, nome from public.pga_eixos order by ordem;
```

```sql
select codigo, nome from public.pga_programas order by ordem;
```

```sql
select
  count(*) as total_acoes,
  count(plano_anual_id) as com_plano,
  count(eixo_id) as com_eixo,
  count(programa_id) as com_programa
from public.acoes;
```

```sql
select
  a.codigo,
  a.titulo,
  a.eixo_estrategico,
  e.nome as eixo_normalizado,
  a.programa,
  p.nome as programa_normalizado
from public.acoes a
left join public.pga_eixos e on e.id = a.eixo_id
left join public.pga_programas p on p.id = a.programa_id
order by a.codigo;
```

## 8. Como aplicar a migration no Supabase

### 8.1 Via CLI

Com o projeto Supabase vinculado:

```bash
supabase db push
```

### 8.2 Via SQL Editor

Alternativamente:

1. Abrir o projeto no painel Supabase.
2. Acessar SQL Editor.
3. Copiar o conteudo de `supabase/migrations/20260606160000_pga_phase1.sql`.
4. Executar o script.
5. Validar as consultas da secao 7.4.

## 9. Observacoes de seguranca e permissao

A migration adiciona RLS nas novas tabelas seguindo o padrao atual do sistema:

- Usuarios autenticados e ativos podem visualizar.
- Admin ou diretoria podem gerenciar.
- Service role possui acesso total.

Nenhuma policy existente de tabelas antigas foi removida ou alterada.

## 10. Observacao sobre auditoria

A migration atualiza `acoes` para preencher os novos vinculos. Como o sistema possui trigger de auditoria em `acoes`, essa atualizacao pode registrar eventos tecnicos de alteracao no historico, dependendo do estado do banco em que for aplicada.

Esse comportamento preserva rastreabilidade e evita desabilitar triggers existentes durante a migracao.

## 11. Resultado esperado

Apos a aplicacao:

- O PGA 2026 passa a existir como entidade formal.
- Eixos e programas passam a ter cadastros normalizados.
- Acoes existentes passam a se vincular ao PGA 2026.
- Campos antigos continuam disponiveis como fallback.
- Dashboard, Plano de Acao, Kanban e Relatorios continuam funcionando com a estrutura atual.
