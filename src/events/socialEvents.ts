import { EventEmitter } from 'events'

export interface FollowCreatedEvent {
  type: 'social.follow.created'
  followerId: string
  followingId: string
  occurredAt: string
}

export interface ContentInteractionEvent {
  type: 'social.content.interaction'
  actorId: string
  interactionType: 'favorite' | 'rating' | 'comment' | 'reply'
  targetType: string
  targetId: string
  ratingValue?: number
  occurredAt: string
}

export interface ContentPublishedEvent {
  type: 'social.content.published'
  creatorId: string
  contentType: string
  contentId: string
  title?: string
  occurredAt: string
}

export type SocialEvent =
  | FollowCreatedEvent
  | ContentInteractionEvent
  | ContentPublishedEvent

class SocialEventBus extends EventEmitter {
  publish(event: SocialEvent) {
    this.emit(event.type, event)
  }
}

export const socialEventBus = new SocialEventBus()
