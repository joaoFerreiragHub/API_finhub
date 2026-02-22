import { Router } from 'express'
import {
  getEditorialHome,
  getEditorialVerticalLanding,
  getEditorialVerticalShowAll,
} from '../controllers/editorialPublic.controller'

const router = Router()

/**
 * @route   GET /api/editorial/home
 * @desc    Homepage editorial curada
 * @access  Public
 */
router.get('/home', getEditorialHome)

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
