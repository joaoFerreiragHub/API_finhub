import { Router } from 'express'
import { getBatchSnapshot, getQuickAnalysis } from '../controllers/stock.controller'

const router = Router()

router.get('/batch-snapshot', getBatchSnapshot)
router.get('/quick-analysis/:symbol', getQuickAnalysis)
export default router
