import { Router } from 'express'
import {
  importExternalContentFromUrl,
  listSupportedExternalProviders,
} from '../controllers/externalContent.controller'
import { authenticate } from '../middlewares/auth'
import { enforceCreatorOperationalControl } from '../middlewares/creatorOperationalControl'
import { requireCreator, requireVerifiedEmail } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Public routes
// ==========================================

/**
 * @route   GET /api/external-content/providers
 * @desc    Listar providers suportados para importacao
 * @access  Public
 */
router.get('/providers', listSupportedExternalProviders)

// ==========================================
// Protected routes (Creator Dashboard)
// ==========================================

/**
 * @route   POST /api/external-content/import-url
 * @desc    Importar metadata de URL externa via oEmbed (MVP)
 * @access  Private (Creator/Admin)
 * @body    { url: string, requestedContentType?: string }
 */
router.post(
  '/import-url',
  authenticate,
  requireCreator,
  requireVerifiedEmail,
  enforceCreatorOperationalControl('create'),
  importExternalContentFromUrl
)

export default router