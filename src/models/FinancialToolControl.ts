import mongoose, { Document, Schema } from 'mongoose'

export const FINANCIAL_TOOL_KEYS = ['stocks', 'etf', 'reit', 'crypto'] as const
export const FINANCIAL_TOOL_VERTICALS = [
  'equities',
  'funds',
  'real_estate',
  'digital_assets',
] as const
export const FINANCIAL_TOOL_ENVIRONMENTS = ['development', 'staging', 'production'] as const
export const FINANCIAL_TOOL_EXPERIENCE_MODES = ['legacy', 'standard', 'enhanced'] as const

export type FinancialToolKey = (typeof FINANCIAL_TOOL_KEYS)[number]
export type FinancialToolVertical = (typeof FINANCIAL_TOOL_VERTICALS)[number]
export type FinancialToolEnvironment = (typeof FINANCIAL_TOOL_ENVIRONMENTS)[number]
export type FinancialToolExperienceMode = (typeof FINANCIAL_TOOL_EXPERIENCE_MODES)[number]

export interface FinancialToolConfigSnapshot {
  enabled: boolean
  maxSymbolsPerRequest: number
  cacheTtlSeconds: number
  requestsPerMinute: number
  experienceMode: FinancialToolExperienceMode
}

export interface FinancialToolConfigOverride {
  enabled?: boolean
  maxSymbolsPerRequest?: number
  cacheTtlSeconds?: number
  requestsPerMinute?: number
  experienceMode?: FinancialToolExperienceMode
}

export interface FinancialToolControlHistoryEntry {
  version: number
  changedBy?: mongoose.Types.ObjectId | null
  reason: string
  note?: string | null
  changedAt: Date
  snapshot: {
    label: string
    notes?: string | null
    baseConfig: FinancialToolConfigSnapshot
    envOverrides: {
      development: FinancialToolConfigOverride
      staging: FinancialToolConfigOverride
      production: FinancialToolConfigOverride
    }
  }
}

export interface IFinancialToolControl extends Document {
  tool: FinancialToolKey
  vertical: FinancialToolVertical
  label: string
  notes?: string | null
  baseConfig: FinancialToolConfigSnapshot
  envOverrides: {
    development: FinancialToolConfigOverride
    staging: FinancialToolConfigOverride
    production: FinancialToolConfigOverride
  }
  version: number
  createdBy?: mongoose.Types.ObjectId | null
  updatedBy?: mongoose.Types.ObjectId | null
  history: FinancialToolControlHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const FinancialToolConfigSnapshotSchema = new Schema<FinancialToolConfigSnapshot>(
  {
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    maxSymbolsPerRequest: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
      default: 25,
    },
    cacheTtlSeconds: {
      type: Number,
      required: true,
      min: 0,
      max: 86400,
      default: 300,
    },
    requestsPerMinute: {
      type: Number,
      required: true,
      min: 1,
      max: 5000,
      default: 120,
    },
    experienceMode: {
      type: String,
      enum: FINANCIAL_TOOL_EXPERIENCE_MODES,
      required: true,
      default: 'standard',
    },
  },
  {
    _id: false,
  }
)

const FinancialToolConfigOverrideSchema = new Schema<FinancialToolConfigOverride>(
  {
    enabled: {
      type: Boolean,
      default: undefined,
    },
    maxSymbolsPerRequest: {
      type: Number,
      min: 1,
      max: 500,
      default: undefined,
    },
    cacheTtlSeconds: {
      type: Number,
      min: 0,
      max: 86400,
      default: undefined,
    },
    requestsPerMinute: {
      type: Number,
      min: 1,
      max: 5000,
      default: undefined,
    },
    experienceMode: {
      type: String,
      enum: FINANCIAL_TOOL_EXPERIENCE_MODES,
      default: undefined,
    },
  },
  {
    _id: false,
  }
)

const FinancialToolControlHistoryEntrySchema = new Schema<FinancialToolControlHistoryEntry>(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    note: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    snapshot: {
      label: {
        type: String,
        required: true,
        maxlength: 120,
      },
      notes: {
        type: String,
        default: null,
        maxlength: 2000,
      },
      baseConfig: {
        type: FinancialToolConfigSnapshotSchema,
        required: true,
      },
      envOverrides: {
        development: {
          type: FinancialToolConfigOverrideSchema,
          default: {},
        },
        staging: {
          type: FinancialToolConfigOverrideSchema,
          default: {},
        },
        production: {
          type: FinancialToolConfigOverrideSchema,
          default: {},
        },
      },
    },
  },
  {
    _id: false,
  }
)

const FinancialToolControlSchema = new Schema<IFinancialToolControl>(
  {
    tool: {
      type: String,
      enum: FINANCIAL_TOOL_KEYS,
      required: true,
      unique: true,
      index: true,
    },
    vertical: {
      type: String,
      enum: FINANCIAL_TOOL_VERTICALS,
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    notes: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    baseConfig: {
      type: FinancialToolConfigSnapshotSchema,
      required: true,
      default: () => ({
        enabled: true,
        maxSymbolsPerRequest: 25,
        cacheTtlSeconds: 300,
        requestsPerMinute: 120,
        experienceMode: 'standard',
      }),
    },
    envOverrides: {
      development: {
        type: FinancialToolConfigOverrideSchema,
        default: {},
      },
      staging: {
        type: FinancialToolConfigOverrideSchema,
        default: {},
      },
      production: {
        type: FinancialToolConfigOverrideSchema,
        default: {},
      },
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    history: {
      type: [FinancialToolControlHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

FinancialToolControlSchema.index({ tool: 1 }, { unique: true })
FinancialToolControlSchema.index({ vertical: 1, 'baseConfig.enabled': 1, updatedAt: -1 })

export const FinancialToolControl = mongoose.model<IFinancialToolControl>(
  'FinancialToolControl',
  FinancialToolControlSchema
)
