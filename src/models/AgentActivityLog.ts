// src/models/AgentActivityLog.ts
// Sprint 0A — S0A-005: Schema para registar actividade dos agentes OpenClaw
// Referencia: OPENCLAW_FINHUB_MASTER_REFERENCE.md Parte 8.2
import { Schema, model, Document } from 'mongoose'

// --- Sub-tipos ---

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
  llmModel: string
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
    llmModel: { type: String, required: true, maxlength: 100 },
  },
  {
    timestamps: true,
    collection: 'agent_activity_logs',
  }
)

// --- Indices compostos para queries frequentes ---
AgentActivityLogSchema.index({ agentId: 1, startedAt: -1 })
AgentActivityLogSchema.index({ status: 1, startedAt: -1 })
AgentActivityLogSchema.index({ taskId: 1, agentId: 1 })

export const AgentActivityLog = model<IAgentActivityLog>('AgentActivityLog', AgentActivityLogSchema)
