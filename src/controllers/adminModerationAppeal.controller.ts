import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  isValidModerationAppealSeverity,
  isValidModerationAppealStatus,
  moderationAppealService,
  ModerationAppealServiceError,
} from '../services/moderationAppeal.service'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_moderation_appeal_controller'

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
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

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof ModerationAppealServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/admin/content/appeals
 */
export const listAdminModerationAppeals = async (req: AuthRequest, res: Response) => {
  try {
    const statusRaw = toOptionalString(req.query.status)
    if (statusRaw && !isValidModerationAppealStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }
    const status = statusRaw && isValidModerationAppealStatus(statusRaw) ? statusRaw : undefined

    const severityRaw = toOptionalString(req.query.severity)
    if (severityRaw && !isValidModerationAppealSeverity(severityRaw)) {
      return res.status(400).json({
        error: 'Parametro severity invalido.',
      })
    }
    const severity =
      severityRaw && isValidModerationAppealSeverity(severityRaw) ? severityRaw : undefined

    const breachedRaw = toOptionalString(req.query.breachedSla)
    const breachedSla =
      breachedRaw === 'true' || breachedRaw === '1'
        ? true
        : breachedRaw === 'false' || breachedRaw === '0'
          ? false
          : undefined
    if (breachedRaw && breachedSla === undefined) {
      return res.status(400).json({
        error: 'Parametro breachedSla invalido.',
      })
    }

    const result = await moderationAppealService.listAdminAppeals(
      {
        status,
        severity,
        contentType: toOptionalString(req.query.contentType) as
          | import('../models/ContentModerationEvent').ModeratableContentType
          | undefined,
        breachedSla,
        search: toOptionalString(req.query.search),
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_moderation_appeals', error, req)
    return handleError(res, error, 'Erro ao listar apelacoes de moderacao.')
  }
}

/**
 * GET /api/admin/content/appeals/:appealId
 */
export const getAdminModerationAppeal = async (req: AuthRequest, res: Response) => {
  try {
    const result = await moderationAppealService.getAdminAppeal(req.params.appealId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_moderation_appeal', error, req)
    return handleError(res, error, 'Erro ao obter apelacao de moderacao.')
  }
}

/**
 * PATCH /api/admin/content/appeals/:appealId/status
 */
export const updateAdminModerationAppealStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const nextStatus = toOptionalString(req.body?.status)
    if (!nextStatus || !isValidModerationAppealStatus(nextStatus)) {
      return res.status(400).json({
        error: 'Campo status invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para atualizar estado da apelacao.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await moderationAppealService.updateAppealStatus({
      actorId: req.user.id,
      appealId: req.params.appealId,
      status: nextStatus,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Estado da apelacao atualizado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_moderation_appeal_status', error, req)
    return handleError(res, error, 'Erro ao atualizar estado da apelacao de moderacao.')
  }
}
