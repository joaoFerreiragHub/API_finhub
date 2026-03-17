// src/routes/agentActivityLog.routes.ts
// Sprint 0A — S0A-006 a S0A-009: Rotas admin para agent activity logs
import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { requireAdmin } from '../middlewares/roleGuard'
import {
  createAgentLog,
  listAgentLogs,
  getAgentLogStats,
  getAgentHistory,
} from '../controllers/agentActivityLog.controller'

const router = Router()

// Todas as rotas requerem autenticacao + role admin
router.use(authenticate, requireAdmin)

// S0A-006: Criar log
router.post('/', createAgentLog)

// S0A-007: Listar logs com filtros e paginacao
router.get('/', listAgentLogs)

// S0A-008: Estatisticas agregadas (antes de /:agentId para nao colidir)
router.get('/stats', getAgentLogStats)

// S0A-009: Historico de um agente especifico
router.get('/agent/:agentId', getAgentHistory)

export default router
