import { Router } from 'express'
import { updateMyProfile } from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'
import { validateUserUpdateMeContract } from '../middlewares/requestContracts'

const router = Router()

/**
 * @route   PATCH /api/users/me
 * @desc    Atualizar perfil do utilizador autenticado
 * @access  Private
 */
router.patch('/me', authenticate, rateLimiter.general, validateUserUpdateMeContract, updateMyProfile)

export default router
