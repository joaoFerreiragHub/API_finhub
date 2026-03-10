import { Router } from 'express'
import {
  getBrandIntegrationAffiliateOverview,
  listBrandIntegrationAffiliateLinks,
} from '../controllers/brandIntegration.controller'
import { requireBrandIntegrationScope } from '../middlewares/brandIntegrationAuth'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/integrations/brand/affiliate/overview
 * @desc    Ler overview de afiliacao via API key de marca
 * @access  ApiKey (scope: brand.affiliate.read)
 */
router.get(
  '/affiliate/overview',
  rateLimiter.stats,
  requireBrandIntegrationScope('brand.affiliate.read'),
  getBrandIntegrationAffiliateOverview
)

/**
 * @route   GET /api/integrations/brand/affiliate/links
 * @desc    Listar links de afiliacao da marca via API key
 * @access  ApiKey (scope: brand.affiliate.read)
 */
router.get(
  '/affiliate/links',
  rateLimiter.stats,
  requireBrandIntegrationScope('brand.affiliate.read'),
  listBrandIntegrationAffiliateLinks
)

export default router
