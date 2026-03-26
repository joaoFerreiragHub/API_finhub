import { Router } from 'express'
import { exportMyData, uploadMyAvatar } from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth'
import { handleAvatarUpload } from '../middlewares/upload'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/account/export
 * @desc    Exportar dados da conta autenticada (RGPD Art. 20)
 * @access  Private
 */
router.get('/export', authenticate, rateLimiter.general, exportMyData)

/**
 * @route   POST /api/account/avatar
 * @desc    Upload de avatar da conta autenticada
 * @access  Private
 * @form    multipart/form-data com campo "avatar"
 */
router.post('/avatar', authenticate, rateLimiter.userProfilePatch, handleAvatarUpload, uploadMyAvatar)

export default router
