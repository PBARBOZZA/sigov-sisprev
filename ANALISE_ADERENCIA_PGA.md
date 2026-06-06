# Analise de Aderencia ao PGA 2026

Analise estrategica do projeto SIGOV-SISPREV em relacao ao Plano Anual de Gestao 2026, considerando o roadmap existente, a documentacao do projeto, as migrations atuais e a logica ja implementada nos modulos de Plano de Acao, Dashboard, Kanban, Evidencias, Pro-Gestao, Indicadores, Notificacoes e Relatorios.

## 1. Sintese executiva

O SIGOV-SISPREV ja possui uma base relevante para monitoramento do PGA 2026. A tabela `acoes` funciona hoje como o nucleo operacional do Plano de Gestao Anual, com campos que representam codigo, titulo, eixo estrategico, programa, area responsavel, responsavel nominal ou cadastrado, datas, status, prioridade, percentual de execucao, periodicidade e observacoes.

O sistema tambem ja entrega mecanismos importantes para governanca institucional:

- Dashboard executivo com indicadores consolidados de execucao.
- Plano de acao com listagem, filtros, cadastro e detalhe de acoes.
- Kanban por status.
- Evidencias vinculadas a acoes.
- Areas e usuarios para responsabilizacao institucional.
- Relatorio CSV do plano completo.
- Estruturas preparadas para Pro-Gestao RPPS, indicadores, notificacoes e historicos.

Apesar disso, o modelo atual ainda trata o PGA como uma lista de acoes enriquecida, e nao como uma estrutura formal composta por Plano Anual, Eixos, Programas, Acoes, Entregas, Evidencias, Indicadores e Relatorios. Para aderir plenamente ao PGA 2026, recomenda-se evoluir por camadas, reaproveitando o que ja existe, e nao substituir a estrutura atual de uma vez.

## 2. O que o sistema atual ja atende

### 2.1 Controle operacional das acoes do PGA

O sistema ja permite acompanhar as acoes institucionais do PGA por meio da tabela `acoes` e das telas de Plano de Acao, Dashboard e Kanban.

Pontos atendidos:

- Identificacao por codigo, como `A1-T1`, `A2-T1`, `A10-T5`.
- Titulo da acao.
- Eixo estrategico.
- Programa associado.
- Area responsavel.
- Responsavel cadastrado ou responsavel em texto livre.
- Datas de inicio e prazo final.
- Status de acompanhamento.
- Prioridade.
- Percentual de execucao.
- Periodicidade.
- Observacoes.

Essa estrutura cobre boa parte da necessidade basica de monitoramento do PGA 2026: saber o que deve ser feito, por quem, ate quando e em qual situacao.

### 2.2 Eixos e programas ja representados em campos da acao

A seed do Plano de Metas Institucionais 2026 ja organiza as acoes em eixos e programas, como:

- Controles Internos.
- Governanca Corporativa.
- Educacao Previdenciaria.
- Programa de Fortalecimento do Controle Interno.
- Programa de Governanca, Integridade e Modernizacao Administrativa.
- Programa de Educacao Previdenciaria.

No modelo atual, esses elementos aparecem como texto em `acoes.eixo_estrategico` e `acoes.programa`. Isso atende ao uso inicial, embora ainda nao tenha normalizacao propria.

### 2.3 Monitoramento executivo

O Dashboard ja calcula:

- Total de acoes.
- Acoes nao iniciadas.
- Acoes em andamento.
- Acoes concluidas.
- Acoes atrasadas.
- Acoes vencendo em 30 dias.
- Percentual geral de execucao.
- Distribuicao por status.
- Distribuicao por area.
- Ranking de responsaveis por carga de acoes.

Esses elementos sao aderentes ao papel de painel gerencial do PGA.

### 2.4 Evidencias vinculadas as acoes

A tabela `evidencias` e o bucket de storage permitem anexar documentos comprobatorios as acoes. Isso atende um requisito central de governanca, auditoria, Pro-Gestao e controle institucional: cada evolucao deve poder ser demonstrada por documentos, registros ou arquivos.

### 2.5 Responsabilizacao institucional

O sistema ja possui:

- `areas`, para setores institucionais.
- `profiles`, para usuarios/responsaveis.
- `user_roles`, para papeis de acesso.
- `acoes_apoiadores`, tabela ja criada para apoiadores das acoes.

Isso permite evoluir o PGA com uma matriz de responsabilidades sem recriar a base de usuarios e setores.

### 2.6 Historico e alertas como estruturas preparadas

As tabelas `historico_acoes`, `notificacoes` e `historico_alertas` ja existem. O roadmap tambem registra evolucao recente para auditoria automatica de alteracoes em acoes e validacoes server-side.

Essas estruturas sao aderentes ao PGA, pois permitem:

- Rastrear alteracoes.
- Gerar alertas por prazo.
- Registrar envio de notificacoes.
- Auditar evolucao de responsabilidades e entregas.

## 3. O que atende parcialmente

### 3.1 Plano Anual como entidade formal

Hoje o PGA 2026 esta representado implicitamente pelas acoes cadastradas. Falta uma entidade formal de Plano Anual contendo:

- Ano de referencia.
- Nome oficial.
- Versao.
- Situacao do plano.
- Periodo de vigencia.
- Ato ou documento de aprovacao.
- Responsavel institucional.
- Data de aprovacao.
- Observacoes gerais.

Sem essa entidade, o sistema pode acompanhar o PGA 2026, mas tera dificuldade para comparar ciclos anuais, arquivar versoes, publicar relatorios oficiais e controlar revisoes.

### 3.2 Eixos e programas

Eixos e programas existem como campos textuais em `acoes`, mas ainda nao como cadastros proprios. Isso atende filtros e exibicao, mas limita governanca.

Limitacoes atuais:

- Risco de duplicidade por grafia diferente.
- Falta de ordem de apresentacao.
- Falta de metas ou descricoes por eixo.
- Falta de vinculo formal entre Plano Anual, Eixo e Programa.
- Dificuldade para gerar relatorios oficiais por estrutura hierarquica.

### 3.3 Acoes versus entregas

O PGA 2026 possui acoes que, em varios casos, representam atividades recorrentes ou metas compostas. No sistema atual, cada acao e acompanhada diretamente por percentual, status e prazo.

Isso atende a gestao simplificada, mas atende parcialmente quando uma acao precisa de varias entregas, por exemplo:

- Auditorias trimestrais.
- Indicadores mensais.
- Capacitacoes em etapas.
- Publicacoes periodicas.
- Acompanhamento de metas de investimento.
- Evidencias sucessivas ao longo do ano.

Falta uma camada de `entregas` ou `marcos` para detalhar etapas intermediarias de uma acao.

### 3.4 Evidencias

O sistema ja registra evidencias por acao, mas ainda nao distingue formalmente:

- Evidencia de acao.
- Evidencia de entrega.
- Evidencia de indicador.
- Evidencia de requisito Pro-Gestao.
- Evidencia de relatorio institucional.

Tambem falta classificar evidencia por tipo, competencia, validade, origem e status de verificacao.

### 3.5 Indicadores

A tabela `indicadores` existe e a tela esta preparada, mas o modulo ainda e limitado. Atualmente ha cadastro estrutural de indicador, meta e resultado atual, mas nao ha historico de medicoes.

Para aderencia plena ao PGA, indicadores precisam ter:

- Vinculo com plano, eixo, programa ou acao.
- Periodicidade.
- Serie historica de resultados.
- Competencia da medicao.
- Fonte de dados.
- Evidencia ou memoria de calculo.
- Situacao em relacao a meta.

### 3.6 Pro-Gestao RPPS

A tabela `requisitos_progestao` e a tela de Pro-Gestao existem, mas o modulo ainda esta em estado preparado.

Atende parcialmente porque ja ha:

- Requisito.
- Dimensao.
- Situacao.
- Responsavel.
- Prazo.
- Evidencia textual.
- Observacoes.

Falta:

- CRUD completo.
- Vinculo com evidencias reais.
- Vinculo com acoes do PGA.
- Relatorios por dimensao e nivel.
- Controle de versao do manual.
- Acompanhamento por requisito, subitem e criterio.

### 3.7 Relatorios

O sistema ja exporta o Plano de Acao completo em CSV. Isso atende uma necessidade operacional inicial.

Atende parcialmente porque ainda faltam relatorios por:

- Plano anual.
- Eixo.
- Programa.
- Area.
- Responsavel.
- Status.
- Prazo.
- Acoes atrasadas.
- Acoes concluidas.
- Evidencias pendentes.
- Indicadores fora da meta.
- Pro-Gestao.
- Relatorio executivo consolidado.

### 3.8 Notificacoes

A tela atual calcula alertas por prazo das acoes. A tabela `notificacoes` existe, mas ainda nao e a fonte principal da central.

Atende parcialmente porque ja identifica vencimentos, mas falta:

- Persistencia das notificacoes.
- Marcacao como lida.
- Geracao automatica por regras.
- Escalonamento.
- Historico de envio.
- Integracao com email ou outro canal institucional.

## 4. O que falta para atender ao PGA 2026

### 4.1 Formalizar o ciclo anual

Criar uma estrutura conceitual e, futuramente, tabelas para representar o Plano Anual de Gestao como entidade propria.

Necessidades:

- Plano Anual 2026 como registro principal.
- Possibilidade de planos futuros, como PGA 2027.
- Controle de versao e revisao.
- Status do plano: rascunho, aprovado, em execucao, revisado, encerrado.
- Datas de vigencia.
- Documento de aprovacao.

### 4.2 Normalizar eixos e programas

Eixos e programas devem deixar de ser apenas textos soltos e passar a ser estruturas vinculadas ao plano.

Beneficios:

- Relatorios mais confiaveis.
- Filtros consistentes.
- Governanca por eixo.
- Reuso em planos futuros.
- Ordenacao e agrupamento oficial.

### 4.3 Criar entregas ou marcos da acao

Uma acao do PGA nem sempre e uma unidade unica de execucao. Algumas acoes precisam de entregas intermediarias, competencias mensais ou marcos de verificacao.

Exemplos de uso:

- 4 auditorias internas trimestrais.
- Rentabilidade mensal IPCA + 5,57.
- Conferencia mensal da folha.
- Acoes educativas ao longo do ano.
- Publicacoes periodicas de relatorios institucionais.

### 4.4 Vincular evidencias ao nivel correto

As evidencias devem poder se vincular a:

- Acao.
- Entrega.
- Indicador.
- Requisito Pro-Gestao.
- Relatorio.

No curto prazo, pode-se manter o vinculo atual com `acoes` e evoluir gradualmente para uma relacao mais flexivel.

### 4.5 Evoluir indicadores para serie historica

O PGA precisa de indicadores que mostrem desempenho ao longo do tempo, nao apenas um valor atual.

Falta modelar:

- Medicoes por competencia.
- Resultado medido.
- Meta aplicavel.
- Status da meta.
- Fonte.
- Responsavel pela medicao.
- Evidencia da medicao.

### 4.6 Consolidar relatorios institucionais

O sistema deve caminhar para relatorios oficiais, com agrupamento por Plano Anual, Eixo, Programa, Area e Responsavel.

Relatorios prioritarios:

- Execucao geral do PGA.
- Execucao por eixo.
- Execucao por programa.
- Acoes atrasadas.
- Acoes concluidas.
- Acoes sem evidencia.
- Indicadores fora da meta.
- Conformidade Pro-Gestao.
- Relatorio de evidencias.

### 4.7 Integrar PGA e Pro-Gestao

O PGA 2026 tem forte relacao com governanca, controles internos, transparencia, educacao previdenciaria, investimentos e certificacao institucional. O modulo Pro-Gestao deve se conectar ao PGA para mostrar quais acoes sustentam quais requisitos.

Falta:

- Vinculo entre `acoes` e `requisitos_progestao`.
- Evidencias compartilhadas.
- Relatorio de aderencia por requisito.
- Indicador de conformidade.

## 5. Modulos atuais que devem ser reaproveitados

### 5.1 Plano de Acao

Deve ser reaproveitado como base operacional das acoes do PGA. E o modulo mais aderente ao objetivo atual.

Uso recomendado:

- Manter `acoes` como tabela central no curto prazo.
- Evitar recriar toda a tela antes de estabilizar a modelagem.
- Evoluir para vincular cada acao a um Plano Anual, Eixo e Programa normalizados.

### 5.2 Dashboard

Deve ser reaproveitado como painel executivo inicial do PGA.

Uso recomendado:

- Manter os KPIs atuais.
- Futuramente filtrar por plano anual.
- Adicionar cortes por eixo, programa e indicador.

### 5.3 Kanban

Deve ser reaproveitado para acompanhamento operacional das acoes.

Uso recomendado:

- Manter status atual.
- Evoluir apenas quando houver entregas/marcos.
- Evitar misturar no Kanban entidades muito diferentes, como requisitos Pro-Gestao e indicadores.

### 5.4 Evidencias

Deve ser reaproveitado como base documental.

Uso recomendado:

- Manter evidencias por acao.
- Adicionar, futuramente, vinculos opcionais com entrega, indicador ou requisito.
- Preservar storage e metadados existentes.

### 5.5 Areas e Usuarios

Devem ser reaproveitados como estrutura de responsabilidade institucional.

Uso recomendado:

- Usar `areas` para vinculo de eixos, programas, acoes e indicadores.
- Usar `profiles` para responsaveis e validadores.
- Usar `user_roles` para governanca de permissao.

### 5.6 Indicadores

Deve ser reaproveitado, mas precisa de complemento para medicoes historicas.

Uso recomendado:

- Manter `indicadores` como cadastro mestre.
- Criar estrutura futura de medicoes por competencia.

### 5.7 Pro-Gestao

Deve ser reaproveitado como modulo de conformidade e certificacao.

Uso recomendado:

- Manter `requisitos_progestao`.
- Criar vinculo com acoes e evidencias.
- Evitar transformar Pro-Gestao em um simples campo dentro do PGA.

### 5.8 Relatorios

Deve ser reaproveitado como ponto de saida institucional.

Uso recomendado:

- Expandir o CSV existente.
- Criar relatorios filtrados.
- Futuramente gerar relatorios oficiais por Plano Anual.

### 5.9 Notificacoes e historicos

Devem ser reaproveitados para monitoramento ativo e auditoria.

Uso recomendado:

- Usar `notificacoes` para alertas persistidos.
- Usar `historico_alertas` para auditoria de comunicacao.
- Usar `historico_acoes` para rastreabilidade.

## 6. Riscos se alterar tudo de uma vez

### 6.1 Quebra do modulo mais maduro

O Plano de Acao atual alimenta Dashboard, Kanban, Relatorios, Evidencias e Notificacoes calculadas. Alterar radicalmente `acoes` pode quebrar varios modulos ao mesmo tempo.

### 6.2 Perda de rastreabilidade

Se as acoes forem migradas para uma nova estrutura sem estrategia incremental, pode haver perda de vinculos com:

- Evidencias.
- Historico de alteracoes.
- Responsaveis.
- Areas.
- Relatorios.
- Status atual.

### 6.3 Risco de inconsistencias no PGA 2026

O PGA 2026 ja esta representado por acoes seedadas. Uma reestruturacao brusca pode gerar duplicidade, divergencia de status ou perda de codigos oficiais como `A1-T1`.

### 6.4 Aumento de risco em seguranca e RLS

O projeto ja possui regras de permissao e RLS em torno das tabelas atuais. Novas tabelas criadas em bloco exigiriam novas policies, testes e validacoes. Fazer tudo de uma vez aumenta o risco de exposicao indevida ou bloqueio indevido de dados.

### 6.5 Regressao em relatorios e dashboard

Dashboard e relatorios dependem do formato atual de `acoes`. Se a modelagem for substituida sem views de compatibilidade ou adaptacao gradual, os paineis podem deixar de refletir o andamento real.

### 6.6 Carga de mudanca para usuarios

Usuarios ja reconhecem a logica de plano de acao, status, prazos e evidencias. Uma mudanca ampla pode prejudicar adocao institucional, principalmente se novos conceitos forem introduzidos sem transicao.

### 6.7 Dificuldade de homologacao

Mudancas em Plano Anual, Eixos, Programas, Acoes, Entregas, Indicadores, Evidencias e Relatorios ao mesmo tempo tornam dificil identificar a origem de falhas. A homologacao deve ser por camadas.

## 7. Recomendacao estrategica

A estrategia mais segura e evoluir o SIGOV-SISPREV em tres movimentos:

1. Preservar `acoes` como nucleo operacional do PGA 2026.
2. Criar uma modelagem conceitual superior para Plano Anual, Eixos e Programas.
3. Adicionar entregas, medicoes de indicadores e relatorios oficiais de forma incremental.

Essa abordagem evita ruptura, protege o que ja funciona e permite que o sistema amadureca de uma lista monitorada de acoes para uma plataforma completa de governanca do PGA, Pro-Gestao e gestao institucional do RPPS.
