// services/external/newsApiService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

// Interfaces específicas do NewsAPI
interface NewsAPIArticle {
  source: {
    id: string | null
    name: string
  }
  author: string | null
  title: string
  description: string
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string
}

interface NewsAPIResponse {
  status: string
  totalResults: number
  articles: NewsAPIArticle[]
  code?: string
  message?: string
}

interface NewsAPIRequestParams {
  q?: string
  language: 'en' | 'pt' | 'es'
  sortBy: 'relevancy' | 'popularity' | 'publishedAt'
  pageSize: number
  page: number
  from?: string
  to?: string
  country?: string
  category?: 'business' | 'entertainment' | 'general' | 'health' | 'science' | 'sports' | 'technology'
  sources?: string
  domains?: string
  excludeDomains?: string
}

class NewsApiService {
  private readonly baseUrl = 'https://newsapi.org/v2'
  private apiKey: string
  private readonly rateLimitDelay = 1000 // 1s entre requests (NewsAPI free: 1000 req/day)
  private lastRequestTime = 0

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || ''
  }

  // Rate limiting para NewsAPI
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  // Método base para requests
  private async makeRequest<T>(endpoint: string, params: Partial<NewsAPIRequestParams> = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('NewsAPI key not configured')
    }

    await this.waitForRateLimit()
    
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    // Adicionar parâmetros válidos
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    try {
      console.log(`🔄 NewsAPI Request: ${endpoint}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      const response = await fetch(url.toString(), {
        headers: {
          'X-API-Key': this.apiKey,
          'User-Agent': 'FinHub-API/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`NewsAPI HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json() as T & { status?: string; code?: string; message?: string }
      
      // Verificar erros específicos do NewsAPI
      if ('status' in data && data.status === 'error') {
        throw new Error(`NewsAPI Error: ${data.code} - ${data.message}`)
      }
      
      console.log(`✅ NewsAPI Success`)
      return data
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('NewsAPI request timeout (30s)')
      }
      
      console.error(`❌ NewsAPI Error for ${endpoint}:`, error)
      throw error
    }
  }

  // Método principal para buscar notícias
  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      // NewsAPI funciona melhor com queries específicas
      const searchQuery = this.buildSearchQuery(params)
      
      const requestParams: Partial<NewsAPIRequestParams> = {
        q: searchQuery,
        language: 'en',
        sortBy: this.mapSortBy(params.sortBy, params.sortOrder),
        pageSize: Math.min(params.limit || 20, 100), // NewsAPI max 100
        page: Math.floor((params.offset || 0) / (params.limit || 20)) + 1
      }

      // Aplicar filtros de data
      this.applyDateFilters(requestParams, params)

      // Aplicar filtros de fonte
      this.applySourceFilters(requestParams, params)

      const response = await this.makeRequest<NewsAPIResponse>('/everything', requestParams)
      
      if (!response.articles || !Array.isArray(response.articles)) {
        console.warn('NewsAPI: No articles in response')
        return []
      }

      // Converter e processar artigos
      const articles = response.articles.map((item, index) => 
        this.convertNewsApiArticle(item, index)
      )

      // Aplicar filtros locais
      const filteredArticles = this.applyLocalFilters(articles, params)
      const limitedArticles = filteredArticles.slice(0, config.maxArticles || 50)

      console.log(`📰 NewsAPI: ${response.articles.length} → ${filteredArticles.length} → ${limitedArticles.length} articles`)
      
      return limitedArticles

    } catch (error) {
      console.error('❌ NewsAPI getNews failed:', error)
      throw error
    }
  }

  // Construir query de pesquisa otimizada
  private buildSearchQuery(params: NewsQueryParams): string {
    const queryParts: string[] = []

    // Termo de pesquisa específico
    if (params.search) {
      queryParts.push(`"${params.search}"`)
    }

    // Tickers específicos com alta prioridade
    if (params.tickers && params.tickers.length > 0) {
      const tickerQueries = params.tickers
        .slice(0, 5) // Limitar a 5 tickers para não exceder limite do NewsAPI
        .map(ticker => `"${ticker}"`)
      queryParts.push(`(${tickerQueries.join(' OR ')})`)
    }

    // Keywords de categoria
    if (params.category && params.category !== 'general') {
      const categoryKeywords = this.getCategoryKeywords(params.category)
      if (categoryKeywords.length > 0) {
        queryParts.push(`(${categoryKeywords.join(' OR ')})`)
      }
    }

    // Query padrão se nenhuma específica
    if (queryParts.length === 0) {
      queryParts.push('(finance OR stock OR market OR trading)')
    }

    // Adicionar contexto financeiro se não estiver presente
    const query = queryParts.join(' AND ')
    if (!query.toLowerCase().includes('financ') && !query.toLowerCase().includes('stock') && !query.toLowerCase().includes('market')) {
      return `(${query}) AND (finance OR financial OR stock OR market)`
    }

    return query
  }

  // Aplicar filtros de data
  private applyDateFilters(requestParams: Partial<NewsAPIRequestParams>, params: NewsQueryParams): void {
    if (params.from) {
      requestParams.from = this.formatDateForNewsAPI(params.from)
    }
    if (params.to) {
      requestParams.to = this.formatDateForNewsAPI(params.to)
    }
  }

  // Aplicar filtros de fonte
  private applySourceFilters(requestParams: Partial<NewsAPIRequestParams>, params: NewsQueryParams): void {
    if (params.sources && params.sources.length > 0) {
      // NewsAPI aceita lista de sources separada por vírgula
      const validSources = params.sources
        .filter(source => this.isValidNewsAPISource(source))
        .slice(0, 20) // NewsAPI limita a 20 sources
      
      if (validSources.length > 0) {
        requestParams.sources = validSources.join(',')
      }
    }
  }

  // Aplicar filtros locais
  private applyLocalFilters(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let filtered = articles

    // Filtro por categoria (refinamento pós-busca)
    if (params.category && params.category !== 'general') {
      filtered = filtered.filter(article => article.category === params.category)
    }

    // Filtro por sentimento
    if (params.sentiment) {
      filtered = filtered.filter(article => article.sentiment === params.sentiment)
    }

    // Filtro adicional por termo de busca (para refinar)
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
    if (params.sortBy === 'views' || params.sortBy === 'relevance') {
      filtered = this.sortArticles(filtered, params)
    }

    return filtered
  }

  // Converter artigo NewsAPI para formato padrão
  private convertNewsApiArticle(item: NewsAPIArticle, index: number): NewsArticle {
    return {
      id: this.generateId(item.url, index),
      title: this.sanitizeText(item.title),
      summary: this.extractSummary(item.description, item.content),
      content: this.sanitizeText(item.content),
      publishedDate: this.parseNewsAPIDate(item.publishedAt),
      source: this.sanitizeText(item.source.name || 'NewsAPI'),
      url: item.url,
      image: this.validateImageUrl(item.urlToImage),
      category: this.categorizeContent(item.title, item.description),
      sentiment: this.analyzeSentiment(item.title, item.description),
      tickers: this.extractTickers(item.title, item.description),
      author: this.sanitizeText(item.author),
      views: this.generateMockViews()
    }
  }

  // Obter keywords por categoria
  private getCategoryKeywords(category: NewsCategory): string[] {
    const keywordMap: Record<NewsCategory, string[]> = {
      market: ['"stock market"', '"trading"', '"NYSE"', '"NASDAQ"', '"S&P 500"'],
      crypto: ['"bitcoin"', '"cryptocurrency"', '"blockchain"', '"ethereum"', '"crypto"'],
      economy: ['"federal reserve"', '"inflation"', '"GDP"', '"unemployment"', '"interest rate"'],
      earnings: ['"earnings"', '"quarterly results"', '"revenue"', '"profit"', '"financial results"'],
      general: ['"finance"', '"financial"', '"investment"', '"economy"'],
      forex: ['"forex"', '"foreign exchange"', '"currency trading"', '"USD"', '"EUR"', '"JPY"']
    }
  
    return keywordMap[category] || keywordMap.general
  }
  

  // Mapear ordenação
  private mapSortBy(sortBy?: string, sortOrder?: string): 'relevancy' | 'popularity' | 'publishedAt' {
    if (sortBy === 'relevance') return 'relevancy'
    if (sortBy === 'views') return 'popularity'
    if (sortBy === 'publishedDate') return 'publishedAt'
    
    return 'publishedAt' // Default
  }

  // Categorizar conteúdo
  private categorizeContent(title: string, description: string): NewsCategory {
    const text = `${title} ${description}`.toLowerCase()
    
    // Crypto patterns
    if (this.containsPatterns(text, ['bitcoin', 'crypto', 'ethereum', 'blockchain', 'defi', 'nft'])) {
      return 'crypto'
    }
    
    // Earnings patterns
    if (this.containsPatterns(text, ['earnings', 'quarterly', 'revenue', 'profit', 'q1', 'q2', 'q3', 'q4', 'financial results'])) {
      return 'earnings'
    }
    
    // Economy patterns
    if (this.containsPatterns(text, ['federal reserve', 'fed', 'inflation', 'gdp', 'unemployment', 'interest rate', 'economic policy'])) {
      return 'economy'
    }
    
    // Market patterns
    if (this.containsPatterns(text, ['stock market', 'trading', 'nasdaq', 'dow jones', 's&p', 'market index', 'wall street'])) {
      return 'market'
    }
    
    return 'general'
  }

  // Analisar sentimento
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

  // Extrair tickers do texto
  private extractTickers(title: string, description: string): string[] {
    const text = `${title} ${description}`
    const tickerRegex = /\$?([A-Z]{2,5})(?=\s|$|[.,!?;:])/g
    const matches = text.match(tickerRegex) || []
    
    const commonWords = new Set([
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
      'WAS', 'ONE', 'OUR', 'HAD', 'HAS', 'HIS', 'LET', 'WHO', 'DID', 'YES',
      'OLD', 'GET', 'NOW', 'NEW', 'MAY', 'WAY', 'USE', 'MAN', 'DAY', 'TOO',
      'OWN', 'SAY', 'SHE', 'WHY', 'HOW', 'ITS', 'WHO', 'OIL', 'CEO', 'CFO',
      'USA', 'API', 'SEC', 'FDA', 'GDP', 'ETF', 'IPO', 'LLC', 'INC', 'LTD'
    ])
    
    return [...new Set(matches)]
      .map(match => match.replace('$', '').toUpperCase())
      .filter(ticker => !commonWords.has(ticker) && ticker.length >= 2 && ticker.length <= 5)
      .slice(0, 5)
  }

  // Utilitários auxiliares
  private extractSummary(description: string, content: string): string {
    if (description && description.length > 10) {
      return this.sanitizeText(description).substring(0, 300)
    }
    
    if (content) {
      const cleanContent = content.replace(/\[.*?\]$/, '').trim() // Remove [+n chars]
      return this.sanitizeText(cleanContent).substring(0, 300)
    }
    
    return 'Sem resumo disponível'
  }

  private containsPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern))
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
    console.log(`✅ newsApi  Success`,articles)
    return articles
  }

  private calculateRelevance(article: NewsArticle, searchTerm: string): number {
    const searchLower = searchTerm.toLowerCase()
    let score = 0
    
    // Título tem peso maior
    const titleMatches = (article.title.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length
    score += titleMatches * 3
    
    // Resumo tem peso médio
    const summaryMatches = (article.summary.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length
    score += summaryMatches * 2
    
    return score
  }

  private generateId(url: string, index: number): string {
    const timestamp = Date.now()
    const urlHash = url.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'unknown'
    return `newsapi-${timestamp}-${index}-${urlHash}`.substring(0, 60)
  }

  private sanitizeText(text: string | null): string {
    if (!text) return ''
    return text
      .replace(/\[.*?\]$/, '') // Remove [+n chars] do NewsAPI
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)
  }

  private validateImageUrl(url: string | null): string | undefined {
    if (!url || typeof url !== 'string') return undefined
    
    try {
      new URL(url)
      return url.startsWith('http') ? url : undefined
    } catch {
      return undefined
    }
  }

  private parseNewsAPIDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) throw new Error('Invalid date')
      return date.toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private formatDateForNewsAPI(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private isValidNewsAPISource(source: string): boolean {
    // NewsAPI usa source IDs específicos
    // Esta é uma validação básica - em produção, usar lista oficial
    return source.length > 0 && source.length < 50 && /^[a-z0-9-]+$/.test(source.toLowerCase())
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 60000) + 2000 // NewsAPI tem fontes populares
  }

  // Buscar top headlines (método adicional)
  async getTopHeadlines(category?: NewsCategory, country: string = 'us'): Promise<NewsArticle[]> {
    try {
      const params: Partial<NewsAPIRequestParams> = {
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 20,
        page: 1,
        country
      }

      if (category && category !== 'general') {
        params.category = this.mapToNewsAPICategory(category)
      }

      const response = await this.makeRequest<NewsAPIResponse>('/top-headlines', params)
      
      if (!response.articles) return []
      
      return response.articles.map((item, index) => 
        this.convertNewsApiArticle(item, index)
      )

    } catch (error) {
      console.error('❌ NewsAPI top headlines failed:', error)
      return []
    }
  }

  private mapToNewsAPICategory(category: NewsCategory): 'business' | 'technology' | 'general' {
    const categoryMap: Record<NewsCategory, 'business' | 'technology' | 'general'> = {
      market: 'business',
      economy: 'business',
      earnings: 'business',
      general: 'general',
      crypto: 'technology',
      forex: 'business' // ou 'general', conforme preferires
    }
  
    return categoryMap[category]
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
      const params: Partial<NewsAPIRequestParams> = {
        q: 'finance',
        pageSize: 1,
        language: 'en',
        sortBy: 'publishedAt',
        page: 1
      }
      
      await this.makeRequest('/everything', params)
      
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

  // Configuração
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '')
  }
}

export const newsApiService = new NewsApiService()