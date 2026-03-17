# 🔗 DEPENDÊNCIAS & CRITICAL PATH — Beta Release

**Data:** 2026-03-17  
**Documento:** Feature dependency mapping + critical path analysis

---

## 1️⃣ DEPENDENCY GRAPH

### Camada 0: Fundação (Infraestrutura)
```
Auth (JWT + refresh) ✅
├─→ Bloqueia: Tudo o resto
├─→ Desbloqueado por: JWT secret + token strategy
└─→ Status: DONE
    └─→ Email service (verificação + reset) ✅
        ├─→ Bloqueia: Creator dashboard, sensitive actions
        ├─→ Desbloqueado por: SMTP/Resend/SendGrid
        └─→ Status: DONE
            └─→ S3/Object Storage ✅
                ├─→ Bloqueia: Avatar uploads, content media
                ├─→ Desbloqueado por: AWS S3 config
                └─→ Status: DONE
```

### Camada 1: Content Platform (Backend)
```
Content Models (Article, Video, Course, etc) ✅
├─→ ALTA-001, ALTA-002
├─→ Bloqueia: Creator features, public pages, moderation
├─→ Desbloqueado por: Mongoose schemas + CRUD controllers
└─→ Status: DONE
    ├─→ Comments + Ratings ✅
    │   ├─→ Bloqueia: User engagement, discovery
    │   └─→ Status: DONE
    │
    └─→ Moderação System ✅
        ├─→ ALTA-009
        ├─→ Bloqueia: Public beta (trust requirement)
        ├─→ Desbloqueado por: Report model + admin queue + E2E tests 🟡
        └─→ Status: Backend DONE, E2E tests IN-PROGRESS
```

### Camada 2: Public-Facing (Frontend)
```
Creator Backend + Models ✅ (Camada 1)
├─→ Desbloqueado por: ALTA-001, ALTA-002
│
└─→ Creator Dashboard (ALTA-007) 🔴 TODO
    ├─→ Bloqueia: S1 closure
    ├─→ Desbloqueado por: UI framework (React) + API integration
    └─→ Dependências intra-feature:
        ├─ Model: Content CRUD ✅
        ├─ Component: Form para novo artigo 🟡
        ├─ Component: List meu conteúdo 🟡
        └─ Component: Basic stats 🟡
        
        └─→ Públicos conseguem explorar (ALTA-004, ALTA-005, ALTA-006)
            ├─→ /explorar (descobrir conteúdo) 🟡
            ├─→ /artigos/:slug (detalhe) 🟡
            ├─→ /criadores (grid de criadores) 🟡
            └─→ /criadores/:username (perfil público) 🟡
                
                └─→ Moderação E2E testada (CRIT-011) 🟡
                    └─→ Bloqueia: Beta launch
                    └─→ Status: IN-PROGRESS (QA tests)
```

### Camada 3: Diferenciação (Features)
```
Ferramentas V1 ✅ (Stocks, ETFs, Crypto, REITs, Watchlist)
├─→ Bloqueia: MED-006 a MED-009 (UI polish)
├─→ Status: Backend DONE ✅, UI updates IN-PROGRESS 🟡
│
├─→ MED-006: Sorting em watchlist 🟡
├─→ MED-007: 24h% visível 🟡
├─→ MED-008: Expense ratio em ETF 🟡
└─→ MED-009: Data quality badge 🟡
    
    ├─→ Glossário (MED-010) 🔴 TODO
    │   ├─→ Bloqueia: MED-011 (tooltips need glossário data)
    │   ├─→ Desbloqueado por: CMS + copy writing
    │   └─→ Dependências: Content model ✅
    │
    └─→ Tooltips (MED-011) 🔴 TODO
        ├─→ Bloqueia: UI polish na Onda 3
        └─→ Desbloqueado por: Glossário + component library

Directório Público (MED-014, MED-015, MED-016) 🟡
├─→ Backend (MED-014) ✅
├─→ Index page (MED-015) 🔴 TODO
├─→ Detail page (MED-016) 🔴 TODO
└─→ Bloqueia: S1 feature complete

FIRE Simulator (MED-013) 🔴 TODO
├─→ Bloqueia: S2, nice-to-have para beta
├─→ Desbloqueado por: Portfolio model + API
├─→ Dependências:
│   ├─ Auth ✅ (user association)
│   ├─ S3 ✅ (chart storage)
│   └─ Financial data ✅ (historical prices)
└─→ Complexidade: Alta — pode-se fazer MVP minimalista se timing aperta
```

---

## 🎯 CRITICAL PATH — O Caminho Mais Curto para Beta

```
┌─────────────────────────────────────────────────────────────┐
│ CRITICAL PATH: Tarefas que NÃO PODEM ATRASAR               │
├─────────────────────────────────────────────────────────────┤

[S0A] Fundação (2026-03-17 → 2026-03-25)
 ├─ Email ✅
 ├─ Auth ✅
 ├─ Legal pages ✅
 ├─ S3 ✅
 ├─ Moderação backend ✅
 ├─ E2E moderação tests 🟡 ← CRITICAL
 └─ Duration: 8 days (on schedule)

[S1] Public MVP (2026-03-26 → 2026-04-08) — 12 days
 ├─ ALTA-001/002: Backend creators ✅ (0 dias extra, já feito)
 ├─ ALTA-007: Creator dashboard 🔴 → 4 dias
 ├─ ALTA-004/005/006: Public pages 🟡 → 4 dias
 ├─ MED-010/011: Glossário + tooltips 🔴 → 3 dias
 ├─ MED-015/016: Directório pages 🔴 → 2 dias
 ├─ MED-006/007/008/009: Tools UI polish 🟡 → 3 dias
 └─ Duration: ~12 dias (buffer: 0 dias)

[S2] Flagship (2026-04-09 → 2026-04-18) — 9 days
 ├─ MED-013: FIRE Simulator MVP 🔴 → 5 dias
 └─ Duration: 5 dias (buffer: 4 dias para polish/hotfixes)

[BETA] Launch (2026-04-20)
 └─ Pre-launch validation: 2 dias (2026-04-18→20)

└─ TOTAL: ~35 dias até beta com zero slack
```

### Float Analysis (Onde é que temos margem?)

| Task | Duration | Slack | Owner |
|------|----------|-------|-------|
| Auth (S0A) | 5 dias | 0 (critical) | Backend |
| Moderação E2E (S0A) | 3 dias | 0 (critical) | QA |
| Creator dashboard (S1) | 4 dias | 1 dia | Frontend |
| Public pages (S1) | 4 dias | 2 dias | Frontend |
| Glossário (S1) | 2 dias | 1 dia | Content |
| Tools UI (S1) | 3 dias | 1 dia | Frontend |
| FIRE simulator (S2) | 5 dias | 4 dias | Backend |
| QA/Validation | 2 dias | 0 (gate) | QA |

**Conclusão:** S0A e S1 não têm espaço para atrasos. S2 tem 4 dias de buffer.

---

## 🚫 BLOCKING DEPENDENCIES

### Bloqueador 1: Moderação E2E Tests (CRIT-011)
```
Status: 🟡 IN-PROGRESS
Critical because: Cannot launch beta without E2E proof
Test scope:
├─ Create content as user ✅
├─ Report content as different user 🟡
├─ Admin reviews report 🟡
├─ Admin takes action (mute/suspend) 🟡
└─ User appeals action 🟡
Timeline: Should be DONE by 2026-03-25
Blocker window: 2026-03-25 → 2026-04-08 (if slips into S1)
Mitigation: Run manual tests in parallel if automation delays
Owner: QA Lead
```

### Bloqueador 2: Creator Dashboard Frontend (ALTA-007)
```
Status: 🔴 TODO
Critical because: S1 feature, no public alternatives exist
Blocks: Creator onboarding for beta
Timeline: 2026-03-26 → 2026-03-30 (4 dias)
Blocker window: 2026-03-30 → 2026-04-08 (if slips)
Mitigation: Use mockup UI if real build delays, manual content creation
Owner: Frontend Lead
```

### Bloqueador 3: Public Pages (ALTA-004, ALTA-005, ALTA-006)
```
Status: 🟡 IN-PROGRESS
Critical because: Public MVP, users cannot navigate without
Blocks: UAT, beta launch
Timeline: 2026-03-26 → 2026-04-08 (4 dias)
Blocker window: 2026-04-08 → 2026-04-20 (if slips into S2)
Mitigation: Launch with minimal styling if needed, iterate in beta
Owner: Frontend Lead
```

### Não-Bloqueador (Pode atrasar sem impactar beta)

| Feature | Status | Can delay | To when |
|---------|--------|-----------|---------|
| FIRE Simulator (MED-013) | 🔴 TODO | Yes | Post-beta |
| Glossário (MED-010) | 🔴 TODO | Yes | 1st week of beta |
| Tooltips (MED-011) | 🔴 TODO | Yes | 1st week of beta |
| Tools UI polish (MED-006-009) | 🟡 IN-PROGRESS | Partially | Can launch MVP without, polish in beta |
| Directory pages (MED-015-016) | 🔴 TODO | Yes | 1st week of beta |

---

## 🔄 INTER-SPRINT DEPENDENCIES

### S0A → S1
```
What S0A delivers:
├─ E2E moderação tests ← MUST complete
├─ Full staging validation ← MUST complete
└─ Production-ready code merge ← MUST complete

What S1 needs from S0A:
├─ Email system tested ✅
├─ Auth validated ✅
├─ Sentry live ✅
└─ Zero P0 bugs in staging ← MUST be true

Start condition for S1:
└─ S0A Fase C frontend DONE (dashboard admin)
   AND E2E moderação tests ≥80% passing
```

### S1 → S2
```
What S1 delivers:
├─ Creator dashboard operable
├─ Public pages navigable
├─ Glossário + tooltips published
└─ All content created and seeded

What S2 needs from S1:
├─ Content platform fully working ✅
├─ Auth/email robust ✅
└─ Production baseline stable ← MUST be true

Start condition for S2:
└─ S1 features in production (2026-04-15)
   AND zero P0 bugs observed in prod for 48h
```

### S2 → Beta
```
What S2 delivers:
├─ FIRE simulator MVP operable
└─ All code production-ready

What Beta needs:
├─ All S1 features + S2 features live in prod
├─ Metrics dashboard active
├─ Support channels ready
└─ Go/No-Go validation DONE

Start condition for Beta:
└─ ALL checklist items ✅
   AND Go/No-Go approval from Product Owner
```

---

## ⚠️ RISK PROPAGATION

### If Moderação E2E slips 1 week
```
Novo timeline:
├─ S0A ends: 2026-04-01 (4 dias atrasados)
├─ S1 ends: 2026-04-15 (4 dias atrasados)
├─ S2 ends: 2026-04-25 (4 dias atrasados)
└─ Beta launch: 2026-04-30 (10 dias atrasados)

Mitigation:
├─ Paralelizar S1 com fim de S0A (start S1 mesmo sem E2E completo)
├─ Rodar E2E tests em background (não bloqueia feature work)
├─ Se necessário: simplificar E2E scope (happy path only)
└─ Risk acceptance: Beta launch ~final week de Abril
```

### If Creator Dashboard não consegue ser feito em 4 dias
```
Opção A: Use mock UI
├─ Static page que mostra conteúdo
├─ Não é editável durante beta
└─ Criadores manually added by admin

Opção B: Delay S1 feature
├─ Extend timeline a 2026-04-15 (não é viável)
└─ FIRE simulator cut entirely

Opção C: Simplify dashboard
├─ Only "publish existing content"
├─ Remove analytics/stats initially
├─ Add full dashboard post-beta
└─ Still delivers value

Recomendado: Opção C (funcional mas simples)
```

### If Public Pages performance is terrible
```
Escalation:
├─ Day 1: Identify bottleneck (query? rendering? payload?)
├─ Day 2: Quick fix (add index? lazy load? cache?)
├─ Day 3: Full optimization sprint if needed
└─ Decision: Beta launch with reduced features if optimization fails

Fallback: Launch without /explorar if it's the problem
├─ Keep /criadores e /artigos/:slug
├─ Add /explorar 1st week of beta
└─ Still validates platform, just less content discovery
```

---

## 📊 RESOURCE ALLOCATION BY SPRINT

### S0A (Current Week)
```
Backend: CTO (~40% time)
├─ S0A Fase B smoketesting
├─ E2E moderação setup
└─ Tech debt review

Frontend: Frontend Lead (~80% time)
├─ S0A Fase C dashboard (4 dias)
├─ Performance profiling (~2 dias)
└─ Mobile testing

QA: QA Lead (~100% time)
├─ E2E moderação scripts
├─ Regression suite
└─ Staging validation

TOTAL: ~4 FTE equivalent
```

### S1 (Next 2 weeks)
```
Backend: CTO (~20% time)
├─ Bug fixes from S0A
├─ API improvements
└─ Infrastructure tuning

Frontend: 2x Frontend Engineers (~100% each)
├─ Creator dashboard: 1 engineer
├─ Public pages: 1 engineer
└─ Tools UI: shared

Content: Content Lead (~80% time)
├─ Glossário: write 100 terms
├─ Copy editing
└─ Directory curation

QA: QA Lead (~100% time)
├─ Regression suite
├─ S1 feature testing
└─ Mobile/cross-browser

TOTAL: ~5 FTE equivalent
```

### S2 (Week 4-5)
```
Backend: Backend Engineer (~60% time)
├─ FIRE simulator: models + API
└─ Performance optimization

Frontend: Frontend Lead + 1 engineer (~80% each)
├─ FIRE simulator UI
├─ Charts/graphs
└─ Polish

QA: QA Lead (~100% time)
├─ FIRE testing
├─ Production validation
└─ Beta prep

Product: Product Manager (~100% time)
├─ Beta communications
├─ Metrics setup
└─ Go/No-Go decision

TOTAL: ~4 FTE equivalent
```

---

## ✅ DEPENDENCY CHECKLIST

Before starting cada sprint:

### Before S1 starts (2026-03-26)
- [ ] S0A Fase B 100% complete and merged
- [ ] S0A Fase C dashboard 100% complete and tested
- [ ] E2E moderação tests ≥80% passing
- [ ] Staging environment matches production config
- [ ] All creators backend models finalized ✅
- [ ] Database seeded with mock creators
- [ ] Content models indexed for performance

### Before S2 starts (2026-04-09)
- [ ] S1 all features merged to main
- [ ] Production deployment successful (2026-04-15)
- [ ] Zero P0 bugs in production for 48h
- [ ] Metrics baseline established
- [ ] Glossário finalized (100 terms)
- [ ] All public pages tested and responsive
- [ ] Creator dashboard in use by 1+ mock user

### Before Beta launch (2026-04-20)
- [ ] S2 all features merged and tested
- [ ] FIRE simulator in production
- [ ] Performance baseline: <3s homepage, <5s tools
- [ ] Go/No-Go approval signed
- [ ] Beta user list prepared (20-50)
- [ ] Discord + support channels ready
- [ ] Metrics dashboard live
- [ ] Backup restoration tested

---

## 📝 Decision Matrix: What if X happens?

| Scenario | Impact | Decision | Owner | Timeline |
|----------|--------|----------|-------|----------|
| E2E tests fail hard on 2026-04-08 | HIGH | Simplify tests (happy path) or delay beta 1 week | QA Lead | By 2026-04-09 |
| Creator dashboard too complex | HIGH | Use static mockup + manual content creation | Frontend Lead | By 2026-03-30 |
| Public pages have perf issues | MEDIUM | Optimize or launch MVP without /explorar | Frontend Lead | By 2026-04-08 |
| FIRE too ambitious | MEDIUM | Cut to simple portfolio tracker (no simulator) | Backend Lead | By 2026-04-09 |
| Glossário content not ready | LOW | Launch with 50 terms, add more in beta | Content Lead | By 2026-04-08 |
| Critical bug found pre-beta | MEDIUM | Hotfix if <2h, else delay 1 day | CTO | On discovery |
| Staging perf is terrible | HIGH | Performance optimization sprint (3 days) | Backend Lead | Immediately |

---

**Documento Final de Referência**  
**Propriedade:** Product Release Agent  
**Próxima atualização:** 2026-03-25 (S0A completion review)
