import { Router } from 'express'
import {
  getEditorialHome,
  getEditorialVerticalLanding,
  getEditorialVerticalShowAll,
} from '../controllers/editorialPublic.controller'
import {
  cancelMyEditorialClaim,
  createMyEditorialClaim,
  listMyEditorialClaims,
} from '../controllers/editorialClaim.controller'
import { authenticate } from '../middlewares/auth'
import { requireCreator } from '../middlewares/roleGuard'

const router = Router()

/**
 * @route   GET /api/editorial/home
 * @desc    Homepage editorial curada
 * @access  Public
 */
router.get('/home', getEditorialHome)

/**
 * @route   GET /api/editorial/claims/my
 * @desc    Listar claims do creator autenticado
 * @access  Private (Creator/Admin)
 */
router.get('/claims/my', authenticate, requireCreator, listMyEditorialClaims)

/**
 * @route   POST /api/editorial/claims
 * @desc    Criar claim de ownership para recurso claimable
 * @access  Private (Creator/Admin)
 */
router.post('/claims', authenticate, requireCreator, createMyEditorialClaim)

/**
 * @route   POST /api/editorial/claims/:claimId/cancel
 * @desc    Cancelar claim pendente do creator autenticado
 * @access  Private (Creator/Admin)
 */
router.post('/claims/:claimId/cancel', authenticate, requireCreator, cancelMyEditorialClaim)

/**
 * @route   GET /api/editorial/:vertical/show-all
 * @desc    Listagem completa de uma vertical editorial
 * @access  Public
 */
router.get('/:vertical/show-all', getEditorialVerticalShowAll)

/**
 * @route   GET /api/editorial/:vertical
 * @desc    Landing de uma vertical editorial
 * @access  Public
 */
router.get('/:vertical', getEditorialVerticalLanding)

export default router
