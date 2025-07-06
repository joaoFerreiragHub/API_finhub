// models/NewsSource.ts

import { NewsCategory } from '../types/news'

export interface NewsSource {
  id: string
  name: string
  type: SourceType
  enabled: boolean
  config: SourceConfig
  status: SourceStatus
  categories: NewsCategory[]
  reliability: number // 1-5 (5 = mais confiável)
  priority: number // 1-10 (10 = maior prioridade)
  metadata: SourceMetadata
  createdAt: Date
  updatedAt: Date
}

export type SourceType = 'fmp' | 'newsapi' | 'alphavantage' | 'polygon' | 'yahoo' | 'rss' | 'scraper' | 'webhook'

export interface SourceConfig {
  apiKey?: string
  endpoint: string
  headers?: Record<string, string>
  rateLimit: RateLimitConfig
  timeout: number // milliseconds
  retries: number
  enabled: boolean
  maxArticles: number
  priority?: number // 1-10, onde 10 é mais prioritário
  refreshInterval: number // minutes
  filters?: SourceFilters
}

export interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour?: number
  requestsPerDay?: number
  burstLimit?: number // máximo de requests em rajada
}

export interface SourceFilters {
  categories?: NewsCategory[]
  keywords?: string[]
  excludeKeywords?: string[]
  minWordCount?: number
  maxAge?: number // hours
  requireImage?: boolean
  languages?: string[]
}

export interface SourceStatus {
  isActive: boolean
  health: 'healthy' | 'degraded' | 'down' | 'maintenance'
  lastCheck: Date
  lastSuccess: Date
  lastError?: Date
  errorCount: number
  successRate: number // 0-100
  averageResponseTime: number // milliseconds
  requestsToday: number
  requestsThisHour: number
  limitReached: boolean
  nextAvailableRequest?: Date
}

export interface SourceMetadata {
  description: string
  website?: string
  documentation?: string
  supportEmail?: string
  pricing?: {
    freeTier: {
      requestsPerDay: number
      features: string[]
    }
    paidPlans?: Array<{
      name: string
      price: number
      requestsPerDay: number
      features: string[]
    }>
  }
  tags: string[]
  version: string
}

// DTOs para criação e atualização
export interface CreateNewsSourceDto {
  name: string
  type: SourceType
  config: SourceConfig
  categories: NewsCategory[]
  reliability?: number
  priority?: number
  metadata: Omit<SourceMetadata, 'version'>
}

export interface UpdateNewsSourceDto {
  name?: string
  enabled?: boolean
  config?: Partial<SourceConfig>
  categories?: NewsCategory[]
  reliability?: number
  priority?: number
  metadata?: Partial<SourceMetadata>
}

// Configurações predefinidas para cada tipo de fonte
export const DefaultSourceConfigs: Record<SourceType, Partial<SourceConfig>> = {
  fmp: {
    endpoint: 'https://financialmodelingprep.com/api/v3',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 250 // free tier
    },
    timeout: 10000,
    retries: 3,
    maxArticles: 50,
    refreshInterval: 15
  },
  newsapi: {
    endpoint: 'https://newsapi.org/v2',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 1000 // free tier
    },
    timeout: 8000,
    retries: 3,
    maxArticles: 100,
    refreshInterval: 10
  },
  alphavantage: {
    endpoint: 'https://www.alphavantage.co/query',
    rateLimit: {
      requestsPerMinute: 5, // free tier limitation
      requestsPerDay: 500
    },
    timeout: 15000,
    retries: 2,
    maxArticles: 20,
    refreshInterval: 30
  },
  polygon: {
    endpoint: 'https://api.polygon.io/v2',
    rateLimit: {
      requestsPerMinute: 5, // free tier
      requestsPerDay: 1000
    },
    timeout: 10000,
    retries: 3,
    maxArticles: 50,
    refreshInterval: 20
  },
  yahoo: {
    endpoint: 'https://query2.finance.yahoo.com',
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 5000
    },
    timeout: 10000,
    retries: 3,
    maxArticles: 30,
    refreshInterval: 300 // 5 minutes
  },
  rss: {
    endpoint: '', // será definido por cada feed
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100
    },
    timeout: 5000,
    retries: 2,
    maxArticles: 30,
    refreshInterval: 60
  },
  scraper: {
    endpoint: '', // será definido por cada site
    rateLimit: {
      requestsPerMinute: 5, // mais conservador para scraping
      requestsPerHour: 50
    },
    timeout: 20000,
    retries: 1,
    maxArticles: 20,
    refreshInterval: 120
  },
  webhook: {
    endpoint: '', // será o endpoint que recebe webhooks
    rateLimit: {
      requestsPerMinute: 100, // webhooks podem ser mais frequentes
      requestsPerHour: 1000
    },
    timeout: 5000,
    retries: 0, // webhooks não fazem retry
    maxArticles: 1, // um artigo por webhook
    refreshInterval: 0 // webhooks são em tempo real
  }
}

// Fontes predefinidas para inicialização
// FIXED: Predefined Sources with correct typing
export const PredefinedSources: CreateNewsSourceDto[] = [
    {
      name: 'Financial Modeling Prep',
      type: 'fmp',
      config: {
        ...DefaultSourceConfigs.fmp,
        endpoint: 'https://financialmodelingprep.com/api/v3',
        filters: {
          categories: ['market', 'earnings', 'economy'],
          minWordCount: 50
        }
      } as SourceConfig,
      categories: ['market', 'earnings', 'economy'],
      reliability: 5,
      priority: 9,
      metadata: {
        description: 'API financeira premium com notícias, dados de mercado e análises',
        website: 'https://financialmodelingprep.com',
        documentation: 'https://financialmodelingprep.com/developer/docs',
        pricing: {
          freeTier: {
            requestsPerDay: 250,
            features: ['Notícias básicas', 'Dados históricos', 'APIs fundamentais']
          },
          paidPlans: [
            {
              name: 'Starter',
              price: 14,
              requestsPerDay: 2000,
              features: ['Todas as APIs', 'Dados em tempo real', 'Suporte prioritário']
            }
          ]
        },
        tags: ['finance', 'stocks', 'premium', 'api']
        // REMOVED: version - not part of SourceMetadata type
      }
    },
    {
      name: 'News API',
      type: 'newsapi',
      config: {
        ...DefaultSourceConfigs.newsapi,
        endpoint: 'https://newsapi.org/v2',
        filters: {
          keywords: ['finance', 'stock', 'market', 'economy', 'investment'],
          languages: ['en'],
          requireImage: false
        }
      } as SourceConfig,
      categories: ['general', 'market', 'economy'],
      reliability: 4,
      priority: 8,
      metadata: {
        description: 'API de notícias globais com cobertura abrangente',
        website: 'https://newsapi.org',
        documentation: 'https://newsapi.org/docs',
        pricing: {
          freeTier: {
            requestsPerDay: 1000,
            features: ['Notícias atuais', 'Pesquisa básica', 'Múltiplas fontes']
          }
        },
        tags: ['news', 'global', 'general']
        // REMOVED: version - not part of SourceMetadata type
      }
    },
    {
      name: 'Alpha Vantage News',
      type: 'alphavantage',
      config: {
        ...DefaultSourceConfigs.alphavantage,
        endpoint: 'https://www.alphavantage.co/query',
        filters: {
          categories: ['market', 'earnings'],
          minWordCount: 100
        }
      } as SourceConfig,
      categories: ['market', 'earnings'],
      reliability: 4,
      priority: 7,
      metadata: {
        description: 'Notícias financeiras com análise de sentimento integrada',
        website: 'https://www.alphavantage.co',
        documentation: 'https://www.alphavantage.co/documentation/',
        pricing: {
          freeTier: {
            requestsPerDay: 500,
            features: ['Notícias básicas', 'Análise de sentimento', 'Dados históricos']
          }
        },
        tags: ['finance', 'sentiment', 'analysis']
        // REMOVED: version - not part of SourceMetadata type
      }
    }
  ]

// Utility class para gestão de fontes
export class NewsSourceManager {
  
  // Validar configuração de uma fonte
  static validateSourceConfig(config: SourceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!config.endpoint) {
      errors.push('Endpoint é obrigatório')
    }
    
    if (!config.rateLimit || config.rateLimit.requestsPerMinute <= 0) {
      errors.push('Rate limit deve ser maior que 0')
    }
    
    if (config.timeout && config.timeout < 1000) {
      errors.push('Timeout deve ser pelo menos 1000ms')
    }
    
    if (config.retries && config.retries < 0) {
      errors.push('Retries não pode ser negativo')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // Calcular prioridade baseada em múltiplos fatores
  static calculatePriority(source: NewsSource): number {
    let priority = source.priority || 5
    
    // Ajustar baseado na reliability
    priority += (source.reliability - 3) * 0.5
    
    // Ajustar baseado no status
    if (source.status.health === 'healthy') {
      priority += 1
    } else if (source.status.health === 'down') {
      priority -= 3
    }
    
    // Ajustar baseado na success rate
    if (source.status.successRate > 95) {
      priority += 0.5
    } else if (source.status.successRate < 80) {
      priority -= 1
    }
    
    return Math.max(1, Math.min(10, priority))
  }
  
  // Verificar se a fonte pode fazer mais requests
  static canMakeRequest(source: NewsSource): boolean {
    if (!source.enabled || source.status.health === 'down') {
      return false
    }
    
    if (source.status.limitReached) {
      return false
    }
    
    const now = new Date()
    if (source.status.nextAvailableRequest && now < source.status.nextAvailableRequest) {
      return false
    }
    
    return true
  }
  
  // Atualizar estatísticas após um request
  static updateRequestStats(source: NewsSource, success: boolean, responseTime: number): Partial<SourceStatus> {
    const now = new Date()
    
    return {
      lastCheck: now,
      lastSuccess: success ? now : source.status.lastSuccess,
      lastError: success ? source.status.lastError : now,
      errorCount: success ? 0 : source.status.errorCount + 1,
      requestsToday: source.status.requestsToday + 1,
      requestsThisHour: source.status.requestsThisHour + 1,
      averageResponseTime: (source.status.averageResponseTime + responseTime) / 2,
      successRate: this.calculateSuccessRate(source.status.successRate, success)
    }
  }
  
  private static calculateSuccessRate(currentRate: number, success: boolean): number {
    // Simple exponential moving average
    const alpha = 0.1
    const newValue = success ? 100 : 0
    return currentRate * (1 - alpha) + newValue * alpha
  }
}