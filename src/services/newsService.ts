// services/newsService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../types/news'

import { fmpNewsService } from './external/fmpNewsService'
import { newsApiService } from './external/newsApiService'
import { polygonService } from './external/polygonService'
import { SourceConfig } from '../models/NewsSource'
import { alphaVantageServiceEnhanced } from './external/alphaVantageService'

interface NewsSearchParams {
  query: string
  category?: NewsCategory
  sources?: string[]
  tickers?: string[]
  limit?: number
  offset?: number
}

interface NewsStatisticsParams {
  category?: NewsCategory
  from?: string
  to?: string
}

interface NewsResult {
  articles: NewsArticle[]
  total: number
}

interface NewsStatistics {
  totalArticles: number
  categoriesBreakdown: Record<NewsCategory, number>
  sentimentBreakdown: Record<SentimentLabel, number>
  topSources: Array<{ source: string; count: number }>
  topTickers: Array<{ ticker: string; count: number }>
  dateRange: { from: string; to: string }
}

interface TrendingTopicsParams {
  timeframe: string
  limit: number
}

interface RefreshResult {
  updated: number
  created: number
  sourcesChecked: number
  executionTime: number
}

interface AvailableSources {
  sources: Array<{
    name: string
    type: string
    enabled: boolean
    status: 'healthy' | 'error'
    lastCheck: string
  }>
  activeCount: number
  totalCount: number
}

class NewsService {
  private defaultConfig: SourceConfig = {
    endpoint: '',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 10000,
      burstLimit: 10
    },
    timeout: 10000,
    retries: 3,
    refreshInterval: 300000,
    maxArticles: 50,
    enabled: true,
    priority: 1
  }

  // Método principal para buscar notícias
  async getNews(params: NewsQueryParams): Promise<NewsResult> {
    try {
      const allArticles: NewsArticle[] = []

      // Buscar de múltiplas fontes em paralelo
      const promises = []

      // Alpha Vantage
      if (alphaVantageServiceEnhanced.isConfigured()) {
        promises.push(
          alphaVantageServiceEnhanced.getNews(params, this.defaultConfig)
            .catch(error => {
              console.error('Error from Alpha Vantage:', error)
              return []
            })
        )
      }

      // FMP
      if (fmpNewsService.isConfigured()) {
        promises.push(
          fmpNewsService.getNews(params, this.defaultConfig)
            .catch(error => {
              console.error('Error from FMP:', error)
              return []
            })
        )
      }

      // NewsAPI
      if (newsApiService.isConfigured()) {
        promises.push(
          newsApiService.getNews(params, this.defaultConfig)
            .catch(error => {
              console.error('Error from NewsAPI:', error)
              return []
            })
        )
      }

      // Polygon
      if (polygonService.isConfigured()) {
        promises.push(
          polygonService.getNews(params, this.defaultConfig)
            .catch(error => {
              console.error('Error from Polygon:', error)
              return []
            })
        )
      }

      const results = await Promise.all(promises)
      
      // Combinar resultados
      results.forEach(articles => allArticles.push(...articles))

      // Remover duplicatas e ordenar
      const uniqueArticles = this.removeDuplicates(allArticles)
      const sortedArticles = this.sortArticles(uniqueArticles, params.sortBy, params.sortOrder)

      // Aplicar paginação
      const startIndex = params.offset || 0
      const endIndex = startIndex + (params.limit || 20)
      const paginatedArticles = sortedArticles.slice(startIndex, endIndex)

      return {
        articles: paginatedArticles,
        total: sortedArticles.length
      }

    } catch (error) {
      console.error('Error in NewsService.getNews:', error)
      throw error
    }
  }

  // Buscar notícias por ID
  async getNewsById(id: string): Promise<NewsArticle | null> {
    // TODO: Implementar busca por ID específico
    // Por enquanto, retorna null pois os serviços externos não têm este método
    console.log(`🔍 getNewsById not implemented for ID: ${id}`)
    return null
  }

  // Buscar notícias relacionadas
  async getRelatedNews(articleId: string, limit: number = 5): Promise<NewsArticle[]> {
    // TODO: Implementar busca de notícias relacionadas
    console.log(`🔍 getRelatedNews not implemented for ID: ${articleId}`)
    return []
  }

  // Buscar notícias por ticker
  async getNewsByTicker(ticker: string, options: {
    limit?: number
    offset?: number
    from?: string
    to?: string
  }): Promise<NewsResult> {
    const params: NewsQueryParams = {
      tickers: [ticker],
      limit: options.limit || 20,
      offset: options.offset || 0,
      from: options.from,
      to: options.to,
      sortBy: 'publishedDate',
      sortOrder: 'desc'
    }

    return await this.getNews(params)
  }

  // Buscar notícias por categoria
  async getNewsByCategory(category: NewsCategory, options: {
    limit?: number
    offset?: number
    from?: string
    to?: string
  }): Promise<NewsResult> {
    const params: NewsQueryParams = {
      category,
      limit: options.limit || 20,
      offset: options.offset || 0,
      from: options.from,
      to: options.to,
      sortBy: 'publishedDate',
      sortOrder: 'desc'
    }

    return await this.getNews(params)
  }

  // Buscar notícias por sentimento
  async getNewsBySentiment(sentiment: SentimentLabel, options: {
    limit?: number
    offset?: number
  }): Promise<NewsResult> {
    const params: NewsQueryParams = {
      sentiment,
      limit: options.limit || 20,
      offset: options.offset || 0,
      sortBy: 'publishedDate',
      sortOrder: 'desc'
    }

    return await this.getNews(params)
  }

  // Pesquisa avançada
  async searchNews(searchParams: NewsSearchParams): Promise<NewsResult> {
    const params: NewsQueryParams = {
      search: searchParams.query,
      category: searchParams.category,
      tickers: searchParams.tickers,
      limit: searchParams.limit || 20,
      offset: searchParams.offset || 0,
      sortBy: 'publishedDate',
      sortOrder: 'desc'
    }

    return await this.getNews(params)
  }

  // Notícias trending
  async getTrendingNews(timeframe: string): Promise<NewsArticle[]> {
    // Implementação simplificada - buscar notícias recentes
    const params: NewsQueryParams = {
      limit: 20,
      sortBy: 'publishedDate',
      sortOrder: 'desc'
    }

    // Definir período baseado no timeframe
    const now = new Date()
    let fromDate: Date

    switch (timeframe) {
      case '1h':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        fromDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    params.from = fromDate.toISOString()
    params.to = now.toISOString()

    const result = await this.getNews(params)
    return result.articles
  }

  // Estatísticas de notícias
  async getNewsStatistics(params: NewsStatisticsParams): Promise<NewsStatistics> {
    // TODO: Implementar estatísticas reais
    // Por enquanto, retorna mock data
    return {
      totalArticles: 1500,
      categoriesBreakdown: {
        market: 450,
        crypto: 300,
        economy: 350,
        earnings: 250,
        general: 150,
        forex: 50
      },
      sentimentBreakdown: {
        positive: 500,
        negative: 400,
        neutral: 600
      },
      topSources: [
        { source: 'Reuters', count: 200 },
        { source: 'Bloomberg', count: 180 },
        { source: 'Yahoo Finance', count: 150 }
      ],
      topTickers: [
        { ticker: 'AAPL', count: 50 },
        { ticker: 'MSFT', count: 45 },
        { ticker: 'GOOGL', count: 40 }
      ],
      dateRange: {
        from: params.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: params.to || new Date().toISOString()
      }
    }
  }

  // Fontes disponíveis
  async getAvailableSources(): Promise<AvailableSources> {
    const sources = [
      {
        name: 'Alpha Vantage',
        type: 'alphavantage',
        enabled: alphaVantageServiceEnhanced.isConfigured(),
        status: 'healthy' as const,
        lastCheck: new Date().toISOString()
      },
      {
        name: 'Financial Modeling Prep',
        type: 'fmp',
        enabled: fmpNewsService.isConfigured(),
        status: 'healthy' as const,
        lastCheck: new Date().toISOString()
      },
      {
        name: 'News API',
        type: 'newsapi',
        enabled: newsApiService.isConfigured(),
        status: 'healthy' as const,
        lastCheck: new Date().toISOString()
      },
      {
        name: 'Polygon',
        type: 'polygon',
        enabled: polygonService.isConfigured(),
        status: 'healthy' as const,
        lastCheck: new Date().toISOString()
      }
    ]

    return {
      sources,
      activeCount: sources.filter(s => s.enabled).length,
      totalCount: sources.length
    }
  }

  // Trending topics
  async getTrendingTopics(params: TrendingTopicsParams): Promise<Array<{
    topic: string
    count: number
    trend: 'up' | 'down' | 'stable'
  }>> {
    // TODO: Implementar trending topics reais
    // Por enquanto, retorna mock data
    const topics: Array<{
      topic: string
      count: number
      trend: 'up' | 'down' | 'stable'
    }> = [ // FIXED: Explicit typing
      { topic: 'Federal Reserve', count: 45, trend: 'up' as const },
      { topic: 'Inflation', count: 38, trend: 'down' as const },
      { topic: 'Tech Stocks', count: 32, trend: 'stable' as const },
      { topic: 'Bitcoin', count: 28, trend: 'up' as const },
      { topic: 'Oil Prices', count: 25, trend: 'down' as const }
    ]
    
    return topics.slice(0, params.limit)
  }

  // Overview do mercado
  async getMarketOverview(): Promise<{
    sentiment: { positive: number; negative: number; neutral: number }
    topStories: NewsArticle[]
    marketTrends: Array<{ sector: string; sentiment: SentimentLabel; change: number }>
  }> {
    // Buscar top stories
    const topStoriesResult = await this.getNews({
      limit: 5,
      sortBy: 'publishedDate',
      sortOrder: 'desc'
    })

    return {
      sentiment: { positive: 35, negative: 25, neutral: 40 },
      topStories: topStoriesResult.articles,
      marketTrends: [
        { sector: 'Technology', sentiment: 'positive', change: 2.5 },
        { sector: 'Healthcare', sentiment: 'neutral', change: 0.8 },
        { sector: 'Energy', sentiment: 'negative', change: -1.2 }
      ]
    }
  }

  // Resumo diário
  async getDailySummary(date: Date): Promise<{
    date: string
    totalArticles: number
    topCategories: Array<{ category: NewsCategory; count: number }>
    sentiment: Record<SentimentLabel, number>
    highlights: NewsArticle[]
  }> {
    const dateStr = date.toISOString().split('T')[0]
    
    // TODO: Implementar resumo diário real
    const highlightsResult = await this.getNews({
      limit: 3,
      from: date.toISOString(),
      to: new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString()
    })

    return {
      date: dateStr,
      totalArticles: 125,
      topCategories: [
        { category: 'market', count: 45 },
        { category: 'economy', count: 35 },
        { category: 'crypto', count: 25 }
      ],
      sentiment: { positive: 40, negative: 30, neutral: 55 },
      highlights: highlightsResult.articles
    }
  }

  // Forçar refresh
  async forceRefresh(): Promise<RefreshResult> {
    // TODO: Implementar refresh real
    console.log('🔄 Force refresh triggered')
    
    return {
      updated: 25,
      created: 15,
      sourcesChecked: 4,
      executionTime: 2500
    }
  }

  // Métodos utilitários privados

  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>()
    return articles.filter(article => {
      const key = this.generateArticleKey(article)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  private generateArticleKey(article: NewsArticle): string {
    // Usar título normalizado como chave para detectar duplicatas
    return article.title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim()
      .substring(0, 50)
  }

  private sortArticles(
    articles: NewsArticle[], 
    sortBy: string = 'publishedDate', 
    sortOrder: string = 'desc'
  ): NewsArticle[] {
    return articles.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'publishedDate':
          comparison = new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
          break
        case 'views':
          comparison = (a.views || 0) - (b.views || 0)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }
}

export const newsService = new NewsService()