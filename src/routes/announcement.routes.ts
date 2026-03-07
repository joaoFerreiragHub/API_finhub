import { Router } from 'express'
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getMyAnnouncementStats,
  getMyAnnouncements,
  listAnnouncements,
  updateAnnouncement,
} from '../controllers/announcement.controller'
import { authenticate } from '../middlewares/auth'
import { enforceCreatorOperationalControl } from '../middlewares/creatorOperationalControl'
import { requireCreator, requireVerifiedEmail } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Public routes
// ==========================================

/**
 * @route   GET /api/announcements
 * @desc    List announcements
 * @access  Public
 */
router.get('/', listAnnouncements)

/**
 * @route   GET /api/announcements/id/:id
 * @desc    Get announcement by id
 * @access  Public
 */
router.get('/id/:id', getAnnouncementById)

// ==========================================
// Protected routes (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/announcements/me
 * @desc    List my announcements
 * @access  Private (Creator/Admin)
 */
router.get('/me', authenticate, requireCreator, getMyAnnouncements)

/**
 * @route   GET /api/announcements/my
 * @desc    Legacy alias for my announcements
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyAnnouncements)

/**
 * @route   GET /api/announcements/stats
 * @desc    Stats for my announcements
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyAnnouncementStats)

/**
 * @route   POST /api/announcements
 * @desc    Create announcement
 * @access  Private (Creator/Admin)
 */
router.post(
  '/',
  authenticate,
  requireCreator,
  requireVerifiedEmail,
  enforceCreatorOperationalControl('create'),
  createAnnouncement
)

/**
 * @route   PATCH /api/announcements/:id
 * @desc    Update announcement
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updateAnnouncement)

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete announcement
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deleteAnnouncement)

export default router
