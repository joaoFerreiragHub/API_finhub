import { Router } from 'express'
import { listAdminAuditLogs } from '../controllers/adminAudit.controller'
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

export default router
