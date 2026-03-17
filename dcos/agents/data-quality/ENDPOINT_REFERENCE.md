# 📡 Reference Completo de Endpoints e Dados

**Data:** 17 de Março de 2026  
**Escopo:** Mapeamento detalhado de endpoints FMP e Alpha Vantage  
**Uso:** Desenvolvimento, debugging, otimização de queries

---

## 1️⃣ FINANCIAL MODELING PREP - ENDPOINTS

### Base URL
```
https://financialmodelingprep.com/stable
```

### Autenticação
```
Query Parameter: ?apikey=YOUR_KEY
Header: apikey: YOUR_KEY
```

### 1.1 Company Information

#### GET /profile
```
Descrição: Perfil completo da empresa
Parâmetros:
  - symbol (required): "AAPL"
  
Exemplo:
  GET /stable/profile?symbol=AAPL&apikey=YOUR_KEY

Resposta (array, use [0]):
[{
  "symbol": "AAPL",
  "companyName": "Apple Inc.",
  "industry": "Consumer Electronics",
  "sector": "Technology",
  "ceo": "Tim Cook",
  "website": "https://www.apple.com/",
  "description": "Apple designs, manufactures...",
  "country": "US",
  "city": "Cupertino",
  "state": "California",
  "address": "1 Apple Park Way",
  "zip": "95014",
  "phone": "14089961010",
  "marketCap": 2670000000000,
  "price": 227.97,
  "beta": 1.195,
  "lastDividend": 0.93,
  "image": "https://financialmodelingprep.com/image-stock/AAPL.png",
  "isoDate": "2024-12-15",
  "ipoDate": "1997-11-28",
  "defaultImage": false,
  "isActivelyTrading": true,
  "isEtf": false,
  "employees": 161000,
  "fullTimeEmployees": 161000
}]

Taxa de requisição: Conta como 1 request
Cache recomendado: 7 dias
```

#### GET /quote
```
Descrição: Cotação em tempo real (15-20min delay)
Parâmetros:
  - symbol (required): "AAPL"
  
Resposta (array):
[{
  "symbol": "AAPL",
  "price": 227.97,
  "priceAvg50": 225.60,
  "priceAvg200": 223.27,
  "marketCap": 2670000000000,
  "lastDiv": 0.93,
  "volume": 54432100,
  "avgVolume": 48392200,
  "open": 226.31,
  "previousClose": 227.22,
  "eps": 6.05,
  "pe": 37.68,
  "earningsAnnounceTime": "amc",
  "sharesOutstanding": 15638200000,
  "timestamp": 1702627200
}]

Taxa: 1 request
Cache: 5 minutos (dados mudam frequente)
```

### 1.2 Financial Statements

#### GET /income-statement
```
Descrição: Demonstração de resultados
Parâmetros:
  - symbol (required): "AAPL"
  - period (optional): "annual" | "quarter" (default: annual)
  - limit (optional): 1-120 (default: 120)
  
Exemplo:
  GET /stable/income-statement?symbol=AAPL&limit=3&apikey=YOUR_KEY

Resposta (array, ordenado por data descendente):
[{
  "date": "2024-09-30",
  "symbol": "AAPL",
  "period": "FY",
  "revenue": 383285000000,
  "costOfRevenue": 214437000000,
  "grossProfit": 168848000000,
  "operatingExpenses": 66151000000,
  "operatingIncome": 102697000000,
  "netIncome": 93300000000,
  "eps": 5.93,
  "epsdiluted": 5.93,
  "epsbasic": 6.05,
  "weightedAverageShares": 15728900000,
  "weightedAverageSharesDiluted": 15737100000,
  "dividendPerShare": 0.93,
  "reportedCurrency": "USD",
  "taxProvision": 10603000000,
  "interestExpense": 2931000000,
  "otherIncome": -445000000
}, ...]

Campos críticos para análise:
  - revenue: Receita total
  - netIncome: Lucro líquido
  - eps/epsdiluted/epsbasic: Lucro por ação (IMPORTANTE: normalizar)
  - grossProfit: Lucro bruto
  - operatingIncome: Lucro operacional

Taxa: 1 request
Cache: 24 horas (dados auditados, mudam 1x/ano)
Histórico: Até 120 períodos (30 anos de annual)
```

#### GET /balance-sheet-statement
```
Descrição: Balanço/Demonstração Financeira
Parâmetros:
  - symbol, period, limit (idem income-statement)

Campos principais:
  - assets: Total ativos
  - liabilities: Total passivos
  - stockholdersEquity: Patrimônio
  - commonStock: Capital social
  - retainedEarnings: Lucros retidos
  - currentAssets: Ativos circulantes
  - currentLiabilities: Passivos circulantes
  - cash: Caixa
  - inventory: Inventário
  - accountsPayable: Contas a pagar

Taxa: 1 request
Cache: 24 horas
```

#### GET /cash-flow-statement
```
Descrição: Fluxo de caixa
Parâmetros: symbol, period, limit

Campos principais:
  - operatingCashflow: Fluxo operacional
  - freeCashflow: Fluxo livre
  - capitalExpenditure: Capex
  - dividendsPaid: Dividendos pagos
  - debtPayment: Pagamento de dívida
  - issuanceOfDebt: Emissão de dívida

Taxa: 1 request
Cache: 24 horas
```

### 1.3 Key Metrics

#### GET /key-metrics-ttm
```
Descrição: Métricas chave (Trailing Twelve Months)
Parâmetros: symbol (required)

Resposta:
[{
  "symbol": "AAPL",
  "peRatio": 37.68,
  "priceToBookRatio": 45.20,
  "priceToSalesRatio": 6.97,
  "pegRatio": 2.45,
  "priceFairValue": 180.50,
  "priceToFreeCashflowRatio": 31.20,
  "enterpriseValue": 2670000000000,
  "enterpriseValueToRevenue": 6.97,
  "enterpriseValueToEbitda": 18.50,
  "roe": 121.24,
  "roic": 108.47,
  "roa": 32.24,
  "roey": 2.45,
  "bookValue": 5.04,
  "tangibleBookValue": 3.20,
  "cashPerShare": 1.64,
  "netDebtToEbitda": -0.15,
  "freeCashflowToNetIncome": 1.09,
  "interestCoverage": 35.07,
  "debtEquity": 1.78,
  "debtToAssets": 0.64,
  "currentRatio": 1.30,
  "quickRatio": 1.20,
  "workingCapital": -28500000000,
  "operatingCashflowPerShare": 6.45,
  "freeCashflowPerShare": 6.25,
  "cashFlowOperatingActivities": 110543000000
}]

Campos críticos para avaliação:
  - peRatio: P/E (valuation)
  - priceToSalesRatio: P/S
  - pegRatio: PEG (growth-adjusted)
  - roe/roic/roa: Rentabilidade
  - debtEquity: Alavancagem
  - currentRatio: Liquidez

Taxa: 1 request
Cache: 7 dias
Frequência de atualização: Trimestral
```

#### GET /ratios-ttm
```
Descrição: Rácios financeiros (TTM)
Parâmetros: symbol

Resposta:
[{
  "symbol": "AAPL",
  "dividendYield": 0.409,
  "peRatio": 37.68,
  "payoutRatio": 0.1568,
  "priceToBookRatio": 45.20,
  "priceToSalesRatio": 6.97,
  "priceToFreeCashflowRatio": 31.20,
  "pegRatio": 2.45,
  "enterpriseValueToRevenue": 6.97,
  "enterpriseValueToEbitda": 18.50,
  "roe": 121.24,
  "roic": 108.47,
  "roa": 32.24,
  "profitMargin": 0.24,
  "assetTurnover": 1.34,
  "du": 3.60,
  "debtRatio": 0.64,
  "interestCoverage": 35.07
}]

Taxa: 1 request
Cache: 7 dias
```

#### GET /key-metrics
```
Descrição: Métricas históricas (até 5 anos)
Parâmetros: symbol, limit (default: 40)

Mesmos campos de key-metrics-ttm, mas com histórico
Uso: Análise de tendência de métricas

Taxa: 1 request (todos os períodos)
Cache: 7 dias
```

#### GET /ratios
```
Descrição: Rácios históricos (até 5 anos)
Parâmetros: symbol, limit (default: 40)

Mesmos campos de ratios-ttm, com histórico

Taxa: 1 request
Cache: 7 dias
```

### 1.4 News & Sentiment

#### GET /fmp-articles
```
Descrição: Notícias gerais (feed próprio FMP)
Parâmetros:
  - page (optional): 0, 1, 2, ...
  - size (optional): 1-100 (default: 20)
  - tickers (optional): "AAPL,GOOGL"
  - from (optional): "2024-01-01"
  - to (optional): "2024-12-31"

Resposta:
{
  "content": [{
    "title": "Apple stock surges on iPhone sales",
    "date": "2024-12-15",
    "content": "Full text of article...",
    "tickers": "AAPL,TSLA",
    "image": "https://...",
    "link": "https://...",
    "author": "Author Name",
    "site": "FinancialModelingPrep"
  }, ...],
  "totalPages": 523,
  "totalElements": 10456
}

Taxa: 1 request
Cache: 1 hora
Limit prático: 100 artigos = ~3 páginas
```

#### GET /news/stock-latest
```
Descrição: Notícias de stocks (mais recentes)
Parâmetros:
  - limit (optional): 1-100 (default: 20)
  - tickers (optional): "AAPL,GOOGL"

Resposta:
[{
  "symbol": "AAPL",
  "publishedDate": "2024-12-15 10:30:00",
  "title": "Apple announces new product",
  "image": "https://...",
  "site": "Reuters",
  "text": "Article summary...",
  "url": "https://..."
}, ...]

Taxa: 1 request
Cache: 1 hora
Melhor para: Notícias em tempo quase-real
```

#### GET /earnings-calendar
```
Descrição: Calendário de resultados (earnings)
Parâmetros:
  - symbol (optional): "AAPL"
  - from (optional): "2024-12-01"
  - to (optional): "2024-12-31"
  - limit (optional): 1-100 (default: 20)

Resposta:
[{
  "date": "2024-10-31",
  "symbol": "AAPL",
  "eps": 2.18,
  "epsActual": 2.16,
  "epsEstimate": 2.10,
  "revenue": 89498000000,
  "revenueActual": 89498000000,
  "revenueEstimate": 86200000000
}, ...]

Campos críticos:
  - eps: EPS reportado (⚠️ Campo inconsistente)
  - epsActual: EPS real
  - epsEstimate: EPS estimado

Taxa: 1 request
Cache: 24 horas
Nota: Usa múltiplos campos para EPS - normalizar!
```

### 1.5 Other Useful Endpoints

#### GET /available-sectors
```
Descrição: Lista de setores disponíveis
Parâmetros: Nenhum

Resposta: ["Technology", "Healthcare", "Finance", ...]

Taxa: 1 request
Cache: 30 dias
```

#### GET /available-industries
```
Descrição: Lista de indústrias disponíveis
Parâmetros: Nenhum

Resposta: ["Software", "Semiconductors", ...]

Taxa: 1 request
Cache: 30 dias
```

#### GET /shares-float
```
Descrição: Ações em circulação
Parâmetros: symbol

Resposta:
[{
  "symbol": "AAPL",
  "freeFloat": 15000000000,
  "floatShares": 15638200000,
  "outstandingShares": 15638200000,
  "date": "2024-12-15"
}]

Taxa: 1 request
Cache: 7 dias
```

---

## 2️⃣ ALPHA VANTAGE - ENDPOINTS

### Base URL
```
https://www.alphavantage.co/query
```

### Autenticação
```
Query Parameter: apikey=YOUR_KEY (obrigatório)
```

### 2.1 News & Sentiment

#### GET /query?function=NEWS_SENTIMENT
```
Descrição: Análise de sentimento de notícias
Parâmetros:
  - function: "NEWS_SENTIMENT" (obrigatório)
  - tickers (optional): "AAPL,GOOGL" (max 5)
  - limit (optional): 1-50 (default: 20)
  - sort (optional): "LATEST", "EARLIEST", "RELEVANCE"

Exemplo:
  GET /query?function=NEWS_SENTIMENT&tickers=AAPL&limit=20&apikey=YOUR_KEY

Resposta:
{
  "items": "20",
  "sentiment_score_definition": "...",
  "relevance_score_definition": "...",
  "data": [{
    "time_published": "20241215T120000",
    "title": "Apple beats earnings expectations",
    "url": "https://...",
    "time_utc": "2024-12-15 12:00:00",
    "authors": ["Reporter Name"],
    "summary": "Apple reported earnings...",
    "banner_image": "https://...",
    "source": "Reuters",
    "category": "earnings",
    "topics": [{
      "topic": "Technology",
      "relevance_score": "0.85"
    }],
    "overall_sentiment_score": 0.765,
    "overall_sentiment_label": "POSITIVE",
    "ticker_sentiment": [{
      "ticker": "AAPL",
      "relevance_score": "0.95",
      "ticker_sentiment_score": 0.752,
      "ticker_sentiment_label": "POSITIVE"
    }]
  }]
}

Campos críticos:
  - overall_sentiment_label: POSITIVE | NEUTRAL | NEGATIVE
  - overall_sentiment_score: 0-1 (confiança)
  - ticker_sentiment: Sentimento por ticker

Taxa: Conta como 1 request
Cache: 1 hora (dados setoriais mudam)
Delay mínimo: ⚠️ 12 segundos entre requests (free tier)
Limite: 25 req/dia free, 5 req/min
```

### 2.2 Time Series Data

#### GET /query?function=TIME_SERIES_DAILY
```
Descrição: Série temporal diária
Parâmetros:
  - function: "TIME_SERIES_DAILY"
  - symbol: "AAPL"
  - outputsize (optional): "compact" | "full" (default: compact=100 dias)

Resposta:
{
  "Meta Data": {...},
  "Time Series (Daily)": {
    "2024-12-15": {
      "1. open": "227.31",
      "2. high": "228.50",
      "3. low": "226.80",
      "4. close": "227.97",
      "5. volume": "54432100"
    },
    ...
  }
}

Taxa: 1 request
Cache: 1 dia
Nota: Dados atrasados de 1-2 dias
```

---

## 3️⃣ RESUMO DE TAXA DE REQUISIÇÃO

### Configuração Atual (RateLimitManager)

```
FMP:
  - 250 req/dia (SEM cache = crítico)
  - 10 req/min
  - Delay: 200ms

AlphaVantage:
  - 25 req/dia (SEM cache = crítico)
  - 5 req/min
  - Delay: ⚠️ 12 segundos necessário (não implementado)
```

### Cálculo de Consumo

```
Análise completa de 1 stock (com endpoints atuais):

Profile:           1 req
Quote:             1 req
Key Metrics TTM:   1 req
Ratios TTM:        1 req
Income Statement:  1 req (3 anos em 1)
Balance Sheet:     1 req (3 anos em 1)
Cash Flow:         1 req (3 anos em 1)
Key Metrics Hist:  1 req (5 anos em 1)
Ratios Hist:       1 req (5 anos em 1)
Earnings Calendar: 1 req
News:              1 req
---
TOTAL:             11 req por stock

FMP Limite/Dia:    250 req ÷ 11 = ~22 stocks máximo
Em produção:       22 stocks ÷ 100 users = 0.22 stocks/user/dia = IMPOSSÍVEL

Com cache (1 dia para financiais):
Novo requisição:   2 req (quote + news apenas)
250 req/dia ÷ 2 = 125 análises/dia = 1.25 stocks/user (100 users) = Melhor, mas ainda crítico
```

---

## 4️⃣ EXEMPLO DE QUERY OTIMIZADA

### ❌ Ineficiente (11 requests)
```typescript
async function analyzeStock(symbol: string) {
  const profile = await fetch(`/stable/profile?symbol=${symbol}`)
  const quote = await fetch(`/stable/quote?symbol=${symbol}`)
  const keyMetricsTTM = await fetch(`/stable/key-metrics-ttm?symbol=${symbol}`)
  const ratiosTTM = await fetch(`/stable/ratios-ttm?symbol=${symbol}`)
  const income = await fetch(`/stable/income-statement?symbol=${symbol}&limit=3`)
  const balance = await fetch(`/stable/balance-sheet-statement?symbol=${symbol}&limit=3`)
  const cashflow = await fetch(`/stable/cash-flow-statement?symbol=${symbol}&limit=3`)
  const keyMetrics = await fetch(`/stable/key-metrics?symbol=${symbol}&limit=5`)
  const ratios = await fetch(`/stable/ratios?symbol=${symbol}&limit=5`)
  const earnings = await fetch(`/stable/earnings-calendar?symbol=${symbol}&limit=12`)
  const news = await fetch(`/stable/news/stock-latest?tickers=${symbol}`)
  
  // Process...
}
```

### ✅ Eficiente (Batch + Cache)
```typescript
async function analyzeStock(symbol: string) {
  // 1. Check cache first
  const cached = await cache.get('analysis', symbol)
  if (cached) return cached

  // 2. Fetch apenas essencial
  const [profile, quote, keyMetricsTTM, income, earnings] = await Promise.all([
    fetch(`/stable/profile?symbol=${symbol}`),
    fetch(`/stable/quote?symbol=${symbol}`),
    fetch(`/stable/key-metrics-ttm?symbol=${symbol}`),
    fetch(`/stable/income-statement?symbol=${symbol}&limit=3`),
    fetch(`/stable/earnings-calendar?symbol=${symbol}&limit=5`)
  ])
  // Total: 5 requests (vs 11)

  // 3. Lazy load detalhes
  const details = {
    ratios: () => fetch(`/stable/ratios?symbol=${symbol}&limit=5`),
    cashflow: () => fetch(`/stable/cash-flow-statement?symbol=${symbol}&limit=3`),
    news: () => fetch(`/stable/news/stock-latest?tickers=${symbol}`)
  }

  const result = { profile, quote, keyMetricsTTM, income, earnings, details }

  // 4. Cache result
  await cache.set('analysis', symbol, result, 24 * 60 * 60)

  return result
}
```

**Economia:**
- 11 req → 5 req = 55% redução
- Com cache: 11 req → 0 req = 100% para usuarios repetidos
- Resultado: Suporta 10-20x mais stocks com mesmo rate limit

---

## 5️⃣ MAPPING DE CAMPOS

### EPS (Critical Issue)

| Fonte | Campo 1 | Campo 2 | Campo 3 | Normalizado |
|-------|---------|---------|---------|------------|
| Income Statement | `eps` | `epsdiluted` | `epsbasic` | Usar `epsdiluted` ou `eps` |
| Earnings Calendar | `eps` | `epsActual` | `estimatedEPS` | Usar `epsActual` ou `eps` |
| Key Metrics | `pe` (derivado) | - | - | Derivado: price/eps |

**Recomendação:**
```typescript
function getEPS(data: any): number | null {
  // Prioridade: diluted > basic > generic
  return data.epsdiluted ?? data.epsbasic ?? data.eps ?? null
}
```

### Datas

| Formato | Exemplo | Parser |
|---------|---------|--------|
| ISO Date | "2024-12-15" | `new Date("2024-12-15")` |
| Datetime | "2024-12-15 12:00:00" | `new Date("2024-12-15T12:00:00Z")` |
| Timestamp | "20241215T120000" | `parseAlphaVantageDate()` |

---

## 6️⃣ TROUBLESHOOTING

### "Information" field in response
```json
{
  "Information": "Thank you for using Alpha Vantage!..."
}
```
**Significa:** Rate limit atingido
**Ação:** Esperar 60+ segundos antes de próximo request

### Empty array response
```json
[]
```
**Possíveis causas:**
1. Símbolo não existe
2. Sem dados para período solicitado
3. Rate limit (retorna array vazio vs. erro)

**Debug:**
```typescript
if (data.length === 0) {
  console.log('Check:')
  console.log('1. Symbol valid?', await isValidSymbol(symbol))
  console.log('2. Rate limit?', await checkRateLimit())
  console.log('3. Period has data?', await checkPeriod(symbol))
}
```

### "Time zone" not found
```
Problema: Parâmetro timezone inválido em alguns endpoints
Solução: Usar timezone do usuário ou UTC
```

---

## 7️⃣ PERFORMANCE BENCHMARKS

### Latência Esperada

| Endpoint | Cache Hit | Cache Miss |
|----------|-----------|------------|
| /quote | <10ms | 500-1500ms |
| /profile | <5ms | 800-2000ms |
| /income-statement | <20ms | 1000-2500ms |
| /news/stock-latest | <15ms | 500-1000ms |

### Batch Performance
```
Sequential (11 requests): ~15 segundos
Parallel (Promise.all): ~2 segundos
Com cache: <10ms
```

---

## Próximas Etapas

Usar este reference para:
1. ✅ Validar campos esperados
2. ✅ Otimizar queries
3. ✅ Debug de respostas
4. ✅ Implementar cache adequado
5. ✅ Planejar fallbacks
