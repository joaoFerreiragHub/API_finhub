import { Request, Response } from 'express'
import axios from 'axios'

const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE = 'https://financialmodelingprep.com/stable'

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

    // Dividendo anual = soma dos últimos 12 meses
    const cutoff12m = new Date()
    cutoff12m.setFullYear(cutoff12m.getFullYear() - 1)
    const recentDivs = history.filter((d: any) => new Date(d.date) >= cutoff12m)
    const annualDividend = recentDivs.reduce(
      (sum: number, d: any) => sum + (d.adjDividend ?? d.dividend ?? 0),
      0,
    )

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

    res.json({
      symbol: String(symbol),
      companyName: profile.companyName,
      price,
      annualDividend: parseFloat(annualDividend.toFixed(4)),
      dividendYield: parseFloat(dividendYield.toFixed(2)),
      dividendCagr: parseFloat((dividendCagr * 100).toFixed(2)),
      requiredReturn: parseFloat((requiredReturn * 100).toFixed(2)),
      growthRateUsed: parseFloat((growthRate * 100).toFixed(2)),
      intrinsicValue: intrinsicValue !== null ? parseFloat(intrinsicValue.toFixed(2)) : null,
      difference: differencePercent !== null ? parseFloat(differencePercent.toFixed(2)) : null,
      cagr: parseFloat((dividendCagr * 100).toFixed(2)),
      valuation,
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

    const [profileData, quoteData, incomeData, cashflowData, balanceData, dividendsData] = await Promise.all([
      fmpGet(`/profile?symbol=${symbol}`),
      fmpGet(`/quote?symbol=${symbol}`),
      fmpGet(`/income-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/cash-flow-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/balance-sheet-statement?symbol=${symbol}&period=annual&limit=1`).catch(() => null),
      fmpGet(`/dividends?symbol=${symbol}`).catch(() => null),
    ])

    if (!profileData?.[0]) {
      return res.status(404).json({ error: 'REIT não encontrado.' })
    }

    const profile = first(profileData)
    const quote = first(quoteData)
    const income = first(incomeData)
    const cashflow = first(cashflowData)
    const balance = first(balanceData)

    const price = quote.price || profile.price || 0
    // FMP profile usa 'marketCap', não 'mktCap'
    const marketCap = profile.marketCap || 0
    const sharesOutstanding = resolveShares(income, balance, marketCap, price)

    // FFO = Lucro Líquido + Depreciação & Amortização (fórmula NAREIT padrão simplificada)
    const netIncome = income.netIncome ?? 0
    const depreciation = cashflow.depreciationAndAmortization ?? income.depreciationAndAmortization ?? 0
    const ffo = netIncome + depreciation

    // EBITDA e rácios de dívida
    const ebitda = income.ebitda ?? ((income.operatingIncome ?? 0) + depreciation)
    const totalDebt = balance.totalDebt ?? ((balance.shortTermDebt ?? 0) + (balance.longTermDebt ?? 0))
    const totalEquity = balance.totalStockholdersEquity ?? 0
    const debtToEbitda = ebitda > 0 ? totalDebt / ebitda : null
    const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : null

    // Cash Flow Operacional (proxy real disponível do FMP para REITs)
    const operatingCashFlow = cashflow.operatingCashFlow ?? null

    // Per share
    const ffoPerShare = sharesOutstanding > 0 ? ffo / sharesOutstanding : null
    const pFFO = ffoPerShare && ffoPerShare > 0 ? price / ffoPerShare : null
    const operatingCFPerShare =
      operatingCashFlow !== null && sharesOutstanding > 0 ? operatingCashFlow / sharesOutstanding : null

    // FFO Payout Ratio = Dividendo anual / FFO por ação
    const history: any[] = dividendsData?.historical ?? (Array.isArray(dividendsData) ? dividendsData : [])
    const cutoff12m = new Date()
    cutoff12m.setFullYear(cutoff12m.getFullYear() - 1)
    const annualDividend = history
      .filter((d: any) => new Date(d.date) >= cutoff12m)
      .reduce((sum: number, d: any) => sum + (d.adjDividend ?? d.dividend ?? 0), 0)
    const ffoPayoutRatio =
      ffoPerShare && ffoPerShare > 0 && annualDividend > 0
        ? (annualDividend / ffoPerShare) * 100
        : null

    res.json({
      symbol: String(symbol),
      companyName: profile.companyName,
      price,
      ffo: ffo !== 0 ? parseFloat(ffo.toFixed(0)) : null,
      ffoPerShare: ffoPerShare !== null ? parseFloat(ffoPerShare.toFixed(2)) : null,
      pFFO: pFFO !== null ? parseFloat(pFFO.toFixed(2)) : null,
      operatingCashFlow: operatingCashFlow !== null ? parseFloat(operatingCashFlow.toFixed(0)) : null,
      operatingCFPerShare: operatingCFPerShare !== null ? parseFloat(operatingCFPerShare.toFixed(2)) : null,
      ffoPayoutRatio: ffoPayoutRatio !== null ? parseFloat(ffoPayoutRatio.toFixed(1)) : null,
      debtToEbitda: debtToEbitda !== null ? parseFloat(debtToEbitda.toFixed(2)) : null,
      debtToEquity: debtToEquity !== null ? parseFloat(debtToEquity.toFixed(2)) : null,
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
    const noIProxy: number = income.grossProfit ?? 0
    const capRateBase = CAP_RATES[profile.industry as string] ?? DEFAULT_CAP_RATE
    const cash: number = balance.cashAndCashEquivalents ?? 0
    const totalDebt: number = balance.totalDebt ?? ((balance.shortTermDebt ?? 0) + (balance.longTermDebt ?? 0))
    const netDebt: number = balance.netDebt ?? (totalDebt - cash)
    const preferred: number = balance.preferredStock ?? 0

    function calcScenario(capRate: number) {
      const propertyValue = noIProxy > 0 ? noIProxy / capRate : null
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

    res.json({
      symbol: String(symbol),
      companyName: profile.companyName,
      price,
      marketCap,
      nav: nav !== null ? parseFloat(nav.toFixed(0)) : null,
      navPerShare: navPerShare !== null ? parseFloat(navPerShare.toFixed(2)) : null,
      priceToNAV: priceToNAV !== null ? parseFloat(priceToNAV.toFixed(2)) : null,
      premiumPercent: premiumPercent !== null ? parseFloat(premiumPercent.toFixed(2)) : null,
      premium: priceToNAV !== null ? (priceToNAV > 1 ? 'Premium' : 'Discount') : null,
      economicNAV: {
        sector: profile.industry ?? null,
        noIProxy: noIProxy !== 0 ? parseFloat(noIProxy.toFixed(0)) : null,
        scenarios: {
          optimistic:   calcScenario(capRateBase - 0.005),
          base:         calcScenario(capRateBase),
          conservative: calcScenario(capRateBase + 0.0075),
        },
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
    const totalEquity = balance.totalStockholdersEquity ?? 0
    const ebitda = income.ebitda ?? 0
    res.json({
      symbol: String(symbol),
      name: profile.companyName,
      beta: profile.beta,
      sector: profile.sector,
      totalDebt: totalDebt || null,
      totalEquity: totalEquity || null,
      debtToEbitda: ebitda > 0 ? parseFloat((totalDebt / ebitda).toFixed(2)) : null,
      debtToEquity: totalEquity > 0 ? parseFloat((totalDebt / totalEquity).toFixed(2)) : null,
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
