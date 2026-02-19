// src/utils/stockFetchers.ts

import axios from 'axios'
import { IndicadoresResult } from './financial/types'
import { fetchRawFinancialData } from './financial/dataFetcher'
import { calculateEPSMetrics } from './financial/epsCalculator'

import { buildIndicadoresResult } from './financial/resultBuilder'
import { calculateDerivedMetrics } from './financial/derivedMetricsCalculator'


const FMP_STABLE = 'https://financialmodelingprep.com/stable'
const API_KEY = process.env.FMP_API_KEY

const fetch = (url: string) => axios.get(url).then((res) => res.data)

type IncomeStatement = {
  netIncome: number
  dividendPerShare?: number
}

type CashFlowStatement = {
  freeCashFlow?: number
  operatingCashFlow: number
  capitalExpenditure: number
}

// 1. Perfil da empresa
export async function fetchProfile(symbol: string) {
  const data = await fetch(`${FMP_STABLE}/profile?symbol=${symbol}&apikey=${API_KEY}`)
  const company = data?.[0]
  if (!company) throw new Error(`Perfil não encontrado para ${symbol}`)
  return {
    symbol: company.symbol,
    name: company.companyName,
    industry: company.industry,
    sector: company.sector,
    description: company.description,
    ceo: company.ceo,
    website: company.website,
    image: company.image,
    ipoDate: company.ipoDate,
    price: company.price,
    marketCap: company.marketCap,
    beta: company.beta,
    lastDividend: company.lastDividend,
    employees: company.fullTimeEmployees,
    address: `${company.address}, ${company.city}, ${company.state}, ${company.zip}, ${company.country}`
  }
}

// 2. Scores (rating + ratios)
export async function fetchScores(symbol: string) {
  console.log(`🔍 Buscando scores para ${symbol}...`)
  
  // 🛡️ FETCH SEGURO: Função helper para lidar com falhas individuais
  const safeFetch = async (url: string, description: string) => {
    try {
      console.log(`📡 Tentando buscar ${description}...`)
      const result = await fetch(url)
      console.log(`✅ ${description} obtido com sucesso`)
      return result
    } catch (error) {

      return null
    }
  }

  // 🔄 BUSCAR DADOS COM TRATAMENTO INDIVIDUAL DE ERROS
  const [ratios, rating, financialScores] = await Promise.all([
    safeFetch(`${FMP_STABLE}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Ratios TTM'),
    safeFetch(`${FMP_STABLE}/ratings-snapshot?symbol=${symbol}&apikey=${API_KEY}`, 'Rating'),
    safeFetch(`${FMP_STABLE}/financial-scores?symbol=${symbol}&apikey=${API_KEY}`, 'Financial Scores')
  ])

  return {
    ratios: ratios?.[0] || null,
    rating: rating?.[0] || null,
    financialScores: financialScores?.[0] || null
  }
}



// 3. Peers + quotes
export async function fetchPeers(symbol: string) {
  try {
    const peersData = await fetch(`${FMP_STABLE}/stock-peers?symbol=${symbol}&apikey=${API_KEY}`)
    const peers = peersData?.[0]?.peersList?.slice(0, 5) || []
    const quotes = peers.length > 0
      ? await fetch(`${FMP_STABLE}/quote?symbol=${peers.join(',')}&apikey=${API_KEY}`)
      : []
    return { peers, quotes }
  } catch (error) {
    console.warn(`⚠️ fetchPeers falhou para ${symbol}`)
    return { peers: [], quotes: [] }
  }
}

// 4. Alertas de risco
export async function fetchAlerts(symbol: string) {
  const safeFetch = async (url: string, description: string) => {
    try {
      return await fetch(url)
    } catch (error) {
      console.warn(`⚠️ ${description} falhou para ${symbol}`)
      return null
    }
  }

  const [ratiosRes, incomeRes, cashflowRes] = await Promise.all([
    safeFetch(`${FMP_STABLE}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Ratios TTM'),
    safeFetch(`${FMP_STABLE}/income-statement?symbol=${symbol}&limit=3&apikey=${API_KEY}`, 'Income Statement'),
    safeFetch(`${FMP_STABLE}/cash-flow-statement?symbol=${symbol}&limit=3&apikey=${API_KEY}`, 'Cash Flow')
  ])

  const ratios = ratiosRes?.[0] || {}
  const income: IncomeStatement[] = incomeRes || []
  const cashflow: CashFlowStatement[] = cashflowRes || []
    const alerts = []


  if (ratios?.debtEquityRatioTTM > 1) {
    alerts.push({
      title: 'Endividamento elevado',
      description: 'A dívida excede 100% do patrimônio.',
      severity: 'high'
    })
  }

  const netIncomes = income.map((i) => i.netIncome)
  if (netIncomes.length >= 3 && netIncomes[0] < netIncomes[1] && netIncomes[1] < netIncomes[2]) {
    alerts.push({
      title: 'Lucros em queda',
      description: 'Net Income em queda nos últimos 3 anos.',
      severity: 'medium'
    })
  }

  const fcf = cashflow.map((c) =>
    typeof c.freeCashFlow === 'number' ? c.freeCashFlow : c.operatingCashFlow - c.capitalExpenditure
  )
  if (fcf.slice(0, 2).every((v) => v < 0)) {
    alerts.push({
      title: 'Fluxo de caixa negativo',
      description: 'FCF negativo nos últimos 2 anos.',
      severity: 'medium'
    })
  }

  const dps = income.map((i) => i.dividendPerShare || 0).filter((d) => d > 0)
  if (dps.length >= 3 && new Set(dps).size > 2) {
    alerts.push({
      title: 'Dividendos inconsistentes',
      description: 'Histórico irregular de distribuição.',
      severity: 'low'
    })
  }

  return alerts
}
  
// 5. Radar de performance
export async function fetchRadar(symbol: string) {
  console.log(`📊 Buscando dados de radar para ${symbol}...`)
  
  // 🛡️ FETCH SEGURO: Função helper para lidar com falhas individuais
  const safeFetch = async (url: string, description: string) => {
    try {
      console.log(`📡 Tentando buscar ${description} para ${symbol}...`)
      const result = await fetch(url)
      console.log(`✅ ${description} obtido com sucesso`)
      return result
    } catch (error) {
      return null
    }
  }

  // 🔄 BUSCAR DADOS COM TRATAMENTO INDIVIDUAL DE ERROS
  const [ratiosRes, metricsRes, scoresRes, growthRes] = await Promise.all([
    safeFetch(`${FMP_STABLE}/ratios-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Ratios TTM'),
    safeFetch(`${FMP_STABLE}/key-metrics-ttm?symbol=${symbol}&apikey=${API_KEY}`, 'Key Metrics TTM'),
    safeFetch(`${FMP_STABLE}/financial-scores?symbol=${symbol}&apikey=${API_KEY}`, 'Financial Scores'),
    safeFetch(`${FMP_STABLE}/financial-growth?symbol=${symbol}&apikey=${API_KEY}`, 'Financial Growth')
  ])

  const ratios = ratiosRes?.[0] || {}
  const metrics = metricsRes?.[0] || {}
  const scores = scoresRes?.[0] || {}
  const growth = growthRes?.[0] || {}

  const normalize = (value: number | null, max: number = 1) => {
    if (value == null || isNaN(value)) return 0
    return Math.min(Math.max((value / max) * 100, 0), 100)
  }

  return [
    {
      metric: 'Valuation (barato)',
      value: normalize(1 / (ratios.peRatioTTM || 50), 0.2), // PE baixo = bom
    },
    {
      metric: 'Rentabilidade',
      value: normalize(ratios.returnOnEquityTTM || 0, 0.4),
    },
    {
      metric: 'Crescimento',
      value: normalize(growth.revenueGrowth || 0, 0.25),
    },
    {
      metric: 'Solidez',
      value: normalize(1 / (ratios.debtEquityRatioTTM || 2), 1), // dívida baixa = bom
    },
    {
      metric: 'Risco (baixo)',
      value: normalize(scores.altmanZScore || 0, 10), // ZScore alto = bom (scores pode ser null)
    },
    {
      metric: 'Dividendos',
      value: normalize(metrics.dividendYieldTTM || 0, 0.06),
    },
  ]
}
  
  
  export async function fetchRadarWithPeers(symbol: string) {
    const { peers } = await fetchPeers(symbol)
    const selectedPeers = peers.slice(0, 2)
  
    const [mainRadar, ...peerRadars] = await Promise.all([
        fetchRadar(symbol),
      ...selectedPeers.map(fetchRadar)
    ])
  
    return {
      main: { symbol, radar: mainRadar },
      peers: selectedPeers.map((peerSymbol: string, i: number) => ({
        symbol: peerSymbol,
        radar: peerRadars[i]
      }))
      
    }
  }
  


  // 6. Indicadores por setor
  export async function fetchIndicadores(symbol: string): Promise<IndicadoresResult> {
    console.log(`🚀 Iniciando busca de indicadores para ${symbol}...`)
    
    try {
      // 1. Buscar dados brutos da API FMP
      const rawData = await fetchRawFinancialData(symbol)
      
      // 2. Calcular métricas de EPS e CAGR
      const epsCalculations = calculateEPSMetrics(
        rawData.earningsCalendar, 
        rawData.income, 
        rawData.historicalRatios
      )
      
      // 3. Calcular métricas derivadas
      const derivedMetrics = calculateDerivedMetrics(
        rawData.income, 
        rawData.cashflow, 
        rawData.ratios, 
        epsCalculations.cagrEps,
        epsCalculations.epsAtual // 🆕 ADICIONADO: passar o EPS atual
      )
      
      // 4. Montar resultado final formatado
      const resultado = buildIndicadoresResult(rawData, epsCalculations, derivedMetrics)
      
      console.log(`🎉 Indicadores calculados com sucesso para ${symbol}`)
      console.log("🔍 Resultado final:", resultado)
      
      return resultado
      
    } catch (error) {
      console.error(`❌ Erro ao processar indicadores para ${symbol}:`, error)
      throw new Error(`Falha ao calcular indicadores financeiros para ${symbol}`)
    }
  }