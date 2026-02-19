import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Course } from '../models/Course'
import { Favorite, FavoriteTargetType } from '../models/Favorite'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Video } from '../models/Video'
import { socialEventBus } from '../events/socialEvents'

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface FavoriteActionResult {
  created?: boolean
  removed?: boolean
  message: string
  favorite?: unknown
}

interface FavoriteLean {
  _id: string
  targetType: FavoriteTargetType
  targetId: string
  createdAt: Date
}

interface ContentModel {
  findById(id: string): ReturnType<typeof Article.findById>
  findByIdAndUpdate(id: string, update: unknown): ReturnType<typeof Article.findByIdAndUpdate>
  updateOne(filter: unknown, update: unknown): ReturnType<typeof Article.updateOne>
}

const contentModelByType: Record<FavoriteTargetType, ContentModel> = {
  article: Article as unknown as ContentModel,
  video: Video as unknown as ContentModel,
  course: Course as unknown as ContentModel,
  live: LiveEvent as unknown as ContentModel,
  podcast: Podcast as unknown as ContentModel,
  book: Book as unknown as ContentModel,
}

/**
 * Service de Favorites
 */
export class FavoriteService {
  /**
   * Adicionar aos favoritos (idempotente)
   */
  async addFavorite(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string
  ): Promise<FavoriteActionResult> {
    const content = await this.getContent(targetType, targetId)
    if (!content) {
      throw new Error('Conteudo nao encontrado')
    }

    let favorite: unknown = null
    let created = false

    try {
      favorite = await Favorite.create({
        user: userId,
        targetType,
        targetId,
      })
      created = true
    } catch (error: unknown) {
      const mongoError = error as { code?: number }
      if (mongoError.code === 11000) {
        favorite = await Favorite.findOne({
          user: userId,
          targetType,
          targetId,
        })
      } else {
        throw error
      }
    }

    if (!favorite) {
      throw new Error('Falha ao criar favorito')
    }

    if (created) {
      await this.adjustFavoriteCount(targetType, targetId, 1)
      socialEventBus.publish({
        type: 'social.content.interaction',
        actorId: userId,
        interactionType: 'favorite',
        targetType,
        targetId,
        occurredAt: new Date().toISOString(),
      })
    }

    return {
      favorite,
      created,
      message: created ? 'Adicionado aos favoritos' : 'Ja estava nos favoritos',
    }
  }

  /**
   * Remover dos favoritos (idempotente)
   */
  async removeFavorite(
    userId: string,
    targetType: FavoriteTargetType,
    targetId: string
  ): Promise<FavoriteActionResult> {
    const favorite = await Favorite.findOneAndDelete({
      user: userId,
      targetType,
      targetId,
    })

    if (!favorite) {
      return {
        removed: false,
        message: 'Ja nao estava nos favoritos',
      }
    }

    await this.adjustFavoriteCount(targetType, targetId, -1)

    return {
      removed: true,
      message: 'Removido dos favoritos',
    }
  }

  /**
   * Verificar se esta nos favoritos
   */
  async isFavorite(userId: string, targetType: FavoriteTargetType, targetId: string): Promise<boolean> {
    const favorite = await Favorite.findOne({
      user: userId,
      targetType,
      targetId,
    })

    return favorite !== null
  }

  /**
   * Listar favoritos do utilizador
   */
  async getUserFavorites(userId: string, targetType?: FavoriteTargetType, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const query: { user: string; targetType?: FavoriteTargetType } = { user: userId }
    if (targetType) {
      query.targetType = targetType
    }

    const [favorites, total] = await Promise.all([
      Favorite.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<FavoriteLean[]>(),
      Favorite.countDocuments(query),
    ])

    const populatedFavorites = await this.populateFavorites(favorites)

    return {
      favorites: populatedFavorites,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Estatisticas de favoritos por tipo
   */
  async getFavoriteStats(userId: string) {
    const stats = await Favorite.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$targetType',
          count: { $sum: 1 },
        },
      },
    ])

    const statsByType: Record<string, number> = {}
    stats.forEach((stat) => {
      statsByType[stat._id] = stat.count
    })

    const total = await Favorite.countDocuments({ user: userId })

    return {
      total,
      byType: statsByType,
    }
  }

  /**
   * Bulk check - verificar se multiplos itens estao nos favoritos
   */
  async checkMultipleFavorites(userId: string, items: Array<{ targetType: FavoriteTargetType; targetId: string }>) {
    const favorites = await Favorite.find({
      user: userId,
      $or: items.map((item) => ({
        targetType: item.targetType,
        targetId: item.targetId,
      })),
    })

    const favoriteSet = new Set(favorites.map((f) => `${f.targetType}-${f.targetId.toString()}`))

    const result: Record<string, boolean> = {}
    items.forEach((item) => {
      const key = `${item.targetType}-${item.targetId}`
      result[key] = favoriteSet.has(key)
    })

    return result
  }

  /**
   * Helper: Obter conteudo por tipo
   */
  private async getContent(targetType: FavoriteTargetType, targetId: string) {
    const model = this.getModelByTargetType(targetType)
    return model.findById(targetId)
  }

  /**
   * Helper: Ajustar contador de favoritos no conteudo
   */
  private async adjustFavoriteCount(targetType: FavoriteTargetType, targetId: string, delta: number) {
    const model = this.getModelByTargetType(targetType)

    if (delta >= 0) {
      await model.findByIdAndUpdate(targetId, { $inc: { favorites: delta } })
      return
    }

    await model.updateOne(
      { _id: targetId },
      [
        {
          $set: {
            favorites: {
              $max: [{ $subtract: ['$favorites', Math.abs(delta)] }, 0],
            },
          },
        },
      ] as never
    )
  }

  /**
   * Helper: Populate conteudos dos favoritos
   */
  private async populateFavorites(favorites: FavoriteLean[]) {
    const populated = await Promise.all(
      favorites.map(async (fav) => {
        const content = await this.getContent(fav.targetType, String(fav.targetId))
        return {
          _id: fav._id,
          targetType: fav.targetType,
          content: content || null,
          createdAt: fav.createdAt,
        }
      })
    )

    return populated.filter((favorite) => favorite.content !== null)
  }

  private getModelByTargetType(targetType: FavoriteTargetType): ContentModel {
    const model = contentModelByType[targetType]
    if (!model) {
      throw new Error('Tipo de conteudo invalido')
    }
    return model
  }
}

export const favoriteService = new FavoriteService()
