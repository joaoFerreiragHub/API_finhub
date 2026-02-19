import { Router } from 'express'
import {
  listVideos,
  getVideoBySlug,
  createVideo,
  updateVideo,
  deleteVideo,
  publishVideo,
  toggleLike,
  toggleFavorite,
  getMyVideos,
  getMyStats,
} from '../controllers/video.controller'
import { authenticate } from '../middlewares/auth'
import { requireCreator } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Públicas
// ==========================================

/**
 * @route   GET /api/videos
 * @desc    Listar artigos (com filtros e paginação)
 * @access  Public
 * @query   ?category=finance&isPremium=false&isFeatured=true&tags=crypto,investing&search=bitcoin&page=1&limit=20&sort=recent|popular|rating
 */
router.get('/', listVideos)

/**
 * @route   GET /api/videos/:slug
 * @desc    Obter artigo por slug
 * @access  Public
 */
router.get('/:slug', getVideoBySlug)

// ==========================================
// Rotas Protegidas (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/videos/my
 * @desc    Listar meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyVideos)

/**
 * @route   GET /api/videos/stats
 * @desc    Estatísticas dos meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyStats)

/**
 * @route   POST /api/videos
 * @desc    Criar novo artigo
 * @access  Private (Creator/Admin)
 */
router.post('/', authenticate, requireCreator, createVideo)

/**
 * @route   PATCH /api/videos/:id
 * @desc    Atualizar artigo
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updateVideo)

/**
 * @route   DELETE /api/videos/:id
 * @desc    Eliminar artigo
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deleteVideo)

/**
 * @route   PATCH /api/videos/:id/publish
 * @desc    Publicar artigo (mudar status para published)
 * @access  Private (Owner/Admin)
 */
router.patch('/:id/publish', authenticate, requireCreator, publishVideo)

// ==========================================
// Rotas de Interação (Auth Required)
// ==========================================

/**
 * @route   POST /api/videos/:id/like
 * @desc    Like/Unlike artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/like', authenticate, toggleLike)

/**
 * @route   POST /api/videos/:id/favorite
 * @desc    Favorite/Unfavorite artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/favorite', authenticate, toggleFavorite)

export default router
