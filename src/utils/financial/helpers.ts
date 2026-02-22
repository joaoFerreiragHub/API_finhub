// src/utils/financial/helpers.ts - VERSÃO CORRIGIDA

const EM_DASH = '\u2014'

/**
 * Guarda contra sentinel 0 do FMP: para empresas com market cap > threshold,
 * um valor de exatamente 0 é impossível e representa dado em falta.
 */
export const plausibleOrNull = (
  value: number | null | undefined,
  marketCap: number | null | undefined,
  threshold = 5e8,
): number | null => {
  if (value === null || value === undefined) return null
  if (value === 0 && (marketCap ?? 0) > threshold) return null
  return value
}

/**
 * Função para formatar números com precisão decimal
 */
export const fmt = (val: number | undefined | null, digits = 2): string => {
  if (val == null || isNaN(val)) return EM_DASH
  return val.toFixed(digits)
}

/**
 * Função para formatar percentuais - VERSÃO CORRIGIDA
 */
export const fmtPercent = (val: number | undefined | null, digits = 2): string => {
  if (val == null || isNaN(val)) return EM_DASH
  return (val * 100).toFixed(digits) + '%'
}

/**
 * Função para formatar valores grandes (M/B)
 */
export const fmtLarge = (val: number | undefined | null): string => {
  if (val == null || isNaN(val)) return EM_DASH
  if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B'
  if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M'
  return val.toFixed(0)
}

/**
 * 🔧 FUNÇÃO CORRIGIDA: Calcular CAGR (Compound Annual Growth Rate)
 */
export const calculateCAGR = (
  initialValue: number, 
  finalValue: number, 
  periods: number
): number | null => {
  console.log(`🔧 calculateCAGR chamado: ${initialValue} → ${finalValue}, períodos: ${periods}`)
  
  // Validações básicas
  if (initialValue == null || finalValue == null || periods == null) {
    console.log('⚠️ calculateCAGR: valores null/undefined')
    return null
  }
  
  if (isNaN(initialValue) || isNaN(finalValue) || isNaN(periods)) {
    console.log('⚠️ calculateCAGR: valores NaN')
    return null
  }
  
  if (periods <= 0) {
    console.log('⚠️ calculateCAGR: períodos <= 0')
    return null
  }
  
  if (initialValue === 0) {
    console.log('⚠️ calculateCAGR: valor inicial é zero')
    return null
  }
  
  // 🔧 CORREÇÃO PRINCIPAL: Cálculo simples e direto para 1 período
  if (periods === 1) {
    const simpleGrowth = (finalValue - initialValue) / Math.abs(initialValue)
    console.log(`📊 CAGR simples (1 período): (${finalValue} - ${initialValue}) / ${Math.abs(initialValue)} = ${simpleGrowth}`)
    
    // Validação de sanidade: crescimento não deve ser extremo
    if (Math.abs(simpleGrowth) > 50) { // Mais de 5000%
      console.log(`⚠️ CAGR extremo detectado: ${simpleGrowth * 100}% - limitando`)
      return simpleGrowth > 0 ? 50 : -0.99 // Limitar a 5000% ou -99%
    }
    
    return simpleGrowth
  }
  
  // Para múltiplos períodos
  try {
    // Caso especial: se valor inicial é negativo e final é positivo (recuperação)
    if (initialValue < 0 && finalValue > 0) {
      console.log('📈 Recuperação detectada: negativo → positivo')
      return 2.0 // 200% como indicador de recuperação forte
    }
    
    // Caso especial: se valor inicial é positivo e final é negativo (deterioração)
    if (initialValue > 0 && finalValue < 0) {
      console.log('📉 Deterioração detectada: positivo → negativo')
      return -0.95 // -95% como indicador de deterioração
    }
    
    // Se ambos são negativos, calcular melhoria de prejuízos
    if (initialValue < 0 && finalValue < 0) {
      const absInitial = Math.abs(initialValue)
      const absFinal = Math.abs(finalValue)
      
      if (absFinal < absInitial) {
        // Prejuízo diminuiu (melhoria)
        const improvement = (absInitial - absFinal) / absInitial
        console.log(`📈 Melhoria de prejuízo: ${improvement * 100}%`)
        return improvement / periods // Distribuir melhoria pelos períodos
      } else {
        // Prejuízo aumentou (piora)
        const deterioration = (absFinal - absInitial) / absInitial
        console.log(`📉 Piora de prejuízo: ${deterioration * 100}%`)
        return -deterioration / periods // Distribuir piora pelos períodos
      }
    }
    
    // Caso normal: ambos positivos
    if (initialValue > 0 && finalValue > 0) {
      const cagr = Math.pow(finalValue / initialValue, 1 / periods) - 1
      console.log(`📊 CAGR calculado: (${finalValue} / ${initialValue})^(1/${periods}) - 1 = ${cagr}`)
      
      // Validação de sanidade
      if (Math.abs(cagr) > 10) { // Mais de 1000%
        console.log(`⚠️ CAGR extremo: ${cagr * 100}% - limitando`)
        return cagr > 0 ? 10 : -0.99
      }
      
      return cagr
    }
    
    console.log('⚠️ calculateCAGR: caso não tratado')
    return null
    
  } catch (error) {
    console.log('❌ calculateCAGR: erro no cálculo:', error)
    return null
  }
}

/**
 * 🔧 FUNÇÃO AUXILIAR: Validar se um valor percentual é razoável
 */
export const isReasonablePercentage = (value: number, maxPercent: number = 1000): boolean => {
  return Math.abs(value * 100) <= maxPercent
}

/**
 * 🔧 FUNÇÃO AUXILIAR: Formatar CAGR especificamente com validações
 */
export const formatCAGR = (cagrValue: number | null | undefined): string => {
  if (cagrValue == null || isNaN(cagrValue)) return EM_DASH
  if (!isReasonablePercentage(cagrValue, 2000)) {
    console.log(`⚠️ CAGR fora do esperado: ${cagrValue * 100}%`)
    return EM_DASH
  }
  return fmtPercent(cagrValue)
}
/**
 * 🆕 CONSUMER DEFENSIVE: Funções específicas para indicadores de eficiência
 */

// Inventory Turnover
export const calculateInventoryTurnover = (cogs: number, avgInventory: number): number | null => {
  if (!cogs || !avgInventory || avgInventory === 0) return null
  return cogs / avgInventory
}

// Asset Turnover  
export const calculateAssetTurnover = (revenue: number, totalAssets: number): number | null => {
  if (!revenue || !totalAssets || totalAssets === 0) return null
  return revenue / totalAssets
}

// Cash Conversion Cycle
export const calculateCashConversionCycle = (dso: number, dio: number, dpo: number): number | null => {
  if (dso == null || dio == null || dpo == null) return null
  return dso + dio - dpo
}

// Revenue Volatility (desvio padrão dos últimos anos)
export const calculateVolatility = (values: number[]): number | null => {
  if (!values || values.length < 2) return null
  const mean = values.reduce((a, b) => a + b) / values.length
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  return Math.sqrt(variance) / mean // Coeficiente de variação
}

// Consistency Score (menor volatilidade = maior consistência)
export const calculateConsistencyScore = (revenueVolatility: number, earningsVolatility: number): number | null => {
  if (revenueVolatility == null || earningsVolatility == null) return null
  const avgVolatility = (revenueVolatility + earningsVolatility) / 2
  return Math.max(0, 100 - (avgVolatility * 100)) // Score de 0-100
}