import { Router } from 'express'
import {
  getCommunityRoomBySlug,
  listCommunityRooms,
} from '../controllers/communityRoom.controller'
import {
  createCommunityPostReply,
  getCommunityLeaderboard,
  createCommunityRoomPost,
  getCommunityMyXp,
  getCommunityPostDetail,
  listCommunityRoomPosts,
  voteCommunityPost,
  voteCommunityReply,
} from '../controllers/communityThread.controller'
import { authenticate, optionalAuth } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'
import {
  validateCommunityCreatePostContract,
  validateCommunityCreateReplyContract,
  validateCommunityPostIdContract,
  validateCommunityRoomPostsListContract,
  validateCommunityRoomSlugContract,
  validateCommunityRoomsListContract,
  validateCommunityVoteContract,
} from '../middlewares/requestContracts'

const router = Router()

/**
 * @route GET /api/community/me/xp
 * @desc  XP/nivel do utilizador autenticado
 * @access Private
 */
router.get('/me/xp', authenticate, rateLimiter.general, getCommunityMyXp)

/**
 * @route GET /api/community/leaderboard
 * @desc  Leaderboard semanal da comunidade (top 10)
 * @access Public (com auth opcional para incluir posicao do utilizador)
 */
router.get('/leaderboard', optionalAuth, rateLimiter.general, getCommunityLeaderboard)

/**
 * @route GET /api/community/rooms
 * @desc  Lista salas da comunidade (publicas e premium)
 * @access Public
 */
router.get('/rooms', rateLimiter.general, validateCommunityRoomsListContract, listCommunityRooms)

/**
 * @route GET /api/community/rooms/:slug
 * @desc  Detalhe de sala da comunidade por slug
 * @access Public
 */
router.get('/rooms/:slug', rateLimiter.general, validateCommunityRoomSlugContract, getCommunityRoomBySlug)

/**
 * @route GET /api/community/rooms/:slug/posts
 * @desc  Lista posts da sala com cursor pagination
 * @access Public (com auth opcional para viewerVote)
 */
router.get(
  '/rooms/:slug/posts',
  optionalAuth,
  rateLimiter.general,
  validateCommunityRoomPostsListContract,
  listCommunityRoomPosts
)

/**
 * @route POST /api/community/rooms/:slug/posts
 * @desc  Criar novo post na sala
 * @access Private
 */
router.post(
  '/rooms/:slug/posts',
  authenticate,
  rateLimiter.communityCreatePost,
  validateCommunityCreatePostContract,
  createCommunityRoomPost
)

/**
 * @route GET /api/community/posts/:id
 * @desc  Detalhe de post + replies
 * @access Public (com auth opcional para viewerVote)
 */
router.get('/posts/:id', optionalAuth, rateLimiter.general, validateCommunityPostIdContract, getCommunityPostDetail)

/**
 * @route POST /api/community/posts/:id/replies
 * @desc  Criar reply no post
 * @access Private
 */
router.post(
  '/posts/:id/replies',
  authenticate,
  rateLimiter.communityCreatePost,
  validateCommunityCreateReplyContract,
  createCommunityPostReply
)

/**
 * @route POST /api/community/posts/:id/vote
 * @desc  Vote idempotente em post (up/down)
 * @access Private
 */
router.post(
  '/posts/:id/vote',
  authenticate,
  rateLimiter.communityVote,
  validateCommunityVoteContract,
  voteCommunityPost
)

/**
 * @route POST /api/community/replies/:id/vote
 * @desc  Vote idempotente em reply (up/down)
 * @access Private
 */
router.post(
  '/replies/:id/vote',
  authenticate,
  rateLimiter.communityVote,
  validateCommunityVoteContract,
  voteCommunityReply
)

export default router
