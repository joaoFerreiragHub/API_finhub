import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AdPartnershipCampaignStatus,
  AdPartnershipType,
  isValidAdPartnershipCampaignStatus,
  isValidAdPartnershipType,
  isValidAdPartnershipSurface,
} from '../services/adminAdPartnership.service'
import { BrandPortalServiceError, brandPortalService } from '../services/brandPortal.service'
import {
  BrandWalletServiceError,
  brandWalletService,
  isValidBrandWalletTransactionStatus,
  isValidBrandWalletTransactionType,
} from '../services/brandWallet.service'
import {
  BrandWalletTransactionStatus,
  BrandWalletTransactionType,
} from '../models/BrandWalletTransaction'

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof BrandPortalServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }
  if (error instanceof BrandWalletServiceError) {
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
 * GET /api/brand-portal/overview
 */
export const getBrandPortalOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const daysRaw = req.query.days
    if (typeof daysRaw === 'string' && parseOptionalPositiveInt(daysRaw) === undefined) {
      return res.status(400).json({
        error: 'Parametro days invalido.',
      })
    }

    const result = await brandPortalService.getOverview(req.user.id, parseOptionalPositiveInt(daysRaw))
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get brand portal overview error:', error)
    return handleError(res, error, 'Erro ao carregar overview do portal de marca.')
  }
}

/**
 * GET /api/brand-portal/directories
 */
export const listBrandPortalDirectories = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await brandPortalService.listOwnedDirectories(req.user.id)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal directories error:', error)
    return handleError(res, error, 'Erro ao listar diretorios da marca.')
  }
}

/**
 * GET /api/brand-portal/campaigns
 */
export const listBrandPortalCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const statusRaw = toOptionalString(req.query.status)
    if (statusRaw && !isValidAdPartnershipCampaignStatus(statusRaw)) {
      return res.status(400).json({ error: 'Parametro status invalido.' })
    }

    const adTypeRaw = toOptionalString(req.query.adType)
    if (adTypeRaw && !isValidAdPartnershipType(adTypeRaw)) {
      return res.status(400).json({ error: 'Parametro adType invalido.' })
    }

    const surfaceRaw = toOptionalString(req.query.surface)
    if (surfaceRaw && !isValidAdPartnershipSurface(surfaceRaw)) {
      return res.status(400).json({ error: 'Parametro surface invalido.' })
    }

    const result = await brandPortalService.listOwnedCampaigns(
      req.user.id,
      {
        status: statusRaw as AdPartnershipCampaignStatus | undefined,
        adType: adTypeRaw as AdPartnershipType | undefined,
        surface: surfaceRaw,
        search: toOptionalString(req.query.search),
      },
      {
        page: parseOptionalPositiveInt(toOptionalString(req.query.page)),
        limit: parseOptionalPositiveInt(toOptionalString(req.query.limit)),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal campaigns error:', error)
    return handleError(res, error, 'Erro ao listar campanhas da marca.')
  }
}

/**
 * GET /api/brand-portal/campaigns/:campaignId
 */
export const getBrandPortalCampaign = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await brandPortalService.getOwnedCampaign(req.user.id, req.params.campaignId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get brand portal campaign error:', error)
    return handleError(res, error, 'Erro ao obter campanha da marca.')
  }
}

/**
 * POST /api/brand-portal/campaigns
 */
export const createBrandPortalCampaign = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    const result = await brandPortalService.createOwnedCampaign(req.user.id, body)

    return res.status(201).json({
      message: 'Campanha criada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    console.error('Create brand portal campaign error:', error)
    return handleError(res, error, 'Erro ao criar campanha da marca.')
  }
}

/**
 * PATCH /api/brand-portal/campaigns/:campaignId
 */
export const updateBrandPortalCampaign = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    if (!body.patch || typeof body.patch !== 'object' || Array.isArray(body.patch)) {
      return res.status(400).json({ error: 'Campo patch obrigatorio.' })
    }

    const result = await brandPortalService.updateOwnedCampaign(req.user.id, req.params.campaignId, body)

    return res.status(200).json({
      message: 'Campanha atualizada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    console.error('Update brand portal campaign error:', error)
    return handleError(res, error, 'Erro ao atualizar campanha da marca.')
  }
}

/**
 * POST /api/brand-portal/campaigns/:campaignId/submit-approval
 */
export const submitBrandPortalCampaignForApproval = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    const result = await brandPortalService.submitOwnedCampaignForApproval(
      req.user.id,
      req.params.campaignId,
      body
    )

    return res.status(200).json({
      message: 'Campanha submetida para aprovacao com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    console.error('Submit brand portal campaign error:', error)
    return handleError(res, error, 'Erro ao submeter campanha para aprovacao.')
  }
}

/**
 * GET /api/brand-portal/campaigns/:campaignId/metrics
 */
export const getBrandPortalCampaignMetrics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const daysRaw = toOptionalString(req.query.days)
    const days = parseOptionalPositiveInt(daysRaw)
    if (typeof daysRaw === 'string' && days === undefined) {
      return res.status(400).json({ error: 'Parametro days invalido.' })
    }

    const result = await brandPortalService.getOwnedCampaignMetrics(
      req.user.id,
      req.params.campaignId,
      days
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get brand portal campaign metrics error:', error)
    return handleError(res, error, 'Erro ao obter metricas da campanha da marca.')
  }
}

/**
 * GET /api/brand-portal/wallets
 */
export const listBrandPortalWallets = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await brandWalletService.listWallets(req.user.id)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal wallets error:', error)
    return handleError(res, error, 'Erro ao listar wallets da marca.')
  }
}

/**
 * GET /api/brand-portal/wallets/:directoryEntryId
 */
export const getBrandPortalWallet = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await brandWalletService.getWallet(req.user.id, req.params.directoryEntryId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get brand portal wallet error:', error)
    return handleError(res, error, 'Erro ao obter wallet da marca.')
  }
}

/**
 * GET /api/brand-portal/wallets/:directoryEntryId/transactions
 */
export const listBrandPortalWalletTransactions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const typeRaw = toOptionalString(req.query.type)
    if (typeRaw && !isValidBrandWalletTransactionType(typeRaw)) {
      return res.status(400).json({ error: 'Parametro type invalido.' })
    }

    const statusRaw = toOptionalString(req.query.status)
    if (statusRaw && !isValidBrandWalletTransactionStatus(statusRaw)) {
      return res.status(400).json({ error: 'Parametro status invalido.' })
    }

    const result = await brandWalletService.listTransactions(
      req.user.id,
      req.params.directoryEntryId,
      {
        type: typeRaw as BrandWalletTransactionType | undefined,
        status: statusRaw as BrandWalletTransactionStatus | undefined,
        search: toOptionalString(req.query.search),
      },
      {
        page: parseOptionalPositiveInt(toOptionalString(req.query.page)),
        limit: parseOptionalPositiveInt(toOptionalString(req.query.limit)),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List brand portal wallet transactions error:', error)
    return handleError(res, error, 'Erro ao listar transacoes da wallet.')
  }
}

/**
 * POST /api/brand-portal/wallets/:directoryEntryId/top-up-requests
 */
export const requestBrandPortalWalletTopUp = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    const result = await brandWalletService.requestTopUp(req.user.id, req.params.directoryEntryId, {
      amountCents: body.amountCents,
      amount: body.amount,
      description: body.description,
      reference: body.reference,
      metadata: body.metadata,
    })

    return res.status(201).json({
      message: 'Pedido de top-up criado com sucesso.',
      ...result,
    })
  } catch (error: unknown) {
    console.error('Request brand portal wallet top-up error:', error)
    return handleError(res, error, 'Erro ao criar pedido de top-up.')
  }
}
