import {
  INotificationPreferences,
  InteractionType,
  UserPreferences,
  notificationTypeToPreferenceKey,
} from '../models/UserPreferences'
import { NotificationType } from '../models/Notification'
import {
  CreatorNotificationEventType,
  CreatorNotificationSubscription,
} from '../models/CreatorNotificationSubscription'
import { Follow } from '../models/Follow'
import { User } from '../models/User'

const MAX_INTERACTION_HISTORY = 300
const DEFAULT_TAG_WEIGHT = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export interface TrackInteractionInput {
  userId: string
  interactionType: InteractionType
  targetType: string
  targetId: string
  tags?: string[]
  weight?: number
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface CreatorSubscriptionSummary {
  creatorId: string
  eventType: CreatorNotificationEventType
  isSubscribed: boolean
  hasOverride: boolean
  followedAt?: string
  creator?: {
    id: string
    name?: string
    username?: string
    avatar?: string
  }
}

export interface SetCreatorSubscriptionResult extends CreatorSubscriptionSummary {
  updated: boolean
  created: boolean
}

type NotificationPreferencesUpdateInput = Partial<
  Record<keyof INotificationPreferences, boolean>
>

interface PopulatedCreator {
  _id?: string
  id?: string
  name?: string
  username?: string
  avatar?: string
}

interface FollowLeanRecord {
  following: unknown
  createdAt?: Date | string
}

export class UserPreferenceService {
  private readonly creatorEventType: CreatorNotificationEventType = 'content_published'

  private extractCreatorId(value: unknown): string {
    if (typeof value === 'string') {
      return value
    }

    if (value && typeof value === 'object') {
      const objectValue = value as { _id?: unknown; id?: unknown }
      if (objectValue._id) {
        return String(objectValue._id)
      }

      if (objectValue.id) {
        return String(objectValue.id)
      }
    }

    return ''
  }

  private getPagination(options: PaginationOptions = {}) {
    const page = Math.max(1, options.page || 1)
    const requestedLimit = options.limit || DEFAULT_PAGE_SIZE
    const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE)
    const skip = (page - 1) * limit

    return { page, limit, skip }
  }

  private normalizePreferenceUpdateInput(input: unknown): NotificationPreferencesUpdateInput {
    if (!input || typeof input !== 'object') {
      return {}
    }

    const value = input as Record<string, unknown>

    const normalized: NotificationPreferencesUpdateInput = {}
    const allowedKeys = Object.keys(notificationTypeToPreferenceKey) as Array<
      keyof INotificationPreferences
    >
    for (const key of allowedKeys) {
      const candidate = value[key]
      if (typeof candidate === 'boolean') {
        normalized[key] = candidate
      }
    }

    return normalized
  }

  async ensureUserPreferences(userId: string) {
    return UserPreferences.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { new: true, upsert: true }
    )
  }

  async getNotificationPreferences(userId: string): Promise<INotificationPreferences> {
    const preferences = await this.ensureUserPreferences(userId)
    return preferences.notificationPreferences
  }

  async updateNotificationPreferences(
    userId: string,
    input: unknown
  ): Promise<INotificationPreferences> {
    const update = this.normalizePreferenceUpdateInput(input)
    const updateEntries = Object.entries(update)

    if (updateEntries.length === 0) {
      const current = await this.ensureUserPreferences(userId)
      return current.notificationPreferences
    }

    const preferences = await this.ensureUserPreferences(userId)
    updateEntries.forEach(([key, value]) => {
      preferences.notificationPreferences[key as keyof INotificationPreferences] = Boolean(value)
    })

    await preferences.save()
    return preferences.notificationPreferences
  }

  async canReceiveNotification(userId: string, type: NotificationType): Promise<boolean> {
    const preferences = await this.ensureUserPreferences(userId)
    const preferenceKey = notificationTypeToPreferenceKey[type]
    return preferences.notificationPreferences[preferenceKey]
  }

  async canReceiveCreatorContentNotification(userId: string, creatorId: string): Promise<boolean> {
    const canReceiveByType = await this.canReceiveNotification(userId, 'content_published')
    if (!canReceiveByType) {
      return false
    }

    const override = await CreatorNotificationSubscription.findOne({
      user: userId,
      creator: creatorId,
      eventType: this.creatorEventType,
    }).select('isEnabled')

    if (!override) {
      return true
    }

    return override.isEnabled
  }

  async getCreatorSubscriptionStatus(
    userId: string,
    creatorId: string
  ): Promise<CreatorSubscriptionSummary & { isFollowing: boolean }> {
    const [creator, isFollowing, override] = await Promise.all([
      User.findById(creatorId).select('name username avatar'),
      Follow.findOne({ follower: userId, following: creatorId }).select('_id'),
      CreatorNotificationSubscription.findOne({
        user: userId,
        creator: creatorId,
        eventType: this.creatorEventType,
      }).select('isEnabled'),
    ])

    if (!creator) {
      throw new Error('Creator nao encontrado')
    }

    const hasOverride = override !== null
    const isSubscribed = isFollowing ? (override ? override.isEnabled : true) : false

    return {
      creatorId,
      eventType: this.creatorEventType,
      isSubscribed,
      hasOverride,
      isFollowing: isFollowing !== null,
      creator: {
        id: String(creator._id),
        name: creator.name,
        username: creator.username,
        avatar: creator.avatar ?? undefined,
      },
    }
  }

  async setCreatorSubscription(
    userId: string,
    creatorId: string,
    isSubscribed: boolean
  ): Promise<SetCreatorSubscriptionResult> {
    const [creator, isFollowing] = await Promise.all([
      User.findById(creatorId).select('_id name username avatar'),
      Follow.findOne({ follower: userId, following: creatorId }).select('_id'),
    ])

    if (!creator) {
      throw new Error('Creator nao encontrado')
    }

    if (!isFollowing) {
      throw new Error('Segue o creator antes de gerir subscriptions')
    }

    const existing = await CreatorNotificationSubscription.findOne({
      user: userId,
      creator: creatorId,
      eventType: this.creatorEventType,
    })

    if (!existing) {
      await CreatorNotificationSubscription.create({
        user: userId,
        creator: creatorId,
        eventType: this.creatorEventType,
        isEnabled: isSubscribed,
      })

      return {
        creatorId,
        eventType: this.creatorEventType,
        isSubscribed,
        hasOverride: true,
        updated: true,
        created: true,
        creator: {
          id: String(creator._id),
          name: creator.name,
          username: creator.username,
          avatar: creator.avatar ?? undefined,
        },
      }
    }

    if (existing.isEnabled === isSubscribed) {
      return {
        creatorId,
        eventType: this.creatorEventType,
        isSubscribed,
        hasOverride: true,
        updated: false,
        created: false,
        creator: {
          id: String(creator._id),
          name: creator.name,
          username: creator.username,
          avatar: creator.avatar ?? undefined,
        },
      }
    }

    existing.isEnabled = isSubscribed
    await existing.save()

    return {
      creatorId,
      eventType: this.creatorEventType,
      isSubscribed,
      hasOverride: true,
      updated: true,
      created: false,
      creator: {
        id: String(creator._id),
        name: creator.name,
        username: creator.username,
        avatar: creator.avatar ?? undefined,
      },
    }
  }

  async listCreatorSubscriptions(userId: string, options: PaginationOptions = {}) {
    const { page, limit, skip } = this.getPagination(options)

    const [follows, total] = await Promise.all([
      Follow.find({ follower: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('following', 'name username avatar')
        .lean(),
      Follow.countDocuments({ follower: userId }),
    ])

    const followRecords = follows as unknown as FollowLeanRecord[]
    const creatorIds = followRecords
      .map((followDoc) => this.extractCreatorId(followDoc.following))
      .filter((creatorId) => creatorId.length > 0)

    const overrides = await CreatorNotificationSubscription.find({
      user: userId,
      creator: { $in: creatorIds },
      eventType: this.creatorEventType,
    })
      .select('creator isEnabled')
      .lean()

    const overridesByCreator = new Map<string, boolean>()
    overrides.forEach((override) => {
      overridesByCreator.set(String(override.creator), Boolean(override.isEnabled))
    })

    const mappedItems = followRecords.map((followDoc): CreatorSubscriptionSummary | null => {
        const creator = followDoc.following as PopulatedCreator
        const creatorId = this.extractCreatorId(followDoc.following)
        if (!creatorId) {
          return null
        }

        const overrideValue = overridesByCreator.get(creatorId)
        const hasOverride = overrideValue !== undefined
        const followedAtIso = followDoc.createdAt
          ? new Date(followDoc.createdAt).toISOString()
          : undefined

        const summary: CreatorSubscriptionSummary = {
          creatorId,
          eventType: this.creatorEventType,
          isSubscribed: hasOverride ? Boolean(overrideValue) : true,
          hasOverride,
          creator: {
            id: creatorId,
            name: creator?.name,
            username: creator?.username,
            avatar: creator?.avatar,
          },
        }

        if (followedAtIso) {
          summary.followedAt = followedAtIso
        }

        return summary
      })

    const items = mappedItems.filter((item): item is CreatorSubscriptionSummary => item !== null)

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async trackInteraction(input: TrackInteractionInput) {
    const { userId, interactionType, targetType, targetId } = input
    const weight = input.weight ?? DEFAULT_TAG_WEIGHT
    const tags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : []

    const preferences = await this.ensureUserPreferences(userId)

    preferences.interactionSignals.push({
      interactionType,
      targetType,
      targetId,
      weight,
      createdAt: new Date(),
    })

    if (preferences.interactionSignals.length > MAX_INTERACTION_HISTORY) {
      preferences.interactionSignals = preferences.interactionSignals.slice(
        preferences.interactionSignals.length - MAX_INTERACTION_HISTORY
      )
    }

    for (const tag of tags) {
      const existingTag = preferences.tagAffinities.find((entry) => entry.tag === tag)
      if (existingTag) {
        existingTag.score += weight
        existingTag.updatedAt = new Date()
      } else {
        preferences.tagAffinities.push({
          tag,
          score: weight,
          updatedAt: new Date(),
        })
      }
    }

    await preferences.save()
  }
}

export const userPreferenceService = new UserPreferenceService()
