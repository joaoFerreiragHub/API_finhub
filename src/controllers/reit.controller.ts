import { Request, Response } from 'express'
import axios from 'axios'

const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE = 'https://financialmodelingprep.com/stable'

// ── Feature Flags ──────────────────────────────────────────────────────────────
// Cada fase do overhaul é controlada por uma flag independente.
// Se alguma coisa correr mal num tipo de REIT, desliga-se a flag sem mexer no resto.
export const REIT_FLAGS = {
  useNullInsteadOfZero: true,     // Phase 1: null propagation no NAV/debt
  enablePeriodTags: true,         // Phase 2: ddmDataPeriod / ffoDataPeriod / navDataPeriod
  enableConfidenceBadges: true,   // Phase 4: ffoConfidence / navConfidence
  enableProfileDetection: true,   // Phase 5: reitProfile + profileConfidence
  enableImpliedCapRate: true,     // Phase 6: impliedCapRate no NAV
  enableDynamicWeights: false,    // Phase 8: pesos por perfil (off até testar)
} as const

async function fmpGet(path: string): Promise<any> {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${FMP_BASE}${path}${separator}apikey=${FMP_API_KEY}`
  const { data } = await axios.get(url)
  return data
}

/** Normaliza resposta FMP: array ou objeto direto */
function first(data: any): any {
  return Array.isArray(data) ? (data[0] ?? {}) : (data ?? {})
}

/** Formata o período do relatório: "FY2024", "Q3 2024", etc. */
function formatReportPeriod(date: string | undefined, period: string | undefined): string | null {
  if (!date) return null
  const year = new Date(date).getFullYear()
  if (!period || period === 'FY' || period === 'annual') return `FY${year}`
  return `${period} ${year}`
}

/**
 * Trata 0 como dado em falta quando implausível para empresas com market cap relevante.
 * O FMP devolve frequentemente 0 (em vez de null) para campos não reportados.
 * Threshold: $500M por defeito — qualquer REIT com esse cap tem sempre CFO/D&A positivos.
 */
function plausibleOrNull(value: number | null | undefined, marketCap: number, threshold = 500_000_000): number | null {
  if (value === null || value === undefined) return null
  if (value === 0 && marketCap > threshold) return null
  return value
}

/**
 * Resolve shares outstanding a partir de múltiplas fontes FMP.
 * Prioridade: income statement (weighted avg diluted) > basic > balance sheet > market cap / price
 */
function resolveShares(income: any, balance: any, marketCap: number, price: number): number {
  return (
    income.weightedAverageShsOutDil ||
    income.weightedAverageShsOut ||
    balance.commonStockSharesOutstanding ||
    (marketCap > 0 && price > 0 ? Math.round(marketCap / price) : 0)
  )
}

// ── Confidence & Profile helpers ────────────────────────────────────────────────

type ConfidenceLevel = 'high' | 'medium' | 'low'
type ReitProfile = 'growth' | 'income' | 'mixed'
type FfoSource = 'key-metrics' | 'simplified' | 'simplified-specialty' | 'not-applicable'

function detectReitProfile(
  dividendYield: number,
  dividendCagr: number,
): { profile: ReitProfile; confidence: 'high' | 'low'; reasons: string[] } {
  const reasons: string[] = []
  let growthSignals = 0
  let incomeSignals = 0

  if (dividendYield < 3) { growthSignals++; reasons.push(`yield ${dividendYield.toFixed(1)}% < 3%`) }
  if (dividendYield >= 4) { incomeSignals++; reasons.push(`yield ${dividendYield.toFixed(1)}% >= 4%`) }
  if (dividendCagr < 0.02) { growthSignals++; reasons.push(`CAGR ${(dividendCagr * 100).toFixed(1)}% < 2%`) }
  if (dividendCagr >= 0.02) { incomeSignals++; reasons.push(`CAGR ${(dividendCagr * 100).toFixed(1)}% >= 2%`) }

  let profile: ReitProfile
  if (dividendYield < 3 || dividendCagr < 0.02) profile = 'growth'
  else if (dividendYield >= 4 && dividendCagr >= 0.02) profile = 'income'
  else profile = 'mixed'

  const confidence: 'high' | 'low' = Math.max(growthSignals, incomeSignals) >= 2 ? 'high' : 'low'
  return { profile, confidence, reasons }
}

function computeFfoConfidence(
  ffoSource: FfoSource,
  depreciationGuarded: boolean,
  sharesSource: string,
): { confidence: ConfidenceLevel; reasons: string[] } {
  const reasons: string[] = []
  if (ffoSource === 'not-applicable') return { confidence: 'low', reasons: ['mREIT: FFO nao se aplica'] }
  if (ffoSource === 'key-metrics') reasons.push('ffoPerShare NAREIT (key-metrics)')
  else if (ffoSource === 'simplified-specialty') reasons.push('Estimativa simplificada com D&A de specialty')
  else reasons.push('Estimativa simplificada (NI + D&A)')
  if (depreciationGuarded) reasons.push('D&A guardado por plausibleOrNull (era 0)')
  if (sharesSource === 'estimated') reasons.push('Shares estimadas via marketCap/price')

  const confidence: ConfidenceLevel =
    ffoSource === 'key-metrics' && !depreciationGuarded && sharesSource !== 'estimated'
      ? 'high'
      : ffoSource === 'simplified-specialty' || depreciationGuarded || sharesSource === 'estimated'
        ? 'low'
        : 'medium'
  return { confidence, reasons }
}

function computeNavConfidence(
  noIProxy: number | null,
  capRateIsDefault: boolean,
  ecoNavNegative: boolean,
): { confidence: ConfidenceLevel; reasons: string[] } {
  const reasons: string[] = []
  if (noIProxy === null || noIProxy === 0) reasons.push('NOI proxy em falta ou zero')
  if (capRateIsDefault) reasons.push('Cap rate default (setor nao mapeado)')
  if (ecoNavNegative) reasons.push('NAV economico negativo')

  const confidence: ConfidenceLevel = reasons.length === 0 ? 'high' : reasons.length === 1 ? 'medium' : 'low'
  return { confidence, reasons }
}

// ============================================
// REIT Toolkit com dados reais (FMP Starter)
// ============================================

export const calculateDDM = async (req: Request, res: Response) => {
  const { symbol } = req.query

  try {
    console.log(`📊 Calculando DDM para ${symbol}...`)

    const [profileData, quoteData, dividendsData] = await Promise.all([
      fmpGet(`/profile?symbol=${symbol}`),
      fmpGet(`/quote?symbol=${symbol}`),
      fmpGet(`/dividends?symbol=${symbol}`).catch(() => null),
    ])

    if (!profileData?.[0]) {
      return res.status(404).json({ error: 'REIT não encontrado.' })
    }

    const profile = first(profileData)
    const quote = first(quoteData)
    // FMP usa 'marketCap', não 'mktCap'
    const price = quote.price || profile.price || 0

    // Histórico de dividendos
    const history: any[] = dividendsData?.historical ?? (Array.isArray(dividendsData) ? dividendsData : [])

    // Dividendo anual = últimos N pagamentos (evita contar 5 quarters numa janela de 12 meses)
    // Detecta frequência: intervalo médio entre pagamentos em dias
    const sortedDesc = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    let paymentsPerYear = 4 // default trimestral
    if (sortedDesc.length >= 3) {
      const gaps: number[] = []
      for (let i = 0; i < Math.min(sortedDesc.length - 1, 6); i++) {
        const diff = (new Date(sortedDesc[i].date).getTime() - new Date(sortedDesc[i + 1].date).getTime()) / 86400000
        gaps.push(Math.abs(diff))
      }
      const avgGap = gaps.reduce((s, v) => s + v, 0) / gaps.length
      if (avgGap <= 35) paymentsPerYear = 12        // mensal
      else if (avgGap <= 100) paymentsPerYear = 4   // trimestral
      else if (avgGap <= 200) paymentsPerYear = 2   // semestral
      else paymentsPerYear = 1                       // anual
    }
    const recentDivs = sortedDesc.slice(0, paymentsPerYear)
    const annualDividend = recentDivs.reduce(
      (sum: number, d: any) => sum + (d.adjDividend ?? d.dividend ?? 0),
      0,
    )
    const currentDividend = sortedDesc[0] ? (sortedDesc[0].adjDividend ?? sortedDesc[0].dividend ?? null) : null
    // Forward dividend = último pagamento × frequência anual (projeção sem crescimento)
    const forwardAnnualDividend = currentDividend !== null ? currentDividend * paymentsPerYear : null
    const forwardDividendYield = forwardAnnualDividend !== null && price > 0 ? (forwardAnnualDividend / price) * 100 : null

    // CAGR de dividendos nos últimos 5 anos
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const cutoff5y = new Date()
    cutoff5y.setFullYear(cutoff5y.getFullYear() - 5)
    const fiveYear = sorted.filter((d: any) => new Date(d.date) >= cutoff5y)

    let dividendCagr = 0.03
    if (fiveYear.length >= 4) {
      const nPerYear = fiveYear.length / 5
      const firstSlice = fiveYear.slice(0, Math.ceil(nPerYear))
      const lastSlice = fiveYear.slice(-Math.ceil(nPerYear))
      const annualize = (slice: any[]) =>
        slice.reduce((s: number, d: any) => s + (d.adjDividend ?? d.dividend ?? 0), 0) * (12 / slice.length)
      const firstAnnual = annualize(firstSlice)
      const lastAnnual = annualize(lastSlice)
      if (firstAnnual > 0 && lastAnnual > 0) {
        dividendCagr = Math.pow(lastAnnual / firstAnnual, 1 / 5) - 1
      }
    }

    // CAPM: r = Rf + β × ERP
    const riskFreeRate = 0.045
    const equityRiskPremium = 0.05
    const beta = profile.beta > 0 ? profile.beta : 0.8
    const requiredReturn = riskFreeRate + beta * equityRiskPremium

    // Gordon Growth Model: V = D₁ / (r - g)
    const growthRate = Math.min(Math.max(dividendCagr, 0), requiredReturn - 0.005)
    const d1 = annualDividend * (1 + growthRate)
    const intrinsicValue = d1 > 0 && requiredReturn > growthRate ? d1 / (requiredReturn - growthRate) : null

    const differencePercent =
      intrinsicValue && intrinsicValue > 0 ? ((price - intrinsicValue) / intrinsicValue) * 100 : null
    const dividendYield = price > 0 && annualDividend > 0 ? (annualDividend / price) * 100 : 0

    let valuation: string | null = null
    if (intrinsicValue && intrinsicValue > 0) {
      if (price > intrinsicValue * 1.05) valuation = 'Sobrevalorizado'
      else if (price < intrinsicValue * 0.95) valuation = 'Subvalorizado'
      else valuation = 'Justo'
    }

    // DDM confidence gating
    // O DDM tende a dar resultados extremos e pouco fiáveis quando:
    //   - Yield baixo (<3%): empresa retém capital / paga pouco, o modelo amplifica erros de g
    //   - CAGR do dividendo baixo (<2%): crescimento insuficiente para o modelo convergir bem
    //   - Histórico curto: CAGR estimado com <5 anos de pagamentos é pouco robusto
    // Nesses casos, o valuation badge deve ser suprimido e o utilizador encaminhado para P/FFO/NAV.
    const ddmReasons: string[] = []
    if (dividendYield < 3) ddmReasons.push(`yield ${dividendYield.toFixed(1)}% < 3%`)
    if (dividendCagr < 0.02) ddmReasons.push(`CAGR dividendo ${(dividendCagr * 100).toFixed(1)}% < 2%`)
    if (fiveYear.length < 8) ddmReasons.push('histórico < 5 anos completos')
    const ddmConfidence: 'high' | 'low' = ddmReasons.length === 0 ? 'high' : 'low'
    const ddmConfidenceNote: string | null = ddmConfidence === 'low'
      ? `DDM de baixa confiança (${ddmReasons.join('; ')}). Para este perfil, prefira P/FFO reportado e NAV económico.`
      : null

    // Profile detection (Phase 5)
    const profileResult = REIT_FLAGS.enableProfileDetection
      ? detectReitProfile(dividendYield, dividendCagr)
      : null

    res.json({
      symbol: String(symbol),
      companyName: profile.companyName,
      price,
      currentDividend: currentDividend !== null ? parseFloat(currentDividend.toFixed(4)) : null,
      paymentsPerYear,
      annualDividend: parseFloat(annualDividend.toFixed(4)),
      dividendYield: parseFloat(dividendYield.toFixed(2)),
      forwardAnnualDividend: forwardAnnualDividend !== null ? parseFloat(forwardAnnualDividend.toFixed(4)) : null,
      forwardDividendYield: forwardDividendYield !== null ? parseFloat(forwardDividendYield.toFixed(2)) : null,
      dividendCagr: parseFloat((dividendCagr * 100).toFixed(2)),
      requiredReturn: parseFloat((requiredReturn * 100).toFixed(2)),
      growthRateUsed: parseFloat((growthRate * 100).toFixed(2)),
      intrinsicValue: intrinsicValue !== null ? parseFloat(intrinsicValue.toFixed(2)) : null,
      difference: differencePercent !== null ? parseFloat(differencePercent.toFixed(2)) : null,
      cagr: parseFloat((dividendCagr * 100).toFixed(2)),
      valuation,
      ddmConfidence,
      ddmConfidenceNote,
      // Phase 2: Period tag
      ...(REIT_FLAGS.enablePeriodTags ? { ddmDataPeriod: 'TTM' } : {}),
      // Phase 5: Profile detection
      ...(profileResult ? {
        reitProfile: profileResult.profile,
        profileConfidence: profileResult.confidence,
      } : {}),
      // Step 9: Decision trace
      _decisionTrace: {
        profileDetected: profileResult?.profile ?? null,
        profileConfidence: profileResult?.confidence ?? null,
        ddmReasons,
        flagsActive: Object.entries(REIT_FLAGS).filter(([, v]) => v).map(([k]) => k),
      },
    })
  } catch (error: any) {
    console.error(`Erro DDM ${symbol}:`, error.message)
    res.status(500).json({ error: 'Erro ao calcular o DDM.' })
  }
}

export const calculateFFO = async (req: Request, res: Response) => {
  const { symbol } = req.query

  try {
    console.log(`📊 Calculando FFO para ${symbol}...`)

    const [profileData, quoteData, incomeData, cashflowData, balanceData, dividendsData, keyMetricsData] = await Promise.all([
      fmpGet(`/profile?symbol=${symbol}`),
      fmpGet(`/quote?symbol=${symbol}`),
      fmpGet(`/income-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/cash-flow-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/balance-sheet-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/dividends?symbol=${symbol}`).catch(() => null),
      fmpGet(`/key-metrics?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
    ])

    if (!profileData?.[0]) {
      return res.status(404).json({ error: 'REIT não encontrado.' })
    }

    const profile = first(profileData)
    const quote = first(quoteData)
    const income = first(incomeData)
    const cashflow = first(cashflowData)
    const balance = first(balanceData)
    const keyMetrics = first(keyMetricsData)

    const price = quote.price || profile.price || 0
    // FMP profile usa 'marketCap', não 'mktCap'
    const marketCap = profile.marketCap || 0
    const sharesOutstanding = resolveShares(income, balance, marketCap, price)

    // D&A: o FMP devolve 0 em vez de null quando não reportado — aplica guarda de plausibilidade
    const depreciationRaw: number | null = plausibleOrNull(
      cashflow.depreciationAndAmortization ?? income.depreciationAndAmortization ?? null,
      marketCap,
    )
    // Para o cálculo do FFO simplificado usamos 0 como fallback de D&A (empresa com D&A nula é possível)
    const depreciation: number = depreciationRaw ?? 0
    const industry: string = profile.industry ?? ''

    // Classificação do tipo de REIT para determinar a abordagem de cálculo do FFO:
    // - mortgage:  REIT hipotecário (mREIT) — FFO não é a métrica relevante; usa Distributable Earnings
    // - specialty:  Data centers, torres de telecomunicação — elevada D&A de equipamentos, fórmula simplificada sobrestima
    // - standard:  Retalho, industrial, residencial, saúde, escritório — D&A maioritariamente imobiliária
    const isMortgageReit = /mortgage/i.test(industry)
    const isSpecialtyReit = /specialty/i.test(industry) // inclui data centers (EQIX, DLR) e torres (AMT, CCI)

    let ffoPerShare: number | null = null
    let ffo: number | null = null
    let ffoSource: FfoSource = 'simplified'
    let ffoNote: string | null = null

    // Net Income: null (não reportado) ≠ 0 (empresa com lucro zero)
    // Se NI não estiver disponível, não podemos calcular o FFO simplificado com confiança
    const netIncomeFMP: number | null = income.netIncome ?? null
    // FFO simplificado só é calculado se tivermos NI (positivo, nulo ou negativo)
    const simplifiedFfoTotal: number | null = netIncomeFMP !== null ? netIncomeFMP + depreciation : null
    const ffoSimplifiedPerShare: number | null = !isMortgageReit && simplifiedFfoTotal !== null && sharesOutstanding > 0
      ? simplifiedFfoTotal / sharesOutstanding
      : null
    const pFFOSimplified: number | null = ffoSimplifiedPerShare && ffoSimplifiedPerShare > 0 ? price / ffoSimplifiedPerShare : null

    // NAREIT: usa /key-metrics do FMP quando disponível (depreciação só imobiliária)
    const ffoNaraitPerShare: number | null = (keyMetrics?.ffoPerShare && keyMetrics.ffoPerShare > 0)
      ? keyMetrics.ffoPerShare
      : null
    const pFFONarait: number | null = ffoNaraitPerShare && ffoNaraitPerShare > 0 ? price / ffoNaraitPerShare : null

    if (isMortgageReit) {
      // mREITs não usam FFO — a métrica correta é Distributable Earnings / Core EPS
      ffoSource = 'not-applicable'
      ffoNote = 'REIT hipotecário: FFO não se aplica. Métrica relevante: Distributable Earnings / Core EPS.'
    } else if (ffoNaraitPerShare !== null) {
      // FMP fornece ffoPerShare calculado segundo as diretrizes NAREIT (só depreciação imobiliária)
      ffoPerShare = ffoNaraitPerShare
      ffo = sharesOutstanding > 0 ? ffoNaraitPerShare * sharesOutstanding : null
      ffoSource = 'key-metrics'
    } else if (isSpecialtyReit) {
      // Specialty REITs: D&A inclui equipamentos/infraestrutura não-imobiliária (data centers, torres).
      // Fórmula simplificada (Net Income + D&A total) pode sobrestimar FFO significativamente.
      ffo = simplifiedFfoTotal
      ffoPerShare = ffoSimplifiedPerShare
      ffoSource = 'simplified-specialty'
      ffoNote = 'Estimativa simplificada (NI + D&A total). Pode sobrestimar FFO em data centers/torres; confirmar com FFO reportado pela empresa.'
    } else {
      // REITs standard (retalho, industrial, residencial, saúde, escritório):
      // D&A é predominantemente imobiliária, fórmula simplificada é aceitável como proxy.
      ffo = simplifiedFfoTotal
      ffoPerShare = ffoSimplifiedPerShare
      ffoSource = 'simplified'
    }

    // EBITDA e rácios de dívida
    // operatingIncome ?? null preserva o caso em que não há dados (não colapsa para 0)
    const ebitdaRaw: number | null = income.ebitda ?? null
    const operatingIncomeRaw: number | null = income.operatingIncome ?? null
    const ebitda: number | null =
      ebitdaRaw !== null ? ebitdaRaw :
      operatingIncomeRaw !== null ? operatingIncomeRaw + depreciation :
      null
    const totalDebt = balance.totalDebt ?? ((balance.shortTermDebt ?? 0) + (balance.longTermDebt ?? 0))
    const totalEquity: number | null = balance.totalStockholdersEquity ?? null
    const debtToEbitda = ebitda !== null && ebitda > 0 ? totalDebt / ebitda : null
    const debtToEquity = totalEquity !== null && totalEquity > 0 ? totalDebt / totalEquity : null

    const pFFO = ffoPerShare && ffoPerShare > 0 ? price / ffoPerShare : null

    // Cash Flow Operacional:
    // - aplica guarda de plausibilidade: CFO=0 com market cap grande é provável dado em falta
    // - a partir do CFO total, calcula per-share; marca como "approx" se shares forem estimadas
    const cfoCandidateRaw: number | null = cashflow.operatingCashFlow ?? null
    const operatingCashFlow: number | null = plausibleOrNull(cfoCandidateRaw, marketCap)
    const sharesSource = income.weightedAverageShsOutDil ? 'diluted' : income.weightedAverageShsOut ? 'basic' : 'estimated'
    const operatingCFPerShare: number | null =
      operatingCashFlow !== null && sharesOutstanding > 0 ? operatingCashFlow / sharesOutstanding : null
    const operatingCFPerShareApprox = sharesSource === 'estimated' && operatingCFPerShare !== null

    // FFO Payout Ratio — usa os últimos N pagamentos (mesmo método do DDM)
    const history: any[] = dividendsData?.historical ?? (Array.isArray(dividendsData) ? dividendsData : [])
    const sortedDescFFO = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    let ppy = 4
    if (sortedDescFFO.length >= 3) {
      const gaps: number[] = []
      for (let i = 0; i < Math.min(sortedDescFFO.length - 1, 6); i++) {
        const diff = (new Date(sortedDescFFO[i].date).getTime() - new Date(sortedDescFFO[i + 1].date).getTime()) / 86400000
        gaps.push(Math.abs(diff))
      }
      const avgGap = gaps.reduce((s, v) => s + v, 0) / gaps.length
      if (avgGap <= 35) ppy = 12
      else if (avgGap <= 100) ppy = 4
      else if (avgGap <= 200) ppy = 2
      else ppy = 1
    }
    const annualDividend = sortedDescFFO.slice(0, ppy).reduce((sum: number, d: any) => sum + (d.adjDividend ?? d.dividend ?? 0), 0)
    const ffoPayoutRatio =
      ffoPerShare && ffoPerShare > 0 && annualDividend > 0
        ? (annualDividend / ffoPerShare) * 100
        : null

    // Phase 4: FFO confidence
    const depreciationWasGuarded = depreciationRaw === null &&
      (cashflow.depreciationAndAmortization ?? income.depreciationAndAmortization) === 0
    const ffoConfidenceResult = REIT_FLAGS.enableConfidenceBadges
      ? computeFfoConfidence(ffoSource, depreciationWasGuarded, sharesSource)
      : null

    res.json({
      symbol: String(symbol),
      companyName: profile.companyName,
      industry,
      price,
      reportPeriod: formatReportPeriod(income.date, income.period),
      // Valor recomendado (melhor fonte disponível)
      ffo: ffo !== null ? parseFloat(ffo.toFixed(0)) : null,
      ffoPerShare: ffoPerShare !== null ? parseFloat(ffoPerShare.toFixed(2)) : null,
      pFFO: pFFO !== null ? parseFloat(pFFO.toFixed(2)) : null,
      ffoSource,
      ffoNote,
      // NAREIT (FMP key-metrics): null se FMP não disponibilizar para este ticker
      ffoNaraitPerShare: ffoNaraitPerShare !== null ? parseFloat(ffoNaraitPerShare.toFixed(2)) : null,
      pFFONarait: pFFONarait !== null ? parseFloat(pFFONarait.toFixed(2)) : null,
      // Estimativa simplificada (NI + D&A total): sempre calculada para equity REITs
      ffoSimplifiedPerShare: ffoSimplifiedPerShare !== null ? parseFloat(ffoSimplifiedPerShare.toFixed(2)) : null,
      pFFOSimplified: pFFOSimplified !== null ? parseFloat(pFFOSimplified.toFixed(2)) : null,
      operatingCashFlow: operatingCashFlow !== null ? parseFloat(operatingCashFlow.toFixed(0)) : null,
      operatingCFPerShare: operatingCFPerShare !== null ? parseFloat(operatingCFPerShare.toFixed(2)) : null,
      operatingCFPerShareApprox,
      ffoPayoutRatio: ffoPayoutRatio !== null ? parseFloat(ffoPayoutRatio.toFixed(1)) : null,
      debtToEbitda: debtToEbitda !== null ? parseFloat(debtToEbitda.toFixed(2)) : null,
      debtToEquity: debtToEquity !== null ? parseFloat(debtToEquity.toFixed(2)) : null,
      // Phase 2: Period tag
      ...(REIT_FLAGS.enablePeriodTags ? { ffoDataPeriod: formatReportPeriod(income.date, income.period) ?? 'TTM' } : {}),
      // Phase 4: FFO confidence
      ...(ffoConfidenceResult ? {
        ffoConfidence: ffoConfidenceResult.confidence,
        ffoConfidenceReasons: ffoConfidenceResult.reasons,
      } : {}),
      // Step 9: Decision trace
      _decisionTrace: {
        ffoSource,
        depreciationWasGuarded,
        sharesSource,
        ffoConfidence: ffoConfidenceResult?.confidence ?? null,
        flagsActive: Object.entries(REIT_FLAGS).filter(([, v]) => v).map(([k]) => k),
      },
    })
  } catch (error: any) {
    console.error(`Erro FFO ${symbol}:`, error.message)
    res.status(500).json({ error: 'Erro ao calcular FFO.' })
  }
}

// Cap rates por setor REIT (NAREIT, 2025)
const CAP_RATES: Record<string, number> = {
  'REIT - Retail':        0.0600,
  'REIT - Industrial':    0.0525,
  'REIT - Office':        0.0700,
  'REIT - Residential':   0.0500,
  'REIT - Healthcare':    0.0575,
  'REIT - Hotel & Motel': 0.0750,
  'REIT - Diversified':   0.0625,
  'REIT - Specialty':     0.0600,
}
const DEFAULT_CAP_RATE = 0.0625

export const calculateNAV = async (req: Request, res: Response) => {
  const { symbol } = req.query

  try {
    console.log(`📊 Calculando NAV para ${symbol}...`)

    const [profileData, quoteData, balanceData, incomeData] = await Promise.all([
      fmpGet(`/profile?symbol=${symbol}`),
      fmpGet(`/quote?symbol=${symbol}`),
      fmpGet(`/balance-sheet-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/income-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
    ])

    if (!profileData?.[0]) {
      return res.status(404).json({ error: 'REIT não encontrado.' })
    }

    const profile = first(profileData)
    const quote = first(quoteData)
    const balance = first(balanceData)
    const income = first(incomeData)

    const price = quote.price || profile.price || 0
    // FMP profile usa 'marketCap', não 'mktCap'
    const marketCap = profile.marketCap || 0
    const sharesOutstanding = resolveShares(income, balance, marketCap, price)

    const totalAssets: number | null = balance.totalAssets ?? null
    const totalLiabilities: number | null = balance.totalLiabilities ?? null
    const totalEquity: number | null = balance.totalStockholdersEquity ?? null

    // Book NAV = Ativos Totais − Passivos Totais (valor contabilístico)
    let nav: number | null = null
    if (totalAssets !== null && totalLiabilities !== null) {
      nav = totalAssets - totalLiabilities
    } else if (totalEquity !== null) {
      nav = totalEquity
    }

    const navPerShare = nav !== null && sharesOutstanding > 0 ? nav / sharesOutstanding : null
    const priceToNAV = navPerShare !== null && navPerShare > 0 ? price / navPerShare : null
    const premiumPercent = priceToNAV !== null ? (priceToNAV - 1) * 100 : null

    // Economic NAV (market-based)
    const noIProxyRaw: number | null = income.grossProfit ?? null
    const noIProxy: number | null = REIT_FLAGS.useNullInsteadOfZero
      ? plausibleOrNull(noIProxyRaw, marketCap)
      : (noIProxyRaw ?? 0)
    const capRateBase = CAP_RATES[profile.industry as string] ?? DEFAULT_CAP_RATE
    const capRateIsDefault = !(profile.industry in CAP_RATES)
    const cash: number = balance.cashAndCashEquivalents ?? 0
    const totalDebt: number = balance.totalDebt ?? ((balance.shortTermDebt ?? 0) + (balance.longTermDebt ?? 0))
    const netDebt: number = balance.netDebt ?? (totalDebt - cash)
    const preferred: number = balance.preferredStock ?? 0

    // Implied cap rate: NOI / EV (EV ≈ marketCap + netDebt)
    const enterpriseValue = marketCap + netDebt
    const impliedCapRate: number | null =
      REIT_FLAGS.enableImpliedCapRate && noIProxy !== null && noIProxy > 0 && enterpriseValue > 0
        ? noIProxy / enterpriseValue
        : null

    function calcScenario(capRate: number) {
      const propertyValue = noIProxy !== null && noIProxy > 0 ? noIProxy / capRate : null
      const economicNav = propertyValue !== null ? propertyValue + cash - netDebt - preferred : null
      const eNavPerShare = economicNav !== null && sharesOutstanding > 0 ? economicNav / sharesOutstanding : null
      const priceVsNav = eNavPerShare && eNavPerShare > 0 ? ((price - eNavPerShare) / eNavPerShare) * 100 : null
      return {
        capRate: parseFloat((capRate * 100).toFixed(2)),
        propertyValue: propertyValue !== null ? parseFloat(propertyValue.toFixed(0)) : null,
        economicNav: economicNav !== null ? parseFloat(economicNav.toFixed(0)) : null,
        navPerShare: eNavPerShare !== null ? parseFloat(eNavPerShare.toFixed(2)) : null,
        priceVsNav: priceVsNav !== null ? parseFloat(priceVsNav.toFixed(2)) : null,
      }
    }

    // Phase 4: NAV confidence
    const baseScenarioResult = calcScenario(capRateBase)
    const ecoNavNegative = (baseScenarioResult.economicNav ?? 0) < 0
    const navConfidenceResult = REIT_FLAGS.enableConfidenceBadges
      ? computeNavConfidence(noIProxy, capRateIsDefault, ecoNavNegative)
      : null

    res.json({
      symbol: String(symbol),
      companyName: profile.companyName,
      price,
      marketCap,
      reportPeriod: formatReportPeriod(balance.date, balance.period),
      nav: nav !== null ? parseFloat(nav.toFixed(0)) : null,
      navPerShare: navPerShare !== null ? parseFloat(navPerShare.toFixed(2)) : null,
      priceToNAV: priceToNAV !== null ? parseFloat(priceToNAV.toFixed(2)) : null,
      premiumPercent: premiumPercent !== null ? parseFloat(premiumPercent.toFixed(2)) : null,
      premium: priceToNAV !== null ? (priceToNAV > 1 ? 'Premium' : 'Discount') : null,
      economicNAV: {
        sector: profile.industry ?? null,
        noIProxy: noIProxy !== null && noIProxy !== 0 ? parseFloat(noIProxy.toFixed(0)) : null,
        scenarios: {
          optimistic:   calcScenario(capRateBase - 0.005),
          base:         baseScenarioResult,
          conservative: calcScenario(capRateBase + 0.0075),
        },
      },
      // Phase 2: Period tag
      ...(REIT_FLAGS.enablePeriodTags ? { navDataPeriod: formatReportPeriod(balance.date, balance.period) } : {}),
      // Phase 4: NAV confidence
      ...(navConfidenceResult ? {
        navConfidence: navConfidenceResult.confidence,
        navConfidenceReasons: navConfidenceResult.reasons,
      } : {}),
      // Phase 6: Implied cap rate
      ...(REIT_FLAGS.enableImpliedCapRate ? {
        impliedCapRate: impliedCapRate !== null ? parseFloat((impliedCapRate * 100).toFixed(2)) : null,
      } : {}),
      // Step 9: Decision trace
      _decisionTrace: {
        noIProxyRaw: noIProxyRaw,
        noIProxy,
        capRateIsDefault,
        impliedCapRate: impliedCapRate !== null ? parseFloat((impliedCapRate * 100).toFixed(2)) : null,
        ecoNavNegative,
        navConfidence: navConfidenceResult?.confidence ?? null,
        flagsActive: Object.entries(REIT_FLAGS).filter(([, v]) => v).map(([k]) => k),
      },
    })
  } catch (error: any) {
    console.error(`Erro NAV ${symbol}:`, error.message)
    res.status(500).json({ error: 'Erro ao calcular NAV.' })
  }
}

export const getOccupancyRate = async (req: Request, res: Response) => {
  const { symbol } = req.query
  try {
    const profileData = await fmpGet(`/profile?symbol=${symbol}`)
    if (!profileData?.[0]) return res.status(404).json({ error: 'REIT não encontrado.' })
    const profile = first(profileData)
    res.json({ symbol: String(symbol), name: profile.companyName, sector: profile.sector, industry: profile.industry })
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao buscar taxa de ocupação.' })
  }
}

export const calculateDebtRatios = async (req: Request, res: Response) => {
  const { symbol } = req.query
  try {
    const [profileData, balanceData, incomeData] = await Promise.all([
      fmpGet(`/profile?symbol=${symbol}`),
      fmpGet(`/balance-sheet-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/income-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
    ])
    if (!profileData?.[0]) return res.status(404).json({ error: 'REIT não encontrado.' })
    const profile = first(profileData)
    const balance = first(balanceData)
    const income = first(incomeData)
    const totalDebt = balance.totalDebt ?? ((balance.shortTermDebt ?? 0) + (balance.longTermDebt ?? 0))
    const mktCap = profile.marketCap || 0
    const totalEquity: number | null = REIT_FLAGS.useNullInsteadOfZero
      ? plausibleOrNull(balance.totalStockholdersEquity ?? null, mktCap)
      : (balance.totalStockholdersEquity ?? 0)
    const ebitda: number | null = REIT_FLAGS.useNullInsteadOfZero
      ? plausibleOrNull(income.ebitda ?? null, mktCap)
      : (income.ebitda ?? 0)
    res.json({
      symbol: String(symbol),
      name: profile.companyName,
      beta: profile.beta,
      sector: profile.sector,
      totalDebt: totalDebt || null,
      totalEquity: totalEquity,
      debtToEbitda: ebitda !== null && ebitda > 0 ? parseFloat((totalDebt / ebitda).toFixed(2)) : null,
      debtToEquity: totalEquity !== null && totalEquity > 0 ? parseFloat((totalDebt / totalEquity).toFixed(2)) : null,
    })
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao calcular rácios de dívida.' })
  }
}

export const calculateMetrics = async (req: Request, res: Response) => {
  const { symbol } = req.query
  try {
    const [profileData, quoteData] = await Promise.all([
      fmpGet(`/profile?symbol=${symbol}`),
      fmpGet(`/quote?symbol=${symbol}`),
    ])
    if (!profileData?.[0]) return res.status(404).json({ error: 'REIT não encontrado.' })
    const profile = first(profileData)
    const quote = first(quoteData)
    res.json({
      symbol: String(symbol),
      name: profile.companyName,
      price: quote.price || profile.price || 0,
      dividendYield: profile.lastDividend,
      beta: profile.beta,
      marketCap: profile.marketCap,
      sector: profile.sector,
      industry: profile.industry,
    })
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao calcular métricas REIT.' })
  }
}
