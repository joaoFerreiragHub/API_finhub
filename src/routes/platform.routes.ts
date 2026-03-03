import { Router } from 'express'
import {
  getPublicSurfaceControl,
  listPublicSurfaceControls,
} from '../controllers/publicSurfaceControl.controller'

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

export default router
