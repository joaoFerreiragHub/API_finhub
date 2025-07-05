// routes/newsRoutes.ts
import { Router } from 'express'
import { validateQuery, validateParams, validateBody, validateArrayParams } from '../middlewares/validation'
import { newsController } from '../controllers/newsController'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

// ===== ROTAS PÚBLICAS DE NOTÍCIAS =====

// GET /api/news - Buscar notícias com filtros
router.get('/', 
  rateLimiter.news,
  validateQuery(['category', 'search', 'sources', 'tickers', 'sentiment', 'limit', 'offset', 'from', 'to', 'sortBy', 'sortOrder']),
  validateArrayParams(['sources', 'tickers']),
  newsController.getNews
)

// GET /api/news/featured - Notícias em destaque
router.get('/featured',
  rateLimiter.news,
  newsController.getFeaturedNews
)

// GET /api/news/trending - Notícias trending
router.get('/trending',
  rateLimiter.news,
  validateQuery(['timeframe']),
  newsController.getTrendingNews
)

// GET /api/news/stats - Estatísticas gerais
router.get('/stats',
  rateLimiter.stats,
  validateQuery(['category', 'from', 'to']),
  newsController.getNewsStats
)

// GET /api/news/sources - Fontes disponíveis e status
router.get('/sources',
  rateLimiter.general,
  newsController.getNewsSources
)

// POST /api/news/search - Pesquisa avançada
router.post('/search',
  rateLimiter.search,
  validateBody(['q'], ['category', 'sources', 'tickers', 'limit', 'offset']),
  newsController.searchNews
)

// POST /api/news/refresh - Forçar refresh das notícias (admin)
router.post('/refresh',
  rateLimiter.admin,
  // TODO: Adicionar middleware de autenticação admin
  newsController.refreshNews
)

// ===== ROTAS COM PARÂMETROS (mais específicas primeiro) =====

// GET /api/news/ticker/:symbol - Notícias por ticker específico
router.get('/ticker/:symbol',
  rateLimiter.news,
  validateParams(['symbol']),
  validateQuery(['limit', 'offset', 'from', 'to']),
  newsController.getNewsByTicker
)

// GET /api/news/category/:category - Notícias por categoria
router.get('/category/:category',
  rateLimiter.news,
  validateParams(['category']),
  validateQuery(['limit', 'offset', 'from', 'to']),
  newsController.getNewsByCategory
)

// GET /api/news/sentiment/:sentiment - Notícias por sentimento
router.get('/sentiment/:sentiment',
  rateLimiter.news,
  validateParams(['sentiment']),
  validateQuery(['limit', 'offset']),
  newsController.getNewsBySentiment
)

// GET /api/news/topics/trending - Trending topics
router.get('/topics/trending',
  rateLimiter.general,
  validateQuery(['timeframe', 'limit']),
  newsController.getTrendingTopics
)

// GET /api/news/summary/daily - Resumo diário
router.get('/summary/daily',
  rateLimiter.general,
  validateQuery(['date']),
  newsController.getDailySummary
)

// GET /api/news/market/overview - Overview do mercado baseado em notícias
router.get('/market/overview',
  rateLimiter.general,
  newsController.getMarketOverview
)

// ===== ROTA GENÉRICA (deve ser a última) =====

// GET /api/news/:id - Notícia específica por ID
router.get('/:id',
  rateLimiter.api,
  validateParams(['id']),
  newsController.getNewsById
)

export default router