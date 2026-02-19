import { InteractionType, UserPreferences, notificationTypeToPreferenceKey } from '../models/UserPreferences'
import { NotificationType } from '../models/Notification'

const MAX_INTERACTION_HISTORY = 300
const DEFAULT_TAG_WEIGHT = 1

export interface TrackInteractionInput {
  userId: string
  interactionType: InteractionType
  targetType: string
  targetId: string
  tags?: string[]
  weight?: number
}

export class UserPreferenceService {
  async ensureUserPreferences(userId: string) {
    return UserPreferences.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { new: true, upsert: true }
    )
  }

  async canReceiveNotification(userId: string, type: NotificationType): Promise<boolean> {
    const preferences = await this.ensureUserPreferences(userId)
    const preferenceKey = notificationTypeToPreferenceKey[type]
    return preferences.notificationPreferences[preferenceKey]
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
