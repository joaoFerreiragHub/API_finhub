import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import { notificationService } from '../services/notification.service'

/**
 * Listar notificações
 * GET /api/notifications
 */
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    }

    const result = await notificationService.getUserNotifications(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get notifications error:', error)
    return res.status(500).json({
      error: 'Erro ao obter notificações',
      details: error.message,
    })
  }
}

/**
 * Listar notificações não lidas
 * GET /api/notifications/unread
 */
export const getUnreadNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    }

    const result = await notificationService.getUnreadNotifications(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get unread notifications error:', error)
    return res.status(500).json({
      error: 'Erro ao obter notificações não lidas',
      details: error.message,
    })
  }
}

/**
 * Marcar notificação como lida
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const notification = await notificationService.markAsRead(id, req.user.id)

    return res.status(200).json(notification)
  } catch (error: any) {
    console.error('Mark as read error:', error)

    if (error.message.includes('não encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao marcar como lida',
      details: error.message,
    })
  }
}

/**
 * Marcar todas como lidas
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const result = await notificationService.markAllAsRead(req.user.id)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Mark all as read error:', error)
    return res.status(500).json({
      error: 'Erro ao marcar todas como lidas',
      details: error.message,
    })
  }
}

/**
 * Eliminar notificação
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const result = await notificationService.deleteNotification(id, req.user.id)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete notification error:', error)

    if (error.message.includes('não encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar notificação',
      details: error.message,
    })
  }
}

/**
 * Eliminar todas as notificações lidas
 * DELETE /api/notifications/read
 */
export const deleteReadNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const result = await notificationService.deleteReadNotifications(req.user.id)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete read notifications error:', error)
    return res.status(500).json({
      error: 'Erro ao eliminar notificações lidas',
      details: error.message,
    })
  }
}

/**
 * Obter contador de não lidas
 * GET /api/notifications/count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const result = await notificationService.getUnreadCount(req.user.id)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get unread count error:', error)
    return res.status(500).json({
      error: 'Erro ao obter contador',
      details: error.message,
    })
  }
}

/**
 * Obter estatísticas
 * GET /api/notifications/stats
 */
export const getNotificationStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const stats = await notificationService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get notification stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
