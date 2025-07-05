// services/external/polygonService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

// Interfaces específicas do Polygon
interface PolygonPublisher {
  name: string
  homepage_url: string
  logo_url?: string
  favicon_url?: string
}

interface PolygonInsight {
  sentiment?: 'positive' | 'negative' | 'neutral' | 'bullish' | 'bearish'
  sentiment_reasoning?: string
}

interface PolygonNewsItem {
  id: string
  publisher: PolygonPublisher
  title: string
  author: string
  published_utc: string
  article_url: string
  tickers: string[]
  image_url?: string
  description: string
  keywords: string[]
  insights?: PolygonInsight[]
}

interface PolygonNewsResponse {
  status: 'OK' | 'ERROR'
  request_id: string
  next_url?: string
  count: number
  results: PolygonNewsItem[]
  error?: string
}

interface PolygonRequestParams {
  limit?: number
  order?: 'asc' | 'desc'
  'ticker.any_of'?: string
  'ticker.gte'?: string
  'ticker.lte'?: string
  'published_utc.gte'?: string
  'published_utc.lte'?: string
  'published_utc.gt'?: string
  'published_utc.lt'?: string
  apikey?: string
}

class PolygonService {
  private readonly baseUrl = 'https://api.polygon.io/v2'
  private apiKey: string
  private readonly rateLimitDelay = 12000 // 12s (5 req/min free tier)
  private lastRequestTime = 0

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || ''
  }

  // Rate limiting rigoroso para free tier
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      console.log(`⏳ Polygon rate limiting: waiting ${Math.round(waitTime/1000)}s`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  // Método base para requests
  private async makeRequest<T>(endpoint: string, params: PolygonRequestParams = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Polygon API key not configured')
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

    try {
      console.log(`🔄 Polygon Request: ${endpoint}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'FinHub-API/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Polygon HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json() as T & { status?: string; error?: string }
      
      // Verificar erros específicos do Polygon
      if ('status' in data && data.status === 'ERROR') {
        throw new Error(`Polygon API Error: ${data.error || 'Unknown error'}`)
      }
      
      // console.log(`✅ Polygon Success`,data)
      return data
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Polygon request timeout (30s)')
      }
      
      console.error(`❌ Polygon Error for ${endpoint}:`, error)
      throw error
    }
  }

  // Método principal para buscar notícias
  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      const requestParams: PolygonRequestParams = {
        limit: Math.min(params.limit || 20, 1000), // Polygon suporta até 1000
        order: this.mapSortOrder(params.sortOrder)
      }

      // Aplicar filtros
      this.applyFilters(requestParams, params)

      const response = await this.makeRequest<PolygonNewsResponse>('/reference/news', requestParams)
      
      if (!response.results || !Array.isArray(response.results)) {
        console.warn('Polygon: No results in response')
        return []
      }

      // Converter e processar artigos
      const articles = response.results.map((item, index) => 
        this.convertPolygonArticle(item, index)
      )

      // Aplicar filtros locais
      const filteredArticles = this.applyLocalFilters(articles, params)
      const limitedArticles = filteredArticles.slice(0, config.maxArticles || 50)

      console.log(`📰 Polygon: ${response.results.length} → ${filteredArticles.length} → ${limitedArticles.length} articles`)
      
      return limitedArticles

    } catch (error) {
      console.error('❌ Polygon getNews failed:', error)
      throw error
    }
  }

  // Aplicar filtros na requisição
  private applyFilters(requestParams: PolygonRequestParams, params: NewsQueryParams): void {
    // Filtros por ticker
    if (params.tickers && params.tickers.length > 0) {
      // Polygon suporta múltiplos tickers separados por vírgula
      requestParams['ticker.any_of'] = params.tickers.slice(0, 10).join(',') // Limitar a 10
    }

    // Filtros de data
    if (params.from) {
      requestParams['published_utc.gte'] = this.formatDateForPolygon(params.from)
    }
    if (params.to) {
      requestParams['published_utc.lte'] = this.formatDateForPolygon(params.to)
    }
  }

  // Aplicar filtros locais
  private applyLocalFilters(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let filtered = articles

    // Filtro por categoria
    if (params.category && params.category !== 'general') {
      filtered = filtered.filter(article => article.category === params.category)
    }

    // Filtro por sentimento
    if (params.sentiment) {
      filtered = filtered.filter(article => article.sentiment === params.sentiment)
    }

    // Filtro por termo de busca
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.summary.toLowerCase().includes(searchLower)
      )
    }

    // Remover duplicatas
    filtered = this.removeDuplicates(filtered)

    // Ordenar se necessário
    if (params.sortBy && params.sortBy !== 'publishedDate') {
      filtered = this.sortArticles(filtered, params)
    }

    return filtered
  }

  // Converter artigo Polygon para formato padrão
  private convertPolygonArticle(item: PolygonNewsItem, index: number): NewsArticle {
    return {
      id: this.generateId(item.id, index),
      title: this.sanitizeText(item.title),
      summary: this.sanitizeText(item.description),
      content: this.sanitizeText(item.description), // Polygon não fornece conteúdo completo
      publishedDate: this.parsePolygonDate(item.published_utc),
      source: this.sanitizeText(item.publisher?.name || 'Polygon'),
      url: item.article_url || '#',
      image: this.validateImageUrl(item.image_url),
      category: this.categorizeContent(item),
      sentiment: this.extractSentiment(item),
      tickers: this.normalizeTickers(item.tickers),
      author: this.sanitizeText(item.author),
      views: this.generateMockViews()
    }
  }

  // Categorizar baseado em múltiplos fatores
  private categorizeContent(item: PolygonNewsItem): NewsCategory {
    const textContent = `${item.title} ${item.description}`.toLowerCase()
    const keywords = item.keywords?.join(' ').toLowerCase() || ''
    const combinedText = `${textContent} ${keywords}`
    
    // Análise por keywords (peso maior)
    if (item.keywords && item.keywords.length > 0) {
      const categoryFromKeywords = this.categorizeByKeywords(item.keywords)
      if (categoryFromKeywords !== 'general') {
        return categoryFromKeywords
      }
    }
    
    // Análise por conteúdo (fallback)
    return this.categorizeByContent(combinedText)
  }

  // Categorizar por keywords (mais preciso)
  private categorizeByKeywords(keywords: string[]): NewsCategory {
    const keywordLower = keywords.map(k => k.toLowerCase())
    
    // Crypto keywords
    const cryptoKeywords = ['bitcoin', 'cryptocurrency', 'blockchain', 'ethereum', 'crypto', 'defi', 'nft']
    if (keywordLower.some(k => cryptoKeywords.some(ck => k.includes(ck)))) {
      return 'crypto'
    }
    
    // Earnings keywords
    const earningsKeywords = ['earnings', 'quarterly', 'revenue', 'profit', 'financial-results']
    if (keywordLower.some(k => earningsKeywords.some(ek => k.includes(ek)))) {
      return 'earnings'
    }
    
    // Economy keywords
    const economyKeywords = ['federal-reserve', 'inflation', 'gdp', 'unemployment', 'monetary-policy']
    if (keywordLower.some(k => economyKeywords.some(econ => k.includes(econ)))) {
      return 'economy'
    }
    
    // Market keywords
    const marketKeywords = ['stock-market', 'trading', 'nasdaq', 'market-analysis', 'investment']
    if (keywordLower.some(k => marketKeywords.some(mk => k.includes(mk)))) {
      return 'market'
    }
    
    return 'general'
  }

  // Categorizar por conteúdo (fallback)
  private categorizeByContent(text: string): NewsCategory {
    if (this.containsKeywords(text, ['bitcoin', 'crypto', 'ethereum', 'blockchain', 'defi'])) {
      return 'crypto'
    }
    if (this.containsKeywords(text, ['earnings', 'quarterly', 'revenue', 'profit', 'financial results'])) {
      return 'earnings'
    }
    if (this.containsKeywords(text, ['federal reserve', 'fed', 'inflation', 'gdp', 'unemployment'])) {
      return 'economy'
    }
    if (this.containsKeywords(text, ['stock market', 'trading', 'nasdaq', 'dow jones', 'market'])) {
      return 'market'
    }
    
    return 'general'
  }

  // Extrair sentimento (prioriza insights do Polygon)
  private extractSentiment(item: PolygonNewsItem): SentimentLabel {
    // Usar insights do Polygon se disponível (mais preciso)
    if (item.insights && item.insights.length > 0) {
      const insight = item.insights[0]
      if (insight.sentiment) {
        return this.mapPolygonSentiment(insight.sentiment)
      }
    }
    
    // Fallback para análise básica
    return this.analyzeSentiment(item.title, item.description)
  }

  // Mapear sentimento do Polygon
  private mapPolygonSentiment(sentiment: string): SentimentLabel {
    const lower = sentiment.toLowerCase()
    
    if (lower === 'positive' || lower === 'bullish') return 'positive'
    if (lower === 'negative' || lower === 'bearish') return 'negative'
    
    return 'neutral'
  }

  // Análise de sentimento básica
  private analyzeSentiment(title: string, description: string): SentimentLabel {
    const text = `${title} ${description}`.toLowerCase()
    
    const positiveWords = [
      'surge', 'rally', 'gain', 'rise', 'up', 'growth', 'beat', 'strong',
      'outperform', 'upgrade', 'breakthrough', 'record', 'high', 'boom',
      'success', 'profit', 'bullish', 'soar', 'climb', 'positive'
    ]
    
    const negativeWords = [
      'fall', 'drop', 'decline', 'down', 'loss', 'weak', 'miss',
      'underperform', 'downgrade', 'crash', 'low', 'concern', 'risk',
      'warning', 'cut', 'bearish', 'plunge', 'tumble', 'negative'
    ]

    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length

    if (positiveCount > negativeCount + 1) return 'positive'
    if (negativeCount > positiveCount + 1) return 'negative'
    return 'neutral'
  }

  // Utilitários auxiliares
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword))
  }

  private normalizeTickers(tickers: string[]): string[] {
    if (!tickers || !Array.isArray(tickers)) return []
    
    return tickers
      .map(ticker => ticker.toUpperCase().trim())
      .filter(ticker => /^[A-Z]{1,5}$/.test(ticker))
      .slice(0, 10) // Limitar a 10 tickers
  }

  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>()
    return articles.filter(article => {
      const key = article.title.toLowerCase().replace(/[^\w\s]/g, '').trim().substring(0, 50)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private sortArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    if (params.sortBy === 'views') {
      return articles.sort((a, b) => (b.views || 0) - (a.views || 0))
    }
    
    if (params.sortBy === 'relevance' && params.search) {
      return articles.sort((a, b) => 
        this.calculateRelevance(b, params.search!) - this.calculateRelevance(a, params.search!)
      )
    }
    
    return articles
  }

  private calculateRelevance(article: NewsArticle, searchTerm: string): number {
    const searchLower = searchTerm.toLowerCase()
    let score = 0
    
    const titleMatches = (article.title.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length
    score += titleMatches * 3
    
    const summaryMatches = (article.summary.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length
    score += summaryMatches * 2
    
    return score
  }

  private mapSortOrder(sortOrder?: string): 'asc' | 'desc' {
    return sortOrder === 'asc' ? 'asc' : 'desc'
  }

  private generateId(originalId: string, index: number): string {
    const timestamp = Date.now()
    const cleanId = originalId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
    return `polygon-${timestamp}-${index}-${cleanId}`
  }

  private sanitizeText(text: string): string {
    if (!text) return ''
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)
  }

  private validateImageUrl(url?: string): string | undefined {
    if (!url || typeof url !== 'string') return undefined
    
    try {
      new URL(url)
      return url.startsWith('http') ? url : undefined
    } catch {
      return undefined
    }
  }

  private parsePolygonDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) throw new Error('Invalid date')
      return date.toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private formatDateForPolygon(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 45000) + 3000 // Range alto (Polygon é premium)
  }

  // Método otimizado para ticker específico
  async getNewsByTicker(ticker: string, options: {
    limit?: number
    from?: string
    to?: string
  } = {}): Promise<NewsArticle[]> {
    try {
      const params: NewsQueryParams = {
        tickers: [ticker.toUpperCase()],
        limit: options.limit || 20,
        from: options.from,
        to: options.to,
        sortBy: 'publishedDate',
        sortOrder: 'desc'
      }

      const config: SourceConfig = {
        endpoint: '/reference/news',
        rateLimit: { requestsPerMinute: 5, requestsPerDay: 1000 },
        timeout: 30000,
        retries: 3,
        refreshInterval: 300000,
        maxArticles: options.limit || 20,
        enabled: true,
        priority: 1
      }
      
      return await this.getNews(params, config)

    } catch (error) {
      console.error(`❌ Polygon getNewsByTicker failed for ${ticker}:`, error)
      return []
    }
  }

  // Buscar notícias com paginação
  async getNewsWithPagination(params: NewsQueryParams, config: SourceConfig): Promise<{
    articles: NewsArticle[]
    hasMore: boolean
    nextUrl?: string
  }> {
    try {
      const requestParams: PolygonRequestParams = {
        limit: Math.min(params.limit || 20, 1000),
        order: this.mapSortOrder(params.sortOrder)
      }

      this.applyFilters(requestParams, params)

      const response = await this.makeRequest<PolygonNewsResponse>('/reference/news', requestParams)
      
      const articles = response.results?.map((item, index) => 
        this.convertPolygonArticle(item, index)
      ) || []

      return {
        articles: this.applyLocalFilters(articles, params),
        hasMore: Boolean(response.next_url),
        nextUrl: response.next_url
      }

    } catch (error) {
      console.error('❌ Polygon getNewsWithPagination failed:', error)
      return { articles: [], hasMore: false }
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'error'
    latency?: number
    error?: string
    timestamp: string
  }> {
    const startTime = Date.now()
    
    try {
      const params: PolygonRequestParams = { limit: 1 }
      await this.makeRequest('/reference/news', params)
      
      return {
        status: 'healthy',
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }

  // Obter limites da API baseado no plano
  getApiLimits(): {
    requestsPerMinute: number
    requestsPerDay: number
    plan: 'free' | 'starter' | 'developer' | 'professional'
  } {
    // TODO: Implementar detecção automática do plano baseada na API key
    return {
      requestsPerMinute: 5,
      requestsPerDay: 1000,
      plan: 'free'
    }
  }

  // Configuração
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '')
  }
}

export const polygonService = new PolygonService()