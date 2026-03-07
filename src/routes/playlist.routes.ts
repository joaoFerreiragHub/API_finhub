import { Router } from 'express'
import {
  createPlaylist,
  deletePlaylist,
  getMyPlaylists,
  getMyStats,
  getPlaylistById,
  getPlaylistBySlug,
  listPlaylists,
  updatePlaylist,
} from '../controllers/playlist.controller'
import { authenticate } from '../middlewares/auth'
import { enforceCreatorOperationalControl } from '../middlewares/creatorOperationalControl'
import { requireCreator, requireVerifiedEmail } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Publicas
// ==========================================

/**
 * @route   GET /api/playlists
 * @desc    Listar playlists publicas
 * @access  Public
 */
router.get('/', listPlaylists)

/**
 * @route   GET /api/playlists/id/:id
 * @desc    Obter playlist por id
 * @access  Public
 */
router.get('/id/:id', getPlaylistById)

// ==========================================
// Rotas Protegidas (Creator Dashboard)
// ==========================================

/**
 * @route   GET /api/playlists/me
 * @desc    Listar minhas playlists
 * @access  Private (Creator/Admin)
 */
router.get('/me', authenticate, requireCreator, getMyPlaylists)

/**
 * @route   GET /api/playlists/my
 * @desc    Alias legacy para listar minhas playlists
 * @access  Private (Creator/Admin)
 */
router.get('/my', authenticate, requireCreator, getMyPlaylists)

/**
 * @route   GET /api/playlists/stats
 * @desc    Estatisticas das minhas playlists
 * @access  Private (Creator/Admin)
 */
router.get('/stats', authenticate, requireCreator, getMyStats)

/**
 * @route   POST /api/playlists
 * @desc    Criar nova playlist
 * @access  Private (Creator/Admin)
 */
router.post(
  '/',
  authenticate,
  requireCreator,
  requireVerifiedEmail,
  enforceCreatorOperationalControl('create'),
  createPlaylist
)

/**
 * @route   PATCH /api/playlists/:id
 * @desc    Atualizar playlist
 * @access  Private (Owner/Admin)
 */
router.patch('/:id', authenticate, requireCreator, updatePlaylist)

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Eliminar playlist
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, requireCreator, deletePlaylist)

/**
 * @route   GET /api/playlists/:slug
 * @desc    Obter playlist por slug
 * @access  Public
 */
router.get('/:slug', getPlaylistBySlug)

export default router
