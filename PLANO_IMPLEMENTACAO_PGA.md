# Plano de Implementacao Segura do PGA

Plano estrategico para evoluir o SIGOV-SISPREV rumo a uma gestao completa do Plano Anual de Gestao 2026, sem quebrar o sistema atual e sem substituir de forma abrupta os modulos existentes.

## 1. Diretriz principal

A implementacao do PGA deve ser incremental. O sistema atual ja possui um nucleo funcional baseado em `acoes`, usado por Plano de Acao, Dashboard, Kanban, Evidencias, Notificacoes calculadas e Relatorios.

Por isso, a regra central e:

Preservar o funcionamento atual, adicionar estrutura conceitual por camadas e migrar consultas gradualmente.

Nao e recomendavel remodelar tudo de uma vez.

## 2. Ordem segura de implementacao

### Fase 0 - Consolidacao antes de novas estruturas

Objetivo: garantir que a base atual esteja confiavel antes de expandir.

Prioridade: critica.

Atividades recomendadas:

- Confirmar que o PGA 2026 cadastrado em `acoes` esta correto.
- Revisar codigos oficiais das acoes.
- Validar eixos, programas, areas e responsaveis.
- Corrigir eventuais textos com codificacao quebrada antes de producao.
- Confirmar que Dashboard, Plano de Acao, Kanban, Evidencias e Relatorios continuam funcionando.
- Revisar pontos pendentes do roadmap de seguranca, validacao e historico.

Resultado esperado:

- Base atual estavel.
- Dados do PGA 2026 confiaveis.
- Menor risco para criar novas camadas.

### Fase 1 - Formalizar Plano Anual, Eixos e Programas

Objetivo: criar a estrutura conceitual superior sem alterar a experiencia atual.

Prioridade: alta.

Atividades recomendadas:

- Criar entidade de Plano Anual.
- Criar entidade de Eixos.
- Criar entidade de Programas.
- Mapear os valores atuais de `acoes.eixo_estrategico` para Eixos.
- Mapear os valores atuais de `acoes.programa` para Programas.
- Vincular acoes existentes ao Plano Anual 2026, Eixo e Programa.
- Manter os campos textuais atuais durante a transicao.

Cuidados:

- Nao remover `eixo_estrategico` nem `programa` no primeiro momento.
- Nao alterar Dashboard e Kanban na mesma etapa.
- Criar views ou adaptadores se necessario para preservar consultas atuais.

Resultado esperado:

- O PGA 2026 passa a existir como entidade formal.
- Eixos e programas passam a ter cadastro consistente.
- O sistema atual continua funcionando.

### Fase 2 - Ajustar consultas e relatorios para usar a nova estrutura

Objetivo: fazer o sistema ler a estrutura normalizada de forma gradual.

Prioridade: alta.

Atividades recomendadas:

- Atualizar filtros do Plano de Acao para considerar Eixos e Programas normalizados.
- Atualizar Dashboard para permitir filtro por Plano Anual.
- Atualizar exportacao CSV para incluir Plano, Eixo e Programa.
- Criar relatorio de execucao por Eixo.
- Criar relatorio de execucao por Programa.
- Validar comparacao entre resultado antigo e novo.

Cuidados:

- Comparar os totais antes e depois.
- Garantir que nenhuma acao fique sem plano, eixo ou programa.
- Manter fallback para campos textuais enquanto houver dados legados.

Resultado esperado:

- Relatorios mais confiaveis.
- Filtros consistentes.
- Base preparada para multiplos anos.

### Fase 3 - Criar Entregas ou Marcos

Objetivo: detalhar a execucao das acoes sem quebrar a logica atual de status da acao.

Prioridade: media/alta.

Atividades recomendadas:

- Criar estrutura de entregas vinculadas a acoes.
- Definir tipos de entrega: marco, produto, competencia mensal, competencia trimestral, evento, relatorio.
- Permitir que uma acao tenha zero ou varias entregas.
- Calcular percentual da acao a partir das entregas apenas quando a regra estiver madura.
- Inicialmente, manter percentual e status da acao editaveis como hoje.

Cuidados:

- Nao obrigar todas as acoes a terem entregas no inicio.
- Nao mudar automaticamente status da acao sem regra validada.
- Comecar por acoes recorrentes ou compostas.

Exemplos prioritarios:

- Auditorias internas trimestrais.
- Acompanhamento mensal de rentabilidade.
- Conferencias mensais.
- Capacitacoes com eventos ou turmas.
- Publicacoes periodicas.

Resultado esperado:

- Melhor acompanhamento de acoes complexas.
- Evidencias passam a poder comprovar etapas, nao apenas a acao inteira.

### Fase 4 - Evoluir Evidencias

Objetivo: ampliar o uso de evidencias para entregas, indicadores, Pro-Gestao e relatorios.

Prioridade: media.

Atividades recomendadas:

- Manter evidencias por acao.
- Criar vinculo de evidencia com entrega.
- Criar classificacao de tipo de evidencia.
- Criar status de validacao da evidencia.
- Criar fluxo de validacao por perfil autorizado.
- Avaliar modelo flexivel de vinculos para evitar excesso de colunas opcionais.

Cuidados:

- Preservar os arquivos ja existentes no storage.
- Preservar metadados atuais.
- Evitar mover arquivos sem necessidade.
- Garantir que downloads existentes continuem funcionando.

Resultado esperado:

- Evidencias mais auditaveis.
- Melhor aderencia a controle interno, Pro-Gestao e prestacao de contas.

### Fase 5 - Evoluir Indicadores

Objetivo: transformar indicadores em monitoramento de desempenho com historico.

Prioridade: media/alta.

Atividades recomendadas:

- Manter `indicadores` como cadastro mestre.
- Criar medicoes historicas por competencia.
- Vincular indicadores a plano, eixo, programa ou acao.
- Registrar meta, resultado, situacao e memoria de calculo.
- Criar graficos por periodo.
- Criar relatorio de indicadores fora da meta.

Cuidados:

- Nao substituir `resultado_atual` imediatamente.
- Inicialmente, atualizar `resultado_atual` a partir da ultima medicao ou manter ambos sincronizados.
- Definir regra clara para indicadores com meta crescente, decrescente ou percentual.

Resultado esperado:

- Indicadores deixam de ser apenas cadastro estatico.
- PGA passa a ter monitoramento quantitativo por periodo.

### Fase 6 - Integrar Pro-Gestao ao PGA

Objetivo: conectar certificacao institucional, evidencias e acoes do PGA.

Prioridade: media.

Atividades recomendadas:

- Completar CRUD de requisitos Pro-Gestao.
- Criar vinculo entre requisitos Pro-Gestao e acoes.
- Criar relatorio de aderencia por dimensao.
- Vincular evidencias reais aos requisitos.
- Indicar quais acoes do PGA contribuem para cada requisito.

Cuidados:

- Nao misturar requisito Pro-Gestao com acao do PGA como se fossem a mesma entidade.
- Manter requisitos como modulo proprio de conformidade.
- Usar vinculos para demonstrar contribuicao e evidencia.

Resultado esperado:

- Pro-Gestao passa a ser rastreavel por acoes e evidencias.
- Melhor suporte a auditoria e certificacao.

### Fase 7 - Relatorios oficiais e prestacao de contas

Objetivo: consolidar informacoes do PGA em saidas formais.

Prioridade: media.

Relatorios recomendados:

- Execucao geral do Plano Anual.
- Execucao por Eixo.
- Execucao por Programa.
- Execucao por Area.
- Execucao por Responsavel.
- Acoes atrasadas.
- Acoes concluidas.
- Acoes sem evidencia.
- Entregas pendentes.
- Indicadores fora da meta.
- Conformidade Pro-Gestao.
- Relatorio executivo trimestral.
- Relatorio anual de encerramento.

Cuidados:

- Comecar com CSV e telas consolidadas.
- Evoluir para PDF ou documentos oficiais apenas apos validar dados.
- Registrar parametros de geracao dos relatorios.

Resultado esperado:

- Sistema apto a apoiar reunioes de diretoria, conselhos, controle interno e prestacao de contas.

## 3. O que fazer primeiro

### 3.1 Validar a base do PGA 2026 em `acoes`

Antes de criar novas tabelas, confirmar que os dados atuais estao corretos.

Checklist:

- Codigos oficiais revisados.
- Titulos revisados.
- Eixos revisados.
- Programas revisados.
- Areas revisadas.
- Responsaveis revisados.
- Prazos revisados.
- Periodicidades revisadas.
- Status inicial coerente.

### 3.2 Definir a estrutura oficial de Eixos e Programas

O sistema precisa saber se a organizacao oficial sera:

```text
Plano Anual -> Eixo -> Programa -> Acao
```

ou se havera programas compartilhados entre eixos. A recomendacao e usar programa vinculado a eixo e plano anual.

### 3.3 Criar um Plano Anual 2026 formal

O primeiro ganho estrutural e ter o PGA 2026 como entidade principal.

Isso permite:

- Filtrar tudo por ano.
- Preparar PGA 2027 sem misturar dados.
- Gerar relatorios oficiais.
- Controlar encerramento do ciclo.

### 3.4 Mapear dados atuais para a nova estrutura

Antes de qualquer alteracao funcional, montar uma matriz de equivalencia:

- Valor atual de `eixo_estrategico` -> registro em `pga_eixos`.
- Valor atual de `programa` -> registro em `pga_programas`.
- Cada `acao` -> Plano Anual 2026, Eixo e Programa.

### 3.5 Proteger compatibilidade

No primeiro ciclo, manter o sistema lendo e exibindo como hoje, apenas adicionando os vinculos novos.

## 4. O que deixar para depois

### 4.1 Remover campos legados

Nao remover de imediato:

- `acoes.eixo_estrategico`.
- `acoes.programa`.

Esses campos devem permanecer ate que todos os modulos estejam usando a estrutura normalizada.

### 4.2 Automatizar percentual por entregas

Calcular automaticamente o percentual da acao com base em entregas deve vir depois que a regra de pesos e conclusao estiver validada.

No inicio:

- A acao continua com percentual proprio.
- Entregas apenas detalham execucao.

### 4.3 Relatorios complexos em PDF

Relatorios oficiais em PDF ou documentos formatados devem vir depois da validacao dos dados e filtros.

Primeiro:

- CSV.
- Relatorios em tela.
- Conferencia de totais.

Depois:

- PDF.
- Relatorio anual.
- Publicacao formal.

### 4.4 Workflow completo de aprovacao

Fluxos de aprovacao, revisao, validacao de evidencias e encerramento formal devem vir em etapa posterior.

Motivo:

- Envolvem permissoes.
- Exigem RLS e auditoria mais complexas.
- Podem bloquear usuarios se forem implementados cedo demais.

### 4.5 Integracoes externas

Integracoes com email, TCE, Ministerio Publico, portais ou outros sistemas devem ficar para depois da consolidacao da base.

## 5. Como evitar quebrar o sistema atual

### 5.1 Manter `acoes` como fonte operacional no curto prazo

Nao substituir a tabela central de uma vez. Ela ja alimenta modulos importantes.

### 5.2 Usar migracao por acrescimo

Adicionar novas estruturas sem remover as antigas.

Exemplo de caminho seguro:

1. Criar tabelas novas.
2. Popular tabelas novas.
3. Adicionar chaves em `acoes`.
4. Preencher chaves em `acoes`.
5. Atualizar telas gradualmente.
6. Validar relatorios.
7. Somente depois considerar depreciar campos antigos.

### 5.3 Manter fallbacks nos modulos

Enquanto houver transicao:

- Se `eixo_id` existir, exibir nome do eixo normalizado.
- Se nao existir, exibir `eixo_estrategico`.
- Se `programa_id` existir, exibir nome do programa normalizado.
- Se nao existir, exibir `programa`.

### 5.4 Nao alterar todos os modulos na mesma entrega

Sequencia recomendada:

1. Plano de Acao.
2. Relatorios.
3. Dashboard.
4. Kanban.
5. Evidencias.
6. Indicadores.
7. Pro-Gestao.
8. Notificacoes.

### 5.5 Usar views ou consultas de compatibilidade

Se a normalizacao mudar a forma de buscar dados, criar uma camada de compatibilidade para continuar entregando os mesmos campos esperados pelos modulos atuais.

### 5.6 Validar totais apos cada etapa

Depois de cada mudanca, conferir:

- Total de acoes.
- Total por status.
- Total por eixo.
- Total por programa.
- Total por area.
- Total por responsavel.
- Total de evidencias.

Esses numeros devem bater com a base anterior.

### 5.7 Preservar historico e evidencias

Nunca recriar acoes sem preservar seus IDs se ja houver historico ou evidencia vinculada.

Se for necessaria alguma migracao futura:

- Preservar `acoes.id`.
- Preservar `evidencias.acao_id`.
- Preservar `historico_acoes.acao_id`.
- Preservar referencias em notificacoes e relatorios.

### 5.8 Separar modelagem de permissao

Novas tabelas exigirao novas policies e validacoes. A implementacao deve prever:

- Quem visualiza.
- Quem cria.
- Quem edita.
- Quem aprova.
- Quem valida.
- Quem publica relatorios.

Nao criar novas entidades sem definir governanca de acesso.

### 5.9 Homologar com dados reais do PGA 2026

Usar o proprio PGA 2026 como base de homologacao:

- Escolher um eixo.
- Escolher um programa.
- Escolher algumas acoes recorrentes.
- Testar entregas.
- Testar evidencias.
- Testar relatorios.

So depois expandir para todas as acoes.

## 6. Backlog recomendado por ondas

### Onda 1 - Baixo risco e alto valor

- Validar cadastro atual do PGA 2026.
- Formalizar Plano Anual.
- Formalizar Eixos.
- Formalizar Programas.
- Vincular acoes existentes.
- Criar relatorio por eixo e programa.

### Onda 2 - Detalhamento de execucao

- Criar entregas.
- Aplicar entregas em acoes recorrentes.
- Vincular evidencias a entregas.
- Melhorar relatorios de pendencias.

### Onda 3 - Indicadores e desempenho

- Criar medicoes historicas.
- Vincular indicadores ao PGA.
- Criar graficos por competencia.
- Criar relatorios de meta.

### Onda 4 - Pro-Gestao e conformidade

- Completar CRUD Pro-Gestao.
- Vincular requisitos a acoes.
- Vincular evidencias a requisitos.
- Criar relatorio de conformidade.

### Onda 5 - Relatorios oficiais e automacoes

- Criar relatorios consolidados.
- Registrar relatorios gerados.
- Persistir notificacoes.
- Registrar historico de alertas.
- Avaliar envio por email.

## 7. Criterios de sucesso

A implementacao sera considerada segura se:

- O Plano de Acao atual continuar funcionando.
- Nenhuma evidencia existente for perdida.
- Dashboard e Kanban continuarem refletindo as acoes.
- Relatorios atuais continuarem exportando dados.
- Cada acao do PGA 2026 estiver vinculada a um Plano Anual.
- Cada acao estiver vinculada a Eixo e Programa consistentes.
- A evolucao permitir PGA 2027 sem duplicar logica.
- O sistema ganhar relatorios por plano, eixo e programa.
- Usuarios nao precisarem reaprender todo o sistema de uma vez.

## 8. Riscos e mitigacoes

### Risco: duplicidade de eixos e programas

Mitigacao:

- Criar cadastro normalizado.
- Usar unicidade por plano e nome/codigo.
- Revisar grafia antes de vincular acoes.

### Risco: quebra do dashboard

Mitigacao:

- Manter campos atuais.
- Atualizar dashboard somente apos validar consultas.
- Criar fallback de leitura.

### Risco: perda de evidencias

Mitigacao:

- Nao recriar acoes.
- Manter IDs.
- Criar novos vinculos sem mover arquivos.

### Risco: excesso de complexidade para usuario

Mitigacao:

- Introduzir primeiro Plano, Eixo e Programa.
- Deixar Entregas e Indicadores historicos para etapas posteriores.
- Manter telas conhecidas.

### Risco: permissao incompleta em novas tabelas

Mitigacao:

- Definir matriz de acesso antes da implementacao.
- Criar RLS junto com cada nova entidade.
- Testar perfis admin, diretoria, responsavel e conselheiro.

### Risco: mudanca grande demais para homologar

Mitigacao:

- Implementar por ondas.
- Homologar uma area ou eixo antes de expandir.
- Conferir totais apos cada entrega.

## 9. Sequencia recomendada resumida

1. Validar dados atuais do PGA 2026.
2. Criar Plano Anual como entidade formal.
3. Criar Eixos e Programas normalizados.
4. Vincular `acoes` ao Plano, Eixo e Programa.
5. Manter campos antigos como fallback.
6. Atualizar relatorios e filtros.
7. Criar Entregas para acoes compostas.
8. Evoluir Evidencias para vinculos mais precisos.
9. Criar medicoes historicas de Indicadores.
10. Integrar Pro-Gestao com Acoes e Evidencias.
11. Criar relatorios oficiais e notificacoes persistidas.

## 10. Conclusao

O caminho mais seguro para implementar o PGA no SIGOV-SISPREV e preservar o que ja esta funcionando e adicionar uma camada formal de planejamento anual. A tabela `acoes` deve continuar sendo a base operacional no curto prazo, enquanto Plano Anual, Eixos e Programas organizam a governanca.

Depois disso, Entregas, Evidencias ampliadas, Indicadores historicos, Pro-Gestao integrado e Relatorios oficiais podem ser implementados com menor risco. Essa sequencia protege o sistema atual, reduz regressao e transforma gradualmente o SIGOV-SISPREV em uma plataforma robusta de monitoramento institucional do RPPS.
