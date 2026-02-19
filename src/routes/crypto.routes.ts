import { Router } from 'express'
import { getCryptoInfo } from '../controllers/crypto.controller'

const router = Router()

router.get('/', getCryptoInfo)

export default router
