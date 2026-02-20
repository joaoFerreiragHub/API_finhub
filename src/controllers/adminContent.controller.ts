import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  adminContentService,
  AdminContentServiceError,
  isValidContentTypeFilter,
  isValidModerationStatus,
  isValidPublishStatus,
} from '../services/adminContent.service'
import { ContentModerationAction } from '../models/ContentModerationEvent'
import { ContentModerationStatus, ContentType, PublishStatus } from '../models/BaseContent'

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

const handleAdminContentError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminContentServiceError) {
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
    contentType: contentType as ContentType,
    contentId: req.params.contentId,
    action,
    reason,
    note: extractNote(req),
  })

  return res.status(200).json({
    message: successMessage,
    changed: result.changed,
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
    content: result.content,
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

    const result = await adminContentService.listQueue(
      {
        contentType: contentTypeRaw as ContentType | undefined,
        moderationStatus: moderationStatusRaw as ContentModerationStatus | undefined,
        publishStatus: publishStatusRaw as PublishStatus | undefined,
        creatorId: typeof req.query.creatorId === 'string' ? req.query.creatorId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
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
        contentType: contentType as ContentType,
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
