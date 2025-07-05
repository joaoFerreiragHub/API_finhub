// src/analysis/orchestrator.ts - FIXED VERSION

// ✅ FIX: Import from correct locations

  
  import { createMLFeatures } from '../ml/features'
  
  import { 
    predictEarningsSurprise, 
    predictPriceTarget,
    ensemblePrediction 
  } from '../ml/models'
import { fetchEarningsHistory, fetchFundamentals, fetchMarketContext, fetchSentimentData, fetchTechnicalData } from '../utils/mlFetchers'
  
  import { generateInsights } from './insights'
  import { assessRisks } from './risks'
  
  function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'Unknown error'
  }
  
  // ================================
  // MAIN ORCHESTRATION FUNCTION
  // ================================
  
  export async function analyzeStockML(symbol: string) {
    try {
      console.log(`🚀 Starting ML analysis for ${symbol}`)
      
      // Fetch all data in parallel
      const [fundamentals, marketContext, sentiment, technical, earnings] = await Promise.all([
        fetchFundamentals(symbol),
        fetchMarketContext(symbol),
        fetchSentimentData(symbol),
        fetchTechnicalData(symbol),
        fetchEarningsHistory(symbol)
      ])
      
      console.log(`📊 Data fetched for ${symbol}`)
      
      // ✅ FIX: Get sector from the correct source
      const sector = marketContext.sector || fundamentals.sector || 'Technology'
      const sectorConfig = marketContext.sectorConfig || fundamentals.sectorConfig
      
      // Create ML features
      const features = createMLFeatures({
        fundamentals,
        marketContext,
        sentiment,
        technical,
        earnings
      })
      
      console.log('🧮 Features engineered:', Object.keys(features))
      
      // Generate predictions
      const currentPrice = technical.prices?.historical?.[0]?.close || 100
      
      // Use ensemble prediction for more robust results
      const predictions = ensemblePrediction(features, currentPrice)
      
      // Additional insights
      const insights = generateInsights(features, sector)
      const riskAssessment = assessRisks(features, sectorConfig)
      
      return {
        symbol,
        sector: sector,
        sectorConfig: sectorConfig,
        currentPrice,
        predictions,
        features: {
          fundamental: {
            revenueGrowth: features.revenueGrowth,
            marginTrend: features.marginTrend,
            roeTrend: features.roeTrend
          },
          technical: {
            rsiScore: features.rsiScore,
            priceVsSMA: features.priceVsSMA,
            volatility: features.volatility
          },
          sentiment: {
            analystSentiment: features.analystSentiment,
            priceTargetMomentum: features.priceTargetMomentum,
            insiderActivity: features.insiderActivity
          },
          market: {
            sectorMomentum: features.sectorMomentum,
            seasonality: features.seasonality
          }
        },
        insights,
        riskAssessment,
        confidence: {
          overall: predictions.ensemble.confidence,
          dataQuality: features.confidenceFactors?.dataQuality || 0.8,
          sectorCoverage: features.confidenceFactors?.sectorCoverage || 0.75
        },
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`❌ Error analyzing ${symbol}:`, error)
      throw new Error(`Failed to analyze ${symbol}: ${extractErrorMessage(error)}`)
    }
  }
  
  // ================================
  // LIGHTWEIGHT ANALYSIS FUNCTIONS
  // ================================
  
  export async function quickEarningsAnalysis(symbol: string) {
    try {
      console.log(`⚡ Quick earnings analysis for ${symbol}`)
      
      const [fundamentals, earnings] = await Promise.all([
        fetchFundamentals(symbol),
        fetchEarningsHistory(symbol)
      ])
      
      // ✅ FIX: Get sector from the correct source
      const sector = fundamentals.sector || 'Technology'
      const sectorConfig = fundamentals.sectorConfig
      
      const quickFeatures = {
        revenueGrowth: calculateQuickGrowthRate(fundamentals.income, 'revenue', 4),
        surpriseHistory: calculateQuickSurprisePattern(earnings.surprises),
        seasonality: getQuickSeasonality(new Date(), sectorConfig),
        sectorConfig: sectorConfig,
        confidenceFactors: {
          dataQuality: fundamentals.income?.length > 4 ? 0.9 : 0.6,
          sectorCoverage: 0.8,
          historicalAccuracy: getQuickSectorAccuracy(sector)
        }
      }
      
      const prediction = predictEarningsSurprise(quickFeatures)
      
      return {
        symbol,
        sector: sector,
        earningsSurprise: prediction.prediction,
        confidence: prediction.confidence,
        drivers: prediction.drivers,
        nextEarningsDate: getNextEarningsDate(earnings.calendar),
        lastUpdate: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`❌ Error in quick earnings analysis for ${symbol}:`, error)
      throw new Error(`Failed to analyze ${symbol}: ${extractErrorMessage(error)}`)
    }
  }
  
  export async function sectorComparisonAnalysis(symbols: string[]) {
    try {
      console.log(`🏢 Sector comparison for ${symbols.join(', ')}`)
      
      const analysisPromises = symbols.map(symbol => analyzeStockML(symbol))
      const analyses = await Promise.all(analysisPromises)
      
      // Group by sector
      const sectorGroups = analyses.reduce((groups, analysis) => {
        const sector = analysis.sector
        if (!groups[sector]) groups[sector] = []
        groups[sector].push(analysis)
        return groups
      }, {} as any)
      
      // Calculate sector averages and rankings
      const sectorComparison = Object.keys(sectorGroups).map(sector => {
        const stocks = sectorGroups[sector]
        const avgEarningsPrediction = stocks.reduce((sum: number, stock: any) => 
          sum + stock.predictions.earnings.prediction, 0) / stocks.length
        const avgPriceUpside = stocks.reduce((sum: number, stock: any) => 
          sum + stock.predictions.priceTarget.upside, 0) / stocks.length
        
        return {
          sector,
          stockCount: stocks.length,
          avgEarningsPrediction: Number(avgEarningsPrediction.toFixed(2)),
          avgPriceUpside: Number(avgPriceUpside.toFixed(2)),
          stocks: stocks.map((s: any) => ({
            symbol: s.symbol,
            earningsPrediction: s.predictions.earnings.prediction,
            priceUpside: s.predictions.priceTarget.upside,
            confidence: s.confidence.overall
          }))
        }
      })
      
      return {
        totalStocks: symbols.length,
        sectorsAnalyzed: Object.keys(sectorGroups).length,
        sectorComparison: sectorComparison.sort((a, b) => b.avgPriceUpside - a.avgPriceUpside),
        topPicks: getTopPicks(analyses),
        timestamp: new Date().toISOString()
      }
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("❌ Error in sector comparison:", error);
        throw new Error(`Failed sector comparison: ${error.message}`);
      } else {
        console.error("❌ Unknown error:", error);
        throw new Error("Failed sector comparison due to unknown error");
      }
    }
  }
  
  // ================================
  // HELPER FUNCTIONS
  // ================================
  
  function calculateQuickGrowthRate(data: any[], field: string, periods: number): number {
    if (!data || data.length < periods + 1) return 0
    const current = data[0]?.[field] || 0
    const previous = data[periods]?.[field] || 0
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }
  
  function calculateQuickSurprisePattern(surprises: any[]): number {
    if (!surprises?.length) return 0
    const recent = surprises.slice(0, 4)
    const avgSurprise = recent.reduce((sum, s) => sum + ((s.actualEarningResult || 0) - (s.estimatedEarning || 0)), 0) / recent.length
    return avgSurprise * 0.1
  }
  
  function getQuickSeasonality(date: Date, sectorConfig: any): number {
    if (!sectorConfig?.seasonality) return 0
    
    const quarter = Math.floor(date.getMonth() / 3) + 1
    
    if (sectorConfig.seasonality.strongQuarters?.includes(quarter)) {
      return sectorConfig.seasonality.factor
    } else if (sectorConfig.seasonality.weakQuarters?.includes(quarter)) {
      return -sectorConfig.seasonality.factor * 0.5
    }
    
    return 0
  }
  
  function getQuickSectorAccuracy(sector: string): number {
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
    
    return accuracyMap[sector] || 0.75
  }
  
  function getNextEarningsDate(calendar: any[]): string | null {
    if (!calendar?.length) return null
    
    const now = new Date()
    const futureEarnings = calendar
      .filter(event => new Date(event.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    return futureEarnings[0]?.date || null
  }
  
  function getTopPicks(analyses: any[]): any[] {
    return analyses
      .filter(analysis => analysis.confidence.overall > 70)
      .sort((a, b) => {
        // Sort by combination of earnings prediction and price upside
        const scoreA = a.predictions.earnings.prediction + (a.predictions.priceTarget.upside / 10)
        const scoreB = b.predictions.earnings.prediction + (b.predictions.priceTarget.upside / 10)
        return scoreB - scoreA
      })
      .slice(0, 5)
      .map(analysis => ({
        symbol: analysis.symbol,
        sector: analysis.sector,
        earningsPrediction: analysis.predictions.earnings.prediction,
        priceUpside: analysis.predictions.priceTarget.upside,
        confidence: analysis.confidence.overall,
        keyDrivers: analysis.predictions.earnings.drivers?.slice(0, 2) || []
      }))
  }
  
  // ================================
  // BATCH PROCESSING FUNCTIONS
  // ================================
  
  export async function batchAnalysis(
    symbols: string[],
    options: {
      maxConcurrent?: number
      includeDetails?: boolean
    } = {}
  ) {
    const { maxConcurrent = 5, includeDetails = false } = options
  
    console.log(`🔄 Batch analysis for ${symbols.length} symbols`)
  
    const results: any[] = []
    const errors: { symbol: string; error: string }[] = []
  
    for (let i = 0; i < symbols.length; i += maxConcurrent) {
      const batch = symbols.slice(i, i + maxConcurrent)
  
      const batchPromises = batch.map(async (symbol) => {
        try {
          if (includeDetails) {
            return await analyzeStockML(symbol)
          } else {
            return await quickEarningsAnalysis(symbol)
          }
        } catch (error) {
          console.error(`Error analyzing ${symbol}:`, error)
          errors.push({
            symbol,
            error: extractErrorMessage(error),
          })
          return null
        }
      })
  
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter((r) => r !== null))
  
      if (i + maxConcurrent < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 1s delay
      }
    }
  
    return {
      successful: results.length,
      failed: errors.length,
      total: symbols.length,
      results,
      errors,
      timestamp: new Date().toISOString(),
    }
  }
  
  // ================================
  // PERFORMANCE MONITORING
  // ================================
  
  export async function analyzeWithPerformanceMetrics(symbol: string) {
    const startTime = Date.now()
    
    try {
      const result = await analyzeStockML(symbol)
      const endTime = Date.now()
      
      return {
        ...result,
        performance: {
          analysisTime: endTime - startTime,
          dataFetchTime: 'N/A', // Would track individual fetch times
          featureEngineeringTime: 'N/A',
          predictionTime: 'N/A',
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
        }
      }
    } catch (error: unknown) {
      const endTime = Date.now();
      
      if (error instanceof Error) {
        throw new Error(`Analysis failed after ${endTime - startTime}ms: ${error.message}`);
      } else {
        throw new Error(`Analysis failed after ${endTime - startTime}ms due to unknown error`);
      }
    }
  }
  
  // ================================
  // ADVANCED ANALYSIS FUNCTIONS
  // ================================
  
  export async function compareStocksInSector(symbols: string[], targetSector?: string) {
    try {
      console.log(`🔍 Comparing ${symbols.length} stocks${targetSector ? ` in ${targetSector} sector` : ''}`)
      
      const analyses = await Promise.all(
        symbols.map(symbol => analyzeStockML(symbol))
      )
      
      // Filter by sector if specified
      const filteredAnalyses = targetSector 
        ? analyses.filter(analysis => analysis.sector === targetSector)
        : analyses
      
      if (filteredAnalyses.length === 0) {
        throw new Error(`No stocks found${targetSector ? ` in ${targetSector} sector` : ''}`)
      }
      
      // Calculate relative scores
      const withRelativeScores = filteredAnalyses.map(analysis => {
        const sectorAnalyses = filteredAnalyses.filter(a => a.sector === analysis.sector)
        const avgEarnings = sectorAnalyses.reduce((sum, a) => sum + a.predictions.earnings.prediction, 0) / sectorAnalyses.length
        const avgUpside = sectorAnalyses.reduce((sum, a) => sum + a.predictions.priceTarget.upside, 0) / sectorAnalyses.length
        
        return {
          ...analysis,
          relativeScores: {
            earningsVsSector: analysis.predictions.earnings.prediction - avgEarnings,
            upsideVsSector: analysis.predictions.priceTarget.upside - avgUpside,
            overallRanking: calculateOverallRanking(analysis, sectorAnalyses)
          }
        }
      })
      
      // Sort by overall ranking
      const ranked = withRelativeScores.sort((a, b) => a.relativeScores.overallRanking - b.relativeScores.overallRanking)
      
      return {
        totalAnalyzed: filteredAnalyses.length,
        sector: targetSector || 'Mixed',
        rankings: ranked.map((analysis, index) => ({
          rank: index + 1,
          symbol: analysis.symbol,
          sector: analysis.sector,
          earningsPrediction: analysis.predictions.earnings.prediction,
          priceUpside: analysis.predictions.priceTarget.upside,
          confidence: analysis.confidence.overall,
          relativeScores: analysis.relativeScores,
          keyStrengths: getKeyStrengths(analysis),
          keyRisks: getKeyRisks(analysis)
        })),
        sectorSummary: {
          avgEarningsPrediction: ranked.reduce((sum, a) => sum + a.predictions.earnings.prediction, 0) / ranked.length,
          avgPriceUpside: ranked.reduce((sum, a) => sum + a.predictions.priceTarget.upside, 0) / ranked.length,
          avgConfidence: ranked.reduce((sum, a) => sum + a.confidence.overall, 0) / ranked.length,
          topPick: ranked[0]?.symbol || null,
          riskiest: ranked[ranked.length - 1]?.symbol || null
        },
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ Error in sector comparison:', error)
      throw new Error(`Failed to compare stocks: ${extractErrorMessage(error)}`)
    }
  }
  
  export async function analyzeTrendingStocks(symbols: string[], timeframe: 'short' | 'medium' | 'long' = 'medium') {
    try {
      console.log(`📈 Analyzing trending stocks for ${timeframe}-term outlook`)
      
      const analyses = await Promise.all(
        symbols.map(symbol => analyzeStockML(symbol))
      )
      
      // Weight factors based on timeframe
      const weights = getTrendingWeights(timeframe)
      
      const trendingScores = analyses.map(analysis => {
        const score = calculateTrendingScore(analysis, weights)
        return {
          ...analysis,
          trendingScore: score,
          trendingFactors: getTrendingFactors(analysis, timeframe)
        }
      })
      
      // Sort by trending score
      const sortedByTrending = trendingScores.sort((a, b) => b.trendingScore - a.trendingScore)
      
      return {
        timeframe,
        totalAnalyzed: analyses.length,
        trendingRankings: sortedByTrending.map((analysis, index) => ({
          rank: index + 1,
          symbol: analysis.symbol,
          sector: analysis.sector,
          trendingScore: analysis.trendingScore,
          momentum: analysis.features.technical.rsiScore > 60 ? 'Strong' : 
                   analysis.features.technical.rsiScore > 40 ? 'Moderate' : 'Weak',
          catalysts: analysis.trendingFactors.catalysts,
          timeframeFit: analysis.trendingFactors.timeframeFit,
          riskLevel: analysis.riskAssessment.overall
        })),
        insights: {
          strongestMomentum: sortedByTrending.slice(0, 3).map(a => a.symbol),
          sectorsInFocus: getMostRepresentedSectors(sortedByTrending.slice(0, 10)),
          riskDistribution: getRiskDistribution(sortedByTrending),
          keyThemes: getKeyTrendingThemes(sortedByTrending.slice(0, 10))
        },
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ Error in trending analysis:', error)
      throw new Error(`Failed to analyze trending stocks: ${extractErrorMessage(error)}`)
    }
  }
  
  // ================================
  // HELPER FUNCTIONS FOR ADVANCED ANALYSIS
  // ================================
  
  function calculateOverallRanking(analysis: any, sectorAnalyses: any[]): number {
    // Lower number = better ranking
    let rank = 1
    
    sectorAnalyses.forEach(other => {
      if (other.symbol === analysis.symbol) return
      
      const otherScore = (other.predictions.earnings.prediction * 0.4) + 
                       (other.predictions.priceTarget.upside * 0.4) + 
                       (other.confidence.overall * 0.2)
      const analysisScore = (analysis.predictions.earnings.prediction * 0.4) + 
                           (analysis.predictions.priceTarget.upside * 0.4) + 
                           (analysis.confidence.overall * 0.2)
      
      if (otherScore > analysisScore) rank++
    })
    
    return rank
  }
  
  function getKeyStrengths(analysis: any): string[] {
    const strengths = []
    
    if (analysis.predictions.earnings.prediction > 5) strengths.push('Strong earnings outlook')
    if (analysis.predictions.priceTarget.upside > 15) strengths.push('High upside potential')
    if (analysis.confidence.overall > 80) strengths.push('High confidence prediction')
    if (analysis.features.fundamental.revenueGrowth > 15) strengths.push('Revenue acceleration')
    if (analysis.features.technical.rsiScore > 60) strengths.push('Technical momentum')
    
    return strengths.slice(0, 3)
  }
  
  function getKeyRisks(analysis: any): string[] {
    return analysis.riskAssessment.factors?.slice(0, 3).map((risk: any) => risk.factor) || []
  }
  
  function getTrendingWeights(timeframe: string): any {
    const weights = {
      short: { momentum: 0.4, technical: 0.3, sentiment: 0.2, fundamental: 0.1 },
      medium: { momentum: 0.25, technical: 0.25, sentiment: 0.25, fundamental: 0.25 },
      long: { momentum: 0.1, technical: 0.2, sentiment: 0.2, fundamental: 0.5 }
    }
    
    return weights[timeframe as keyof typeof weights] || weights.medium
  }
  
  function calculateTrendingScore(analysis: any, weights: any): number {
    const momentumScore = analysis.features.technical.rsiScore || 50
    const technicalScore = analysis.features.technical.priceVsSMA ? 
      (analysis.features.technical.priceVsSMA - 1) * 100 + 50 : 50
    const sentimentScore = (analysis.features.sentiment.analystSentiment + 2) * 25 // Convert -2 to +2 range to 0-100
    const fundamentalScore = Math.min(100, Math.max(0, analysis.features.fundamental.revenueGrowth + 50))
    
    return (
      momentumScore * weights.momentum +
      technicalScore * weights.technical +
      sentimentScore * weights.sentiment +
      fundamentalScore * weights.fundamental
    )
  }
  
  function getTrendingFactors(analysis: any, timeframe: string): any {
    const catalysts = []
    
    if (analysis.features.fundamental.revenueGrowth > 10) catalysts.push('Revenue growth')
    if (analysis.features.sentiment.analystSentiment > 0.5) catalysts.push('Analyst upgrades')
    if (analysis.features.technical.rsiScore > 65) catalysts.push('Technical breakout')
    if (analysis.features.market.seasonality > 0) catalysts.push('Seasonal factors')
    
    const timeframeFit = timeframe === 'short' && analysis.features.technical.rsiScore > 60 ? 'High' :
                        timeframe === 'long' && analysis.features.fundamental.revenueGrowth > 10 ? 'High' :
                        'Medium'
    
    return { catalysts: catalysts.slice(0, 3), timeframeFit }
  }
  
  function getMostRepresentedSectors(analyses: any[]): string[] {
    const sectorCounts: { [key: string]: number } = {}
    
    analyses.forEach(analysis => {
      sectorCounts[analysis.sector] = (sectorCounts[analysis.sector] || 0) + 1
    })
    
    return Object.entries(sectorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sector]) => sector)
  }
  
  function getRiskDistribution(analyses: any[]): any {
    const distribution = { Low: 0, Medium: 0, High: 0, 'Very High': 0 }
    
    analyses.forEach(analysis => {
      const risk = analysis.riskAssessment.overall
      distribution[risk as keyof typeof distribution]++
    })
    
    return distribution
  }
  
  function getKeyTrendingThemes(analyses: any[]): string[] {
    const themes = []
    
    const avgGrowth = analyses.reduce((sum, a) => sum + a.features.fundamental.revenueGrowth, 0) / analyses.length
    const avgSentiment = analyses.reduce((sum, a) => sum + a.features.sentiment.analystSentiment, 0) / analyses.length
    
    if (avgGrowth > 15) themes.push('Growth acceleration theme')
    if (avgSentiment > 0.5) themes.push('Positive sentiment wave')
    
    const techCount = analyses.filter(a => a.sector === 'Technology').length
    if (techCount > analyses.length * 0.4) themes.push('Technology sector rotation')
    
    return themes.slice(0, 3)
  }