import mongoose, { Document, Schema } from 'mongoose'

export type NotificationType =
  | 'follow'          // Alguém te seguiu
  | 'comment'         // Comentário no teu conteúdo
  | 'reply'           // Resposta ao teu comentário
  | 'rating'          // Avaliação no teu conteúdo
  | 'like'            // Like no teu conteúdo/comentário
  | 'mention'         // Menção num comentário
  | 'content_published' // Conteúdo de quem segues foi publicado

/**
 * Notification - Sistema de notificações
 */
export interface INotification extends Document {
  user: mongoose.Types.ObjectId // Destinatário da notificação
  type: NotificationType

  // Quem gerou a notificação
  triggeredBy?: mongoose.Types.ObjectId // ref: 'User'

  // Referência ao conteúdo relacionado
  targetType?: string // article, video, comment, etc.
  targetId?: mongoose.Types.ObjectId

  // Mensagem personalizada (opcional)
  message?: string

  // Status
  isRead: boolean
  readAt?: Date

  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['follow', 'comment', 'reply', 'rating', 'like', 'mention', 'content_published'],
      index: true,
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetType: {
      type: String,
      default: null,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    message: {
      type: String,
      default: null,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Índices
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })
NotificationSchema.index({ user: 1, type: 1 })
NotificationSchema.index({ createdAt: -1 })

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema)
