import mongoose, { Document, Schema } from 'mongoose'

export type RatingTargetType =
  | 'article'
  | 'video'
  | 'course'
  | 'live'
  | 'podcast'
  | 'book'
  | 'creator'
  | 'brand'

export type RatingReactionType = 'like' | 'dislike'

export interface IRatingReaction {
  user: mongoose.Types.ObjectId
  reaction: RatingReactionType
  createdAt: Date
}

/**
 * Rating - Sistema universal de avaliacoes
 * Funciona para: conteudos, creators e brands
 */
export interface IRating extends Document {
  user: mongoose.Types.ObjectId
  targetType: RatingTargetType
  targetId: mongoose.Types.ObjectId
  rating: number
  review?: string
  isVerifiedPurchase?: boolean

  // Review feedback
  likes: number
  dislikes: number
  reactions: IRatingReaction[]

  createdAt: Date
  updatedAt: Date
}

const RatingReactionSchema = new Schema<IRatingReaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reaction: {
      type: String,
      enum: ['like', 'dislike'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
)

const RatingSchema = new Schema<IRating>(
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
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book', 'creator', 'brand'],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reactions: {
      type: [RatingReactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
RatingSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true })
RatingSchema.index({ targetType: 1, targetId: 1 })
RatingSchema.index({ rating: -1 })
RatingSchema.index({ likes: -1, dislikes: 1 })

// Metodo estatico: Calcular media de ratings de um target
RatingSchema.statics.calculateAverage = async function (
  targetType: RatingTargetType,
  targetId: mongoose.Types.ObjectId
) {
  const result = await this.aggregate([
    {
      $match: { targetType, targetId },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        ratingsCount: { $sum: 1 },
      },
    },
  ])

  if (result.length === 0) {
    return { averageRating: 0, ratingsCount: 0 }
  }

  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    ratingsCount: result[0].ratingsCount,
  }
}

// Metodo estatico: Distribuicao de ratings
RatingSchema.statics.getDistribution = async function (
  targetType: RatingTargetType,
  targetId: mongoose.Types.ObjectId
) {
  const result = await this.aggregate([
    {
      $match: { targetType, targetId },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: -1 },
    },
  ])

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  result.forEach((item: { _id: number; count: number }) => {
    distribution[item._id as keyof typeof distribution] = item.count
  })

  return distribution
}

export const Rating = mongoose.model<IRating>('Rating', RatingSchema)
