// services/aggregatedNewsService.ts

import { NewsArticle, NewsCategory, SentimentLabel, NewsQueryParams, NewsStatistics } from '../types/news'
import { NewsSource, NewsSourceManager } from '../models/NewsSource'
import { fmpNewsService } from './external/fmpNewsService'
import { newsApiService } from './external/newsApiService'

import { polygonService } from './external/polygonService'

import { cacheService } from './cacheService'
import { newsProcessorService } from './newsProcessorService'
import { marketauxService } from './external/marketauxService'
import { cryptoPanicService } from './external/cryptoPanicService'
import { finnhubService } from './external/finnhubService'
import { alphaVantageServiceEnhanced } from './external/alphaVantageService'

interface ServiceResult {
  articles: NewsArticle[]
  total: number
  source: string
  executionTime: number
  cached: boolean
}

interface AggregationOptions {
  maxSources?: number
  prioritizeFreshness?: boolean
  includeLowReliability?: boolean
  forceRefresh?: boolean
}

// Define the service interface that external services must implement
interface ExternalNewsService {
  getNews(params: NewsQueryParams, config: unknown): Promise<NewsArticle[]>
  isConfigured(): boolean
}

class AggregatedNewsService {
  private sources: Map<string, NewsSource> = new Map()
  private serviceMap = new Map<string, ExternalNewsService>([
    ['fmp', fmpNewsService],
    ['newsapi', newsApiService],
    ['alphavantage', alphaVantageServiceEnhanced],
    ['polygon', polygonService],
    ['marketaux', marketauxService],
    ['finnhub', finnhubService],         // ✅ Novo
    ['cryptopanic', cryptoPanicService]  // ✅ Novo
  ])

  constructor() {
    this.initializeSources()
  }

  // Inicializar fontes ativas
  private async initializeSources(): Promise<void> {
    try {
      // TODO: Carregar sources da base de dados
      // Por agora, usar sources predefinidas
      const predefinedSources = await this.getDefaultSources()
      
      predefinedSources.forEach(source => {
        this.sources.set(source.id, source)
      })

      console.log(`📡 Initialized ${this.sources.size} news sources`)
    } catch (error) {
      console.error('❌ Error initializing news sources:', error)
    }
  }

  // Método principal - buscar notícias agregadas
  async getNews(params: NewsQueryParams, options: AggregationOptions = {}): Promise<ServiceResult> {
    const startTime = Date.now()
    
    try {
      // 1. Selecionar fontes ativas e válidas
      const activeSources = this.getActiveSources(params.category, options)
      
      if (activeSources.length === 0) {
        throw new Error('Nenhuma fonte de notícias disponível')
      }

      // 2. Buscar de múltiplas fontes em paralelo
      const sourcePromises = activeSources.map(source => 
        this.fetchFromSource(source, params, options)
      )

      const sourceResults = await Promise.allSettled(sourcePromises)
      
      // 3. Processar resultados
      const successfulResults = sourceResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<ServiceResult>).value)

      if (successfulResults.length === 0) {
        throw new Error('Todas as fontes de notícias falharam')
      }

      // 4. Combinar e processar artigos
      const allArticles = successfulResults.flatMap(result => result.articles)
      const processedArticles = await this.processArticles(allArticles, params)

      // 5. Aplicar filtros finais e paginação
      const filteredArticles = this.applyFinalFilters(processedArticles, params)
      const paginatedArticles = this.applyPagination(filteredArticles, params)

      const executionTime = Date.now() - startTime

      // 6. Atualizar estatísticas das fontes
      await this.updateSourceStatistics(successfulResults)

      console.log(`✅ Aggregated ${paginatedArticles.length} articles from ${successfulResults.length} sources in ${executionTime}ms`)

      return {
        articles: paginatedArticles,
        total: filteredArticles.length,
        source: 'aggregated',
        executionTime,
        cached: false
      }

    } catch (error) {
      console.error('❌ Error in getNews aggregation:', error)
      
      // Fallback para cache ou dados mock
      return this.getFallbackNews(params)
    }
  }

  // Buscar notícias de uma fonte específica
  private async fetchFromSource(
    source: NewsSource, 
    params: NewsQueryParams,
    options: AggregationOptions
  ): Promise<ServiceResult> {
    const startTime = Date.now()
    
    try {
      // Verificar rate limiting
      if (!NewsSourceManager.canMakeRequest(source)) {
        throw new Error(`Rate limit exceeded for ${source.name}`)
      }

      // Verificar cache primeiro (se não for refresh forçado)
      if (!options.forceRefresh) {
        const cacheKey = `source:${source.id}:${JSON.stringify(params)}`
        const cached = await cacheService.get<ServiceResult>(cacheKey)
        
        if (cached) {
          return {
            articles: cached.articles,
            total: cached.total,
            source: cached.source,
            executionTime: Date.now() - startTime,
            cached: true
          }
        }
      }

      // Buscar da API externa
      const service = this.serviceMap.get(source.type)
      if (!service) {
        throw new Error(`Service not found for type: ${source.type}`)
      }

      const articles = await service.getNews(params, source.config)
      const executionTime = Date.now() - startTime

      // Atualizar estatísticas da fonte
      const updatedStats = NewsSourceManager.updateRequestStats(source, true, executionTime)
      source.status = { ...source.status, ...updatedStats }

      const result: ServiceResult = {
        articles,
        total: articles.length,
        source: source.id,
        executionTime,
        cached: false
      }

      // Cache do resultado
      const cacheKey = `source:${source.id}:${JSON.stringify(params)}`
      const cacheTTL = this.calculateCacheTTL(source, articles.length)
      await cacheService.set(cacheKey, result, cacheTTL)

      return result

    } catch (error) {
      console.error(`❌ Error fetching from ${source.name}:`, error)
      
      // Atualizar estatísticas de erro
      const updatedStats = NewsSourceManager.updateRequestStats(source, false, Date.now() - startTime)
      source.status = { ...source.status, ...updatedStats }

      throw error
    }
  }

  // Processar e enriquecer artigos
  private async processArticles(articles: NewsArticle[], params: NewsQueryParams): Promise<NewsArticle[]> {
    try {
      // 1. Remover duplicatas
      const uniqueArticles = this.removeDuplicates(articles)
      
      // 2. Processar com NewsProcessorService
      const processedArticles = await newsProcessorService.processArticles(uniqueArticles)
      
      // 3. Ordenar por relevância/data
      const sortedArticles = this.sortArticles(processedArticles, params)
      
      console.log(`🧠 Processed ${articles.length} → ${uniqueArticles.length} unique → ${processedArticles.length} final`)
      
      return sortedArticles

    } catch (error) {
      console.error('❌ Error processing articles:', error)
      return articles // Retornar artigos não processados em caso de erro
    }
  }

  // Remover duplicatas baseado em título e URL
  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Map<string, NewsArticle>()
    
    for (const article of articles) {
      // Criar chave única baseada no título normalizado
      const normalizedTitle = article.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim()
        .substring(0, 50)
      
      const key = `${normalizedTitle}:${article.url}`
      
      if (!seen.has(key)) {
        seen.set(key, article)
      } else {
        // Se já existe, manter o com mais informação (mais views, melhor fonte, etc.)
        const existing = seen.get(key)!
        if (this.compareArticleQuality(article, existing) > 0) {
          seen.set(key, article)
        }
      }
    }
    
    return Array.from(seen.values())
  }

  // Comparar qualidade entre artigos duplicados
  private compareArticleQuality(a: NewsArticle, b: NewsArticle): number {
    let score = 0
    
    // Preferir artigos com mais views
    if (a.views && b.views) {
      score += a.views > b.views ? 1 : -1
    }
    
    // Preferir artigos com imagem
    if (a.image && !b.image) score += 1
    if (!a.image && b.image) score -= 1
    
    // Preferir artigos com conteúdo mais completo
    score += (a.content?.length || 0) > (b.content?.length || 0) ? 1 : -1
    
    // Preferir artigos com tickers
    score += (a.tickers?.length || 0) > (b.tickers?.length || 0) ? 1 : -1
    
    return score
  }

  // Ordenar artigos
  private sortArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    const sortBy = params.sortBy || 'publishedDate'
    const sortOrder = params.sortOrder || 'desc'
    
    return articles.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'publishedDate':
          comparison = new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
          break
        case 'views':
          comparison = (a.views || 0) - (b.views || 0)
          break
        case 'relevance':
          // TODO: Implementar score de relevância
          comparison = 0
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  // Aplicar filtros finais
  private applyFinalFilters(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let filtered = articles
    
    // Filtro por data
    if (params.from || params.to) {
      filtered = filtered.filter(article => {
        const articleDate = new Date(article.publishedDate)
        if (params.from && articleDate < new Date(params.from)) return false
        if (params.to && articleDate > new Date(params.to)) return false
        return true
      })
    }
    
    // Filtro por sentimento
    if (params.sentiment) {
      filtered = filtered.filter(article => article.sentiment === params.sentiment)
    }
    
    // Filtro por tickers
    if (params.tickers && params.tickers.length > 0) {
      filtered = filtered.filter(article => 
        article.tickers?.some(ticker => 
          params.tickers!.includes(ticker.toUpperCase())
        )
      )
    }
    
    return filtered
  }

  // Aplicar paginação
  private applyPagination(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    const limit = Math.min(params.limit || 20, 100) // Máximo 100 por request
    const offset = params.offset || 0
    
    return articles.slice(offset, offset + limit)
  }

  // Selecionar fontes ativas
  private getActiveSources(category?: NewsCategory, options: AggregationOptions = {}): NewsSource[] {
    const sources = Array.from(this.sources.values())
      .filter(source => {
        // Fonte deve estar ativa
        if (!source.enabled || source.status.health === 'down') return false
        
        // Verificar categoria
        if (category && !source.categories.includes(category)) return false
        
        // Verificar confiabilidade
        if (!options.includeLowReliability && source.reliability < 3) return false
        
        // Verificar rate limiting
        if (!NewsSourceManager.canMakeRequest(source)) return false
        
        return true
      })
      .sort((a, b) => {
        // Ordenar por prioridade calculada
        const priorityA = NewsSourceManager.calculatePriority(a)
        const priorityB = NewsSourceManager.calculatePriority(b)
        return priorityB - priorityA
      })
    
    // Limitar número de fontes
    const maxSources = options.maxSources || 3
    return sources.slice(0, maxSources)
  }

  // Calcular TTL do cache baseado na fonte e qualidade dos dados
  private calculateCacheTTL(source: NewsSource, articleCount: number): number {
    let baseTTL = 300 // 5 minutos base
    
    // Ajustar baseado na reliability da fonte
    baseTTL *= source.reliability / 3
    
    // Ajustar baseado no número de artigos (mais artigos = cache mais longo)
    if (articleCount > 20) baseTTL *= 1.5
    if (articleCount > 50) baseTTL *= 2
    
    // Máximo de 1 hora
    return Math.min(baseTTL, 3600)
  }

  // Fallback em caso de falha geral
  private async getFallbackNews(params: NewsQueryParams): Promise<ServiceResult> {
    try {
      // Tentar cache geral primeiro
      const cacheKey = `fallback:${JSON.stringify(params)}`
      const cached = await cacheService.get<ServiceResult>(cacheKey)
      
      if (cached) {
        console.log('📦 Using cached fallback news')
        return {
          articles: cached.articles,
          total: cached.total,
          source: cached.source,
          executionTime: cached.executionTime,
          cached: true
        }
      }
      
      // TODO: Implementar fallback para dados mock ou base de dados local
      console.log('🔄 Using mock data fallback')
      
      return {
        articles: [], // TODO: carregar dados mock
        total: 0,
        source: 'fallback',
        executionTime: 0,
        cached: false
      }
      
    } catch (error) {
      console.error('❌ Even fallback failed:', error)
      throw new Error('Sistema de notícias temporariamente indisponível')
    }
  }

  // Atualizar estatísticas das fontes
  private async updateSourceStatistics(results: ServiceResult[]): Promise<void> {
    try {
      for (const result of results) {
        const source = this.sources.get(result.source)
        if (source) {
          // Atualizar métricas de performance
          source.status.averageResponseTime = 
            (source.status.averageResponseTime + result.executionTime) / 2
          
          // TODO: Persistir estatísticas na base de dados
        }
      }
    } catch (error) {
      console.error('❌ Error updating source statistics:', error)
    }
  }

  // Métodos públicos para funcionalidades específicas

  async getFeaturedNews(): Promise<NewsArticle[]> {
    const params: NewsQueryParams = {
      limit: 10,
      sortBy: 'views',
      sortOrder: 'desc'
    }
    
    const result = await this.getNews(params, { prioritizeFreshness: true })
    return result.articles
  }

  async getTrendingNews(timeframe: string): Promise<NewsArticle[]> {
    // TODO: Implementar lógica de trending baseada em timeframe
    const params: NewsQueryParams = {
      limit: 15,
      sortBy: 'views',
      sortOrder: 'desc'
    }
    
    const result = await this.getNews(params)
    return result.articles
  }

  async getNewsByTicker(ticker: string, options: {
    limit?: number
    offset?: number
    from?: string
    to?: string
  }): Promise<ServiceResult> {
    const params: NewsQueryParams = {
      tickers: [ticker.toUpperCase()],
      limit: options.limit || 20,
      offset: options.offset || 0,
      from: options.from,
      to: options.to
    }
    
    return this.getNews(params)
  }

  async getNewsByCategory(category: NewsCategory, options: {
    limit?: number
    offset?: number
    from?: string
    to?: string
  }): Promise<ServiceResult> {
    const params: NewsQueryParams = {
      category,
      limit: options.limit || 20,
      offset: options.offset || 0,
      from: options.from,
      to: options.to
    }
    
    return this.getNews(params)
  }

  async searchNews(searchParams: {
    query: string
    category?: NewsCategory
    sources?: string[]
    tickers?: string[]
    limit?: number
    offset?: number
  }): Promise<ServiceResult> {
    const params: NewsQueryParams = {
      search: searchParams.query,
      category: searchParams.category,
      sources: searchParams.sources,
      tickers: searchParams.tickers,
      limit: searchParams.limit || 20,
      offset: searchParams.offset || 0
    }
    
    return this.getNews(params)
  }

  async getNewsStatistics(options: {
    category?: NewsCategory
    from?: string
    to?: string
  }): Promise<NewsStatistics> {
    // TODO: Implementar estatísticas agregadas
    throw new Error('Not implemented yet')
  }

  async getAvailableSources(): Promise<{
    sources: NewsSource[]
    activeCount: number
    totalCount: number
  }> {
    const sources = Array.from(this.sources.values())
    const activeCount = sources.filter(s => s.enabled && s.status.health === 'healthy').length
    
    return {
      sources,
      activeCount,
      totalCount: sources.length
    }
  }

  async forceRefresh(): Promise<{
    updated: number
    created: number
    sourcesChecked: number
    executionTime: number
  }> {
    const startTime = Date.now()
    
    // Limpar cache
    await cacheService.clearPattern('source:*')
    
    // TODO: Implementar refresh completo
    const executionTime = Date.now() - startTime
    
    return {
      updated: 0,
      created: 0,
      sourcesChecked: this.sources.size,
      executionTime
    }
  }

  // Dados temporários para desenvolvimento
  private async getDefaultSources(): Promise<NewsSource[]> {
    // TODO: Mover para base de dados
    return [
      {
        id: 'fmp-1',
        name: 'Financial Modeling Prep',
        type: 'fmp',
        enabled: true,
        config: {
          endpoint: 'https://financialmodelingprep.com/api/v3',
          rateLimit: { 
            requestsPerMinute: 60, 
            requestsPerDay: 250,
            burstLimit: 10
          },
          timeout: 10000,
          retries: 3,
          maxArticles: 50,
          refreshInterval: 300000, // 5 minutes in milliseconds
          enabled: true,
          priority: 9
        },
        status: {
          isActive: true,
          health: 'healthy',
          lastCheck: new Date(),
          lastSuccess: new Date(),
          errorCount: 0,
          successRate: 95,
          averageResponseTime: 800,
          requestsToday: 45,
          requestsThisHour: 5,
          limitReached: false
        },
        categories: ['market', 'earnings', 'economy'],
        reliability: 5,
        priority: 9,
        metadata: {
          description: 'Premium financial API',
          tags: ['finance', 'premium'],
          version: '3.0'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'newsapi-1',
        name: 'NewsAPI',
        type: 'newsapi',
        enabled: true,
        config: {
          endpoint: 'https://newsapi.org/v2',
          rateLimit: { 
            requestsPerMinute: 60, 
            requestsPerDay: 1000,
            burstLimit: 5
          },
          timeout: 30000,
          retries: 2,
          maxArticles: 100,
          refreshInterval: 600000, // 10 minutes
          enabled: true,
          priority: 8
        },
        status: {
          isActive: true,
          health: 'healthy',
          lastCheck: new Date(),
          lastSuccess: new Date(),
          errorCount: 0,
          successRate: 90,
          averageResponseTime: 1200,
          requestsToday: 156,
          requestsThisHour: 12,
          limitReached: false
        },
        categories: ['market', 'general', 'economy'],
        reliability: 4,
        priority: 8,
        metadata: {
          description: 'Global news aggregator',
          tags: ['news', 'general'],
          version: '2.0'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'alphavantage-1',
        name: 'Alpha Vantage',
        type: 'alphavantage',
        enabled: true,
        config: {
          endpoint: 'https://www.alphavantage.co/query',
          rateLimit: { 
            requestsPerMinute: 5, 
            requestsPerDay: 500,
            burstLimit: 1
          },
          timeout: 30000,
          retries: 2,
          maxArticles: 50,
          refreshInterval: 720000, // 12 minutes
          enabled: true,
          priority: 7
        },
        status: {
          isActive: true,
          health: 'healthy',
          lastCheck: new Date(),
          lastSuccess: new Date(),
          errorCount: 0,
          successRate: 85,
          averageResponseTime: 2100,
          requestsToday: 23,
          requestsThisHour: 2,
          limitReached: false
        },
        categories: ['market', 'earnings'],
        reliability: 4,
        priority: 7,
        metadata: {
          description: 'Financial data with sentiment analysis',
          tags: ['finance', 'sentiment'],
          version: '1.0'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'polygon-1',
        name: 'Polygon',
        type: 'polygon',
        enabled: true,
        config: {
          endpoint: 'https://api.polygon.io/v2',
          rateLimit: { 
            requestsPerMinute: 5, 
            requestsPerDay: 1000,
            burstLimit: 1
          },
          timeout: 30000,
          retries: 3,
          maxArticles: 1000,
          refreshInterval: 720000, // 12 minutes
          enabled: true,
          priority: 6
        },
        status: {
          isActive: true,
          health: 'healthy',
          lastCheck: new Date(),
          lastSuccess: new Date(),
          errorCount: 0,
          successRate: 92,
          averageResponseTime: 1800,
          requestsToday: 34,
          requestsThisHour: 3,
          limitReached: false
        },
        categories: ['market', 'earnings', 'crypto'],
        reliability: 5,
        priority: 6,
        metadata: {
          description: 'Premium financial market data',
          tags: ['finance', 'premium', 'market'],
          version: '2.0'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
}

export const newsAggregatorService = new AggregatedNewsService()