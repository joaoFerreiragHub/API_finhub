import { detectReitSubtype, type ConfidenceLevel, type FfoSource, type ReitSubtype } from '../src/controllers/reit.controller'

type ReitSubtypeCase = {
  ticker: string
  industry: string
  companyName: string
  ebitdaRaw: number | null
  debtToEbitda: number | null
  ffoSource: FfoSource
  expectedSubtype: ReitSubtype
  expectedConfidence: ConfidenceLevel
}

const CASES: ReitSubtypeCase[] = [
  { ticker: 'VICI', industry: 'REIT - Specialty', companyName: 'VICI Properties Inc.', ebitdaRaw: 0, debtToEbitda: null, ffoSource: 'key-metrics', expectedSubtype: 'net-lease', expectedConfidence: 'high' },
  { ticker: 'O', industry: 'REIT - Retail', companyName: 'Realty Income Corporation', ebitdaRaw: 0, debtToEbitda: null, ffoSource: 'key-metrics', expectedSubtype: 'net-lease', expectedConfidence: 'medium' },
  { ticker: 'NNN', industry: 'REIT - Retail', companyName: 'NNN REIT, Inc.', ebitdaRaw: 0, debtToEbitda: null, ffoSource: 'key-metrics', expectedSubtype: 'net-lease', expectedConfidence: 'medium' },
  { ticker: 'GLPI', industry: 'REIT - Specialty', companyName: 'Gaming and Leisure Properties, Inc.', ebitdaRaw: 0, debtToEbitda: null, ffoSource: 'key-metrics', expectedSubtype: 'net-lease', expectedConfidence: 'high' },
  { ticker: 'EQIX', industry: 'REIT - Specialty', companyName: 'Equinix, Inc.', ebitdaRaw: 2_500_000_000, debtToEbitda: 5.2, ffoSource: 'simplified-specialty', expectedSubtype: 'specialty-tech', expectedConfidence: 'high' },
  { ticker: 'DLR', industry: 'REIT - Specialty', companyName: 'Digital Realty Trust, Inc.', ebitdaRaw: 1_700_000_000, debtToEbitda: 6.1, ffoSource: 'simplified-specialty', expectedSubtype: 'specialty-tech', expectedConfidence: 'high' },
  { ticker: 'AMT', industry: 'REIT - Specialty', companyName: 'American Tower Corporation', ebitdaRaw: 4_000_000_000, debtToEbitda: 5.8, ffoSource: 'simplified-specialty', expectedSubtype: 'specialty-tech', expectedConfidence: 'high' },
  { ticker: 'VTR', industry: 'REIT - Healthcare', companyName: 'Ventas, Inc.', ebitdaRaw: 1_200_000_000, debtToEbitda: 6.3, ffoSource: 'key-metrics', expectedSubtype: 'healthcare', expectedConfidence: 'high' },
  { ticker: 'WELL', industry: 'REIT - Healthcare', companyName: 'Welltower Inc.', ebitdaRaw: 1_100_000_000, debtToEbitda: 5.9, ffoSource: 'key-metrics', expectedSubtype: 'healthcare', expectedConfidence: 'high' },
  { ticker: 'HST', industry: 'REIT - Hotel & Motel', companyName: 'Host Hotels & Resorts, Inc.', ebitdaRaw: 900_000_000, debtToEbitda: 4.9, ffoSource: 'key-metrics', expectedSubtype: 'hotel', expectedConfidence: 'high' },
  { ticker: 'AGNC', industry: 'REIT - Mortgage', companyName: 'AGNC Investment Corp.', ebitdaRaw: null, debtToEbitda: null, ffoSource: 'not-applicable', expectedSubtype: 'mortgage', expectedConfidence: 'high' },
  { ticker: 'NLY', industry: 'REIT - Mortgage', companyName: 'Annaly Capital Management, Inc.', ebitdaRaw: null, debtToEbitda: null, ffoSource: 'not-applicable', expectedSubtype: 'mortgage', expectedConfidence: 'high' },
  { ticker: 'PLD', industry: 'REIT - Industrial', companyName: 'Prologis, Inc.', ebitdaRaw: 3_000_000_000, debtToEbitda: 4.2, ffoSource: 'key-metrics', expectedSubtype: 'standard', expectedConfidence: 'medium' },
  { ticker: 'SPG', industry: 'REIT - Retail', companyName: 'Simon Property Group, Inc.', ebitdaRaw: 2_200_000_000, debtToEbitda: 5.1, ffoSource: 'key-metrics', expectedSubtype: 'standard', expectedConfidence: 'medium' },
  { ticker: 'EQR', industry: 'REIT - Residential', companyName: 'Equity Residential', ebitdaRaw: 1_400_000_000, debtToEbitda: 4.8, ffoSource: 'key-metrics', expectedSubtype: 'standard', expectedConfidence: 'medium' },
]

function run(): void {
  const failures: string[] = []

  for (const testCase of CASES) {
    const result = detectReitSubtype(
      testCase.industry,
      testCase.companyName,
      testCase.ebitdaRaw,
      testCase.debtToEbitda,
      testCase.ffoSource,
    )

    if (result.subtype !== testCase.expectedSubtype) {
      failures.push(
        `${testCase.ticker}: subtype esperado=${testCase.expectedSubtype} obtido=${result.subtype} (${result.reasons.join('; ')})`,
      )
      continue
    }

    if (result.confidence !== testCase.expectedConfidence) {
      failures.push(
        `${testCase.ticker}: confidence esperada=${testCase.expectedConfidence} obtida=${result.confidence} (${result.reasons.join('; ')})`,
      )
    }
  }

  if (failures.length > 0) {
    console.error('[reit-subtype-smoke] FAIL')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log(`[reit-subtype-smoke] OK: ${CASES.length} casos validados.`)
}

run()
