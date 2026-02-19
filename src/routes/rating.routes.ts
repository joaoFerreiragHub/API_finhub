import { Router } from 'express'
import {
  createOrUpdateRating,
  deleteRating,
  getMyRating,
  getMyRatingReaction,
  getRatingStats,
  listRatings,
  reactToRating,
} from '../controllers/rating.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

/**
 * @route   POST /api/ratings
 * @desc    Criar ou atualizar rating
 * @access  Private
 * @body    { targetType, targetId, rating, review? }
 */
router.post('/', authenticate, createOrUpdateRating)

/**
 * @route   GET /api/ratings/my/:targetType/:targetId
 * @desc    Obter meu rating para um target
 * @access  Private
 */
router.get('/my/:targetType/:targetId', authenticate, getMyRating)

/**
 * @route   POST /api/ratings/:id/reaction
 * @desc    Reagir a review (like/dislike/remove)
 * @access  Private
 * @body    { reaction: "like" | "dislike" | "none" }
 */
router.post('/:id/reaction', authenticate, reactToRating)

/**
 * @route   GET /api/ratings/:id/reaction/my
 * @desc    Obter a minha reacao para uma review
 * @access  Private
 */
router.get('/:id/reaction/my', authenticate, getMyRatingReaction)

/**
 * @route   GET /api/ratings/:targetType/:targetId/stats
 * @desc    Obter estatisticas de ratings (media, distribuicao, feedback em reviews)
 * @access  Public
 */
router.get('/:targetType/:targetId/stats', getRatingStats)

/**
 * @route   GET /api/ratings/:targetType/:targetId
 * @desc    Listar ratings de um target
 * @access  Public
 * @query   ?page=1&limit=20&sort=recent|rating-high|rating-low|helpful
 */
router.get('/:targetType/:targetId', listRatings)

/**
 * @route   DELETE /api/ratings/:id
 * @desc    Eliminar rating
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, deleteRating)

export default router
