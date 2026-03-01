import mongoose, { Document, Schema } from 'mongoose'

export type NotificationType =
  | 'follow'
  | 'comment'
  | 'reply'
  | 'rating'
  | 'like'
  | 'mention'
  | 'content_published'
  | 'content_moderated'

/**
 * Notification - Sistema de notificacoes
 */
export interface INotification extends Document {
  user: mongoose.Types.ObjectId
  type: NotificationType
  triggeredBy?: mongoose.Types.ObjectId | null
  targetType?: string | null
  targetId?: mongoose.Types.ObjectId | null
  message?: string | null
  metadata?: Record<string, unknown> | null
  isRead: boolean
  readAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'follow',
        'comment',
        'reply',
        'rating',
        'like',
        'mention',
        'content_published',
        'content_moderated',
      ],
      index: true,
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetType: {
      type: String,
      default: null,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    message: {
      type: String,
      default: null,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })
NotificationSchema.index({ user: 1, type: 1 })
NotificationSchema.index({ createdAt: -1 })

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema)
