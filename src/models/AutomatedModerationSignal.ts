import mongoose, { Document, Schema } from 'mongoose'
import { ContentModerationAction, ModeratableContentType } from './ContentModerationEvent'

export type AutomatedModerationRule = 'spam' | 'suspicious_link' | 'flood' | 'mass_creation'
export type AutomatedModerationSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type AutomatedModerationRecommendedAction = 'none' | 'review' | 'restrict' | 'hide'
export type AutomatedModerationStatus = 'active' | 'reviewed' | 'cleared'
export type AutomatedModerationTriggerSource = 'create' | 'update' | 'publish'
export type AutomatedModerationOutcome = 'success' | 'error'

export interface AutomatedModerationTriggeredRule {
  rule: AutomatedModerationRule
  score: number
  severity: AutomatedModerationSeverity
  description: string
  metadata?: Record<string, unknown>
}

export interface AutomatedModerationTextSignals {
  textLength: number
  tokenCount: number
  uniqueTokenRatio: number
  urlCount: number
  suspiciousUrlCount: number
  duplicateUrlCount: number
  repeatedTokenCount: number
  duplicateLineCount: number
}

export interface AutomatedModerationActivitySignals {
  sameSurfaceLast10m: number
  sameSurfaceLast60m: number
  portfolioLast10m: number
  portfolioLast60m: number
}

export interface AutomatedModerationAutomationState {
  enabled: boolean
  eligible: boolean
  blockedReason?: string | null
  attempted: boolean
  executed: boolean
  action?: ContentModerationAction | null
  lastOutcome?: AutomatedModerationOutcome | null
  lastError?: string | null
  lastAttemptAt?: Date | null
}

export interface IAutomatedModerationSignal extends Document {
  contentType: ModeratableContentType
  contentId: string
  actor?: mongoose.Types.ObjectId | null
  ownerUserId?: mongoose.Types.ObjectId | null
  status: AutomatedModerationStatus
  triggerSource: AutomatedModerationTriggerSource
  score: number
  severity: AutomatedModerationSeverity
  recommendedAction: AutomatedModerationRecommendedAction
  triggeredRules: AutomatedModerationTriggeredRule[]
  textSignals: AutomatedModerationTextSignals
  activitySignals: AutomatedModerationActivitySignals
  automation: AutomatedModerationAutomationState
  firstDetectedAt?: Date | null
  lastDetectedAt?: Date | null
  lastEvaluatedAt: Date
  resolvedBy?: mongoose.Types.ObjectId | null
  resolvedAt?: Date | null
  resolutionAction?: ContentModerationAction | 'cleared' | null
  createdAt: Date
  updatedAt: Date
}

const TriggeredRuleSchema = new Schema<AutomatedModerationTriggeredRule>(
  {
    rule: {
      type: String,
      enum: ['spam', 'suspicious_link', 'flood', 'mass_creation'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
    },
    severity: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
  }
)

const TextSignalsSchema = new Schema<AutomatedModerationTextSignals>(
  {
    textLength: { type: Number, default: 0, min: 0 },
    tokenCount: { type: Number, default: 0, min: 0 },
    uniqueTokenRatio: { type: Number, default: 0, min: 0 },
    urlCount: { type: Number, default: 0, min: 0 },
    suspiciousUrlCount: { type: Number, default: 0, min: 0 },
    duplicateUrlCount: { type: Number, default: 0, min: 0 },
    repeatedTokenCount: { type: Number, default: 0, min: 0 },
    duplicateLineCount: { type: Number, default: 0, min: 0 },
  },
  {
    _id: false,
  }
)

const ActivitySignalsSchema = new Schema<AutomatedModerationActivitySignals>(
  {
    sameSurfaceLast10m: { type: Number, default: 0, min: 0 },
    sameSurfaceLast60m: { type: Number, default: 0, min: 0 },
    portfolioLast10m: { type: Number, default: 0, min: 0 },
    portfolioLast60m: { type: Number, default: 0, min: 0 },
  },
  {
    _id: false,
  }
)

const AutomationStateSchema = new Schema<AutomatedModerationAutomationState>(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    eligible: {
      type: Boolean,
      default: false,
    },
    blockedReason: {
      type: String,
      default: null,
      maxlength: 120,
    },
    attempted: {
      type: Boolean,
      default: false,
    },
    executed: {
      type: Boolean,
      default: false,
    },
    action: {
      type: String,
      enum: ['hide', 'unhide', 'restrict'],
      default: null,
    },
    lastOutcome: {
      type: String,
      enum: ['success', 'error'],
      default: null,
    },
    lastError: {
      type: String,
      default: null,
      maxlength: 500,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
)

const AutomatedModerationSignalSchema = new Schema<IAutomatedModerationSignal>(
  {
    contentType: {
      type: String,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book', 'comment', 'review'],
      required: true,
      index: true,
    },
    contentId: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'reviewed', 'cleared'],
      default: 'active',
      index: true,
    },
    triggerSource: {
      type: String,
      enum: ['create', 'update', 'publish'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    severity: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'critical'],
      default: 'none',
      index: true,
    },
    recommendedAction: {
      type: String,
      enum: ['none', 'review', 'restrict', 'hide'],
      default: 'none',
    },
    triggeredRules: {
      type: [TriggeredRuleSchema],
      default: [],
    },
    textSignals: {
      type: TextSignalsSchema,
      default: () => ({}),
    },
    activitySignals: {
      type: ActivitySignalsSchema,
      default: () => ({}),
    },
    automation: {
      type: AutomationStateSchema,
      default: () => ({}),
    },
    firstDetectedAt: {
      type: Date,
      default: null,
    },
    lastDetectedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastEvaluatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionAction: {
      type: String,
      enum: ['hide', 'unhide', 'restrict', 'cleared'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

AutomatedModerationSignalSchema.index({ contentType: 1, contentId: 1 }, { unique: true })
AutomatedModerationSignalSchema.index({ status: 1, severity: 1, lastDetectedAt: -1 })
AutomatedModerationSignalSchema.index({ actor: 1, status: 1, updatedAt: -1 })
AutomatedModerationSignalSchema.index({ ownerUserId: 1, status: 1, updatedAt: -1 })
AutomatedModerationSignalSchema.index({ 'triggeredRules.rule': 1, status: 1, lastDetectedAt: -1 })

export const AutomatedModerationSignal = mongoose.model<IAutomatedModerationSignal>(
  'AutomatedModerationSignal',
  AutomatedModerationSignalSchema
)
