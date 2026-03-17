# 📋 README — Roadmap Beta Documentation

**Gerado em:** 2026-03-17  
**Série de Documentos:** Roadmap Beta para FinHub  
**Status:** Planejamento Executivo para Beta Release (~35 dias)

---

## 📚 Documentos Incluídos

Este diretório contém **4 documentos-chave** que definem o caminho até ao beta:

### 1. **ROADMAP_BETA_DETALHADO.md** (Principal)
**O que é:** Mapa completo de features com prioridades, estado, esforço e dependências

**Contém:**
- 🔴 56 features ordenadas em 4 niveis (Crítica, Alta, Média, Baixa)
- 📊 Status atual de cada feature (Done, In-Progress, Todo)
- ⏱️ Estimativas de esforço (Pequeno/Médio/Alto/Muito-Alto)
- 🔗 Dependências explícitas
- 👤 Owner por feature
- 💡 Insights sobre roadmap

**Quando usar:**
- Entender prioritização de features
- Mapear dependências (o que bloqueia o quê)
- Planejar sprints
- Comunicar scope a stakeholders

**Exemplo:**
```
CRÍTICA-011: Moderação E2E tests
Estado: 🟡 IN-PROGRESS
Esforço: Médio
Sprint: S0A (atual)
Dependências: Nenhuma (é um validador)
Owner: QA
Nota: Bloqueador de beta
```

---

### 2. **BETA_TIMELINE_VISUAL.md** (Cronograma)
**O que é:** Semana-a-semana visual do journey até beta + GANTT simplificado

**Contém:**
- 📅 Timeline semana-a-semana (5 semanas)
- 🎯 Tarefas específicas por semana + deliverables
- 🚨 Riscos por semana + mitigações
- ✅ Checklist end-of-week
- 🎉 Beta launch: ~2026-04-20

**Quando usar:**
- Planejar sprints
- Fazer daily standups
- Rastrear progresso
- Comunicar velocidade a stakeholders

**Exemplo de Semana 2:**
```
SEMANA 2 (26-31 Mar) — Early MVP
├─ Creator dashboard MVP (4 dias)
├─ Glossário (design + setup)
├─ Mock content creation
└─ Deliverable: Creator dashboard 50%, glossário data ready
```

---

### 3. **BETA_GO_NOGO_CRITERIA.md** (Validação)
**O que é:** Checklist executivo para decidir "lançar" ou "atrasar" beta

**Contém:**
- ✅ 15 bloqueadores críticos (Must-Have)
- ✅ 10 critérios de qualidade (Nice-to-Have)
- ✅ 7 itens de comunicação/marketing
- 📋 Checklist detalhado (copy-paste ready)
- 🚨 Conditional GO scenarios (o que fazer se X falha)
- 📊 Métricas de saída do beta

**Quando usar:**
- 2-3 semanas antes da data de beta (target: 2026-04-15)
- Para fazer a decisão final de GO/NO-GO
- Para comunicar pronto-ness a stakeholders

**Exemplo:**
```
BLOQUEADOR 1: Email transacional funciona
Validação: Enviar 5 emails de teste (verif + reset)
Status: ✅ DONE
```

---

### 4. **DEPENDENCIES_CRITICAL_PATH.md** (Arquitetura de Dependências)
**O que é:** Mapa de dependências entre features + análise de critical path

**Contém:**
- 🔗 Dependency graph (Camadas 0-3)
- 🎯 Critical path (tarefas que não podem atrasar)
- ⚠️ Blocking dependencies (o que bloqueia beta)
- ⚠️ Risk propagation (se X atrasa, Y atrasa também)
- 📊 Resource allocation por sprint
- 📝 Decision matrix (o que fazer se cenário X)

**Quando usar:**
- Entender inter-dependencies
- Identificar critical path
- Fazer trade-offs (o que cortar se tempo aperta)
- Planejar parallelização

**Exemplo:**
```
Auth ✅ → Email ✅ → Creator Dashboard 🔴 → Public Pages 🟡
└─→ Cada nível bloqueia os próximos
```

---

## 🗂️ Estrutura de Leitura

### Para Product Manager / Owner
**Ordem recomendada:**
1. ROADMAP_BETA_DETALHADO.md (seções 1-3)
2. BETA_TIMELINE_VISUAL.md (visão geral)
3. BETA_GO_NOGO_CRITERIA.md (quando aproximar-se de launch)

**Tempo:** 30 min

---

### Para Tech Lead / Arquiteto
**Ordem recomendada:**
1. DEPENDENCIES_CRITICAL_PATH.md (full read)
2. ROADMAP_BETA_DETALHADO.md (seção 2 - dependências)
3. BETA_TIMELINE_VISUAL.md (sprint planning)

**Tempo:** 45 min

---

### Para QA / Release Manager
**Ordem recomendada:**
1. BETA_GO_NOGO_CRITERIA.md (full read)
2. ROADMAP_BETA_DETALHADO.md (seção 4 - critérios entrada/saída)
3. BETA_TIMELINE_VISUAL.md (semana 1 + validation gates)

**Tempo:** 45 min

---

### Para Frontend / Backend Engineer
**Ordem recomendada:**
1. ROADMAP_BETA_DETALHADO.md (seções 1-2, achar tua feature)
2. DEPENDENCIES_CRITICAL_PATH.md (entender bloqueadores)
3. BETA_TIMELINE_VISUAL.md (teu sprint específico)

**Tempo:** 30 min

---

## 📊 Status Geral — One-Liner

**59% de features DONE (33/56 features)**
- ✅ Fundação crítica: 92% (12/13 items)
- 🟡 MVP funcional: 71% (10/14 items)
- 🟡 Diferenciação: 44% (7/16 items)
- 🔴 Pós-beta: 0% (0/13 items)

**Timeline:** ~35 dias até beta (2026-04-20)

---

## 🎯 Próximos Passos — Imediato (Esta Semana)

### ✅ Priority 1: Fechar S0A
```
Objetivo: Ter sprint completo, código em produção, validações OK
Prazos:
├─ Hoje (17-03): S0A Fase C frontend começar
├─ Amanhã (18-03): Smoke test suite rodar
├─ 19-22 Mar: Validações de produção
├─ 25-Mar: MERGE para main + tag release
└─ 25-Mar: Deploy staging completo
```

**Responsável:** CTO / Frontend Lead

---

### ✅ Priority 2: S1 Backlog Prep
```
Objetivo: Features definidas, design specs prontas
Prazos:
├─ 18-03: Review P5_CRIADORES (creator dashboard specs)
├─ 19-03: Wireframes de creator dashboard + public pages
├─ 20-03: Glossário copy (100 termos outline)
├─ 22-03: Sprint planning meeting (com equipa)
└─ 26-03: S1 inicia
```

**Responsável:** Product Manager / Designers

---

### ✅ Priority 3: Validação Crítica
```
Objetivo: Confirmar que fundação está OK
Checklist:
├─ [ ] Tester: registo → verificação → reset password (5 emails)
├─ [ ] Tester: API moderação flow (report → action)
├─ [ ] Infra: Performance baseline (staging = prod config)
├─ [ ] QA: Regression suite run (0 surpresas)
└─ [ ] Security: dev tokens removal verification
```

**Responsável:** QA Lead / Security

---

## 📋 Reuniões Recomendadas

### Weekly Standups (Daily optional, Weekly mandatory)
**Who:** Core team + stakeholders  
**When:** Every Friday 15:00  
**Duration:** 30 min  
**Agenda:**
- Status por sprint
- Blockers encontrados
- Forecast para próxima semana
- Risk escalations

**Owner:** Product Manager

---

### Pre-Beta Gate Review
**Who:** Product Owner + CTO + QA Lead + (Finance)  
**When:** 2026-04-10 (6 days before planned launch)  
**Duration:** 1h  
**Agenda:**
- Checklist: todos items cobertos?
- Riscos: há algo que justifica atrasar?
- Go/No-Go decision
- Communication plan

**Owner:** Product Manager

---

### Beta Launch Day
**Who:** Full team + on-call rotation  
**When:** 2026-04-20  
**Duration:** 2h (monitoring window)  
**Agenda:**
- Final validation (5 min)
- Send invitations (2 min)
- Monitor Sentry + metrics (live)
- Respond to first user feedback

**Owner:** Product Manager / DevOps

---

## 🔄 Update & Review Cycle

### Daily
- **Owner:** Sprint lead (CTO on S0A, Frontend Lead on S1)
- **Action:** Update STATUS.md com progresso real
- **Where:** dcos/tasks/STATUS.md
- **Tempo:** 5 min

### Weekly
- **Owner:** Product Manager
- **Action:** Reunião Friday standup (acima)
- **Onde:** Sync com stakeholders
- **Tempo:** 30 min

### Bi-Weekly (antes de sprint mudança)
- **Owner:** Product Manager
- **Action:** Atualizar este README com status
- **Onde:** dcos/agents/product-release/
- **Tempo:** 15 min

---

## 🚨 Escalation Paths

### If timeline is slipping
1. **Email:** Product Manager → CTO + stakeholders
2. **Trigger:** Feature é >1 dia atrasado vs. plan
3. **Action:** Emergency standup (30 min)
4. **Decision:** Cut feature ou extend timeline

### If critical bug found
1. **Email:** QA Lead → CTO + Product Manager
2. **Trigger:** P0 ou bloqueador de beta
3. **Action:** Emergency debug session
4. **Decision:** Fix imediato ou accept risk

### If performance is bad
1. **Email:** Frontend Lead → CTO
2. **Trigger:** p95 latency > target (>3s homepage)
3. **Action:** Performance sprint (2-3 days)
4. **Decision:** Optimize ou scrap feature

---

## 📞 Contacts & Owners

| Role | Person | Email | Slack |
|------|--------|-------|-------|
| Product Owner | — | — | — |
| CTO / Backend Lead | — | — | — |
| Frontend Lead | — | — | — |
| QA Lead | — | — | — |
| DevOps / Infra | — | — | — |
| Content Lead | — | — | — |
| Product Release Agent | Agent | dcos/agents/product-release | N/A |

**TODO:** Preencher com pessoas reais

---

## 📚 Related Documents (Fora deste diretório)

- **P5_PRE_BETA_PLATAFORMA.md** — Análise detalhada do que falta (anterior)
- **P5_CRIADORES_CONTEUDO.md** — Especificação de criadores
- **P5_MARCAS_ENTIDADES.md** — Especificação de directório
- **P5_FIRE_PORTFOLIO_SIMULATOR.md** — Especificação FIRE simulator
- **RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md** — Operações de release
- **STATUS.md** — Estado atual de tarefas (updated daily)

---

## 🎓 Quick Reference

### Features By Urgency (Pick 1)
- **"What blocks beta?" →** See DEPENDENCIES_CRITICAL_PATH.md
- **"When are we launching?" →** See BETA_TIMELINE_VISUAL.md
- **"Is X feature done?" →** See ROADMAP_BETA_DETALHADO.md
- **"What do we need to validate before launch?" →** See BETA_GO_NOGO_CRITERIA.md

### Questions Answered

**Q: Quando é que o beta lança?**  
A: ~2026-04-20 (se tudo corre a tempo). Ver BETA_TIMELINE_VISUAL.md.

**Q: Qual é a feature mais crítica agora?**  
A: E2E moderação tests + Creator dashboard. Ver DEPENDENCIES_CRITICAL_PATH.md.

**Q: Quanto esforço é preciso para feature X?**  
A: Ver ROADMAP_BETA_DETALHADO.md seção 1, procura por feature ID.

**Q: Se X atrasa 1 semana, qual é o impacto?**  
A: Ver DEPENDENCIES_CRITICAL_PATH.md seção "Risk Propagation".

**Q: Estamos prontos para lançar?**  
A: Aplica BETA_GO_NOGO_CRITERIA.md checklist (target: 2026-04-15).

---

## 💡 Key Insights

### 1. Foundation is SOLID (92% done)
Todo o infra crítico está pronto: auth, email, legal, storage, moderação backend. Não há riscos aqui.

### 2. Critical Path is TIGHT
S0A → S1 → S2 → Beta tem ~0 dias de buffer. Qualquer atraso em S0A/S1 afeta beta. S2 (FIRE) tem 4 dias de slack.

### 3. Diferenciação pode esperar
FIRE simulator é importante mas não é bloqueador. Se time está atrasado, pode ficar para "Week 1 of beta enhancements".

### 4. Content é gargalo
Creator onboarding, glossário, mock content — tudo depende de copy writing. Começar isto ASAP (idealmente já em paralelo com S0A).

### 5. Go/No-Go é decision, não acidente
Temos checklist clara. Se aplicar 2-3 dias antes de launch, resultado é determinístico. Sem surpresas.

---

## 🎯 Success Metrics (Post-Beta)

Depois de 4 semanas de beta, se estes números não forem atingidos, voltamos a desenhar:

| Métrica | Target | Owner |
|---------|--------|-------|
| Registos únicos | 20-50 | Product |
| Retenção D7 | >40% | Analytics |
| Tool usage | >3 análises/user | Product |
| Content consumption | >5 artigos/user | Product |
| NPS | >30 | Product |
| Critical bugs | 0 | QA |

---

## ✍️ Document Maintainers

- **ROADMAP_BETA_DETALHADO.md:** Product Manager (update quando features mudam)
- **BETA_TIMELINE_VISUAL.md:** Scrum Master / Sprint Lead (update weekly)
- **BETA_GO_NOGO_CRITERIA.md:** QA Lead (update 2 semanas antes de beta)
- **DEPENDENCIES_CRITICAL_PATH.md:** Tech Lead (update quando arquitetura muda)
- **README_ROADMAP_BETA.md (este):** Product Release Agent (update bi-weekly)

---

## 🚀 One Last Thing

**Se leias apenas 1 coisa, leia isto:**

> A FinHub está pronta para beta em **~35 dias** se:
> 1. E2E moderação tests ficarem prontos por 2026-03-25 ✅
> 2. Creator dashboard + public pages ficarem prontas por 2026-04-08 ✅
> 3. FIRE simulator fica pronto por 2026-04-18 🟢 (tem buffer)
> 
> O restante é detalhe. Stick to this plan, e beta happens.

---

**Documento de Referência Principal**  
**Gerado por:** Product Release Agent  
**Data:** 2026-03-17  
**Revisão recomendada:** Semanal (todo Friday)  
**Próxima milestone:** S0A completion (2026-03-25)
