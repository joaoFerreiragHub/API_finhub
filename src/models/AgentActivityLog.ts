import mongoose, { Document, Schema } from 'mongoose'

export interface IAgentActivityLog extends Document {
  agentId: string
  taskId: string
  action: string
  status: string
  startedAt: Date
  completedAt?: Date | null
  durationMinutes: number
  summary?: string | null
  filesChanged: string[]
  tokensUsed: {
    input: number
    output: number
    cost: number
  }
  qualityGate: {
    passedQA: boolean
    rejections: number
  }
  deviations: unknown[]
  learnings?: string[] | null
  triggeredBy: string
  llmModel: string
  createdAt: Date
  updatedAt: Date
}

const AgentActivityLogSchema = new Schema<IAgentActivityLog>(
  {
    agentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    taskId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    summary: {
      type: String,
      default: null,
    },
    filesChanged: {
      type: [String],
      default: [],
    },
    tokensUsed: {
      type: {
        input: { type: Number, required: true, min: 0, default: 0 },
        output: { type: Number, required: true, min: 0, default: 0 },
        cost: { type: Number, required: true, min: 0, default: 0 },
      },
      default: () => ({ input: 0, output: 0, cost: 0 }),
    },
    qualityGate: {
      type: {
        passedQA: { type: Boolean, required: true, default: true },
        rejections: { type: Number, required: true, min: 0, default: 0 },
      },
      default: () => ({ passedQA: true, rejections: 0 }),
    },
    deviations: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    learnings: {
      type: [String],
      default: null,
    },
    triggeredBy: {
      type: String,
      required: true,
      trim: true,
      default: 'unknown',
    },
    llmModel: {
      type: String,
      required: true,
      trim: true,
      default: 'unknown',
    },
  },
  {
    timestamps: true,
  }
)

AgentActivityLogSchema.index({ agentId: 1, taskId: 1, startedAt: 1 }, { unique: true })
AgentActivityLogSchema.index({ createdAt: -1 })

export const AgentActivityLog =
  mongoose.models.AgentActivityLog ||
  mongoose.model<IAgentActivityLog>('AgentActivityLog', AgentActivityLogSchema)
