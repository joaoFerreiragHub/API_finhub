import { Router } from 'express'
import {
  createReel,
  deleteReel,
  getMyReels,
  getMyStats,
  getReelById,
  getReelBySlug,
  listReels,
  publishReel,
  toggleFavorite,
  toggleLike,
  updateReel,
} from '../controllers/reel.controller'
import { authenticate } from '../middlewares/auth'
import { enforceCreatorOperationalControl } from '../middlewares/creatorOperationalControl'
import { requireCreator, requireVerifiedEmail } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Publicas
// ==========================================

/**
 * @route   GET /api/reels
 * @desc    Listar reels (com filtros e paginacao)
 * @access  Public
 */
router.get('/', listReels)

/**
 * @route   GET /api/reels/id/:id
 * @desc    Obter reel por id
 * @access  Public
 */
router.get('/id/:id', getReelById)

// ==========================================
// Rotas Protegidas (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/reels/me
 * @desc    Listar meus reels
 * @access  Private (Creator/Admin)
 */
router.get('/me', authenticate, requireCreator, getMyReels)

/**
 * @route   GET /api/reels/my
 * @desc    Alias legacy para listar meus reels
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyReels)

/**
 * @route   GET /api/reels/stats
 * @desc    Estatisticas dos meus reels
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyStats)

/**
 * @route   POST /api/reels
 * @desc    Criar novo reel
 * @access  Private (Creator/Admin)
 */
router.post(
  '/',
  authenticate,
  requireCreator,
  requireVerifiedEmail,
  enforceCreatorOperationalControl('create'),
  createReel
)

/**
 * @route   PATCH /api/reels/:id
 * @desc    Atualizar reel
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updateReel)

/**
 * @route   DELETE /api/reels/:id
 * @desc    Eliminar reel
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deleteReel)

/**
 * @route   PATCH /api/reels/:id/publish
 * @desc    Publicar reel (mudar status para published)
 * @access  Private (Owner/Admin)
 */
router.patch(
  '/:id/publish',
  authenticate,
  requireCreator,
  requireVerifiedEmail,
  enforceCreatorOperationalControl('publish'),
  publishReel
)

// ==========================================
// Rotas de Interacao (Auth Required)
// ==========================================

/**
 * @route   POST /api/reels/:id/like
 * @desc    Like/Unlike reel
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/like', authenticate, toggleLike)

/**
 * @route   POST /api/reels/:id/favorite
 * @desc    Favorite/Unfavorite reel
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/favorite', authenticate, toggleFavorite)

/**
 * @route   GET /api/reels/:slug
 * @desc    Obter reel por slug
 * @access  Public
 */
router.get('/:slug', getReelBySlug)

export default router
