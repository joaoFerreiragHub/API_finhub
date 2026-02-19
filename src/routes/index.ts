// routes/index.ts
import { Router } from 'express'

// Importa as rotas de cada módulo
import authRoutes from './auth.routes'
import articleRoutes from './article.routes'
import videoRoutes from './video.routes'
import courseRoutes from './course.routes'
import liveeventRoutes from './liveevent.routes'
import podcastRoutes from './podcast.routes'
import bookRoutes from './book.routes'
import brandRoutes from './brand.routes'
import uploadRoutes from './upload.routes'
import followRoutes from './follow.routes'
import favoriteRoutes from './favorite.routes'
import notificationRoutes from './notification.routes'
import ratingRoutes from './rating.routes'
import commentRoutes from './comment.routes'
import stockRoutes from './stock.routes'
import mlRoutes from './ml.routes'
import newsRoutes from './newsRoutes'
import cryptoRoutes from './crypto.routes'
import etfRoutes from './etf.routes'
import etfYahooRoutes from './etfYahoo.routes'
import reitRoutes from './reit.routes'

const router = Router()

// Rota de verificação
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
      },
      brands: '/api/brands',
      upload: '/api/upload',
      social: {
        follow: '/api/follow',
        favorites: '/api/favorites',
        notifications: '/api/notifications',
      },
      universal: {
        ratings: '/api/ratings',
        comments: '/api/comments',
      },
      stocks: '/api/stocks',
      ml: '/api/ml',
      news: '/api/news',
      markets: {
        crypto: '/api/crypto',
        etfs: '/api/etfs',
        reits: '/api/reits',
      }
    },
    timestamp: new Date().toISOString()
  })
})

// Rotas de autenticação
router.use('/auth', authRoutes)

// Rotas de conteúdos
router.use('/articles', articleRoutes)
router.use('/videos', videoRoutes)
router.use('/courses', courseRoutes)
router.use('/lives', liveeventRoutes)
router.use('/podcasts', podcastRoutes)
router.use('/books', bookRoutes)

// Rotas de brands (admin)
router.use('/brands', brandRoutes)

// Rotas de upload
router.use('/upload', uploadRoutes)

// Rotas sociais
router.use('/follow', followRoutes)
router.use('/favorites', favoriteRoutes)
router.use('/notifications', notificationRoutes)

// Rotas universais (ratings & comments)
router.use('/ratings', ratingRoutes)
router.use('/comments', commentRoutes)

// Rotas de ações
router.use('/stocks', stockRoutes)

// Rotas ML
router.use('/ml', mlRoutes)

// Rotas de Notícias
router.use('/news', newsRoutes)

// Rotas de Mercados
router.use('/crypto', cryptoRoutes)
router.use('/etfs', etfYahooRoutes)
router.use('/etfs', etfRoutes)
router.use('/reits', reitRoutes)

export default router