import mongoose from 'mongoose'
import { socialEventBus } from '../events/socialEvents'
import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Brand } from '../models/Brand'
import { Comment, CommentTargetType } from '../models/Comment'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { User } from '../models/User'
import { Video } from '../models/Video'
import { automatedModerationService } from './automatedModeration.service'

/**
 * DTOs para Comment
 */
export interface CreateCommentDTO {
  targetType: CommentTargetType
  targetId: string
  content: string
  parentCommentId?: string
}

export interface UpdateCommentDTO {
  content: string
}

interface CommentLean {
  _id: mongoose.Types.ObjectId
  user: unknown
  targetType: CommentTargetType
  targetId: mongoose.Types.ObjectId
  content: string
  parentComment?: mongoose.Types.ObjectId | null
  depth: number
  likes: number
  likedBy: mongoose.Types.ObjectId[]
  isEdited: boolean
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
}

interface CommentTreeNode extends CommentLean {
  replies: CommentTreeNode[]
  repliesCount?: number
}

interface PaginatedCommentsResult {
  comments: CommentLean[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface CreatorOwnedTarget {
  creator?: mongoose.Types.ObjectId | string
}

interface CommentTargetModel {
  findById(id: string): ReturnType<typeof Article.findById>
  findByIdAndUpdate(id: string | mongoose.Types.ObjectId, update: unknown): ReturnType<typeof Article.findByIdAndUpdate>
}

const commentTargetModels: Partial<Record<CommentTargetType, CommentTargetModel>> = {
  article: Article as unknown as CommentTargetModel,
  video: Video as unknown as CommentTargetModel,
  course: Course as unknown as CommentTargetModel,
  live: LiveEvent as unknown as CommentTargetModel,
  podcast: Podcast as unknown as CommentTargetModel,
  book: Book as unknown as CommentTargetModel,
  creator: User as unknown as CommentTargetModel,
  brand: Brand as unknown as CommentTargetModel,
}

/**
 * Service de Comments Universal
 */
export class CommentService {
  /**
   * Criar comentario ou resposta
   */
  async create(userId: string, data: CreateCommentDTO) {
    const { targetType, targetId, content, parentCommentId } = data

    let depth = 0
    let parentComment: (typeof Comment.prototype) | null = null

    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId)
      if (!parentComment) {
        throw new Error('Comentario pai nao encontrado')
      }

      if (parentComment.targetType !== targetType || parentComment.targetId.toString() !== targetId) {
        throw new Error('Comentario pai pertence a outro target')
      }

      depth = parentComment.depth + 1
      if (depth > 3) {
        throw new Error('Profundidade maxima de comentarios atingida (3 niveis)')
      }
    }

    const comment = await Comment.create({
      user: userId,
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
      content,
      parentComment: parentCommentId ? new mongoose.Types.ObjectId(parentCommentId) : null,
      depth,
    })

    await this.updateTargetCommentCount(targetType, targetId)

    if (parentCommentId) {
      socialEventBus.publish({
        type: 'social.content.interaction',
        actorId: userId,
        interactionType: 'reply',
        targetType: 'comment',
        targetId: parentCommentId,
        occurredAt: new Date().toISOString(),
      })
    } else {
      socialEventBus.publish({
        type: 'social.content.interaction',
        actorId: userId,
        interactionType: 'comment',
        targetType,
        targetId,
        occurredAt: new Date().toISOString(),
      })
    }

    await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'comment',
      contentId: comment.id,
      triggerSource: 'create',
    })

    return Comment.findById(comment._id).populate('user', 'name username avatar')
  }

  /**
   * Listar comentarios principais (depth 0)
   */
  async listMainComments(
    targetType: CommentTargetType,
    targetId: string,
    options: { page?: number; limit?: number; sort?: string } = {}
  ): Promise<PaginatedCommentsResult> {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    let sort: string = '-isPinned -createdAt'
    if (options.sort === 'popular') {
      sort = '-isPinned -likes -createdAt'
    } else if (options.sort === 'oldest') {
      sort = '-isPinned createdAt'
    }

    const query = {
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
      depth: 0,
      moderationStatus: 'visible',
    }

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name username avatar')
        .lean<CommentLean[]>(),
      Comment.countDocuments(query),
    ])

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter respostas de um comentario (recursivo)
   */
  async getReplies(commentId: string): Promise<CommentTreeNode[]> {
    const replies = await Comment.find({
      parentComment: new mongoose.Types.ObjectId(commentId),
      moderationStatus: 'visible',
    })
      .sort('createdAt')
      .populate('user', 'name username avatar')
      .lean<CommentLean[]>()

    const repliesWithNested = await Promise.all(
      replies.map(async (reply): Promise<CommentTreeNode> => {
        const nestedReplies = await this.getReplies(String(reply._id))
        return {
          ...reply,
          replies: nestedReplies,
        }
      })
    )

    return repliesWithNested
  }

  /**
   * Obter arvore completa de comentarios
   */
  async getCommentTree(
    targetType: CommentTargetType,
    targetId: string,
    options: { page?: number; limit?: number; sort?: string } = {}
  ) {
    const mainCommentsResult = await this.listMainComments(targetType, targetId, options)

    const commentsWithReplies = await Promise.all(
      mainCommentsResult.comments.map(async (comment): Promise<CommentTreeNode> => {
        const replies = await this.getReplies(String(comment._id))
        return {
          ...comment,
          replies,
          repliesCount: await this.countReplies(String(comment._id)),
        }
      })
    )

    return {
      comments: commentsWithReplies,
      pagination: mainCommentsResult.pagination,
    }
  }

  /**
   * Contar respostas de um comentario (recursivo)
   */
  private async countReplies(commentId: string): Promise<number> {
    const directReplies = await Comment.find({
      parentComment: new mongoose.Types.ObjectId(commentId),
      moderationStatus: 'visible',
    })

    let total = directReplies.length
    for (const reply of directReplies) {
      total += await this.countReplies(reply.id)
    }

    return total
  }

  /**
   * Atualizar comentario
   */
  async update(commentId: string, userId: string, data: UpdateCommentDTO, isAdmin = false) {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new Error('Comentario nao encontrado')
    }

    if (!isAdmin && comment.user.toString() !== userId) {
      throw new Error('Nao tens permissao para editar este comentario')
    }

    comment.content = data.content
    comment.isEdited = true
    await comment.save()

    await automatedModerationService.evaluateAndApplyTarget({
      contentType: 'comment',
      contentId: comment.id,
      triggerSource: 'update',
    })

    return Comment.findById(commentId).populate('user', 'name username avatar')
  }

  /**
   * Eliminar comentario
   */
  async delete(commentId: string, userId: string, isAdmin = false) {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new Error('Comentario nao encontrado')
    }

    if (!isAdmin && comment.user.toString() !== userId) {
      throw new Error('Nao tens permissao para eliminar este comentario')
    }

    const { targetType, targetId } = comment
    await this.deleteCommentAndReplies(commentId)
    await this.updateTargetCommentCount(targetType, targetId.toString())

    return { message: 'Comentario eliminado com sucesso' }
  }

  /**
   * Eliminar comentario e respostas (recursivo)
   */
  private async deleteCommentAndReplies(commentId: string) {
    const replies = await Comment.find({
      parentComment: new mongoose.Types.ObjectId(commentId),
    })

    for (const reply of replies) {
      await this.deleteCommentAndReplies(reply.id)
    }

    await Comment.findByIdAndDelete(commentId)
  }

  /**
   * Toggle like em comentario
   */
  async toggleLike(commentId: string, userId: string) {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new Error('Comentario nao encontrado')
    }

    const alreadyLiked = comment.likedBy.some((id) => id.toString() === userId)
    await comment.toggleLike(new mongoose.Types.ObjectId(userId))

    if (!alreadyLiked) {
      socialEventBus.publish({
        type: 'social.content.interaction',
        actorId: userId,
        interactionType: 'favorite',
        targetType: 'comment',
        targetId: commentId,
        occurredAt: new Date().toISOString(),
      })
    }

    return Comment.findById(commentId).populate('user', 'name username avatar')
  }

  /**
   * Pin/Unpin comentario (apenas owner do target ou admin)
   */
  async togglePin(commentId: string, userId: string, isAdmin = false) {
    const comment = await Comment.findById(commentId)
    if (!comment) {
      throw new Error('Comentario nao encontrado')
    }

    const target = await this.getTarget(comment.targetType, comment.targetId.toString())
    const creator = target?.creator
    const isOwner = creator ? creator.toString() === userId : false

    if (!isOwner && !isAdmin) {
      throw new Error('Apenas o criador do conteudo ou admins podem pin comentarios')
    }

    comment.isPinned = !comment.isPinned
    await comment.save()

    return Comment.findById(commentId).populate('user', 'name username avatar')
  }

  /**
   * Obter target (para verificar owner)
   */
  private async getTarget(targetType: CommentTargetType, targetId: string): Promise<CreatorOwnedTarget | null> {
    const model = commentTargetModels[targetType]
    if (!model) {
      return null
    }

    return (await model.findById(targetId)) as CreatorOwnedTarget | null
  }

  /**
   * Atualizar contador de comentarios no target
   */
  private async updateTargetCommentCount(targetType: CommentTargetType, targetId: string) {
    const objectId = new mongoose.Types.ObjectId(targetId)
    const count = await Comment.countDocuments({
      targetType,
      targetId: objectId,
      moderationStatus: 'visible',
    })

    const model = commentTargetModels[targetType]
    if (!model) {
      return
    }

    await model.findByIdAndUpdate(objectId, { commentsCount: count })
  }
}

export const commentService = new CommentService()
