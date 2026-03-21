import { Router } from 'express'
import { getCryptoInfo } from '../controllers/crypto.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

router.get('/', rateLimiter.marketData, getCryptoInfo)

export default router
