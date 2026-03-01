import mongoose, { Document, Schema } from 'mongoose'
import { ModeratableContentType } from './ContentModerationEvent'

export type ContentFalsePositiveSource = 'rollback' | 'manual_unhide'
export type ContentFalsePositiveCategory =
  | 'reports'
  | 'policy_auto_hide'
  | 'automated_detection'
  | 'manual_moderation'

export interface IContentFalsePositiveFeedback extends Document {
  contentType: ModeratableContentType
  contentId: string
  creatorId?: mongoose.Types.ObjectId | null
  actor: mongoose.Types.ObjectId
  eventId?: mongoose.Types.ObjectId | null
  source: ContentFalsePositiveSource
  categories: ContentFalsePositiveCategory[]
  reason: string
  note?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

const ContentFalsePositiveFeedbackSchema = new Schema<IContentFalsePositiveFeedback>(
  {
    contentType: {
      type: String,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book', 'comment', 'review'],
      required: true,
      index: true,
    },
    contentId: {
      type: String,
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentModerationEvent',
      default: null,
      index: true,
    },
    source: {
      type: String,
      enum: ['rollback', 'manual_unhide'],
      required: true,
      index: true,
    },
    categories: {
      type: [
        {
          type: String,
          enum: ['reports', 'policy_auto_hide', 'automated_detection', 'manual_moderation'],
        },
      ],
      default: [],
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

ContentFalsePositiveFeedbackSchema.index({ createdAt: -1 })
ContentFalsePositiveFeedbackSchema.index({ creatorId: 1, createdAt: -1 })
ContentFalsePositiveFeedbackSchema.index({ contentType: 1, contentId: 1, createdAt: -1 })
ContentFalsePositiveFeedbackSchema.index({ source: 1, createdAt: -1 })

export const ContentFalsePositiveFeedback = mongoose.model<IContentFalsePositiveFeedback>(
  'ContentFalsePositiveFeedback',
  ContentFalsePositiveFeedbackSchema
)
