# Regras de Colaboracao para Agentes (API_finhub)

Data: 2026-03-23
Escopo: backend `API_finhub` + frontend `FinHub-Vite` quando aplicavel.

## MUST READ (OBRIGATORIO PARA TODOS OS AGENTES)

Antes de iniciar qualquer tarefa, ler esta secao e executar sem excecoes:

1. Nao fechar ponto sem os 3 artefactos: implementacao + docs + commit.
2. Nao deixar alteracoes pendentes ao terminar um ponto (working tree limpo).
3. Quando um ponto fica concluido, mover o ficheiro respetivo para `dcos/done/` no mesmo ciclo (regra valida para `API_finhub` e `FinHub-Vite`).
4. Manter em `dcos/finhub/` apenas documentacao activa e relevante (fonte de verdade).
5. Atualizar `dcos/finhub/TASKS.md` no mesmo ciclo de fecho — marcar tasks concluidas e registar novas pendencias.
6. Validar sempre o minimo tecnico:
   - backend: `npm run typecheck`;
   - frontend: `npm run typecheck:p1` (quando houver alteracoes frontend).
7. Registar em docs qualquer limitacao de validacao que nao possa ser executada.
8. Tudo o que depender de ambiente real/live fica marcado como pre-release (T-1/T-0), com evidencia.
9. Nao reverter nem apagar alteracoes do utilizador sem confirmacao explicita.
10. Em handoff, reportar obrigatoriamente: entregue, ficheiros, validacoes, commit e proximo passo.
11. Atualizar sempre o bloco `Checkpoint de Retoma` deste ficheiro no fim de cada ciclo com commit/push.
12. FECHO DE CICLO — Codex (obrigatorio no mesmo commit do prompt):
    a. `TASKS.md`: marcar a task deste prompt como ✅ na linha correcta; registar novas pendencias descobertas.
    b. `PROMPTS_EXECUCAO.md`: alterar header do prompt executado de ⏳ para `✅ VALIDADO [data]`.
    c. Nao fechar o ciclo sem estes dois ficheiros actualizados. Relatorio sem FECHO DE CICLO e invalido.
13. FECHO DE CICLO — Claude (apos validar o relatorio do Codex):
    a. `AI_CONTEXT.md`: actualizar seccoes 7/8 se o estado mudou significativamente.
    b. `regras.md` Checkpoint de Retoma: actualizar data, estado git e proximo passo.
    c. Se o Codex registou itens novos em TASKS.md: verificar que estao no lugar certo e sao accionaveis.

## Checkpoint de Retoma (ATUALIZAR EM TODO O FECHO)

Ultima atualizacao: 2026-03-26

- Estado git: `API_finhub/main` — todos os prompts Codex executados; features P1–P11 + V1.x + LEGAL + SEC + COMMUNITY fechados.
- Onde ficamos:
  - **PRATICAMENTE FECHADO PARA LANCAMENTO.** Todas as features e bugs conhecidos resolvidos.
  - Docs reorganizados 2026-03-26: ROADMAP.md, SSR_VIKE_FIXES.md, FINHUB_DOCUMENTACAO_CRITICA.md, FINHUB_OPERATING_SYSTEM.md movidos para `dcos/done/`.
  - SYSTEMS_INDEX.md atualizado (removidos refs a docs arquivados; estado de desenvolvimento correcto).
  - TASKS.md: "Sequencia de Execucao" reescrita com estado real — P9.x/CLEANUP/V1.x todos mostrados como concluidos.
  - CLEANUP-04 adicionado: ficheiros OpenClaw na raiz de API_finhub/ (pendente).
  - RUNBOOK precisa de reescrita (refs a ficheiros movidos para done/).
- Proximo passo recomendado:
  - **Accoes humanas obrigatorias (Joao):** assinar DPIA (seccao 8), preencher telemovel de emergencia em BREACH_RESPONSE_PLAN.md, preencher [email do fundador] nos 3 documentos legais.
  - **Infra/deploy:** MongoDB nao exposto, HTTPS enforced, variaveis de ambiente em prod, backups MongoDB.
  - **Claude:** reescrever RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md + executar CLEANUP-04.
  - **V1.4 bloqueado:** aguarda conta Cloudinary (Joao).

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
   - manter em `dcos/finhub/` apenas documentacao activa;
   - atualizar `dcos/finhub/TASKS.md` no mesmo ciclo de fecho.
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

1. `dcos/finhub/` e a fonte de verdade activa — ver estrutura completa em `SYSTEMS_INDEX.md`.
2. Ao fechar ponto:
   - atualizar o doc do sistema afectado (ex: AUTH.md, COMMUNITY.md);
   - marcar ✅ em `TASKS.md` o que foi concluido;
   - listar validacoes executadas.
3. Riscos de pre-release devem ficar anotados explicitamente em `TASKS.md` e no doc relevante.
4. Novos sistemas ou guias devem seguir o standard em `DOC_STANDARD.md`.

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

## 10) Ciclo de vida dos documentos de trabalho (obrigatorio)

Para manter contexto maximo entre agentes, os documentos devem estar sempre no estado correcto:

1. Feito (o que ja fizemos):
   - quando um P/fase fica concluido, o ficheiro deve ser movido para `dcos/done/`;
   - o movimento deve ser feito no mesmo ciclo de fecho + commit.
2. Em curso e planeado (fonte de verdade activa):
   - `dcos/finhub/` contem toda a documentacao activa;
   - `TASKS.md` e o backlog centralizado — todas as tasks pendentes e em curso;
   - `MASTER_CONTEXT.md` e o panorama completo do projecto.
3. Futuro (o que vamos fazer):
   - qualquer ideia de nova feature ou task deve ser registada em `dcos/finhub/TASKS.md` (secao adequada: 🔴 Beta / 🟡 v1.0 / 🟢 Pos-v1.0).

Regra de ouro:
1. Nao misturar em `dcos/finhub/` docs de fases ja concluidas — devem ir para `dcos/done/`.
2. `dcos/finhub/TASKS.md` e a unica fonte de verdade para o backlog.

Checklist obrigatoria de fecho (executar sempre):
1. ponto implementado e validado;
2. docs actualizadas (sistema relevante + TASKS.md);
3. ficheiro do ponto movido para `dcos/done/` quando concluido;
4. `TASKS.md` sincronizado com o novo estado (marcar ✅ o que fechou);
5. commit realizado sem deixar pendencias.
