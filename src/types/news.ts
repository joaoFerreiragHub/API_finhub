// types/news.ts

// Tipos principais para artigos de notícias
export interface NewsArticle {
    id: string
    title: string
    summary: string
    content: string
    publishedDate: string
    source: string
    url: string
    image?: string
    category: NewsCategory
    tickers?: string[]
    sentiment?: SentimentLabel
    views?: number
    author?: string
  }
  
  export type NewsCategory =
  | 'market'
  | 'economy'
  | 'earnings'
  | 'general'
  | 'crypto'
  | 'forex'

  export type SentimentLabel = 'positive' | 'negative' | 'neutral'
  
  // Análise de sentimento detalhada
  export interface SentimentAnalysis {
    score: number // -1 a 1
    label: SentimentLabel
    confidence: number // 0 a 1
    keywords: string[]
  }
  
  // Filtros para busca de notícias
  export interface NewsQueryParams {
    category?: NewsCategory
    search?: string
    sources?: string[]
    tickers?: string[]
    sentiment?: SentimentLabel
    limit?: number
    offset?: number
    from?: string // ISO date string
    to?: string   // ISO date string
    sortBy?: 'publishedDate' | 'views' | 'relevance'
    sortOrder?: 'asc' | 'desc'
  }
  
  // Resposta das APIs externas - FMP
  export interface FMPNewsResponse {
    title: string
    date: string
    content: string
    tickers: string
    image: string
    link: string
    author: string
    site: string
  }
  
  // Resposta das APIs externas - News API
  export interface NewsAPIResponse {
    status: string
    totalResults: number
    articles: {
      source: { id: string; name: string }
      author: string
      title: string
      description: string
      url: string
      urlToImage: string
      publishedAt: string
      content: string
    }[]
  }
  
  // Resposta das APIs externas - Alpha Vantage
  export interface AlphaVantageNewsItem {
    title: string
    url: string
    time_published: string
    authors: string[]
    summary: string
    banner_image: string
    source: string
    category_within_source: string
    source_domain: string
    topics: {
      topic: string
      relevance_score: string
    }[]
    overall_sentiment_score: number
    overall_sentiment_label: string
    ticker_sentiment: {
      ticker: string
      relevance_score: string
      ticker_sentiment_score: string
      ticker_sentiment_label: string
    }[]
  }
  
  // Configuração de fontes de notícias
  export interface NewsSource {
    id: string
    name: string
    type: 'fmp' | 'newsapi' | 'alphavantage' | 'polygon' | 'rss'
    enabled: boolean
    config: {
      apiKey?: string
      endpoint: string
      rateLimit: number // requests por minuto
      maxArticles: number
    }
    categories: NewsCategory[]
    reliability: number // 1-5
  }
  
  // Status de saúde das APIs
  export interface APIHealthStatus {
    source: string
    status: 'healthy' | 'degraded' | 'down'
    lastCheck: string
    responseTime?: number
    errorRate: number
    requestsToday: number
    limitReached: boolean
  }
  
  // Estatísticas agregadas
  export interface NewsStatistics {
    totalArticles: number
    articlesByCategory: Record<NewsCategory, number>
    articlesBySentiment: Record<SentimentLabel, number>
    articlesBySource: Record<string, number>
    topTickers: Array<{
      ticker: string
      count: number
      sentiment: SentimentLabel
    }>
    timeRange: {
      from: string
      to: string
    }
  }
  
  // Dados para processamento interno
  export interface RawNewsItem {
    title: string
    content: string
    publishedDate: string
    source: string
    url: string
    image?: string
    tickers?: string
    author?: string
  }
  
  // Resultado do processamento
  export interface ProcessedNews {
    id: string
    title: string
    summary: string
    content: string
    publishedDate: string
    source: string
    url: string
    image?: string
    category: NewsCategory
    tickers?: string[]
    views?: number
    // Propriedades específicas do processamento
    sentiment: SentimentAnalysis // Análise detalhada em vez de só o label
    extractedTickers: string[]
    detectedCategory: NewsCategory
    qualityScore: number // 0-1
    duplicateOf?: string // ID de artigo duplicado
  }
  
  // Trending topics
  export interface TrendingTopic {
    topic: string
    count: number
    sentiment: SentimentLabel
    relevantTickers: string[]
    timeframe: '1h' | '6h' | '24h' | '7d'
  }
  
  // Notificação de nova notícia
  export interface NewsNotification {
    id: string
    articleId: string
    userId?: string
    type: 'breaking' | 'ticker_mention' | 'category_update'
    title: string
    message: string
    priority: 'low' | 'medium' | 'high'
    sentAt: string
    readAt?: string
  }