# P4.3, P4.4, P4.5 - Backoffice de Negocio e Revenue

Data: 2026-03-06
Estado: Em curso (P4.3-01 e P4.3-04 backend MVP entregues)
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

## 6) P4.4 - Expansao operacional

### 6.1 P4.4-01 Analytics positivos de creators

1. Top creators por crescimento e engagement.
2. Metrica positiva lado a lado com risk/trust para decisoes editoriais.
3. Export CSV para planeamento de curadoria.

### 6.2 P4.4-02 Gestao admin das financial tools

1. Feature flags por ferramenta (stocks, REIT, ETF, crypto).
2. Metricas de uso por tool e por vertical.
3. Configuracao de limites/experiencias por ambiente.

### 6.3 P4.4-03 Gestao de anuncios/partnerships

1. Inventario de placements e parceiros.
2. Estado contratual e janela de campanha.
3. Regras de visibilidade e prioridade por superficie.

## 7) P4.5 - Opcional (produtividade/UX)

1. Dashboard personalizavel por admin.
2. Bulk import CSV para operacoes repetitivas.
3. Acoes agendadas (ex: unhide automatico apos periodo definido).
4. Delegacao temporaria de scopes com expiracao automatica.
5. Dark mode admin.

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
