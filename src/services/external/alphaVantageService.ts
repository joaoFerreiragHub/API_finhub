// services/external/alphaVantageService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

// Interfaces específicas do Alpha Vantage
interface AlphaVantageNewsItem {
  title: string
  url: string
  time_published: string
  authors: string[]
  summary: string
  banner_image?: string
  source: string
  category_within_source: string
  source_domain: string
  topics: Array<{
    topic: string
    relevance_score: string
  }>
  overall_sentiment_score: number
  overall_sentiment_label: string
  ticker_sentiment?: Array<{
    ticker: string
    relevance_score: string
    ticker_sentiment_score: string
    ticker_sentiment_label: string
  }>
}

interface AlphaVantageResponse {
  items: string
  sentiment_score_definition: string
  relevance_score_definition: string
  feed: AlphaVantageNewsItem[]
}

interface AlphaVantageRequestParams {
  function: string
  limit: number
  sort: 'LATEST' | 'EARLIEST' | 'RELEVANCE'
  tickers?: string
  topics?: string
  time_from?: string
  time_to?: string
  apikey?: string
}

class AlphaVantageService {
  private readonly baseUrl = 'https://www.alphavantage.co/query'
  private apiKey: string // Removido 'readonly' para permitir modificação
  private readonly rateLimitDelay = 12000 // 12 segundos (5 requests/min free tier)
  private lastRequestTime = 0

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || ''
  }

  // Rate limiting rigoroso para free tier
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      console.log(`⏳ Alpha Vantage rate limiting: waiting ${Math.round(waitTime/1000)}s`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  // Método base para requests com melhor error handling
  private async makeRequest<T>(params: AlphaVantageRequestParams): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Alpha Vantage API key not configured')
    }

    await this.waitForRateLimit()
    
    const url = new URL(this.baseUrl)
    
    // Adicionar todos os parâmetros
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })
    
    // Adicionar API key
    url.searchParams.append('apikey', this.apiKey)

    try {
      console.log(`🔄 Alpha Vantage Request: ${params.function}`)
      
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json() as T & { 
        'Error Message'?: string
        'Note'?: string
        'Information'?: string
      }
      
      // Verificar erros específicos da Alpha Vantage
      if ('Error Message' in data && data['Error Message']) {
        throw new Error(`Alpha Vantage Error: ${data['Error Message']}`)
      }
      
      if ('Note' in data && data['Note']) {
        throw new Error(`Rate Limit Exceeded: ${data['Note']}`)
      }
      
      if ('Information' in data && data['Information']) {
        throw new Error(`API Information: ${data['Information']}`)
      }
      
      console.log(`✅ Alpha Vantage Success`)
      return data
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Alpha Vantage request timeout (30s)')
      }
      
      console.error(`❌ Alpha Vantage Error:`, error)
      throw error
    }
  }

  // Método principal para buscar notícias
  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      const requestParams: AlphaVantageRequestParams = {
        function: 'NEWS_SENTIMENT',
        limit: Math.min(params.limit || 20, 1000), // Max 1000 para premium
        sort: this.mapSortOrder(params.sortOrder)
      }

      // Configurar filtros baseados nos parâmetros
      this.applyFilters(requestParams, params)

      const response = await this.makeRequest<AlphaVantageResponse>(requestParams)
      
      if (!response.feed || !Array.isArray(response.feed)) {
        console.log('⚠️ Alpha Vantage: No feed data received')
        return []
      }

      // Converter artigos
      const articles = response.feed.map((item, index) => 
        this.convertToNewsArticle(item, index)
      )

      // Aplicar filtros adicionais e limite
      const filteredArticles = this.applyLocalFilters(articles, params)
      const limitedArticles = filteredArticles.slice(0, config.maxArticles || 50)

      console.log(`📰 Alpha Vantage: ${response.feed.length} → ${limitedArticles.length} articles`)
      
      return limitedArticles

    } catch (error) {
      console.error('❌ Alpha Vantage getNews failed:', error)
      throw error
    }
  }

  // Aplicar filtros na requisição
  private applyFilters(requestParams: AlphaVantageRequestParams, params: NewsQueryParams): void {
    // Filtro por tickers
    if (params.tickers && params.tickers.length > 0) {
      requestParams.tickers = params.tickers.slice(0, 10).join(',') // Max 10 tickers
    }

    // Filtro por categoria → tópicos
    if (params.category) {
      requestParams.topics = this.mapCategoryToTopics(params.category)
    } else if (params.search) {
      // Se há termo de busca, usar como tópico
      requestParams.topics = this.sanitizeSearchTerm(params.search)
    } else {
      requestParams.topics = 'financial_markets'
    }

    // Filtros de tempo
    if (params.from) {
      requestParams.time_from = this.formatDateForAlphaVantage(params.from)
    }
    if (params.to) {
      requestParams.time_to = this.formatDateForAlphaVantage(params.to)
    }
  }

  // Aplicar filtros locais após receber dados
  private applyLocalFilters(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let filtered = articles

    // Filtro por termo de busca (se não foi usado como tópico)
    if (params.search && !params.category) {
      const searchLower = params.search.toLowerCase()
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.summary.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por sentimento
    if (params.sentiment) {
      filtered = filtered.filter(article => article.sentiment === params.sentiment)
    }

    // Ordenação
    if (params.sortBy === 'publishedDate') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.publishedDate).getTime()
        const dateB = new Date(b.publishedDate).getTime()
        return params.sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      })
    }

    return filtered
  }

  // Converter item Alpha Vantage para NewsArticle
  private convertToNewsArticle(item: AlphaVantageNewsItem, index: number): NewsArticle {
    return {
      id: `av-${this.generateId(item.url, index)}`,
      title: this.sanitizeText(item.title),
      summary: this.sanitizeText(item.summary),
      content: this.sanitizeText(item.summary), // AV não fornece conteúdo completo
      publishedDate: this.parseAlphaVantageDate(item.time_published),
      source: this.sanitizeText(item.source || item.source_domain || 'Alpha Vantage'),
      url: item.url,
      image: item.banner_image || undefined,
      category: this.determineCategory(item),
      sentiment: this.mapSentiment(item.overall_sentiment_label),
      tickers: this.extractRelevantTickers(item.ticker_sentiment),
      author: item.authors?.length > 0 ? item.authors[0] : undefined,
      views: this.generateMockViews()
    }
  }

  // Mapear categoria para tópicos Alpha Vantage
  private mapCategoryToTopics(category: NewsCategory): string {
    const topicMap: Record<NewsCategory, string> = {
      market: 'financial_markets,stock_market',
      crypto: 'blockchain,cryptocurrency,bitcoin',
      economy: 'economy_macro,economy_monetary',
      earnings: 'earnings,company_earnings',
      general: 'financial_markets',
      forex: 'forex,currency,exchange_rates'
    }
  
    return topicMap[category] || 'financial_markets'
  }
  

  // Determinar categoria baseada nos tópicos e conteúdo
  private determineCategory(item: AlphaVantageNewsItem): NewsCategory {
    // Verificar tópicos primeiro
    if (item.topics && item.topics.length > 0) {
      const topTopic = item.topics
        .sort((a, b) => parseFloat(b.relevance_score) - parseFloat(a.relevance_score))[0]
        ?.topic?.toLowerCase()

      if (topTopic?.includes('crypto') || topTopic?.includes('blockchain')) return 'crypto'
      if (topTopic?.includes('earnings') || topTopic?.includes('financial')) return 'earnings'
      if (topTopic?.includes('economy') || topTopic?.includes('monetary')) return 'economy'
      if (topTopic?.includes('market') || topTopic?.includes('trading')) return 'market'
    }

    // Verificar conteúdo como fallback
    const content = `${item.title} ${item.summary}`.toLowerCase()
    
    if (content.includes('crypto') || content.includes('bitcoin') || content.includes('ethereum')) return 'crypto'
    if (content.includes('earnings') || content.includes('revenue') || content.includes('profit')) return 'earnings'
    if (content.includes('fed') || content.includes('inflation') || content.includes('gdp')) return 'economy'
    if (content.includes('market') || content.includes('stock') || content.includes('trading')) return 'market'
    
    return 'general'
  }

  // Mapear sentimento Alpha Vantage
  private mapSentiment(sentimentLabel: string): SentimentLabel {
    if (!sentimentLabel) return 'neutral'
    
    const lower = sentimentLabel.toLowerCase()
    
    if (lower.includes('bullish') || lower.includes('positive')) return 'positive'
    if (lower.includes('bearish') || lower.includes('negative')) return 'negative'
    
    return 'neutral'
  }

  // Extrair tickers relevantes
  private extractRelevantTickers(tickerSentiment?: AlphaVantageNewsItem['ticker_sentiment']): string[] {
    if (!tickerSentiment || !Array.isArray(tickerSentiment)) return []
    
    return tickerSentiment
      .filter(item => parseFloat(item.relevance_score) > 0.3) // Apenas relevantes
      .sort((a, b) => parseFloat(b.relevance_score) - parseFloat(a.relevance_score))
      .map(item => item.ticker.toUpperCase())
      .slice(0, 5)
  }

  // Mapear ordem de classificação
  private mapSortOrder(sortOrder?: string): 'LATEST' | 'EARLIEST' | 'RELEVANCE' {
    if (sortOrder === 'asc') return 'EARLIEST'
    if (sortOrder === 'relevance') return 'RELEVANCE'
    return 'LATEST' // Default
  }

  // Parse de data Alpha Vantage
  private parseAlphaVantageDate(dateString: string): string {
    if (!dateString || dateString.length < 8) {
      return new Date().toISOString()
    }

    try {
      // Formato: "20240620T123000"
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      
      let hour = '00'
      let minute = '00'
      let second = '00'
      
      if (dateString.includes('T') && dateString.length >= 15) {
        hour = dateString.substring(9, 11)
        minute = dateString.substring(11, 13)
        second = dateString.substring(13, 15)
      }
      
      const isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
      
      // Validar se a data é válida
      const date = new Date(isoDate)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      
      return isoDate
    } catch (error) {
      console.error('Error parsing Alpha Vantage date:', dateString)
      return new Date().toISOString()
    }
  }

  // Formatar data para Alpha Vantage
  private formatDateForAlphaVantage(dateString: string): string {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid input date')
      }
      
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      const second = String(date.getSeconds()).padStart(2, '0')
      
      return `${year}${month}${day}T${hour}${minute}${second}`
    } catch (error) {
      console.error('Error formatting date for Alpha Vantage:', dateString)
      const now = new Date()
      return now.toISOString().replace(/[-:]/g, '').replace('.000Z', '')
    }
  }

  // Utilidades auxiliares
  private generateId(url: string, index: number): string {
    const timestamp = Date.now()
    const urlHash = url.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'unknown'
    return `${timestamp}-${index}-${urlHash}`.substring(0, 50)
  }

  private sanitizeText(text: string): string {
    if (!text) return ''
    return text.trim().replace(/\s+/g, ' ').substring(0, 1000)
  }

  private sanitizeSearchTerm(term: string): string {
    return term.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .substring(0, 50)
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 25000) + 1500
  }

  // Health check da API
  async healthCheck(): Promise<{
    status: 'healthy' | 'error'
    latency?: number
    error?: string
    timestamp: string
  }> {
    const startTime = Date.now()
    
    try {
      const testParams: AlphaVantageRequestParams = {
        function: 'NEWS_SENTIMENT',
        topics: 'financial_markets',
        limit: 1,
        sort: 'LATEST'
      }
      
      await this.makeRequest(testParams)
      
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

  // Verificar configuração
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '')
  }

  // Configurar API key (para testes)
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }
}

export const alphaVantageService = new AlphaVantageService()