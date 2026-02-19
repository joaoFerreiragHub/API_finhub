import { Router } from 'express'
import { listAdminAuditLogs } from '../controllers/adminAudit.controller'
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
