import { Router } from 'express'
import {
  createModerationAppeal,
  getMyModerationAppeal,
  listMyModerationAppeals,
} from '../controllers/moderationAppeal.controller'
import { authenticate } from '../middlewares/auth'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   POST /api/appeals/content
 * @desc    Abrir apelacao para evento de moderacao do proprio conteudo
 * @access  Private
 */
router.post('/content', authenticate, rateLimiter.userReport, createModerationAppeal)

/**
 * @route   GET /api/appeals/me
 * @desc    Listar apelacoes do utilizador autenticado
 * @access  Private
 */
router.get('/me', authenticate, listMyModerationAppeals)

/**
 * @route   GET /api/appeals/:appealId
 * @desc    Obter detalhe de apelacao do utilizador autenticado
 * @access  Private
 */
router.get('/:appealId', authenticate, getMyModerationAppeal)

export default router
