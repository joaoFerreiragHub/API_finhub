import mongoose, { Document, Schema } from 'mongoose'
import {
  FINANCIAL_TOOL_ENVIRONMENTS,
  FINANCIAL_TOOL_KEYS,
  FINANCIAL_TOOL_VERTICALS,
  FinancialToolEnvironment,
  FinancialToolKey,
  FinancialToolVertical,
} from './FinancialToolControl'

export interface IFinancialToolUsageDaily extends Document {
  day: string
  environment: FinancialToolEnvironment
  tool: FinancialToolKey
  vertical: FinancialToolVertical
  totalRequests: number
  authenticatedRequests: number
  successCount: number
  clientErrorCount: number
  serverErrorCount: number
  totalDurationMs: number
  maxDurationMs: number
  lastStatusCode: number
  lastRequestAt: Date
  createdAt: Date
  updatedAt: Date
}

const FinancialToolUsageDailySchema = new Schema<IFinancialToolUsageDaily>(
  {
    day: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    environment: {
      type: String,
      enum: FINANCIAL_TOOL_ENVIRONMENTS,
      required: true,
      index: true,
    },
    tool: {
      type: String,
      enum: FINANCIAL_TOOL_KEYS,
      required: true,
      index: true,
    },
    vertical: {
      type: String,
      enum: FINANCIAL_TOOL_VERTICALS,
      required: true,
      index: true,
    },
    totalRequests: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    authenticatedRequests: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    successCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    clientErrorCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    serverErrorCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalDurationMs: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    maxDurationMs: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lastStatusCode: {
      type: Number,
      required: true,
      min: 100,
      max: 599,
      default: 200,
    },
    lastRequestAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

FinancialToolUsageDailySchema.index(
  { day: 1, environment: 1, tool: 1, vertical: 1 },
  { unique: true, name: 'financial_tool_usage_daily_unique' }
)
FinancialToolUsageDailySchema.index({ tool: 1, day: -1 })
FinancialToolUsageDailySchema.index({ vertical: 1, day: -1 })

export const FinancialToolUsageDaily = mongoose.model<IFinancialToolUsageDaily>(
  'FinancialToolUsageDaily',
  FinancialToolUsageDailySchema
)
