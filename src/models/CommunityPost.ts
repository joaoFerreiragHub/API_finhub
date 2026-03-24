import mongoose, { Document, Schema } from 'mongoose'
import { ContentModerationStatus } from './BaseContent'

export interface ICommunityHubContentRef {
  contentType: string
  contentId: mongoose.Types.ObjectId
}

export interface ICommunityPost extends Document {
  room: mongoose.Types.ObjectId
  author: mongoose.Types.ObjectId
  title: string
  content: string
  imageUrl?: string | null
  upvotes: number
  downvotes: number
  replyCount: number
  isPinned: boolean
  isLocked: boolean
  moderationStatus: ContentModerationStatus
  hubContentRef?: ICommunityHubContentRef | null
  createdAt: Date
  updatedAt: Date
}

const CommunityHubContentRefSchema = new Schema<ICommunityHubContentRef>(
  {
    contentType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    _id: false,
  }
)

const CommunityPostSchema = new Schema<ICommunityPost>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityRoom',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 10000,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2048,
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
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    moderationStatus: {
      type: String,
      enum: ['visible', 'hidden', 'restricted'],
      default: 'visible',
      index: true,
    },
    hubContentRef: {
      type: CommunityHubContentRefSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

CommunityPostSchema.index({ room: 1 })
CommunityPostSchema.index({ author: 1 })
CommunityPostSchema.index({ createdAt: -1 })
CommunityPostSchema.index({ room: 1, createdAt: -1 })
CommunityPostSchema.index({ room: 1, upvotes: -1, createdAt: -1 })

export const CommunityPost = mongoose.model<ICommunityPost>('CommunityPost', CommunityPostSchema)
