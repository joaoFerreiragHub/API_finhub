# P5 — FIRE Portfolio Simulator: Especificacao Tecnica

Data base: 2026-03-07
Atualizacao execucao: 2026-03-15
Estado: em_curso

## Atualizacao de execucao (backend + frontend MVP)

Entregue neste ciclo:

1. novos modelos `Portfolio` e `PortfolioHolding`;
2. nova API autenticada `/api/portfolio` com CRUD de portfolio e holdings;
3. endpoint de simulacao inicial `POST /api/portfolio/:id/simulate` com cenarios `optimistic|base|conservative|bear`.
4. frontend FIRE em `FinHub-Vite` ligado aos endpoints acima:
   - novas rotas `/ferramentas/fire`, `/ferramentas/fire/portfolio`, `/ferramentas/fire/simulador`, `/ferramentas/fire/dashboard`;
   - pagina de portfolio com CRUD de portfolio e holdings;
   - pagina de simulador com execucao de cenarios e leitura de timeline/sugestoes;
   - dashboard FIRE com KPIs de progresso e alocacao por tipo de ativo.
5. calibracao historica inicial no backend de simulacao:
   - `simulate` passa a aceitar `useHistoricalCalibration` e `historicalLookbackMonths`;
   - retorno/yield/volatilidade por ativo sao calibrados via historico FMP (`historical-price-eod/full` + `dividends`) com fallback seguro;
   - metadados de calibracao passam a ser devolvidos em `assumptions.historicalCalibration` para rastreabilidade.

6. camada what-if no backend de simulacao:
   - `simulate` passa a aceitar `whatIf` com `contributionDelta`, `annualReturnShock`, `inflationShock` e `scenario`;
   - resposta devolve `whatIf.baseline`, `whatIf.adjusted` e `whatIf.delta` para comparar impacto vs baseline.
7. simulacao Monte Carlo v1 no backend:
   - `simulate` passa a aceitar `monteCarlo` com `enabled`, `scenario` e `simulations`;
   - resposta devolve `monteCarlo.successProbabilityPct`, percentis (meses/anos/valor final) e curva anual de probabilidade por horizonte.

Fora deste ciclo (proximas iteracoes):

1. expandir frontend FIRE com graficos ricos, import/export e fluxo what-if dedicado;
2. otimizar Monte Carlo para execucao async/cache e permitir stress tests multi-choque no frontend.


## Visao

Uma ferramenta onde o utilizador:

1. Adiciona os ativos que ja tem em carteira (acoes, ETFs, REITs, cripto)
2. Define o seu objetivo FIRE (montante necessario, rendimento passivo desejado, ou despesas mensais)
3. Configura contribuicoes mensais futuras (quanto vai investir, em que ativos, a que preco estimado)
4. Ve projecoes detalhadas: quanto tempo falta para atingir FIRE — em meses, anos, e dinheiro total investido
5. Simula cenarios: otimista, base, conservador — com detalhe por ativo

A ferramenta usa dados reais da FMP API (dividendos historicos, crescimento, metricas) que ja temos integrados para fundamentar as projecoes.

---

## 1. Conceitos FIRE

### 1.1 O que e FIRE

Financial Independence, Retire Early. O conceito base:

```
Portfolio necessario = Despesas anuais / Taxa de levantamento segura
```

Exemplo: 24.000€/ano de despesas ÷ 4% SWR = 600.000€ de portfolio.

### 1.2 Variacoes de FIRE

| Tipo | Descricao | Multiplicador tipico |
|------|-----------|---------------------|
| **Lean FIRE** | Minimalista, despesas baixas | Despesas × 25 |
| **Regular FIRE** | Estilo de vida confortavel | Despesas × 25 |
| **Fat FIRE** | Estilo de vida premium | Despesas × 30-33 |
| **Barista FIRE** | Semi-reforma, trabalho parcial | Despesas × 20 (com rendimento parcial) |
| **Coast FIRE** | Para de investir, portfolio cresce sozinho ate reforma | Depende da idade |

### 1.3 Regra dos 4% (Trinity Study)

Taxa de levantamento segura historicamente sustentavel durante 30 anos. A plataforma deve permitir ajustar esta taxa (3%, 3.5%, 4%, 4.5%).

### 1.4 Abordagem por rendimento passivo (dividendos)

Alternativa ao SWR: viver dos dividendos sem tocar no capital.

```
Portfolio necessario = Rendimento passivo desejado / Dividend yield medio da carteira
```

Exemplo: 2.000€/mes (24.000€/ano) ÷ 4% yield = 600.000€.

---

## 2. Dados ja disponiveis na plataforma

### 2.1 O que ja temos da FMP API

| Dado | Endpoint | Uso no simulador |
|------|----------|-----------------|
| Preco atual | `/quote` | Valor atual do portfolio |
| Dividend yield | `/ratios-ttm` | Rendimento passivo projetado |
| Historico de dividendos | `/dividends` | CAGR de dividendos, consistencia |
| CAGR de EPS | Calculado em `resultBuilder.ts` | Projecao de crescimento |
| Revenue growth | `/financial-growth` | Confianca no crescimento |
| Piotroski score | `/financial-scores` | Qualidade do ativo |
| Altman Z-score | `/financial-scores` | Risco de falencia |
| ROE, ROIC | `/ratios-ttm` | Eficiencia da empresa |
| Debt/Equity | `/ratios-ttm` | Risco financeiro |
| Sector/Industry | `/profile` | Diversificacao |
| Payout ratio | Calculado | Sustentabilidade do dividendo |
| REIT FFO, NAV, DDM | `reit.controller.ts` | Valuation REITs |
| Cripto precos | Binance API | Valor cripto em carteira |

### 2.2 O que precisamos de adicionar

| Dado | Fonte | Uso |
|------|-------|-----|
| **Precos historicos** | FMP `/historical-price-full` ou Yahoo Finance | Retornos historicos, volatilidade, backtesting |
| **Inflacao historica** | Eurostat API ou hardcoded por pais | Retornos reais vs nominais |
| **Taxa de juro sem risco** | ECB/FED data ou hardcoded | CAPM, custo de oportunidade |
| **ETF total return** | FMP ou Yahoo | Retorno com reinvestimento |

**Nota:** Precos historicos no FMP Starter podem estar limitados. Alternativa: Yahoo Finance (gratuito, sem limites) para price history.

---

## 3. Arquitectura da ferramenta

### 3.1 Models (Backend)

#### Portfolio

```typescript
// src/models/Portfolio.ts
interface IPortfolio {
  user: ObjectId           // dono do portfolio
  name: string             // "Carteira Principal", "Reforma", etc.
  currency: 'EUR' | 'USD' | 'GBP'  // moeda base

  // Objetivo FIRE
  fireTarget: {
    method: 'expenses' | 'passive_income' | 'target_amount'
    monthlyExpenses?: number        // se method = 'expenses'
    desiredMonthlyIncome?: number   // se method = 'passive_income'
    targetAmount?: number           // se method = 'target_amount'
    withdrawalRate: number          // default 4% (SWR)
    inflationRate: number           // default 2%
  }

  // Contribuicoes futuras
  monthlyContribution: number      // quanto investe por mes
  contributionGrowthRate: number   // aumento anual das contribuicoes (ex: 3%)

  // Metadata
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### PortfolioHolding

```typescript
// src/models/PortfolioHolding.ts
interface IPortfolioHolding {
  portfolio: ObjectId

  // Identificacao do ativo
  ticker: string              // ex: "AAPL", "VWCE.DE", "BTC"
  assetType: 'stock' | 'etf' | 'reit' | 'crypto' | 'bond' | 'cash'
  name: string                // nome do ativo (auto-populated da FMP)

  // Posicao atual
  shares: number              // quantidade de unidades
  averageCost: number         // preco medio de compra
  totalInvested: number       // shares × averageCost

  // Contribuicao futura (para simulacao)
  monthlyAllocation: number   // quanto do investimento mensal vai para este ativo (€)
  // OU
  allocationPercent: number   // % do investimento mensal (alternativa)

  // Dados de mercado (cache, atualizado periodicamente)
  currentPrice?: number
  dividendYield?: number
  dividendCAGR?: number       // crescimento historico do dividendo
  totalReturnCAGR?: number    // retorno total historico (price + dividends)
  sector?: string

  // Metadata
  addedAt: Date
  notes?: string
}
```

#### PortfolioTransaction (opcional para fase 1, util para tracking detalhado)

```typescript
// src/models/PortfolioTransaction.ts
interface IPortfolioTransaction {
  portfolio: ObjectId
  holding: ObjectId

  type: 'buy' | 'sell' | 'dividend' | 'split'
  date: Date
  shares: number
  pricePerShare: number
  totalAmount: number
  fees?: number
  notes?: string
}
```

### 3.2 Abordagem simplificada (fase 1)

Para a fase 1, **nao precisamos de transacoes individuais**. O utilizador insere:

1. Ticker + quantidade + preco medio → posicao atual
2. Quanto vai investir por mes neste ativo → contribuicao futura

O simulador calcula tudo a partir destes dois inputs.

Transacoes detalhadas (buy/sell history) ficam para fase 2.

---

## 4. Motor de simulacao

### 4.1 Inputs do utilizador

```
Portfolio atual:
  - AAPL: 50 acoes × $180 medio = $9.000
  - VWCE: 100 unidades × €95 medio = €9.500
  - O (Realty Income): 200 acoes × $55 medio = $11.000
  - BTC: 0.5 BTC × €40.000 medio = €20.000

Contribuicao mensal: €1.500
  - VWCE: €800 (53%)
  - O: €400 (27%)
  - AAPL: €200 (13%)
  - BTC: €100 (7%)

Objetivo FIRE:
  - Despesas mensais: €2.000
  - Taxa de levantamento: 4%
  - Inflacao estimada: 2%
  → Portfolio necessario: €600.000
  → Ajustado a inflacao: cresce 2%/ano
```

### 4.2 Logica de projecao (mes a mes)

```
Para cada mes M, para cada ativo:

  1. Calcular preco estimado:
     precoM = precoAnterior × (1 + retornoMensalEstimado)

     Onde retornoMensalEstimado vem de:
     - Opcao A (simples): CAGR historico do ativo ÷ 12
     - Opcao B (user override): taxa customizada pelo utilizador
     - Opcao C (cenarios): otimista / base / conservador

  2. Adicionar contribuicao mensal:
     novasShares = alocacaoMensal / precoM
     sharesTotal += novasShares
     totalInvestido += alocacaoMensal

  3. Calcular dividendos (se aplicavel):
     dividendoAnual = dividendPerShare × (1 + dividendCAGR)^(anos)
     dividendoMensal = dividendoAnual / frequencia

     Se DRIP (reinvestimento):
       novasSharesDividendo = dividendoMensal × sharesTotal / precoM
       sharesTotal += novasSharesDividendo
     Senao:
       rendimentoPassivoMensal += dividendoMensal × sharesTotal

  4. Valor do portfolio neste mes:
     valorAtivo = sharesTotal × precoM
     valorPortfolio = soma(todosAtivos)

  5. Verificar FIRE:
     Se method = 'expenses':
       targetAjustado = despesasMensais × 12 × (1/withdrawalRate) × (1+inflacao)^anos
       Se valorPortfolio >= targetAjustado → FIRE atingido!

     Se method = 'passive_income':
       rendimentoTotal = soma(dividendosMensais)
       Se rendimentoTotal >= desiredMonthlyIncome × (1+inflacao)^anos → FIRE!

Repetir ate FIRE atingido OU horizonte maximo (ex: 40 anos)
```

### 4.3 Cenarios

| Cenario | Retorno acoes | Retorno ETFs | Dividendo growth | Inflacao |
|---------|--------------|-------------|-----------------|---------|
| **Otimista** | CAGR historico | CAGR historico | CAGR historico | 1.5% |
| **Base** | CAGR × 0.8 | CAGR × 0.8 | CAGR × 0.7 | 2.0% |
| **Conservador** | CAGR × 0.6 | CAGR × 0.6 | CAGR × 0.5 | 3.0% |
| **Bear market** | CAGR × 0.3 | CAGR × 0.3 | CAGR × 0.3 | 3.5% |

O utilizador pode tambem definir taxas customizadas por ativo.

### 4.4 Monte Carlo (v1 backend entregue)

Em vez de projecoes lineares, simular 1000+ cenarios aleatorios baseados na volatilidade historica de cada ativo:

```
Para cada simulacao:
  Para cada mes:
    retorno = retornoMedio + randomNormal() * volatilidade

Resultado: percentil 10%, 25%, 50%, 75%, 90%
-> "Ha 75% de probabilidade de atingires FIRE em 12 anos"
```

Estado atual:

1. backend ja calcula Monte Carlo com base em volatilidade por ativo (historica quando disponivel via calibracao; fallback por tipo de ativo);
2. endpoint devolve probabilidade de atingir FIRE no horizonte e percentis p10/p25/p50/p75/p90;
3. output inclui timeline anual de probabilidade acumulada para facilitar visualizacao no frontend.

Pendencias:

1. execucao async/cache para portfolios muito grandes e corridas > 1000;
2. camada de UX dedicada no frontend para sliders/choques com comparacao visual.

---

## 5. Endpoints (Backend)

### 5.1 Portfolio CRUD

```
POST   /api/portfolio                    — criar portfolio
GET    /api/portfolio                    — listar portfolios do user
GET    /api/portfolio/:id                — detalhe com holdings
PATCH  /api/portfolio/:id                — atualizar config (FIRE target, contribuicoes)
DELETE /api/portfolio/:id                — eliminar portfolio
```

### 5.2 Holdings

```
POST   /api/portfolio/:id/holdings       — adicionar ativo
PATCH  /api/portfolio/:id/holdings/:hid  — atualizar posicao
DELETE /api/portfolio/:id/holdings/:hid  — remover ativo
POST   /api/portfolio/:id/holdings/bulk  — adicionar varios (import)
```

### 5.3 Simulacao

```
POST   /api/portfolio/:id/simulate       — correr simulacao FIRE
```

**Request:**
```json
{
  "scenarios": ["optimistic", "base", "conservative"],
  "maxYears": 40,
  "drip": true,
  "includeInflation": true,
  "useHistoricalCalibration": true,
  "historicalLookbackMonths": 36,
  "customOverrides": {
    "AAPL": { "annualReturn": 0.10, "dividendYield": 0.02 },
    "BTC": { "annualReturn": 0.15 }
  },
  "whatIf": {
    "enabled": true,
    "scenario": "base",
    "contributionDelta": 200,
    "annualReturnShock": 0.01,
    "inflationShock": 0.005
  },
  "monteCarlo": {
    "enabled": true,
    "scenario": "base",
    "simulations": 1000
  }
}
```

**Response (estrutura atual):**
```json
{
  "portfolioId": "...",
  "portfolioName": "Carteira Principal",
  "currency": "EUR",
  "assumptions": {
    "monthlyContribution": 1500,
    "historicalCalibration": { "source": "fmp_stable", "calibratedHoldings": 3 },
    "whatIf": { "scenario": "base", "contributionDelta": 200, "annualReturnShock": 0.01, "inflationShock": 0.005 },
    "monteCarlo": { "scenario": "base", "simulations": 1000 }
  },
  "fireTarget": { "method": "expenses", "monthlyExpenses": 2000, "withdrawalRate": 0.04, "inflationRate": 0.02 },
  "scenarios": [
    { "scenario": "optimistic", "monthsToFire": 95, "timeline": [/* ... */] },
    { "scenario": "base", "monthsToFire": 122, "timeline": [/* ... */] },
    { "scenario": "conservative", "monthsToFire": null, "timeline": [/* ... */] }
  ],
  "whatIf": {
    "enabled": true,
    "baseline": { "scenario": "base", "monthsToFire": 122 },
    "adjusted": { "scenario": "base", "monthsToFire": 108 },
    "delta": { "monthsToFire": -14, "finalPortfolioValue": 82450.32 }
  },
  "monteCarlo": {
    "enabled": true,
    "simulations": 1000,
    "successProbabilityPct": 68.4,
    "monthsToFirePercentiles": { "p10": 96, "p25": 108, "p50": 126, "p75": 149, "p90": 180 },
    "timelineSuccessProbability": [
      { "years": 5, "probabilityPct": 12.3 },
      { "years": 10, "probabilityPct": 54.8 },
      { "years": 15, "probabilityPct": 68.4 }
    ]
  },
  "suggestions": [
    { "type": "fire_accelerator", "message": "Aumentar contribuicao em 200/mes pode reduzir meses ao objetivo." }
  ],
  "generatedAt": "2026-03-15T10:00:00.000Z"
}
```

### 5.4 Market data para holdings

```
GET    /api/portfolio/:id/refresh-prices  — atualizar precos de todos os holdings
GET    /api/portfolio/search-asset?q=...  — pesquisar ativo para adicionar
```

Este endpoint usa os fetchers FMP que ja existem (`fetchProfile`, `fetchQuote`, etc.).

---

## 6. Frontend

### 6.1 Paginas

```
/ferramentas/fire               — landing page da ferramenta FIRE
/ferramentas/fire/portfolio     — gerir portfolio (CRUD holdings)
/ferramentas/fire/simulador     — simulacao e resultados
/ferramentas/fire/dashboard     — dashboard com KPIs e graficos
```

### 6.2 Componentes principais

#### a) Portfolio Builder

```
┌────────────────────────────────────────────────────┐
│  A minha carteira                     [+ Adicionar]│
├────────────────────────────────────────────────────┤
│  Ticker  │ Tipo │ Qtd  │ PM    │ Valor │ Alocacao │
│  AAPL    │ Stock│ 50   │ $180  │ $9.9K │ €200/mes │
│  VWCE    │ ETF  │ 100  │ €95   │ €10.2K│ €800/mes │
│  O       │ REIT │ 200  │ $55   │ $12.4K│ €400/mes │
│  BTC     │ Crypto│ 0.5 │ €40K  │ €22K  │ €100/mes │
├────────────────────────────────────────────────────┤
│  Total: €54.500    Investido: €45.000   +21.1%     │
│  Dividendos/mes: €120   Contribuicao: €1.500/mes   │
└────────────────────────────────────────────────────┘
```

#### b) FIRE Target Setup

```
┌─────────────────────────────────────────────┐
│  Objetivo FIRE                              │
│                                             │
│  Como queres calcular?                      │
│  ○ Por despesas mensais                     │
│  ● Por rendimento passivo desejado          │
│  ○ Por montante total                       │
│                                             │
│  Rendimento passivo desejado: [€2.000/mes]  │
│  Taxa de levantamento: [4.0%] ▼             │
│  Inflacao estimada: [2.0%]                  │
│                                             │
│  → Portfolio necessario: €600.000           │
│  → Ajustado (10 anos): €731.000             │
└─────────────────────────────────────────────┘
```

#### c) Simulador — Resultado principal

```
┌─────────────────────────────────────────────────────┐
│  Projecao FIRE                                      │
│                                                     │
│  ┌──────────────┬──────────┬──────────┬───────────┐ │
│  │              │Otimista  │ Base     │Conservador│ │
│  ├──────────────┼──────────┼──────────┼───────────┤ │
│  │ Tempo        │ 7a 2m    │ 9a 8m   │ 13a 1m    │ │
│  │ Data FIRE    │ Mai 2033 │ Nov 2035│ Abr 2039  │ │
│  │ Investido    │ €174K    │ €222K   │ €282K     │ │
│  │ Valor final  │ €731K    │ €731K   │ €731K     │ │
│  │ Rendimento/m │ €2.437   │ €2.437  │ €2.437    │ │
│  │ Ganho total  │ +320%    │ +229%   │ +159%     │ │
│  └──────────────┴──────────┴──────────┴───────────┘ │
│                                                     │
│  [Grafico de area: evolucao do portfolio ao longo   │
│   do tempo com as 3 linhas de cenario, marcando     │
│   onde cada uma cruza o target FIRE]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### d) Detalhe por ativo

```
┌─────────────────────────────────────────────────┐
│  Contribuicao de cada ativo (cenario base)      │
│                                                 │
│  VWCE ██████████████████████████████ 42%        │
│  O    █████████████████████ 28%                 │
│  AAPL ██████████████ 18%                        │
│  BTC  ████████ 12%                              │
│                                                 │
│  Detalhe VWCE ao atingir FIRE:                  │
│  · Shares: 842 (hoje: 100, compras: 742)        │
│  · Valor: €306.000                              │
│  · Investido: €86.400 (€800 × 108 meses)       │
│  · Retorno: +254%                               │
│  · Dividendos acumulados reinvestidos: €12.300  │
└─────────────────────────────────────────────────┘
```

#### e) Insights e alertas

```
┌─────────────────────────────────────────────────┐
│  Insights da simulacao                          │
│                                                 │
│  ⚡ Aumentar €200/mes reduz 14 meses ao FIRE    │
│  ⚠️  BTC = 40% da carteira — risco concentrado  │
│  📊 Yield medio da carteira: 2.9% (target: 4%)  │
│  💡 Adicionar REITs de alto yield pode acelerar  │
│  📈 O teu dividend CAGR medio e 6.2%/ano        │
│  🎯 Coast FIRE: podes parar de investir em 2031 │
│     e atingir FIRE em 2040 so com crescimento   │
└─────────────────────────────────────────────────┘
```

### 6.3 Graficos

| Grafico | Tipo | Dados |
|---------|------|-------|
| **Evolucao do portfolio** | Area chart | Valor total mes a mes, com linhas por cenario |
| **Composicao atual** | Donut chart | % por ativo, por tipo, por sector |
| **Dividendos projetados** | Bar chart | Rendimento passivo mes a mes (crescente) |
| **Contribuicao vs crescimento** | Stacked area | Quanto e dinheiro investido vs ganhos |
| **Tempo para FIRE** | Gauge/progress | Barra de progresso visual (54.500 / 600.000) |
| **Comparacao what-if** | Line chart | "Se investisses mais €200/mes" vs baseline |

**Biblioteca sugerida:** Recharts (ja usado em projetos React, leve, responsivo).

---

## 7. Funcionalidades extra que acrescentam valor

### 7.1 What-if scenarios

O utilizador pode simular:

| Cenario | Parametro | Resultado |
|---------|-----------|----------|
| "E se investir mais?" | +€200/mes | -14 meses para FIRE |
| "E se parar de investir?" | €0/mes a partir de hoje | Coast FIRE em X anos |
| "E se houver um crash de 40%?" | Portfolio -40% agora | +3 anos para FIRE |
| "E se mudar alocacao?" | Mais REITs, menos cripto | Yield sobe, volatilidade desce |
| "E se a inflacao subir?" | 4% em vez de 2% | +5 anos para FIRE |
| "E se me reformar mais cedo?" | Despesas +500€/mes | +2 anos para FIRE |

### 7.2 Milestone tracker

```
FIRE Journey — €54.500 / €600.000 (9.1%)

[✓] €10K investidos          — Jan 2024
[✓] €25K de portfolio        — Set 2024
[✓] €50K de portfolio        — Fev 2026
[ ] €100K de portfolio       — projetado: Mar 2028
[ ] Primeiro €100/mes em dividendos — projetado: Jun 2027
[ ] Coast FIRE               — projetado: Nov 2031
[ ] €500K de portfolio       — projetado: Ago 2034
[ ] FIRE!                    — projetado: Nov 2035
```

### 7.3 Diversificacao e risco

Alertas automaticos com base na composicao:

| Regra | Threshold | Alerta |
|-------|-----------|--------|
| Concentracao num ativo | > 30% | "AAPL representa 35% — considerar diversificar" |
| Concentracao num sector | > 40% | "Tech e 45% da carteira" |
| Concentracao num tipo | > 50% | "Acoes sao 60% — considerar ETFs ou REITs" |
| Sem renda fixa | 0% bonds/cash | "Sem protecao contra bear market" |
| Cripto excessivo | > 20% | "Cripto e 25% — alta volatilidade" |
| Dividend coverage | yield < SWR | "Yield medio 2.9% < 4% SWR — dependes de valorizacao" |
| Geographic concentration | > 80% num pais | "85% em US — considerar diversificacao geografica" |

### 7.4 Comparacao com benchmarks

```
A tua carteira vs S&P 500 (ultimos 5 anos):
  Retorno anualizado: 11.2% vs 10.8% ✅
  Volatilidade: 18% vs 15% ⚠️
  Sharpe ratio: 0.62 vs 0.72 ⚠️
  Max drawdown: -28% vs -24% ⚠️
  Dividend yield: 2.9% vs 1.3% ✅
```

### 7.5 FIRE por rendimento passivo (detalhe dividendos)

```
Rendimento passivo mensal projetado:

Hoje:    €120/mes  [████░░░░░░░░░░░░░░░░] 6%
2028:    €380/mes  [████████░░░░░░░░░░░░] 19%
2030:    €720/mes  [████████████████░░░░] 36%
2032:    €1.350/mes [████████████████████] 68%
2035:    €2.000/mes [████████████████████] 100% FIRE!

Por ativo:
  O (Realty Income):  €85/mes → €1.200/mes (60% do total)
  AAPL:               €12/mes → €180/mes (9%)
  VWCE:               €23/mes → €620/mes (31%)
  BTC:                €0 (sem dividendos)
```

### 7.6 Tax impact (fase avancada)

```
Pais: Portugal
  Mais-valias: 28% sobre ganhos realizados
  Dividendos: 28% retidos na fonte (ou 14.5% englobamento)

  Impacto no FIRE:
  - Sem impostos: 9 anos 8 meses
  - Com impostos: 10 anos 11 meses (+15 meses)

  Sugestao: Conta PPR ou seguro capitalização
  para diferimento fiscal ate reforma.
```

### 7.7 Import de portfolio

Facilitar a entrada de dados:

| Fonte | Metodo | Esforco |
|-------|--------|---------|
| **CSV/Excel** | Upload + parse | Baixo |
| **Degiro** | CSV export padrao | Baixo (formato conhecido) |
| **Interactive Brokers** | Flex Query CSV | Medio |
| **Trading 212** | CSV export | Baixo |
| **Manual** | Formulario ativo a ativo | Ja previsto |

### 7.8 Sharing e gamificacao

- **Partilhar resultado** (imagem ou link) — "X anos para FIRE!" (sem revelar valores, so percentagens)
- **Badge FIRE progress** — no perfil do utilizador (10%, 25%, 50%, 75%, Coast FIRE, FIRE)
- **Ligar a gamificacao existente** — XP por adicionar ativos, correr simulacao, atingir milestones

---

## 8. Reutilizacao de codigo existente

| Componente existente | Reutilizacao |
|---------------------|-------------|
| `calculateCAGR()` em helpers.ts | Calcular CAGR de dividendos e retornos |
| `fetchProfile()` em stockFetchers.ts | Dados basicos do ativo ao adicionar |
| `fetchQuote()` / Binance API | Precos atuais para refresh |
| Dividend history da FMP | CAGR de dividendos, consistencia |
| `plausibleOrNull()` | Tratar sentinel zeros da FMP |
| `fmt()`, `fmtPercent()`, `fmtLarge()` | Formatacao de valores |
| REIT DDM model | Valuation de REITs em carteira |
| Watchlist patterns | UI de lista de ativos, search, cards |
| React Query patterns | Cache, loading states, refetch |
| shadcn/ui components | Cards, tables, tabs, dialogs, charts |

---

## 9. Roadmap de implementacao

### Fase 1 — MVP funcional

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 1.1 | **Portfolio model + CRUD** | Model, controller, service, routes | Form de criar portfolio | Medio |
| 1.2 | **Holdings CRUD** | Model + endpoints | Tabela de ativos + form adicionar | Medio |
| 1.3 | **Search asset** | Endpoint que usa FMP fetchProfile | Autocomplete de tickers | Baixo |
| 1.4 | **Refresh prices** | Endpoint que faz batch fetchQuote | Botao de refresh, precos atualizados | Baixo |
| 1.5 | **FIRE target config** | Campos no Portfolio model | Form de configuracao FIRE | Baixo |
| 1.6 | **Motor de simulacao** | Endpoint /simulate com 3 cenarios | Tabela de resultados + grafico evolucao | Alto |
| 1.7 | **Resultado FIRE** | — | Cards com anos/meses/dinheiro por cenario | Medio |
| 1.8 | **Grafico evolucao** | — | Area chart com Recharts | Medio |

**Esforco total fase 1:** ~8-10 dias.

### Fase 2 — Detalhe e polish

| # | Item | Esforco |
|---|------|---------|
| 2.1 | Detalhe por ativo (contribuicao, projecao individual) | Medio |
| 2.2 | Donut de composicao (tipo, sector) | Baixo |
| 2.3 | Insights e alertas automaticos (concentracao, yield gap) | Medio |
| 2.4 | Milestone tracker visual | Baixo |
| 2.5 | What-if UX dedicado no frontend (backend v1 ja entregue) | Medio |
| 2.6 | Dividendos projetados chart (bar chart mensal) | Baixo |
| 2.7 | Import CSV (Degiro, Trading 212) | Medio |
| 2.8 | DRIP toggle e simulacao | Baixo |

**Esforco total fase 2:** ~6-8 dias.

### Fase 3 — Avancado

| # | Item | Esforco |
|---|------|---------|
| 3.1 | Precos historicos (Yahoo Finance integration) | Medio |
| 3.2 | Monte Carlo hardening (async/cache e stress tests, backend v1 ja entregue) | Alto |
| 3.3 | Benchmark comparison (vs S&P 500) | Medio |
| 3.4 | Tax impact por pais (PT, BR, US) | Medio |
| 3.5 | Coast FIRE calculator dedicado | Baixo |
| 3.6 | Sharing / export de resultados | Baixo |
| 3.7 | Portfolio transactions (historico de compras/vendas) | Medio |
| 3.8 | Rebalancing alerts (drift da alocacao target) | Medio |

---

## 10. Stack tecnico

| Componente | Tecnologia | Razao |
|-----------|-----------|-------|
| Backend API | Express + TypeScript (existente) | Consistencia com o resto da plataforma |
| Database | MongoDB (existente) | Portfolio + holdings sao documents naturais |
| Market data | FMP API (existente) + Yahoo Finance (novo, para historicos) | FMP para fundamentais, Yahoo para precos |
| Frontend | React + Vite + Tailwind + shadcn/ui (existente) | Consistencia |
| Charts | Recharts | Leve, React-native, responsive, area/line/bar/pie |
| Calculo | Server-side (Node.js) | Simulacao pesada nao deve correr no browser |
| Cache | Redis (existente) | Cache de precos e resultados de simulacao |

---

## 11. Consideracoes de performance

| Preocupacao | Solucao |
|-------------|---------|
| Simulacao com 480 meses × 10 ativos | Calculo linear O(M×N), <100ms no server |
| Monte Carlo 1000 runs × 480 meses | ~1-2s, correr async, cache resultado |
| Refresh de precos de 20 ativos | Batch FMP calls com rate limiting, cache 5min |
| Portfolio com 50+ holdings | Paginacao na UI, lazy load de metricas |

---

## 12. Diferenciacao competitiva

A maioria dos calculadores FIRE online sao:
- Genericos (um unico retorno % para tudo)
- Sem ativos reais (so numeros abstratos)
- Sem dados fundamentais (sem dividendos reais, sem CAGR real)
- Sem multi-cenario

**O FinHub pode diferenciar-se por:**
- Usar **dados reais** de cada ativo (dividendos historicos, crescimento real, metricas fundamentais)
- **Detalhe por ativo** — nao e um numero unico, e uma projecao por cada holding
- **Integrado com as outras ferramentas** — stock analysis, REIT toolkit, ETF overlap alimentam o simulador
- **Cenarios realistas** — baseados em CAGR historico de cada ativo, nao num generico "8% ao ano"
- **Rendimento passivo real** — projecao de dividendos com growth real, nao estimado
- **Contexto portugues** — impostos PT, corretoras PT no diretorio, conteudo em PT
