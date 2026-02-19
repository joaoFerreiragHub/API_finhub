import { Router } from 'express'
import {
  addFavorite,
  removeFavorite,
  checkFavorite,
  getUserFavorites,
  getFavoriteStats,
} from '../controllers/favorite.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

// ==========================================
// Rotas de Favorites (Todas autenticadas)
// ==========================================

/**
 * @route   POST /api/favorites
 * @desc    Adicionar aos favoritos
 * @access  Private (Auth)
 * @body    { targetType: string, targetId: string }
 */
router.post('/', authenticate, addFavorite)

/**
 * @route   DELETE /api/favorites
 * @desc    Remover dos favoritos
 * @access  Private (Auth)
 * @body    { targetType: string, targetId: string }
 */
router.delete('/', authenticate, removeFavorite)

/**
 * @route   GET /api/favorites/check
 * @desc    Verificar se está nos favoritos
 * @access  Private (Auth)
 * @query   ?targetType=article&targetId=123
 */
router.get('/check', authenticate, checkFavorite)

/**
 * @route   GET /api/favorites
 * @desc    Listar favoritos do utilizador
 * @access  Private (Auth)
 * @query   ?targetType=article&page=1&limit=20
 */
router.get('/', authenticate, getUserFavorites)

/**
 * @route   GET /api/favorites/stats
 * @desc    Estatísticas de favoritos
 * @access  Private (Auth)
 */
router.get('/stats', authenticate, getFavoriteStats)

export default router
