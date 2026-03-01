import { Notification, NotificationType } from '../models/Notification'

export interface CreateNotificationDTO {
  user: string
  type: NotificationType
  triggeredBy?: string
  targetType?: string
  targetId?: string
  message?: string
  metadata?: Record<string, unknown>
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export class NotificationService {
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

  async markAsRead(notificationId: string, userId: string) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    })

    if (!notification) {
      throw new Error('Notificacao nao encontrada')
    }

    if (notification.isRead) {
      return notification
    }

    notification.isRead = true
    notification.readAt = new Date()
    await notification.save()

    return notification
  }

  async markAllAsRead(userId: string) {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    )

    return {
      message: 'Todas as notificacoes foram marcadas como lidas',
      modifiedCount: result.modifiedCount,
    }
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    })

    if (!notification) {
      throw new Error('Notificacao nao encontrada')
    }

    return { message: 'Notificacao eliminada' }
  }

  async deleteReadNotifications(userId: string) {
    const result = await Notification.deleteMany({
      user: userId,
      isRead: true,
    })

    return {
      message: 'Notificacoes lidas eliminadas',
      deletedCount: result.deletedCount,
    }
  }

  async getUnreadCount(userId: string) {
    const count = await Notification.countDocuments({
      user: userId,
      isRead: false,
    })

    return { unreadCount: count }
  }

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

  async notifyFollow(followedUserId: string, followerId: string) {
    return await this.create({
      user: followedUserId,
      type: 'follow',
      triggeredBy: followerId,
    })
  }

  async notifyComment(
    contentOwnerId: string,
    commenterId: string,
    contentType: string,
    contentId: string
  ) {
    return await this.create({
      user: contentOwnerId,
      type: 'comment',
      triggeredBy: commenterId,
      targetType: contentType,
      targetId: contentId,
    })
  }

  async notifyReply(commentOwnerId: string, replierId: string, commentId: string) {
    return await this.create({
      user: commentOwnerId,
      type: 'reply',
      triggeredBy: replierId,
      targetType: 'comment',
      targetId: commentId,
    })
  }

  async notifyRating(
    contentOwnerId: string,
    raterId: string,
    contentType: string,
    contentId: string,
    rating: number
  ) {
    return await this.create({
      user: contentOwnerId,
      type: 'rating',
      triggeredBy: raterId,
      targetType: contentType,
      targetId: contentId,
      message: `Avaliou com ${rating} estrelas`,
    })
  }

  async notifyLike(contentOwnerId: string, likerId: string, contentType: string, contentId: string) {
    return await this.create({
      user: contentOwnerId,
      type: 'like',
      triggeredBy: likerId,
      targetType: contentType,
      targetId: contentId,
    })
  }

  async notifyContentModerated(
    contentOwnerId: string,
    actorId: string,
    contentType: string,
    contentId: string,
    action: 'hide' | 'restrict',
    reason: string,
    message: string
  ) {
    return await this.create({
      user: contentOwnerId,
      type: 'content_moderated',
      triggeredBy: actorId,
      targetType: contentType,
      targetId: contentId,
      message,
      metadata: {
        action,
        reason,
      },
    })
  }
}

export const notificationService = new NotificationService()
