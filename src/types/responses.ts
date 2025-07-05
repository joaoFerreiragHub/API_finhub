// types/responses.ts

import { NewsArticle, NewsStatistics, APIHealthStatus, TrendingTopic, NewsSource } from './news'

// Resposta base da API
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId: string
    executionTime: number
  }
}

// Resposta paginada
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// Resposta de notícias
export interface NewsResponse extends PaginatedResponse<NewsArticle> {
  filters?: {
    category?: string
    search?: string
    sources?: string[]
    tickers?: string[]
  }
}

// Resposta de notícia única
export interface SingleNewsResponse extends APIResponse<NewsArticle> {
  related?: NewsArticle[] // Notícias relacionadas
}

// Resposta de estatísticas
export interface StatsResponse extends APIResponse<NewsStatistics> {
  cacheInfo?: {
    cached: boolean
    cacheAge: number // seconds
    expiresIn: number // seconds
  }
}

// Resposta de health check
export interface HealthResponse extends APIResponse {
  data: {
    status: 'healthy' | 'degraded' | 'down'
    services: APIHealthStatus[]
    uptime: number // seconds
    version: string
    environment: string
  }
}

// Resposta de trending topics
export interface TrendingResponse extends APIResponse<TrendingTopic[]> {
  timeframe: '1h' | '6h' | '24h' | '7d'
  generatedAt: string
}

// Resposta de fontes disponíveis
export interface SourcesResponse extends APIResponse<NewsSource[]> {
  activeCount: number
  totalCount: number
}

// Resposta de busca
export interface SearchResponse extends PaginatedResponse<NewsArticle> {
  searchTerm: string
  suggestions?: string[] // Sugestões de pesquisa
  executionTime: number // milissegundos
}

// Resposta de notícias por ticker
export interface TickerNewsResponse extends PaginatedResponse<NewsArticle> {
  ticker: string
  companyName?: string
  sentiment: {
    overall: 'positive' | 'negative' | 'neutral'
    distribution: {
      positive: number
      negative: number
      neutral: number
    }
  }
}

// Resposta de refresh de dados
export interface RefreshResponse extends APIResponse {
  data: {
    articlesUpdated: number
    newArticles: number
    sourcesChecked: number
    executionTime: number
    lastRefresh: string
  }
}

// Códigos de erro padronizados
export enum ErrorCodes {
  // Erros gerais
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Erros específicos das notícias
  NEWS_NOT_FOUND = 'NEWS_NOT_FOUND',
  INVALID_CATEGORY = 'INVALID_CATEGORY',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  TICKER_NOT_FOUND = 'TICKER_NOT_FOUND',
  
  // Erros das APIs externas
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  API_KEY_INVALID = 'API_KEY_INVALID',
  SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE',
  
  // Erros de cache/sistema
  CACHE_ERROR = 'CACHE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// Resposta de erro
export interface ErrorResponse extends APIResponse {
  success: false
  error: {
    code: ErrorCodes
    message: string
    details?: any
    timestamp: string
    path?: string
    stack?: string // apenas em desenvolvimento
  }
}

// Status de operação assíncrona
export interface AsyncOperationResponse extends APIResponse {
  data: {
    operationId: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress?: number // 0-100
    estimatedCompletion?: string
    result?: any
  }
}

// Resposta de batch operations
export interface BatchResponse<T> extends APIResponse {
  data: {
    successful: T[]
    failed: Array<{
      item: any
      error: {
        code: ErrorCodes
        message: string
      }
    }>
    summary: {
      total: number
      successful: number
      failed: number
    }
  }
}

// Helpers para criar respostas
export class ResponseBuilder {
  static success<T>(data: T, meta?: any): APIResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
        executionTime: 0, // será preenchido pelo middleware
        ...meta
      }
    }
  }

  static error(
    code: ErrorCodes, 
    message: string, 
    details?: any
  ): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    }
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit)
    
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId(),
        executionTime: 0
      }
    }
  }
}

// Utility function para gerar request ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}