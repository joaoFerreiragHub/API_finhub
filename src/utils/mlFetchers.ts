// src/data/fetchers.ts - FIXED VERSION - Pure Data Fetching Layer

import axios from 'axios'
import { getSectorConfig, calculateDynamicBenchmarks } from '../utils/sectorConfig'

const FMP = 'https://financialmodelingprep.com/api/v3'
const FMPv4 = 'https://financialmodelingprep.com/api/v4'
const API_KEY = process.env.FMP_API_KEY

const fetch = (url: string) => axios.get(url).then((res) => res.data)

// ================================
// CORE DATA FETCHERS
// ================================

export async function fetchFundamentals(symbol: string) {
  try {
    console.log(`📊 Fetching fundamentals for ${symbol}`)
    
    const [income, ratios, cashFlow, growth, profile] = await Promise.all([
      fetch(`${FMP}/income-statement/${symbol}?period=quarter&limit=12&apikey=${API_KEY}`),
      fetch(`${FMP}/ratios/${symbol}?period=quarter&limit=12&apikey=${API_KEY}`),
      fetch(`${FMP}/cash-flow-statement/${symbol}?period=quarter&limit=12&apikey=${API_KEY}`),
      fetch(`${FMP}/financial-growth/${symbol}?period=quarter&limit=8&apikey=${API_KEY}`),
      fetch(`${FMP}/profile/${symbol}?apikey=${API_KEY}`)
    ])

    // ✅ FIX: Extract sector consistently
    const sector = profile[0]?.sector || 'Technology'
    const sectorConfig = getSectorConfig(sector)

    console.log(`✅ Fundamentals fetched for ${symbol} (${sector})`)

    return { 
      income: income || [], 
      ratios: ratios || [], 
      cashFlow: cashFlow || [], 
      growth: growth || [], 
      profile: profile || [],
      // ✅ FIX: Consistent sector information
      sector,
      sectorConfig,
      // ✅ NEW: Additional metadata for debugging
      metadata: {
        dataQuality: calculateFundamentalsDataQuality(income, ratios, cashFlow),
        lastUpdate: new Date().toISOString(),
        quartersAvailable: income?.length || 0
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching fundamentals for ${symbol}:`, error)
    
    // Return safe defaults
    return {
      income: [],
      ratios: [],
      cashFlow: [],
      growth: [],
      profile: [],
      sector: 'Technology',
      sectorConfig: getSectorConfig('Technology'),
      metadata: {
        dataQuality: 0,
        lastUpdate: new Date().toISOString(),
        quartersAvailable: 0,
        error: 'Failed to fetch fundamentals data'
      }
    }
  }
}

export async function fetchMarketContext(symbol: string) {
  try {
    console.log(`🌍 Fetching market context for ${symbol}`)
    
    const [profile, peers, sectorPE, sectorPerf, economicData] = await Promise.all([
      fetch(`${FMP}/profile/${symbol}?apikey=${API_KEY}`),
      fetch(`${FMPv4}/stock_peers?symbol=${symbol}&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMPv4}/sector_price_earning_ratio?date=${new Date().toISOString().split('T')[0]}&exchange=NASDAQ&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMP}/sectors-performance?apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMPv4}/economic?name=GDP,UNEMPLOYMENT,INFLATION&apikey=${API_KEY}`).catch(() => [])
    ])

    // ✅ FIX: Extract sector consistently
    const sector = profile[0]?.sector || 'Technology'
    const sectorConfig = getSectorConfig(sector)
    
    // Dynamic sector analysis
    const sectorData = Array.isArray(sectorPE) ? sectorPE.find((s: any) => s.sector === sector) : null
    const sectorPerformanceData = Array.isArray(sectorPerf) ? sectorPerf.find((s: any) => s.sector === sector) : null
    
    // Calculate if sector is over/under valued vs benchmarks
    const currentSectorPE = sectorData?.pe || sectorConfig.benchmarks.avgPE
    const peDeviation = ((currentSectorPE - sectorConfig.benchmarks.avgPE) / sectorConfig.benchmarks.avgPE) * 100

    // ✅ FIX: Get peers list safely
    const peersList = peers?.[0]?.peersList || peers?.peersList || []
    const safePeersList = Array.isArray(peersList) ? peersList.slice(0, 5) : []

    console.log(`✅ Market context fetched for ${symbol} (${sector}) with ${safePeersList.length} peers`)

    return {
      // ✅ FIX: Consistent sector information (same as fundamentals)
      sector,
      sectorConfig,
      
      // Sector valuation metrics
      sectorPE: currentSectorPE,
      sectorPEDeviation: Number(peDeviation.toFixed(1)),
      sectorPerformance: sectorPerformanceData?.changesPercentage || 0,
      
      // Peer information
      peers: safePeersList,
      peerCount: safePeersList.length,
      
      // Economic context
      economicIndicators: parseEconomicData(economicData),
      
      // Dynamic benchmarks
      benchmarks: await calculateDynamicBenchmarks(sector, safePeersList),
      
      // ✅ NEW: Additional market context
      marketData: {
        sectorAvailable: !!sectorData,
        performanceAvailable: !!sectorPerformanceData,
        economicDataAvailable: Array.isArray(economicData) && economicData.length > 0
      },
      
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: calculateMarketDataQuality(sectorData, sectorPerformanceData, economicData)
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching market context for ${symbol}:`, error)
    
    // Return safe defaults
    const sector = 'Technology'
    const sectorConfig = getSectorConfig(sector)
    
    return {
      sector,
      sectorConfig,
      sectorPE: sectorConfig.benchmarks.avgPE,
      sectorPEDeviation: 0,
      sectorPerformance: 0,
      peers: [],
      peerCount: 0,
      economicIndicators: getDefaultEconomicData(),
      benchmarks: sectorConfig.benchmarks,
      marketData: {
        sectorAvailable: false,
        performanceAvailable: false,
        economicDataAvailable: false
      },
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: 0,
        error: 'Failed to fetch market context data'
      }
    }
  }
}

export async function fetchSentimentData(symbol: string) {
  try {
    console.log(`😊 Fetching sentiment data for ${symbol}`)
    
    const [analysts, priceTargets, upgrades, insider, socialSentiment] = await Promise.all([
      fetch(`${FMP}/analyst-stock-recommendations/${symbol}?apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMPv4}/price-target?symbol=${symbol}&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMPv4}/upgrades-downgrades?symbol=${symbol}&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMPv4}/insider-trading?symbol=${symbol}&page=0&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMPv4}/social-sentiments/trending?type=bullish&source=stocktwits&apikey=${API_KEY}`).catch(() => [])
    ])

    console.log(`✅ Sentiment data fetched for ${symbol}`)

    return { 
      analysts: Array.isArray(analysts) ? analysts : [], 
      priceTargets: Array.isArray(priceTargets) ? priceTargets : [], 
      upgrades: Array.isArray(upgrades) ? upgrades : [], 
      insider: Array.isArray(insider) ? insider : [],
      socialSentiment: processSocialSentiment(socialSentiment, symbol),
      
      // ✅ NEW: Sentiment metrics summary
      sentimentSummary: {
        analystCount: Array.isArray(analysts) ? analysts.length : 0,
        priceTargetCount: Array.isArray(priceTargets) ? priceTargets.length : 0,
        recentUpgrades: Array.isArray(upgrades) ? countRecentActivity(upgrades, 30, 'upgrade') : 0,
        recentDowngrades: Array.isArray(upgrades) ? countRecentActivity(upgrades, 30, 'downgrade') : 0,
        insiderTransactions: Array.isArray(insider) ? insider.length : 0
      },
      
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: calculateSentimentDataQuality(analysts, priceTargets, upgrades, insider)
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching sentiment data for ${symbol}:`, error)
    
    return { 
      analysts: [], 
      priceTargets: [], 
      upgrades: [], 
      insider: [],
      socialSentiment: null,
      sentimentSummary: {
        analystCount: 0,
        priceTargetCount: 0,
        recentUpgrades: 0,
        recentDowngrades: 0,
        insiderTransactions: 0
      },
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: 0,
        error: 'Failed to fetch sentiment data'
      }
    }
  }
}

export async function fetchTechnicalData(symbol: string) {
  try {
    console.log(`📈 Fetching technical data for ${symbol}`)
    
    const [prices, rsi, sma50, sma200, volume] = await Promise.all([
      fetch(`${FMP}/historical-price-full/${symbol}?from=${getDateMonthsAgo(6)}&to=${new Date().toISOString().split('T')[0]}&apikey=${API_KEY}`),
      fetch(`${FMP}/technical_indicator/1day/${symbol}?type=rsi&period=14&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMP}/technical_indicator/1day/${symbol}?type=sma&period=50&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMP}/technical_indicator/1day/${symbol}?type=sma&period=200&apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMP}/historical-price-full/${symbol}?from=${getDateMonthsAgo(3)}&to=${new Date().toISOString().split('T')[0]}&apikey=${API_KEY}`)
    ])

    // ✅ FIX: Extract historical data safely
    const priceHistory = prices?.historical || []
    const volumeHistory = volume?.historical || []

    console.log(`✅ Technical data fetched for ${symbol} (${priceHistory.length} price points)`)

    return { 
      prices: prices || { historical: [] }, 
      rsi: Array.isArray(rsi) ? rsi : [], 
      sma50: Array.isArray(sma50) ? sma50 : [], 
      sma200: Array.isArray(sma200) ? sma200 : [],
      volume: volume || { historical: [] },
      
      // ✅ FIX: Calculate profiles safely
      volumeProfile: calculateVolumeProfile(volumeHistory),
      momentumIndicators: calculateMomentumIndicators(priceHistory),
      
      // ✅ NEW: Technical summary
      technicalSummary: {
        priceDataPoints: priceHistory.length,
        currentPrice: priceHistory[0]?.close || 0,
        dayRange: priceHistory.length > 0 ? {
          high: priceHistory[0]?.high || 0,
          low: priceHistory[0]?.low || 0
        } : { high: 0, low: 0 },
        volume: priceHistory[0]?.volume || 0,
        rsiValue: Array.isArray(rsi) && rsi.length > 0 ? rsi[0]?.rsi : null,
        sma50Value: Array.isArray(sma50) && sma50.length > 0 ? sma50[0]?.sma : null,
        sma200Value: Array.isArray(sma200) && sma200.length > 0 ? sma200[0]?.sma : null
      },
      
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: calculateTechnicalDataQuality(priceHistory, rsi, sma50, sma200),
        periodsAvailable: priceHistory.length
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching technical data for ${symbol}:`, error)
    
    return {
      prices: { historical: [] },
      rsi: [],
      sma50: [],
      sma200: [],
      volume: { historical: [] },
      volumeProfile: null,
      momentumIndicators: null,
      technicalSummary: {
        priceDataPoints: 0,
        currentPrice: 0,
        dayRange: { high: 0, low: 0 },
        volume: 0,
        rsiValue: null,
        sma50Value: null,
        sma200Value: null
      },
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: 0,
        periodsAvailable: 0,
        error: 'Failed to fetch technical data'
      }
    }
  }
}

export async function fetchEarningsHistory(symbol: string) {
  try {
    console.log(`💰 Fetching earnings history for ${symbol}`)
    
    const [surprises, calendar, estimates] = await Promise.all([
      fetch(`${FMP}/earnings-surprises/${symbol}?apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMP}/historical/earning_calendar/${symbol}?apikey=${API_KEY}`).catch(() => []),
      fetch(`${FMP}/analyst-estimates/${symbol}?apikey=${API_KEY}`).catch(() => [])
    ])

    console.log(`✅ Earnings history fetched for ${symbol}`)

    return { 
      surprises: Array.isArray(surprises) ? surprises : [], 
      calendar: Array.isArray(calendar) ? calendar : [],
      futureEstimates: Array.isArray(estimates) ? estimates : [],
      earningsQuality: calculateEarningsQuality(surprises),
      
      // ✅ NEW: Earnings summary
      earningsSummary: {
        surprisesCount: Array.isArray(surprises) ? surprises.length : 0,
        calendarEvents: Array.isArray(calendar) ? calendar.length : 0,
        futureEstimatesCount: Array.isArray(estimates) ? estimates.length : 0,
        lastEarningsDate: getLastEarningsDate(calendar),
        nextEarningsDate: getNextEarningsDate(calendar),
        avgSurprise: calculateAverageSurprise(surprises, 4) // Last 4 quarters
      },
      
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: calculateEarningsDataQuality(surprises, calendar, estimates)
      }
    }
  } catch (error) {
    console.error(`❌ Error fetching earnings history for ${symbol}:`, error)
    
    return {
      surprises: [],
      calendar: [],
      futureEstimates: [],
      earningsQuality: null,
      earningsSummary: {
        surprisesCount: 0,
        calendarEvents: 0,
        futureEstimatesCount: 0,
        lastEarningsDate: null,
        nextEarningsDate: null,
        avgSurprise: 0
      },
      metadata: {
        lastUpdate: new Date().toISOString(),
        dataQuality: 0,
        error: 'Failed to fetch earnings data'
      }
    }
  }
}

// ================================
// HELPER FUNCTIONS FOR FETCHERS
// ================================

function parseEconomicData(data: any[]): any {
  if (!Array.isArray(data)) {
    return getDefaultEconomicData()
  }

  return {
    gdpGrowth: data.find(d => d.name === 'GDP')?.value || 2.1,
    unemployment: data.find(d => d.name === 'UNEMPLOYMENT')?.value || 3.7,
    inflation: data.find(d => d.name === 'INFLATION')?.value || 3.2,
    lastUpdate: new Date().toISOString(),
    dataAvailable: data.length > 0
  }
}

function getDefaultEconomicData(): any {
  return {
    gdpGrowth: 2.1,
    unemployment: 3.7,
    inflation: 3.2,
    lastUpdate: new Date().toISOString(),
    dataAvailable: false
  }
}

function processSocialSentiment(data: any[], symbol: string): any {
  if (!Array.isArray(data)) return null
  
  const symbolData = data.find(d => d.symbol === symbol)
  return symbolData ? {
    bullishScore: symbolData.bullish || 0,
    bearishScore: symbolData.bearish || 0,
    totalMentions: symbolData.totalMentions || 0,
    sentiment: symbolData.bullish > symbolData.bearish ? 'Bullish' : 'Bearish',
    sentimentScore: symbolData.bullish + symbolData.bearish > 0 ? 
      ((symbolData.bullish - symbolData.bearish) / (symbolData.bullish + symbolData.bearish)) * 100 : 0,
    confidence: Math.min(symbolData.totalMentions / 100, 1) // Scale mentions to confidence
  } : null
}

function getDateMonthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString().split('T')[0]
}

function calculateVolumeProfile(historicalData: any[]): any {
  if (!historicalData || historicalData.length === 0) return null
  
  const volumes = historicalData.map(d => d.volume).filter(v => v > 0)
  if (volumes.length === 0) return null
  
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  const recentVolume = volumes.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(10, volumes.length)
  
  return {
    avgVolume: Math.round(avgVolume),
    recentVolume: Math.round(recentVolume),
    volumeTrend: avgVolume > 0 ? ((recentVolume - avgVolume) / avgVolume) * 100 : 0,
    highVolumeSpikes: volumes.filter(v => v > avgVolume * 1.5).length,
    volumeConsistency: calculateVolumeConsistency(volumes)
  }
}

function calculateMomentumIndicators(historicalData: any[]): any {
  if (!historicalData || historicalData.length < 20) return null
  
  const prices = historicalData.map(d => d.close).filter(p => p > 0)
  if (prices.length < 20) return null
  
  const returns = []
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i-1] - prices[i]) / prices[i])
  }
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
  
  return {
    momentum_5d: prices.length > 5 ? ((prices[0] - prices[4]) / prices[4]) * 100 : 0,
    momentum_20d: prices.length > 20 ? ((prices[0] - prices[19]) / prices[19]) * 100 : 0,
    avgReturn: Number((avgReturn * 100).toFixed(2)),
    volatility: Number(Math.sqrt(variance).toFixed(4)),
    priceRange: {
      high: Math.max(...prices.slice(0, 20)),
      low: Math.min(...prices.slice(0, 20))
    }
  }
}

function calculateEarningsQuality(surprises: any[]): any {
  if (!surprises || surprises.length === 0) return null
  
  const recentSurprises = surprises.slice(0, 8)
  const validSurprises = recentSurprises.filter(s => 
    s.actualEarningResult !== null && s.estimatedEarning !== null
  )
  
  if (validSurprises.length === 0) return null
  
  const beatRate = validSurprises.filter(s => s.actualEarningResult > s.estimatedEarning).length / validSurprises.length
  const avgSurprise = validSurprises.reduce((sum, s) => sum + (s.actualEarningResult - s.estimatedEarning), 0) / validSurprises.length
  
  // Calculate consistency
  const surpriseValues = validSurprises.map(s => s.actualEarningResult - s.estimatedEarning)
  const avgSurpriseValue = surpriseValues.reduce((sum, val) => sum + val, 0) / surpriseValues.length
  const variance = surpriseValues.reduce((sum, val) => sum + Math.pow(val - avgSurpriseValue, 2), 0) / surpriseValues.length
  const consistency = Math.max(0, 1 - Math.sqrt(variance))
  
  return {
    beatRate: Number(beatRate.toFixed(2)),
    avgSurprise: Number(avgSurprise.toFixed(2)),
    consistency: Number(consistency.toFixed(2)),
    samplesUsed: validSurprises.length,
    qualityScore: Number(((beatRate * 0.4 + consistency * 0.6) * 100).toFixed(0))
  }
}

// ================================
// DATA QUALITY CALCULATION FUNCTIONS
// ================================

function calculateFundamentalsDataQuality(income: any[], ratios: any[], cashFlow: any[]): number {
  let score = 0
  
  if (income && income.length >= 8) score += 0.4
  else if (income && income.length >= 4) score += 0.2
  
  if (ratios && ratios.length >= 8) score += 0.3
  else if (ratios && ratios.length >= 4) score += 0.15
  
  if (cashFlow && cashFlow.length >= 8) score += 0.3
  else if (cashFlow && cashFlow.length >= 4) score += 0.15
  
  return Number(score.toFixed(2))
}

function calculateMarketDataQuality(sectorData: any, performanceData: any, economicData: any): number {
  let score = 0
  
  if (sectorData) score += 0.4
  if (performanceData) score += 0.3
  if (economicData && Array.isArray(economicData) && economicData.length > 0) score += 0.3
  
  return Number(score.toFixed(2))
}

function calculateSentimentDataQuality(analysts: any[], priceTargets: any[], upgrades: any[], insider: any[]): number {
  let score = 0
  
  if (analysts && analysts.length >= 5) score += 0.3
  else if (analysts && analysts.length >= 1) score += 0.15
  
  if (priceTargets && priceTargets.length >= 3) score += 0.25
  else if (priceTargets && priceTargets.length >= 1) score += 0.125
  
  if (upgrades && upgrades.length >= 5) score += 0.25
  else if (upgrades && upgrades.length >= 1) score += 0.125
  
  if (insider && insider.length >= 1) score += 0.2
  
  return Number(score.toFixed(2))
}

function calculateTechnicalDataQuality(prices: any[], rsi: any[], sma50: any[], sma200: any[]): number {
  let score = 0
  
  if (prices && prices.length >= 90) score += 0.4
  else if (prices && prices.length >= 30) score += 0.2
  else if (prices && prices.length >= 10) score += 0.1
  
  if (rsi && rsi.length >= 14) score += 0.2
  else if (rsi && rsi.length >= 1) score += 0.1
  
  if (sma50 && sma50.length >= 50) score += 0.2
  else if (sma50 && sma50.length >= 1) score += 0.1
  
  if (sma200 && sma200.length >= 200) score += 0.2
  else if (sma200 && sma200.length >= 1) score += 0.1
  
  return Number(score.toFixed(2))
}

function calculateEarningsDataQuality(surprises: any[], calendar: any[], estimates: any[]): number {
  let score = 0
  
  if (surprises && surprises.length >= 8) score += 0.4
  else if (surprises && surprises.length >= 4) score += 0.2
  else if (surprises && surprises.length >= 1) score += 0.1
  
  if (calendar && calendar.length >= 4) score += 0.3
  else if (calendar && calendar.length >= 1) score += 0.15
  
  if (estimates && estimates.length >= 1) score += 0.3
  
  return Number(score.toFixed(2))
}

// ================================
// ADDITIONAL UTILITY FUNCTIONS
// ================================

function countRecentActivity(upgrades: any[], days: number, type: 'upgrade' | 'downgrade'): number {
  if (!Array.isArray(upgrades)) return 0
  
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  return upgrades.filter(u => {
    const upgradeDate = new Date(u.publishedDate || u.date)
    if (upgradeDate <= cutoffDate) return false
    
    const gradeChange = u.newGrade?.toLowerCase() || ''
    
    if (type === 'upgrade') {
      return gradeChange.includes('buy') || gradeChange.includes('strong buy') || 
             gradeChange.includes('outperform') || gradeChange.includes('positive')
    } else {
      return gradeChange.includes('sell') || gradeChange.includes('underperform') || 
             gradeChange.includes('negative') || gradeChange.includes('reduce')
    }
  }).length
}

function calculateVolumeConsistency(volumes: number[]): number {
  if (volumes.length < 5) return 0
  
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  const deviations = volumes.map(v => Math.abs(v - avgVolume) / avgVolume)
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length
  
  return Number((1 - avgDeviation).toFixed(2))
}

function getLastEarningsDate(calendar: any[]): string | null {
  if (!Array.isArray(calendar) || calendar.length === 0) return null
  
  const pastEarnings = calendar
    .filter(event => new Date(event.date) <= new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  return pastEarnings[0]?.date || null
}

function getNextEarningsDate(calendar: any[]): string | null {
  if (!Array.isArray(calendar) || calendar.length === 0) return null
  
  const futureEarnings = calendar
    .filter(event => new Date(event.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  return futureEarnings[0]?.date || null
}

function calculateAverageSurprise(surprises: any[], periods: number): number {
  if (!Array.isArray(surprises) || surprises.length === 0) return 0
  
  const recent = surprises.slice(0, periods)
  const validSurprises = recent.filter(s => 
    s.actualEarningResult !== null && s.estimatedEarning !== null
  )
  
  if (validSurprises.length === 0) return 0
  
  const totalSurprise = validSurprises.reduce((sum, s) => 
    sum + (s.actualEarningResult - s.estimatedEarning), 0
  )
  
  return Number((totalSurprise / validSurprises.length).toFixed(2))
}