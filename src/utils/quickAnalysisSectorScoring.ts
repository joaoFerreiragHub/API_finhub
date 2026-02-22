import { QuickMetricCategory, QuickMetricDefinition, QuickMetricGovernance, QuickMetricState } from './quickAnalysisMetrics'

export interface SectorContextScore {
  score: number
  label: 'Excelente' | 'Forte' | 'Solido' | 'Neutro' | 'Fragil'
  sector: string
  confidence: number
  coreCoverage: number
  benchmarkComparableCore: number
  favorableVsBenchmarkCore: number
}

export interface DataQualityScore {
  score: number
  label: 'Robusta' | 'Boa' | 'Moderada' | 'Fraca'
  coreCoverage: number
  directRate: number
  calculatedRate: number
  missingRate: number
}

const LOWER_IS_BETTER = new Set([
  'pe',
  'ps',
  'peg',
  'debt_to_ebitda',
  'debt_equity',
  'beta',
])

// Sensibilidade diferenciada por categoria — evita que múltiplos voláteis
// saturem o score da mesma forma que margens estáveis.
const CATEGORY_SENSITIVITY: Record<QuickMetricCategory, number> = {
  multiplos: 40,
  estrutura_capital: 45,
  crescimento: 50,
  rentabilidade: 55,
  retorno_capital: 55,
  risco: 35,
}
const DEFAULT_SENSITIVITY = 50

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function isDashLike(value: string | null | undefined): boolean {
  if (value == null) return true
  const trimmed = value.trim()
  return (
    trimmed === '' ||
    trimmed === '-' ||
    trimmed === '--' ||
    trimmed === '---' ||
    trimmed === 'N/A' ||
    trimmed === 'n/a' ||
    trimmed === '\u2014'
  )
}

function parseMetricNumeric(value: string | null | undefined): number | null {
  if (isDashLike(value)) return null
  const cleaned = String(value)
    .replace(/[%,$]/g, '')
    .replace(/\s+/g, '')
    .replace(',', '.')
  const numeric = Number.parseFloat(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

function isReadyState(state: QuickMetricState): boolean {
  return state.status === 'ok' || state.status === 'calculated'
}

function buildCategoryMap(catalog: QuickMetricDefinition[]): Record<string, QuickMetricCategory> {
  const map: Record<string, QuickMetricCategory> = {}
  for (const metric of catalog) {
    map[metric.key] = metric.category
  }
  return map
}

function computeRelativeCoreScore(
  states: Record<string, QuickMetricState>,
  categoryMap: Record<string, QuickMetricCategory>,
): { score: number; comparableCore: number; favorableCore: number } {
  let sum = 0
  let comparableCore = 0
  let favorableCore = 0

  for (const [key, state] of Object.entries(states)) {
    if (!state.requiredForSector || !isReadyState(state)) continue

    const current = parseMetricNumeric(state.value)
    const benchmark = parseMetricNumeric(state.benchmarkValue)
    if (current == null || benchmark == null) continue

    const lowerBetter = LOWER_IS_BETTER.has(key)
    if ((lowerBetter && (current <= 0 || benchmark <= 0)) || (!lowerBetter && benchmark === 0)) {
      continue
    }

    const ratio = lowerBetter ? benchmark / current : current / benchmark
    const category = categoryMap[key]
    const sensitivity = category ? (CATEGORY_SENSITIVITY[category] ?? DEFAULT_SENSITIVITY) : DEFAULT_SENSITIVITY
    const metricScore = clamp(50 + (ratio - 1) * sensitivity, 0, 100)

    comparableCore += 1
    sum += metricScore

    if ((lowerBetter && current <= benchmark) || (!lowerBetter && current >= benchmark)) {
      favorableCore += 1
    }
  }

  if (comparableCore === 0) {
    return { score: 50, comparableCore: 0, favorableCore: 0 }
  }

  return {
    score: round1(sum / comparableCore),
    comparableCore,
    favorableCore,
  }
}

function mapSectorScoreLabel(score: number): SectorContextScore['label'] {
  if (score >= 85) return 'Excelente'
  if (score >= 70) return 'Forte'
  if (score >= 55) return 'Solido'
  if (score >= 40) return 'Neutro'
  return 'Fragil'
}

function mapDataQualityLabel(score: number): DataQualityScore['label'] {
  if (score >= 85) return 'Robusta'
  if (score >= 70) return 'Boa'
  if (score >= 50) return 'Moderada'
  return 'Fraca'
}

export function computeSectorContextScore(params: {
  finHubScore: number
  governance: QuickMetricGovernance
  sector: string
}): SectorContextScore {
  const { finHubScore, governance } = params
  const coreTotal = governance.summary.coreTotal
  const coreReady = governance.summary.coreReady
  const coreCoverage = coreTotal > 0 ? (coreReady / coreTotal) * 100 : 0

  const categoryMap = buildCategoryMap(governance.catalog)
  const relative = computeRelativeCoreScore(governance.states, categoryMap)
  const comparableRatio = coreTotal > 0 ? relative.comparableCore / coreTotal : 0
  const confidence = Math.round(clamp(coreCoverage * 0.65 + comparableRatio * 35, 0, 100))

  // Score puro empresa: 50% saúde financeira + 50% posição relativa vs peers
  // Se sem benchmarks comparáveis, o relative default (50) pesa menos
  const hasComparisons = relative.comparableCore > 0
  const rawScore = hasComparisons
    ? finHubScore * 0.50 + relative.score * 0.50
    : finHubScore * 0.85 + 50 * 0.15

  // Confidence gating: penalizar score quando dados comparáveis são insuficientes
  const confidencePenalty = confidence < 50 ? 0.85 : confidence < 65 ? 0.93 : 1.0
  const score = Math.round(clamp(rawScore * confidencePenalty, 0, 100))

  return {
    score,
    label: mapSectorScoreLabel(score),
    sector: params.sector,
    confidence,
    coreCoverage: Math.round(coreCoverage),
    benchmarkComparableCore: relative.comparableCore,
    favorableVsBenchmarkCore: relative.favorableCore,
  }
}

export function computeDataQualityScore(governance: QuickMetricGovernance): DataQualityScore {
  const summary = governance.summary
  const effectiveTotal = Math.max(1, summary.total - summary.nao_aplicavel)

  const directRate = summary.ok / effectiveTotal
  const calculatedRate = summary.calculated / effectiveTotal
  const missingRate = (summary.sem_dado_atual + summary.erro_fonte) / effectiveTotal
  const coreCoverage = summary.coreTotal > 0 ? summary.coreReady / summary.coreTotal : 0

  const score = Math.round(
    clamp(
      coreCoverage * 100 * 0.55 +
        directRate * 100 * 0.25 +
        calculatedRate * 100 * 0.1 -
        missingRate * 100 * 0.25,
      0,
      100,
    ),
  )

  return {
    score,
    label: mapDataQualityLabel(score),
    coreCoverage: Math.round(coreCoverage * 100),
    directRate: round1(directRate * 100),
    calculatedRate: round1(calculatedRate * 100),
    missingRate: round1(missingRate * 100),
  }
}
