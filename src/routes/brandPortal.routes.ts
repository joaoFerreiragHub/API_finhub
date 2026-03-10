import { Router } from 'express'
import {
  createBrandPortalCampaign,
  getBrandPortalCampaign,
  getBrandPortalCampaignMetrics,
  getBrandPortalOverview,
  listBrandPortalCampaigns,
  listBrandPortalDirectories,
  submitBrandPortalCampaignForApproval,
  updateBrandPortalCampaign,
} from '../controllers/brandPortal.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

/**
 * @route   GET /api/brand-portal/overview
 * @desc    Overview do portal de marca para dono de DirectoryEntry
 * @access  Private
 */
router.get('/overview', authenticate, getBrandPortalOverview)

/**
 * @route   GET /api/brand-portal/directories
 * @desc    Listar diretorios pertencentes ao utilizador autenticado
 * @access  Private
 */
router.get('/directories', authenticate, listBrandPortalDirectories)

/**
 * @route   GET /api/brand-portal/campaigns
 * @desc    Listar campanhas da marca autenticada
 * @access  Private
 */
router.get('/campaigns', authenticate, listBrandPortalCampaigns)

/**
 * @route   POST /api/brand-portal/campaigns
 * @desc    Criar campanha self-service da marca
 * @access  Private
 */
router.post('/campaigns', authenticate, createBrandPortalCampaign)

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
router.patch('/campaigns/:campaignId', authenticate, updateBrandPortalCampaign)

/**
 * @route   POST /api/brand-portal/campaigns/:campaignId/submit-approval
 * @desc    Submeter campanha da marca para aprovacao admin
 * @access  Private
 */
router.post(
  '/campaigns/:campaignId/submit-approval',
  authenticate,
  submitBrandPortalCampaignForApproval
)

/**
 * @route   GET /api/brand-portal/campaigns/:campaignId/metrics
 * @desc    Obter metricas de campanha da marca
 * @access  Private
 */
router.get('/campaigns/:campaignId/metrics', authenticate, getBrandPortalCampaignMetrics)

export default router
