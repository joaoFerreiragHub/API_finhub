import { Router } from 'express'
import {
  redirectAffiliateLink,
  registerAffiliatePostbackConversion,
} from '../controllers/affiliatePublic.controller'
import { optionalAuth } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'
import {
  validateAffiliatePostbackConversionContract,
  validateAffiliateRedirectContract,
} from '../middlewares/requestContracts'

const router = Router()

/**
 * @route   GET /api/affiliates/r/:code
 * @desc    Redirect de link de afiliacao com tracking de clique
 * @access  Public
 */
router.get(
  '/r/:code',
  rateLimiter.general,
  optionalAuth,
  validateAffiliateRedirectContract,
  redirectAffiliateLink
)

/**
 * @route   POST /api/affiliates/postback/conversion
 * @desc    Registar conversao de afiliacao via postback de parceiro externo
 * @access  Public (protegido por segredo em x-affiliate-postback-secret)
 */
router.post(
  '/postback/conversion',
  rateLimiter.api,
  validateAffiliatePostbackConversionContract,
  registerAffiliatePostbackConversion
)

export default router
