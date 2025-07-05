// services/external/finnhubService.ts

import { NewsArticle, NewsQueryParams, NewsCategory, SentimentLabel } from '../../types/news'
import { SourceConfig } from '../../models/NewsSource'

interface FinnhubArticle {
  id: number
  category: string
  datetime: number
  headline: string
  image: string
  related: string
  source: string
  summary: string
  url: string
}

class FinnhubService {
  private readonly baseUrl = 'https://finnhub.io/api/v1/news'
  private apiKey: string = process.env.FINNHUB_API_KEY || ''
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
    if (!this.apiKey) throw new Error('Finnhub API key not configured')

    await this.waitForRateLimit()

    const category = params.category === 'crypto' ? 'crypto'
                    : params.category === 'forex' ? 'forex'
                    : 'general'

    const url = new URL(`${this.baseUrl}?category=${category}`)
    url.searchParams.append('token', this.apiKey)

    try {
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

        const data: FinnhubArticle[] = await res.json()
        console.log(`📥 [Finnhub] Received ${data.length} articles:`)
        console.log(data.map((a, i) => ({
        i,
        title: a.headline,
        source: a.source,
        datetime: new Date(a.datetime * 1000).toISOString(),
        category: a.category,
        tickers: a.related
        })))
      const articles = data.map((item, index) => this.convertToNewsArticle(item, index))
      const filtered = this.applyLocalFilters(articles, params)
      return filtered.slice(0, config.maxArticles || 50)
    } catch (error) {
      console.error('Finnhub getNews failed:', error)
      throw error
    }
  }

  private convertToNewsArticle(item: FinnhubArticle, index: number): NewsArticle {
    return {
      id: `finnhub-${item.id || Date.now()}-${index}`,
      title: item.headline,
      summary: item.summary,
      content: item.summary,
      publishedDate: new Date(item.datetime * 1000).toISOString(),
      source: item.source,
      url: item.url,
      image: this.validateImageUrl(item.image),
      category: this.mapCategory(item.category),
      sentiment: 'neutral',
      tickers: item.related?.split(',').map(s => s.trim()).filter(Boolean) || [],
      author: undefined,
      views: this.generateMockViews()
    }
  }

  private mapCategory(raw: string): NewsCategory {
    const cat = raw.toLowerCase()
    if (cat === 'crypto') return 'crypto'
    if (cat === 'forex') return 'forex'
    return 'general'
  }

  private validateImageUrl(url: string | null): string | undefined {
    try {
      if (url && url.startsWith('http')) {
        new URL(url)
        return url
      }
    } catch {}
    return undefined
  }

  private generateMockViews(): number {
    return Math.floor(Math.random() * 50000 + 5000)
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
      const testUrl = `${this.baseUrl}?category=general&token=${this.apiKey}`
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

export const finnhubService = new FinnhubService()
