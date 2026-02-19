import { Router } from 'express'
import {
  listPodcasts,
  getPodcastBySlug,
  createPodcast,
  updatePodcast,
  deletePodcast,
  publishPodcast,
  toggleLike,
  toggleFavorite,
  getMyPodcasts,
  getMyStats,
} from '../controllers/podcast.controller'
import { authenticate } from '../middlewares/auth'
import { requireCreator } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Públicas
// ==========================================

/**
 * @route   GET /api/podcasts
 * @desc    Listar artigos (com filtros e paginação)
 * @access  Public
 * @query   ?category=finance&isPremium=false&isFeatured=true&tags=crypto,investing&search=bitcoin&page=1&limit=20&sort=recent|popular|rating
 */
router.get('/', listPodcasts)

/**
 * @route   GET /api/podcasts/:slug
 * @desc    Obter artigo por slug
 * @access  Public
 */
router.get('/:slug', getPodcastBySlug)

// ==========================================
// Rotas Protegidas (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/podcasts/my
 * @desc    Listar meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyPodcasts)

/**
 * @route   GET /api/podcasts/stats
 * @desc    Estatísticas dos meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyStats)

/**
 * @route   POST /api/podcasts
 * @desc    Criar novo artigo
 * @access  Private (Creator/Admin)
 */
router.post('/', authenticate, requireCreator, createPodcast)

/**
 * @route   PATCH /api/podcasts/:id
 * @desc    Atualizar artigo
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updatePodcast)

/**
 * @route   DELETE /api/podcasts/:id
 * @desc    Eliminar artigo
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deletePodcast)

/**
 * @route   PATCH /api/podcasts/:id/publish
 * @desc    Publicar artigo (mudar status para published)
 * @access  Private (Owner/Admin)
 */
router.patch('/:id/publish', authenticate, requireCreator, publishPodcast)

// ==========================================
// Rotas de Interação (Auth Required)
// ==========================================

/**
 * @route   POST /api/podcasts/:id/like
 * @desc    Like/Unlike artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/like', authenticate, toggleLike)

/**
 * @route   POST /api/podcasts/:id/favorite
 * @desc    Favorite/Unfavorite artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/favorite', authenticate, toggleFavorite)

export default router
