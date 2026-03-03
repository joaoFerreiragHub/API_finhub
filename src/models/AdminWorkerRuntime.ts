import mongoose, { Document, Schema } from 'mongoose'
import { AdminContentJobType } from './AdminContentJob'

export type AdminWorkerRuntimeKey = 'admin_content_jobs'
export type AdminWorkerRuntimeStatus =
  | 'starting'
  | 'idle'
  | 'processing'
  | 'stopping'
  | 'offline'

export interface IAdminWorkerRuntime extends Document {
  key: AdminWorkerRuntimeKey
  workerId?: string | null
  status: AdminWorkerRuntimeStatus
  processId?: number | null
  host?: string | null
  startedAt?: Date | null
  stoppedAt?: Date | null
  lastHeartbeatAt?: Date | null
  currentJobId?: string | null
  currentJobType?: AdminContentJobType | null
  currentJobStartedAt?: Date | null
  lastJobFinishedAt?: Date | null
  stats: {
    claimedJobs: number
    completedJobs: number
    failedJobs: number
    requeuedJobs: number
  }
  lastError?: string | null
  lastErrorAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const AdminWorkerRuntimeSchema = new Schema<IAdminWorkerRuntime>(
  {
    key: {
      type: String,
      enum: ['admin_content_jobs'],
      required: true,
      unique: true,
      index: true,
    },
    workerId: {
      type: String,
      default: null,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['starting', 'idle', 'processing', 'stopping', 'offline'],
      required: true,
      default: 'offline',
      index: true,
    },
    processId: {
      type: Number,
      default: null,
    },
    host: {
      type: String,
      default: null,
      maxlength: 200,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    stoppedAt: {
      type: Date,
      default: null,
    },
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
    currentJobId: {
      type: String,
      default: null,
    },
    currentJobType: {
      type: String,
      enum: ['bulk_moderate', 'bulk_rollback'],
      default: null,
    },
    currentJobStartedAt: {
      type: Date,
      default: null,
    },
    lastJobFinishedAt: {
      type: Date,
      default: null,
    },
    stats: {
      type: {
        claimedJobs: { type: Number, required: true, min: 0, default: 0 },
        completedJobs: { type: Number, required: true, min: 0, default: 0 },
        failedJobs: { type: Number, required: true, min: 0, default: 0 },
        requeuedJobs: { type: Number, required: true, min: 0, default: 0 },
      },
      default: () => ({
        claimedJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        requeuedJobs: 0,
      }),
    },
    lastError: {
      type: String,
      default: null,
      maxlength: 500,
    },
    lastErrorAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const AdminWorkerRuntime = mongoose.model<IAdminWorkerRuntime>(
  'AdminWorkerRuntime',
  AdminWorkerRuntimeSchema
)
