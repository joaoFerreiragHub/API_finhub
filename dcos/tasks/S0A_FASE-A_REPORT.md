# Sprint 0A — Fase A: Report
*Produzido por: finhub-task-architect via Orchestrator*
*Data: 2026-03-17*
*Para: Claude Code (CTO) — leitura obrigatória antes da Fase B*

---

## Estado das Tarefas

| ID | Título | Estado |
|----|--------|--------|
| S0A-001 | Decompor Bloco 1 (Schema + API) em tarefas cirúrgicas | ✅ DONE |
| S0A-002 | Decompor Bloco 2 (Dashboard UI) em tarefas cirúrgicas | ✅ DONE |
| S0A-003 | Criar template JSON de activity log para agentes | ✅ DONE |

---

## S0A-001 — Specs Backend (S0A-005 a S0A-010)

### Contexto
Nova collection MongoDB `agent_activity_logs` + 4 endpoints admin.
Todas as rotas ficam sob `/api/admin/agent-logs` com autenticação admin.

**Stack:** Node.js + Express + TypeScript + Mongoose
**Auth:** `authenticate` (JWT) + `requireAdmin` — em `src/middlewares/`
**Convenção routes:** `src/routes/*.routes.ts` + registo em `src/routes/index.ts`
**Convenção controllers:** `src/controllers/*.controller.ts`

---

### S0A-005 — Schema Mongoose `agent_activity_logs`

**Ficheiro a criar:**
`src/models/AgentActivityLog.ts`

```typescript
// src/models/AgentActivityLog.ts
import { Schema, model, Document } from 'mongoose'

export interface ITokensUsed {
  input: number
  output: number
  cost: number
}

export interface IQualityGate {
  passedQA: boolean
  rejections: number
  notes?: string
}

export type AgentAction = 'implement' | 'review' | 'research' | 'validate' | 'fix' | 'spec' | 'other'
export type AgentStatus = 'success' | 'failure' | 'partial' | 'blocked'

export interface IAgentActivityLog extends Document {
  agentId: string
  taskId: string
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
  triggeredBy: string
  model: string
  createdAt: Date
  updatedAt: Date
}

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

const AgentActivityLogSchema = new Schema<IAgentActivityLog>(
  {
    agentId: { type: String, required: true, trim: true, maxlength: 100, index: true },
    taskId: { type: String, required: true, trim: true, maxlength: 50, index: true },
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
  { timestamps: true, collection: 'agent_activity_logs' }
)

AgentActivityLogSchema.index({ agentId: 1, startedAt: -1 })
AgentActivityLogSchema.index({ status: 1, startedAt: -1 })
AgentActivityLogSchema.index({ taskId: 1, agentId: 1 })

export const AgentActivityLog = model<IAgentActivityLog>('AgentActivityLog', AgentActivityLogSchema)
```

**Critérios de aceitação:**
- [ ] Ficheiro existe em `src/models/AgentActivityLog.ts`
- [ ] Todos os campos do schema da Parte 8.2 estão presentes
- [ ] Índices em `agentId`, `taskId`, `status`
- [ ] `npx tsc --noEmit` sem erros

---

### S0A-006 — POST `/api/admin/agent-logs`

**Ficheiros a criar/alterar:**
- CRIAR: `src/controllers/agentActivityLog.controller.ts`
- CRIAR: `src/routes/agentActivityLog.routes.ts`
- ALTERAR: `src/routes/index.ts` (adicionar import e registo)

**Endpoint:**
```
POST /api/admin/agent-logs
Auth: Bearer <admin-token>
```

**Body obrigatório:**
```json
{
  "agentId": "finhub-cto",
  "taskId": "S1-003",
  "action": "implement",
  "status": "success",
  "startedAt": "2026-03-17T14:30:00Z",
  "completedAt": "2026-03-17T14:45:00Z",
  "durationMinutes": 15,
  "summary": "Implementou SimuladorFIRE page com 3 cenários",
  "filesChanged": ["FinHub-Vite/src/pages/fire/SimuladorFIRE.tsx"],
  "tokensUsed": { "input": 12500, "output": 3200, "cost": 0.048 },
  "qualityGate": { "passedQA": true, "rejections": 0 },
  "deviations": [],
  "triggeredBy": "orchestrator",
  "model": "anthropic/claude-sonnet-4-6"
}
```

**Resposta 201:**
```json
{ "success": true, "log": { "_id": "...", "agentId": "finhub-cto", ... } }
```

**Critérios:**
- [ ] 201 com log criado quando dados válidos
- [ ] 400 com mensagem clara quando campos obrigatórios em falta
- [ ] 401 sem token, 403 token não-admin
- [ ] `action` fora do enum → 400

---

### S0A-007 — GET `/api/admin/agent-logs` (com filtros)

**Ficheiro a alterar:** `src/controllers/agentActivityLog.controller.ts`

**Query params:**
- `agentId`, `taskId`, `status`, `dateFrom`, `dateTo`
- `page` (default 1), `limit` (default 20, max 100)
- `sort` (default `startedAt_desc`)

**Resposta 200:**
```json
{
  "logs": [...],
  "pagination": { "page": 1, "limit": 20, "total": 47, "totalPages": 3 }
}
```

**Critérios:**
- [ ] Sem filtros retorna todos com paginação
- [ ] Filtros por agentId, status, dateRange funcionam
- [ ] `limit=200` sanitizado para 100

---

### S0A-008 — GET `/api/admin/agent-logs/stats`

**Ficheiro a alterar:** `src/controllers/agentActivityLog.controller.ts`

**Query params opcionais:** `agentId`, `sprintId`, `dateFrom`, `dateTo`

**Resposta 200:**
```json
{
  "global": {
    "totalLogs": 47,
    "successRate": 0.87,
    "avgDurationMinutes": 18.3,
    "totalCostUSD": 2.34,
    "qaRejectionRate": 0.17
  },
  "byAgent": [
    {
      "agentId": "finhub-cto",
      "totalTasks": 23,
      "successCount": 20,
      "failureCount": 2,
      "partialCount": 1,
      "blockedCount": 0,
      "successRate": 0.87,
      "avgDurationMinutes": 18.0,
      "totalCostUSD": 1.95,
      "totalRejections": 4,
      "qaRejectionRate": 0.17
    }
  ],
  "bySprint": [
    {
      "sprintPrefix": "S1-",
      "totalTasks": 10,
      "doneTasks": 4,
      "completionRate": 0.4,
      "velocityPerDay": 2.5,
      "totalCostUSD": 0.89
    }
  ]
}
```

**Critérios:**
- [ ] Métricas via aggregation pipeline MongoDB
- [ ] `successRate` = success / total
- [ ] Sem logs no período → valores a zero (não erro 500)

---

### S0A-009 — GET `/api/admin/agent-logs/agent/:agentId`

**Ficheiro a alterar:** `src/controllers/agentActivityLog.controller.ts`

**Resposta 200:**
```json
{
  "agentId": "finhub-cto",
  "summary": {
    "totalTasks": 23,
    "successRate": 0.87,
    "avgDurationMinutes": 18.0,
    "totalCostUSD": 1.95,
    "autonomyLevel": 0
  },
  "logs": [...],
  "pagination": { "page": 1, "limit": 50, "total": 23, "totalPages": 1 }
}
```

**Critérios:**
- [ ] Agente sem logs → 200 com lista vazia (não 404)
- [ ] `autonomyLevel` sempre 0 nesta fase

---

### S0A-010 — Smoke tests dos 4 endpoints

**Ficheiro a criar:** `src/__tests__/agentActivityLog.smoke.test.ts`

Mínimo 6 testes:
1. POST com dados válidos → 201
2. GET listagem → 200 com pagination
3. GET stats → 200 com global + byAgent
4. GET agent/:agentId → 200 com summary
5. Qualquer endpoint sem token → 401
6. Qualquer endpoint com token não-admin → 403

**Comando:** `npx vitest run`

---

## S0A-002 — Specs Frontend (S0A-011 a S0A-014)

### Contexto
Nova página `/admin/agent-dashboard` no admin existente.

**Stack:** React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts
**SSR:** Vike (padrão `+Page.tsx` por directório)
**Admin dir:** `src/pages/admin/`

> ⚠️ **Ambiguidade de routing:** Confirmar antes de criar ficheiros se o padrão é Vike file-based (`src/pages/admin/agent-dashboard/+Page.tsx`) ou React Router interno. Verificar `src/pages/admin/+Page.tsx` e `src/router.tsx`.

---

### S0A-011 — Layout base `/admin/agent-dashboard`

**Ficheiros a criar:**
- `src/pages/admin/agent-dashboard/+Page.tsx`
- `src/pages/admin/agent-dashboard/AgentDashboardLayout.tsx`

**Estado local:**
```typescript
type DashboardTab = 'timeline' | 'scorecard' | 'burndown'
const [activeTab, setActiveTab] = useState<DashboardTab>('timeline')
```

**Critérios:**
- [ ] Rota `/admin/agent-dashboard` renderiza (não 404)
- [ ] 3 tabs: Timeline, Scorecard, Burndown
- [ ] Troca de tab sem reload
- [ ] Protegida por auth admin

---

### S0A-012 — Vista Timeline

**Ficheiros a criar:**
- `src/pages/admin/agent-dashboard/AgentTimeline.tsx`
- `src/pages/admin/agent-dashboard/components/AgentLogEntry.tsx`

**Endpoint:** `GET /api/admin/agent-logs` com filtros

**Props de AgentLogEntry:**
```typescript
interface AgentLogEntryProps {
  log: {
    agentId: string
    taskId: string
    action: string
    status: 'success' | 'failure' | 'partial' | 'blocked'
    startedAt: string
    completedAt: string
    durationMinutes: number
    summary: string
    filesChanged: string[]
    tokensUsed: { cost: number }
    qualityGate: { passedQA: boolean; rejections: number; notes?: string }
  }
}
```

**Ícones de status:** ✅ success · ❌ failure · ⚠️ partial · 🔒 blocked

**Critérios:**
- [ ] Lista cronológica inversa
- [ ] Filtros por agente e status
- [ ] Paginação
- [ ] Loading, erro e lista vazia tratados

---

### S0A-013 — Vista Scorecard

**Ficheiros a criar:**
- `src/pages/admin/agent-dashboard/AgentScorecard.tsx`
- `src/pages/admin/agent-dashboard/components/AgentScorecardCard.tsx`

**Endpoint:** `GET /api/admin/agent-logs/stats`

**Props do card:**
```typescript
interface AgentScorecardCardProps {
  agentId: string
  totalTasks: number
  successCount: number
  failureCount: number
  successRate: number
  avgDurationMinutes: number
  totalCostUSD: number
  qaRejectionRate: number
  autonomyLevel: 0 | 1 | 2 | 3
  onClick?: () => void
}
```

**Cor da taxa de sucesso:** ≥85% verde · 70-84% amarelo · <70% vermelho

**Critérios:**
- [ ] Um card por agente com pelo menos 1 log
- [ ] Badge de autonomia (SUPERVISIONADO / SEMI-AUTÓNOMO / AUTÓNOMO / TRUSTED)
- [ ] Cor semântica na taxa de sucesso

---

### S0A-014 — Vista Burndown

**Ficheiro a criar:** `src/pages/admin/agent-dashboard/AgentBurndown.tsx`

**Endpoint:** `GET /api/admin/agent-logs/stats?sprintId=S0A-`

**Constante de tarefas (hardcoded fase 1):**
```typescript
const SPRINT_TASK_COUNTS: Record<string, { label: string; total: number }> = {
  'S0A-': { label: 'Sprint 0A — Agent Dashboard', total: 17 },
  'S0-':  { label: 'Sprint 0 — Pre-Beta Gates', total: 8 },
  'S1-':  { label: 'Sprint 1 — FIRE Frontend', total: 10 },
  'S2-':  { label: 'Sprint 2 — Criadores Phase 1', total: 8 },
}
```

**ETA:** `(total - done) / velocityPerDay` (ou "N/A" se velocity=0)

**Critérios:**
- [ ] Gráfico Recharts BarChart ou ProgressBar shadcn/ui
- [ ] % conclusão, tarefas done/total, velocidade, ETA
- [ ] Selector de sprint activo

---

## S0A-003 — Template JSON de Activity Log

**Ficheiro criado:** `C:\Users\User\.openclaw\workspaces\finhub-task-architect\specs\S0A-003_activity-log-template.json`

**Localização dos logs:** `~/.openclaw/workspaces/<agente>/activity-logs/`
**Naming:** `YYYY-MM-DD_<taskId>.json`

**Campos obrigatórios:** `agentId`, `taskId`, `action`, `status`, `startedAt`, `completedAt`, `durationMinutes`, `summary`, `tokensUsed`, `qualityGate`, `triggeredBy`, `model`

**Campos opcionais:** `filesChanged`, `deviations`, `learnings`

Todos os agentes devem escrever este JSON no fim de cada tarefa.

---

## Riscos e Decisões Pendentes

1. **AdminScope para agent-logs** — O backend tem `src/admin/permissions.ts`. CTO deve decidir: novo scope `AGENT_LOGS_READ/WRITE` ou `requireAdmin` simples. Recomendação: `requireAdmin` simples na fase 1.
2. **Routing frontend** — Confirmar padrão Vike antes de criar ficheiros: verificar `src/pages/admin/+Page.tsx` e `src/router.tsx`.
3. **Auth token para agentes** — Opção A (agentes chamam directamente) vs Opção B (Orchestrator centraliza). Não bloqueia implementação dos endpoints.
4. **S0A-017** (script importação JSON → MongoDB) não especificado nesta fase — tarefa independente.

---

## Próximos Passos

1. Claude Code (CTO) lê `S0A_FASE-B_CODEX_INSTRUCTIONS.md` e executa S0A-005 a S0A-010
2. Após backend funcional: financial-tools executa S0A-011 a S0A-014
3. Em paralelo: Orchestrator executa S0A-016 (actualizar CLAUDE.md de todos os agentes)
4. Task Architect fica disponível para S0A-004 (spec finhub-analytics) quando product-release pedir
