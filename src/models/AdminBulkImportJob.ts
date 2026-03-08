import mongoose, { Document, Schema } from 'mongoose'

export const ADMIN_BULK_IMPORT_TYPES = [
  'subscription_entitlements',
  'ad_campaign_status',
] as const
export const ADMIN_BULK_IMPORT_STATUSES = [
  'running',
  'completed',
  'completed_with_errors',
  'failed',
] as const
export const ADMIN_BULK_IMPORT_ROW_STATUSES = ['success', 'failed', 'skipped'] as const

export type AdminBulkImportType = (typeof ADMIN_BULK_IMPORT_TYPES)[number]
export type AdminBulkImportStatus = (typeof ADMIN_BULK_IMPORT_STATUSES)[number]
export type AdminBulkImportRowStatus = (typeof ADMIN_BULK_IMPORT_ROW_STATUSES)[number]

export interface AdminBulkImportResultRow {
  rowNumber: number
  status: AdminBulkImportRowStatus
  message: string
  targetType?: string | null
  targetId?: string | null
}

export interface AdminBulkImportErrorRow {
  rowNumber: number
  code: string
  message: string
  targetType?: string | null
  targetId?: string | null
}

export interface AdminBulkImportJobSummary {
  totalRows: number
  validRows: number
  processedRows: number
  succeededRows: number
  failedRows: number
  skippedRows: number
  warningsCount: number
  errorsCount: number
}

export interface IAdminBulkImportJob extends Document {
  importType: AdminBulkImportType
  status: AdminBulkImportStatus
  actor: mongoose.Types.ObjectId
  reason: string
  note?: string | null
  dryRun: boolean
  source: {
    format: 'csv'
    delimiter: string
    headers: string[]
  }
  summary: AdminBulkImportJobSummary
  stats?: Record<string, number> | null
  warnings: string[]
  errorRows: AdminBulkImportErrorRow[]
  results: AdminBulkImportResultRow[]
  startedAt: Date
  finishedAt?: Date | null
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const AdminBulkImportResultRowSchema = new Schema<AdminBulkImportResultRow>(
  {
    rowNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ADMIN_BULK_IMPORT_ROW_STATUSES,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    targetType: {
      type: String,
      default: null,
      maxlength: 80,
    },
    targetId: {
      type: String,
      default: null,
      maxlength: 120,
    },
  },
  {
    _id: false,
  }
)

const AdminBulkImportErrorRowSchema = new Schema<AdminBulkImportErrorRow>(
  {
    rowNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    targetType: {
      type: String,
      default: null,
      maxlength: 80,
    },
    targetId: {
      type: String,
      default: null,
      maxlength: 120,
    },
  },
  {
    _id: false,
  }
)

const AdminBulkImportJobSummarySchema = new Schema<AdminBulkImportJobSummary>(
  {
    totalRows: { type: Number, required: true, min: 0, default: 0 },
    validRows: { type: Number, required: true, min: 0, default: 0 },
    processedRows: { type: Number, required: true, min: 0, default: 0 },
    succeededRows: { type: Number, required: true, min: 0, default: 0 },
    failedRows: { type: Number, required: true, min: 0, default: 0 },
    skippedRows: { type: Number, required: true, min: 0, default: 0 },
    warningsCount: { type: Number, required: true, min: 0, default: 0 },
    errorsCount: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    _id: false,
  }
)

const AdminBulkImportJobSchema = new Schema<IAdminBulkImportJob>(
  {
    importType: {
      type: String,
      enum: ADMIN_BULK_IMPORT_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ADMIN_BULK_IMPORT_STATUSES,
      required: true,
      default: 'running',
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
    dryRun: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    source: {
      format: {
        type: String,
        enum: ['csv'],
        required: true,
        default: 'csv',
      },
      delimiter: {
        type: String,
        required: true,
        maxlength: 5,
        default: ',',
      },
      headers: {
        type: [String],
        default: [],
      },
    },
    summary: {
      type: AdminBulkImportJobSummarySchema,
      required: true,
      default: () => ({
        totalRows: 0,
        validRows: 0,
        processedRows: 0,
        succeededRows: 0,
        failedRows: 0,
        skippedRows: 0,
        warningsCount: 0,
        errorsCount: 0,
      }),
    },
    stats: {
      type: Schema.Types.Mixed,
      default: null,
    },
    warnings: {
      type: [String],
      default: [],
    },
    errorRows: {
      type: [AdminBulkImportErrorRowSchema],
      default: [],
    },
    results: {
      type: [AdminBulkImportResultRowSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

AdminBulkImportJobSchema.index({ importType: 1, createdAt: -1 })
AdminBulkImportJobSchema.index({ status: 1, createdAt: -1 })
AdminBulkImportJobSchema.index({ actor: 1, createdAt: -1 })
AdminBulkImportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const AdminBulkImportJob = mongoose.model<IAdminBulkImportJob>(
  'AdminBulkImportJob',
  AdminBulkImportJobSchema
)
