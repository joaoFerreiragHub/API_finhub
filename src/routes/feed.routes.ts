import { Router } from 'express'
import { getFeed } from '../controllers/feed.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/feed
 * @desc    Feed cronologico de conteudos (a seguir por defeito)
 * @access  Private
 */
router.get('/', authenticate, rateLimiter.general, getFeed)

export default router
