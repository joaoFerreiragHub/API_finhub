import { Router } from 'express'
import { getBatchSnapshot, getQuickAnalysis } from '../controllers/stock.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

router.get('/batch-snapshot', rateLimiter.marketData, getBatchSnapshot)
router.get('/quick-analysis/:symbol', rateLimiter.quickAnalysis, getQuickAnalysis)
export default router
