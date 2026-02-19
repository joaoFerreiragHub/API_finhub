import mongoose, { Document, Schema } from 'mongoose'

export type FavoriteTargetType = 'article' | 'video' | 'course' | 'live' | 'podcast' | 'book'

/**
 * Favorite - Sistema de favoritos para conteúdos
 */
export interface IFavorite extends Document {
  user: mongoose.Types.ObjectId
  targetType: FavoriteTargetType
  targetId: mongoose.Types.ObjectId
  createdAt: Date
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book'],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Índices compostos
FavoriteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true })
FavoriteSchema.index({ targetType: 1, targetId: 1 })
FavoriteSchema.index({ user: 1, createdAt: -1 })

export const Favorite = mongoose.model<IFavorite>('Favorite', FavoriteSchema)
