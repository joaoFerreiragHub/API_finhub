import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  adminAdPartnershipService,
  AdminAdPartnershipServiceError,
  isValidAdPartnershipCampaignStatus,
  isValidAdPartnershipDevice,
  isValidAdPartnershipPosition,
  isValidAdPartnershipSponsorType,
  isValidAdPartnershipSurface,
  isValidAdPartnershipType,
} from '../services/adminAdPartnership.service'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_ad_partnership_controller'

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
    res.status(400).json({ error: parsed.error })
    return null
  }
  return parsed.value
}

const resolveNote = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminNote(req)
  if (parsed.error) {
    res.status(400).json({ error: parsed.error })
    return null
  }
  return parsed.value
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminAdPartnershipServiceError) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

export const listAdminAdSlots = async (req: AuthRequest, res: Response) => {
  try {
    const surface = toOptionalString(req.query.surface)
    if (surface && !isValidAdPartnershipSurface(surface)) {
      return res.status(400).json({ error: 'Parametro surface invalido.' })
    }
    const position = toOptionalString(req.query.position)
    if (position && !isValidAdPartnershipPosition(position)) {
      return res.status(400).json({ error: 'Parametro position invalido.' })
    }
    const device = toOptionalString(req.query.device)
    if (device && !isValidAdPartnershipDevice(device)) {
      return res.status(400).json({ error: 'Parametro device invalido.' })
    }
    const adType = toOptionalString(req.query.adType)
    if (adType && !isValidAdPartnershipType(adType)) {
      return res.status(400).json({ error: 'Parametro adType invalido.' })
    }

    const isActiveRaw = toOptionalString(req.query.isActive)
    const isActive =
      isActiveRaw === 'true' || isActiveRaw === '1'
        ? true
        : isActiveRaw === 'false' || isActiveRaw === '0'
          ? false
          : undefined

    const result = await adminAdPartnershipService.listSlots(
      {
        surface,
        position,
        device,
        adType,
        isActive,
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_ad_slots', error, req)
    return handleError(res, error, 'Erro ao listar slots de anuncios.')
  }
}

export const createAdminAdSlot = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatorio para criar slot.' })
    const note = resolveNote(req, res)
    if (note === null) return

    const body = extractBodyRecord(req)
    const result = await adminAdPartnershipService.createSlot({
      actorId: req.user.id,
      slotId: body.slotId,
      label: body.label,
      surface: body.surface,
      position: body.position,
      device: body.device,
      allowedTypes: body.allowedTypes,
      visibleTo: body.visibleTo,
      maxPerSession: body.maxPerSession,
      minSecondsBetweenImpressions: body.minSecondsBetweenImpressions,
      minContentBefore: body.minContentBefore,
      isActive: body.isActive,
      priority: body.priority,
      fallbackType: body.fallbackType,
      notes: body.notes,
      reason,
      note,
    })

    return res.status(201).json({
      message: 'Slot de anuncios criado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_ad_slot', error, req)
    return handleError(res, error, 'Erro ao criar slot de anuncios.')
  }
}

export const updateAdminAdSlot = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatorio para atualizar slot.' })
    const note = resolveNote(req, res)
    if (note === null) return

    const body = extractBodyRecord(req)
    const result = await adminAdPartnershipService.updateSlot({
      actorId: req.user.id,
      slotId: req.params.slotId,
      patch: body,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Slot de anuncios atualizado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_ad_slot', error, req)
    return handleError(res, error, 'Erro ao atualizar slot de anuncios.')
  }
}

export const listAdminAdCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const status = toOptionalString(req.query.status)
    if (status && !isValidAdPartnershipCampaignStatus(status)) {
      return res.status(400).json({ error: 'Parametro status invalido.' })
    }
    const adType = toOptionalString(req.query.adType)
    if (adType && !isValidAdPartnershipType(adType)) {
      return res.status(400).json({ error: 'Parametro adType invalido.' })
    }
    const sponsorType = toOptionalString(req.query.sponsorType)
    if (sponsorType && !isValidAdPartnershipSponsorType(sponsorType)) {
      return res.status(400).json({ error: 'Parametro sponsorType invalido.' })
    }
    const surface = toOptionalString(req.query.surface)
    if (surface && !isValidAdPartnershipSurface(surface)) {
      return res.status(400).json({ error: 'Parametro surface invalido.' })
    }

    const result = await adminAdPartnershipService.listCampaigns(
      {
        status,
        adType,
        sponsorType,
        surface,
        search: toOptionalString(req.query.search),
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_ad_campaigns', error, req)
    return handleError(res, error, 'Erro ao listar campanhas de anuncios.')
  }
}

export const getAdminAdCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminAdPartnershipService.getCampaign(req.params.campaignId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_ad_campaign', error, req)
    return handleError(res, error, 'Erro ao obter campanha de anuncios.')
  }
}

export const createAdminAdCampaign = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({ error: 'Motivo obrigatorio para criar campanha.' })
    }
    const note = resolveNote(req, res)
    if (note === null) return

    const body = extractBodyRecord(req)
    const result = await adminAdPartnershipService.createCampaign({
      actorId: req.user.id,
      code: body.code,
      title: body.title,
      description: body.description,
      adType: body.adType,
      sponsorType: body.sponsorType,
      brandId: body.brandId,
      directoryEntryId: body.directoryEntryId,
      surfaces: body.surfaces,
      slotIds: body.slotIds,
      visibleTo: body.visibleTo,
      priority: body.priority,
      startAt: body.startAt,
      endAt: body.endAt,
      headline: body.headline,
      disclosureLabel: body.disclosureLabel,
      body: body.body,
      ctaText: body.ctaText,
      ctaUrl: body.ctaUrl,
      imageUrl: body.imageUrl,
      relevanceTags: body.relevanceTags,
      estimatedMonthlyBudget: body.estimatedMonthlyBudget,
      currency: body.currency,
      status: body.status,
      reason,
      note,
    })

    return res.status(201).json({
      message: 'Campanha de anuncios criada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_ad_campaign', error, req)
    return handleError(res, error, 'Erro ao criar campanha de anuncios.')
  }
}

export const updateAdminAdCampaign = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({ error: 'Motivo obrigatorio para atualizar campanha.' })
    }
    const note = resolveNote(req, res)
    if (note === null) return

    const body = extractBodyRecord(req)
    const result = await adminAdPartnershipService.updateCampaign({
      actorId: req.user.id,
      campaignId: req.params.campaignId,
      patch: body,
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Campanha de anuncios atualizada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_ad_campaign', error, req)
    return handleError(res, error, 'Erro ao atualizar campanha de anuncios.')
  }
}

export const activateAdminAdCampaign = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatorio para ativar campanha.' })
    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminAdPartnershipService.setCampaignStatus({
      actorId: req.user.id,
      campaignId: req.params.campaignId,
      status: 'active',
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Campanha ativada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'activate_admin_ad_campaign', error, req)
    return handleError(res, error, 'Erro ao ativar campanha.')
  }
}

export const pauseAdminAdCampaign = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) return res.status(400).json({ error: 'Motivo obrigatorio para pausar campanha.' })
    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminAdPartnershipService.setCampaignStatus({
      actorId: req.user.id,
      campaignId: req.params.campaignId,
      status: 'paused',
      reason,
      note,
    })

    return res.status(200).json({
      message: 'Campanha pausada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'pause_admin_ad_campaign', error, req)
    return handleError(res, error, 'Erro ao pausar campanha.')
  }
}

export const getAdminAdsInventoryOverview = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminAdPartnershipService.getInventoryOverview()
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_ads_inventory_overview', error, req)
    return handleError(res, error, 'Erro ao obter overview de inventario de anuncios.')
  }
}
