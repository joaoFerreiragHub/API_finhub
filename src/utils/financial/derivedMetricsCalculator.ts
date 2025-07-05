// src/utils/financial/derivedMetricsCalculator.ts

import { DerivedMetrics } from './types'

/**
 * Calcula métricas derivadas a partir dos dados financeiros básicos
 */
export function calculateDerivedMetrics(
  income: any, 
  cashflow: any, 
  ratios: any, 
  cagrEps: number | null,
  epsAtual: number | null // 🆕 ADICIONADO: precisamos do EPS calculado
): DerivedMetrics {
  console.log('⚙️ Calculando métricas derivadas...')

  // SG&A como percentual da receita
  const sgaOverRevenue = income.sellingGeneralAndAdministrativeExpenses && income.revenue
    ? income.sellingGeneralAndAdministrativeExpenses / income.revenue
    : null

  // Ratio de Cash Flow sobre CapEx
  const cashFlowOverCapex = cashflow.operatingCashFlow && cashflow.capitalExpenditure
    ? cashflow.operatingCashFlow / Math.abs(cashflow.capitalExpenditure)
    : null

  // Eficiência de investimento em P&D (EPS por dólar investido em P&D)
  // 🔧 CORRIGIDO: usar epsAtual em vez de income.eps
  const rAnddEfficiency = epsAtual && income.researchAndDevelopmentExpenses
    ? epsAtual / (income.researchAndDevelopmentExpenses / 1e9) // Converter para bilhões para ter valor razoável
    : null

  // PEG manual calculado (P/E ajustado pelo crescimento)
  const pegManual = cagrEps && ratios.peRatioTTM
    ? ratios.peRatioTTM / (cagrEps * 100) // *100 porque o CAGR está em decimal
    : null

  const result = { sgaOverRevenue, cashFlowOverCapex, rAnddEfficiency, pegManual }
  
  console.log('✅ Métricas derivadas calculadas:', result)
  return result
}