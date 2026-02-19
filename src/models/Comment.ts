import mongoose, { Document, Schema } from 'mongoose'

export type CommentTargetType =
  // Conteúdos
  | 'article'
  | 'video'
  | 'course'
  | 'live'
  | 'podcast'
  | 'book'
  // Perfis
  | 'creator'
  // Brands (Admin)
  | 'brand'

/**
 * Comment - Sistema universal de comentários
 * Funciona para: conteúdos, creators, brands
 * Suporta threading até 3 níveis
 */
export interface IComment extends Document {
  _id: mongoose.Types.ObjectId
  // User que fez o comentário
  user: mongoose.Types.ObjectId // ref: 'User'

  // Target (onde está o comentário)
  targetType: CommentTargetType
  targetId: mongoose.Types.ObjectId

  // Conteúdo
  content: string

  // Threading
  parentComment?: mongoose.Types.ObjectId // ref: 'Comment'
  depth: number // 0 = comentário principal, 1-3 = respostas

  // Engagement
  likes: number
  likedBy: mongoose.Types.ObjectId[] // refs: 'User'

  // Status
  isEdited: boolean
  isPinned: boolean // Pode ser pinado pelo creator/admin

  createdAt: Date
  updatedAt: Date

  // Methods
  toggleLike(userId: mongoose.Types.ObjectId): Promise<IComment>
}

const CommentSchema = new Schema<IComment>(
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

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },

    // Threading
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    depth: {
      type: Number,
      default: 0,
      min: 0,
      max: 3, // Máximo 3 níveis
    },

    // Engagement
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },

    // Status
    isEdited: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
CommentSchema.index({ targetType: 1, targetId: 1 })
CommentSchema.index({ parentComment: 1 })
CommentSchema.index({ user: 1 })
CommentSchema.index({ createdAt: -1 })
CommentSchema.index({ isPinned: -1, createdAt: -1 }) // Pinados primeiro

// Validação: Não permitir depth > 3
CommentSchema.pre('save', function (next) {
  if (this.depth > 3) {
    return next(new Error('Profundidade máxima de comentários é 3'))
  }
  next()
})

// Método estático: Contar comentários de um target
CommentSchema.statics.countComments = async function (
  targetType: CommentTargetType,
  targetId: mongoose.Types.ObjectId
) {
  return await this.countDocuments({ targetType, targetId })
}

// Método estático: Buscar comentários principais (depth 0)
CommentSchema.statics.getMainComments = async function (
  targetType: CommentTargetType,
  targetId: mongoose.Types.ObjectId,
  options: { skip?: number; limit?: number; sort?: string } = {}
) {
  const { skip = 0, limit = 20, sort = '-createdAt' } = options

  return await this.find({
    targetType,
    targetId,
    depth: 0,
  })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('user', 'name username avatar')
    .lean()
}

// Método estático: Buscar respostas de um comentário
CommentSchema.statics.getReplies = async function (parentCommentId: mongoose.Types.ObjectId) {
  return await this.find({
    parentComment: parentCommentId,
  })
    .sort('createdAt')
    .populate('user', 'name username avatar')
    .lean()
}

// Método para toggle like
CommentSchema.methods.toggleLike = async function (userId: mongoose.Types.ObjectId) {
  const userIdStr = userId.toString()
  const likedByStrings = this.likedBy.map((id: mongoose.Types.ObjectId) => id.toString())

  if (likedByStrings.includes(userIdStr)) {
    // Unlike
    this.likedBy = this.likedBy.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== userIdStr
    )
    this.likes = Math.max(0, this.likes - 1)
  } else {
    // Like
    this.likedBy.push(userId)
    this.likes += 1
  }

  await this.save()
  return this
}

export const Comment = mongoose.model<IComment>('Comment', CommentSchema)
