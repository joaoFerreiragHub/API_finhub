# Regras de Colaboracao para Agentes (API_finhub)

Data: 2026-03-06
Escopo: backend `API_finhub` + frontend `FinHub-Vite` quando aplicavel.

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


