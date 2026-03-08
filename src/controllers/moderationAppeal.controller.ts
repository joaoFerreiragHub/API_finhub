import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  isValidModerationAppealStatus,
  moderationAppealService,
  ModerationAppealServiceError,
} from '../services/moderationAppeal.service'
import { readAdminNote } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'moderation_appeal_controller'

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

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const resolveOptionalNote = (req: AuthRequest, res: Response): string | undefined | null => {
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
 * POST /api/appeals/content
 */
export const createModerationAppeal = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const body = extractBodyRecord(req)
    const moderationEventId = toOptionalString(body.moderationEventId)
    const reason = toOptionalString(body.reason)
    const note = resolveOptionalNote(req, res)
    if (note === null) return

    if (!moderationEventId) {
      return res.status(400).json({
        error: 'Campo moderationEventId obrigatorio.',
      })
    }

    if (!reason) {
      return res.status(400).json({
        error: 'Campo reason obrigatorio.',
      })
    }

    const result = await moderationAppealService.createAppeal({
      appellantId: req.user.id,
      moderationEventId,
      reason,
      note,
      reasonCategory: toOptionalString(body.reasonCategory) as
        | import('../models/ModerationAppeal').ModerationAppealReasonCategory
        | undefined,
      slaHours: toOptionalNumber(body.slaHours),
    })

    return res.status(201).json({
      message: 'Apelacao criada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_moderation_appeal', error, req)
    return handleError(res, error, 'Erro ao criar apelacao de moderacao.')
  }
}

/**
 * GET /api/appeals/me
 */
export const listMyModerationAppeals = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const statusRaw = toOptionalString(req.query.status)
    if (statusRaw && !isValidModerationAppealStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }
    const status = statusRaw && isValidModerationAppealStatus(statusRaw) ? statusRaw : undefined

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

    const result = await moderationAppealService.listMyAppeals(
      req.user.id,
      {
        status,
        contentType: toOptionalString(req.query.contentType) as
          | import('../models/ContentModerationEvent').ModeratableContentType
          | undefined,
        breachedSla,
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_my_moderation_appeals', error, req)
    return handleError(res, error, 'Erro ao listar as tuas apelacoes de moderacao.')
  }
}

/**
 * GET /api/appeals/:appealId
 */
export const getMyModerationAppeal = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const result = await moderationAppealService.getMyAppeal(req.user.id, req.params.appealId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_my_moderation_appeal', error, req)
    return handleError(res, error, 'Erro ao obter apelacao de moderacao.')
  }
}
