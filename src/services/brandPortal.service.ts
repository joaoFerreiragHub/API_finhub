import mongoose from 'mongoose'
import { AdCampaign, AdCampaignStatus } from '../models/AdCampaign'
import { AdDeliveryEvent } from '../models/AdDeliveryEvent'
import { DirectoryEntry } from '../models/DirectoryEntry'
import {
  AdPartnershipCampaignStatus,
  AdPartnershipType,
  adminAdPartnershipService,
} from './adminAdPartnership.service'
import { resolvePagination } from '../utils/pagination'

const DEFAULT_WINDOW_DAYS = 30
const MIN_WINDOW_DAYS = 1
const MAX_WINDOW_DAYS = 90
const DEFAULT_REASON_CREATE_CAMPAIGN = 'Criacao de campanha via portal de marca.'
const DEFAULT_REASON_UPDATE_CAMPAIGN = 'Atualizacao de campanha via portal de marca.'
const DEFAULT_REASON_SUBMIT_APPROVAL = 'Submissao de campanha para aprovacao via portal de marca.'
const DEFAULT_CAMPAIGN_PAGE = 1
const DEFAULT_CAMPAIGN_LIMIT = 20
const MAX_CAMPAIGN_LIMIT = 100

const CAMPAIGN_STATUSES: ReadonlyArray<AdCampaignStatus> = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'completed',
  'rejected',
  'archived',
]

type CampaignMetrics = {
  impressions: number
  clicks: number
  conversions: number
}

type OwnedDirectorySummary = {
  id: string
  name: string
  slug: string
  verticalType: string
  status: string
  verificationStatus: string
  isActive: boolean
}

type CampaignListFilters = {
  status?: AdPartnershipCampaignStatus
  adType?: AdPartnershipType
  surface?: string
  search?: string
}

type CampaignListOptions = {
  page?: number
  limit?: number
}

type DeliveryTimelineItem = {
  _id: string
  serves: number
  impressions: number
  clicks: number
}

const toSafeNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return value
}

const clampWindowDays = (value?: number): number => {
  if (!value || !Number.isFinite(value)) return DEFAULT_WINDOW_DAYS
  return Math.max(MIN_WINDOW_DAYS, Math.min(MAX_WINDOW_DAYS, Math.floor(value)))
}

const computeCtr = (clicks: number, impressions: number): number => {
  if (impressions <= 0) return 0
  return Number(((clicks / impressions) * 100).toFixed(2))
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const extractDirectoryEntryIdFromCampaign = (campaign: any): string | null => {
  const raw = campaign?.directoryEntry
  if (!raw) return null
  if (raw instanceof mongoose.Types.ObjectId) return String(raw)
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    const id = (raw as { _id?: unknown })._id
    return id ? String(id) : null
  }
  return null
}

const createEmptyCampaignStatusSummary = (): Record<AdCampaignStatus, number> =>
  CAMPAIGN_STATUSES.reduce((acc, status) => {
    acc[status] = 0
    return acc
  }, {} as Record<AdCampaignStatus, number>)

const mapOwnedDirectorySummary = (entry: any): OwnedDirectorySummary => ({
  id: String(entry._id),
  name: entry.name,
  slug: entry.slug,
  verticalType: entry.verticalType,
  status: entry.status,
  verificationStatus: entry.verificationStatus,
  isActive: Boolean(entry.isActive),
})

const isCampaignLiveNow = (campaign: {
  status?: string
  startAt?: Date | null
  endAt?: Date | null
}): boolean => {
  if (campaign.status !== 'active') return false
  const nowTs = Date.now()
  const startTs = campaign.startAt instanceof Date ? campaign.startAt.getTime() : null
  const endTs = campaign.endAt instanceof Date ? campaign.endAt.getTime() : null
  if (startTs !== null && startTs > nowTs) return false
  if (endTs !== null && endTs <= nowTs) return false
  return true
}

export class BrandPortalServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class BrandPortalService {
  private toOwnerObjectId(ownerUserId: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(ownerUserId)) {
      throw new BrandPortalServiceError(400, 'Utilizador invalido.')
    }
    return new mongoose.Types.ObjectId(ownerUserId)
  }

  private toDirectoryEntryObjectId(directoryEntryId: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(directoryEntryId)) {
      throw new BrandPortalServiceError(400, 'directoryEntryId invalido.')
    }
    return new mongoose.Types.ObjectId(directoryEntryId)
  }

  private async assertOwnedDirectoryEntry(
    ownerObjectId: mongoose.Types.ObjectId,
    directoryEntryIdRaw: string
  ): Promise<mongoose.Types.ObjectId> {
    const directoryEntryId = this.toDirectoryEntryObjectId(directoryEntryIdRaw)
    const isOwned = await DirectoryEntry.exists({
      _id: directoryEntryId,
      ownerUser: ownerObjectId,
    })
    if (!isOwned) {
      throw new BrandPortalServiceError(
        403,
        'Sem permissao para gerir campanhas deste DirectoryEntry.'
      )
    }
    return directoryEntryId
  }

  private async assertOwnedCampaign(ownerObjectId: mongoose.Types.ObjectId, campaignId: string) {
    const campaign = await adminAdPartnershipService.getCampaign(campaignId)
    const directoryEntryId = extractDirectoryEntryIdFromCampaign(campaign)
    if (!directoryEntryId) {
      throw new BrandPortalServiceError(403, 'Campanha sem DirectoryEntry associado.')
    }
    await this.assertOwnedDirectoryEntry(ownerObjectId, directoryEntryId)
    return campaign
  }

  async listOwnedDirectories(ownerUserId: string) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const entries = await DirectoryEntry.find({ ownerUser: ownerObjectId })
      .select('name slug verticalType status verificationStatus isActive updatedAt')
      .sort({ updatedAt: -1, name: 1 })
      .lean()

    return {
      total: entries.length,
      items: entries.map(mapOwnedDirectorySummary),
    }
  }

  async listOwnedCampaigns(
    ownerUserId: string,
    filters: CampaignListFilters = {},
    options: CampaignListOptions = {}
  ) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const ownedEntries = await DirectoryEntry.find({ ownerUser: ownerObjectId })
      .select('name slug verticalType status verificationStatus isActive')
      .sort({ updatedAt: -1, name: 1 })
      .lean()

    const { page, limit } = resolvePagination(options, {
      defaultPage: DEFAULT_CAMPAIGN_PAGE,
      defaultLimit: DEFAULT_CAMPAIGN_LIMIT,
      maxLimit: MAX_CAMPAIGN_LIMIT,
    })

    if (ownedEntries.length === 0) {
      return {
        items: [],
        ownership: {
          totalEntries: 0,
          entries: [],
        },
        pagination: {
          page,
          limit,
          total: 0,
          pages: 1,
        },
      }
    }

    const ownedEntryIds = ownedEntries.map((entry) => String(entry._id))

    const result = await adminAdPartnershipService.listCampaigns(
      {
        status: filters.status,
        adType: filters.adType,
        surface: filters.surface,
        search: filters.search,
        sponsorType: 'brand',
        directoryEntryIds: ownedEntryIds,
      },
      {
        page,
        limit,
      }
    )

    return {
      ...result,
      ownership: {
        totalEntries: ownedEntries.length,
        entries: ownedEntries.map(mapOwnedDirectorySummary),
      },
    }
  }

  async getOwnedCampaign(ownerUserId: string, campaignId: string) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    return this.assertOwnedCampaign(ownerObjectId, campaignId)
  }

  async createOwnedCampaign(ownerUserId: string, input: Record<string, unknown>) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const directoryEntryIdRaw = toOptionalString(input.directoryEntryId)
    if (!directoryEntryIdRaw) {
      throw new BrandPortalServiceError(400, 'directoryEntryId obrigatorio.')
    }
    await this.assertOwnedDirectoryEntry(ownerObjectId, directoryEntryIdRaw)

    const reason = toOptionalString(input.reason) ?? DEFAULT_REASON_CREATE_CAMPAIGN
    const note = toOptionalString(input.note) ?? undefined

    return adminAdPartnershipService.createCampaign({
      actorId: ownerUserId,
      code: input.code,
      title: input.title,
      description: input.description,
      adType: input.adType,
      sponsorType: 'brand',
      directoryEntryId: directoryEntryIdRaw,
      surfaces: input.surfaces,
      slotIds: input.slotIds,
      visibleTo: input.visibleTo,
      priority: input.priority,
      startAt: input.startAt,
      endAt: input.endAt,
      headline: input.headline,
      disclosureLabel: input.disclosureLabel,
      body: input.body,
      ctaText: input.ctaText,
      ctaUrl: input.ctaUrl,
      imageUrl: input.imageUrl,
      relevanceTags: input.relevanceTags,
      estimatedMonthlyBudget: input.estimatedMonthlyBudget,
      currency: input.currency,
      status: 'draft',
      reason,
      note,
    })
  }

  async updateOwnedCampaign(ownerUserId: string, campaignId: string, input: Record<string, unknown>) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    await this.assertOwnedCampaign(ownerObjectId, campaignId)

    const patch = isRecord(input.patch) ? input.patch : {}
    const disallowedFields = ['status', 'sponsorType', 'brandId', 'approvedAt', 'approvedBy']
    for (const field of disallowedFields) {
      if (field in patch) {
        throw new BrandPortalServiceError(
          400,
          `Campo ${field} nao permitido no portal de marca.`
        )
      }
    }

    if ('directoryEntryId' in patch) {
      const targetDirectoryEntryId = toOptionalString(patch.directoryEntryId)
      if (!targetDirectoryEntryId) {
        throw new BrandPortalServiceError(400, 'directoryEntryId invalido.')
      }
      await this.assertOwnedDirectoryEntry(ownerObjectId, targetDirectoryEntryId)
    }

    const allowedFields = [
      'title',
      'description',
      'adType',
      'directoryEntryId',
      'surfaces',
      'slotIds',
      'visibleTo',
      'priority',
      'startAt',
      'endAt',
      'headline',
      'disclosureLabel',
      'body',
      'ctaText',
      'ctaUrl',
      'imageUrl',
      'relevanceTags',
      'estimatedMonthlyBudget',
      'currency',
    ]

    const sanitizedPatch: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in patch) {
        sanitizedPatch[field] = patch[field]
      }
    }

    if (Object.keys(sanitizedPatch).length === 0) {
      throw new BrandPortalServiceError(400, 'Patch sem campos atualizaveis.')
    }

    const reason = toOptionalString(input.reason) ?? DEFAULT_REASON_UPDATE_CAMPAIGN
    const note = toOptionalString(input.note) ?? undefined

    return adminAdPartnershipService.updateCampaign({
      actorId: ownerUserId,
      campaignId,
      patch: sanitizedPatch,
      reason,
      note,
    })
  }

  async submitOwnedCampaignForApproval(
    ownerUserId: string,
    campaignId: string,
    input: Record<string, unknown> = {}
  ) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    await this.assertOwnedCampaign(ownerObjectId, campaignId)

    const reason = toOptionalString(input.reason) ?? DEFAULT_REASON_SUBMIT_APPROVAL
    const note = toOptionalString(input.note) ?? undefined

    return adminAdPartnershipService.setCampaignStatus({
      actorId: ownerUserId,
      campaignId,
      status: 'pending_approval',
      reason,
      note,
    })
  }

  async getOwnedCampaignMetrics(ownerUserId: string, campaignId: string, daysInput?: number) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    await this.assertOwnedCampaign(ownerObjectId, campaignId)
    return adminAdPartnershipService.getCampaignMetrics({
      campaignId,
      days: daysInput,
    })
  }

  async getOverview(ownerUserId: string, windowDaysInput?: number) {
    const ownerObjectId = this.toOwnerObjectId(ownerUserId)
    const windowDays = clampWindowDays(windowDaysInput)
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    const windowEnd = new Date()

    const ownedEntries = await DirectoryEntry.find({
      ownerUser: ownerObjectId,
      isActive: true,
    })
      .select(
        'name slug verticalType verificationStatus status isFeatured showInDirectory showInHomeSection updatedAt'
      )
      .sort({ updatedAt: -1, name: 1 })
      .lean()

    if (ownedEntries.length === 0) {
      return {
        ownerUserId,
        windowDays,
        ownership: {
          totalEntries: 0,
          entries: [],
        },
        campaigns: {
          total: 0,
          byStatus: createEmptyCampaignStatusSummary(),
          liveNow: [],
          totals: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
          },
        },
        delivery: {
          from: windowStart.toISOString(),
          to: windowEnd.toISOString(),
          totals: {
            serves: 0,
            impressions: 0,
            clicks: 0,
            ctr: 0,
          },
          timeline: [],
        },
      }
    }

    const ownedEntryIds = ownedEntries.map((entry) => entry._id)
    const ownedEntryById = new Map(ownedEntries.map((entry) => [String(entry._id), entry]))

    const campaigns = await AdCampaign.find({
      sponsorType: 'brand',
      directoryEntry: { $in: ownedEntryIds },
    })
      .select('code title status adType directoryEntry startAt endAt priority metrics updatedAt')
      .sort({ updatedAt: -1 })
      .lean()

    const byStatus = CAMPAIGN_STATUSES.reduce((acc, status) => {
      acc[status] = 0
      return acc
    }, createEmptyCampaignStatusSummary())

    let totalMetrics: CampaignMetrics = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
    }

    for (const campaign of campaigns) {
      const status = campaign.status as AdCampaignStatus
      if (status in byStatus) {
        byStatus[status] += 1
      }

      totalMetrics = {
        impressions: totalMetrics.impressions + toSafeNumber(campaign.metrics?.impressions),
        clicks: totalMetrics.clicks + toSafeNumber(campaign.metrics?.clicks),
        conversions: totalMetrics.conversions + toSafeNumber(campaign.metrics?.conversions),
      }
    }

    const liveNow = campaigns
      .filter((campaign) => isCampaignLiveNow(campaign))
      .slice(0, 12)
      .map((campaign) => {
        const directoryEntryId = campaign.directoryEntry ? String(campaign.directoryEntry) : null
        const directoryEntry = directoryEntryId ? ownedEntryById.get(directoryEntryId) : null

        return {
          id: String(campaign._id),
          code: campaign.code,
          title: campaign.title,
          adType: campaign.adType,
          priority: toSafeNumber(campaign.priority),
          startAt: campaign.startAt ?? null,
          endAt: campaign.endAt ?? null,
          metrics: {
            impressions: toSafeNumber(campaign.metrics?.impressions),
            clicks: toSafeNumber(campaign.metrics?.clicks),
            conversions: toSafeNumber(campaign.metrics?.conversions),
            ctr: computeCtr(
              toSafeNumber(campaign.metrics?.clicks),
              toSafeNumber(campaign.metrics?.impressions)
            ),
          },
          directoryEntry: directoryEntry
            ? {
                id: String(directoryEntry._id),
                name: directoryEntry.name,
                slug: directoryEntry.slug,
                verticalType: directoryEntry.verticalType,
              }
            : null,
        }
      })

    const campaignIds = campaigns.map((campaign) => campaign._id)
    const timeline =
      campaignIds.length > 0
        ? await AdDeliveryEvent.aggregate<DeliveryTimelineItem>([
            {
              $match: {
                campaign: { $in: campaignIds },
                servedAt: { $gte: windowStart, $lte: windowEnd },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$servedAt',
                  },
                },
                serves: { $sum: 1 },
                impressions: { $sum: { $ifNull: ['$impressionCount', 0] } },
                clicks: { $sum: { $ifNull: ['$clickCount', 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ])
        : []

    const deliveryTotals = timeline.reduce(
      (acc, item) => ({
        serves: acc.serves + toSafeNumber(item.serves),
        impressions: acc.impressions + toSafeNumber(item.impressions),
        clicks: acc.clicks + toSafeNumber(item.clicks),
      }),
      {
        serves: 0,
        impressions: 0,
        clicks: 0,
      }
    )

    return {
      ownerUserId,
      windowDays,
      ownership: {
        totalEntries: ownedEntries.length,
        entries: ownedEntries.map((entry) => ({
          id: String(entry._id),
          name: entry.name,
          slug: entry.slug,
          verticalType: entry.verticalType,
          status: entry.status,
          verificationStatus: entry.verificationStatus,
          isFeatured: Boolean(entry.isFeatured),
          showInDirectory: Boolean(entry.showInDirectory),
          showInHomeSection: Boolean(entry.showInHomeSection),
          updatedAt: entry.updatedAt ?? null,
        })),
      },
      campaigns: {
        total: campaigns.length,
        byStatus,
        liveNow,
        totals: {
          impressions: totalMetrics.impressions,
          clicks: totalMetrics.clicks,
          conversions: totalMetrics.conversions,
          ctr: computeCtr(totalMetrics.clicks, totalMetrics.impressions),
        },
      },
      delivery: {
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
        totals: {
          ...deliveryTotals,
          ctr: computeCtr(deliveryTotals.clicks, deliveryTotals.impressions),
        },
        timeline: timeline.map((item) => ({
          date: item._id,
          serves: toSafeNumber(item.serves),
          impressions: toSafeNumber(item.impressions),
          clicks: toSafeNumber(item.clicks),
          ctr: computeCtr(toSafeNumber(item.clicks), toSafeNumber(item.impressions)),
        })),
      },
    }
  }
}

export const brandPortalService = new BrandPortalService()
