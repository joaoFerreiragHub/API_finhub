import mongoose, { Document, Schema } from 'mongoose'

export type CommunityVoteTargetType = 'post' | 'reply'
export type CommunityVoteDirection = 'up' | 'down'

export interface ICommunityVote extends Document {
  user: mongoose.Types.ObjectId
  targetType: CommunityVoteTargetType
  targetId: mongoose.Types.ObjectId
  direction: CommunityVoteDirection
  createdAt: Date
  updatedAt: Date
}

const CommunityVoteSchema = new Schema<ICommunityVote>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'reply'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['up', 'down'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

CommunityVoteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true })
CommunityVoteSchema.index({ targetType: 1, targetId: 1, direction: 1 })

export const CommunityVote = mongoose.model<ICommunityVote>('CommunityVote', CommunityVoteSchema)
