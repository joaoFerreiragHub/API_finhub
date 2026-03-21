# Proposta de Task Packets — Auditoria de Analytics

**Para:** João Ferreira (aprovação)  
**De:** Boyo (finhub-orchestrator)  
**Data:** 20 de março de 2026  
**Status:** PRONTO PARA APROVAÇÃO — Se sim a P5, estes packets podem ser criados imediatamente

---

## Estrutura Proposta

Se você aprovar P5 como prioridade, vou criar 3 **task packets** (um por onda):

```
dcos/tasks/
├── WAVE-A_P5_FOUNDACAO_KPIS.md       (Semanas 1-4)
├── WAVE-B_P5_PRODUCT_ANALYTICS.md    (Semanas 5-8)
└── WAVE-C_P5_UNIT_ECONOMICS.md       (Semanas 9-12)
```

Cada packet contém:
- Objetivo claro
- Owner atribuído
- Sub-tarefas atomicas com files
- Criterios de aceite
- Dependências

---

## Task Packet A — Fundação P5 + KPI Tree Ativa

**Código:** `WAVE-A_P5_FOUNDACAO_KPIS`  
**Duração:** Semanas 1-4 (3 semanas úteis)  
**Owner proposto:** `finhub-product-release` + `finhub-task-architect`  
**CTO support:** Instrumentação de eventos

### Objetivo

Fechar contrato de eventos, publicar KPI tree oficial, implementar eventos mínimos, ativar dashboard v0.

### Sub-tarefas

```
A1. Publicar event_dictionary_v1
    └─ Ficheiro: dcos/P5_EVENT_DICTIONARY_V1.md
    └─ Conteúdo: 21 eventos com schema, envelope, exemplos
    └─ Owner: Product Release
    └─ Esforço: 1 dia
    └─ Aceite: Dictionary válido, 0 erros schema

A2. Instrumentar 21 eventos em código
    └─ Ficheiros: src/lib/analytics.ts + múltiplos controllers
    └─ Eventos: auth (4), onboarding (3), content (3), social (3), admin (2), tools (1), dashboard (2), markets (2), sponsorship (2)
    └─ Owner: CTO
    └─ Esforço: 3 dias (batch de eventos com reuse)
    └─ Aceite: yarn build sem erros, 21/21 eventos testáveis via console

A3. Criar tabela curada kpi_daily_snapshot
    └─ Ficheiro: src/models/KPISnapshot.ts
    └─ Campos: 12 KPI diários, timestamp, versão
    └─ Owner: CTO
    └─ Esforço: 1 dia
    └─ Aceite: Schema compila, migration criada

A4. Subir dashboard executivo v0
    └─ Ficheiro: src/pages/admin/kpi-dashboard/
    └─ Componentes: 12 KPI cards com últimos 7 dias (trend)
    └─ Owner: CTO
    └─ Esforço: 2 dias
    └─ Aceite: Dashboard live, 12 KPIs renderizam sem erro

A5. Congelar baseline de 14 dias
    └─ Processo: 2 semanas de coleta limpa, média de 14 dias = baseline
    └─ Owner: Data Quality (valida cobertura)
    └─ Esforço: 1 dia (análise) + 14 dias (coleta passiva)
    └─ Aceite: Baseline report com cobertura >=90%, zero eventos malformados

A6. Data quality gates em CI
    └─ Ficheiro: scripts/validate-event-quality.ts
    └─ Checks: schema valido, duplicados <=0.5%, cobertura >=99.5%
    └─ Owner: CTO + Data Quality
    └─ Esforço: 1 dia
    └─ Aceite: CI passa com gates, alertas configurados

### Gate de Saída (Onda A)

- [ ] Event dictionary v1 publicado e validated
- [ ] Cobertura de eventos minimos >= 90% em superfícies alvo
- [ ] Data quality gates activos em CI/cron
- [ ] Dashboard executivo v0 em produção (interna)
- [ ] Baseline congelado

**Definição de "prontos para Onda B":** 
Se sim em todos os pontos acima, Product Lead + CTO confirma "gate passed".

---

## Task Packet B — Product Analytics + Sponsorship Readiness v1

**Código:** `WAVE-B_P5_PRODUCT_ANALYTICS`  
**Duração:** Semanas 5-8 (3 semanas úteis)  
**Owner proposto:** `finhub-product-release` + `finhub-cto`  

### Objetivo

Cohortes por retenção, funis completos, scorecard sponsorship automático, primeira entrega para sponsor piloto.

### Sub-tarefas

```
B1. Cohort builder para D1/D7/D30 retention
    └─ Ficheiro: src/services/cohortAnalytics.service.ts
    └─ Segmentação: por cohort de signup, com filtros básicos
    └─ Owner: CTO
    └─ Esforço: 2 dias
    └─ Aceite: Queries <= 500ms, resultado validado contra expectativa

B2. Funéis: Onboarding → Engage → Follow
    └─ Ficheiro: src/services/funnelAnalytics.service.ts
    └─ Passos: signup → step1/2/3 → first_content → engagement → follow_creator
    └─ Owner: CTO
    └─ Esforço: 2 dias
    └─ Aceite: Funis renderizam, drop-off % por passo claro

B3. Scorecard sponsorship v1 automático
    └─ Ficheiro: src/services/sponsorshipScorecard.service.ts
    └─ Pilares: Alcance (25%), Qualidade (25%), Brand Safety (25%), Outcome (15%), Confiança (10%)
    └─ Owner: Revenue Lead + CTO
    └─ Esforço: 3 dias
    └─ Aceite: Scorecard gera 1x/mês, score coerente

B4. Template relatório mensal para sponsor
    └─ Ficheiro: dcos/P5_SPONSOR_REPORT_TEMPLATE_V1.md
    └─ Secções: Audience, Quality, Brand Safety, Outcome, Appendix tecnico
    └─ Owner: Product Release + Revenue
    └─ Esforço: 1 dia
    └─ Aceite: Template preenchido com dados reais, legível

B5. Job automático de geração de relatório
    └─ Ficheiro: src/jobs/generateSponsorshipReport.job.ts
    └─ Trigger: 1x/mês no 1º dia útil às 08:00 GMT
    └─ Owner: CTO
    └─ Esforço: 1 dia
    └─ Aceite: Job roda, relatório gerado e email enviado

B6. Alertas de queda para 4 KPIs críticos
    └─ Ficheiro: src/jobs/kpiAlertJob.ts
    └─ KPIs: WAEU, D7 Retention, Sponsorable Fill Rate, Brand Safe Impression Rate
    └─ Trigger: Diário (detecta queda >10% vs moving average)
    └─ Owner: CTO + Data Quality
    └─ Esforço: 1 dia
    └─ Aceite: Alert email enviado quando threshold violado

### Gate de Saída (Onda B)

- [ ] 12 KPIs com baseline validado (Onda A concluída)
- [ ] Cohorts D1/D7/D30 funcionando
- [ ] 3 funis implementados e testados
- [ ] Scorecard sponsorship gerado automaticamente
- [ ] Alertas de queda para 4 KPIs em produção

**Definição de "prontos para Onda C":**  
Se sim em todos, stage para produção. Primeira entrega a sponsor piloto.

---

## Task Packet C — Unit Economics + BI Operacional

**Código:** `WAVE-C_P5_UNIT_ECONOMICS`  
**Duração:** Semanas 9-12 (3 semanas úteis)  
**Owner proposto:** `finhub-product-release` + `finhub-cto` + Finance Ops  

### Objetivo

Dashboards por área (produto, growth, revenue, trust), ritual semanal de decisão, process sponsorship pronto.

### Sub-tarefas

```
C1. Unit economics — CAC, LTV, payback
    └─ Ficheiro: src/services/unitEconomics.service.ts
    └─ Cálculos: CAC (spend/users), LTV (12M lifetime value), payback (CAC/margem mensal)
    └─ Owner: Finance Ops + CTO
    └─ Esforço: 2 dias
    └─ Aceite: Números coerentes, validados vs actuals

C2. Receita por ativo, margem por linha
    └─ Ficheiro: src/services/revenueAnalytics.service.ts
    └─ Segmentação: por tipo de receita (ads, premium, sponsorship)
    └─ Owner: Revenue Lead + CTO
    └─ Esforço: 1 dia
    └─ Aceite: Receita total = fonte de verdade (Stripe/Stripe)

C3. Dashboards por área
    └─ Ficheiro: src/pages/admin/dashboards/
    └─ Áreas: Produto (KPI tree), Growth (CAC/LTV), Revenue (receita/margem), Trust (SLA/reports)
    └─ Owner: CTO
    └─ Esforço: 3 dias
    └─ Aceite: 4 dashboards live, drill-down funcionando

C4. Ritual semanal business review
    └─ Ficheiro: dcos/P5_WEEKLY_BR_RITUAL.md
    └─ Agenda: 60 min, variação KPI, alertas, decisões
    └─ Owner: Product Lead + João
    └─ Esforço: 4h prep
    └─ Aceite: Primeiro BR agendado, participantes confirmados

C5. Backlog priorizado com base em dados
    └─ Ficheiro: dcos/BACKLOG_PRIORIZADO_V1.md
    └─ Regra: Feature scoring por impacto em KPI + esforço
    └─ Owner: Product Release + Task Architect
    └─ Esforço: 1 dia
    └─ Aceite: Backlog com 20+ features scored, top 5 claro

C6. Documentação de compliance
    └─ Ficheiro: dcos/COMPLIANCE_ANALYTICS_V1.md
    └─ Tópicos: RGPD, retenção de dados, auditoria, consentimento
    └─ Owner: Legal Compliance + Data Quality
    └─ Esforço: 1 dia
    └─ Aceite: Legal review passed

### Gate de Saída (Onda C)

- [ ] Todas as sub-tarefas B1-B6 completas e testadas
- [ ] Pacote executivo mensal gerado (analytics + relatório)
- [ ] Processo sponsorship pronto para negociação externa
- [ ] Compliance validado
- [ ] 4 dashboards em produção

**Definição de "P5 completo":**  
Se sim em todos. FinHub tem analytics de classe empresarial.

---

## Estimativas de Esforço

| Onda | Tarefas | Dev Days | Overhead | Total |
|------|---------|----------|----------|-------|
| A    | 6       | 11 días  | 2 días   | 13 días (3 semanas) |
| B    | 6       | 12 días  | 2 días   | 14 días (3 semanas) |
| C    | 6       | 10 días  | 2 días   | 12 días (3 semanas) |
| **Total** | **18** | **33 días** | **6 días** | **39 días (8 semanas)** |

**Nota:** Estimativas assumem dedicação 80% (1 dev full-time + support occasional).

---

## Priorização de Owners

| Owner | Onda A | Onda B | Onda C | Total % |
|-------|--------|--------|--------|----------|
| Product Release | 70% | 50% | 30% | 50% |
| CTO | 20% | 40% | 50% | 37% |
| Data Quality | 10% | 10% | 10% | 10% |
| Finance Ops | — | — | 10% | 3% |

---

## Dependências Inter-Ondas

```
Onda A (KPI Tree + Eventos) ──┐
                              ├─→ Onda B (Product Analytics) ──┐
                              │                                 ├─→ Onda C (Unit Economics)
Onda A (Data Quality Gates) ──┘                                 │
                                                                ├─→ Produção
Onda B (Sponsorship Scorecard) ──────────────────────────────┘
```

**Critical path:** A → B → C (sequencial). Onda B começa quando A completa gate.

---

## Próximo Passo (Se Aprovado)

1. João confirma: P5 é prioridade? SIM
2. Boyo cria 3 task packets em `dcos/tasks/`
3. Task Architect prepara specs detalhadas (2 horas)
4. Product Release + CTO começam Onda A (semana próxima)
5. Boyo reporta progresso weekly no WhatsApp

---

## Annexo: Exemplo de Task Packet Gerado

Se aprovado, cada packet terá este formato:

```
# WAVE-A_P5_FOUNDACAO_KPIS

Status: READY FOR IMPLEMENTATION
Owner: finhub-product-release (lead), finhub-task-architect (support)
Duration: 3 weeks (Weeks 1-4)
Created: 20 Mar 2026

## Goal
Fechar contrato de eventos, publicar KPI tree oficial, implementar 21 eventos mínimos.

## Deliverables
1. Event dictionary v1 (ficheiro + schema validado)
2. 21 eventos instrumentados em código
3. KPI snapshot table em MongoDB
4. Dashboard KPI v0 com 12 KPIs
5. 14-day baseline completo
6. Data quality gates em CI

## Detailed Sub-tasks
[Lista de 6 tarefas com files, esforço, critérios de aceite]

## Exit Gate
[Checklist de 5 itens para confirmar Onda A concluída]

## Risks & Mitigations
[Tabela de riscos]
```

---

**Quando aprovado, vou criar os 3 packets completos em dcos/tasks/.**

Status: ✅ PROPOSTA PRONTA PARA IMPLEMENTAÇÃO (aguard aprovação)
