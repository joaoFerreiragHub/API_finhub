import { Router } from 'express'
import { deleteMyAccount, exportMyData, updateMyProfile } from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'
import { validateUserDeleteMeContract, validateUserUpdateMeContract } from '../middlewares/requestContracts'

const router = Router()

/**
 * @route   PATCH /api/users/me
 * @desc    Atualizar perfil do utilizador autenticado
 * @access  Private
 */
router.patch('/me', authenticate, rateLimiter.general, validateUserUpdateMeContract, updateMyProfile)

/**
 * @route   GET /api/users/me/export
 * @desc    Exportar dados da conta autenticada (JSON)
 * @access  Private
 */
router.get('/me/export', authenticate, rateLimiter.general, exportMyData)

/**
 * @route   DELETE /api/users/me
 * @desc    Eliminar (anonimizar/desativar) conta autenticada
 * @access  Private
 */
router.delete('/me', authenticate, rateLimiter.general, validateUserDeleteMeContract, deleteMyAccount)

export default router
