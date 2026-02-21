type NumericDict = Record<string, unknown>

export interface CalculatedMetricInfo {
  source: string
  formula?: string
}

export interface DerivedCurrentMetricsResult {
  indicadores: Record<string, string>
  calculatedByLabel: Record<string, CalculatedMetricInfo>
}

export interface DerivedCurrentIndicadoresInput {
  indicadores: Record<string, string>
  ratios?: NumericDict | null
  metrics?: NumericDict | null
  historicalRatios?: NumericDict[] | null
  keyMetricsHistorical?: NumericDict[] | null
  income?: NumericDict | null
  balance?: NumericDict | null
  balanceY1?: NumericDict | null
  cashflow?: NumericDict | null
  growth?: NumericDict | null
}

const DASH_VALUES = new Set(['', '-', '--', '---', 'N/A', 'n/a', '\u2014'])

function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

function isDashLike(value: string | null | undefined): boolean {
  if (value == null) return true
  return DASH_VALUES.has(value.trim())
}

function toNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') return isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const isPercent = trimmed.includes('%')
  const normalized = trimmed
    .replace('%', '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^0-9.+-]/g, '')

  const parsed = Number(normalized)
  if (!isFinite(parsed)) return null
  return isPercent ? parsed / 100 : parsed
}

function pickNumber(source: NumericDict | null | undefined, keys: string[]): number | null {
  if (!source) return null
  for (const key of keys) {
    const value = toNumber(source[key])
    if (value != null) return value
  }
  return null
}

function pickFirstAvailable(
  sources: Array<NumericDict | null | undefined>,
  keys: string[],
): number | null {
  for (const source of sources) {
    const value = pickNumber(source, keys)
    if (value != null) return value
  }
  return null
}

function parseFormattedValue(value: string | null | undefined): { value: number | null; isPercent: boolean } {
  if (!value || isDashLike(value)) return { value: null, isPercent: false }
  const cleaned = value.replace(/\s/g, '')
  const isPercent = cleaned.includes('%')
  const normalized = cleaned.replace('%', '').replace(',', '.')
  const numeric = Number(normalized)
  if (!isFinite(numeric)) return { value: null, isPercent }
  return { value: isPercent ? numeric / 100 : numeric, isPercent }
}

function fmtRatio(value: number): string {
  return value.toFixed(2)
}

function fmtPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function normalizeDebtEquity(value: number | null): number | null {
  if (value == null || !isFinite(value)) return null
  if (value > 50) return value / 100
  return value
}

function safeDivide(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null) return null
  if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) return null
  return numerator / denominator
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function latestRecord(values: NumericDict[] | null | undefined): NumericDict | null {
  if (!Array.isArray(values) || values.length === 0) return null
  const first = values[0]
  return first && typeof first === 'object' ? first : null
}

function resolveLabelKey(indicadores: Record<string, string>, preferred: string, aliases: string[] = []): string {
  const candidates = [preferred, ...aliases]
  for (const candidate of candidates) {
    if (indicadores[candidate] != null) return candidate
  }

  const normalizedCandidates = candidates.map((candidate) => normalizeLabel(candidate))
  for (const key of Object.keys(indicadores)) {
    if (normalizedCandidates.includes(normalizeLabel(key))) {
      return key
    }
  }

  return preferred
}

function setCalculatedIfMissing(params: {
  indicadores: Record<string, string>
  calculatedByLabel: Record<string, CalculatedMetricInfo>
  label: string
  aliases?: string[]
  value: number | null
  format: 'ratio' | 'percent'
  source: string
  formula?: string
}) {
  const key = resolveLabelKey(params.indicadores, params.label, params.aliases || [])
  const current = params.indicadores[key]
  if (!isDashLike(current)) return
  if (params.value == null || !isFinite(params.value)) return

  params.indicadores[key] = params.format === 'percent' ? fmtPercent(params.value) : fmtRatio(params.value)
  params.calculatedByLabel[key] = {
    source: params.source,
    formula: params.formula,
  }
}

function pickEquity(source: NumericDict | null | undefined): number | null {
  return pickFirstAvailable([source], [
    'totalStockholdersEquity',
    'totalShareholdersEquity',
    'stockholdersEquity',
    'totalEquity',
    'totalEquityGrossMinorityInterest',
    'shareholdersEquity',
  ])
}

function pickDebt(source: NumericDict | null | undefined): number | null {
  const totalDebt = pickFirstAvailable([source], ['totalDebt'])
  if (totalDebt != null) return totalDebt

  const shortTermDebt = pickFirstAvailable([source], ['shortTermDebt', 'shortTermDebtTotal', 'currentDebt'])
  const longTermDebt = pickFirstAvailable([source], ['longTermDebt', 'longTermDebtTotal', 'longTermDebtNoncurrent'])
  if (shortTermDebt != null || longTermDebt != null) {
    return (shortTermDebt ?? 0) + (longTermDebt ?? 0)
  }

  return null
}

function computeRoeFromStatements(
  income: NumericDict | null | undefined,
  balance: NumericDict | null | undefined,
  balanceY1: NumericDict | null | undefined,
): number | null {
  const netIncome = pickFirstAvailable([income], ['netIncome'])
  const equityCurrent = pickEquity(balance)
  const equityY1 = pickEquity(balanceY1)

  if (netIncome == null || equityCurrent == null || equityCurrent <= 0) return null

  const denominator =
    equityY1 != null && equityY1 > 0
      ? (equityCurrent + equityY1) / 2
      : equityCurrent

  return safeDivide(netIncome, denominator)
}

function computeDebtEquityFromBalance(balance: NumericDict | null | undefined): number | null {
  const debt = pickDebt(balance)
  const equity = pickEquity(balance)
  if (debt == null || equity == null || equity <= 0) return null
  return normalizeDebtEquity(safeDivide(debt, equity))
}

function resolveTaxRate(params: {
  income: NumericDict | null | undefined
  ratios: NumericDict | null | undefined
  metrics: NumericDict | null | undefined
  historicalRatios: NumericDict | null | undefined
  keyMetricsHistorical: NumericDict | null | undefined
}): number {
  const fromStatements = (() => {
    const taxExpense = pickFirstAvailable([params.income], ['incomeTaxExpense'])
    const preTaxIncome = pickFirstAvailable([params.income], ['incomeBeforeTax', 'incomeBeforeTaxIncome'])
    if (taxExpense == null || preTaxIncome == null || preTaxIncome === 0) return null
    return Math.abs(taxExpense / preTaxIncome)
  })()

  const fromRatios = pickFirstAvailable(
    [params.ratios, params.metrics, params.historicalRatios, params.keyMetricsHistorical],
    ['effectiveTaxRateTTM', 'effectiveTaxRate', 'taxRate', 'incomeTaxRate'],
  )

  const candidate = fromStatements ?? fromRatios ?? 0.21
  return clamp(candidate, 0.0, 0.45)
}

function computeRoicFromStatements(params: {
  income: NumericDict | null | undefined
  balance: NumericDict | null | undefined
  ratios: NumericDict | null | undefined
  metrics: NumericDict | null | undefined
  historicalRatios: NumericDict | null | undefined
  keyMetricsHistorical: NumericDict | null | undefined
}): number | null {
  const operatingIncomeDirect = pickFirstAvailable([params.income], ['operatingIncome', 'ebit'])
  const preTaxIncome = pickFirstAvailable([params.income], ['incomeBeforeTax', 'incomeBeforeTaxIncome'])
  const interestExpense = pickFirstAvailable([params.income], ['interestExpense'])
  const operatingIncome =
    operatingIncomeDirect ??
    ((preTaxIncome != null && interestExpense != null) ? preTaxIncome + Math.abs(interestExpense) : null)

  if (operatingIncome == null) return null

  const debt = pickDebt(params.balance)
  const equity = pickEquity(params.balance)
  if (debt == null && equity == null) return null

  const cash = pickFirstAvailable([params.balance], [
    'cashAndCashEquivalents',
    'cashAndShortTermInvestments',
    'cashAndCashEquivalentsAtCarryingValue',
    'cash',
  ]) ?? 0

  const grossInvestedCapital = (debt ?? 0) + (equity ?? 0)
  if (grossInvestedCapital <= 0) return null

  let investedCapital = grossInvestedCapital - cash
  if (investedCapital <= 0) investedCapital = grossInvestedCapital

  const taxRate = resolveTaxRate({
    income: params.income,
    ratios: params.ratios,
    metrics: params.metrics,
    historicalRatios: params.historicalRatios,
    keyMetricsHistorical: params.keyMetricsHistorical,
  })
  const nopat = operatingIncome * (1 - taxRate)

  return safeDivide(nopat, investedCapital)
}

function computeEbitdaMarginFromIncome(income: NumericDict | null | undefined): number | null {
  const ebitda = pickFirstAvailable([income], ['ebitda'])
  const revenue = pickFirstAvailable([income], ['revenue', 'totalRevenue'])
  return safeDivide(ebitda, revenue)
}

function computePayoutFromStatements(
  income: NumericDict | null | undefined,
  cashflow: NumericDict | null | undefined,
): number | null {
  const dividendsPaid = pickFirstAvailable([cashflow], ['dividendsPaid', 'commonDividendsPaid'])
  const netIncome = pickFirstAvailable([income], ['netIncome'])

  if (dividendsPaid == null || netIncome == null || netIncome === 0) return null
  return Math.abs(dividendsPaid) / Math.abs(netIncome)
}

export function fillDerivedCurrentIndicadores(
  params: DerivedCurrentIndicadoresInput,
): DerivedCurrentMetricsResult {
  const indicadores = { ...(params.indicadores || {}) }
  const calculatedByLabel: Record<string, CalculatedMetricInfo> = {}

  const ratios = params.ratios ?? null
  const metrics = params.metrics ?? null
  const latestHistoricalRatios = latestRecord(params.historicalRatios)
  const latestKeyMetricsHistorical = latestRecord(params.keyMetricsHistorical)
  const income = params.income ?? null
  const balance = params.balance ?? null
  const balanceY1 = params.balanceY1 ?? null
  const cashflow = params.cashflow ?? null
  const growth = params.growth ?? null

  const sourceStack = [ratios, metrics, latestHistoricalRatios, latestKeyMetricsHistorical]

  const roeFromEndpoints = pickFirstAvailable(sourceStack, [
    'returnOnEquityTTM',
    'returnOnEquity',
    'roeTTM',
    'roe',
    'returnOnAverageEquityTTM',
    'returnOnAverageEquity',
  ])
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'ROE',
    value: roeFromEndpoints,
    format: 'percent',
    source: 'calculated.from_fmp_endpoints',
    formula: 'returnOnEquityTTM/roeTTM',
  })

  const roeFromStatements = computeRoeFromStatements(income, balance, balanceY1)
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'ROE',
    value: roeFromStatements,
    format: 'percent',
    source: 'calculated.from_income_balance',
    formula: 'ROE = netIncome / avgShareholderEquity',
  })

  const roicFromEndpoints = pickFirstAvailable(sourceStack, [
    'returnOnCapitalEmployedTTM',
    'returnOnInvestedCapitalTTM',
    'roicTTM',
    'returnOnCapitalEmployed',
    'returnOnInvestedCapital',
  ])
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'ROIC',
    value: roicFromEndpoints,
    format: 'percent',
    source: 'calculated.from_fmp_endpoints',
    formula: 'returnOnCapitalEmployedTTM/roicTTM',
  })

  const roicFromStatements = computeRoicFromStatements({
    income,
    balance,
    ratios,
    metrics,
    historicalRatios: latestHistoricalRatios,
    keyMetricsHistorical: latestKeyMetricsHistorical,
  })
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'ROIC',
    value: roicFromStatements,
    format: 'percent',
    source: 'calculated.from_income_balance',
    formula: 'ROIC = NOPAT / investedCapital',
  })

  const ebitdaMarginFromEndpoints = pickFirstAvailable(sourceStack, [
    'ebitdaratioTTM',
    'ebitdaMarginTTM',
    'ebitdaratio',
    'ebitdaMargin',
  ])
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'Margem EBITDA',
    aliases: ['Margem Ebitda'],
    value: ebitdaMarginFromEndpoints,
    format: 'percent',
    source: 'calculated.from_fmp_endpoints',
    formula: 'ebitdaratioTTM',
  })

  const ebitdaMarginFromStatements = computeEbitdaMarginFromIncome(income)
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'Margem EBITDA',
    aliases: ['Margem Ebitda'],
    value: ebitdaMarginFromStatements,
    format: 'percent',
    source: 'calculated.from_income_statement',
    formula: 'EBITDA margin = EBITDA / revenue',
  })

  const debtEquityFromEndpoints = normalizeDebtEquity(
    pickFirstAvailable(sourceStack, [
      'debtEquityRatioTTM',
      'debtEquityRatio',
      'debtToEquityTTM',
      'debtToEquity',
    ]),
  )
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'Divida / Capitais Proprios',
    aliases: ['Dívida / Capitais Próprios', 'Divida/Patrimonio', 'Dívida/Patrimônio', 'Debt/Equity'],
    value: debtEquityFromEndpoints,
    format: 'ratio',
    source: 'calculated.from_fmp_endpoints',
    formula: 'debtEquityRatioTTM',
  })

  const debtEquityFromBalance = computeDebtEquityFromBalance(balance)
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'Divida / Capitais Proprios',
    aliases: ['Dívida / Capitais Próprios', 'Divida/Patrimonio', 'Dívida/Patrimônio', 'Debt/Equity'],
    value: debtEquityFromBalance,
    format: 'ratio',
    source: 'calculated.from_balance_sheet',
    formula: 'Debt/Equity = totalDebt / totalShareholderEquity',
  })

  const payoutFromEndpoints = pickFirstAvailable(sourceStack, [
    'payoutRatioTTM',
    'payoutRatio',
    'payoutRatioAnnual',
  ])
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'Payout Ratio',
    value: payoutFromEndpoints,
    format: 'percent',
    source: 'calculated.from_fmp_endpoints',
    formula: 'payoutRatioTTM',
  })

  const payoutFromStatements = computePayoutFromStatements(income, cashflow)
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'Payout Ratio',
    value: payoutFromStatements,
    format: 'percent',
    source: 'calculated.from_cashflow_income',
    formula: 'Payout = abs(dividendsPaid) / abs(netIncome)',
  })

  const pegFromEndpoints = pickFirstAvailable(sourceStack, [
    'pegRatioTTM',
    'pegRatio',
    'priceEarningsToGrowthRatioTTM',
    'priceEarningsToGrowthRatio',
  ])
  setCalculatedIfMissing({
    indicadores,
    calculatedByLabel,
    label: 'PEG',
    value: pegFromEndpoints,
    format: 'ratio',
    source: 'calculated.from_fmp_endpoints',
    formula: 'pegRatioTTM',
  })

  const pegKey = resolveLabelKey(indicadores, 'PEG')
  if (isDashLike(indicadores[pegKey])) {
    const peIndicatorKey = resolveLabelKey(indicadores, 'P/L')
    const cagrIndicatorKey = resolveLabelKey(indicadores, 'CAGR EPS')
    const peFromIndicator = parseFormattedValue(indicadores[peIndicatorKey]).value
    const growthFromIndicator = parseFormattedValue(indicadores[cagrIndicatorKey]).value

    const peFromSources = peFromIndicator ?? pickFirstAvailable(sourceStack, ['peRatioTTM', 'peRatio'])
    const growthFromSources =
      growthFromIndicator ??
      pickFirstAvailable(
        [growth, latestHistoricalRatios, latestKeyMetricsHistorical],
        ['epsGrowth', 'epsgrowth', 'growthEPS', 'epsGrowthTTM', 'earningsGrowth'],
      )

    if (peFromSources != null && growthFromSources != null) {
      const growthPercent = Math.abs(growthFromSources * 100)
      if (growthPercent > 0.0001) {
        setCalculatedIfMissing({
          indicadores,
          calculatedByLabel,
          label: 'PEG',
          value: peFromSources / growthPercent,
          format: 'ratio',
          source: 'calculated.from_pe_growth',
          formula: 'PEG = (P/L) / abs(growth_percent)',
        })
      }
    }
  }

  return {
    indicadores,
    calculatedByLabel,
  }
}
