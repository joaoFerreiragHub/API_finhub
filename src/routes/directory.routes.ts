import { Router } from 'express'
import {
  comparePublicDirectories,
  getPublicDirectoryByVerticalAndSlug,
  listPublicDirectoryCategories,
  listRelatedPublicDirectoryContent,
  listFeaturedPublicDirectories,
  listPublicDirectories,
  listPublicDirectoriesByVertical,
  searchPublicDirectories,
} from '../controllers/publicDirectory.controller'
import { rateLimiter } from '../middlewares/rateLimiter'
import {
  validatePublicDirectoryByVerticalContract,
  validatePublicDirectoryCategoriesContract,
  validatePublicDirectoryCompareContract,
  validatePublicDirectoryDetailContract,
  validatePublicDirectoryFeaturedContract,
  validatePublicDirectoryListContract,
  validatePublicDirectoryRelatedContentContract,
  validatePublicDirectorySearchContract,
} from '../middlewares/requestContracts'

const router = Router()

/**
 * @route   GET /api/directories
 * @desc    Listagem publica de recursos/diretorio com filtros e paginacao
 * @access  Public
 */
router.get('/', rateLimiter.general, validatePublicDirectoryListContract, listPublicDirectories)

/**
 * @route   GET /api/directories/featured
 * @desc    Lista publica de recursos em destaque
 * @access  Public
 */
router.get(
  '/featured',
  rateLimiter.general,
  validatePublicDirectoryFeaturedContract,
  listFeaturedPublicDirectories
)

/**
 * @route   GET /api/directories/categories
 * @desc    Resumo de categorias (verticais) com contagens do diretorio publico
 * @access  Public
 */
router.get(
  '/categories',
  rateLimiter.general,
  validatePublicDirectoryCategoriesContract,
  listPublicDirectoryCategories
)

/**
 * @route   GET /api/directories/search
 * @desc    Pesquisa cross-vertical no diretorio publico
 * @access  Public
 */
router.get('/search', rateLimiter.search, validatePublicDirectorySearchContract, searchPublicDirectories)

/**
 * @route   GET /api/directories/compare
 * @desc    Comparacao lado a lado de 2 a 3 entidades (query: slugs=a,b[,c])
 * @access  Public
 */
router.get('/compare', rateLimiter.general, validatePublicDirectoryCompareContract, comparePublicDirectories)

/**
 * @route   GET /api/directories/:vertical/:slug/related-content
 * @desc    Conteudo publico relacionado com a entidade
 * @access  Public
 */
router.get(
  '/:vertical/:slug/related-content',
  rateLimiter.general,
  validatePublicDirectoryRelatedContentContract,
  listRelatedPublicDirectoryContent
)

/**
 * @route   GET /api/directories/:vertical/:slug
 * @desc    Detalhe publico por vertical + slug (incrementa views)
 * @access  Public
 */
router.get(
  '/:vertical/:slug',
  rateLimiter.general,
  validatePublicDirectoryDetailContract,
  getPublicDirectoryByVerticalAndSlug
)

/**
 * @route   GET /api/directories/:vertical
 * @desc    Listagem publica por vertical
 * @access  Public
 */
router.get(
  '/:vertical',
  rateLimiter.general,
  validatePublicDirectoryByVerticalContract,
  listPublicDirectoriesByVertical
)

export default router
