export type QuickMetricStatus =
  | 'ok'
  | 'calculated'
  | 'nao_aplicavel'
  | 'sem_dado_atual'
  | 'erro_fonte'

export type QuickMetricPriority = 'core' | 'optional' | 'nao_aplicavel'

export type QuickMetricCategory =
  | 'crescimento'
  | 'rentabilidade'
  | 'retorno_capital'
  | 'multiplos'
  | 'estrutura_capital'
  | 'risco'

export type QuickMetricUnit = 'ratio' | 'percent' | 'currency' | 'score'
export type QuickMetricPeriod = 'TTM' | 'FY' | 'Q' | 'MIXED'

export type QuickAnalysisSector =
  | 'Technology'
  | 'Communication Services'
  | 'Healthcare'
  | 'Financial Services'
  | 'Real Estate'
  | 'Industrials'
  | 'Energy'
  | 'Consumer Defensive'
  | 'Consumer Cyclical'
  | 'Basic Materials'
  | 'Utilities'

type QuickMetricDefinitionInternal = {
  key: string
  label: string
  category: QuickMetricCategory
  unit: QuickMetricUnit
  dataPeriod: QuickMetricPeriod
  primarySources: string[]
  fallbackSources: string[]
  formula?: string
  aliases?: string[]
  coreSectors?: QuickAnalysisSector[]
  notApplicableSectors?: QuickAnalysisSector[]
}

export interface QuickMetricDefinition {
  key: string
  label: string
  category: QuickMetricCategory
  unit: QuickMetricUnit
  dataPeriod: QuickMetricPeriod
  primarySources: string[]
  fallbackSources: string[]
  formula?: string
  sectorPolicy: Record<QuickAnalysisSector, QuickMetricPriority>
  sectorPriority: QuickMetricPriority
}

export interface QuickMetricState {
  status: QuickMetricStatus
  value: string | null
  source: string | null
  dataPeriod: QuickMetricPeriod | null
  asOf: string
  reason?: string
  benchmarkValue?: string | null
  benchmarkSource?: string | null
  benchmarkDataPeriod?: QuickMetricPeriod | null
  sectorPriority: QuickMetricPriority
  requiredForSector: boolean
}

export interface QuickMetricGovernance {
  contractVersion: 'p3.0'
  catalog: QuickMetricDefinition[]
  states: Record<string, QuickMetricState>
  ingestion: {
    currentDataPeriodRaw: string | null
    currentDataPeriodNormalized: QuickMetricPeriod | null
    benchmarkAsOf: string | null
    sourcesObserved: Record<string, number>
    resolvedSector: QuickAnalysisSector | null
  }
  summary: {
    total: number
    ok: number
    calculated: number
    nao_aplicavel: number
    sem_dado_atual: number
    erro_fonte: number
    coreTotal: number
    coreReady: number
    coreMissing: number
    optionalTotal: number
    optionalReady: number
    optionalMissing: number
  }
}

const QUICK_ANALYSIS_SECTORS: QuickAnalysisSector[] = [
  'Technology',
  'Communication Services',
  'Healthcare',
  'Financial Services',
  'Real Estate',
  'Industrials',
  'Energy',
  'Consumer Defensive',
  'Consumer Cyclical',
  'Basic Materials',
  'Utilities',
]

const CORE_ALL_SECTORS: QuickAnalysisSector[] = [...QUICK_ANALYSIS_SECTORS]
const CORE_NON_FINANCIAL: QuickAnalysisSector[] = QUICK_ANALYSIS_SECTORS.filter(
  (sector) => sector !== 'Financial Services',
)
const CORE_MARGIN_STANDARD: QuickAnalysisSector[] = [
  'Technology',
  'Communication Services',
  'Healthcare',
  'Industrials',
  'Energy',
  'Consumer Defensive',
  'Consumer Cyclical',
  'Basic Materials',
]

const QUICK_ANALYSIS_METRICS: QuickMetricDefinitionInternal[] = [
  {
    key: 'revenue_growth',
    label: 'Crescimento Receita',
    aliases: ['Crescimento da Receita'],
    category: 'crescimento',
    unit: 'percent',
    dataPeriod: 'TTM',
    primarySources: ['fmp.financial-growth'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'cagr_eps',
    label: 'CAGR EPS',
    category: 'crescimento',
    unit: 'percent',
    dataPeriod: 'MIXED',
    primarySources: ['fmp.earnings-calendar', 'fmp.income-statement'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    coreSectors: CORE_NON_FINANCIAL,
  },
  {
    key: 'eps',
    label: 'EPS',
    category: 'crescimento',
    unit: 'currency',
    dataPeriod: 'TTM',
    primarySources: ['fmp.key-metrics-ttm'],
    fallbackSources: ['benchmark.peer_median'],
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'gross_margin',
    label: 'Margem Bruta',
    category: 'rentabilidade',
    unit: 'percent',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    coreSectors: CORE_MARGIN_STANDARD,
  },
  {
    key: 'ebitda_margin',
    label: 'Margem EBITDA',
    category: 'rentabilidade',
    unit: 'percent',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    coreSectors: CORE_NON_FINANCIAL,
  },
  {
    key: 'net_margin',
    label: 'Margem Liquida',
    aliases: ['Margem L\u00edquida'],
    category: 'rentabilidade',
    unit: 'percent',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'operating_margin',
    label: 'Margem Operacional',
    category: 'rentabilidade',
    unit: 'percent',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'roic',
    label: 'ROIC',
    category: 'retorno_capital',
    unit: 'percent',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm', 'fmp.key-metrics-ttm'],
    fallbackSources: ['benchmark.peer_median'],
    formula: '(NOPAT) / investedCapital',
    coreSectors: CORE_NON_FINANCIAL.filter((sector) => sector !== 'Real Estate'),
    notApplicableSectors: ['Financial Services'],
  },
  {
    key: 'roe',
    label: 'ROE',
    category: 'retorno_capital',
    unit: 'percent',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm', 'fmp.key-metrics-ttm'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    formula: 'netIncome / avgShareholderEquity',
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'pe',
    label: 'P/L',
    category: 'multiplos',
    unit: 'ratio',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.industry_snapshot', 'google_finance', 'yahoo_finance', 'sector.fallback'],
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'ps',
    label: 'P/S',
    category: 'multiplos',
    unit: 'ratio',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'peg',
    label: 'PEG',
    category: 'multiplos',
    unit: 'ratio',
    dataPeriod: 'MIXED',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.peer_median', 'sector.fallback'],
    formula: '(P/L) / growthRate',
    coreSectors: [
      'Technology',
      'Communication Services',
      'Healthcare',
      'Consumer Cyclical',
      'Consumer Defensive',
      'Industrials',
      'Basic Materials',
    ],
  },
  {
    key: 'debt_to_ebitda',
    label: 'Divida/EBITDA',
    aliases: ['D\u00edvida/EBITDA', 'Endividamento'],
    category: 'estrutura_capital',
    unit: 'ratio',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm'],
    fallbackSources: ['benchmark.peer_median'],
    coreSectors: CORE_NON_FINANCIAL,
    notApplicableSectors: ['Financial Services'],
  },
  {
    key: 'current_ratio',
    label: 'Liquidez Corrente',
    category: 'estrutura_capital',
    unit: 'ratio',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm', 'fmp.key-metrics-ttm'],
    fallbackSources: ['benchmark.peer_median'],
    coreSectors: CORE_NON_FINANCIAL,
  },
  {
    key: 'debt_equity',
    label: 'Divida / Capitais Proprios',
    aliases: ['D\u00edvida / Capitais Pr\u00f3prios', 'Divida/Patrimonio', 'D\u00edvida/Patrim\u00f4nio', 'Debt/Equity'],
    category: 'estrutura_capital',
    unit: 'ratio',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm', 'fmp.key-metrics-ttm'],
    fallbackSources: ['benchmark.peer_median'],
    coreSectors: CORE_ALL_SECTORS,
  },
  {
    key: 'cash_ratio',
    label: 'Cash Ratio',
    category: 'estrutura_capital',
    unit: 'ratio',
    dataPeriod: 'TTM',
    primarySources: ['fmp.ratios-ttm', 'fmp.key-metrics-ttm'],
    fallbackSources: ['benchmark.peer_median'],
    coreSectors: CORE_NON_FINANCIAL,
  },
  {
    key: 'beta',
    label: 'Beta',
    category: 'risco',
    unit: 'ratio',
    dataPeriod: 'TTM',
    primarySources: ['fmp.profile'],
    fallbackSources: ['benchmark.peer_median'],
    coreSectors: CORE_ALL_SECTORS,
  },
]

type BenchmarkMetadataMap = Record<string, { source: string; sampleSize?: number }>
type CalculatedMetricMap = Record<string, { source: string; formula?: string }>

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

function resolveQuickAnalysisSector(value: string): QuickAnalysisSector | null {
  const normalized = normalizeLabel(value)
  const direct = QUICK_ANALYSIS_SECTORS.find((sector) => normalizeLabel(sector) === normalized)
  if (direct) return direct

  const aliasMap: Array<{ aliases: string[]; target: QuickAnalysisSector }> = [
    { aliases: ['consumer staples', 'consumer defensive'], target: 'Consumer Defensive' },
    { aliases: ['consumer discretionary', 'consumer cyclical'], target: 'Consumer Cyclical' },
    { aliases: ['health care', 'healthcare'], target: 'Healthcare' },
    { aliases: ['materials', 'basic materials'], target: 'Basic Materials' },
    { aliases: ['utility', 'utilities'], target: 'Utilities' },
    { aliases: ['financial', 'financial services'], target: 'Financial Services' },
    { aliases: ['industrial', 'industrials'], target: 'Industrials' },
    { aliases: ['communication services', 'telecom', 'media'], target: 'Communication Services' },
    { aliases: ['energy'], target: 'Energy' },
    { aliases: ['technology'], target: 'Technology' },
    { aliases: ['real estate', 'reit'], target: 'Real Estate' },
  ]

  for (const item of aliasMap) {
    if (item.aliases.some((alias) => normalized.includes(alias))) {
      return item.target
    }
  }

  return null
}

function resolveMetricPriority(
  metric: QuickMetricDefinitionInternal,
  sector: QuickAnalysisSector | null,
): QuickMetricPriority {
  if (!sector) return 'optional'
  if ((metric.notApplicableSectors || []).includes(sector)) return 'nao_aplicavel'
  if ((metric.coreSectors || []).includes(sector)) return 'core'
  return 'optional'
}

function buildSectorPolicy(metric: QuickMetricDefinitionInternal): Record<QuickAnalysisSector, QuickMetricPriority> {
  const policy = {} as Record<QuickAnalysisSector, QuickMetricPriority>
  for (const sector of QUICK_ANALYSIS_SECTORS) {
    policy[sector] = resolveMetricPriority(metric, sector)
  }
  return policy
}

function findComparableValue(
  targetLabel: string,
  labels: string[],
  values: Record<string, string>,
): string | null {
  const directCandidates = [targetLabel, ...labels]
  for (const candidate of directCandidates) {
    if (values[candidate] != null) return values[candidate]
  }

  const normalizedCandidates = directCandidates.map((candidate) => normalizeLabel(candidate))
  for (const [key, value] of Object.entries(values)) {
    if (normalizedCandidates.includes(normalizeLabel(key))) return value
  }

  return null
}

function findComparableKey(targetLabel: string, labels: string[], values: Record<string, unknown>): string | null {
  const directCandidates = [targetLabel, ...labels]
  for (const candidate of directCandidates) {
    if (values[candidate] != null) return candidate
  }

  const normalizedCandidates = directCandidates.map((candidate) => normalizeLabel(candidate))
  for (const key of Object.keys(values)) {
    if (normalizedCandidates.includes(normalizeLabel(key))) return key
  }

  return null
}

function buildQuickMetricSummary(states: Record<string, QuickMetricState>) {
  return Object.values(states).reduce(
    (acc, state) => {
      acc.total += 1
      acc[state.status] += 1

      if (state.sectorPriority === 'core') {
        acc.coreTotal += 1
        if (state.status === 'ok' || state.status === 'calculated') acc.coreReady += 1
        if (state.status === 'sem_dado_atual' || state.status === 'erro_fonte') acc.coreMissing += 1
      } else if (state.sectorPriority === 'optional') {
        acc.optionalTotal += 1
        if (state.status === 'ok' || state.status === 'calculated') acc.optionalReady += 1
        if (state.status === 'sem_dado_atual' || state.status === 'erro_fonte') acc.optionalMissing += 1
      }

      return acc
    },
    {
      total: 0,
      ok: 0,
      calculated: 0,
      nao_aplicavel: 0,
      sem_dado_atual: 0,
      erro_fonte: 0,
      coreTotal: 0,
      coreReady: 0,
      coreMissing: 0,
      optionalTotal: 0,
      optionalReady: 0,
      optionalMissing: 0,
    },
  )
}

function normalizePeriodTag(dataPeriod: string | null | undefined): QuickMetricPeriod | null {
  if (!dataPeriod) return null
  const normalized = normalizeLabel(dataPeriod)
  if (normalized.includes('ttm')) return 'TTM'
  if (/\bq[1-4]\b/.test(normalized) || normalized.includes('quarter')) return 'Q'
  if (normalized.startsWith('fy') || normalized.includes(' fiscal') || normalized.includes('annual')) return 'FY'
  return null
}

function resolveMetricDataPeriod(
  metric: QuickMetricDefinitionInternal,
  currentDataPeriodNormalized: QuickMetricPeriod | null,
): QuickMetricPeriod {
  if (metric.dataPeriod === 'MIXED') return currentDataPeriodNormalized ?? 'MIXED'
  return metric.dataPeriod
}

function resolveCurrentMetricSource(metric: QuickMetricDefinitionInternal, value: string | null): string | null {
  if (isDashLike(value)) return null
  if (metric.formula) return 'indicadores.derived'
  return metric.primarySources[0] ?? 'api'
}

function mapBenchmarkSourceToPeriod(source: string | null | undefined): QuickMetricPeriod | null {
  if (!source) return null
  if (source === 'peer_median' || source === 'google_finance' || source === 'yahoo_finance') return 'TTM'
  if (source === 'industry_snapshot' || source === 'sector_snapshot') return 'FY'
  if (source === 'fallback') return 'MIXED'
  return null
}

function buildSourcesObserved(states: Record<string, QuickMetricState>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const state of Object.values(states)) {
    if (state.source) result[state.source] = (result[state.source] ?? 0) + 1
    if (state.benchmarkSource) {
      const key = `benchmark.${state.benchmarkSource}`
      result[key] = (result[key] ?? 0) + 1
    }
  }
  return result
}

export function buildQuickMetricGovernance(params: {
  sector: string
  indicadores: Record<string, string>
  calculatedMetricsByLabel?: CalculatedMetricMap
  benchmarkComparisons?: Record<string, string>
  benchmarkMetadata?: BenchmarkMetadataMap
  currentDataPeriod?: string | null
  benchmarkAsOf?: string | null
  asOf?: string
}): QuickMetricGovernance {
  const asOf = params.asOf ?? new Date().toISOString()
  const currentDataPeriodRaw = params.currentDataPeriod ?? null
  const currentDataPeriodNormalized = normalizePeriodTag(currentDataPeriodRaw)
  const benchmarkComparisons = params.benchmarkComparisons || {}
  const benchmarkMetadata = params.benchmarkMetadata || {}
  const calculatedMetricsByLabel = params.calculatedMetricsByLabel || {}
  const resolvedSector = resolveQuickAnalysisSector(params.sector)
  const states: Record<string, QuickMetricState> = {}

  for (const metric of QUICK_ANALYSIS_METRICS) {
    const sectorPriority = resolveMetricPriority(metric, resolvedSector)
    const requiredForSector = sectorPriority === 'core'
    const metricDataPeriod = resolveMetricDataPeriod(metric, currentDataPeriodNormalized)

    if (sectorPriority === 'nao_aplicavel') {
      states[metric.key] = {
        status: 'nao_aplicavel',
        value: null,
        source: null,
        dataPeriod: metricDataPeriod,
        asOf,
        reason: `metrica_nao_aplicavel_para_${normalizeLabel(params.sector).replace(/\s+/g, '_')}`,
        sectorPriority,
        requiredForSector,
      }
      continue
    }

    const aliases = metric.aliases || []
    const rawValue = findComparableValue(metric.label, aliases, params.indicadores)
    const calculatedMetricKey = findComparableKey(metric.label, aliases, calculatedMetricsByLabel)
    const calculatedMetricInfo = calculatedMetricKey ? calculatedMetricsByLabel[calculatedMetricKey] : null
    const benchmarkValue = findComparableValue(metric.label, aliases, benchmarkComparisons)
    const benchmarkMetadataKey = findComparableKey(metric.label, aliases, benchmarkMetadata)
    const benchmarkSource = benchmarkMetadataKey ? benchmarkMetadata[benchmarkMetadataKey]?.source ?? null : null
    const currentSource = resolveCurrentMetricSource(metric, rawValue)
    const benchmarkDataPeriod = mapBenchmarkSourceToPeriod(benchmarkSource)

    if (!isDashLike(rawValue)) {
      states[metric.key] = {
        status: calculatedMetricInfo ? 'calculated' : 'ok',
        value: rawValue!,
        source: calculatedMetricInfo?.source ?? currentSource,
        dataPeriod: metricDataPeriod,
        asOf,
        reason: calculatedMetricInfo?.formula ? `formula:${calculatedMetricInfo.formula}` : undefined,
        benchmarkValue: isDashLike(benchmarkValue) ? null : benchmarkValue!,
        benchmarkSource,
        benchmarkDataPeriod,
        sectorPriority,
        requiredForSector,
      }
      continue
    }

    states[metric.key] = {
      status: 'sem_dado_atual',
      value: null,
      source: metric.primarySources[0] ?? null,
      dataPeriod: metricDataPeriod,
      asOf,
      reason: requiredForSector
        ? 'core_metric_sem_dado_atual'
        : isDashLike(benchmarkValue)
          ? 'optional_metric_sem_dado_atual'
          : 'optional_metric_com_benchmark_sem_valor_atual',
      benchmarkValue: isDashLike(benchmarkValue) ? null : benchmarkValue!,
      benchmarkSource,
      benchmarkDataPeriod,
      sectorPriority,
      requiredForSector,
    }
  }

  return {
    contractVersion: 'p3.0',
    catalog: QUICK_ANALYSIS_METRICS.map((metric) => ({
      key: metric.key,
      label: metric.label,
      category: metric.category,
      unit: metric.unit,
      dataPeriod: metric.dataPeriod,
      primarySources: metric.primarySources,
      fallbackSources: metric.fallbackSources,
      formula: metric.formula,
      sectorPolicy: buildSectorPolicy(metric),
      sectorPriority: resolveMetricPriority(metric, resolvedSector),
    })),
    states,
    ingestion: {
      currentDataPeriodRaw,
      currentDataPeriodNormalized,
      benchmarkAsOf: params.benchmarkAsOf ?? null,
      sourcesObserved: buildSourcesObserved(states),
      resolvedSector,
    },
    summary: buildQuickMetricSummary(states),
  }
}
