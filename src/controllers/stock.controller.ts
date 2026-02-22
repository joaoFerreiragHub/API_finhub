import { Request, Response } from 'express'
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

export const getQuickAnalysis = async (req: Request, res: Response) => {
  const symbol = String(req.params.symbol ?? '')
  console.log(`🎯 getQuickAnalysis chamado com símbolo: "${symbol}"`)

  try {
    // 1. Fetch profile primeiro para obter o tipo de empresa (D1: sector radar)
    const profile = await fetchProfile(symbol)

    // Detectar tipo de empresa para ceilings do radar
    const industry = (profile as any).industry?.toLowerCase() ?? ''
    const sector   = (profile as any).sector?.toLowerCase() ?? ''
    const companyTypeHint = {
      isBanco: industry.includes('banks') || industry.includes('banking'),
      isREIT: industry.includes('reit') || (sector.includes('real estate') && !industry.includes('services')),
      isPaymentProcessor: industry.includes('credit services') || industry.includes('payment'),
    }

    // 2. Resto em paralelo, agora com companyTypeHint no radar
    const [
      scores,
      alerts,
      radarWithPeers,
      indicadoresOutput,
      { peers, quotes }
    ] = await Promise.all([
      fetchScores(symbol),
      fetchAlerts(symbol),
      fetchRadarWithPeers(symbol, companyTypeHint),
      fetchIndicadores(symbol),
      fetchPeers(symbol)
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

    // B1 — Growth Score melhorado
    const qualityScore = scores.financialScores?.piotroskiScore ?? 0
    const riskScore    = Math.min(scores.financialScores?.altmanZScore ?? 5, 10)
    const valuationGrade = simplifyRating(scores.rating?.rating || 'C')

    const growthScore = computeGrowthScore(
      rawForScoring.cagrEps,
      rawForScoring.revenueGrowth,
      scores.rating?.ratingDetailsDCFScore
    )

    // B2 — FinHub Score composto
    const finHubScore = computeFinHubScore(qualityScore, growthScore, valuationGrade, riskScore)
    const sectorContextScore = computeSectorContextScore({
      finHubScore: finHubScore.score,
      governance: quickMetricGovernance,
      sector: quickMetricGovernance.ingestion.resolvedSector ?? profile.sector ?? 'Unknown',
    })

    const quickAnalysis = {
      ...profile,
      qualityScore,
      growthScore,
      valuationGrade,
      valuationRawGrade: scores.rating?.rating || 'C+',
      riskScore,
      piotroskiScore: scores.financialScores?.piotroskiScore ?? null,
      altmanZScore: scores.financialScores?.altmanZScore ?? null,
      // B2: FinHub Score
      finHubScore: finHubScore.score,
      finHubLabel: finHubScore.label,
      finHubCoverage: finHubScore.coverage,
      sectorContextScore,
      dataQualityScore,
      // A2: period tag
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
      peersQuotes: quotes
    }

    res.json(quickAnalysis)
  } catch (error) {
    console.error('Erro ao gerar análise rápida:', error)
    res.status(500).json({ error: 'Erro ao gerar análise rápida' })
  }
}
