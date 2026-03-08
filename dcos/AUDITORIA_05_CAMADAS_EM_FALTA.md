# AUDITORIA_05 - Camadas em Falta: Especificacao Completa para Desenvolvimento

Data: 2026-03-07
Escopo: API_finhub (backend) + FinHub-Vite (frontend publico) + carmineds-backoffice (admin)
Base: Analise gap vs plataformas de referencia (Seeking Alpha, Finimize, Wealthsimple, eToro Social)

---

## INDICE

1. [P7 - Captura de Dados e Profiling](#p7)
2. [P8 - Ferramentas Financeiras Novas](#p8)
3. [P9 - Camada Marcas e Entidades](#p9)
4. [P10 - Patrocionio, Publicidade e Monetizacao](#p10)
5. [P11 - Revenue Engine (Subscriptions, Affiliates, Marketplace)](#p11)
6. [P12 - Camada Criadores Avancada](#p12)
7. [P13 - Social e Network Effects](#p13)
8. [P14 - Trust, Compliance e RGPD Automation](#p14)
9. [P15 - Metricas de Negocio e Investor Readiness](#p15)
10. [P16 - Internacionalizacao](#p16)
11. [Ordem de Execucao Recomendada](#ordem)
12. [Criterios de Fecho](#criterios)

---

<a id="p7"></a>
## P7 - CAPTURA DE DADOS E PROFILING

### P7.1 - Onboarding Profiling (Questionario Inicial)

**Problema:** Nao existe questionario de perfil. Sem dados declarativos do user, nao se personaliza nada (FIRE, educacao, feed, ads).

**Modelo MongoDB: `UserFinancialProfile`**

```typescript
// src/models/UserFinancialProfile.ts
interface IUserFinancialProfile extends Document {
  userId: ObjectId               // ref: User, unique

  // Perfil declarativo (onboarding)
  investmentExperience: 'none' | 'beginner' | 'intermediate' | 'advanced'
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  investmentHorizon: 'short' | 'medium' | 'long'  // <2a, 2-10a, 10a+
  primaryGoals: string[]         // enum: ['emergency_fund','retirement','fire','passive_income','wealth_growth','education_fund','house','travel','debt_free']
  monthlyIncome?: number         // EUR, opcional
  monthlyExpenses?: number       // EUR, opcional
  monthlySavingsCapacity?: number // EUR, calculado ou declarado
  currentNetWorth?: number       // EUR, opcional
  hasEmergencyFund: boolean
  emergencyFundMonths?: number   // quantos meses cobre
  hasDebts: boolean
  debtTypes?: string[]           // enum: ['mortgage','car','personal','credit_card','student']
  country: string                // ISO 3166-1 alpha-2, default 'PT'
  currency: string               // default 'EUR'
  taxResidency: string           // ISO country

  // Interesses (multi-select no onboarding)
  interests: string[]            // enum: ['stocks','etfs','reits','crypto','bonds','funds','insurance','ppr','savings','real_estate']

  // Brokers usados
  brokers?: string[]             // enum: ['degiro','xtb','trading212','interactive_brokers','revolut','etoro','other']

  // Metadata
  onboardingCompletedAt?: Date
  onboardingVersion: string      // 'v1'
  lastUpdatedAt: Date

  createdAt: Date
  updatedAt: Date
}
```

**Schema indexes:**
```typescript
UserFinancialProfileSchema.index({ userId: 1 }, { unique: true })
UserFinancialProfileSchema.index({ country: 1, investmentExperience: 1 })
UserFinancialProfileSchema.index({ 'interests': 1 })
UserFinancialProfileSchema.index({ riskTolerance: 1 })
```

**Endpoints Backend:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/profile/onboarding` | user | Submeter questionario inicial |
| GET | `/api/profile/financial` | user | Obter perfil financeiro proprio |
| PATCH | `/api/profile/financial` | user | Atualizar perfil parcialmente |
| DELETE | `/api/profile/financial` | user | Apagar perfil (RGPD) |
| GET | `/api/admin/profiles/stats` | admin | Agregados anonimizados para dashboard |

**Controller: `userFinancialProfile.controller.ts`**

```
POST /onboarding:
  - Valida campos obrigatorios: investmentExperience, riskTolerance, investmentHorizon, primaryGoals, interests
  - Calcula monthlySavingsCapacity se income e expenses fornecidos
  - Define onboardingCompletedAt = now
  - Retorna perfil completo
  - Se ja existe, retorna 409

PATCH /financial:
  - Merge parcial, nao permite alterar userId
  - Atualiza lastUpdatedAt
  - Retorna perfil atualizado

GET /admin/profiles/stats:
  - Retorna agregados: distribuicao por experience, risk, goals, country, interests
  - Nunca retorna dados individuais
  - Requer scope: 'analytics:read'
```

**Service: `userFinancialProfile.service.ts`**

```
- create(userId, data): cria perfil, valida enums
- getByUserId(userId): retorna perfil ou null
- update(userId, partialData): merge e save
- delete(userId): hard delete (RGPD)
- getAggregatedStats(): pipeline MongoDB com $group por campo
- calculateSavingsCapacity(income, expenses): income - expenses
- getSegment(userId): retorna segmento calculado ('pre_investor'|'beginner_investor'|'active_investor'|'advanced_investor')
```

**Frontend - Pagina de Onboarding:**

```
Rota: /onboarding (redirect apos primeiro login se !onboardingCompletedAt)

Componente: OnboardingWizard
  Step 1: ExperienceStep - radio cards (Nunca investi / Comecei ha pouco / Ja invisto ha anos / Investidor experiente)
  Step 2: GoalsStep - multi-select cards com icones (Fundo emergencia, Reforma, FIRE, Renda passiva, etc.)
  Step 3: RiskStep - slider ou radio (Conservador / Moderado / Agressivo) com explicacao visual
  Step 4: FinancialSituationStep - inputs opcionais (rendimento, despesas, patrimonio) com toggle "Prefiro nao dizer"
  Step 5: InterestsStep - multi-select tags (Acoes, ETFs, REITs, Crypto, etc.)
  Step 6: BrokersStep - multi-select logos (DEGIRO, XTB, Trading 212, etc.) + "Ainda nao tenho"
  Step 7: SummaryStep - resumo + botao "Comecar"

Estado: react-hook-form com zod validation
Persistencia: POST /api/profile/onboarding no step final
Skip: Botao "Preencher depois" em todos os steps (salva parcial)
```

**Frontend - Pagina de Settings:**

```
Rota: /settings/financial-profile
Componente: FinancialProfileEditor
  - Formulario editavel com todos os campos do onboarding
  - PATCH /api/profile/financial no submit
  - Botao "Apagar perfil financeiro" com confirmacao (DELETE)
```

**Dependencias:** Nenhuma nova. Usa mongoose, express, zod existentes.

**Criterio de fecho:**
1. Modelo criado com indexes
2. CRUD completo funcional
3. Onboarding wizard com todos os steps
4. Settings page para edicao
5. Admin stats endpoint
6. Redirect automatico pos-login se perfil incompleto
7. Testes unitarios para service

---

### P7.2 - Event Tracking (Analytics Comportamental)

**Problema:** Sem tracking granular de comportamento in-app. Impossivel medir funnels, retention, feature adoption.

**Modelo MongoDB: `AnalyticsEvent`**

```typescript
// src/models/AnalyticsEvent.ts
interface IAnalyticsEvent extends Document {
  userId?: ObjectId              // null para visitantes
  sessionId: string              // UUID por sessao
  event: string                  // enum controlado
  category: 'navigation' | 'engagement' | 'conversion' | 'tool_usage' | 'content' | 'social' | 'error'
  properties: Record<string, any> // payload flexivel por evento
  page: string                   // URL path
  referrer?: string
  userAgent: string
  ip?: string                    // hash, nao raw (RGPD)
  country?: string               // geolookup do IP
  device: 'mobile' | 'tablet' | 'desktop'
  timestamp: Date

  createdAt: Date
}
```

**Eventos a capturar (enum `event`):**

```typescript
// Navegacao
'page_view' | 'page_exit'

// Engagement
'tool_open' | 'tool_complete' | 'tool_share'
'content_view' | 'content_read_50' | 'content_read_100' | 'content_share'
'search_query' | 'search_click'

// Social
'follow_creator' | 'unfollow_creator'
'comment_create' | 'rating_submit' | 'favorite_add' | 'favorite_remove'

// Conversao
'signup_start' | 'signup_complete' | 'onboarding_start' | 'onboarding_complete' | 'onboarding_skip'
'premium_view' | 'premium_click' | 'premium_subscribe'
'affiliate_click' | 'affiliate_convert'

// Ferramentas
'stock_analysis_run' | 'reit_analysis_run' | 'etf_overlap_run' | 'crypto_view'
'fire_simulation_run' | 'calculator_use'
'watchlist_add' | 'watchlist_remove'

// Erros
'error_page' | 'error_api' | 'error_form'
```

**Endpoints Backend:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/analytics/event` | opcional | Registar evento (batch ate 10) |
| POST | `/api/analytics/events` | opcional | Registar batch de eventos |
| GET | `/api/admin/analytics/funnel` | admin | Funil de conversao |
| GET | `/api/admin/analytics/retention` | admin | Curvas de retencao por cohort |
| GET | `/api/admin/analytics/features` | admin | Uso por feature |
| GET | `/api/admin/analytics/overview` | admin | DAU/MAU/WAU + tendencias |

**Service: `analytics.service.ts`**

```
- track(event): insere evento, sanitiza PII, hash IP
- trackBatch(events[]): insere multiplos (max 10 por request)
- getFunnel(steps[], dateRange): pipeline $match/$group por step sequence
- getRetention(cohortField, dateRange, granularity): cohort analysis com $lookup
- getFeatureUsage(dateRange): $group por event category=tool_usage
- getOverview(dateRange): DAU/MAU/WAU com $addFields por dia
- getTopPages(dateRange, limit): $group por page, $sort por count
- cleanup(olderThan): TTL cleanup (90 dias por default, configuravel)
```

**TTL Index:**
```typescript
AnalyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 }) // 90 dias
AnalyticsEventSchema.index({ event: 1, timestamp: -1 })
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 })
AnalyticsEventSchema.index({ category: 1, timestamp: -1 })
AnalyticsEventSchema.index({ sessionId: 1 })
```

**Frontend - SDK de tracking:**

```typescript
// src/lib/analytics.ts
class AnalyticsTracker {
  private queue: AnalyticsEvent[] = []
  private flushInterval: number = 5000 // 5s
  private maxBatchSize: number = 10

  track(event: string, category: EventCategory, properties?: Record<string, any>): void
  identify(userId: string): void
  page(path: string): void  // chamado automaticamente pelo router
  flush(): Promise<void>    // envia queue para API

  // Auto-tracking
  private setupPageViewTracking(): void   // router listener
  private setupScrollTracking(): void     // intersection observer para content_read_50/100
  private setupErrorTracking(): void      // window.onerror
}

export const analytics = new AnalyticsTracker()
```

**Frontend - Admin Dashboard:**

```
Rota (backoffice): /dashboard/analytics
Componentes:
  - OverviewCards: DAU, MAU, WAU, sessoes, bounce rate
  - RetentionChart: heatmap de retencao por cohort semanal
  - FunnelChart: signup → onboarding → first_tool → premium
  - FeatureAdoptionTable: tabela com uso por ferramenta
  - TopPagesChart: bar chart das paginas mais visitadas
  - UserFlowSankey: fluxo de navegacao (opcional, fase 2)
```

**Dependencias:** Nenhuma nova. IntersectionObserver nativo, UUID do crypto.randomUUID().

**RGPD:**
- IP sempre em hash (SHA-256 truncado)
- userId so associado se user logado e consentiu analytics
- TTL de 90 dias automatico
- Respeita cookieConsent.analytics do User model
- Endpoint DELETE /api/analytics/user/:userId para right to be forgotten

**Criterio de fecho:**
1. Modelo com TTL e indexes
2. POST endpoint com rate limit (100/min por IP)
3. SDK frontend com auto page tracking
4. Admin dashboard com 4 visualizacoes minimas
5. RGPD compliance (hash IP, TTL, delete endpoint)
6. Testes para service aggregations

---

### P7.3 - Feedback e NPS

**Problema:** Sem mecanismo de recolha continua de satisfacao por feature.

**Modelo MongoDB: `UserFeedback`**

```typescript
// src/models/UserFeedback.ts
interface IUserFeedback extends Document {
  userId?: ObjectId
  type: 'nps' | 'feature_feedback' | 'bug_report' | 'suggestion'

  // NPS
  npsScore?: number              // 0-10
  npsCategory?: 'detractor' | 'passive' | 'promoter' // calculado: 0-6, 7-8, 9-10

  // Feature feedback
  feature?: string               // enum: nome da feature
  featureRating?: number         // 1-5

  // Comum
  message?: string               // texto livre, max 2000 chars
  page?: string                  // onde estava quando deu feedback
  metadata?: Record<string, any> // contexto adicional

  // Estado
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed'
  adminNotes?: string
  reviewedBy?: ObjectId
  reviewedAt?: Date

  createdAt: Date
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/feedback` | opcional | Submeter feedback |
| GET | `/api/admin/feedback` | admin | Listar feedback com filtros |
| PATCH | `/api/admin/feedback/:id` | admin | Atualizar status/notes |
| GET | `/api/admin/feedback/nps` | admin | NPS score agregado |

**Frontend:**

```
Componentes:
  - NpsModal: aparece a cada 30 dias para users ativos, "De 0 a 10, recomendarias o FinHub?"
  - FeatureFeedbackWidget: botao flutuante em cada ferramenta, "Esta ferramenta foi util?" + rating 1-5 + comentario
  - FeedbackButton: no footer/sidebar, link para formulario completo

Admin (backoffice):
  - FeedbackListPage: tabela com filtros (type, status, date)
  - NpsDashboard: score atual, trend, breakdown por segmento
```

**Criterio de fecho:**
1. Modelo e CRUD
2. NPS modal com logica de frequencia (30 dias)
3. Feature feedback widget reutilizavel
4. Admin list + NPS dashboard
5. Rate limit: 5 feedbacks/dia por user

---

<a id="p8"></a>
## P8 - FERRAMENTAS FINANCEIRAS NOVAS

### P8.1 - Calculadora de Juros Compostos

**Problema:** Ferramenta basica com alto valor SEO. Entrada para users pre-investimento.

**Tipo:** Frontend-only (sem backend, sem modelo). Calculo client-side.

**Logica de calculo:**

```typescript
// src/utils/compoundInterest.ts
interface CompoundInterestInput {
  initialAmount: number          // capital inicial
  monthlyContribution: number    // contribuicao mensal
  annualRate: number             // taxa anual em %
  years: number                  // horizonte temporal
  compoundingFrequency: 'monthly' | 'quarterly' | 'annually'
  inflationRate?: number         // taxa inflacao para valor real
}

interface CompoundInterestResult {
  finalAmount: number
  totalContributed: number
  totalInterest: number
  realValue?: number             // ajustado a inflacao
  yearByYear: {
    year: number
    balance: number
    contributed: number
    interestEarned: number
    realBalance?: number
  }[]
}

function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult
```

**Frontend:**

```
Rota: /ferramentas/calculadora-juros-compostos

Componente: CompoundInterestCalculator
  Inputs:
    - Capital inicial (slider + input, 0-1M EUR, default 1000)
    - Contribuicao mensal (slider + input, 0-10K, default 200)
    - Taxa anual (slider + input, 0-30%, default 7%)
    - Horizonte (slider + input, 1-50 anos, default 20)
    - Frequencia composicao (radio: mensal/trimestral/anual)
    - Toggle "Ajustar a inflacao" (default 2%)

  Outputs:
    - Cards: Valor Final | Total Investido | Juros Ganhos | Valor Real
    - Area Chart (recharts): evolucao temporal com 2 areas (contribuido vs juros)
    - Tabela ano-a-ano colapsavel
    - Insight box: "Os juros representam X% do valor final"
    - Comparacao: "Sem juros compostos terias X. Com juros compostos tens Y. Diferenca: Z"

  SEO:
    - Meta title: "Calculadora de Juros Compostos Gratis | FinHub"
    - Texto educativo abaixo da ferramenta (300-500 palavras)
    - Schema.org FAQPage structured data
    - Links para conteudo de criadores sobre juros compostos
```

**Criterio de fecho:**
1. Calculo correto validado com 5 cenarios conhecidos
2. UI responsiva com sliders e chart
3. SEO meta tags e structured data
4. Texto educativo
5. Analytics tracking: tool_open, tool_complete

---

### P8.2 - Calculadora de Dividendos (Dividend Growth)

**Tipo:** Frontend-only com fetch opcional de dados reais.

**Logica:**

```typescript
// src/utils/dividendGrowth.ts
interface DividendGrowthInput {
  initialInvestment: number
  monthlyContribution: number
  currentYield: number           // % dividend yield atual
  dividendGrowthRate: number     // % crescimento anual do dividendo
  priceAppreciation: number      // % valorizacao anual estimada
  years: number
  reinvestDividends: boolean     // DRIP on/off
  taxRate?: number               // taxa imposto sobre dividendos (28% PT default)
}

interface DividendGrowthResult {
  finalPortfolioValue: number
  annualDividendIncome: number   // no ano final
  monthlyDividendIncome: number
  totalDividendsReceived: number
  totalTaxPaid?: number
  yieldOnCost: number            // yield sobre custo original
  yearByYear: {
    year: number
    portfolioValue: number
    annualDividend: number
    yieldOnCost: number
    cumulativeDividends: number
  }[]
}
```

**Frontend:**

```
Rota: /ferramentas/calculadora-dividendos

Componente: DividendGrowthCalculator
  Inputs:
    - Investimento inicial
    - Contribuicao mensal
    - Dividend yield atual (default 3%)
    - Taxa crescimento dividendo (default 5%)
    - Valorizacao preco (default 5%)
    - Horizonte (anos)
    - Toggle DRIP (reinvestir dividendos)
    - Toggle impostos PT (28%)

  Outputs:
    - Card: Rendimento mensal de dividendos no ano final
    - Card: Yield on cost
    - Bar + Line chart: dividendos anuais (bar) + yield on cost (line)
    - Tabela ano-a-ano
    - Insight: "Em X anos, os teus dividendos cobrem Y% das tuas despesas mensais" (se perfil P7.1 existe)

  Integracao opcional:
    - Input de ticker (ex: "SCHD") para preencher yield e growth rate reais via FMP
    - GET /api/stocks/:ticker/dividends (endpoint existente ou novo)
```

**Criterio de fecho:**
1. Calculo correto com e sem DRIP
2. Impostos PT corretos (28%)
3. Chart com duplo eixo
4. Integracao opcional com ticker real
5. Tracking analytics

---

### P8.3 - Simulador de Impostos Portugal (Mais-Valias e Dividendos)

**Problema:** Unico para mercado PT. Alto valor, zero concorrencia.

**Tipo:** Frontend-only.

**Logica:**

```typescript
// src/utils/taxSimulatorPT.ts
interface TaxSimulationInput {
  // Mais-valias
  capitalGains: {
    ticker?: string
    buyPrice: number
    sellPrice: number
    quantity: number
    holdingPeriodDays: number
    country: 'PT' | 'US' | 'EU_OTHER'  // para regime fiscal
  }[]

  // Dividendos
  dividends: {
    ticker?: string
    grossAmount: number
    country: 'PT' | 'US' | 'EU_OTHER'
    withholdingTaxPaid: number    // retencao na fonte pais origem
  }[]

  // Opcoes
  englobamento: boolean           // optar por englobamento vs taxa liberatoria
  escalaoIRS?: number             // escalao IRS se englobamento (14.5% a 48%)
  year: number                    // ano fiscal
}

interface TaxSimulationResult {
  // Mais-valias
  totalCapitalGains: number
  capitalGainsTax: number         // 28% ou escalao
  capitalLosses: number
  netCapitalGains: number         // ganhos - perdas (compensacao)

  // Dividendos
  totalGrossDividends: number
  dividendTax: number             // 28% ou escalao
  foreignTaxCredit: number        // credito por dupla tributacao
  netDividendTax: number

  // Total
  totalTaxDue: number
  effectiveTaxRate: number

  // Comparacao
  withEnglobamento: number
  withoutEnglobamento: number
  recommendation: 'englobamento' | 'liberatoria'
  savings: number                 // quanto poupa com a opcao recomendada

  // Detalhe por operacao
  perOperation: {
    description: string
    grossGain: number
    tax: number
    netGain: number
  }[]

  // Anexos IRS
  anexoJ: boolean                 // rendimentos estrangeiros
  anexoG: boolean                 // mais-valias
  anexoE: boolean                 // rendimentos capitais
}
```

**Frontend:**

```
Rota: /ferramentas/simulador-impostos-pt

Componente: TaxSimulatorPT
  Tabs:
    Tab 1 - Mais-Valias:
      - Tabela editavel: adicionar operacoes (ticker, preco compra, preco venda, quantidade, dias detido)
      - Botao "Adicionar operacao"
      - Importar de CSV (formato DEGIRO, XTB, Trading212)

    Tab 2 - Dividendos:
      - Tabela editavel: ticker, valor bruto, pais origem, retencao na fonte
      - Botao "Adicionar dividendo"

    Tab 3 - Resultado:
      - Cards: Imposto Total | Taxa Efetiva | Poupanca com Englobamento
      - Comparacao visual: Englobamento vs Taxa Liberatoria
      - Tabela detalhe por operacao
      - Checklist: "Precisas preencher Anexo J? Sim/Nao" etc.
      - Disclaimer legal obrigatorio: "Esta simulacao e meramente indicativa..."

  Toggle global: Englobamento sim/nao + input escalao IRS

  SEO:
    - "Simulador de Impostos sobre Investimentos Portugal 2026 | FinHub"
    - FAQ section: "Como declarar dividendos no IRS?", "O que e englobamento?", etc.
```

**Criterio de fecho:**
1. Calculos corretos para regime PT 2025/2026
2. Compensacao de menos-valias funcional
3. Comparacao englobamento vs liberatoria
4. Importacao CSV de pelo menos 1 broker (DEGIRO)
5. Disclaimer legal
6. Testes com cenarios reais documentados

---

### P8.4 - Alertas de Preco

**Problema:** Feature de retencao critica. Users querem saber quando um ativo atinge um valor.

**Modelo MongoDB: `PriceAlert`**

```typescript
// src/models/PriceAlert.ts
interface IPriceAlert extends Document {
  userId: ObjectId
  ticker: string                 // ex: 'AAPL', 'BTC-USD'
  assetType: 'stock' | 'etf' | 'crypto' | 'reit'
  condition: 'above' | 'below' | 'percent_change_up' | 'percent_change_down'
  targetPrice?: number           // para above/below
  percentChange?: number         // para percent_change_*
  referencePrice: number         // preco quando o alerta foi criado
  currentPrice?: number          // ultimo preco verificado

  // Estado
  status: 'active' | 'triggered' | 'expired' | 'cancelled'
  triggeredAt?: Date
  notifiedVia?: ('push' | 'email')[]

  // Limites
  expiresAt?: Date               // opcional, default 90 dias
  repeatOnce: boolean            // true = dispara 1x e desativa, false = repete

  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
```typescript
PriceAlertSchema.index({ userId: 1, status: 1 })
PriceAlertSchema.index({ status: 1, ticker: 1 })  // para o worker
PriceAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/alerts` | user | Criar alerta |
| GET | `/api/alerts` | user | Listar alertas proprios |
| DELETE | `/api/alerts/:id` | user | Cancelar alerta |
| PATCH | `/api/alerts/:id` | user | Editar alerta |
| GET | `/api/admin/alerts/stats` | admin | Stats de alertas |

**Worker: `priceAlertChecker.worker.ts`**

```
Frequencia: a cada 5 minutos (cron ou setInterval)
Logica:
  1. Buscar todos alertas com status='active', agrupados por ticker
  2. Para cada ticker unico, fetch preco atual (FMP/Yahoo batch)
  3. Comparar preco com condicao de cada alerta
  4. Se triggered:
     a. Atualizar status='triggered', triggeredAt=now, currentPrice
     b. Enviar notificacao (email via email.service.ts + push se implementado)
     c. Se repeatOnce=true, manter triggered. Senao, resetar para active
  5. Log metricas: alertas verificados, triggered, erros
```

**Limites por role:**
- free: 5 alertas ativos
- premium: 50 alertas ativos
- creator: 20 alertas ativos

**Frontend:**

```
Componente: PriceAlertButton (reutilizavel em qualquer pagina de ativo)
  - Icone de sino ao lado do preco
  - Click abre modal: "Alertar quando [AAPL] estiver [acima/abaixo] de [___] EUR"
  - Opcao: "Apenas uma vez" ou "Repetir"

Rota: /settings/alerts (ou /dashboard/alerts)
Componente: AlertsListPage
  - Tabela: Ticker | Condicao | Preco Alvo | Preco Atual | Estado | Acoes
  - Filtros: Ativos / Disparados / Todos
  - Badge no header com contagem de alertas disparados
```

**Dependencias:** Worker precisa de cron scheduling. Usar node-cron ou setInterval no server.ts.

**Criterio de fecho:**
1. Modelo e CRUD
2. Worker de verificacao a cada 5 min
3. Notificacao email funcional
4. Limites por role
5. UI do botao de alerta reutilizavel
6. Lista de alertas no dashboard
7. Testes para logica de trigger

---

### P8.5 - Calendario de Dividendos

**Problema:** Users de dividendos precisam saber quando recebem. Feature de retencao.

**Tipo:** Hibrido. Backend faz cache de datas, frontend renderiza calendario.

**Endpoint Backend (novo ou extensao de stocks):**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/dividends/calendar` | user | Calendario personalizado baseado em watchlist/portfolio |
| GET | `/api/dividends/upcoming?tickers=AAPL,MSFT` | publico | Proximos dividendos para tickers |

**Service: `dividend.service.ts`**

```
- getUpcomingDividends(tickers[]): fetch de FMP /stock_dividend_calendar, cache 24h em Redis
- getUserCalendar(userId): buscar watchlist do user + portfolio, cruzar com calendario
- Campos retornados por evento: { ticker, exDate, payDate, amount, yield, frequency }
```

**Frontend:**

```
Rota: /ferramentas/calendario-dividendos

Componente: DividendCalendar
  - Vista mensal (calendario grid)
  - Cada dia mostra tickers com ex-date ou pay-date
  - Click no dia abre lista detalhada
  - Filtro: "Meus ativos" vs "Todos"
  - Cards laterais: Proximo dividendo | Total esperado este mes | Total esperado este ano
  - Integracao com alerta: "Lembrar 3 dias antes da ex-date"
```

**Criterio de fecho:**
1. Endpoint com cache Redis
2. Calendario mensal funcional
3. Filtro por watchlist/portfolio do user
4. Cards de resumo

---

### P8.6 - Comparador de PPR (Planos Poupanca Reforma)

**Problema:** Mercado PT sem comparador decente de PPR. Oportunidade unica.

**Modelo MongoDB: `PPRPlan`**

```typescript
// src/models/PPRPlan.ts
interface IPPRPlan extends Document {
  name: string                   // ex: "PPR SGF Stoik"
  provider: string               // ex: "SGF"
  directoryEntryId?: ObjectId    // ref: DirectoryEntry (se a entidade existe)

  // Detalhes
  type: 'insurance' | 'fund'     // seguro vs fundo
  riskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7  // SRI
  managementFee: number          // % taxa gestao anual
  subscriptionFee: number        // % taxa subscricao
  redemptionFee: number          // % taxa resgate
  minimumInvestment: number      // EUR

  // Performance
  returns: {
    ytd?: number
    year1?: number
    year3?: number
    year5?: number
    year10?: number
    sinceInception?: number
    inceptionDate?: Date
  }

  // Composicao
  assetAllocation?: {
    stocks: number               // %
    bonds: number
    cash: number
    other: number
  }

  // Beneficio fiscal
  taxBenefit: {
    deductionPercentage: number  // 20% do investido
    maxDeductionUnder35: number  // 400 EUR
    maxDeduction35to50: number   // 350 EUR
    maxDeductionOver50: number   // 300 EUR
    minimumHoldingYears: number  // 5 anos para beneficio fiscal
  }

  // Metadata
  lastUpdated: Date
  source?: string                // URL fonte dos dados
  isActive: boolean

  createdAt: Date
  updatedAt: Date
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/ppr` | publico | Listar PPRs com filtros e sort |
| GET | `/api/ppr/:id` | publico | Detalhe de um PPR |
| GET | `/api/ppr/compare?ids=a,b,c` | publico | Comparacao lado a lado (max 4) |
| GET | `/api/ppr/simulate` | publico | Simulacao de investimento num PPR |
| POST | `/api/admin/ppr` | admin | Criar/atualizar PPR |
| PATCH | `/api/admin/ppr/:id` | admin | Editar PPR |
| DELETE | `/api/admin/ppr/:id` | admin | Remover PPR |

**Frontend:**

```
Rota: /ferramentas/comparador-ppr

Componente: PPRComparator
  - Lista/Grid de PPRs com filtros: tipo, risco, taxa gestao, rentabilidade
  - Sort: por rentabilidade, por taxa, por risco
  - Selecionar ate 4 para comparacao lado a lado
  - Tabela comparativa: nome, tipo, risco, taxas, rentabilidades, composicao
  - Simulador inline: "Se investires X/mes durante Y anos neste PPR..."
  - Beneficio fiscal calculado por idade do user (se perfil existe)

  SEO:
    - "Comparador de PPR Portugal 2026 | FinHub"
    - Tabela de todos os PPR indexavel
```

**Dados:** Inseridos manualmente pelo admin (nao existe API publica de PPR em PT). ~30-50 PPRs ativos no mercado.

**Criterio de fecho:**
1. Modelo e seed com pelo menos 10 PPRs reais
2. Endpoints de listagem com filtros
3. Pagina de comparacao funcional
4. Simulador com beneficio fiscal
5. Admin CRUD no backoffice

---

### P8.7 - Budget Planner (50/30/20)

**Tipo:** Frontend-only com persistencia opcional no perfil.

**Logica:**

```typescript
// src/utils/budgetPlanner.ts
interface BudgetInput {
  monthlyIncome: number
  strategy: '50_30_20' | '60_20_20' | '70_20_10' | 'custom'
  customSplit?: { needs: number, wants: number, savings: number }
  expenses: {
    category: string             // enum: housing, food, transport, utilities, insurance, health, education, entertainment, clothing, subscriptions, other
    name: string
    amount: number
    frequency: 'monthly' | 'quarterly' | 'annually'
  }[]
}

interface BudgetResult {
  targetNeeds: number
  targetWants: number
  targetSavings: number
  actualNeeds: number
  actualWants: number
  actualTotal: number
  surplus: number                // disponivel para investir
  perCategory: { category: string, total: number, percentage: number }[]
  alerts: string[]               // ex: "Estás a gastar 60% em necessidades (target: 50%)"
}
```

**Frontend:**

```
Rota: /ferramentas/planeador-orcamento

Componente: BudgetPlanner
  Step 1: Rendimento mensal liquido
  Step 2: Escolher estrategia (50/30/20 com explicacao visual)
  Step 3: Adicionar despesas por categoria (drag & drop cards)
  Step 4: Resultado visual
    - Donut chart: actual vs target
    - Bar chart: por categoria
    - Card destaque: "Tens X EUR/mes disponivel para investir"
    - Link para calculadora juros compostos com esse valor pre-preenchido
    - Se perfil P7.1 existe, atualizar monthlySavingsCapacity automaticamente
```

**Criterio de fecho:**
1. 3 estrategias pre-definidas + custom
2. Categorizacao de despesas
3. Graficos comparativos
4. Link cruzado com calculadora juros compostos e perfil

---

### P8.8 - Net Worth Tracker

**Problema:** Acompanhar evolucao do patrimonio liquido ao longo do tempo.

**Modelo MongoDB: `NetWorthSnapshot`**

```typescript
// src/models/NetWorthSnapshot.ts
interface INetWorthSnapshot extends Document {
  userId: ObjectId
  date: Date                     // mês/ano do snapshot

  assets: {
    category: 'cash' | 'investments' | 'real_estate' | 'vehicles' | 'crypto' | 'ppr' | 'other'
    name: string
    value: number                // EUR
  }[]

  liabilities: {
    category: 'mortgage' | 'car_loan' | 'personal_loan' | 'credit_card' | 'student_loan' | 'other'
    name: string
    value: number
    interestRate?: number
  }[]

  totalAssets: number            // calculado
  totalLiabilities: number       // calculado
  netWorth: number               // assets - liabilities

  createdAt: Date
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/networth` | user | Criar snapshot mensal |
| GET | `/api/networth` | user | Listar historico de snapshots |
| GET | `/api/networth/latest` | user | Ultimo snapshot |
| PUT | `/api/networth/:id` | user | Editar snapshot |
| DELETE | `/api/networth/:id` | user | Apagar snapshot |

**Regras:**
- Maximo 1 snapshot por mes (upsert pelo mes/ano)
- Calculo automatico de totais no pre-save
- Limite: free users guardam 12 meses, premium ilimitado

**Frontend:**

```
Rota: /dashboard/net-worth (ou /ferramentas/patrimonio)

Componente: NetWorthTracker
  - Formulario mensal: tabela editavel de ativos e passivos por categoria
  - Botao "Copiar do mes anterior" para facilitar update
  - Area chart: evolucao do net worth ao longo do tempo
  - Stacked bar: composicao por categoria
  - Cards: Net Worth Atual | Variacao mensal | Variacao anual | Maior ativo | Maior passivo
  - Milestone alerts: "Atingiste 10K!", "Atingiste 50K!"
  - Se portfolio FIRE (P5) existe, importar valores automaticamente
```

**Criterio de fecho:**
1. Modelo com validacao 1 snapshot/mes
2. CRUD completo
3. Chart de evolucao temporal
4. Composicao por categoria
5. Import de portfolio se existir

---

<a id="p9"></a>
## P9 - CAMADA MARCAS E ENTIDADES (ALEM DO DIRECTORY)

### P9.1 - Brand Analytics Dashboard

**Problema:** Para cobrar a marcas, precisamos mostrar-lhes valor. Metricas que a marca ve sobre a sua presenca na plataforma.

**Endpoint Backend (extensao de DirectoryEntry):**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/brands/:id/analytics` | brand_owner | Metricas da marca |
| GET | `/api/brands/:id/analytics/reviews` | brand_owner | Analise de reviews |
| GET | `/api/brands/:id/analytics/competitors` | brand_owner | Benchmark vs concorrentes |

**Service: `brandAnalytics.service.ts`**

```
- getProfileAnalytics(brandId, dateRange):
    - Retorna: views, unique_visitors, avg_time_on_page, click_through_rate
    - Fonte: AnalyticsEvent (P7.2) filtrado por page contendo brandId

- getReviewAnalytics(brandId, dateRange):
    - Retorna: total_reviews, avg_rating, rating_distribution, sentiment_trend, top_keywords
    - Fonte: Rating model filtrado por targetType='directoryEntry', targetId=brandId

- getCompetitorBenchmark(brandId):
    - Retorna: rating vs media do vertical, views vs media, review count vs media
    - Fonte: DirectoryEntry do mesmo verticalType
```

**Frontend (Portal de Marca):**

```
Rota: /brand-portal/analytics (nova area autenticada para donos de marca)

Componentes:
  - BrandOverviewCards: Views | Rating | Reviews | Posicao no ranking
  - ViewsTrendChart: line chart de views/dia nos ultimos 30 dias
  - RatingDistribution: bar chart 1-5 estrelas
  - ReviewTimeline: lista cronologica de reviews com sentiment
  - CompetitorTable: tabela comparativa com marcas do mesmo vertical
  - ActionableInsights: "Tens 3 reviews sem resposta", "O teu rating subiu 0.2 este mes"
```

**Auth:** Novo role ou flag no User: `brandOwnerOf: ObjectId[]` (refs a DirectoryEntry). Ou usar ClaimRequest aprovado como prova de ownership.

**Criterio de fecho:**
1. Endpoints de analytics para marca
2. Benchmark vs concorrentes do mesmo vertical
3. Portal com 4 visualizacoes
4. Auth por ownership (claim aprovado)

---

### P9.2 - Review Management para Marcas

**Problema:** Marcas precisam responder a reviews e gerir reputacao.

**Extensao do modelo Rating existente:**

```typescript
// Adicionar ao Rating.ts existente:
brandResponse?: {
  text: string                   // max 1000 chars
  respondedBy: ObjectId          // ref: User (brand owner)
  respondedAt: Date
  editedAt?: Date
}
```

**Endpoints novos:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/ratings/:id/brand-response` | brand_owner | Responder a review |
| PATCH | `/api/ratings/:id/brand-response` | brand_owner | Editar resposta |
| DELETE | `/api/ratings/:id/brand-response` | brand_owner | Apagar resposta |

**Frontend:**
- Na pagina publica da marca: reviews com resposta da marca visivel
- No brand portal: lista de reviews pendentes de resposta, com CTA "Responder"

**Criterio de fecho:**
1. Campo brandResponse no Rating
2. CRUD de resposta com auth por ownership
3. Exibicao publica da resposta
4. Lista de pendentes no portal

---

### P9.3 - Comparison Pages Automaticas

**Problema:** Paginas "X vs Y" geram SEO massivo e sao uteis para users.

**Tipo:** Sem modelo novo. Gerado dinamicamente a partir de DirectoryEntry.

**Endpoint:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/directory/compare?ids=a,b` | publico | Dados de comparacao de 2-4 entidades |

**Service:**
```
- compareEntries(ids[]):
    - Busca DirectoryEntry para cada id
    - Busca ratings agregados para cada
    - Busca review count para cada
    - Retorna objeto comparativo com campos alinhados
```

**Frontend:**

```
Rota: /comparar/:slug1-vs-:slug2 (ex: /comparar/degiro-vs-xtb)

Componente: ComparisonPage
  - Header: Logo A vs Logo B
  - Tabela comparativa: todos os campos relevantes lado a lado
  - Rating comparison: estrelas + contagem
  - Pros/Cons: extraidos de reviews (top keywords positivos vs negativos)
  - CTA: "Tem experiencia com [X]? Deixe a sua avaliacao"
  - SEO: title "[X] vs [Y]: Comparacao Completa 2026 | FinHub"
  - Links internos: pagina individual de cada entidade
  - Schema.org: ComparisonPage ou Product structured data
```

**Criterio de fecho:**
1. Endpoint de comparacao
2. Pagina com tabela comparativa
3. SEO com slugs amigaveis
4. Links cruzados

---

<a id="p10"></a>
## P10 - PATROCINIO, PUBLICIDADE E MONETIZACAO

### P10.1 - Sistema de Campanhas Publicitarias

**Problema:** Sem infra de publicidade, nao ha como monetizar marcas.

**Modelo MongoDB: `AdCampaign`**

```typescript
// src/models/AdCampaign.ts
interface IAdCampaign extends Document {
  brandId: ObjectId              // ref: DirectoryEntry
  createdBy: ObjectId            // ref: User (brand owner ou admin)

  // Configuracao
  name: string
  type: 'sponsored_content' | 'banner' | 'native_ad' | 'directory_boost' | 'sponsored_tool' | 'sponsored_learning_path'

  // Conteudo
  headline: string               // max 90 chars
  description?: string           // max 250 chars
  imageUrl?: string
  targetUrl: string              // URL de destino (externo ou interno)
  ctaText?: string               // "Saber mais", "Abrir conta", etc.

  // Targeting
  targeting: {
    interests?: string[]         // do perfil P7.1
    experience?: string[]        // investment experience levels
    country?: string[]
    pages?: string[]             // onde mostrar: 'stock_analysis', 'etf_tools', 'learning', 'home', 'directory'
    verticalTypes?: string[]     // vertical do directory relevante
  }

  // Budget e scheduling
  budget: {
    totalBudget: number          // EUR
    dailyBudget?: number
    costModel: 'cpm' | 'cpc'    // custo por mil impressoes ou custo por click
    bidAmount: number            // EUR por impressao/click
  }
  startDate: Date
  endDate: Date

  // Estado
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected'
  rejectionReason?: string
  reviewedBy?: ObjectId
  reviewedAt?: Date

  // Metricas (atualizadas pelo worker)
  metrics: {
    impressions: number
    clicks: number
    ctr: number                  // clicks/impressions
    spent: number                // EUR gasto
    conversions: number          // se tracking de conversao ativo
  }

  createdAt: Date
  updatedAt: Date
}
```

**Modelo: `AdImpression`**

```typescript
// src/models/AdImpression.ts
interface IAdImpression extends Document {
  campaignId: ObjectId
  userId?: ObjectId              // null se visitante
  type: 'impression' | 'click' | 'conversion'
  page: string
  ip: string                    // hash
  userAgent: string
  timestamp: Date
}
// TTL: 180 dias
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/ads/campaigns` | brand_owner | Criar campanha |
| GET | `/api/ads/campaigns` | brand_owner | Listar campanhas proprias |
| GET | `/api/ads/campaigns/:id` | brand_owner | Detalhe com metricas |
| PATCH | `/api/ads/campaigns/:id` | brand_owner | Editar campanha |
| POST | `/api/ads/campaigns/:id/submit` | brand_owner | Submeter para revisao |
| POST | `/api/ads/serve` | publico | Obter anuncio para contexto (page, interests) |
| POST | `/api/ads/track` | publico | Registar impressao/click |
| GET | `/api/admin/ads/pending` | admin | Campanhas pendentes de revisao |
| POST | `/api/admin/ads/:id/approve` | admin | Aprovar campanha |
| POST | `/api/admin/ads/:id/reject` | admin | Rejeitar campanha |

**Service: `adServing.service.ts`**

```
- serve(context: { page, userId?, interests? }):
    1. Buscar campanhas ativas com targeting compativel
    2. Filtrar por budget disponivel (spent < totalBudget, dailySpent < dailyBudget)
    3. Ordenar por bid (leilao simplificado)
    4. Retornar top 1-3 ads
    5. Registar impressao

- track(campaignId, type, metadata):
    1. Inserir AdImpression
    2. Incrementar metrics no AdCampaign (usar $inc atomico)
    3. Verificar fraude basica (IP repetido, bot detection)

- getDailyReport(campaignId): agregacao por dia
- pauseOverBudget(): job que pausa campanhas que atingiram budget
```

**Frontend - Brand Portal:**

```
Rota: /brand-portal/campaigns

Componentes:
  - CampaignList: tabela com status, impressoes, clicks, CTR, gasto
  - CampaignEditor: formulario multi-step (conteudo → targeting → budget → preview → submeter)
  - CampaignDashboard: charts de performance por dia
  - AdPreview: preview do anuncio como aparecera na plataforma

Admin (backoffice):
  - PendingAdsQueue: lista de campanhas para aprovar/rejeitar
  - AdRevenueOverview: receita total de ads, por campanha, tendencia
```

**Frontend - Ad Display Components:**

```
Componentes reutilizaveis:
  - SponsoredBanner: banner horizontal no topo/meio de paginas
  - NativeAdCard: card que parece conteudo mas com label "Patrocinado"
  - SponsoredToolBadge: "Ferramenta patrocinada por [X]" discreto no footer da tool
  - DirectoryBoostBadge: "Destaque" badge no card do directorio

Todos incluem:
  - Label "Patrocinado" visivel (obrigatorio legal)
  - Tracking de impressao (IntersectionObserver) e click
  - Respeito por adblock (graceful degradation)
```

**Criterio de fecho:**
1. Modelos AdCampaign e AdImpression
2. CRUD de campanhas com workflow de aprovacao
3. Ad serving com targeting basico
4. Tracking de impressoes e clicks
5. Budget management com pause automatico
6. Componentes de display com label "Patrocinado"
7. Brand portal com dashboard de performance
8. Admin queue de aprovacao

---

### P10.2 - Sistema de Affiliates

**Problema:** Revenue imediato com links rastreados para brokers/servicos financeiros.

**Modelo MongoDB: `AffiliateLink`**

```typescript
// src/models/AffiliateLink.ts
interface IAffiliateLink extends Document {
  // Config
  name: string                   // ex: "DEGIRO - Abrir conta"
  provider: string               // ex: "degiro"
  directoryEntryId?: ObjectId    // ref: DirectoryEntry
  destinationUrl: string         // URL final com parametro de afiliado
  shortCode: string              // codigo unico para tracking, ex: "dgr-2026"

  // Placement
  allowedPlacements: string[]    // enum: 'directory', 'comparison', 'tool_cta', 'article_inline', 'learning_path'

  // Comissao
  commissionType: 'cpa' | 'cpl' | 'revenue_share'  // custo por aquisicao, lead, ou percentagem
  commissionValue: number        // EUR ou %

  // Estado
  isActive: boolean

  createdAt: Date
  updatedAt: Date
}
```

**Modelo: `AffiliateClick`**

```typescript
// src/models/AffiliateClick.ts
interface IAffiliateClick extends Document {
  linkId: ObjectId               // ref: AffiliateLink
  userId?: ObjectId
  placement: string              // onde o click aconteceu
  page: string                   // URL da pagina
  ip: string                     // hash
  converted: boolean             // se houve conversao confirmada
  convertedAt?: Date
  revenue?: number               // receita gerada

  timestamp: Date
}
// TTL: 365 dias
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/affiliate/redirect/:shortCode` | publico | Redirect com tracking |
| POST | `/api/affiliate/conversion` | webhook | Callback de conversao do provider |
| GET | `/api/admin/affiliate/links` | admin | Listar links |
| POST | `/api/admin/affiliate/links` | admin | Criar link |
| PATCH | `/api/admin/affiliate/links/:id` | admin | Editar link |
| GET | `/api/admin/affiliate/stats` | admin | Revenue, clicks, conversoes |

**Service: `affiliate.service.ts`**

```
- redirect(shortCode):
    1. Buscar AffiliateLink por shortCode
    2. Inserir AffiliateClick
    3. Retornar destinationUrl para redirect 302

- processConversion(shortCode, metadata):
    1. Buscar click recente do mesmo IP/user (janela 30 dias)
    2. Marcar converted=true, revenue
    3. Incrementar stats

- getRevenueReport(dateRange): agregacao de revenue por provider, placement
- getTopPerformers(dateRange): links com melhor conversao
```

**Frontend:**

```
Componentes:
  - AffiliateButton: botao "Abrir conta" ou "Saber mais" com tracking automatico
    - Usa affiliate/redirect/:shortCode como href
    - Label: "Link de afiliado" (transparencia, obrigatorio)
  - AffiliateDisclosure: texto padrao "O FinHub pode receber uma comissao..."

Placements:
  - DirectoryEntryPage: botao CTA no perfil da marca
  - ComparisonPage: botao CTA em cada entidade comparada
  - ToolPage: "Precisa de uma conta? Veja o nosso comparador de brokers"
  - ArticlePage: inline CTA contextual (se artigo menciona broker)

Admin (backoffice):
  - AffiliateLinksPage: CRUD de links
  - AffiliateRevenueDashboard: grafico de revenue/dia, tabela por provider
```

**Criterio de fecho:**
1. Modelos e CRUD
2. Redirect com tracking
3. Disclosure automatico (transparencia)
4. Dashboard admin de revenue
5. Pelo menos 3 placements funcionais
6. Webhook de conversao (ou marcacao manual)

---

<a id="p11"></a>
## P11 - REVENUE ENGINE

### P11.1 - Subscription Tiers (Freemium → Premium)

**Problema:** Sem subscricoes, nao ha revenue recorrente.

**Extensao do User model:**

```typescript
// Adicionar ao User.ts:
subscription: {
  plan: 'free' | 'pro' | 'premium'   // default 'free'
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  startedAt?: Date
  expiresAt?: Date
  cancelledAt?: Date
  paymentProvider?: 'stripe' | 'manual'
  paymentProviderId?: string          // Stripe subscription ID
  trialEndsAt?: Date
}
```

**Modelo MongoDB: `SubscriptionPlan`**

```typescript
// src/models/SubscriptionPlan.ts
interface ISubscriptionPlan extends Document {
  slug: 'free' | 'pro' | 'premium'
  name: string
  description: string

  pricing: {
    monthly: number              // EUR/mes
    annual: number               // EUR/ano (desconto)
    currency: string             // 'EUR'
  }

  limits: {
    priceAlerts: number          // 5 / 20 / 100
    portfolioAssets: number      // 10 / 50 / unlimited (-1)
    netWorthHistory: number      // 12 / 60 / unlimited (-1) meses
    watchlistSize: number        // 20 / 100 / unlimited (-1)
    apiCallsPerDay: number       // 100 / 1000 / 10000
    csvExport: boolean           // false / true / true
    taxReport: boolean           // false / false / true
    prioritySupport: boolean     // false / false / true
    adsRemoved: boolean          // false / true / true
    advancedAnalysis: boolean    // false / true / true
    fireSimulation: boolean      // false / basic / full
    comparatorPPR: boolean       // true / true / true
    compoundCalculator: boolean  // true / true / true
  }

  isActive: boolean
  displayOrder: number

  createdAt: Date
  updatedAt: Date
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/subscriptions/plans` | publico | Listar planos disponiveis |
| POST | `/api/subscriptions/checkout` | user | Iniciar checkout (Stripe) |
| POST | `/api/subscriptions/webhook` | webhook | Stripe webhook events |
| GET | `/api/subscriptions/my` | user | Estado da subscricao |
| POST | `/api/subscriptions/cancel` | user | Cancelar subscricao |
| POST | `/api/admin/subscriptions/grant` | admin | Dar premium manualmente |
| GET | `/api/admin/subscriptions/stats` | admin | MRR, churn, conversao |

**Service: `subscription.service.ts`**

```
- getPlans(): retorna planos ativos
- createCheckoutSession(userId, planSlug, billingCycle): cria Stripe checkout session
- handleWebhook(event): processa eventos Stripe:
    - checkout.session.completed: ativar subscricao
    - invoice.paid: renovar
    - invoice.payment_failed: marcar como failed
    - customer.subscription.deleted: expirar
- cancel(userId): cancela no Stripe, mantem acesso ate fim do periodo
- grant(userId, planSlug, months): admin grant manual
- checkLimit(userId, feature): verifica se user pode usar feature no plano atual
- getStats(): MRR, total subscribers, churn rate, conversion rate
```

**Middleware: `subscriptionGuard.ts`**

```typescript
// Middleware para proteger rotas premium
function requirePlan(minimumPlan: 'pro' | 'premium') {
  return async (req, res, next) => {
    const user = req.user
    const planHierarchy = { free: 0, pro: 1, premium: 2 }
    if (planHierarchy[user.subscription?.plan || 'free'] < planHierarchy[minimumPlan]) {
      return res.status(403).json({ error: 'upgrade_required', requiredPlan: minimumPlan })
    }
    next()
  }
}

// Middleware para verificar limites
function checkFeatureLimit(feature: string) {
  return async (req, res, next) => {
    const allowed = await subscriptionService.checkLimit(req.user._id, feature)
    if (!allowed) {
      return res.status(403).json({ error: 'limit_reached', feature })
    }
    next()
  }
}
```

**Dependencia nova:** `stripe` npm package.

**Frontend - Pricing Page:**

```
Rota: /pricing

Componente: PricingPage
  - 3 colunas: Free / Pro / Premium
  - Toggle: Mensal / Anual (mostrar desconto)
  - Feature comparison table com checkmarks
  - CTA: "Comecar gratis" / "Upgrade" / "Contactar"
  - FAQ section: perguntas comuns sobre planos
  - Trust badges: "Cancelar a qualquer momento", "14 dias gratis", "Sem compromisso"
```

**Frontend - Upgrade Prompts:**

```
Componente: UpgradePrompt (reutilizavel)
  - Aparece quando user atinge limite de feature
  - "Atingiste o limite de 5 alertas de preco. Faz upgrade para Pro para ter 20."
  - Botao "Ver planos"
  - Nao bloqueia: fecha com X
```

**Frontend - Subscription Management:**

```
Rota: /settings/subscription
Componente: SubscriptionManager
  - Plano atual com detalhes
  - Proximo pagamento / Data expiracao
  - Botao "Cancelar subscricao" com confirmacao
  - Historico de pagamentos
  - Botao "Alterar plano" para upgrade/downgrade
```

**Criterio de fecho:**
1. Modelo SubscriptionPlan com seed dos 3 planos
2. Extensao User com subscription field
3. Integracao Stripe (checkout, webhooks, cancelamento)
4. Middleware de guard por plano
5. Pricing page com toggle mensal/anual
6. Upgrade prompts nos limites
7. Subscription management em settings
8. Admin dashboard com MRR e stats
9. Testes para webhook handling

---

### P11.2 - Creator Revenue Share

**Problema:** Sem monetizacao, criadores nao ficam. Precisam de revenue share.

**Modelo MongoDB: `CreatorEarning`**

```typescript
// src/models/CreatorEarning.ts
interface ICreatorEarning extends Document {
  creatorId: ObjectId            // ref: User

  // Fonte
  source: 'premium_content_view' | 'tip' | 'affiliate_conversion' | 'sponsored_content'
  sourceId?: ObjectId            // ref ao conteudo, tip, affiliate, etc.

  // Valor
  grossAmount: number            // EUR
  platformFee: number            // % do FinHub (ex: 20%)
  netAmount: number              // grossAmount * (1 - platformFee)

  // Estado
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled'
  paidAt?: Date
  paymentReference?: string

  // Periodo
  periodMonth: number            // 1-12
  periodYear: number

  createdAt: Date
}
```

**Modelo: `CreatorTip`**

```typescript
// src/models/CreatorTip.ts
interface ICreatorTip extends Document {
  fromUserId: ObjectId
  toCreatorId: ObjectId
  amount: number                 // EUR
  message?: string               // max 500 chars
  contentId?: ObjectId           // ref: BaseContent (se tip num conteudo especifico)
  paymentIntentId: string        // Stripe payment intent
  status: 'pending' | 'completed' | 'failed' | 'refunded'

  createdAt: Date
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/creators/tips` | user | Enviar tip a criador |
| GET | `/api/creators/earnings` | creator | Listar earnings proprios |
| GET | `/api/creators/earnings/summary` | creator | Resumo mensal |
| GET | `/api/admin/creator-earnings` | admin | Overview de todos os earnings |
| POST | `/api/admin/creator-earnings/payout` | admin | Marcar payout como efetuado |

**Frontend - Creator Dashboard:**

```
Rota: /dashboard/earnings
Componentes:
  - EarningsSummaryCards: Total pendente | Total pago | Este mes | Media mensal
  - EarningsChart: bar chart por mes, stacked por source
  - EarningsTable: lista de earnings individuais
  - PayoutHistory: historico de pagamentos
  - TipsReceived: lista de tips com mensagem
```

**Frontend - Tip Component:**

```
Componente: TipButton (em paginas de conteudo e perfil de criador)
  - Botao "Apoiar" com icone
  - Modal com valores pre-definidos (1, 3, 5, 10 EUR) + custom
  - Campo de mensagem opcional
  - Checkout Stripe (Elements ou Payment Links)
  - Confirmacao com agradecimento
```

**Criterio de fecho:**
1. Modelos CreatorEarning e CreatorTip
2. Tip flow com Stripe
3. Revenue share tracking automatico
4. Creator earnings dashboard
5. Admin payout management
6. Tip button reutilizavel

---

<a id="p12"></a>
## P12 - CAMADA CRIADORES AVANCADA

### P12.1 - Scheduling e Queue de Publicacao

**Problema:** Criadores precisam agendar conteudo. Essencial para workflow editorial.

**Extensao do BaseContent:**

```typescript
// Adicionar ao BaseContent.ts:
scheduling: {
  scheduledPublishAt?: Date      // data agendada de publicacao
  scheduledBy?: ObjectId         // quem agendou
  autoPublish: boolean           // true = publica automaticamente na data
}
```

**Worker: `contentScheduler.worker.ts`**

```
Frequencia: a cada minuto
Logica:
  1. Buscar conteudos com scheduling.scheduledPublishAt <= now AND status='draft' AND autoPublish=true
  2. Para cada: atualizar status='published', publishedAt=now
  3. Disparar notificacao ao criador
  4. Disparar notificacoes aos followers (se sistema de notificacao ativo)
  5. Log: conteudos publicados, erros
```

**Endpoints (extensao dos existentes):**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/articles/:id/schedule` | creator | Agendar publicacao |
| DELETE | `/api/articles/:id/schedule` | creator | Cancelar agendamento |
| GET | `/api/creators/queue` | creator | Lista de conteudos agendados |

(Mesmo padrao para videos, courses, etc.)

**Frontend:**

```
Componente: ScheduleButton (no editor de conteudo)
  - Ao lado de "Publicar", botao "Agendar"
  - Date/time picker
  - Confirmacao: "Este artigo sera publicado em [data] as [hora]"

Componente: ContentQueue (no dashboard do criador)
  - Timeline visual de conteudos agendados
  - Drag & drop para reordenar (atualiza dates)
  - Indicador de frequencia: "Tens 3 publicacoes esta semana"
```

**Criterio de fecho:**
1. Campo scheduling no BaseContent
2. Worker de publicacao automatica
3. Schedule/unschedule endpoints
4. UI de agendamento no editor
5. Queue visual no dashboard

---

### P12.2 - Creator Newsletter (CRM basico)

**Problema:** Criadores precisam comunicar com seguidores. Newsletter propria.

**Modelo MongoDB: `CreatorNewsletter`**

```typescript
// src/models/CreatorNewsletter.ts
interface ICreatorNewsletter extends Document {
  creatorId: ObjectId
  subject: string
  body: string                   // HTML sanitizado

  // Targeting
  audienceType: 'all_followers' | 'premium_only'

  // Estado
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduledAt?: Date
  sentAt?: Date

  // Metricas
  metrics: {
    totalRecipients: number
    delivered: number
    opened: number
    clicked: number
    unsubscribed: number
  }

  createdAt: Date
  updatedAt: Date
}
```

**Extensao do Follow model:**

```typescript
// Adicionar ao Follow.ts:
newsletterOptIn: {
  type: Boolean,
  default: true                  // opt-in ao seguir, opt-out quando quiser
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/creators/newsletters` | creator | Criar newsletter |
| GET | `/api/creators/newsletters` | creator | Listar newsletters |
| PATCH | `/api/creators/newsletters/:id` | creator | Editar draft |
| POST | `/api/creators/newsletters/:id/send` | creator | Enviar |
| POST | `/api/creators/newsletters/:id/schedule` | creator | Agendar envio |
| GET | `/api/creators/newsletters/:id/stats` | creator | Metricas |
| POST | `/api/newsletter/unsubscribe/:token` | publico | Unsubscribe |

**Limites:**
- free creator: 1 newsletter/semana, max 500 recipients
- premium creator: 3/semana, max 5000 recipients

**Frontend:**

```
Rota: /dashboard/newsletters
Componentes:
  - NewsletterEditor: rich text editor (tiptap reutilizado), preview
  - NewsletterList: historico com metricas inline
  - NewsletterStats: open rate, click rate, trend
  - AudienceOverview: total followers com newsletter, opt-in rate
```

**Criterio de fecho:**
1. Modelo e CRUD
2. Envio via email.service.ts (batch com rate limit)
3. Unsubscribe com 1 click (obrigatorio RGPD)
4. Metricas basicas (open via pixel, clicks via redirect)
5. UI de editor e lista
6. Limites por tier

---

<a id="p13"></a>
## P13 - SOCIAL E NETWORK EFFECTS

### P13.1 - Referral Program

**Problema:** Sem referral, growth e 100% pago ou organico. Referral e o growth hack mais eficiente.

**Modelo MongoDB: `Referral`**

```typescript
// src/models/Referral.ts
interface IReferral extends Document {
  referrerId: ObjectId           // quem convidou
  referredId: ObjectId           // quem foi convidado
  referralCode: string           // codigo unico do referrer

  // Estado
  status: 'pending' | 'registered' | 'activated' | 'rewarded'
  registeredAt?: Date
  activatedAt?: Date             // ex: completou onboarding + 7 dias ativo
  rewardedAt?: Date

  // Recompensa
  referrerReward?: {
    type: 'premium_days' | 'badge' | 'feature_unlock'
    value: number                // ex: 30 dias premium
    granted: boolean
  }
  referredReward?: {
    type: 'premium_days' | 'badge' | 'feature_unlock'
    value: number
    granted: boolean
  }

  createdAt: Date
}
```

**Extensao do User:**

```typescript
// Adicionar ao User.ts:
referralCode: {
  type: String,
  unique: true,
  sparse: true                  // gerado no primeiro acesso a pagina de referral
}
referredBy: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  default: null
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/referral/code` | user | Obter/gerar codigo de referral |
| GET | `/api/referral/stats` | user | Quantos convidados, quantos ativados |
| POST | `/api/auth/register` | publico | (extensao) aceitar referralCode no body |
| GET | `/api/referral/leaderboard` | publico | Top referrers (opt-in) |

**Service: `referral.service.ts`**

```
- generateCode(userId): gera codigo unico (username + random suffix)
- applyReferral(referredUserId, code): vincula ao referrer
- checkActivation(referredUserId): verifica se criteria cumpridos (7 dias ativo + onboarding)
- grantRewards(referralId): da recompensa a ambos
- getStats(userId): total convidados, ativados, recompensas ganhas
- getLeaderboard(): top 20 referrers (opt-in)
```

**Frontend:**

```
Rota: /referral (ou /settings/referral)
Componente: ReferralPage
  - Codigo unico copiavel
  - Link de partilha: finhub.pt/join?ref=CODIGO
  - Botoes de share (WhatsApp, Twitter, Email, Copy link)
  - Stats: X convidados, Y ativados, Z dias premium ganhos
  - Explicacao: "Convida amigos e ambos ganham 30 dias de Premium gratis"

Componente: ReferralBanner (no dashboard, se user nao convidou ninguem)
  - "Sabia que podes ganhar Premium gratis? Convida um amigo"
```

**Criterio de fecho:**
1. Modelo Referral e extensao User
2. Geracao de codigo unico
3. Tracking completo: registro → ativacao → recompensa
4. Pagina de referral com share buttons
5. Recompensas automaticas (premium days)
6. Banner de promoção no dashboard

---

### P13.2 - Clubs/Grupos Tematicos

**Problema:** Comunidade (P5) e publica. Faltam espacos semi-privados para nichos.

**Modelo MongoDB: `Club`**

```typescript
// src/models/Club.ts
interface IClub extends Document {
  name: string
  slug: string                   // unico, URL-friendly
  description: string            // max 1000 chars
  avatar?: string
  coverImage?: string

  // Config
  type: 'public' | 'private' | 'invite_only'
  category: string               // enum: 'fire', 'dividendos', 'crypto', 'etfs', 'iniciantes', 'imobiliario', 'ppr', 'frugal', 'empreendedorismo', 'other'

  // Ownership
  createdBy: ObjectId
  moderators: ObjectId[]         // refs: User

  // Stats
  memberCount: number
  postCount: number
  lastActivityAt: Date

  // Rules
  rules?: string[]               // max 10 regras

  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Modelo: `ClubMembership`**

```typescript
// src/models/ClubMembership.ts
interface IClubMembership extends Document {
  clubId: ObjectId
  userId: ObjectId
  role: 'member' | 'moderator' | 'owner'
  joinedAt: Date

  // Notificacoes
  notifyNewPosts: boolean
  notifyMentions: boolean
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/clubs` | user | Criar club |
| GET | `/api/clubs` | publico | Listar clubs (publicos) |
| GET | `/api/clubs/:slug` | varies | Detalhe do club |
| PATCH | `/api/clubs/:slug` | owner/mod | Editar club |
| POST | `/api/clubs/:slug/join` | user | Juntar-se |
| POST | `/api/clubs/:slug/leave` | user | Sair |
| GET | `/api/clubs/:slug/members` | member | Listar membros |
| POST | `/api/clubs/:slug/posts` | member | Criar post no club |
| GET | `/api/clubs/:slug/posts` | varies | Listar posts do club |
| GET | `/api/my/clubs` | user | Meus clubs |

**Nota:** Posts dos clubs reutilizam o modelo de Discussion do P5_COMUNIDADE_SOCIAL, adicionando um campo `clubId?: ObjectId` opcional.

**Frontend:**

```
Rota: /clubs
Componente: ClubsDiscoveryPage
  - Grid de clubs com avatar, nome, descricao, member count
  - Filtros por categoria
  - Search
  - CTA "Criar Club" (limite: 3 por user free, 10 por premium)

Rota: /clubs/:slug
Componente: ClubPage
  - Header com cover, avatar, nome, descricao, member count
  - Feed de posts (reutiliza Discussion components)
  - Sidebar: regras, moderadores, membros recentes
  - Botao Join/Leave
```

**Criterio de fecho:**
1. Modelos Club e ClubMembership
2. CRUD de clubs
3. Join/Leave com contagem
4. Posts dentro de clubs (extensao de discussions)
5. Discovery page com filtros
6. Club page com feed

---

### P13.3 - Polls e Surveys Comunitarios

**Modelo MongoDB: `Poll`**

```typescript
// src/models/Poll.ts
interface IPoll extends Document {
  createdBy: ObjectId
  question: string               // max 280 chars
  options: {
    text: string                 // max 100 chars
    votes: number
  }[]

  // Config
  allowMultiple: boolean         // permitir votar em mais de 1
  endsAt: Date                   // duracao obrigatoria

  // Contexto
  context?: 'global' | 'club' | 'discussion'
  contextId?: ObjectId           // clubId ou discussionId

  // Stats
  totalVotes: number

  createdAt: Date
}
```

**Modelo: `PollVote`**

```typescript
interface IPollVote extends Document {
  pollId: ObjectId
  userId: ObjectId
  optionIndexes: number[]        // indices das opcoes votadas
  createdAt: Date
}
// Index unico: { pollId: 1, userId: 1 }
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/polls` | user | Criar poll |
| GET | `/api/polls` | publico | Listar polls ativas |
| POST | `/api/polls/:id/vote` | user | Votar |
| GET | `/api/polls/:id/results` | publico | Resultados (so apos voto ou apos fechar) |

**Frontend:**

```
Componente: PollCard (reutilizavel em feed, clubs, discussions)
  - Pergunta
  - Opcoes como botoes (antes de votar)
  - Opcoes como barras de progresso com % (apos votar)
  - Timer: "Termina em X horas"
  - Total de votos

Componente: CreatePollForm
  - Input pergunta
  - Ate 6 opcoes (add/remove dinamico)
  - Duracao: 1h, 6h, 24h, 3d, 7d
  - Toggle: permitir multiplas escolhas
```

**Criterio de fecho:**
1. Modelos Poll e PollVote
2. CRUD + vote endpoint
3. Resultados so visiveis apos voto
4. PollCard reutilizavel
5. Integracao com feed/discussions/clubs

---

<a id="p14"></a>
## P14 - TRUST, COMPLIANCE E RGPD AUTOMATION

### P14.1 - RGPD Automation Completa

**Problema:** RGPD exige data export, right to be forgotten, consent granular. Implementacao parcial.

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/api/privacy/export` | user | Solicitar export de dados pessoais |
| GET | `/api/privacy/export/:requestId` | user | Status/download do export |
| POST | `/api/privacy/delete-account` | user | Solicitar eliminacao de conta |
| GET | `/api/privacy/consents` | user | Ver consents ativos |
| PATCH | `/api/privacy/consents` | user | Atualizar consents granulares |

**Modelo: `PrivacyRequest`**

```typescript
// src/models/PrivacyRequest.ts
interface IPrivacyRequest extends Document {
  userId: ObjectId
  type: 'data_export' | 'account_deletion'
  status: 'pending' | 'processing' | 'completed' | 'failed'

  // Para export
  downloadUrl?: string           // URL temporario (S3 signed, expira 24h)
  exportFormat: 'json' | 'csv'

  // Para deletion
  deletionScheduledAt?: Date     // 30 dias apos pedido (periodo de graca)
  deletionCompletedAt?: Date

  // Metadata
  requestedAt: Date
  processedAt?: Date
  processedBy?: string           // 'system' ou admin ObjectId

  createdAt: Date
}
```

**Worker: `privacyProcessor.worker.ts`**

```
Export:
  1. Recolher dados de todos os modelos: User, UserFinancialProfile, Favorites, Follows, Comments, Ratings, PriceAlerts, NetWorthSnapshots, AnalyticsEvents, etc.
  2. Empacotar em JSON/CSV
  3. Upload para S3 com signed URL (expira 24h)
  4. Notificar user por email

Deletion:
  1. 30 dias apos pedido (periodo de graca com email de confirmacao)
  2. Anonimizar dados em models partilhados (comments, ratings → userId = null, name = "[Removido]")
  3. Hard delete de dados pessoais (UserFinancialProfile, PriceAlerts, NetWorthSnapshots, AnalyticsEvents, Favorites, Follows)
  4. Soft delete de User (accountStatus = 'deleted', email hash, clear PII)
  5. Log em AdminAuditLog
  6. Email final de confirmacao
```

**Frontend:**

```
Rota: /settings/privacy
Componente: PrivacySettings
  - Consents granulares: toggles para analytics, marketing, preferences
  - Botao "Exportar meus dados" → feedback "A processar, receberas um email"
  - Botao "Eliminar conta" → confirmacao em 3 steps:
    1. "Tens a certeza?" + explicacao do que acontece
    2. Introduzir password para confirmar
    3. "Conta agendada para eliminacao em 30 dias. Podes cancelar ate la."
  - Botao "Cancelar eliminacao" (se pendente)
```

**Criterio de fecho:**
1. Modelo PrivacyRequest
2. Export funcional com download
3. Deletion com periodo de graca de 30 dias
4. Anonimizacao correta em dados partilhados
5. Consents granulares editaveis
6. UI completa em settings
7. Emails de notificacao em cada step
8. Admin audit trail

---

### P14.2 - Data Quality Scoring

**Problema:** Users nao sabem se os dados apresentados sao fiaveis. Transparencia gera confianca.

**Tipo:** Sem modelo novo. Logica no frontend + metadata nos endpoints.

**Extensao dos endpoints de mercado (stock, etf, reit, crypto):**

Adicionar ao response de cada endpoint de analise:

```typescript
dataQuality: {
  overallScore: 'high' | 'medium' | 'low' | 'estimated'
  sources: string[]              // ['FMP', 'Yahoo Finance']
  lastUpdated: Date
  warnings: string[]             // ex: ['Dados de dividendos estimados', 'Preco com delay de 15min']
  freshness: 'realtime' | 'delayed_15min' | 'daily' | 'weekly' | 'stale'
}
```

**Service: `dataQuality.service.ts`**

```
- assessQuality(data, source, lastFetch):
    - high: dados completos de fonte primaria, <24h
    - medium: dados parciais ou fonte secundaria, <7d
    - low: dados incompletos ou estimados
    - estimated: dados calculados/interpolados
    - freshness baseado em lastFetch timestamp
    - warnings gerados por campos null/estimated
```

**Frontend:**

```
Componente: DataQualityBadge (reutilizavel)
  - Icone colorido: verde (high), amarelo (medium), laranja (low), cinza (estimated)
  - Tooltip: "Dados de [fontes], atualizados ha [tempo]. [warnings]"
  - Posicionado ao lado de cada metrica/tabela
```

**Criterio de fecho:**
1. DataQuality metadata em todos os endpoints de mercado
2. Badge visual em todas as ferramentas
3. Tooltips informativos

---

### P14.3 - Financial Disclaimer Engine

**Problema:** Disclaimer estatico nao e suficiente. Precisa ser contextual e dinamico.

**Tipo:** Frontend-heavy com configuracao backend.

**Modelo: `DisclaimerConfig`**

```typescript
// src/models/DisclaimerConfig.ts
interface IDisclaimerConfig extends Document {
  context: string                // enum: 'stock_analysis', 'fire_simulation', 'tax_simulator', 'ppr_comparator', 'calculator', 'community_post', 'creator_content', 'directory_entry', 'affiliate_link'

  text: {
    pt: string
    en?: string
  }

  displayType: 'banner' | 'footer' | 'modal_first_use' | 'inline' | 'tooltip'
  severity: 'info' | 'warning' | 'critical'
  requiresAcknowledgement: boolean  // user tem de clicar "Entendi"

  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/disclaimers?context=stock_analysis` | publico | Obter disclaimers para contexto |
| GET | `/api/admin/disclaimers` | admin | Listar todos |
| POST | `/api/admin/disclaimers` | admin | Criar |
| PATCH | `/api/admin/disclaimers/:id` | admin | Editar |

**Frontend:**

```
Componente: DisclaimerRenderer (reutilizavel)
  - Recebe context como prop
  - Fetch disclaimer para esse contexto
  - Renderiza no displayType correto (banner, footer, modal, inline)
  - Se requiresAcknowledgement, mostra modal no primeiro uso e guarda em localStorage

Exemplos de textos:
  - stock_analysis: "Esta analise e meramente informativa e nao constitui aconselhamento financeiro..."
  - fire_simulation: "Os resultados sao projecoes baseadas em pressupostos. Rendimentos passados..."
  - affiliate_link: "Este link e de afiliado. O FinHub pode receber uma comissao..."
  - community_post: "As opinioes expressas sao dos utilizadores e nao do FinHub..."
```

**Criterio de fecho:**
1. Modelo com seed para todos os contextos
2. Componente reutilizavel
3. Admin CRUD
4. Disclaimers em todas as ferramentas e conteudos
5. Acknowledgement tracking para critical disclaimers

---

<a id="p15"></a>
## P15 - METRICAS DE NEGOCIO E INVESTOR READINESS

### P15.1 - Business Metrics Dashboard (Admin)

**Problema:** Sem metricas de negocio agregadas, nao se gere o produto nem se levanta capital.

**Tipo:** Endpoints admin + dashboard no backoffice.

**Endpoints:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/admin/metrics/business/overview` | admin | KPIs principais |
| GET | `/api/admin/metrics/business/revenue` | admin | Revenue breakdown |
| GET | `/api/admin/metrics/business/growth` | admin | Growth metrics |
| GET | `/api/admin/metrics/business/engagement` | admin | Engagement metrics |
| GET | `/api/admin/metrics/business/content` | admin | Content metrics |

**Service: `businessMetrics.service.ts`**

```
- getOverview(dateRange):
    DAU, WAU, MAU (de AnalyticsEvent ou User.lastActiveAt)
    Total users, new users (periodo), churn rate
    MRR, ARR (de subscricoes)
    Total content, new content (periodo)
    NPS score (de UserFeedback)

- getRevenue(dateRange):
    MRR breakdown: subscriptions, tips, affiliate, ads
    ARPU (average revenue per user)
    LTV estimado (ARPU * avg lifetime)
    Conversion rate: free → paid
    Churn rate: cancelamentos / total premium

- getGrowth(dateRange):
    Signups por dia/semana/mes
    Activation rate (signup → onboarding → first action)
    Referral coefficient (referrals / active users)
    Organic vs referral vs direct breakdown

- getEngagement(dateRange):
    Sessions per user
    Avg session duration
    Pages per session
    Feature adoption rates (% users que usaram cada ferramenta)
    Retention: D1, D7, D30

- getContent(dateRange):
    Total por tipo (articles, videos, courses, etc.)
    Published vs draft ratio
    Avg engagement per content type
    Top creators by views
    Creator growth (novos criadores/mes)
```

**Frontend (backoffice):**

```
Rota: /dashboard/business-metrics

Componentes:
  - KPICards: DAU, MAU, MRR, NPS, Conversion Rate (com sparklines de tendencia)
  - RevenueChart: area chart stacked por fonte (subscriptions, tips, affiliate, ads)
  - GrowthChart: line chart signups + activation rate
  - RetentionHeatmap: cohort retention matrix
  - FeatureAdoptionTable: tabela com % adoption por feature
  - ContentOverview: donut por tipo + barras de engagement
  - TopCreatorsTable: ranking de criadores por views/engagement

Filtros globais:
  - Date range: Ultima semana / Ultimo mes / Ultimos 3 meses / Custom
  - Comparacao: vs periodo anterior (mostrar deltas %)
```

**Criterio de fecho:**
1. Service com agregacoes de todos os modelos relevantes
2. 5 endpoints com cache Redis (5 min TTL)
3. Dashboard com 7+ visualizacoes
4. Filtros de date range
5. Comparacao com periodo anterior

---

### P15.2 - Investor Data Room (documentacao automatica)

**Problema:** Para fundraising, investidores pedem data room. Automatizar o que for possivel.

**Tipo:** Gerador de reports + pagina admin.

**Endpoint:**

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/admin/investor/report?period=monthly` | admin | Gerar report mensal |
| GET | `/api/admin/investor/report/download` | admin | Download PDF/JSON |

**Service: `investorReport.service.ts`**

```
- generateMonthlyReport(month, year):
    Agrega de businessMetrics.service:
    - KPIs: DAU, MAU, MRR, ARR, growth rate, NPS
    - User metrics: total, new, churn, activation, retention D30
    - Revenue: MRR, breakdown, ARPU, LTV
    - Product: features shipped, content created, creators active
    - Highlights: top achievements do mes

    Retorna JSON estruturado que o frontend renderiza
    Opcao de export PDF (usar puppeteer ou html-pdf)
```

**Frontend (backoffice):**

```
Rota: /dashboard/investor-report

Componente: InvestorReportPage
  - Selector de mes/ano
  - Preview do report em formato apresentavel
  - Botao "Download PDF"
  - Botao "Copiar link" (link com token temporario para partilha)
  - Historico de reports anteriores
```

**Dependencia nova:** `puppeteer` ou `@react-pdf/renderer` para geracao de PDF.

**Criterio de fecho:**
1. Report mensal auto-gerado
2. Preview em browser
3. Download PDF
4. Historico consultavel

---

<a id="p16"></a>
## P16 - INTERNACIONALIZACAO

### P16.1 - Multi-language Support

**Problema:** Plataforma so em PT. Para escalar para PT-BR e EN, precisa de i18n.

**Backend:**

```typescript
// Extensao de config/env.ts:
SUPPORTED_LOCALES: ['pt-PT', 'pt-BR', 'en']
DEFAULT_LOCALE: 'pt-PT'

// Middleware: locale.ts
- Extrai locale de: header Accept-Language > user preference > default
- Adiciona req.locale
- Usado por: disclaimers, emails, error messages

// Extensao de UserPreferences.ts:
locale: {
  type: String,
  enum: ['pt-PT', 'pt-BR', 'en'],
  default: 'pt-PT'
}
```

**Frontend:**

```
Tecnologia: next-intl (ja instalado no backoffice)

Estrutura:
  src/
    messages/
      pt-PT.json    // traducoes PT Portugal
      pt-BR.json    // traducoes PT Brasil
      en.json       // traducoes English

Middleware Next.js:
  - Detectar locale do user (cookie > browser > default)
  - Redirect para URL com prefixo: /pt/ferramentas/..., /en/tools/...

Conteudo de criadores:
  - Conteudo nao e traduzido automaticamente (criador publica na lingua que quiser)
  - Tag de lingua no conteudo para filtro

UI strings:
  - Todas as strings da UI via next-intl useTranslations()
  - Nao traduzir termos financeiros tecnicos (ETF, FIRE, P/E, etc.)
```

**Criterio de fecho:**
1. Middleware de locale no backend
2. Ficheiros de traducao para 3 locales
3. Todas as UI strings via i18n (nao hardcoded)
4. Selector de lingua na UI
5. Preferencia de lingua guardada no perfil
6. Emails na lingua do user

---

<a id="ordem"></a>
## ORDEM DE EXECUCAO RECOMENDADA

### Fase 1 - Revenue Foundation (prioridade maxima)

| # | Bloco | Esforco | Impacto |
|---|-------|---------|---------|
| 1 | P7.1 Onboarding Profiling | Medio | Critico - alimenta tudo |
| 2 | P11.1 Subscription Tiers | Alto | Critico - revenue |
| 3 | P10.2 Affiliate System | Medio | Alto - revenue imediato |
| 4 | P8.4 Price Alerts | Medio | Alto - retencao |

### Fase 2 - User Value (ferramentas que atraem e retem)

| # | Bloco | Esforco | Impacto |
|---|-------|---------|---------|
| 5 | P8.1 Calculadora Juros Compostos | Baixo | Alto - SEO |
| 6 | P8.2 Calculadora Dividendos | Baixo | Alto - SEO |
| 7 | P8.3 Simulador Impostos PT | Medio | Muito Alto - unico |
| 8 | P8.5 Calendario Dividendos | Medio | Alto - retencao |
| 9 | P8.7 Budget Planner | Baixo | Medio - entry point |
| 10 | P8.8 Net Worth Tracker | Medio | Alto - retencao |

### Fase 3 - Creator & Brand Monetization

| # | Bloco | Esforco | Impacto |
|---|-------|---------|---------|
| 11 | P11.2 Creator Revenue Share | Alto | Critico - reter criadores |
| 12 | P9.1 Brand Analytics | Medio | Alto - monetizar marcas |
| 13 | P9.2 Review Management | Baixo | Medio |
| 14 | P9.3 Comparison Pages | Medio | Alto - SEO |
| 15 | P12.1 Scheduling | Medio | Medio - produtividade criador |
| 16 | P8.6 Comparador PPR | Medio | Alto - unico PT |

### Fase 4 - Growth & Community

| # | Bloco | Esforco | Impacto |
|---|-------|---------|---------|
| 17 | P13.1 Referral Program | Medio | Alto - growth |
| 18 | P13.2 Clubs/Grupos | Alto | Medio - engagement |
| 19 | P13.3 Polls | Baixo | Medio - engagement |
| 20 | P12.2 Creator Newsletter | Alto | Medio |

### Fase 5 - Ads, Compliance & Scale

| # | Bloco | Esforco | Impacto |
|---|-------|---------|---------|
| 21 | P10.1 Ad Campaigns | Muito Alto | Alto - revenue |
| 22 | P14.1 RGPD Automation | Alto | Critico - legal |
| 23 | P14.2 Data Quality Scoring | Baixo | Medio - trust |
| 24 | P14.3 Disclaimer Engine | Medio | Alto - compliance |

### Fase 6 - Analytics & Investor Readiness

| # | Bloco | Esforco | Impacto |
|---|-------|---------|---------|
| 25 | P7.2 Event Tracking | Alto | Critico - analytics |
| 26 | P7.3 Feedback/NPS | Baixo | Medio |
| 27 | P15.1 Business Metrics Dashboard | Alto | Critico - gestao |
| 28 | P15.2 Investor Data Room | Medio | Alto - fundraising |

### Fase 7 - Internacionalizacao

| # | Bloco | Esforco | Impacto |
|---|-------|---------|---------|
| 29 | P16.1 Multi-language | Muito Alto | Critico - escala |

---

<a id="criterios"></a>
## CRITERIOS DE FECHO GLOBAIS

Cada bloco P7-P16 so pode ser marcado como concluido quando tiver:

1. **Implementacao backend**: modelos, endpoints, services, testes unitarios
2. **Implementacao frontend**: paginas, componentes, integracao com API
3. **Validacao tecnica**: typecheck limpo, testes passam, sem regressoes
4. **Review de seguranca**: sem vulnerabilidades OWASP (XSS, injection, IDOR)
5. **RGPD compliance**: dados pessoais protegidos, consentimento verificado
6. **Atualizacao desta auditoria**: estado e evidencias atualizados
7. **Commit dedicado**: com prefixo `feat(PX.Y):` descritivo
8. **Movimento para `dcos/done/`**: quando todos os sub-blocos de um P estiverem fechados

## RESUMO DE NOVOS MODELOS (17 total)

| Modelo | Bloco | Colecao MongoDB |
|--------|-------|-----------------|
| UserFinancialProfile | P7.1 | userfinancialprofiles |
| AnalyticsEvent | P7.2 | analyticsevents |
| UserFeedback | P7.3 | userfeedbacks |
| PriceAlert | P8.4 | pricealerts |
| PPRPlan | P8.6 | pprplans |
| NetWorthSnapshot | P8.8 | networthsnapshots |
| AdCampaign | P10.1 | adcampaigns |
| AdImpression | P10.1 | adimpressions |
| AffiliateLink | P10.2 | affiliatelinks |
| AffiliateClick | P10.2 | affiliateclicks |
| SubscriptionPlan | P11.1 | subscriptionplans |
| CreatorEarning | P11.2 | creatorearnings |
| CreatorTip | P11.2 | creatortips |
| CreatorNewsletter | P12.2 | creatornewsletters |
| Referral | P13.1 | referrals |
| Club | P13.2 | clubs |
| ClubMembership | P13.2 | clubmemberships |
| Poll | P13.3 | polls |
| PollVote | P13.3 | pollvotes |
| PrivacyRequest | P14.1 | privacyrequests |
| DisclaimerConfig | P14.3 | disclaimerconfigs |

## RESUMO DE EXTENSOES A MODELOS EXISTENTES

| Modelo | Bloco | Campos adicionados |
|--------|-------|--------------------|
| User | P11.1 | subscription { plan, status, startedAt, expiresAt, ... } |
| User | P13.1 | referralCode, referredBy |
| BaseContent | P12.1 | scheduling { scheduledPublishAt, scheduledBy, autoPublish } |
| Rating | P9.2 | brandResponse { text, respondedBy, respondedAt } |
| Follow | P12.2 | newsletterOptIn |
| UserPreferences | P16.1 | locale |

## RESUMO DE NOVOS WORKERS (4 total)

| Worker | Bloco | Frequencia |
|--------|-------|------------|
| priceAlertChecker.worker.ts | P8.4 | A cada 5 min |
| contentScheduler.worker.ts | P12.1 | A cada 1 min |
| privacyProcessor.worker.ts | P14.1 | A cada 1 hora |
| adBudgetChecker.worker.ts | P10.1 | A cada 15 min |

## RESUMO DE NOVAS DEPENDENCIAS NPM

| Package | Bloco | Motivo |
|---------|-------|--------|
| stripe | P11.1, P11.2 | Pagamentos e subscricoes |
| node-cron | P8.4, P12.1 | Scheduling de workers |
| puppeteer (ou @react-pdf/renderer) | P15.2 | Geracao PDF |

## HISTORICO

- 2026-03-07: criacao da auditoria de camadas em falta (P7-P16)
- Base: analise gap vs plataformas de referencia + auditoria 04 + todos os docs P4-P6
