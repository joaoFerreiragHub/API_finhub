import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { notificationService } from '../services/notification.service'
import { userPreferenceService } from '../services/userPreference.service'

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

/**
 * Obter preferencias de notificacao
 * GET /api/notifications/preferences
 */
export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const notificationPreferences = await userPreferenceService.getNotificationPreferences(
      req.user.id
    )

    return res.status(200).json({ notificationPreferences })
  } catch (error: any) {
    console.error('Get notification preferences error:', error)
    return res.status(500).json({
      error: 'Erro ao obter preferencias',
      details: error.message,
    })
  }
}

/**
 * Atualizar preferencias de notificacao
 * PATCH /api/notifications/preferences
 */
export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const notificationPreferences = await userPreferenceService.updateNotificationPreferences(
      req.user.id,
      req.body
    )

    return res.status(200).json({ notificationPreferences })
  } catch (error: any) {
    console.error('Update notification preferences error:', error)
    return res.status(500).json({
      error: 'Erro ao atualizar preferencias',
      details: error.message,
    })
  }
}

/**
 * Listar subscriptions por creator para content_published
 * GET /api/notifications/subscriptions
 */
export const getCreatorSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const options = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
    }

    const result = await userPreferenceService.listCreatorSubscriptions(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get creator subscriptions error:', error)
    return res.status(500).json({
      error: 'Erro ao listar subscriptions',
      details: error.message,
    })
  }
}

/**
 * Obter status de subscription por creator
 * GET /api/notifications/subscriptions/:creatorId
 */
export const getCreatorSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const creatorId = String(req.params.creatorId ?? '')
    if (!creatorId) {
      return res.status(400).json({ error: 'creatorId obrigatorio' })
    }

    const result = await userPreferenceService.getCreatorSubscriptionStatus(req.user.id, creatorId)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get creator subscription status error:', error)

    if (error.message.includes('Creator nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao obter subscription',
      details: error.message,
    })
  }
}

/**
 * Ativar subscription por creator
 * PUT /api/notifications/subscriptions/:creatorId
 */
export const subscribeToCreator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const creatorId = String(req.params.creatorId ?? '')
    if (!creatorId) {
      return res.status(400).json({ error: 'creatorId obrigatorio' })
    }

    const result = await userPreferenceService.setCreatorSubscription(req.user.id, creatorId, true)

    const statusCode = result.created ? 201 : 200
    return res.status(statusCode).json(result)
  } catch (error: any) {
    console.error('Subscribe to creator error:', error)

    if (error.message.includes('Creator nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    if (error.message.includes('Segue o creator')) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao ativar subscription',
      details: error.message,
    })
  }
}

/**
 * Desativar subscription por creator
 * DELETE /api/notifications/subscriptions/:creatorId
 */
export const unsubscribeFromCreator = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const creatorId = String(req.params.creatorId ?? '')
    if (!creatorId) {
      return res.status(400).json({ error: 'creatorId obrigatorio' })
    }

    const result = await userPreferenceService.setCreatorSubscription(req.user.id, creatorId, false)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Unsubscribe from creator error:', error)

    if (error.message.includes('Creator nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    if (error.message.includes('Segue o creator')) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao desativar subscription',
      details: error.message,
    })
  }
}
