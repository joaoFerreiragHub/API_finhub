# P5 — Visao: Hub Financeiro Pessoal Integrado

## A ideia

As ferramentas financeiras do FinHub nao sao um menu de calculadoras separadas. Sao um **sistema integrado** que acompanha a jornada financeira de cada utilizador — desde o momento em que quer perceber "quanto preciso para ser independente?" ate a supervisao continua da sua carteira real.

A complexidade existe por baixo. O que o utilizador ve e **simplicidade**.

---

## 1. A jornada integrada

### V1 — Ferramentas independentes (o que documentamos)

Cada ferramenta funciona sozinha. O utilizador pode usar a calculadora de juros compostos sem ter portfolio, pode analisar uma acao sem ter FIRE definido. Tudo funciona standalone.

### V2 — Hub financeiro pessoal (esta visao)

As ferramentas ligam-se umas as outras atraves de um **perfil financeiro do utilizador**. A informacao flui entre elas:

```
                    ┌─────────────────────────────┐
                    │   PERFIL FINANCEIRO PESSOAL  │
                    │                              │
                    │  Rendimento: €2.200/mes      │
                    │  Despesas: €1.400/mes        │
                    │  Capacidade invest: €800/mes │
                    │  Objetivo FIRE: €600.000     │
                    │  Horizonte: ~12 anos         │
                    └──────────┬──────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │ PORTFOLIO │      │  SIMULADOR  │     │ SUPERVISAO  │
    │           │      │    FIRE     │     │  CONTINUA   │
    │ Ativos    │◄────►│ Projecoes   │◄───►│ Dashboard   │
    │ Posicoes  │      │ Cenarios    │     │ Alertas     │
    │ Alocacao  │      │ Milestones  │     │ Progresso   │
    └─────┬─────┘      └──────┬──────┘     └──────┬──────┘
          │                    │                    │
          │     ┌──────────────┼──────────────┐    │
          │     │              │              │    │
    ┌─────▼─────▼──┐  ┌───────▼────┐  ┌──────▼───▼───┐
    │ ANALISE      │  │ DIVIDENDOS │  │  IMPOSTOS    │
    │ DETALHADA    │  │ PROJECAO   │  │  SIMULACAO   │
    │              │  │            │  │              │
    │ Acoes/REITs  │  │ Income     │  │ Mais-valias  │
    │ Score/Radar  │  │ passivo    │  │ Dividendos   │
    │ Riscos       │  │ DRIP       │  │ Liquido real │
    └──────────────┘  └────────────┘  └──────────────┘
```

**O diferenciador:** Nenhuma plataforma gratuita faz isto. Existem calculadoras FIRE, existem trackers de portfolio, existem analisadores de acoes — mas ninguem os liga num fluxo unico onde a informacao flui entre eles.

---

## 2. O perfil financeiro pessoal

### 2.1 Onboarding (primeira vez)

O utilizador preenche uma vez, de forma guiada e simples:

```
Passo 1: Sobre ti
  "Quanto ganhas por mes?" → [€2.200]
  "Quanto gastas por mes (aproximado)?" → [€1.400]
  → Capacidade de investimento: €800/mes

Passo 2: O teu objetivo
  "O que significa liberdade financeira para ti?"
  ○ Cobrir despesas mensais sem trabalhar → [€1.400/mes × 12 ÷ 4% = €420.000]
  ○ Ter rendimento passivo de X€/mes → [€2.000/mes → €600.000]
  ○ Atingir um montante total → [€500.000]
  → Objetivo FIRE: €600.000

Passo 3: A tua carteira atual (opcional)
  "Ja tens investimentos?"
  ○ Sim → adicionar ativos (ticker + quantidade + preco medio)
  ○ Ainda nao → mostrar sugestoes para comecar

Passo 4: Contribuicao mensal
  "Quanto vais investir por mes?" → [€500]
  "Em que?" → distribuir pelos ativos (ou sugestao automatica)
```

**Resultado:** Em 5 minutos, o utilizador tem:
- Perfil financeiro completo
- Portfolio mapeado (se ja investe)
- Projecao FIRE inicial
- Dashboard personalizado

### 2.2 Dados do perfil

```typescript
interface FinancialProfile {
  // Rendimento e despesas
  monthlyIncome: number
  monthlyExpenses: number
  monthlySavings: number  // calculado: income - expenses
  monthlyInvestment: number  // quanto do savings vai para investimentos

  // Objetivo
  fireTarget: {
    method: 'expenses' | 'passive_income' | 'target_amount'
    value: number
    withdrawalRate: number  // default 4%
    targetAmount: number    // calculado
  }

  // Perfil de risco (derivado ou questionario simples)
  riskProfile: 'conservative' | 'moderate' | 'aggressive'

  // Metadata
  currency: 'EUR' | 'USD'
  country: 'PT' | 'BR' | 'other'
  age?: number  // para calculos de horizonte
  updatedAt: Date
}
```

---

## 3. Como as ferramentas se ligam

### 3.1 Portfolio → tudo

Quando o utilizador tem portfolio preenchido, todas as outras ferramentas ganham contexto:

| Ferramenta | Sem portfolio | Com portfolio |
|-----------|-------------|-------------|
| **Analise de acoes** | Analise generica de AAPL | "AAPL e 15% da tua carteira. Score 72. Recomendacao: manter." |
| **REIT Toolkit** | Valuation generica de O | "O e o teu maior gerador de dividendos (€85/mes). Fair value: $62 vs preco atual $58 → subvalorizado." |
| **Watchlist** | Lista de tickers | "3 dos teus watchlist tickers cairam >5% esta semana — oportunidade de compra vs preco medio?" |
| **Juros compostos** | Calculadora generica | Pre-preenchida com o teu investimento mensal e retorno medio historico da carteira |
| **Dividendos** | Calculadora generica | "A tua carteira gera €120/mes. Faltam €1.880/mes para o teu objetivo." |
| **Impostos** | Calculadora generica | Pre-preenchida com os teus ativos, precos de compra e venda estimados |
| **FIRE simulator** | Simulacao com inputs manuais | Tudo pre-preenchido. Resultado instantaneo. |

### 3.2 Analise detalhada → Portfolio

Quando o utilizador analisa uma acao, pode:
- "Adicionar ao portfolio" (com quantidade e preco)
- "Simular impacto" — ver como adicionar este ativo muda a projecao FIRE
- "Ver na carteira" — se ja tem

```
┌──────────────────────────────────────────┐
│  AAPL — Apple Inc.                       │
│  FinHub Score: 72/100                    │
│  Preco: $192.50                          │
│                                          │
│  [+ Adicionar ao portfolio]              │
│  [🔄 Simular impacto no FIRE]            │
│  [📊 Ja tens 50 acoes — ver posicao]     │
└──────────────────────────────────────────┘
```

Ao clicar "Simular impacto":
```
Se adicionares €200/mes em AAPL:
  · FIRE atual: 12 anos 3 meses
  · FIRE com AAPL: 11 anos 8 meses (-7 meses)
  · Risco: concentracao tech sobe para 38% (⚠️ >30%)
  · Dividend yield da carteira desce 0.2pp (AAPL yield baixo)
```

### 3.3 Supervisao continua → alertas

O dashboard nao e so numeros estaticos. E um **sistema de supervisao** que alerta o utilizador:

```
┌──────────────────────────────────────────────────────┐
│  Dashboard Financeiro                 Atualizado hoje │
│                                                      │
│  FIRE Progress: ████████░░░░░░ 34%                   │
│  €204.000 / €600.000                                 │
│                                                      │
│  ⚡ Proximo milestone: €250K (projetado: Jul 2027)    │
│  📊 Retorno YTD: +8.2% (vs S&P 500: +6.1%)          │
│  💰 Dividendos este mes: €142 (+18% vs ano passado)  │
│                                                      │
│  ⚠️ Alertas:                                         │
│  · O cortou dividendo 5% — impacto: -€4/mes         │
│  · AAPL subiu 15% — peso na carteira agora 22%      │
│  · Contribuicao de Fev nao registada — esqueceste?   │
│  · Inflacao PT subiu para 3.1% — ajustar target?     │
│                                                      │
│  💡 Sugestoes:                                       │
│  · Rebalancear: tech passou de 30% para 38%          │
│  · VWCE esta 8% abaixo do preco medio — bom DCA     │
│  · Coast FIRE em 4 anos se mantiveres este ritmo     │
└──────────────────────────────────────────────────────┘
```

### 3.4 Ciclo de feedback

```
Portfolio atualizado
  → FIRE recalcula automaticamente
  → Alertas de diversificacao atualizam
  → Projecao de dividendos recalcula
  → Milestone tracker atualiza
  → Dashboard reflete tudo

Ativo analisado
  → "Adicionar ao portfolio?" com impacto simulado
  → Score do ativo contribui para score medio da carteira
  → Alertas de risco integrados no portfolio

Dividendo pago
  → Portfolio atualiza yield real
  → FIRE passive income progress atualiza
  → Se DRIP: novas shares calculadas
  → Imposto estimado atualiza
```

---

## 4. Simplicidade sobre complexidade

### 4.1 Principio: 3 niveis de profundidade

Cada ecra tem tres niveis. O utilizador so vai mais fundo se quiser:

```
Nivel 1 — RESUMO (o que toda a gente ve)
  "Faltam 9 anos para FIRE. Estas a 34%."
  1 numero, 1 barra de progresso.

Nivel 2 — DETALHE (quem quer perceber)
  Tabela com cenarios, dividendos projetados, composicao.
  Claro, organizado, sem jargao.

Nivel 3 — PROFUNDO (quem quer controlar tudo)
  Custom overrides por ativo, Monte Carlo, tax simulation.
  Para power users. Escondido por defeito.
```

### 4.2 Linguagem simples

| Jargao tecnico | O que o FinHub mostra |
|---------------|----------------------|
| "Withdrawal Rate 4%" | "A regra e ter 25× as tuas despesas anuais" |
| "CAGR 8.5%" | "Cresceu em media 8.5% ao ano" |
| "Payout ratio 78%" | "Paga 78% dos lucros em dividendos" |
| "Altman Z-Score 2.1" | "Risco financeiro: moderado" |
| "P/FFO 14.5x" | "Pagas €14.50 por cada €1 de cash flow" |
| "Asset allocation drift" | "A tua carteira desviou-se do plano — rebalancear?" |

### 4.3 Ajudas contextuais

Cada metrica tem um `(?)` que abre tooltip com:
- O que e (1 frase)
- Porque importa (1 frase)
- O que o teu numero significa (bom/mau/neutro)

Exemplo:
```
Dividend Yield: 4.2% (?)
┌──────────────────────────────────────────┐
│ O que e: % do preco que recebes por ano  │
│ em dividendos.                           │
│                                          │
│ Porque importa: e o teu rendimento       │
│ passivo — quanto mais alto, mais recebes │
│ sem vender.                              │
│                                          │
│ O teu: 4.2% esta acima da media do       │
│ mercado (1.5%). ✅ Bom para income.       │
└──────────────────────────────────────────┘
```

---

## 5. Implementacao em fases

### V1 — Ferramentas standalone (documentado em P5_FIRE e P5_FERRAMENTAS)

Tudo funciona separado. O utilizador usa o que quer, quando quer.

| Entregavel | Documento |
|-----------|-----------|
| FIRE simulator com portfolio | P5_FIRE_PORTFOLIO_SIMULATOR.md |
| Calculadora juros compostos | P5_FERRAMENTAS_AUDIT_E_NOVAS.md |
| Dividendos calculator | P5_FERRAMENTAS_AUDIT_E_NOVAS.md |
| Impostos PT | P5_FERRAMENTAS_AUDIT_E_NOVAS.md |
| Fixes nas ferramentas existentes | P5_FERRAMENTAS_AUDIT_E_NOVAS.md |

### V2 — Hub financeiro pessoal (esta visao)

As ferramentas ligam-se atraves do perfil financeiro.

| # | Componente | O que faz | Depende de |
|---|-----------|----------|-----------|
| 1 | **Perfil financeiro** | Rendimento, despesas, objetivo FIRE | Nada (e o ponto de entrada) |
| 2 | **Portfolio integrado** | Holdings com link bidireccional a analise | Perfil + V1 portfolio |
| 3 | **Dashboard de supervisao** | KPIs, progresso, alertas, sugestoes | Perfil + Portfolio |
| 4 | **Contexto em ferramentas** | Pre-preencher dados, mostrar impacto pessoal | Perfil + Portfolio |
| 5 | **Alertas inteligentes** | Dividendo cortado, drift, milestone, contribuicao em falta | Portfolio + FIRE + market data |
| 6 | **Impacto simulado** | "E se adicionar este ativo?" a partir da analise | Portfolio + FIRE simulator |

### O que muda de V1 para V2

| Aspeto | V1 | V2 |
|--------|-----|-----|
| Portfolio | Model + CRUD isolado | Ligado ao perfil financeiro e a todas as ferramentas |
| FIRE | Simulacao one-shot | Projecao continua que recalcula a cada mudanca |
| Analise de acoes | Resultado standalone | "Adicionar ao portfolio" + "Simular impacto FIRE" |
| Dividendos | Calculadora com inputs manuais | Pre-preenchida com dados reais da carteira |
| Impostos | Calculadora com inputs manuais | Pre-preenchida com posicoes reais |
| Dashboard | Nao existe | Centro de supervisao com alertas e progresso |

### V2 — Backend adicional

```typescript
// Model novo: FinancialProfile
interface IFinancialProfile {
  user: ObjectId
  monthlyIncome: number
  monthlyExpenses: number
  monthlyInvestment: number
  fireTarget: { method, value, withdrawalRate, targetAmount }
  riskProfile: string
  country: string
  currency: string
  age?: number
  onboardingCompleted: boolean
  updatedAt: Date
}

// Endpoints novos
POST   /api/financial-profile        — criar/atualizar perfil
GET    /api/financial-profile        — obter perfil
GET    /api/financial-profile/dashboard  — dashboard completo (KPIs + alertas + progresso)
GET    /api/financial-profile/alerts     — alertas ativos
POST   /api/portfolio/:id/simulate-add  — simular impacto de adicionar um ativo
```

### V2 — Frontend: pagina unica de supervisao

```
/financas                        — dashboard principal
/financas/perfil                 — editar perfil financeiro
/financas/portfolio              — gerir portfolio (ja existe na V1)
/financas/fire                   — simulador FIRE (ja existe na V1)
/financas/dividendos             — projecao de dividendos (contextualizada)
/financas/impostos               — simulacao fiscal (contextualizada)
/financas/rebalancear            — sugestoes de rebalanceamento
```

---

## 6. O que torna isto unico

### 6.1 Vs competidores

| Feature | FinHub V2 | Portfolio Visualizer | Morningstar | FIRE calculators online |
|---------|----------|---------------------|-------------|----------------------|
| Portfolio tracking | ✅ | ✅ | ✅ | ❌ |
| FIRE projecao | ✅ | ❌ | ❌ | ✅ (generico) |
| Analise fundamental por ativo | ✅ (60+ indicadores) | ❌ | ✅ (pago) | ❌ |
| Dados reais (dividendos, CAGR) | ✅ | ✅ | ✅ (pago) | ❌ |
| Detalhe por ativo na projecao | ✅ | ❌ | ❌ | ❌ |
| "Simular impacto" de novo ativo | ✅ | ❌ | ❌ | ❌ |
| Alertas integrados (corte dividendo, drift) | ✅ | ❌ | ❌ | ❌ |
| Impostos por pais | ✅ (PT) | ❌ | ❌ | ❌ |
| Supervisao continua | ✅ | ❌ | Parcial (pago) | ❌ |
| Contexto entre ferramentas | ✅ | ❌ | ❌ | ❌ |
| Gratuito | ✅ | ✅ | ❌ | ✅ |
| Em portugues | ✅ | ❌ | ❌ | ❌ |

**Ninguem faz tudo isto junto, gratis, em portugues, com dados reais.**

### 6.2 O pitch

> "O FinHub nao te diz so quanto precisas para FIRE.
> Mostra-te exactamente onde estas, quanto falta,
> e o que fazer a seguir — com a tua carteira real,
> os teus numeros reais, actualizado todos os dias."

---

## 7. Riscos e consideracoes

| Risco | Mitigacao |
|-------|----------|
| Utilizador partilha dados financeiros sensiveis | Encriptar em repouso, HTTPS obrigatorio, nao partilhar com terceiros, compliance RGPD |
| Projecoes interpretadas como aconselhamento financeiro | Disclaimer em todas as paginas: "Simulacao educativa. Nao constitui aconselhamento." |
| Dados FMP incorretos levam a decisoes erradas | Data quality badges (ja previsto), nunca mostrar scores sem indicar confianca |
| Complexidade escondida causa erros | 3 niveis de profundidade — nivel 1 seguro para todos |
| Utilizador desiste no onboarding | Tudo opcional — pode usar ferramentas standalone sem perfil |
| Custo de API com muitos utilizadores | Cache agressivo (Redis), batch calls, rate limiting |

---

## 8. Ordem de implementacao

```
V1 (standalone):
  1. Fixes criticos (crypto marketcap, ETF disclaimer, watchlist batch)
  2. Calculadora juros compostos (frontend only, rapido, SEO)
  3. Portfolio CRUD + FIRE simulator basico
  4. Dividendos calculator
  5. Impostos PT calculator

V2 (integrado):
  6. Perfil financeiro (model + onboarding wizard)
  7. Dashboard de supervisao
  8. Contexto entre ferramentas ("adicionar ao portfolio", pre-preencher)
  9. Alertas inteligentes (dividendo cortado, drift, milestone)
  10. "Simular impacto" a partir da analise de acoes
```

V1 pode e deve ser lancado antes de V2. Cada ferramenta standalone tem valor proprio. V2 e o que transforma o FinHub de "um conjunto de calculadoras" num **hub financeiro pessoal**.
