import { Router } from 'express'
import { getETFInfo, listETFs, getETFsOverlap, getETFsSectorOverlap } from '../controllers/etf.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

router.get('/list', rateLimiter.marketData, listETFs)
router.get('/overlap', rateLimiter.marketData, getETFsOverlap)
router.get('/sectorOverlap', rateLimiter.marketData, getETFsSectorOverlap)
router.get('/:symbol', rateLimiter.marketData, getETFInfo)

export default router
