import mongoose from 'mongoose'
import { AdCampaign, AdCampaignStatus } from '../models/AdCampaign'
import { AdDeliveryEvent } from '../models/AdDeliveryEvent'
import { DirectoryEntry } from '../models/DirectoryEntry'

const DEFAULT_WINDOW_DAYS = 30
const MIN_WINDOW_DAYS = 1
const MAX_WINDOW_DAYS = 90

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
  async getOverview(ownerUserId: string, windowDaysInput?: number) {
    if (!mongoose.Types.ObjectId.isValid(ownerUserId)) {
      throw new BrandPortalServiceError(400, 'Utilizador invalido.')
    }

    const ownerObjectId = new mongoose.Types.ObjectId(ownerUserId)
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
          byStatus: CAMPAIGN_STATUSES.reduce(
            (acc, status) => ({ ...acc, [status]: 0 }),
            {} as Record<AdCampaignStatus, number>
          ),
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
    }, {} as Record<AdCampaignStatus, number>)

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

