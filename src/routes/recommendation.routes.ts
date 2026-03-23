import { Router } from 'express'
import { getRecommendations } from '../controllers/recommendation.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'
import { validateRecommendationsQueryContract } from '../middlewares/requestContracts'

const router = Router()

/**
 * @route GET /api/recommendations
 * @desc  Feed personalizado baseado em afinidade de tags
 * @access Private
 */
router.get('/', authenticate, rateLimiter.general, validateRecommendationsQueryContract, getRecommendations)

export default router
