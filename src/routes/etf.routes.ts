import { Router } from 'express'
import { getETFInfo, listETFs, getETFsOverlap, getETFsSectorOverlap } from '../controllers/etf.controller'

const router = Router()

router.get('/list', listETFs)
router.get('/overlap', getETFsOverlap)
router.get('/sectorOverlap', getETFsSectorOverlap)
router.get('/:symbol', getETFInfo)

export default router
