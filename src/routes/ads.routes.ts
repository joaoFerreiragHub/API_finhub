import { Router } from 'express'
import {
  servePublicAd,
  trackPublicAdClick,
  trackPublicAdImpression,
} from '../controllers/publicAds.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const router = Router()

/**
 * @route   GET /api/ads/serve
 * @desc    Selecionar anuncio elegivel para um slot publico
 * @access  Public
 */
router.get('/serve', rateLimiter.general, servePublicAd)

/**
 * @route   POST /api/ads/impression
 * @desc    Registar impressao de anuncio por token
 * @access  Public
 */
router.post('/impression', rateLimiter.general, trackPublicAdImpression)

/**
 * @route   POST /api/ads/click
 * @desc    Registar clique de anuncio por token
 * @access  Public
 */
router.post('/click', rateLimiter.general, trackPublicAdClick)

export default router

