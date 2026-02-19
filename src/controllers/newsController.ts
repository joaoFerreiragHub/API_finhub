// controllers/newsController.ts

import { Request, Response } from 'express'
import { cacheService } from '../services/cacheService'
import { ResponseBuilder, ErrorCodes } from '../types/responses'
import { NewsQueryParams, NewsCategory, SentimentLabel } from '../types/news'
import { newsAggregatorService } from '../services/aggregatedNewsService'
import { newsService } from '../services/newsService'

class NewsController {
  
  // GET /api/news - Buscar notícias com filtros
  async getNews(req: Request, res: Response): Promise<void> {
    
    try {
      const {
        category,
        search,
        sources,
        tickers,
        sentiment,
        limit = 20,
        offset = 0,
        from,
        to,
        sortBy = 'publishedDate',
        sortOrder = 'desc'
      } = req.query as Partial<NewsQueryParams>

      // Verificar cache primeiro
      const cacheKey = `news:${JSON.stringify(req.query)}`
      const cachedNews = await cacheService.get(cacheKey)
     
      if (cachedNews) {
        res.json(ResponseBuilder.success(cachedNews, { fromCache: true }))
        return
      }

      // Validar sortBy e sortOrder
      const validSortBy = ['publishedDate', 'views', 'relevance']
      const validSortOrder = ['asc', 'desc']
      
      const validatedSortBy = validSortBy.includes(sortBy as string) 
        ? (sortBy as 'publishedDate' | 'views' | 'relevance') 
        : 'publishedDate'
      
      const validatedSortOrder = validSortOrder.includes(sortOrder as string)
        ? (sortOrder as 'asc' | 'desc')
        : 'desc'

      // Buscar notícias
      const result = await newsService.getNews({
        category: category as NewsCategory,
        search: search as string,
        sources: sources ? (Array.isArray(sources) ? sources as string[] : [sources as string]) : undefined,
        tickers: tickers ? (Array.isArray(tickers) ? tickers as string[] : [tickers as string]) : undefined,
        sentiment: sentiment as SentimentLabel,
        limit: Number(limit),
        offset: Number(offset),
        from: from as string,
        to: to as string,
        sortBy: validatedSortBy,
        sortOrder: validatedSortOrder
      })
    
      // Cache por 5 minutos
      await cacheService.set(cacheKey, result, 300)

      res.json(ResponseBuilder.paginated(
        result.articles,
        Math.floor(Number(offset) / Number(limit)) + 1,
        Number(limit),
        result.total
      ))

    } catch (error) {
      console.error('Error in getNews:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar notícias')
      )
    }
  }

  // GET /api/news/featured - Notícias em destaque
  async getFeaturedNews(_req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/featured')
    try {
      const cacheKey = 'news:featured'
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const featured = await newsAggregatorService.getFeaturedNews()
      
      // Cache por 10 minutos
      await cacheService.set(cacheKey, featured, 600)
      
      res.json(ResponseBuilder.success(featured))

    } catch (error) {
      console.error('Error in getFeaturedNews:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar notícias em destaque')
      )
    }
  }

  // GET /api/news/trending - Notícias trending
  async getTrendingNews(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/trending with query:', req.query)
    try {
      const { timeframe = '24h' } = req.query
      const cacheKey = `news:trending:${timeframe}`
      
      const cached = await cacheService.get(cacheKey)
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const trending = await newsService.getTrendingNews(timeframe as string)
      
      // Cache por 15 minutos
      await cacheService.set(cacheKey, trending, 900)
      
      res.json(ResponseBuilder.success(trending))

    } catch (error) {
      console.error('Error in getTrendingNews:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar notícias trending')
      )
    }
  }

  // GET /api/news/:id - Notícia específica
  async getNewsById(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/:id with params:', req.params)
    try {
      const id = String(req.params.id ?? "")
      
      if (!id) {
        res.status(400).json(
          ResponseBuilder.error(ErrorCodes.VALIDATION_ERROR, 'ID da notícia é obrigatório')
        )
        return
      }

      const cacheKey = `news:single:${id}`
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const article = await newsService.getNewsById(id)
      
      if (!article) {
        res.status(404).json(
          ResponseBuilder.error(ErrorCodes.NEWS_NOT_FOUND, 'Notícia não encontrada')
        )
        return
      }

      // Buscar notícias relacionadas
      const related = await newsService.getRelatedNews(id, 5)
      
      const result = { ...article, related }
      
      // Cache por 1 hora
      await cacheService.set(cacheKey, result, 3600)
      
      res.json(ResponseBuilder.success(result))

    } catch (error) {
      console.error('Error in getNewsById:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar notícia')
      )
    }
  }

  // GET /api/news/ticker/:symbol - Notícias por ticker
  async getNewsByTicker(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/ticker/:symbol with params:', req.params, 'and query:', req.query)
    try {
      const symbol = String(req.params.symbol ?? "")
      const { limit = 20, offset = 0, from, to } = req.query

      if (!symbol) {
        res.status(400).json(
          ResponseBuilder.error(ErrorCodes.VALIDATION_ERROR, 'Símbolo do ticker é obrigatório')
        )
        return
      }

      const ticker = symbol.toUpperCase()
      const cacheKey = `news:ticker:${ticker}:${JSON.stringify(req.query)}`
      
      const cached = await cacheService.get(cacheKey)
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const result = await newsService.getNewsByTicker(ticker, {
        limit: Number(limit),
        offset: Number(offset),
        from: from as string,
        to: to as string
      })

      // Cache por 5 minutos
      await cacheService.set(cacheKey, result, 300)
      
      res.json(ResponseBuilder.paginated(
        result.articles,
        Math.floor(Number(offset) / Number(limit)) + 1,
        Number(limit),
        result.total
      ))

    } catch (error) {
      console.error('Error in getNewsByTicker:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar notícias do ticker')
      )
    }
  }

  // GET /api/news/category/:category - Notícias por categoria
  async getNewsByCategory(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/category/:category with params:', req.params, 'and query:', req.query)
    try {
      const category = String(req.params.category ?? "")
      const { limit = 20, offset = 0, from, to } = req.query

      const validCategories: NewsCategory[] = ['market', 'crypto', 'economy', 'earnings', 'general']
      
      if (!validCategories.includes(category as NewsCategory)) {
        res.status(400).json(
          ResponseBuilder.error(ErrorCodes.INVALID_CATEGORY, 'Categoria inválida')
        )
        return
      }

      const cacheKey = `news:category:${category}:${JSON.stringify(req.query)}`
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const result = await newsService.getNewsByCategory(category as NewsCategory, {
        limit: Number(limit),
        offset: Number(offset),
        from: from as string,
        to: to as string
      })

      // Cache por 10 minutos
      await cacheService.set(cacheKey, result, 600)
      
      res.json(ResponseBuilder.paginated(
        result.articles,
        Math.floor(Number(offset) / Number(limit)) + 1,
        Number(limit),
        result.total
      ))

    } catch (error) {
      console.error('Error in getNewsByCategory:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar notícias da categoria')
      )
    }
  }

  // POST /api/news/search - Pesquisa avançada
  async searchNews(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/search with body:', req.body)
    try {
      const { q, category, sources, tickers, limit = 20, offset = 0 } = req.body

      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        res.status(400).json(
          ResponseBuilder.error(ErrorCodes.VALIDATION_ERROR, 'Termo de pesquisa deve ter pelo menos 2 caracteres')
        )
        return
      }

      const cacheKey = `news:search:${JSON.stringify(req.body)}`
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const result = await newsService.searchNews({
        query: q,
        category: category as NewsCategory,
        sources: sources as string[],
        tickers: tickers as string[],
        limit: Number(limit),
        offset: Number(offset)
      })

      // Cache por 2 minutos (pesquisas são mais dinâmicas)
      await cacheService.set(cacheKey, result, 120)
      
      res.json(ResponseBuilder.success({
        ...result,
        searchTerm: q,
        executionTime: Date.now() // será calculado pelo middleware
      }))

    } catch (error) {
      console.error('Error in searchNews:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro na pesquisa de notícias')
      )
    }
  }

  // GET /api/news/stats - Estatísticas
  async getNewsStats(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/stats with query:', req.query)
    try {
      const { category, from, to } = req.query
      const cacheKey = `news:stats:${JSON.stringify(req.query)}`
      
      const cached = await cacheService.get(cacheKey)
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const stats = await newsService.getNewsStatistics({
        category: category as NewsCategory,
        from: from as string,
        to: to as string
      })

      // Cache por 30 minutos
      await cacheService.set(cacheKey, stats, 1800)
      
      res.json(ResponseBuilder.success(stats, {
        cacheInfo: {
          cached: false,
          cacheAge: 0,
          expiresIn: 1800
        }
      }))

    } catch (error) {
      console.error('Error in getNewsStats:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar estatísticas')
      )
    }
  }

  // GET /api/news/sources - Fontes disponíveis
  async getNewsSources(_req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/sources')
    try {
      const cacheKey = 'news:sources'
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const sources = await newsService.getAvailableSources()
      
      // Cache por 1 hora
      await cacheService.set(cacheKey, sources, 3600)
      
      res.json(ResponseBuilder.success({
        sources: sources.sources,
        activeCount: sources.activeCount,
        totalCount: sources.totalCount
      }))

    } catch (error) {
      console.error('Error in getNewsSources:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar fontes')
      )
    }
  }

  // POST /api/news/refresh - Refresh manual (admin)
  async refreshNews(_req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/refresh')
    try {
      // TODO: Verificar autenticação admin aqui
      
      const result = await newsService.forceRefresh()
      
      // Limpar cache relacionado
      await cacheService.clearPattern('news:*')
      
      res.json(ResponseBuilder.success({
        articlesUpdated: result.updated,
        newArticles: result.created,
        sourcesChecked: result.sourcesChecked,
        executionTime: result.executionTime,
        lastRefresh: new Date().toISOString()
      }))

    } catch (error) {
      console.error('Error in refreshNews:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao atualizar notícias')
      )
    }
  }

  // GET /api/news/sentiment/:sentiment - Notícias por sentimento
  async getNewsBySentiment(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/sentiment/:sentiment with params:', req.params, 'and query:', req.query)
    try {
      const sentiment = String(req.params.sentiment ?? "")
      const { limit = 20, offset = 0 } = req.query

      const validSentiments: SentimentLabel[] = ['positive', 'negative', 'neutral']
      
      if (!validSentiments.includes(sentiment as SentimentLabel)) {
        res.status(400).json(
          ResponseBuilder.error(ErrorCodes.VALIDATION_ERROR, 'Sentimento inválido')
        )
        return
      }

      const result = await newsService.getNewsBySentiment(sentiment as SentimentLabel, {
        limit: Number(limit),
        offset: Number(offset)
      })
      
      res.json(ResponseBuilder.paginated(
        result.articles,
        Math.floor(Number(offset) / Number(limit)) + 1,
        Number(limit),
        result.total
      ))

    } catch (error) {
      console.error('Error in getNewsBySentiment:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar notícias por sentimento')
      )
    }
  }

  // GET /api/news/topics/trending - Trending topics
  async getTrendingTopics(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/topics/trending with query:', req.query)
    try {
      const { timeframe = '24h', limit = 10 } = req.query
      
      const topics = await newsService.getTrendingTopics({
        timeframe: timeframe as string,
        limit: Number(limit)
      })
      
      res.json(ResponseBuilder.success(topics))

    } catch (error) {
      console.error('Error in getTrendingTopics:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar trending topics')
      )
    }
  }

  // GET /api/news/market/overview - Overview do mercado
  async getMarketOverview(_req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/market/overview')
    try {
      const cacheKey = 'news:market:overview'
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const overview = await newsService.getMarketOverview()
      
      // Cache por 15 minutos
      await cacheService.set(cacheKey, overview, 900)
      
      res.json(ResponseBuilder.success(overview))

    } catch (error) {
      console.error('Error in getMarketOverview:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar overview do mercado')
      )
    }
  }

  // GET /api/news/summary/daily - Resumo diário
  async getDailySummary(req: Request, res: Response): Promise<void> {
    console.log('Received request for /api/news/summary/daily with query:', req.query)
    try {
      const { date } = req.query
      const targetDate = date ? new Date(date as string) : new Date()
      
      const cacheKey = `news:summary:${targetDate.toISOString().split('T')[0]}`
      const cached = await cacheService.get(cacheKey)
      
      if (cached) {
        res.json(ResponseBuilder.success(cached, { fromCache: true }))
        return
      }

      const summary = await newsService.getDailySummary(targetDate)
      
      // Cache por 6 horas
      await cacheService.set(cacheKey, summary, 21600)
      
      res.json(ResponseBuilder.success(summary))

    } catch (error) {
      console.error('Error in getDailySummary:', error)
      res.status(500).json(
        ResponseBuilder.error(ErrorCodes.INTERNAL_ERROR, 'Erro ao buscar resumo diário')
      )
    }
  }
}

export const newsController = new NewsController()