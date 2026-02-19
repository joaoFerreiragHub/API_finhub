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
import { requireAdminScope } from '../middlewares/roleGuard'
import { auditAdminAction } from '../middlewares/adminAudit'

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
router.get(
  '/admin/stats',
  authenticate,
  auditAdminAction({
    action: 'brand.stats.read',
    resourceType: 'brand',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getStats
)

/**
 * @route   POST /api/brands
 * @desc    Criar nova brand
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  auditAdminAction({
    action: 'brand.create',
    resourceType: 'brand',
    scope: 'admin.brands.write',
  }),
  requireAdminScope('admin.brands.write'),
  createBrand
)

/**
 * @route   PATCH /api/brands/:id
 * @desc    Atualizar brand
 * @access  Private (Admin)
 */
router.patch(
  '/:id',
  authenticate,
  auditAdminAction({
    action: 'brand.update',
    resourceType: 'brand',
    scope: 'admin.brands.write',
    getResourceId: (req) => String(req.params.id ?? ''),
  }),
  requireAdminScope('admin.brands.write'),
  updateBrand
)

/**
 * @route   DELETE /api/brands/:id
 * @desc    Eliminar brand
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  auditAdminAction({
    action: 'brand.delete',
    resourceType: 'brand',
    scope: 'admin.brands.write',
    getResourceId: (req) => String(req.params.id ?? ''),
  }),
  requireAdminScope('admin.brands.write'),
  deleteBrand
)

/**
 * @route   PATCH /api/brands/:id/toggle-active
 * @desc    Ativar/Desativar brand
 * @access  Private (Admin)
 */
router.patch(
  '/:id/toggle-active',
  authenticate,
  auditAdminAction({
    action: 'brand.toggle_active',
    resourceType: 'brand',
    scope: 'admin.brands.write',
    getResourceId: (req) => String(req.params.id ?? ''),
  }),
  requireAdminScope('admin.brands.write'),
  toggleActive
)

/**
 * @route   PATCH /api/brands/:id/toggle-featured
 * @desc    Destacar/Remover destaque de brand
 * @access  Private (Admin)
 */
router.patch(
  '/:id/toggle-featured',
  authenticate,
  auditAdminAction({
    action: 'brand.toggle_featured',
    resourceType: 'brand',
    scope: 'admin.brands.write',
    getResourceId: (req) => String(req.params.id ?? ''),
  }),
  requireAdminScope('admin.brands.write'),
  toggleFeatured
)

/**
 * @route   PATCH /api/brands/:id/toggle-verified
 * @desc    Verificar/Remover verificação de brand
 * @access  Private (Admin)
 */
router.patch(
  '/:id/toggle-verified',
  authenticate,
  auditAdminAction({
    action: 'brand.toggle_verified',
    resourceType: 'brand',
    scope: 'admin.brands.write',
    getResourceId: (req) => String(req.params.id ?? ''),
  }),
  requireAdminScope('admin.brands.write'),
  toggleVerified
)

export default router
