import { Follow } from '../models/Follow'
import { NotificationType } from '../models/Notification'
import { notificationService } from '../services/notification.service'
import { resolveTargetMetadata } from '../services/social/targetMetadata.service'
import { userPreferenceService } from '../services/userPreference.service'
import { logError, logInfo } from '../utils/logger'
import {
  ContentInteractionEvent,
  ContentPublishedEvent,
  FollowCreatedEvent,
  socialEventBus,
} from './socialEvents'

const notificationTypeByInteraction: Record<ContentInteractionEvent['interactionType'], NotificationType> = {
  favorite: 'like',
  rating: 'rating',
  comment: 'comment',
  reply: 'reply',
}

let handlersRegistered = false

const shouldNotify = async (userId: string, type: NotificationType) => {
  try {
    return await userPreferenceService.canReceiveNotification(userId, type)
  } catch (error) {
    logError('notification_preference_check_failed', error, { userId, type })
    return true
  }
}

const handleFollowCreated = async (event: FollowCreatedEvent) => {
  if (event.followerId === event.followingId) {
    return
  }

  const canNotify = await shouldNotify(event.followingId, 'follow')
  if (canNotify) {
    await notificationService.notifyFollow(event.followingId, event.followerId)
  }

  await userPreferenceService.trackInteraction({
    userId: event.followerId,
    interactionType: 'follow',
    targetType: 'creator',
    targetId: event.followingId,
    weight: 2,
  })
}

const handleContentInteraction = async (event: ContentInteractionEvent) => {
  const notificationType = notificationTypeByInteraction[event.interactionType]
  const metadata = await resolveTargetMetadata(event.targetType, event.targetId)

  await userPreferenceService.trackInteraction({
    userId: event.actorId,
    interactionType: event.interactionType,
    targetType: event.targetType,
    targetId: event.targetId,
    tags: metadata.tags,
    weight: event.interactionType === 'rating' ? 2 : 1,
  })

  if (!metadata.ownerId || metadata.ownerId === event.actorId) {
    return
  }

  const canNotify = await shouldNotify(metadata.ownerId, notificationType)
  if (!canNotify) {
    return
  }

  if (event.interactionType === 'rating') {
    await notificationService.notifyRating(
      metadata.ownerId,
      event.actorId,
      event.targetType,
      event.targetId,
      event.ratingValue ?? 0
    )
    return
  }

  if (event.interactionType === 'comment') {
    await notificationService.notifyComment(
      metadata.ownerId,
      event.actorId,
      event.targetType,
      event.targetId
    )
    return
  }

  if (event.interactionType === 'reply') {
    await notificationService.notifyReply(metadata.ownerId, event.actorId, event.targetId)
    return
  }

  await notificationService.notifyLike(metadata.ownerId, event.actorId, event.targetType, event.targetId)
}

const handleContentPublished = async (event: ContentPublishedEvent) => {
  const followers = await Follow.find({ following: event.creatorId }).select('follower').lean()
  if (followers.length === 0) {
    return
  }

  const notifications = []
  for (const follow of followers) {
    const followerId = String(follow.follower)
    if (followerId === event.creatorId) {
      continue
    }

    const canNotify = await userPreferenceService.canReceiveCreatorContentNotification(
      followerId,
      event.creatorId
    )
    if (!canNotify) {
      continue
    }

    notifications.push({
      user: followerId,
      type: 'content_published' as NotificationType,
      triggeredBy: event.creatorId,
      targetType: event.contentType,
      targetId: event.contentId,
      message: event.title ? `Novo conteudo publicado: ${event.title}` : undefined,
    })
  }

  if (notifications.length > 0) {
    await notificationService.bulkCreate(notifications)
  }
}

export const registerSocialEventHandlers = () => {
  if (handlersRegistered) {
    return
  }

  handlersRegistered = true

  socialEventBus.on('social.follow.created', (event: FollowCreatedEvent) => {
    handleFollowCreated(event).catch((error) => {
      logError('social_follow_event_failed', error, { event })
    })
  })

  socialEventBus.on('social.content.interaction', (event: ContentInteractionEvent) => {
    handleContentInteraction(event).catch((error) => {
      logError('social_interaction_event_failed', error, { event })
    })
  })

  socialEventBus.on('social.content.published', (event: ContentPublishedEvent) => {
    handleContentPublished(event).catch((error) => {
      logError('social_content_published_event_failed', error, { event })
    })
  })

  logInfo('social_event_handlers_registered')
}
