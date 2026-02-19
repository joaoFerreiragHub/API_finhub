import { Router } from 'express'
import {
  listCourses,
  getCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  toggleLike,
  toggleFavorite,
  getMyCourses,
  getMyStats,
} from '../controllers/course.controller'
import { authenticate } from '../middlewares/auth'
import { requireCreator } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Públicas
// ==========================================

/**
 * @route   GET /api/courses
 * @desc    Listar artigos (com filtros e paginação)
 * @access  Public
 * @query   ?category=finance&isPremium=false&isFeatured=true&tags=crypto,investing&search=bitcoin&page=1&limit=20&sort=recent|popular|rating
 */
router.get('/', listCourses)

/**
 * @route   GET /api/courses/:slug
 * @desc    Obter artigo por slug
 * @access  Public
 */
router.get('/:slug', getCourseBySlug)

// ==========================================
// Rotas Protegidas (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/courses/my
 * @desc    Listar meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyCourses)

/**
 * @route   GET /api/courses/stats
 * @desc    Estatísticas dos meus artigos
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyStats)

/**
 * @route   POST /api/courses
 * @desc    Criar novo artigo
 * @access  Private (Creator/Admin)
 */
router.post('/', authenticate, requireCreator, createCourse)

/**
 * @route   PATCH /api/courses/:id
 * @desc    Atualizar artigo
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updateCourse)

/**
 * @route   DELETE /api/courses/:id
 * @desc    Eliminar artigo
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deleteCourse)

/**
 * @route   PATCH /api/courses/:id/publish
 * @desc    Publicar artigo (mudar status para published)
 * @access  Private (Owner/Admin)
 */
router.patch('/:id/publish', authenticate, requireCreator, publishCourse)

// ==========================================
// Rotas de Interação (Auth Required)
// ==========================================

/**
 * @route   POST /api/courses/:id/like
 * @desc    Like/Unlike artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/like', authenticate, toggleLike)

/**
 * @route   POST /api/courses/:id/favorite
 * @desc    Favorite/Unfavorite artigo
 * @access  Private
 * @body    { increment: true|false }
 */
router.post('/:id/favorite', authenticate, toggleFavorite)

export default router
