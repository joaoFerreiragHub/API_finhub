# P5 — Ferramentas de Mercado: Audit e Novas Propostas

## Contexto

Auditoria critica de todas as ferramentas existentes (Analise de Acoes, REIT Toolkit, ETF Overlap, Crypto, Watchlist) com melhorias concretas e propostas de novas ferramentas.

Data desta avaliacao: 2026-03-06.

---

## 1. Analise de Acoes — Audit

### O que esta bem
- Pipeline robusto: fetchers → calculators → resultBuilder → scoring
- FinHub Score (0-100) com 4 dimensoes balanceadas (qualidade, crescimento, valuation, risco)
- Fallback multi-source (FMP → Yahoo → Google → sector benchmarks)
- Sentinel zero handling com `plausibleOrNull()`
- Radar com ceilings sectoriais
- 60+ indicadores calculados
- Peer comparison com radar sobreposto

### Melhorias

#### 1.1 Transparencia de dados (PRIORITARIA)

**Problema:** O utilizador ve um score 0-100 e confia nele, mas nao sabe se e baseado em 5 ou 50 data points reais.

**Fix:**
- Mostrar badge de qualidade dos dados: "Dados completos" / "Dados parciais (60%)" / "Dados limitados"
- `dataQualityScore` e `sectorContextScore` ja sao calculados mas nunca mostrados — expor na UI
- Indicar frescura: "Dados de Q3 2025" ou "TTM atualizado a 15 Jan 2026"

#### 1.2 Metricas em falta

| Metrica | Porque importa | Disponivel na FMP? |
|---------|---------------|-------------------|
| **Cash flow quality** (OCF/Net Income) | Deteta manipulacao de earnings | Sim |
| **FCF yield** | Quao barato esta o FCF vs preco | Sim |
| **Forward P/E** | Expectativas do mercado, nao so passado | Sim (estimates) |
| **Margem operacional trend 3-5 anos** | Expansao ou compressao de margens | Sim (historico) |
| **ROIC decomposition** | Distingue qualidade real vs contabilistica | Sim |
| **Working capital metrics** (DSO, DPO, DIO) | Eficiencia operacional | Sim |

**Nota:** Muitas destas metricas ja sao calculadas em `resultBuilder.ts` mas nunca chegam a UI. O trabalho e mais frontend do que backend.

#### 1.3 Alertas de risco mais sofisticados

O sistema atual de alertas (`fetchAlerts()`) e binario (debt > 1 = alerta). Melhorar para:

```
Alertas a adicionar:
- Margin squeeze: margem operacional caiu >3pp em 2 anos consecutivos
- Cash burn: FCF negativo + cash declining
- Earnings quality: accruals ratio > 10% (ganhos contabilisticos, nao cash)
- Revenue concentration: se disponivel, alertar dependencia de 1 cliente
- Interest rate sensitivity: debt/EBITDA > 3 + variable rate debt
```

#### 1.4 Comparacao lado a lado

**O que falta:** Nao e possivel comparar 2 acoes lado a lado.

**Implementacao:** Endpoint `GET /api/stocks/compare?symbols=AAPL,MSFT` que retorna indicadores alinhados para ambas. Frontend: tabela ou radar com 2 overlays.

#### 1.5 Exportar analise

Botao "Exportar PDF" ou "Copiar resumo" com os KPIs principais + radar + score. Util para partilhar com outros ou guardar para referencia.

---

## 2. REIT Toolkit — Audit

### O que esta bem
- Tres metodos de valuation (DDM, FFO, NAV) — raro em ferramentas gratuitas
- Confidence badges que alertam quando os dados sao insuficientes
- Profile detection (Growth/Income/Mixed) com raciocinio transparente
- Cap rate por sector com tres cenarios (otimista/base/conservador)
- Handling inteligente de mREITs vs equity REITs

### Melhorias

#### 2.1 Historico de FFO e dividendos (PRIORITARIA)

**Problema:** Tudo e snapshot atual. Nenhuma visualizacao de tendencia.

**Fix:** Adicionar tab "Historico" com:
- FFO per share ultimos 5 anos (bar chart)
- Dividendo per share ultimos 5 anos (bar chart com CAGR overlay)
- Yield on cost simulado (se compraste ha 5 anos, que yield terias hoje?)
- Payout ratio trend (estavel, a subir, a descer)

Os dados historicos ja estao disponiveis na FMP (`/key-metrics`, `/income-statement` com `limit=5`).

#### 2.2 AFFO — resolver ou remover

**Problema:** O botao AFFO mostra "n/d" e volta ao FFO simplificado. Isto confunde.

**Opcoes:**
- **(a) Calcular AFFO estimado:** `AFFO = FFO - (Capex × maintenance_ratio)` onde `maintenance_ratio` e tipicamente 60-80% do capex total para REITs. Impreciso mas melhor que nada. Mostrar com badge "Estimativa".
- **(b) Remover botao AFFO:** Se nao ha dados de qualidade, nao mostrar.

Recomendacao: opcao (a) com disclaimer claro.

#### 2.3 Peer comparison

**Problema:** Nao ha comparacao com peers do sector.

**Fix:** Usar `/stock-peers` da FMP para obter 3-5 REITs do mesmo sector. Mostrar tabela:

```
           Este REIT   Peer Median   Sector Avg
P/FFO:     14.5x       16.2x         17.0x       ← Abaixo da mediana ✅
Payout:    78%         72%           75%          ← Acima ⚠️
Debt/EBITDA: 5.8x      5.2x          5.5x        ← Acima ⚠️
Yield:     5.2%        4.8%          4.5%         ← Acima ✅
```

#### 2.4 Sensibilidade a taxa de juro

**Conceito:** REITs sao senssiveis a taxas de juro. Mostrar:
- "Se o cap rate subir 50bps, o NAV economico desce X%"
- "Se as taxas subirem 100bps, o custo de divida sobe Y€M/ano"

Isto ja e calculavel com os dados que temos (NOI, debt, cap rates).

#### 2.5 Ocupacao

**Problema:** `getOccupancyRate()` retorna so nome/sector, nao a taxa real.

**Fix:** A FMP nao disponibiliza ocupacao diretamente. Opcoes:
- Estimar a partir de revenue consistency (revenue estavel = ocupacao estavel)
- Campo manual: utilizador pode inserir occupancy rate do ultimo report

---

## 3. ETF Overlap — Audit

### O que esta bem
- UI limpa com defaults europeus inteligentes (VWCE.DE / IWDA.AS)
- Sector overlap visualizado em tabela clara

### Problemas criticos

#### 3.1 Dados sao simulados (CRITICO)

**Problema:** O overlap e fabricado com base na similiaridade de sector, nao em holdings reais:

```typescript
if (sameSector && sameIndustry) totalOverlapWeight = 95
else if (sameSector) totalOverlapWeight = 60
```

Isto torna a ferramenta **enganadora**. Dois ETFs de mercados diferentes podem ter o mesmo sector breakdown mas holdings completamente diferentes.

**Opcoes:**
- **(a) FMP Premium ($59/mes):** Holdings reais. Custo recorrente.
- **(b) Yahoo Finance scraping:** Holdings top 10-25. Gratuito mas fragil.
- **(c) Honestidade total:** Renomear para "Estimativa de Overlap por Sector" e adicionar link directo para "Ver holdings reais no Yahoo Finance". Barato e honesto.
- **(d) ETF provider APIs:** Vanguard, iShares, SPDR tem APIs publicas com holdings.

**Recomendacao:** Opcao (c) como quick fix, opcao (d) a medio prazo.

#### 3.2 Expense ratio nao mostrado

**Problema:** Dois ETFs podem ter 90% de overlap mas custos muito diferentes. Escolher o mais barato e a decisao mais impactante e nao e mostrada.

**Fix:** Mostrar TER (Total Expense Ratio) lado a lado:
```
VWCE.DE: TER 0.22%  |  IWDA.AS: TER 0.20%
Diferenca: 0.02% (€2/ano por cada €10.000)
```

#### 3.3 Sem correlacao historica

**Fix:** Se tiveres precos historicos (Yahoo Finance), calcular correlacao entre os dois ETFs. "Correlacao 0.95 = diversificacao quase zero".

---

## 4. Crypto — Audit

### O que esta bem
- Binance API rapida e fiavel
- Top 200 por volume — scope sensato
- Search funcional
- Refresh manual disponivel

### Problemas criticos

#### 4.1 Market cap ESTA ERRADO (CRITICO)

```typescript
const marketCap = quoteVolume  // ERRADO!
```

O codigo atribui o volume de 24h em USDT ao campo marketCap. Isto e **completamente incorreto** e enganador.

**Fix imediato:** Usar CoinGecko API (gratuita, 10-30 req/min) que fornece market cap real:
```
GET https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&per_page=200
→ retorna: price, market_cap, total_volume, price_change_percentage_24h, circulating_supply
```

CoinGecko e a source standard para crypto market data gratuita.

#### 4.2 Sem variacao 24h

**Problema:** A tabela mostra preco mas nao mostra se subiu ou desceu. Sem contexto.

**Fix:** Adicionar coluna `24h %` com cor (verde/vermelho). Binance ja disponibiliza `priceChangePercent` no endpoint ticker.

#### 4.3 Sem sorting

**Fix:** Headers clicaveis para ordenar por preco, market cap (quando corrigido), volume, variacao 24h.

#### 4.4 Imagens frageis

As imagens usam CoinCap CDN que pode mudar. Migrar para CoinGecko images (mais estaveis) ou servir localmente os icones dos top 50.

---

## 5. Watchlist — Audit

### O que esta bem
- Cards limpos com preco, market cap, sector
- Session storage funcional
- Link direto para analise completa
- Grid responsivo

### Melhorias

#### 5.1 Batch API call (PRIORITARIA)

**Problema:** Cada card faz 1 API call separada. 20 tickers = 20 calls a cada 60 segundos = 1200 calls/hora.

**Fix:** Criar endpoint batch:
```
GET /api/stocks/batch-snapshot?symbols=AAPL,MSFT,GOOGL,...
```
1 call em vez de N. Cache de 5 minutos em vez de 1.

#### 5.2 Persistencia no backend

**Problema:** Watchlist vive so no localStorage. Novo device = watchlist perdida.

**Fix:** Modelo Watchlist no backend (ou reutilizar Favorites existente):
```
POST /api/watchlist          — adicionar ticker
DELETE /api/watchlist/:ticker — remover
GET  /api/watchlist          — listar
```

Manter localStorage como fallback para users nao autenticados. Sincronizar ao fazer login.

#### 5.3 Variacao 24h nos cards

Adicionar badge verde/vermelho com % change. E a informacao mais importante que falta.

#### 5.4 Sorting e filtros

Ordenar por: preco, market cap, sector, variacao 24h, ordem de adicao.
Filtrar por: sector.

---

## 6. Markets Hub — Audit

### O que esta bem
- Layout visual apelativo com hero gradient
- Cards informativos com descricao de cada ferramenta
- Badges de estado (ativo / em migracao)

### Melhorias

#### 6.1 Dashboard de mercado ao vivo

Transformar o hub de uma pagina estatica de links numa **dashboard de mercado**:

```
┌─────────────────────────────────────────────────────┐
│  Mercados Hoje                           06 Mar 2026│
│                                                     │
│  S&P 500: 5,234 (+0.8%)  │  STOXX 50: 4,890 (-0.2%)│
│  BTC: €42,300 (+2.1%)    │  EUR/USD: 1.0823         │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Acoes    │ │ ETFs     │ │ REITs    │ │ Cripto  ││
│  │ Analisar │ │ Comparar │ │ Avaliar  │ │ Precos  ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                     │
│  Top movers hoje:                                   │
│  NVDA +4.2% │ TSLA -3.1% │ O +1.8% │ BTC +2.1%    │
└─────────────────────────────────────────────────────┘
```

**Dados necessarios:** FMP `/quote` para indices (^GSPC, ^STOXX50E), Binance para BTC.

---

## 7. Novas ferramentas sugeridas

### 7.1 Calculadora de Juros Compostos

**O que e:** A ferramenta mais basica e mais procurada em financas pessoais. "Se investir X€/mes a Y% durante Z anos, quanto terei?"

**Porque:**
- SEO magnet — "calculadora juros compostos" tem alto volume de pesquisa em PT
- Onboarding tool — introduz utilizadores novos ao conceito de investir
- Zero API calls — calculo puramente matematico, sem custos
- Gateway para o FIRE simulator

**Implementacao:**

```
Inputs:
  - Capital inicial: [€1.000]
  - Contribuicao mensal: [€300]
  - Taxa de retorno anual: [7%]
  - Periodo: [20 anos]
  - Inflacao (opcional): [2%]

Outputs:
  - Valor final nominal: €178.410
  - Valor final real (ajustado inflacao): €119.820
  - Total investido: €73.000
  - Juros ganhos: €105.410
  - Grafico: investido vs juros acumulados (area chart)
```

**Extra:** Slider interativo (arrastar periodo/contribuicao e ver resultado a mudar em tempo real).

**Esforco:** Baixo (1-2 dias). Zero backend, tudo no frontend.

---

### 7.2 Simulador de Dividendos (Dividend Growth Calculator)

**O que e:** "Se investir em acoes/REITs com X% yield e Y% dividend growth, quando chego a Z€/mes de rendimento passivo?"

**Porque:**
- Complementa o FIRE simulator mas e mais simples e focado
- Muito procurado por investidores de income/dividendos (grande audiencia PT)
- Pode usar dados reais da FMP (yield e dividend CAGR que ja calculamos)

**Implementacao:**

```
Inputs:
  - Capital inicial investido: [€10.000]
  - Contribuicao mensal: [€500]
  - Dividend yield medio: [4.5%] (ou ticker real → auto-fill)
  - Dividend growth rate: [5%] (ou CAGR real do ticker)
  - DRIP: [Sim/Nao]
  - Objetivo rendimento mensal: [€2.000]

Outputs:
  - Tempo ate objetivo: 14 anos e 3 meses
  - Dividendos no ano 1: €450/ano (€37/mes)
  - Dividendos no ano 5: €1.200/ano (€100/mes)
  - Dividendos no ano 10: €4.800/ano (€400/mes)
  - Dividendos no ano 14: €24.000/ano (€2.000/mes) ← OBJETIVO
  - Grafico: dividendos mensais crescentes (bar chart)
```

**Extra:** Permitir inserir um ticker real e auto-preencher yield e CAGR com dados da FMP.

**Esforco:** Baixo-Medio (2-3 dias). Backend minimo (endpoint para yield+CAGR de um ticker).

---

### 7.3 Comparador de Corretoras

**O que e:** Comparar corretoras lado a lado em comissoes, produtos disponiveis, regulacao, etc.

**Porque:**
- Pergunta #1 de investidores iniciantes: "Que corretora usar?"
- Ligacao natural com o diretorio de marcas/entidades
- Conteudo evergreen — atrai SEO e utilizadores novos
- Monetizavel: corretoras pagam por featured placement

**Implementacao:**

```
┌─────────────────────────────────────────────────────────────┐
│  Comparador de Corretoras         [Degiro] vs [IBKR] vs [+]│
│                                                             │
│                  │ Degiro      │ Interactive Brokers          │
│  ────────────────┼─────────────┼──────────────────────────── │
│  Comissao acoes  │ €2 + 0.03% │ $0.005/acao (min $1)        │
│  Comissao ETFs   │ Gratis (sel)│ $0.005/acao                 │
│  Comissao cripto │ N/A         │ 0.18% maker                 │
│  Regulador       │ AFM (NL)    │ FCA/SEC/MAS                 │
│  Acoes PT        │ ✅           │ ✅                           │
│  Acoes US        │ ✅           │ ✅                           │
│  ETFs europeus   │ ✅ (gratis)  │ ✅                           │
│  Opcoes          │ ✅           │ ✅ (melhor)                  │
│  Conta demo      │ ❌           │ ✅                           │
│  App mobile      │ ✅           │ ✅                           │
│  Rating FinHub   │ 4.2/5       │ 4.5/5                       │
│  ────────────────┼─────────────┼──────────────────────────── │
│  Ideal para      │ Iniciantes  │ Traders ativos               │
└─────────────────────────────────────────────────────────────┘
```

**Dados:** Podem vir do DirectoryEntry (campos extras: comissoes, produtos, regulador) ou de um model dedicado `BrokerComparison`.

**Esforco:** Medio (3-4 dias). Requer dados curados (admin insere).

---

### 7.4 Calculadora de Impostos sobre Investimentos (PT)

**O que e:** "Comprei X acoes a Y€, vendi a Z€. Quanto pago de impostos?"

**Porque:**
- Dor real de investidores portugueses — regime fiscal complexo
- Nenhuma ferramenta gratuita faz isto bem em PT
- Diferenciador enorme vs competidores internacionais
- Conteudo educativo integrado (explicar as regras)

**Implementacao:**

```
Inputs:
  - Tipo de ativo: [Acoes PT / Acoes estrangeiras / ETFs / Cripto / REITs]
  - Data compra: [15/03/2023]
  - Data venda: [06/03/2026]
  - Preco compra: [€50]
  - Preco venda: [€80]
  - Quantidade: [100]
  - Dividendos recebidos: [€500]
  - Custos (comissoes): [€10]
  - Regime fiscal: [Tributacao autonoma / Englobamento]

Outputs:
  - Mais-valia: €2.990 (€30 × 100 - €10 comissoes)
  - Imposto mais-valias (28%): €837,20
  - Imposto dividendos (28%): €140
  - Total imposto: €977,20
  - Se englobamento (escalao 28,5%): €996,15 → Autonoma e melhor ✅
  - Retorno liquido: €2.012,80
  - Retorno liquido %: 40,3%

  Notas:
  - Acoes detidas > 365 dias: sim (sem beneficio em PT, ao contrario de outros paises)
  - Acoes PT vs estrangeiras: sem diferenca fiscal
  - Cripto: tributacao a 28% desde 2023 (detidas < 365 dias)
  - ETFs: tributacao como acoes (28% autonoma)
```

**Regras fiscais PT a implementar:**
- Mais-valias: 28% taxa autonoma OU englobamento (recomendacao automatica)
- Dividendos: 28% retidos na fonte OU englobamento (14.5% se englobado em escalao baixo)
- Cripto: 28% se detidas < 365 dias; isentas se > 365 dias (desde 2023)
- Custos dedutivos: comissoes, taxas de custodia
- Perdas: compensaveis com ganhos do mesmo tipo nos 5 anos seguintes

**Esforco:** Medio (3-4 dias). Zero API calls, logica fiscal codificada.

---

### 7.5 Screener de Acoes / ETFs

**O que e:** Filtrar acoes/ETFs por criterios fundamentais: "Mostra-me acoes com dividend yield > 3%, P/E < 20, ROE > 15%".

**Porque:**
- Ferramenta core de qualquer plataforma de investimento
- Complementa a analise individual (descoberta vs analise)
- Pode alimentar o FIRE simulator e a watchlist
- SEO excelente ("screener de acoes Portugal")

**Implementacao:**

```
Filtros:
  - Dividend yield: [min 3%] [max ___]
  - P/E ratio: [min ___] [max 20]
  - ROE: [min 15%] [max ___]
  - Market cap: [> €1B]
  - Sector: [Technology / Healthcare / ...]
  - Pais/Mercado: [US / Europa / PT]
  - FinHub Score: [> 60]

Resultados: tabela com 20+ acoes, sortable por qualquer coluna.
Acao: [+ Watchlist] [Analisar] [Comparar]
```

**Limitacao FMP:** O FMP Starter nao tem endpoint de screening bulk. Opcoes:
- **(a)** Construir cache local: correr analise periodica de um universo fixo (S&P 500, STOXX 600, PSI) e guardar em MongoDB. Screener consulta cache local.
- **(b)** FMP `/stock-screener` no plano Premium.
- **(c)** Financialmodelingprep bulk downloads (free tier tem historico anual gratis).

**Recomendacao:** Opcao (a) — universo de ~1000 acoes analisadas semanalmente com cron job. O mais viavel sem custos extra.

**Esforco:** Alto (5-7 dias). Backend: cron job + cache. Frontend: tabela com filtros.

---

### 7.6 Calculadora de Custo Medio (DCA Calculator)

**O que e:** "Se investir €300/mes num ETF, qual seria o meu preco medio e retorno ate hoje?"

**Porque:**
- DCA (Dollar Cost Averaging) e a estrategia mais recomendada para iniciantes
- Visualizar o beneficio historico do DCA vs lump sum e muito persuasivo
- Usa precos historicos (Yahoo Finance) — dados ja necessarios para o FIRE simulator

**Implementacao:**

```
Inputs:
  - Ticker: [VWCE.DE]
  - Investimento mensal: [€300]
  - Data inicio: [Janeiro 2020]
  - Data fim: [Hoje]

Outputs:
  - Total investido: €22.200 (74 meses × €300)
  - Valor atual: €31.500
  - Retorno: +41.9% (+€9.300)
  - Preco medio: €87.23 (vs preco atual €99.80)
  - Melhor mes de compra: Mar 2020 (€68.50) — comprou 4.38 shares
  - Pior mes de compra: Nov 2021 (€108.20) — comprou 2.77 shares
  - Grafico: preco do ativo + linha de preco medio DCA ao longo do tempo
```

**Esforco:** Medio (2-3 dias). Requer precos historicos mensais (Yahoo Finance).

---

### 7.7 Glossario Financeiro Interativo

**O que e:** Dicionario de termos financeiros com explicacoes simples, exemplos praticos, e links para ferramentas relevantes.

**Porque:**
- Literacia financeira e o objetivo central da plataforma
- SEO excelente — cada termo e uma pagina indexavel
- Conteudo evergreen — cria-se uma vez, gera trafego para sempre
- Onboarding tool — ajuda utilizadores novos a entender os indicadores das ferramentas
- Rota `/aprender/glossario` ja existe (placeholder)

**Implementacao:**

```
Termos: ~100-200 termos financeiros
  - P/E Ratio: "O preco que pagas por cada euro de lucro da empresa..."
  - FIRE: "Financial Independence, Retire Early..."
  - Dividend Yield: "A percentagem do preco da acao que recebes em dividendos..."
  - Cap Rate: "A taxa de retorno esperada de um imovel..."

Cada termo tem:
  - Definicao simples (1-2 frases)
  - Exemplo pratico (com numeros reais)
  - Link para ferramenta relevante ("Calcula o P/E de qualquer acao →")
  - Termos relacionados
  - Nivel (iniciante / intermedio / avancado)
```

**Modelo:** Pode ser um content type simples ou ate hardcoded em JSON (nao precisa de backend complexo).

**Esforco:** Baixo-Medio (2-3 dias tecnico + tempo de escrita de conteudo).

---

## 8. Resumo: prioridades por ferramenta

### Fixes criticos (bugs/dados errados)

| # | Ferramenta | Problema | Esforco |
|---|-----------|----------|---------|
| 1 | **Crypto** | Market cap usa volume em vez de price × supply | Baixo (trocar para CoinGecko) |
| 2 | **ETF Overlap** | Dados sao simulados, nao reais | Baixo (disclaimer honesto) |
| 3 | **Watchlist** | N calls paralelas por N tickers, stale time 60s | Baixo (batch endpoint + 5min cache) |

### Melhorias de alto impacto (existente)

| # | Ferramenta | Melhoria | Esforco |
|---|-----------|----------|---------|
| 4 | **Acoes** | Mostrar data quality score + frescura dos dados | Baixo |
| 5 | **Acoes** | Adicionar cash flow quality, FCF yield, forward P/E | Medio |
| 6 | **Acoes** | Comparacao lado a lado (2 acoes) | Medio |
| 7 | **REIT** | Historico FFO + dividendo 5 anos (tab nova) | Medio |
| 8 | **REIT** | Peer comparison (P/FFO, yield, debt vs sector) | Medio |
| 9 | **Crypto** | Adicionar coluna 24h % change (verde/vermelho) | Baixo |
| 10 | **Crypto** | Sorting por colunas (header clickavel) | Baixo |
| 11 | **Watchlist** | Persistencia no backend (sync cross-device) | Medio |
| 12 | **Watchlist** | Badge 24h % change nos cards | Baixo |
| 13 | **Markets Hub** | Dashboard ao vivo (indices, top movers) | Medio |
| 14 | **ETF** | Mostrar expense ratio (TER) lado a lado | Baixo |

### Novas ferramentas (por prioridade)

| # | Ferramenta | Porque | Esforco | Dependencias |
|---|-----------|--------|---------|-------------|
| 15 | **Juros compostos** | SEO magnet, zero custo, gateway para FIRE | Baixo | Nenhuma |
| 16 | **Dividendos calculator** | Grande audiencia income investors, usa FMP | Baixo-Medio | FMP (ja integrada) |
| 17 | **Impostos PT** | Diferenciador unico, dor real, zero API | Medio | Nenhuma |
| 18 | **Glossario financeiro** | SEO evergreen, literacia, onboarding | Baixo-Medio | Conteudo escrito |
| 19 | **DCA calculator** | Visualiza beneficio do DCA, persuasivo | Medio | Precos historicos (Yahoo) |
| 20 | **Comparador corretoras** | #1 pergunta de iniciantes, monetizavel | Medio | Dados curados (admin) |
| 21 | **FIRE simulator** | Feature flagship, diferenciador (ver P5_FIRE) | Alto | Portfolio model, precos historicos |
| 22 | **Screener de acoes** | Descoberta, core tool | Alto | Cache de universo de acoes |

---

## 9. Quick wins — podem ser feitos em 1-2 dias cada

1. **Calculadora de juros compostos** — frontend only, zero backend
2. **Fix market cap crypto** — trocar Binance por CoinGecko para market cap
3. **Batch endpoint watchlist** — 1 endpoint, elimina N calls
4. **24h % change** no crypto e watchlist — dados ja disponiveis na API
5. **Disclaimer honesto no ETF overlap** — "Estimativa por sector. Para holdings reais, ver Yahoo Finance"
6. **Data quality badge** nas acoes — valor ja calculado, so falta mostrar
7. **Sorting nas tabelas** de crypto — header clickavel
8. **Expense ratio nos ETFs** — adicionar campo da FMP profile

---

## 10. Visao a longo prazo — ecosystem de ferramentas

```
Utilizador novo
  └─ Glossario (aprende termos)
  └─ Calculadora juros compostos (entende o poder do tempo)
  └─ Comparador de corretoras (escolhe onde investir)
  └─ Screener (descobre acoes/ETFs)
  └─ Analise detalhada (avalia cada ativo)
  └─ Simulador DCA (valida estrategia)
  └─ Portfolio FIRE (monta carteira com objetivo)
  └─ Calculadora de impostos (planeia fiscalmente)
  └─ Watchlist (acompanha mercado)
  └─ Dashboard de mercado (ve tendencias)

Cada ferramenta alimenta a seguinte.
O utilizador fica na plataforma porque tem tudo num so sitio.
```
