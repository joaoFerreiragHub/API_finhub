import { Router } from 'express'
import { register, login, refresh, logout, me } from '../controllers/auth.controller'
import {
  listMyActiveAssistedSessions,
  listMyPendingAssistedSessionRequests,
  respondMyAssistedSessionRequest,
  revokeMyAssistedSession,
} from '../controllers/authAssistedSession.controller'
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

/**
 * @route   GET /api/auth/assisted-sessions/pending
 * @desc    Listar pedidos pendentes de consentimento para sessao assistida
 * @access  Private
 */
router.get('/assisted-sessions/pending', authenticate, listMyPendingAssistedSessionRequests)

/**
 * @route   GET /api/auth/assisted-sessions/active
 * @desc    Listar sessoes assistidas ativas da conta autenticada
 * @access  Private
 */
router.get('/assisted-sessions/active', authenticate, listMyActiveAssistedSessions)

/**
 * @route   POST /api/auth/assisted-sessions/:sessionId/consent
 * @desc    Aprovar ou recusar pedido de sessao assistida
 * @access  Private
 */
router.post('/assisted-sessions/:sessionId/consent', authenticate, respondMyAssistedSessionRequest)

/**
 * @route   POST /api/auth/assisted-sessions/:sessionId/revoke
 * @desc    Revogar sessao assistida da propria conta
 * @access  Private
 */
router.post('/assisted-sessions/:sessionId/revoke', authenticate, revokeMyAssistedSession)

export default router
