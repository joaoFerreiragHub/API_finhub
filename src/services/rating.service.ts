import mongoose from 'mongoose'
import { socialEventBus } from '../events/socialEvents'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Brand } from '../models/Brand'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Rating, RatingReactionType, RatingTargetType } from '../models/Rating'
import { User } from '../models/User'
import { Video } from '../models/Video'

/**
 * DTOs para Rating
 */
export interface CreateRatingDTO {
  targetType: RatingTargetType
  targetId: string
  rating: number
  review?: string
}

export interface UpdateRatingDTO {
  rating?: number
  review?: string
}

export type RatingSort = 'recent' | 'rating-high' | 'rating-low' | 'helpful'
export type ReviewReactionInput = RatingReactionType | 'none'

export interface ReviewReactionResult {
  reaction: RatingReactionType | null
  updated: boolean
  message: string
  rating: unknown
}

interface RatingModelWithStatics {
  calculateAverage(
    targetType: RatingTargetType,
    targetId: mongoose.Types.ObjectId
  ): Promise<{ averageRating: number; ratingsCount: number }>
  getDistribution(
    targetType: RatingTargetType,
    targetId: mongoose.Types.ObjectId
  ): Promise<{ 1: number; 2: number; 3: number; 4: number; 5: number }>
}

interface RatingTargetModel {
  findByIdAndUpdate(
    id: string | mongoose.Types.ObjectId,
    update: unknown
  ): ReturnType<typeof Article.findByIdAndUpdate>
}

type RatingDocument = {
  _id: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  targetType: RatingTargetType
  targetId: mongoose.Types.ObjectId
  rating: number
  likes: number
  dislikes: number
  reactions: Array<{ user: mongoose.Types.ObjectId; reaction: RatingReactionType; createdAt: Date }>
  save: () => Promise<unknown>
  deleteOne: () => Promise<unknown>
}

const ratingTargetModels: Partial<Record<RatingTargetType, RatingTargetModel>> = {
  article: Article as unknown as RatingTargetModel,
  video: Video as unknown as RatingTargetModel,
  course: Course as unknown as RatingTargetModel,
  live: LiveEvent as unknown as RatingTargetModel,
  podcast: Podcast as unknown as RatingTargetModel,
  book: Book as unknown as RatingTargetModel,
  creator: User as unknown as RatingTargetModel,
  brand: Brand as unknown as RatingTargetModel,
}

const ratingModelWithStatics = Rating as typeof Rating & RatingModelWithStatics

/**
 * Service de Ratings Universal
 */
export class RatingService {
  /**
   * Criar ou atualizar rating
   */
  async createOrUpdate(userId: string, data: CreateRatingDTO) {
    const { targetType, targetId, rating, review } = data

    if (rating < 1 || rating > 5) {
      throw new Error('Rating deve estar entre 1 e 5')
    }

    const existing = await Rating.findOne({
      user: userId,
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
    })

    let ratingDoc
    if (existing) {
      existing.rating = rating
      if (review !== undefined) {
        existing.review = review
      }
      ratingDoc = await existing.save()
    } else {
      ratingDoc = await Rating.create({
        user: userId,
        targetType,
        targetId: new mongoose.Types.ObjectId(targetId),
        rating,
        review,
      })
    }

    await this.updateTargetAverage(targetType, targetId)

    socialEventBus.publish({
      type: 'social.content.interaction',
      actorId: userId,
      interactionType: 'rating',
      targetType,
      targetId,
      ratingValue: rating,
      occurredAt: new Date().toISOString(),
    })

    return ratingDoc
  }

  /**
   * Obter rating do user para um target
   */
  async getUserRating(userId: string, targetType: RatingTargetType, targetId: string) {
    return Rating.findOne({
      user: userId,
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
    }).populate('user', 'name username avatar')
  }

  /**
   * Listar ratings de um target
   */
  async listRatings(
    targetType: RatingTargetType,
    targetId: string,
    options: { page?: number; limit?: number; sort?: RatingSort } = {}
  ) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    let sort: Record<string, 1 | -1> = { createdAt: -1 }
    if (options.sort === 'rating-high') {
      sort = { rating: -1, createdAt: -1 }
    } else if (options.sort === 'rating-low') {
      sort = { rating: 1, createdAt: -1 }
    } else if (options.sort === 'helpful') {
      sort = { likes: -1, dislikes: 1, createdAt: -1 }
    }

    const query = {
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
      moderationStatus: 'visible',
    }

    const [ratings, total] = await Promise.all([
      Rating.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name username avatar')
        .lean(),
      Rating.countDocuments(query),
    ])

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Reagir a uma review (like/dislike/remove)
   */
  async reactToRating(
    ratingId: string,
    actorId: string,
    reaction: ReviewReactionInput
  ): Promise<ReviewReactionResult> {
    const ratingDoc = (await Rating.findById(ratingId)) as RatingDocument | null
    if (!ratingDoc) {
      throw new Error('Rating nao encontrado')
    }

    const reactionIndex = ratingDoc.reactions.findIndex((entry) => entry.user.toString() === actorId)
    const existingReaction = reactionIndex >= 0 ? ratingDoc.reactions[reactionIndex].reaction : null

    if (reaction === 'none') {
      if (!existingReaction) {
        return {
          rating: ratingDoc,
          reaction: null,
          updated: false,
          message: 'Sem reacao para remover',
        }
      }

      this.decrementReactionCounter(ratingDoc, existingReaction)
      ratingDoc.reactions.splice(reactionIndex, 1)
      await ratingDoc.save()

      return {
        rating: ratingDoc,
        reaction: null,
        updated: true,
        message: 'Reacao removida',
      }
    }

    if (existingReaction === reaction) {
      return {
        rating: ratingDoc,
        reaction,
        updated: false,
        message: 'Reacao ja aplicada',
      }
    }

    if (!existingReaction) {
      ratingDoc.reactions.push({
        user: new mongoose.Types.ObjectId(actorId),
        reaction,
        createdAt: new Date(),
      })
      this.incrementReactionCounter(ratingDoc, reaction)
    } else {
      this.decrementReactionCounter(ratingDoc, existingReaction)
      ratingDoc.reactions[reactionIndex].reaction = reaction
      this.incrementReactionCounter(ratingDoc, reaction)
    }

    await ratingDoc.save()

    socialEventBus.publish({
      type: 'social.content.interaction',
      actorId,
      interactionType: 'favorite',
      targetType: 'rating',
      targetId: ratingId,
      occurredAt: new Date().toISOString(),
    })

    return {
      rating: ratingDoc,
      reaction,
      updated: true,
      message: existingReaction ? 'Reacao atualizada' : 'Reacao registada',
    }
  }

  /**
   * Obter reacao atual do utilizador para uma review
   */
  async getUserRatingReaction(ratingId: string, userId: string): Promise<RatingReactionType | null> {
    const ratingDoc = await Rating.findById(ratingId).select('reactions')
    if (!ratingDoc) {
      throw new Error('Rating nao encontrado')
    }

    const existing = ratingDoc.reactions.find((entry) => entry.user.toString() === userId)
    return existing?.reaction ?? null
  }

  /**
   * Eliminar rating
   */
  async delete(ratingId: string, userId: string, isAdmin = false) {
    const rating = (await Rating.findById(ratingId)) as RatingDocument | null

    if (!rating) {
      throw new Error('Rating nao encontrado')
    }

    if (!isAdmin && rating.user.toString() !== userId) {
      throw new Error('Nao tens permissao para eliminar este rating')
    }

    const { targetType, targetId } = rating

    await rating.deleteOne()
    await this.updateTargetAverage(targetType, targetId.toString())

    return { message: 'Rating eliminado com sucesso' }
  }

  /**
   * Obter media e distribuicao de ratings
   */
  async getStats(targetType: RatingTargetType, targetId: string) {
    const objectId = new mongoose.Types.ObjectId(targetId)

    const [average, distribution, reviewsFeedback] = await Promise.all([
      ratingModelWithStatics.calculateAverage(targetType, objectId),
      ratingModelWithStatics.getDistribution(targetType, objectId),
      Rating.aggregate([
        {
          $match: { targetType, targetId: objectId, moderationStatus: 'visible' },
        },
        {
          $group: {
            _id: null,
            reviewsWithText: {
              $sum: {
                $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$review', ''] } }, 0] }, 1, 0],
              },
            },
            totalReviewLikes: { $sum: '$likes' },
            totalReviewDislikes: { $sum: '$dislikes' },
          },
        },
      ]),
    ])

    const feedback =
      reviewsFeedback.length > 0
        ? reviewsFeedback[0]
        : { reviewsWithText: 0, totalReviewLikes: 0, totalReviewDislikes: 0 }

    return {
      average: average.averageRating,
      total: average.ratingsCount,
      distribution,
      reviews: {
        withText: feedback.reviewsWithText,
        totalLikes: feedback.totalReviewLikes,
        totalDislikes: feedback.totalReviewDislikes,
      },
    }
  }

  /**
   * Atualizar media de rating no target
   */
  private async updateTargetAverage(targetType: RatingTargetType, targetId: string) {
    const objectId = new mongoose.Types.ObjectId(targetId)
    const { averageRating, ratingsCount } = await ratingModelWithStatics.calculateAverage(
      targetType,
      objectId
    )

    const model = ratingTargetModels[targetType]
    if (!model) {
      console.warn(`Target type ${targetType} nao tem modelo definido`)
      return
    }

    await model.findByIdAndUpdate(objectId, {
      averageRating,
      ratingsCount,
    })
  }

  private incrementReactionCounter(ratingDoc: RatingDocument, reaction: RatingReactionType) {
    if (reaction === 'like') {
      ratingDoc.likes += 1
      return
    }
    ratingDoc.dislikes += 1
  }

  private decrementReactionCounter(ratingDoc: RatingDocument, reaction: RatingReactionType) {
    if (reaction === 'like') {
      ratingDoc.likes = Math.max(0, ratingDoc.likes - 1)
      return
    }
    ratingDoc.dislikes = Math.max(0, ratingDoc.dislikes - 1)
  }
}

export const ratingService = new RatingService()
