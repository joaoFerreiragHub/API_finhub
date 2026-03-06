import { NextFunction, Response } from 'express'
import { AdminScope } from '../admin/permissions'
import { adminAuditService } from '../services/adminAudit.service'
import { AuthRequest } from '../types/auth'
import { readAdminReasonForAudit } from '../utils/adminActionPayload'

interface AuditAdminActionOptions {
  action: string
  resourceType: string
  scope?: AdminScope
  getResourceId?: (req: AuthRequest) => string | undefined
  getMetadata?: (req: AuthRequest, res: Response) => Record<string, unknown> | undefined
}

const toOutcome = (statusCode: number): 'success' | 'forbidden' | 'error' => {
  if (statusCode >= 500) return 'error'
  if (statusCode >= 400) return 'forbidden'
  return 'success'
}

export const auditAdminAction = (options: AuditAdminActionOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user || user.role !== 'admin') {
      return next()
    }

    const startedAtMs = Date.now()

    res.on('finish', () => {
      const baseMetadata: Record<string, unknown> = {
        durationMs: Date.now() - startedAtMs,
        assistedSession: req.assistedSession
          ? {
              sessionId: req.assistedSession.sessionId,
              adminUserId: req.assistedSession.adminUserId,
              targetUserId: req.assistedSession.targetUserId,
              scope: req.assistedSession.scope,
            }
          : null,
      }
      const extraMetadata = options.getMetadata?.(req, res)
      const metadata =
        extraMetadata && typeof extraMetadata === 'object'
          ? { ...baseMetadata, ...extraMetadata }
          : baseMetadata

      void adminAuditService
        .record({
          actorId: String(user._id),
          actorRole: user.role,
          action: options.action,
          scope: options.scope,
          resourceType: options.resourceType,
          resourceId: options.getResourceId?.(req),
          reason: readAdminReasonForAudit(req),
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          outcome: toOutcome(res.statusCode),
          ip: req.ip,
          userAgent: req.get('user-agent'),
          metadata,
        })
        .catch((error) => {
          console.error('Admin audit logging error:', error)
        })
    })

    next()
  }
}
