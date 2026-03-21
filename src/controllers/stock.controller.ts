import { Request, Response } from 'express'
import axios from 'axios'
import {
  fetchProfile,
  fetchScores,
  fetchPeers,
  fetchAlerts,
  fetchIndicadores,
  fetchRadarWithPeers,
  fetchBenchmarkComparisons
} from '../utils/stockFetchers'
import { buildQuickMetricGovernance } from '../utils/quickAnalysisMetrics'
import { fillDerivedCurrentIndicadores } from '../utils/quickAnalysisDerivedMetrics'
import { computeDataQualityScore, computeSectorContextScore } from '../utils/quickAnalysisSectorScoring'
import { cacheService, CacheKeys, CacheStrategies } from '../services/cacheService'

const FMP_API_KEY = process.env.FMP_API_KEY
const MAX_BATCH_SYMBOLS = 50
const BATCH_CACHE_HINT_SECONDS = 300
const BATCH_REQUEST_TIMEOUT_MS = 10000
const BATCH_SYMBOL_REGEX = /^[A-Z0-9.\-]{1,20}$/

interface BatchQuoteRecord {
  symbol?: string
  name?: string
  price?: number
  marketCap?: number
  volume?: number
  changePercentage?: number
  changesPercentage?: number
}

interface BatchSnapshotItem {
  symbol: string
  name: string | null
  price: number
  marketCap: number
  volume: number
  change24hPercent: number
  sector: string | null
}

const normalizeRecords = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') return [value as T]
  return []
}

const collectBatchSymbolTokens = (rawValue: unknown, target: string[]) => {
  if (typeof rawValue === 'string') {
    const tokens = rawValue.split(/[,\s;]+/)
    for (const token of tokens) {
      if (token) target.push(token)
    }
    return
  }

  if (Array.isArray(rawValue)) {
    for (const value of rawValue) {
      collectBatchSymbolTokens(value, target)
    }
  }
}

const parseBatchSymbols = (...rawValues: unknown[]): string[] => {
  const rawTokens: string[] = []
  for (const rawValue of rawValues) {
    collectBatchSymbolTokens(rawValue, rawTokens)
  }

  const symbols: string[] = []
  const seen = new Set<string>()

  for (const token of rawTokens) {
    const symbol = token.trim().toUpperCase()
    if (!BATCH_SYMBOL_REGEX.test(symbol) || seen.has(symbol)) continue
    symbols.push(symbol)
    seen.add(symbol)
    if (symbols.length >= MAX_BATCH_SYMBOLS) break
  }

  return symbols
}

const toFiniteNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const buildFallbackBatchItems = (symbols: string[]): BatchSnapshotItem[] =>
  symbols.map((symbol) => ({
    symbol,
    name: symbol,
    price: 0,
    marketCap: 0,
    volume: 0,
    change24hPercent: 0,
    sector: null,
  }))

const buildBatchSnapshotItems = (
  symbols: string[],
  quotes: BatchQuoteRecord[]
): BatchSnapshotItem[] => {
  const quoteBySymbol = new Map<string, BatchQuoteRecord>()
  for (const quote of quotes) {
    const symbol = String(quote.symbol ?? '').toUpperCase()
    if (symbol) quoteBySymbol.set(symbol, quote)
  }

  return symbols.map((symbol) => {
    const quote = quoteBySymbol.get(symbol)

    return {
      symbol,
      name: quote?.name ?? symbol,
      price: toFiniteNumber(quote?.price),
      marketCap: toFiniteNumber(quote?.marketCap),
      volume: toFiniteNumber(quote?.volume),
      change24hPercent: toFiniteNumber(quote?.changePercentage ?? quote?.changesPercentage),
      sector: null,
    }
  })
}

function simplifyRating(rating: string): 'A' | 'B' | 'C' | 'D' | 'F' {
  const char = rating?.[0]?.toUpperCase() ?? 'C'
  return ['A', 'B', 'C', 'D', 'F'].includes(char) ? (char as any) : 'C'
}

// B1 — Growth Score baseado em CAGRs próprios (em vez do DCF opaco do FMP)
function computeGrowthScore(
  cagrEps: number | null,
  revenueGrowth: number | null,
  dcfScore?: number | null
): number {
  const fallback = (dcfScore ?? 3) * 2  // 0-10 via DCF (0-5 × 2)

  const components: number[] = []

  // CAGR EPS: 0% → 5, 20% → 8.3, 30% → 10, -15% → 0
  if (cagrEps !== null && isFinite(cagrEps)) {
    const eps100 = cagrEps * 100
    const epsScore = Math.max(0, Math.min(10, 5 + eps100 / 6))
    components.push(epsScore)
  }

  // Revenue Growth: 0% → 3, 15% → 9, 25% → 10, -10% → 0
  if (revenueGrowth !== null && isFinite(revenueGrowth)) {
    const rev100 = revenueGrowth * 100
    const revScore = Math.max(0, Math.min(10, 3 + rev100 / 1.6))
    components.push(revScore)
  }

  if (components.length === 0) return Math.round(fallback * 10) / 10

  // Blenda componentes próprios (70%) com DCF fallback (30%) para suavizar
  const ownScore = components.reduce((a, b) => a + b, 0) / components.length
  const blended = ownScore * 0.7 + fallback * 0.3
  return Math.round(blended * 10) / 10
}

// B2 — FinHub Score composto (0-100) com cobertura
function computeFinHubScore(
  qualityScore: number,
  growthScore: number,
  valuationGrade: string,
  riskScore: number
): { score: number; label: string; coverage: number } {
  // Normalizar cada componente para 0-100
  const qualityNorm  = Math.min((qualityScore / 9) * 100, 100)      // Piotroski 0-9
  const growthNorm   = Math.min((growthScore / 10) * 100, 100)       // 0-10
  const valuationNorm = { A: 90, B: 75, C: 55, D: 35, F: 20 }[valuationGrade as 'A'|'B'|'C'|'D'|'F'] ?? 55
  const riskNorm     = Math.min((riskScore / 10) * 100, 100)         // Altman Z 0-10

  const score = Math.round(
    qualityNorm  * 0.25 +
    growthNorm   * 0.25 +
    valuationNorm * 0.25 +
    riskNorm     * 0.25
  )

  const label =
    score >= 75 ? 'Forte' :
    score >= 55 ? 'Sólido' :
    score >= 40 ? 'Neutro' :
    'Fraco'

  return { score, label, coverage: 4 }
}

const buildQuickAnalysisPayload = async (symbol: string) => {
  const profile = await fetchProfile(symbol)

  const industry = (profile as any).industry?.toLowerCase() ?? ''
  const sector = (profile as any).sector?.toLowerCase() ?? ''
  const companyTypeHint = {
    isBanco: industry.includes('banks') || industry.includes('banking'),
    isREIT: industry.includes('reit') || (sector.includes('real estate') && !industry.includes('services')),
    isPaymentProcessor: industry.includes('credit services') || industry.includes('payment'),
  }

  const [scores, alerts, radarWithPeers, indicadoresOutput, { peers, quotes }] = await Promise.all([
    fetchScores(symbol),
    fetchAlerts(symbol),
    fetchRadarWithPeers(symbol, companyTypeHint),
    fetchIndicadores(symbol),
    fetchPeers(symbol),
  ])

  const { indicadores, rawForScoring } = indicadoresOutput
  const derivedCurrent = fillDerivedCurrentIndicadores({
    indicadores,
    ratios: scores.ratios ?? rawForScoring.quickFallbackData?.ratios ?? null,
    metrics: rawForScoring.quickFallbackData?.metrics ?? null,
    historicalRatios: rawForScoring.quickFallbackData?.historicalRatios ?? [],
    keyMetricsHistorical: rawForScoring.quickFallbackData?.keyMetricsHistorical ?? [],
    income: rawForScoring.quickFallbackData?.income ?? null,
    balance: rawForScoring.quickFallbackData?.balance ?? null,
    balanceY1: rawForScoring.quickFallbackData?.balanceY1 ?? null,
    cashflow: rawForScoring.quickFallbackData?.cashflow ?? null,
    growth: rawForScoring.quickFallbackData?.growth ?? null,
  })

  const indicadoresEnriched = derivedCurrent.indicadores
  const benchmarkPack = await fetchBenchmarkComparisons({
    symbol,
    sector: profile.sector ?? '',
    industry: profile.industry ?? '',
    peers,
    exchangeShortName: (profile as any).exchangeShortName,
  })

  const quickMetricGovernance = buildQuickMetricGovernance({
    sector: profile.sector ?? '',
    indicadores: indicadoresEnriched,
    calculatedMetricsByLabel: derivedCurrent.calculatedByLabel,
    benchmarkComparisons: benchmarkPack.comparisons,
    benchmarkMetadata: benchmarkPack.metadata,
    currentDataPeriod: rawForScoring.dataPeriod ?? null,
    benchmarkAsOf: benchmarkPack.context.asOf,
    asOf: benchmarkPack.context.asOf,
  })
  const dataQualityScore = computeDataQualityScore(quickMetricGovernance)

  const qualityScore = scores.financialScores?.piotroskiScore ?? 0
  const riskScore = Math.min(scores.financialScores?.altmanZScore ?? 5, 10)
  const valuationGrade = simplifyRating(scores.rating?.rating || 'C')

  const growthScore = computeGrowthScore(
    rawForScoring.cagrEps,
    rawForScoring.revenueGrowth,
    scores.rating?.ratingDetailsDCFScore,
  )

  const finHubScore = computeFinHubScore(qualityScore, growthScore, valuationGrade, riskScore)
  const sectorContextScore = computeSectorContextScore({
    finHubScore: finHubScore.score,
    governance: quickMetricGovernance,
    sector: quickMetricGovernance.ingestion.resolvedSector ?? profile.sector ?? 'Unknown',
  })

  return {
    ...profile,
    qualityScore,
    growthScore,
    valuationGrade,
    valuationRawGrade: scores.rating?.rating || 'C+',
    riskScore,
    piotroskiScore: scores.financialScores?.piotroskiScore ?? null,
    altmanZScore: scores.financialScores?.altmanZScore ?? null,
    finHubScore: finHubScore.score,
    finHubLabel: finHubScore.label,
    finHubCoverage: finHubScore.coverage,
    sectorContextScore,
    dataQualityScore,
    dataPeriod: rawForScoring.dataPeriod ?? 'TTM',
    alerts,
    radarData: radarWithPeers.main.radar,
    radarPeers: radarWithPeers.peers,
    indicadores: indicadoresEnriched,
    benchmarkComparisons: benchmarkPack.comparisons,
    benchmarkMetadata: benchmarkPack.metadata,
    benchmarkContext: benchmarkPack.context,
    quickMetricContractVersion: quickMetricGovernance.contractVersion,
    quickMetricCatalog: quickMetricGovernance.catalog,
    quickMetricStates: quickMetricGovernance.states,
    quickMetricIngestion: quickMetricGovernance.ingestion,
    quickMetricSummary: quickMetricGovernance.summary,
    peers,
    peersQuotes: quotes,
  }
}

export const getQuickAnalysis = async (req: Request, res: Response) => {
  const symbol = String(req.params.symbol ?? '')
    .trim()
    .toUpperCase()

  if (!symbol) {
    return res.status(400).json({ error: 'Simbolo invalido.' })
  }

  try {
    const cacheKey = CacheKeys.market.fundamentals(symbol)
    const quickAnalysis = await cacheService.remember(
      cacheKey,
      () => buildQuickAnalysisPayload(symbol),
      CacheStrategies.MARKET_FUNDAMENTALS,
    )

    return res.json(quickAnalysis)
  } catch (error) {
    console.error('Erro ao gerar análise rápida:', error)
    return res.status(500).json({ error: 'Erro ao gerar análise rápida' })
  }
}

/**
 * Snapshot em lote para watchlist (1 chamada em vez de N quick-analysis).
 * GET /api/stocks/batch-snapshot?symbols=AAPL,MSFT,GOOGL
 */
export const getBatchSnapshot = async (req: Request, res: Response) => {
  try {
    const symbols = parseBatchSymbols(req.query.symbols, req.query.symbol)

    if (symbols.length === 0) {
      return res.status(400).json({
        error: 'Parametro symbols invalido. Ex: ?symbols=AAPL,MSFT,GOOGL ou ?symbol=AAPL,MSFT',
      })
    }

    const joinedSymbols = symbols.join(',')
    const cacheKey = CacheKeys.market.batchSnapshot(joinedSymbols)
    const responseBody = await cacheService.remember<{
      items: BatchSnapshotItem[]
      requested: number
      returned: number
      staleTimeSeconds: number
      source: string
      degraded?: boolean
      warning?: string
    }>(
      cacheKey,
      async () => {
        const fallbackItems = buildFallbackBatchItems(symbols)

        if (!FMP_API_KEY) {
          return {
            items: fallbackItems,
            requested: symbols.length,
            returned: 0,
            staleTimeSeconds: BATCH_CACHE_HINT_SECONDS,
            source: 'watchlist_batch_fallback',
            degraded: true,
            warning: 'FMP_API_KEY nao configurada.',
          }
        }

        let items: BatchSnapshotItem[] = fallbackItems
        let source = 'fmp_v3_quote_batch'
        let degraded = false
        let warning: string | undefined

        try {
          const quotesResponse = await axios.get(
            `https://financialmodelingprep.com/v3/quote/${joinedSymbols}?apikey=${FMP_API_KEY}`,
            { timeout: BATCH_REQUEST_TIMEOUT_MS },
          )

          const quotes = normalizeRecords<BatchQuoteRecord>(quotesResponse.data)
          items = buildBatchSnapshotItems(symbols, quotes)
        } catch (batchError: unknown) {
          const batchErrorMessage =
            batchError instanceof Error ? batchError.message : String(batchError)
          console.error(
            '[watchlist-batch] Falha ao obter batch quote FMP v3 para symbols=%s: %s',
            joinedSymbols,
            batchErrorMessage,
          )
          source = 'watchlist_batch_fallback'
          degraded = true
          warning = 'Falha no provider externo de mercado; devolvido fallback local por simbolo.'
        }

        const payload: {
          items: BatchSnapshotItem[]
          requested: number
          returned: number
          staleTimeSeconds: number
          source: string
          degraded?: boolean
          warning?: string
        } = {
          items,
          requested: symbols.length,
          returned: items.filter((item) => item.price > 0 || item.marketCap > 0).length,
          staleTimeSeconds: BATCH_CACHE_HINT_SECONDS,
          source,
        }

        if (degraded) {
          payload.degraded = true
          if (warning) payload.warning = warning
        }

        return payload
      },
      CacheStrategies.WATCHLIST,
    )

    return res.status(200).json(responseBody)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Erro ao gerar snapshot em lote da watchlist:', errorMessage)
    return res.status(500).json({
      error: 'Erro ao gerar snapshot em lote da watchlist.',
      details: errorMessage,
    })
  }
}
