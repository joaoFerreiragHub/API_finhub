import { Router } from 'express'
import {
  listBrands,
  getBrandBySlug,
  getFeaturedBrands,
  getBrandsByType,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleActive,
  toggleFeatured,
  toggleVerified,
  getStats,
} from '../controllers/brand.controller'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/roleGuard'

const router = Router()

// ==========================================
// Rotas Públicas
// ==========================================

/**
 * @route   GET /api/brands
 * @desc    Listar brands (com filtros e paginação)
 * @access  Public
 * @query   ?brandType=broker&isActive=true&isFeatured=true&isVerified=true&category=crypto&country=PT&tags=crypto,stocks&search=binance&page=1&limit=20&sort=recent|popular|rating|name|featured
 */
router.get('/', listBrands)

/**
 * @route   GET /api/brands/featured
 * @desc    Obter brands em destaque
 * @access  Public
 * @query   ?limit=10
 */
router.get('/featured', getFeaturedBrands)

/**
 * @route   GET /api/brands/type/:type
 * @desc    Obter brands por tipo
 * @access  Public
 * @params  type: broker|platform|website|podcast|tool|exchange|news-source|other
 * @query   ?limit=20
 */
router.get('/type/:type', getBrandsByType)

/**
 * @route   GET /api/brands/:slug
 * @desc    Obter brand por slug
 * @access  Public
 */
router.get('/:slug', getBrandBySlug)

// ==========================================
// Rotas Protegidas (Admin Only)
// ==========================================

/**
 * @route   GET /api/brands/stats
 * @desc    Estatísticas gerais de brands
 * @access  Private (Admin)
 */
router.get('/admin/stats', authenticate, requireAdmin, getStats)

/**
 * @route   POST /api/brands
 * @desc    Criar nova brand
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireAdmin, createBrand)

/**
 * @route   PATCH /api/brands/:id
 * @desc    Atualizar brand
 * @access  Private (Admin)
 */
router.patch('/:id', authenticate, requireAdmin, updateBrand)

/**
 * @route   DELETE /api/brands/:id
 * @desc    Eliminar brand
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteBrand)

/**
 * @route   PATCH /api/brands/:id/toggle-active
 * @desc    Ativar/Desativar brand
 * @access  Private (Admin)
 */
router.patch('/:id/toggle-active', authenticate, requireAdmin, toggleActive)

/**
 * @route   PATCH /api/brands/:id/toggle-featured
 * @desc    Destacar/Remover destaque de brand
 * @access  Private (Admin)
 */
router.patch('/:id/toggle-featured', authenticate, requireAdmin, toggleFeatured)

/**
 * @route   PATCH /api/brands/:id/toggle-verified
 * @desc    Verificar/Remover verificação de brand
 * @access  Private (Admin)
 */
router.patch('/:id/toggle-verified', authenticate, requireAdmin, toggleVerified)

export default router
