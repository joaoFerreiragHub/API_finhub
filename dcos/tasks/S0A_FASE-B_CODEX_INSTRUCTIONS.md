# Sprint 0A — Fase B: Instruções para Claude Code (CTO)
*Produzido por: finhub-task-architect via Orchestrator*
*Data: 2026-03-17*
*Executor: Claude Code como CTO*

---

## ANTES DE COMEÇAR — OBRIGATÓRIO

1. Ler `dcos/regras.md` completo (Checkpoint de Retoma)
2. Correr `git status` no backend: `C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub`
3. Se existirem alterações pendentes sem commit → commitar antes de avançar
4. Confirmar branch: deve estar em `main`

---

## PASSO 1 — S0A-005: Schema Mongoose AgentActivityLog

### Ficheiro a criar
`C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub\src\models\AgentActivityLog.ts`

### Código completo

```typescript
// src/models/AgentActivityLog.ts
// Sprint 0A — S0A-005: Agent Activity Log schema
// Referência: OPENCLAW_FINHUB_MASTER_REFERENCE.md Parte 8.2
import { Schema, model, Document } from 'mongoose'

// --- Sub-tipos ---
export interface ITokensUsed {
  input: number   // tokens de input consumidos
  output: number  // tokens de output gerados
  cost: number    // custo estimado em USD
}

export interface IQualityGate {
  passedQA: boolean   // true se passou QA
  rejections: number  // vezes que QA rejeitou antes de passar
  notes?: string      // notas do QA (opcional)
}

// Tipos de acção possíveis
export type AgentAction = 'implement' | 'review' | 'research' | 'validate' | 'fix' | 'spec' | 'other'

// Estados possíveis de uma tarefa
export type AgentStatus = 'success' | 'failure' | 'partial' | 'blocked'

// Interface principal do documento
export interface IAgentActivityLog extends Document {
  agentId: string           // ID do agente, ex: 'finhub-cto'
  taskId: string            // ID da tarefa do backlog, ex: 'S1-003'
  action: AgentAction
  status: AgentStatus
  startedAt: Date
  completedAt: Date
  durationMinutes: number
  summary: string
  filesChanged: string[]
  tokensUsed: ITokensUsed
  qualityGate: IQualityGate
  deviations: string[]
  learnings?: string
  triggeredBy: string       // quem desencadeou, ex: 'orchestrator'
  model: string             // modelo LLM usado
  createdAt: Date
  updatedAt: Date
}

// --- Sub-schemas ---
const TokensUsedSchema = new Schema<ITokensUsed>(
  {
    input: { type: Number, required: true, min: 0 },
    output: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const QualityGateSchema = new Schema<IQualityGate>(
  {
    passedQA: { type: Boolean, required: true },
    rejections: { type: Number, required: true, default: 0, min: 0 },
    notes: { type: String, maxlength: 500 },
  },
  { _id: false }
)

// --- Schema principal ---
const AgentActivityLogSchema = new Schema<IAgentActivityLog>(
  {
    agentId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['implement', 'review', 'research', 'validate', 'fix', 'spec', 'other'],
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failure', 'partial', 'blocked'],
      index: true,
    },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 0 },
    summary: { type: String, required: true, maxlength: 1000 },
    filesChanged: [{ type: String, maxlength: 500 }],
    tokensUsed: { type: TokensUsedSchema, required: true },
    qualityGate: { type: QualityGateSchema, required: true },
    deviations: [{ type: String, maxlength: 500 }],
    learnings: { type: String, maxlength: 2000 },
    triggeredBy: { type: String, required: true, maxlength: 100 },
    model: { type: String, required: true, maxlength: 100 },
  },
  {
    timestamps: true,
    collection: 'agent_activity_logs',
  }
)

// --- Índices compostos ---
AgentActivityLogSchema.index({ agentId: 1, startedAt: -1 })
AgentActivityLogSchema.index({ status: 1, startedAt: -1 })
AgentActivityLogSchema.index({ taskId: 1, agentId: 1 })

export const AgentActivityLog = model<IAgentActivityLog>('AgentActivityLog', AgentActivityLogSchema)
```

### Validação
```bash
cd C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub
npx tsc --noEmit
```

### Critérios de aceitação
- [ ] Ficheiro criado em `src/models/AgentActivityLog.ts`
- [ ] TypeScript compila sem erros
- [ ] Todos os campos do schema presentes
- [ ] Índices em `agentId`, `taskId`, `status` e compostos

---

## PASSO 2 — S0A-006 + S0A-007 + S0A-008 + S0A-009: Controller + Routes

### Ficheiros a criar/alterar

| Acção | Path |
|-------|------|
| CRIAR | `src/controllers/agentActivityLog.controller.ts` |
| CRIAR | `src/routes/agentActivityLog.routes.ts` |
| ALTERAR | `src/routes/index.ts` |

### Código do controller completo

```typescript
// src/controllers/agentActivityLog.controller.ts
// Sprint 0A — S0A-006, 007, 008, 009
// Referência: OPENCLAW_FINHUB_MASTER_REFERENCE.md Partes 8.3 e 9.1
import { Request, Response } from 'express'
import { AgentActivityLog } from '../models/AgentActivityLog'

// --- S0A-006: Criar log ---
export async function createAgentLog(req: Request, res: Response): Promise<void> {
  try {
    const {
      agentId, taskId, action, status,
      startedAt, completedAt, durationMinutes,
      summary, filesChanged, tokensUsed, qualityGate,
      deviations, learnings, triggeredBy, model,
    } = req.body

    // Validação mínima de campos obrigatórios
    if (!agentId || !taskId || !action || !status || !startedAt || !completedAt ||
        durationMinutes === undefined || !summary || !tokensUsed || !qualityGate ||
        !triggeredBy || !model) {
      res.status(400).json({
        error: 'Dados inválidos',
        details: ['Campos obrigatórios em falta: agentId, taskId, action, status, startedAt, completedAt, durationMinutes, summary, tokensUsed, qualityGate, triggeredBy, model'],
      })
      return
    }

    // Validar que completedAt não é anterior a startedAt
    if (new Date(completedAt) < new Date(startedAt)) {
      res.status(400).json({ error: 'completedAt não pode ser anterior a startedAt' })
      return
    }

    const log = await AgentActivityLog.create({
      agentId, taskId, action, status,
      startedAt: new Date(startedAt),
      completedAt: new Date(completedAt),
      durationMinutes,
      summary,
      filesChanged: filesChanged || [],
      tokensUsed,
      qualityGate,
      deviations: deviations || [],
      learnings,
      triggeredBy,
      model,
    })

    res.status(201).json({ success: true, log })
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      res.status(400).json({ error: 'Dados inválidos', details: Object.values(err.errors).map((e: any) => e.message) })
      return
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// --- S0A-007: Listar logs com filtros e paginação ---
export async function listAgentLogs(req: Request, res: Response): Promise<void> {
  try {
    const {
      agentId, taskId, status,
      dateFrom, dateTo,
      page = '1', limit = '20',
      sort = 'startedAt_desc',
    } = req.query as Record<string, string>

    // Construir filtro
    const filter: Record<string, any> = {}
    if (agentId) filter.agentId = agentId
    if (taskId) filter.taskId = taskId
    if (status) filter.status = status
    if (dateFrom || dateTo) {
      filter.startedAt = {}
      if (dateFrom) filter.startedAt.$gte = new Date(dateFrom)
      if (dateTo) filter.startedAt.$lte = new Date(dateTo)
    }

    // Paginação
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const skip = (pageNum - 1) * limitNum

    // Ordenação
    const sortOrder: Record<string, 1 | -1> = {}
    if (sort === 'startedAt_asc') sortOrder.startedAt = 1
    else sortOrder.startedAt = -1

    const [logs, total] = await Promise.all([
      AgentActivityLog.find(filter).sort(sortOrder).skip(skip).limit(limitNum).lean(),
      AgentActivityLog.countDocuments(filter),
    ])

    res.status(200).json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// --- S0A-008: Estatísticas agregadas ---
export async function getAgentLogStats(req: Request, res: Response): Promise<void> {
  try {
    const { agentId, sprintId, dateFrom, dateTo } = req.query as Record<string, string>

    // Filtro base
    const matchFilter: Record<string, any> = {}
    if (agentId) matchFilter.agentId = agentId
    if (sprintId) matchFilter.taskId = { $regex: `^${sprintId}` }
    if (dateFrom || dateTo) {
      matchFilter.startedAt = {}
      if (dateFrom) matchFilter.startedAt.$gte = new Date(dateFrom)
      if (dateTo) matchFilter.startedAt.$lte = new Date(dateTo)
    }

    // Agregação por agente
    const byAgentPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$agentId',
          totalTasks: { $sum: 1 },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failureCount: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          blockedCount: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          avgDurationMinutes: { $avg: '$durationMinutes' },
          totalCostUSD: { $sum: '$tokensUsed.cost' },
          totalRejections: { $sum: '$qualityGate.rejections' },
          tasksWithRejections: { $sum: { $cond: [{ $gt: ['$qualityGate.rejections', 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          agentId: '$_id',
          totalTasks: 1,
          successCount: 1,
          failureCount: 1,
          partialCount: 1,
          blockedCount: 1,
          successRate: { $cond: [{ $eq: ['$totalTasks', 0] }, 0, { $divide: ['$successCount', '$totalTasks'] }] },
          avgDurationMinutes: { $round: ['$avgDurationMinutes', 1] },
          totalCostUSD: { $round: ['$totalCostUSD', 4] },
          totalRejections: 1,
          qaRejectionRate: { $cond: [{ $eq: ['$totalTasks', 0] }, 0, { $divide: ['$tasksWithRejections', '$totalTasks'] }] },
        },
      },
      { $sort: { totalTasks: -1 } },
    ]

    // Agregação por sprint (prefixo de taskId)
    const bySprintPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$taskId', regex: /^S0A-/ } }, then: 'S0A-' },
                { case: { $regexMatch: { input: '$taskId', regex: /^S0-/ } }, then: 'S0-' },
                { case: { $regexMatch: { input: '$taskId', regex: /^S1-/ } }, then: 'S1-' },
                { case: { $regexMatch: { input: '$taskId', regex: /^S2-/ } }, then: 'S2-' },
              ],
              default: 'other',
            },
          },
          doneTasks: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          totalCostUSD: { $sum: '$tokensUsed.cost' },
          minDate: { $min: '$startedAt' },
          maxDate: { $max: '$completedAt' },
          totalLogs: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          sprintPrefix: '$_id',
          doneTasks: 1,
          totalCostUSD: { $round: ['$totalCostUSD', 4] },
          velocityPerDay: {
            $cond: [
              { $eq: [{ $dateDiff: { startDate: '$minDate', endDate: '$maxDate', unit: 'day' } }, 0] },
              '$doneTasks',
              {
                $divide: [
                  '$doneTasks',
                  { $add: [{ $dateDiff: { startDate: '$minDate', endDate: '$maxDate', unit: 'day' } }, 1] },
                ],
              },
            ],
          },
        },
      },
    ]

    // Stats globais
    const globalPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          avgDurationMinutes: { $avg: '$durationMinutes' },
          totalCostUSD: { $sum: '$tokensUsed.cost' },
          tasksWithRejections: { $sum: { $cond: [{ $gt: ['$qualityGate.rejections', 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalLogs: 1,
          successRate: { $cond: [{ $eq: ['$totalLogs', 0] }, 0, { $divide: ['$successCount', '$totalLogs'] }] },
          avgDurationMinutes: { $round: ['$avgDurationMinutes', 1] },
          totalCostUSD: { $round: ['$totalCostUSD', 4] },
          qaRejectionRate: { $cond: [{ $eq: ['$totalLogs', 0] }, 0, { $divide: ['$tasksWithRejections', '$totalLogs'] }] },
        },
      },
    ]

    const [byAgentResult, bySprintResult, globalResult] = await Promise.all([
      AgentActivityLog.aggregate(byAgentPipeline),
      AgentActivityLog.aggregate(bySprintPipeline),
      AgentActivityLog.aggregate(globalPipeline),
    ])

    res.status(200).json({
      global: globalResult[0] || { totalLogs: 0, successRate: 0, avgDurationMinutes: 0, totalCostUSD: 0, qaRejectionRate: 0 },
      byAgent: byAgentResult,
      bySprint: bySprintResult,
    })
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// --- S0A-009: Histórico de um agente ---
export async function getAgentHistory(req: Request, res: Response): Promise<void> {
  try {
    const { agentId } = req.params
    const { status, dateFrom, dateTo, page = '1', limit = '50' } = req.query as Record<string, string>

    const filter: Record<string, any> = { agentId }
    if (status) filter.status = status
    if (dateFrom || dateTo) {
      filter.startedAt = {}
      if (dateFrom) filter.startedAt.$gte = new Date(dateFrom)
      if (dateTo) filter.startedAt.$lte = new Date(dateTo)
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)))
    const skip = (pageNum - 1) * limitNum

    const [logs, total] = await Promise.all([
      AgentActivityLog.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limitNum).lean(),
      AgentActivityLog.countDocuments(filter),
    ])

    // Calcular summary
    const allLogs = await AgentActivityLog.find({ agentId }).lean()
    const successCount = allLogs.filter(l => l.status === 'success').length
    const totalCostUSD = allLogs.reduce((sum, l) => sum + (l.tokensUsed?.cost || 0), 0)
    const avgDuration = allLogs.length > 0
      ? allLogs.reduce((sum, l) => sum + l.durationMinutes, 0) / allLogs.length
      : 0

    res.status(200).json({
      agentId,
      summary: {
        totalTasks: allLogs.length,
        successRate: allLogs.length > 0 ? successCount / allLogs.length : 0,
        avgDurationMinutes: Math.round(avgDuration * 10) / 10,
        totalCostUSD: Math.round(totalCostUSD * 10000) / 10000,
        autonomyLevel: 0, // sempre 0 nesta fase
      },
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
```

### Código das routes

```typescript
// src/routes/agentActivityLog.routes.ts
// Sprint 0A — S0A-006 a S0A-009
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

// Todas as rotas requerem autenticação e role admin
router.use(authenticate, requireAdmin)

// S0A-006
router.post('/', createAgentLog)

// S0A-007
router.get('/', listAgentLogs)

// S0A-008 (antes de /:agentId para não colidir)
router.get('/stats', getAgentLogStats)

// S0A-009
router.get('/agent/:agentId', getAgentHistory)

export default router
```

### Linha a adicionar em `src/routes/index.ts`

```typescript
import agentActivityLogRouter from './agentActivityLog.routes'
// ...
router.use('/admin/agent-logs', agentActivityLogRouter)
```

> ⚠️ **Nota:** Verificar o padrão actual de registo de rotas em `src/routes/index.ts` antes de adicionar. Respeitar convenção existente.

---

## PASSO 3 — S0A-010: Smoke Tests

### Ficheiro a criar
`src/__tests__/agentActivityLog.smoke.test.ts`

```typescript
// src/__tests__/agentActivityLog.smoke.test.ts
// Sprint 0A — S0A-010: Smoke tests dos endpoints de agent activity logs
import request from 'supertest'
import app from '../app' // ajustar import conforme estrutura do projecto

// Token de admin válido para testes — ajustar conforme setup de testes do projecto
let adminToken: string
let nonAdminToken: string

const validPayload = {
  agentId: 'finhub-cto',
  taskId: 'S0A-smoke-test',
  action: 'implement',
  status: 'success',
  startedAt: '2026-03-17T14:30:00Z',
  completedAt: '2026-03-17T14:45:00Z',
  durationMinutes: 15,
  summary: 'Smoke test de criação de log',
  filesChanged: [],
  tokensUsed: { input: 100, output: 50, cost: 0.001 },
  qualityGate: { passedQA: true, rejections: 0 },
  deviations: [],
  triggeredBy: 'orchestrator',
  model: 'anthropic/claude-sonnet-4-6',
}

describe('Agent Activity Log — Smoke Tests (S0A-010)', () => {

  describe('POST /api/admin/agent-logs', () => {
    it('cria log com dados válidos e retorna 201', async () => {
      const res = await request(app)
        .post('/api/admin/agent-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload)
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.log.agentId).toBe('finhub-cto')
    })

    it('retorna 400 quando campos obrigatórios em falta', async () => {
      const res = await request(app)
        .post('/api/admin/agent-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId: 'finhub-cto' }) // faltam campos
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/admin/agent-logs', () => {
    it('retorna lista paginada com estrutura correcta', async () => {
      const res = await request(app)
        .get('/api/admin/agent-logs')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.logs)).toBe(true)
      expect(res.body.pagination).toBeDefined()
      expect(res.body.pagination.page).toBe(1)
    })
  })

  describe('GET /api/admin/agent-logs/stats', () => {
    it('retorna estrutura global + byAgent + bySprint', async () => {
      const res = await request(app)
        .get('/api/admin/agent-logs/stats')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.global).toBeDefined()
      expect(Array.isArray(res.body.byAgent)).toBe(true)
      expect(Array.isArray(res.body.bySprint)).toBe(true)
    })
  })

  describe('GET /api/admin/agent-logs/agent/:agentId', () => {
    it('retorna histórico do agente com summary', async () => {
      const res = await request(app)
        .get('/api/admin/agent-logs/agent/finhub-cto')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.agentId).toBe('finhub-cto')
      expect(res.body.summary).toBeDefined()
      expect(Array.isArray(res.body.logs)).toBe(true)
    })

    it('retorna 200 com lista vazia para agente sem logs', async () => {
      const res = await request(app)
        .get('/api/admin/agent-logs/agent/agente-inexistente-xyz')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      expect(res.body.logs).toHaveLength(0)
    })
  })

  describe('Auth — todos os endpoints', () => {
    it('retorna 401 sem token de autenticação', async () => {
      const res = await request(app).get('/api/admin/agent-logs')
      expect(res.status).toBe(401)
    })

    it('retorna 403 com token não-admin', async () => {
      const res = await request(app)
        .get('/api/admin/agent-logs')
        .set('Authorization', `Bearer ${nonAdminToken}`)
      expect(res.status).toBe(403)
    })
  })
})
```

**Comando de execução:**
```bash
npx vitest run src/__tests__/agentActivityLog.smoke.test.ts
```

---

## PASSO 4 — Validação Final

```bash
cd C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub

# Typecheck
npx tsc --noEmit

# Testes
npx vitest run src/__tests__/agentActivityLog.smoke.test.ts
```

**Critérios de aceitação globais:**
- [ ] `npx tsc --noEmit` sem erros novos introduzidos
- [ ] Todos os 6+ smoke tests passam
- [ ] Ficheiros criados: `AgentActivityLog.ts`, `agentActivityLog.controller.ts`, `agentActivityLog.routes.ts`, `agentActivityLog.smoke.test.ts`
- [ ] `src/routes/index.ts` actualizado com nova rota

---

## PASSO 5 — Fecho Obrigatório (Regra das 3 Peças)

### 1. Actualizar Checkpoint de Retoma
Editar `dcos/regras.md` — bloco "Checkpoint de Retoma":
- Data: 2026-03-17
- Estado: S0A-005 a S0A-010 concluídos
- Último commit: [hash após commit]
- Próximo passo: financial-tools executa S0A-011 a S0A-014

### 2. Commit
```bash
git add src/models/AgentActivityLog.ts
git add src/controllers/agentActivityLog.controller.ts
git add src/routes/agentActivityLog.routes.ts
git add src/routes/index.ts
git add src/__tests__/agentActivityLog.smoke.test.ts
git add dcos/regras.md
git commit -m "feat(S0A-005-010): agent activity log schema, endpoints and smoke tests"
git push
```

### 3. Handoff
Criar ficheiro:
`C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub\.project-agent-bridge\outbox\result-S0A-fase-B.md`

Formato:
```
Objectivo: Implementar schema + 4 endpoints + smoke tests para agent activity logs
O que foi feito: [resumo factual]
Resultado: review required
Riscos / pendências: [o que ficou pendente]
Ficheiros afectados: [lista]
Validações executadas: tsc, vitest
Commit hash: [hash]
Próximo passo: financial-tools executa S0A-011 a S0A-014 (dashboard UI)
```

### 4. Activity Log
Escrever:
`C:\Users\User\.openclaw\workspaces\finhub-cto\activity-logs\2026-03-17_S0A-fase-B.json`

(usar template em `C:\Users\User\.openclaw\workspaces\finhub-task-architect\specs\S0A-003_activity-log-template.json`)

---

## DECISÃO PENDENTE — AdminScope

Antes de registar as rotas, ler `src/admin/permissions.ts`.
- Se existir sistema de scopes granulares: criar `AGENT_LOGS_READ` e `AGENT_LOGS_WRITE` e usar em vez de `requireAdmin`
- Se não existir ou for simples: usar `requireAdmin` (recomendado para fase 1)

Documentar a decisão no commit message ou no handoff.
