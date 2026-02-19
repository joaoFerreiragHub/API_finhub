import { Router } from 'express'
import {
  calculateDDM,
  calculateFFO,
  calculateNAV,
  getOccupancyRate,
  calculateDebtRatios,
  calculateMetrics,
} from '../controllers/reit.controller'

const router = Router()

router.get('/calculateDDM', calculateDDM)
router.get('/calculateFFO', calculateFFO)
router.get('/calculateNAV', calculateNAV)
router.get('/occupancyRate', getOccupancyRate)
router.get('/calculateDebtRatios', calculateDebtRatios)
router.get('/calculateMetrics', calculateMetrics)

export default router
