// src/services/external/yahooFinanceService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

// ===== INTERFACES ESPECÍFICAS DO YAHOO FINANCE =====
interface YahooFinanceNewsItem {
  uuid: string
  title: string
  publisher: string
  link: string
  providerPublishTime: number
  type: string
  thumbnail?: {
    resolutions: Array<{
      url: string
      width: number
      height: number
    }>
  }
  relatedTickers?: string[]
}

interface YahooFinanceResponse {
  items: {
    result: YahooFinanceNewsItem[]
    count: number
  }
}

interface YahooFinanceRequestParams {
  symbols?: string          // Símbolos separados por vírgula (AAPL,MSFT,TSLA)
  count?: number           // Número de notícias (max: 100)
  start?: number           // Offset para paginação
  category?: string        // Categoria (business, technology, etc.)
  region?: string          // Região (US, BR, etc.)
  lang?: string           // Idioma (en, pt)
  textFormat?: string     // Formato do texto (html, text)
}

class YahooFinanceService {
  private readonly baseUrl = 'https://query1.finance.yahoo.com/v1/finance/search'
  private readonly newsBaseUrl = 'https://query2.finance.yahoo.com/v1/finance/screener'
  private readonly rateLimitDelay = 500 // 500ms entre requests

  private lastRequestTime = 0

  constructor() {
    // Yahoo Finance é público, não precisa de API key
  }

  // Verificar se o serviço está configurado
  isConfigured(): boolean {
    return true // Yahoo Finance é público
  }

  // Rate limiting
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  // Request base
  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    await this.waitForRateLimit()
    
    const url = new URL(endpoint)
    
    // Adicionar parâmetros padrão
    const defaultParams = {
      formatted: 'true',
      crumb: 'generated_crumb', // Yahoo requer um crumb
      lang: 'en-US',
      region: 'US',
      corsDomain: 'finance.yahoo.com'
    }

    Object.entries({ ...defaultParams, ...params }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    try {
      console.log(`🔄 Yahoo Finance Request: ${endpoint}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinHub-API/1.0)',
          'Accept': 'application/json',
          'Origin': 'https://finance.yahoo.com',
          'Referer': 'https://finance.yahoo.com/'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json() as T
      console.log(`✅ Yahoo Finance Success`)
      return data
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Yahoo Finance request timeout (15s)')
      }
      
      console.error(`❌ Yahoo Finance Error for ${endpoint}:`, error)
      throw error
    }
  }

  // Método principal para buscar notícias
  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      // Yahoo Finance funciona melhor com símbolos específicos
      const requestParams: Partial<YahooFinanceRequestParams> = {
        count: Math.min(params.limit || 20, 100), // Yahoo max 100
        start: params.offset || 0,
        region: 'US',
        lang: 'en'
      }

      // Aplicar filtros de símbolos/tickers
      if (params.tickers && params.tickers.length > 0) {
        // Yahoo aceita múltiplos símbolos separados por vírgula
        requestParams.symbols = params.tickers.slice(0, 10).join(',') // Limitar a 10
      }

      // Categoria para Yahoo Finance
      if (params.category && params.category !== 'general') {
        requestParams.category = this.mapToYahooCategory(params.category)
      }

      let endpoint = `${this.newsBaseUrl}/predefined/saved`
      
      // Se não há tickers específicos, usar endpoint de notícias gerais
      if (!requestParams.symbols) {
        endpoint = 'https://query2.finance.yahoo.com/v1/finance/trending/US'
        // Para notícias gerais, usar um conjunto padrão de símbolos populares
        requestParams.symbols = 'AAPL,MSFT,GOOGL,AMZN,TSLA,META,NVDA,JPM,JNJ,V'
      }

      const response = await this.makeRequest<YahooFinanceResponse>(endpoint, requestParams as Record<string, string>)
      
      if (!response.items?.result || !Array.isArray(response.items.result)) {
        console.warn('Yahoo Finance: No articles in response')
        return []
      }

      // Converter e processar artigos
      const articles = response.items.result.map((item, index) => 
        this.convertYahooFinanceArticle(item, index)
      )

      // Aplicar filtros locais
      const filteredArticles = this.applyLocalFilters(articles, params)
      const limitedArticles = filteredArticles.slice(0, config.maxArticles || 50)

      console.log(`📰 Yahoo Finance: ${response.items.result.length} → ${filteredArticles.length} → ${limitedArticles.length} articles`)
      
      return limitedArticles

    } catch (error) {
      console.error('❌ Yahoo Finance getNews failed:', error)
      throw error
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

  // Converter artigo Yahoo Finance para formato padrão
  private convertYahooFinanceArticle(item: YahooFinanceNewsItem, index: number): NewsArticle {
    const publishedDate = new Date(item.providerPublishTime * 1000).toISOString()
    
    return {
      id: this.generateId(item.uuid, index),
      title: this.sanitizeText(item.title),
      summary: this.extractSummary(item.title), // Yahoo não fornece summary separado
      content: this.sanitizeText(item.title), // Yahoo não fornece conteúdo completo na API pública
      publishedDate,
      source: this.sanitizeText(item.publisher || 'Yahoo Finance'),
      url: item.link,
      image: this.extractBestImage(item.thumbnail),
      category: this.categorizeContent(item.title, item.publisher),
      sentiment: this.analyzeSentiment(item.title),
      tickers: item.relatedTickers || this.extractTickers(item.title),
      author: this.sanitizeText(item.publisher),
      views: this.generateMockViews()
    }
  }

  // Mapear categoria para Yahoo Finance
  private mapToYahooCategory(category: NewsCategory): string {
    const categoryMap: Record<NewsCategory, string> = {
      market: 'markets',
      economy: 'economy', 
      earnings: 'earnings',
      crypto: 'cryptocurrencies',
      general: 'finance',
      forex: 'currencies'
    }
    
    return categoryMap[category] || 'finance'
  }

  // Extrair melhor imagem
  private extractBestImage(thumbnail?: YahooFinanceNewsItem['thumbnail']): string | undefined {
    if (!thumbnail?.resolutions || thumbnail.resolutions.length === 0) {
      return undefined
    }

    // Preferir imagens de resolução média (400-800px de largura)
    const sortedResolutions = thumbnail.resolutions
      .filter(res => res.url && res.width > 200)
      .sort((a, b) => {
        const aScore = Math.abs(a.width - 600) // Preferir próximo de 600px
        const bScore = Math.abs(b.width - 600)
        return aScore - bScore
      })

    return sortedResolutions[0]?.url
  }

  // Categorizar conteúdo baseado em título e publisher
  private categorizeContent(title: string, publisher: string): NewsCategory {
    const text = `${title} ${publisher}`.toLowerCase()
    
    // Crypto patterns
    if (this.containsPatterns(text, ['bitcoin', 'crypto', 'ethereum', 'blockchain', 'binance', 'coinbase'])) {
      return 'crypto'
    }
    
    // Earnings patterns
    if (this.containsPatterns(text, ['earnings', 'quarterly', 'revenue', 'profit', 'q1', 'q2', 'q3', 'q4', 'results'])) {
      return 'earnings'
    }
    
    // Economy patterns
    if (this.containsPatterns(text, ['fed', 'federal reserve', 'inflation', 'gdp', 'unemployment', 'rate', 'policy'])) {
      return 'economy'
    }
    
    // Market patterns
    if (this.containsPatterns(text, ['market', 'stock', 'trading', 'nasdaq', 'dow', 's&p', 'index', 'wall street'])) {
      return 'market'
    }
    
    return 'general'
  }

  // Analisar sentimento simples
  private analyzeSentiment(title: string): SentimentLabel {
    const text = title.toLowerCase()
    
    const positiveWords = [
      'surge', 'rally', 'gain', 'rise', 'up', 'growth', 'beat', 'strong',
      'outperform', 'upgrade', 'breakthrough', 'record', 'high', 'boom',
      'success', 'profit', 'bullish', 'soar', 'jump', 'climbs'
    ]
    
    const negativeWords = [
      'fall', 'drop', 'decline', 'down', 'loss', 'weak', 'miss',
      'underperform', 'downgrade', 'crash', 'low', 'concern', 'risk',
      'warning', 'cut', 'bearish', 'plunge', 'tumble', 'slides'
    ]

    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length

    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  // Extrair tickers do título
  private extractTickers(title: string): string[] {
    const tickerRegex = /\b([A-Z]{1,5})\b/g
    const matches = title.match(tickerRegex) || []
    
    const commonWords = new Set([
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
      'WAS', 'ONE', 'OUR', 'HAD', 'HAS', 'HIS', 'WHO', 'DID', 'YES',
      'NEW', 'MAY', 'WAY', 'USE', 'DAY', 'CEO', 'CFO', 'USA', 'SEC'
    ])
    
    return [...new Set(matches)]
      .filter(ticker => !commonWords.has(ticker) && ticker.length >= 2 && ticker.length <= 5)
      .slice(0, 5)
  }

  // Utilitários
  private extractSummary(title: string): string {
    // Yahoo Finance API pública não fornece summary, usar título como base
    return title.length > 100 ? title.substring(0, 100) + '...' : title
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
    
    return articles // Yahoo já retorna ordenado por data
  }

  private generateId(uuid: string, index: number): string {
    return `yahoo-${uuid || Date.now()}-${index}`.substring(0, 60)
  }

  private sanitizeText(text: string | null): string {
    if (!text) return ''
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000)
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 50000) + 5000 // Yahoo Finance tem audiência grande
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'error'
    latency?: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Teste direto mais simples - apenas verificar se o endpoint responde
      const testEndpoint = 'https://query2.finance.yahoo.com/v1/finance/trending/US'
      
      const response = await this.makeRequest<any>(testEndpoint, {
        count: '1'
      })
      
      const latency = Date.now() - startTime
      
      // Verificar se a resposta tem a estrutura esperada
      const hasValidStructure = response && 
        (response.finance?.result || response.items?.result || Array.isArray(response))
      
      if (!hasValidStructure) {
        throw new Error('Invalid response structure from Yahoo Finance')
      }
      
      return {
        status: 'healthy',
        latency
      }
    } catch (error) {
      return {
        status: 'error',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const yahooFinanceService = new YahooFinanceService()