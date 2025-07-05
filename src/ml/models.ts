// src/ml/models.ts - ML Prediction Models

import { getSectorConfig } from '../utils/sectorConfig'

// ================================
// EARNINGS SURPRISE PREDICTION
// ================================

export function predictEarningsSurprise(features: any): any {
  const sectorConfig = features.sectorConfig || getSectorConfig('Technology')
  
  console.log('🎯 Predicting earnings surprise...')
  
  // Base prediction using fundamental indicators
  let prediction = 0
  let confidence = 50
  const drivers = []
  
  // === FUNDAMENTAL SIGNALS ===
  
  // Revenue growth impact (weighted by sector)
  const revenueWeight = sectorConfig.weights.fundamental * 0.4
  if (features.revenueGrowth > 15) {
    prediction += 3.5 * revenueWeight
    drivers.push('Strong revenue acceleration')
    confidence += 15
  } else if (features.revenueGrowth > 8) {
    prediction += 2.0 * revenueWeight
    drivers.push('Solid revenue growth')
    confidence += 10
  } else if (features.revenueGrowth < -5) {
    prediction -= 2.5 * revenueWeight
    drivers.push('Revenue decline concern')
    confidence += 10
  }
  
  // Margin trend impact
  if (features.marginTrend > 1.5) {
    prediction += 2.2 * revenueWeight
    drivers.push('Expanding profit margins')
    confidence += 12
  } else if (features.marginTrend < -1.5) {
    prediction -= 1.8 * revenueWeight
    drivers.push('Margin compression')
    confidence += 8
  }
  
  // === HISTORICAL EARNINGS PATTERNS ===
  
  // Surprise history trend
  if (features.surpriseHistory > 0.5) {
    prediction += 1.5
    drivers.push('Consistent beat history')
    confidence += 10
  } else if (features.surpriseHistory < -0.3) {
    prediction -= 1.2
    drivers.push('History of missing estimates')
    confidence += 8
  }
  
  // Beat rate influence
  if (features.beatRate > 0.75) {
    prediction += 1.0
    confidence += 8
  } else if (features.beatRate < 0.4) {
    prediction -= 0.8
    confidence += 5
  }
  
  // === SENTIMENT SIGNALS ===
  
  const sentimentWeight = sectorConfig.weights.sentiment
  
  // Analyst sentiment
  if (features.analystSentiment > 1.0) {
    prediction += 1.8 * sentimentWeight
    drivers.push('Strong analyst upgrades')
    confidence += 12
  } else if (features.analystSentiment < -1.0) {
    prediction -= 1.5 * sentimentWeight
    drivers.push('Analyst downgrades')
    confidence += 10
  }
  
  // Price target momentum
  if (features.priceTargetMomentum > 10) {
    prediction += 1.2 * sentimentWeight
    drivers.push('Rising price targets')
    confidence += 8
  } else if (features.priceTargetMomentum < -10) {
    prediction -= 1.0 * sentimentWeight
    drivers.push('Falling price targets')
    confidence += 6
  }
  
  // === TECHNICAL MOMENTUM ===
  
  const technicalWeight = sectorConfig.weights.technical
  
  // Stock momentum before earnings
  if (features.priceVsSMA > 1.1) {
    prediction += 0.8 * technicalWeight
    drivers.push('Strong technical momentum')
    confidence += 6
  } else if (features.priceVsSMA < 0.95) {
    prediction -= 0.6 * technicalWeight
    confidence += 4
  }
  
  // === SECTOR-SPECIFIC ADJUSTMENTS ===
  
  // Seasonality adjustment
  if (features.seasonality > 0) {
    prediction += features.seasonality * 0.5
    drivers.push(`Favorable ${sectorConfig.name} seasonality`)
    confidence += 5
  } else if (features.seasonality < 0) {
    prediction += features.seasonality * 0.3
    confidence += 3
  }
  
  // Sector momentum
  if (features.sectorMomentum > 8) {
    prediction += 1.0
    drivers.push('Strong sector performance')
    confidence += 8
  } else if (features.sectorMomentum < -8) {
    prediction -= 0.8
    drivers.push('Weak sector performance')
    confidence += 6
  }
  
  // === MACRO ENVIRONMENT ===
  
  const macroWeight = sectorConfig.weights.macro
  
  // Interest rate sensitivity (for rate-sensitive sectors)
  if (features.interestSensitivity > 7 && features.macroSensitivity > 0.2) {
    // Adjust based on current rate environment
    prediction -= 0.5 * macroWeight
    confidence += 3
  }
  
  // === QUALITY ADJUSTMENTS ===
  
  // Earnings quality
  if (features.earningsQuality > 0.8) {
    prediction += 0.5
    confidence += 5
  } else if (features.earningsQuality < 0.4) {
    prediction -= 0.3
    confidence += 3
  }
  
  // === FINAL ADJUSTMENTS ===
  
  // Confidence adjustments based on data quality
  confidence *= features.confidenceFactors?.dataQuality || 0.8
  confidence *= features.confidenceFactors?.sectorCoverage || 0.8
  confidence = Math.min(95, Math.max(30, confidence))
  
  // Clamp prediction to reasonable range
  prediction = Math.max(-15, Math.min(20, prediction))
  
  return {
    prediction: Number(prediction.toFixed(1)),
    confidence: Math.round(confidence),
    drivers: drivers.slice(0, 4), // Top 4 drivers
    methodology: 'Ensemble model combining fundamental, technical, and sentiment signals',
    sectorAdjusted: true,
    lastUpdate: new Date().toISOString()
  }
}

// ================================
// PRICE TARGET PREDICTION
// ================================

export function predictPriceTarget(features: any, currentPrice: number): any {
  const sectorConfig = features.sectorConfig || getSectorConfig('Technology')
  
  console.log('📈 Predicting price targets...')
  
  let targetMultiplier = 1.0
  let confidence = 60
  const drivers = []
  
  // === FUNDAMENTAL VALUATION ===
  
  const fundamentalWeight = sectorConfig.weights.fundamental
  
  // Growth-based target adjustment
  const normalizedGrowth = features.revenueGrowth / 100
  if (normalizedGrowth > 0.15) {
    targetMultiplier += 0.12 * fundamentalWeight
    drivers.push('High growth trajectory')
    confidence += 15
  } else if (normalizedGrowth > 0.08) {
    targetMultiplier += 0.06 * fundamentalWeight
    drivers.push('Solid growth profile')
    confidence += 10
  } else if (normalizedGrowth < -0.05) {
    targetMultiplier -= 0.08 * fundamentalWeight
    drivers.push('Declining fundamentals')
    confidence += 8
  }
  
  // Profitability trend
  if (features.marginTrend > 2) {
    targetMultiplier += 0.08 * fundamentalWeight
    drivers.push('Improving profitability')
    confidence += 12
  } else if (features.marginTrend < -2) {
    targetMultiplier -= 0.06 * fundamentalWeight
    drivers.push('Margin pressure')
    confidence += 10
  }
  
  // Quality score impact
  if (features.qualityScore > 75) {
    targetMultiplier += 0.05
    drivers.push('High quality business')
    confidence += 8
  } else if (features.qualityScore < 40) {
    targetMultiplier -= 0.04
    confidence += 5
  }
  
  // === SECTOR VALUATION ===
  
  // Sector PE deviation impact
  const sectorPEDeviation = features.sectorPEDeviation || 0
  if (sectorPEDeviation > 15) {
    targetMultiplier -= 0.04 // Sector overvalued
    drivers.push('Sector valuation concerns')
  } else if (sectorPEDeviation < -15) {
    targetMultiplier += 0.06 // Sector undervalued
    drivers.push('Attractive sector valuation')
    confidence += 8
  }
  
  // Sector momentum
  const sectorMomentumImpact = (features.sectorMomentum || 0) / 100
  targetMultiplier += sectorMomentumImpact * 0.3
  
  // === SENTIMENT DRIVERS ===
  
  const sentimentWeight = sectorConfig.weights.sentiment
  
  // Analyst sentiment
  if (features.analystSentiment > 1) {
    targetMultiplier += 0.06 * sentimentWeight
    drivers.push('Positive analyst sentiment')
    confidence += 10
  } else if (features.analystSentiment < -1) {
    targetMultiplier -= 0.05 * sentimentWeight
    drivers.push('Negative analyst sentiment')
    confidence += 8
  }
  
  // Price target momentum
  if (features.priceTargetMomentum > 5) {
    targetMultiplier += 0.04 * sentimentWeight
    drivers.push('Rising analyst targets')
    confidence += 8
  } else if (features.priceTargetMomentum < -5) {
    targetMultiplier -= 0.03 * sentimentWeight
    confidence += 6
  }
  
  // === TECHNICAL ANALYSIS ===
  
  const technicalWeight = sectorConfig.weights.technical
  
  // Momentum indicators
  if (features.momentumScore > 70) {
    targetMultiplier += 0.05 * technicalWeight
    drivers.push('Strong technical momentum')
    confidence += 8
  } else if (features.momentumScore < 30) {
    targetMultiplier -= 0.04 * technicalWeight
    confidence += 6
  }
  
  // Volatility adjustment
  if (features.volatility > 0.4) {
    targetMultiplier -= 0.02 // High vol = lower confidence
    confidence -= 5
  } else if (features.volatility < 0.15) {
    confidence += 5 // Low vol = higher confidence
  }
  
  // === RISK ADJUSTMENTS ===
  
  // Financial strength
  if (features.financialStrength > 80) {
    targetMultiplier += 0.03
    confidence += 5
  } else if (features.financialStrength < 40) {
    targetMultiplier -= 0.04
    confidence += 3
  }
  
  // === CALCULATE TARGETS ===
  
  // 3-month target
  const target3M = currentPrice * targetMultiplier
  const upside = ((target3M - currentPrice) / currentPrice) * 100
  
  // Target range (±10% around base target)
  const rangeWidth = Math.abs(upside) * 0.15 + 5 // Min 5% range
  const targetLow = target3M * (1 - rangeWidth / 100)
  const targetHigh = target3M * (1 + rangeWidth / 100)
  
  // Confidence adjustments
  confidence *= features.confidenceFactors?.dataQuality || 0.8
  confidence *= features.confidenceFactors?.historicalAccuracy || 0.8
  confidence = Math.min(90, Math.max(35, confidence))
  
  return {
    current: Number(currentPrice.toFixed(2)),
    target3M: Number(target3M.toFixed(2)),
    upside: Number(upside.toFixed(1)),
    confidence: Math.round(confidence),
    range: {
      low: Number(targetLow.toFixed(2)),
      high: Number(targetHigh.toFixed(2))
    },
    drivers: drivers.slice(0, 4),
    methodology: 'Multi-factor valuation model with sector adjustments',
    timeHorizon: '3 months',
    lastUpdate: new Date().toISOString()
  }
}

// ================================
// ENSEMBLE PREDICTION MODEL
// ================================

export function ensemblePrediction(features: any, currentPrice: number): any {
  console.log('🤖 Running ensemble prediction model...')
  
  // Individual model predictions
  const earningsModel = predictEarningsSurprise(features)
  const priceTargetModel = predictPriceTarget(features, currentPrice)
  
  // Model weights based on sector and data quality
  const sectorConfig = features.sectorConfig || getSectorConfig('Technology')
  const dataQuality = features.confidenceFactors?.dataQuality || 0.8
  
  // Dynamic model weighting
  const earningsWeight = 0.4 + (sectorConfig.weights.fundamental * 0.2)
  const priceTargetWeight = 0.6 - (sectorConfig.weights.fundamental * 0.2)
  
  // Combined confidence score
  const combinedConfidence = (
    earningsModel.confidence * earningsWeight + 
    priceTargetModel.confidence * priceTargetWeight
  ) * dataQuality
  
  // Risk-adjusted predictions
  const riskAdjustment = calculateRiskAdjustment(features)
  
  return {
    earnings: {
      prediction: earningsModel.prediction,
      confidence: earningsModel.confidence,
      drivers: earningsModel.drivers,
      riskAdjusted: earningsModel.prediction * riskAdjustment.earnings
    },
    priceTarget: {
      current: priceTargetModel.current,
      target3M: priceTargetModel.target3M,
      upside: priceTargetModel.upside,
      confidence: priceTargetModel.confidence,
      range: priceTargetModel.range,
      drivers: priceTargetModel.drivers,
      riskAdjusted: priceTargetModel.target3M * riskAdjustment.price
    },
    ensemble: {
      confidence: Math.round(combinedConfidence),
      methodology: 'Weighted ensemble of earnings and price models',
      riskProfile: assessRiskProfile(features),
      recommendation: generateRecommendation(earningsModel, priceTargetModel, features)
    },
    metadata: {
      modelVersion: '2.1',
      sector: sectorConfig.name,
      dataQuality: dataQuality,
      lastUpdate: new Date().toISOString()
    }
  }
}

// ================================
// SPECIALIZED PREDICTION MODELS
// ================================

export function predictQuarterlyEarnings(features: any, quarters: number = 4): any {
  console.log(`📊 Predicting ${quarters} quarters of earnings...`)
  
  const baseModel = predictEarningsSurprise(features)
  const basePrediction = baseModel.prediction
  const sectorConfig = features.sectorConfig || getSectorConfig('Technology')
  
  const quarterlyPredictions = []
  let cumulativeDecay = 0.85 // Confidence decay over time
  
  for (let q = 1; q <= quarters; q++) {
    // Apply seasonal adjustments
    const currentDate = new Date()
    const futureQuarter = Math.floor((currentDate.getMonth() + (q * 3)) / 3) % 4 + 1
    const seasonality = getSeasonalityForQuarter(futureQuarter, sectorConfig)
    
    // Apply trend decay
    const trendDecay = Math.pow(0.9, q - 1)
    
    // Growth sustainability factor
    const sustainabilityFactor = features.growthSustainability / 100
    
    const quarterPrediction = basePrediction * trendDecay * sustainabilityFactor + seasonality
    const quarterConfidence = baseModel.confidence * cumulativeDecay
    
    quarterlyPredictions.push({
      quarter: q,
      prediction: Number(quarterPrediction.toFixed(1)),
      confidence: Math.round(quarterConfidence),
      seasonality: seasonality,
      factors: {
        trendDecay,
        sustainabilityFactor,
        baseContribution: basePrediction * trendDecay
      }
    })
    
    cumulativeDecay *= 0.9 // Reduce confidence each quarter
  }
  
  return {
    baseModel: baseModel,
    quarterly: quarterlyPredictions,
    summary: {
      avgPrediction: quarterlyPredictions.reduce((sum, q) => sum + q.prediction, 0) / quarters,
      avgConfidence: quarterlyPredictions.reduce((sum, q) => sum + q.confidence, 0) / quarters,
      trend: analyzePredictionTrend(quarterlyPredictions)
    }
  }
}

export function predictSectorComparison(symbolFeatures: Array<{symbol: string, features: any}>): any {
  console.log('🏢 Running sector comparison analysis...')
  
  const predictions = symbolFeatures.map(({symbol, features}) => {
    const earnings = predictEarningsSurprise(features)
    const priceTarget = predictPriceTarget(features, features.currentPrice || 100)
    
    return {
      symbol,
      sector: features.sectorConfig?.name || 'Unknown',
      earnings: earnings.prediction,
      priceUpside: priceTarget.upside,
      confidence: (earnings.confidence + priceTarget.confidence) / 2,
      qualityScore: features.qualityScore || 50,
      riskScore: calculateOverallRiskScore(features)
    }
  })
  
  // Sector rankings
  const sectorGroups = groupBy(predictions, 'sector')
  const sectorRankings = Object.keys(sectorGroups).map(sector => {
    const stocks = sectorGroups[sector]
    return {
      sector,
      avgEarnings: avg(stocks.map((s: any)=> s.earnings)),
      avgUpside: avg(stocks.map((s: any) => s.priceUpside)),
      avgQuality: avg(stocks.map((s: any)=> s.qualityScore)),
      stockCount: stocks.length,
      topStock: stocks.sort((a: any, b: any) => b.confidence - a.confidence)[0]
    }
  })
  
  return {
    individual: predictions.sort((a, b) => b.confidence - a.confidence),
    sectorRankings: sectorRankings.sort((a, b) => b.avgUpside - a.avgUpside),
    recommendations: {
      topPicks: predictions.filter(p => p.confidence > 70 && p.priceUpside > 5).slice(0, 5),
      avoid: predictions.filter(p => p.confidence > 60 && p.priceUpside < -5),
      watchList: predictions.filter(p => p.confidence < 60 && p.qualityScore > 60)
    }
  }
}

// ================================
// HELPER FUNCTIONS
// ================================

function calculateRiskAdjustment(features: any): any {
  let earningsRisk = 1.0
  let priceRisk = 1.0
  
  // Volatility adjustment
  if (features.volatility > 0.4) {
    earningsRisk *= 0.9
    priceRisk *= 0.85
  }
  
  // Financial strength adjustment
  if (features.financialStrength < 50) {
    earningsRisk *= 0.95
    priceRisk *= 0.9
  }
  
  // Sector risk adjustment
  if (features.sectorMomentum < -10) {
    earningsRisk *= 0.92
    priceRisk *= 0.88
  }
  
  return {
    earnings: earningsRisk,
    price: priceRisk
  }
}

function assessRiskProfile(features: any): string {
  let riskScore = 0
  
  if (features.volatility > 0.4) riskScore += 2
  if (features.financialStrength < 50) riskScore += 2
  if (features.sectorMomentum < -10) riskScore += 1
  if (features.analystSentiment < -1) riskScore += 1
  if (features.revenueGrowth < -5) riskScore += 2
  
  if (riskScore >= 6) return 'High'
  if (riskScore >= 3) return 'Medium'
  return 'Low'
}

function generateRecommendation(earningsModel: any, priceTargetModel: any, features: any): string {
  const earnings = earningsModel.prediction
  const upside = priceTargetModel.upside
  const confidence = (earningsModel.confidence + priceTargetModel.confidence) / 2
  
  if (earnings > 5 && upside > 10 && confidence > 75) {
    return 'Strong Buy - High conviction opportunity'
  } else if (earnings > 2 && upside > 5 && confidence > 65) {
    return 'Buy - Positive outlook with good fundamentals'
  } else if (earnings > -2 && upside > -5 && confidence > 50) {
    return 'Hold - Mixed signals, monitor closely'
  } else if (earnings < -3 || upside < -10) {
    return 'Sell - Significant downside risk'
  } else {
    return 'Hold - Insufficient conviction for active position'
  }
}

function getSeasonalityForQuarter(quarter: number, sectorConfig: any): number {
  if (sectorConfig?.seasonality?.strongQuarters?.includes(quarter)) {
    return sectorConfig.seasonality.factor
  } else if (sectorConfig?.seasonality?.weakQuarters?.includes(quarter)) {
    return -sectorConfig.seasonality.factor * 0.5
  }
  return 0
}

function analyzePredictionTrend(predictions: any[]): string {
  if (predictions.length < 2) return 'Insufficient data'
  
  let improvingCount = 0
  for (let i = 1; i < predictions.length; i++) {
    if (predictions[i].prediction > predictions[i-1].prediction) {
      improvingCount++
    }
  }
  
  const improvingRatio = improvingCount / (predictions.length - 1)
  
  if (improvingRatio > 0.7) return 'Improving'
  if (improvingRatio < 0.3) return 'Deteriorating'
  return 'Stable'
}

function calculateOverallRiskScore(features: any): number {
  let score = 0
  
  if (features.volatility > 0.4) score += 3
  if (features.financialStrength < 50) score += 2
  if (features.revenueGrowth < -5) score += 2
  if (features.marginTrend < -2) score += 2
  if (features.analystSentiment < -1) score += 1
  
  return Math.min(10, score)
}

function groupBy(array: any[], key: string): any {
  return array.reduce((groups, item) => {
    const group = item[key]
    if (!groups[group]) groups[group] = []
    groups[group].push(item)
    return groups
  }, {})
}

function avg(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}