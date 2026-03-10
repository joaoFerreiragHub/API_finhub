import { Router } from 'express'
import { redirectAffiliateLink } from '../controllers/affiliatePublic.controller'
import { optionalAuth } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/affiliates/r/:code
 * @desc    Redirect de link de afiliacao com tracking de clique
 * @access  Public
 */
router.get('/r/:code', rateLimiter.general, optionalAuth, redirectAffiliateLink)

export default router
