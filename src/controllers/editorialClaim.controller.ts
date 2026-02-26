import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  adminEditorialCmsService,
  AdminEditorialCmsServiceError,
  isValidClaimStatus,
  isValidClaimTargetType,
} from '../services/adminEditorialCms.service'

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const handleEditorialClaimError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminEditorialCmsServiceError) {
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

const getActorId = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({
      error: 'Autenticacao necessaria.',
    })
    return null
  }

  return req.user.id
}

/**
 * POST /api/editorial/claims
 */
export const createMyEditorialClaim = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const targetType = typeof req.body?.targetType === 'string' ? req.body.targetType : undefined
    const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId : undefined
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined
    const note = typeof req.body?.note === 'string' ? req.body.note : undefined
    const evidenceLinks = Array.isArray(req.body?.evidenceLinks)
      ? req.body.evidenceLinks.filter((value: unknown): value is string => typeof value === 'string')
      : undefined

    if (!targetType || !isValidClaimTargetType(targetType)) {
      return res.status(400).json({
        error: 'Parametro targetType invalido.',
      })
    }
    if (!targetId || targetId.trim().length === 0) {
      return res.status(400).json({
        error: 'Parametro targetId obrigatorio.',
      })
    }

    const claim = await adminEditorialCmsService.createClaimRequest({
      requestedById: actorId,
      creatorId: actorId,
      targetType,
      targetId,
      reason: reason ?? '',
      note,
      evidenceLinks,
    })

    return res.status(201).json(claim)
  } catch (error: unknown) {
    console.error('Create my editorial claim error:', error)
    return handleEditorialClaimError(res, error, 'Erro ao criar claim.')
  }
}

/**
 * GET /api/editorial/claims/my
 */
export const listMyEditorialClaims = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined
    if (statusRaw && !isValidClaimStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }
    const status = statusRaw && isValidClaimStatus(statusRaw) ? statusRaw : undefined

    const targetTypeRaw = typeof req.query.targetType === 'string' ? req.query.targetType : undefined
    if (targetTypeRaw && !isValidClaimTargetType(targetTypeRaw)) {
      return res.status(400).json({
        error: 'Parametro targetType invalido.',
      })
    }
    const targetType =
      targetTypeRaw && isValidClaimTargetType(targetTypeRaw) ? targetTypeRaw : undefined

    const result = await adminEditorialCmsService.listMyClaims(
      actorId,
      {
        status,
        targetType,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List my editorial claims error:', error)
    return handleEditorialClaimError(res, error, 'Erro ao listar claims.')
  }
}

/**
 * POST /api/editorial/claims/:claimId/cancel
 */
export const cancelMyEditorialClaim = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const result = await adminEditorialCmsService.cancelClaimRequest(req.params.claimId, {
      actorId,
      note: typeof req.body?.note === 'string' ? req.body.note : undefined,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Cancel my editorial claim error:', error)
    return handleEditorialClaimError(res, error, 'Erro ao cancelar claim.')
  }
}
