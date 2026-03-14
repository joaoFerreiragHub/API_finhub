// routes/index.ts
import { Router } from 'express'

// Importa as rotas de cada modulo
import authRoutes from './auth.routes'
import articleRoutes from './article.routes'
import videoRoutes from './video.routes'
import courseRoutes from './course.routes'
import liveeventRoutes from './liveevent.routes'
import podcastRoutes from './podcast.routes'
import bookRoutes from './book.routes'
import playlistRoutes from './playlist.routes'
import announcementRoutes from './announcement.routes'
import reelRoutes from './reel.routes'
import uploadRoutes from './upload.routes'
import followRoutes from './follow.routes'
import favoriteRoutes from './favorite.routes'
import notificationRoutes from './notification.routes'
import ratingRoutes from './rating.routes'
import commentRoutes from './comment.routes'
import reportRoutes from './report.routes'
import stockRoutes from './stock.routes'
import mlRoutes from './ml.routes'
import newsRoutes from './newsRoutes'
import cryptoRoutes from './crypto.routes'
import etfRoutes from './etf.routes'
import etfYahooRoutes from './etfYahoo.routes'
import reitRoutes from './reit.routes'
import adminRoutes from './admin.routes'
import editorialRoutes from './editorial.routes'
import directoryRoutes from './directory.routes'
import platformRoutes from './platform.routes'
import creatorRoutes from './creator.routes'
import brandPortalRoutes from './brandPortal.routes'
import externalContentRoutes from './externalContent.routes'
import searchRoutes from './search.routes'
import feedRoutes from './feed.routes'
import userRoutes from './user.routes'
import portfolioRoutes from './portfolio.routes'
import appealRoutes from './appeal.routes'
import adsRoutes from './ads.routes'
import affiliateRoutes from './affiliate.routes'
import brandIntegrationRoutes from './brandIntegration.routes'
import {
  enforceFinancialToolAvailability,
  trackFinancialToolUsage,
} from '../middlewares/financialTools'

const router = Router()

// Rota de verificacao
router.get('/', (req, res) => {
  res.json({
    message: 'API FinHub está ativa ✅',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      content: {
        articles: '/api/articles',
        videos: '/api/videos',
        courses: '/api/courses',
        lives: '/api/lives',
        podcasts: '/api/podcasts',
        books: '/api/books',
        reels: '/api/reels',
        playlists: '/api/playlists',
        announcements: '/api/announcements',
      },
      upload: '/api/upload',
      social: {
        follow: '/api/follow',
        favorites: '/api/favorites',
        notifications: '/api/notifications',
      },
      users: '/api/users',
      portfolio: '/api/portfolio',
      feed: '/api/feed',
      universal: {
        ratings: '/api/ratings',
        comments: '/api/comments',
        reports: '/api/reports',
        appeals: '/api/appeals',
      },
      stocks: '/api/stocks',
      ml: '/api/ml',
      news: '/api/news',
      markets: {
        crypto: '/api/crypto',
        etfs: '/api/etfs',
        reits: '/api/reits',
      },
      admin: '/api/admin',
      editorial: '/api/editorial',
      directories: '/api/directories',
      platform: '/api/platform',
      runtimeConfig: '/api/platform/runtime-config',
      legal: '/api/platform/legal',
      monitoring: '/api/platform/monitoring/status',
      monitoringLogging: '/api/platform/monitoring/logging',
      creators: '/api/creators',
      brandPortal: '/api/brand-portal',
      externalContent: '/api/external-content',
      search: '/api/search',
      ads: '/api/ads',
      affiliates: '/api/affiliates',
      integrations: '/api/integrations/brand',
    },
    timestamp: new Date().toISOString(),
  })
})

// Rotas de autenticacao
router.use('/auth', authRoutes)

// Rotas de conteudos
router.use('/articles', articleRoutes)
router.use('/videos', videoRoutes)
router.use('/courses', courseRoutes)
router.use('/lives', liveeventRoutes)
router.use('/podcasts', podcastRoutes)
router.use('/books', bookRoutes)
router.use('/reels', reelRoutes)
router.use('/playlists', playlistRoutes)
router.use('/announcements', announcementRoutes)

// Rotas de upload
router.use('/upload', uploadRoutes)

// Rotas sociais
router.use('/follow', followRoutes)
router.use('/favorites', favoriteRoutes)
router.use('/notifications', notificationRoutes)
router.use('/feed', feedRoutes)
router.use('/users', userRoutes)
router.use('/portfolio', portfolioRoutes)

// Rotas universais (ratings & comments)
router.use('/ratings', ratingRoutes)
router.use('/comments', commentRoutes)
router.use('/reports', reportRoutes)
router.use('/appeals', appealRoutes)

// Rotas de acoes
router.use(
  '/stocks',
  enforceFinancialToolAvailability('stocks'),
  trackFinancialToolUsage('stocks'),
  stockRoutes
)

// Rotas ML
router.use('/ml', mlRoutes)

// Rotas de noticias
router.use('/news', newsRoutes)

// Rotas de mercados
router.use(
  '/crypto',
  enforceFinancialToolAvailability('crypto'),
  trackFinancialToolUsage('crypto'),
  cryptoRoutes
)
router.use(
  '/etfs',
  enforceFinancialToolAvailability('etf'),
  trackFinancialToolUsage('etf'),
  etfYahooRoutes
)
router.use(
  '/etfs',
  enforceFinancialToolAvailability('etf'),
  trackFinancialToolUsage('etf'),
  etfRoutes
)
router.use(
  '/reits',
  enforceFinancialToolAvailability('reit'),
  trackFinancialToolUsage('reit'),
  reitRoutes
)

// Rotas administrativas
router.use('/admin', adminRoutes)

// Rotas editoriais publicas
router.use('/editorial', editorialRoutes)
router.use('/directories', directoryRoutes)

// Rotas de superficies publicas/operacionais
router.use('/platform', platformRoutes)
router.use('/creators', creatorRoutes)
router.use('/brand-portal', brandPortalRoutes)
router.use('/external-content', externalContentRoutes)
router.use('/search', searchRoutes)
router.use('/ads', adsRoutes)
router.use('/affiliates', affiliateRoutes)
router.use('/integrations/brand', brandIntegrationRoutes)

export default router
