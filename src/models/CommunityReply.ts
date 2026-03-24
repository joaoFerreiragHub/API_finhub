import mongoose, { Document, Schema } from 'mongoose'
import { ContentModerationStatus } from './BaseContent'

export interface ICommunityReply extends Document {
  post: mongoose.Types.ObjectId
  parentReply?: mongoose.Types.ObjectId | null
  author: mongoose.Types.ObjectId
  content: string
  upvotes: number
  downvotes: number
  isMarkedHelpful: boolean
  moderationStatus: ContentModerationStatus
  createdAt: Date
  updatedAt: Date
}

const CommunityReplySchema = new Schema<ICommunityReply>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityPost',
      required: true,
      index: true,
    },
    parentReply: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityReply',
      default: null,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    isMarkedHelpful: {
      type: Boolean,
      default: false,
    },
    moderationStatus: {
      type: String,
      enum: ['visible', 'hidden', 'restricted'],
      default: 'visible',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

CommunityReplySchema.index({ post: 1 })
CommunityReplySchema.index({ author: 1 })
CommunityReplySchema.index({ createdAt: -1 })
CommunityReplySchema.index({ post: 1, createdAt: 1 })
CommunityReplySchema.index({ post: 1, parentReply: 1, createdAt: 1 })

export const CommunityReply = mongoose.model<ICommunityReply>('CommunityReply', CommunityReplySchema)
