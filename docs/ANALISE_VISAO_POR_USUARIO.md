# Analise - Visao por Usuario Logado no SIGOV-SISPREV

## 1. Como o sistema atual trata responsaveis e apoiadores

O sistema ja possui a base conceitual para uma visao individual por usuario:

- `acoes.responsavel_id`: vincula uma acao diretamente a um usuario cadastrado em `auth.users`/`profiles`.
- `acoes.responsavel_nome`: fallback textual para responsaveis que ainda nao estao cadastrados como usuarios.
- `acoes_apoiadores`: tabela de relacionamento entre uma acao e usuarios apoiadores.
- `user_roles`: define perfis como `admin`, `diretoria`, `responsavel` e `conselheiro`.

Na pratica, o responsavel cadastrado e o principal dono operacional da acao. Ele pode ver suas acoes por RLS, editar campos operacionais em algumas telas e anexar evidencias.

O apoiador ja participa da visibilidade: a policy `View permitted acoes` permite que o usuario veja a acao quando existe registro em `acoes_apoiadores` com `usuario_id = auth.uid()`. No entanto, no app atual ainda nao ha uma interface clara para administrar apoiadores, mostrar apoiadores na tela da acao ou diferenciar permissao operacional do apoiador.

Ponto critico: acoes preenchidas apenas com `responsavel_nome` nao ficam realmente atribuidas a um usuario logado. Para visao individual confiavel, o ideal e priorizar `responsavel_id`.

## 2. Como implementar a tela "Minhas Acoes"

A tela "Minhas Acoes" deve ser a porta de entrada operacional para usuarios comuns, semelhante a sistemas de gestao de projetos.

Rota sugerida:

- `/minhas-acoes`

Conteudo sugerido:

- Cards de resumo: minhas acoes em andamento, atrasadas, vencendo em 30 dias, pendentes de evidencia e concluidas.
- Lista principal filtrada automaticamente por usuario logado.
- Abas ou filtros rapidos:
  - Sou responsavel.
  - Sou apoiador.
  - Atrasadas.
  - Vencem em breve.
  - Sem evidencia.
  - Concluidas.
- Tabela ou cards com: codigo, titulo, area, status, percentual, prazo, papel do usuario na acao e ultima evidencia.
- Acoes rapidas: abrir detalhe, atualizar status/percentual quando permitido, anexar evidencia quando permitido.

Consulta conceitual:

- Responsavel: `acoes.responsavel_id = auth.uid()`.
- Apoiador: existe registro em `acoes_apoiadores` para a acao e usuario atual.
- Evidencias: join ou consulta agregada em `evidencias` por `acao_id`.

Essa tela nao precisa substituir o Plano de Acao geral. Ela deve ser uma visao individual, mais simples e orientada ao trabalho diario.

## 3. Como diferenciar visao de admin, gestor, responsavel e apoiador

### Admin

O admin deve manter a visao completa:

- Ve todas as acoes.
- Gerencia usuarios, areas, responsaveis e apoiadores.
- Pode criar, editar e excluir acoes conforme regras atuais.
- Acessa Dashboard geral, relatorios consolidados e exportacoes.

### Gestor / Diretoria

O gestor deve ter visao gerencial, mas nao necessariamente administrativa total:

- Ve acoes da organizacao, ou pelo menos das areas sob sua gestao se isso for modelado depois.
- Cria e acompanha acoes.
- Designa responsaveis e apoiadores.
- Acompanha atrasos, riscos e evidencias.
- Usa Dashboard geral e filtros por area/responsavel.

Hoje, o sistema mapeia `diretoria` para `PermissionLevel = manage`, com acesso a dashboard, plano, kanban, evidencias, relatorios, areas, Pro-Gestao e indicadores.

### Responsavel

O responsavel deve ter foco nas acoes em que `responsavel_id = user.id`:

- Ve prioritariamente suas acoes.
- Atualiza andamento, status, prazo quando permitido e observacoes.
- Anexa evidencias.
- Visualiza pendencias e prazos.
- Pode ver apoiadores da propria acao.

### Apoiador

O apoiador deve enxergar a acao porque participa dela, mas a permissao precisa ser definida de forma explicita:

- Opcao conservadora: apoiador visualiza a acao e anexa evidencias, mas nao altera status/percentual.
- Opcao colaborativa: apoiador pode anexar evidencias e comentar/registrar observacoes, mas nao concluir ou cancelar.
- Opcao ampliada: apoiador pode atualizar progresso se houver uma coluna futura de permissao no vinculo.

No estado atual, `acoes_apoiadores` resolve a participacao basica, mas nao diferencia tipos de apoio nem niveis de permissao.

## 4. Quais tabelas atuais podem ser usadas

As tabelas atuais ja cobrem boa parte da evolucao:

- `acoes`: nucleo operacional das acoes, prazos, status, prioridade, percentual e responsavel.
- `acoes_apoiadores`: participacao secundaria de usuarios em acoes.
- `profiles`: dados do usuario, nome, email, area e status ativo.
- `user_roles`: papel do usuario no sistema.
- `areas`: agrupamento institucional.
- `evidencias`: arquivos vinculados as acoes, usuario que anexou e data.
- `historico_acoes`: trilha de alteracoes, util para auditoria e futura analise.
- `notificacoes`: base para alertas individuais.
- `plano_anual`, `pga_eixos`, `pga_programas`: contexto estrategico do PGA.
- `requisitos_progestao` e `indicadores`: podem seguir a mesma logica de visao individual por `responsavel_id`.

## 5. Se a tabela `acoes_apoiadores` ja atende a participacao em acoes

Sim, a tabela `acoes_apoiadores` atende ao vinculo basico de participacao em acoes.

Ela possui:

- `acao_id`.
- `usuario_id`.
- Restricao unica para evitar duplicidade: `UNIQUE(acao_id, usuario_id)`.
- Relacionamento com `acoes`.
- Relacionamento com usuarios autenticados.

Ela tambem ja e usada na policy de visibilidade de acoes. Isso significa que, em termos de seguranca, o sistema ja consegue permitir que um apoiador veja a acao.

Limites atuais:

- Nao ha campo de papel do apoiador, como "executor", "validador", "apoio tecnico" ou "observador".
- Nao ha campo de permissao operacional, como `pode_editar`, `pode_anexar_evidencia` ou `pode_concluir`.
- Nao ha tela administrativa clara para vincular apoiadores.
- As telas ainda nao exibem apoiadores como parte da composicao da acao.
- As server functions de evidencia hoje validam responsavel ou gestor; apoiador ainda nao parece autorizado explicitamente para anexar evidencia.

Conclusao: a tabela atende a participacao inicial, mas precisara de evolucao se o papel do apoiador for mais rico que "pode visualizar".

## 6. Quais mudancas seriam necessarias no Dashboard

O Dashboard deveria ter duas camadas:

- Dashboard geral para admin/gestor.
- Dashboard individual para responsavel/apoiador.

Para usuario comum, o Dashboard deve responder:

- Quantas acoes estao sob minha responsabilidade.
- Quantas acoes tenho como apoiador.
- Quais estao atrasadas.
- Quais vencem nos proximos 7/15/30 dias.
- Quais precisam de evidencia.
- Qual meu percentual medio de execucao.
- Quais foram minhas ultimas atualizacoes.

Para admin/gestor, manter:

- Visao consolidada de todas as acoes.
- Filtros por area, responsavel, status, eixo, programa e plano anual.
- Ranking de responsaveis com carga de acoes.
- Acoes atrasadas por area.
- Evidencias recentes.

Tecnicamente, a tela atual `dashboard.tsx` ja calcula muitos indicadores em memoria. A evolucao segura seria parametrizar a fonte de dados:

- Se `canManage = true`, buscar visao geral.
- Se usuario comum, buscar apenas acoes visiveis via RLS e destacar "minhas" metricas.
- Opcionalmente, criar um modo alternavel: "Visao geral" e "Minha visao" para gestores.

## 7. Como manter visao geral para admin e visao individual para usuario comum

A separacao deve ocorrer em tres niveis:

### Navegacao

- Admin/gestor: Dashboard, PGA / Plano de Acao, Kanban, Evidencias, Relatorios, Usuarios, Areas.
- Responsavel/apoiador: Minha Visao, Minhas Acoes, Kanban, Evidencias, Notificacoes.

### Queries

- Admin/gestor: consultas amplas, respeitando RLS e permissoes.
- Usuario comum: consultas centradas em `auth.uid()`, ou relying em RLS quando a policy ja restringe corretamente.

### UX

- Admin/gestor ve filtros gerenciais e consolidacao.
- Usuario comum ve trabalho individual primeiro, com menos filtros e mais foco em prazo, pendencia e proxima acao.

Importante: a RLS deve continuar sendo a linha de defesa principal. A interface pode esconder menus, mas o banco precisa garantir que usuario comum nao acesse dados fora do seu escopo.

## 8. Como preparar os dados para futura integracao com Power BI

Para Power BI, o ideal e preparar uma camada analitica estavel, sem depender diretamente da estrutura bruta das telas.

Recomendacoes:

- Criar futuramente views SQL para consumo analitico:
  - `vw_acoes_completas`.
  - `vw_acoes_participantes`.
  - `vw_evidencias_por_acao`.
  - `vw_dashboard_usuarios`.
  - `vw_dashboard_areas`.
- Padronizar dimensoes:
  - Usuario.
  - Area.
  - Plano anual.
  - Eixo.
  - Programa.
  - Status.
  - Prioridade.
  - Data.
- Expor fatos:
  - Acao.
  - Participacao em acao.
  - Evidencia.
  - Historico de alteracao.
  - Notificacao/alerta.
- Evitar depender de `responsavel_nome` para analise. O campo pode continuar como fallback historico, mas a modelagem analitica deve preferir `responsavel_id`.
- Garantir datas normalizadas: `data_inicio`, `prazo_final`, `created_at`, `updated_at`, `created_at` da evidencia.
- Incluir campos derivados em views:
  - dias_para_vencer.
  - atrasada_sim_nao.
  - papel_usuario: responsavel ou apoiador.
  - possui_evidencia.
  - quantidade_evidencias.
  - percentual_execucao.

Para seguranca, a integracao Power BI deve usar uma conta/service role controlada ou uma API intermediaria, nunca credenciais de usuario final expostas no cliente.

## 9. Ordem segura de implementacao

1. Mapear dados existentes
   - Levantar acoes com `responsavel_nome` sem `responsavel_id`.
   - Identificar usuarios reais em `profiles`.
   - Mapear quem deve ser responsavel e quem deve ser apoiador.

2. Consolidar atribuicao de responsaveis
   - Preencher `responsavel_id` sempre que houver usuario cadastrado.
   - Manter `responsavel_nome` apenas como fallback ou dado legado.

3. Implementar gestao de apoiadores
   - Na criacao/edicao da acao, permitir selecionar apoiadores.
   - Exibir apoiadores no detalhe da acao.
   - Manter `acoes_apoiadores` como tabela principal de participacao.

4. Criar a tela "Minhas Acoes"
   - Usar `responsavel_id = user.id` e `acoes_apoiadores.usuario_id = user.id`.
   - Separar visualmente "sou responsavel" e "sou apoiador".
   - Adicionar filtros rapidos por prazo, status e evidencia.

5. Ajustar Dashboard por perfil
   - Admin/gestor ve consolidado.
   - Usuario comum ve painel individual.
   - Gestor pode alternar para "Minha visao".

6. Revisar permissoes operacionais do apoiador
   - Decidir se apoiador pode anexar evidencia.
   - Decidir se apoiador pode alterar status, percentual ou apenas comentar/anexar.
   - Ajustar server functions e RLS conforme a decisao.

7. Atualizar Evidencias
   - Filtrar e comunicar melhor "minhas evidencias" e "evidencias das minhas acoes".
   - Garantir que responsavel e apoiador tenham a experiencia correta.

8. Preparar camada analitica
   - Criar views para Power BI em uma etapa propria.
   - Documentar campos e regras de negocio.
   - Validar performance e indices.

9. Testar cenarios por perfil
   - Admin.
   - Diretoria/gestor.
   - Responsavel.
   - Apoiador.
   - Usuario sem acoes.

10. Implantar em fases
   - Primeiro visao individual sem alterar permissoes sensiveis.
   - Depois gestao de apoiadores.
   - Depois permissoes finas e camada analitica.

## Conclusao

O SIGOV-SISPREV ja tem a base tecnica para evoluir para uma experiencia individual por usuario logado. A principal oportunidade nao e criar um novo modelo do zero, mas organizar melhor o que ja existe:

- Usar `responsavel_id` como dono da acao.
- Usar `acoes_apoiadores` como participantes.
- Transformar o Dashboard e o Plano de Acao em visoes condicionadas ao perfil.
- Criar "Minhas Acoes" como tela operacional principal para usuarios comuns.
- Preparar views analiticas para Power BI em uma fase posterior.

A evolucao mais segura e progressiva: primeiro melhorar atribuicao e visibilidade, depois permitir colaboracao real de apoiadores, e por fim consolidar camada gerencial/analitica.
