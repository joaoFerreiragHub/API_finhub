// src/utils/sectorConfig.ts - FIXED VERSION

export interface SectorConfig {
    name: string
    keyMetrics: {
      primary: string[]    // Métricas mais importantes para este setor
      secondary: string[]  // Métricas complementares
    }
    weights: {
      // Pesos ML ajustados por setor
      fundamental: number
      technical: number
      sentiment: number
      macro: number
    }
    riskFactors: {
      // Riscos específicos do setor
      common: string[]
      thresholds: {
        [key: string]: number
      }
    }
    seasonality: {
      // Padrões sazonais do setor
      strongQuarters: number[]
      weakQuarters: number[]
      factor: number
    }
    benchmarks: {
      // Benchmarks típicos do setor
      avgPE: number
      avgMargin: number
      avgGrowth: number
      avgROE: number
    }
  }
  
  export const SECTOR_CONFIGS: { [key: string]: SectorConfig } = {
    'Technology': {
      name: 'Technology',
      keyMetrics: {
        primary: ['revenueGrowth', 'marginTrend', 'rAndDSpending', 'cloudRevenue'],
        secondary: ['userGrowth', 'subscriptionRevenue', 'platformMetrics']
      },
      weights: {
        fundamental: 0.45, // Tech é muito sobre fundamentals
        technical: 0.20,
        sentiment: 0.25,   // High sentiment sensitivity
        macro: 0.10
      },
      riskFactors: {
        common: ['Regulatory Pressure', 'Competition', 'Innovation Risk'],
        thresholds: {
          marginDecline: -2.0,
          revenueDeceleration: -10.0,
          competitorThreat: 0.3
        }
      },
      seasonality: {
        strongQuarters: [4, 1], // Q4 (holiday) e Q1 (enterprise budgets)
        weakQuarters: [3],      // Q3 summer slowdown
        factor: 1.2
      },
      benchmarks: {
        avgPE: 28.5,
        avgMargin: 0.25,
        avgGrowth: 0.15,
        avgROE: 0.18
      }
    },
  
    'Communication Services': {
      name: 'Communication Services',
      keyMetrics: {
        primary: ['userGrowth', 'adRevenue', 'subscriptionRevenue', 'engagementMetrics'],
        secondary: ['contentCosts', 'infrastructureSpending', 'internationalExpansion']
      },
      weights: {
        fundamental: 0.40,
        technical: 0.15,
        sentiment: 0.35,   // Very sentiment driven
        macro: 0.10
      },
      riskFactors: {
        common: ['Ad Market Volatility', 'Content Costs', 'User Acquisition'],
        thresholds: {
          userGrowthSlowdown: -5.0,
          adRevenueDecline: -8.0,
          contentCostInflation: 15.0
        }
      },
      seasonality: {
        strongQuarters: [4],    // Holiday advertising
        weakQuarters: [1, 3],
        factor: 1.15
      },
      benchmarks: {
        avgPE: 22.8,
        avgMargin: 0.20,
        avgGrowth: 0.12,
        avgROE: 0.15
      }
    },
  
    'Healthcare': {
      name: 'Healthcare',
      keyMetrics: {
        primary: ['pipelineProgress', 'regulatoryApprovals', 'clinicalTrials', 'patentExpiries'],
        secondary: ['marketPenetration', 'pricingPressure', 'reimbursementRates']
      },
      weights: {
        fundamental: 0.50,   // Very fundamental driven
        technical: 0.10,
        sentiment: 0.20,
        macro: 0.20        // Regulatory environment matters
      },
      riskFactors: {
        common: ['Regulatory Risk', 'Patent Expiry', 'Clinical Trial Failures'],
        thresholds: {
          patentCliff: 24,     // months to major patent expiry
          trialFailure: 0.4,   // probability
          pricingPressure: -5.0
        }
      },
      seasonality: {
        strongQuarters: [1, 4], // Insurance resets + year-end
        weakQuarters: [3],
        factor: 1.1
      },
      benchmarks: {
        avgPE: 18.2,
        avgMargin: 0.35,
        avgGrowth: 0.08,
        avgROE: 0.12
      }
    },
  
    'Financial Services': {
      name: 'Financial Services',
      keyMetrics: {
        primary: ['netInterestMargin', 'creditLosses', 'loanGrowth', 'depositGrowth'],
        secondary: ['efficiencyRatio', 'capitalRatio', 'tradingRevenue']
      },
      weights: {
        fundamental: 0.35,
        technical: 0.15,
        sentiment: 0.20,
        macro: 0.30        // Very macro sensitive
      },
      riskFactors: {
        common: ['Interest Rate Risk', 'Credit Risk', 'Regulatory Changes'],
        thresholds: {
          creditLossSpike: 50.0,    // % increase in provisions
          marginCompression: -0.5,   // NIM decline
          capitalShortfall: 0.08     // regulatory minimum
        }
      },
      seasonality: {
        strongQuarters: [1, 4],
        weakQuarters: [2],
        factor: 1.05
      },
      benchmarks: {
        avgPE: 12.5,
        avgMargin: 0.28,
        avgGrowth: 0.06,
        avgROE: 0.11
      }
    },
  
    'Consumer Discretionary': {
      name: 'Consumer Discretionary',
      keyMetrics: {
        primary: ['sameStoreGrowth', 'inventoryTurnover', 'brandStrength', 'ecommerceGrowth'],
        secondary: ['consumerSentiment', 'disposableIncome', 'retailFootprint']
      },
      weights: {
        fundamental: 0.35,
        technical: 0.20,
        sentiment: 0.30,    // Consumer sentiment matters
        macro: 0.15
      },
      riskFactors: {
        common: ['Economic Slowdown', 'Supply Chain Disruption', 'Changing Preferences'],
        thresholds: {
          inventoryBuildup: 20.0,
          marginPressure: -3.0,
          trafficDecline: -8.0
        }
      },
      seasonality: {
        strongQuarters: [4],     // Holiday shopping
        weakQuarters: [1, 2],    // Post-holiday slowdown
        factor: 1.3
      },
      benchmarks: {
        avgPE: 16.8,
        avgMargin: 0.12,
        avgGrowth: 0.10,
        avgROE: 0.14
      }
    },
  
    'Consumer Staples': {
      name: 'Consumer Staples',
      keyMetrics: {
        primary: ['organicGrowth', 'marketShare', 'brandPower', 'distributionReach'],
        secondary: ['commodityCosts', 'emergingMarkets', 'healthTrends']
      },
      weights: {
        fundamental: 0.40,
        technical: 0.15,
        sentiment: 0.20,
        macro: 0.25        // Commodity sensitive
      },
      riskFactors: {
        common: ['Commodity Price Inflation', 'Health Trends', 'Private Label Competition'],
        thresholds: {
          commodityCostInflation: 10.0,
          marketShareLoss: -2.0,
          healthTrendShift: 0.3
        }
      },
      seasonality: {
        strongQuarters: [2, 3],  // Summer/back-to-school
        weakQuarters: [1],
        factor: 1.05
      },
      benchmarks: {
        avgPE: 19.5,
        avgMargin: 0.18,
        avgGrowth: 0.05,
        avgROE: 0.16
      }
    },

    // ✅ NEW: Additional sector configurations
    'Energy': {
      name: 'Energy',
      keyMetrics: {
        primary: ['oilPrices', 'productionVolumes', 'reserves', 'capexEfficiency'],
        secondary: ['refineryMargins', 'renewableTransition', 'geopoliticalRisk']
      },
      weights: {
        fundamental: 0.35,
        technical: 0.25,    // Commodity sensitive
        sentiment: 0.15,
        macro: 0.25        // Very macro sensitive
      },
      riskFactors: {
        common: ['Commodity Price Volatility', 'Regulatory Changes', 'Transition Risk'],
        thresholds: {
          oilPriceVolatility: 30.0,
          capexOverrun: 20.0,
          reserveDepletion: -10.0
        }
      },
      seasonality: {
        strongQuarters: [1, 4], // Winter demand
        weakQuarters: [2, 3],   // Lower demand
        factor: 1.1
      },
      benchmarks: {
        avgPE: 12.0,
        avgMargin: 0.15,
        avgGrowth: 0.03,
        avgROE: 0.08
      }
    },

    'Industrials': {
      name: 'Industrials',
      keyMetrics: {
        primary: ['orderBacklog', 'capacity utilization', 'operatingLeverage', 'cyclePosition'],
        secondary: ['infrastructureSpend', 'automation', 'supplyChain']
      },
      weights: {
        fundamental: 0.40,
        technical: 0.20,
        sentiment: 0.20,
        macro: 0.20        // Economic cycle sensitive
      },
      riskFactors: {
        common: ['Economic Slowdown', 'Supply Chain Disruption', 'Labor Shortages'],
        thresholds: {
          orderDecline: -15.0,
          marginPressure: -3.0,
          capacityUtilization: 0.7
        }
      },
      seasonality: {
        strongQuarters: [2, 3], // Construction season
        weakQuarters: [1],      // Winter slowdown
        factor: 1.1
      },
      benchmarks: {
        avgPE: 18.0,
        avgMargin: 0.12,
        avgGrowth: 0.06,
        avgROE: 0.13
      }
    },

    'Materials': {
      name: 'Materials',
      keyMetrics: {
        primary: ['commodityPrices', 'productionCosts', 'demandTrends', 'inventoryLevels'],
        secondary: ['sustainability', 'recycling', 'geographicExposure']
      },
      weights: {
        fundamental: 0.30,
        technical: 0.30,    // Commodity cycle driven
        sentiment: 0.15,
        macro: 0.25        // Global demand sensitive
      },
      riskFactors: {
        common: ['Commodity Price Volatility', 'Environmental Regulations', 'China Demand'],
        thresholds: {
          commodityVolatility: 25.0,
          demandDecline: -12.0,
          costInflation: 15.0
        }
      },
      seasonality: {
        strongQuarters: [2, 3], // Construction season
        weakQuarters: [4, 1],   // Winter slowdown
        factor: 1.05
      },
      benchmarks: {
        avgPE: 14.5,
        avgMargin: 0.10,
        avgGrowth: 0.04,
        avgROE: 0.11
      }
    },

    'Utilities': {
      name: 'Utilities',
      keyMetrics: {
        primary: ['regulatoryReturn', 'rateBase', 'renewableTransition', 'customerGrowth'],
        secondary: ['weatherPatterns', 'energyEfficiency', 'gridModernization']
      },
      weights: {
        fundamental: 0.45,   // Regulatory driven
        technical: 0.10,
        sentiment: 0.15,
        macro: 0.30        // Interest rate sensitive
      },
      riskFactors: {
        common: ['Interest Rate Risk', 'Regulatory Changes', 'Weather Variability'],
        thresholds: {
          interestRateRise: 100,  // basis points
          regulatoryReturn: 0.08,
          weatherVariability: 0.15
        }
      },
      seasonality: {
        strongQuarters: [1, 3], // Heating and cooling seasons
        weakQuarters: [2, 4],
        factor: 1.08
      },
      benchmarks: {
        avgPE: 16.5,
        avgMargin: 0.20,
        avgGrowth: 0.04,
        avgROE: 0.10
      }
    },

    'Real Estate': {
      name: 'Real Estate',
      keyMetrics: {
        primary: ['occupancyRates', 'rentGrowth', 'capRates', 'fundsFromOperations'],
        secondary: ['developmentPipeline', 'geographicExposure', 'tenantQuality']
      },
      weights: {
        fundamental: 0.40,
        technical: 0.15,
        sentiment: 0.20,
        macro: 0.25        // Interest rate and economic sensitive
      },
      riskFactors: {
        common: ['Interest Rate Risk', 'Economic Slowdown', 'Oversupply Risk'],
        thresholds: {
          occupancyDecline: -5.0,
          interestRateRise: 100,  // basis points
          oversupply: 0.15
        }
      },
      seasonality: {
        strongQuarters: [2, 3], // Moving season
        weakQuarters: [1, 4],
        factor: 1.05
      },
      benchmarks: {
        avgPE: 18.0,
        avgMargin: 0.25,
        avgGrowth: 0.05,
        avgROE: 0.08
      }
    }
  }
  
  // Função para obter configuração do setor
  export function getSectorConfig(sector: string): SectorConfig {
    // Normalize sector name
    const normalizedSector = sector?.trim()
    
    if (!normalizedSector) {
      console.warn('Empty sector provided, using Technology defaults')
      return SECTOR_CONFIGS['Technology']
    }
    
    // Try exact match first
    if (SECTOR_CONFIGS[normalizedSector]) {
      return SECTOR_CONFIGS[normalizedSector]
    }
    
    // Try partial matches with better mapping
    const sectorMappings: { [key: string]: string } = {
      // Common variations and mappings
      'tech': 'Technology',
      'technology': 'Technology',
      'information technology': 'Technology',
      'software': 'Technology',
      'hardware': 'Technology',
      
      'communication': 'Communication Services',
      'communications': 'Communication Services',
      'media': 'Communication Services',
      'telecommunications': 'Communication Services',
      'telecom': 'Communication Services',
      
      'health': 'Healthcare',
      'healthcare': 'Healthcare',
      'biotechnology': 'Healthcare',
      'biotech': 'Healthcare',
      'pharmaceuticals': 'Healthcare',
      'pharma': 'Healthcare',
      
      'financial': 'Financial Services',
      'financials': 'Financial Services',
      'banks': 'Financial Services',
      'banking': 'Financial Services',
      'insurance': 'Financial Services',
      
      'consumer discretionary': 'Consumer Discretionary',
      'consumer cyclical': 'Consumer Discretionary',
      'retail': 'Consumer Discretionary',
      'automotive': 'Consumer Discretionary',
      
      'consumer staples': 'Consumer Staples',
      'consumer defensive': 'Consumer Staples',
      'food': 'Consumer Staples',
      'beverage': 'Consumer Staples',
      
      'energy': 'Energy',
      'oil': 'Energy',
      'gas': 'Energy',
      'petroleum': 'Energy',
      
      'industrial': 'Industrials',
      'industrials': 'Industrials',
      'aerospace': 'Industrials',
      'defense': 'Industrials',
      'manufacturing': 'Industrials',
      
      'material': 'Materials',
      'materials': 'Materials',
      'mining': 'Materials',
      'chemicals': 'Materials',
      'metals': 'Materials',
      
      'utility': 'Utilities',
      'utilities': 'Utilities',
      'electric': 'Utilities',
      'power': 'Utilities',
      
      'real estate': 'Real Estate',
      'realestate': 'Real Estate',
      'reit': 'Real Estate',
      'reits': 'Real Estate'
    }
    
    // Check mappings first
    const lowerSector = normalizedSector.toLowerCase()
    if (sectorMappings[lowerSector]) {
      return SECTOR_CONFIGS[sectorMappings[lowerSector]]
    }
    
    // Try partial matches
    const sectorKeys = Object.keys(SECTOR_CONFIGS)
    const partialMatch = sectorKeys.find(key => 
      key.toLowerCase().includes(lowerSector) ||
      lowerSector.includes(key.toLowerCase())
    )
    
    if (partialMatch) {
      return SECTOR_CONFIGS[partialMatch]
    }
    
    // Default to Technology if no match (most common)
    console.warn(`Sector '${sector}' not found, using Technology defaults`)
    return SECTOR_CONFIGS['Technology']
  }
  
  // ✅ FIX: Implement the missing function
  export async function calculateDynamicBenchmarks(sector: string, peers: string[]): Promise<any> {
    try {
      console.log(`📊 Calculating dynamic benchmarks for ${sector} sector with ${peers.length} peers`)
      
      // Get static benchmarks as baseline
      const staticBenchmarks = getSectorConfig(sector).benchmarks
      
      if (!peers.length) {
        console.log('No peers provided, using static benchmarks')
        return staticBenchmarks
      }
      
      // TODO: Future implementation would fetch real peer data
      // For now, we'll return static benchmarks with small adjustments
      // based on peer count (more peers = more confidence in benchmarks)
      
      const confidence = Math.min(1, peers.length / 10) // 10+ peers = full confidence
      const adjustment = 1 + ((confidence - 0.5) * 0.1) // ±5% adjustment
      
      return {
        avgPE: Number((staticBenchmarks.avgPE * adjustment).toFixed(1)),
        avgMargin: Number((staticBenchmarks.avgMargin * adjustment).toFixed(3)),
        avgGrowth: Number((staticBenchmarks.avgGrowth * adjustment).toFixed(3)),
        avgROE: Number((staticBenchmarks.avgROE * adjustment).toFixed(3)),
        // Add metadata
        peerCount: peers.length,
        confidence: confidence,
        lastUpdated: new Date().toISOString(),
        methodology: 'Static benchmarks with peer-adjusted confidence'
      }
      
    } catch (error) {
      console.warn('Failed to calculate dynamic benchmarks, using static config:', error)
      return getSectorConfig(sector).benchmarks
    }
  }

  // ✅ NEW: Additional utility functions
  export function getAllSectors(): string[] {
    return Object.keys(SECTOR_CONFIGS)
  }

  export function getSectorsByWeight(weightType: keyof SectorConfig['weights']): Array<{sector: string, weight: number}> {
    return Object.entries(SECTOR_CONFIGS)
      .map(([sector, config]) => ({
        sector,
        weight: config.weights[weightType]
      }))
      .sort((a, b) => b.weight - a.weight)
  }

  export function getSectorRiskProfile(sector: string): 'Low' | 'Medium' | 'High' {
    const config = getSectorConfig(sector)
    const riskFactorsCount = config.riskFactors.common.length
    const macroSensitivity = config.weights.macro
    
    if (riskFactorsCount >= 4 || macroSensitivity >= 0.25) return 'High'
    if (riskFactorsCount >= 3 || macroSensitivity >= 0.15) return 'Medium'
    return 'Low'
  }

  export function isSectorCyclical(sector: string): boolean {
    const cyclicalSectors = ['Energy', 'Materials', 'Industrials', 'Consumer Discretionary', 'Financial Services']
    return cyclicalSectors.includes(sector)
  }

  export function getSectorSeasonalStrength(sector: string, quarter: number): 'Strong' | 'Weak' | 'Neutral' {
    const config = getSectorConfig(sector)
    
    if (config.seasonality.strongQuarters.includes(quarter)) return 'Strong'
    if (config.seasonality.weakQuarters.includes(quarter)) return 'Weak'
    return 'Neutral'
  }