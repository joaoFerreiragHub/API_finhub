import { Router } from 'express'
import {
  getPublicSurfaceControl,
  listPublicSurfaceControls,
} from '../controllers/publicSurfaceControl.controller'
import {
  getPublicLegalDocument,
  listPublicLegalDocuments,
} from '../controllers/publicLegal.controller'

const router = Router()

/**
 * @route   GET /api/platform/surfaces
 * @desc    Ler estado publico dos kill switches por superficie
 * @access  Public
 */
router.get('/surfaces', listPublicSurfaceControls)

/**
 * @route   GET /api/platform/surfaces/:surfaceKey
 * @desc    Ler estado publico de uma superficie
 * @access  Public
 */
router.get('/surfaces/:surfaceKey', getPublicSurfaceControl)

/**
 * @route   GET /api/platform/legal/documents
 * @desc    Listar documentos legais publicos com metadata/versionamento
 * @access  Public
 */
router.get('/legal/documents', listPublicLegalDocuments)

/**
 * @route   GET /api/platform/legal/:documentKey
 * @desc    Ler documento legal publico por chave
 * @access  Public
 */
router.get('/legal/:documentKey', getPublicLegalDocument)

export default router
