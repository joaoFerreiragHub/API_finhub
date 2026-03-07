import { Router } from 'express'
import { listPublicCreators } from '../controllers/publicCreator.controller'

const router = Router()

/**
 * @route   GET /api/creators
 * @desc    Listar creators publicos com filtros base para descoberta
 * @access  Public
 */
router.get('/', listPublicCreators)

export default router
