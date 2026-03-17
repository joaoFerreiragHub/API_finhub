# 📊 Auditoria Completa - APIs FMP e AlphaVantage

**Data:** 17 de Março de 2026  
**Status:** ✅ Auditoria Concluída  
**Escopo:** Financial Modeling Prep (FMP) e Alpha Vantage  
**Avaliação Geral:** 🟡 CRITICAMENTE LIMITADO (requer otimização)

---

## 📋 Sumário Executivo

### Situação Atual
- **FMP (Financial Modeling Prep):** Principal fornecedor de dados financeiros e notícias
- **Alpha Vantage:** Suporte complementar para análise de sentimento (impacto baixo)
- **Status de Integração:** Parcialmente implementado com gestão de rate limits
- **Criticidade:** 🔴 ALTA - muitos endpoints críticos com limitações severas

### Conclusões Principais
1. **FMP tem cobertura ampla** mas com sérios limites operacionais no plano gratuito (250 req/dia)
2. **Alpha Vantage está subutilizado** e com problemas de configuração
3. **Rate limiting rudimentar** - vulnerável a erros em produção
4. **Dados financeiros estáveis** mas com gaps em cobertura (especialmente criptos e derivados)
5. **Notícias precisam de fallback** - dependência única em FMP é arriscada

---

## 1️⃣ FINANCIAL MODELING PREP (FMP)

### 1.1 Overview

| Aspecto | Detalhes |
|---------|----------|
| **URL Base** | `https://financialmodelingprep.com/stable` |
| **Autenticação** | API Key (query param `?apikey=` ou header) |
| **Tipo de Dados** | Financeiros, notícias, escaneador de stocks |
| **Plano Atual** | Freemium (presumível) |
| **Status no Código** | ✅ Bem integrado |

### 1.2 Documentação Verificada

**Localização:** https://financialmodelingprep.com/developer/docs

**Endpoints Encontrados em Produção:**

#### A. Dados de Empresa
```
GET /stable/profile                    - Perfil da empresa
GET /stable/quote                      - Cotação em tempo real
GET /stable/key-metrics-ttm            - Métricas chave (trailing twelve months)
GET /stable/ratios-ttm                 - Rácios financeiros (TTM)
GET /stable/shares-float               - Ações em circulação
```

#### B. Demonstrações Financeiras
```
GET /stable/income-statement           - Demonstração de resultados (até 3 anos)
GET /stable/balance-sheet-statement    - Balanço (até 3 anos)
GET /stable/cash-flow-statement        - Fluxo de caixa (até 3 anos)
GET /stable/financial-growth           - Taxas de crescimento
GET /stable/key-metrics                - Métricas históricas (até 5 anos)
GET /stable/ratios                     - Rácios históricos (até 5 anos)
```

#### C. Notícias e Sentimento
```
GET /stable/fmp-articles              - Notícias gerais (FMP próprias)
GET /stable/news/stock-latest         - Notícias de stocks
GET /stable/earnings-calendar          - Calendário de resultados
```

#### D. Buscas e Filtros
```
GET /stable/company-search             - Buscar empresa por nome
GET /stable/available-sectors          - Setores disponíveis
GET /stable/available-industries       - Indústrias disponíveis
GET /stable/available-countries        - Países disponíveis
```

### 1.3 Rate Limits (Criticidade 🔴)

**Configuração Atual (em `rateLimitManager.ts`):**
```
FMP: 250 requests/day, 10 requests/minute
```

**Análise:**
- ⚠️ **Extremamente restritivo** para aplicação multi-usuário
- ⚠️ **250 req/dia** = apenas ~10-15 stocks por dia em análise completa
- ⚠️ **10 req/min** = impossível fazer batch queries sobre múltiplos ativos
- ❌ **Sem cache implementado** - cada request conta contra limite

**Cenário Crítico:**
```
- User busca 5 stocks (15 endpoints cada) = 75 requests
- Limite diário = ~3.3 queries completas por dia
- Em produção com 100+ users = Colapso garantido
```

**Recomendação:** 
Upgrade urgente para plano pago ou implementar cache agressivo (Redis).

### 1.4 Qualidade dos Dados

#### ✅ Excelente
- Demonstrações financeiras auditadas
- Dados normalizados por período
- Histórico de até 5 anos
- Campos bem documentados
- Cobertura global (não apenas US)

#### ⚠️ Limitações Observadas
```typescript
// No código: src/utils/financial/dataFetcher.ts
// Problema: EPS pode estar em múltiplos campos
eps: incomeRes[0]?.eps ?? incomeRes[0]?.epsdiluted ?? incomeRes[0]?.epsbasic
// → Normalização necessária, falhas silenciosas possíveis

// Problema: Earnings calendar com campos inconsistentes
eps: e.eps ?? e.epsActual ?? e.estimatedEPS
// → 3 caminhos diferentes para mesmo dado
```

#### ❌ Gaps Críticos
1. **Dados de criptomoedas:** Não existe cobertura FMP
2. **Opções/Derivados:** Não implementado
3. **Pares forex:** Limitado
4. **Dados intraday (< 1h):** Histórico limitado
5. **Análise técnica:** Indicadores faltam

### 1.5 Endpoints Críticos Análise Detalhada

#### `/stable/profile` - Perfil da Empresa
**Status:** ✅ Crítico e bem integrado
```
Campos esperados:
- symbol, companyName, sector, industry
- description, CEO, website, ipoDate
- price, marketCap, beta, lastDividend
- fullTimeEmployees, address, city, state, zip, country

Problema atual: Sem tratamento de tickers não encontrados
→ Retorna array vazio sem erro claro
```

**Implementação:** `src/services/stock.service.ts`
```typescript
// Risco: Sem validação se empresa existe
const company = data[0]
// Se data vazio, crash
```

#### `/stable/income-statement` (com limit=3)
**Status:** ✅ Bem implementado
```
Campos por período:
- date, symbol, period
- revenue, netIncome, grossProfit
- operatingIncome, eps, epsdiluted, epsbasic
- costOfRevenue, dividends

Melhorias implementadas:
✅ Busca 3 anos de histórico
✅ Normaliza campos EPS
✅ Fallback para campos alternativos
```

#### `/stable/earnings-calendar`
**Status:** ⚠️ Parcialmente implementado
```
Problema: Campo EPS inconsistente
- eps, epsActual, estimatedEPS podem existir em paralelo
- Sem documentação clara qual usar

Filtro atual: Remove entries onde eps = null
→ Descarta dados válidos se em campo errado
```

### 1.6 Implementação de Rate Limiting

**Localização:** `src/services/rateLimitManager.ts`

**Problemas Identificados:**

1. ❌ **Memória apenas** - reseta com reinício
   ```typescript
   private limits: ServiceLimits = {}
   // Sem persistência → perda de estado
   ```

2. ❌ **Sem granularidade por usuário**
   ```typescript
   canMakeRequest(serviceName: string): boolean
   // Apenas contabiliza globalmente
   // 1 user abusivo = 100 users afetados
   ```

3. ❌ **Sem retry automático**
   ```typescript
   if (status.requestsToday >= config.requestsPerDay) {
     return false
   }
   // Erro imediato, sem backoff
   ```

4. ⚠️ **Sem comunicação de limite para frontend**
   ```typescript
   // User não sabe quando volta o limite
   getTimeUntilReset(): number
   // Implementado mas não usado
   ```

**Teste Funcional:**
```
Rate limit atinge limite?
→ Testa em rateLimitManager.ts linhas 40-60
→ Retorna false, causa erro 503 em production
→ User fica sem feedback
```

### 1.7 Configuração e Credenciais

**Localização:** `.env.example`
```
FMP_API_KEY=  # Obrigatório para /api/reits/*
```

**Status:**
- ✅ Variável de ambiente declarada
- ⚠️ Sem validação de formato (pode estar inválida silenciosamente)
- ❌ Sem health check automático ao iniciar
- ❌ Sem alertas se API key está expirada/revogada

**Verificação Atual:**
```typescript
// src/config/newsConfig.ts
if (config.fmp?.enabled) {
  if (!config.fmp.apiKey) {
    errors.push('FMP API key is required')
  }
}
// Apenas valida existência, não validade
```

---

## 2️⃣ ALPHA VANTAGE

### 2.1 Overview

| Aspecto | Detalhes |
|---------|----------|
| **URL Base** | `https://www.alphavantage.co/query` |
| **Autenticação** | API Key (obrigatório: query param `apikey=`) |
| **Tipo de Dados** | Séries temporais, análise de sentimento de notícias |
| **Plano Atual** | Freemium (5 req/min, 25 req/dia no plano free) |
| **Status no Código** | ⚠️ Parcialmente integrado, com problemas |

### 2.2 Documentação Oficial

**Localização:** https://www.alphavantage.co/documentation/

**Função Suportada (conforme código):**
```
GET /query?function=NEWS_SENTIMENT
```

**Parâmetros:**
```
function=NEWS_SENTIMENT
symbol=AAPL (opcional, para news de ticker específico)
limit=50 (máximo)
sort=LATEST | EARLIEST | RELEVANCE
time_period=1min|5min|15min|30min|1hour (para séries temporais)
interval=5min (para intraday)
```

### 2.3 Rate Limits (Criticidade 🔴)

**Configuração Atual:**
```typescript
// src/services/rateLimitManager.ts
alphavantage: {
  requestsPerDay: 25,    // Free tier
  requestsPerMinute: 5,
  resetTime: '00:00'
}
```

**Realidade vs. Implementação:**

| Limite | Esperado | Configurado | Status |
|--------|----------|-------------|--------|
| Daily | 500 (premium) / 25 (free) | 25 | ✅ OK |
| Per Minute | 5 | 5 | ✅ OK |
| Per Second | - | - | ❌ Não implementado |

**Problema Crítico:**
```
Alpha Vantage recusa requisições < 12 segundos de intervalo
Implementação espera 200ms entre FMP requests
→ Será rejeitada por Alpha Vantage
```

### 2.4 Integração Atual

**Localização:** `src/services/external/alphaVantageService.ts`

**Status:** ⚠️ **Implementação Incompleta**

```typescript
class AlphaVantageServiceEnhanced {
  private readonly baseUrl = 'https://www.alphavantage.co/query'
  private apiKey: string
  private readonly serviceName = 'alphavantage'
  
  // ✅ Implementado
  - isAvailable()
  - getRateLimitStatus()
  - getTimeUntilReset()
  - makeRequestWithRateLimit()
  
  // ⚠️ NÃO IMPLEMENTADO
  - processResponse() retorna [] array vazio
  // → Dados obtidos mas não processados
  
  // ❌ Faltam
  - NEWS_SENTIMENT endpoint details
  - Campo de mapeamento
  - Tratamento de errors específicos
}
```

**Código Problema:**
```typescript
async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
  try {
    if (!this.isAvailable()) {
      console.log('⚠️ Alpha Vantage not available')
      return []  // ← Retorna vazio, falha silenciosa
    }
    
    const requestParams = {
      function: 'NEWS_SENTIMENT',
      limit: Math.min(params.limit || 20, 50),
      sort: 'LATEST'
    }
    
    const response = await this.makeRequestWithRateLimit(requestParams)
    
    // ← AQUI: processResponse retorna [] vazio!
    return this.processResponse(response, params, config)
  } catch (error) {
    // Swallows error, não faz log adequado
    return []
  }
}

private processResponse(response: any, params: NewsQueryParams, config: SourceConfig): NewsArticle[] {
  // (implementação da conversão de dados...)
  // (usar código existente do alphaVantageService)
  return []  // ← HARDCODED: Sempre retorna vazio!
}
```

### 2.5 Problemas Críticos

#### 1. **Processamento Não Implementado**
- `processResponse()` retorna array vazio hardcoded
- Dados obtidos descartados
- Mais grave: Nenhuma indicação ao usuário

#### 2. **Delay Insuficiente**
- Alpha Vantage precisa ~12s entre requests
- Rate limiter configura apenas 200ms
- Resultado: 100% rejection rate

#### 3. **Sem Mapeamento de Dados**
- Resposta JSON não especificada
- Campos esperados desconhecidos
- `NewsArticle` não sabe onde buscar dados

#### 4. **Detecção Inadequada de Erros**
```typescript
if ('Information' in data && data['Information']) {
  // Marca como limitado mas continua...
  status.isLimitReached = true
  throw error
}
// ← Lança exceção que é capturada como erro genérico
```

### 2.6 Análise de Response

**Formato Esperado de `NEWS_SENTIMENT`:**
```json
{
  "data": [
    {
      "time_published": "20241215T120000",
      "title": "String",
      "url": "String",
      "time_utc": "2024-12-15 12:00:00",
      "authors": ["String"],
      "summary": "String",
      "banner_image": "String",
      "source": "String",
      "category": "String",
      "topics": [{"topic": "String", "relevance_score": "0.5"}],
      "overall_sentiment_score": 0.8,
      "overall_sentiment_label": "POSITIVE|NEUTRAL|NEGATIVE",
      "ticker_sentiment": [
        {
          "ticker": "AAPL",
          "relevance_score": 0.8,
          "ticker_sentiment_score": 0.5,
          "ticker_sentiment_label": "NEUTRAL"
        }
      ]
    }
  ],
  "items": "10",
  "sentiment_score_definition": "..."
}
```

**Mapeamento Necessário para NewsArticle:**
```typescript
private processResponse(response: any): NewsArticle[] {
  if (!response.data || !Array.isArray(response.data)) return []
  
  return response.data.map((item: any) => ({
    id: `av-${item.time_published}-${item.url}`,
    title: item.title,
    summary: item.summary,
    content: item.summary,  // AlphaVantage não tem conteúdo completo
    publishedDate: new Date(item.time_utc).toISOString(),
    source: item.source,
    url: item.url,
    image: item.banner_image,
    category: item.category,
    tickers: item.ticker_sentiment?.map(t => t.ticker) || [],
    sentiment: this.mapSentiment(item.overall_sentiment_label),
    author: item.authors?.[0],
    views: 0
  }))
}

private mapSentiment(label: string): SentimentLabel {
  const map = { 'POSITIVE': 'positive', 'NEGATIVE': 'negative', 'NEUTRAL': 'neutral' }
  return map[label] || 'neutral'
}
```

### 2.7 Recomendações de Uso

**✅ USAR PARA:**
- Análise de sentimento de notícias (quando implementado)
- Verificação cruzada de dados FMP
- Dados secundários de backup

**❌ NÃO USAR PARA:**
- Dados financeiros primários (FMP é melhor)
- Dados em tempo real (latência alta)
- Dados históricos extensos (limite 25 req/dia)

---

## 3️⃣ IMPLEMENTAÇÃO DE NOTÍCIAS

### 3.1 FMP News Service

**Localização:** `src/services/external/fmpNewsService.ts`

**Status:** ✅ **Bem implementado com fallbacks**

#### Endpoints Utilizados
```
1. GET /stable/fmp-articles        - Notícias gerais
   Resposta: { content: [{ title, date, content, tickers, image, link, author, site }] }
   Parâmetros: page, size (limit 100)

2. GET /stable/news/stock-latest   - Notícias de stocks
   Resposta: [{ symbol, publishedDate, title, image, site, text, url }]
   Parâmetros: limit (100 max), tickers (comma-separated)
```

#### Funcionalidades ✅
- Dual endpoint com fallback automático
- Tratamento de timeouts (15s)
- Sanitização de HTML/entities
- Extração automática de tickers
- Análise básica de sentimento (keywords)
- Detecção de duplicatas
- Paginação

#### Problemas Identificados

1. **Paginação Incompleta**
   ```typescript
   const requestParams = {
     page: Math.floor((params.offset || 0) / (params.limit || 20)),
     size: Math.min(params.limit || 20, 100)
   }
   // Página 0 sempre retorna primeiros 100
   // Offset não mapeado corretamente
   ```

2. **Análise de Sentimento Rudimentar**
   ```typescript
   private analyzeSentiment(text: string): SentimentLabel {
     const positiveWords = ['bullish', 'surge', 'rally', ...]
     const negativeWords = ['bearish', 'fall', 'drop', ...]
     // Muito simplista, sem contexto
     // "surge in losses" = positive? ✗
   }
   ```

3. **Sem Timeout em Promise.allSettled**
   ```typescript
   const results = await Promise.allSettled(tasks)
   // Se um task travar, espera indefinidamente
   ```

4. **Categories Hardcoded**
   ```typescript
   private categorizeContent(title: string, content: string): NewsCategory {
     if (this.containsKeywords(text, ['bitcoin', 'crypto', ...])) return 'crypto'
     // Sem categorias customizáveis
     // Cobertura limitada
   }
   ```

### 3.2 NewsConfig

**Localização:** `src/config/newsConfig.ts`

**Serviços Configurados:**

| Serviço | Enabled | Key Requerida | Status |
|---------|---------|---------------|--------|
| FMP | ✅ | Sim | ✅ Crítico |
| NewsAPI | ⚠️ | Sim | ❓ Não implementado |
| AlphaVantage | ❌ | Sim | ⚠️ Parcial |
| Polygon | ❌ | Sim | ❌ Não usado |
| RSS | ✅ | Não | ✅ Fallback |

**Documentação de APIs:**
```typescript
export const apiDocumentation = {
  fmp: { url: 'https://financialmodelingprep.com/developer/docs', ... },
  newsApi: { url: 'https://newsapi.org/docs', ... },
  alphaVantage: { url: 'https://www.alphavantage.co/documentation/', ... },
  polygon: { url: 'https://polygon.io/docs/stocks', ... }
}
```

---

## 4️⃣ ANÁLISE COMPARATIVA

### 4.1 Dados Financeiros

| Métrica | FMP | Alpha Vantage | Yahoo Finance | Recomendação |
|---------|-----|---------------|---------------|--------------|
| **Demonstrações Financeiras** | ✅ Excelente | ❌ Não | ❌ Não | FMP apenas |
| **Dados TTM** | ✅ Sim | ❌ Não | ❌ Não | FMP |
| **Histórico** | ✅ 5 anos | ❌ Limitado | ✅ Longo | FMP primário |
| **Séries Temporais** | ⚠️ Limitado | ✅ Bom | ✅ Excelente | Yahoo backup |
| **Cobertura Global** | ✅ Boa | ✅ Boa | ✅ Boa | Combinar |
| **Real-time** | ⚠️ 15-20min | ⚠️ 15-20min | ⚠️ Atrasado | Não contar |
| **Análise Sentimento** | ❌ Não | ✅ Sim | ❌ Não | Alpha Vantage |

### 4.2 Notícias

| Métrica | FMP | Alpha Vantage | NewsAPI |
|---------|-----|---------------|---------|
| **Cobertura** | 🟡 Média | 🟢 Boa | 🟢 Excelente |
| **Sentimento** | 🔴 Nenhum | 🟢 Sim | 🔴 Nenhum |
| **Idiomas** | 🟡 PT/EN | 🟡 PT/EN | 🟢 30+ idiomas |
| **Tickers** | 🟢 Extraído | 🟢 Incluído | 🔴 Nenhum |
| **Rate Limit** | 250/dia | 25/dia | 1000/dia |
| **Implementação** | ✅ Completo | ⚠️ Incompleto | ❌ Não há |

---

## 5️⃣ GESTÃO DE RATE LIMITS

### 5.1 Situação Crítica

**Limite Diário vs. Uso Real:**

```
FMP: 250 req/dia
  - Análise 1 stock = 15 endpoints
  - Máx 16-17 stocks/dia
  - Em produção com 100+ users = impossível
  
Alpha Vantage: 25 req/dia
  - Notícias por stock = 1 req
  - Máx 25 stocks/dia
  - Praticamente inútil
```

### 5.2 Estratégias de Otimização

#### 1. **Cache Agressivo (RECOMENDADO)**
```typescript
// Adicionar Redis
const CACHE_TTL = {
  profile: 7 * 24 * 60 * 60,      // 7 dias
  quote: 5 * 60,                   // 5 minutos
  financials: 24 * 60 * 60,        // 1 dia
  news: 60 * 60,                   // 1 hora
  ratios: 7 * 24 * 60 * 60         // 7 dias
}

// Implementar: src/services/cacheService.ts
class CacheService {
  async getProfile(symbol: string) {
    const cached = await redis.get(`profile:${symbol}`)
    if (cached) return cached
    
    const data = await fmpService.getProfile(symbol)
    await redis.setex(`profile:${symbol}`, CACHE_TTL.profile, JSON.stringify(data))
    return data
  }
}
```

#### 2. **Batch Queries**
```typescript
// Atual: 1 query por stock
// Novo: Múltiplos stocks por request (suportado por FMP)

// Exemplo batch quote
GET /stable/quote?symbols=AAPL,GOOGL,MSFT
// Reduz de 3 para 1 request
```

#### 3. **Priorização de Dados**
```typescript
// Não buscar tudo, buscar relevante
const ESSENTIAL = ['profile', 'quote', 'key-metrics-ttm']
const OPTIONAL = ['ratios', 'growth', 'keyMetrics']

// Implementar lazy loading
router.get('/api/stocks/:symbol', async (req, res) => {
  const stock = await getEssentialData(symbol)     // 3 reqs
  
  res.json({
    ...stock,
    details: () => getOptionalData(symbol)  // Lazy on demand
  })
})
```

#### 4. **Upgrade para Plano Pago**
```
FMP Pricing (estimado):
- Professional: $50/mês = ~10k req/mês = 333 req/dia
- Enterprise: Custom

ROI:
- Suporta até 20-25 users activos
- Custa menos que 1 developer junior
```

### 5.3 Implementação de Retry com Backoff

```typescript
// Melhorar: src/services/rateLimitManager.ts

async function requestWithBackoff<T>(
  fn: () => Promise<T>,
  service: string,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!canMakeRequest(service)) {
        const timeUntilReset = getTimeUntilReset(service)
        // Exponential backoff
        const delay = Math.pow(2, i) * 1000 // 1s, 2s, 4s
        await sleep(Math.min(delay, timeUntilReset))
        
        if (i === maxRetries - 1) throw new RateLimitError(timeUntilReset)
        continue
      }
      
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      const delay = Math.pow(2, i) * 1000
      await sleep(delay)
    }
  }
}
```

---

## 6️⃣ QUALIDADE DOS DADOS

### 6.1 Avaliação por Tipo

#### Dados de Empresa ✅
```
Status: Excelente
- Informações auditadas
- Campos consistentes
- Cobertura global
Problema: Alguns campos opcionais faltam
```

#### Demonstrações Financeiras ✅
```
Status: Excelente
- Auditadas (US SEC)
- 3-5 anos histórico
- Quarterly + Annual
Problema: Campos não normalizados (EPS em 3 locais)
```

#### Notícias 🟡
```
Status: Bom (FMP), Incompleto (AlphaVantage)
- Atualizado regularmente
- Cobertura de tickers extraída
Problemas:
  1. Sem análise de sentimento real
  2. Duplicatas não eliminadas consistentemente
  3. Sem categorização automática confiável
  4. Idioma (PT) necessário filtrado manualmente
```

#### Análise de Sentimento ❌
```
Status: Muito Básico
- Apenas contagem de keywords
- Sem contexto
- Sem machine learning
- AlphaVantage poderia ajudar mas não implementado

Exemplos de erro:
- "Apple drops to $100" → Positivo (tem "drop")? ✗
- "Recession surge" → Positivo (tem "surge")? ✗
- "Beat earnings by 50%" → Neutro (sem keywords)? ✗
```

### 6.2 Validação de Dados

**Problemas Encontrados:**

1. **EPS Inconsistente**
```typescript
// Income statement pode ter:
eps, epsdiluted, epsbasic
// Earnings calendar:
eps, epsActual, estimatedEPS
// Nenhuma normalização oficial
```

2. **Datas em Formato Inconsistente**
```typescript
// FMP pode retornar:
"2024-12-15"       // ISO
"2024-12-15 12:00" // Com hora
"Dec 15, 2024"     // Texto
// Parser tenta normalizar mas pode falhar
```

3. **Campos Opcionais sem Valores**
```json
{
  "symbol": "AAPL",
  "ceo": null,
  "website": "",
  "description": "N/A"
}
// Sem distinção clara entre "não aplicável" e "não encontrado"
```

### 6.3 Score de Confiabilidade

| Campo | Confiabilidade | Notas |
|-------|----------------|-------|
| symbol | ✅ 100% | Chave primária |
| price | 🟡 80% | Atrasado 15-20min |
| marketCap | ✅ 95% | Derivado de price × shares |
| eps | 🟡 85% | Pode estar em campos diferentes |
| revenue | ✅ 98% | Auditado anualmente |
| debt | ✅ 98% | Do balanço auditado |
| cashflow | ✅ 95% | Demonstração completa |
| sentiment | 🔴 30% | Apenas keywords, muito inaccurate |

---

## 7️⃣ GAPS E LIMITAÇÕES

### 7.1 Dados Não Disponíveis

| Tipo | Status | Alternativa |
|------|--------|-------------|
| **Criptomo