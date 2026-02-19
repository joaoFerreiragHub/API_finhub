import { Router } from 'express'
import {
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  getUnreadCount,
  getNotificationStats,
} from '../controllers/notification.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

// ==========================================
// Rotas de Notifications (Todas autenticadas)
// ==========================================

/**
 * @route   GET /api/notifications
 * @desc    Listar notificações do utilizador
 * @access  Private (Auth)
 * @query   ?page=1&limit=20
 */
router.get('/', authenticate, getUserNotifications)

/**
 * @route   GET /api/notifications/unread
 * @desc    Listar notificações não lidas
 * @access  Private (Auth)
 * @query   ?page=1&limit=20
 */
router.get('/unread', authenticate, getUnreadNotifications)

/**
 * @route   GET /api/notifications/count
 * @desc    Obter contador de notificações não lidas
 * @access  Private (Auth)
 */
router.get('/count', authenticate, getUnreadCount)

/**
 * @route   GET /api/notifications/stats
 * @desc    Estatísticas de notificações
 * @access  Private (Auth)
 */
router.get('/stats', authenticate, getNotificationStats)

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Marcar todas as notificações como lidas
 * @access  Private (Auth)
 */
router.patch('/read-all', authenticate, markAllAsRead)

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Marcar notificação como lida
 * @access  Private (Auth)
 */
router.patch('/:id/read', authenticate, markAsRead)

/**
 * @route   DELETE /api/notifications/read
 * @desc    Eliminar todas as notificações lidas
 * @access  Private (Auth)
 */
router.delete('/read', authenticate, deleteReadNotifications)

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Eliminar notificação
 * @access  Private (Auth)
 */
router.delete('/:id', authenticate, deleteNotification)

export default router
