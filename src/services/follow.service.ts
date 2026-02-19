import { Follow } from '../models/Follow'
import { User } from '../models/User'
import { socialEventBus } from '../events/socialEvents'

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface FollowActionResult {
  created?: boolean
  removed?: boolean
  message: string
  follow?: unknown
}

/**
 * Service de Follow
 */
export class FollowService {
  private async decrementUserCounter(userId: string, field: 'followers' | 'following') {
    await User.updateOne(
      { _id: userId },
      [
        {
          $set: {
            [field]: {
              $max: [{ $subtract: [`$${field}`, 1] }, 0],
            },
          },
        },
      ] as any
    )
  }

  /**
   * Seguir um creator
   */
  async followUser(followerId: string, followingId: string): Promise<FollowActionResult> {
    if (followerId === followingId) {
      throw new Error('Nao podes seguir-te a ti proprio')
    }

    const userToFollow = await User.findById(followingId)
    if (!userToFollow) {
      throw new Error('Utilizador nao encontrado')
    }

    let follow = null
    let created = false

    try {
      follow = await Follow.create({
        follower: followerId,
        following: followingId,
      })
      created = true
    } catch (error: any) {
      if (error?.code === 11000) {
        follow = await Follow.findOne({
          follower: followerId,
          following: followingId,
        })
      } else {
        throw error
      }
    }

    if (!follow) {
      throw new Error('Falha ao criar follow')
    }

    if (created) {
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { following: 1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { followers: 1 } }),
      ])

      socialEventBus.publish({
        type: 'social.follow.created',
        followerId,
        followingId,
        occurredAt: new Date().toISOString(),
      })
    }

    return {
      follow,
      created,
      message: created ? 'Agora segues este utilizador' : 'Ja seguias este utilizador',
    }
  }

  /**
   * Deixar de seguir um creator
   */
  async unfollowUser(followerId: string, followingId: string): Promise<FollowActionResult> {
    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
    })

    if (!follow) {
      return {
        removed: false,
        message: 'Ja nao seguias este utilizador',
      }
    }

    await Promise.all([
      this.decrementUserCounter(followerId, 'following'),
      this.decrementUserCounter(followingId, 'followers'),
    ])

    return { removed: true, message: 'Deixaste de seguir este utilizador' }
  }

  /**
   * Verificar se esta a seguir
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    })

    return follow !== null
  }

  /**
   * Listar seguidores de um utilizador
   */
  async getFollowers(userId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const [follows, total] = await Promise.all([
      Follow.find({ following: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('follower', 'name username avatar bio followers following')
        .lean(),
      Follow.countDocuments({ following: userId }),
    ])

    const followers = follows.map((f: any) => f.follower)

    return {
      followers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Listar quem o utilizador esta a seguir
   */
  async getFollowing(userId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const [follows, total] = await Promise.all([
      Follow.find({ follower: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('following', 'name username avatar bio followers following')
        .lean(),
      Follow.countDocuments({ follower: userId }),
    ])

    const following = follows.map((f: any) => f.following)

    return {
      following,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter seguimentos mutuos (friends)
   */
  async getMutualFollows(userId: string) {
    const userFollowing = await Follow.find({ follower: userId }).select('following')
    const followingIds = userFollowing.map((f) => f.following.toString())

    const mutualFollows = await Follow.find({
      follower: { $in: followingIds },
      following: userId,
    })
      .populate('follower', 'name username avatar bio')
      .lean()

    const mutualUsers = mutualFollows.map((f: any) => f.follower)

    return mutualUsers
  }

  /**
   * Estatisticas de follow de um utilizador
   */
  async getStats(userId: string) {
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId }),
    ])

    const recentFollowers = await Follow.find({ following: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('follower', 'name username avatar')
      .lean()

    return {
      followersCount,
      followingCount,
      recentFollowers: recentFollowers.map((f: any) => f.follower),
    }
  }

  /**
   * Bulk check - verificar se esta a seguir multiplos users
   */
  async checkMultipleFollows(followerId: string, userIds: string[]) {
    const follows = await Follow.find({
      follower: followerId,
      following: { $in: userIds },
    }).select('following')

    const followingSet = new Set(follows.map((f) => f.following.toString()))

    const result: Record<string, boolean> = {}
    userIds.forEach((id) => {
      result[id] = followingSet.has(id)
    })

    return result
  }
}

export const followService = new FollowService()
