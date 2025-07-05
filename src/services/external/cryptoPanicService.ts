// services/external/cryptoPanicService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

interface CryptoPanicItem {
  kind: string
  domain: string
  published_at: string
  title: string
  slug: string
  url: string
  source: {
    title: string
    domain: string
    path: string
  }
  votes: {
    negative: number
    positive: number
    important: number
    liked: number
    disliked: number
    lol: number
  }
  metadata: {
    description?: string
    image?: string
    symbols?: string[]
  }
}

interface CryptoPanicResponse {
  results: CryptoPanicItem[]
}

class CryptoPanicService {
  private readonly baseUrl = 'https://cryptopanic.com/api/v1/posts/'
  private apiKey: string = process.env.CRYPTOPANIC_API_KEY || ''
  private readonly rateLimitDelay = 1100
  private lastRequestTime = 0

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest))
    }
    this.lastRequestTime = Date.now()
  }

  async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
    if (!this.apiKey) throw new Error('CryptoPanic API key not configured')

    await this.waitForRateLimit()

    const url = new URL(this.baseUrl)
    url.searchParams.append('auth_token', this.apiKey)
    url.searchParams.append('public', 'true')

    if (params.search) url.searchParams.append('q', params.search)
    if (params.from) url.searchParams.append('filter', 'rising')
    if (params.category === 'crypto') url.searchParams.append('currencies', 'BTC,ETH,SOL,USDT')

    try {
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

        const data: CryptoPanicResponse = await res.json()
        console.log(`📥 [CryptoPanic] Received ${data.results.length} articles:`)
        console.log(data.results.map((a, i) => ({
        i,
        title: a.title,
        published: a.published_at,
        domain: a.domain,
        votes: a.votes,
        tickers: a.metadata?.symbols
        })))
      const articles = data.results.map((item, index) => this.convertToNewsArticle(item, index))
      const filtered = this.applyLocalFilters(articles, params)
      return filtered.slice(0, config.maxArticles || 50)
    } catch (error) {
      console.error('CryptoPanic getNews failed:', error)
      throw error
    }
  }

  private convertToNewsArticle(item: CryptoPanicItem, index: number): NewsArticle {
    return {
      id: `cryptopanic-${Date.now()}-${index}`,
      title: item.title,
      summary: item.metadata?.description || 'No summary',
      content: item.metadata?.description || '',
      publishedDate: item.published_at,
      source: item.source?.title || item.domain,
      url: item.url,
      image: this.validateImageUrl(item.metadata?.image),
      category: 'crypto',
      sentiment: this.inferSentiment(item),
      tickers: item.metadata?.symbols || [],
      author: undefined,
      views: this.generateMockViews()
    }
  }

  private inferSentiment(item: CryptoPanicItem): SentimentLabel {
    const score = (item.votes.positive || 0) - (item.votes.negative || 0)
    if (score > 2) return 'positive'
    if (score < -1) return 'negative'
    return 'neutral'
  }

  private validateImageUrl(url: string | undefined): string | undefined {
    try {
      if (url && url.startsWith('http')) {
        new URL(url)
        return url
      }
    } catch {}
    return undefined
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 25000 + 1000)
  }

  private applyLocalFilters(articles: NewsArticle[], params: NewsQueryParams): NewsArticle[] {
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

  async healthCheck(): Promise<{ status: 'healthy' | 'error'; latency?: number; error?: string; timestamp: string }> {
    const start = Date.now()
    try {
      const testUrl = `${this.baseUrl}?auth_token=${this.apiKey}&public=true&currencies=BTC`
      const res = await fetch(testUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return {
        status: 'healthy',
        latency: Date.now() - start,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'error',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    }
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '')
  }
}

export const cryptoPanicService = new CryptoPanicService()
