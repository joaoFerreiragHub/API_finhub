import { Response } from 'express'
import {
  contentReportService,
  ContentReportServiceError,
  isValidContentReportReason,
  isValidReportedContentType,
} from '../services/contentReport.service'
import { adminAuditService } from '../services/adminAudit.service'
import { adminContentService } from '../services/adminContent.service'
import { moderationPolicyService } from '../services/moderationPolicy.service'
import { AuthRequest } from '../types/auth'

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> | undefined => {
  const body = req.body
  if (!body || typeof body !== 'object') return undefined
  return body as Record<string, unknown>
}

const handleContentReportError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof ContentReportServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  const details = error instanceof Error ? error.message : undefined
  return res.status(500).json({
    error: fallbackMessage,
    details,
  })
}

/**
 * POST /api/reports/content
 */
export const createContentReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const body = extractBodyRecord(req)
    const contentType = body?.contentType
    const contentId = body?.contentId
    const reason = body?.reason
    const note = typeof body?.note === 'string' ? body.note : undefined

    if (!isValidReportedContentType(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    if (typeof contentId !== 'string') {
      return res.status(400).json({
        error: 'Parametro contentId invalido.',
      })
    }

    if (!isValidContentReportReason(reason)) {
      return res.status(400).json({
        error: 'Parametro reason invalido.',
      })
    }

    const result = await contentReportService.createOrUpdateReport({
      reporterId: req.user.id,
      contentType,
      contentId,
      reason,
      note,
    })

    const policyBefore = await moderationPolicyService.evaluateTarget(contentType, contentId)
    const automationConfig = moderationPolicyService.getAutomationConfig()
    let automation: Record<string, unknown> = {
      attempted: false,
      executed: false,
      blockedReason: policyBefore.policySignals.automationBlockedReason,
    }

    if (
      policyBefore.policySignals.recommendedAction === 'hide' &&
      policyBefore.policySignals.automationEligible &&
      policyBefore.policySignals.automationEnabled &&
      automationConfig.autoHideActorId
    ) {
      automation = {
        attempted: true,
        executed: false,
        blockedReason: null,
      }

      try {
        const autoHideResult = await adminContentService.fastHideContent({
          actorId: automationConfig.autoHideActorId,
          contentType,
          contentId,
          reason: moderationPolicyService.buildAutoHideReason(policyBefore),
          note: 'Policy engine auto-hide preventivo acionado por reports.',
        })

        await adminAuditService.record({
          actorId: automationConfig.autoHideActorId,
          actorRole: 'admin',
          action: 'admin.content.policy_auto_hide',
          scope: 'admin.content.moderate',
          resourceType: 'content',
          resourceId: `${contentType}:${contentId}`,
          reason: moderationPolicyService.buildAutoHideReason(policyBefore),
          method: 'SYSTEM',
          path: 'policy://reports/content',
          statusCode: 200,
          outcome: 'success',
          metadata: {
            reportCreated: result.created,
            reportId: result.report.id,
            policySignals: policyBefore.policySignals,
          },
        })

        automation = {
          attempted: true,
          executed: true,
          blockedReason: null,
          action: 'hide',
          result: {
            changed: autoHideResult.changed,
            fromStatus: autoHideResult.fromStatus,
            toStatus: autoHideResult.toStatus,
          },
        }
      } catch (automationError: unknown) {
        const errorMessage =
          automationError instanceof Error ? automationError.message : 'Erro desconhecido na automacao.'

        await adminAuditService.record({
          actorId: automationConfig.autoHideActorId,
          actorRole: 'admin',
          action: 'admin.content.policy_auto_hide',
          scope: 'admin.content.moderate',
          resourceType: 'content',
          resourceId: `${contentType}:${contentId}`,
          reason: moderationPolicyService.buildAutoHideReason(policyBefore),
          method: 'SYSTEM',
          path: 'policy://reports/content',
          statusCode: 500,
          outcome: 'error',
          metadata: {
            reportCreated: result.created,
            reportId: result.report.id,
            policySignals: policyBefore.policySignals,
            error: errorMessage,
          },
        })

        automation = {
          attempted: true,
          executed: false,
          blockedReason: 'automation_error',
          error: errorMessage,
        }
      }
    }

    const policyAfter = await moderationPolicyService.evaluateTarget(contentType, contentId)

    return res.status(result.created ? 201 : 200).json({
      message: result.created ? 'Report criado com sucesso.' : 'Report atualizado com sucesso.',
      created: result.created,
      report: result.report,
      policy: {
        before: {
          reportSignals: policyBefore.reportSignals,
          policySignals: policyBefore.policySignals,
        },
        after: {
          reportSignals: policyAfter.reportSignals,
          policySignals: policyAfter.policySignals,
        },
      },
      automation,
    })
  } catch (error: unknown) {
    console.error('Create content report error:', error)
    return handleContentReportError(res, error, 'Erro ao criar report de conteudo.')
  }
}
