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

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const extractReason = (req: AuthRequest): string | undefined => {
  const body = req.body
  if (body && typeof body === 'object') {
    const reason = (body as Record<string, unknown>).reason
    if (typeof reason === 'string' && reason.trim().length > 0) {
      return reason.trim()
    }
  }

  const headerReason = req.headers['x-admin-reason']
  if (typeof headerReason === 'string' && headerReason.trim().length > 0) {
    return headerReason.trim()
  }

  return undefined
}

const extractNote = (req: AuthRequest): string | undefined => {
  const body = req.body
  if (body && typeof body === 'object') {
    const note = (body as Record<string, unknown>).note
    if (typeof note === 'string' && note.trim().length > 0) {
      return note.trim()
    }
  }

  return undefined
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

  const reason = extractReason(req)
  if (!reason) {
    return res.status(400).json({
      error: 'Motivo obrigatorio para esta acao.',
    })
  }

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
    note: extractNote(req),
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
      note: extractNote(req),
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
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List admin content queue error:', error)
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
    console.error('List content moderation history error:', error)
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
    console.error('Get content rollback review error:', error)
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
    console.error('List content reports error:', error)
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
    console.error('Hide content error:', error)
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

    const result = await adminContentService.fastHideContent({
      actorId: req.user.id,
      contentType: contentType as ModeratableContentType,
      contentId: req.params.contentId,
      reason: extractReason(req),
      note: extractNote(req),
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
    console.error('Hide fast content error:', error)
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
    console.error('Unhide content error:', error)
    return handleAdminContentError(res, error, 'Erro ao reativar conteudo.')
  }
}

/**
 * POST /api/admin/content/:contentType/:contentId/restrict
 */
export const restrictContent = async (req: AuthRequest, res: Response) => {
  try {
    return await applyContentAction(req, res, 'restrict', 'Conteudo restrito com sucesso.')
  } catch (error: unknown) {
    console.error('Restrict content error:', error)
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

    const reason = extractReason(req)
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para rollback.',
      })
    }

    const result = await adminContentService.rollbackContent({
      actorId: req.user.id,
      contentType: contentType as ModeratableContentType,
      contentId: req.params.contentId,
      eventId,
      reason,
      note: extractNote(req),
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
    console.error('Rollback content error:', error)
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

    const reason = extractReason(req)
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para rollback em lote.',
      })
    }

    const items = extractBulkRollbackItems(req)
    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'Lista items obrigatoria para rollback em lote.',
      })
    }

    const result = await adminContentService.bulkRollbackContent({
      actorId: req.user.id,
      reason,
      note: extractNote(req),
      confirm: extractConfirm(req),
      markFalsePositive: extractMarkFalsePositive(req),
      items,
    })

    return res.status(200).json({
      message: 'Rollback em lote concluido.',
      ...result,
    })
  } catch (error: unknown) {
    console.error('Bulk rollback content error:', error)
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

    const reason = extractReason(req)
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para criar job em lote.',
      })
    }

    const items = extractBulkItems(req)
    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'Lista items obrigatoria para criar job em lote.',
      })
    }

    const job = await adminContentJobService.queueBulkModerationJob({
      actorId: req.user.id,
      action,
      reason,
      note: extractNote(req),
      confirm: extractConfirm(req),
      items,
    })

    return res.status(202).json({
      message: 'Job de moderacao em lote criado.',
      job,
    })
  } catch (error: unknown) {
    console.error('Create bulk moderation job error:', error)
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

    const reason = extractReason(req)
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para criar job de rollback.',
      })
    }

    const items = extractBulkRollbackItems(req)
    if (!items || items.length === 0) {
      return res.status(400).json({
        error: 'Lista items obrigatoria para criar job de rollback.',
      })
    }

    const job = await adminContentJobService.queueBulkRollbackJob({
      actorId: req.user.id,
      reason,
      note: extractNote(req),
      confirm: extractConfirm(req),
      markFalsePositive: extractMarkFalsePositive(req),
      items,
    })

    return res.status(202).json({
      message: 'Job de rollback em lote criado.',
      job,
    })
  } catch (error: unknown) {
    console.error('Create bulk rollback job error:', error)
    return handleAdminContentError(res, error, 'Erro ao criar job de rollback em lote.')
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
    console.error('List admin content jobs error:', error)
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
    console.error('Get admin content job error:', error)
    return handleAdminContentError(res, error, 'Erro ao ler job de conteudo.')
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

    const reason = extractReason(req)
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para moderacao em lote.',
      })
    }

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
      note: extractNote(req),
      confirm: extractConfirm(req),
      items,
    })

    return res.status(200).json({
      message: 'Moderacao em lote concluida.',
      ...result,
    })
  } catch (error: unknown) {
    console.error('Bulk moderate content error:', error)
    return handleAdminContentError(res, error, 'Erro ao executar moderacao em lote.')
  }
}
