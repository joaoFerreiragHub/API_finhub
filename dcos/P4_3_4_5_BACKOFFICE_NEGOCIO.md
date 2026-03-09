# P4.3, P4.4, P4.5 - Backoffice de Negocio e Revenue

Data: 2026-03-06
Estado: Em curso (P4.3-01, P4.3-02, P4.3-03, P4.3-04, P4.3-05, P4.4-01, P4.4-02, P4.4-03, P4.5-04 e P4.5-05 backend MVP entregues; P4.5-01, P4.5-02 e P4.5-03 backend+frontend MVP entregues; hardening transversal de contratos de request P4.3 e P4.4-03 concluido)
Escopo: `API_finhub` + `FinHub-Vite`

## 1) Contexto

O P4.2 fechou tecnicamente o bloco de moderacao/trust and safety do admin.
O proximo salto do painel admin para "backoffice completo" deve focar as camadas de negocio e monetizacao da plataforma.

## 2) O que ja esta forte (baseline)

1. Moderacao de conteudo com queue, bulk, rollback faseado, deteccao automatica, policy engine e trust scoring.
2. Gestao de utilizadores com suspend/ban/notes/creator controls/trust profile.
3. Editorial CMS com curadoria, claims e ownership transfer.
4. Diretorios/brands com CRUD e publish/archive.
5. Kill switches por superficie para contencao rapida.
6. Permissoes admin com scopes/perfis e modelo fail-closed.
7. Auditoria administrativa completa com export CSV.
8. Metricas operacionais com KPI e drill-down.

## 3) Meta de produto apos P4.2

Fechar o gap entre:

1. "admin maduro para moderacao e operacao"
2. "backoffice self-sufficient para negocio/revenue"

## 4) Matriz consolidada

| ID | Bloco | Tema | Prioridade | Obrigatorio para release de backoffice completo |
|---|---|---|---|---|
| P4.3-01 | P4.3 | Gestao premium/paywall | Alta | Sim |
| P4.3-02 | P4.3 | Gestao de subscricoes/planos | Alta | Sim |
| P4.3-03 | P4.3 | Workflow formal de apelacao | Alta | Sim |
| P4.3-04 | P4.3 | Templates de moderacao | Media | Sim |
| P4.3-05 | P4.3 | Comunicacoes admin por segmento | Media | Sim |
| P4.4-01 | P4.4 | Analytics positivos de creators | Media | Nao |
| P4.4-02 | P4.4 | Gestao admin das financial tools | Media | Nao |
| P4.4-03 | P4.4 | Gestao de anuncios/partnerships | Media | Nao |
| P4.5-01 | P4.5 | Dashboard personalizavel por admin | Baixa | Nao |
| P4.5-02 | P4.5 | Bulk import CSV operacional | Baixa | Nao |
| P4.5-03 | P4.5 | Acoes agendadas (ex: unhide automatico) | Baixa | Nao |
| P4.5-04 | P4.5 | Delegacao temporaria de scopes | Baixa | Nao |
| P4.5-05 | P4.5 | Dark mode admin | Baixa | Nao |

## 5) P4.3 - Core de negocio (prioridade imediata)

### 5.1 P4.3-01 Gestao premium/paywall

Objetivo:
1. Permitir ao admin gerir regras de premium por tipo de conteudo e colecao.

Backend:
1. Modelo de regra de acesso (`contentAccessPolicy`) com versao e historico.
2. Endpoints admin para listar/criar/editar/ativar/desativar regras.
3. Audit log obrigatorio para qualquer alteracao de regra.

Frontend:
1. Nova area admin `Monetizacao > Paywall`.
2. Tabela de regras por vertical/tipo e estado (ativo/inativo).
3. Preview de impacto antes de publicar regra.

Estado desta iteracao:
1. backend MVP entregue com modelo versionado, historico e preview de impacto.
2. frontend admin ainda pendente para fechar este item.

Entregue no backend:
1. modelo `ContentAccessPolicy` com:
   - `code`, `label`, `description`, `active`, `priority`;
   - janela temporal (`effectiveFrom`, `effectiveTo`);
   - `match` por `contentTypes`, `categories`, `tags`, `featuredOnly`;
   - `access` por `requiredRole`, `teaserAllowed`, `blockedMessage`;
   - `version` + `history` de alteracoes.
2. endpoints admin:
   - `GET /api/admin/content/access-policies`
   - `GET /api/admin/content/access-policies/:policyId`
   - `POST /api/admin/content/access-policies/preview`
   - `POST /api/admin/content/access-policies`
   - `PATCH /api/admin/content/access-policies/:policyId`
   - `POST /api/admin/content/access-policies/:policyId/activate`
   - `POST /api/admin/content/access-policies/:policyId/deactivate`
3. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura com `admin.content.read`;
   - preview e escrita com `admin.content.moderate`.
4. preview calcula impacto por tipo de conteudo:
   - total de matches;
   - distribuicao atual `currentlyPremium` vs `currentlyFree`;
   - amostra dos conteudos afetados.
5. rate limit operacional aplicado:
   - preview com `rateLimiter.adminMetricsDrilldown`;
   - mutacoes com `rateLimiter.adminModerationAction`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`
3. `npm run checking`

Decisoes funcionais (obrigatorias para execucao de P4.4/P5):
1. Separar sempre `role` (visitor/free/creator/admin) de `plan/entitlements` (free/premium + noExternalAds).
2. `creator` nao equivale a `premium` por defeito.
3. `admin` tem escopos de gestao; nao implica entitlement premium de consumo.
4. A gestao de subscricoes admin aplica-se a utilizadores `free/premium`; `creator/admin` ficam fora deste fluxo, salvo regra explicita futura.

### 5.2 P4.3-02 Gestao de subscricoes/planos

Objetivo:
1. Dar visibilidade operacional sobre premium/trials/cancelamentos e entitlements.

Backend:
1. Endpoints admin para listagem com filtros por plano/estado/periodo.
2. Endpoint de detalhe de subscricao por user.
3. Acoes controladas (ex: extender trial, revogar entitlement, reativar) com motivo obrigatorio.

Frontend:
1. Nova area admin `Monetizacao > Subscricoes`.
2. Filtros por status (`active`, `trialing`, `past_due`, `canceled`).
3. Timeline por subscricao com historico de alteracoes.

Estado desta iteracao:
1. backend MVP entregue com modelo de subscricao admin, timeline e acoes operacionais.
2. frontend admin ainda pendente para fechar este item.

Entregue no backend:
1. modelo `UserSubscription` com:
   - ligacao 1:1 ao user;
   - plano (`planCode`, `planLabel`, `billingCycle`);
   - estado (`active`, `trialing`, `past_due`, `canceled`);
   - entitlement (`entitlementActive`) e datas (`currentPeriodStart`, `currentPeriodEnd`, `trialEndsAt`, `canceledAt`);
   - `version` + `history` de alteracoes.
2. endpoints admin:
   - `GET /api/admin/monetization/subscriptions`
   - `GET /api/admin/monetization/subscriptions/users/:userId`
   - `POST /api/admin/monetization/subscriptions/users/:userId/extend-trial`
   - `POST /api/admin/monetization/subscriptions/users/:userId/revoke-entitlement`
   - `POST /api/admin/monetization/subscriptions/users/:userId/reactivate`
3. filtros operacionais de listagem:
   - `status`, `planCode`, `periodFrom`, `periodTo`, `search`, `page`, `limit`.
4. acoes controladas com motivo obrigatorio:
   - extensao de trial;
   - revogacao de entitlement (com `nextStatus` opcional: `past_due` ou `canceled`);
   - reativacao com ciclo/plano e duracao configuravel.
5. sincronizacao com perfil do user:
   - atualiza `User.role` (`free`/`premium`) e `subscriptionExpiry` conforme a acao.
6. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura com `admin.users.read`;
   - escrita com `admin.users.write`.
7. rate limit operacional aplicado nas mutacoes via `rateLimiter.adminModerationAction`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`
3. `npm run checking`

### 5.3 P4.3-03 Workflow de apelacao

Objetivo:
1. Transformar contestacao de moderacao num fluxo estruturado, auditavel e com SLA.

Backend:
1. Modelo `moderationAppeal` com estados `open`, `under_review`, `accepted`, `rejected`, `closed`.
2. Ligacao obrigatoria ao `contentModerationEvent`.
3. SLA e timestamps (`openedAt`, `firstResponseAt`, `resolvedAt`).

Frontend:
1. Inbox de apelacoes em `/admin/apelacoes`.
2. Filtros por estado/severidade/SLA vencido.
3. Acao de decisao com motivo padronizado e anexos internos.

Estado desta iteracao:
1. backend MVP entregue com modelo de apelacao, SLA e inbox admin.
2. frontend admin/public ainda pendente para fechar este item.

Entregue no backend:
1. modelo `ModerationAppeal` com:
   - ligacao 1:1 ao `ContentModerationEvent`;
   - estados `open`, `under_review`, `accepted`, `rejected`, `closed`;
   - severidade (`low`, `medium`, `high`, `critical`) e categoria de motivo;
   - `slaHours`, `openedAt`, `firstResponseAt`, `resolvedAt`, `dueAt`;
   - `version` + `history` de transicoes.
2. endpoints de utilizador:
   - `POST /api/appeals/content`;
   - `GET /api/appeals/me`;
   - `GET /api/appeals/:appealId`.
3. endpoints admin:
   - `GET /api/admin/content/appeals`;
   - `GET /api/admin/content/appeals/:appealId`;
   - `PATCH /api/admin/content/appeals/:appealId/status`.
4. guardrails de negocio:
   - apenas owner do conteudo moderado pode abrir apelacao;
   - bloqueio de apelacao para eventos com `toStatus=visible`;
   - limite 1 apelacao por `moderationEvent`;
   - transicoes de estado validadas e auditaveis.
5. operacao admin com inbox filtravel:
   - filtros por `status`, `severity`, `contentType`, `breachedSla`, `search`;
   - resumo agregado (`open`, `underReview`, `accepted`, `rejected`, `closed`, `breachedSla`).
6. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura com `admin.content.read`;
   - decisao/atualizacao com `admin.content.moderate`.
7. rate limit operacional aplicado:
   - abertura de apelacao com `rateLimiter.userReport`;
   - mutacao admin com `rateLimiter.adminModerationAction`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run checking`
3. `npm run test:technical:smoke`

### 5.4 P4.3-04 Templates de moderacao

Objetivo:
1. Acelerar operacao e uniformizar razoes de moderacao.

Backend:
1. Catalogo versionado de templates (`code`, `label`, `reason`, `defaultNote`, `tags`).
2. Flag por template (`active`, `requiresNote`, `requiresDoubleConfirm`).

Frontend:
1. Selector de template nos dialogs de acao critica.
2. Auto-fill de `reason`/`note` com override permitido.
3. Telemetria de uso por template.

Estado desta iteracao:
1. backend MVP entregue com modelo versionado, historico e RBAC admin.
2. frontend admin ainda pendente para fechar este item.

Entregue no backend:
1. modelo `AdminModerationTemplate` com:
   - `code`, `label`, `reason`, `defaultNote`, `tags`;
   - flags `active`, `requiresNote`, `requiresDoubleConfirm`;
   - `version` + `history` de alteracoes.
2. endpoints admin:
   - `GET /api/admin/content/moderation-templates`
   - `GET /api/admin/content/moderation-templates/:templateId`
   - `POST /api/admin/content/moderation-templates`
   - `PATCH /api/admin/content/moderation-templates/:templateId`
   - `POST /api/admin/content/moderation-templates/:templateId/activate`
   - `POST /api/admin/content/moderation-templates/:templateId/deactivate`
3. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura com `admin.content.read`;
   - escrita com `admin.content.moderate`.
4. rate limit operacional aplicado nas mutacoes via `rateLimiter.adminModerationAction`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`

### 5.5 P4.3-05 Comunicacoes admin por segmento

Objetivo:
1. Permitir comunicacoes operacionais sem depender de campanhas manuais fora da plataforma.

Backend:
1. Modelo `adminBroadcast` com alvo por segmento.
2. Endpoint de dry-run para validar audiencia estimada.
3. Aprovacao dupla para envios massivos.

Frontend:
1. Area `Comunicacoes` com composer e preview.
2. Segmentacao por role/plano/atividade.
3. Historico de envios e taxa de entrega.

Estado desta iteracao:
1. backend MVP entregue com modelo de broadcast, preview de audiencia e fluxo de aprovacao/envio.
2. frontend admin ainda pendente para fechar este item.

Entregue no backend:
1. modelo `AdminBroadcast` com:
   - estado (`draft`, `approved`, `sent`, `failed`, `canceled`);
   - segmentacao por `roles`, `accountStatuses`, `includeUsers`, `excludeUsers`, `lastActiveWithinDays`;
   - trilho de aprovacao (`approval.required`, `approvedBy`, `approvedAt`, `reason`);
   - trilho de entrega (`attempted`, `sent`, `failed`, `sentAt`, `lastError`);
   - `version` + `history` de operacoes.
2. endpoints admin:
   - `GET /api/admin/communications/broadcasts`;
   - `GET /api/admin/communications/broadcasts/:broadcastId`;
   - `POST /api/admin/communications/broadcasts/preview`;
   - `POST /api/admin/communications/broadcasts`;
   - `POST /api/admin/communications/broadcasts/:broadcastId/approve`;
   - `POST /api/admin/communications/broadcasts/:broadcastId/send`.
3. dry-run de audiencia (`preview`) com:
   - estimativa de alcance;
   - amostra de utilizadores alvo;
   - flag de exigencia de aprovacao massiva.
4. aprovacao dupla para envios massivos:
   - threshold configuravel via `ADMIN_BROADCAST_MASS_APPROVAL_MIN_RECIPIENTS`;
   - criador nao pode auto-aprovar broadcast quando `approval.required=true`.
5. envio in-app com persistencia em notificacoes:
   - cria notificacoes por lote para audiencia segmentada;
   - guarda metrica de entrega e erro em `delivery`.
6. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura/preview com `admin.users.read`;
   - criacao/aprovacao/envio com `admin.users.write`.
7. rate limit operacional aplicado:
   - preview com `rateLimiter.adminMetricsDrilldown`;
   - criacao/aprovacao com `rateLimiter.adminModerationAction`;
   - envio com `rateLimiter.adminModerationBulk`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`

### 5.6 Hardening transversal de contratos de request (P4.3)

Objetivo:
1. Fechar gap de validacao de payload/params nas mutacoes criticas P4.3 antes de evoluir frontend.

Entregue no backend:
1. novos contratos de request em `src/middlewares/requestContracts.ts` para:
   - `content/access-policies` (preview/create/update/activate/deactivate);
   - `content/appeals/:appealId/status`;
   - `monetization/subscriptions/users/:userId` (extend-trial/revoke-entitlement/reactivate);
   - `content/moderation-templates` (create/update/activate/deactivate);
   - `communications/broadcasts` (preview/create/approve/send).
2. ligacao desses contratos nas rotas correspondentes em `src/routes/admin.routes.ts`.
3. reforco do gate de regressao em `scripts/test-route-contracts.js`, expandindo cobertura para 34 contratos.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:contracts:routes`
3. `npm run test:docs:smoke`

## 6) P4.4 - Expansao operacional

### 6.1 P4.4-01 Analytics positivos de creators

1. Top creators por crescimento e engagement.
2. Metrica positiva lado a lado com risk/trust para decisoes editoriais.
3. Export CSV para planeamento de curadoria.

Estado desta iteracao:
1. backend MVP entregue com leaderboard de creators por crescimento/engagement e export CSV.
2. frontend admin (visualizacoes/dashboards) ainda pendente para fechar este item.

Entregue no backend:
1. endpoints admin:
   - `GET /api/admin/creators/analytics/positive`;
   - `GET /api/admin/creators/analytics/positive/export.csv`.
2. metricas positivas por creator:
   - crescimento de follows e publicacao por janela;
   - score de crescimento e score de engagement;
   - breakdown de conteudo por tipo e engagement agregado.
3. trust lado-a-lado:
   - `trustScore`, `riskLevel`, `recommendedAction`;
   - `openReports`, `highPriorityTargets`, `criticalTargets`, `falsePositiveRate30d`.
4. filtros e ordenacao operacionais:
   - `search`, `accountStatus`, `riskLevel`;
   - `sortBy` (`growth`, `engagement`, `followers`, `trust`) e `sortOrder`.
5. export CSV para curadoria/operacao com limite de linhas configuravel.
6. auditoria administrativa e `requireAdminScope` aplicados com `admin.metrics.read`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`

### 6.2 P4.4-02 Gestao admin das financial tools

1. Feature flags por ferramenta (stocks, REIT, ETF, crypto).
2. Metricas de uso por tool e por vertical.
3. Configuracao de limites/experiencias por ambiente.

Estado desta iteracao:
1. backend MVP entregue com control plane admin para financial tools e tracking de uso por vertical.
2. frontend admin (UI de operacao/dashboard) ainda pendente para fechar este item.

Entregue no backend:
1. modelos novos:
   - `FinancialToolControl` (feature flags, limites, experiencia e overrides por ambiente com historico);
   - `FinancialToolUsageDaily` (contadores diarios por `tool`, `vertical` e `environment`).
2. endpoints admin:
   - `GET /api/admin/tools/financial`;
   - `PATCH /api/admin/tools/financial/:toolKey`;
   - `GET /api/admin/tools/financial/usage`.
3. regras de governanca:
   - motivo obrigatorio para mutacoes;
   - versionamento + trilho historico por alteracao;
   - config efetiva calculada por ambiente (`development`, `staging`, `production`).
4. runtime de ferramentas financeiras:
   - middleware de feature flag em `/api/stocks`, `/api/etfs`, `/api/reits`, `/api/crypto`;
   - bloqueio com `503` quando ferramenta desativada;
   - guardrail de `maxSymbolsPerRequest` aplicado em runtime.
5. telemetria operacional:
   - tracking de uso em background por request (sucesso/erro/autenticado/latencia);
   - agregacao de metricas por ferramenta e por vertical para analise admin.
6. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura com `admin.metrics.read`;
   - escrita com `admin.content.moderate`.
7. rate limit operacional aplicado:
   - leitura com `rateLimiter.adminMetricsDrilldown`;
   - mutacao com `rateLimiter.adminModerationAction`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`

### 6.3 P4.4-03 Gestao de anuncios/partnerships

1. Inventario de placements e parceiros.
2. Estado contratual e janela de campanha.
3. Regras de visibilidade e prioridade por superficie.
4. Tipologia de anuncios obrigatoria:
   - `external_ads` (rede externa: adsense, etc.);
   - `sponsored_ads` (campanhas de marcas/criadores dentro da plataforma);
   - `house_ads` (promocoes internas).
5. Regra premium:
   - premium remove `external_ads`;
   - premium nao remove automaticamente `sponsored_ads`/`house_ads` em slots dedicados e nao intrusivos.
6. Regra free:
   - proibidos popups/interstitials;
   - ads apenas em zonas de bordo/layout (ex: lateral, footer, blocos dedicados no feed), sem bloquear tarefas.
7. Regra de relevancia:
   - anuncios devem ser financeiros/contextuais;
   - se nao houver campanha relevante para o contexto, nao servir anuncio.
8. Governanca de superficies:
   - definir mapa de slots permitidos por pagina/superficie;
   - incluir zonas dedicadas em perfil do user e paginas especificas;
   - limitar carga publicitaria para experiencia premium (baixa fadiga).
9. Dashboards obrigatorios:
   - admin: inventory map, aprovacoes, performance e revenue;
   - marca: campanhas, gasto, CTR/conversao, placements ativos;
   - criador: campanhas proprias, patrocinio e performance por placement.

Estado desta iteracao:
1. backend MVP entregue com inventario de slots, campanhas e governanca operacional no admin.
2. frontend admin (dashboards/workflows visuais) ainda pendente para fechar este item.

Entregue no backend:
1. modelos:
   - `AdSlotConfig` para inventario de placements por superficie/posicao/device;
   - `AdCampaign` para campanhas/parcerias com estado, janela, sponsor e target.
2. endpoints admin:
   - `GET /api/admin/ads/inventory/overview`;
   - `GET /api/admin/ads/slots`;
   - `POST /api/admin/ads/slots`;
   - `PATCH /api/admin/ads/slots/:slotId`;
   - `GET /api/admin/ads/campaigns`;
   - `GET /api/admin/ads/campaigns/:campaignId`;
   - `POST /api/admin/ads/campaigns`;
   - `PATCH /api/admin/ads/campaigns/:campaignId`;
   - `POST /api/admin/ads/campaigns/:campaignId/activate`;
   - `POST /api/admin/ads/campaigns/:campaignId/pause`.
3. regras de negocio aplicadas no backend:
   - `external_ads` bloqueado para visibilidade premium/all (campanha e slot);
   - validacao de compatibilidade entre `adType` da campanha e `allowedTypes` dos slots;
   - validacao de janela `startAt/endAt` para ativacao.
4. overview operacional:
   - cobertura de slots por superficie (total/ativo);
   - campanhas por tipo e campanhas ativas por superficie.
5. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura com `admin.content.read`;
   - mutacoes com `admin.content.moderate`.
6. rate limit operacional aplicado nas mutacoes via `rateLimiter.adminModerationAction`.
7. hardening de compliance/relevancia aplicado:
   - `disclosureLabel` explicito para campanhas nao-`house_ads`;
   - campanhas nao-`house_ads` exigem `relevanceTags` financeiras/contextuais;
   - compatibilidade `visibleTo` entre campanha e slot validada para evitar inventario inviavel;
   - ativacao valida slots existentes/ativos e guardrails de disclosure/relevancia.
8. hardening de contratos de request aplicado nas mutacoes de ads:
   - `POST /api/admin/ads/slots`
   - `PATCH /api/admin/ads/slots/:slotId`
   - `POST /api/admin/ads/campaigns`
   - `PATCH /api/admin/ads/campaigns/:campaignId`
   - `POST /api/admin/ads/campaigns/:campaignId/activate`
   - `POST /api/admin/ads/campaigns/:campaignId/pause`
   - cobertura de `npm run test:contracts:routes` expandida para 40 contratos.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`
3. `npm run test:contracts:routes`

## 7) P4.5 - Opcional (produtividade/UX)

1. Dashboard personalizavel por admin.
2. Bulk import CSV para operacoes repetitivas.
3. Acoes agendadas (ex: unhide automatico apos periodo definido).
4. Delegacao temporaria de scopes com expiracao automatica.
5. Dark mode admin.

### 7.1 P4.5-01 Dashboard personalizavel por admin

Estado desta iteracao:
1. backend+frontend MVP entregue com personalizacao de dashboard por admin autenticado.
2. builder visual completo de layout (drag-and-drop) fica para iteracao futura de UX.

Entregue no backend:
1. modelo novo:
   - `AdminDashboardPreference` com `preset`, `layout`, `pinnedFilters`, `density`, `refreshSeconds`, `version` e `history`.
2. endpoints admin:
   - `GET /api/admin/dashboard/personalization`;
   - `PATCH /api/admin/dashboard/personalization`;
   - `POST /api/admin/dashboard/personalization/reset`.
3. capacidades de personalizacao:
   - catalogo de widgets com `requiredScopes` e `dataEndpoint` por widget;
   - presets `operations`, `moderation`, `monetization` e `custom`;
   - guardrails de layout (deduplicacao, limites de widgets, colunas, dimensoes e ordem);
   - filtros fixados (`pinnedFilters`) e densidade (`comfortable|compact`).
4. governanca operacional:
   - preferencia isolada por admin (1:1 com user);
   - trilho historico versionado com `action` (`created|updated|reset`) e snapshot completo;
   - reset controlado para preset base.
5. auditoria administrativa e `requireAdminScope` aplicados com `admin.metrics.read`.
6. rate limit operacional aplicado com `rateLimiter.adminMetricsDrilldown`.

Entregue no frontend:
1. novo cliente admin para personalizacao:
   - `useAdminDashboardPersonalization` (query);
   - `useUpdateAdminDashboardPersonalization` (patch);
   - `useResetAdminDashboardPersonalization` (reset).
2. `AdminDashboardPage` evoluida com:
   - card de resumo de preferencia ativa (preset, densidade, tema, refresh, widgets, filtros);
   - dialog de configuracao para `preset`, `density`, `theme`, `refreshSeconds`, `reason` e `note`;
   - acao de reset para preset base diretamente no dashboard.
3. guardrails de UX:
   - escrita bloqueada em modo `adminReadOnly`;
   - validacao local de `refreshSeconds` (30-3600) para evitar requests invalidos;
   - envio de patch apenas com campos alterados para evitar conflitos `409` sem alteracoes.

Validacao desta iteracao:
1. backend: `npm run typecheck`
2. backend: `npm run test:contracts:routes`
3. frontend: `npm run typecheck:p1`

### 7.2 P4.5-02 Bulk import CSV operacional

Objetivo:
1. Reduzir esforco manual em operacoes repetitivas de monetizacao e ads.

Backend:
1. Pipeline de preview de CSV com validacao por linha.
2. Execucao de job com dry-run ou aplicacao efetiva, com trilho de auditoria.
3. Persistencia do historico de jobs com resumo, warnings, erros e resultados por linha.

Frontend:
1. Area admin `Operacoes > Bulk Import` (ainda pendente).
2. Upload/cola de CSV com preview antes de executar.
3. Consulta de jobs recentes com detalhe de erros por linha.

Estado desta iteracao:
1. backend+frontend MVP entregue com jobs de bulk import, preview e execucao.
2. UX de importacao massiva assistida (wizard/drag-drop) fica para iteracao futura.

Entregue no backend:
1. modelo novo `AdminBulkImportJob` com:
   - `importType` (`subscription_entitlements` e `ad_campaign_status`);
   - `status` (`running`, `completed`, `completed_with_errors`, `failed`);
   - `source`, `summary`, `stats`, `warnings`, `errorRows`, `results`;
   - `startedAt`, `finishedAt` e `expiresAt` para retencao operacional.
2. servico `adminBulkImport.service` com:
   - parser CSV (suporte de delimitador e campos quoted);
   - preview com planeamento por linha (`valid`, `invalid`, `skipped`);
   - execucao com contadores, limite de erros/resultados armazenados e mapa de saida para API.
3. fluxos suportados:
   - `subscription_entitlements`: cria/atualiza `UserSubscription` e sincroniza `User.role` + `subscriptionExpiry`;
   - `ad_campaign_status`: atualiza `AdCampaign` (estado, prioridade, janela) com entrada no historico.
4. endpoints admin:
   - `GET /api/admin/operations/bulk-import/jobs`
   - `GET /api/admin/operations/bulk-import/jobs/:jobId`
   - `POST /api/admin/operations/bulk-import/preview`
   - `POST /api/admin/operations/bulk-import/jobs`
5. auditoria administrativa e `requireAdminScope` aplicados:
   - leitura com `admin.users.read`;
   - preview/escrita com `admin.users.write`.
6. rate limit operacional aplicado:
   - preview e execucao com `rateLimiter.adminModerationBulk`.
7. guardrails de ads aplicados tambem no fluxo de bulk import:
   - bloqueio de ativacao quando campanha viola disclosure/relevancia financeira;
   - bloqueio quando slots associados estao inativos/incompativeis ou inexistentes;
   - preview/dry-run passam a sinalizar estas violacoes antes da execucao.

Entregue no frontend:
1. nova area admin `Operacoes` com rota dedicada `/admin/operacoes`.
2. fluxo operacional completo:
   - composer CSV com escolha de `importType` e `delimiter`;
   - templates rapidos para `subscription_entitlements` e `ad_campaign_status`;
   - preview via API antes de executar;
   - execucao com `dryRun` e motivo obrigatorio.
3. observabilidade operacional em UI:
   - listagem de jobs com filtros (`importType`, `status`, `dryRun`) e paginacao;
   - detalhe de job com `errors` e `results` por linha;
   - refresh manual para follow-up de execucoes.
4. dashboard admin unificado atualizado com tab `Operacoes` e acesso via modulo/permissoes.
5. hardening adicional no backend para este fluxo:
   - contratos de request em `preview` e `jobs`;
   - cobertura em `npm run test:contracts:routes`.

Validacao desta iteracao:
1. backend: `npm run typecheck`
2. backend: `npm run test:contracts:routes`
3. backend: `npm run test:ads:guardrails`
4. frontend: `npm run typecheck:p1`

### 7.3 P4.5-03 Acoes agendadas (unhide automatico)

Objetivo:
1. Permitir agendar reativacao de conteudo sem intervencao manual no momento de expiracao.

Backend:
1. Suportar jobs `queued` com `scheduledFor`, executados apenas quando due.
2. Expor endpoint para agendar `unhide` por conteudo.
3. Manter observabilidade do backlog agendado no estado do worker.

Frontend:
1. Acao admin para definir data/hora de unhide automatico (MVP entregue).
2. Visualizacao de jobs agendados no painel operacional (MVP entregue).

Estado desta iteracao:
1. backend+frontend MVP entregues com agendamento de `unhide` e processamento assincrono por worker.
2. hardening de contrato de request aplicado para o endpoint de agendamento.

Entregue no backend:
1. modelo `AdminContentJob` evoluido com `scheduledFor` e indice operacional por `status + scheduledFor`.
2. worker `adminContentJobService` evoluido para:
   - reclamar apenas jobs due (`scheduledFor <= now` ou sem schedule);
   - manter timer interno para proximo job agendado;
   - expor no `getWorkerStatus` os campos `scheduled` e `nextScheduledAt`.
3. endpoint admin novo:
   - `POST /api/admin/content/:contentType/:contentId/unhide/schedule`
4. endpoint existente evoluido:
   - `POST /api/admin/content/bulk-moderate/jobs` aceita `scheduledFor` (nesta iteracao, apenas para `action=unhide`).
5. auditoria administrativa e `requireAdminScope` aplicados com `admin.content.moderate`.
6. rate limit operacional aplicado com `rateLimiter.adminModerationAction` e `rateLimiter.adminModerationBulk`.
7. contrato de request dedicado no endpoint de agendamento:
   - `validateAdminContentScheduleUnhideContract`
   - cobertura em `npm run test:contracts:routes`.

Entregue no frontend:
1. modal de acao no `ContentModerationPage` com modo `immediate` vs `scheduled` para `unhide`.
2. validacao de data/hora futura e submissao para `POST /api/admin/content/:contentType/:contentId/unhide/schedule`.
3. bulk action `unhide` com `scheduledFor` opcional.
4. dashboards operacionais atualizados com backlog agendado:
   - contador `scheduled`;
   - campo `nextScheduledAt`;
   - badge/label de agendamento por job no historico.
5. hooks/servico/tipos admin atualizados para suportar contrato e estado agendado.

Validacao desta iteracao:
1. backend: `npm run typecheck`
2. backend: `npm run test:contracts:routes`
3. frontend: `npm run typecheck:p1`
4. frontend: `npx eslint src/features/admin/pages/ContentModerationPage.tsx src/features/admin/services/adminContentService.ts src/features/admin/hooks/useAdminContent.ts src/features/admin/types/adminContent.ts`

### 7.4 P4.5-04 Delegacao temporaria de scopes

Objetivo:
1. Permitir cobertura operacional temporaria entre admins sem alterar o perfil base permanente.

Backend:
1. Modelo de delegacao temporaria por scope com expiracao automatica.
2. Endpoints admin para listar/criar/revogar delegacoes.
3. Integracao direta no `requireAdminScope` para considerar delegacoes ativas em runtime.

Frontend:
1. Area admin para gerir delegacoes temporarias por utilizador (ainda pendente).
2. Lista de delegacoes com estado (`active`, `expired`, `revoked`) e expiracao (ainda pendente).

Estado desta iteracao:
1. backend MVP entregue com delegacao temporaria e enforcement no RBAC.
2. frontend admin ainda pendente para fechar este item.

Entregue no backend:
1. modelo novo `AdminScopeDelegation` com:
   - `delegatedBy`, `delegatedTo`, `scope`, `reason`, `note`;
   - `startsAt`, `expiresAt`, `revokedAt`, `revokedBy`, `revokeReason`, `revokeNote`;
   - `purgeAt` com cleanup por TTL para higiene de dados.
2. servico `adminScopeDelegation.service` com:
   - validacao de scopes/expiracao e guardrails de duracao maxima;
   - regras de seguranca (sem auto-delegacao; sem delegar scope fora do perfil base do ator);
   - revogacao explicita com motivo e listagem paginada por estado.
3. endpoints admin:
   - `GET /api/admin/users/:userId/scope-delegations`
   - `POST /api/admin/users/:userId/scope-delegations`
   - `POST /api/admin/users/:userId/scope-delegations/:delegationId/revoke`
4. integracao RBAC:
   - `requireAdminScope` passa a aceitar scopes delegados ativos para admins;
   - mantem bloqueio `adminReadOnly` para scopes de escrita, mesmo com delegacao.
5. alinhamento de comportamento em servicos:
   - personalizacao de dashboard passa a considerar scopes delegados ativos ao resolver widgets disponiveis.
6. auditoria administrativa e `requireAdminScope` aplicados:
   - listagem com `admin.users.read`;
   - criacao/revogacao com `admin.users.write`.
7. rate limit operacional aplicado nas mutacoes via `rateLimiter.adminModerationAction`.

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`
3. `npm run checking`

### 7.5 P4.5-05 Dark mode admin

Objetivo:
1. Suportar preferencia visual `light/dark/system` no contexto do dashboard admin.

Backend:
1. Persistir tema por admin no mesmo contrato de personalizacao.
2. Expor tema no `GET` e aceitar atualizacao no `PATCH` de personalization.
3. Garantir fallback seguro para preferencias antigas sem campo de tema.

Frontend:
1. Toggle de tema no painel admin (ainda pendente).
2. Aplicacao de tokens/tema visual no layout admin (ainda pendente).

Estado desta iteracao:
1. backend MVP entregue com suporte a tema no dashboard personalization.
2. frontend admin ainda pendente para fechar este item.

Entregue no backend:
1. modelo `AdminDashboardPreference` evoluido com `theme`:
   - modos suportados: `system`, `light`, `dark`;
   - incluido tambem no snapshot de historico versionado.
2. servico `adminDashboardPreference.service` evoluido para:
   - retornar `theme` no payload de leitura;
   - validar `theme` no patch (`PATCH /personalization`);
   - resetar para `ADMIN_DASHBOARD_DEFAULT_THEME` no `reset`.
3. compatibilidade backward:
   - preferencia antiga sem `theme` recebe fallback seguro (`system` por default).
4. variavel de ambiente nova:
   - `ADMIN_DASHBOARD_DEFAULT_THEME` (default `system`).

Validacao desta iteracao:
1. `npm run typecheck`
2. `npm run test:technical:smoke`
3. `npm run checking`

## 8) Definition of Done por bloco

Para cada item P4.3+:

1. Backend + contrato + RBAC por scope.
2. UI admin funcional para operacao diaria.
3. Audit log completo para mutacoes criticas.
4. Testes: unitarios + integracao + E2E dos fluxos principais.
5. Documentacao de runbook e checklist pre-release.

## 9) Ordem recomendada de execucao

1. P4.3-01 premium/paywall.
2. P4.3-02 subscricoes/planos.
3. P4.3-03 apelacoes.
4. P4.3-04 templates de moderacao.
5. P4.3-05 comunicacoes segmentadas.
6. P4.4 por valor incremental.
7. P4.5 como pacote de produtividade.

## 10) Nota de foco

E valido mudar o foco agora para outras frentes e regressar a este plano antes da release.
Este documento fica como backlog formal para retoma controlada com entregas por bloco.
