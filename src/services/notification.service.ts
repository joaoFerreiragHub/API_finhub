import { Notification, NotificationType } from '../models/Notification'

export interface CreateNotificationDTO {
  user: string // Destinatário
  type: NotificationType
  triggeredBy?: string
  targetType?: string
  targetId?: string
  message?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

/**
 * Service de Notifications
 */
export class NotificationService {
  /**
   * Criar notificação
   */
  async create(data: CreateNotificationDTO) {
    const notification = await Notification.create(data)
    return notification
  }

  async bulkCreate(data: CreateNotificationDTO[]) {
    if (data.length === 0) {
      return []
    }
    return Notification.insertMany(data, { ordered: false })
  }

  /**
   * Listar notificações do utilizador
   */
  async getUserNotifications(userId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('triggeredBy', 'name username avatar')
        .lean(),
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, isRead: false }),
    ])

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Listar apenas notificações não lidas
   */
  async getUnreadNotifications(userId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const [notifications, total] = await Promise.all([
      Notification.find({ user: userId, isRead: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('triggeredBy', 'name username avatar')
        .lean(),
      Notification.countDocuments({ user: userId, isRead: false }),
    ])

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    })

    if (!notification) {
      throw new Error('Notificação não encontrada')
    }

    if (notification.isRead) {
      return notification
    }

    notification.isRead = true
    notification.readAt = new Date()
    await notification.save()

    return notification
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(userId: string) {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    )

    return {
      message: 'Todas as notificações foram marcadas como lidas',
      modifiedCount: result.modifiedCount,
    }
  }

  /**
   * Eliminar notificação
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    })

    if (!notification) {
      throw new Error('Notificação não encontrada')
    }

    return { message: 'Notificação eliminada' }
  }

  /**
   * Eliminar todas as notificações lidas
   */
  async deleteReadNotifications(userId: string) {
    const result = await Notification.deleteMany({
      user: userId,
      isRead: true,
    })

    return {
      message: 'Notificações lidas eliminadas',
      deletedCount: result.deletedCount,
    }
  }

  /**
   * Obter contador de não lidas
   */
  async getUnreadCount(userId: string) {
    const count = await Notification.countDocuments({
      user: userId,
      isRead: false,
    })

    return { unreadCount: count }
  }

  /**
   * Obter estatísticas de notificações
   */
  async getStats(userId: string) {
    const [total, unread, byType] = await Promise.all([
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, isRead: false }),
      Notification.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unread: {
              $sum: {
                $cond: [{ $eq: ['$isRead', false] }, 1, 0],
              },
            },
          },
        },
      ]),
    ])

    const statsByType: Record<string, { total: number; unread: number }> = {}
    byType.forEach((stat) => {
      statsByType[stat._id] = {
        total: stat.count,
        unread: stat.unread,
      }
    })

    return {
      total,
      unread,
      byType: statsByType,
    }
  }

  /**
   * Helper: Criar notificação de follow
   */
  async notifyFollow(followedUserId: string, followerId: string) {
    return await this.create({
      user: followedUserId,
      type: 'follow',
      triggeredBy: followerId,
    })
  }

  /**
   * Helper: Criar notificação de comentário
   */
  async notifyComment(contentOwnerId: string, commenterId: string, contentType: string, contentId: string) {
    return await this.create({
      user: contentOwnerId,
      type: 'comment',
      triggeredBy: commenterId,
      targetType: contentType,
      targetId: contentId,
    })
  }

  /**
   * Helper: Criar notificação de resposta
   */
  async notifyReply(commentOwnerId: string, replierId: string, commentId: string) {
    return await this.create({
      user: commentOwnerId,
      type: 'reply',
      triggeredBy: replierId,
      targetType: 'comment',
      targetId: commentId,
    })
  }

  /**
   * Helper: Criar notificação de rating
   */
  async notifyRating(contentOwnerId: string, raterId: string, contentType: string, contentId: string, rating: number) {
    return await this.create({
      user: contentOwnerId,
      type: 'rating',
      triggeredBy: raterId,
      targetType: contentType,
      targetId: contentId,
      message: `Avaliou com ${rating} estrelas`,
    })
  }

  /**
   * Helper: Criar notificação de like
   */
  async notifyLike(contentOwnerId: string, likerId: string, contentType: string, contentId: string) {
    return await this.create({
      user: contentOwnerId,
      type: 'like',
      triggeredBy: likerId,
      targetType: contentType,
      targetId: contentId,
    })
  }
}

export const notificationService = new NotificationService()
