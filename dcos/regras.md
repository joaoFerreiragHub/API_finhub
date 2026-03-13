# Regras de Colaboracao para Agentes (API_finhub)

Data: 2026-03-06
Escopo: backend `API_finhub` + frontend `FinHub-Vite` quando aplicavel.

## MUST READ (OBRIGATORIO PARA TODOS OS AGENTES)

Antes de iniciar qualquer tarefa, ler esta secao e executar sem excecoes:

1. Nao fechar ponto sem os 3 artefactos: implementacao + docs + commit.
2. Nao deixar alteracoes pendentes ao terminar um ponto (working tree limpo).
3. Quando um ponto fica concluido, mover o ficheiro respetivo para `dcos/done/` no mesmo ciclo (regra valida para `API_finhub` e `FinHub-Vite`).
4. Manter na raiz de `dcos/` apenas ficheiros ativos.
5. Atualizar `dcos/audiotira_04.md` no mesmo ciclo de fecho.
6. Validar sempre o minimo tecnico:
   - backend: `npm run typecheck`;
   - frontend: `npm run typecheck:p1` (quando houver alteracoes frontend).
7. Registar em docs qualquer limitacao de validacao que nao possa ser executada.
8. Tudo o que depender de ambiente real/live fica marcado como pre-release (T-1/T-0), com evidencia.
9. Nao reverter nem apagar alteracoes do utilizador sem confirmacao explicita.
10. Em handoff, reportar obrigatoriamente: entregue, ficheiros, validacoes, commit e proximo passo.
11. Atualizar sempre o bloco `Checkpoint de Retoma` deste ficheiro no fim de cada ciclo com commit/push.

## Checkpoint de Retoma (ATUALIZAR EM TODO O FECHO)

Ultima atualizacao: 2026-03-13

- Estado git: `FinHub-Vite/master` com fecho local dos pontos P4.4-03/P4.5-04/P4.5-05; `API_finhub/main` em sincronizacao documental de fecho do bloco P4.3-4.5.
- Ultimo commit backend de entrega: `f5cf441` (`docs(p4.4-02): close financial tools frontend status`).
- Ultimo commit frontend (FinHub-Vite/master): `e65665f` (`feat(admin): close p4.4-03 p4.5-04 p4.5-05 frontend`).
- Onde ficamos:
  - REIT Toolkit permanece concluido (F1 subtype detector + coverage proxy + smoke validado);
  - P4.3-01 paywall frontend ficou FECHADO em `/admin/monetizacao` com listagem/filtros/ativar-desativar + create/edit de policy + preview de impacto;
  - P4.3-02 subscricoes frontend ficou FECHADO em `/admin/monetizacao/subscricoes` com timeline detalhada por subscricao (actor/motivo/nota/snapshot) e refinamentos UX de operacao;
  - P4.3-03 apelacoes frontend ficou FECHADO em `/admin/conteudo/apelacoes` (alias `/admin/apelacoes`) com inbox filtravel, timeline de historico e decisao com motivo padronizado;
  - P4.3-04 templates frontend ficou FECHADO em `/admin/conteudo` com selector nos dialogs de acao/lote, auto-fill de reason/note, enforcement de `requiresNote`/`requiresDoubleConfirm` e telemetria `trackFeature`;
  - P4.3-05 comunicacoes frontend ficou FECHADO em `/admin/operacoes/comunicacoes` com composer segmentado, preview de audiencia, historico de envios e acoes `approve/send` com motivo obrigatorio;
  - P4.4-01 analytics positivos de creators ficou FECHADO no frontend em `/admin/creators/analytics` com scorecards, filtros operacionais, leaderboard growth/engagement/trust e export CSV;
  - P4.4-02 financial tools ficou FECHADO no frontend em `/admin/stats/ferramentas-financeiras` com filtros por ambiente/ferramenta, dashboard de uso e mutacao de control plane com motivo obrigatorio;
  - P4.4-03 anuncios/partnerships frontend ficou FECHADO em `/admin/operacoes/anuncios` com inventory map, gestao de slots/campanhas e workflow `submit/approve/reject/activate/pause`;
  - P4.5-04 delegacoes frontend ficou FECHADO em `/admin/operacoes/delegacoes` com selecao de admin alvo, listagem por status/scope, criacao com expiracao e revogacao com motivo obrigatorio;
  - P4.5-05 dark mode admin frontend ficou FECHADO com aplicacao real do tema `system|light|dark` no `AdminLayout`;
  - bloco documental `P4_3_4_5_BACKOFFICE_NEGOCIO.md` foi fechado e movido para `dcos/done/`.
- Proximo passo recomendado:
  - continuar na ordem oficial (`P4_MODERATION -> P5_PRE_BETA -> restantes P5`);
  - executar fecho do `P4_MODERATION_CONTROL_PLANE` e depois retomar o pacote P5 pre-beta da plataforma.

Regra operacional obrigatoria deste bloco:
1. No fim de cada ponto com commit/push, atualizar este bloco no mesmo ciclo.
2. Preencher sempre: data, estado git, ultimo commit, onde ficamos e proximo passo.
3. Nao fechar o ciclo se este bloco ficar desatualizado.

## 1) Objetivo

Garantir execucao consistente entre agentes: qualidade tecnica, rastreabilidade por docs e commits, e handoff claro.

## 2) Regras obrigatorias

1. Cada ponto fechado tem de incluir:
   - implementacao tecnica;
   - documentacao em `dcos`;
   - commit.
2. Nao deixar alteracoes pendentes sem commit no fim de um ponto concluido.
3. Se o trabalho envolver frontend e backend, fechar ambos no ciclo e commitar no fim do ponto.
4. Sempre atualizar a documentacao de progresso quando um item e fechado.
5. Em caso de hotfix (ex: erro SSR/hydration/runtime), registar o incidente e a correcao nos docs.
6. Organizacao de ficheiros e obrigatoria no fecho de cada ponto:
   - mover imediatamente para `dcos/done/` o que ficou concluido;
   - manter na raiz de `dcos/` apenas o que esta ativo;
   - atualizar `dcos/audiotira_04.md` no mesmo ciclo de fecho.
7. Tudo o que so pode ser validado em ambiente live deve ser marcado como pre-release:
   - executar na janela T-1/T-0 do dia de live beta testing;
   - registar explicitamente como pendente durante desenvolvimento normal;
   - fechar com evidencia no dia de execucao live.

## 3) Fluxo padrao por ponto

1. Confirmar estado inicial (`git status`, branch atual, ficheiros sujos).
2. Implementar o ponto com escopo controlado.
3. Validar com comandos tecnicos relevantes (minimo `typecheck`; usar build/test quando aplicavel).
4. Atualizar docs em `dcos` (estado, o que foi entregue, validacao executada).
5. Criar commit com mensagem explicita e referencia ao ponto (ex: `P4.2-09`).
6. Confirmar working tree limpo no fim do ponto.

## 4) Politica de commits

1. Um commit por ponto fechado (ou por bloco pequeno de pontos fortemente relacionados).
2. Mensagens de commit devem indicar:
   - area (`admin`, `audit`, `docs`, etc.);
   - acao (`feat`, `fix`, `docs`);
   - referencia do ponto (`P4.x-yy`) quando existir.
3. Nao acumular varios pontos sem commit intermedio.

## 5) Politica de documentacao

1. `dcos` e fonte de verdade operacional.
2. Ao fechar ponto:
   - atualizar estado;
   - listar alteracoes principais;
   - listar validacoes executadas.
3. Riscos de pre-release devem ficar anotados explicitamente em docs.

## 6) Gestao de ficheiros sujos

1. Verificar sempre ficheiros sujos antes de comecar.
2. Se houver sujos nao relacionados:
   - confirmar se sao necessarios;
   - descartar quando forem lixo/temporarios e houver alinhamento explicito.
3. Nao apagar/reverter alteracoes do utilizador sem confirmacao.

## 7) Validacao tecnica minima

1. Backend: `npm run typecheck` (obrigatorio).
2. Frontend: `npm run typecheck:p1` ou equivalente (quando houver alteracoes frontend).
3. Build/test/E2E conforme impacto da alteracao.
4. Se nao for possivel validar algo, registar explicitamente a limitacao.
5. Se a validacao depender de contas reais/ambiente live, mover para checklist de pre-release (T-1/T-0) e nao bloquear o ciclo de implementacao.

## 8) Regras operacionais do admin (pre-release)

1. Validar `/admin/*` com sessao real JWT emitida pelo backend.
2. Nao validar fluxos protegidos com token `dev-*` como criterio final de aceite.
3. Qualquer risco conhecido (ex: refresh/token/mock) deve ficar documentado para pre-release.

## 9) Comunicacao de handoff

No fecho de cada ponto, o agente deve reportar:

1. o que foi entregue;
2. ficheiros alterados;
3. validacoes executadas;
4. hash do commit;
5. proximo ponto recomendado.

## 10) Ciclo de vida dos ficheiros de P's (obrigatorio)

Para manter contexto maximo entre agentes, os P's devem estar sempre separados em 3 estados:

1. Feito (o que ja fizemos):
   - quando um P fica concluido, o ficheiro deve ser movido para `dcos/done/`;
   - o movimento deve ser feito no mesmo ciclo de fecho + commit.
2. Em curso (o que estamos a fazer):
   - ficam na raiz de `dcos/` apenas os P's ativos.
3. Futuro (o que vamos fazer):
   - qualquer ideia de novo P deve ser registada em `dcos/audiotira_04.md` (secao backlog consolidado).

Lista central de pendentes:
1. `dcos/audiotira_04.md` deve conter:
   - pendentes em curso (com ficheiro ativo em `dcos/`, estado `em_curso` ou `planeado`);
   - backlog futuro (estado `proposto`).

Regra de ouro:
1. Nao misturar no mesmo sitio P's fechados, ativos e ideias futuras.

Checklist obrigatoria de fecho (executar sempre):
1. ponto implementado e validado;
2. docs atualizadas;
3. ficheiro do ponto movido para `dcos/done/` quando concluido;
4. `audiotira_04.md` sincronizada com o novo estado;
5. commit realizado sem deixar pendencias.
