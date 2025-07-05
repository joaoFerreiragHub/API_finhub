// services/external/fmpNewsService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

// Interfaces específicas do FMP
interface FMPGeneralNewsResponse {
  title: string
  date: string
  content: string
  tickers: string
  image: string
  link: string
  author: string
  site: string
}

interface FMPStockNewsResponse {
  symbol: string
  publishedDate: string
  title: string
  image: string
  site: string
  text: string
  url: string
}

interface FMPRequestParams {
  apikey?: string
  page?: number
  size?: number
  limit?: number
  tickers?: string
  from?: string
  to?: string
}

class FMPNewsService {
  private readonly baseUrl = 'https://financialmodelingprep.com/api'
  private apiKey: string
  private readonly rateLimitDelay = 200
  private lastRequestTime = 0

  constructor() {
    // Configurar API key - adicionar múltiplas opções
    this.apiKey = process.env.FMP_API_KEY || 
                  process.env.NEXT_PUBLIC_FMP_API_KEY || 
                  'demo' // Para teste
    
    console.log('🔑 FMP API Key configured:', this.apiKey ? 'Yes' : 'No')
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  private async makeRequest<T>(endpoint: string, params: FMPRequestParams = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('FMP API key not configured')
    }

    await this.waitForRateLimit()
    
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Adicionar API key
    url.searchParams.append('apikey', this.apiKey)
    
    // Adicionar outros parâmetros
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'apikey') {
        url.searchParams.append(key, value.toString())
      }
    })

    console.log(`🔄 FMP Request: ${url.toString()}`)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'FinHub-API/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`📡 FMP Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ FMP HTTP Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`FMP HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }
      
      const data = await response.json() as T
      
      // Verificar se FMP retornou erro
      if (typeof data === 'object' && data !== null) {
        if ('Error Message' in data) {
          throw new Error(`FMP API Error: ${(data as { 'Error Message': string })['Error Message']}`)
        }
        if ('error' in data) {
          throw new Error(`FMP API Error: ${(data as { error: string }).error}`)
        }
      }
      
      console.log(`✅ FMP Success:`, {
        type: Array.isArray(data) ? 'array' : typeof data,
        length: Array.isArray(data) ? data.length : 'N/A',
        sample: Array.isArray(data) && data.length > 0 ? data[0] : data
      })
      
      return data
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FMP request timeout (15s)')
      }
      
      console.error(`❌ FMP Error for ${endpoint}:`, error)
      throw error
    }
  }

  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      console.log('📰 FMP getNews called with:', { params, config })
      
      const allArticles: NewsArticle[] = []

      // Tentar múltiplos endpoints
      const tasks: Promise<NewsArticle[]>[] = []

      // 1. Sempre tentar notícias gerais primeiro
      tasks.push(this.fetchGeneralNews(params, config))

      // 2. Se há tickers específicos, buscar notícias de stocks
      if (params.tickers && params.tickers.length > 0) {
        tasks.push(this.fetchStockNews(params, config))
      }

      // Executar tarefas
      console.log(`🔄 Executing ${tasks.length} FMP tasks...`)
      const results = await Promise.allSettled(tasks)
      
      // Processar resultados
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ FMP Task ${index} succeeded: ${result.value.length} articles`)
          allArticles.push(...result.value)
        } else {
          console.warn(`❌ FMP Task ${index} failed:`, result.reason)
        }
      })

      if (allArticles.length === 0) {
        console.warn('⚠️ No articles from any FMP endpoint')
        return []
      }

      // Processar artigos
      const processedArticles = this.processArticles(allArticles, params)
      const limitedArticles = processedArticles.slice(0, config.maxArticles || 50)

      console.log(`📰 FMP Final: ${allArticles.length} total → ${processedArticles.length} processed → ${limitedArticles.length} returned`)
      
      return limitedArticles

    } catch (error) {
      console.error('❌ FMP getNews failed:', error)
      throw error
    }
  }

  // Corrigir endpoint para notícias gerais
  private async fetchGeneralNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      console.log('📰 Fetching FMP general news...')
      
      const requestParams: FMPRequestParams = {
        page: Math.floor((params.offset || 0) / (params.limit || 20)),
        size: Math.min(params.limit || 20, 100)
      }

      const response = await this.makeRequest<{
        content: FMPGeneralNewsResponse[]
      }>('/v3/fmp/articles', requestParams)
      
      const articles = response.content
      
      if (!Array.isArray(articles)) {
        console.warn('❌ FMP general news: content is not an array:', typeof articles)
        return []
      }
      
      if (articles.length === 0) {
        console.warn('⚠️ FMP general news: empty content')
        return []
      }
      
      console.log(`✅ FMP general news: got ${articles.length} articles`)
      return articles.map((item, index) => this.convertGeneralNews(item, index))
      

    } catch (error) {
      console.error('❌ FMP general news failed:', error)
      
      // Se falhar, tentar endpoint alternativo
      try {
        console.log('🔄 Trying alternative FMP endpoint...')
        return await this.fetchAlternativeNews(params, config)
      } catch (altError) {
        console.error('❌ Alternative FMP endpoint also failed:', altError)
        return []
      }
    }
  }

  // Endpoint alternativo
  private async fetchAlternativeNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    const requestParams: FMPRequestParams = {
      limit: Math.min(params.limit || 20, 100)
    }

    // Tentar endpoint de stock news sem ticker específico
    const response = await this.makeRequest<FMPStockNewsResponse[]>('/v3/stock_news', requestParams)
    
    if (!Array.isArray(response)) {
      throw new Error('Alternative endpoint returned non-array')
    }

    return response.map((item, index) => this.convertStockNews(item, index))
  }

  // Buscar notícias por ticker (endpoint correto)
  private async fetchStockNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      console.log('📊 Fetching FMP stock news for tickers:', params.tickers)
      
      const requestParams: FMPRequestParams = {
        limit: Math.min(params.limit || 20, 100)
      }

      // Adicionar tickers se fornecidos
      if (Array.isArray(params.tickers) && params.tickers.length > 0) {
        requestParams.tickers = params.tickers.slice(0, 5).join(',')
      }

      // Endpoint correto para notícias de stocks
      const response = await this.makeRequest<FMPStockNewsResponse[]>('/v3/stock_news', requestParams)
      
      if (!Array.isArray(response)) {
        console.warn('❌ FMP stock news: response is not an array:', typeof response)
        return []
      }

      console.log(`✅ FMP stock news: got ${response.length} articles`)
      return response.map((item, index) => this.convertStockNews(item, index))

    } catch (error) {
      console.error('❌ FMP stock news failed:', error)
      return []
    }
  }

  // Teste simples para verificar se a API está funcionando
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing FMP connection...')
      
      // Teste simples com limite pequeno
      const response = await this.makeRequest<any>('/v3/stock_news', { limit: 1 })
      
      console.log('✅ FMP connection test successful:', response)
      return true
      
    } catch (error) {
      console.error('❌ FMP connection test failed:', error)
      return false
    }
  }

  // Resto dos métodos mantidos iguais...
  private processArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let processed = articles

    // Remover duplicatas
    processed = this.removeDuplicates(processed)

    // Aplicar filtros locais
    processed = this.applyLocalFilters(processed, params)

    // Ordenar
    processed = this.sortArticles(processed, params)

    return processed
  }

  private applyLocalFilters(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let filtered = articles

    // Filtro por termo de busca
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.summary.toLowerCase().includes(searchLower) ||
        article.content?.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por categoria
    if (params.category && params.category !== 'general') {
      filtered = filtered.filter(article => article.category === params.category)
    }

    return filtered
  }

  private sortArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    const sortBy = params.sortBy || 'publishedDate'
    const sortOrder = params.sortOrder || 'desc'

    return articles.sort((a, b) => {
      let comparison = 0

      if (sortBy === 'publishedDate') {
        comparison = new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  private convertGeneralNews(item: FMPGeneralNewsResponse, index: number): NewsArticle {
    return {
      id: this.generateId('general', item.link || item.title, index),
      title: this.sanitizeText(item.title) || 'Sem título',
      summary: this.extractSummary(item.content),
      content: this.sanitizeText(item.content),
      publishedDate: this.parseFMPDate(item.date),
      source: this.sanitizeText(item.site || item.author || 'Financial Modeling Prep'),
      url: item.link || '#',
      image: this.validateImageUrl(item.image),
      category: this.categorizeContent(item.title, item.content),
      tickers: this.extractTickers(item.tickers || ''),
      sentiment: this.analyzeSentiment(item.title + ' ' + item.content),
      author: this.sanitizeText(item.author),
      views: this.generateMockViews()
    }
  }

  private convertStockNews(item: FMPStockNewsResponse, index: number): NewsArticle {
    return {
      id: this.generateId('stock', item.url || item.title, index),
      title: this.sanitizeText(item.title) || 'Sem título',
      summary: this.extractSummary(item.text),
      content: this.sanitizeText(item.text),
      publishedDate: this.parseFMPDate(item.publishedDate),
      source: this.sanitizeText(item.site || 'FMP Stock News'),
      url: item.url || '#',
      image: this.validateImageUrl(item.image),
      category: this.categorizeContent(item.title, item.text),
      tickers: item.symbol ? [item.symbol.toUpperCase()] : [],
      sentiment: this.analyzeSentiment(item.title + ' ' + item.text),
      views: this.generateMockViews()
    }
  }

  // Métodos utilitários mantidos...
  private extractSummary(content: string, maxLength: number = 250): string {
    if (!content) return 'Sem resumo disponível'
    
    const cleanContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, ' ')
      .trim()
    
    if (cleanContent.length <= maxLength) {
      return cleanContent
    }
    
    const truncated = cleanContent.substring(0, maxLength)
    const lastSentence = truncated.lastIndexOf('.')
    
    if (lastSentence > maxLength * 0.6) {
      return truncated.substring(0, lastSentence + 1)
    }
    
    return truncated + '...'
  }

  private categorizeContent(title: string, content: string): NewsCategory {
    const text = `${title} ${content}`.toLowerCase()
    
    if (this.containsKeywords(text, ['bitcoin', 'crypto', 'ethereum', 'blockchain'])) {
      return 'crypto'
    }
    
    if (this.containsKeywords(text, ['earnings', 'quarterly', 'revenue', 'profit'])) {
      return 'earnings'
    }
    
    if (this.containsKeywords(text, ['fed', 'federal reserve', 'interest rate', 'inflation'])) {
      return 'economy'
    }
    
    if (this.containsKeywords(text, ['market', 'trading', 'stock', 'nasdaq', 'dow jones'])) {
      return 'market'
    }
    
    return 'general'
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword))
  }

  private analyzeSentiment(text: string): SentimentLabel {
    const positiveWords = ['bullish', 'surge', 'rally', 'gain', 'rise', 'up', 'positive', 'growth']
    const negativeWords = ['bearish', 'fall', 'drop', 'decline', 'down', 'negative', 'loss']

    const lowerText = text.toLowerCase()
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length

    if (positiveCount > negativeCount + 1) return 'positive'
    if (negativeCount > positiveCount + 1) return 'negative'
    return 'neutral'
  }

  private extractTickers(tickersString: string): string[] {
    if (!tickersString) return []
    
    return tickersString
      .split(/[,;|\s]+/)
      .map(ticker => ticker.trim().toUpperCase())
      .filter(ticker => /^[A-Z]{1,5}$/.test(ticker))
      .slice(0, 10)
  }

  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Map<string, NewsArticle>()
    
    articles.forEach(article => {
      const key = article.title.toLowerCase().replace(/[^\w\s]/g, '').trim().substring(0, 50)
      if (!seen.has(key)) {
        seen.set(key, article)
      }
    })
    
    return Array.from(seen.values())
  }

  private generateId(type: string, source: string, index: number): string {
    const timestamp = Date.now()
    const sourceHash = (source || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
    return `fmp-${type}-${timestamp}-${index}-${sourceHash}`
  }

  private sanitizeText(text: string): string {
    if (!text) return ''
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000)
  }

  private validateImageUrl(url: string): string | undefined {
    if (!url || typeof url !== 'string') return undefined
    
    try {
      new URL(url)
      return url.startsWith('http') ? url : undefined
    } catch {
      return undefined
    }
  }

  private parseFMPDate(dateString: string): string {
    if (!dateString) return new Date().toISOString()
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      return date.toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 50000) + 1000
  }

  // Health check melhorado
  async healthCheck(): Promise<{
    status: 'healthy' | 'error'
    latency?: number
    error?: string
    timestamp: string
    endpoint?: string
  }> {
    const startTime = Date.now()
    
    try {
      await this.testConnection()
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        endpoint: '/v3/stock_news'
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        endpoint: '/v3/stock_news'
      }
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    console.log('🔑 FMP API Key updated')
  }

  isConfigured(): boolean {
    const configured = Boolean(this.apiKey && this.apiKey.trim() !== '' && this.apiKey !== 'demo')
    console.log('🔑 FMP API configured:', configured, 'Key:', this.apiKey ? 'exists' : 'missing')
    return configured || this.apiKey === 'demo' // Permitir demo para teste
  }
}

export const fmpNewsService = new FMPNewsService()