import { NextFunction, Response } from 'express'
import { AdminScope } from '../admin/permissions'
import { adminAuditService } from '../services/adminAudit.service'
import { AuthRequest } from '../types/auth'

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

const extractReason = (req: AuthRequest): string | undefined => {
  const reasonHeader = req.headers['x-admin-reason']
  const reasonFromHeader =
    typeof reasonHeader === 'string' && reasonHeader.trim().length > 0
      ? reasonHeader.trim()
      : undefined

  const bodyValue = req.body
  if (bodyValue && typeof bodyValue === 'object') {
    const bodyRecord = bodyValue as Record<string, unknown>
    const bodyReason = bodyRecord.reason
    if (typeof bodyReason === 'string' && bodyReason.trim().length > 0) {
      return bodyReason.trim()
    }
  }

  return reasonFromHeader
}

export const auditAdminAction = (options: AuditAdminActionOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user || user.role !== 'admin') {
      return next()
    }

    const startedAtMs = Date.now()

    res.on('finish', () => {
      const metadata =
        options.getMetadata?.(req, res) ??
        ({
          durationMs: Date.now() - startedAtMs,
          assistedSession: req.assistedSession
            ? {
                sessionId: req.assistedSession.sessionId,
                adminUserId: req.assistedSession.adminUserId,
                targetUserId: req.assistedSession.targetUserId,
                scope: req.assistedSession.scope,
              }
            : null,
        } as Record<string, unknown>)

      void adminAuditService
        .record({
          actorId: String(user._id),
          actorRole: user.role,
          action: options.action,
          scope: options.scope,
          resourceType: options.resourceType,
          resourceId: options.getResourceId?.(req),
          reason: extractReason(req),
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
