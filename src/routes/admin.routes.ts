import { Router } from 'express'
import { listAdminAuditLogs } from '../controllers/adminAudit.controller'
import { listAdminInternalAlerts } from '../controllers/adminOperationalAlerts.controller'
import {
  listAdminAssistedSessionHistory,
  listAdminAssistedSessions,
  requestAdminAssistedSession,
  revokeAdminAssistedSession,
  startAdminAssistedSession,
} from '../controllers/adminAssistedSession.controller'
import {
  hideContent,
  listAdminContentQueue,
  listContentModerationHistory,
  restrictContent,
  unhideContent,
} from '../controllers/adminContent.controller'
import { getAdminMetricsOverview } from '../controllers/adminMetrics.controller'
import {
  addUserInternalNote,
  banUser,
  forceLogoutUser,
  listAdminUsers,
  listUserModerationHistory,
  suspendUser,
  unbanUser,
} from '../controllers/adminUser.controller'
import { authenticate } from '../middlewares/auth'
import { auditAdminAction } from '../middlewares/adminAudit'
import { requireAdminScope } from '../middlewares/roleGuard'

const router = Router()

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Listar logs de auditoria administrativa
 * @access  Private (Admin com escopo admin.audit.read)
 */
router.get(
  '/audit-logs',
  authenticate,
  auditAdminAction({
    action: 'admin.audit_logs.list',
    resourceType: 'admin_audit_log',
    scope: 'admin.audit.read',
  }),
  requireAdminScope('admin.audit.read'),
  listAdminAuditLogs
)

/**
 * @route   GET /api/admin/alerts/internal
 * @desc    Alertas internos para eventos admin criticos
 * @access  Private (Admin com escopo admin.audit.read)
 */
router.get(
  '/alerts/internal',
  authenticate,
  auditAdminAction({
    action: 'admin.alerts.internal.list',
    resourceType: 'admin_operational_alert',
    scope: 'admin.audit.read',
  }),
  requireAdminScope('admin.audit.read'),
  listAdminInternalAlerts
)

/**
 * @route   GET /api/admin/metrics/overview
 * @desc    Dashboard consolidado de metricas administrativas
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/metrics/overview',
  authenticate,
  auditAdminAction({
    action: 'admin.metrics.overview.read',
    resourceType: 'admin_metrics',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getAdminMetricsOverview
)

/**
 * @route   GET /api/admin/support/sessions
 * @desc    Listar sessoes assistidas do admin autenticado
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.get(
  '/support/sessions',
  authenticate,
  auditAdminAction({
    action: 'admin.support.sessions.list',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
  }),
  requireAdminScope('admin.support.session.assist'),
  listAdminAssistedSessions
)

/**
 * @route   POST /api/admin/support/sessions/request
 * @desc    Criar pedido de sessao assistida para um utilizador alvo
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.post(
  '/support/sessions/request',
  authenticate,
  auditAdminAction({
    action: 'admin.support.sessions.request',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
  }),
  requireAdminScope('admin.support.session.assist'),
  requestAdminAssistedSession
)

/**
 * @route   POST /api/admin/support/sessions/:sessionId/start
 * @desc    Iniciar sessao assistida apos consentimento
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.post(
  '/support/sessions/:sessionId/start',
  authenticate,
  auditAdminAction({
    action: 'admin.support.sessions.start',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
    getResourceId: (req) => req.params.sessionId,
  }),
  requireAdminScope('admin.support.session.assist'),
  startAdminAssistedSession
)

/**
 * @route   POST /api/admin/support/sessions/:sessionId/revoke
 * @desc    Revogar sessao assistida ativa/pendente/aprovada
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.post(
  '/support/sessions/:sessionId/revoke',
  authenticate,
  auditAdminAction({
    action: 'admin.support.sessions.revoke',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
    getResourceId: (req) => req.params.sessionId,
  }),
  requireAdminScope('admin.support.session.assist'),
  revokeAdminAssistedSession
)

/**
 * @route   GET /api/admin/support/sessions/:sessionId/history
 * @desc    Listar auditoria detalhada de uma sessao assistida
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.get(
  '/support/sessions/:sessionId/history',
  authenticate,
  auditAdminAction({
    action: 'admin.support.sessions.history.list',
    resourceType: 'assisted_session_audit_log',
    scope: 'admin.support.session.assist',
    getResourceId: (req) => req.params.sessionId,
  }),
  requireAdminScope('admin.support.session.assist'),
  listAdminAssistedSessionHistory
)

/**
 * @route   GET /api/admin/content/queue
 * @desc    Listar fila unificada de moderacao de conteudo
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/queue',
  authenticate,
  auditAdminAction({
    action: 'admin.content.queue.list',
    resourceType: 'content',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminContentQueue
)

/**
 * @route   GET /api/admin/content/:contentType/:contentId/history
 * @desc    Listar historico de moderacao de um conteudo
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/:contentType/:contentId/history',
  authenticate,
  auditAdminAction({
    action: 'admin.content.history.list',
    resourceType: 'content_moderation_event',
    scope: 'admin.content.read',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.read'),
  listContentModerationHistory
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/hide
 * @desc    Ocultar conteudo da superficie publica
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/hide',
  authenticate,
  auditAdminAction({
    action: 'admin.content.hide',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  hideContent
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/unhide
 * @desc    Reativar conteudo para visibilidade publica
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/unhide',
  authenticate,
  auditAdminAction({
    action: 'admin.content.unhide',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  unhideContent
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/restrict
 * @desc    Restringir conteudo por acao administrativa
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/restrict',
  authenticate,
  auditAdminAction({
    action: 'admin.content.restrict',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  restrictContent
)

/**
 * @route   GET /api/admin/users
 * @desc    Listar/pesquisar utilizadores para operacao admin
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/users',
  authenticate,
  auditAdminAction({
    action: 'admin.users.list',
    resourceType: 'user',
    scope: 'admin.users.read',
  }),
  requireAdminScope('admin.users.read'),
  listAdminUsers
)

/**
 * @route   GET /api/admin/users/:userId/history
 * @desc    Listar historico de sancoes e anotacoes de um utilizador
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/users/:userId/history',
  authenticate,
  auditAdminAction({
    action: 'admin.users.history.list',
    resourceType: 'user_moderation_event',
    scope: 'admin.users.read',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.read'),
  listUserModerationHistory
)

/**
 * @route   POST /api/admin/users/:userId/notes
 * @desc    Adicionar nota interna ao historico do utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/notes',
  authenticate,
  auditAdminAction({
    action: 'admin.users.note.add',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  addUserInternalNote
)

/**
 * @route   POST /api/admin/users/:userId/suspend
 * @desc    Suspender utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/suspend',
  authenticate,
  auditAdminAction({
    action: 'admin.users.suspend',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  suspendUser
)

/**
 * @route   POST /api/admin/users/:userId/ban
 * @desc    Banir utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/ban',
  authenticate,
  auditAdminAction({
    action: 'admin.users.ban',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  banUser
)

/**
 * @route   POST /api/admin/users/:userId/unban
 * @desc    Reativar utilizador banido/suspenso
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/unban',
  authenticate,
  auditAdminAction({
    action: 'admin.users.unban',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  unbanUser
)

/**
 * @route   POST /api/admin/users/:userId/force-logout
 * @desc    Revogar todas as sessoes do utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/force-logout',
  authenticate,
  auditAdminAction({
    action: 'admin.users.force_logout',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  forceLogoutUser
)

export default router
