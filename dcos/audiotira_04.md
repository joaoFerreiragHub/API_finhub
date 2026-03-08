# AUDITORIA_04 - Guia Unico de Execucao

Data: 2026-03-08
Escopo: API_finhub + FinHub-Vite

## 1) Objetivo

Este ficheiro e a fonte unica de estado, decisao e ordem de execucao.
A release final so fecha quando todos os blocos P4 e P5 deste guia estiverem implementados.
O P6 (AI/MCP) faz parte do plano estrategico, mas nao bloqueia esta release.

## 2) Estado tecnico atual (O1-O3)

- O1-01 a O1-07: concluido.
- O1-08: em_curso (falta validacao final de moderation pre-release com ambiente real).
- O1-09: concluido.
- O2-01 a O2-12: concluido.
- O3-01 a O3-08: concluido.

## 3) Bloqueio imediato

Executar com sucesso:

```bash
npm run test:moderation:pre-release
```

Variaveis obrigatorias em ambiente real:

1. MODERATION_SMOKE_ADMIN_EMAIL
2. MODERATION_SMOKE_ADMIN_PASSWORD
3. MODERATION_SMOKE_REPORTER_EMAIL
4. MODERATION_SMOKE_REPORTER_PASSWORD
5. MODERATION_SMOKE_TARGET_TYPE
6. MODERATION_SMOKE_TARGET_ID
7. opcional: MODERATION_SMOKE_REPORT_REASON

## 4) Escopo obrigatorio pre-release final (P4 + P5)

A lista abaixo passa a ser obrigatoria para release final.
Enquanto um item estiver aberto, nao existe fecho de release.

| Bloco | Ficheiro | Estado atual | Obrigatorio para release final |
|---|---|---|---|
| P4.2 | dcos/P4_MODERATION_CONTROL_PLANE.md | em_curso | Sim |
| P4.3-4.5 | dcos/P4_3_4_5_BACKOFFICE_NEGOCIO.md | planeado | Sim |
| P5 pre-beta | dcos/P5_PRE_BETA_PLATAFORMA.md | em_curso | Sim |
| P5 marcas | dcos/P5_MARCAS_ENTIDADES.md | proposto | Sim |
| P5 criadores | dcos/P5_CRIADORES_CONTEUDO.md | proposto | Sim |
| P5 ferramentas | dcos/P5_FERRAMENTAS_AUDIT_E_NOVAS.md | proposto | Sim |
| P5 FIRE | dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md | proposto | Sim |
| P5 hub pessoal | dcos/P5_VISAO_HUB_FINANCEIRO_PESSOAL.md | proposto | Sim |
| P5 educacao | dcos/P5_EDUCACAO_LITERACIA.md | proposto | Sim |
| P5 comunidade | dcos/P5_COMUNIDADE_SOCIAL.md | proposto | Sim |
| P5 contexto | dcos/P5_CONTEXTO_MERCADO.md | proposto | Sim |
| P5 accountability | dcos/P5_ACCOUNTABILITY_GAMIFICACAO.md | proposto | Sim |

## 5) Ordem de execucao daqui para a frente

1. Fechar O1-08 (smoke moderation pre-release real).
2. Fechar P4_MODERATION_CONTROL_PLANE.
3. Executar P4_3_4_5_BACKOFFICE_NEGOCIO.
4. Executar P5_PRE_BETA_PLATAFORMA.
5. Executar os restantes P5 por prioridade de produto e dependencia tecnica.
6. No fim do ciclo, executar smoke de documentacao e release-gate estrito.
7. Evoluir P6 em paralelo, sem desviar foco das prioridades funcionais de P4/P5.

## 6) Regra de encerramento por ficheiro

Cada ficheiro P4/P5 so pode ser marcado como concluido quando tiver:

1. implementacao tecnica backend/frontend relevante;
2. validacao tecnica minima (typecheck e testes aplicaveis);
3. atualizacao desta auditoria com estado e evidencias;
4. commit dedicado;
5. movimento do ficheiro concluido para `dcos/done/`.

## 7) Criterio de Go/No-Go final

Go-live final permitido apenas quando:

1. todos os ficheiros P4/P5 listados na secao 4 estiverem concluido;
2. todos esses ficheiros estiverem movidos para `dcos/done/`;
3. este ficheiro (`dcos/audiotira_04.md`) mostrar 100% fechado.

## 8) Trilha P6 - AI/MCP (nao bloqueante para esta release)

Objetivo:

- preparar a plataforma para contexto AI, agentes e automacao assistida;
- manter foco legal em contexto/explicacao/cenarios hipoteticos;
- proibir recomendacao financeira personalizada e call-to-action de investimento.

Estado e regra nesta auditoria:

| Bloco | Ficheiro | Estado atual | Obrigatorio para release final |
|---|---|---|---|
| P6 AI/MCP | dcos/P6_MCP_AI_CONTEXTO_AGENTES.md | planeado | Nao |
| P6 Setup Tecnico | dcos/P6_SETUP_TECNICO_ESCALABILIDADE.md | em_curso | Nao |

## 9) Smoke de documentacao (obrigatorio no fim do pre-release)

Executar no backend API_finhub:

```bash
npm run test:docs:smoke
```

Resultado esperado durante implementacao em curso:

- valida coerencia de estados, paths e scripts documentados;
- pode passar mesmo com itens obrigatorios ainda abertos.

```bash
npm run test:docs:release-gate
```

Resultado esperado para fecho final:

- so passa quando todos os itens obrigatorios da secao 4 estiverem concluidos;
- so passa quando todos esses itens estiverem em `dcos/done/`.

Integracao CI/CD:

- `test:docs:smoke` corre no workflow de CI em cada push/PR;
- `test:docs:release-gate` pode ser exigido no deploy definindo `RELEASE_DOCS_GATE=true` em `Repository Variables`.

## 10) Fontes historicas consolidadas

- dcos/done/LISTA_IMPLEMENTACOES_A_FAZER.md
- dcos/done/ROADMAP_BETA_EXECUCAO.md
- dcos/done/ROADMAP_BETA.md
- dcos/done/RUNBOOK_MODERATION_PRE_RELEASE.md
- dcos/done/AUDITORIA_FINAL_O3.md
- dcos/done/RUNBOOK_RELEASE_E2E_OBRIGATORIO.md

## 11) Historico

- 2026-03-08: criacao da auditoria consolidada.
- 2026-03-08: expansao de escopo para incluir todos os ficheiros P4 e P5 como obrigatorios para release final.
- 2026-03-08: adicao de smoke/release-gate de documentacao para garantir rastreabilidade e fecho completo.
- 2026-03-08: adicao do trilho P6 AI/MCP como evolucao estrategica nao bloqueante para esta release.
- 2026-03-08: adicao do trilho P6 setup tecnico para escalabilidade, clean code e DRY (em curso).
- 2026-03-08: T1.1 entregue no P6 setup tecnico (logger estruturado, contexto requestId e bridge de console no runtime).
- 2026-03-08: T1.2 core entregue no P6 setup tecnico (migracao de controladores/servicos core para eventos de logger por dominio).
- 2026-03-08: T1 concluido no P6 setup tecnico (catalogo de eventos + endpoint `/api/platform/monitoring/logging` + cobertura legacy por bridge estruturado).
- 2026-03-08: T2 concluido no P6 setup tecnico (contratos de request em rotas auth/admin + smoke `npm run test:contracts:routes`).
- 2026-03-08: T3 concluido no P6 setup tecnico (utilitario partilhado de paginacao aplicado em servicos admin/core para reduzir duplicacao).
- 2026-03-08: T4 concluido no P6 setup tecnico (novo `npm run test:technical:smoke` integrado no CI para regressao tecnica continua).
- 2026-03-08: T5 concluido no P6 setup tecnico (baseline de indices criticos + smoke `npm run test:perf:indexes`).
