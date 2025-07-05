import { Router } from 'express'
import {getQuickAnalysis} from '../controllers/stock.controller'

const router = Router()

router.get('/quick-analysis/:symbol', getQuickAnalysis)
export default router
