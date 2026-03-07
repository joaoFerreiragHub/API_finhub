import { Router } from 'express'
import {
  getPublicCreatorProfile,
  listPublicCreators,
} from '../controllers/publicCreator.controller'

const router = Router()

/**
 * @route   GET /api/creators
 * @desc    Listar creators publicos com filtros base para descoberta
 * @access  Public
 */
router.get('/', listPublicCreators)

/**
 * @route   GET /api/creators/:username
 * @desc    Ler perfil publico resumido de um creator
 * @access  Public
 */
router.get('/:username', getPublicCreatorProfile)

export default router
