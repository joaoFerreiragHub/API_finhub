import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  adminContentJobService,
  isValidAdminContentJobStatus,
  isValidAdminContentJobType,
} from '../services/adminContentJob.service'
import {
  adminContentService,
  AdminContentServiceError,
  isValidContentTypeFilter,
  isValidModerationStatus,
  isValidPublishStatus,
} from '../services/adminContent.service'
import {
  contentReportService,
  ContentReportServiceError,
  isValidContentReportPriority,
  isValidContentReportStatus,
} from '../services/contentReport.service'
import { ContentModerationAction, ModeratableContentType } from '../models/ContentModerationEvent'
import { ContentModerationStatus, PublishStatus } from '../models/BaseContent'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_content_controller'

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const resolveReason = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminReason(req)
  if (parsed.error) {
    res.status(400).json({
      error: parsed.error,
    })
    return null
  }
  return parsed.value
}

const resolveNote = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminNote(req)
  if (parsed.error) {
    res.status(400).json({
      error: parsed.error,
    })
    return null
  }
  return parsed.value
}

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> | undefined => {
  const body = req.body
  if (!body || typeof body !== 'object') return undefined
  return body as Record<string, unknown>
}

const isValidModerationAction = (value: unknown): value is ContentModerationAction =>
  value === 'hide' || value === 'unhide' || value === 'restrict'

const extractBulkItems = (
  req: AuthRequest
): Array<{ contentType: ModeratableContentType; contentId: string }> | undefined => {
  const body = extractBodyRecord(req)
  if (!body) return undefined

  const rawItems = body.items
  if (!Array.isArray(rawItems)) return undefined

  return rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      contentType: item.contentType as ModeratableContentType,
      contentId: typeof item.contentId === 'string' ? item.contentId : '',
    }))
}

const extractConfirm = (req: AuthRequest): boolean | undefined => {
  const body = extractBodyRecord(req)
  if (!body) return undefined

  const confirm = body.confirm
  if (typeof confirm === 'boolean') return confirm
  return undefined
}

const extractMarkFalsePositive = (req: AuthRequest): boolean | undefined => {
  const body = extractBodyRecord(req)
  if (!body) return undefined

  const markFalsePositive = body.markFalsePositive
  if (typeof markFalsePositive === 'boolean') return markFalsePositive
  return undefined
}

const extractScheduledFor = (req: AuthRequest): string | undefined => {
  const body = extractBodyRecord(req)
  if (!body) return undefined

  if (typeof body.scheduledFor === 'string' && body.scheduledFor.trim().length > 0) {
    return body.scheduledFor.trim()
  }

  if (typeof body.scheduleAt === 'string' && body.scheduleAt.trim().length > 0) {
    return body.scheduleAt.trim()
  }

  return undefined
}

const extractEventId = (req: AuthRequest): string | undefined => {
  const body = extractBodyRecord(req)
  if (body && typeof body.eventId === 'string' && body.eventId.trim().length > 0) {
    return body.eventId.trim()
  }

  if (typeof req.query.eventId === 'string' && req.query.eventId.trim().length > 0) {
    return req.query.eventId.trim()
  }

  return undefined
}

const extractBulkRollbackItems = (
  req: AuthRequest
): Array<{ contentType: ModeratableContentType; contentId: string; eventId: string }> | undefined => {
  const body = extractBodyRecord(req)
  if (!body || !Array.isArray(body.items)) return undefined

  return body.items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      contentType: item.contentType as ModeratableContentType,
      contentId: typeof item.contentId === 'string' ? item.contentId : '',
      eventId: typeof item.eventId === 'string' ? item.eventId : '',
    }))
}

const extractReviewedSampleItems = (
  req: AuthRequest
): Array<{ contentType: ModeratableContentType; contentId: string; eventId: string }> | undefined => {
  const body = extractBodyRecord(req)
  if (!body || !Array.isArray(body.reviewedSampleItems)) return undefined

  return body.reviewedSampleItems
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      contentType: item.contentType as ModeratableContentType,
      contentId: typeof item.contentId === 'string' ? item.contentId : '',
      eventId: typeof item.eventId === 'string' ? item.eventId : '',
    }))
}

const extractFalsePositiveValidated = (req: AuthRequest): boolean | undefined => {
  const body = extractBodyRecord(req)
  if (!body) return undefined

  const falsePositiveValidated = body.falsePositiveValidated
  if (typeof falsePositiveValidated === 'boolean') return falsePositiveValidated
  return undefined
}

const handleAdminContentError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminContentServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

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

const applyContentAction = async (
  req: AuthRequest,
  res: Response,
  action: ContentModerationAction,
  successMessage: string
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autenticacao necessaria.',
    })
  }

  const reason = resolveReason(req, res)
  if (reason === null) return
  if (!reason) {
    return res.status(400).json({
      error: 'Motivo obrigatorio para esta acao.',
    })
  }

  const note = resolveNote(req, res)
  if (note === null) return

  const contentType = req.params.contentType
  if (!isValidContentTypeFilter(contentType)) {
    return res.status(400).json({
      error: 'Parametro contentType invalido.',
    })
  }

  const result = await adminContentService.moderateContent({
    actorId: req.user.id,
    contentType: contentType as ModeratableContentType,
    contentId: req.params.contentId,
    action,
    reason,
    note,
  })

  let falsePositiveRecorded = false
  if (action === 'unhide' && extractMarkFalsePositive(req) === true) {
    await adminContentService.recordFalsePositiveFeedback({
      actorId: req.user.id,
      contentType: contentType as ModeratableContentType,
      contentId: req.params.contentId,
      creatorId: result.content?.creator?.id ?? result.content?.creator?._id ?? null,
      source: 'manual_unhide',
      reason,
      note,
      categories: [
        ...(result.content?.reportSignals?.openReports > 0 ? ['reports' as const] : []),
        ...(result.content?.automatedSignals?.active ? ['automated_detection' as const] : []),
      ],
      metadata: {
        action: 'unhide',
      },
    })
    falsePositiveRecorded = true
  }

  return res.status(200).json({
    message: successMessage,
    changed: result.changed,
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
    content: result.content,
    falsePositiveRecorded,
  })
}

/**
 * GET /api/admin/content/queue
 */
export const listAdminContentQueue = async (req: AuthRequest, res: Response) => {
  try {
    const contentTypeRaw = typeof req.query.contentType === 'string' ? req.query.contentType : undefined
    if (contentTypeRaw && !isValidContentTypeFilter(contentTypeRaw)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    const moderationStatusRaw =
      typeof req.query.moderationStatus === 'string' ? req.query.moderationStatus : undefined
    if (moderationStatusRaw && !isValidModerationStatus(moderationStatusRaw)) {
      return res.status(400).json({
        error: 'Parametro moderationStatus invalido.',
      })
    }

    const publishStatusRaw =
      typeof req.query.publishStatus === 'string' ? req.query.publishStatus : undefined
    if (publishStatusRaw && !isValidPublishStatus(publishStatusRaw)) {
      return res.status(400).json({
        error: 'Parametro publishStatus invalido.',
      })
    }

    const flaggedOnlyRaw = typeof req.query.flaggedOnly === 'string' ? req.query.flaggedOnly : undefined
    const flaggedOnly =
      flaggedOnlyRaw === 'true' || flaggedOnlyRaw === '1'
        ? true
        : flaggedOnlyRaw === 'false' || flaggedOnlyRaw === '0'
          ? false
          : undefined

    if (flaggedOnlyRaw && flaggedOnly === undefined) {
      return res.status(400).json({
        error: 'Parametro flaggedOnly invalido.',
      })
    }

    const minReportPriorityRaw =
      typeof req.query.minReportPriority === 'string' ? req.query.minReportPriority : undefined
    if (minReportPriorityRaw && !isValidContentReportPriority(minReportPriorityRaw)) {
      return res.status(400).json({
        error: 'Parametro minReportPriority invalido.',
      })
    }

    const result = await adminContentService.listQueue(
      {
        contentType: contentTypeRaw as ModeratableContentType | undefined,
        moderationStatus: moderationStatusRaw as ContentModerationStatus | undefined,
        publishStatus: publishStatusRaw as PublishStatus | undefined,
        creatorId: typeof req.query.creatorId === 'string' ? req.query.creatorId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        flaggedOnly,
        minReportPriority: minReportPriorityRaw as
          | import('../services/contentReport.service').ContentReportPriority
          | undefined,
      },
      {
        cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_queue', error, req)
    return handleAdminContentError(res, error, 'Erro ao listar fila de moderacao de conteudo.')
  }
}

/**
 * GET /api/admin/content/:contentType/:contentId/history
 */
export const listContentModerationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const contentType = req.params.contentType
    if (!isValidContentTypeFilter(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    const result = await adminContentService.listHistory(
      {
        contentType: contentType as ModeratableContentType,
        contentId: req.params.contentId,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_moderation_history', error, req)
    return handleAdminContentError(res, error, 'Erro ao listar historico de moderacao de conteudo.')
  }
}

/**
 * GET /api/admin/content/:contentType/:contentId/rollback-review
 */
export const getContentRollbackReview = async (req: AuthRequest, res: Response) => {
  try {
    const contentType = req.params.contentType
    if (!isValidContentTypeFilter(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    const eventId = extractEventId(req)
    if (!eventId) {
      return res.status(400).json({
        error: 'Parametro eventId obrigatorio.',
      })
    }

    const result = await adminContentService.getRollbackReview({
      contentType: contentType as ModeratableContentType,
      contentId: req.params.contentId,
      eventId,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_rollback_review', error, req)
    return handleAdminContentError(res, error, 'Erro ao preparar revisao de rollback.')
  }
}

/**
 * GET /api/admin/content/:contentType/:contentId/reports
 */
export const listContentReports = async (req: AuthRequest, res: Response) => {
  try {
    const contentType = req.params.contentType
    if (!isValidContentTypeFilter(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined
    if (statusRaw && !isValidContentReportStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }

    const result = await contentReportService.listReportsForContent(
      {
        contentType: contentType as ModeratableContentType,
        contentId: req.params.contentId,
        status: statusRaw as import('../models/ContentReport').ContentReportStatus | undefined,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_reports', error, req)
    return handleAdminContentError(res, error, 'Erro ao listar reports de conteudo.')
  }
}

/**
 * POST /api/admin/content/:contentType/:contentId/hide
 */
export const hideContent = async (req: AuthRequest, res: Response) => {
  try {
    return await applyContentAction(req, res, 'hide', 'Conteudo ocultado com sucesso.')
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'hide_content', error, req)
    return handleAdminContentError(res, error, 'Erro ao ocultar conteudo.')
  }
}

/**
 * POST /api/admin/content/:contentType/:contentId/hide-fast
 */
export const hideContentFast = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const contentType = req.params.contentType
    if (!isValidContentTypeFilter(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminContentService.fastHideContent({
      actorId: req.user.id,
      contentType: contentType as ModeratableContentType,
      contentId: req.params.contentId,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Conteudo ocultado em modo rapido com sucesso.',
      fastTrack: true,
      changed: result.changed,
      fromStatus: result.fromStatus,
      toStatus: result.toStatus,
      content: result.content,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'hide_content_fast', error, req)
    return handleAdminContentError(res, error, 'Erro ao ocultar conteudo em modo rapido.')
  }
}

/**
 * POST /api/admin/content/:contentType/:contentId/unhide
 */
export const unhideContent = async (req: AuthRequest, res: Response) => {
  try {
    return await applyContentAction(req, res, 'unhide', 'Conteudo reativado com sucesso.')
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'unhide_content', error, req)
    return handleAdminContentError(res, error, 'Erro ao reativar conteudo.')
  }
}

/**
 * POST /api/admin/content/:contentType/:contentId/unhide/schedule
 */
export const scheduleContentUnhide = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const contentType = req.params.contentType
    if (!isValidContentTypeFilter(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para agendar unhide.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const scheduledFor = extractScheduledFor(req)
    if (!scheduledFor) {
      return res.status(400).json({
        error: 'Parametro scheduledFor obrigatorio para agendar unhide.',
      })
    }

    const job = await adminContentJobService.queueScheduledUnhideJob({
      actorId: req.user.id,
      reason,
      note,
      contentType: contentType as ModeratableContentType,
      contentId: req.params.contentId,
      scheduledFor,
    })

    return res.status(202).json({
      message: 'Job de unhide agendado com sucesso.',
      job,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'schedule_content_unhide', error, req)
    return handleAdminContentError(res, error, 'Erro ao agendar unhide de conteudo.')
  }
}

/**
 * POST /api/admin/content/:contentType/:contentId/restrict
 */
export const restrictContent = async (req: AuthRequest, res: Response) => {
  try {
    return await applyContentAction(req, res, 'restrict', 'Conteudo restrito com sucesso.')
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'restrict_content', error, req)
    return handleAdminContentError(res, error, 'Erro ao restringir conteudo.')
  }
}

/**
 * POST /api/admin/content/:contentType/:contentId/rollback
 */
export const rollbackContent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const contentType = req.params.contentType
    if (!isValidContentTypeFilter(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    const eventId = extractEventId(req)
    if (!eventId) {
      return res.status(400).json({
        error: 'Parametro eventId obrigatorio para rollback.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para rollback.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminContentService.rollbackContent({
      actorId: req.user.id,
      contentType: contentType as ModeratableContentType,
      contentId: req.params.contentId,
      eventId,
      reason,
      note,
      confirm: extractConfirm(req),
      markFalsePositive: extractMarkFalsePositive(req),
    })

    return res.status(200).json({
      message: 'Rollback assistido concluido com sucesso.',
      changed: result.changed,
      fromStatus: result.fromStatus,
      toStatus: result.toStatus,
      content: result.content,
      rollback: result.rollback,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'rollback_content', error, req)
    return handleAdminContentError(res, error, 'Erro ao executar rollback assistido.')
  }
}

/**
 * POST /api/admin/content/bulk-rollback
 */
export const bulkRollbackContent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para rollback em lote.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const items = extractBulkRollbackItems(req)
    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'Lista items obrigatoria para rollback em lote.',
      })
    }

    const result = await adminContentService.bulkRollbackContent({
      actorId: req.user.id,
      reason,
      note,
      confirm: extractConfirm(req),
      markFalsePositive: extractMarkFalsePositive(req),
      items,
    })

    return res.status(200).json({
      message: 'Rollback em lote concluido.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'bulk_rollback_content', error, req)
    return handleAdminContentError(res, error, 'Erro ao executar rollback em lote.')
  }
}

/**
 * POST /api/admin/content/bulk-moderate/jobs
 */
export const createBulkModerationJob = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const body = extractBodyRecord(req)
    const action = body?.action
    if (!isValidModerationAction(action)) {
      return res.status(400).json({
        error: 'Parametro action invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para criar job em lote.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const items = extractBulkItems(req)
    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'Lista items obrigatoria para criar job em lote.',
      })
    }

    const scheduledFor = extractScheduledFor(req)
    const job = await adminContentJobService.queueBulkModerationJob({
      actorId: req.user.id,
      action,
      reason,
      note,
      confirm: extractConfirm(req),
      scheduledFor,
      items,
    })

    return res.status(202).json({
      message: scheduledFor ? 'Job de moderacao em lote agendado.' : 'Job de moderacao em lote criado.',
      job,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_bulk_moderation_job', error, req)
    return handleAdminContentError(res, error, 'Erro ao criar job de moderacao em lote.')
  }
}

/**
 * POST /api/admin/content/bulk-rollback/jobs
 */
export const createBulkRollbackJob = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para criar job de rollback.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const items = extractBulkRollbackItems(req)
    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'Lista items obrigatoria para criar job de rollback.',
      })
    }

    const job = await adminContentJobService.queueBulkRollbackJob({
      actorId: req.user.id,
      reason,
      note,
      confirm: extractConfirm(req),
      markFalsePositive: extractMarkFalsePositive(req),
      items,
    })

    return res.status(202).json({
      message: 'Job de rollback em lote criado.',
      job,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_bulk_rollback_job', error, req)
    return handleAdminContentError(res, error, 'Erro ao criar job de rollback em lote.')
  }
}

/**
 * POST /api/admin/content/jobs/:jobId/request-review
 */
export const requestBulkRollbackJobReview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const job = await adminContentJobService.requestBulkRollbackJobReview({
      actorId: req.user.id,
      jobId: req.params.jobId,
      note,
    })

    return res.status(202).json({
      message: 'Job de rollback em lote submetido para revisao.',
      job,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'request_bulk_rollback_job_review', error, req)
    return handleAdminContentError(
      res,
      error,
      'Erro ao submeter job de rollback em lote para revisao.'
    )
  }
}

/**
 * POST /api/admin/content/jobs/:jobId/approve
 */
export const approveBulkRollbackJob = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const job = await adminContentJobService.approveBulkRollbackJob({
      actorId: req.user.id,
      jobId: req.params.jobId,
      note,
      confirm: extractConfirm(req),
      falsePositiveValidated: extractFalsePositiveValidated(req),
      reviewedSampleItems: extractReviewedSampleItems(req),
    })

    return res.status(202).json({
      message: 'Job de rollback em lote aprovado.',
      job,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'approve_bulk_rollback_job', error, req)
    return handleAdminContentError(res, error, 'Erro ao aprovar job de rollback em lote.')
  }
}

/**
 * GET /api/admin/content/jobs
 */
export const listAdminContentJobs = async (req: AuthRequest, res: Response) => {
  try {
    const typeRaw = typeof req.query.type === 'string' ? req.query.type : undefined
    if (typeRaw && !isValidAdminContentJobType(typeRaw)) {
      return res.status(400).json({
        error: 'Parametro type invalido.',
      })
    }

    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined
    if (statusRaw && !isValidAdminContentJobStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }

    const result = await adminContentJobService.listJobs(
      {
        type: typeRaw as import('../models/AdminContentJob').AdminContentJobType | undefined,
        status: statusRaw as import('../models/AdminContentJob').AdminContentJobStatus | undefined,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_jobs', error, req)
    return handleAdminContentError(res, error, 'Erro ao listar jobs de conteudo.')
  }
}

/**
 * GET /api/admin/content/jobs/:jobId
 */
export const getAdminContentJob = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminContentJobService.getJob(req.params.jobId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_job', error, req)
    return handleAdminContentError(res, error, 'Erro ao ler job de conteudo.')
  }
}

/**
 * GET /api/admin/content/jobs/worker-status
 */
export const getAdminContentJobWorkerStatus = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminContentJobService.getWorkerStatus()
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_job_worker_status', error, req)
    return handleAdminContentError(res, error, 'Erro ao ler estado do worker de jobs.')
  }
}

/**
 * POST /api/admin/content/bulk-moderate
 */
export const bulkModerateContent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const body = extractBodyRecord(req)
    const action = body?.action
    if (!isValidModerationAction(action)) {
      return res.status(400).json({
        error: 'Parametro action invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para moderacao em lote.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const items = extractBulkItems(req)
    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'Lista items obrigatoria para moderacao em lote.',
      })
    }

    const result = await adminContentService.bulkModerateContent({
      actorId: req.user.id,
      action,
      reason,
      note,
      confirm: extractConfirm(req),
      items,
    })

    return res.status(200).json({
      message: 'Moderacao em lote concluida.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'bulk_moderate_content', error, req)
    return handleAdminContentError(res, error, 'Erro ao executar moderacao em lote.')
  }
}
