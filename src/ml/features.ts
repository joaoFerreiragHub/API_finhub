// src/ml/features.ts - ML Feature Engineering

import { getSectorConfig } from '../utils/sectorConfig'

// ================================
// MAIN FEATURE CREATION FUNCTION
// ================================

export function createMLFeatures(data: {
  fundamentals: any,
  marketContext: any,
  sentiment: any,
  technical: any,
  earnings: any
}): any {
  
  const { fundamentals, marketContext, sentiment, technical, earnings } = data
  
  // Get sector configuration
  const sector = marketContext.sector || fundamentals.sector || 'Technology'
  const sectorConfig = getSectorConfig(sector)
  
  console.log(`🔧 Creating ML features for ${sector} sector`)
  
  // Create comprehensive feature set
  const features = {
    // === FUNDAMENTAL FEATURES ===
    ...createFundamentalFeatures(fundamentals, sectorConfig),
    
    // === TECHNICAL FEATURES ===
    ...createTechnicalFeatures(technical),
    
    // === SENTIMENT FEATURES ===
    ...createSentimentFeatures(sentiment),
    
    // === MARKET CONTEXT FEATURES ===
    ...createMarketContextFeatures(marketContext, sectorConfig),
    
    // === EARNINGS FEATURES ===
    ...createEarningsFeatures(earnings),
    
    // === SECTOR-SPECIFIC FEATURES ===
    ...createSectorSpecificFeatures(fundamentals, sectorConfig),
    
    // === COMPOSITE FEATURES ===
    ...createCompositeFeatures(fundamentals, technical, sentiment, sectorConfig),
    
    // === CONFIDENCE FACTORS ===
    confidenceFactors: calculateConfidenceFactors(fundamentals, sentiment, technical, earnings)
  }
  
  console.log(`✅ Created ${Object.keys(features).length} features for ML analysis`)
  
  return features
}

// ================================
// FUNDAMENTAL FEATURES
// ================================

function createFundamentalFeatures(fundamentals: any, sectorConfig: any): any {
  const income = fundamentals.income || []
  const ratios = fundamentals.ratios || []
  const cashFlow = fundamentals.cashFlow || []
  const growth = fundamentals.growth || []
  
  return {
    // Revenue metrics
    revenueGrowth: calculateGrowthRate(income, 'revenue', 4),
    revenueGrowthQoQ: calculateGrowthRate(income, 'revenue', 1),
    revenueConsistency: calculateConsistency(income, 'revenue', 8),
    
    // Profitability metrics
    marginTrend: calculateMarginTrend(income, 4),
    grossMarginTrend: calculateGrowthRate(ratios, 'grossProfitMargin', 4),
    operatingMarginTrend: calculateGrowthRate(ratios, 'operatingProfitMargin', 4),
    
    // Efficiency metrics
    roeTrend: calculateGrowthRate(ratios, 'returnOnEquity', 4),
    roaTrend: calculateGrowthRate(ratios, 'returnOnAssets', 4),
    assetTurnover: getLatestValue(ratios, 'assetTurnover'),
    
    // Financial health
    debtToEquity: getLatestValue(ratios, 'debtEquityRatio'),
    currentRatio: getLatestValue(ratios, 'currentRatio'),
    quickRatio: getLatestValue(ratios, 'quickRatio'),
    
    // Cash flow strength
    fcfGrowth: calculateGrowthRate(cashFlow, 'freeCashFlow', 4),
    fcfMargin: calculateFCFMargin(cashFlow, income),
    
    // Growth quality
    organicGrowthRate: estimateOrganicGrowth(growth, income),
    growthEfficiency: calculateGrowthEfficiency(income, cashFlow)
  }
}

// ================================
// TECHNICAL FEATURES
// ================================

function createTechnicalFeatures(technical: any): any {
  const prices = technical.prices?.historical || []
  const rsi = technical.rsi || []
  const sma50 = technical.sma50 || []
  const sma200 = technical.sma200 || []
  const volumeProfile = technical.volumeProfile
  const momentum = technical.momentumIndicators
  
  return {
    // Price momentum
    priceVsSMA: calculatePriceVsSMA(prices, sma50),
    priceVsSMA200: calculatePriceVsSMA(prices, sma200),
    smaConvergence: calculateSMAConvergence(sma50, sma200),
    
    // Technical indicators
    rsiScore: getLatestValue(rsi, 'rsi') || 50,
    rsiTrend: calculateRSITrend(rsi),
    
    // Volatility metrics
    volatility: momentum?.volatility || calculateVolatility(prices),
    volatilityTrend: calculateVolatilityTrend(prices),
    
    // Volume analysis
    volumeTrend: volumeProfile?.volumeTrend || 0,
    volumeSpikes: volumeProfile?.highVolumeSpikes || 0,
    avgVolume: volumeProfile?.avgVolume || 0,
    
    // Momentum indicators
    momentum5D: momentum?.momentum_5d || 0,
    momentum20D: momentum?.momentum_20d || 0,
    momentumDivergence: calculateMomentumDivergence(momentum)
  }
}

// ================================
// SENTIMENT FEATURES
// ================================

function createSentimentFeatures(sentiment: any): any {
  const analysts = sentiment.analysts || []
  const priceTargets = sentiment.priceTargets || []
  const upgrades = sentiment.upgrades || []
  const insider = sentiment.insider || []
  const social = sentiment.socialSentiment
  
  return {
    // Analyst sentiment
    analystSentiment: calculateAnalystSentiment(analysts, upgrades),
    analystConsensus: calculateAnalystConsensus(analysts),
    recentUpgrades: countRecentUpgrades(upgrades, 30),
    
    // Price target analysis
    priceTargetMomentum: calculatePriceTargetMomentum(priceTargets),
    priceTargetSpread: calculatePriceTargetSpread(priceTargets),
    avgPriceTarget: calculateAvgPriceTarget(priceTargets),
    
    // Insider activity
    insiderActivity: calculateInsiderActivity(insider, 90),
    insiderSentiment: calculateInsiderSentiment(insider),
    
    // Social sentiment
    socialBullishness: social?.sentimentScore || 0,
    socialMentions: social?.totalMentions || 0,
    socialSentimentTrend: social?.sentiment === 'Bullish' ? 1 : social?.sentiment === 'Bearish' ? -1 : 0
  }
}

// ================================
// MARKET CONTEXT FEATURES
// ================================

function createMarketContextFeatures(marketContext: any, sectorConfig: any): any {
  return {
    // Sector performance
    sectorMomentum: marketContext.sectorPerformance || 0,
    sectorPEDeviation: marketContext.sectorPEDeviation || 0,
    sectorPE: marketContext.sectorPE || sectorConfig.benchmarks.avgPE,
    
    // Economic context
    economicGrowth: marketContext.economicIndicators?.gdpGrowth || 2.1,
    unemployment: marketContext.economicIndicators?.unemployment || 3.7,
    inflation: marketContext.economicIndicators?.inflation || 3.2,
    
    // Peer comparison
    peersCount: marketContext.peers?.length || 0,
    
    // Seasonality
    seasonality: calculateSeasonality(new Date(), sectorConfig),
    
    // Macro sensitivity
    interestSensitivity: calculateInterestSensitivity(sectorConfig),
    macroSensitivity: sectorConfig.weights.macro * 10
  }
}

// ================================
// EARNINGS FEATURES
// ================================

function createEarningsFeatures(earnings: any): any {
  const surprises = earnings.surprises || []
  const calendar = earnings.calendar || []
  const estimates = earnings.futureEstimates || []
  
  return {
    // Earnings surprise history
    surpriseHistory: calculateSurprisePattern(surprises),
    surpriseConsistency: calculateSurpriseConsistency(surprises),
    beatRate: calculateBeatRate(surprises, 8),
    
    // Earnings quality
    earningsQuality: earnings.earningsQuality?.consistency || 0.5,
    earningsGrowth: calculateEarningsGrowth(surprises),
    
    // Forward estimates
    estimateRevisions: calculateEstimateRevisions(estimates),
    estimateDispersion: calculateEstimateDispersion(estimates),
    
    // Timing factors
    daysSinceEarnings: getDaysSinceLastEarnings(calendar),
    daysToEarnings: getDaysToNextEarnings(calendar)
  }
}

// ================================
// SECTOR-SPECIFIC FEATURES
// ================================

function createSectorSpecificFeatures(fundamentals: any, sectorConfig: any): any {
  const income = fundamentals.income || []
  const ratios = fundamentals.ratios || []
  
  // Create features based on sector's primary metrics
  const sectorFeatures: any = {}
  
  sectorConfig.keyMetrics.primary.forEach((metric: string) => {
    switch (metric) {
      case 'revenueGrowth':
        sectorFeatures.sectorRevenueGrowth = calculateGrowthRate(income, 'revenue', 4)
        break
      case 'marginTrend':
        sectorFeatures.sectorMarginTrend = calculateMarginTrend(income, 4)
        break
      case 'rAndDSpending':
        sectorFeatures.rAndDIntensity = calculateRnDIntensity(income)
        break
      case 'userGrowth':
        // Would need specific user metrics from earnings calls
        sectorFeatures.userGrowthProxy = calculateGrowthRate(income, 'revenue', 1) // Proxy
        break
      case 'netInterestMargin':
        sectorFeatures.netInterestMargin = getLatestValue(ratios, 'netProfitMargin')
        break
      case 'loanGrowth':
        // Banking specific - would need specific data
        sectorFeatures.loanGrowthProxy = calculateGrowthRate(income, 'totalOtherIncomeExpenseNet', 4)
        break
    }
  })
  
  return {
    ...sectorFeatures,
    sectorScore: calculateSectorScore(fundamentals, sectorConfig),
    sectorRank: calculateSectorRank(fundamentals, sectorConfig)
  }
}

// ================================
// COMPOSITE FEATURES
// ================================

function createCompositeFeatures(fundamentals: any, technical: any, sentiment: any, sectorConfig: any): any {
  const income = fundamentals.income || []
  const prices = technical.prices?.historical || []
  
  return {
    // Quality score
    qualityScore: calculateQualityScore(fundamentals, sectorConfig),
    
    // Momentum score
    momentumScore: calculateMomentumScore(technical, sentiment),
    
    // Value score
    valueScore: calculateValueScore(fundamentals, technical, sectorConfig),
    
    // Growth sustainability
    growthSustainability: calculateGrowthSustainability(fundamentals),
    
    // Financial strength
    financialStrength: calculateFinancialStrength(fundamentals),
    
    // Market position
    marketPosition: calculateMarketPosition(sentiment, fundamentals)
  }
}

// ================================
// HELPER CALCULATION FUNCTIONS
// ================================

function calculateGrowthRate(data: any[], field: string, periods: number): number {
  if (!data || data.length < periods + 1) return 0
  const current = data[0]?.[field] || 0
  const previous = data[periods]?.[field] || 0
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

function calculateConsistency(data: any[], field: string, periods: number): number {
  if (!data || data.length < periods) return 0
  const values = data.slice(0, periods).map(d => d[field] || 0)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  return mean === 0 ? 0 : 1 - (stdDev / Math.abs(mean))
}

function calculateMarginTrend(income: any[], periods: number): number {
  if (!income || income.length < periods + 1) return 0
  const currentMargin = (income[0]?.netIncome || 0) / (income[0]?.revenue || 1)
  const previousMargin = (income[periods]?.netIncome || 0) / (income[periods]?.revenue || 1)
  return (currentMargin - previousMargin) * 100
}

function getLatestValue(data: any[], field: string): number {
  return data?.[0]?.[field] || 0
}

function calculateFCFMargin(cashFlow: any[], income: any[]): number {
  const latestFCF = cashFlow?.[0]?.freeCashFlow || 0
  const latestRevenue = income?.[0]?.revenue || 1
  return (latestFCF / latestRevenue) * 100
}

function estimateOrganicGrowth(growth: any[], income: any[]): number {
  // Simplified organic growth estimation
  const totalGrowth = calculateGrowthRate(income, 'revenue', 4)
  const acquisitionImpact = growth?.[0]?.revenueGrowth ? 
    Math.max(0, totalGrowth - (growth[0].revenueGrowth * 100)) : 0
  return Math.max(0, totalGrowth - acquisitionImpact)
}

function calculateGrowthEfficiency(income: any[], cashFlow: any[]): number {
  const revenueGrowth = calculateGrowthRate(income, 'revenue', 4)
  const fcfGrowth = calculateGrowthRate(cashFlow, 'freeCashFlow', 4)
  if (revenueGrowth <= 0) return 0
  return fcfGrowth / revenueGrowth
}

function calculatePriceVsSMA(prices: any[], sma: any[]): number {
  const currentPrice = prices?.[0]?.close || 0
  const currentSMA = sma?.[0]?.sma || currentPrice
  if (currentSMA === 0) return 1
  return currentPrice / currentSMA
}

function calculateSMAConvergence(sma50: any[], sma200: any[]): number {
  const sma50Value = sma50?.[0]?.sma || 0
  const sma200Value = sma200?.[0]?.sma || 0
  if (sma200Value === 0) return 0
  return ((sma50Value - sma200Value) / sma200Value) * 100
}

function calculateRSITrend(rsi: any[]): number {
  if (!rsi || rsi.length < 5) return 0
  const recent = rsi.slice(0, 5).map(r => r.rsi || 50)
  const slope = (recent[0] - recent[4]) / 4
  return slope
}

function calculateVolatility(prices: any[]): number {
  if (!prices || prices.length < 20) return 0.2
  const returns = []
  for (let i = 1; i < Math.min(prices.length, 60); i++) {
    const ret = (prices[i-1].close - prices[i].close) / prices[i].close
    returns.push(ret)
  }
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
  return Math.sqrt(variance * 252) // Annualized
}

function calculateVolatilityTrend(prices: any[]): number {
  if (!prices || prices.length < 40) return 0
  const recentVol = calculateVolatilityForPeriod(prices.slice(0, 20))
  const olderVol = calculateVolatilityForPeriod(prices.slice(20, 40))
  if (olderVol === 0) return 0
  return ((recentVol - olderVol) / olderVol) * 100
}

function calculateVolatilityForPeriod(prices: any[]): number {
  if (!prices || prices.length < 2) return 0
  const returns = []
  for (let i = 1; i < prices.length; i++) {
    const ret = (prices[i-1].close - prices[i].close) / prices[i].close
    returns.push(ret)
  }
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
  return Math.sqrt(variance)
}

function calculateMomentumDivergence(momentum: any): number {
  if (!momentum) return 0
  const short = momentum.momentum_5d || 0
  const long = momentum.momentum_20d || 0
  return short - long
}

function calculateAnalystSentiment(analysts: any[], upgrades: any[]): number {
  const recentUpgrades = upgrades.filter(u => {
    const upgradeDate = new Date(u.publishedDate)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return upgradeDate > thirtyDaysAgo
  })
  
  let score = 0
  recentUpgrades.forEach(upgrade => {
    if (upgrade.newGrade?.toLowerCase().includes('buy') || 
        upgrade.newGrade?.toLowerCase().includes('strong buy')) {
      score += 2
    } else if (upgrade.newGrade?.toLowerCase().includes('hold')) {
      score += 0
    } else {
      score -= 1
    }
  })
  
  return score / Math.max(1, recentUpgrades.length)
}

function calculateAnalystConsensus(analysts: any[]): number {
  if (!analysts || analysts.length === 0) return 0
  const latest = analysts[0]
  const buy = latest?.analystRatingsbuy || 0
  const hold = latest?.analystRatingsHold || 0
  const sell = latest?.analystRatingsSell || 0
  const total = buy + hold + sell
  if (total === 0) return 0
  return ((buy * 2) + hold - sell) / total
}

function countRecentUpgrades(upgrades: any[], days: number): number {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return upgrades.filter(u => new Date(u.publishedDate) > cutoffDate).length
}

function calculatePriceTargetMomentum(priceTargets: any[]): number {
  if (!priceTargets || priceTargets.length < 2) return 0
  const recent = priceTargets.slice(0, 5).map(pt => pt.priceTarget).filter(pt => pt > 0)
  const older = priceTargets.slice(5, 10).map(pt => pt.priceTarget).filter(pt => pt > 0)
  
  if (recent.length === 0 || older.length === 0) return 0
  
  const recentAvg = recent.reduce((sum, pt) => sum + pt, 0) / recent.length
  const olderAvg = older.reduce((sum, pt) => sum + pt, 0) / older.length
  
  return ((recentAvg - olderAvg) / olderAvg) * 100
}

function calculatePriceTargetSpread(priceTargets: any[]): number {
  if (!priceTargets || priceTargets.length < 3) return 0
  const targets = priceTargets.map(pt => pt.priceTarget).filter(pt => pt > 0).slice(0, 10)
  if (targets.length < 3) return 0
  
  const max = Math.max(...targets)
  const min = Math.min(...targets)
  const avg = targets.reduce((sum, t) => sum + t, 0) / targets.length
  
  return ((max - min) / avg) * 100
}

function calculateAvgPriceTarget(priceTargets: any[]): number {
  if (!priceTargets || priceTargets.length === 0) return 0
  const recent = priceTargets.slice(0, 10).map(pt => pt.priceTarget).filter(pt => pt > 0)
  if (recent.length === 0) return 0
  return recent.reduce((sum, pt) => sum + pt, 0) / recent.length
}

function calculateInsiderActivity(insider: any[], days: number): number {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const recentTrades = insider.filter(trade => new Date(trade.transactionDate) > cutoffDate)
  
  let buyValue = 0
  let sellValue = 0
  
  recentTrades.forEach(trade => {
    const value = (trade.securitiesTransacted || 0) * (trade.price || 0)
    if (trade.transactionType?.toLowerCase().includes('p-purchase')) {
      buyValue += value
    } else if (trade.transactionType?.toLowerCase().includes('s-sale')) {
      sellValue += value
    }
  })
  
  const totalValue = buyValue + sellValue
  if (totalValue === 0) return 0
  
  return ((buyValue - sellValue) / totalValue) * 100
}

function calculateInsiderSentiment(insider: any[]): number {
  const recentTrades = insider.slice(0, 20)
  let score = 0
  
  recentTrades.forEach(trade => {
    if (trade.transactionType?.toLowerCase().includes('p-purchase')) {
      score += 1
    } else if (trade.transactionType?.toLowerCase().includes('s-sale')) {
      score -= 0.5 // Weight sales less as they can be for diversification
    }
  })
  
  return score / Math.max(1, recentTrades.length)
}

function calculateSeasonality(date: Date, sectorConfig: any): number {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  
  if (sectorConfig?.seasonality?.strongQuarters?.includes(quarter)) {
    return sectorConfig.seasonality.factor
  } else if (sectorConfig?.seasonality?.weakQuarters?.includes(quarter)) {
    return -sectorConfig.seasonality.factor * 0.5
  }
  
  return 0
}

function calculateInterestSensitivity(sectorConfig: any): number {
  // Based on sector characteristics
  const sensitivityMap: { [key: string]: number } = {
    'Financial Services': 9,
    'Real Estate': 8,
    'Utilities': 7,
    'Consumer Discretionary': 6,
    'Technology': 4,
    'Healthcare': 3,
    'Consumer Staples': 3,
    'Energy': 5,
    'Materials': 5,
    'Industrials': 6,
    'Communication Services': 4
  }
  
  return sensitivityMap[sectorConfig.name] || 5
}

function calculateSurprisePattern(surprises: any[]): number {
  if (!surprises || surprises.length === 0) return 0
  const recent = surprises.slice(0, 8)
  const surpriseValues = recent.map(s => (s.actualEarningResult || 0) - (s.estimatedEarning || 0))
  return surpriseValues.reduce((sum, s) => sum + s, 0) / surpriseValues.length
}

function calculateSurpriseConsistency(surprises: any[]): number {
  if (!surprises || surprises.length < 4) return 0.5
  const recent = surprises.slice(0, 8)
  const surpriseValues = recent.map(s => (s.actualEarningResult || 0) - (s.estimatedEarning || 0))
  const mean = surpriseValues.reduce((sum, s) => sum + s, 0) / surpriseValues.length
  const variance = surpriseValues.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / surpriseValues.length
  const stdDev = Math.sqrt(variance)
  return Math.max(0, 1 - stdDev)
}

function calculateBeatRate(surprises: any[], periods: number): number {
  if (!surprises || surprises.length === 0) return 0.5
  const recent = surprises.slice(0, periods)
  const beats = recent.filter(s => (s.actualEarningResult || 0) > (s.estimatedEarning || 0)).length
  return beats / recent.length
}

function calculateEarningsGrowth(surprises: any[]): number {
  if (!surprises || surprises.length < 8) return 0
  const current = surprises[0]?.actualEarningResult || 0
  const yearAgo = surprises[4]?.actualEarningResult || 0
  if (yearAgo === 0) return 0
  return ((current - yearAgo) / yearAgo) * 100
}

function calculateEstimateRevisions(estimates: any[]): number {
  // Simplified - would need historical estimate data
  return 0
}

function calculateEstimateDispersion(estimates: any[]): number {
  // Simplified - would need range of estimates
  return 0
}

function getDaysSinceLastEarnings(calendar: any[]): number {
  if (!calendar || calendar.length === 0) return 180
  const lastEarnings = calendar
    .filter(event => new Date(event.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  
  if (!lastEarnings) return 180
  
  const daysDiff = Math.floor((Date.now() - new Date(lastEarnings.date).getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff
}

function getDaysToNextEarnings(calendar: any[]): number {
  if (!calendar || calendar.length === 0) return 90
  const nextEarnings = calendar
    .filter(event => new Date(event.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
  
  if (!nextEarnings) return 90
  
  const daysDiff = Math.floor((new Date(nextEarnings.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return daysDiff
}

function calculateRnDIntensity(income: any[]): number {
  // Would need R&D data from income statement
  return 0 // Placeholder
}

function calculateSectorScore(fundamentals: any, sectorConfig: any): number {
  // Composite score based on sector key metrics
  let score = 50 // Base score
  
  const income = fundamentals.income || []
  const ratios = fundamentals.ratios || []
  
  // Weight based on sector importance
  const revenueGrowth = calculateGrowthRate(income, 'revenue', 4)
  const marginTrend = calculateMarginTrend(income, 4)
  const roeTrend = calculateGrowthRate(ratios, 'returnOnEquity', 4)
  
  score += (revenueGrowth / 2) * sectorConfig.weights.fundamental
  score += marginTrend * sectorConfig.weights.fundamental * 2
  score += (roeTrend / 3) * sectorConfig.weights.fundamental
  
  return Math.max(0, Math.min(100, score))
}

function calculateSectorRank(fundamentals: any, sectorConfig: any): number {
  // Simplified ranking - would compare against sector peers
  const sectorScore = calculateSectorScore(fundamentals, sectorConfig)
  
  if (sectorScore > 70) return 1 // Top quartile
  if (sectorScore > 55) return 2 // Second quartile
  if (sectorScore > 40) return 3 // Third quartile
  return 4 // Bottom quartile
}

function calculateQualityScore(fundamentals: any, sectorConfig: any): number {
  const ratios = fundamentals.ratios || []
  const income = fundamentals.income || []
  
  let score = 0
  
  // Profitability quality
  const currentMargin = (income[0]?.netIncome || 0) / (income[0]?.revenue || 1)
  const benchmarkMargin = sectorConfig.benchmarks.avgMargin
  score += Math.min(25, (currentMargin / benchmarkMargin) * 25)
  
  // Financial strength
  const currentRatio = getLatestValue(ratios, 'currentRatio')
  score += Math.min(25, currentRatio * 12.5)
  
  // Growth sustainability
  const revenueGrowth = calculateGrowthRate(income, 'revenue', 4)
  score += Math.min(25, (revenueGrowth / 20) * 25)
  
  // Return on equity
  const roe = getLatestValue(ratios, 'returnOnEquity')
  const benchmarkROE = sectorConfig.benchmarks.avgROE
  score += Math.min(25, (roe / benchmarkROE) * 25)
  
  return Math.max(0, Math.min(100, score))
}

function calculateMomentumScore(technical: any, sentiment: any): number {
  let score = 50
  
  // Technical momentum
  const rsi = technical.rsiScore || 50
  const priceVsSMA = technical.priceVsSMA || 1
  
  score += (rsi - 50) * 0.3
  score += (priceVsSMA - 1) * 100 * 0.5
  
  // Sentiment momentum
  const analystSentiment = sentiment.analystSentiment || 0
  score += analystSentiment * 10
  
  return Math.max(0, Math.min(100, score))
}

function calculateValueScore(fundamentals: any, technical: any, sectorConfig: any): number {
  const ratios = fundamentals.ratios || []
  const prices = technical.prices?.historical || []
  
  let score = 50
  
  // P/E ratio vs sector benchmark
  const currentPE = getLatestValue(ratios, 'priceEarningsRatio')
  const benchmarkPE = sectorConfig.benchmarks.avgPE
  if (currentPE > 0 && benchmarkPE > 0) {
    const peScore = Math.max(0, 100 - ((currentPE / benchmarkPE - 1) * 100))
    score += (peScore - 50) * 0.3
  }
  
  // Price-to-book ratio
  const pb = getLatestValue(ratios, 'priceToBookRatio')
  if (pb > 0) {
    const pbScore = Math.max(0, 100 - (pb * 20))
    score += (pbScore - 50) * 0.2
  }
  
  // Free cash flow yield
  const price = prices[0]?.close || 0
  const fcfMargin = calculateFCFMargin(fundamentals.cashFlow, fundamentals.income)
  if (price > 0 && fcfMargin > 0) {
    score += Math.min(25, fcfMargin * 2)
  }
  
  return Math.max(0, Math.min(100, score))
}

function calculateGrowthSustainability(fundamentals: any): number {
  const income = fundamentals.income || []
  const cashFlow = fundamentals.cashFlow || []
  
  let score = 50
  
  // Revenue growth consistency
  const consistency = calculateConsistency(income, 'revenue', 8)
  score += consistency * 30
  
  // Cash flow vs earnings quality
  const earningsGrowth = calculateGrowthRate(income, 'netIncome', 4)
  const fcfGrowth = calculateGrowthRate(cashFlow, 'freeCashFlow', 4)
  
  if (earningsGrowth > 0) {
    const qualityRatio = fcfGrowth / earningsGrowth
    score += Math.min(20, qualityRatio * 20)
  }
  
  return Math.max(0, Math.min(100, score))
}

function calculateFinancialStrength(fundamentals: any): number {
  const ratios = fundamentals.ratios || []
  const cashFlow = fundamentals.cashFlow || []
  
  let score = 0
  
  // Liquidity strength (25 points)
  const currentRatio = getLatestValue(ratios, 'currentRatio')
  score += Math.min(25, currentRatio * 12.5)
  
  // Debt management (25 points)
  const debtToEquity = getLatestValue(ratios, 'debtEquityRatio')
  score += Math.max(0, 25 - (debtToEquity * 5))
  
  // Profitability (25 points)
  const roe = getLatestValue(ratios, 'returnOnEquity')
  score += Math.min(25, roe * 100)
  
  // Cash generation (25 points)
  const fcfMargin = calculateFCFMargin(cashFlow, fundamentals.income)
  score += Math.min(25, fcfMargin)
  
  return Math.max(0, Math.min(100, score))
}

function calculateMarketPosition(sentiment: any, fundamentals: any): number {
  let score = 50
  
  // Analyst coverage and sentiment
  const analystSentiment = sentiment.analystSentiment || 0
  score += analystSentiment * 15
  
  // Price target momentum
  const ptMomentum = sentiment.priceTargetMomentum || 0
  score += ptMomentum * 0.3
  
  // Market share proxy (revenue growth vs sector)
  const revenueGrowth = calculateGrowthRate(fundamentals.income, 'revenue', 4)
  if (revenueGrowth > 10) score += 15
  else if (revenueGrowth > 5) score += 10
  else if (revenueGrowth < 0) score -= 15
  
  return Math.max(0, Math.min(100, score))
}

function calculateConfidenceFactors(fundamentals: any, sentiment: any, technical: any, earnings: any): any {
  let dataQuality = 0
  let sectorCoverage = 0.7 // Base coverage
  let historicalAccuracy = 0.75 // Base accuracy
  
  // Data quality assessment
  if (fundamentals.income?.length >= 8) dataQuality += 0.25
  if (sentiment.analysts?.length >= 5) dataQuality += 0.20
  if (technical.prices?.historical?.length >= 90) dataQuality += 0.25
  if (fundamentals.ratios?.length >= 8) dataQuality += 0.15
  if (earnings.surprises?.length >= 6) dataQuality += 0.15
  
  // Sector coverage (more coverage for well-analyzed sectors)
  const sector = fundamentals.sector || 'Technology'
  const coverageMap: { [key: string]: number } = {
    'Technology': 0.9,
    'Healthcare': 0.85,
    'Financial Services': 0.8,
    'Consumer Discretionary': 0.75,
    'Communication Services': 0.8,
    'Consumer Staples': 0.7,
    'Industrials': 0.7,
    'Energy': 0.65,
    'Materials': 0.65,
    'Utilities': 0.6,
    'Real Estate': 0.6
  }
  sectorCoverage = coverageMap[sector] || 0.7
  
  // Historical accuracy (sector-specific)
  const accuracyMap: { [key: string]: number } = {
    'Technology': 0.82,
    'Communication Services': 0.78,
    'Healthcare': 0.75,
    'Financial Services': 0.71,
    'Consumer Discretionary': 0.69,
    'Consumer Staples': 0.73,
    'Energy': 0.65,
    'Utilities': 0.76,
    'Real Estate': 0.68,
    'Materials': 0.67,
    'Industrials': 0.72
  }
  historicalAccuracy = accuracyMap[sector] || 0.75
  
  return {
    dataQuality: Math.min(1, dataQuality),
    sectorCoverage,
    historicalAccuracy
  }
}