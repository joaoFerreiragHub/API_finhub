import { Router } from 'express'
import { postRecommendationSignal } from '../controllers/recommendation.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'
import { validateUserSignalContract } from '../middlewares/requestContracts'

const router = Router()

/**
 * @route POST /api/user/signals
 * @desc  Regista sinais de utilizador para afinar recomendacoes
 * @access Private
 */
router.post('/signals', authenticate, rateLimiter.general, validateUserSignalContract, postRecommendationSignal)

export default router
