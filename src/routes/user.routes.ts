import { Router } from 'express'
import {
  deleteMyAccount,
  exportMyData,
  getMyProfile,
  getPublicProfileByUsername,
  uploadMyAvatar,
  updateMyProfile,
} from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth'
import { handleAvatarUpload } from '../middlewares/upload'
import { rateLimiter } from '../middlewares/rateLimiter'
import { validateUserDeleteMeContract, validateUserUpdateMeContract } from '../middlewares/requestContracts'

const router = Router()

/**
 * @route   GET /api/users/me
 * @desc    Ler perfil da conta autenticada (inclui nivel/badges)
 * @access  Private
 */
router.get('/me', authenticate, rateLimiter.general, getMyProfile)

/**
 * @route   POST /api/users/me/avatar
 * @desc    Upload de avatar para Cloudinary
 * @access  Private
 * @form    multipart/form-data com campo 'avatar'
 * @limits  5MB, tipos: jpeg, png, webp
 */
router.post('/me/avatar', authenticate, rateLimiter.userProfilePatch, handleAvatarUpload, uploadMyAvatar)

/**
 * @route   PATCH /api/users/me
 * @desc    Atualizar perfil do utilizador autenticado
 * @access  Private
 */
router.patch('/me', authenticate, rateLimiter.userProfilePatch, validateUserUpdateMeContract, updateMyProfile)

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

/**
 * @route   GET /api/users/:username/public
 * @desc    Ler perfil publico por username
 * @access  Public
 */
router.get('/:username/public', rateLimiter.general, getPublicProfileByUsername)

/**
 * @route   GET /api/users/profile/:username
 * @desc    Alias legado para perfil publico
 * @access  Public
 */
router.get('/profile/:username', rateLimiter.general, getPublicProfileByUsername)

export default router
