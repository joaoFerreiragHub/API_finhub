import { Router } from 'express'
import {
  createBrandPortalCampaign,
  getBrandPortalCampaign,
  getBrandPortalCampaignMetrics,
  getBrandPortalOverview,
  getBrandPortalWallet,
  listBrandPortalCampaigns,
  listBrandPortalDirectories,
  listBrandPortalWallets,
  listBrandPortalWalletTransactions,
  requestBrandPortalWalletTopUp,
  submitBrandPortalCampaignForApproval,
  updateBrandPortalCampaign,
} from '../controllers/brandPortal.controller'
import {
  createBrandPortalAffiliateLink,
  listBrandPortalAffiliateLinkClicks,
  listBrandPortalAffiliateLinks,
  updateBrandPortalAffiliateLink,
} from '../controllers/brandPortalAffiliate.controller'
import {
  createBrandPortalIntegrationApiKey,
  listBrandPortalIntegrationApiKeyUsage,
  listBrandPortalIntegrationApiKeys,
  revokeBrandPortalIntegrationApiKey,
} from '../controllers/brandPortalIntegration.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'
import {
  validateBrandPortalAffiliateLinkClicksContract,
  validateBrandPortalAffiliateLinkCreateContract,
  validateBrandPortalAffiliateLinkListContract,
  validateBrandPortalAffiliateLinkUpdateContract,
  validateBrandPortalCampaignCreateContract,
  validateBrandPortalDirectoriesContract,
  validateBrandPortalCampaignListContract,
  validateBrandPortalCampaignMetricsContract,
  validateBrandPortalOverviewContract,
  validateBrandPortalCampaignSubmitApprovalContract,
  validateBrandPortalCampaignUpdateContract,
  validateBrandPortalIntegrationApiKeyCreateContract,
  validateBrandPortalIntegrationApiKeyListContract,
  validateBrandPortalIntegrationApiKeyRevokeContract,
  validateBrandPortalIntegrationApiKeyUsageContract,
  validateBrandPortalWalletDetailContract,
  validateBrandPortalWalletListContract,
  validateBrandPortalWalletTopUpRequestContract,
  validateBrandPortalWalletTransactionsContract,
} from '../middlewares/requestContracts'

const router = Router()

/**
 * @route   GET /api/brand-portal/overview
 * @desc    Overview do portal de marca para dono de DirectoryEntry
 * @access  Private
 */
router.get(
  '/overview',
  authenticate,
  rateLimiter.api,
  validateBrandPortalOverviewContract,
  getBrandPortalOverview
)

/**
 * @route   GET /api/brand-portal/directories
 * @desc    Listar diretorios pertencentes ao utilizador autenticado
 * @access  Private
 */
router.get(
  '/directories',
  authenticate,
  rateLimiter.api,
  validateBrandPortalDirectoriesContract,
  listBrandPortalDirectories
)

/**
 * @route   GET /api/brand-portal/wallets
 * @desc    Listar wallets da marca por DirectoryEntry
 * @access  Private
 */
router.get(
  '/wallets',
  authenticate,
  rateLimiter.api,
  validateBrandPortalWalletListContract,
  listBrandPortalWallets
)

/**
 * @route   GET /api/brand-portal/wallets/:directoryEntryId
 * @desc    Obter wallet da marca para um DirectoryEntry
 * @access  Private
 */
router.get(
  '/wallets/:directoryEntryId',
  authenticate,
  rateLimiter.api,
  validateBrandPortalWalletDetailContract,
  getBrandPortalWallet
)

/**
 * @route   GET /api/brand-portal/wallets/:directoryEntryId/transactions
 * @desc    Listar transacoes da wallet da marca
 * @access  Private
 */
router.get(
  '/wallets/:directoryEntryId/transactions',
  authenticate,
  rateLimiter.api,
  validateBrandPortalWalletTransactionsContract,
  listBrandPortalWalletTransactions
)

/**
 * @route   POST /api/brand-portal/wallets/:directoryEntryId/top-up-requests
 * @desc    Criar pedido de top-up da wallet da marca
 * @access  Private
 */
router.post(
  '/wallets/:directoryEntryId/top-up-requests',
  authenticate,
  rateLimiter.api,
  validateBrandPortalWalletTopUpRequestContract,
  requestBrandPortalWalletTopUp
)

/**
 * @route   GET /api/brand-portal/campaigns
 * @desc    Listar campanhas da marca autenticada
 * @access  Private
 */
router.get(
  '/campaigns',
  authenticate,
  rateLimiter.api,
  validateBrandPortalCampaignListContract,
  listBrandPortalCampaigns
)

/**
 * @route   POST /api/brand-portal/campaigns
 * @desc    Criar campanha self-service da marca
 * @access  Private
 */
router.post(
  '/campaigns',
  authenticate,
  rateLimiter.api,
  validateBrandPortalCampaignCreateContract,
  createBrandPortalCampaign
)

/**
 * @route   GET /api/brand-portal/campaigns/:campaignId
 * @desc    Obter campanha self-service da marca
 * @access  Private
 */
router.get('/campaigns/:campaignId', authenticate, getBrandPortalCampaign)

/**
 * @route   PATCH /api/brand-portal/campaigns/:campaignId
 * @desc    Atualizar campanha self-service da marca
 * @access  Private
 */
router.patch(
  '/campaigns/:campaignId',
  authenticate,
  rateLimiter.api,
  validateBrandPortalCampaignUpdateContract,
  updateBrandPortalCampaign
)

/**
 * @route   POST /api/brand-portal/campaigns/:campaignId/submit-approval
 * @desc    Submeter campanha da marca para aprovacao admin
 * @access  Private
 */
router.post(
  '/campaigns/:campaignId/submit-approval',
  authenticate,
  rateLimiter.api,
  validateBrandPortalCampaignSubmitApprovalContract,
  submitBrandPortalCampaignForApproval
)

/**
 * @route   GET /api/brand-portal/campaigns/:campaignId/metrics
 * @desc    Obter metricas de campanha da marca
 * @access  Private
 */
router.get(
  '/campaigns/:campaignId/metrics',
  authenticate,
  rateLimiter.api,
  validateBrandPortalCampaignMetricsContract,
  getBrandPortalCampaignMetrics
)

/**
 * @route   GET /api/brand-portal/affiliate-links
 * @desc    Listar links de afiliacao da marca autenticada
 * @access  Private
 */
router.get(
  '/affiliate-links',
  authenticate,
  rateLimiter.api,
  validateBrandPortalAffiliateLinkListContract,
  listBrandPortalAffiliateLinks
)

/**
 * @route   POST /api/brand-portal/affiliate-links
 * @desc    Criar link de afiliacao para um DirectoryEntry owned
 * @access  Private
 */
router.post(
  '/affiliate-links',
  authenticate,
  rateLimiter.api,
  validateBrandPortalAffiliateLinkCreateContract,
  createBrandPortalAffiliateLink
)

/**
 * @route   PATCH /api/brand-portal/affiliate-links/:linkId
 * @desc    Atualizar link de afiliacao da marca autenticada
 * @access  Private
 */
router.patch(
  '/affiliate-links/:linkId',
  authenticate,
  rateLimiter.api,
  validateBrandPortalAffiliateLinkUpdateContract,
  updateBrandPortalAffiliateLink
)

/**
 * @route   GET /api/brand-portal/affiliate-links/:linkId/clicks
 * @desc    Listar cliques/conversoes de um link de afiliacao owned
 * @access  Private
 */
router.get(
  '/affiliate-links/:linkId/clicks',
  authenticate,
  rateLimiter.api,
  validateBrandPortalAffiliateLinkClicksContract,
  listBrandPortalAffiliateLinkClicks
)

/**
 * @route   GET /api/brand-portal/integrations/api-keys
 * @desc    Listar API keys de integracao da marca autenticada
 * @access  Private
 */
router.get(
  '/integrations/api-keys',
  authenticate,
  rateLimiter.api,
  validateBrandPortalIntegrationApiKeyListContract,
  listBrandPortalIntegrationApiKeys
)

/**
 * @route   POST /api/brand-portal/integrations/api-keys
 * @desc    Criar API key de integracao para um DirectoryEntry owned
 * @access  Private
 */
router.post(
  '/integrations/api-keys',
  authenticate,
  rateLimiter.api,
  validateBrandPortalIntegrationApiKeyCreateContract,
  createBrandPortalIntegrationApiKey
)

/**
 * @route   POST /api/brand-portal/integrations/api-keys/:keyId/revoke
 * @desc    Revogar API key de integracao da marca autenticada
 * @access  Private
 */
router.post(
  '/integrations/api-keys/:keyId/revoke',
  authenticate,
  rateLimiter.api,
  validateBrandPortalIntegrationApiKeyRevokeContract,
  revokeBrandPortalIntegrationApiKey
)

/**
 * @route   GET /api/brand-portal/integrations/api-keys/:keyId/usage
 * @desc    Ler uso operacional de uma API key de integracao
 * @access  Private
 */
router.get(
  '/integrations/api-keys/:keyId/usage',
  authenticate,
  rateLimiter.api,
  validateBrandPortalIntegrationApiKeyUsageContract,
  listBrandPortalIntegrationApiKeyUsage
)

export default router
