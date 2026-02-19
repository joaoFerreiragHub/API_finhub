import { Router } from 'express'
import { getYahooETFInfo, compareYahooETFs, listPopularEuropeanETFs } from '../controllers/etfYahoo.controller'

const router = Router()

router.get('/list-european', listPopularEuropeanETFs)
router.get('/compare-yahoo', compareYahooETFs)
router.get('/yahoo/:symbol', getYahooETFInfo)

export default router
