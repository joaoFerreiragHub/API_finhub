import mongoose, { Document, Schema } from 'mongoose'
import { NotificationType } from './Notification'

export interface ITagAffinity {
  tag: string
  score: number
  updatedAt: Date
}

export type InteractionType =
  | 'follow'
  | 'favorite'
  | 'rating'
  | 'comment'
  | 'reply'
  | 'content_published'

export interface IInteractionSignal {
  interactionType: InteractionType
  targetType: string
  targetId: string
  weight: number
  createdAt: Date
}

export interface INotificationPreferences {
  follow: boolean
  comment: boolean
  reply: boolean
  rating: boolean
  like: boolean
  mention: boolean
  content_published: boolean
  content_moderated: boolean
}

export interface IUserPreferences extends Document {
  user: mongoose.Types.ObjectId
  notificationPreferences: INotificationPreferences
  tagAffinities: ITagAffinity[]
  interactionSignals: IInteractionSignal[]
  createdAt: Date
  updatedAt: Date
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    notificationPreferences: {
      follow: { type: Boolean, default: true },
      comment: { type: Boolean, default: true },
      reply: { type: Boolean, default: true },
      rating: { type: Boolean, default: true },
      like: { type: Boolean, default: true },
      mention: { type: Boolean, default: true },
      content_published: { type: Boolean, default: true },
      content_moderated: { type: Boolean, default: true },
    },
    tagAffinities: {
      type: [
        {
          tag: { type: String, required: true },
          score: { type: Number, required: true, default: 0 },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    interactionSignals: {
      type: [
        {
          interactionType: { type: String, required: true },
          targetType: { type: String, required: true },
          targetId: { type: String, required: true },
          weight: { type: Number, required: true, default: 1 },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

UserPreferencesSchema.index({ user: 1 }, { unique: true })
UserPreferencesSchema.index({ 'tagAffinities.tag': 1 })

export const notificationTypeToPreferenceKey: Record<
  NotificationType,
  keyof INotificationPreferences
> = {
  follow: 'follow',
  comment: 'comment',
  reply: 'reply',
  rating: 'rating',
  like: 'like',
  mention: 'mention',
  content_published: 'content_published',
  content_moderated: 'content_moderated',
}

export const UserPreferences = mongoose.model<IUserPreferences>(
  'UserPreferences',
  UserPreferencesSchema
)
