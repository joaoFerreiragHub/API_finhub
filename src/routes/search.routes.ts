import { Router } from 'express'
import { globalSearch } from '../controllers/search.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/search
 * @desc    Pesquisa global cross-content (conteudo, creators e recursos)
 * @access  Public
 */
router.get('/', rateLimiter.search, globalSearch)

export default router
