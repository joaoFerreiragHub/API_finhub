// src/utils/financial/resultBuilder.ts

import { RawFinancialData, EPSCalculations, DerivedMetrics, IndicadoresResult } from './types'
import { fmt, fmtPercent, fmtLarge, plausibleOrNull } from './helpers'

// Feature flags — ligar/desligar novas funcionalidades de forma segura
export const STOCK_FLAGS = {
  useNullInsteadOfZero: true,  // plausibleOrNull() para sentinels do FMP
  enableEVMetrics: true,       // EV/EBITDA e FCF Yield
} as const

export interface QuickAnalysisFallbackData {
  ratios: Record<string, unknown> | null
  metrics: Record<string, unknown> | null
  historicalRatios: Array<Record<string, unknown>>
  keyMetricsHistorical: Array<Record<string, unknown>>
  income: Record<string, unknown> | null
  balance: Record<string, unknown> | null
  balanceY1: Record<string, unknown> | null
  cashflow: Record<string, unknown> | null
  growth: Record<string, unknown> | null
}

export interface RawScoringData {
  cagrEps: number | null
  revenueGrowth: number | null
  dataPeriod: string | null
  quickFallbackData?: QuickAnalysisFallbackData
}

/**
 * Monta o objeto final de indicadores com formatação adequada
 * 🆕 ENHANCED: Agora inclui cálculos de métricas financeiras da FMP API
 * 🏢 REIT SUPPORT: Inclui indicadores específicos para REITs
 */

// 🆕 NOVAS FUNÇÕES DE CÁLCULO BASEADAS NA ANÁLISE FMP

/**
 * 📊 Calcula Return on Assets (ROA)
 * Fórmula: Net Income / Total Assets
 */

const calculateMarketCap = (currentPrice: number, profile: any, metrics: any): number | null => {
  if (!currentPrice || currentPrice <= 0) {
    console.log('⚠️ Preço atual não disponível para calcular Market Cap')
    return null
  }

  // Tentar múltiplas fontes para shares outstanding
  const shares = profile?.sharesOutstanding || 
                 metrics?.sharesOutstanding || 
                 metrics?.weightedAverageShsOut ||
                 metrics?.weightedAverageShsOutDil

  if (shares && shares > 0) {
    const marketCap = currentPrice * shares
    console.log(`📊 Market Cap calculado: ${currentPrice} × ${shares} = ${marketCap}`)
    return marketCap
  }

  console.log('⚠️ Shares Outstanding não encontrado:', {
    'profile.sharesOutstanding': profile?.sharesOutstanding,
    'metrics.sharesOutstanding': metrics?.sharesOutstanding,
    'metrics.weightedAverageShsOut': metrics?.weightedAverageShsOut,
    'metrics.weightedAverageShsOutDil': metrics?.weightedAverageShsOutDil
  })

  return null
}

/**
 * 🔧 FUNÇÃO ESPECÍFICA: Buscar shares outstanding de múltiplas fontes
 */
const getSharesOutstanding = (profile: any, metrics: any, ratios: any, currentPrice: number | null, sharesFloat: any): number | null => {
  console.log('🔍 Tentando obter shares outstanding...')
  
  // 🆕 1. PRIMEIRA PRIORIDADE: Shares Float API (mais confiável)
  if (sharesFloat?.outstandingShares && sharesFloat.outstandingShares > 0) {
    console.log(`📊 Shares Outstanding encontrado (shares_float API): ${sharesFloat.outstandingShares}`)
    console.log(`📊 Data: ${sharesFloat.date}, Float: ${sharesFloat.freeFloat}%`)
    return sharesFloat.outstandingShares
  }
  
  // 2. Tentar fontes diretas
  const directSources = [
    profile?.sharesOutstanding,
    metrics?.sharesOutstanding,
    metrics?.weightedAverageShsOut,
    metrics?.weightedAverageShsOutDil,
    ratios?.weightedAverageShsOut,
    ratios?.weightedAverageShsOutDil
  ]

  for (const shares of directSources) {
    if (shares && shares > 0) {
      console.log(`📊 Shares Outstanding encontrado (direto): ${shares}`)
      return shares
    }
  }

  // 3. 🔧 FALLBACK: Calcular usando Market Cap / Preço Atual
  const marketCap = profile?.mktCap || profile?.marketCap
  if (marketCap && currentPrice && currentPrice > 0) {
    const calculatedShares = marketCap / currentPrice
    console.log(`📊 Shares Outstanding calculado via Market Cap: ${marketCap} / ${currentPrice} = ${calculatedShares}`)
    
    // Validação: shares calculados devem ser razoáveis (entre 1M e 50B)
    if (calculatedShares >= 1000000 && calculatedShares <= 50000000000) {
      return calculatedShares
    } else {
      console.log(`⚠️ Shares calculados fora do range esperado: ${calculatedShares}`)
    }
  }

  console.log('⚠️ Shares Outstanding não encontrado em nenhuma fonte')
  return null
}

const calculateROA = (income: any, balance: any): number | null => {
  if (!income?.netIncome || !balance?.totalAssets || balance.totalAssets === 0) {
    return null
  }
  
  return income.netIncome / balance.totalAssets
}

/**
 * 🏦 Calcula Net Interest Margin (NIM) para bancos
 * Fórmula: (Interest Income - Interest Expense) / Average Interest-Earning Assets
 */
const calculateNIM = (income: any, balance: any): number | null => {
  if (!income?.interestIncome || !income?.interestExpense || !balance?.totalAssets || balance.totalAssets === 0) {
    return null
  }
  
  const netInterestIncome = income.interestIncome - income.interestExpense
  return netInterestIncome / balance.totalAssets
}

/**
 * ⚙️ Calcula Banking Efficiency Ratio
 * Fórmula: Non-Interest Expenses / (Net Interest Income + Non-Interest Income)
 */
const calculateBankingEfficiency = (income: any): number | null => {
  if (!income?.operatingExpenses) {
    return null
  }
  
  const nonInterestExpenses = income.operatingExpenses
  const netInterestIncome = (income.interestIncome || 0) - (income.interestExpense || 0)
  const nonInterestIncome = income.totalOtherIncomeExpensesNet || 0
  const totalIncome = netInterestIncome + nonInterestIncome
  
  if (totalIncome === 0) {
    return null
  }
  
  return nonInterestExpenses / totalIncome
}

/**
 * 🏦 Calcula Loan-to-Deposit Ratio (LDR) para bancos
 * Fórmula: Total Loans / Total Deposits
 * Nota: Aproximação usando dados disponíveis na FMP
 */
const calculateLDR = (balance: any): number | null => {
  if (!balance) {
    return null
  }
  
  const loans = balance.netReceivables || balance.accountReceivables || 0
  const deposits = balance.shortTermDebt || balance.totalCurrentLiabilities || 0
  
  if (deposits === 0 || loans === 0) {
    return null
  }
  
  return loans / deposits
}

/**
 * 🛡️ Calcula Provision Coverage Ratio (aproximação)
 * Fórmula: Allowance for Loan Losses / (estimativa baseada em mudanças no balanço)
 */
const calculateProvisionCoverage = (balance: any, balanceY1: any): number | null => {
  if (!balance || !balanceY1) {
    return null
  }
  
  const currentAllowances = balance.allowanceForLoanLosses || 0
  const previousReceivables = balanceY1.netReceivables || balanceY1.accountReceivables || 0
  const currentReceivables = balance.netReceivables || balance.accountReceivables || 0
  
  if (previousReceivables === 0 || currentReceivables === 0) {
    return null
  }
  
  const estimatedNPAs = Math.abs(currentReceivables - previousReceivables)
  
  if (estimatedNPAs === 0) {
    return null
  }
  
  return currentAllowances / estimatedNPAs
}

/**
 * 💰 Calcula Dividend Yield usando dados da FMP
 * Fórmula: (Dividends per Share / Price per Share) * 100
 */
const calculateDividendYield = (ratios: any, currentPrice: number | null): number | null => {
  // Primeiro tentar usar o valor direto da FMP
  if (ratios?.dividendYield) {
    return ratios.dividendYield
  }
  
  // Fallback: calcular usando dividend per share e preço
  const dividendPerShare = ratios?.dividendPerShareTTM || 0
  
  if (dividendPerShare === 0 || !currentPrice || currentPrice === 0) {
    return null
  }
  
  return dividendPerShare / currentPrice
}

/**
 * 📈 Calcula Price to Book Value (P/VPA) usando dados da FMP
 */
const calculatePriceToBook = (ratios: any, metrics: any): number | null => {
  // Tentar múltiplas fontes da FMP
  return ratios?.priceToBookRatioTTM || 
         ratios?.priceBookValueRatio || 
         metrics?.priceToBookRatioTTM || 
         ratios?.pbRatioTTM || 
         null
}

/**
 * 🔄 Calcula métricas de crescimento de carteira (proxy para bancos)
 */
const calculatePortfolioGrowth = (income: any, incomeY1: any): number | null => {
  if (!income?.revenue || !incomeY1?.revenue || incomeY1.revenue === 0) {
    return null
  }
  
  return (income.revenue - incomeY1.revenue) / incomeY1.revenue
}

/**
 * 💰 Calcula Cash Ratio
 */
const calculateCashRatio = (balanceSheet: any): number | null => {
  if (!balanceSheet?.cashAndCashEquivalents || !balanceSheet?.totalCurrentLiabilities || balanceSheet.totalCurrentLiabilities === 0) {
    return null
  }
  
  return balanceSheet.cashAndCashEquivalents / balanceSheet.totalCurrentLiabilities
}

// 🏢 FUNÇÕES ESPECÍFICAS PARA REITs

/**
 * 🏢 Calcula FFO (Funds From Operations) - INDICADOR #1 PARA REITs
 * Fórmula: FFO = Net Income + Depreciation + Amortization - Gains on Property Sales
 */
const calculateFFO = (income: any, cashflow: any): number | null => {
  if (!income?.netIncome) {
    return null
  }
  
  const netIncome = income.netIncome
  const depreciation = cashflow?.depreciationAndAmortization || income.depreciationAndAmortization || 0
  
  // Gains on property sales - tentar encontrar nos outros rendimentos
  const gainsOnSales = income.totalOtherIncomeExpensesNet > 0 
    ? Math.min(income.totalOtherIncomeExpensesNet * 0.3, netIncome * 0.1) // Estimativa conservadora
    : 0
  
  const ffo = netIncome + depreciation - gainsOnSales
  
  console.log(`📊 FFO Calculado: Net Income ${netIncome} + Depreciation ${depreciation} - Gains ${gainsOnSales} = ${ffo}`)
  
  return ffo
}

/**
 * 🏢 Calcula AFFO (Adjusted FFO) - FFO ajustado para CapEx
 * Fórmula: AFFO = FFO - Normalized CapEx - Leasing Costs
 */
const calculateAFFO = (ffo: number, cashflow: any): number | null => {
  if (!ffo || !cashflow) {
    return null
  }
  
  // CapEx normalizado - para REITs usar 60-80% do CapEx total
  const capex = Math.abs(cashflow.capitalExpenditure || 0)
  const normalizedCapex = capex * 0.7 // 70% do CapEx é considerado manutenção
  
  // Leasing costs - aproximação usando uma % da receita
  const leasingCosts = 0 // Difícil de estimar sem dados específicos
  
  const affo = ffo - normalizedCapex - leasingCosts
  
  console.log(`📊 AFFO Calculado: FFO ${ffo} - Normalized CapEx ${normalizedCapex} = ${affo}`)
  
  return affo
}

/**
 * 🏢 Calcula P/FFO - Múltiplo principal para REITs
 * Fórmula: P/FFO = Market Cap / Total FFO
 */
const calculatePriceToFFO = (ffo: number, marketCap: number, sharesOutstanding: number): number | null => {
  if (!ffo || !sharesOutstanding || sharesOutstanding === 0) {
    return null
  }
  
  const ffoPerShare = ffo / sharesOutstanding
  const pricePerShare = marketCap / sharesOutstanding
  
  if (ffoPerShare <= 0) {
    return null
  }
  
  const pFFO = pricePerShare / ffoPerShare
  
  console.log(`📊 P/FFO Calculado: Price ${pricePerShare.toFixed(2)} / FFO per Share ${ffoPerShare.toFixed(2)} = ${pFFO.toFixed(1)}x`)
  
  return pFFO
}

/**
 * 🏢 Calcula FFO Payout Ratio - % do FFO pago como dividendos
 * Fórmula: FFO Payout = Dividends Paid / Total FFO
 */
const calculateFFOPayoutRatio = (ffo: number, cashflow: any): number | null => {
  if (!ffo || !cashflow?.dividendsPaid) {
    return null
  }
  
  const dividendsPaid = Math.abs(cashflow.dividendsPaid) // Valor absoluto pois é negativo
  const ffoPayoutRatio = dividendsPaid / ffo
  
  console.log(`📊 FFO Payout Calculado: Dividends ${dividendsPaid} / FFO ${ffo} = ${(ffoPayoutRatio * 100).toFixed(1)}%`)
  
  return ffoPayoutRatio
}

/**
 * 🏢 Calcula Dividend CAGR usando histórico real de dividendos
 * Usar dados históricos quando disponível, senão fallback para EPS
 */
const calculateDividendCAGR = (ratios: any, historicalRatios: any[]): number | null => {
  // Tentar usar dividend yield histórico para estimar CAGR
  if (historicalRatios && historicalRatios.length >= 2) {
    const currentDividendYield = ratios?.dividendYield || 0
    const pastDividendYield = historicalRatios[historicalRatios.length - 1]?.dividendYield || 0
    
    if (currentDividendYield > 0 && pastDividendYield > 0) {
      // Estimativa baseada na evolução do yield (proxy)
      const years = historicalRatios.length
      const dividendGrowthProxy = Math.pow(currentDividendYield / pastDividendYield, 1 / years) - 1
      
      // Ajustar para crescimento típico de REITs (mais conservador)
      const adjustedGrowth = Math.min(Math.max(dividendGrowthProxy, -0.05), 0.15) // Entre -5% e 15%
      
      console.log(`📊 Dividend CAGR estimado: ${(adjustedGrowth * 100).toFixed(1)}%`)
      
      return adjustedGrowth
    }
  }
  
  return null
}

/**
 * 🏢 Detecta se a empresa é um REIT
 */
const isREIT = (profile: any): boolean => {
  const industry = profile?.industry?.toLowerCase() || ''
  const sector = profile?.sector?.toLowerCase() || ''
  
  return (
    industry.includes('reit') ||
    industry.includes('real estate investment trust') ||
    (sector.includes('real estate') && industry.includes('retail')) ||
    (sector.includes('real estate') && industry.includes('residential')) ||
    (sector.includes('real estate') && industry.includes('office')) ||
    (sector.includes('real estate') && industry.includes('industrial'))
  )
}

// 🏦 DETECÇÃO INTELIGENTE DO TIPO DE EMPRESA
const detectCompanyType = (profile: any, income: any): {
  isBanco: boolean
  isPaymentProcessor: boolean
  isFintech: boolean
  isREIT: boolean
} => {
  const industry = profile?.industry?.toLowerCase() || ''
  const sector = profile?.sector?.toLowerCase() || ''
  const symbol = profile?.symbol || ''
  
  // Payment Processors (Visa, Mastercard, PayPal)
  const isPaymentProcessor = 
    industry.includes('credit services') ||
    industry.includes('payment') ||
    industry.includes('financial - credit services') ||
    (sector.includes('financial services') && 
     (symbol === 'V' || symbol === 'MA' || symbol === 'PYPL'))

  // Bancos tradicionais
  const isBanco = 
    industry.includes('banks') ||
    industry.includes('banking') ||
    (sector.includes('financial') && !isPaymentProcessor &&
     (income?.interestIncome > 0 || income?.interestExpense > 0))

  // Fintechs (tecnologia financeira)
  const isFintech = 
    sector.includes('financial') || 
    industry.includes('fintech') ||
    industry.includes('financial technology')

  // REITs
  const isREITCompany = isREIT(profile)

  console.log(`🏢 Tipo de empresa detectado: ${symbol}`)
  console.log(`   Industry: ${industry}`)
  console.log(`   Sector: ${sector}`)
  console.log(`   Is Payment Processor: ${isPaymentProcessor}`)
  console.log(`   Is Banco: ${isBanco}`)
  console.log(`   Is Fintech: ${isFintech}`)
  console.log(`   Is REIT: ${isREITCompany}`)

  return { isBanco, isPaymentProcessor, isFintech, isREIT: isREITCompany }
}

/**
 * 🔧 CORREÇÃO PRINCIPAL: Função específica para processar CAGR EPS corretamente
 */
function processCAGREPS(epsCalculations: EPSCalculations, rawData: RawFinancialData): {
  cagrEPS: string
  cagrEPSY1: string
} {
  console.log('🔧 [CRITICAL] Processando CAGR EPS...')
  
  const { epsAtual, cagrEps, cagrEpsAnoAnterior } = epsCalculations
  
  console.log('📊 [CRITICAL] Valores CAGR do epsCalculations:')
  console.log(`   cagrEps: ${cagrEps} (tipo: ${typeof cagrEps})`)
  console.log(`   cagrEpsAnoAnterior: ${cagrEpsAnoAnterior} (tipo: ${typeof cagrEpsAnoAnterior})`)
  
  // 🔧 CORREÇÃO 1: CAGR EPS Atual
  let cagrEPSFormatted = '\u2014'

  if (cagrEps != null && !isNaN(cagrEps)) {
    if (Math.abs(cagrEps) <= 9.99) {
      cagrEPSFormatted = fmtPercent(cagrEps)
      console.log(`✅ [CRITICAL] CAGR EPS formatado: ${cagrEPSFormatted}`)
    } else {
      console.log(`⚠️ [CRITICAL] CAGR EPS fora do range: ${cagrEps * 100}%`)
      cagrEPSFormatted = '\u2014'
    }
  } else {
    console.log(`⚠️ [CRITICAL] CAGR EPS inválido: ${cagrEps}`)

    // 🔧 FALLBACK: Tentar calcular manualmente usando dados disponíveis
    const epsAtualNum = parseFloat(epsAtual?.toString() || '0')
    const epsY1Num = parseFloat(rawData.income?.epsY1?.toString() || '0')

    if (epsAtualNum > 0 && epsY1Num > 0 && epsY1Num !== epsAtualNum) {
      const manualCAGR = (epsAtualNum - epsY1Num) / epsY1Num
      console.log(`🔧 [CRITICAL] CAGR EPS calculado manualmente: ${(manualCAGR * 100).toFixed(2)}%`)

      if (Math.abs(manualCAGR) <= 9.99) {
        cagrEPSFormatted = fmtPercent(manualCAGR)
        console.log(`✅ [CRITICAL] CAGR EPS manual aceito: ${cagrEPSFormatted}`)
      }
    }
  }

  // 🔧 CORREÇÃO 2: CAGR EPS (Y-1)
  let cagrEPSY1Formatted = '\u2014'

  if (cagrEpsAnoAnterior != null && !isNaN(cagrEpsAnoAnterior)) {
    if (Math.abs(cagrEpsAnoAnterior) <= 9.99) {
      cagrEPSY1Formatted = fmtPercent(cagrEpsAnoAnterior)
      console.log(`✅ [CRITICAL] CAGR EPS (Y-1) formatado: ${cagrEPSY1Formatted}`)
    } else {
      console.log(`⚠️ [CRITICAL] CAGR EPS (Y-1) fora do range: ${cagrEpsAnoAnterior * 100}%`)
    }
  } else {
    console.log(`⚠️ [CRITICAL] CAGR EPS (Y-1) inválido: ${cagrEpsAnoAnterior}`)

    // 🔧 FALLBACK: Tentar calcular Y-1 manualmente
    const epsY1Num = parseFloat(rawData.income?.epsY1?.toString() || '0')
    const epsY2Num = parseFloat(rawData.income?.epsY2?.toString() || '0')

    if (epsY1Num > 0 && epsY2Num > 0 && epsY1Num !== epsY2Num) {
      const manualCAGRY1 = (epsY1Num - epsY2Num) / epsY2Num
      console.log(`🔧 [CRITICAL] CAGR EPS (Y-1) calculado manualmente: ${(manualCAGRY1 * 100).toFixed(2)}%`)

      if (Math.abs(manualCAGRY1) <= 9.99) {
        cagrEPSY1Formatted = fmtPercent(manualCAGRY1)
        console.log(`✅ [CRITICAL] CAGR EPS (Y-1) manual aceito: ${cagrEPSY1Formatted}`)
      }
    }
  }
  
  console.log('🎯 [CRITICAL] Resultado final CAGR EPS:')
  console.log(`   CAGR EPS: ${cagrEPSFormatted}`)
  console.log(`   CAGR EPS (Y-1): ${cagrEPSY1Formatted}`)
  
  return {
    cagrEPS: cagrEPSFormatted,
    cagrEPSY1: cagrEPSY1Formatted
  }
}

export function buildIndicadoresResult(
  rawData: RawFinancialData,
  epsCalculations: EPSCalculations,
  derivedMetrics: DerivedMetrics
): IndicadoresResult {
  console.log('🏗️ [FIXED] Montando resultado final dos indicadores...')

  const { ratios, metrics, income, incomeY1, balance, balanceY1, growth, profile, cashflow, cashflowY1, historicalRatios, keyMetricsHistorical, currentPrice, sharesFloat } = rawData
  const { epsAtual, cagrEps, cagrEpsAnoAnterior } = epsCalculations
  const { sgaOverRevenue, cashFlowOverCapex, rAnddEfficiency, pegManual } = derivedMetrics

  // 🔧 CRÍTICO: Processar CAGR EPS corretamente
  const { cagrEPS, cagrEPSY1 } = processCAGREPS(epsCalculations, rawData)

  // 🏦 DETECTAR TIPO DE EMPRESA
  const companyType = detectCompanyType(profile, income)

  // 💡 Market cap para guards plausibleOrNull
  const mktCap: number | null = profile?.mktCap ?? profile?.marketCap ?? null

  // 📊 EV/EBITDA e FCF Yield (Fase C1+C2)
  const evEbitdaStr = (() => {
    if (!STOCK_FLAGS.enableEVMetrics) return '\u2014'
    const totalDebt = balance?.totalDebt ?? 0
    const cash = balance?.cashAndCashEquivalents ?? 0
    const ev = mktCap ? mktCap + totalDebt - cash : null
    const ebitdaRaw = income?.ebitda ?? null
    const ebitdaGuarded = STOCK_FLAGS.useNullInsteadOfZero ? plausibleOrNull(ebitdaRaw, mktCap) : ebitdaRaw
    if (!ev || !ebitdaGuarded || ebitdaGuarded <= 0) return '\u2014'
    return fmt(ev / ebitdaGuarded, 1) + 'x'
  })()

  const fcfYieldStr = (() => {
    if (!STOCK_FLAGS.enableEVMetrics) return '\u2014'
    const fcf = cashflow?.freeCashFlow ??
      (cashflow?.operatingCashFlow && cashflow?.capitalExpenditure
        ? cashflow.operatingCashFlow - Math.abs(cashflow.capitalExpenditure)
        : null)
    if (!fcf || !mktCap || mktCap <= 0) return '\u2014'
    return fmtPercent(fcf / mktCap)
  })()

  // 🆕 CALCULAR NOVAS MÉTRICAS DA FMP API
  console.log('🆕 Calculando métricas adicionais da FMP API...')
  
  // 🔧 CORREÇÃO 1: ROA com fallback melhorado
  const roaCalculated = calculateROA(income, balance)
  const roaY1Calculated = calculateROA(incomeY1, balanceY1)
  const roaFinal = ratios?.returnOnAssets ?? ratios?.returnOnAssetsTTM ?? roaCalculated
  const roaY1Final = historicalRatios?.[1]?.returnOnAssets ?? historicalRatios?.[1]?.returnOnAssetsTTM ?? roaY1Calculated

  // 🔧 CORREÇÃO 2: P/VPA com múltiplas fontes
  const priceToBook = ratios?.priceToBookRatioTTM ?? metrics?.priceToBookRatioTTM ?? calculatePriceToBook(ratios, metrics)
  const priceToBookY1 = historicalRatios?.[1]?.priceToBookRatio ?? 
  historicalRatios?.[1]?.priceToBookRatioTTM ?? 
  keyMetricsHistorical?.[1]?.priceToBookRatioTTM ?? 
  calculatePriceToBook(historicalRatios?.[1], null) ??
  // 🆕 CALCULAR MANUALMENTE se dados históricos falharem
  (() => {
    if (keyMetricsHistorical?.[1]?.marketCapTTM && balanceY1?.totalStockholdersEquity && 
        balanceY1.totalStockholdersEquity > 0) {
      return keyMetricsHistorical[1].marketCapTTM / balanceY1.totalStockholdersEquity
    }
    return null
  })()

  // 🔧 CORREÇÃO 3: Dividend Yield com validação
  const dividendYield = metrics?.dividendYieldTTM ?? ratios?.dividendYieldTTM ?? calculateDividendYield(ratios, currentPrice)
  const dividendYieldY1 = historicalRatios?.[1]?.dividendYield ?? historicalRatios?.[1]?.dividendYieldTTM ?? calculateDividendYield(historicalRatios?.[1], currentPrice)

  // 🔧 MÉTRICAS BANCÁRIAS CONDICIONAIS - aplicar apenas quando apropriado
  const nimCurrent = companyType.isBanco ? calculateNIM(income, balance) : null
  const nimY1 = companyType.isBanco ? calculateNIM(incomeY1, balanceY1) : null
  const bankingEfficiency = companyType.isBanco ? calculateBankingEfficiency(income) : null
  const bankingEfficiencyY1 = companyType.isBanco ? calculateBankingEfficiency(incomeY1) : null
  const ldr = companyType.isBanco ? calculateLDR(balance) : null
  const ldrY1 = companyType.isBanco ? calculateLDR(balanceY1) : null
  const provisionCoverage = companyType.isBanco ? calculateProvisionCoverage(balance, balanceY1) : null

  // 🔧 CORREÇÃO 4: Crescimento de carteira melhorado
  const portfolioGrowth = calculatePortfolioGrowth(income, incomeY1)
  const portfolioGrowthY1 = incomeY1 && rawData.incomeY2 ? calculatePortfolioGrowth(incomeY1, rawData.incomeY2) : null

  // 🏢 CALCULAR MÉTRICAS ESPECÍFICAS DE REITs
  let ffoCalculated = null
  let ffoY1Calculated = null
  let affoCalculated = null
  let affoY1Calculated = null
  let pFFOCalculated = null
  let ffoPayoutCalculated = null
  let ffoPayoutY1Calculated = null
  let dividendCAGRCalculated = null

  if (companyType.isREIT) {
    console.log('🏢 REIT detectado - calculando métricas específicas...')
    
    // 🔧 DEBUG: Verificar dados disponíveis
    console.log('🔍 [DEBUG] Dados disponíveis para REIT:')
    console.log(`   profile.marketCap: ${profile?.mktCap}`)
    console.log(`   profile.sharesOutstanding: ${profile?.sharesOutstanding}`)
    console.log(`   currentPrice: ${currentPrice}`)
    console.log(`   metrics.sharesOutstanding: ${metrics?.sharesOutstanding}`)
    
    // 1. Calcular FFO
    ffoCalculated = calculateFFO(income, cashflow)
    ffoY1Calculated = calculateFFO(incomeY1, cashflowY1)
    
    // 2. Calcular AFFO
    if (ffoCalculated) {
      affoCalculated = calculateAFFO(ffoCalculated, cashflow)
    }
    if (ffoY1Calculated) {
      affoY1Calculated = calculateAFFO(ffoY1Calculated, cashflowY1)
    }
    
    // 🔧 3. Calcular P/FFO - CORRIGIDO com fallbacks
    if (ffoCalculated) {
      const marketCap = profile?.mktCap || 
                        (currentPrice && metrics?.sharesOutstanding ? currentPrice * metrics.sharesOutstanding : null) ||
                        (currentPrice && profile?.sharesOutstanding ? currentPrice * profile.sharesOutstanding : null)
      
      console.log(`🔍 [DEBUG] Market Cap calculado: ${marketCap}`)
      
      if (marketCap) {
        pFFOCalculated = marketCap / ffoCalculated
        console.log(`📊 P/FFO calculado: ${marketCap} / ${ffoCalculated} = ${pFFOCalculated}`)
      } else {
        console.log(`⚠️ [DEBUG] Não foi possível calcular P/FFO - Market Cap indisponível`)
      }
    }
    
    // 4. Calcular FFO Payout Ratio
    if (ffoCalculated) {
      ffoPayoutCalculated = calculateFFOPayoutRatio(ffoCalculated, cashflow)
    }
    if (ffoY1Calculated) {
      ffoPayoutY1Calculated = calculateFFOPayoutRatio(ffoY1Calculated, cashflowY1)
    }
    
    // 5. Calcular Dividend CAGR real
    dividendCAGRCalculated = calculateDividendCAGR(ratios, historicalRatios)
    
    console.log('🏢 Métricas REIT calculadas:', {
      FFO: ffoCalculated,
      'FFO (Y-1)': ffoY1Calculated,
      AFFO: affoCalculated,
      'AFFO (Y-1)': affoY1Calculated,
      'P/FFO': pFFOCalculated,
      'FFO Payout': ffoPayoutCalculated ? `${(ffoPayoutCalculated * 100).toFixed(1)}%` : null,
      'FFO Payout (Y-1)': ffoPayoutY1Calculated ? `${(ffoPayoutY1Calculated * 100).toFixed(1)}%` : null,
      'Dividend CAGR': dividendCAGRCalculated ? `${(dividendCAGRCalculated * 100).toFixed(1)}%` : null
    })
  }

  // 🔧 CORREÇÃO 5: SMART FALLBACK para CAGR EPS (Y-1) quando N/A
  const calculateCAGREPSFallback = (): string => {
    // Se já temos o valor da API, usar esse
    if (cagrEpsAnoAnterior != null && isFinite(cagrEpsAnoAnterior) && Math.abs(cagrEpsAnoAnterior) < 50) {
      return fmtPercent(cagrEpsAnoAnterior)
    }
    
    // Fallback: calcular usando EPS atual vs EPS (Y-1)
    const epsAtualNum = parseFloat(epsAtual?.toString() || '0')
    const epsY1Num = parseFloat(incomeY1?.eps?.toString() || rawData.income?.epsY1?.toString() || '0')
    
    if (epsAtualNum > 0 && epsY1Num > 0) {
      const estimatedGrowth = ((epsAtualNum - epsY1Num) / epsY1Num)
      if (Math.abs(estimatedGrowth) < 10) { // Só se crescimento for realista (<1000%)
        console.log(`📊 CAGR EPS (Y-1) calculado via fallback: ${(estimatedGrowth * 100).toFixed(2)}%`)
        return fmtPercent(estimatedGrowth)
      }
    }
    
    return '\u2014'
  }

  // 🔧 CORREÇÃO 6: Valores históricos com fallbacks múltiplos
  const roicAnoAnterior = historicalRatios?.[1]?.returnOnCapitalEmployed ?? 
                          historicalRatios?.[1]?.returnOnCapitalEmployedTTM ?? 
                          keyMetricsHistorical?.[1]?.roicTTM ?? 
                          null
  const margemLiquidaAnoAnterior = historicalRatios?.[1]?.netProfitMargin ?? 
                          historicalRatios?.[1]?.netProfitMarginTTM ?? 
                          // 🆕 CALCULAR MANUALMENTE se dados históricos falharem
                          (incomeY1?.netIncome && incomeY1?.revenue && incomeY1.revenue > 0 ?
                           incomeY1.netIncome / incomeY1.revenue : null)
 const debtToEbitdaAnoAnterior = historicalRatios?.[1]?.debtToEbitda ?? 
                           keyMetricsHistorical?.[1]?.netDebtToEBITDATTM ?? 
                           // 🆕 CALCULAR MANUALMENTE se dados históricos falharem
                           (() => {
                             if (incomeY1?.ebitda && balanceY1?.totalDebt && incomeY1.ebitda > 0) {
                               return balanceY1.totalDebt / incomeY1.ebitda
                             }
                             // Fallback: usar net debt se disponível
                             if (incomeY1?.ebitda && balanceY1?.netDebt && incomeY1.ebitda > 0) {
                               return balanceY1.netDebt / incomeY1.ebitda
                             }
                             return null
                           })()

  // 🔧 CORREÇÃO 7: Indicadores fáceis usando historicalRatios[1] com fallbacks
  const margemBrutaAnoAnterior = historicalRatios?.[1]?.grossProfitMargin ?? 
                                 historicalRatios?.[1]?.grossProfitMarginTTM ?? 
                                 null
  const margemOperacionalAnoAnterior = historicalRatios?.[1]?.operatingProfitMargin ?? 
                                       historicalRatios?.[1]?.operatingProfitMarginTTM ?? 
                                       null
  const roeAnoAnterior = historicalRatios?.[1]?.returnOnEquity ?? 
                         historicalRatios?.[1]?.returnOnEquityTTM ?? 
                         keyMetricsHistorical?.[1]?.roeTTM ?? 
                         null
  
  // 🔧 CORREÇÃO 8: P/L histórico usando múltiplas fontes
  const plAnoAnterior = keyMetricsHistorical?.[1]?.peRatio ?? 
                        keyMetricsHistorical?.[1]?.peRatioTTM ?? 
                        historicalRatios?.[1]?.peRatio ?? 
                        historicalRatios?.[1]?.peRatioTTM ?? 
                        null
    
  const psAnoAnterior = historicalRatios?.[1]?.priceToSalesRatio ?? 
                        historicalRatios?.[1]?.priceToSalesRatioTTM ?? 
                        keyMetricsHistorical?.[1]?.priceToSalesRatioTTM ?? 
                        null
                        const liquidezCorrenteAnoAnterior = historicalRatios?.[1]?.currentRatio ?? 
                        historicalRatios?.[1]?.currentRatioTTM ?? 
                        // 🆕 CALCULAR MANUALMENTE se dados históricos falharem
                        (balanceY1?.totalCurrentAssets && balanceY1?.totalCurrentLiabilities && 
                         balanceY1.totalCurrentLiabilities > 0 ?
                         balanceY1.totalCurrentAssets / balanceY1.totalCurrentLiabilities : null)
 const debtEquityAnoAnterior = historicalRatios?.[1]?.debtEquityRatio ?? 
                         historicalRatios?.[1]?.debtEquityRatioTTM ?? 
                         keyMetricsHistorical?.[1]?.debtEquityRatioTTM ?? 
                         // 🆕 CALCULAR MANUALMENTE se dados históricos falharem
                         (() => {
                           if (balanceY1?.totalDebt && balanceY1?.totalStockholdersEquity && 
                               balanceY1.totalStockholdersEquity > 0) {
                             return balanceY1.totalDebt / balanceY1.totalStockholdersEquity
                           }
                           // Fallback: usar total liabilities se totalDebt não estiver disponível
                           if (balanceY1?.totalLiabilities && balanceY1?.totalStockholdersEquity && 
                               balanceY1.totalStockholdersEquity > 0) {
                             return balanceY1.totalLiabilities / balanceY1.totalStockholdersEquity
                           }
                           return null
                         })()
  // 🔧 CORREÇÃO 9: PEG (Y-1) com fallback inteligente
  const pegAnoAnterior = (() => {
    // Primeiro: tentar calcular usando dados diretos da API
    if (plAnoAnterior && cagrEpsAnoAnterior && cagrEpsAnoAnterior !== 0) {
      const pegValue = plAnoAnterior / Math.abs(cagrEpsAnoAnterior * 100)
      console.log(`🔍 PEG (Y-1) API: P/L=${plAnoAnterior}, CAGR=${cagrEpsAnoAnterior}, PEG=${pegValue}`)
      if (pegValue > 0 && pegValue < 100) { // Validação de sanidade
        return pegValue
      }
    }
    
    // Fallback: usar CAGR EPS (Y-1) recalculado se disponível
    const cagrFallback = calculateCAGREPSFallback()
    if (cagrFallback !== '\u2014' && plAnoAnterior) {
      const cagrNum = parseFloat(cagrFallback.replace('%', '')) / 100
      if (cagrNum !== 0) {
        const pegFallback = plAnoAnterior / Math.abs(cagrNum * 100)
        console.log(`🔍 PEG (Y-1) Fallback: P/L=${plAnoAnterior}, CAGR=${cagrNum}, PEG=${pegFallback}`)
        if (pegFallback > 0 && pegFallback < 100) {
          return pegFallback
        }
      }
    }
    
    console.log('🔍 PEG (Y-1) não pôde ser calculado')
    return null
  })()

  // 🔧 CORREÇÃO 10: EPS (Y-1) - usar valor mais consistente com múltiplos fallbacks
  const epsAnoAnterior = (() => {
    // Primeira opção: usar dados históricos de key metrics (mais confiável)
    if (keyMetricsHistorical?.[1]?.netIncomePerShare) {
      return keyMetricsHistorical[1].netIncomePerShare
    }
    
    // Segunda opção: usar EPS Y-1 já processado no income
    if (rawData.income?.epsY1) {
      return rawData.income.epsY1
    }
    
    // Terceira opção: income statement do ano anterior
    if (incomeY1?.eps) {
      return incomeY1.eps
    }
    
    // Quarta opção: ratios históricos
    if (historicalRatios?.[1]?.eps) {
      return historicalRatios[1].eps
    }
    
    // Fallback: estimar usando CAGR EPS se disponível
    if (epsAtual && cagrEps && cagrEps !== 0) {
      const estimatedEpsY1 = epsAtual / (1 + cagrEps)
      console.log(`📊 EPS (Y-1) estimado via CAGR: ${estimatedEpsY1}`)
      if (estimatedEpsY1 > 0 && estimatedEpsY1 < epsAtual * 10) { // Validação de sanidade
        return estimatedEpsY1
      }
    }
    
    return null
  })()

  // 🔧 CORREÇÃO 11: Métricas derivadas com validação
  const investimentoPDAnoAnterior = incomeY1?.researchAndDevelopmentExpenses ?? null
  const fcfAnoAnterior = cashflowY1?.freeCashFlow ?? 
    (cashflowY1?.operatingCashFlow && cashflowY1?.capitalExpenditure 
      ? cashflowY1.operatingCashFlow - Math.abs(cashflowY1.capitalExpenditure) 
      : null)
  
  // Métricas derivadas do ano anterior
  const sgaOverRevenueAnoAnterior = incomeY1?.sellingGeneralAndAdministrativeExpenses && incomeY1?.revenue && incomeY1.revenue > 0
    ? incomeY1.sellingGeneralAndAdministrativeExpenses / incomeY1.revenue
    : null
  const cashFlowOverCapexAnoAnterior = cashflowY1?.operatingCashFlow && cashflowY1?.capitalExpenditure && cashflowY1.capitalExpenditure !== 0
    ? cashflowY1.operatingCashFlow / Math.abs(cashflowY1.capitalExpenditure)
    : null
  const rAnddEfficiencyAnoAnterior = epsAnoAnterior && investimentoPDAnoAnterior && investimentoPDAnoAnterior > 0
    ? epsAnoAnterior / (investimentoPDAnoAnterior / 1e9) // Converter para bilhões
    : null

  // 🔧 CORREÇÃO 12: Cash Ratios melhorados
  const cashRatio = calculateCashRatio(balance)
  const cashRatioAnoAnterior = calculateCashRatio(balanceY1)

  // 🔧 CORREÇÃO 13: Payout Ratio (Y-1) aprimorado
  const payoutRatioAnoAnterior = (() => {
    const dividendsPaidY1 = cashflowY1?.dividendsPaid
    const netIncomeY1 = incomeY1?.netIncome
    
    if (dividendsPaidY1 && netIncomeY1 && netIncomeY1 > 0) {
      // Dividends paid é geralmente negativo, então tomar valor absoluto
      const ratio = Math.abs(dividendsPaidY1) / netIncomeY1
      // Validação de sanidade: payout ratio não deve ser > 10 (1000%)
      return ratio <= 10 ? ratio : null
    }
    return null
  })()

  // 🔍 DEBUG logs aprimorados
  console.log('💰 [FIXED] Cash Ratio calculado:', cashRatio)
  console.log('💰 [FIXED] Cash Ratio (Y-1) calculado:', cashRatioAnoAnterior)
  console.log('💸 [FIXED] Payout Ratio (Y-1) calculado:', payoutRatioAnoAnterior)
  console.log('🔧 [FIXED] EPS (Y-1) corrigido:', epsAnoAnterior)
  console.log('🔧 [FIXED] P/L (Y-1) encontrado:', plAnoAnterior)
  console.log('🔧 [FIXED] PEG (Y-1) calculado:', pegAnoAnterior)
    
  const resultado: IndicadoresResult = {
    // === MÚLTIPLOS DE AVALIAÇÃO ===
    'P/L': (() => {
      // 🔧 CORREÇÃO: Calcular P/L atual usando preço atual e EPS atual
      const peFromAPI = ratios?.peRatioTTM ?? metrics?.peRatioTTM
      if (peFromAPI && peFromAPI > 0 && peFromAPI < 1000) {
        return fmt(peFromAPI)
      }
      
      // Fallback: calcular manualmente
      if (currentPrice && epsAtual && epsAtual > 0) {
        const calculatedPE = currentPrice / epsAtual
        console.log(`📊 P/L calculado manualmente: ${currentPrice} / ${epsAtual} = ${calculatedPE}`)
        return fmt(calculatedPE)
      }
      
      return '\u2014'
    })(),
    'P/L (Y-1)': fmt(plAnoAnterior),
    'P/S': fmt(ratios?.priceToSalesRatioTTM ?? metrics?.priceToSalesRatioTTM),
    'P/S (Y-1)': fmt(psAnoAnterior),
    
    // 🆕 P/VPA - CORRIGIDO
    'P/VPA': fmt(priceToBook ?? null),
    'P/VPA (Y-1)': fmt(priceToBookY1 ?? null),
    
    'PEG': (() => {
      // 🔧 CORREÇÃO: Calcular PEG usando CAGR EPS corrigido
      if (pegManual != null && isFinite(pegManual) && pegManual > 0 && pegManual < 100) {
        return fmt(pegManual)
      }
      
      // Calcular manualmente se temos P/L e CAGR EPS
      const peValue = ratios?.peRatioTTM ?? metrics?.peRatioTTM
      if (peValue && cagrEps && cagrEps !== 0) {
        const pegCalculated = peValue / Math.abs(cagrEps * 100)
        console.log(`📊 PEG calculado: ${peValue} / ${Math.abs(cagrEps * 100)} = ${pegCalculated}`)
        if (pegCalculated > 0 && pegCalculated < 100) {
          return fmt(pegCalculated)
        }
      }
      
      // Fallback: usar valor da API se existir e for razoável
      const pegFromAPI = ratios?.pegRatioTTM ?? metrics?.priceEarningsToGrowthRatioTTM
      if (pegFromAPI != null && isFinite(pegFromAPI) && pegFromAPI >= 0 && pegFromAPI < 100) {
        return fmt(pegFromAPI)
      }
      
      return '\u2014'
    })(),
    'PEG (Y-1)': (() => {
      if (pegAnoAnterior != null && isFinite(pegAnoAnterior) && Math.abs(pegAnoAnterior) < 100) {
        return fmt(pegAnoAnterior)
      }
      return '\u2014'
    })(),

    // === MÉTRICAS EV (Fase C1 + C2) ===
    'EV/EBITDA': evEbitdaStr,
    'FCF Yield': fcfYieldStr,

    // === RETORNOS SOBRE CAPITAL ===
    'ROE': fmtPercent(
      STOCK_FLAGS.useNullInsteadOfZero
        ? plausibleOrNull(ratios?.returnOnEquityTTM ?? metrics?.roeTTM ?? null, mktCap)
        : (ratios?.returnOnEquityTTM ?? metrics?.roeTTM)
    ),
    'ROE (Y-1)': fmtPercent(roeAnoAnterior),
    
    // 🆕 ROA - CORRIGIDO
    'ROA': fmtPercent(roaFinal ?? null),
    'ROA (Y-1)': fmtPercent(roaY1Final ?? null),
    
    'ROIC': fmtPercent(metrics?.roicTTM ?? ratios?.returnOnCapitalEmployedTTM),
    'ROIC (Y-1)': fmtPercent(roicAnoAnterior),

    // === 🔧 CRÍTICO: MÉTRICAS DE EPS CORRIGIDAS ===
    'EPS': fmt(epsAtual ?? income?.eps ?? metrics?.netIncomePerShareTTM),
    'EPS (Y-1)': fmt(epsAnoAnterior),
    
    // 🎯 PRINCIPAL CORREÇÃO: CAGR EPS
    'CAGR EPS': cagrEPS, // 🔧 USAR VALOR JÁ PROCESSADO
    'CAGR EPS (Y-1)': cagrEPSY1, // 🔧 USAR VALOR JÁ PROCESSADO

    // === MARGENS ===
    'Margem Bruta': fmtPercent(ratios?.grossProfitMarginTTM ?? income?.grossProfitRatio),
    'Margem Bruta (Y-1)': fmtPercent(margemBrutaAnoAnterior),
    'Margem EBITDA': fmtPercent(
      STOCK_FLAGS.useNullInsteadOfZero
        ? plausibleOrNull(income?.ebitdaratio ?? ratios?.ebitdaratioTTM ?? null, mktCap)
        : (income?.ebitdaratio ?? ratios?.ebitdaratioTTM)
    ),
    'Margem EBITDA (Y-1)': fmtPercent(incomeY1?.ebitda && incomeY1?.revenue && incomeY1.revenue > 0 ? incomeY1.ebitda / incomeY1.revenue : null),
    'Margem Líquida': fmtPercent(ratios?.netProfitMarginTTM ?? income?.netIncomeRatio),
    'Margem Líquida (Y-1)': fmtPercent(margemLiquidaAnoAnterior),
    'Margem Operacional': fmtPercent(ratios?.operatingProfitMarginTTM ?? income?.operatingIncomeRatio),
    'Margem Operacional (Y-1)': fmtPercent(margemOperacionalAnoAnterior),

    // === ESTRUTURA DE CAPITAL ===
    'Liquidez Corrente': fmt(ratios?.currentRatioTTM ?? metrics?.currentRatioTTM),
    'Liquidez Corrente (Y-1)': fmt(liquidezCorrenteAnoAnterior),
    'Dívida/EBITDA': fmt(metrics?.netDebtToEBITDATTM ?? ratios?.debtToEbitdaTTM),
    'Dívida/EBITDA (Y-1)': fmt(debtToEbitdaAnoAnterior),
    'Dívida / Capitais Próprios': fmt(ratios?.debtEquityRatioTTM ?? metrics?.debtEquityRatioTTM),
    'Dívida / Capitais Próprios (Y-1)': fmt(debtEquityAnoAnterior),

    // === MÉTRICAS DE CRESCIMENTO ===
    'Crescimento Receita': fmtPercent(growth?.revenueGrowth),
    'Crescimento Receita (Y-1)': fmtPercent(
      incomeY1?.revenue && income?.revenue && incomeY1.revenue > 0
        ? (income.revenue - incomeY1.revenue) / incomeY1.revenue
        : null
    ),
    'Crescimento EBITDA': (() => {
      const ebitda = income?.ebitda
      const ebitdaY1val = incomeY1?.ebitda
      if (!ebitda || !ebitdaY1val || ebitdaY1val === 0) return '\u2014'
      return fmtPercent((ebitda - ebitdaY1val) / Math.abs(ebitdaY1val))
    })(),
    'Crescimento EBITDA (Y-1)': '\u2014',

    // 🆕 CAGR RECEITA 3Y (2-year compound growth: Y0 vs Y-2)
    'CAGR Receita 3Y': (() => {
      const revY0 = income?.revenue
      const revY2 = rawData.incomeY2?.revenue
      if (!revY0 || !revY2 || revY2 <= 0 || revY0 <= 0) return '\u2014'
      const cagr = Math.pow(revY0 / revY2, 1 / 2) - 1
      return fmtPercent(cagr)
    })(),
    'CAGR Receita 3Y (Y-1)': (() => {
      const revY1 = incomeY1?.revenue
      const revY2 = rawData.incomeY2?.revenue
      if (!revY1 || !revY2 || revY2 <= 0 || revY1 <= 0) return '\u2014'
      // 1-year growth as Y-1 proxy (only 3 years of data available)
      const growth = (revY1 - revY2) / Math.abs(revY2)
      return fmtPercent(growth)
    })(),

    // 🆕 CRESCIMENTO CARTEIRA - CORRIGIDO
    'Crescimento Carteira': fmtPercent(portfolioGrowth ?? null),
    'Crescimento Carteira (Y-1)': fmtPercent(portfolioGrowthY1 ?? null),

    // === RISCO E VOLATILIDADE ===
    'Beta': fmt(profile?.beta),
    'Beta (Y-1)': fmt(profile?.beta),

    // === DÍVIDA (VALORES ABSOLUTOS) ===
    'Net Debt': (() => {
      const nd = balance?.netDebt ?? null
      if (nd != null && isFinite(nd)) return fmtLarge(nd)
      const td = balance?.totalDebt ?? null
      const cash = balance?.cashAndCashEquivalents ?? 0
      return td != null ? fmtLarge(td - cash) : '\u2014'
    })(),
    'Total Dívida': fmtLarge(balance?.totalDebt ?? null),
    'Cash e Equiv.': fmtLarge(balance?.cashAndCashEquivalents ?? balance?.cash ?? null),
    'Despesa de Juros': fmtLarge(income?.interestExpense != null ? Math.abs(income.interestExpense) : null),
    'Cobertura de Juros': (() => {
      const raw = metrics?.interestCoverageTTM ?? ratios?.interestCoverageRatioTTM ?? ratios?.interestCoverageTTM ?? null
      const guarded = STOCK_FLAGS.useNullInsteadOfZero ? plausibleOrNull(raw, mktCap) : raw
      if (guarded != null) return fmt(guarded)
      // Fallback: calcular manualmente EBIT / InterestExpense
      const ebit = income?.operatingIncome ?? income?.ebitda
      const intExp = income?.interestExpense
      if (ebit && intExp && Math.abs(intExp) > 0) return fmt(ebit / Math.abs(intExp))
      return '\u2014'
    })(),
    'Cobertura de Juros (Y-1)': fmt(historicalRatios?.[1]?.interestCoverage ?? historicalRatios?.[1]?.interestCoverageRatio ?? null),

    // === DIVIDENDO POR AÇÃO ===
    'Dividendo por Ação': fmt(metrics?.dividendsPerShareTTM ?? ratios?.dividendsPerShareTTM ?? profile?.lastDividend ?? null),
    'Dividendo por Ação (Y-1)': fmt(historicalRatios?.[1]?.dividendsPerShare ?? historicalRatios?.[1]?.dividendPerShare ?? null),

    // === MÉTRICAS ESPECÍFICAS (P&D, CASH FLOW, ETC) ===
    'Investimento em P&D': fmtLarge(income?.researchAndDevelopmentExpenses),
    'Investimento em P&D (Y-1)': fmtLarge(investimentoPDAnoAnterior),
    'Eficiência de P&D': rAnddEfficiency ? fmt(rAnddEfficiency, 2) : '\u2014',
    'Eficiência de P&D (Y-1)': rAnddEfficiencyAnoAnterior ? fmt(rAnddEfficiencyAnoAnterior, 2) : '\u2014',
    'SG&A / Receita': fmtPercent(sgaOverRevenue),
    'SG&A / Receita (Y-1)': fmtPercent(sgaOverRevenueAnoAnterior),
    'Cash Flow / CapEx': (() => {
      // Primeiro tentar usar valor calculado
      if (cashFlowOverCapex != null && isFinite(cashFlowOverCapex)) {
        return fmt(cashFlowOverCapex, 2)
      }
      
      // Fallback: calcular manualmente
      if (cashflow?.operatingCashFlow && cashflow?.capitalExpenditure) {
        const capex = Math.abs(cashflow.capitalExpenditure)
        if (capex > 0) {
          const ratio = cashflow.operatingCashFlow / capex
          console.log(`📊 Cash Flow / CapEx calculado: ${cashflow.operatingCashFlow} / ${capex} = ${ratio}`)
          return fmt(ratio, 2)
        }
      }
      return '\u2014'
    })(),
    'Cash Flow / CapEx (Y-1)': (() => {
      // Primeiro tentar usar valor calculado
      if (cashFlowOverCapexAnoAnterior != null && isFinite(cashFlowOverCapexAnoAnterior)) {
        return fmt(cashFlowOverCapexAnoAnterior, 2)
      }
      
      // Fallback: calcular manualmente
      if (cashflowY1?.operatingCashFlow && cashflowY1?.capitalExpenditure) {
        const capex = Math.abs(cashflowY1.capitalExpenditure)
        if (capex > 0) {
          const ratio = cashflowY1.operatingCashFlow / capex
          console.log(`📊 Cash Flow / CapEx (Y-1) calculado: ${cashflowY1.operatingCashFlow} / ${capex} = ${ratio}`)
          return fmt(ratio, 2)
        }
      }
      return '\u2014'
    })(),
    'Free Cash Flow': fmtLarge(
      cashflow?.freeCashFlow ?? (cashflow?.operatingCashFlow && cashflow?.capitalExpenditure 
        ? cashflow.operatingCashFlow - Math.abs(cashflow.capitalExpenditure) 
        : null)
    ),
    'Free Cash Flow (Y-1)': fmtLarge(fcfAnoAnterior),
    'CapEx/Receita': (() => {
      const capex = cashflow?.capitalExpenditure
      const rev = income?.revenue
      if (!capex || !rev || rev <= 0) return '\u2014'
      return fmtPercent(Math.abs(capex) / rev)
    })(),
    'CapEx/Receita (Y-1)': (() => {
      const capex = cashflowY1?.capitalExpenditure
      const rev = incomeY1?.revenue
      if (!capex || !rev || rev <= 0) return '\u2014'
      return fmtPercent(Math.abs(capex) / rev)
    })(),

    // === DIVIDENDOS (CORRIGIDOS) ===
    'Payout Ratio': (() => {
      if (companyType.isREIT && ffoPayoutCalculated) {
        return fmtPercent(ffoPayoutCalculated)
      }
      return fmtPercent(metrics?.payoutRatioTTM ?? ratios?.payoutRatioTTM)
    })(),
    'Payout Ratio (Y-1)': (() => {
      if (companyType.isREIT && ffoPayoutY1Calculated) {
        return fmtPercent(ffoPayoutY1Calculated)
      }
      return fmtPercent(payoutRatioAnoAnterior)
    })(),
    
    // 🆕 DIVIDEND YIELD - CORRIGIDO
    'Dividend Yield': fmtPercent(dividendYield ?? null),
    'Dividend Yield (Y-1)': fmtPercent(dividendYieldY1 ?? null),
    
    // === OUTROS ===
    'Preço Atual': fmt(currentPrice),
    'Receitas Recorrentes (%)': (() => {
      // Tentar calcular baseado em rental income vs total revenue
      if (companyType.isREIT && income?.rentalIncome && income?.revenue) {
        const percentage = income.rentalIncome / income.revenue
        return fmtPercent(percentage)
      }
      return '\u2014'
    })(),
    
    // === CASH RATIO (CORRIGIDO) ===
    'Cash Ratio': fmt(cashRatio ?? null, 2),
    'Cash Ratio (Y-1)': fmt(cashRatioAnoAnterior ?? null, 2),

    // 🆕 MÉTRICAS BANCÁRIAS ESPECÍFICAS - APLICADAS APENAS QUANDO APROPRIADO
    'NIM': fmtPercent(companyType.isBanco ? nimCurrent : null),
    'NIM (Y-1)': fmtPercent(companyType.isBanco ? nimY1 : null),
    'Eficiência': (() => {
      if (companyType.isPaymentProcessor) {
        const operatingMargin = ratios?.operatingProfitMarginTTM || income?.operatingIncomeRatio
        return fmtPercent(operatingMargin ? 1 - operatingMargin : null)
      }
      if (companyType.isBanco && bankingEfficiency) {
        return fmtPercent(bankingEfficiency)
      }
      return '\u2014'
    })(),
    'Eficiência (Y-1)': (() => {
      if (companyType.isPaymentProcessor) {
        const operatingMarginY1 = historicalRatios?.[1]?.operatingProfitMargin
        return fmtPercent(operatingMarginY1 ? 1 - operatingMarginY1 : null)
      }
      if (companyType.isBanco && bankingEfficiencyY1) {
        return fmtPercent(bankingEfficiencyY1)
      }
      return '\u2014'
    })(),
    'LDR': fmtPercent(companyType.isBanco ? ldr : null),
    'LDR (Y-1)': fmtPercent(companyType.isBanco ? ldrY1 : null),
    'Cobertura': fmtPercent(companyType.isBanco ? provisionCoverage : null),
    'Cobertura (Y-1)': '\u2014', // Requer dados históricos mais detalhados

    // 🆕 LEVERED DCF - DISPONÍVEL DA FMP
    'Levered DCF': '\u2014', // Implementar quando DCF endpoint estiver disponível
    'Levered DCF (Y-1)': '\u2014',

    // 🏢 NOVOS CAMPOS ESPECÍFICOS DE REITs (CORRIGIDOS)

    // FFO (Funds From Operations)
    'FFO': fmtLarge(companyType.isREIT ? ffoCalculated : null),
    'FFO (Y-1)': fmtLarge(companyType.isREIT ? ffoY1Calculated : null),

    // AFFO (Adjusted FFO)
    'AFFO': fmtLarge(companyType.isREIT ? affoCalculated : null),
    'AFFO (Y-1)': fmtLarge(companyType.isREIT ? affoY1Calculated : null),
    
    // 🔧 P/FFO (Price to FFO) - CORRIGIDO PARA CALCULAR
    'P/FFO': (() => {
      if (companyType.isREIT && ffoCalculated) {
        // Tentar múltiplas fontes para market cap
        const marketCap = profile?.mktCap || 
                          (currentPrice && metrics?.sharesOutstanding ? currentPrice * metrics.sharesOutstanding : null) ||
                          (currentPrice && profile?.sharesOutstanding ? currentPrice * profile.sharesOutstanding : null)
        
        if (marketCap && marketCap > 0) {
          const pFFOValue = marketCap / ffoCalculated
          console.log(`📊 P/FFO calculado: ${marketCap} / ${ffoCalculated} = ${pFFOValue}`)
          return fmt(pFFOValue)
        } else {
          console.log(`⚠️ P/FFO não calculado - Market Cap: ${marketCap}`)
        }
      }
      return '\u2014'
    })(),
    'P/FFO (Y-1)': (() => {
      if (companyType.isREIT && ffoY1Calculated) {
        const marketCap = profile?.mktCap || 
                          (currentPrice && metrics?.sharesOutstanding ? currentPrice * metrics.sharesOutstanding : null) ||
                          (currentPrice && profile?.sharesOutstanding ? currentPrice * profile.sharesOutstanding : null)
        
        if (marketCap && marketCap > 0) {
          const pFFOY1Value = marketCap / ffoY1Calculated
          console.log(`📊 P/FFO (Y-1) calculado: ${marketCap} / ${ffoY1Calculated} = ${pFFOY1Value}`)
          return fmt(pFFOY1Value)
        }
      }
      return '\u2014'
    })(),
    
    // FFO Payout Ratio
    'FFO Payout Ratio': fmtPercent(companyType.isREIT ? ffoPayoutCalculated : null),
    'FFO Payout Ratio (Y-1)': fmtPercent(companyType.isREIT ? ffoPayoutY1Calculated : null),
    
    // Dividend CAGR Real (para REITs)
    'Dividend CAGR': (() => {
      if (companyType.isREIT && dividendCAGRCalculated) {
        return fmtPercent(dividendCAGRCalculated)
      }
      return cagrEPS // 🔧 Usar CAGR EPS processado
    })(),
    'Dividend CAGR (Y-1)': (() => {
      if (companyType.isREIT && dividendCAGRCalculated) {
        return fmtPercent(dividendCAGRCalculated)
      }
      return cagrEPSY1 // 🔧 Usar CAGR EPS (Y-1) processado
    })(),
    
    // 🔧 FFO per Share - CORRIGIDO PARA CALCULAR
'FFO per Share': (() => {
      if (companyType.isREIT && ffoCalculated) {
        const shares = getSharesOutstanding(profile, metrics, ratios, currentPrice, sharesFloat)
        
        if (shares && shares > 0) {
          const ffoPerShare = ffoCalculated / shares
          console.log(`📊 FFO per Share: ${ffoCalculated} / ${shares} = ${ffoPerShare}`)
          return fmt(ffoPerShare, 2)
        } else {
          console.log(`⚠️ FFO per Share não calculado - Shares: ${shares}`)
          console.log(`   FFO: ${ffoCalculated}`)
          console.log(`   Market Cap: ${profile?.mktCap}`)
          console.log(`   Current Price: ${currentPrice}`)
        }
      }
      return '\u2014'
    })(),
    'FFO per Share (Y-1)': (() => {
      if (companyType.isREIT && ffoY1Calculated) {
        const shares = getSharesOutstanding(profile, metrics, ratios, currentPrice, sharesFloat)

        if (shares && shares > 0) {
          const ffoPerShareY1 = ffoY1Calculated / shares
          console.log(`📊 FFO per Share (Y-1): ${ffoY1Calculated} / ${shares} = ${ffoPerShareY1}`)
          return fmt(ffoPerShareY1, 2)
        }
      }
      return '\u2014'
    })(),
    
    // 🔧 AFFO per Share - CORRIGIDO PARA CALCULAR
    'AFFO per Share': (() => {
      if (companyType.isREIT && affoCalculated) {
        const shares = getSharesOutstanding(profile, metrics, ratios, currentPrice, sharesFloat)

        if (shares && shares > 0) {
          const affoPerShare = affoCalculated / shares
          console.log(`📊 AFFO per Share: ${affoCalculated} / ${shares} = ${affoPerShare}`)
          return fmt(affoPerShare, 2)
        } else {
          console.log(`⚠️ AFFO per Share não calculado - Shares: ${shares}`)
          console.log(`   AFFO: ${affoCalculated}`)
          console.log(`   Market Cap: ${profile?.mktCap}`)
          console.log(`   Current Price: ${currentPrice}`)
        }
      }
      return '\u2014'
    })(),
    'AFFO per Share (Y-1)': (() => {
      if (companyType.isREIT && affoY1Calculated) {
        const shares = getSharesOutstanding(profile, metrics, ratios, currentPrice, sharesFloat)

        if (shares && shares > 0) {
          const affoPerShareY1 = affoY1Calculated / shares
          console.log(`📊 AFFO per Share (Y-1): ${affoY1Calculated} / ${shares} = ${affoPerShareY1}`)
          return fmt(affoPerShareY1, 2)
        }
      }
      return '\u2014'
    })(),

    // 🚫 MÉTRICAS NÃO DISPONÍVEIS
    'Basileia': '\u2014',
    'Basileia (Y-1)': '\u2014',
    'Tier 1': '\u2014',
    'Tier 1 (Y-1)': '\u2014',
    'Alavancagem': fmt(ratios?.debtEquityRatioTTM ?? metrics?.debtEquityRatioTTM), // Proxy
    'Alavancagem (Y-1)': fmt(debtEquityAnoAnterior), // Proxy
    'Inadimplência': '\u2014',
    'Inadimplência (Y-1)': '\u2014',
    'Custo do Crédito': '\u2014',
    'Custo do Crédito (Y-1)': '\u2014',
  }

  // 🔧 VALIDAÇÃO FINAL DOS INDICADORES CRÍTICOS
  console.log('🔍 [CRITICAL] Validação final dos indicadores:')
  console.log(`   ✅ EPS: ${resultado['EPS']}`)
  console.log(`   ✅ EPS (Y-1): ${resultado['EPS (Y-1)']}`)
  console.log(`   ✅ CAGR EPS: ${resultado['CAGR EPS']}`)
  console.log(`   ✅ CAGR EPS (Y-1): ${resultado['CAGR EPS (Y-1)']}`)
  console.log(`   ✅ P/L: ${resultado['P/L']}`)
  console.log(`   ✅ PEG: ${resultado['PEG']}`)

  // 🚨 ALERTAS se ainda há problemas
  if (resultado['CAGR EPS'] === '\u2014') {
    console.log('🚨 [CRITICAL] CAGR EPS ainda é N/A após todas as correções!')
    console.log('🔍 Dados de entrada para debug:')
    console.log(`   epsCalculations.cagrEps: ${cagrEps}`)
    console.log(`   epsCalculations.epsAtual: ${epsAtual}`)
    console.log(`   rawData.income.epsY1: ${rawData.income?.epsY1}`)
  }

  if (resultado['EPS (Y-1)'] === '\u2014') {
    console.log('🚨 [CRITICAL] EPS (Y-1) ainda é N/A - verificar fontes de dados históricos')
  }

  // 🔧 VALIDAÇÃO FINAL DOS INDICADORES CRÍTICOS
  const validationResults = {
    epsAtual: resultado['EPS'] !== '\u2014',
    epsY1: resultado['EPS (Y-1)'] !== '\u2014',
    cagrEps: resultado['CAGR EPS'] !== '\u2014' && resultado['CAGR EPS'] !== '0.00%',
    pl: resultado['P/L'] !== '\u2014',
    peg: resultado['PEG'] !== '\u2014'
  }
  
  console.log('   ✅ EPS Atual válido:', validationResults.epsAtual, '- Valor:', resultado['EPS'])
  console.log('   ✅ EPS (Y-1) válido:', validationResults.epsY1, '- Valor:', resultado['EPS (Y-1)'])
  console.log('   ✅ CAGR EPS válido:', validationResults.cagrEps, '- Valor:', resultado['CAGR EPS'])
  console.log('   ✅ P/L válido:', validationResults.pl, '- Valor:', resultado['P/L'])
  console.log('   ✅ PEG válido:', validationResults.peg, '- Valor:', resultado['PEG'])
  
  // 🚨 ALERTAS se indicadores críticos ainda estão com problema
  if (!validationResults.cagrEps) {
    console.log('🚨 ALERTA: CAGR EPS ainda não foi corrigido - verificar dados de entrada')
  }
  if (!validationResults.epsY1) {
    console.log('🚨 ALERTA: EPS (Y-1) não encontrado - verificar historical data')
  }
  if (!validationResults.peg && validationResults.pl && validationResults.cagrEps) {
    console.log('🚨 ALERTA: PEG deveria ser calculável mas não foi - verificar lógica')
  }

  console.log('✅ [FIXED] Resultado final montado com foco nas correções críticas')
  console.log('✅ [FIXED] Resultado final montado com', Object.keys(resultado).length, 'indicadores')
  console.log('🆕 Novas métricas FMP adicionadas:', [
    'ROA', 'ROA (Y-1)', 'P/VPA', 'P/VPA (Y-1)', 
    'Dividend Yield', 'Dividend Yield (Y-1)',
    'NIM', 'NIM (Y-1)', 'Eficiência', 'Eficiência (Y-1)',
    'LDR', 'LDR (Y-1)', 'Cobertura',
    'Crescimento Carteira', 'Crescimento Carteira (Y-1)',
    ...(companyType.isREIT ? [
      'FFO', 'FFO (Y-1)', 'AFFO', 'AFFO (Y-1)', 
      'P/FFO', 'P/FFO (Y-1)', // 🔧 CORRIGIDO
      'FFO Payout Ratio', 'FFO Payout Ratio (Y-1)',
      'Dividend CAGR', 'FFO per Share', 'FFO per Share (Y-1)', // 🔧 CORRIGIDO
      'AFFO per Share', 'AFFO per Share (Y-1)' // 🔧 CORRIGIDO
    ] : [])
  ].length, 'indicadores')
  console.log('🔧 Correções aplicadas: detecção de tipo de empresa e métricas condicionais')
  console.log('🏢 REIT específico:', companyType.isREIT ? 'ATIVADO' : 'DESATIVADO')
  console.log('🎯 Indicadores críticos validados:', Object.values(validationResults).filter(Boolean).length, 'de', Object.keys(validationResults).length)
  console.log('🔧 Métricas REIT opcionais implementadas: P/FFO, FFO per Share, AFFO per Share')
  console.log('🔧 Métricas históricas aprimoradas: P/VPA (Y-1), Dividend Yield (Y-1)')
  
  return resultado
}

/**
 * 🔧 FUNÇÃO AUXILIAR: Validar indicadores construídos após criação
 */
function validateIndicadoresResult(indicadores: IndicadoresResult): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  const DASH = '\u2014'

  // Verificar CAGR EPS
  if (indicadores["CAGR EPS"] === "0.00%" || indicadores["CAGR EPS"] === DASH) {
    issues.push("CAGR EPS não calculado corretamente")
  }

  // Verificar P/L
  const pl = parseFloat(indicadores["P/L"])
  if (isNaN(pl) || pl <= 0 || pl > 1000) {
    issues.push(`P/L suspeito: ${indicadores["P/L"]}`)
  }

  // Verificar PEG
  if (indicadores["PEG"] === DASH && indicadores["CAGR EPS"] !== DASH && indicadores["CAGR EPS"] !== "0.00%") {
    issues.push("PEG não calculado apesar de ter CAGR EPS válido")
  }

  // Verificar EPS
  if (indicadores["EPS"] === DASH) {
    issues.push("EPS não encontrado")
  }
  
  // Verificar consistência P/L vs EPS vs Preço
  const eps = parseFloat(indicadores["EPS"])
  const preco = parseFloat(indicadores["Preço Atual"])
  if (!isNaN(pl) && !isNaN(eps) && !isNaN(preco) && eps > 0) {
    const plCalculado = preco / eps
    const diferenca = Math.abs(pl - plCalculado)
    if (diferenca > 2) {
      issues.push(`Inconsistência P/L: mostrado=${pl}, calculado=${plCalculado.toFixed(2)}`)
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * 🧪 FUNÇÃO DE TESTE: Validar se as correções funcionaram
 */
export function validateCAGREPSFix(resultado: IndicadoresResult): boolean {
  console.log('🧪 Validando correções CAGR EPS...')
  
  const tests = {
    cagrEPSExists: resultado['CAGR EPS'] !== '\u2014',
    cagrEPSReasonable: resultado['CAGR EPS'] !== '0.00%',
    epsExists: resultado['EPS'] !== '\u2014',
    plExists: resultado['P/L'] !== '\u2014'
  }
  
  console.log('📊 Resultados dos testes:')
  Object.entries(tests).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed}`)
  })
  
  const allPassed = Object.values(tests).every(Boolean)
  console.log(`🎯 Status geral: ${allPassed ? '✅ APROVADO' : '❌ REPROVADO'}`)
  
  return allPassed
}
