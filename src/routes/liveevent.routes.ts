import { Router } from 'express'
import {
  listLives,
  getLiveBySlug,
  createLive,
  updateLive,
  deleteLive,
  publishLive,
  toggleLike,
  toggleFavorite,
  getMyLives,
  getMyStats,
} from '../controllers/liveevent.controller'
import { authenticate } from '../middlewares/auth'
import { enforceCreatorOperationalControl } from '../middlewares/creatorOperationalControl'
import { requireCreator } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Públicas
// ==========================================

/**
 * @route   GET /api/liveevents
 * @desc    Listar artigos (com filtros e paginação)
 * @access  Public
 * @query   ?category=finance&isPremium=false&isFeatured=true&tags=crypto,investing&search=bitcoin&page=1&limit=20&sort=recent|popular|rating
 */
router.get('/', listLives)

/**
 * @route   GET /api/liveevents/:slug
 * @desc    Obter artigo por slug
 * @access  Public
 */
router.get('/:slug', getLiveBySlug)

// ==========================================
// Rotas Protegidas (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/liveevents/my
 * @desc    Listar meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyLives)

/**
 * @route   GET /api/liveevents/stats
 * @desc    Estatísticas dos meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyStats)

/**
 * @route   POST /api/liveevents
 * @desc    Criar novo artigo
 * @access  Private (Creator/Admin)
 */
router.post('/', authenticate, requireCreator, enforceCreatorOperationalControl('create'), createLive)

/**
 * @route   PATCH /api/liveevents/:id
 * @desc    Atualizar artigo
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updateLive)

/**
 * @route   DELETE /api/liveevents/:id
 * @desc    Eliminar artigo
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deleteLive)

/**
 * @route   PATCH /api/liveevents/:id/publish
 * @desc    Publicar artigo (mudar status para published)
 * @access  Private (Owner/Admin)
 */
router.patch(
  '/:id/publish',
  authenticate,
  requireCreator,
  enforceCreatorOperationalControl('publish'),
  publishLive
)

// ==========================================
// Rotas de Interação (Auth Required)
// ==========================================

/**
 * @route   POST /api/liveevents/:id/like
 * @desc    Like/Unlike artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/like', authenticate, toggleLike)

/**
 * @route   POST /api/liveevents/:id/favorite
 * @desc    Favorite/Unfavorite artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/favorite', authenticate, toggleFavorite)

export default router
