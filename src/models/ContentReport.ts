import mongoose, { Document, Schema } from 'mongoose'
import { ContentModerationAction, ModeratableContentType } from './ContentModerationEvent'

export type ContentReportReason =
  | 'spam'
  | 'abuse'
  | 'misinformation'
  | 'sexual'
  | 'violence'
  | 'hate'
  | 'scam'
  | 'copyright'
  | 'other'

export type ContentReportStatus = 'open' | 'reviewed' | 'dismissed'

export interface IContentReport extends Document {
  reporter: mongoose.Types.ObjectId
  contentType: ModeratableContentType
  contentId: string
  reason: ContentReportReason
  note?: string
  status: ContentReportStatus
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  resolutionAction?: ContentModerationAction | 'dismissed'
  createdAt: Date
  updatedAt: Date
}

const ContentReportSchema = new Schema<IContentReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    reason: {
      type: String,
      enum: ['spam', 'abuse', 'misinformation', 'sexual', 'violence', 'hate', 'scam', 'copyright', 'other'],
      required: true,
      index: true,
    },
    note: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed'],
      default: 'open',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    resolutionAction: {
      type: String,
      enum: ['hide', 'unhide', 'restrict', 'dismissed'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

ContentReportSchema.index({ reporter: 1, contentType: 1, contentId: 1 }, { unique: true })
ContentReportSchema.index({ status: 1, createdAt: -1 })
ContentReportSchema.index({ contentType: 1, contentId: 1, status: 1, createdAt: -1 })
ContentReportSchema.index({ reason: 1, status: 1, createdAt: -1 })

export const ContentReport = mongoose.model<IContentReport>('ContentReport', ContentReportSchema)
