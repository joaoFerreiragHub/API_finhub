// src/utils/financial/dataFetcher.ts - VERSÃO CORRIGIDA

import axios from 'axios'
import { RawFinancialData, EarningsCalendarEntry, HistoricalRatiosEntry } from './types'

const FMP = 'https://financialmodelingprep.com/api/v3'
const FMPv4 = 'https://financialmodelingprep.com/api/v4'
const FMP_STABLE = 'https://financialmodelingprep.com/stable'
const API_KEY = process.env.FMP_API_KEY

const fetch = (url: string) => axios.get(url).then((res) => res.data)

/**
 * 🔧 VERSÃO CORRIGIDA: Busca todos os dados financeiros brutos da API FMP
 */
export async function fetchRawFinancialData(symbol: string): Promise<RawFinancialData> {
  console.log(`🔍 [FIXED] Buscando dados financeiros para ${symbol}...`)
  
  try {
    const [
      ratiosRes, 
      metricsRes, 
      incomeRes, // 🔧 AUMENTADO PARA 3 ANOS
      growthRes, 
      profileRes, 
      cashflowRes, 
      balanceRes,
      historicalRatiosRes, // 🔧 AUMENTADO PARA 5 ANOS
      quoteShortRes, 
      earningsCalendarRes, // 🔧 AUMENTADO LIMITE
      keyMetricsHistoricalRes,
      sharesFloatRes, // 🆕 NOVO ENDPOINT
      inventoryDataRes, // 🆕 NOVO
      assetTurnoverDataRes, // 🆕 NOVO  
      cashConversionRes, // 🆕 NOVO
    ] = await Promise.all([
      fetch(`${FMP}/ratios-ttm/${symbol}?apikey=${API_KEY}`),
      fetch(`${FMP}/key-metrics-ttm/${symbol}?apikey=${API_KEY}`),
      fetch(`${FMP}/income-statement/${symbol}?limit=3&apikey=${API_KEY}`), // 🔧 3 anos
      fetch(`${FMP}/financial-growth/${symbol}?period=annual&apikey=${API_KEY}`),
      fetch(`${FMP}/profile/${symbol}?apikey=${API_KEY}`),
      fetch(`${FMP}/cash-flow-statement/${symbol}?limit=3&apikey=${API_KEY}`), // 🔧 3 anos
      fetch(`${FMP}/balance-sheet-statement/${symbol}?limit=3&apikey=${API_KEY}`), // 🔧 3 anos
      fetch(`${FMP}/ratios/${symbol}?limit=5&apikey=${API_KEY}`), // 🔧 5 anos
      fetch(`${FMP}/quote-short/${symbol}?apikey=${API_KEY}`),
      fetch(`${FMP}/historical/earning_calendar/${symbol}?limit=12&apikey=${API_KEY}`), // 🔧 12 quarters
      fetch(`${FMP}/key-metrics/${symbol}?limit=5&apikey=${API_KEY}`), // 🔧 5 anos
      fetch(`${FMPv4}/shares_float?symbol=${symbol}&apikey=${API_KEY}`), // 🆕 SHARES FLOAT
      fetch(`${FMP}/ratios/${symbol}?limit=5&apikey=${API_KEY}`), // Já existe, usar para inventory turnover
      fetch(`${FMP}/key-metrics/${symbol}?limit=5&apikey=${API_KEY}`), // Já existe, usar para asset turnover
      fetch(`${FMP}/ratios/${symbol}?limit=5&apikey=${API_KEY}`) // Usar para cash conversion cycle
    ])

    // 🔧 PROCESSAMENTO INTELIGENTE DOS INCOME STATEMENTS
    const processedIncome = {
      ...incomeRes[0],
      // Garantir múltiplos campos de EPS
      eps: incomeRes[0]?.eps ?? incomeRes[0]?.epsdiluted ?? incomeRes[0]?.epsbasic,
      epsdiluted: incomeRes[0]?.epsdiluted,
      epsbasic: incomeRes[0]?.epsbasic,
      
      // 🔧 CRÍTICO: ADICIONAR EPS DOS ANOS ANTERIORES (CORREÇÃO PRINCIPAL)
      epsY1: incomeRes[1]?.eps ?? incomeRes[1]?.epsdiluted ?? incomeRes[1]?.epsbasic,
      epsY2: incomeRes[2]?.eps ?? incomeRes[2]?.epsdiluted ?? incomeRes[2]?.epsbasic,
      
      // Outros dados do income statement
      netIncome: incomeRes[0]?.netIncome,
      netIncomeY1: incomeRes[1]?.netIncome,
      netIncomeY2: incomeRes[2]?.netIncome,
      
      revenue: incomeRes[0]?.revenue,
      revenueY1: incomeRes[1]?.revenue,
      revenueY2: incomeRes[2]?.revenue
    }

    // 🔧 PROCESSAMENTO DOS EARNINGS CALENDAR
    const processedEarnings: EarningsCalendarEntry[] = earningsCalendarRes
      ?.filter((e: EarningsCalendarEntry) => {
        const eps = e.eps ?? e.epsActual ?? e.estimatedEPS
        return eps != null && !isNaN(eps) && e.date
      })
      ?.sort((a: EarningsCalendarEntry, b: EarningsCalendarEntry) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      ?.slice(0, 12) // Últimos 12 quarters
      ?.map((e: EarningsCalendarEntry) => ({
        ...e,
        eps: e.eps ?? e.epsActual ?? e.estimatedEPS // Normalizar campo EPS
      })) || []

    // 🔧 PROCESSAMENTO DOS HISTORICAL RATIOS
    const processedHistoricalRatios: HistoricalRatiosEntry[] = historicalRatiosRes
      ?.filter((r: HistoricalRatiosEntry) => r.eps != null && !isNaN(r.eps))
      ?.sort((a: HistoricalRatiosEntry, b: HistoricalRatiosEntry) => 
        new Date(b.date || b.period || '').getTime() - new Date(a.date || a.period || '').getTime()
      ) || []

    
    // 🔧 CRÍTICO: Debug específico para CAGR EPS
    if (processedIncome.eps && processedIncome.epsY1) {
      const manualCAGR = ((processedIncome.eps / processedIncome.epsY1) - 1) * 100
      console.log(`   🎯 CAGR EPS Manual: ${processedIncome.epsY1} → ${processedIncome.eps} = ${manualCAGR.toFixed(2)}%`)
    } else {
      console.log(`   ⚠️ PROBLEMA: Não é possível calcular CAGR EPS`)
      console.log(`      EPS atual: ${processedIncome.eps}`)
      console.log(`      EPS Y-1: ${processedIncome.epsY1}`)
    }
    
    // Log das primeiras entradas para debug
    if (processedEarnings.length > 0) {
      console.log(`   Earnings[0]: date=${processedEarnings[0].date}, eps=${processedEarnings[0].eps}`)
    }
    if (processedHistoricalRatios.length > 0) {
      console.log(`   HistRatios[0]: eps=${processedHistoricalRatios[0].eps}`)
    }

    const result = {
      ratios: ratiosRes[0] || {},
      metrics: metricsRes[0] || {},
      income: processedIncome, // 🔧 USAR VERSÃO PROCESSADA
      incomeY1: incomeRes[1] || {},
      incomeY2: incomeRes[2] || {}, // 🔧 CORRIGIDO: Adicionar Y-2
      balance: balanceRes[0] || {},
      balanceY1: balanceRes[1] || {},
      balanceY2: balanceRes[2] || {}, // 🔧 CORRIGIDO: Adicionar Y-2
      growth: growthRes[0] || {},
      profile: profileRes[0] || {},
      cashflow: cashflowRes[0] || {},
      cashflowY1: cashflowRes[1] || {},
      cashflowY2: cashflowRes[2] || {}, // 🔧 CORRIGIDO: Adicionar Y-2
      historicalRatios: processedHistoricalRatios, // 🔧 USAR VERSÃO PROCESSADA
      keyMetricsHistorical: keyMetricsHistoricalRes || [],
      currentPrice: quoteShortRes[0]?.price ?? profileRes[0]?.price ?? null, // 🔧 FALLBACK
      earningsCalendar: processedEarnings, // 🔧 USAR VERSÃO PROCESSADA
      sharesFloat: sharesFloatRes?.[0] || null // 🆕 SHARES FLOAT DATA
    }
    // 🔧 VALIDAÇÃO FINAL
    const validationInfo = {
      temEPSAtual: result.income.eps != null,
      temEPSY1: result.income.epsY1 != null,
      temPreco: result.currentPrice != null,
      podeCalcularCAGR: result.income.eps != null && result.income.epsY1 != null,
      earningsDisponiveis: result.earningsCalendar.length,
      ratiosDisponiveis: result.historicalRatios.length
    }
    
    console.log(`✅ [FIXED] Dados obtidos para ${symbol}:`, validationInfo)
    
    // 🚨 ALERTAS se dados críticos estão faltando
    if (!validationInfo.temEPSAtual) {
      console.log(`⚠️ ALERTA: EPS atual não encontrado para ${symbol}`)
    }
    if (!validationInfo.temEPSY1) {
      console.log(`⚠️ ALERTA: EPS Y-1 não encontrado para ${symbol}`)
    }
    if (!validationInfo.podeCalcularCAGR) {
      console.log(`⚠️ ALERTA: Não será possível calcular CAGR EPS para ${symbol}`)
    }

    return result

  } catch (error) {
    console.error(`❌ Erro ao buscar dados financeiros para ${symbol}:`, error)
    throw new Error(`Falha ao obter dados financeiros para ${symbol}`)
  }
}