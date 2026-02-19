import { Router } from 'express'
import { register, login, refresh, logout, me } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

/**
 * @route   POST /api/auth/register
 * @desc    Criar nova conta
 * @access  Public
 */
router.post('/register', register)

/**
 * @route   POST /api/auth/login
 * @desc    Fazer login
 * @access  Public
 */
router.post('/login', login)

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar access token
 * @access  Public
 */
router.post('/refresh', refresh)

/**
 * @route   POST /api/auth/logout
 * @desc    Fazer logout
 * @access  Private
 */
router.post('/logout', authenticate, logout)

/**
 * @route   GET /api/auth/me
 * @desc    Obter dados do utilizador autenticado
 * @access  Private
 */
router.get('/me', authenticate, me)

export default router
