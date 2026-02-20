import mongoose, { Document, Schema } from 'mongoose'
import { ContentModerationStatus, ContentType } from './BaseContent'

export type ContentModerationAction = 'hide' | 'unhide' | 'restrict'

export interface IContentModerationEvent extends Document {
  contentType: ContentType
  contentId: string
  actor: mongoose.Types.ObjectId
  action: ContentModerationAction
  fromStatus: ContentModerationStatus
  toStatus: ContentModerationStatus
  reason: string
  note?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

const ContentModerationEventSchema = new Schema<IContentModerationEvent>(
  {
    contentType: {
      type: String,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book'],
      required: true,
      index: true,
    },
    contentId: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['hide', 'unhide', 'restrict'],
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      enum: ['visible', 'hidden', 'restricted'],
      required: true,
    },
    toStatus: {
      type: String,
      enum: ['visible', 'hidden', 'restricted'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    note: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

ContentModerationEventSchema.index({ createdAt: -1 })
ContentModerationEventSchema.index({ contentType: 1, contentId: 1, createdAt: -1 })
ContentModerationEventSchema.index({ actor: 1, createdAt: -1 })
ContentModerationEventSchema.index({ action: 1, createdAt: -1 })

export const ContentModerationEvent = mongoose.model<IContentModerationEvent>(
  'ContentModerationEvent',
  ContentModerationEventSchema
)
