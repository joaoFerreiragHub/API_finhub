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

Ultima atualizacao: 2026-03-14

- Estado git: `API_finhub/main` com control plane de integracoes evoluido (health + rollback + historico) e `FinHub-Vite/master` com painel admin estruturado para gerir analytics/captcha/SEO sem editar JSON manual por defeito.
- Ultimo commit backend funcional: `0aa8339` (`feat(platform-integrations): add health status and rollback control plane`).
- Ultimo commit frontend funcional (FinHub-Vite/master): `4daece1` (`feat(admin-integrations): add health checks, rollback and structured config editors`).
- Onde ficamos:
  - monitorizacao externa manteve baseline com diagnostico explicito no Actions (validacao de URL, HTTP status, curl exit code, resumo em `GITHUB_STEP_SUMMARY`, reasons no webhook);
  - se `UPTIME_API_URL` faltar em pre-release, o workflow faz `skip` com `notice` (nao bloqueia); em modo estrito (`UPTIME_MONITOR_ENFORCE=true`) volta a falhar por config em falta;
  - control plane de integracoes agora inclui health-check operacional por integracao (`ok|warning|error` + issues) no backend e UI admin;
  - rollback da ultima versao por integracao entregue com endpoint dedicado (`POST /api/admin/platform/integrations/:integrationKey/rollback`) e historico circular;
  - painel admin de integracoes ganhou editor estruturado para SEO/analytics/captcha com opcao de JSON avancado e toggle para mostrar/ocultar IDs/chaves;
  - gate E2E critico/release manteve baseline em green apos o incremento;
  - validacoes executadas neste ciclo: backend `npm run typecheck`; frontend `yarn typecheck:p1`, `yarn lint`, `yarn test:e2e:critical`.
- Proximo passo recomendado:
  - executar trilho pre-release T-1/T-0 (configs live de captcha/analytics/pixels + evidencia operacional);
  - fechar o proximo incremento de observabilidade no control plane (health-check de conectividade live com providers externos + alertas operacionais).

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
