// src/analysis/insights.ts - Complete Insights Generation

import { getSectorConfig } from '../utils/sectorConfig'

// ================================
// MAIN INSIGHTS GENERATION
// ================================

export function generateInsights(features: any, sector: string): any[] {
  const sectorConfig = getSectorConfig(sector)
  const insights = []
  
  console.log(`🔍 Generating insights for ${sector} sector...`)
  
  // === FUNDAMENTAL INSIGHTS ===
  insights.push(...generateFundamentalInsights(features, sectorConfig))
  
  // === TECHNICAL INSIGHTS ===
  insights.push(...generateTechnicalInsights(features))
  
  // === SENTIMENT INSIGHTS ===
  insights.push(...generateSentimentInsights(features))
  
  // === SECTOR-SPECIFIC INSIGHTS ===
  insights.push(...generateSectorSpecificInsights(features, sectorConfig))
  
  // === RISK & OPPORTUNITY INSIGHTS ===
  insights.push(...generateRiskOpportunityInsights(features, sectorConfig))
  
  // === TIMING INSIGHTS ===
  insights.push(...generateTimingInsights(features, sectorConfig))
  
  // Prioritize and limit insights
  const prioritizedInsights = prioritizeInsights(insights)
  
  console.log(`✅ Generated ${prioritizedInsights.length} prioritized insights`)
  
  return prioritizedInsights.slice(0, 8) // Top 8 insights
}

// ================================
// FUNDAMENTAL INSIGHTS
// ================================

function generateFundamentalInsights(features: any, sectorConfig: any): any[] {
  const insights = []
  
  // Revenue Growth Analysis
  if (features.revenueGrowth > 20) {
    insights.push({
      type: 'positive',
      category: 'Growth',
      message: `Exceptional revenue acceleration at ${features.revenueGrowth.toFixed(1)}% - significantly above sector average`,
      impact: 'high',
      confidence: 0.9,
      priority: 1,
      actionable: 'Strong fundamental driver for earnings beat',
      timeframe: 'next quarter'
    })
  } else if (features.revenueGrowth > 12) {
    insights.push({
      type: 'positive',
      category: 'Growth',
      message: `Strong revenue growth at ${features.revenueGrowth.toFixed(1)}% indicates solid business momentum`,
      impact: 'medium',
      confidence: 0.85,
      priority: 2,
      actionable: 'Supports positive earnings outlook',
      timeframe: 'next quarter'
    })
  } else if (features.revenueGrowth < -5) {
    insights.push({
      type: 'negative',
      category: 'Growth',
      message: `Revenue declining at ${Math.abs(features.revenueGrowth).toFixed(1)}% - major concern for fundamental health`,
      impact: 'high',
      confidence: 0.92,
      priority: 1,
      actionable: 'High risk of earnings miss and guidance cut',
      timeframe: 'immediate'
    })
  } else if (features.revenueGrowth < 2) {
    insights.push({
      type: 'neutral',
      category: 'Growth',
      message: `Slow revenue growth at ${features.revenueGrowth.toFixed(1)}% may indicate market maturity or competitive pressure`,
      impact: 'medium',
      confidence: 0.75,
      priority: 3,
      actionable: 'Monitor for acceleration signs',
      timeframe: '2-3 quarters'
    })
  }
  
  // Profitability Analysis
  if (features.marginTrend > 2.5) {
    insights.push({
      type: 'positive',
      category: 'Profitability',
      message: `Significant margin expansion of ${features.marginTrend.toFixed(1)}pp indicates strong operational leverage`,
      impact: 'high',
      confidence: 0.88,
      priority: 1,
      actionable: 'Margin expansion should drive earnings beat',
      timeframe: 'next quarter'
    })
  } else if (features.marginTrend > 1) {
    insights.push({
      type: 'positive',
      category: 'Profitability',
      message: `Improving profit margins (+${features.marginTrend.toFixed(1)}pp) show effective cost management`,
      impact: 'medium',
      confidence: 0.82,
      priority: 2,
      actionable: 'Positive indicator for profitability',
      timeframe: 'next quarter'
    })
  } else if (features.marginTrend < -2) {
    insights.push({
      type: 'negative',
      category: 'Profitability',
      message: `Margin contraction of ${Math.abs(features.marginTrend).toFixed(1)}pp suggests cost pressure or pricing challenges`,
      impact: 'high',
      confidence: 0.85,
      priority: 1,
      actionable: 'Risk of earnings disappointment',
      timeframe: 'next quarter'
    })
  }
  
  // Financial Strength Analysis
  if (features.financialStrength > 80) {
    insights.push({
      type: 'positive',
      category: 'Financial Health',
      message: `Excellent financial strength (${Math.round(features.financialStrength)}/100) provides resilience and growth optionality`,
      impact: 'medium',
      confidence: 0.9,
      priority: 2,
      actionable: 'Lower risk investment with defensive qualities',
      timeframe: 'long-term'
    })
  } else if (features.financialStrength < 40) {
    insights.push({
      type: 'negative',
      category: 'Financial Health',
      message: `Weak financial position (${Math.round(features.financialStrength)}/100) may limit strategic flexibility`,
      impact: 'medium',
      confidence: 0.85,
      priority: 2,
      actionable: 'Higher risk profile, monitor liquidity closely',
      timeframe: 'ongoing'
    })
  }
  
  // Quality Score Analysis
  if (features.qualityScore > 85) {
    insights.push({
      type: 'positive',
      category: 'Quality',
      message: `Exceptional business quality (${Math.round(features.qualityScore)}/100) suggests sustainable competitive advantages`,
      impact: 'medium',
      confidence: 0.88,
      priority: 2,
      actionable: 'Premium valuation justified by quality',
      timeframe: 'long-term'
    })
  } else if (features.qualityScore < 35) {
    insights.push({
      type: 'negative',
      category: 'Quality',
      message: `Low business quality score (${Math.round(features.qualityScore)}/100) indicates structural challenges`,
      impact: 'medium',
      confidence: 0.82,
      priority: 3,
      actionable: 'Value trap risk - avoid without catalyst',
      timeframe: 'ongoing'
    })
  }
  
  return insights
}

// ================================
// TECHNICAL INSIGHTS
// ================================

function generateTechnicalInsights(features: any): any[] {
  const insights = []
  
  // Price vs Moving Averages
  if (features.priceVsSMA > 1.15) {
    insights.push({
      type: 'positive',
      category: 'Technical',
      message: `Strong momentum with price ${((features.priceVsSMA - 1) * 100).toFixed(1)}% above moving average`,
      impact: 'medium',
      confidence: 0.75,
      priority: 3,
      actionable: 'Technical breakout supports upside momentum',
      timeframe: '1-2 months'
    })
  } else if (features.priceVsSMA < 0.9) {
    insights.push({
      type: 'negative',
      category: 'Technical',
      message: `Weak technical position ${((1 - features.priceVsSMA) * 100).toFixed(1)}% below moving average`,
      impact: 'medium',
      confidence: 0.72,
      priority: 3,
      actionable: 'Technical breakdown risk - wait for reversal',
      timeframe: '1-2 months'
    })
  }
  
  // RSI Analysis
  if (features.rsiScore > 75) {
    insights.push({
      type: 'neutral',
      category: 'Technical',
      message: `Overbought conditions (RSI: ${features.rsiScore.toFixed(0)}) may limit near-term upside`,
      impact: 'low',
      confidence: 0.68,
      priority: 4,
      actionable: 'Consider taking profits or waiting for pullback',
      timeframe: '2-4 weeks'
    })
  } else if (features.rsiScore < 30) {
    insights.push({
      type: 'positive',
      category: 'Technical',
      message: `Oversold conditions (RSI: ${features.rsiScore.toFixed(0)}) may present buying opportunity`,
      impact: 'low',
      confidence: 0.65,
      priority: 4,
      actionable: 'Potential technical bounce candidate',
      timeframe: '2-4 weeks'
    })
  }
  
  // Volatility Analysis
  if (features.volatility > 0.45) {
    insights.push({
      type: 'negative',
      category: 'Risk',
      message: `High volatility (${(features.volatility * 100).toFixed(0)}%) indicates elevated uncertainty and risk`,
      impact: 'medium',
      confidence: 0.85,
      priority: 2,
      actionable: 'Reduce position size or use stop-losses',
      timeframe: 'ongoing'
    })
  } else if (features.volatility < 0.15) {
    insights.push({
      type: 'positive',
      category: 'Risk',
      message: `Low volatility (${(features.volatility * 100).toFixed(0)}%) suggests stable, lower-risk investment`,
      impact: 'low',
      confidence: 0.78,
      priority: 4,
      actionable: 'Suitable for conservative portfolios',
      timeframe: 'ongoing'
    })
  }
  
  // Momentum Analysis
  if (features.momentumScore > 75) {
    insights.push({
      type: 'positive',
      category: 'Momentum',
      message: `Strong momentum score (${Math.round(features.momentumScore)}/100) suggests continued outperformance`,
      impact: 'medium',
      confidence: 0.73,
      priority: 3,
      actionable: 'Momentum likely to persist short-term',
      timeframe: '4-8 weeks'
    })
  } else if (features.momentumScore < 25) {
    insights.push({
      type: 'negative',
      category: 'Momentum',
      message: `Weak momentum (${Math.round(features.momentumScore)}/100) indicates potential continued underperformance`,
      impact: 'medium',
      confidence: 0.70,
      priority: 3,
      actionable: 'Avoid momentum plays until reversal',
      timeframe: '4-8 weeks'
    })
  }
  
  return insights
}

// ================================
// SENTIMENT INSIGHTS
// ================================

function generateSentimentInsights(features: any): any[] {
  const insights = []
  
  // Analyst Sentiment
  if (features.analystSentiment > 1.5) {
    insights.push({
      type: 'positive',
      category: 'Sentiment',
      message: `Strong analyst optimism with significant upgrades driving positive sentiment`,
      impact: 'medium',
      confidence: 0.8,
      priority: 2,
      actionable: 'Analyst upgrades support near-term performance',
      timeframe: '1-3 months'
    })
  } else if (features.analystSentiment < -1.5) {
    insights.push({
      type: 'negative',
      category: 'Sentiment',
      message: `Widespread analyst downgrades indicate deteriorating Street confidence`,
      impact: 'medium',
      confidence: 0.82,
      priority: 2,
      actionable: 'Negative sentiment headwind for performance',
      timeframe: '1-3 months'
    })
  }
  
  // Price Target Momentum
  if (features.priceTargetMomentum > 15) {
    insights.push({
      type: 'positive',
      category: 'Sentiment',
      message: `Rising analyst price targets (+${features.priceTargetMomentum.toFixed(1)}%) reflect improving outlook`,
      impact: 'medium',
      confidence: 0.75,
      priority: 2,
      actionable: 'Street raising targets supports upside',
      timeframe: '2-4 months'
    })
  } else if (features.priceTargetMomentum < -15) {
    insights.push({
      type: 'negative',
      category: 'Sentiment',
      message: `Falling price targets (${features.priceTargetMomentum.toFixed(1)}%) signal reduced confidence`,
      impact: 'medium',
      confidence: 0.78,
      priority: 2,
      actionable: 'Lowered expectations may cap upside',
      timeframe: '2-4 months'
    })
  }
  
  // Insider Activity
  if (features.insiderActivity > 50) {
    insights.push({
      type: 'positive',
      category: 'Sentiment',
      message: `Significant insider buying suggests management confidence in prospects`,
      impact: 'medium',
      confidence: 0.85,
      priority: 2,
      actionable: 'Insider buying is positive signal',
      timeframe: '3-6 months'
    })
  } else if (features.insiderActivity < -50) {
    insights.push({
      type: 'negative',
      category: 'Sentiment',
      message: `Heavy insider selling may indicate management concerns or overvaluation`,
      impact: 'medium',
      confidence: 0.75,
      priority: 2,
      actionable: 'Monitor reasons for insider sales',
      timeframe: '3-6 months'
    })
  }
  
  // Social Sentiment (if available)
  if (features.socialBullishness > 60) {
    insights.push({
      type: 'positive',
      category: 'Sentiment',
      message: `Strong retail investor optimism (${features.socialBullishness.toFixed(0)}% bullish) supports momentum`,
      impact: 'low',
      confidence: 0.65,
      priority: 4,
      actionable: 'Retail sentiment supports near-term buying',
      timeframe: '2-6 weeks'
    })
  } else if (features.socialBullishness < -40) {
    insights.push({
      type: 'negative',
      category: 'Sentiment',
      message: `Negative retail sentiment may create selling pressure`,
      impact: 'low',
      confidence: 0.62,
      priority: 4,
      actionable: 'Contrarian opportunity if fundamentals strong',
      timeframe: '2-6 weeks'
    })
  }
  
  return insights
}

// ================================
// SECTOR-SPECIFIC INSIGHTS
// ================================

function generateSectorSpecificInsights(features: any, sectorConfig: any): any[] {
  const insights = []
  const sectorName = sectorConfig.name
  
  // Sector Performance Context
  if (features.sectorMomentum > 10) {
    insights.push({
      type: 'positive',
      category: 'Sector',
      message: `${sectorName} sector outperforming (+${features.sectorMomentum.toFixed(1)}%) provides tailwind`,
      impact: 'medium',
      confidence: 0.8,
      priority: 2,
      actionable: 'Sector rotation supports performance',
      timeframe: '1-4 months'
    })
  } else if (features.sectorMomentum < -10) {
    insights.push({
      type: 'negative',
      category: 'Sector',
      message: `${sectorName} sector underperforming (${features.sectorMomentum.toFixed(1)}%) creates headwind`,
      impact: 'medium',
      confidence: 0.82,
      priority: 2,
      actionable: 'Sector weakness limits upside potential',
      timeframe: '1-4 months'
    })
  }
  
  // Seasonality Insights
  if (features.seasonality > 0) {
    insights.push({
      type: 'positive',
      category: 'Seasonality',
      message: `Favorable ${sectorName} seasonal patterns support near-term performance`,
      impact: 'low',
      confidence: 0.7,
      priority: 4,
      actionable: 'Seasonal tailwinds in place',
      timeframe: 'current quarter'
    })
  } else if (features.seasonality < -0.5) {
    insights.push({
      type: 'negative',
      category: 'Seasonality',
      message: `Seasonal headwinds typical for ${sectorName} during this period`,
      impact: 'low',
      confidence: 0.68,
      priority: 4,
      actionable: 'Seasonal weakness expected',
      timeframe: 'current quarter'
    })
  }
  
  // Sector-Specific Metrics
  if (sectorName === 'Technology') {
    if (features.revenueGrowth > 25) {
      insights.push({
        type: 'positive',
        category: 'Tech Growth',
        message: `Exceptional tech growth rate suggests market share gains or new product success`,
        impact: 'high',
        confidence: 0.85,
        priority: 1,
        actionable: 'Growth acceleration key tech value driver',
        timeframe: 'next 2 quarters'
      })
    }
  } else if (sectorName === 'Healthcare') {
    if (features.marginTrend > 3) {
      insights.push({
        type: 'positive',
        category: 'Healthcare Efficiency',
        message: `Strong margin expansion in healthcare suggests pricing power or operational efficiency`,
        impact: 'medium',
        confidence: 0.82,
        priority: 2,
        actionable: 'Healthcare margin expansion supports valuation',
        timeframe: 'next quarter'
      })
    }
  } else if (sectorName === 'Financial Services') {
    if (features.interestSensitivity > 7 && features.economicGrowth > 2.5) {
      insights.push({
        type: 'positive',
        category: 'Financial Environment',
        message: `Strong economic growth benefits interest-sensitive financial services`,
        impact: 'medium',
        confidence: 0.78,
        priority: 2,
        actionable: 'Economic growth supports financial sector',
        timeframe: '2-4 quarters'
      })
    }
  }
  
  return insights
}

// ================================
// RISK & OPPORTUNITY INSIGHTS
// ================================

function generateRiskOpportunityInsights(features: any, sectorConfig: any): any[] {
  const insights = []
  
  // Growth Sustainability Risk
  if (features.revenueGrowth > 30 && features.growthSustainability < 60) {
    insights.push({
      type: 'negative',
      category: 'Risk',
      message: `Very high growth (${features.revenueGrowth.toFixed(1)}%) may be difficult to sustain`,
      impact: 'medium',
      confidence: 0.75,
      priority: 3,
      actionable: 'Monitor for growth deceleration signs',
      timeframe: '2-4 quarters'
    })
  }
  
  // Value Opportunity
  if (features.valueScore > 70 && features.qualityScore > 60) {
    insights.push({
      type: 'positive',
      category: 'Opportunity',
      message: `Attractive valuation combined with solid quality presents value opportunity`,
      impact: 'medium',
      confidence: 0.8,
      priority: 2,
      actionable: 'Quality value play with limited downside',
      timeframe: '6-12 months'
    })
  } else if (features.valueScore < 30 && features.momentumScore < 40) {
    insights.push({
      type: 'negative',
      category: 'Risk',
      message: `Poor valuation with weak momentum suggests overpriced asset`,
      impact: 'medium',
      confidence: 0.78,
      priority: 2,
      actionable: 'Avoid until valuation becomes reasonable',
      timeframe: 'ongoing'
    })
  }
  
  // Earnings Risk
  if (features.surpriseHistory < -1 && features.beatRate < 0.4) {
    insights.push({
      type: 'negative',
      category: 'Earnings Risk',
      message: `Poor earnings track record increases risk of future disappointments`,
      impact: 'high',
      confidence: 0.85,
      priority: 1,
      actionable: 'High earnings miss risk - reduce exposure before earnings',
      timeframe: 'next earnings'
    })
  } else if (features.surpriseHistory > 1 && features.beatRate > 0.8) {
    insights.push({
      type: 'positive',
      category: 'Earnings Quality',
      message: `Strong earnings track record suggests reliable execution capability`,
      impact: 'medium',
      confidence: 0.88,
      priority: 2,
      actionable: 'History supports positive earnings outlook',
      timeframe: 'next earnings'
    })
  }
  
  return insights
}

// ================================
// TIMING INSIGHTS
// ================================

function generateTimingInsights(features: any, sectorConfig: any): any[] {
  const insights = []
  
  // Earnings Timing
  if (features.daysToEarnings <= 30 && features.daysToEarnings > 0) {
    if (features.surpriseHistory > 0.5 && features.analystSentiment > 0) {
      insights.push({
        type: 'positive',
        category: 'Timing',
        message: `Approaching earnings (${features.daysToEarnings} days) with positive setup`,
        impact: 'medium',
        confidence: 0.75,
        priority: 2,
        actionable: 'Good earnings setup for potential beat',
        timeframe: 'next 30 days'
      })
    } else if (features.surpriseHistory < -0.5 || features.analystSentiment < -1) {
      insights.push({
        type: 'negative',
        category: 'Timing',
        message: `Approaching earnings (${features.daysToEarnings} days) with concerning setup`,
        impact: 'medium',
        confidence: 0.78,
        priority: 2,
        actionable: 'Consider reducing exposure before earnings',
        timeframe: 'next 30 days'
      })
    }
  }
  
  // Post-Earnings Timing
  if (features.daysSinceEarnings <= 5) {
    insights.push({
      type: 'neutral',
      category: 'Timing',
      message: `Recent earnings announcement (${features.daysSinceEarnings} days ago) - reaction may still be developing`,
      impact: 'low',
      confidence: 0.7,
      priority: 4,
      actionable: 'Monitor post-earnings price action',
      timeframe: 'next 1-2 weeks'
    })
  }
  
  // Seasonal Timing
  const currentMonth = new Date().getMonth() + 1
  if (sectorConfig?.seasonality && currentMonth % 3 === 1) { // Start of quarter
    insights.push({
      type: 'neutral',
      category: 'Timing',
      message: `Beginning of quarter - institutional rebalancing may affect ${sectorConfig.name} sector`,
      impact: 'low',
      confidence: 0.65,
      priority: 4,
      actionable: 'Monitor for quarter-start flows',
      timeframe: 'next 2-3 weeks'
    })
  }
  
  return insights
}

// ================================
// INSIGHT PRIORITIZATION
// ================================

function prioritizeInsights(insights: any[]): any[] {
  return insights
    .filter(insight => insight.confidence >= 0.6) // Filter low confidence
    .sort((a, b) => {
      // Primary sort: priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      
      // Secondary sort: impact (high > medium > low)
      const impactOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 }
      const impactDiff = (impactOrder[b.impact] || 1) - (impactOrder[a.impact] || 1)
      if (impactDiff !== 0) return impactDiff
      
      // Tertiary sort: confidence (higher is better)
      return b.confidence - a.confidence
    })
}

// ================================
// INSIGHT FORMATTING & EXPORT
// ================================

export function formatInsightsForUI(insights: any[]): any {
  const categorized = {
    critical: insights.filter(i => i.priority === 1),
    important: insights.filter(i => i.priority === 2),
    noteworthy: insights.filter(i => i.priority >= 3),
    positive: insights.filter(i => i.type === 'positive'),
    negative: insights.filter(i => i.type === 'negative'),
    neutral: insights.filter(i => i.type === 'neutral')
  }
  
  return {
    summary: {
      total: insights.length,
      critical: categorized.critical.length,
      positive: categorized.positive.length,
      negative: categorized.negative.length,
      avgConfidence: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
    },
    categorized,
    topInsights: insights.slice(0, 5),
    actionableItems: insights
      .filter(i => i.actionable && i.priority <= 2)
      .map(i => ({
        action: i.actionable,
        timeframe: i.timeframe,
        priority: i.priority,
        category: i.category
      }))
  }
}

export function generateInsightsSummary(insights: any[]): string {
  const positive = insights.filter(i => i.type === 'positive').length
  const negative = insights.filter(i => i.type === 'negative').length
  const critical = insights.filter(i => i.priority === 1).length
  
  if (critical > 2 && negative > positive) {
    return 'Multiple critical concerns identified - high caution recommended'
  } else if (positive > negative * 1.5) {
    return 'Predominantly positive outlook with strong fundamental support'
  } else if (negative > positive * 1.5) {
    return 'Several risk factors present - defensive approach warranted'
  } else {
    return 'Mixed signals present - selective approach recommended'
  }
}