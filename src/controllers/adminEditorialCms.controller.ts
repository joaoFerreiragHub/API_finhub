import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  adminEditorialCmsService,
  AdminEditorialCmsServiceError,
  isValidClaimStatus,
  isValidClaimTargetType,
  isValidDirectoryStatus,
  isValidDirectoryVerticalType,
  isValidSectionStatus,
} from '../services/adminEditorialCms.service'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_editorial_cms_controller'

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value !== 'string') return undefined
  if (value === 'true') return true
  if (value === 'false') return false
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

const handleAdminEditorialError = (res: Response, error: unknown, fallbackMessage: string) => {
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
 * GET /api/admin/editorial/sections
 */
export const listEditorialSections = async (req: AuthRequest, res: Response) => {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined
    if (statusRaw && !isValidSectionStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }
    const status = statusRaw && isValidSectionStatus(statusRaw) ? statusRaw : undefined

    const result = await adminEditorialCmsService.listSections(
      {
        status,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_editorial_sections', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao listar secoes editoriais.')
  }
}

/**
 * POST /api/admin/editorial/sections
 */
export const createEditorialSection = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const section = await adminEditorialCmsService.createSection({
      actorId,
      key: typeof req.body?.key === 'string' ? req.body.key : undefined,
      title: typeof req.body?.title === 'string' ? req.body.title : '',
      subtitle: typeof req.body?.subtitle === 'string' ? req.body.subtitle : undefined,
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      sectionType: typeof req.body?.sectionType === 'string' ? req.body.sectionType : undefined,
      order: typeof req.body?.order === 'number' ? req.body.order : undefined,
      maxItems: typeof req.body?.maxItems === 'number' ? req.body.maxItems : undefined,
      status: typeof req.body?.status === 'string' ? req.body.status : undefined,
      showOnHome: typeof req.body?.showOnHome === 'boolean' ? req.body.showOnHome : undefined,
      showOnLanding: typeof req.body?.showOnLanding === 'boolean' ? req.body.showOnLanding : undefined,
      showOnShowAll: typeof req.body?.showOnShowAll === 'boolean' ? req.body.showOnShowAll : undefined,
    })

    return res.status(201).json(section)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_editorial_section', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao criar secao editorial.')
  }
}

/**
 * PATCH /api/admin/editorial/sections/:sectionId
 */
export const updateEditorialSection = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const section = await adminEditorialCmsService.updateSection(req.params.sectionId, {
      actorId,
      key: typeof req.body?.key === 'string' ? req.body.key : undefined,
      title: typeof req.body?.title === 'string' ? req.body.title : undefined,
      subtitle:
        typeof req.body?.subtitle === 'string' || req.body?.subtitle === null
          ? req.body.subtitle
          : undefined,
      description:
        typeof req.body?.description === 'string' || req.body?.description === null
          ? req.body.description
          : undefined,
      sectionType: typeof req.body?.sectionType === 'string' ? req.body.sectionType : undefined,
      order: typeof req.body?.order === 'number' ? req.body.order : undefined,
      maxItems: typeof req.body?.maxItems === 'number' ? req.body.maxItems : undefined,
      status: typeof req.body?.status === 'string' ? req.body.status : undefined,
      showOnHome: typeof req.body?.showOnHome === 'boolean' ? req.body.showOnHome : undefined,
      showOnLanding: typeof req.body?.showOnLanding === 'boolean' ? req.body.showOnLanding : undefined,
      showOnShowAll: typeof req.body?.showOnShowAll === 'boolean' ? req.body.showOnShowAll : undefined,
    })

    return res.status(200).json(section)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_editorial_section', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao atualizar secao editorial.')
  }
}

/**
 * POST /api/admin/editorial/sections/:sectionId/items
 */
export const addEditorialSectionItem = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const item = await adminEditorialCmsService.addSectionItem(req.params.sectionId, {
      actorId,
      targetType: typeof req.body?.targetType === 'string' ? req.body.targetType : 'custom',
      targetId: typeof req.body?.targetId === 'string' ? req.body.targetId : '',
      titleOverride: typeof req.body?.titleOverride === 'string' ? req.body.titleOverride : undefined,
      descriptionOverride:
        typeof req.body?.descriptionOverride === 'string' ? req.body.descriptionOverride : undefined,
      imageOverride: typeof req.body?.imageOverride === 'string' ? req.body.imageOverride : undefined,
      urlOverride: typeof req.body?.urlOverride === 'string' ? req.body.urlOverride : undefined,
      badge: typeof req.body?.badge === 'string' ? req.body.badge : undefined,
      sortOrder: typeof req.body?.sortOrder === 'number' ? req.body.sortOrder : undefined,
      isPinned: typeof req.body?.isPinned === 'boolean' ? req.body.isPinned : undefined,
      status: typeof req.body?.status === 'string' ? req.body.status : undefined,
      startAt:
        typeof req.body?.startAt === 'string' || req.body?.startAt instanceof Date
          ? req.body.startAt
          : undefined,
      endAt:
        typeof req.body?.endAt === 'string' || req.body?.endAt instanceof Date
          ? req.body.endAt
          : undefined,
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
    })

    return res.status(201).json(item)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'add_editorial_section_item', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao adicionar item editorial.')
  }
}

/**
 * PATCH /api/admin/editorial/sections/:sectionId/items/reorder
 */
export const reorderEditorialSectionItems = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const items = Array.isArray(req.body?.items) ? req.body.items : []
    const result = await adminEditorialCmsService.reorderSectionItems(req.params.sectionId, {
      actorId,
      items,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'reorder_editorial_section_items', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao reordenar itens editoriais.')
  }
}

/**
 * DELETE /api/admin/editorial/sections/:sectionId/items/:itemId
 */
export const removeEditorialSectionItem = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminEditorialCmsService.removeSectionItem(
      req.params.sectionId,
      req.params.itemId
    )
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'remove_editorial_section_item', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao remover item editorial.')
  }
}

/**
 * GET /api/admin/directories/:vertical
 */
export const listAdminDirectories = async (req: AuthRequest, res: Response) => {
  try {
    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined
    if (statusRaw && !isValidDirectoryStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }
    const status = statusRaw && isValidDirectoryStatus(statusRaw) ? statusRaw : undefined

    const result = await adminEditorialCmsService.listDirectories(
      vertical,
      {
        status,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        isActive: parseBoolean(req.query.isActive),
        isFeatured: parseBoolean(req.query.isFeatured),
        claimable: parseBoolean(req.query.claimable),
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_directories', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao listar diretorio admin.')
  }
}

/**
 * POST /api/admin/directories/:vertical
 */
export const createAdminDirectory = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const directory = await adminEditorialCmsService.createDirectory(vertical, {
      actorId,
      name: typeof req.body?.name === 'string' ? req.body.name : '',
      slug: typeof req.body?.slug === 'string' ? req.body.slug : undefined,
      shortDescription:
        typeof req.body?.shortDescription === 'string' ? req.body.shortDescription : '',
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      logo: typeof req.body?.logo === 'string' ? req.body.logo : undefined,
      coverImage: typeof req.body?.coverImage === 'string' ? req.body.coverImage : undefined,
      website: typeof req.body?.website === 'string' ? req.body.website : undefined,
      canonicalUrl: typeof req.body?.canonicalUrl === 'string' ? req.body.canonicalUrl : undefined,
      country: typeof req.body?.country === 'string' ? req.body.country : undefined,
      region: typeof req.body?.region === 'string' ? req.body.region : undefined,
      regulatedBy: Array.isArray(req.body?.regulatedBy) ? req.body.regulatedBy : undefined,
      licenses: Array.isArray(req.body?.licenses) ? req.body.licenses : undefined,
      pros: Array.isArray(req.body?.pros) ? req.body.pros : undefined,
      cons: Array.isArray(req.body?.cons) ? req.body.cons : undefined,
      keyFeatures: Array.isArray(req.body?.keyFeatures) ? req.body.keyFeatures : undefined,
      pricing: typeof req.body?.pricing === 'string' ? req.body.pricing : undefined,
      categories: Array.isArray(req.body?.categories) ? req.body.categories : undefined,
      tags: Array.isArray(req.body?.tags) ? req.body.tags : undefined,
      socialLinks: req.body?.socialLinks && typeof req.body.socialLinks === 'object' ? req.body.socialLinks : undefined,
      status: typeof req.body?.status === 'string' ? req.body.status : undefined,
      verificationStatus:
        typeof req.body?.verificationStatus === 'string' ? req.body.verificationStatus : undefined,
      isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
      isFeatured: typeof req.body?.isFeatured === 'boolean' ? req.body.isFeatured : undefined,
      showInHomeSection:
        typeof req.body?.showInHomeSection === 'boolean' ? req.body.showInHomeSection : undefined,
      showInDirectory:
        typeof req.body?.showInDirectory === 'boolean' ? req.body.showInDirectory : undefined,
      landingEnabled:
        typeof req.body?.landingEnabled === 'boolean' ? req.body.landingEnabled : undefined,
      showAllEnabled:
        typeof req.body?.showAllEnabled === 'boolean' ? req.body.showAllEnabled : undefined,
      ownerType: typeof req.body?.ownerType === 'string' ? req.body.ownerType : undefined,
      sourceType: typeof req.body?.sourceType === 'string' ? req.body.sourceType : undefined,
      claimable: typeof req.body?.claimable === 'boolean' ? req.body.claimable : undefined,
      ownerUserId:
        typeof req.body?.ownerUserId === 'string' || req.body?.ownerUserId === null
          ? req.body.ownerUserId
          : undefined,
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
    })

    return res.status(201).json(directory)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_directory', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao criar entrada de diretorio.')
  }
}

/**
 * PATCH /api/admin/directories/:vertical/:entryId
 */
export const updateAdminDirectory = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const directory = await adminEditorialCmsService.updateDirectory(vertical, req.params.entryId, {
      actorId,
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      slug: typeof req.body?.slug === 'string' ? req.body.slug : undefined,
      shortDescription:
        typeof req.body?.shortDescription === 'string' ? req.body.shortDescription : undefined,
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      logo: typeof req.body?.logo === 'string' ? req.body.logo : undefined,
      coverImage: typeof req.body?.coverImage === 'string' ? req.body.coverImage : undefined,
      website: typeof req.body?.website === 'string' ? req.body.website : undefined,
      canonicalUrl: typeof req.body?.canonicalUrl === 'string' ? req.body.canonicalUrl : undefined,
      country: typeof req.body?.country === 'string' ? req.body.country : undefined,
      region: typeof req.body?.region === 'string' ? req.body.region : undefined,
      regulatedBy: Array.isArray(req.body?.regulatedBy) ? req.body.regulatedBy : undefined,
      licenses: Array.isArray(req.body?.licenses) ? req.body.licenses : undefined,
      pros: Array.isArray(req.body?.pros) ? req.body.pros : undefined,
      cons: Array.isArray(req.body?.cons) ? req.body.cons : undefined,
      keyFeatures: Array.isArray(req.body?.keyFeatures) ? req.body.keyFeatures : undefined,
      pricing: typeof req.body?.pricing === 'string' ? req.body.pricing : undefined,
      categories: Array.isArray(req.body?.categories) ? req.body.categories : undefined,
      tags: Array.isArray(req.body?.tags) ? req.body.tags : undefined,
      socialLinks: req.body?.socialLinks && typeof req.body.socialLinks === 'object' ? req.body.socialLinks : undefined,
      status: typeof req.body?.status === 'string' ? req.body.status : undefined,
      verificationStatus:
        typeof req.body?.verificationStatus === 'string' ? req.body.verificationStatus : undefined,
      isActive: typeof req.body?.isActive === 'boolean' ? req.body.isActive : undefined,
      isFeatured: typeof req.body?.isFeatured === 'boolean' ? req.body.isFeatured : undefined,
      showInHomeSection:
        typeof req.body?.showInHomeSection === 'boolean' ? req.body.showInHomeSection : undefined,
      showInDirectory:
        typeof req.body?.showInDirectory === 'boolean' ? req.body.showInDirectory : undefined,
      landingEnabled:
        typeof req.body?.landingEnabled === 'boolean' ? req.body.landingEnabled : undefined,
      showAllEnabled:
        typeof req.body?.showAllEnabled === 'boolean' ? req.body.showAllEnabled : undefined,
      ownerType: typeof req.body?.ownerType === 'string' ? req.body.ownerType : undefined,
      sourceType: typeof req.body?.sourceType === 'string' ? req.body.sourceType : undefined,
      claimable: typeof req.body?.claimable === 'boolean' ? req.body.claimable : undefined,
      ownerUserId:
        typeof req.body?.ownerUserId === 'string' || req.body?.ownerUserId === null
          ? req.body.ownerUserId
          : undefined,
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
    })

    return res.status(200).json(directory)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_directory', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao atualizar entrada de diretorio.')
  }
}

/**
 * POST /api/admin/directories/:vertical/:entryId/publish
 */
export const publishAdminDirectory = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return

    const result = await adminEditorialCmsService.publishDirectory(
      vertical,
      req.params.entryId,
      actorId,
      reason
    )
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'publish_admin_directory', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao publicar entrada de diretorio.')
  }
}

/**
 * POST /api/admin/directories/:vertical/:entryId/archive
 */
export const archiveAdminDirectory = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para arquivar entrada.',
      })
    }

    const result = await adminEditorialCmsService.archiveDirectory(
      vertical,
      req.params.entryId,
      actorId,
      reason
    )
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'archive_admin_directory', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao arquivar entrada de diretorio.')
  }
}

/**
 * GET /api/admin/claims
 */
export const listAdminClaims = async (req: AuthRequest, res: Response) => {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined
    if (statusRaw && !isValidClaimStatus(statusRaw)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }

    const targetTypeRaw = typeof req.query.targetType === 'string' ? req.query.targetType : undefined
    if (targetTypeRaw && !isValidClaimTargetType(targetTypeRaw)) {
      return res.status(400).json({
        error: 'Parametro targetType invalido.',
      })
    }

    const status = statusRaw && isValidClaimStatus(statusRaw) ? statusRaw : undefined
    const targetType =
      targetTypeRaw && isValidClaimTargetType(targetTypeRaw) ? targetTypeRaw : undefined

    const result = await adminEditorialCmsService.listClaims(
      {
        status,
        targetType,
        creatorId: typeof req.query.creatorId === 'string' ? req.query.creatorId : undefined,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_claims', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao listar claims.')
  }
}

/**
 * GET /api/admin/ownership/transfers
 */
export const listAdminOwnershipTransfers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminEditorialCmsService.listOwnershipTransfers(
      {
        targetType: typeof req.query.targetType === 'string' ? req.query.targetType : undefined,
        targetId: typeof req.query.targetId === 'string' ? req.query.targetId : undefined,
        fromOwnerType:
          typeof req.query.fromOwnerType === 'string' ? req.query.fromOwnerType : undefined,
        toOwnerType: typeof req.query.toOwnerType === 'string' ? req.query.toOwnerType : undefined,
        transferredBy:
          typeof req.query.transferredBy === 'string' ? req.query.transferredBy : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_ownership_transfers', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao listar historico de ownership.')
  }
}

/**
 * POST /api/admin/claims/:claimId/approve
 */
export const approveAdminClaim = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminEditorialCmsService.approveClaim(req.params.claimId, {
      actorId,
      note,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'approve_admin_claim', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao aprovar claim.')
  }
}

/**
 * POST /api/admin/claims/:claimId/reject
 */
export const rejectAdminClaim = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminEditorialCmsService.rejectClaim(req.params.claimId, {
      actorId,
      note,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'reject_admin_claim', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao rejeitar claim.')
  }
}

/**
 * POST /api/admin/ownership/transfer
 */
export const transferAdminOwnership = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = getActorId(req, res)
    if (!actorId) return

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({
        error: 'Motivo obrigatorio para transferencia de ownership.',
      })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminEditorialCmsService.transferOwnership({
      actorId,
      targetType: typeof req.body?.targetType === 'string' ? req.body.targetType : 'directory_entry',
      targetId: typeof req.body?.targetId === 'string' ? req.body.targetId : '',
      toOwnerType: typeof req.body?.toOwnerType === 'string' ? req.body.toOwnerType : 'creator_owned',
      toOwnerUserId:
        typeof req.body?.toOwnerUserId === 'string' || req.body?.toOwnerUserId === null
          ? req.body.toOwnerUserId
          : undefined,
      reason,
      note,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'transfer_admin_ownership', error, req)
    return handleAdminEditorialError(res, error, 'Erro ao transferir ownership.')
  }
}
