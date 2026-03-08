import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  adminBroadcastService,
  AdminBroadcastServiceError,
  isValidAdminBroadcastChannel,
  isValidAdminBroadcastStatus,
} from '../services/adminBroadcast.service'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_broadcast_controller'

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
  if (error instanceof AdminBroadcastServiceError) {
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
 * GET /api/admin/communications/broadcasts
 */
export const listAdminBroadcasts = async (req: AuthRequest, res: Response) => {
  try {
    const statusRaw = toOptionalString(req.query.status)
    if (statusRaw && !isValidAdminBroadcastStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }
    const status =
      statusRaw && isValidAdminBroadcastStatus(statusRaw) ? statusRaw : undefined

    const channelRaw = toOptionalString(req.query.channel)
    if (channelRaw && !isValidAdminBroadcastChannel(channelRaw)) {
      return res.status(400).json({
        error: 'Parametro channel invalido.',
      })
    }
    const channel =
      channelRaw && isValidAdminBroadcastChannel(channelRaw) ? channelRaw : undefined

    const result = await adminBroadcastService.listBroadcasts(
      {
        status,
        channel,
        search: toOptionalString(req.query.search),
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_broadcasts', error, req)
    return handleError(res, error, 'Erro ao listar broadcasts administrativos.')
  }
}

/**
 * GET /api/admin/communications/broadcasts/:broadcastId
 */
export const getAdminBroadcast = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminBroadcastService.getBroadcast(req.params.broadcastId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_broadcast', error, req)
    return handleError(res, error, 'Erro ao obter broadcast administrativo.')
  }
}

/**
 * POST /api/admin/communications/broadcasts/preview
 */
export const previewAdminBroadcastAudience = async (req: AuthRequest, res: Response) => {
  try {
    const body = extractBodyRecord(req)
    const segment =
      body.segment && typeof body.segment === 'object' && !Array.isArray(body.segment)
        ? (body.segment as Record<string, unknown>)
        : undefined
    const result = await adminBroadcastService.previewAudience({
      segment: segment as
        | import('../services/adminBroadcast.service').AdminBroadcastSegmentInput
        | undefined,
      sampleLimit: toOptionalNumber(body.sampleLimit),
    })
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'preview_admin_broadcast_audience', error, req)
    return handleError(res, error, 'Erro ao executar preview de audiencia.')
  }
}

/**
 * POST /api/admin/communications/broadcasts
 */
export const createAdminBroadcast = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const body = extractBodyRecord(req)
    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminBroadcastService.createBroadcast({
      actorId: req.user.id,
      title: toOptionalString(body.title) ?? '',
      message: toOptionalString(body.message) ?? '',
      channel: toOptionalString(body.channel) as
        | import('../models/AdminBroadcast').AdminBroadcastChannel
        | undefined,
      segment:
        body.segment && typeof body.segment === 'object' && !Array.isArray(body.segment)
          ? (body.segment as import('../services/adminBroadcast.service').AdminBroadcastSegmentInput)
          : undefined,
      note,
    })

    return res.status(201).json({
      message: 'Broadcast criado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_broadcast', error, req)
    return handleError(res, error, 'Erro ao criar broadcast administrativo.')
  }
}

/**
 * POST /api/admin/communications/broadcasts/:broadcastId/approve
 */
export const approveAdminBroadcast = async (req: AuthRequest, res: Response) => {
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
        error: 'Motivo obrigatorio para aprovar broadcast.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminBroadcastService.approveBroadcast({
      actorId: req.user.id,
      broadcastId: req.params.broadcastId,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Broadcast aprovado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'approve_admin_broadcast', error, req)
    return handleError(res, error, 'Erro ao aprovar broadcast administrativo.')
  }
}

/**
 * POST /api/admin/communications/broadcasts/:broadcastId/send
 */
export const sendAdminBroadcast = async (req: AuthRequest, res: Response) => {
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
        error: 'Motivo obrigatorio para enviar broadcast.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminBroadcastService.sendBroadcast({
      actorId: req.user.id,
      broadcastId: req.params.broadcastId,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Envio de broadcast executado.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'send_admin_broadcast', error, req)
    return handleError(res, error, 'Erro ao enviar broadcast administrativo.')
  }
}
