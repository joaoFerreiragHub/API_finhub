# P5 — Contexto de Mercado: Inteligencia que liga tudo

## Visao

As ferramentas do FinHub analisam ativos individuais. A comunidade discute opinioes. Os criadores publicam conteudo. Mas **falta o contexto macro** — o que esta a acontecer no mercado como um todo e como isso afeta cada utilizador pessoalmente.

Sem contexto de mercado, o utilizador:
- Ve que $O caiu 5% mas nao sabe se e o REIT, o setor ou o mercado inteiro
- Le uma analise de ETF sem saber se e bom momento para entrar
- Faz o FIRE sem considerar cenarios macro reais

A camada de Market Context transforma dados macro em **contexto pessoal** — liga o que acontece "la fora" ao que interessa "ca dentro" (portfolio, objetivos, aprendizagem).

---

## 1. Como cada ator ganha

| Ator | O que ganha |
|------|-------------|
| **Utilizador** | Entende o que acontece no mercado sem precisar de ir a 5 sites; ve o impacto pessoal ("o mercado caiu 3%, o teu portfolio caiu 1.2% — estas mais diversificado que a media"); toma decisoes mais informadas |
| **Criador** | Contexto para conteudo ("o setor X esta a cair — escreve sobre isso"); topicos trending para responder na comunidade; autoridade ("o @CriadorY previu esta correcao ha 3 meses") |
| **Marca/Entidade** | Publicidade contextual ("mercado em queda → anuncio de corretora com baixas comissoes"); brand safety (nao aparecer ao lado de panico); market research (o que preocupa os utilizadores quando mercado cai?) |
| **Plataforma** | Retencao diaria (razao para abrir a app todos os dias); diferenciacao (mais que Reddit/fóruns); SEO (paginas de contexto macro indexaveis); aumento de engagement em todas as camadas |

---

## 2. O que construir

### 2.1 Market Pulse (dashboard macro)

Pagina `/mercado/pulse` — visao rapida do estado do mercado.

**Seccoes:**

```
┌─────────────────────────────────────────────────┐
│  MARKET PULSE — 6 Mar 2026                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Indices Globais                                │
│  S&P 500: 5,420  +0.8%  │ STOXX 600: 510 +0.3% │
│  Nasdaq:  17,100 +1.2%  │ PSI 20:    6,850 +0.1%│
│  FTSE:    7,900  -0.2%  │ Nikkei:    39,200+0.5%│
│                                                 │
│  Sentimento                                     │
│  Fear & Greed Index: 62 (Greed)                 │
│  VIX: 14.2 (-0.8)                               │
│  Put/Call Ratio: 0.85                            │
│                                                 │
│  Macro                                          │
│  USD/EUR: 0.92  │ Ouro: $2,150  │ BTC: $68,400  │
│  US 10Y: 4.15%  │ Petroleo: $78  │ EUR 10Y: 2.8%│
│                                                 │
│  Setores (S&P 500 hoje)                         │
│  ██████████ Tech      +1.5%                     │
│  ████████   Healthcare +0.8%                    │
│  ███████    Financials +0.6%                    │
│  ██         Energy     -0.3%                    │
│  █          REITs      -0.8%                    │
│                                                 │
│  Calendario Economico (proximos 7 dias)         │
│  📅 8 Mar — US Jobs Report                      │
│  📅 10 Mar — CPI Eurozone                       │
│  📅 12 Mar — Fed Meeting                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Fontes de dados:**

| Dado | Fonte | Endpoint |
|------|-------|----------|
| Indices globais | FMP | `/api/v3/quotes/index` |
| Sector performance | FMP | `/api/v3/sector-performance` |
| Fear & Greed | CNN/Alternative.me | API publica |
| VIX | FMP | `/api/v3/quote/^VIX` |
| Cambio/Ouro/Petroleo | FMP | `/api/v3/quote/EURUSD,XAUUSD,CLUSD` |
| Calendario economico | FMP | `/api/v3/economic_calendar` |
| Treasury yields | FMP | `/api/v4/treasury` |

**Model:**

```typescript
// src/models/MarketSnapshot.ts
interface IMarketSnapshot {
  date: Date                    // uma snapshot por dia

  // Indices
  indices: [{
    symbol: string              // ^GSPC, ^STOXX50E, ^PSI20
    name: string
    price: number
    change: number              // percentagem
    region: 'US' | 'EU' | 'PT' | 'ASIA'
  }]

  // Sentimento
  sentiment: {
    fearGreedIndex: number      // 0-100
    fearGreedLabel: string      // 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
    vix: number
    putCallRatio: number
  }

  // Setores
  sectorPerformance: [{
    sector: string
    change1d: number
    change1w: number
    change1m: number
    changeYtd: number
  }]

  // Macro
  macro: {
    usdEur: number
    gold: number
    oil: number
    btc: number
    us10y: number
    eur10y: number
  }

  // Calendario
  economicCalendar: [{
    date: Date
    event: string
    country: string
    impact: 'low' | 'medium' | 'high'
    previous?: string
    forecast?: string
    actual?: string
  }]

  createdAt: Date
}
```

**Cache strategy:**
- Snapshot completa: refresh a cada 15 min durante horario de mercado
- Fora do horario: ultima snapshot do dia
- Calendario: refresh diario
- TTL em Redis/memory: 5 min para dados live, 24h para calendario

---

### 2.2 Impacto pessoal (contexto → portfolio)

**O diferenciador.** Quando o utilizador tem portfolio no FinHub, o Market Pulse mostra impacto pessoal:

```
┌─ Impacto no teu portfolio ─────────────────────┐
│                                                 │
│  O teu portfolio hoje: +0.4% (+€120)            │
│  Mercado (S&P 500): +0.8%                       │
│                                                 │
│  Exposicao por setor vs mercado:                │
│  Tech:    Tu 45% │ S&P 30%  ⚠️ Sobre-exposto   │
│  REITs:   Tu 20% │ S&P 3%   ⚠️ Sobre-exposto   │
│  Health:  Tu 0%  │ S&P 13%  💡 Sem exposicao    │
│                                                 │
│  Eventos que te afetam:                         │
│  📅 Fed Meeting (12 Mar) — Afeta 65% do teu     │
│     portfolio (acoes US + REITs)                │
│  📅 CPI Eurozone (10 Mar) — Afeta 20% do teu   │
│     portfolio (ETFs europeus)                   │
│                                                 │
│  [Ver portfolio completo]                       │
└─────────────────────────────────────────────────┘
```

**Logica:**

```typescript
// src/services/marketContext.service.ts

interface PersonalImpact {
  portfolioChange: number           // variacao do portfolio hoje
  benchmarkChange: number           // variacao do benchmark
  alpha: number                     // portfolio - benchmark

  sectorExposure: [{
    sector: string
    userWeight: number              // % do portfolio do user
    benchmarkWeight: number         // % do S&P 500
    status: 'overweight' | 'underweight' | 'neutral'
  }]

  relevantEvents: [{
    event: string
    date: Date
    impact: 'high' | 'medium' | 'low'
    affectedPercentage: number      // % do portfolio afetado
    affectedHoldings: string[]      // tickers afetados
    reason: string                  // "Afeta acoes US e REITs"
  }]
}

function calculatePersonalImpact(
  portfolio: IPortfolio,
  snapshot: IMarketSnapshot
): PersonalImpact {
  // 1. Calcular variacao do portfolio com base nos precos atuais
  // 2. Mapear holdings → setores → comparar com benchmark
  // 3. Cruzar calendario economico com regioes/setores do portfolio
  // 4. Gerar alertas de sobre/sub-exposicao
}
```

**Nota:** So funciona com portfolio preenchido (V2). Sem portfolio, mostrar dados macro gerais.

---

### 2.3 Market Movers (destaques do dia)

```
┌─ Market Movers ────────────────────────────────┐
│                                                │
│  🔼 Maiores subidas                            │
│  NVDA  +5.2%  — Resultados acima expectativas  │
│  O     +3.1%  — Aumento de dividendo anunciado │
│  VWCE  +1.8%  — Seguindo mercado global        │
│                                                │
│  🔽 Maiores descidas                           │
│  TSLA  -4.1%  — Falha na entrega Q1            │
│  PFE   -2.8%  — Corte de guidance              │
│                                                │
│  📊 Mais discutidos na comunidade              │
│  $BTC  — 47 mencoes hoje                       │
│  $VWCE — 23 mencoes hoje                       │
│  $O    — 18 mencoes hoje                       │
│                                                │
│  💬 Trending discussions                       │
│  "Bitcoin rompeu resistencia — target?" (89↑)  │
│  "REITs em 2026 — oportunidade?" (52↑)         │
│                                                │
└────────────────────────────────────────────────┘
```

**Integracao com comunidade:**
- Tickers mais mencionados nas discussions (contagem de `$TICKER` em threads do dia)
- Threads com mais upvotes nas ultimas 24h
- Criadores que comentaram sobre ativos em movimento

**Integracao com ferramentas:**
- Link direto para analise de cada ativo mencionado
- Badge "Tens este ativo" se o user tem no portfolio/watchlist
- FinHub Score inline para contexto rapido

---

### 2.4 Alertas contextuais

Notificacoes inteligentes baseadas no cruzamento mercado + portfolio + objetivos.

**Tipos de alertas:**

| Tipo | Trigger | Exemplo |
|------|---------|---------|
| **Volatilidade** | VIX > 25 ou portfolio move > 3% num dia | "O teu portfolio caiu 3.2% hoje. O mercado inteiro caiu — nao e so tu." |
| **Setor** | Setor do portfolio move > 2% | "O setor de REITs caiu 2.5% hoje. Tens 20% do portfolio em REITs." |
| **Evento macro** | Evento de alto impacto em 48h | "A Fed reune amanha. 65% do teu portfolio e afetado por decisoes da Fed." |
| **Oportunidade** | Ativo da watchlist cai > 5% | "$O caiu 5.2% hoje. Esta na tua watchlist — queres analisar?" |
| **Milestone** | Portfolio atinge marco | "O teu portfolio ultrapassou €25,000! Estas 15% a frente do plano FIRE." |
| **Contexto educativo** | Mercado em panico (F&G < 20) | "O mercado esta em 'Extreme Fear'. Historicamente, estes momentos..." |

**Model:**

```typescript
// Reutilizar sistema de notificacoes existente
// Adicionar novos tipos ao NotificationType enum

type MarketAlertType =
  | 'market_volatility'
  | 'sector_movement'
  | 'macro_event'
  | 'watchlist_opportunity'
  | 'portfolio_milestone'
  | 'educational_context'

interface IMarketAlert {
  type: MarketAlertType
  userId: ObjectId

  // Contexto
  title: string
  message: string
  severity: 'info' | 'warning' | 'opportunity'

  // Dados
  relatedTickers?: string[]
  relatedEvent?: string
  portfolioImpact?: number        // % de impacto estimado

  // Acao
  actionUrl?: string              // link para analise/portfolio/discussion
  actionLabel?: string            // "Analisar", "Ver portfolio", "Ler mais"

  // Estado
  read: boolean
  dismissed: boolean

  createdAt: Date
}
```

**Frequencia:**
- Max 3 alertas por dia por user (evitar fadiga)
- Prioridade: milestone > volatilidade > oportunidade > evento > educativo
- User pode configurar quais tipos quer receber

---

### 2.5 Contexto nos conteudos dos criadores

Quando um criador publica conteudo que menciona ativos ou setores, a plataforma adiciona contexto automatico:

```
┌─ Artigo: "Porque estou a comprar REITs em 2026" ──┐
│  por @CriadorX · 6 Mar 2026                       │
│                                                    │
│  ┌─ Contexto de mercado (automatico) ────────────┐ │
│  │ Quando este artigo foi publicado:              │ │
│  │ • Setor REITs: -8.2% YTD                      │ │
│  │ • US 10Y: 4.15% (↑ vs 3.8% ha 3 meses)       │ │
│  │ • Fear & Greed: 42 (Fear)                     │ │
│  │ • $O mencionado: $55.20 (nesta data)           │ │
│  │                                                │ │
│  │ Hoje (se lido mais tarde):                    │ │
│  │ • Setor REITs: -2.1% YTD (recuperou)           │ │
│  │ • $O: $61.50 (+11.4% desde o artigo)           │ │
│  └────────────────────────────────────────────────┘ │
│                                                    │
│  [Conteudo do artigo...]                           │
└────────────────────────────────────────────────────┘
```

**Implementacao:**

```typescript
// Ao publicar conteudo, guardar snapshot de contexto
interface IContentMarketContext {
  contentId: ObjectId
  contentType: string             // 'article', 'video', etc.

  // Snapshot no momento da publicacao
  publishedAt: Date
  snapshotAtPublish: {
    indices: { symbol: string, price: number }[]
    mentionedTickers: { symbol: string, price: number, change: number }[]
    sectorPerformance: { sector: string, changeYtd: number }[]
    fearGreedIndex: number
    relevantYields: { name: string, value: number }[]
  }
}
```

**Porque isto e importante:**
- Artigo de ha 6 meses sobre "comprar REITs" — o leitor precisa de saber o contexto de quando foi escrito
- Evita que conteudo desatualizado induza em erro
- Aumenta credibilidade do criador quando a analise envelhece bem

---

### 2.6 Trending Topics (ponte mercado → comunidade → conteudo)

Sistema que identifica o que esta "quente" e distribui por toda a plataforma.

**Logica de trending:**

```typescript
interface ITrendingTopic {
  topic: string                   // "REITs", "Bitcoin", "Fed Meeting"
  score: number                   // score composto

  // Sinais
  signals: {
    priceMovement: number         // magnitude do movimento de preco
    communityMentions: number     // mencoes nas discussions
    communityUpvotes: number      // upvotes em threads relacionadas
    creatorContent: number        // artigos/videos publicados sobre o tema
    searchVolume: number          // pesquisas internas no FinHub
    watchlistAdds: number         // quantos adicionaram ativos relacionados
  }

  // Distribuicao
  relatedTickers: string[]
  relatedDiscussions: ObjectId[]
  relatedContent: ObjectId[]

  period: 'today' | 'this_week'
  calculatedAt: Date
}

// Score = (priceMove × 3) + (mentions × 2) + (upvotes × 1) + (content × 2) + (search × 1.5) + (watchlist × 1)
```

**Onde aparece:**

| Local | O que mostra |
|-------|-------------|
| Market Pulse | "Trending: Bitcoin, REITs, Fed Meeting" com links |
| Homepage | Widget "O que esta a ser discutido" |
| Comunidade | Badge "Trending" nas discussions relevantes |
| Ferramentas | "Este ativo esta trending — 47 mencoes hoje" |
| Dashboard criador | "Topicos trending — oportunidade de conteudo" |
| Sidebar | Top 5 trending sempre visivel |

**Para criadores:** "O topico 'REITs' esta trending (+340% mencoes). 3 criadores ja publicaram sobre isto. [Criar conteudo sobre REITs]"

**Para marcas:** "O topico 'Corretoras' esta trending. 89 utilizadores estao a discutir taxas de corretagem. [Ver oportunidade de campanha]"

---

## 3. Endpoints

```
# Market Pulse
GET  /api/market/pulse                — snapshot atual (cache 5 min)
GET  /api/market/pulse/history        — historico de snapshots (30 dias)
GET  /api/market/sectors              — performance por setor (1d/1w/1m/ytd)
GET  /api/market/calendar             — calendario economico (proximos 30 dias)

# Impacto pessoal (auth required, precisa de portfolio)
GET  /api/market/impact               — impacto no portfolio do user
GET  /api/market/exposure             — exposicao por setor vs benchmark

# Market Movers
GET  /api/market/movers               — maiores subidas/descidas do dia
GET  /api/market/movers/community     — mais mencionados na comunidade

# Trending
GET  /api/market/trending             — topicos trending (today/this_week)

# Alertas
GET  /api/market/alerts               — alertas do user (auth required)
PATCH /api/market/alerts/:id          — marcar como lido/dismissed
PATCH /api/market/alerts/preferences  — configurar tipos de alerta

# Contexto de conteudo (interno, chamado ao publicar)
POST /api/market/context/snapshot     — guardar snapshot para conteudo
GET  /api/market/context/:contentId   — obter contexto de publicacao
```

---

## 4. Integracao com as outras camadas

### 4.1 Mercado → Ferramentas

| Ferramenta | Integracao |
|-----------|-----------|
| Stock Analysis | Contexto de setor ("Tech +1.5% hoje"), posicao relativa ao setor |
| REIT Toolkit | Yield do US 10Y atual vs yield do REIT (spread), contexto de taxas de juro |
| ETF Analysis | Performance do ETF vs indice de referencia, fluxos de entrada/saida |
| Crypto | Dominancia BTC, sentimento cripto (Fear & Greed cripto), correlacao com mercado tradicional |
| Watchlist | Alertas de preco, badge "trending", contexto do dia para cada ativo |
| FIRE Simulator | Cenario atual de mercado como input ("com base no mercado atual, o teu FIRE...") |

### 4.2 Mercado → Comunidade

- Threads automaticas sugeridas quando evento macro acontece: "A Fed subiu taxas — como afeta o teu portfolio?"
- Badge "Market Context" em threads que discutem ativos em movimento
- Inline cards com dados atualizados em tempo real

### 4.3 Mercado → Criadores

- Dashboard com trending topics e oportunidades de conteudo
- Contexto automatico em artigos/videos (snapshot de publicacao)
- Metricas: "O teu artigo sobre REITs foi publicado quando o setor estava a -8%. Agora esta a -2%. 230 leitores desde entao."

### 4.4 Mercado → Educacao

- Micro-tips contextuais: "O VIX esta a 28. Sabes o que e o VIX? [Aprender]"
- Glossario contextual: quando mercado cai, destacar termos como "correcao", "bear market", "capitulacao"
- Learning paths sugeridos: "O mercado esta volatil. Queres aprender sobre gestao de risco? [Iniciar path]"

### 4.5 Mercado → Marcas

- Publicidade contextual segura: corretora pode aparecer quando user pesquisa ativos, nao quando mercado esta em panico
- Dados anonimizados: "47% dos utilizadores estao sobre-expostos a Tech — campanha relevante?"
- Sponsored insights: marca pode patrocinar um widget de contexto ("Yield do US 10Y por [Corretora X]")

---

## 5. O que NAO construir

- **Previsoes/recomendacoes** — a plataforma mostra contexto, nao diz "compra" ou "vende". Isso e responsabilidade do utilizador e dos criadores
- **Trading signals** — nao somos plataforma de trading. Contexto sim, sinais nao
- **Real-time streaming** — updates a cada 5-15 min sao suficientes. WebSocket nao justifica a complexidade
- **Dados pagos premium** — todos os dados macro devem ser acessiveis a todos. Impacto pessoal pode ser feature de conta avancada, mas dados base sao livres
- **News aggregation completa** — nao competir com Bloomberg/Reuters. Mostrar calendario e contexto, nao noticias

---

## 6. Roadmap

### Fase 1 — Market Pulse basico

| # | Item | Esforco |
|---|------|---------|
| 1 | Model MarketSnapshot + cron job de recolha FMP | Medio |
| 2 | Endpoint `/api/market/pulse` com cache | Baixo |
| 3 | Pagina `/mercado/pulse` com indices, sentimento, setores | Medio |
| 4 | Market Movers (top gainers/losers) | Baixo |
| 5 | Calendario economico (proximos 7 dias) | Baixo |

### Fase 2 — Contexto integrado

| # | Item | Esforco |
|---|------|---------|
| 6 | Contexto de setor nas ferramentas (stock/REIT/ETF) | Medio |
| 7 | Snapshot de contexto ao publicar conteudo | Medio |
| 8 | Trending topics (calculo + distribuicao) | Medio |
| 9 | Widget trending na homepage e sidebar | Baixo |
| 10 | "Mais discutidos" cruzando comunidade + movers | Baixo |

### Fase 3 — Impacto pessoal (requer portfolio V2)

| # | Item | Esforco |
|---|------|---------|
| 11 | Impacto pessoal no Market Pulse | Alto |
| 12 | Exposicao por setor vs benchmark | Medio |
| 13 | Alertas contextuais (3 tipos iniciais) | Alto |
| 14 | Preferencias de alertas | Baixo |
| 15 | Contexto macro no FIRE simulator | Medio |

### Fase 4 — Inteligencia cruzada

| # | Item | Esforco |
|---|------|---------|
| 16 | Dashboard trending para criadores | Medio |
| 17 | Contexto educativo em eventos macro | Baixo |
| 18 | Publicidade contextual para marcas | Alto |
| 19 | Metricas de aging de conteudo (contexto historico) | Medio |
