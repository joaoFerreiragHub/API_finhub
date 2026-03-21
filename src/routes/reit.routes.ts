import { Router } from 'express'
import {
  calculateDDM,
  calculateFFO,
  calculateNAV,
  getOccupancyRate,
  calculateDebtRatios,
  calculateMetrics,
} from '../controllers/reit.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

router.get('/calculateDDM', rateLimiter.reits, calculateDDM)
router.get('/calculateFFO', rateLimiter.reits, calculateFFO)
router.get('/calculateNAV', rateLimiter.reits, calculateNAV)
router.get('/occupancyRate', rateLimiter.reits, getOccupancyRate)
router.get('/calculateDebtRatios', rateLimiter.reits, calculateDebtRatios)
router.get('/calculateMetrics', rateLimiter.reits, calculateMetrics)

export default router
