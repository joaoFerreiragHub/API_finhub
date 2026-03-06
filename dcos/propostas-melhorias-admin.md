# Propostas de Melhorias do Painel de Admin

## Nota de consolidacao (2026-03-04)

Este documento continua valido como inventario de problemas e oportunidades.
A versao executavel consolidada por severidade, prioridade e passos de implementacao
esta em:

- `dcos/done/P4_2_MODO_MELHORADO.md`
- `dcos/P4_3_4_5_BACKOFFICE_NEGOCIO.md` (roadmap pos-P4.2 para negocio/revenue e expansao operacional)

## Nota de progresso (2026-03-04)

Itens ja implementados desde esta analise:

1. Fail-closed de scopes admin com flag de transicao.
2. Contrato de scopes de diretorios (publish/archive) alinhado para `admin.directory.manage`.
3. Export CSV dos audit logs (`/api/admin/audit-logs/export.csv`) + UI dedicada de auditoria.
4. Alertas internos com `acknowledge/dismiss` e estado persistido (`open/acknowledged/dismissed`).
5. Polling dinamico nas views operacionais criticas (10s em foco, pausa em background).
6. Queue de moderacao com suporte a cursor pagination (`cursor.current/next/hasMore`) com compatibilidade `page/limit`.
7. Gestao de permissao de admins via UI (`/admin/users`) com endpoint dedicado (`POST /api/admin/users/:userId/admin-permissions`), diff `before/after` e bloqueio de self-update.
8. Validacao centralizada de `reason`/`note`/`publicMessage` em controllers admin com limites uniformes antes dos services/modelos.
9. `metadata` de auditoria com limite de tamanho (8192 bytes) e truncagem segura no pipeline de audit log.

## A. PROBLEMAS IDENTIFICADOS

### A1. Seguranca & Escalabilidade

| # | Problema | Ficheiros | Severidade |
|---|----------|-----------|------------|
| 1 | **Rate limiter em memoria** — nao funciona em deploy multi-instancia (load balancer). Limites bypassed se houver >1 processo. | `src/middlewares/rateLimiter.ts` | **Alta** |
| 2 | **Admins sem scopes explicitos recebem acesso total** (23 scopes) — fallback silencioso sem log. | `src/admin/permissions.ts:118-120` | **Alta** |
| 3 | **Validacao de comprimento de reason/note** so existe no schema Mongoose (maxlength) — controllers nao validam antes de chamar o service. | `adminUser.controller.ts`, `adminContent.controller.ts`, `adminSurfaceControl.controller.ts` | **Media** |
| 4 | **Campo metadata sem limite de tamanho** — `Record<string, unknown>` pode crescer ilimitadamente no audit log. | `AdminAuditLog.ts:21` | **Media** |
| 5 | **Audit logging fire-and-forget** — falhas de escrita no audit log sao silenciadas (so console.error). | `adminAudit.ts` middleware | **Baixa** |

### A2. UI/UX do Frontend

| # | Problema | Ficheiros | Severidade |
|---|----------|-----------|------------|
| 6 | **Sem pagina de Audit Log** — tipos e service existem mas nao ha UI para consultar o historico de acoes admin. | `adminAudit.ts` (types), `adminAuditService.ts` | **Alta** |
| 7 | **Tabelas em mobile** — scroll horizontal forcado, sem modo card/collapsed para ecras pequenos. | Todas as paginas admin | **Media** |
| 8 | **Sem validacao em tempo real nos formularios** — erros so aparecem ao submeter. | Todas as paginas com forms | **Media** |
| 9 | **Alertas operacionais sem dismiss/acknowledge** — ficam visiveis indefinidamente no dashboard. | `AdminDashboardPage.tsx` | **Media** |
| 10 | **Dados estaticos** — sem polling/WebSocket, admin ve dados stale ate dar refresh manual. | Todas as paginas | **Media** |
| 11 | **Sem atalhos de teclado** — admins power-users dependem 100% do rato. | Global | **Baixa** |
| 12 | **Max-width 6xl** — desperdica espaco em monitores ultrawide/4K. | `AdminLayout.tsx` | **Baixa** |

### A3. Logica de Negocio

| # | Problema | Ficheiros | Severidade |
|---|----------|-----------|------------|
| 13 | **Bulk items sem validacao de count no controller** — o limite `MAX=50` e validado no service mas o controller nao rejeita early. | `adminContent.controller.ts` | **Media** |
| 14 | **Sem content filtering nos campos de notas** — notas internas aceitam qualquer conteudo (2000 chars) sem sanitizacao. | `adminUser.controller.ts`, `adminContent.controller.ts` | **Baixa** |

---

## B. FEATURES EM FALTA PARA GESTAO FLEXIVEL

### B1. Prioridade Alta — Fundamentais para gestao robusta

| # | Feature | Descricao | Impacto |
|---|---------|-----------|---------|
| 1 | **UI de Audit Log** | Pagina dedicada para consultar logs de acoes admin com filtros (actor, action, resourceType, outcome, dateRange). Ja existe backend + types + service — falta so a pagina. | Compliance, transparencia, debugging |
| 2 | **Gestao de permissoes admin** | UI para criar/editar admin users, atribuir scopes, gerir perfis (super/ops/editor/publisher/claims/support), toggle readOnly. Atualmente so via DB direta. | Flexibilidade operacional |
| 3 | **Export CSV/Excel** | Exportar listas de users, content queue, audit logs, metricas para CSV. Essencial para reporting offline e compliance. | Reporting, compliance |
| 4 | **Rate limiter distribuido** | Migrar de in-memory Map para Redis (ou similar) para funcionar com multiplas instancias. | Seguranca em producao |
| 5 | **Notificacoes em tempo real** | Polling periodico (ou WebSocket) para content queue, alertas operacionais, worker status. Pelo menos polling a cada 30s nas paginas criticas. | Eficiencia operacional |

### B2. Prioridade Media — Melhorias significativas

| # | Feature | Descricao | Impacto |
|---|---------|-----------|---------|
| 6 | **Acoes de moderacao agendadas** | Agendar hide/unhide/restrict para data futura (ex: unhide automatico apos revisao). | Flexibilidade |
| 7 | **Templates de moderacao** | Razoes pre-definidas (ex: "Violacao de copyright", "Spam", "Conteudo ofensivo") para acelerar o workflow e manter consistencia. | Velocidade, consistencia |
| 8 | **Workflow de apelacao** | Criadores podem contestar acoes de moderacao; admin reve e aceita/rejeita apelacao. Tracking no moderation history. | Fairness, retencao de criadores |
| 9 | **Dashboard customizavel** | Admin escolhe quais KPIs e widgets ver no dashboard, arrasta/reordena cards. | Personalizacao |
| 10 | **Filtros avancados com date range** | Adicionar filtro de data (de-ate) em users, content queue, audit logs, metricas. | Analise temporal |
| 11 | **Modo card em mobile** | Tabelas colapsam para cards em mobile com info essencial + expand para detalhes. | UX mobile |
| 12 | **Validacao de formularios em tempo real** | Feedback imediato em campos obrigatorios, comprimento, formato — nao so no submit. | UX |
| 13 | **Acknowledge/dismiss de alertas** | Botao para marcar alerta como "visto" com quem/quando. Alertas acknowledged saem do destaque. | Clareza operacional |

### B3. Prioridade Baixa — Nice-to-have

| # | Feature | Descricao | Impacto |
|---|---------|-----------|---------|
| 14 | **Atalhos de teclado** | Cmd/Ctrl+K para busca global, atalhos por pagina (B=ban, S=suspend, H=hide). | Produtividade |
| 15 | **Escalacao automatica** | Thresholds configuraveis (ex: >5 reports em 1h -> escalacao automatica para review). | Automacao |
| 16 | **Delegacao de permissoes** | Admin super pode delegar scopes temporarios a outro admin (ex: acesso editorial por 24h). | Flexibilidade |
| 17 | **Dark mode no admin** | Toggle de tema escuro para o painel admin. | Conforto |
| 18 | **Bulk import** | Upload CSV para criar/atualizar entries de diretorio, users, etc. | Operacoes em massa |
| 19 | **Activity log por admin** | Ver o que cada admin fez (usando audit log) como timeline pessoal. | Supervisao |
| 20 | **Layout adaptativo ultrawide** | Responsivo para ecras >1920px, usando o espaco extra com paineis side-by-side. | UX em desktops grandes |

---

## C. RESUMO DE ACAO RECOMENDADA

### Quick Wins (podem ser feitos ja):
1. **Pagina de Audit Log** — backend pronto, types prontos, service pronto, falta so a pagina React
2. **Templates de moderacao** — array de razoes pre-definidas no frontend, sem alteracao backend
3. **Acknowledge de alertas** — pequena alteracao frontend + 1 endpoint backend
4. **Validacao early de bulk count no controller** — 3 linhas de codigo
5. **Validacao de comprimento reason/note nos controllers** — helper centralizado

### Medio prazo:
6. UI de gestao de permissoes admin
7. Export CSV
8. Filtros com date range
9. Polling/notificacoes periodicas
10. Modo card em mobile

### Longo prazo:
11. Rate limiter Redis
12. Workflow de apelacao
13. Acoes agendadas
14. Escalacao automatica
15. Dashboard customizavel

---

## D. ARQUITECTURA ATUAL — REFERENCIA

### Backend (API_finhub)
- **45+ endpoints** em `src/routes/admin.routes.ts` (1050 linhas)
- **23 scopes** de permissao em `src/admin/permissions.ts`
- **6 perfis** admin: super, ops, editor, publisher, claims, support
- **Worker dedicado** para bulk jobs: `src/workers/adminContentJobs.worker.ts`
- **Modelos**: User, AdminAuditLog, ContentModerationEvent, AdminContentJob, UserModerationEvent, PlatformSurfaceControl

### Frontend (FinHub-Vite)
- **8 paginas** operacionais: Dashboard, Users, Creators Risk, Content Moderation, Editorial CMS, Support, Brands, Stats
- **8 hooks** React Query para data fetching
- **9 services** para comunicacao com API
- **Layout responsivo** com sidebar colapsavel
- **Deep-linking** com preservacao de estado via URL params

### Ficheiros Criticos

| Ficheiro | Linhas | Descricao |
|----------|--------|-----------|
| `API_finhub/src/routes/admin.routes.ts` | 1050 | Todas as rotas admin |
| `API_finhub/src/admin/permissions.ts` | 149 | Scopes e perfis |
| `API_finhub/src/middlewares/rateLimiter.ts` | 146 | Rate limiting |
| `API_finhub/src/middlewares/auth.ts` | 147 | Autenticacao |
| `API_finhub/src/middlewares/roleGuard.ts` | 66 | Autorizacao granular |
| `FinHub-Vite/src/.../ContentModerationPage.tsx` | 2524 | Moderacao conteudo |
| `FinHub-Vite/src/.../AdminDashboardPage.tsx` | 2524+ | Dashboard |
| `FinHub-Vite/src/.../EditorialCmsPage.tsx` | 2383 | CMS editorial |
| `FinHub-Vite/src/.../UsersManagementPage.tsx` | 1510 | Gestao users |
| `FinHub-Vite/src/.../CreatorsRiskBoardPage.tsx` | 1422 | Risk board |
| `FinHub-Vite/src/.../access.ts` | 172 | RBAC frontend |
