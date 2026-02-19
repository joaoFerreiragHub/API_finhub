import { Router } from 'express'
import {
  followUser,
  unfollowUser,
  checkFollowing,
  getFollowers,
  getFollowing,
  getMutualFollows,
  getFollowStats,
} from '../controllers/follow.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

// ==========================================
// Rotas de Follow
// ==========================================

/**
 * @route   POST /api/follow/:userId
 * @desc    Seguir utilizador
 * @access  Private (Auth)
 */
router.post('/:userId', authenticate, followUser)

/**
 * @route   DELETE /api/follow/:userId
 * @desc    Deixar de seguir utilizador
 * @access  Private (Auth)
 */
router.delete('/:userId', authenticate, unfollowUser)

/**
 * @route   GET /api/follow/check/:userId
 * @desc    Verificar se está a seguir utilizador
 * @access  Private (Auth)
 */
router.get('/check/:userId', authenticate, checkFollowing)

/**
 * @route   GET /api/follow/mutual
 * @desc    Obter seguimentos mútuos (amigos)
 * @access  Private (Auth)
 */
router.get('/mutual', authenticate, getMutualFollows)

/**
 * @route   GET /api/follow/:userId/followers
 * @desc    Listar seguidores de um utilizador
 * @access  Public
 * @query   ?page=1&limit=20
 */
router.get('/:userId/followers', getFollowers)

/**
 * @route   GET /api/follow/:userId/following
 * @desc    Listar quem o utilizador está a seguir
 * @access  Public
 * @query   ?page=1&limit=20
 */
router.get('/:userId/following', getFollowing)

/**
 * @route   GET /api/follow/:userId/stats
 * @desc    Estatísticas de follow
 * @access  Public
 */
router.get('/:userId/stats', getFollowStats)

export default router
