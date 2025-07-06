// src/services/newsServiceEnhanced.ts - VERSÃO CORRIGIDA
  
import { NewsArticle, NewsQueryParams } from '../types/news'
import { alphaVantageServiceEnhanced } from './external/alphaVantageService'

import { fmpNewsService } from './external/fmpNewsService'
import { newsApiService } from './external/newsApiService'
import { polygonService } from './external/polygonService'
import { rateLimitManager } from './rateLimitManager'

interface ServiceProvider {
  name: string
  service: any
  priority: number
  isAvailable: () => boolean
}

class NewsServiceEnhanced {
  private providers: ServiceProvider[] = [
    {
      name: 'newsapi',
      service: newsApiService,
      priority: 1, // Prioridade mais alta
      isAvailable: () => newsApiService.isConfigured() && rateLimitManager.canMakeRequest('newsapi')
    },
    {
      name: 'fmp',
      service: fmpNewsService,
      priority: 2,
      isAvailable: () => fmpNewsService.isConfigured() && rateLimitManager.canMakeRequest('fmp')
    },
    {
      name: 'polygon',
      service: polygonService,
      priority: 3,
      isAvailable: () => polygonService.isConfigured() && rateLimitManager.canMakeRequest('polygon')
    },
    {
      name: 'alphavantage',
      service: alphaVantageServiceEnhanced,
      priority: 4, // Prioridade mais baixa devido aos limites
      isAvailable: () => alphaVantageServiceEnhanced.isAvailable()
    }
  ]

  async getNews(params: NewsQueryParams) {
    console.log('🔍 NewsServiceEnhanced.getNews started')
    
    // Verificar status de todos os serviços
    const availableProviders = this.providers
      .filter(provider => provider.isAvailable())
      .sort((a, b) => a.priority - b.priority)

    console.log('📊 Available providers:', availableProviders.map(p => p.name))

    if (availableProviders.length === 0) {
      console.log('⚠️ No providers available - checking rate limits')
      this.logRateLimitStatus()
      
      // Usar cache se não há provedores disponíveis
      return this.getFallbackNews(params)
    }

    const allArticles: NewsArticle[] = []
    let successfulProviders: string[] = []

    // Tentar cada provedor disponível
    for (const provider of availableProviders) {
      try {
        console.log(`📡 Trying provider: ${provider.name}`)
        
        const articles = await provider.service.getNews(params, this.getDefaultConfig())
        
        if (articles && articles.length > 0) {
          allArticles.push(...articles)
          successfulProviders.push(provider.name)
          console.log(`✅ ${provider.name}: ${articles.length} articles`)
        } else {
          console.log(`⚠️ ${provider.name}: no articles returned`)
        }

      } catch (error) {
        // 🔧 CORREÇÃO: Type checking para error
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`❌ Provider ${provider.name} failed:`, errorMessage)
        
        // Se for rate limit, log específico
        if (errorMessage.includes('rate limit') || errorMessage.includes('premium plan')) {
          console.log(`⏳ ${provider.name} rate limited, trying next provider`)
        }
      }
    }

    console.log(`📰 Total articles from ${successfulProviders.length} providers: ${allArticles.length}`)

    if (allArticles.length === 0) {
      console.log('⚠️ No articles from any provider, using fallback')
      return this.getFallbackNews(params)
    }

    // Processar e retornar artigos
    const processedArticles = this.processArticles(allArticles, params)
    
    return {
      articles: processedArticles,
      total: processedArticles.length,
      sources: successfulProviders,
      rateLimitStatus: this.getRateLimitSummary()
    }
  }

  // Log status de rate limits
  private logRateLimitStatus(): void {
    const statuses = rateLimitManager.getAllStatuses()
    
    console.log('📊 Rate Limit Status:')
    Object.entries(statuses).forEach(([service, status]) => {
      const resetTime = Math.ceil((status.nextResetTime.getTime() - Date.now()) / (1000 * 60 * 60))
      console.log(`  ${service}: ${status.requestsToday}/${rateLimitManager.getServiceStatus(service)?.requestsToday || 'unknown'} (reset in ${resetTime}h)`)
    })
  }

  // Fallback para quando não há provedores disponíveis
  private async getFallbackNews(params: NewsQueryParams) {
    console.log('🔄 Using fallback news system')
    
    // Retornar notícias mock ou de cache
    return {
      articles: this.getMockNews(params.limit || 10),
      total: 10,
      sources: ['fallback'],
      rateLimitStatus: this.getRateLimitSummary(),
      fallback: true
    }
  }

  // 🔧 CORREÇÃO: Notícias mock com propriedades corretas da interface NewsArticle
  private getMockNews(limit: number): NewsArticle[] {
    const mockArticles: NewsArticle[] = []
    
    for (let i = 0; i < limit; i++) {
      mockArticles.push({
        id: `mock-${i}`,
        title: `Sample Financial News ${i + 1}`,
        summary: `This is a sample news article for demonstration purposes. All news providers are currently rate limited.`,
        content: `This is sample content for financial news article ${i + 1}. In times when API providers reach their rate limits, this fallback system ensures users still receive relevant financial information.`,
        url: '#',
        source: 'Mock Provider',
        publishedDate: new Date().toISOString(),
        sentiment: 'neutral',
        category: 'market',
        // ✅ Removidas propriedades que não existem na interface:
        // tags: ['sample', 'demo'], // ❌ Não existe
        // relevanceScore: 0.5       // ❌ Não existe
        // ✅ Propriedades opcionais que existem na interface:
        tickers: ['MOCK'],
        views: Math.floor(Math.random() * 1000),
        author: 'Mock Author',
        image: undefined
      })
    }
    
    return mockArticles
  }

  // Resumo de rate limits
  private getRateLimitSummary() {
    const statuses = rateLimitManager.getAllStatuses()
    const summary: Record<string, any> = {}
    
    Object.entries(statuses).forEach(([service, status]) => {
      summary[service] = {
        available: !status.isLimitReached,
        requestsToday: status.requestsToday,
        resetTime: status.nextResetTime
      }
    })
    
    return summary
  }

  private processArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    // Remover duplicatas
    const unique = this.removeDuplicates(articles)
    
    // Ordenar
    const sorted = this.sortArticles(unique, params.sortBy, params.sortOrder)
    
    // Aplicar paginação
    const startIndex = params.offset || 0
    const endIndex = startIndex + (params.limit || 20)
    
    return sorted.slice(startIndex, endIndex)
  }

  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set()
    return articles.filter(article => {
      const key = `${article.title}-${article.source}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // 🔧 CORREÇÃO: Removida referência a relevanceScore que não existe
  private sortArticles(articles: NewsArticle[], sortBy?: string, sortOrder?: string): NewsArticle[] {
    return articles.sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1
      
      switch (sortBy) {
        case 'publishedDate':
          return order * (new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
        case 'views':
          // ✅ Usar views em vez de relevanceScore
          return order * ((b.views || 0) - (a.views || 0))
        case 'relevance':
          // ✅ Para relevance, usar views como proxy ou manter por data
          return order * ((b.views || 0) - (a.views || 0))
        default:
          return order * (new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      }
    })
  }

  private getDefaultConfig() {
    return {
      endpoint: '',
      rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000, burstLimit: 10 },
      timeout: 10000,
      retries: 3,
      refreshInterval: 300000,
      maxArticles: 50,
      enabled: true,
      priority: 1
    }
  }
}

export const newsServiceEnhanced = new NewsServiceEnhanced()

// ===== HELPER FUNCTIONS PARA TRABALHAR COM NewsArticle =====

/**
 * Verificar se um objeto é um NewsArticle válido
 */
export function isValidNewsArticle(article: unknown): article is NewsArticle {
  if (!article || typeof article !== 'object') {
    return false
  }

  const obj = article as Record<string, unknown>
  
  // Verificar propriedades obrigatórias
  const requiredFields = ['id', 'title', 'summary', 'content', 'publishedDate', 'source', 'url', 'category']
  
  for (const field of requiredFields) {
    if (!obj[field] || typeof obj[field] !== 'string') {
      return false
    }
  }

  // Verificar se category é válida
  const validCategories = ['market', 'economy', 'earnings', 'general', 'crypto', 'forex']
  if (!validCategories.includes(obj.category as string)) {
    return false
  }

  // Verificar se sentiment é válido (se presente)
  if (obj.sentiment) {
    const validSentiments = ['positive', 'negative', 'neutral']
    if (!validSentiments.includes(obj.sentiment as string)) {
      return false
    }
  }

  return true
}

/**
 * Converter raw data para NewsArticle
 */
export function convertToNewsArticle(rawData: any, source: string = 'unknown'): NewsArticle | null {
  try {
    // Estrutura base obrigatória
    const article: NewsArticle = {
      id: rawData.id || `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: rawData.title || '',
      summary: rawData.summary || rawData.description || '',
      content: rawData.content || rawData.summary || rawData.description || '',
      publishedDate: rawData.publishedDate || rawData.date || rawData.publishedAt || new Date().toISOString(),
      source: rawData.source || source,
      url: rawData.url || rawData.link || '#',
      category: rawData.category || 'general',
      
      // Propriedades opcionais
      sentiment: rawData.sentiment || undefined,
      tickers: rawData.tickers ? 
        (Array.isArray(rawData.tickers) ? rawData.tickers : rawData.tickers.split(',').map((t: string) => t.trim())) 
        : undefined,
      views: rawData.views || undefined,
      author: rawData.author || undefined,
      image: rawData.image || rawData.imageUrl || rawData.urlToImage || undefined
    }

    // Validar antes de retornar
    if (isValidNewsArticle(article)) {
      return article
    } else {
      console.warn('❌ Converted article failed validation:', article)
      return null
    }

  } catch (error) {
    console.error('❌ Error converting to NewsArticle:', error)
    return null
  }
}

/**
 * Sanitizar NewsArticle (remover campos inválidos, etc.)
 */
export function sanitizeNewsArticle(article: NewsArticle): NewsArticle {
  return {
    id: article.id.trim(),
    title: article.title.trim(),
    summary: article.summary.trim(),
    content: article.content.trim(),
    publishedDate: new Date(article.publishedDate).toISOString(), // Normalizar data
    source: article.source.trim(),
    url: article.url.trim(),
    category: article.category,
    
    // Propriedades opcionais - apenas incluir se válidas
    ...(article.sentiment && ['positive', 'negative', 'neutral'].includes(article.sentiment) && { sentiment: article.sentiment }),
    ...(article.tickers && article.tickers.length > 0 && { tickers: article.tickers.filter(Boolean) }),
    ...(article.views && article.views > 0 && { views: article.views }),
    ...(article.author && article.author.trim() && { author: article.author.trim() }),
    ...(article.image && article.image.trim() && { image: article.image.trim() })
  }
}

/**
 * Comparar dois NewsArticle para detectar duplicatas
 */
export function areArticlesSimilar(a: NewsArticle, b: NewsArticle, threshold: number = 0.8): boolean {
  // Comparação simples por título e fonte
  const titleSimilarity = a.title.toLowerCase() === b.title.toLowerCase()
  const sourceSame = a.source.toLowerCase() === b.source.toLowerCase()
  
  // Se título igual e fonte igual, são muito provavelmente duplicatas
  if (titleSimilarity && sourceSame) {
    return true
  }
  
  // Comparação por URL
  if (a.url === b.url && a.url !== '#') {
    return true
  }
  
  // Comparação mais sofisticada por palavras-chave (simplificada)
  const aWords = a.title.toLowerCase().split(' ').filter(w => w.length > 3)
  const bWords = b.title.toLowerCase().split(' ').filter(w => w.length > 3)
  
  if (aWords.length === 0 || bWords.length === 0) {
    return false
  }
  
  const commonWords = aWords.filter(word => bWords.includes(word))
  const similarity = commonWords.length / Math.max(aWords.length, bWords.length)
  
  return similarity >= threshold
}