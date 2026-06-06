# Proposta de Modelagem Conceitual do PGA

Proposta estrategica de modelagem para evoluir o SIGOV-SISPREV de um controle de acoes para uma estrutura completa de Plano Anual de Gestao, preservando os modulos atuais e evitando ruptura funcional.

## 1. Principios da modelagem

A modelagem recomendada deve seguir cinco principios:

1. Reaproveitar a tabela `acoes` como nucleo operacional inicial.
2. Separar conceitos institucionais que hoje estao misturados em campos textuais.
3. Permitir gestao anual, versionamento e comparacao entre ciclos.
4. Criar rastreabilidade entre planejamento, execucao, evidencias, indicadores e relatorios.
5. Evoluir por etapas, mantendo compatibilidade com Dashboard, Kanban, Evidencias e Relatorios existentes.

## 2. Modelo conceitual proposto

### 2.1 Plano Anual

Representa o ciclo oficial de planejamento e monitoramento institucional.

Entidade conceitual: `plano_anual`

Campos recomendados:

- `id`.
- `ano`.
- `nome`.
- `descricao`.
- `data_inicio`.
- `data_fim`.
- `status`.
- `versao`.
- `data_aprovacao`.
- `documento_aprovacao_id` ou referencia a evidencia/documento.
- `responsavel_id`.
- `observacoes`.
- `created_at`.
- `updated_at`.

Status sugeridos:

- `rascunho`.
- `aprovado`.
- `em_execucao`.
- `revisado`.
- `encerrado`.
- `cancelado`.

Uso no PGA 2026:

- Registro principal: Plano Anual de Gestao 2026.
- Todas as estruturas de eixos, programas e acoes devem estar vinculadas a esse plano.

### 2.2 Eixos

Representam grandes dimensoes estrategicas do PGA.

Entidade conceitual: `pga_eixos`

Campos recomendados:

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

Exemplos para o PGA 2026:

- Controles Internos.
- Governanca Corporativa.
- Educacao Previdenciaria.

Papel do eixo:

- Agrupar programas e acoes.
- Permitir relatorios executivos por dimensao.
- Permitir acompanhamento de aderencia estrategica.

### 2.3 Programas

Representam agrupamentos tematicos ou iniciativas estruturantes dentro de um eixo.

Entidade conceitual: `pga_programas`

Campos recomendados:

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

Exemplos:

- Programa de Fortalecimento do Controle Interno.
- Programa de Governanca, Integridade e Modernizacao Administrativa.
- Programa de Educacao Previdenciaria.

Papel do programa:

- Organizar a execucao por conjunto de objetivos.
- Consolidar acoes, entregas e indicadores.
- Apoiar relatorios por agenda institucional.

### 2.4 Acoes

Representam compromissos executaveis do PGA.

Entidade atual: `acoes`

Evolucao recomendada:

- Manter a tabela atual.
- Acrescentar, futuramente, chaves estrangeiras para `plano_anual_id`, `eixo_id` e `programa_id`.
- Manter temporariamente os campos textuais `eixo_estrategico` e `programa` para compatibilidade e migracao gradual.

Campos atuais ja aderentes:

- `codigo`.
- `titulo`.
- `descricao`.
- `objetivo`.
- `area_id`.
- `responsavel_id`.
- `responsavel_nome`.
- `data_inicio`.
- `prazo_final`.
- `status`.
- `prioridade`.
- `percentual_execucao`.
- `periodicidade`.
- `observacoes`.

Campos futuros recomendados:

- `plano_anual_id`.
- `eixo_id`.
- `programa_id`.
- `tipo_acao`.
- `fonte_pga`.
- `criterio_conclusao`.
- `necessita_evidencia`.
- `peso`.
- `validada_em`.
- `validada_por`.

Status atuais podem ser mantidos:

- `nao_iniciada`.
- `em_andamento`.
- `concluida`.
- `atrasada`.
- `cancelada`.

### 2.5 Entregas

Representam etapas, marcos, produtos ou competencias vinculadas a uma acao.

Entidade conceitual: `pga_entregas`

Campos recomendados:

- `id`.
- `acao_id`.
- `codigo`.
- `titulo`.
- `descricao`.
- `tipo`.
- `competencia`.
- `data_inicio`.
- `prazo_final`.
- `data_entrega`.
- `status`.
- `percentual_execucao`.
- `responsavel_id`.
- `responsavel_nome`.
- `ordem`.
- `criterio_aceite`.
- `observacoes`.
- `created_at`.
- `updated_at`.

Tipos sugeridos:

- `marco`.
- `produto`.
- `competencia_mensal`.
- `competencia_trimestral`.
- `evento`.
- `relatorio`.
- `atividade`.

Status sugeridos:

- `nao_iniciada`.
- `em_andamento`.
- `entregue`.
- `validada`.
- `atrasada`.
- `cancelada`.

Exemplos de aplicacao:

- Uma acao de auditorias trimestrais pode ter quatro entregas.
- Uma acao de rentabilidade mensal pode ter doze entregas ou medicoes.
- Uma acao de capacitacao pode ter entregas por turma, evento ou certificado.

### 2.6 Evidencias

Representam documentos, arquivos ou registros que comprovam execucao.

Entidade atual: `evidencias`

Evolucao recomendada:

- Manter a tabela atual para evidencias de acao.
- Adicionar, futuramente, capacidade de vinculo a entrega, indicador, medicao, requisito Pro-Gestao ou relatorio.

Campos atuais:

- `id`.
- `acao_id`.
- `usuario_id`.
- `nome_arquivo`.
- `caminho_arquivo`.
- `tipo_arquivo`.
- `observacao`.
- `created_at`.

Campos futuros recomendados:

- `entrega_id`.
- `indicador_id`.
- `medicao_indicador_id`.
- `requisito_progestao_id`.
- `relatorio_id`.
- `tipo_evidencia`.
- `competencia`.
- `data_documento`.
- `origem`.
- `status_validacao`.
- `validada_por`.
- `validada_em`.

Alternativa tecnica:

- Criar tabela de vinculos flexiveis, como `evidencia_vinculos`, em vez de adicionar varias colunas opcionais em `evidencias`.

Modelo de vinculo flexivel:

- `id`.
- `evidencia_id`.
- `referencia_tipo`.
- `referencia_id`.
- `created_at`.

Essa alternativa reduz colunas nulas e permite associar uma evidencia a varios objetos.

### 2.7 Indicadores

Representam medidas de desempenho do PGA, de areas, programas, acoes ou Pro-Gestao.

Entidade atual: `indicadores`

Evolucao recomendada:

- Manter `indicadores` como cadastro mestre.
- Criar tabela de medicoes historicas.
- Permitir vinculo com Plano Anual, Eixo, Programa e Acao.

Campos atuais em `indicadores`:

- `id`.
- `nome`.
- `descricao`.
- `area_id`.
- `formula`.
- `meta`.
- `resultado_atual`.
- `unidade_medida`.
- `periodicidade`.
- `responsavel_id`.
- `status`.
- `created_at`.
- `updated_at`.

Campos futuros recomendados em `indicadores`:

- `plano_anual_id`.
- `eixo_id`.
- `programa_id`.
- `acao_id`.
- `tipo_indicador`.
- `sentido_meta`.
- `fonte_dados`.
- `metodologia_calculo`.

Entidade conceitual: `indicador_medicoes`

Campos recomendados:

- `id`.
- `indicador_id`.
- `competencia`.
- `data_medicao`.
- `valor_medido`.
- `meta_referencia`.
- `situacao_meta`.
- `responsavel_id`.
- `memoria_calculo`.
- `observacoes`.
- `created_at`.
- `updated_at`.

Situacoes de meta sugeridas:

- `atingida`.
- `parcial`.
- `nao_atingida`.
- `nao_aplicavel`.

### 2.8 Relatorios

Representam saidas formais de monitoramento, prestacao de contas e governanca.

Entidade conceitual: `pga_relatorios`

Campos recomendados:

- `id`.
- `plano_anual_id`.
- `tipo`.
- `titulo`.
- `periodo_inicio`.
- `periodo_fim`.
- `competencia`.
- `gerado_por`.
- `gerado_em`.
- `status`.
- `arquivo_evidencia_id`.
- `parametros`.
- `observacoes`.

Tipos sugeridos:

- `execucao_geral`.
- `por_eixo`.
- `por_programa`.
- `por_area`.
- `por_responsavel`.
- `acoes_atrasadas`.
- `acoes_concluidas`.
- `evidencias_pendentes`.
- `indicadores`.
- `progestao`.
- `prestacao_contas`.

Status sugeridos:

- `gerado`.
- `publicado`.
- `arquivado`.
- `cancelado`.

### 2.9 Pro-Gestao

Representa requisitos de certificacao institucional e aderencia ao Manual Pro-Gestao.

Entidade atual: `requisitos_progestao`

Evolucao recomendada:

- Manter a tabela atual.
- Criar vinculo entre requisitos Pro-Gestao e acoes do PGA.
- Vincular evidencias reais aos requisitos.

Entidade conceitual: `progestao_acoes`

Campos recomendados:

- `id`.
- `requisito_progestao_id`.
- `acao_id`.
- `tipo_vinculo`.
- `observacoes`.
- `created_at`.

Tipos de vinculo:

- `atende`.
- `contribui`.
- `evidencia`.
- `mitiga_risco`.

## 3. Relacionamentos principais

Modelo hierarquico recomendado:

```text
Plano Anual
  -> Eixos
      -> Programas
          -> Acoes
              -> Entregas
              -> Evidencias
              -> Indicadores
                  -> Medicoes
```

Relacionamentos transversais:

```text
Areas -> Acoes, Programas, Indicadores
Usuarios/Profiles -> Responsaveis, Validadores, Geradores de Relatorio
Evidencias -> Acoes, Entregas, Indicadores, Pro-Gestao, Relatorios
Pro-Gestao -> Acoes, Evidencias
Historico -> Acoes, Entregas, Indicadores, Relatorios
Notificacoes -> Prazos, Pendencias, Validacoes
```

## 4. Tabelas atuais que podem ser reaproveitadas

### 4.1 `acoes`

Reaproveitamento: alto.

Funcao futura:

- Continuar como tabela central das acoes do PGA.
- Receber vinculos formais com Plano Anual, Eixo e Programa.
- Alimentar Dashboard, Kanban, Evidencias, Notificacoes e Relatorios.

### 4.2 `areas`

Reaproveitamento: alto.

Funcao futura:

- Responsabilizacao institucional.
- Filtros e relatorios por unidade.
- Vinculo com programas, acoes e indicadores.

### 4.3 `profiles`

Reaproveitamento: alto.

Funcao futura:

- Responsaveis por acoes, entregas, indicadores e validacoes.
- Geradores e aprovadores de relatorios.

### 4.4 `user_roles`

Reaproveitamento: alto.

Funcao futura:

- Controle de permissoes por perfil.
- Diferenciacao entre gestor, responsavel, conselheiro e administrador.
- Base para regras de validacao e aprovacao.

### 4.5 `evidencias`

Reaproveitamento: alto.

Funcao futura:

- Continuar como metadados de arquivos comprobatorios.
- Evoluir para vinculos com entregas, indicadores e Pro-Gestao.

### 4.6 `acoes_apoiadores`

Reaproveitamento: medio/alto.

Funcao futura:

- Apoio operacional a acoes.
- Matriz RACI simplificada.
- Participacao de multiplas areas ou usuarios.

### 4.7 `indicadores`

Reaproveitamento: medio/alto.

Funcao futura:

- Cadastro mestre de indicadores.
- Vinculo com Plano Anual, Eixo, Programa ou Acao.
- Base para medicoes historicas.

### 4.8 `requisitos_progestao`

Reaproveitamento: alto.

Funcao futura:

- Controle de conformidade Pro-Gestao.
- Vinculo com acoes e evidencias do PGA.
- Relatorio de aderencia institucional.

### 4.9 `notificacoes`

Reaproveitamento: medio/alto.

Funcao futura:

- Alertas persistidos por prazo, pendencia, validacao e evidencia.
- Marcacao como lida.
- Central institucional de acompanhamento.

### 4.10 `historico_alertas`

Reaproveitamento: medio.

Funcao futura:

- Auditoria de comunicacoes e alertas enviados.
- Prestacao de contas sobre notificacoes institucionais.

### 4.11 `historico_acoes`

Reaproveitamento: alto.

Funcao futura:

- Auditoria das mudancas de status, percentual, prazo, responsavel e observacoes.
- Base para relatorios de evolucao e controle interno.

## 5. Novas tabelas necessarias

### 5.1 Essenciais para formalizar o PGA

#### `plano_anual`

Finalidade: representar oficialmente cada ciclo anual de gestao.

Prioridade: alta.

#### `pga_eixos`

Finalidade: normalizar eixos do plano.

Prioridade: alta.

#### `pga_programas`

Finalidade: normalizar programas vinculados aos eixos.

Prioridade: alta.

### 5.2 Essenciais para execucao detalhada

#### `pga_entregas`

Finalidade: detalhar acoes em marcos, produtos ou competencias.

Prioridade: media/alta.

#### `indicador_medicoes`

Finalidade: registrar historico de resultados dos indicadores.

Prioridade: media/alta.

### 5.3 Essenciais para rastreabilidade ampliada

#### `evidencia_vinculos`

Finalidade: permitir que uma evidencia se vincule a acao, entrega, indicador, medicao, requisito Pro-Gestao ou relatorio.

Prioridade: media.

#### `progestao_acoes`

Finalidade: vincular requisitos Pro-Gestao a acoes do PGA.

Prioridade: media.

### 5.4 Relatorios e governanca documental

#### `pga_relatorios`

Finalidade: registrar relatorios gerados, parametros, periodo e arquivo associado.

Prioridade: media.

### 5.5 Auditoria complementar, se necessario

#### `historico_entregas`

Finalidade: registrar alteracoes em entregas.

Prioridade: baixa/media.

#### `historico_indicadores`

Finalidade: registrar alteracoes em indicadores e medicoes.

Prioridade: baixa/media.

## 6. Estrategia de reaproveitamento da tabela `acoes`

A tabela `acoes` nao deve ser descartada. Ela ja contem os dados operacionais do PGA 2026 e alimenta varios modulos.

Estrategia recomendada:

1. Manter todos os campos atuais.
2. Criar `plano_anual`, `pga_eixos` e `pga_programas`.
3. Popular essas novas estruturas a partir dos valores atuais de `acoes.eixo_estrategico` e `acoes.programa`.
4. Acrescentar vinculos em `acoes`.
5. Manter campos textuais antigos durante periodo de transicao.
6. Atualizar consultas gradualmente.
7. Somente apos homologacao, decidir se campos textuais serao mantidos como denormalizacao ou depreciados.

## 7. Modelo minimo viavel para o PGA 2026

Para atender ao PGA 2026 com baixo risco, o modelo minimo recomendado e:

- `plano_anual`.
- `pga_eixos`.
- `pga_programas`.
- Vinculos de `acoes` com plano, eixo e programa.
- Reaproveitamento de `evidencias`.
- Reaproveitamento de `indicadores`.
- Reaproveitamento de `requisitos_progestao`.
- Relatorios filtrados a partir das estruturas atuais.

Entregas, medicoes historicas e vinculos flexiveis de evidencias podem vir na etapa seguinte.

## 8. Cuidados de governanca

Antes de implementar novas tabelas, definir:

- Quem pode criar ou aprovar um Plano Anual.
- Quem pode alterar eixos e programas.
- Quem pode cadastrar e concluir acoes.
- Quem pode validar evidencias.
- Quem pode gerar e publicar relatorios.
- Como tratar revisoes do PGA.
- Como preservar historico apos encerramento do ciclo anual.

Essa definicao e importante porque o PGA nao e apenas cadastro: ele e instrumento formal de governanca e prestacao de contas.

## 9. Conclusao

A modelagem ideal para o SIGOV-SISPREV deve reconhecer que o sistema atual ja possui uma base funcional importante. A melhor arquitetura nao e substituir o modulo de Plano de Acao, mas envolver esse modulo com uma camada formal de Plano Anual, Eixos e Programas, e depois evoluir para Entregas, Indicadores historicos, Evidencias multivinculo e Relatorios oficiais.

Essa abordagem preserva o valor ja entregue, reduz risco operacional e cria uma base consistente para governanca publica, Pro-Gestao RPPS, controle interno e monitoramento institucional.
