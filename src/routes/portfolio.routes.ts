import { Router } from 'express'
import {
  addPortfolioHolding,
  createPortfolio,
  deletePortfolio,
  deletePortfolioHolding,
  getPortfolioById,
  listPortfolios,
  simulatePortfolio,
  updatePortfolio,
  updatePortfolioHolding,
} from '../controllers/portfolio.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

router.use(authenticate)
router.use(rateLimiter.general)

/**
 * @route   POST /api/portfolio
 * @desc    Criar portfolio FIRE
 * @access  Private
 */
router.post('/', createPortfolio)

/**
 * @route   GET /api/portfolio
 * @desc    Listar portfolios do user autenticado
 * @access  Private
 */
router.get('/', listPortfolios)

/**
 * @route   GET /api/portfolio/:id
 * @desc    Obter detalhe de portfolio
 * @access  Private
 */
router.get('/:id', getPortfolioById)

/**
 * @route   PATCH /api/portfolio/:id
 * @desc    Atualizar configuracao de portfolio
 * @access  Private
 */
router.patch('/:id', updatePortfolio)

/**
 * @route   DELETE /api/portfolio/:id
 * @desc    Eliminar portfolio
 * @access  Private
 */
router.delete('/:id', deletePortfolio)

/**
 * @route   POST /api/portfolio/:id/holdings
 * @desc    Adicionar ativo ao portfolio
 * @access  Private
 */
router.post('/:id/holdings', addPortfolioHolding)

/**
 * @route   PATCH /api/portfolio/:id/holdings/:holdingId
 * @desc    Atualizar holding do portfolio
 * @access  Private
 */
router.patch('/:id/holdings/:holdingId', updatePortfolioHolding)

/**
 * @route   DELETE /api/portfolio/:id/holdings/:holdingId
 * @desc    Eliminar holding do portfolio
 * @access  Private
 */
router.delete('/:id/holdings/:holdingId', deletePortfolioHolding)

/**
 * @route   POST /api/portfolio/:id/simulate
 * @desc    Simular cenarios FIRE
 * @access  Private
 */
router.post('/:id/simulate', simulatePortfolio)

export default router
