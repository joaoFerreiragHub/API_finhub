// src/routes/ml.routes.ts

import { Router } from 'express'
import { getEarningsPrediction, getPredictions } from '../controllers/ml.controller'


const router = Router()

router.get('/predictions/:symbol', getPredictions)

router.get('/earnings/:symbol', getEarningsPrediction)

export default router