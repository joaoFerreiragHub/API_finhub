# 🗺️ ROADMAP DETALHADO BETA — FinHub API

**Data:** 2026-03-17  
**Versão:** 2.0  
**Status:** Planejamento Executivo para Beta Release  
**Responsável:** Product Release Agent

---

## 📋 Índice Executivo

1. **Features por Prioridade** — Lista completa com estado e esforço
2. **Dependências** — Mapa de bloqueadores
3. **Timeline & Sprint** — Cronograma visual
4. **Critérios Go/No-Go** — Validações antes do beta
5. **Recomendações** — Próximos passos

---

## 1️⃣ FEATURES ORDENADAS POR PRIORIDADE

### 🔴 CRÍTICA — Sem isto, não há beta viável

| ID | Feature | Estado | Esforço | Sprint | Dependências | Owner |
|---|---------|--------|---------|--------|--------------|-------|
| **CRIT-001** | Email transacional (verificação + reset) | ✅ DONE | Fechado | — | — | Email Service |
| **CRIT-002** | Verificação de email | ✅ DONE | Fechado | — | CRIT-001 | Auth Guards |
| **CRIT-003** | Reset de password | ✅ DONE | Fechado | — | CRIT-001 | Auth Flow |
| **CRIT-004** | Auth robusto (JWT + refresh) | ✅ DONE | Fechado | — | — | Auth Service |
| **CRIT-005** | Páginas legais (Termos, Privacidade, Aviso Financeiro) | ✅ DONE | Médio | — | — | Legal/Frontend |
| **CRIT-006** | Cookie consent + RGPD banner | ✅ DONE | Pequeno | — | — | Frontend |
| **CRIT-007** | S3 / Object Storage (upload de imagens) | ✅ DONE | Pequeno-Médio | — | — | Infra |
| **CRIT-008** | Sentry error tracking em produção | ✅ DONE | Pequeno | — | — | Infra |
| **CRIT-009** | Docker + CI/CD básico | ✅ DONE | Médio | — | — | DevOps |
| **CRIT-010** | Remover dev tokens da produção | ✅ DONE | Pequeno | — | — | Security |
| **CRIT-011** | Moderação hardening (E2E tests) | 🟡 IN-PROGRESS | Médio | S0A | — | QA |
| **CRIT-012** | Rate limiter Redis validado | ✅ DONE | Pequeno | — | — | Infra |
| **CRIT-013** | Disclaimer financeiro visível em ferramentas | ✅ DONE | Pequeno | — | — | Frontend |

**Status Crítico:** 12/13 DONE (92%) — Apenas E2E tests de moderação em progresso

---

### 🟠 ALTA — Essencial para MVP funcional

| ID | Feature | Estado | Esforço | Sprint | Dependências | Owner |
|---|---------|--------|---------|--------|--------------|-------|
| **ALTA-001** | Backend de criadores (CRUD) | ✅ DONE | Médio | — | — | Content Platform |
| **ALTA-002** | Modelos content types (Artigos, Vídeos, Cursos, Reels, etc) | ✅ DONE | Médio-Alto | — | — | Content Platform |
| **ALTA-003** | Endpoints públicos criadores | 🟡 IN-PROGRESS | Médio | S0A | ALTA-002 | Content Platform |
| **ALTA-004** | Pagina explorar/descobrir conteúdo | 🟡 IN-PROGRESS | Médio | S0A | ALTA-003 | Frontend |
| **ALTA-005** | Detalhe artigo/vídeo/curso (público) | 🟡 IN-PROGRESS | Médio | S0A | ALTA-003 | Frontend |
| **ALTA-006** | Listagem e perfil público de criadores | 🟡 IN-PROGRESS | Médio | S0A | ALTA-003 | Frontend |
| **ALTA-007** | Creator dashboard MVP (meu conteúdo, criar, editar) | 🔴 TODO | Médio | S1 | ALTA-001 | Frontend |
| **ALTA-008** | Comments universais + ratings | ✅ DONE | Médio | — | — | Content Platform |
| **ALTA-009** | Moderação de conteúdo (reports, review, actions) | ✅ DONE | Alto | — | — | Moderation |
| **ALTA-010** | Admin dashboard (22 scopes) | ✅ DONE | Alto | — | — | Admin |
| **ALTA-011** | Agent activity dashboard (Fase B concluída) | 🟡 IN-PROGRESS | Médio-Alto | S0A | — | CTO/Dashboard |
| **ALTA-012** | Homepage integrada | ✅ DONE | Médio | — | — | Frontend |
| **ALTA-013** | Assisted sessions + consent flow | ✅ DONE | Médio | — | — | Privacy/Frontend |
| **ALTA-014** | Audit logs + export CSV | ✅ DONE | Pequeno-Médio | — | — | Admin |

**Status Alto:** 10/14 DONE (71%) — Endpoints e frontend em progresso

---

### 🟡 MÉDIA — Importante para diferenciação

| ID | Feature | Estado | Esforço | Sprint | Dependências | Owner |
|---|---------|--------|---------|--------|--------------|-------|
| **MED-001** | Ferramentas fixadas (Stocks, ETFs, REITs, Crypto) | ✅ DONE | Alto | — | — | Financial Tools |
| **MED-002** | Watchlist com CRUD | ✅ DONE | Médio | — | MED-001 | Financial Tools |
| **MED-003** | Correção: Crypto market cap (real, não mock) | ✅ DONE | Pequeno | — | MED-001 | Financial Tools |
| **MED-004** | Correção: ETF overlap disclaimer | ✅ DONE | Pequeno | — | MED-001 | Financial Tools |
| **MED-005** | Correção: Watchlist batch API | ✅ DONE | Pequeno | — | MED-001 | Financial Tools |
| **MED-006** | Sorting em watchlist (preço, variação, nome) | 🟡 IN-PROGRESS | Pequeno | S0A | MED-002 | Frontend |
| **MED-007** | 24h% visível em crypto e watchlist | 🟡 IN-PROGRESS | Pequeno | S0A | MED-001 | Frontend |
| **MED-008** | Expense ratio em ETF | 🟡 IN-PROGRESS | Pequeno | S0A | MED-001 | Frontend |
| **MED-009** | Data quality badge nas análises | 🟡 IN-PROGRESS | Pequeno-Médio | S1 | MED-001 | Frontend |
| **MED-010** | Glossário financeiro (100+ termos) | 🔴 TODO | Médio | S1 | — | Content |
| **MED-011** | Tooltips contextuais (?) nas métricas | 🔴 TODO | Pequeno-Médio | S1 | — | Frontend |
| **MED-012** | Micro-tips "Sabias que..." | 🔴 TODO | Pequeno | S2 | — | Content |
| **MED-013** | Portfolio + FIRE simulator (fase 1) | 🔴 TODO | Alto | S2 | ALTA-001 | Financial Tools |
| **MED-014** | Directório público (GET endpoints) | ✅ DONE | Médio | — | — | Directory |
| **MED-015** | Página index directório | 🔴 TODO | Pequeno | S1 | MED-014 | Frontend |
| **MED-016** | Detalhe entidade (público) | 🔴 TODO | Pequeno | S1 | MED-014 | Frontend |

**Status Médio:** 7/16 DONE (44%) — Ferramentas core OK, UI e conteúdo educativo em construção

---

### 🟢 BAIXA — Pós-beta ou melhorias iterativas

| ID | Feature | Estado | Esforço | Sprint | Dependências | Owner |
|---|---------|--------|---------|--------|--------------|-------|
| **BAIXA-001** | PWA / Offline support | 🔴 TODO | Alto | Post-Beta | — | Frontend |
| **BAIXA-002** | Notificações push | 🔴 TODO | Médio-Alto | Post-Beta | — | Backend |
| **BAIXA-003** | Integração com corretoras reais | 🔴 TODO | Muito Alto | Post-Beta | — | Financial Tools |
| **BAIXA-004** | Screener avançado | 🔴 TODO | Alto | Post-Beta | MED-001 | Financial Tools |
| **BAIXA-005** | DCA calculator | 🔴 TODO | Médio | Post-Beta | MED-001 | Financial Tools |
| **BAIXA-006** | Tax calculator | 🔴 TODO | Médio | Post-Beta | — | Financial Tools |
| **BAIXA-007** | Comunidade (forum, discussions) | 🔴 TODO | Muito Alto | Post-Beta | ALTA-001 | Social |
| **BAIXA-008** | Market pulse (contexto mercado) | 🔴 TODO | Alto | Post-Beta | — | Analytics |
| **BAIXA-009** | Gamificação (badges, points, leaderboards) | 🔴 TODO | Médio-Alto | Post-Beta | ALTA-001 | Social |
| **BAIXA-010** | Mobile app nativa (iOS/Android) | 🔴 TODO | Muito Alto | Post-Beta | — | Mobile |
| **BAIXA-011** | Learning paths + quizzes | 🔴 TODO | Médio-Alto | Post-Beta | MED-010 | Education |
| **BAIXA-012** | Pagamentos/Subscriptions | 🔴 TODO | Muito Alto | Post-Beta | — | Revenue |
| **BAIXA-013** | Affiliate/Partner program | 🔴 TODO | Alto | Post-Beta | — | Revenue |

**Status Baixa:** 0/13 DONE (0%) — Todas após validação com utilizadores reais

---

## 2️⃣ MAPA DE DEPENDÊNCIAS

```
CRITÉRIOS DE ENTRADA BETA:
│
├─→ [CRIT-001 a 010] — Fundação (12 items)
│   └─→ Email + Auth + Legal + Storage + Infra ✅
│
├─→ [CRIT-011] — E2E tests moderação (in-progress)
│
└─→ [ALTA-001 a 009] — Conteúdo + Comunidade (9 items)
    ├─→ Backend criadores [ALTA-001, ALTA-002] ✅
    ├─→ Endpoints públicos [ALTA-003] 🟡 IN-PROGRESS
    ├─→ Páginas públicas [ALTA-004, ALTA-005, ALTA-006] 🟡 IN-PROGRESS
    ├─→ Creator dashboard [ALTA-007] 🔴 TODO
    ├─→ Comments + ratings [ALTA-008] ✅
    ├─→ Moderação [ALTA-009] ✅
    └─→ Dashboard admin [ALTA-010] ✅

DIFERENCIAÇÃO:
│
├─→ Ferramentas V1 [MED-001 a MED-009]
│   ├─→ Core funcional ✅
│   ├─→ UI melhorias 🟡 IN-PROGRESS
│   └─→ Badges de qualidade 🔴 TODO
│
├─→ Educação V1 [MED-010, MED-011]
│   ├─→ Glossário 🔴 TODO
│   └─→ Tooltips 🔴 TODO
│
└─→ Directório [MED-014, MED-015, MED-016]
    ├─→ Backend ✅
    └─→ Páginas públicas 🔴 TODO

BÓNUS (se tempo):
│
└─→ FIRE Simulator [MED-013] 🔴 TODO
    └─→ Portfolio CRUD + Simulador + Gráficos
```

---

## 3️⃣ TIMELINE & SPRINTS

### 📅 Cronograma de Realização

```
ATUAL: Sprint S0A (2026-03-17 → ~2026-03-25)
├─ Fase B (Backend): ✅ DONE (5/6 tasks)
├─ Fase C (Frontend): 🟡 0/7 started
└─ Dependências: E2E tests, Agent dashboard frontend

S1: Sprint (2026-03-26 → ~2026-04-08, 12 dias úteis)
├─ ALTA-007: Creator dashboard MVP
├─ MED-009, MED-010, MED-011: Educação + Data quality badges
├─ MED-015, MED-016: Directório páginas públicas
└─ Estimativa: ~60-70 pontos

S2: Sprint (2026-04-09 → ~2026-04-22, 12 dias úteis)
├─ MED-013: FIRE Simulator (core)
├─ BAIXA-012: Notificações básicas (opcional)
└─ Estimativa: ~40-50 pontos

GATES DE VALIDAÇÃO:
├─ 2026-03-25: Fim S0A → código QA + E2E moderação
├─ 2026-04-08: Fim S1 → MVP funcional validado
└─ 2026-04-15: Ambiente staging → testes de aceitação

BETA LAUNCH: ~2026-04-20 (20-50 early users)
```

### 📊 Velocidade e Estimativas

| Sprint | Features | Pontos Est. | Pontos Real | Velocity | Risco |
|--------|----------|-------------|-------------|----------|-------|
| S0A | 4 main | 40 | TBD | TBD | 🟡 Médio (fase C atrasada) |
| S1 | 6 main | 60-70 | — | — | 🟡 Médio (conteúdo complexo) |
| S2 | 2 main | 40-50 | — | — | 🟠 Alto (FIRE é feature grande) |

---

## 4️⃣ CRITÉRIOS DE ENTRADA/SAÍDA PARA BETA

### ✅ ENTRADA (Go/No-Go Checklist)

Antes de convidar utilizadores, confirmar:

| Critério | Validação | Owner | Status |
|----------|-----------|-------|--------|
| **Email** | Enviar verificação + reset a 5 emails reais | Email Service | ✅ DONE |
| **Auth** | Login, logout, refresh token, expiry — 0 falhas | Auth Guards | ✅ DONE |
| **Disclaimer** | Visível em todas as páginas de ferramentas | Frontend | ✅ DONE |
| **Termos + Privacidade** | Páginas acessíveis, aceite no registo | Frontend | ✅ DONE |
| **Moderação E2E** | Report → review → action testado, appeal funciona | QA | 🟡 IN-PROGRESS |
| **Dev tokens** | 0 tokens `dev-*` em produção | Security | ✅ DONE |
| **Dados corretos** | Crypto marketcap real, ETF disclaimer, watchlist batch | Financial Tools | ✅ DONE |
| **Error tracking** | Sentry a capturar erros em staging | Infra | ✅ DONE |
| **Performance** | Páginas <3s, ferramentas <5s, 95th percentile | Frontend/Backend | 🟡 TBD |
| **Mobile responsive** | Layout funcional em mobile (não perfeito) | Frontend | ✅ DONE |
| **Conteúdo público** | Explorar + detalhe artigo/vídeo/criador funcionam | Frontend | 🟡 IN-PROGRESS |
| **Creator profile** | Criadores conseguem publicar e ter perfil público | Content Platform | 🟡 IN-PROGRESS |
| **Audit trail** | Admin logs de todas as ações críticas | Admin | ✅ DONE |
| **Smoke test suite** | Suite de testes críticos 100% green | QA | 🟡 IN-PROGRESS |

**GO/NO-GO Decision:** Quando todos os critérios estiverem ✅, autorizar beta launch.

---

### 🎯 SAÍDA (Quando finalizar Beta)

Não encerrar beta sem validar:

| Métrica | Target | Medição | Owner |
|---------|--------|---------|-------|
| **Registos** | 20-50 users únicos | DB count | Product |
| **Retenção D7** | >40% | Users que voltam apos 7 dias | Analytics |
| **Ferramentas usadas** | >3 análises/user | API logs | Analytics |
| **Conteúdo consumido** | >5 artigos/user | Page views | Analytics |
| **NPS** | >30 | Survey pós-beta | Product |
| **Bugs críticos** | 0 | Sentry + feedback | QA |
| **Feedback qualitativo** | 80% respondentes | Survey aberto | Product |

---

## 5️⃣ RECOMENDAÇÕES E PRÓXIMOS PASSOS

### 🚀 Ações Imediatas (Próximos 3 dias)

1. **Fechar S0A em full**
   - Completar Fase C (frontend dashboard agent)
   - Rodar smoke test suite — confirmar 0 regressions
   - Mergear para `main` e fazer release para staging

2. **Validar Critérios Críticos**
   - [ ] Tester independente testa 5 fluxos críticos:
     - Registo → Verificação → Logout/Login
     - Password reset flow
     - Criar conteúdo (mock criador)
     - Report + moderação
     - Navegar conteúdo público
   - [ ] Performance profiling em staging

3. **Preparar S1 Backlog**
   - Design specs para Creator dashboard MVP
   - Copy writing para Glossário (100 termos)
   - Decidir: usar Glossário community-built ou editorial?

### 🎬 Sprint S1 (Próximas 2-3 semanas)

**Objetivo:** MVP funcional com conteúdo educativo básico.

**Ordem de implementação:**

1. **ALTA-007** (Creator dashboard MVP) — 3-4 dias
   - Template com 3 vistas: My Content, Create, Analytics básicas
   - Permite publicar artigo/vídeo/curso
   - Backend endpoints já existem

2. **MED-010, MED-011** (Educação básica) — 3-4 dias
   - Glossário: CMS com 100 termos pré-preenchidos
   - Tooltips: componente reutilizável com popover
   - Search em glossário

3. **MED-015, MED-016** (Directório público) — 2 dias
   - Index com categorias (corretoras, seguradoras, fintechs)
   - Detalhe entidade com ratings + comments

4. **MED-006, MED-007, MED-008, MED-009** (UI das ferramentas) — 2-3 dias
   - Sorting em watchlist
   - 24h% em crypto
   - Expense ratio em ETF
   - Data quality badge

### 🏆 Sprint S2 (Semana 4-5)

**Objetivo:** Feature flagship FIRE simulator.

**Recomendação:** Considerar simplificar para MVP:
- [ ] Portfolio CRUD (adicionar/remover ativos)
- [ ] Simulação de 1 cenário (base) em vez de 3
- [ ] Gráfico de projeção simples (linha ou area)
- [ ] Milestone tracker ("Estás em 25% do teu objetivo")

**Evitar na Fase 1:**
- ❌ Monte Carlo avançado (complexo, pouco valor no beta)
- ❌ Otimização automática de portfolio (muito AI-heavy)
- ❌ Integração com corretoras reais (validar demanda antes)

---

## 6️⃣ ESTRUTURA DE OWNERSHIP & ROLES

| Role | Responsabilidades | Assignee |
|------|-------------------|----------|
| **Product Owner** | Priorização, go/no-go decisions, feedback aggregation | — |
| **Backend Lead** | Backend specs, APIs, data integrity | CTO |
| **Frontend Lead** | UI/UX, responsive, performance budgets | — |
| **QA/Release** | Smoke tests, regression suites, checklist | — |
| **DevOps** | Docker, CI/CD, staging/prod parity | — |
| **Content Lead** | Glossário, tooltips, copy writing | — |

**Recomendação:** Designar owner claro para cada feature — evita ownership diffuse.

---

## 7️⃣ RISCOS E MITIGAÇÕES

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Fase C (dashboard) atrasa** | Beta adiado 1 semana | 🟡 Média | Paralelizar com S1 backend |
| **E2E tests de moderação complexos** | Critério crítico não atingido | 🟡 Média | Simplificar suite, focar happy path |
| **Creator onboarding baixo** | Falta de conteúdo para beta | 🟠 Alta | Criar 5-10 conteúdos mock em staging |
| **Performance em mobile** | Beta exclusivo desktop | 🟡 Média | Começar testes em mobile week 1 |
| **FIRE simulator é maior que esperado** | Atraso em S2 | 🟡 Média | Cortar features avançadas no MVP |
| **Dados financeiros outdated** | Utilizadores veem info errada | 🟢 Baixa | Validar freshness de dados em smoke test |

---

## 📝 CHECKLIST FINAL — PREPARAÇÃO PARA BETA

Copiar este checklist para uma issue/task e completar antes do launch:

```markdown
## Beta Launch Readiness Checklist

### Critérios Técnicos (Go/No-Go)
- [ ] Todos os items críticos (CRIT-001 a CRIT-013) ✅
- [ ] Smoke test suite 100% green
- [ ] Performance baseline validada (<3s homepage, <5s ferramentas)
- [ ] Sentry a capturar erros sem noise
- [ ] Staging environment espelha produção

### Critérios de Conteúdo
- [ ] 5-10 conteúdos de criadores mock em staging
- [ ] Glossário com 100 termos ativos
- [ ] Directório com 20+ entidades públicas

### Critérios de UX
- [ ] Fluxo de registo testado end-to-end
- [ ] Explorar/descobrir conteúdo funciona
- [ ] Creator dashboard permite publicar
- [ ] Moderação flow testado (report → action)

### Critérios Operacionais
- [ ] On-call rotation definido para beta
- [ ] Runbooks de incidente atualizados
- [ ] Alertas de infra configurados (CPU, memory, error rate)
- [ ] Backup strategy em produção

### Comunicação
- [ ] Email de convite redigido e pronto
- [ ] FAQ/Help docs escritos
- [ ] Feedback form/survey configurado
- [ ] Canais de suporte (Discord/email) ativos

### Métricas
- [ ] Dashboard de métricas beta setup (registos, DAU, NPS)
- [ ] Eventos de analytics instrumentados
- [ ] Logs estruturados para debugging

### Decisão Final
- [ ] Product Owner dá GO/NO-GO
- [ ] Launch date confirmado
- [ ] Stakeholders notificados
```

---

## 📚 Documentos Relacionados

- **ROADMAP_BETA.md** — Roadmap anterior (wave-based)
- **P5_PRE_BETA_PLATAFORMA.md** — Análise pré-beta detalhada
- **P5_CRIADORES_CONTEUDO.md** — Especificação de criadores
- **P5_MARCAS_ENTIDADES.md** — Especificação de directório
- **P5_FIRE_PORTFOLIO_SIMULATOR.md** — Especificação FIRE
- **RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md** — Operações de release

---

## 🎯 Sumário Executivo

**Status Geral:** 59% de features DONE (33/56)

**Caminho para Beta:**
- ✅ Fundação crítica: 92% completa (12/13) — só E2E tests faltando
- 🟡 MVP funcional: 71% completa (10/14) — endpoints e UI públicas em progresso
- 🟡 Diferenciação: 44% completa (7/16) — ferramentas OK, educação/UI pendente

**Timeline Estimada:**
- **S0A (atual):** Fim 2026-03-25 → MVP backend 100%
- **S1 (próxima):** 2026-03-26 → 2026-04-08 → MVP public-facing 100%
- **S2 (final):** 2026-04-09 → 2026-04-22 → Feature flagship + polishing
- **BETA:** ~2026-04-20 (depois de validação)

**Próximos Passos Imediatos:**
1. Fechar S0A (Fase C frontend)
2. Rodar checklist de validação crítica
3. Planear S1 backlog com equipa
4. Designar owners por feature

---

**Documento criado por:** Product Release Agent  
**Data:** 2026-03-17  
**Revisão recomendada:** 2026-03-25 (fim de S0A)
