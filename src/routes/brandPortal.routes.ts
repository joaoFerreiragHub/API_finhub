import { Router } from 'express'
import { getBrandPortalOverview } from '../controllers/brandPortal.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

/**
 * @route   GET /api/brand-portal/overview
 * @desc    Overview do portal de marca para dono de DirectoryEntry
 * @access  Private
 */
router.get('/overview', authenticate, getBrandPortalOverview)

export default router

