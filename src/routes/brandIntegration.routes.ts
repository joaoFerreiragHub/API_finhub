import { Router } from 'express'
import {
  getBrandIntegrationAffiliateOverview,
  listBrandIntegrationAffiliateLinkClicks,
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

/**
 * @route   GET /api/integrations/brand/affiliate/links/:linkId/clicks
 * @desc    Ler cliques/conversoes detalhados de um link de afiliacao via API key
 * @access  ApiKey (scope: brand.affiliate.read)
 */
router.get(
  '/affiliate/links/:linkId/clicks',
  rateLimiter.stats,
  requireBrandIntegrationScope('brand.affiliate.read'),
  listBrandIntegrationAffiliateLinkClicks
)

export default router
