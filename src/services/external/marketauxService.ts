// services/external/marketauxService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

interface MarketauxArticle {
  uuid: string
  title: string
  description: string
  content: string
  url: string
  image_url: string | null
  published_at: string
  source: {
    name: string
    url: string
  }
  tickers: string[]
  topics: string[]
  sentiment: string | null
}

interface MarketauxResponse {
  data: MarketauxArticle[]
  meta: {
    found: number
    returned: number
    limit: number
    page: number
  }
  error?: string
}

class MarketauxService {
  private readonly baseUrl = 'https://api.marketaux.com/v1/news/all'
  private apiKey: string
  private readonly rateLimitDelay = 1000
  private lastRequestTime = 0

  constructor() {
    this.apiKey = process.env.MARKETAUX_API_KEY || ''
    console.log('🔑 Marketaux API Key configured:', !!this.apiKey)
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.rateLimitDelay) {
      await new Promise(res => setTimeout(res, this.rateLimitDelay - elapsed))
    }
    this.lastRequestTime = Date.now()
  }

  private async makeRequest(): Promise<MarketauxArticle[]> {
    await this.waitForRateLimit()
  
    const url = new URL(this.baseUrl)
    url.searchParams.set('api_token', this.apiKey)
    url.searchParams.set('language', 'en')
    url.searchParams.set('limit', '50')
  
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    })
  
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`HTTP ${res.status}: ${res.statusText} - ${body}`)
    }
  
    const data: MarketauxResponse = await res.json()
  
    if (data.error) throw new Error(`Marketaux error: ${data.error}`)
  
    console.log(`📥 [Marketaux] Received ${data.data.length} articles:`)
    console.log(data.data.map((a, i) => ({
      i,
      title: a.title,
      source: a.source.name,
      published_at: a.published_at,
      tickers: a.tickers,
      topics: a.topics
    })))
  
    return data.data
  }
  

  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    if (!this.isConfigured()) throw new Error('Marketaux API key not configured')

    try {
      console.log('📰 Marketaux getNews called with:', { params, config })

      const allArticles = await this.makeRequest()
      const mapped = allArticles.map((item, index) => this.convertArticle(item, index))

      const filtered = this.processArticles(mapped, params)
      return filtered.slice(0, config.maxArticles || 50)

    } catch (error) {
      console.error('❌ Marketaux getNews failed:', error)
      throw error
    }
  }

  private convertArticle(item: MarketauxArticle, index: number): NewsArticle {
    return {
      id: `marketaux-${Date.now()}-${index}`,
      title: this.sanitize(item.title),
      summary: this.extractSummary(item.description || item.content),
      content: this.sanitize(item.content),
      publishedDate: new Date(item.published_at).toISOString(),
      source: item.source.name,
      url: item.url,
      image: this.validateImageUrl(item.image_url),
      category: this.detectCategory(item.topics),
      sentiment: this.mapSentiment(item.sentiment),
      tickers: item.tickers || [],
      author: undefined,
      views: this.generateMockViews()
    }
  }

  private processArticles(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
    let filtered = articles

    if (params.search) {
      const s = params.search.toLowerCase()
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(s) ||
        a.summary.toLowerCase().includes(s) ||
        a.content.toLowerCase().includes(s)
      )
    }

    if (params.sentiment) {
      filtered = filtered.filter(a => a.sentiment === params.sentiment)
    }

    return filtered
  }

  private detectCategory(topics: string[]): NewsCategory {
    const lower = topics.map(t => t.toLowerCase())
    if (lower.includes('crypto')) return 'crypto'
    if (lower.includes('earnings')) return 'earnings'
    if (lower.includes('economy')) return 'economy'
    if (lower.includes('market')) return 'market'
    return 'general'
  }

  private mapSentiment(label: string | null): SentimentLabel {
    if (!label) return 'neutral'
    const l = label.toLowerCase()
    if (l === 'positive') return 'positive'
    if (l === 'negative') return 'negative'
    return 'neutral'
  }

  private extractSummary(content?: string, max: number = 250): string {
    if (!content) return 'No summary'
    const clean = content.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim()
    return clean.length > max ? clean.substring(0, max) + '...' : clean
  }

  private sanitize(text: string): string {
    return text.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim()
  }

  private validateImageUrl(url: string | null): string | undefined {
    if (typeof url === 'string' && url.startsWith('http')) {
      try {
        new URL(url)
        return url
      } catch {
        return undefined
      }
    }
    return undefined
  }
  

  private generateMockViews(): number {
    return Math.floor(Math.random() * 40000 + 2000)
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'error'; latency?: number; error?: string; timestamp: string }> {
    const start = Date.now()
    try {
      await this.makeRequest()
      return {
        status: 'healthy',
        latency: Date.now() - start,
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

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
    console.log('🔑 Marketaux API Key updated')
  }

  isConfigured(): boolean {
    const ok = Boolean(this.apiKey && this.apiKey.trim() !== '')
    console.log('🔑 Marketaux configured:', ok)
    return ok
  }
}

export const marketauxService = new MarketauxService()
