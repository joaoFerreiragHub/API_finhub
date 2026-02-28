import { Router } from 'express'
import {
  listArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticle,
  toggleLike,
  toggleFavorite,
  getMyArticles,
  getMyStats,
} from '../controllers/article.controller'
import { authenticate } from '../middlewares/auth'
import { enforceCreatorOperationalControl } from '../middlewares/creatorOperationalControl'
import { requireCreator } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Públicas
// ==========================================

/**
 * @route   GET /api/articles
 * @desc    Listar artigos (com filtros e paginação)
 * @access  Public
 * @query   ?category=finance&isPremium=false&isFeatured=true&tags=crypto,investing&search=bitcoin&page=1&limit=20&sort=recent|popular|rating
 */
router.get('/', listArticles)

/**
 * @route   GET /api/articles/:slug
 * @desc    Obter artigo por slug
 * @access  Public
 */
router.get('/:slug', getArticleBySlug)

// ==========================================
// Rotas Protegidas (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/articles/my
 * @desc    Listar meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyArticles)

/**
 * @route   GET /api/articles/stats
 * @desc    Estatísticas dos meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyStats)

/**
 * @route   POST /api/articles
 * @desc    Criar novo artigo
 * @access  Private (Creator/Admin)
 */
router.post('/', authenticate, requireCreator, enforceCreatorOperationalControl('create'), createArticle)

/**
 * @route   PATCH /api/articles/:id
 * @desc    Atualizar artigo
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updateArticle)

/**
 * @route   DELETE /api/articles/:id
 * @desc    Eliminar artigo
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deleteArticle)

/**
 * @route   PATCH /api/articles/:id/publish
 * @desc    Publicar artigo (mudar status para published)
 * @access  Private (Owner/Admin)
 */
router.patch(
  '/:id/publish',
  authenticate,
  requireCreator,
  enforceCreatorOperationalControl('publish'),
  publishArticle
)

// ==========================================
// Rotas de Interação (Auth Required)
// ==========================================

/**
 * @route   POST /api/articles/:id/like
 * @desc    Like/Unlike artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/like', authenticate, toggleLike)

/**
 * @route   POST /api/articles/:id/favorite
 * @desc    Favorite/Unfavorite artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/favorite', authenticate, toggleFavorite)

export default router
