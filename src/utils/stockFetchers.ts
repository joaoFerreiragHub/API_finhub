// src/utils/stockFetchers.ts

import axios from 'axios'
import YahooFinance from 'yahoo-finance2'
import { IndicadoresResult } from './financial/types'
import { fetchRawFinancialData } from './financial/dataFetcher'
import { calculateEPSMetrics } from './financial/epsCalculator'
import { getSectorConfig } from './sectorConfig'
import { resolveAnalysisSector } from './analysisSector'

import {
  buildIndicadoresResult,
  RawScoringData,
  QuickAnalysisFallbackData,
} from './financial/resultBuilder'
import { calculateDerivedMetrics } from './financial/derivedMetricsCalculator'


const FMP_STABLE = 'https://financialmodelingprep.com/stable'
const API_KEY = process.env.FMP_API_KEY
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const fetch = (url: string) => axios.get(url).then((res) => res.data)

type BenchmarkSource =
  | 'peer_median'
  | 'industry_snapshot'
  | 'sector_snapshot'
  | 'google_finance'
  | 'yahoo_finance'
  | 'fallback'

export interface BenchmarkComparisonsContext {
  asOf: string
  sector: string
  industry: string
  peerCount: number
  googleAttempted: boolean
  googleAvailable: boolean
  yahooFallbackUsed: boolean
  fallbackMetrics: number
  primarySource: 'dynamic' | 'fallback' | 'mixed'
}

export interface BenchmarkComparisonsOutput {
  comparisons: Record<string, string>
  metadata: Record<string, { source: BenchmarkSource; sampleSize?: number }>
  context: BenchmarkComparisonsContext
}

type PeerMetrics = {
  eps: number | null
  epsGrowth: number | null
  pe: number | null
  ps: number | null
  pb: number | null
  peg: number | null
  roe: number | null
  roic: number | null
  grossMargin: number | null
  ebitdaMargin: number | null
  netMargin: number | null
  operatingMargin: number | null
  currentRatio: number | null
  debtToEbitda: number | null
  debtEquity: number | null
  beta: number | null
  dividendYield: number | null
  payoutRatio: number | null
  revenueGrowth: number | null
  cashRatio: number | null
}

type PeerMetricsFetchResult = {
  metrics: PeerMetrics
  yahooUsed: boolean
}

const DASH = '\u2014'

function toNumber(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!isFinite(n)) return null
  return n
}

function median(values: number[]): number | null {
  const clean = values.filter((v) => isFinite(v))
  if (clean.length === 0) return null
  const sorted = [...clean].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function formatMetric(value: number | null, percent = false): string {
  if (value == null || !isFinite(value)) return DASH
  if (percent) return `${(value * 100).toFixed(2)}%`
  return value.toFixed(2)
}

function normalizeDebtEquityValue(value: number | null): number | null {
  if (value == null || !isFinite(value)) return null
  if (value > 50) return value / 100
  return value
}

type IncomeStatement = {
  netIncome: number
  dividendPerShare?: number
}

type CashFlowStatement = {
  freeCashFlow?: number
  operatingCashFlow: number
  capitalExpenditure: number
}

// 1. Perfil da empresa
export async function fetchProfile(symbol: string) {
  const data = await fetch(`${FMP_STABLE}/profile?symbol=${symbol}&apikey=${API_KEY}`)
  const company = data?.[0]
  if (!company) throw new Error(`Perfil não encontrado para ${symbol}`)
  const sectorResolution = resolveAnalysisSector({
    symbol: company.symbol,
    sector: company.sector,
    industry: company.industry,
  })
  return {
    symbol: company.symbol,
    name: company.companyName,
    industry: company.industry,
    sector: sectorResolution.analysisSector,
    sectorRaw: company.sector,
    analysisSectorReason: sectorResolution.reason,
    exchangeShortName: company.exchangeShortName || company.exchange || 'NASDAQ',
    description: company.description,
    ceo: company.ceo,
    website: company.website,
    image: company.image,
    ipoDate: company.ipoDate,
    price: company.price,
    marketCap: company.marketCap,
    beta: company.beta,
    lastDividend: company.lastDividend,
    employees: company.fullTimeEmployees,
    address: `${company.address}, ${company.city}, ${company.state}, ${company.zip}, ${company.country}`
  }
}

// 2. Scores (rating + ratios)
export async function fetchScores(symbol: string) {
  console.log(`🔍 Buscando scores para ${symbol}...`)
  
  // 🛡️ FETCH SEGURO: Função helper para lidar com falhas individuais
  const safeFetch = async (url: string, description: string) => {
    try {
      console.log(`📡 Tentando buscar ${description}...`)
      const result = await fetch(url)
      console.log(`✅ ${description} obtido com sucesso`)
      return result
    } catch (error) {

      return null
    }
  }

  // 🔄 BUSCAR DADOS COM TRATAMENTO INDIVIDUAL DE ERROS
  const [ratios, rating, financialScores] = await Promise.all([
    safeFetch(`${FMP_STABLE}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Ratios TTM'),
    safeFetch(`${FMP_STABLE}/ratings-snapshot?symbol=${symbol}&apikey=${API_KEY}`, 'Rating'),
    safeFetch(`${FMP_STABLE}/financial-scores?symbol=${symbol}&apikey=${API_KEY}`, 'Financial Scores')
  ])

  return {
    ratios: ratios?.[0] || null,
    rating: rating?.[0] || null,
    financialScores: financialScores?.[0] || null
  }
}



// Formatar período do income statement (ex: "2024-09-30", "FY" → "FY 2024" | "Q3 2024")
function formatReportPeriod(date?: string | null, period?: string | null): string | null {
  if (!date) return null
  const year = date.slice(0, 4)
  if (!period || period === 'FY') return `FY ${year}`
  if (period === 'Q1' || period === 'Q2' || period === 'Q3' || period === 'Q4') return `${period} ${year}`
  return `${year}`
}

// 3. Peers + quotes
export async function fetchPeers(symbol: string) {
  try {
    const peersData = await fetch(`${FMP_STABLE}/stock-peers?symbol=${symbol}&apikey=${API_KEY}`)
    const peers = peersData?.[0]?.peersList?.slice(0, 5) || []
    const quotes = peers.length > 0
      ? await fetch(`${FMP_STABLE}/quote?symbol=${peers.join(',')}&apikey=${API_KEY}`)
      : []
    return { peers, quotes }
  } catch (error) {
    console.warn(`⚠️ fetchPeers falhou para ${symbol}`)
    return { peers: [], quotes: [] }
  }
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase()
}

function getFirstRecord(data: unknown): Record<string, unknown> {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
    return data[0] as Record<string, unknown>
  }
  return {}
}

function extractGooglePERatio(html: string): number | null {
  const patterns = [
    /"P\/E ratio"[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i,
    /P\/E ratio<\/div><div[^>]*>([0-9]+(?:\.[0-9]+)?)/i,
    /"peRatio"[^0-9\-]*([0-9]+(?:\.[0-9]+)?)/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    const parsed = match?.[1] ? Number(match[1]) : null
    if (parsed != null && isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

async function tryGoogleFinanceQuote(
  symbol: string,
  exchangeShortName?: string,
): Promise<{ available: boolean; peRatio: number | null }> {
  const rawExchange = exchangeShortName?.trim().toUpperCase()
  const exchangeCandidates = rawExchange ? [rawExchange] : ['NASDAQ', 'NYSE']

  for (const exchange of exchangeCandidates) {
    const url = `https://www.google.com/finance/quote/${symbol}:${exchange}`
    try {
      const response = await axios.get<string>(url, {
        timeout: 1500,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        validateStatus: (status) => status >= 200 && status < 500,
      })

      if (response.status >= 200 && response.status < 300 && typeof response.data === 'string') {
        return {
          available: response.data.includes('Google Finance'),
          peRatio: extractGooglePERatio(response.data),
        }
      }
    } catch (error) {
      // Best-effort only: ignore Google transient errors.
    }
  }

  return { available: false, peRatio: null }
}

async function fetchPESnapshot(
  kind: 'industry' | 'sector',
  target: string,
  exchangeShortName?: string,
): Promise<number | null> {
  if (!target?.trim()) return null

  const today = new Date().toISOString().split('T')[0]
  const exchange = exchangeShortName?.trim().toUpperCase() || 'NASDAQ'
  const paths =
    kind === 'industry'
      ? ['industry-price-earning-ratio', 'industry-pe-snapshot', 'industry-pe']
      : ['sector-price-earning-ratio', 'sector-pe-snapshot', 'sector-pe']

  for (const path of paths) {
    const url = `${FMP_STABLE}/${path}?date=${today}&exchange=${encodeURIComponent(exchange)}&apikey=${API_KEY}`
    try {
      const data = await fetch(url)
      if (!Array.isArray(data) || data.length === 0) continue

      const normalizedTarget = normalizeLabel(target)
      const match = data.find((row: Record<string, unknown>) => {
        const rowName = String(
          row[kind] ??
            row.name ??
            row.label ??
            row.industry ??
            row.sector ??
            row.group ??
            '',
        )
        return normalizeLabel(rowName) === normalizedTarget
      })

      const partialMatch =
        match ??
        data.find((row: Record<string, unknown>) => {
          const rowName = String(
            row[kind] ??
              row.name ??
              row.label ??
              row.industry ??
              row.sector ??
              row.group ??
              '',
          )
          const normalized = normalizeLabel(rowName)
          return normalized.includes(normalizedTarget) || normalizedTarget.includes(normalized)
        })

      const pe = toNumber(
        partialMatch?.pe ??
          partialMatch?.peRatio ??
          partialMatch?.priceEarningsRatio ??
          partialMatch?.priceEarnings,
      )
      if (pe != null && pe > 0) return pe
    } catch (error) {
      // Keep trying alternative endpoint names.
    }
  }

  return null
}

async function fetchYahooPeerMetrics(symbol: string): Promise<Partial<PeerMetrics> | null> {
  try {
    const summaryRaw = await yahooFinance
      .quoteSummary(symbol, {
        modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics'],
      })
      .catch(() => null)

    if (!summaryRaw || typeof summaryRaw !== 'object') return null

    const summary = summaryRaw as Record<string, unknown>
    const summaryDetail = (summary.summaryDetail ?? {}) as Record<string, unknown>
    const financialData = (summary.financialData ?? {}) as Record<string, unknown>
    const defaultStats = (summary.defaultKeyStatistics ?? {}) as Record<string, unknown>

    const debtEquity = normalizeDebtEquityValue(
      toNumber(financialData.debtToEquity ?? defaultStats.debtToEquity),
    )

    const metrics: Partial<PeerMetrics> = {
      eps: toNumber(defaultStats.trailingEps ?? financialData.epsTrailingTwelveMonths),
      epsGrowth: toNumber(financialData.earningsGrowth ?? defaultStats.earningsGrowth),
      pe: toNumber(summaryDetail.trailingPE ?? defaultStats.trailingPE),
      ps: toNumber(summaryDetail.priceToSalesTrailing12Months ?? defaultStats.priceToSalesTrailing12Months),
      pb: toNumber(summaryDetail.priceToBook ?? defaultStats.priceToBook),
      peg: toNumber(defaultStats.pegRatio ?? financialData.pegRatio),
      roe: toNumber(financialData.returnOnEquity ?? defaultStats.returnOnEquity),
      roic: toNumber(financialData.returnOnAssets ?? defaultStats.returnOnAssets),
      grossMargin: toNumber(financialData.grossMargins),
      ebitdaMargin: toNumber(financialData.ebitdaMargins),
      netMargin: toNumber(financialData.profitMargins),
      operatingMargin: toNumber(financialData.operatingMargins),
      currentRatio: toNumber(financialData.currentRatio),
      debtToEbitda: null,
      debtEquity,
      beta: toNumber(summaryDetail.beta ?? defaultStats.beta),
      dividendYield: toNumber(summaryDetail.dividendYield),
      payoutRatio: toNumber(summaryDetail.payoutRatio ?? financialData.payoutRatio),
      revenueGrowth: toNumber(financialData.revenueGrowth),
      cashRatio: toNumber(financialData.quickRatio ?? financialData.currentRatio),
    }

    if (!Object.values(metrics).some((value) => value != null && isFinite(value))) {
      return null
    }

    return metrics
  } catch (error) {
    return null
  }
}

function mergePeerMetrics(
  baseMetrics: PeerMetrics,
  fallbackMetrics: Partial<PeerMetrics> | null,
): PeerMetrics {
  if (!fallbackMetrics) return baseMetrics

  const merged: PeerMetrics = { ...baseMetrics }
  for (const key of Object.keys(merged) as Array<keyof PeerMetrics>) {
    const fallbackValue = fallbackMetrics[key]
    if (merged[key] == null && fallbackValue != null && isFinite(fallbackValue)) {
      merged[key] = fallbackValue
    }
  }
  return merged
}

async function fetchPeerMetrics(symbol: string): Promise<PeerMetricsFetchResult | null> {
  try {
    const [ratiosRes, keyMetricsRes, growthRes, profileRes] = await Promise.all([
      fetch(`${FMP_STABLE}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`).catch(() => null),
      fetch(`${FMP_STABLE}/key-metrics-ttm?symbol=${symbol}&apikey=${API_KEY}`).catch(() => null),
      fetch(`${FMP_STABLE}/financial-growth?symbol=${symbol}&limit=1&apikey=${API_KEY}`).catch(() => null),
      fetch(`${FMP_STABLE}/profile?symbol=${symbol}&apikey=${API_KEY}`).catch(() => null),
    ])

    const ratios = getFirstRecord(ratiosRes)
    const metrics = getFirstRecord(keyMetricsRes)
    const growth = getFirstRecord(growthRes)
    const profile = getFirstRecord(profileRes)

    const fmpMetrics: PeerMetrics = {
      eps: toNumber(
        metrics.netIncomePerShareTTM ??
          metrics.epsTTM ??
          metrics.eps ??
          ratios.netIncomePerShareTTM,
      ),
      epsGrowth: toNumber(
        growth.epsGrowth ??
          growth.epsgrowth ??
          growth.growthEPS ??
          growth.epsGrowthTTM ??
          growth.earningsGrowth,
      ),
      pe: toNumber(ratios.peRatioTTM ?? ratios.priceEarningsRatioTTM ?? metrics.peRatioTTM ?? metrics.peRatio),
      ps: toNumber(
        ratios.priceToSalesRatioTTM ?? ratios.priceToSalesRatio ?? metrics.priceToSalesRatioTTM,
      ),
      pb: toNumber(
        ratios.priceToBookRatioTTM ??
          ratios.priceBookValueRatioTTM ??
          ratios.priceToBookRatio ??
          metrics.priceToBookRatioTTM,
      ),
      peg: toNumber(ratios.pegRatioTTM ?? ratios.pegRatio ?? metrics.pegRatioTTM ?? metrics.pegRatio),
      roe: toNumber(ratios.returnOnEquityTTM ?? metrics.returnOnEquityTTM ?? metrics.roeTTM),
      roic: toNumber(
        ratios.returnOnCapitalEmployedTTM ??
          metrics.returnOnInvestedCapitalTTM ??
          metrics.roicTTM,
      ),
      grossMargin: toNumber(ratios.grossProfitMarginTTM ?? ratios.grossProfitMargin),
      ebitdaMargin: toNumber(ratios.ebitdaratioTTM ?? ratios.ebitdaMarginTTM),
      netMargin: toNumber(ratios.netProfitMarginTTM ?? ratios.netProfitMargin),
      operatingMargin: toNumber(ratios.operatingProfitMarginTTM ?? ratios.operatingProfitMargin),
      currentRatio: toNumber(ratios.currentRatioTTM ?? metrics.currentRatioTTM),
      debtToEbitda: toNumber(
        ratios.debtToEbitdaTTM ?? ratios.netDebtToEBITDATTM ?? metrics.netDebtToEBITDATTM,
      ),
      debtEquity: toNumber(ratios.debtEquityRatioTTM ?? metrics.debtEquityRatioTTM),
      beta: toNumber(profile.beta),
      dividendYield: toNumber(
        ratios.dividendYieldTTM ?? ratios.dividendYield ?? metrics.dividendYieldTTM,
      ),
      payoutRatio: toNumber(ratios.payoutRatioTTM ?? metrics.payoutRatioTTM),
      revenueGrowth: toNumber(growth.revenueGrowth ?? growth.growthRevenue ?? growth.revenueGrowthTTM),
      cashRatio: toNumber(ratios.cashRatioTTM ?? metrics.cashRatioTTM),
    }

    const missingCount = Object.values(fmpMetrics).filter((value) => value == null).length
    const yahooMetrics = missingCount > 0 ? await fetchYahooPeerMetrics(symbol) : null
    const mergedMetrics = mergePeerMetrics(fmpMetrics, yahooMetrics)
    const yahooUsed = Boolean(
      yahooMetrics &&
        (Object.keys(mergedMetrics) as Array<keyof PeerMetrics>).some(
          (key) => fmpMetrics[key] == null && mergedMetrics[key] != null,
        ),
    )

    if (!hasAnyPeerMetric(mergedMetrics)) return null

    return {
      metrics: mergedMetrics,
      yahooUsed,
    }
  } catch (error) {
    return null
  }
}

type MetricDefinition = {
  label: string
  key: keyof PeerMetrics
  percent?: boolean
}

const BENCHMARK_METRICS: MetricDefinition[] = [
  { label: 'EPS', key: 'eps' },
  { label: 'CAGR EPS', key: 'epsGrowth', percent: true },
  { label: 'P/L', key: 'pe' },
  { label: 'P/S', key: 'ps' },
  { label: 'P/VPA', key: 'pb' },
  { label: 'PEG', key: 'peg' },
  { label: 'ROE', key: 'roe', percent: true },
  { label: 'ROIC', key: 'roic', percent: true },
  { label: 'Margem Bruta', key: 'grossMargin', percent: true },
  { label: 'Margem EBITDA', key: 'ebitdaMargin', percent: true },
  { label: 'Margem Líquida', key: 'netMargin', percent: true },
  { label: 'Margem Operacional', key: 'operatingMargin', percent: true },
  { label: 'Liquidez Corrente', key: 'currentRatio' },
  { label: 'Dívida/EBITDA', key: 'debtToEbitda' },
  { label: 'Endividamento', key: 'debtToEbitda' },
  { label: 'Dívida / Capitais Próprios', key: 'debtEquity' },
  { label: 'Dívida/Patrimônio', key: 'debtEquity' },
  { label: 'Debt/Equity', key: 'debtEquity' },
  { label: 'Beta', key: 'beta' },
  { label: 'Dividend Yield', key: 'dividendYield', percent: true },
  { label: 'Payout Ratio', key: 'payoutRatio', percent: true },
  { label: 'Crescimento Receita', key: 'revenueGrowth', percent: true },
  { label: 'Crescimento da Receita', key: 'revenueGrowth', percent: true },
  { label: 'Cash Ratio', key: 'cashRatio' },
]

function hasAnyPeerMetric(metrics: PeerMetrics): boolean {
  return Object.values(metrics).some((value) => value != null && isFinite(value))
}

function buildSectorFallbackComparisons(sector: string): Record<string, string> {
  const sectorBench = getSectorConfig(sector).benchmarks
  const pe = toNumber(sectorBench.avgPE)
  const margin = toNumber(sectorBench.avgMargin)
  const growth = toNumber(sectorBench.avgGrowth)
  const roe = toNumber(sectorBench.avgROE)

  const ps = pe != null && margin != null ? pe * margin : null
  const peg = pe != null && growth != null && growth > 0 ? pe / (growth * 100) : null
  const epsGrowth = growth != null ? Math.min(0.45, Math.max(-0.2, growth * 1.15)) : null

  const grossMargin = margin != null ? Math.min(0.75, margin * 2.2) : null
  const ebitdaMargin = margin != null ? Math.min(0.6, margin * 1.45) : null
  const operatingMargin = margin != null ? Math.min(0.45, margin * 1.1) : null
  const netMargin = margin

  return {
    'P/L': formatMetric(pe, false),
    'P/S': formatMetric(ps, false),
    'PEG': formatMetric(peg, false),
    'CAGR EPS': formatMetric(epsGrowth, true),
    'ROE': formatMetric(roe, true),
    'Margem Bruta': formatMetric(grossMargin, true),
    'Margem EBITDA': formatMetric(ebitdaMargin, true),
    'Margem Operacional': formatMetric(operatingMargin, true),
    'Margem Líquida': formatMetric(netMargin, true),
    'Crescimento Receita': formatMetric(growth, true),
    'Crescimento da Receita': formatMetric(growth, true),
  }
}

export async function fetchBenchmarkComparisons(params: {
  symbol: string
  sector: string
  industry: string
  peers: string[]
  exchangeShortName?: string
}): Promise<BenchmarkComparisonsOutput> {
  const uniquePeers = [...new Set((params.peers || []).map((p) => p.trim()).filter(Boolean))]
  const peerResults = (
    await Promise.all(uniquePeers.slice(0, 6).map((peer) => fetchPeerMetrics(peer)))
  ).filter(
    (result): result is PeerMetricsFetchResult =>
      result != null && hasAnyPeerMetric(result.metrics),
  )
  const peerMetrics = peerResults.map((result) => result.metrics)
  const yahooFallbackUsed = peerResults.some((result) => result.yahooUsed)

  const comparisons: Record<string, string> = {}
  const metadata: Record<string, { source: BenchmarkSource; sampleSize?: number }> = {}

  for (const metric of BENCHMARK_METRICS) {
    const values = peerMetrics
      .map((peer) => peer[metric.key])
      .filter((v): v is number => v != null && isFinite(v))

    const m = median(values)
    if (m == null) continue

    comparisons[metric.label] = formatMetric(m, metric.percent)
    metadata[metric.label] = {
      source: 'peer_median',
      sampleSize: values.length,
    }
  }

  const [industryPE, sectorPE, googleFinance] = await Promise.all([
    fetchPESnapshot('industry', params.industry, params.exchangeShortName),
    fetchPESnapshot('sector', params.sector, params.exchangeShortName),
    tryGoogleFinanceQuote(params.symbol, params.exchangeShortName),
  ])

  if (industryPE != null) {
    comparisons['P/L'] = formatMetric(industryPE, false)
    metadata['P/L'] = { source: 'industry_snapshot' }
  } else if (sectorPE != null) {
    comparisons['P/L'] = formatMetric(sectorPE, false)
    metadata['P/L'] = { source: 'sector_snapshot' }
  } else if (googleFinance.peRatio != null) {
    comparisons['P/L'] = formatMetric(googleFinance.peRatio, false)
    metadata['P/L'] = { source: 'google_finance' }
  } else if (peerMetrics.length === 0) {
    const yahooTargetMetrics = await fetchYahooPeerMetrics(params.symbol)
    const yahooTargetPE = toNumber(yahooTargetMetrics?.pe)
    if (yahooTargetPE != null) {
      comparisons['P/L'] = formatMetric(yahooTargetPE, false)
      metadata['P/L'] = { source: 'yahoo_finance' }
    }
  }

  const fallbackComparisons = buildSectorFallbackComparisons(params.sector)
  for (const [label, value] of Object.entries(fallbackComparisons)) {
    if (!value || value === DASH) continue
    if (!comparisons[label] || comparisons[label] === DASH) {
      comparisons[label] = value
      metadata[label] = { source: 'fallback' }
    }
  }

  const fallbackMetrics = Object.values(metadata).filter((m) => m.source === 'fallback').length
  const totalMetrics = Object.keys(comparisons).length
  const dynamicMetrics = totalMetrics - fallbackMetrics
  const primarySource: 'dynamic' | 'fallback' | 'mixed' =
    totalMetrics === 0
      ? 'fallback'
      : fallbackMetrics === 0
        ? 'dynamic'
        : dynamicMetrics === 0
          ? 'fallback'
          : 'mixed'

  return {
    comparisons,
    metadata,
    context: {
      asOf: new Date().toISOString(),
      sector: params.sector,
      industry: params.industry,
      peerCount: peerMetrics.length,
      googleAttempted: true,
      googleAvailable: googleFinance.available,
      yahooFallbackUsed,
      fallbackMetrics,
      primarySource,
    },
  }
}

// 4. Alertas de risco
export async function fetchAlerts(symbol: string) {
  const safeFetch = async (url: string, description: string) => {
    try {
      return await fetch(url)
    } catch (error) {
      console.warn(`⚠️ ${description} falhou para ${symbol}`)
      return null
    }
  }

  const [ratiosRes, incomeRes, cashflowRes] = await Promise.all([
    safeFetch(`${FMP_STABLE}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Ratios TTM'),
    safeFetch(`${FMP_STABLE}/income-statement?symbol=${symbol}&limit=3&apikey=${API_KEY}`, 'Income Statement'),
    safeFetch(`${FMP_STABLE}/cash-flow-statement?symbol=${symbol}&limit=3&apikey=${API_KEY}`, 'Cash Flow')
  ])

  const ratios = ratiosRes?.[0] || {}
  const income: IncomeStatement[] = incomeRes || []
  const cashflow: CashFlowStatement[] = cashflowRes || []
    const alerts = []


  if (ratios?.debtEquityRatioTTM > 1) {
    alerts.push({
      title: 'Endividamento elevado',
      description: 'A dívida excede 100% do patrimônio.',
      severity: 'high'
    })
  }

  const netIncomes = income.map((i) => i.netIncome)
  if (netIncomes.length >= 3 && netIncomes[0] < netIncomes[1] && netIncomes[1] < netIncomes[2]) {
    alerts.push({
      title: 'Lucros em queda',
      description: 'Net Income em queda nos últimos 3 anos.',
      severity: 'medium'
    })
  }

  const fcf = cashflow.map((c) =>
    typeof c.freeCashFlow === 'number' ? c.freeCashFlow : c.operatingCashFlow - c.capitalExpenditure
  )
  if (fcf.slice(0, 2).every((v) => v < 0)) {
    alerts.push({
      title: 'Fluxo de caixa negativo',
      description: 'FCF negativo nos últimos 2 anos.',
      severity: 'medium'
    })
  }

  const dps = income.map((i) => i.dividendPerShare || 0).filter((d) => d > 0)
  if (dps.length >= 3 && new Set(dps).size > 2) {
    alerts.push({
      title: 'Dividendos inconsistentes',
      description: 'Histórico irregular de distribuição.',
      severity: 'low'
    })
  }

  return alerts
}
  
// Ceilings de normalização do radar por tipo de empresa (Fase D1)
type CompanyTypeHint = { isBanco?: boolean; isREIT?: boolean; isPaymentProcessor?: boolean }

function getRadarCeilings(companyType?: CompanyTypeHint) {
  if (companyType?.isBanco) {
    return { roe: 0.18, pe: 15, divYield: 0.05, revGrowth: 0.10, debtEquity: 1.5, zScore: 5 }
  }
  if (companyType?.isREIT) {
    return { roe: 0.12, pe: 20, divYield: 0.08, revGrowth: 0.08, debtEquity: 2.0, zScore: 3 }
  }
  if (companyType?.isPaymentProcessor) {
    return { roe: 0.50, pe: 35, divYield: 0.02, revGrowth: 0.20, debtEquity: 1.0, zScore: 10 }
  }
  // Generic / Tech / Consumer / Industrial
  return { roe: 0.35, pe: 40, divYield: 0.06, revGrowth: 0.25, debtEquity: 2.0, zScore: 10 }
}

// 5. Radar de performance
export async function fetchRadar(symbol: string, companyType?: CompanyTypeHint) {
  console.log(`📊 Buscando dados de radar para ${symbol}...`)

  const safeFetch = async (url: string, description: string) => {
    try {
      const result = await fetch(url)
      return result
    } catch (error) {
      console.warn(`⚠️ ${description} falhou para ${symbol}`)
      return null
    }
  }

  const [ratiosRes, metricsRes, scoresRes, growthRes] = await Promise.all([
    safeFetch(`${FMP_STABLE}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Ratios TTM'),
    safeFetch(`${FMP_STABLE}/key-metrics-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Key Metrics TTM'),
    safeFetch(`${FMP_STABLE}/financial-scores?symbol=${symbol}&apikey=${API_KEY}`, 'Financial Scores'),
    safeFetch(`${FMP_STABLE}/financial-growth?symbol=${symbol}&apikey=${API_KEY}`, 'Financial Growth')
  ])

  const ratios = ratiosRes?.[0] || {}
  const metrics = metricsRes?.[0] || {}
  const scores = scoresRes?.[0] || {}
  const growth = growthRes?.[0] || {}

  const c = getRadarCeilings(companyType)

  const normalize = (value: number | null, max: number) => {
    if (value == null || isNaN(value) || max === 0) return 0
    return Math.min(Math.max((value / max) * 100, 0), 100)
  }

  // Solidez: debtEquity com fallback para key-metrics-ttm
  const debtEquity = ratios.debtEquityRatioTTM ?? metrics.debtToEquityTTM
  const solidezScore =
    debtEquity != null && debtEquity > 0
      ? normalize(1 / debtEquity, 1 / (c.debtEquity * 0.3))
      : debtEquity === 0
        ? 100
        // Fallback: usar currentRatio como proxy de liquidez se debtEquity em falta
        : ratios.currentRatioTTM > 0
          ? normalize(ratios.currentRatioTTM, 3)
          : 50

  // Segurança: Altman Z com guard sentinel + fallback composto
  const altmanZ = scores.altmanZScore > 0 ? scores.altmanZScore : null
  const currentRatio = ratios.currentRatioTTM ?? 0
  const safetyFromDebt =
    debtEquity != null && debtEquity > 0
      ? normalize(1 / debtEquity, 1 / (c.debtEquity * 0.3))
      : debtEquity === 0 ? 100 : null
  const safetyFromLiquidity = currentRatio > 0 ? normalize(currentRatio, 3) : null
  const fallbacks = [safetyFromDebt, safetyFromLiquidity].filter((v): v is number => v != null)
  const fallbackSafety = fallbacks.length > 0 ? fallbacks.reduce((a, b) => a + b, 0) / fallbacks.length : 0
  const segurancaScore = altmanZ != null ? normalize(altmanZ, c.zScore) : fallbackSafety

  // Crescimento: ceiling mais realista para large caps (15% vs 25%)
  const crescCeiling = c.revGrowth === 0.25 ? 0.15 : c.revGrowth
  const revenueGrowth = growth.revenueGrowth ?? growth.revenue ?? 0

  return [
    {
      metric: 'Valuation (barato)',
      // PE baixo é bom: score = (1/PE) / (1/peCeiling). Fallback: key-metrics-ttm
      value: (() => {
        const pe = ratios.peRatioTTM || metrics.peRatioTTM
        return pe && pe > 0 ? normalize(1 / pe, 1 / (c.pe * 0.5)) : 0
      })(),
    },
    {
      metric: 'Rentabilidade',
      // Fallback: key-metrics-ttm tem roeTTM quando ratios-ttm falha
      value: normalize(ratios.returnOnEquityTTM || metrics.roeTTM || 0, c.roe),
    },
    {
      metric: 'Crescimento',
      value: normalize(revenueGrowth, crescCeiling),
    },
    {
      metric: 'Solidez',
      value: solidezScore,
    },
    {
      metric: 'Segurança',
      value: segurancaScore,
    },
    {
      metric: 'Dividendos',
      value: normalize(metrics.dividendYieldTTM || 0, c.divYield),
    },
  ]
}
  
  
  export async function fetchRadarWithPeers(symbol: string, companyType?: CompanyTypeHint) {
    const { peers } = await fetchPeers(symbol)
    const selectedPeers = peers.slice(0, 2)

    const [mainRadar, ...peerRadars] = await Promise.all([
      fetchRadar(symbol, companyType),
      // Peers usam os mesmos ceilings sectoriais (mesmo sector normalmente)
      ...selectedPeers.map((p: string) => fetchRadar(p, companyType))
    ])

    return {
      main: { symbol, radar: mainRadar },
      peers: selectedPeers.map((peerSymbol: string, i: number) => ({
        symbol: peerSymbol,
        radar: peerRadars[i]
      }))
    }
  }
  


export interface IndicadoresOutput {
  indicadores: IndicadoresResult
  rawForScoring: RawScoringData
}

// 6. Indicadores + dados raw para scoring
export async function fetchIndicadores(symbol: string): Promise<IndicadoresOutput> {
  console.log(`🚀 Iniciando busca de indicadores para ${symbol}...`)

  try {
    const rawData = await fetchRawFinancialData(symbol)

    const epsCalculations = calculateEPSMetrics(
      rawData.earningsCalendar,
      rawData.income,
      rawData.historicalRatios
    )

    const derivedMetrics = calculateDerivedMetrics(
      rawData.income,
      rawData.cashflow,
      rawData.ratios,
      epsCalculations.cagrEps,
      epsCalculations.epsAtual
    )

    const indicadores = buildIndicadoresResult(rawData, epsCalculations, derivedMetrics)

    const quickFallbackData: QuickAnalysisFallbackData = {
      ratios: (rawData.ratios as Record<string, unknown>) ?? null,
      metrics: (rawData.metrics as Record<string, unknown>) ?? null,
      historicalRatios: Array.isArray(rawData.historicalRatios)
        ? (rawData.historicalRatios as Array<Record<string, unknown>>)
        : [],
      keyMetricsHistorical: Array.isArray(rawData.keyMetricsHistorical)
        ? (rawData.keyMetricsHistorical as Array<Record<string, unknown>>)
        : [],
      income: (rawData.income as Record<string, unknown>) ?? null,
      balance: (rawData.balance as Record<string, unknown>) ?? null,
      balanceY1: (rawData.balanceY1 as Record<string, unknown>) ?? null,
      cashflow: (rawData.cashflow as Record<string, unknown>) ?? null,
      growth: (rawData.growth as Record<string, unknown>) ?? null,
    }

    const rawForScoring: RawScoringData = {
      cagrEps: epsCalculations.cagrEps,
      revenueGrowth: rawData.growth?.revenueGrowth ?? null,
      dataPeriod: formatReportPeriod(rawData.income?.date, rawData.income?.period),
      quickFallbackData,
    }

    console.log(`🎉 Indicadores calculados com sucesso para ${symbol}`)
    return { indicadores, rawForScoring }

  } catch (error) {
    console.error(`❌ Erro ao processar indicadores para ${symbol}:`, error)
    throw new Error(`Falha ao calcular indicadores financeiros para ${symbol}`)
  }
}
