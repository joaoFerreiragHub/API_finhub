# ✅ CRITÉRIOS GO/NO-GO PARA BETA

**Documento:** Beta Release Decision Framework  
**Data:** 2026-03-17  
**Responsável:** Product Release Agent

Este documento define o **exatamente o que precisa estar pronto** antes de convidar utilizadores reais para beta.

---

## 🎯 3 Níveis de Go/No-Go

### NÍVEL 1: BLOQUEADORES CRÍTICOS (Must-Have)
**Se falta QUALQUER item, beta NÃO se lança.**

| # | Critério | Validação | Owner | Status |
|---|----------|-----------|-------|--------|
| 1 | Email transacional funciona | Enviar 5 emails de teste (verif + reset) | Backend | ✅ DONE |
| 2 | Auth JWT robusto | Login/logout/refresh/expiry testados | Backend | ✅ DONE |
| 3 | Password reset seguro | Token TTL 30min, invalidação de sessões | Backend | ✅ DONE |
| 4 | Verificação de email obrigatória | Email não verificado = sem acesso | Backend | ✅ DONE |
| 5 | Disclaimer financeiro visível | Visível em TODAS as ferramentas | Frontend | ✅ DONE |
| 6 | Termos de Serviço acessíveis | Página /termos + aceite no registo | Frontend | ✅ DONE |
| 7 | Privacidade RGPD completa | Página /privacidade + direitos explicados | Frontend | ✅ DONE |
| 8 | Cookie consent | Banner + RGPD compliance para analytics | Frontend | ✅ DONE |
| 9 | S3/Object storage funciona | Upload de imagens operacional | Infra | ✅ DONE |
| 10 | Sentry error tracking ativo | Erros capturados em produção sem noise | Infra | ✅ DONE |
| 11 | Docker + CI/CD | Deploy reprodutível | DevOps | ✅ DONE |
| 12 | Zero dev tokens em produção | Sem tokens hardcoded `dev-*` | Security | ✅ DONE |
| 13 | Moderação E2E funciona | Report → review → action → appeal OK | QA | 🟡 IN-PROGRESS |
| 14 | Público consegue navegar conteúdo | Explorar/detalhe artigo/perfil criador | Frontend | 🟡 IN-PROGRESS |
| 15 | Creator consegue publicar | Dashboard permite criar + publicar conteúdo | Frontend | 🟡 IN-PROGRESS |

**Current Status:** 12/15 DONE ✅

**Decision Rule:** 
- Se ≥15/15 = **GO** ✅
- Se ≥14/15 e item é facilmente fixável = **GO CONDITIONAL** (fix em 24h)
- Se <14/15 = **NO-GO** ❌

---

### NÍVEL 2: QUALIDADE MÍNIMA (Nice-to-Have but Recommended)

| # | Critério | Validação | Owner | Status |
|---|----------|-----------|-------|--------|
| 16 | Performance: Homepage | <3 segundos (p95) | Frontend | 🟡 TBD |
| 17 | Performance: Ferramentas | <5 segundos (p95) | Frontend | 🟡 TBD |
| 18 | Performance: API latency | <500ms mediana, <2s p99 | Backend | 🟡 TBD |
| 19 | Mobile responsive | Layout funcional em mobile (não perfeito) | Frontend | ✅ DONE |
| 20 | Zero critical bugs em staging | Sentry mostra 0 erros críticos | QA | 🟡 TBD |
| 21 | Smoke test suite 100% green | All critical paths passing | QA | 🟡 IN-PROGRESS |
| 22 | Dados financeiros corretos | Crypto marketcap real, não mock | Backend | ✅ DONE |
| 23 | Audit logs completos | Admin vê todas as ações críticas | Admin | ✅ DONE |
| 24 | Backup strategy em produção | Testes de restore funcionam | DevOps | 🟡 TBD |
| 25 | Alertas configurados | CPU, memory, error rate monitorados | Infra | 🟡 TBD |

**Current Status:** 4/10 DONE ✅, 6/10 TBD 🟡

**Decision Rule:**
- Se ≥8/10 = Confidence ALTA 🟢
- Se 5-7/10 = Confidence MÉDIA 🟡 (mitigation plan needed)
- Se <5/10 = Confidence BAIXA 🔴 (delay recomendado)

---

### NÍVEL 3: MARKETING/COMMS (Recomendado antes de launch)

| # | Critério | Validação | Owner | Status |
|---|----------|-----------|-------|--------|
| 26 | Beta invitation email ready | Copy escrita e testada | Product | 🔴 TODO |
| 27 | FAQ/Help docs | At least 5 FAQs covering onboarding | Product | 🔴 TODO |
| 28 | Feedback form | Survey/form link ready | Analytics | 🔴 TODO |
| 29 | Discord community setup | Channel criado, mods assigned | Community | 🔴 TODO |
| 30 | Support SLA | Response time <4h para beta users | Support | 🔴 TODO |
| 31 | On-call rotation | 24/7 coverage for P0 bugs | DevOps | 🔴 TODO |
| 32 | Metrics dashboard | Registos, DAU, NPS, error rate visible | Analytics | 🔴 TODO |

**Current Status:** 0/7 DONE

**Decision Rule:**
- If NÍVEL 1 + most of NÍVEL 2 are DONE, do these in parallel with beta launch (not blockers)

---

## 📋 ENTRADA PARA BETA — Checklist Executivo

**Use this to make final GO/NO-GO decision. Target: 2026-04-15**

```markdown
## PRE-BETA CHECKLIST (Target: 2026-04-15)

### A. TÉCNICO (Bloqueadores)

#### Auth & Security
- [ ] Passei 5 emails através do fluxo: registo → verificação → login → reset → novo login
  - [ ] Email 1 verificado
  - [ ] Email 2 reset password OK
  - [ ] Email 3-5 spot checks
- [ ] JWT tokens expiram corretamente após 15min inatividade
- [ ] Refresh token revalida sem logout
- [ ] Zero `dev-*` tokens em database/config
- [ ] Sentry captura qualquer erro de auth sem exposição de secrets

#### Legal & Compliance
- [ ] Usuário vê disclaimer financeiro em TODAS as 5 ferramentas
- [ ] Termos acessíveis em /termos
- [ ] Privacidade acessível em /privacidade
- [ ] Cookie banner visível e funcional
- [ ] RGPD: opt-in para email marketing
- [ ] No storage de dados desnecessários

#### Content & Features
- [ ] Usuário consegue navegar /explorar e ver conteúdo (mock ou real)
- [ ] Usuário consegue ver detalhe de artigo/vídeo/curso
- [ ] Usuário consegue ver perfil público de criador
- [ ] Creator consegue fazer login → dashboard → criar artigo → publicar
- [ ] Conteúdo publicado aparece em /explorar

#### Moderação & Trust
- [ ] Moderador consegue:
  - [ ] Ver reports de conteúdo
  - [ ] Review e tomar action (mute/suspend/approve)
  - [ ] Ver audit trail da action
- [ ] Utilizador consegue apelar uma suspension

#### Infra & Monitoring
- [ ] S3 upload funciona (testar com 5MB file)
- [ ] Sentry mostra últimas 10 erros de staging
- [ ] Logging estruturado em JSON (debuggable)
- [ ] Backup: restore test realizado com sucesso
- [ ] Docker build é reproducível (`docker build . && npm run start` funciona)

#### Performance
- [ ] Homepage carrega em <3s (measured with Chrome DevTools)
- [ ] Stock lookup (<2s response)
- [ ] Crypto lookup (<2s response)
- [ ] Página de artigo (<2s response)
- [ ] Mobile: funcional em iPhone 12 + Samsung Galaxy S21

#### Database
- [ ] Índices de produção estão em lugar
- [ ] 0 N+1 queries em logs
- [ ] Mongoose schemas validam de forma correta
- [ ] Backup diário está ativo

### B. QUALIDADE (Recomendado)

#### Testing
- [ ] Smoke test suite executada: 90%+ passing
- [ ] Top 3 user flows testados manualmente:
  - [ ] Registo → explorar → ler artigo
  - [ ] Login → criar conteúdo → publicar
  - [ ] View conteúdo → comentar → rate
- [ ] Mobile testing: layout não quebra em <400px width

#### Bugs
- [ ] Zero P0 bugs abertos
- [ ] <5 P1 bugs abertos (documentados)
- [ ] Todos os P2+ bugs conhecidos e triaged

### C. COMUNICAÇÕES

#### Stakeholders
- [ ] Product Owner: Dá GO/NO-GO explícito
- [ ] CTO: Infra pronta
- [ ] QA Lead: Testes OK
- [ ] Support Lead: Pronto para beta users

#### User Comms
- [ ] Email de convite redigido (não enviado)
- [ ] 5 FAQs escritas (como registar, como usar ferramentas, como reportar)
- [ ] Discord criado (ao menos 1 canal #beta)
- [ ] Support email monitored (SLA <4h para beta)

#### Analytics
- [ ] Metrics dashboard ao vivo (NewRelic/DataDog/custom)
- [ ] Events instrumentados:
  - [ ] `user:signup`
  - [ ] `user:email_verified`
  - [ ] `content:created`
  - [ ] `tool:used` (stocks, etf, crypto, watchlist)
  - [ ] `feedback:submitted`

### D. GO/NO-GO DECISION

#### A. Técnico
- [ ] Bloqueadores: ____/15 (target: 15)
- [ ] Qualidade: ____/10 (target: ≥8)

#### B. Comunicações & Dados
- [ ] Checklists C & D: ____/8 (target: 8)

#### FINAL DECISION
- [ ] **PRODUCT OWNER SAYS GO**
- [ ] Reason: _________________________________
- [ ] Signed off by: ___________  Date: _________
- [ ] Beta launch date: 2026-04-20 (ou alternativa)
```

---

## 🚨 Conditional GO Scenarios

### Cenário 1: Performance TBD
**Se performance não foi validada até 2026-04-10, o que fazer?**

```
Opção A (Recomendado): Condicional GO
├─ Lançar beta com 20 users (não 50)
├─ Monitor performance real
├─ Se degradação: rolar back
└─ Otimizar em paralelo para beta público

Opção B: Delay 1 semana
├─ Sprint de performance tuning
├─ Re-test e validar
├─ Lançar com confiança completa
└─ Perdemos 1 semana de feedback

Opção C: Feature cut
├─ Desligar ferramentas complexas temporariamente
├─ Lançar com subset (stocks + ETFs apenas)
└─ Adicionar crypto/FIRE depois
```

**Decisão:** _______________________________

---

### Cenário 2: Moderação E2E não 100%
**Se E2E tests de moderação ainda faltam itens até 2026-04-10:**

```
Opção A: Manual QA + Conditional GO
├─ QA tester roda 3 ciclos completos manually
├─ Documenta edge cases
├─ Lançar com vigilância 24/7 primeiro dia
└─ Automate testes em background

Opção B: Moderation disabled
├─ Desligar reportagem para beta
├─ Users não conseguem reportar (admin-only)
├─ Testar full flow em staging
└─ Habilitar dia 2 do beta

Opção C: Simple moderation only
├─ Apenas approve/mute (sem appeal)
├─ Appeal feature adiado para beta+1 semana
└─ Reduz complexity, still validates core
```

**Decisão:** _______________________________

---

### Cenário 3: Critical Bugs Found Late
**Se encontrado bug P0 no último dia antes de beta:**

```
Triage Checklist:
├─ [ ] Bug afeta funcionalidade crítica? (Y/N)
├─ [ ] Workaround existe? (Y/N)
├─ [ ] Fix é <2 horas? (Y/N)
├─ [ ] Risco de regressão? (Y/N)

Decisão lógica:
├─ Se TODOS = Y → FIX IT (não atrasa)
├─ Se 3/4 = Y → FIX (baixo risco)
├─ Se 2/4 = Y → HOTFIX READY (pronto para deploy em 1h se salta)
├─ Se ≤1 = Y → ATRASA BETA (precisa debugging)
└─ Se DESCONHECIDO → DELAY (não lancamos com unknowns)
```

---

## 📊 Métricas de Saída do Beta

**Depois de 4 semanas de beta, avaliar:**

| Métrica | Target | Real | Status |
|---------|--------|------|--------|
| Registos únicos | 20-50 | — | — |
| Retenção D7 | >40% | — | — |
| Ferramentas usadas | >3 análises/user | — | — |
| Conteúdo consumido | >5 artigos/user | — | — |
| NPS | >30 | — | — |
| Bugs críticos relatados | 0 | — | — |
| Response time support | <4h | — | — |

**Exit Criteria:**
- ✅ ≥4/6 métricas atingidas = Beta bem-sucedido
- 🟡 2-3/6 métricas = Estender beta 2 semanas
- ❌ ≤1/6 métrica = Voltar para desenvolvimento

---

## 🗺️ Linked Documents

- **ROADMAP_BETA_DETALHADO.md** — Feature list completa
- **BETA_TIMELINE_VISUAL.md** — Semana-a-semana
- **STATUS.md** — Estado atual de tarefas (updated daily)
- **RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md** — Ops procedures

---

## ✋ Approval Gate

```
┌─────────────────────────────────────────┐
│ PRE-BETA GO/NO-GO DECISION FORM         │
├─────────────────────────────────────────┤
│                                         │
│ Date: _______________                  │
│ Reviewer: _________________             │
│                                         │
│ Técnico Status: ___/15 Bloqueadores   │
│ Qualidade Status: ___/10 Métricas      │
│ Comms Status: ___/8 Items              │
│                                         │
│ Overall Assessment:                     │
│ ☐ GO — Lançar imediatamente            │
│ ☐ GO-CONDITIONAL — Lançar com mitigações │
│ ☐ NO-GO — Atrasar e refletir           │
│                                         │
│ Rationale: _________________________    │
│ _____________________________________    │
│                                         │
│ Signature: _______________ Date: ____  │
│                                         │
└─────────────────────────────────────────┘
```

---

**Documento de Referência Final**  
**Próxima atualização: 2026-04-10 (Pre-beta decision)**
