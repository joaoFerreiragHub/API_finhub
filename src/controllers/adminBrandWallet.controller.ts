import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { BrandWalletServiceError, brandWalletService } from '../services/brandWallet.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_brand_wallet_controller'

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return undefined
}

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof BrandWalletServiceError) {
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
 * GET /api/admin/monetization/brand-wallets/top-up-requests
 */
export const listAdminBrandWalletTopUpRequests = async (req: AuthRequest, res: Response) => {
  try {
    const result = await brandWalletService.listAdminTopUpRequests(
      {
        status: toOptionalString(req.query.status) as
          | 'pending'
          | 'completed'
          | 'failed'
          | 'cancelled'
          | undefined,
        ownerUserId: toOptionalString(req.query.ownerUserId),
        directoryEntryId: toOptionalString(req.query.directoryEntryId),
        search: toOptionalString(req.query.search),
      },
      {
        page: parseOptionalPositiveInt(req.query.page),
        limit: parseOptionalPositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_brand_wallet_top_up_requests', error, req)
    return handleError(res, error, 'Erro ao listar pedidos de top-up de wallets.')
  }
}

/**
 * POST /api/admin/monetization/brand-wallets/top-up-requests/:transactionId/approve
 */
export const approveAdminBrandWalletTopUpRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    const result = await brandWalletService.approveTopUpRequest(req.user.id, req.params.transactionId, {
      reason: body.reason,
      note: body.note,
      reference: body.reference,
      metadata: body.metadata,
      force: body.force,
    })

    return res.status(200).json({
      message: 'Pedido de top-up aprovado com sucesso.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'approve_admin_brand_wallet_top_up_request', error, req)
    return handleError(res, error, 'Erro ao aprovar pedido de top-up.')
  }
}

/**
 * POST /api/admin/monetization/brand-wallets/top-up-requests/:transactionId/reject
 */
export const rejectAdminBrandWalletTopUpRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    const result = await brandWalletService.rejectTopUpRequest(req.user.id, req.params.transactionId, {
      reason: body.reason,
      note: body.note,
      status: body.status,
      reference: body.reference,
      metadata: body.metadata,
      force: body.force,
    })

    return res.status(200).json({
      message: 'Pedido de top-up rejeitado/cancelado com sucesso.',
      ...result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'reject_admin_brand_wallet_top_up_request', error, req)
    return handleError(res, error, 'Erro ao rejeitar/cancelar pedido de top-up.')
  }
}

