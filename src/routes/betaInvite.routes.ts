import { Router } from 'express'
import { addBetaInvites, deleteBetaInvite, listBetaInvites } from '../controllers/betaInvite.controller'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/roleGuard'

const router = Router()

router.post('/', authenticate, requireAdmin, addBetaInvites)
router.get('/', authenticate, requireAdmin, listBetaInvites)
router.delete('/:id', authenticate, requireAdmin, deleteBetaInvite)

export default router
