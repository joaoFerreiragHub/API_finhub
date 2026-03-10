import crypto from 'crypto'
import { FilterQuery } from 'mongoose'
import { AdCampaign } from '../models/AdCampaign'
import { AdDeliveryAudience, AdDeliveryDevice, AdDeliveryEvent } from '../models/AdDeliveryEvent'
import { AdSlotConfig } from '../models/AdSlotConfig'

const AD_AUDIENCES: readonly AdDeliveryAudience[] = ['free', 'premium']
const AD_DEVICES: readonly AdDeliveryDevice[] = ['desktop', 'mobile', 'all']
const TOKEN_TTL_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.PUBLIC_ADS_TOKEN_TTL_SECONDS ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 60) return 6 * 60 * 60
  return Math.min(parsed, 7 * 24 * 60 * 60)
})()
const EVENT_RETENTION_DAYS = (() => {
  const parsed = Number.parseInt(process.env.PUBLIC_ADS_EVENT_RETENTION_DAYS ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 30
  return Math.min(parsed, 180)
})()
const SESSION_LOOKBACK_HOURS = (() => {
  const parsed = Number.parseInt(process.env.PUBLIC_ADS_SESSION_LOOKBACK_HOURS ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 24
  return Math.min(parsed, 168)
})()
const TOKEN_SECRET =
  (process.env.PUBLIC_ADS_TOKEN_SECRET ?? '').trim() ||
  (process.env.JWT_SECRET ?? '').trim() ||
  'finhub-public-ads-dev-secret'

type DeliveryTokenPayload = {
  campaignId: string
  slotId: string
  issuedAt: number
  expiresAt: number
  nonce: string
}

type ServeInput = {
  slot: string
  audience: AdDeliveryAudience
  device: AdDeliveryDevice
  sessionKey: string
  country?: string | null
  vertical?: string | null
}

type TrackInput = {
  token: string
}

export const isValidAdAudience = (value: unknown): value is AdDeliveryAudience =>
  typeof value === 'string' && AD_AUDIENCES.includes(value as AdDeliveryAudience)

export const isValidAdDevice = (value: unknown): value is AdDeliveryDevice =>
  typeof value === 'string' && AD_DEVICES.includes(value as AdDeliveryDevice)

const normalizeSlot = (value: string): string => value.trim().toUpperCase()
const normalizeOptionalText = (value?: string | null, max = 40): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, max)
}

const normalizeSessionKey = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return 'anon'
  return normalized.slice(0, 120)
}

const toTokenHash = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex')

const encodePayload = (payload: DeliveryTokenPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')

const decodePayload = (value: string): DeliveryTokenPayload => {
  const raw = Buffer.from(value, 'base64url').toString('utf8')
  const parsed = JSON.parse(raw) as Partial<DeliveryTokenPayload>
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof parsed.campaignId !== 'string' ||
    typeof parsed.slotId !== 'string' ||
    typeof parsed.issuedAt !== 'number' ||
    typeof parsed.expiresAt !== 'number' ||
    typeof parsed.nonce !== 'string'
  ) {
    throw new Error('invalid_payload')
  }
  return {
    campaignId: parsed.campaignId,
    slotId: parsed.slotId,
    issuedAt: parsed.issuedAt,
    expiresAt: parsed.expiresAt,
    nonce: parsed.nonce,
  }
}

const signEncodedPayload = (encodedPayload: string): string =>
  crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url')

const buildDeliveryToken = (payload: DeliveryTokenPayload): string => {
  const encodedPayload = encodePayload(payload)
  const signature = signEncodedPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

const verifyDeliveryToken = (token: string): DeliveryTokenPayload => {
  const [encodedPayload, receivedSignature, extra] = token.split('.')
  if (!encodedPayload || !receivedSignature || extra !== undefined) {
    throw new PublicAdsServiceError(400, 'Token de tracking invalido.')
  }

  const expectedSignature = signEncodedPayload(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const receivedBuffer = Buffer.from(receivedSignature)
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new PublicAdsServiceError(400, 'Assinatura de token invalida.')
  }

  let payload: DeliveryTokenPayload
  try {
    payload = decodePayload(encodedPayload)
  } catch {
    throw new PublicAdsServiceError(400, 'Payload do token invalido.')
  }

  if (payload.expiresAt * 1000 <= Date.now()) {
    throw new PublicAdsServiceError(410, 'Token de tracking expirado.')
  }

  return payload
}

const allowsAudience = (visibleTo: string[], audience: AdDeliveryAudience): boolean =>
  visibleTo.includes('all') || visibleTo.includes(audience)

const hasEligibleSessionFrequency = async (input: {
  slotId: string
  sessionKey: string
  maxPerSession: number
  minSecondsBetweenImpressions: number
}) => {
  const now = Date.now()
  const lookbackStart = new Date(now - SESSION_LOOKBACK_HOURS * 60 * 60 * 1000)

  if (input.maxPerSession > 0) {
    const impressionsCount = await AdDeliveryEvent.countDocuments({
      slotId: input.slotId,
      sessionKey: input.sessionKey,
      impressionAt: { $ne: null },
      servedAt: { $gte: lookbackStart },
    })

    if (impressionsCount >= input.maxPerSession) {
      return {
        allowed: false,
        reason: 'slot_session_limit_reached',
      } as const
    }
  }

  if (input.minSecondsBetweenImpressions > 0) {
    const lastImpression = await AdDeliveryEvent.findOne({
      slotId: input.slotId,
      sessionKey: input.sessionKey,
      impressionAt: { $ne: null },
    })
      .sort({ impressionAt: -1 })
      .select('impressionAt')
      .lean<{ impressionAt?: Date | null }>()

    const lastAt = lastImpression?.impressionAt
    if (lastAt instanceof Date) {
      const elapsedSeconds = Math.floor((now - lastAt.getTime()) / 1000)
      if (elapsedSeconds < input.minSecondsBetweenImpressions) {
        return {
          allowed: false,
          reason: 'slot_cooldown_active',
        } as const
      }
    }
  }

  return {
    allowed: true,
    reason: null,
  } as const
}

export class PublicAdsServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class PublicAdsService {
  async serveAd(inputRaw: ServeInput) {
    const slotId = normalizeSlot(inputRaw.slot)
    if (!slotId || !/^[A-Z0-9_-]{2,40}$/.test(slotId)) {
      throw new PublicAdsServiceError(400, 'Parametro slot invalido.')
    }

    const audience = inputRaw.audience
    if (!isValidAdAudience(audience)) {
      throw new PublicAdsServiceError(400, 'Parametro audience invalido.')
    }

    const device = inputRaw.device
    if (!isValidAdDevice(device)) {
      throw new PublicAdsServiceError(400, 'Parametro device invalido.')
    }

    const sessionKey = normalizeSessionKey(inputRaw.sessionKey)
    const country = normalizeOptionalText(inputRaw.country, 12)
    const vertical = normalizeOptionalText(inputRaw.vertical, 40)

    const slot = await AdSlotConfig.findOne({ slotId, isActive: true }).lean()
    if (!slot) {
      throw new PublicAdsServiceError(404, 'Slot de anuncios nao encontrado ou inativo.')
    }

    if (slot.device !== 'all' && slot.device !== device) {
      return {
        item: null,
        reason: 'slot_not_eligible_for_device',
      }
    }

    if (!allowsAudience(slot.visibleTo as string[], audience)) {
      return {
        item: null,
        reason: 'slot_not_visible_for_audience',
      }
    }

    const frequencyGuard = await hasEligibleSessionFrequency({
      slotId,
      sessionKey,
      maxPerSession: Number(slot.maxPerSession ?? 0),
      minSecondsBetweenImpressions: Number(slot.minSecondsBetweenImpressions ?? 0),
    })
    if (!frequencyGuard.allowed) {
      return {
        item: null,
        reason: frequencyGuard.reason,
      }
    }

    let allowedTypes = Array.isArray(slot.allowedTypes) ? [...slot.allowedTypes] : []
    if (audience === 'premium') {
      allowedTypes = allowedTypes.filter((type) => type !== 'external_ads')
    }

    if (allowedTypes.length === 0) {
      return {
        item: null,
        reason: 'slot_has_no_eligible_ad_type',
      }
    }

    const visibilityValues = audience === 'premium' ? ['all', 'premium'] : ['all', 'free']
    const now = new Date()
    const query: FilterQuery<any> = {
      status: 'active',
      adType: { $in: allowedTypes },
      visibleTo: { $in: visibilityValues },
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gt: now } }] },
        {
          $or: [{ slotIds: slotId }, { surfaces: slot.surface }],
        },
      ],
    }

    const candidates = await AdCampaign.find(query)
      .sort({ priority: 1, 'metrics.impressions': 1, updatedAt: -1 })
      .limit(25)
      .populate('directoryEntry', 'name slug logo verticalType status isActive')
      .lean<any[]>()

    const selected = candidates.find((campaign) => {
      if (campaign.sponsorType === 'brand') {
        return Boolean(campaign.directoryEntry)
      }
      return true
    })

    if (!selected) {
      return {
        item: null,
        reason: 'no_eligible_campaign',
      }
    }

    const issuedAt = Math.floor(Date.now() / 1000)
    const payload: DeliveryTokenPayload = {
      campaignId: String(selected._id),
      slotId,
      issuedAt,
      expiresAt: issuedAt + TOKEN_TTL_SECONDS,
      nonce: crypto.randomBytes(12).toString('hex'),
    }
    const token = buildDeliveryToken(payload)
    const tokenHash = toTokenHash(token)

    await AdDeliveryEvent.create({
      tokenHash,
      campaign: selected._id,
      slotId,
      surface: slot.surface,
      sessionKey,
      audience,
      device,
      country,
      vertical,
      servedAt: now,
      impressionAt: null,
      clickAt: null,
      impressionCount: 0,
      clickCount: 0,
      expiresAt: new Date(now.getTime() + EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    })

    const directoryEntry = selected.directoryEntry ?? null

    return {
      item: {
        campaignId: String(selected._id),
        code: selected.code,
        adType: selected.adType,
        disclosureLabel: selected.disclosureLabel ?? null,
        headline: selected.headline,
        body: selected.body ?? null,
        ctaText: selected.ctaText ?? null,
        ctaUrl: selected.ctaUrl ?? null,
        imageUrl: selected.imageUrl ?? null,
        slot: {
          slotId,
          surface: slot.surface,
          position: slot.position,
        },
        brand: directoryEntry
          ? {
              id: String(directoryEntry._id),
              name: directoryEntry.name,
              slug: directoryEntry.slug,
              logo: directoryEntry.logo ?? null,
              verticalType: directoryEntry.verticalType,
            }
          : null,
        impressionToken: token,
      },
      reason: null,
    }
  }

  async trackImpression(inputRaw: TrackInput) {
    const token = typeof inputRaw.token === 'string' ? inputRaw.token.trim() : ''
    if (!token) {
      throw new PublicAdsServiceError(400, 'Campo token obrigatorio.')
    }

    const payload = verifyDeliveryToken(token)
    const tokenHash = toTokenHash(token)
    const event = await AdDeliveryEvent.findOne({ tokenHash })
      .select('_id campaign impressionAt')
      .lean<{ _id: unknown; campaign: unknown; impressionAt?: Date | null }>()

    if (!event) {
      throw new PublicAdsServiceError(404, 'Evento de entrega nao encontrado para este token.')
    }

    if (event.impressionAt) {
      return {
        recorded: false,
        duplicate: true,
        campaignId: payload.campaignId,
      }
    }

    const now = new Date()
    const updateResult = await AdDeliveryEvent.updateOne(
      { _id: event._id, impressionAt: null },
      {
        $set: { impressionAt: now },
        $inc: { impressionCount: 1 },
      }
    )

    if (updateResult.modifiedCount === 0) {
      return {
        recorded: false,
        duplicate: true,
        campaignId: payload.campaignId,
      }
    }

    await AdCampaign.updateOne(
      { _id: event.campaign },
      {
        $inc: { 'metrics.impressions': 1 },
      }
    )

    return {
      recorded: true,
      duplicate: false,
      campaignId: payload.campaignId,
    }
  }

  async trackClick(inputRaw: TrackInput) {
    const token = typeof inputRaw.token === 'string' ? inputRaw.token.trim() : ''
    if (!token) {
      throw new PublicAdsServiceError(400, 'Campo token obrigatorio.')
    }

    const payload = verifyDeliveryToken(token)
    const tokenHash = toTokenHash(token)
    const event = await AdDeliveryEvent.findOne({ tokenHash })
      .select('_id campaign impressionAt clickAt')
      .lean<{ _id: unknown; campaign: unknown; impressionAt?: Date | null; clickAt?: Date | null }>()

    if (!event) {
      throw new PublicAdsServiceError(404, 'Evento de entrega nao encontrado para este token.')
    }

    if (event.clickAt) {
      return {
        recorded: false,
        duplicate: true,
        campaignId: payload.campaignId,
        inferredImpression: false,
      }
    }

    const now = new Date()
    const shouldInferImpression = !event.impressionAt
    const updateResult = await AdDeliveryEvent.updateOne(
      { _id: event._id, clickAt: null },
      {
        $set: {
          clickAt: now,
          ...(shouldInferImpression ? { impressionAt: now } : {}),
        },
        $inc: {
          clickCount: 1,
          ...(shouldInferImpression ? { impressionCount: 1 } : {}),
        },
      }
    )

    if (updateResult.modifiedCount === 0) {
      return {
        recorded: false,
        duplicate: true,
        campaignId: payload.campaignId,
        inferredImpression: false,
      }
    }

    await AdCampaign.updateOne(
      { _id: event.campaign },
      {
        $inc: {
          'metrics.clicks': 1,
          ...(shouldInferImpression ? { 'metrics.impressions': 1 } : {}),
        },
      }
    )

    return {
      recorded: true,
      duplicate: false,
      campaignId: payload.campaignId,
      inferredImpression: shouldInferImpression,
    }
  }
}

export const publicAdsService = new PublicAdsService()
