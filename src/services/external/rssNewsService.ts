// services/external/rssNewsService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

interface RSSParserLike {
  parseURL(url: string): Promise<{ items?: any[] }>
}

interface RSSFeedConfig {
  name: string
  url: string
  language: 'pt' | 'pt-BR'
  country: 'PT' | 'BR'
  defaultCategory?: NewsCategory
}

class RSSNewsService {
  private parser: RSSParserLike | null = null
  private isAvailable = false
  private readonly rateLimitDelay = 1000 // 1 segundo entre requests

  private readonly feeds: Record<string, RSSFeedConfig> = {
    // InfoMoney (Brasil)
    'infomoney-geral': {
      name: 'InfoMoney',
      url: 'https://www.infomoney.com.br/feed/',
      language: 'pt-BR',
      country: 'BR',
      defaultCategory: 'market'
    },
    'infomoney-mercados': {
      name: 'InfoMoney Mercados',
      url: 'https://www.infomoney.com.br/mercados/feed/',
      language: 'pt-BR',
      country: 'BR',
      defaultCategory: 'market'
    },
    'infomoney-investimentos': {
      name: 'InfoMoney Investimentos',
      url: 'https://www.infomoney.com.br/guias/investimentos/feed/',
      language: 'pt-BR',
      country: 'BR',
      defaultCategory: 'general'
    },
    // ECO (Portugal)
    'eco-geral': {
      name: 'ECO',
      url: 'https://eco.sapo.pt/feed/',
      language: 'pt',
      country: 'PT',
      defaultCategory: 'economy'
    },
    'eco-mercados': {
      name: 'ECO Mercados',
      url: 'https://eco.sapo.pt/category/mercados/feed/',
      language: 'pt',
      country: 'PT',
      defaultCategory: 'market'
    }
  }

  constructor() {
    try {
      const RSSParser = require('rss-parser') as new (options?: Record<string, unknown>) => RSSParserLike

      this.parser = new RSSParser({
        customFields: {
          item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['enclosure', 'enclosure']
          ]
        }
      })
      this.isAvailable = true
      console.log('📰 RSS News Service initialized with', Object.keys(this.feeds).length, 'feeds')
    } catch (error) {
      this.isAvailable = false
      this.parser = null
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️ RSS News Service disabled (rss-parser missing): ${message}`)
    }
  }

  /**
   * Buscar notícias de todos os feeds RSS ou de feeds específicos
   */
  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      if (!this.isAvailable || !this.parser) {
        return []
      }

      console.log('📰 RSS getNews called with:', { params, feedCount: Object.keys(this.feeds).length })

      const allArticles: NewsArticle[] = []
      const feedsToFetch = this.selectFeeds(params)

      console.log(`🔄 Fetching from ${feedsToFetch.length} RSS feeds...`)

      // Buscar de cada feed com delay para evitar rate limiting
      for (const feedKey of feedsToFetch) {
        try {
          const articles = await this.fetchFeed(feedKey, params, config)
          console.log(`✅ ${feedKey}: ${articles.length} articles`)
          allArticles.push(...articles)

          // Delay entre requests
          await this.delay(this.rateLimitDelay)
        } catch (error) {
          console.error(`❌ Error fetching ${feedKey}:`, error)
          // Continuar com outros feeds mesmo se um falhar
        }
      }

      if (allArticles.length === 0) {
        console.warn('⚠️ No articles from any RSS feed')
        return []
      }

      // Processar e filtrar artigos
      const processedArticles = this.processArticles(allArticles, params)
      const limitedArticles = processedArticles.slice(0, config.maxArticles || 30)

      console.log(`📰 RSS Final: ${allArticles.length} total → ${processedArticles.length} processed → ${limitedArticles.length} returned`)

      return limitedArticles

    } catch (error) {
      console.error('❌ RSS getNews failed:', error)
      throw error
    }
  }

  /**
   * Selecionar quais feeds buscar baseado nos parâmetros
   */
  private selectFeeds(params: NewsQueryParams): string[] {
    // Se especificou sources, usar apenas esses
    if (params.sources && params.sources.length > 0) {
      const requestedFeeds = params.sources
        .map(s => s.toLowerCase())
        .filter(s => s.includes('infomoney') || s.includes('eco'))

      if (requestedFeeds.length > 0) {
        return Object.keys(this.feeds).filter(key =>
          requestedFeeds.some(rf => key.includes(rf))
        )
      }
    }

    // Por padrão, buscar dos feeds principais (não todos para evitar sobrecarga)
    return ['infomoney-geral', 'eco-geral']
  }

  /**
   * Buscar artigos de um feed específico
   */
  private async fetchFeed(
    feedKey: string,
    params: NewsQueryParams,
    config: SourceConfig
  ): Promise<NewsArticle[]> {
    if (!this.parser) {
      return []
    }

    const feedConfig = this.feeds[feedKey]
    if (!feedConfig) {
      throw new Error(`Feed ${feedKey} not found`)
    }

    console.log(`🔄 Fetching RSS feed: ${feedConfig.name}...`)

    try {
      const feed = await this.parser.parseURL(feedConfig.url)

      if (!feed.items || feed.items.length === 0) {
        console.warn(`⚠️ ${feedConfig.name}: empty feed`)
        return []
      }

      const articles = feed.items
        .slice(0, 20) // Limitar para não sobrecarregar
        .map((item, index) => this.convertRSSItem(item, feedConfig, index))
        .filter(article => article !== null) as NewsArticle[]

      return articles

    } catch (error) {
      console.error(`❌ Error parsing ${feedConfig.name}:`, error)
      return []
    }
  }

  /**
   * Converter item RSS para NewsArticle
   */
  private convertRSSItem(
    item: any,
    feedConfig: RSSFeedConfig,
    index: number
  ): NewsArticle | null {
    try {
      // Validar campos obrigatórios
      if (!item.title || !item.link) {
        return null
      }

      // Extrair imagem
      const image = this.extractImage(item)

      // Categorizar baseado no conteúdo
      const category = this.categorizeContent(
        item.title,
        item.contentSnippet || item.description || '',
        feedConfig
      )

      return {
        id: this.generateId('rss', feedConfig.name, item.link || item.guid, index),
        title: this.sanitizeText(item.title),
        summary: this.extractSummary(item.contentSnippet || item.description || ''),
        content: this.sanitizeText(item.content || item.description || item.contentSnippet || ''),
        publishedDate: this.parseDate(item.pubDate || item.isoDate),
        source: feedConfig.name,
        url: item.link || '#',
        image,
        category,
        tickers: this.extractTickers(item.title, item.contentSnippet || ''),
        sentiment: this.analyzeSentiment(item.title + ' ' + (item.contentSnippet || '')),
        author: item.creator || item.author,
        views: this.generateMockViews()
      }

    } catch (error) {
      console.error('Error converting RSS item:', error)
      return null
    }
  }

  /**
   * Extrair imagem do item RSS
   */
  private extractImage(item: any): string | undefined {
    // Tentar várias fontes de imagem
    const imageSources = [
      item.enclosure?.url,
      item.mediaContent?.url,
      item.mediaThumbnail?.url,
      item['media:content']?.['$']?.url,
      item['media:thumbnail']?.['$']?.url
    ]

    for (const source of imageSources) {
      if (source && this.isValidImageUrl(source)) {
        return source
      }
    }

    // Tentar extrair de content/description HTML
    const content = item.content || item.description || ''
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/)
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1]
    }

    return undefined
  }

  /**
   * Categorizar conteúdo em português
   */
  private categorizeContent(
    title: string,
    content: string,
    feedConfig: RSSFeedConfig
  ): NewsCategory {
    const text = `${title} ${content}`.toLowerCase()

    // Keywords em português (PT + BR)
    const keywords = {
      crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'cripto', 'criptomoeda', 'blockchain'],
      earnings: [
        'resultados', 'balanço', 'lucro', 'receita', 'faturamento',
        'trimestre', 'trimestral', 'quarterly', 'earnings'
      ],
      economy: [
        'economia', 'pib', 'inflação', 'juros', 'taxa', 'selic',
        'banco central', 'bc', 'fed', 'governo', 'política econômica'
      ],
      market: [
        'bolsa', 'ações', 'mercado', 'índice', 'ibovespa', 'psi20',
        'valorização', 'queda', 'alta', 'baixa', 'negociação'
      ],
      forex: [
        'câmbio', 'dólar', 'euro', 'moeda', 'forex', 'cotação',
        'real', 'usd', 'eur', 'gbp'
      ]
    }

    // Verificar cada categoria
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        return category as NewsCategory
      }
    }

    // Fallback para categoria padrão do feed
    return feedConfig.defaultCategory || 'general'
  }

  /**
   * Análise de sentimento em português
   */
  private analyzeSentiment(text: string): SentimentLabel {
    const lowerText = text.toLowerCase()

    const positiveWords = [
      'alta', 'subida', 'valorização', 'ganho', 'lucro', 'crescimento',
      'recuperação', 'melhora', 'positivo', 'otimista', 'recorde',
      'sobe', 'salta', 'avança', 'dispara'
    ]

    const negativeWords = [
      'queda', 'baixa', 'desvalorização', 'perda', 'prejuízo', 'crise',
      'recessão', 'negativo', 'pessimista', 'cai', 'despenca',
      'recua', 'tombo', 'desaba'
    ]

    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length

    if (positiveCount > negativeCount + 1) return 'positive'
    if (negativeCount > positiveCount + 1) return 'negative'
    return 'neutral'
  }

  /**
   * Extrair tickers (ações brasileiras e portuguesas)
   */
  private extractTickers(title: string, content: string): string[] {
    const text = `${title} ${content}`.toUpperCase()
    const tickers: string[] = []

    // Padrão BR: PETR4, VALE3, ITUB4, etc.
    const brTickerPattern = /\b([A-Z]{4}\d)\b/g
    const brMatches = text.match(brTickerPattern)
    if (brMatches) {
      tickers.push(...brMatches)
    }

    // Padrão PT: EDP, GALP, BCP, etc.
    const ptTickerPattern = /\b(EDP|GALP|BCP|NOS|REN|CTT|ALTRI|CORTICEIRA|JERÓNIMO|MARTINS|SONAE)\b/g
    const ptMatches = text.match(ptTickerPattern)
    if (ptMatches) {
      tickers.push(...ptMatches)
    }

    // Remover duplicatas e limitar
    return [...new Set(tickers)].slice(0, 10)
  }

  /**
   * Processar array de artigos
   */
  private processArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let processed = articles

    // Remover duplicatas
    processed = this.removeDuplicates(processed)

    // Aplicar filtros
    processed = this.applyLocalFilters(processed, params)

    // Ordenar
    processed = this.sortArticles(processed, params)

    return processed
  }

  /**
   * Aplicar filtros locais
   */
  private applyLocalFilters(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let filtered = articles

    // Filtro por pesquisa
    if (params.search) {
      const searchLower = params.search.toLowerCase()
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.summary.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por categoria
    if (params.category && params.category !== 'general') {
      filtered = filtered.filter(article => article.category === params.category)
    }

    return filtered
  }

  /**
   * Ordenar artigos
   */
  private sortArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    const sortBy = params.sortBy || 'publishedDate'
    const sortOrder = params.sortOrder || 'desc'

    return articles.sort((a, b) => {
      let comparison = 0

      if (sortBy === 'publishedDate') {
        comparison = new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
      } else if (sortBy === 'views') {
        comparison = (a.views || 0) - (b.views || 0)
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  /**
   * Remover duplicatas
   */
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

  // === UTILITY METHODS ===

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
    const lastPeriod = truncated.lastIndexOf('.')

    if (lastPeriod > maxLength * 0.6) {
      return truncated.substring(0, lastPeriod + 1)
    }

    return truncated + '...'
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

  private parseDate(dateString: string): string {
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

  private generateId(type: string, source: string, url: string, index: number): string {
    const timestamp = Date.now()
    const urlHash = url.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
    return `${type}-${source.toLowerCase().replace(/\s/g, '-')}-${timestamp}-${index}-${urlHash}`
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 50000) + 1000
  }

  private isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false

    try {
      new URL(url)
      return url.startsWith('http') && /\.(jpg|jpeg|png|gif|webp)/i.test(url)
    } catch {
      return false
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'error'
    latency?: number
    error?: string
    timestamp: string
  }> {
    if (!this.isAvailable || !this.parser) {
      return {
        status: 'error',
        error: 'RSS parser not available',
        timestamp: new Date().toISOString()
      }
    }

    const startTime = Date.now()

    try {
      // Testar um feed rápido
      await this.parser.parseURL(this.feeds['infomoney-geral'].url)

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

  /**
   * Testar conexão
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.healthCheck()
      console.log('✅ RSS connection test:', result)
      return result.status === 'healthy'
    } catch (error) {
      console.error('❌ RSS connection test failed:', error)
      return false
    }
  }
}

export const rssNewsService = new RSSNewsService()
