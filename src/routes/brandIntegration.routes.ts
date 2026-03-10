import { Router } from 'express'
import {
  getBrandIntegrationAffiliateOverview,
  listBrandIntegrationAffiliateLinkClicks,
  listBrandIntegrationAffiliateLinks,
} from '../controllers/brandIntegration.controller'
import { requireBrandIntegrationScope } from '../middlewares/brandIntegrationAuth'
import { rateLimiter } from '../middlewares/rateLimiter'
import {
  validateBrandIntegrationAffiliateLinkClicksQueryContract,
  validateBrandIntegrationAffiliateLinksQueryContract,
  validateBrandIntegrationAffiliateOverviewQueryContract,
} from '../middlewares/requestContracts'

const router = Router()

/**
 * @route   GET /api/integrations/brand/affiliate/overview
 * @desc    Ler overview de afiliacao via API key de marca
 * @access  ApiKey (scope: brand.affiliate.read)
 */
router.get(
  '/affiliate/overview',
  rateLimiter.brandIntegration,
  requireBrandIntegrationScope('brand.affiliate.read'),
  validateBrandIntegrationAffiliateOverviewQueryContract,
  getBrandIntegrationAffiliateOverview
)

/**
 * @route   GET /api/integrations/brand/affiliate/links
 * @desc    Listar links de afiliacao da marca via API key
 * @access  ApiKey (scope: brand.affiliate.read)
 */
router.get(
  '/affiliate/links',
  rateLimiter.brandIntegration,
  requireBrandIntegrationScope('brand.affiliate.read'),
  validateBrandIntegrationAffiliateLinksQueryContract,
  listBrandIntegrationAffiliateLinks
)

/**
 * @route   GET /api/integrations/brand/affiliate/links/:linkId/clicks
 * @desc    Ler cliques/conversoes detalhados de um link de afiliacao via API key
 * @access  ApiKey (scope: brand.affiliate.read)
 */
router.get(
  '/affiliate/links/:linkId/clicks',
  rateLimiter.brandIntegration,
  requireBrandIntegrationScope('brand.affiliate.read'),
  validateBrandIntegrationAffiliateLinkClicksQueryContract,
  listBrandIntegrationAffiliateLinkClicks
)

export default router
