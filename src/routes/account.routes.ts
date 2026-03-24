import { Router } from 'express'
import { exportMyData } from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/account/export
 * @desc    Exportar dados da conta autenticada (RGPD Art. 20)
 * @access  Private
 */
router.get('/export', authenticate, rateLimiter.general, exportMyData)

export default router
