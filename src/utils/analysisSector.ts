type AnalysisSector =
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

export interface AnalysisSectorResolution {
  analysisSector: AnalysisSector
  reason: string
}

interface ResolveAnalysisSectorParams {
  symbol?: string | null
  sector?: string | null
  industry?: string | null
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .toLowerCase()
    .trim()
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term))
}

function mapRawSectorAlias(sector: string): AnalysisSector | null {
  const normalized = normalize(sector)
  if (!normalized) return null

  const directMap: Array<{ match: string; sector: AnalysisSector }> = [
    { match: 'technology', sector: 'Technology' },
    { match: 'communication services', sector: 'Communication Services' },
    { match: 'health care', sector: 'Healthcare' },
    { match: 'healthcare', sector: 'Healthcare' },
    { match: 'financial services', sector: 'Financial Services' },
    { match: 'real estate', sector: 'Real Estate' },
    { match: 'industrials', sector: 'Industrials' },
    { match: 'industrial', sector: 'Industrials' },
    { match: 'energy', sector: 'Energy' },
    { match: 'consumer defensive', sector: 'Consumer Defensive' },
    { match: 'consumer staples', sector: 'Consumer Defensive' },
    { match: 'consumer cyclical', sector: 'Consumer Cyclical' },
    { match: 'consumer discretionary', sector: 'Consumer Cyclical' },
    { match: 'basic materials', sector: 'Basic Materials' },
    { match: 'materials', sector: 'Basic Materials' },
    { match: 'utilities', sector: 'Utilities' },
    { match: 'utility', sector: 'Utilities' },
  ]

  const found = directMap.find((item) => normalized === item.match || normalized.includes(item.match))
  return found?.sector ?? null
}

export function resolveAnalysisSector(
  params: ResolveAnalysisSectorParams,
): AnalysisSectorResolution {
  const symbol = normalize(params.symbol)
  const rawSector = normalize(params.sector)
  const industry = normalize(params.industry)
  const combined = `${rawSector} ${industry}`.trim()

  if (industry.includes('reit') || rawSector.includes('real estate')) {
    return { analysisSector: 'Real Estate', reason: 'industry_or_sector_reit_real_estate' }
  }

  if (
    includesAny(industry, [
      'bank',
      'insurance',
      'asset management',
      'capital markets',
      'credit services',
      'financial data',
      'fintech',
      'investment',
    ]) ||
    includesAny(rawSector, ['financial'])
  ) {
    return { analysisSector: 'Financial Services', reason: 'industry_financial_keywords' }
  }

  if (
    includesAny(industry, [
      'regulated electric',
      'utilities',
      'utility',
      'independent power producer',
      'water utilities',
      'multi-utilities',
      'diversified utilities',
      'electric utilities',
      'gas utilities',
      'renewable utilities',
    ]) ||
    includesAny(rawSector, ['utilities', 'utility'])
  ) {
    return { analysisSector: 'Utilities', reason: 'industry_utilities_keywords' }
  }

  if (
    includesAny(industry, [
      'oil',
      'gas',
      'exploration',
      'production',
      'midstream',
      'downstream',
      'integrated',
      'refining',
      'lng',
      'energy equipment',
      'uranium',
      'coal',
    ]) ||
    includesAny(rawSector, ['energy'])
  ) {
    return { analysisSector: 'Energy', reason: 'industry_energy_keywords' }
  }

  if (
    includesAny(industry, [
      'internet content',
      'interactive media',
      'telecom',
      'broadcast',
      'entertainment',
      'streaming',
      'advertising',
      'publishing',
    ]) ||
    ['googl', 'goog', 'meta', 'nflx', 'dis', 'tmus', 'vz', 't'].includes(symbol)
  ) {
    return { analysisSector: 'Communication Services', reason: 'industry_communication_keywords' }
  }

  if (
    includesAny(industry, ['software', 'semiconductor', 'it services', 'hardware', 'electronics']) ||
    includesAny(rawSector, ['technology', 'information technology'])
  ) {
    return { analysisSector: 'Technology', reason: 'industry_technology_keywords' }
  }

  if (
    includesAny(industry, ['pharma', 'biotech', 'medical', 'healthcare', 'health care']) ||
    includesAny(rawSector, ['health'])
  ) {
    return { analysisSector: 'Healthcare', reason: 'industry_healthcare_keywords' }
  }

  if (
    includesAny(industry, ['retail', 'automotive', 'travel', 'leisure', 'apparel']) ||
    includesAny(rawSector, ['consumer discretionary', 'consumer cyclical'])
  ) {
    return { analysisSector: 'Consumer Cyclical', reason: 'industry_consumer_cyclical_keywords' }
  }

  if (
    includesAny(industry, ['food', 'beverage', 'household', 'packaged', 'tobacco']) ||
    includesAny(rawSector, ['consumer staples', 'consumer defensive'])
  ) {
    return { analysisSector: 'Consumer Defensive', reason: 'industry_consumer_defensive_keywords' }
  }

  if (
    includesAny(industry, ['chemical', 'metals', 'mining', 'forest', 'paper']) ||
    includesAny(rawSector, ['materials', 'basic materials'])
  ) {
    return { analysisSector: 'Basic Materials', reason: 'industry_basic_materials_keywords' }
  }

  if (
    includesAny(industry, ['aerospace', 'defense', 'machinery', 'transportation', 'industrial']) ||
    includesAny(rawSector, ['industrials', 'industrial'])
  ) {
    return { analysisSector: 'Industrials', reason: 'industry_industrials_keywords' }
  }

  const alias = mapRawSectorAlias(rawSector)
  if (alias) {
    return { analysisSector: alias, reason: 'raw_sector_alias' }
  }

  return { analysisSector: 'Technology', reason: 'fallback_default' }
}
