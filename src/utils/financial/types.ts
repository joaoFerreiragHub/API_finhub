// src/utils/financial/types.ts

/**
 * 🔧 NOVO: Interface para dados de earnings calendar
 */
export interface EarningsCalendarEntry {
  date: string
  eps?: number
  epsActual?: number
  estimatedEPS?: number
  [key: string]: any // Para outros campos opcionais
}

/**
 * 🔧 NOVO: Interface para historical ratios
 */
export interface HistoricalRatiosEntry {
  date?: string
  period?: string
  eps?: number
  peRatio?: number
  peRatioTTM?: number
  returnOnEquity?: number
  returnOnEquityTTM?: number
  grossProfitMargin?: number
  grossProfitMarginTTM?: number
  netProfitMargin?: number
  netProfitMarginTTM?: number
  operatingProfitMargin?: number
  operatingProfitMarginTTM?: number
  priceToSalesRatio?: number
  priceToSalesRatioTTM?: number
  priceToBookRatio?: number
  priceToBookRatioTTM?: number
  currentRatio?: number
  currentRatioTTM?: number
  debtEquityRatio?: number
  debtEquityRatioTTM?: number
  returnOnAssets?: number
  returnOnAssetsTTM?: number
  returnOnCapitalEmployed?: number
  returnOnCapitalEmployedTTM?: number
  dividendYield?: number
  dividendYieldTTM?: number
  [key: string]: any // Para outros campos opcionais
}

/**
 * Interface para os dados brutos vindos da API FMP
 */
export interface RawFinancialData {
  ratios: any
  metrics: any
  income: any
  incomeY1: any
  incomeY2: any
  balance: any
  balanceY1: any
  balanceY2: any
  growth: any
  profile: any
  cashflow: any
  cashflowY1: any
  cashflowY2: any
  historicalRatios: any[]
  keyMetricsHistorical: any[]
  currentPrice: number | null
  earningsCalendar: any[]
  sharesFloat: any | null // 🆕 SHARES FLOAT
}
export interface SharesFloatData {
  symbol: string
  date: string
  freeFloat: number
  floatShares: number
  outstandingShares: number
  source: string
}
/**
 * Interface para os cálculos de EPS e CAGR
 */
export interface EPSCalculations {
  epsAtual: number | null
  cagrEps: number | null
  cagrEpsAnoAnterior: number | null
  // 🔧 NOVO: Campos de debug para troubleshooting
  _debug?: {
    epsAnoAnterior: number | null
    epsAno2Atras: number | null
    earningsCalendarCount: number
    historicalRatiosCount: number
    cagrEpsCalculado: boolean
    cagrEpsY1Calculado: boolean
    fonteDados: {
      epsAtual: string
      epsAnoAnterior: string
    }
  }
}

/**
 * Interface para métricas derivadas/calculadas
 */
export interface DerivedMetrics {
  sgaOverRevenue: number | null
  cashFlowOverCapex: number | null
  rAnddEfficiency: number | null
  pegManual: number | null
  // 🔧 NOVOS: Métricas adicionais calculadas
  sgaOverRevenueY1?: number | null
  cashFlowOverCapexY1?: number | null
  rAnddEfficiencyY1?: number | null
  cashRatio?: number | null
  cashRatioY1?: number | null
  payoutRatioY1?: number | null
  // Métricas específicas por setor
  nim?: number | null // Net Interest Margin (bancos)
  nimY1?: number | null
  bankingEfficiency?: number | null
  bankingEfficiencyY1?: number | null
  ldr?: number | null // Loan to Deposit Ratio
  ldrY1?: number | null
  provisionCoverage?: number | null
  // Métricas REIT
  ffo?: number | null // Funds From Operations
  ffoY1?: number | null
  affo?: number | null // Adjusted FFO
  affoY1?: number | null
  ffoPayoutRatio?: number | null
  ffoPayoutRatioY1?: number | null
  dividendCAGR?: number | null
}

/**
 * Interface para o resultado final dos indicadores
 */
export interface IndicadoresResult {
  [key: string]: string
}

/**
 * 🔧 NOVA: Interface para detecção de tipo de empresa
 */
export interface CompanyType {
  isBanco: boolean
  isREIT: boolean
  isPaymentProcessor: boolean
  isInsurance: boolean
  isUtility: boolean
  sector: string
  industry: string
}

/**
 * 🔧 NOVA: Interface para validação de indicadores
 */
export interface IndicadoresValidation {
  valid: boolean
  issues: string[]
  warnings: string[]
  criticalMetrics: {
    hasEPS: boolean
    hasCAGR: boolean
    hasPE: boolean
    hasPEG: boolean
  }
}

/**
 * 🔧 NOVA: Interface para configuração de cálculos por setor
 */
export interface SectorConfig {
  sector: string
  requiredMetrics: string[]
  optionalMetrics: string[]
  calculations: {
    useFFO: boolean // Para REITs
    useBankingMetrics: boolean // Para bancos
    useInsuranceMetrics: boolean // Para seguradoras
    useUtilityMetrics: boolean // Para utilities
  }
  validationRules: {
    maxPE?: number
    maxPEG?: number
    maxDebtRatio?: number
    minROE?: number
  }
}

/**
 * 🔧 NOVA: Interface para dados processados antes dos cálculos
 */
export interface ProcessedFinancialData extends RawFinancialData {
  // Campos processados e normalizados
  processedIncome: {
    eps: number | null
    epsY1: number | null
    epsY2: number | null
    netIncome: number | null
    netIncomeY1: number | null
    netIncomeY2: number | null
    revenue: number | null
    revenueY1: number | null
    revenueY2: number | null
  }
  processedEarnings: Array<{
    date: string
    eps: number
    epsActual?: number
    estimatedEPS?: number
  }>
  companyType: CompanyType
  validationInfo: {
    temEPSAtual: boolean
    temEPSY1: boolean
    temPreco: boolean
    podeCalcularCAGR: boolean
    earningsDisponiveis: number
    ratiosDisponiveis: number
  }
}

/**
 * 🔧 NOVA: Interface para resultado completo com metadados
 */
export interface CompleteIndicadoresResult {
  indicadores: IndicadoresResult
  metadata: {
    symbol: string
    calculatedAt: Date
    dataQuality: 'high' | 'medium' | 'low'
    companyType: CompanyType
    validation: IndicadoresValidation
    corrections: string[]
    warnings: string[]
  }
  debug?: {
    rawData: RawFinancialData
    epsCalculations: EPSCalculations
    derivedMetrics: DerivedMetrics
  }
}