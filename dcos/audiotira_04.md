# AUDITORIA_04 - Guia Unico de Execucao

Data: 2026-03-08
Escopo: API_finhub + FinHub-Vite

## 1) Objetivo

Este ficheiro e a fonte unica de estado, decisao e ordem de execucao.
A release final so fecha quando todos os blocos P4 e P5 deste guia estiverem implementados.
O P6 (AI/MCP) faz parte do plano estrategico, mas nao bloqueia esta release.
O P_REVENUE_E_ADS_ESTRATEGIA reforca a diretriz de monetizacao, mas nao bloqueia esta release.

## 2) Estado tecnico atual (O1-O3)

- O1-01 a O1-07: concluido.
- O1-08: em_curso (falta validacao final de moderation pre-release com ambiente real).
- O1-09: concluido.
- O2-01 a O2-12: concluido.
- O3-01 a O3-08: concluido.

## 3) Bloqueio de pre-release (T-1/T-0)

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

Regra operacional:

- este teste e `live-only` (contas reais + ambiente real) e deve ser executado no dia de live beta testing (janela T-1/T-0);
- durante implementacao diaria, o item permanece `em_curso` sem bloquear os restantes pontos P4/P5;
- o fecho final da release continua dependente da evidencia deste smoke.

## 4) Escopo obrigatorio pre-release final (P4 + P5)

A lista abaixo passa a ser obrigatoria para release final.
Enquanto um item estiver aberto, nao existe fecho de release.

| Bloco | Ficheiro | Estado atual | Obrigatorio para release final |
|---|---|---|---|
| P4.2 | dcos/P4_MODERATION_CONTROL_PLANE.md | em_curso | Sim |
| P4.3-4.5 | dcos/P4_3_4_5_BACKOFFICE_NEGOCIO.md | em_curso | Sim |
| P5 pre-beta | dcos/P5_PRE_BETA_PLATAFORMA.md | em_curso | Sim |
| P5 marcas | dcos/P5_MARCAS_ENTIDADES.md | em_curso | Sim |
| P5 criadores | dcos/P5_CRIADORES_CONTEUDO.md | proposto | Sim |
| P5 ferramentas | dcos/P5_FERRAMENTAS_AUDIT_E_NOVAS.md | proposto | Sim |
| P5 FIRE | dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md | proposto | Sim |
| P5 hub pessoal | dcos/P5_VISAO_HUB_FINANCEIRO_PESSOAL.md | proposto | Sim |
| P5 educacao | dcos/P5_EDUCACAO_LITERACIA.md | proposto | Sim |
| P5 comunidade | dcos/P5_COMUNIDADE_SOCIAL.md | proposto | Sim |
| P5 contexto | dcos/P5_CONTEXTO_MERCADO.md | proposto | Sim |
| P5 accountability | dcos/P5_ACCOUNTABILITY_GAMIFICACAO.md | proposto | Sim |

## 5) Ordem de execucao daqui para a frente

1. Fechar P4_MODERATION_CONTROL_PLANE.
2. Executar P4_3_4_5_BACKOFFICE_NEGOCIO.
3. Executar P5_PRE_BETA_PLATAFORMA.
4. Executar os restantes P5 por prioridade de produto e dependencia tecnica.
5. No fim do ciclo, executar smoke de documentacao e release-gate estrito.
6. Executar O1-08 (`npm run test:moderation:pre-release`) na janela live-only de pre-release (T-1/T-0).
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

## 7.1) Diretriz transversal de monetizacao e publicidade

Estas regras passam a ser referencia obrigatoria para P4.4/P5:

1. Separar `role` de `plan/entitlement`:
   - `role` define permissoes operacionais;
   - `entitlement` define acesso premium e politica de anuncios.
2. `creator` e `admin` nao recebem premium/no-ads por defeito.
3. Premium remove apenas anuncios externos (`external_ads`), nao todos os formatos patrocinados.
4. Free nao usa popups/interstitials; publicidade apenas em slots nao intrusivos de layout.
5. Publicidade deve ser financeira/contextual; sem relevancia, nao servir anuncio.
6. Implementar mapa de slots por superficie com limites de fadiga, sobretudo para pagantes.
7. Dashboards dedicados:
   - admin (governanca, aprovacoes, receita, inventory map);
   - marcas (campanhas e performance);
   - criadores (patrocinios/campanhas e performance).

## 8) Trilha P6 - AI/MCP (nao bloqueante para esta release)

Objetivo:

- preparar a plataforma para contexto AI, agentes e automacao assistida;
- manter foco legal em contexto/explicacao/cenarios hipoteticos;
- proibir recomendacao financeira personalizada e call-to-action de investimento.

Estado e regra nesta auditoria:

| Bloco | Ficheiro | Estado atual | Obrigatorio para release final |
|---|---|---|---|
| P6 AI/MCP | dcos/P6_MCP_AI_CONTEXTO_AGENTES.md | planeado | Nao |
| P6 Setup Tecnico | dcos/P6_SETUP_TECNICO_ESCALABILIDADE.md | concluido | Nao |

## 8.1) Trilha Revenue e Ads (nao bloqueante para esta release)

| Bloco | Ficheiro | Estado atual | Obrigatorio para release final |
|---|---|---|---|
| P Revenue/Ads | dcos/P_REVENUE_E_ADS_ESTRATEGIA.md | planeado | Nao |

Guardrails obrigatorios nesta trilha:

1. qualquer formato patrocinado deve manter label explicito (`Patrocinado`, `Dados patrocinados`, `Sugestao patrocinada`), mesmo quando e nativo/contextual.
2. modelos de revenue baseados em dados (`Data Insights as a Service`) exigem consentimento/opt-out, agregacao forte e cumprimento RGPD antes de ativacao comercial.
3. white-label/embed deve evitar segredos em URL; preferir token assinado de curta duracao e allowlist de dominios.

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
- 2026-03-08: T6 concluido no P6 setup tecnico (guardas de seguranca em runtime + checklist operacional + smoke `npm run test:security:smoke`).
- 2026-03-08: P4 evoluido com novos alertas operacionais (`content_jobs_stale_backlog`, `content_jobs_retry_spike`, `false_positive_spike`) e thresholds configuraveis por env.
- 2026-03-08: P4.3-04 iniciou execucao com backend MVP de templates de moderacao (modelo versionado + endpoints admin + RBAC/auditoria).
- 2026-03-08: P4.3-01 iniciou execucao com backend MVP de paywall/acesso (modelo `ContentAccessPolicy`, preview de impacto e endpoints admin com RBAC/auditoria).
- 2026-03-08: P4.3-02 iniciou execucao com backend MVP de subscricoes/planos (modelo `UserSubscription`, endpoints admin, timeline/versionamento e acoes controladas com motivo obrigatorio).
- 2026-03-08: P4.3-03 iniciou execucao com backend MVP de workflow de apelacoes (modelo `ModerationAppeal`, endpoints user/admin, SLA e transicoes de estado auditaveis).
- 2026-03-08: P4.3-05 iniciou execucao com backend MVP de comunicacoes admin por segmento (modelo `AdminBroadcast`, preview de audiencia, aprovacao massiva e envio in-app por lotes).
- 2026-03-08: P4.4-03 iniciou execucao com backend MVP de anuncios/partnerships (modelos `AdSlotConfig` e `AdCampaign`, inventory overview e endpoints admin para slots/campanhas).
- 2026-03-08: P4.4-01 iniciou execucao com backend MVP de analytics positivos de creators (leaderboard por crescimento/engagement, trust side-by-side e export CSV no admin).
- 2026-03-08: P4.4-02 iniciou execucao com backend MVP de financial tools (feature flags por ferramenta, limites/experiencia por ambiente e metricas de uso por tool/vertical).
- 2026-03-08: P4.5-01 iniciou execucao com backend MVP de dashboard personalizavel por admin (catalogo de widgets por escopo, layout/preset/filtros e reset versionado).
- 2026-03-08: P4.5-02 iniciou execucao com backend MVP de bulk import CSV operacional (modelo `AdminBulkImportJob`, preview por linha e execucao com jobs para subscricoes e campanhas).
- 2026-03-08: P4.5-03 iniciou execucao com backend MVP de acoes agendadas (suporte `scheduledFor` em `AdminContentJob`, endpoint de agendamento de unhide e worker com fila future-aware).
- 2026-03-08: P4.5-04 iniciou execucao com backend MVP de delegacao temporaria de scopes (modelo `AdminScopeDelegation`, endpoints admin e integracao no `requireAdminScope` para RBAC com expiracao automatica).
- 2026-03-08: P4.5-05 iniciou execucao com backend MVP de dark mode admin (tema `system|light|dark` na personalizacao de dashboard com fallback de compatibilidade).
- 2026-03-08: hardening P4.5-04/P4.5-05 concluido para cenarios nao cobertos (dashboard passou a considerar scopes delegados ativos e revogacao de delegacao atualiza `purgeAt` de retencao).
- 2026-03-08: hardening tecnico adicional concluido (remocao de indices duplicados no modelo `User` para eliminar warnings recorrentes de bootstrap/CI).
- 2026-03-08: formalizada diretriz de monetizacao/ads (premium sem `external_ads`, sem popups para free, anuncios financeiros/contextuais e dashboards dedicados para admin/marcas/criadores).
- 2026-03-08: integrada trilha estrategica `P_REVENUE_E_ADS_ESTRATEGIA.md` na auditoria como nao bloqueante para release, com guardrails de transparencia/compliance/seguranca.
- 2026-03-08: hardening adicional em P4.4-03 (campanhas nao-house exigem disclosure/relevancia financeira; compatibilidade de visibilidade campanha-slot e ativacao com slots ativos validada no backend).
- 2026-03-09: hardening de P4.5-02 (bulk import de campanhas passou a aplicar os mesmos guardrails de ativacao manual para evitar bypass de compliance em ads).
- 2026-03-09: adicionado smoke dedicado `npm run test:ads:guardrails` e integrado em `npm run test:technical:smoke` para proteger regressao de bypass no bulk import de campanhas.
- 2026-03-09: regra operacional atualizada: validacoes `live-only` deixam de bloquear implementacao diaria e passam para execucao obrigatoria em pre-release (janela T-1/T-0 de live beta testing).
- 2026-03-09: P4.5-01 evoluido para backend+frontend MVP completo (contratos de request no backend + UI de personalizacao/reset no dashboard admin com hooks dedicados no frontend).
- 2026-03-09: P4.5-02 evoluido para backend+frontend MVP completo (`/admin/operacoes` no frontend, tab no dashboard admin, contratos de request de bulk import no backend e smoke de rotas atualizado).
- 2026-03-09: P4.5-03 evoluido para backend+frontend MVP completo (acao de `unhide` com agendamento no frontend, backlog agendado visivel no painel operacional e contrato de request dedicado no backend para `POST /api/admin/content/:contentType/:contentId/unhide/schedule`).
- 2026-03-09: P5-MARCAS Fase 1 backend iniciado e entregue para API publica de diretorio (`GET /api/directories`, `GET /api/directories/:vertical`, `GET /api/directories/:vertical/:slug`, `GET /api/directories/featured`, `GET /api/directories/search`), com `views` no `DirectoryEntry` e suporte de `ratings/comments` via `targetType=directory_entry`.
- 2026-03-09: hardening transversal em P4.3 concluido no backend com contratos de request nas mutacoes criticas (paywall policies, appeals status, subscriptions, moderation templates e broadcasts), rotas admin atualizadas e cobertura de `npm run test:contracts:routes` expandida para 34 contratos.
- 2026-03-09: hardening de P4.4-03 concluido no backend com contratos de request para mutacoes de ads (slots e campanhas), rotas admin atualizadas e cobertura de `npm run test:contracts:routes` expandida para 40 contratos.
- 2026-03-09: hardening de P4.4-02 concluido no backend com contrato de request para `PATCH /api/admin/tools/financial/:toolKey` (validacao de `toolKey`, patch de `baseConfig/envOverrides` e motivo obrigatorio), com cobertura de `npm run test:contracts:routes` expandida para 41 contratos.
- 2026-03-09: hardening tecnico transversal concluido por deduplicacao de indexes em schemas (ads, moderation, monetizacao, preferencias e base content), com lockfiles/dependencias sincronizados (`rss-parser`) e mitigacao de ruido de index warnings em bootstrap.
- 2026-03-09: hardening de P4.5-04 concluido no backend com contratos de request para mutacoes de delegacao de scopes (`create/revoke`), incluindo validacao de `expiresAt` futuro e motivo obrigatorio, com cobertura de `npm run test:contracts:routes` expandida para 43 contratos.
- 2026-03-09: P5-MARCAS Fase 2.2 concluida no backend com novos verticais de diretorio (`insurance`, `bank`, `fund`, `fintech`, `newsletter`) e validacao centralizada a partir do model `DirectoryEntry` para APIs admin/public.
- 2026-03-09: P5-MARCAS Fase 2.3 concluida no backend com campos de entidade financeira em `DirectoryEntry` (`regulatedBy`, `licenses`, `pros`, `cons`, `keyFeatures`, `pricing`) expostos nos fluxos admin/public de diretorio.
- 2026-03-09: P5-MARCAS Fase 2.5 concluida no backend com endpoint publico `GET /api/directories/:vertical/:slug/related-content` (conteudo relacionado agregado de artigos/cursos/videos/lives/books/podcasts publicados).
- 2026-03-10: P5-MARCAS Fase 2.1 concluida no backend com unificacao operacional para `DirectoryEntry` (script `migrate:brands:directory`, desativacao de `/api/brands` no router principal e pesquisa global `type=brand` migrada para `DirectoryEntry`).
- 2026-03-10: P5-MARCAS Fase 2.6 concluida no backend com comparador publico de entidades (`GET /api/directories/compare?slugs=a,b[,c]`) e resumo de metricas comparadas por recurso.
- 2026-03-10: P5-MARCAS Fase 3.1 concluida no backend com campanhas de marca desacopladas de `Brand` (alvo resolvido via `directoryEntryId`, fallback legacy por `brandId` mapeado e scripts `migrate:ads:brand-targets`/`migrate:brands:directory` para transicao de dados).
- 2026-03-10: P5-MARCAS Fase 3.2 concluida no backend com fluxo admin de revisao de campanhas (`submit-approval`, `approve`, `reject`) e estados de campanha estendidos para `approved/rejected`.
- 2026-03-10: P5-MARCAS Fase 3.3/3.4 concluida no backend com serving publico (`GET /api/ads/serve`) e tracking idempotente (`POST /api/ads/impression`, `POST /api/ads/click`) via token assinado e agregacao de metricas em `AdCampaign`.
- 2026-03-10: P5-MARCAS Fase 3.5 concluida no backend com metricas agregadas por campanha (`GET /api/admin/ads/campaigns/:campaignId/metrics?days=30`), incluindo timeline diaria e breakdown por `slot`, `audience` e `device`.
