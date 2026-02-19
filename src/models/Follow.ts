import mongoose, { Document, Schema } from 'mongoose'

/**
 * Follow - Sistema de seguir creators
 */
export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId // User que está a seguir
  following: mongoose.Types.ObjectId // Creator que está a ser seguido
  createdAt: Date
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Índices compostos
FollowSchema.index({ follower: 1, following: 1 }, { unique: true })
FollowSchema.index({ following: 1, createdAt: -1 })
FollowSchema.index({ follower: 1, createdAt: -1 })

export const Follow = mongoose.model<IFollow>('Follow', FollowSchema)
