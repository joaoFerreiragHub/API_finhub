// models/News.ts

export interface News {
    id: string
    title: string
    summary: string
    content: string
    publishedDate: Date
    source: string
    sourceUrl: string
    imageUrl?: string
    category: 'market' | 'crypto' | 'economy' | 'earnings' | 'general'
    tickers: string[]
    sentiment: {
      score: number // -1 a 1
      label: 'positive' | 'negative' | 'neutral'
      confidence: number // 0 a 1
    }
    metadata: {
      views: number
      clickThroughRate: number
      originalSource: string
      processedAt: Date
      lastUpdated: Date
    }
    tags: string[]
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  
  export interface CreateNewsDto {
    title: string
    summary: string
    content: string
    publishedDate: Date
    source: string
    sourceUrl: string
    imageUrl?: string
    category: 'market' | 'crypto' | 'economy' | 'earnings' | 'general'
    tickers?: string[]
    tags?: string[]
  }
  
  export interface UpdateNewsDto {
    title?: string
    summary?: string
    content?: string
    imageUrl?: string
    category?: 'market' | 'crypto' | 'economy' | 'earnings' | 'general'
    tickers?: string[]
    tags?: string[]
    isActive?: boolean
  }
  
  export interface NewsFilters {
    category?: string
    search?: string
    sources?: string[]
    tickers?: string[]
    sentiment?: 'positive' | 'negative' | 'neutral'
    dateFrom?: Date
    dateTo?: Date
    isActive?: boolean
    limit?: number
    offset?: number
  }
  
  export interface NewsStats {
    total: number
    byCategory: {
      market: number
      crypto: number
      economy: number
      earnings: number
      general: number
    }
    bySentiment: {
      positive: number
      negative: number
      neutral: number
    }
    totalViews: number
    averageCTR: number
  }