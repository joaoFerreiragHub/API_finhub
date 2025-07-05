// routes/index.ts
import { Router } from 'express'

// Importa as rotas de cada módulo
import stockRoutes from './stock.routes'
import mlRoutes from './ml.routes'
import newsRoutes from './newsRoutes'

const router = Router()

// Rota de verificação
router.get('/', (req, res) => {
  res.json({
    message: 'API FinHub está ativa ✅',
    version: '1.0.0',
    endpoints: {
      stocks: '/api/stocks',
      ml: '/api/ml',
      news: '/api/news'
    },
    timestamp: new Date().toISOString()
  })
})

// Rotas de ações
router.use('/stocks', stockRoutes)

// Rotas ML
router.use('/ml', mlRoutes)

// Rotas de Notícias
router.use('/news', newsRoutes)

export default router