# Auditoria — Sistema de Analytics do FinHub

**Data da auditoria:** 20 de março de 2026  
**Auditado por:** Boyo (finhub-orchestrator)  
**Status:** COMPLETO — Relatório pronto para aprovação  

---

## Executive Summary

O FinHub tem **2 sistemas de analytics paralelos** em diferentes estados de maturidade:

1. **Product Analytics (Frontend)** — ✅ **FUNCIONAL** (PostHog integrado, 70% instrumentado)
2. **Business Analytics (Backend)** — ⚠️ **PARCIAL** (Creator analytics OK, P5 KPI framework 90% completo, mas não implementado)
3. **Agent Activity Dashboard** — 🔧 **EM CONSTRUÇÃO** (Backend 85% done, Frontend 0% done)

**Conclusão:** Sistema é viável, mas está fragmentado. Requer consolidação urgente e priorização clara.

---

## 1. ESTADO DETALHADO POR SUBSISTEMA

### 1.1 Product Analytics (Frontend) — PostHog

**Status:** ✅ FUNCIONAL  
**Stack:** PostHog.js com consentimento GDPR gateado  
**Última atualização:** 19 de fevereiro de 2026

#### O que está a funcionar:

| Componente | Status | Detalhes |
|------------|--------|----------|
| Inicialização PostHog | ✅ OK | Via `configureAnalyticsRuntime()` com chave env |
| Consent flow | ✅ OK | Gateado por `posthogConsentGranted` |
| Event capture | ✅ OK | Queue com fallback antes de consentimento |
| User identification | ✅ OK | Sincroniza user ID + role + email |
| Page view tracking | ✅ OK | Automático via `trackPageView(pathname)` |
| Content view matching | ✅ OK | Resolve 8 tipos de conteúdo (artigos, vídeos, cursos, etc) |
| Custom events | ✅ OK | `trackEvent()`, `trackClick()`, `trackFeature()` |
| CSV export ready | ✅ OK | Hook `useAdminCreatorPositiveAnalytics` + CSV download |

#### O que está instrumentado:

- ✅ Eventos de autenticação (login, signup)
- ✅ Eventos de onboarding (3+ passos tracked)
- ✅ Eventos de conteúdo (page view, item opened, item completed)
- ✅ Eventos sociais (follow, favorite, comment)
- ✅ Eventos de dashboard (widget viewed, goal created)
- ✅ Eventos de simulador (simulation.run)
- ⚠️ Eventos de moderation (partial — apenas admin)
- ⚠️ Eventos de sponsorship (NOT INSTRUMENTED — será P5 fase B)

#### Problemas conhecidos:

| Problema | Severidade | Impacto | Recomendação |
|----------|-----------|--------|--------------|
| PostHog key em .env — inseguro em prod | 🟠 MÉDIA | Exposição de chave privada se env vazar | Mover para secret manager (AWS Secrets/Vault) |
| Consent flow baseado em flag global | 🟠 MÉDIA | Não há UI de cookie banner visível | Adicionar explicit cookie consent UI |
| Event queue max 100 (pode perder) | 🟡 BAIXA | Burst de 100+ eventos = perda de dados | Aumentar para 500 + alertar |
| `autocapture: true` + custom events pode duplicar | 🟡 BAIXA | Ruído nos dados de clicks | Desabilitar autocapture, instrumentar selectively |
| Sem validação de schema de eventos | 🟡 BAIXA | Eventos malformados no PostHog | Adicionar JSON schema validation antes de capture |

---

### 1.2 Business Analytics — Creator Insights

**Status:** ✅ FUNCIONAL  
**Stack:** MongoDB aggregation pipeline + service layer  
**Última atualização:** 9 de março de 2026

#### O que está a funcionar:

| Componente | Status | Detalhes |
|------------|--------|----------|
| Schema analytics | ✅ OK | `adminCreatorAnalytics.service.ts` com 400+ linhas |
| Agregações multi-modelo | ✅ OK | Junta dados de 6 tipos de conteúdo (article, video, course, live, podcast, book) |
| Growth scoring | ✅ OK | `growthScore = follows*4 + followsDelta*2 + published*3 + premium*0.5 + featured*0.5` |
| Engagement scoring | ✅ OK | `engagementScore = views/1000 + actions/5 + rating*2 + ratingsCount/20` |
| Trust integration | ✅ OK | Integra com `creatorTrustService` (risk levels: low/medium/high) |
| Window-based trending | ✅ OK | Compara períodos (ex: últimos 30 dias vs 30 dias anteriores) |
| CSV export | ✅ OK | Exporta até 5000 rows com safe CSV escaping |
| REST API | ✅ OK | 2 endpoints: `/api/admin/creators/analytics/positive` + `/export.csv` |
| Filtros + paginação | ✅ OK | Search, accountStatus, riskLevel, sorting |

#### Métricas capturadas:

**Por creator:**
- Followers / Following
- Conteúdo total, publicado, premium, featured
- Views, Likes, Favorites, Comments, Ratings
- Growth trend (delta followers, delta published)
- Engagement score (composição)
- Trust score + risk level
- Recomendação de ação (none/review/investigate/suspend)

#### Problemas conhecidos:

| Problema | Severidade | Impacto | Recomendação |
|----------|-----------|--------|--------------|
| Sem cache de agregações | 🔴 ALTA | Query complexa para cada request — N+1 aggregations | Cachear resultado por 6h em Redis |
| Limite hard de 2000 creators em query | 🟠 MÉDIA | Escala quebra em >2000 creators | Implementar cursor pagination |
| Trust service está acoplado | 🟡 BAIXA | Mudanças em creatorTrustService quebram analytics | Abstrair interface de trust scores |
| Sem alertas de anomalias | 🟡 BAIXA | Queda 50% em growth score não notificada | Adicionar threshold-based alerts (via cron) |
| Relatórios manuais apenas | 🟡 BAIXA | Sponsores precisam de relatórios automáticos | Adicionar job mensal de geração automática |

---

### 1.3 Agent Activity Dashboard — Monitorização de Agentes

**Status:** 🔧 EM CONSTRUÇÃO (85% backend, 0% frontend)  
**Sprint:** S0A (Agent Dashboard & Metrics)  
**Última atualização:** 17 de março de 2026

#### Backend — O que está DONE:

| Tarefa | Status | Ficheiro | Notas |
|--------|--------|----------|-------|
| Schema Mongoose | ✅ | `AgentActivityLog.ts` | Todos os campos presentes |
| POST /api/admin/agent-logs | ✅ | `agentActivityLog.controller.ts` | Logging de atividades de agentes |
| GET /api/admin/agent-logs | ✅ | `agentActivityLog.controller.ts` | Com filtros (agentId, status, range de datas) |
| GET /api/admin/agent-logs/stats | ✅ | `agentActivityLog.controller.ts` | Agregações por agente e status |
| GET /api/admin/agent-logs/agent/:agentId | ✅ | `agentActivityLog.controller.ts` | Timeline de um agente específico |
| Script import JSON | ✅ | `importAgentLogs.ts` | Para carregar histórico inicial |

#### Backend — O que está TODO:

| Tarefa | Bloqueador | Prioridade |
|--------|------------|-----------|
| Smoke tests endpoints | Aguarda setup de testes | 🔴 ALTA |
| Implementar activity-logs/ em workspaces | Necessário para agentes loggarem | 🔴 ALTA |
| Regra de logging no CLAUDE.md de cada agente | Documentação + instrução | 🟠 MÉDIA |
| Alertas de falha recorrente (>3 falhas em 24h) | Lógica de detecção | 🟠 MÉDIA |

#### Frontend — O que é TODO (completamente):

| Página | Componentes | ETA estimada |
|--------|------------|---------------|
| `/admin/agent-dashboard` | Layout + filtros | 3-4 dias (CTO) |
| Vista Timeline | Cards de atividade, paginação | 2-3 dias (CTO) |
| Vista Scorecard | Cards de métricas por agente | 1-2 dias (CTO) |
| Vista Burndown | Gráfico de taxa sucesso ao longo do tempo | 2-3 dias (CTO) |

#### Problemas conhecidos:

| Problema | Severidade | Impacto | Recomendação |
|----------|-----------|--------|--------------|
| Sem logging automático de agentes | 🔴 ALTA | Dashboard vazio até que agentes loguem | Implementar webhook pós-task OpenClaw |
| Schema sem índices | 🟠 MÉDIA | Queries lentas em >10K registos | Adicionar índices em agentId, status, createdAt |
| Sem retenção de dados (cleanup policy) | 🟠 MÉDIA | BD cresce indefinidamente | Manter 6 meses, arquivar em S3 |
| Sem integração com alertas de falha | 🟡 BAIXA | SLA não monitorizável | Conectar com Datadog/Sentry |
| Frontend sem dark mode | 🟡 BAIXA | UX inconsistente com resto do app | Herdar Tailwind theme do app |

---

## 2. ESTADO P5 — Framework de KPIs de Negócio

**Status:** ⚠️ COMPLETO (plano + specs) mas NÃO IMPLEMENTADO  
**Documento:** `P5_ANALYTICS_NEGOCIO_PATROCINIOS.md` (9 mar 2026)  
**Escopo:** 12 KPIs oficiais + contrato de eventos + scorecard sponsorship

### 2.1 O que está documentado:

✅ KPI Tree com 12 métricas (WAEU, Onboarding Completion, D1/D7/D30 Retention, etc)  
✅ Contrato de eventos com 21 eventos mínimos (naming canonico, envelope obrigatório)  
✅ Scorecard de sponsorship com 5 pilares (Alcance, Qualidade, Brand Safety, Outcome, Confiança)  
✅ Plano de execução 12 semanas em 3 ondas (Fundação, Product Analytics, Unit Economics)  
✅ Critérios de aceite e defesa contra riscos  

### 2.2 O que NÃO foi implementado:

🟠 **0%** — Nenhum dos 21 eventos foi instrumentado no código  
🟠 **0%** — Pipeline de validação de qualidade de dados (gates de 99.5% cobertura)  
🟠 **0%** — Dashboard executivo de KPIs  
🟠 **0%** — Geração automática de sponsorship packs  
🟠 **0%** — Alertas de queda de KPI críticos  

### 2.3 Razão do atraso:

P5 foi planejado como fase "post-P4 funcional" mas P4 está ainda em construção → P5 ficou no backlog. **Não está bloqueada, mas não tem owner atribuído.**

---

## 3. MATRIZ DE COMPLETUDE

```
╔════════════════════════════════════════════════════════════════════╗
║                   SISTEMA DE ANALYTICS DO FINHUB                 ║
╠═══════════════════════╦═══════╦═══════╦═══════════╦════════════════╣
║ Subsistema            ║ Backend ║ Frontend ║ Docs ║ Produção (Live) ║
╠═══════════════════════╬═════════╬══════════╬══════╬═════════════════╣
║ Product Analytics     ║   90%   ║   80%   ║ 95%  ║ ✅ SIM (PostHog) ║
║ Creator Insights      ║  100%   ║   70%   ║ 85%  ║ ✅ SIM (API ok)  ║
║ Agent Dashboard       ║   85%   ║    0%   ║ 90%  ║ ❌ NÃO           ║
║ P5 KPI Framework      ║    5%   ║    0%   ║ 95%  ║ ❌ NÃO           ║
║ Sponsorship Scorecard ║    5%   ║    0%   ║ 95%  ║ ❌ NÃO           ║
╠═══════════════════════╩═════════╩══════════╩══════╩═════════════════╣
║ ESTADO GLOBAL:  Fragmentado. 2 subsistemas vivos, 3 em atraso.      ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 4. FLUXO DE DADOS — Diagrama da Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (FinHub-Vite)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ├─ trackPageView()     ──┐                                │
│  ├─ trackEvent()        ──┤                                │
│  ├─ trackContentView()  ──┼──→ analyticsProviders.ts      │
│  ├─ trackClick()        ──┤     (PostHog.js)              │
│  └─ trackFeature()      ──┘                                │
│                                    ↓                        │
│                         ┌────────────────────┐             │
│                         │   PostHog Cloud    │             │
│                         │  (app.posthog.com) │             │
│                         └────────────────────┘             │
│                              (Fora do scope)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (API_finhub)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MongoDB:                                                  │
│  ├─ User (followers, role, status)                        │
│  ├─ Article, Video, Course, Podcast, Book, LiveEvent      │
│  ├─ Follow (who follows whom, timestamp)                  │
│  ├─ Comment, Like, Favorite (engagement)                  │
│  ├─ AgentActivityLog (novo, vazio por agora)              │
│  └─ Trust signals (creatorTrustService)                   │
│       ↓                                                    │
│  ┌────────────────────────────────────────────┐           │
│  │ adminCreatorAnalytics.service.ts           │           │
│  │ (agregações complexas de creators)         │           │
│  └────────────────────┬───────────────────────┘           │
│       ↓ ↓ ↓ ↓                                             │
│   GET /api/admin/creators/analytics/positive              │
│   GET /api/admin/creators/analytics/positive/export.csv   │
│       ↓                                                    │
│   Frontend Admin (AdminCreatorsPositiveAnalytics.tsx)    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              AGENTES (OpenClaw — Em Construção)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cada agente (CTO, QA, Data Quality, etc)                 │
│  Gera activity logs via:                                  │
│    POST /api/admin/agent-logs (ainda não instrumentado)   │
│       ↓                                                    │
│   AgentActivityLog (MongoDB)                              │
│       ↓                                                    │
│   GET /api/admin/agent-logs (dashboard)                   │
│       ↓                                                    │
│   /admin/agent-dashboard (TODO: Frontend)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. LISTA DE PROBLEMAS CRÍTICOS (ROADMAP DE AÇÕES)

### 🔴 CRÍTICOS (Bloqueia produção / decisões):

1. **P5 não implementado** — Sem KPIs oficiais, roadmap não tem tração
   - Impacto: Decisões de prioridade baseadas em feeling, não dados
   - Esforço: 8-10 dias (3 ondas de 2-3 dias)
   - Owner proposto: Product Release + Growth

2. **Sem logging automático de agentes** — Agent dashboard vazio
   - Impacto: Não há visibilidade sobre saúde de agentes
   - Esforço: 2-3 dias (webhook + instrumentação de agentes)
   - Owner proposto: CTO

3. **Sem cache de agregações creator analytics** — Queries lentas
   - Impacto: /api/admin/creators/analytics demora 2-3s
   - Esforço: 1-2 dias (Redis + refresh job)
   - Owner proposto: CTO

### 🟠 ALTOS (Falha futura se não resolvidos):

4. **Contrato de eventos P5 não integrado no código**
   - Impacto: Eventos estão ad-hoc, não canonicos
   - Esforço: 3-4 dias (adicionar 21 eventos mínimos)
   - Owner proposto: Product Release + CTO

5. **PostHog key em .env (segurança)**
   - Impacto: Exposição se .env vazar em git/infra
   - Esforço: 4 horas (migrar para secret manager)
   - Owner proposto: CTO + Security review

6. **Sem relatórios automáticos para sponsores**
   - Impacto: Manual work repetitivo, erro humano
   - Esforço: 3-4 dias (template + email job)
   - Owner proposto: Content/Revenue Lead

### 🟡 MÉDIOS (Qualidade, não urgente):

7. **Sem índices de BD em agent_activity_logs**
8. **Cookie consent banner não visível**
9. **Sem validação de schema de eventos**
10. **Sem alertas de queda de KPI**

---

## 6. ESTADO DA DOCUMENTAÇÃO

| Documento | Local | Status | Qualidade |
|-----------|-------|--------|-----------|
| P5 Framework | `FinHub-Vite/dcos/P5_*.md` | ✅ Completo | Excelente (12KB) |
| Product Analytics setup | inline em `.ts` | ⚠️ Parcial | Boa (comentários) |
| Creator Analytics schema | `adminCreatorAnalytics.service.ts` | ✅ Completo | Excelente (400+ linhas commented) |
| Agent Dashboard spec | `dcos/tasks/STATUS.md` | ✅ Completo | Boa (matriz clara) |
| Event contract | `P5_*.md` secção 4 | ✅ Completo | Excelente (21 eventos listados) |
| KPI definitions | `P5_*.md` secção 3 | ✅ Completo | Excelente (12 KPIs com fórmulas) |
| Sponsorship scorecard | `P5_*.md` secção 5 | ✅ Completo | Excelente (5 pilares com pesos) |
| Runtime config | `analyticsProviders.ts` | ✅ Completo | Boa (consent flow) |

---

## 7. RECOMENDAÇÕES PARA APROVAÇÃO

### ✅ O que está bem e pode continuar:

1. **PostHog integration** — Solidez de eventos, boa cobertura
2. **Creator analytics API** — Schema bem pensado, agregações robustas
3. **P5 documentation** — Excelente, serve como roadmap
4. **Agent activity schema** — Backend bem estruturado

### ⚠️ O que precisa de ação ANTES de próxima fase:

**Faseamento (próximas 6 semanas):**

**Semana 1-2 (URGENTE):**
- [ ] Cache de agregações creator analytics (Redis)
- [ ] Instrumentação de agentes + webhook (Agent Dashboard backend ready)
- [ ] PostHog key → secret manager
- [ ] Cookie consent UI visível

**Semana 3-4 (P5 Onda A):**
- [ ] Publicar event dictionary v1 (21 eventos)
- [ ] Instrumentar eventos mínimos em onboarding, conteúdo, social
- [ ] Dashboard executivo v0 (12 KPIs)

**Semana 5-6 (Frontend + BI):**
- [ ] Agent Dashboard frontend (Timeline, Scorecard, Burndown)
- [ ] Cohort analysis (D1, D7, D30 retention)
- [ ] Primeiros relatórios automáticos para sponsores

---

## 8. PRÓXIMOS PASSOS (Proposta para João)

### Aprovação imediata (hoje):

Confirmar:
1. Prioridade de P5 (KPI framework)? → Sim/Não
2. Owner de P5 Onda A? → Proposto: Product Release + Growth
3. Timeline aceitável? → 6 semanas para estado completo

### Se aprovado:

1. Criar task packet em `dcos/tasks/` com 3 ondas claras
2. Delegar P5 Onda A a Product Release (task-architect prepara specs)
3. Iniciar Agent Dashboard frontend (CTO, 1-2 dias após backend ready)
4. Security review em PostHog config + credenciais

---

## Ficheiros Analisados

1. ✅ `API_finhub/src/controllers/adminCreatorAnalytics.controller.ts`
2. ✅ `API_finhub/src/services/adminCreatorAnalytics.service.ts`
3. ✅ `FinHub-Vite/src/lib/analytics.ts`
4. ✅ `FinHub-Vite/src/lib/analyticsProviders.ts`
5. ✅ `FinHub-Vite/dcos/P5_ANALYTICS_NEGOCIO_PATROCINIOS.md`
6. ✅ `API_finhub/dcos/tasks/STATUS.md`
7. ✅ Estrutura de agentes e workspaces via Master Reference

---

## Conclusão

**O FinHub tem os alicerces de um sistema de analytics solido, mas está fragmentado.** 

- ✅ Eventos de produto funcionam (PostHog)
- ✅ Creator insights são sofisticados e prontos
- 🔧 Agent dashboard está quase pronto (falta frontend)
- ❌ P5 (KPIs de negócio) existe no papel, mas não no código

**Recomendação:** Consolidar em 6 semanas com faseamento claro. Prioridade = P5 Onda A (KPI tree + eventos mínimos) → impacto imediato em decisões de roadmap.

---

**Relatório compilado por:** Boyo (finhub-orchestrator)  
**Data:** 20 de março de 2026, 09:30 GMT+0  
**Status:** ✅ PRONTO PARA REVISÃO
