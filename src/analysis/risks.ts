// src/analysis/risks.ts - Risk Assessment

// ================================
// MAIN RISK ASSESSMENT
// ================================

export function assessRisks(features: any, sectorConfig: any): any {
    const risks = []
    let overallRisk = 'Medium'
    let riskScore = 5 // Scale of 1-10
    
    // Volatility risk
    if (features.volatility > 0.4) {
      risks.push({
        type: 'High Volatility',
        level: 'High',
        score: 8,
        description: 'Stock exhibits high price volatility',
        mitigation: 'Consider position sizing and stop-losses',
        probability: 0.85
      })
      riskScore += 2
    } else if (features.volatility > 0.25) {
      risks.push({
        type: 'Moderate Volatility',
        level: 'Medium',
        score: 5,
        description: 'Above-average price volatility',
        mitigation: 'Monitor closely and consider volatility hedging',
        probability: 0.65
      })
      riskScore += 1
    }
    
    // Growth sustainability risk
    if (features.revenueGrowth > 30) {
      risks.push({
        type: 'Growth Sustainability',
        level: 'Medium',
        score: 6,
        description: 'Very high growth may be difficult to sustain',
        mitigation: 'Monitor for deceleration signs',
        probability: 0.60
      })
      riskScore += 1
    }
    
    // Margin pressure risk
    if (features.marginTrend < -3) {
      risks.push({
        type: 'Margin Pressure',
        level: 'High',
        score: 7,
        description: 'Significant margin contraction observed',
        mitigation: 'Watch for cost control measures',
        probability: 0.75
      })
      riskScore += 2
    }
    
    // Sector-specific risks
    if (sectorConfig?.riskFactors) {
      const sectorRisks = assessSectorSpecificRisks(features, sectorConfig)
      risks.push(...sectorRisks)
      riskScore += sectorRisks.length * 0.5
    }
    
    // Earnings risk
    if (features.surpriseHistory < -0.5) {
      risks.push({
        type: 'Earnings Risk',
        level: 'Medium',
        score: 6,
        description: 'History of missing earnings expectations',
        mitigation: 'Lower position size before earnings',
        probability: 0.70
      })
      riskScore += 1
    }
    
    // Technical risks
    const technicalRisks = assessTechnicalRisks(features)
    risks.push(...technicalRisks)
    
    // Sentiment risks
    const sentimentRisks = assessSentimentRisks(features)
    risks.push(...sentimentRisks)
    
    // Liquidity risks
    const liquidityRisks = assessLiquidityRisks(features)
    risks.push(...liquidityRisks)
    
    // Determine overall risk level
    if (riskScore <= 3) overallRisk = 'Low'
    else if (riskScore <= 6) overallRisk = 'Medium'
    else if (riskScore <= 8) overallRisk = 'High'
    else overallRisk = 'Very High'
    
    // Calculate risk-adjusted metrics
    const riskMetrics = calculateRiskMetrics(risks, features)
    
    return {
      overall: overallRisk,
      score: Math.min(10, riskScore),
      factors: prioritizeRisks(risks).slice(0, 6), // Top 6 risks
      recommendation: getRiskRecommendation(overallRisk),
      metrics: riskMetrics,
      diversificationNeeds: assessDiversificationNeeds(risks, sectorConfig),
      hedgingStrategies: suggestHedgingStrategies(risks, features)
    }
  }
  
  // ================================
  // SECTOR-SPECIFIC RISK ASSESSMENT
  // ================================
  
  function assessSectorSpecificRisks(features: any, sectorConfig: any): any[] {
    const risks: Array<{
      type: string;
      level: string;
      score: number;
      description: string;
      mitigation: string;
      probability: number;
    }> = []
    
    // ✅ FIX: Adicionar validação de sectorConfig
    if (!sectorConfig?.riskFactors?.common) {
      return risks
    }
    
    sectorConfig.riskFactors.common.forEach((riskType: string) => {
      const riskAssessment = evaluateSpecificRisk(riskType, features, sectorConfig)
      if (riskAssessment.score > 3) {
        risks.push(riskAssessment)
      }
    })
    
    return risks
  }
  
  function evaluateSpecificRisk(riskType: string, features: any, sectorConfig: any): any {
    const riskEvaluations: { [key: string]: any } = {
      'Regulatory Pressure': {
        type: 'Regulatory Pressure',
        level: features.sectorMomentum < -10 ? 'High' : 'Medium',
        score: features.sectorMomentum < -10 ? 7 : 5,
        description: `Regulatory environment impact on ${sectorConfig.name}`,
        mitigation: 'Monitor regulatory changes and compliance costs',
        probability: features.sectorMomentum < -10 ? 0.75 : 0.50
      },
      'Competition': {
        type: 'Competitive Pressure',
        level: features.marginTrend < -2 ? 'High' : 'Medium',
        score: features.marginTrend < -2 ? 7 : 4,
        description: 'Market competition affecting margins',
        mitigation: 'Focus on competitive advantages and moats',
        probability: features.marginTrend < -2 ? 0.80 : 0.60
      },
      'Innovation Risk': {
        type: 'Innovation Risk',
        level: sectorConfig.name === 'Technology' ? 'High' : 'Medium',
        score: sectorConfig.name === 'Technology' ? 6 : 4,
        description: 'Risk from technological disruption',
        mitigation: 'Assess R&D spending and innovation pipeline',
        probability: 0.65
      },
      'Interest Rate Risk': {
        type: 'Interest Rate Risk',
        level: features.interestSensitivity > 7 ? 'High' : 'Medium',
        score: features.interestSensitivity > 7 ? 8 : 5,
        description: 'Sensitivity to interest rate changes',
        mitigation: 'Consider duration hedging strategies',
        probability: 0.70
      },
      'Credit Risk': {
        type: 'Credit Risk',
        level: features.creditQuality < 4 ? 'High' : 'Low',
        score: features.creditQuality < 4 ? 8 : 3,
        description: 'Credit quality deterioration risk',
        mitigation: 'Monitor balance sheet health',
        probability: features.creditQuality < 4 ? 0.75 : 0.30
      }
    }
    
    return riskEvaluations[riskType] || {
      type: riskType,
      level: 'Medium',
      score: 5,
      description: `${riskType} affecting ${sectorConfig.name} sector`,
      mitigation: 'Monitor sector-specific developments',
      probability: 0.50
    }
  }
  
  // ================================
  // TECHNICAL RISK ASSESSMENT
  // ================================
  
  function assessTechnicalRisks(features: any): any[] {
    const risks = []
    
    // Overbought/oversold risks
    if (features.rsiScore > 80) {
      risks.push({
        type: 'Overbought Risk',
        level: 'Medium',
        score: 6,
        description: 'Stock appears severely overbought',
        mitigation: 'Consider taking profits or reducing position',
        probability: 0.70
      })
    } else if (features.rsiScore < 20) {
      risks.push({
        type: 'Oversold Risk',
        level: 'Low',
        score: 3,
        description: 'Stock appears oversold - potential reversal',
        mitigation: 'May present buying opportunity',
        probability: 0.40
      })
    }
    
    // Moving average risks
    if (features.priceVsSMA < -10) {
      risks.push({
        type: 'Technical Breakdown',
        level: 'Medium',
        score: 6,
        description: 'Price significantly below moving averages',
        mitigation: 'Wait for technical confirmation before buying',
        probability: 0.65
      })
    }
    
    return risks
  }
  
  // ================================
  // SENTIMENT RISK ASSESSMENT
  // ================================
  
  function assessSentimentRisks(features: any): any[] {
    const risks = []
    
    // Analyst sentiment risks
    if (features.analystSentiment < -1.5) {
      risks.push({
        type: 'Negative Sentiment',
        level: 'Medium',
        score: 6,
        description: 'Widespread analyst downgrades',
        mitigation: 'Understand underlying concerns',
        probability: 0.75
      })
    }
    
    // Price target momentum risks
    if (features.priceTargetMomentum < -15) {
      risks.push({
        type: 'Declining Expectations',
        level: 'Medium',
        score: 5,
        description: 'Falling analyst price targets',
        mitigation: 'Monitor for fundamental deterioration',
        probability: 0.70
      })
    }
    
    // Insider activity risks
    if (features.insiderActivity < -2) {
      risks.push({
        type: 'Insider Selling',
        level: 'Medium',
        score: 5,
        description: 'Significant insider selling activity',
        mitigation: 'Investigate reasons for insider sales',
        probability: 0.60
      })
    }
    
    return risks
  }
  
  // ================================
  // LIQUIDITY RISK ASSESSMENT
  // ================================
  
  function assessLiquidityRisks(features: any): any[] {
    const risks = []
    
    // Volume-based liquidity assessment
    if (features.volumeProfile?.volumeTrend < -30) {
      risks.push({
        type: 'Liquidity Risk',
        level: 'Medium',
        score: 5,
        description: 'Declining trading volume may impact liquidity',
        mitigation: 'Use limit orders and smaller position sizes',
        probability: 0.55
      })
    }
    
    return risks
  }
  
  // ================================
  // RISK PRIORITIZATION AND METRICS
  // ================================
  
  function prioritizeRisks(risks: any[]): any[] {
    return risks.sort((a, b) => {
      // Sort by combination of score and probability
      const scoreA = a.score * a.probability
      const scoreB = b.score * b.probability
      return scoreB - scoreA
    })
  }
  
  function calculateRiskMetrics(risks: any[], features: any): any {
    const totalRiskScore = risks.reduce((sum, risk) => sum + risk.score, 0)
    const avgProbability = risks.length > 0 ? 
  risks.reduce((sum, risk) => sum + risk.probability, 0) / risks.length : 0
    
    // Value at Risk estimation (simplified)
    const volatility = features.volatility || 0.2 // default volatility
    const var95 = volatility * 1.645 * Math.sqrt(21)
    const var99 = volatility * 2.326 * Math.sqrt(21)
    
    return {
      totalRiskScore,
      averageProbability: Number(avgProbability.toFixed(2)),
      valueAtRisk: {
        var95: Number((var95 * 100).toFixed(1)),
        var99: Number((var99 * 100).toFixed(1))
      },
      sharpeRatio: calculateSharpeRatio(features),
      maxDrawdown: estimateMaxDrawdown(features),
      riskAdjustedReturn: calculateRiskAdjustedReturn(features)
    }
  }
  
  // ================================
  // RISK MANAGEMENT RECOMMENDATIONS
  // ================================
  
  function getRiskRecommendation(riskLevel: string): string {
    const recommendations: { [key: string]: string } = {
      'Low': 'Suitable for most portfolios with standard position sizing',
      'Medium': 'Consider moderate position sizing and regular monitoring',
      'High': 'Reduce position size and implement stop-losses',
      'Very High': 'Consider avoiding or very small speculative position only'
    }
    
    return recommendations[riskLevel] || recommendations['Medium']
  }
  
  function assessDiversificationNeeds(risks: any[], sectorConfig: any): any {
    const sectorRisks = risks.filter(r => r.type.includes('Sector') || r.type.includes(sectorConfig.name))
    const systematicRisks = risks.filter(r => ['Interest Rate Risk', 'Regulatory Pressure'].includes(r.type))
    
    return {
      sectorConcentrationRisk: sectorRisks.length > 2 ? 'High' : 'Medium',
      systematicRisk: systematicRisks.length > 1 ? 'High' : 'Low',
      recommendations: [
        sectorRisks.length > 2 ? 'Diversify across sectors' : null,
        systematicRisks.length > 1 ? 'Consider defensive assets' : null,
        'Monitor correlation with broader market'
      ].filter(Boolean)
    }
  }
  
  function suggestHedgingStrategies(risks: any[], features: any): any[] {
    const strategies = []
    
    // High volatility hedging
    if (risks.some(r => r.type === 'High Volatility')) {
      strategies.push({
        strategy: 'Volatility Hedging',
        instruments: ['Put options', 'VIX calls'],
        cost: 'Medium',
        effectiveness: 'High'
      })
    }
    
    // Interest rate hedging
    if (risks.some(r => r.type === 'Interest Rate Risk')) {
      strategies.push({
        strategy: 'Interest Rate Hedging',
        instruments: ['Treasury futures', 'Interest rate swaps'],
        cost: 'Low',
        effectiveness: 'Medium'
      })
    }
    
    // Sector hedging
    if (risks.some(r => r.type.includes('Sector'))) {
      strategies.push({
        strategy: 'Sector Hedging',
        instruments: ['Sector ETF shorts', 'Sector pairs trades'],
        cost: 'Medium',
        effectiveness: 'Medium'
      })
    }
    
    return strategies
  }
  
  // ================================
  // RISK CALCULATION UTILITIES
  // ================================
  
  function calculateSharpeRatio(features: any): number {
    const expectedReturn = features.revenueGrowth / 100 // Simplified
    const riskFreeRate = 0.045 // Assume 4.5% risk-free rate
    const excessReturn = expectedReturn - riskFreeRate
    
    return Number((excessReturn / (features.volatility || 0.2)).toFixed(2))
  }
  
  function estimateMaxDrawdown(features: any): number {
    // Simplified max drawdown estimation
    return Number((features.volatility * 2.5 * 100).toFixed(1)) // Rough estimate
  }
  
  function calculateRiskAdjustedReturn(features: any): number {
    const expectedReturn = features.revenueGrowth / 100
    const riskPenalty = features.volatility * 0.5
    return Number(((expectedReturn - riskPenalty) * 100).toFixed(1))
  }
  
  // ================================
  // SCENARIO ANALYSIS
  // ================================
  
  export function performScenarioAnalysis(features: any, sectorConfig: any): any {
    const scenarios = {
      bullish: calculateScenarioRisk(features, 1.2, 'Bullish market conditions'),
      base: calculateScenarioRisk(features, 1.0, 'Current market conditions'),
      bearish: calculateScenarioRisk(features, 0.8, 'Bearish market conditions'),
      stress: calculateScenarioRisk(features, 0.6, 'Market stress scenario')
    }
    
    return {
      scenarios,
      mostLikely: 'base',
      worstCase: 'stress',
      keyRiskFactors: identifyKeyRiskFactors(features, sectorConfig)
    }
  }
  
  function calculateScenarioRisk(features: any, multiplier: number, description: string): any {
    const baseVolatility = features.volatility || 0.2
    const baseGrowth = features.revenueGrowth || 0
    const adjustedVolatility = baseVolatility * multiplier
    const adjustedGrowth = baseGrowth * multiplier
    
    return {
      description,
      volatility: Number((adjustedVolatility * 100).toFixed(1)),
      expectedReturn: Number((adjustedGrowth / 2).toFixed(1)), // Simplified
      var95: Number((adjustedVolatility * 1.645 * Math.sqrt(21) * 100).toFixed(1)),
      probabilityOfLoss: calculateProbabilityOfLoss(adjustedVolatility, adjustedGrowth)
    }
  }
  
  function calculateProbabilityOfLoss(volatility: number, growth: number): number {
    // Simplified calculation using normal distribution
    const meanReturn = growth / 100 / 12 // Monthly
    const monthlyVol = volatility / Math.sqrt(12)
    
    // P(return < 0) using standard normal distribution
    const zScore = monthlyVol > 0 ? -meanReturn / monthlyVol : 0
    return Number((normalCDF(zScore) * 100).toFixed(1))
  }
  
  function normalCDF(x: number): number {
    // Approximation of cumulative distribution function
    return 0.5 * (1 + erf(x / Math.sqrt(2)))
  }
  
  function erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911
    
    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)
    
    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
    
    return sign * y
  }
  
  function identifyKeyRiskFactors(features: any, sectorConfig: any): string[] {
    const riskFactors = []
    
    if (features.volatility > 0.3) riskFactors.push('High Volatility')
    if (features.marginTrend < -2) riskFactors.push('Margin Pressure')
    if (features.analystSentiment < -1) riskFactors.push('Negative Sentiment')
    if (features.sectorMomentum < -5) riskFactors.push('Sector Headwinds')
    
    // Add sector-specific factors
    if (sectorConfig?.riskFactors?.common) {
      riskFactors.push(...sectorConfig.riskFactors.common.slice(0, 2))
    }
    
    return riskFactors.slice(0, 5)
  }
  
  // ================================
  // RISK MONITORING FRAMEWORK
  // ================================
  
  export function createRiskMonitoringFramework(risks: any[], features: any): any {
    // ✅ FIX: Definir tipo explícito do array
    const alerts: Array<{
      metric: string;
      threshold: number;
      currentValue: number;
      triggered: boolean;
      severity: string;
    }> = []
    
    const thresholds = {
      volatility: 0.35,
      marginDecline: -3,
      sentimentDecline: -1.5,
      volumeDecline: -25
    }
    
    // Set up monitoring alerts
    Object.entries(thresholds).forEach(([metric, threshold]) => {
        const mappedMetric = getFeatureMapping(metric)
        const currentValue = features[metric] !== undefined ? 
          features[metric] : 
          (mappedMetric === 'volumeProfile' ? features.volumeTrend : features[mappedMetric])
      
      if (currentValue !== undefined && currentValue !== null && !isNaN(currentValue)) {
        alerts.push({
          metric,
          threshold,
          currentValue,
          triggered: isThresholdBreached(currentValue, threshold, metric),
          severity: calculateAlertSeverity(currentValue, threshold, metric)
        })
      }
    })
    
    return {
      alerts: alerts.filter(a => a.triggered),
      monitoringFrequency: determineMonitoringFrequency(risks),
      keyMetricsToWatch: getKeyMetrics(risks),
      escalationProcedure: getEscalationProcedure(risks)
    }
  }
  
  function getFeatureMapping(metric: string): string {
    const mapping: { [key: string]: string } = {
      'volatility': 'volatility',
      'marginDecline': 'marginTrend',
      'sentimentDecline': 'analystSentiment',
      'volumeDecline': 'volumeProfile'
    }
    return mapping[metric] || metric
  }
  
  function isThresholdBreached(value: number, threshold: number, metric: string): boolean {
    if (value === undefined || value === null || isNaN(value)) return false
      return value < threshold
    }
  
  function calculateAlertSeverity(value: number, threshold: number, metric: string): string {
    const deviation = Math.abs(value - threshold) / Math.abs(threshold)
    
    if (deviation > 0.5) return 'High'
    if (deviation > 0.2) return 'Medium'
    return 'Low'
  }
  
  function determineMonitoringFrequency(risks: any[]): string {
    const highRiskCount = risks.filter(r => r.level === 'High').length
    
    if (highRiskCount > 2) return 'Daily'
    if (highRiskCount > 0) return 'Weekly'
    return 'Monthly'
  }
  
  function getKeyMetrics(risks: any[]): string[] {
    const metricPriority: { [key: string]: string[] } = {
      'High Volatility': ['volatility', 'volume', 'price'],
      'Margin Pressure': ['margins', 'costs', 'revenue'],
      'Negative Sentiment': ['analyst_ratings', 'price_targets', 'insider_activity'],
      'Interest Rate Risk': ['interest_rates', 'duration', 'credit_spread']
    }
    
    const metrics = new Set<string>()
    risks.forEach(risk => {
      const riskMetrics = metricPriority[risk.type] || ['price', 'volume']
      riskMetrics.forEach(metric => metrics.add(metric))
    })
    
    return Array.from(metrics).slice(0, 6)
  }
  
  function getEscalationProcedure(risks: any[]): any {
    const highRisks = risks.filter(r => r.level === 'High').length
    
    return {
      level1: 'Monitor daily and review weekly',
      level2: highRisks > 1 ? 'Alert portfolio manager' : 'Continue monitoring',
      level3: highRisks > 2 ? 'Consider position reduction' : 'Quarterly review',
      triggerThresholds: {
        immediate: 'Any risk score > 8',
        urgent: 'More than 2 high risks',
        routine: 'Weekly risk review'
      }
    }
  }
  
  // ================================
  // RISK REPORTING
  // ================================
  
  export function generateRiskReport(riskAssessment: any, features: any): any {
    return {
      executiveSummary: {
        overallRisk: riskAssessment.overall,
        score: riskAssessment.score,
        topRisks: riskAssessment.factors.slice(0, 3).map((r:any) => r.type),
        recommendation: riskAssessment.recommendation
      },
      detailedAnalysis: {
        riskFactors: riskAssessment.factors,
        metrics: riskAssessment.metrics,
        scenarios: performScenarioAnalysis(features, {})
      },
      actionItems: {
        immediate: getImmediateActions(riskAssessment.factors),
        shortTerm: getShortTermActions(riskAssessment.factors),
        longTerm: getLongTermActions(riskAssessment.factors)
      },
      monitoring: createRiskMonitoringFramework(riskAssessment.factors, features)
    }
  }
  
  function getImmediateActions(risks: any[]): string[] {
    const actions = []
    
    if (risks.some(r => r.level === 'High' && r.type === 'High Volatility')) {
      actions.push('Review position sizing')
    }
    
    if (risks.some(r => r.level === 'High' && r.type === 'Margin Pressure')) {
      actions.push('Analyze cost structure')
    }
    
    return actions
  }
  
  function getShortTermActions(risks: any[]): string[] {
    const actions = []
    
    if (risks.length > 3) {
      actions.push('Implement risk monitoring dashboard')
    }
    
    if (risks.some(r => r.type.includes('Sector'))) {
      actions.push('Evaluate sector diversification')
    }
    
    return actions
  }
  
  function getLongTermActions(risks: any[]): string[] {
    return [
      'Quarterly risk assessment review',
      'Update risk models with new data',
      'Evaluate hedging strategy effectiveness'
    ]
  }