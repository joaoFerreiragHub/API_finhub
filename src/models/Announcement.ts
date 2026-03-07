import mongoose, { Document, Schema } from 'mongoose'

export type AnnouncementType = 'inline' | 'popup'
export type AnnouncementScope = 'creator' | 'platform'

export interface IAnnouncement extends Document {
  title: string
  body: string
  creator: mongoose.Types.ObjectId
  type: AnnouncementType
  scope: AnnouncementScope
  imageUrl?: string | null
  isVisible: boolean
  expiresAt?: Date | null
  publishedAt: Date
  createdAt: Date
  updatedAt: Date
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['inline', 'popup'],
      default: 'inline',
      index: true,
    },
    scope: {
      type: String,
      enum: ['creator', 'platform'],
      default: 'creator',
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

AnnouncementSchema.index({ creator: 1, publishedAt: -1 })
AnnouncementSchema.index({ scope: 1, isVisible: 1, publishedAt: -1 })

AnnouncementSchema.pre('validate', function (this: IAnnouncement, next) {
  if (!this.publishedAt) {
    this.publishedAt = new Date()
  }

  if (this.expiresAt && this.expiresAt <= this.publishedAt) {
    return next(new Error('expiresAt deve ser posterior a publishedAt'))
  }

  return next()
})

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema)
