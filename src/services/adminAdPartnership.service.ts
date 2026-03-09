import mongoose from 'mongoose'
import { AdSlotConfig } from '../models/AdSlotConfig'
import { AdCampaign } from '../models/AdCampaign'
import { Brand } from '../models/Brand'
import { DirectoryEntry } from '../models/DirectoryEntry'
import { resolvePagination } from '../utils/pagination'

const AD_TYPES = ['external_ads', 'sponsored_ads', 'house_ads', 'value_ads'] as const
const VISIBILITY = ['free', 'premium', 'all'] as const
const SURFACES = [
  'home_feed',
  'tools',
  'directory',
  'content',
  'learning',
  'community',
  'dashboard',
  'profile',
] as const
const POSITIONS = ['sidebar', 'inline', 'footer', 'header', 'banner', 'card', 'comparison_strip'] as const
const DEVICES = ['all', 'desktop', 'mobile'] as const
const CAMPAIGN_STATUSES = [
  'draft',
  'pending_approval',
  'active',
  'paused',
  'completed',
  'archived',
] as const
const SPONSOR_TYPES = ['brand', 'creator', 'platform'] as const
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const DEFAULT_SLOT_COOLDOWN_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_ADS_DEFAULT_MIN_SECONDS_BETWEEN_IMPRESSIONS ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 120
  return parsed
})()
const DEFAULT_DISCLOSURE_LABELS: Record<(typeof AD_TYPES)[number], string | null> = {
  external_ads: 'Publicidade',
  sponsored_ads: 'Patrocinado',
  house_ads: null,
  value_ads: 'Sugestao patrocinada',
}
const DEFAULT_FINANCIAL_RELEVANCE_TAGS = [
  'acoes',
  'stocks',
  'etf',
  'etfs',
  'reit',
  'reits',
  'crypto',
  'criptomoedas',
  'ppr',
  'reforma',
  'retirement',
  'fire',
  'portfolio',
  'dividendos',
  'dividends',
  'fiscalidade',
  'taxes',
  'irs',
  'poupanca',
  'savings',
  'budget',
  'orcamento',
  'mercado',
  'markets',
  'bancos',
  'banking',
  'seguros',
  'insurance',
  'literacia',
  'educacao_financeira',
] as const
const FINANCIAL_RELEVANCE_TAGS = (() => {
  const configured = (process.env.ADMIN_ADS_FINANCIAL_RELEVANCE_TAGS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
  if (configured.length > 0) return new Set(configured)
  return new Set(DEFAULT_FINANCIAL_RELEVANCE_TAGS)
})()

export type AdPartnershipType = (typeof AD_TYPES)[number]
export type AdPartnershipVisibility = (typeof VISIBILITY)[number]
export type AdPartnershipSurface = (typeof SURFACES)[number]
export type AdPartnershipPosition = (typeof POSITIONS)[number]
export type AdPartnershipDevice = (typeof DEVICES)[number]
export type AdPartnershipCampaignStatus = (typeof CAMPAIGN_STATUSES)[number]
export type AdPartnershipSponsorType = (typeof SPONSOR_TYPES)[number]
type SlotCompatibilityInput = {
  slotId: string
  allowedTypes: AdPartnershipType[]
  visibleTo: AdPartnershipVisibility[]
  isActive?: boolean | null
}

export const isValidAdPartnershipType = (value: unknown): value is AdPartnershipType =>
  typeof value === 'string' && AD_TYPES.includes(value as AdPartnershipType)

export const isValidAdPartnershipVisibility = (
  value: unknown
): value is AdPartnershipVisibility =>
  typeof value === 'string' && VISIBILITY.includes(value as AdPartnershipVisibility)

export const isValidAdPartnershipSurface = (value: unknown): value is AdPartnershipSurface =>
  typeof value === 'string' && SURFACES.includes(value as AdPartnershipSurface)

export const isValidAdPartnershipPosition = (
  value: unknown
): value is AdPartnershipPosition =>
  typeof value === 'string' && POSITIONS.includes(value as AdPartnershipPosition)

export const isValidAdPartnershipDevice = (value: unknown): value is AdPartnershipDevice =>
  typeof value === 'string' && DEVICES.includes(value as AdPartnershipDevice)

export const isValidAdPartnershipCampaignStatus = (
  value: unknown
): value is AdPartnershipCampaignStatus =>
  typeof value === 'string' && CAMPAIGN_STATUSES.includes(value as AdPartnershipCampaignStatus)

export const isValidAdPartnershipSponsorType = (
  value: unknown
): value is AdPartnershipSponsorType =>
  typeof value === 'string' && SPONSOR_TYPES.includes(value as AdPartnershipSponsorType)

export class AdminAdPartnershipServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toPositiveIntOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = Math.floor(value)
    if (parsed >= 0) return parsed
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return null
}

const toDateOrNull = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new AdminAdPartnershipServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(rawId)
}

const uniqueStringArray = <T extends string>(values: T[]): T[] => [...new Set(values)]

const parseAdTypes = (value: unknown): AdPartnershipType[] => {
  if (!Array.isArray(value)) return []
  return uniqueStringArray(value.filter((item): item is AdPartnershipType => isValidAdPartnershipType(item)))
}

const parseVisibility = (value: unknown): AdPartnershipVisibility[] => {
  if (!Array.isArray(value)) return []
  return uniqueStringArray(
    value.filter((item): item is AdPartnershipVisibility => isValidAdPartnershipVisibility(item))
  )
}

const parseSurfaces = (value: unknown): AdPartnershipSurface[] => {
  if (!Array.isArray(value)) return []
  return uniqueStringArray(value.filter((item): item is AdPartnershipSurface => isValidAdPartnershipSurface(item)))
}

const parseSlotIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return uniqueStringArray(
    value
      .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
      .filter((item) => item.length > 0)
  )
}

const normalizeRelevanceTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return uniqueStringArray(
    value
      .map((item) =>
        typeof item === 'string'
          ? item
              .trim()
              .toLowerCase()
              .replace(/\s+/g, '_')
          : ''
      )
      .filter((item) => item.length > 0)
  )
}

const resolveDisclosureLabel = (adType: AdPartnershipType, value: unknown): string | null => {
  const parsed = toStringOrNull(value)
  if (parsed) return parsed
  return DEFAULT_DISCLOSURE_LABELS[adType]
}

const ensureDisclosureLabel = (adType: AdPartnershipType, disclosureLabel: string | null) => {
  if (adType === 'house_ads') return
  if (!disclosureLabel) {
    throw new AdminAdPartnershipServiceError(
      400,
      'Campanhas nao-house requerem disclosureLabel explicito (ex: Patrocinado).'
    )
  }
}

const ensureFinancialRelevance = (adType: AdPartnershipType, relevanceTags: string[]) => {
  if (adType === 'house_ads') return
  if (relevanceTags.length === 0) {
    throw new AdminAdPartnershipServiceError(
      400,
      'Campanhas nao-house requerem ao menos 1 relevanceTag financeira/contextual.'
    )
  }
  if (!relevanceTags.some((tag) => FINANCIAL_RELEVANCE_TAGS.has(tag))) {
    throw new AdminAdPartnershipServiceError(
      400,
      'Campanha deve incluir pelo menos uma relevanceTag financeira reconhecida.'
    )
  }
}

const expandVisibility = (value: AdPartnershipVisibility[]): Set<'free' | 'premium'> => {
  const expanded = new Set<'free' | 'premium'>()
  if (value.includes('all')) {
    expanded.add('free')
    expanded.add('premium')
    return expanded
  }
  if (value.includes('free')) expanded.add('free')
  if (value.includes('premium')) expanded.add('premium')
  return expanded
}

const hasVisibilityOverlap = (
  slotVisibility: AdPartnershipVisibility[],
  campaignVisibility: AdPartnershipVisibility[]
) => {
  const slotExpanded = expandVisibility(slotVisibility)
  const campaignExpanded = expandVisibility(campaignVisibility)
  for (const value of slotExpanded) {
    if (campaignExpanded.has(value)) return true
  }
  return false
}

const ensureSlotCompatibility = (
  slot: SlotCompatibilityInput,
  adType: AdPartnershipType,
  campaignVisibility: AdPartnershipVisibility[],
  options: { requireActive?: boolean } = {}
) => {
  if (!slot.allowedTypes.includes(adType)) {
    throw new AdminAdPartnershipServiceError(400, `Slot ${slot.slotId} nao permite adType ${adType}.`)
  }
  if (!hasVisibilityOverlap(slot.visibleTo, campaignVisibility)) {
    throw new AdminAdPartnershipServiceError(
      400,
      `Slot ${slot.slotId} nao e compativel com visibleTo da campanha.`
    )
  }
  if (options.requireActive && slot.isActive === false) {
    throw new AdminAdPartnershipServiceError(
      409,
      `Slot ${slot.slotId} esta inativo e bloqueia ativacao da campanha.`
    )
  }
}

const ensureExternalAdsNoPremium = (
  adType: AdPartnershipType,
  visibleTo: AdPartnershipVisibility[]
) => {
  if (adType !== 'external_ads') return
  if (visibleTo.includes('premium') || visibleTo.includes('all')) {
    throw new AdminAdPartnershipServiceError(
      400,
      'external_ads nao pode ter visibilidade premium/all.'
    )
  }
  if (!visibleTo.includes('free')) {
    throw new AdminAdPartnershipServiceError(400, 'external_ads deve incluir visibilidade free.')
  }
}

const ensureSchedule = (startAt: Date | null, endAt: Date | null) => {
  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    throw new AdminAdPartnershipServiceError(400, 'endAt deve ser superior a startAt.')
  }
}

export class AdminAdPartnershipService {
  async listSlots(filters: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (isValidAdPartnershipSurface(filters.surface)) query.surface = filters.surface
    if (isValidAdPartnershipPosition(filters.position)) query.position = filters.position
    if (isValidAdPartnershipDevice(filters.device)) query.device = filters.device
    if (isValidAdPartnershipType(filters.adType)) query.allowedTypes = filters.adType
    if (typeof filters.isActive === 'boolean') query.isActive = filters.isActive

    const [items, total] = await Promise.all([
      AdSlotConfig.find(query)
        .sort({ surface: 1, priority: 1, slotId: 1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .lean(),
      AdSlotConfig.countDocuments(query),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async createSlot(input: Record<string, unknown>) {
    const actorId = toObjectId(String(input.actorId ?? ''), 'actorId')
    const reason = toStringOrNull(input.reason)
    if (!reason) throw new AdminAdPartnershipServiceError(400, 'Motivo obrigatorio.')

    const slotId = toStringOrNull(input.slotId)?.toUpperCase()
    if (!slotId || !/^[A-Z0-9_-]{2,40}$/.test(slotId)) {
      throw new AdminAdPartnershipServiceError(400, 'slotId invalido.')
    }

    const label = toStringOrNull(input.label)
    if (!label) throw new AdminAdPartnershipServiceError(400, 'label obrigatorio.')
    if (!isValidAdPartnershipSurface(input.surface)) {
      throw new AdminAdPartnershipServiceError(400, 'surface invalida.')
    }
    if (!isValidAdPartnershipPosition(input.position)) {
      throw new AdminAdPartnershipServiceError(400, 'position invalida.')
    }

    const device = isValidAdPartnershipDevice(input.device) ? input.device : 'all'
    const allowedTypes = parseAdTypes(input.allowedTypes)
    if (allowedTypes.length === 0) {
      throw new AdminAdPartnershipServiceError(400, 'allowedTypes requer pelo menos 1 tipo.')
    }
    const visibleTo = parseVisibility(input.visibleTo)
    const finalVisibleTo: AdPartnershipVisibility[] =
      visibleTo.length > 0 ? visibleTo : ['all']

    if (allowedTypes.includes('external_ads')) {
      ensureExternalAdsNoPremium('external_ads', finalVisibleTo)
    }

    const existing = await AdSlotConfig.findOne({ slotId }).lean()
    if (existing) throw new AdminAdPartnershipServiceError(409, 'slotId ja existe.')

    const maxPerSession = toPositiveIntOrNull(input.maxPerSession) ?? 1
    const minSecondsBetweenImpressions =
      toPositiveIntOrNull(input.minSecondsBetweenImpressions) ?? DEFAULT_SLOT_COOLDOWN_SECONDS
    const minContentBefore = toPositiveIntOrNull(input.minContentBefore) ?? 0
    const priority = toPositiveIntOrNull(input.priority) ?? 100
    const fallbackType = isValidAdPartnershipType(input.fallbackType) ? input.fallbackType : null
    if (fallbackType && !allowedTypes.includes(fallbackType)) {
      throw new AdminAdPartnershipServiceError(400, 'fallbackType deve estar em allowedTypes.')
    }

    const now = new Date()
    const created = await AdSlotConfig.create({
      slotId,
      label,
      surface: input.surface,
      position: input.position,
      device,
      allowedTypes,
      visibleTo: finalVisibleTo,
      maxPerSession,
      minSecondsBetweenImpressions,
      minContentBefore,
      isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
      priority,
      fallbackType,
      notes: toStringOrNull(input.notes),
      createdBy: actorId,
      updatedBy: actorId,
      version: 1,
      history: [
        {
          changedBy: actorId,
          reason,
          note: toStringOrNull(input.note),
          changedAt: now,
          snapshot: {
            allowedTypes,
            visibleTo: finalVisibleTo,
            maxPerSession,
            minSecondsBetweenImpressions,
            isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
            priority,
            fallbackType,
          },
        },
      ],
    })

    await created.populate('createdBy', 'name username email role')
    await created.populate('updatedBy', 'name username email role')
    return created.toObject()
  }

  async updateSlot(input: Record<string, unknown>) {
    const actorId = toObjectId(String(input.actorId ?? ''), 'actorId')
    const reason = toStringOrNull(input.reason)
    if (!reason) throw new AdminAdPartnershipServiceError(400, 'Motivo obrigatorio.')

    const slotId = toStringOrNull(input.slotId)?.toUpperCase()
    if (!slotId) throw new AdminAdPartnershipServiceError(400, 'slotId obrigatorio.')

    const slot = await AdSlotConfig.findOne({ slotId })
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')
    if (!slot) throw new AdminAdPartnershipServiceError(404, 'Slot nao encontrado.')

    const patch =
      input.patch && typeof input.patch === 'object' ? (input.patch as Record<string, unknown>) : {}

    if (typeof patch.label === 'string' && patch.label.trim()) slot.label = patch.label.trim()
    if (isValidAdPartnershipSurface(patch.surface)) slot.surface = patch.surface
    if (isValidAdPartnershipPosition(patch.position)) slot.position = patch.position
    if (isValidAdPartnershipDevice(patch.device)) slot.device = patch.device

    if (Array.isArray(patch.allowedTypes)) {
      const parsed = parseAdTypes(patch.allowedTypes)
      if (parsed.length > 0) slot.allowedTypes = parsed
    }
    if (Array.isArray(patch.visibleTo)) {
      const parsed = parseVisibility(patch.visibleTo)
      if (parsed.length > 0) slot.visibleTo = parsed
    }

    if (patch.maxPerSession !== undefined) {
      const parsed = toPositiveIntOrNull(patch.maxPerSession)
      if (parsed !== null) slot.maxPerSession = parsed
    }
    if (patch.minSecondsBetweenImpressions !== undefined) {
      const parsed = toPositiveIntOrNull(patch.minSecondsBetweenImpressions)
      if (parsed !== null) slot.minSecondsBetweenImpressions = parsed
    }
    if (patch.minContentBefore !== undefined) {
      const parsed = toPositiveIntOrNull(patch.minContentBefore)
      if (parsed !== null) slot.minContentBefore = parsed
    }
    if (typeof patch.isActive === 'boolean') slot.isActive = patch.isActive
    if (patch.priority !== undefined) {
      const parsed = toPositiveIntOrNull(patch.priority)
      if (parsed !== null) slot.priority = parsed
    }
    if (patch.fallbackType === null) slot.fallbackType = null
    if (isValidAdPartnershipType(patch.fallbackType)) slot.fallbackType = patch.fallbackType

    if (slot.allowedTypes.includes('external_ads')) {
      ensureExternalAdsNoPremium('external_ads', slot.visibleTo as AdPartnershipVisibility[])
    }
    if (slot.fallbackType && !slot.allowedTypes.includes(slot.fallbackType as any)) {
      throw new AdminAdPartnershipServiceError(400, 'fallbackType deve estar em allowedTypes.')
    }

    slot.updatedBy = actorId
    slot.version += 1
    slot.history.push({
      changedBy: actorId,
      reason,
      note: toStringOrNull(input.note),
      changedAt: new Date(),
      snapshot: {
        allowedTypes: [...slot.allowedTypes],
        visibleTo: [...slot.visibleTo],
        maxPerSession: slot.maxPerSession,
        minSecondsBetweenImpressions: slot.minSecondsBetweenImpressions,
        isActive: slot.isActive,
        priority: slot.priority,
        fallbackType: slot.fallbackType as any,
      },
    })

    await slot.save()
    await slot.populate('createdBy', 'name username email role')
    await slot.populate('updatedBy', 'name username email role')
    return slot.toObject()
  }

  async listCampaigns(filters: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (isValidAdPartnershipCampaignStatus(filters.status)) query.status = filters.status
    if (isValidAdPartnershipType(filters.adType)) query.adType = filters.adType
    if (isValidAdPartnershipSponsorType(filters.sponsorType)) query.sponsorType = filters.sponsorType
    if (isValidAdPartnershipSurface(filters.surface)) query.surfaces = filters.surface

    const search = toStringOrNull(filters.search)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      query.$or = [{ title: regex }, { code: regex }, { headline: regex }]
    }

    const [items, total] = await Promise.all([
      AdCampaign.find(query)
        .sort({ status: 1, priority: 1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('brand', 'name slug brandType isActive')
        .populate('directoryEntry', 'name slug verticalType status isActive')
        .populate('approvedBy', 'name username email role')
        .populate('createdBy', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .lean(),
      AdCampaign.countDocuments(query),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getCampaign(campaignId: string) {
    const campaignObjectId = toObjectId(campaignId, 'campaignId')
    const item = await AdCampaign.findById(campaignObjectId)
      .populate('brand', 'name slug brandType isActive')
      .populate('directoryEntry', 'name slug verticalType status isActive')
      .populate('approvedBy', 'name username email role')
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')
      .populate('history.changedBy', 'name username email role')
      .lean()

    if (!item) throw new AdminAdPartnershipServiceError(404, 'Campanha nao encontrada.')
    return item
  }

  async createCampaign(input: Record<string, unknown>) {
    const actorId = toObjectId(String(input.actorId ?? ''), 'actorId')
    const reason = toStringOrNull(input.reason)
    if (!reason) throw new AdminAdPartnershipServiceError(400, 'Motivo obrigatorio.')

    const codeRaw = toStringOrNull(input.code)?.toUpperCase()
    const code = codeRaw && /^[A-Z0-9_-]{4,60}$/.test(codeRaw) ? codeRaw : undefined
    const title = toStringOrNull(input.title)
    const headline = toStringOrNull(input.headline)
    if (!title) throw new AdminAdPartnershipServiceError(400, 'title obrigatorio.')
    if (!headline) throw new AdminAdPartnershipServiceError(400, 'headline obrigatorio.')
    if (!isValidAdPartnershipType(input.adType)) {
      throw new AdminAdPartnershipServiceError(400, 'adType invalido.')
    }

    const adType = input.adType
    const sponsorType = isValidAdPartnershipSponsorType(input.sponsorType)
      ? input.sponsorType
      : 'brand'
    const status = isValidAdPartnershipCampaignStatus(input.status) ? input.status : 'draft'
    const visibleToRaw = parseVisibility(input.visibleTo)
    const visibleTo: AdPartnershipVisibility[] =
      visibleToRaw.length > 0 ? visibleToRaw : ['all']
    const relevanceTags = normalizeRelevanceTags(input.relevanceTags)
    const disclosureLabel = resolveDisclosureLabel(adType, input.disclosureLabel)

    ensureExternalAdsNoPremium(adType, visibleTo)
    ensureDisclosureLabel(adType, disclosureLabel)
    ensureFinancialRelevance(adType, relevanceTags)

    const slotIds = parseSlotIds(input.slotIds)
    const surfacesInput = parseSurfaces(input.surfaces)

    const slots = slotIds.length > 0 ? await AdSlotConfig.find({ slotId: { $in: slotIds } }).lean() : []
    const slotMap = new Map(slots.map((slot) => [slot.slotId, slot]))
    for (const slotId of slotIds) {
      if (!slotMap.has(slotId)) {
        throw new AdminAdPartnershipServiceError(404, `Slot ${slotId} nao encontrado.`)
      }
    }

    for (const slot of slots) {
      ensureSlotCompatibility(slot as unknown as SlotCompatibilityInput, adType, visibleTo)
    }

    const surfaces = uniqueStringArray([
      ...surfacesInput,
      ...slots.map((slot) => slot.surface as AdPartnershipSurface),
    ])
    if (surfaces.length === 0) {
      throw new AdminAdPartnershipServiceError(400, 'Campanha requer ao menos uma surface ou slot.')
    }

    const startAt = toDateOrNull(input.startAt)
    const endAt = toDateOrNull(input.endAt)
    ensureSchedule(startAt, endAt)

    const brandId = input.brandId ? toObjectId(String(input.brandId), 'brandId') : null
    const directoryEntryId = input.directoryEntryId
      ? toObjectId(String(input.directoryEntryId), 'directoryEntryId')
      : null

    if (brandId && !(await Brand.exists({ _id: brandId }))) {
      throw new AdminAdPartnershipServiceError(404, 'brandId nao encontrado.')
    }
    if (directoryEntryId && !(await DirectoryEntry.exists({ _id: directoryEntryId }))) {
      throw new AdminAdPartnershipServiceError(404, 'directoryEntryId nao encontrado.')
    }

    const finalCode = code ?? `CAMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const existing = await AdCampaign.findOne({ code: finalCode }).lean()
    if (existing) throw new AdminAdPartnershipServiceError(409, 'code de campanha ja existe.')

    const now = new Date()
    const created = await AdCampaign.create({
      code: finalCode,
      title,
      description: toStringOrNull(input.description),
      adType,
      sponsorType,
      status,
      brand: brandId,
      directoryEntry: directoryEntryId,
      surfaces,
      slotIds,
      visibleTo,
      priority: toPositiveIntOrNull(input.priority) ?? 100,
      startAt,
      endAt,
      headline,
      disclosureLabel,
      body: toStringOrNull(input.body),
      ctaText: toStringOrNull(input.ctaText),
      ctaUrl: toStringOrNull(input.ctaUrl),
      imageUrl: toStringOrNull(input.imageUrl),
      relevanceTags,
      estimatedMonthlyBudget: toPositiveIntOrNull(input.estimatedMonthlyBudget),
      currency: toStringOrNull(input.currency)?.toUpperCase() ?? 'EUR',
      approvedAt: status === 'active' ? now : null,
      approvedBy: status === 'active' ? actorId : null,
      createdBy: actorId,
      updatedBy: actorId,
      metrics: { impressions: 0, clicks: 0, conversions: 0 },
      version: 1,
      history: [
        {
          changedBy: actorId,
          reason,
          note: toStringOrNull(input.note),
          changedAt: now,
          snapshot: {
            status,
            startAt,
            endAt,
            priority: toPositiveIntOrNull(input.priority) ?? 100,
            visibleTo,
            slotIds,
          },
        },
      ],
    })

    await created.populate('brand', 'name slug brandType isActive')
    await created.populate('directoryEntry', 'name slug verticalType status isActive')
    await created.populate('approvedBy', 'name username email role')
    await created.populate('createdBy', 'name username email role')
    await created.populate('updatedBy', 'name username email role')
    return created.toObject()
  }

  async updateCampaign(input: Record<string, unknown>) {
    const actorId = toObjectId(String(input.actorId ?? ''), 'actorId')
    const reason = toStringOrNull(input.reason)
    if (!reason) throw new AdminAdPartnershipServiceError(400, 'Motivo obrigatorio.')

    const campaignId = toObjectId(String(input.campaignId ?? ''), 'campaignId')
    const campaign = await AdCampaign.findById(campaignId)
      .populate('brand', 'name slug brandType isActive')
      .populate('directoryEntry', 'name slug verticalType status isActive')
      .populate('approvedBy', 'name username email role')
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')
    if (!campaign) throw new AdminAdPartnershipServiceError(404, 'Campanha nao encontrada.')

    const patch =
      input.patch && typeof input.patch === 'object' ? (input.patch as Record<string, unknown>) : {}

    if (typeof patch.title === 'string' && patch.title.trim()) campaign.title = patch.title.trim()
    if (patch.description !== undefined) campaign.description = toStringOrNull(patch.description)
    if (isValidAdPartnershipType(patch.adType)) campaign.adType = patch.adType
    if (isValidAdPartnershipSponsorType(patch.sponsorType)) campaign.sponsorType = patch.sponsorType
    if (isValidAdPartnershipCampaignStatus(patch.status)) campaign.status = patch.status

    if ('brandId' in patch) {
      campaign.brand = patch.brandId ? toObjectId(String(patch.brandId), 'brandId') : null
    }
    if ('directoryEntryId' in patch) {
      campaign.directoryEntry = patch.directoryEntryId
        ? toObjectId(String(patch.directoryEntryId), 'directoryEntryId')
        : null
    }

    if (Array.isArray(patch.surfaces)) {
      const parsed = parseSurfaces(patch.surfaces)
      if (parsed.length > 0) campaign.surfaces = parsed
    }
    if (Array.isArray(patch.slotIds)) campaign.slotIds = parseSlotIds(patch.slotIds)
    if (Array.isArray(patch.visibleTo)) {
      const parsed = parseVisibility(patch.visibleTo)
      if (parsed.length > 0) campaign.visibleTo = parsed
    }

    if (patch.priority !== undefined) {
      const parsed = toPositiveIntOrNull(patch.priority)
      if (parsed !== null) campaign.priority = parsed
    }
    if ('startAt' in patch) campaign.startAt = patch.startAt ? toDateOrNull(patch.startAt) : null
    if ('endAt' in patch) campaign.endAt = patch.endAt ? toDateOrNull(patch.endAt) : null
    if (typeof patch.headline === 'string' && patch.headline.trim()) {
      campaign.headline = patch.headline.trim()
    }
    if ('disclosureLabel' in patch) {
      campaign.disclosureLabel = patch.disclosureLabel === null ? null : toStringOrNull(patch.disclosureLabel)
    }
    if ('body' in patch) campaign.body = toStringOrNull(patch.body)
    if ('ctaText' in patch) campaign.ctaText = toStringOrNull(patch.ctaText)
    if ('ctaUrl' in patch) campaign.ctaUrl = toStringOrNull(patch.ctaUrl)
    if ('imageUrl' in patch) campaign.imageUrl = toStringOrNull(patch.imageUrl)

    if (Array.isArray(patch.relevanceTags)) {
      campaign.relevanceTags = normalizeRelevanceTags(patch.relevanceTags)
    }
    if ('estimatedMonthlyBudget' in patch) {
      campaign.estimatedMonthlyBudget = toPositiveIntOrNull(patch.estimatedMonthlyBudget)
    }
    if ('currency' in patch) {
      const parsed = toStringOrNull(patch.currency)
      if (parsed) campaign.currency = parsed.toUpperCase()
    }

    const campaignAdType = campaign.adType as AdPartnershipType
    const campaignVisibility = campaign.visibleTo as unknown as AdPartnershipVisibility[]

    campaign.disclosureLabel = resolveDisclosureLabel(campaignAdType, campaign.disclosureLabel)
    ensureDisclosureLabel(campaignAdType, campaign.disclosureLabel)
    ensureFinancialRelevance(campaignAdType, campaign.relevanceTags)
    ensureExternalAdsNoPremium(campaignAdType, campaignVisibility)
    ensureSchedule(campaign.startAt ?? null, campaign.endAt ?? null)

    if (campaign.brand && !(await Brand.exists({ _id: campaign.brand }))) {
      throw new AdminAdPartnershipServiceError(404, 'brandId nao encontrado.')
    }
    if (campaign.directoryEntry && !(await DirectoryEntry.exists({ _id: campaign.directoryEntry }))) {
      throw new AdminAdPartnershipServiceError(404, 'directoryEntryId nao encontrado.')
    }

    const slots =
      campaign.slotIds.length > 0
        ? await AdSlotConfig.find({ slotId: { $in: campaign.slotIds } }).lean()
        : []
    const slotMap = new Map(slots.map((slot) => [slot.slotId, slot]))
    for (const slotId of campaign.slotIds) {
      if (!slotMap.has(slotId)) {
        throw new AdminAdPartnershipServiceError(404, `Slot ${slotId} nao encontrado.`)
      }
    }
    for (const slot of slots) {
      ensureSlotCompatibility(
        slot as unknown as SlotCompatibilityInput,
        campaignAdType,
        campaignVisibility
      )
    }

    campaign.surfaces = uniqueStringArray([
      ...campaign.surfaces,
      ...slots.map((slot) => slot.surface as AdPartnershipSurface),
    ])

    campaign.updatedBy = actorId
    campaign.version += 1
    campaign.history.push({
      changedBy: actorId,
      reason,
      note: toStringOrNull(input.note),
      changedAt: new Date(),
      snapshot: {
        status: campaign.status,
        startAt: campaign.startAt ?? null,
        endAt: campaign.endAt ?? null,
        priority: campaign.priority,
        visibleTo: [...campaign.visibleTo],
        slotIds: [...campaign.slotIds],
      },
    })

    await campaign.save()
    await campaign.populate('brand', 'name slug brandType isActive')
    await campaign.populate('directoryEntry', 'name slug verticalType status isActive')
    await campaign.populate('approvedBy', 'name username email role')
    await campaign.populate('createdBy', 'name username email role')
    await campaign.populate('updatedBy', 'name username email role')
    return campaign.toObject()
  }

  async setCampaignStatus(input: Record<string, unknown>) {
    const actorId = toObjectId(String(input.actorId ?? ''), 'actorId')
    const reason = toStringOrNull(input.reason)
    if (!reason) throw new AdminAdPartnershipServiceError(400, 'Motivo obrigatorio.')
    if (!isValidAdPartnershipCampaignStatus(input.status)) {
      throw new AdminAdPartnershipServiceError(400, 'status invalido.')
    }

    const campaignId = toObjectId(String(input.campaignId ?? ''), 'campaignId')
    const campaign = await AdCampaign.findById(campaignId)
      .populate('brand', 'name slug brandType isActive')
      .populate('directoryEntry', 'name slug verticalType status isActive')
      .populate('approvedBy', 'name username email role')
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')

    if (!campaign) throw new AdminAdPartnershipServiceError(404, 'Campanha nao encontrada.')
    if (campaign.status === 'archived') {
      throw new AdminAdPartnershipServiceError(409, 'Campanha arquivada nao pode mudar de estado.')
    }

    const nextStatus = input.status
    if (campaign.status === nextStatus) {
      throw new AdminAdPartnershipServiceError(409, 'Campanha ja esta nesse estado.')
    }

    if (nextStatus === 'active') {
      const nowMs = Date.now()
      if (campaign.startAt && campaign.startAt.getTime() > nowMs) {
        throw new AdminAdPartnershipServiceError(409, 'Campanha ainda nao atingiu startAt.')
      }
      if (campaign.endAt && campaign.endAt.getTime() <= nowMs) {
        throw new AdminAdPartnershipServiceError(409, 'Campanha ja expirou (endAt).')
      }
      const campaignAdType = campaign.adType as AdPartnershipType
      const campaignVisibility = campaign.visibleTo as unknown as AdPartnershipVisibility[]
      campaign.disclosureLabel = resolveDisclosureLabel(campaignAdType, campaign.disclosureLabel)
      ensureDisclosureLabel(campaignAdType, campaign.disclosureLabel)
      ensureFinancialRelevance(campaignAdType, campaign.relevanceTags)
      ensureExternalAdsNoPremium(campaignAdType, campaignVisibility)

      const slots =
        campaign.slotIds.length > 0
          ? await AdSlotConfig.find({ slotId: { $in: campaign.slotIds } }).lean()
          : []
      const slotMap = new Map(slots.map((slot) => [slot.slotId, slot]))
      for (const slotId of campaign.slotIds) {
        if (!slotMap.has(slotId)) {
          throw new AdminAdPartnershipServiceError(404, `Slot ${slotId} nao encontrado.`)
        }
      }
      for (const slot of slots) {
        ensureSlotCompatibility(
          slot as unknown as SlotCompatibilityInput,
          campaignAdType,
          campaignVisibility,
          { requireActive: true }
        )
      }
      campaign.approvedAt = new Date()
      campaign.approvedBy = actorId
    }

    campaign.status = nextStatus
    campaign.updatedBy = actorId
    campaign.version += 1
    campaign.history.push({
      changedBy: actorId,
      reason,
      note: toStringOrNull(input.note),
      changedAt: new Date(),
      snapshot: {
        status: campaign.status,
        startAt: campaign.startAt ?? null,
        endAt: campaign.endAt ?? null,
        priority: campaign.priority,
        visibleTo: [...campaign.visibleTo],
        slotIds: [...campaign.slotIds],
      },
    })

    await campaign.save()
    await campaign.populate('brand', 'name slug brandType isActive')
    await campaign.populate('directoryEntry', 'name slug verticalType status isActive')
    await campaign.populate('approvedBy', 'name username email role')
    await campaign.populate('createdBy', 'name username email role')
    await campaign.populate('updatedBy', 'name username email role')
    return campaign.toObject()
  }

  async getInventoryOverview() {
    const now = new Date()
    const [slotRows, campaignRows, activeCampaignRows] = await Promise.all([
      AdSlotConfig.aggregate<{ _id: string; total: number; active: number }>([
        {
          $group: {
            _id: '$surface',
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0],
              },
            },
          },
        },
      ]),
      AdCampaign.aggregate<{ _id: string; total: number; active: number; paused: number }>([
        {
          $group: {
            _id: '$adType',
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
              },
            },
            paused: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paused'] }, 1, 0],
              },
            },
          },
        },
      ]),
      AdCampaign.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            status: 'active',
            $and: [
              { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
              { $or: [{ endAt: null }, { endAt: { $gt: now } }] },
            ],
          },
        },
        { $unwind: '$surfaces' },
        { $group: { _id: '$surfaces', count: { $sum: 1 } } },
      ]),
    ])

    return {
      slotsBySurface: slotRows,
      campaignsByType: campaignRows,
      activeCampaignsBySurface: activeCampaignRows,
      generatedAt: new Date().toISOString(),
    }
  }
}

export const adminAdPartnershipService = new AdminAdPartnershipService()
