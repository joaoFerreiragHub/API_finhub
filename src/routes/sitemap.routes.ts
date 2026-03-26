import { Router } from 'express'
import { getSitemap } from '../controllers/sitemap.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/sitemap
 * @desc    Dados publicos para geracao de sitemap dinamico
 * @access  Public
 */
router.get('/', rateLimiter.general, getSitemap)

export default router
