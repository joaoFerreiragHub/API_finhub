import { Router } from 'express'
import {
  register,
  login,
  googleOAuthStart,
  googleOAuthCallback,
  refresh,
  logout,
  me,
  sendEmailTest,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  updateCookieConsent,
} from '../controllers/auth.controller'
import {
  listMyActiveAssistedSessions,
  listMyPendingAssistedSessionRequests,
  respondMyAssistedSessionRequest,
  revokeMyAssistedSession,
} from '../controllers/authAssistedSession.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'

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
 * @route   GET /api/auth/google/start
 * @desc    Iniciar OAuth com Google
 * @access  Public
 */
router.get('/google/start', rateLimiter.general, googleOAuthStart)

/**
 * @route   GET /api/auth/google/callback
 * @desc    Callback OAuth Google
 * @access  Public
 */
router.get('/google/callback', rateLimiter.general, googleOAuthCallback)

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Iniciar fluxo de reset de password
 * @access  Public
 */
router.post('/forgot-password', rateLimiter.general, forgotPassword)

/**
 * @route   POST /api/auth/reset-password
 * @desc    Concluir reset de password com token valido
 * @access  Public
 */
router.post('/reset-password', rateLimiter.general, resetPassword)

/**
 * @route   GET /api/auth/verify-email
 * @desc    Confirmar email por token
 * @access  Public
 */
router.get('/verify-email', rateLimiter.general, verifyEmail)

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Reenviar email de verificacao para utilizador autenticado
 * @access  Private
 */
router.post('/resend-verification', authenticate, rateLimiter.general, resendVerification)

/**
 * @route   PATCH /api/auth/cookie-consent
 * @desc    Atualizar consentimento de cookies
 * @access  Private
 */
router.patch('/cookie-consent', authenticate, rateLimiter.general, updateCookieConsent)

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
 * @route   POST /api/auth/email/test
 * @desc    Enviar email de teste operacional para o utilizador autenticado
 * @access  Private
 */
router.post('/email/test', authenticate, rateLimiter.general, sendEmailTest)

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
