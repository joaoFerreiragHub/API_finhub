import { Router } from 'express'
import { createContentReport } from '../controllers/contentReport.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   POST /api/reports/content
 * @desc    Criar ou atualizar report de conteudo/comment/review
 * @access  Private
 */
router.post('/content', authenticate, rateLimiter.userReport, createContentReport)

export default router
