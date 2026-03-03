import crypto from 'crypto'
import mongoose from 'mongoose'
import os from 'os'
import {
  AdminContentJob,
  AdminContentJobApproval,
  AdminContentJobApprovalStatus,
  AdminContentJobStatus,
  AdminContentJobType,
  IAdminContentJob,
} from '../models/AdminContentJob'
import {
  AdminWorkerRuntime,
  AdminWorkerRuntimeStatus,
  IAdminWorkerRuntime,
} from '../models/AdminWorkerRuntime'
import {
  ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD,
  ADMIN_CONTENT_BULK_MAX_ITEMS,
  AdminContentServiceError,
  BulkModerateContentInput,
  BulkRollbackContentInput,
  normalizeBulkModerationItems,
  normalizeBulkRollbackItems,
  adminContentService,
} from './adminContent.service'

interface PaginationOptions {
  page?: number
  limit?: number
}

interface AdminContentJobFilters {
  type?: AdminContentJobType
  status?: AdminContentJobStatus
}

interface BulkRollbackReviewSampleItemInput {
  contentType: BulkRollbackContentInput['items'][number]['contentType']
  contentId: string
  eventId: string
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const COMPLETED_JOB_TTL_DAYS = 90
const FAILED_JOB_TTL_DAYS = 180
const DEFAULT_STOP_TIMEOUT_MS = 15_000
const DEFAULT_WORKER_HEARTBEAT_MS = 5_000
const DEFAULT_JOB_LEASE_MS = 60_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_WORKER_STOP_POLL_MS = 100
const WORKER_RUNTIME_KEY = 'admin_content_jobs'

const parsePositiveIntEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const MAX_JOB_ATTEMPTS = parsePositiveIntEnv(
  process.env.ADMIN_CONTENT_JOBS_MAX_ATTEMPTS,
  DEFAULT_MAX_ATTEMPTS
)
const WORKER_HEARTBEAT_MS = parsePositiveIntEnv(
  process.env.ADMIN_CONTENT_JOBS_WORKER_HEARTBEAT_MS,
  DEFAULT_WORKER_HEARTBEAT_MS
)
const JOB_LEASE_MS = parsePositiveIntEnv(
  process.env.ADMIN_CONTENT_JOBS_JOB_LEASE_MS,
  DEFAULT_JOB_LEASE_MS
)
const WORKER_STOP_POLL_MS = parsePositiveIntEnv(
  process.env.ADMIN_CONTENT_JOBS_WORKER_STOP_POLL_MS,
  DEFAULT_WORKER_STOP_POLL_MS
)
const WORKER_STATUS_STALE_MS = Math.max(JOB_LEASE_MS, WORKER_HEARTBEAT_MS * 3)

const normalizePage = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_PAGE
  return Math.floor(value)
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new AdminContentServiceError(400, `${fieldName} invalido.`)
  }

  return new mongoose.Types.ObjectId(rawId)
}

const nowPlusMs = (value: number): Date => new Date(Date.now() + value)

const runtimeStatsDefaults = () => ({
  claimedJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  requeuedJobs: 0,
})

export const isValidAdminContentJobType = (value: unknown): value is AdminContentJobType =>
  value === 'bulk_moderate' || value === 'bulk_rollback'

export const isValidAdminContentJobStatus = (value: unknown): value is AdminContentJobStatus =>
  value === 'queued' ||
  value === 'running' ||
  value === 'completed' ||
  value === 'completed_with_errors' ||
  value === 'failed'

const isValidAdminContentJobApprovalStatus = (
  value: unknown
): value is AdminContentJobApprovalStatus =>
  value === 'draft' || value === 'review' || value === 'approved'

const toSampleKey = (item: { contentType: string; contentId: string; eventId: string | null | undefined }) =>
  `${item.contentType}:${item.contentId}:${item.eventId ?? ''}`

class AdminContentJobService {
  private workerEnabled = false
  private workerScheduled = false
  private workerRunning = false
  private stopRequested = false
  private scheduledTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private workerId: string | null = null
  private workerStartedAt: Date | null = null
  private currentJobId: string | null = null
  private currentJobType: AdminContentJobType | null = null
  private currentJobStartedAt: Date | null = null

  async startWorker() {
    if (this.workerEnabled) return

    this.workerEnabled = true
    this.stopRequested = false
    this.workerId =
      process.env.ADMIN_CONTENT_JOBS_WORKER_ID?.trim() ||
      `admin-content-jobs:${os.hostname()}:${process.pid}:${crypto.randomUUID().slice(0, 8)}`
    this.workerStartedAt = new Date()

    await this.upsertWorkerRuntime({
      workerId: this.workerId,
      status: 'starting',
      processId: process.pid,
      host: os.hostname(),
      startedAt: this.workerStartedAt,
      stoppedAt: null,
      currentJobId: null,
      currentJobType: null,
      currentJobStartedAt: null,
      lastError: null,
      lastErrorAt: null,
    })

    this.startHeartbeatLoop()
    await this.refreshWorkerHeartbeat()
    await this.requeueStaleRunningJobs()
    await this.upsertWorkerRuntime({
      status: 'idle',
      workerId: this.workerId,
      processId: process.pid,
      host: os.hostname(),
    })
    this.scheduleWorker()
  }

  async stopWorker(timeoutMs = DEFAULT_STOP_TIMEOUT_MS) {
    if (!this.workerEnabled) return true

    this.stopRequested = true
    await this.upsertWorkerRuntime({
      status: 'stopping',
      workerId: this.workerId,
    })

    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer)
      this.scheduledTimer = null
      this.workerScheduled = false
    }

    const deadline = Date.now() + timeoutMs
    while (this.workerRunning && Date.now() < deadline) {
      await new Promise((resolve) => {
        setTimeout(resolve, WORKER_STOP_POLL_MS)
      })
    }

    let gracefulStop = true
    if (this.workerRunning) {
      gracefulStop = false
      await this.requeueRunningJobs('Job reencaminhado apos paragem controlada do worker.', {
        onlyStale: false,
      })
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.clearCurrentJobContextLocally()
    this.workerEnabled = false
    this.workerRunning = false
    await this.upsertWorkerRuntime({
      status: 'offline',
      workerId: this.workerId,
      processId: process.pid,
      host: os.hostname(),
      stoppedAt: new Date(),
      currentJobId: null,
      currentJobType: null,
      currentJobStartedAt: null,
    })

    return gracefulStop
  }

  async queueBulkModerationJob(input: BulkModerateContentInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const { uniqueItems, duplicatesSkipped } = normalizeBulkModerationItems(input.items)

    if (uniqueItems.length >= ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD && input.confirm !== true) {
      throw new AdminContentServiceError(
        400,
        `Lotes com ${ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD} ou mais itens exigem confirm=true.`
      )
    }

    const job = await AdminContentJob.create({
      type: 'bulk_moderate',
      status: 'queued',
      actor: actorId,
      action: input.action,
      reason: input.reason.trim(),
      note: input.note?.trim() ? input.note.trim() : null,
      confirm: input.confirm === true,
      attemptCount: 0,
      maxAttempts: MAX_JOB_ATTEMPTS,
      items: uniqueItems.map((item) => ({
        contentType: item.contentType,
        contentId: item.contentId,
        status: 'pending',
      })),
      progress: {
        requested: uniqueItems.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        changed: 0,
      },
      guardrails: {
        maxItems: ADMIN_CONTENT_BULK_MAX_ITEMS,
        confirmThreshold: ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD,
        duplicatesSkipped,
      },
    })

    this.scheduleWorker()
    return this.getJob(String(job._id))
  }

  async queueBulkRollbackJob(input: BulkRollbackContentInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const { uniqueItems, duplicatesSkipped } = normalizeBulkRollbackItems(input.items)
    const approval = await this.buildBulkRollbackApproval(uniqueItems, input.markFalsePositive === true)

    const job = await AdminContentJob.create({
      type: 'bulk_rollback',
      status: 'queued',
      actor: actorId,
      reason: input.reason.trim(),
      note: input.note?.trim() ? input.note.trim() : null,
      confirm: input.confirm === true,
      markFalsePositive: input.markFalsePositive === true,
      attemptCount: 0,
      maxAttempts: MAX_JOB_ATTEMPTS,
      approval,
      items: uniqueItems.map((item) => ({
        contentType: item.contentType,
        contentId: item.contentId,
        eventId: item.eventId,
        status: 'pending',
      })),
      progress: {
        requested: uniqueItems.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        changed: 0,
      },
      guardrails: {
        maxItems: ADMIN_CONTENT_BULK_MAX_ITEMS,
        confirmThreshold: ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD,
        duplicatesSkipped,
      },
    })
    return this.getJob(String(job._id))
  }

  async requestBulkRollbackJobReview(input: {
    actorId: string
    jobId: string
    note?: string
  }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const jobId = toObjectId(input.jobId, 'jobId')
    const now = new Date()
    const note = input.note?.trim() ? input.note.trim() : null

    const job = await AdminContentJob.findOneAndUpdate(
      {
        _id: jobId,
        type: 'bulk_rollback',
        status: 'queued',
        'approval.required': true,
        'approval.reviewStatus': 'draft',
      },
      {
        $set: {
          'approval.reviewStatus': 'review',
          'approval.reviewNote': note,
          'approval.reviewRequestedAt': now,
          'approval.reviewRequestedBy': actorId,
        },
      },
      {
        new: true,
      }
    )

    if (!job) {
      throw new AdminContentServiceError(
        409,
        'Job de rollback em lote indisponivel para revisao nesta fase.'
      )
    }

    return this.getJob(String(job._id))
  }

  async approveBulkRollbackJob(input: {
    actorId: string
    jobId: string
    note?: string
    confirm?: boolean
    falsePositiveValidated?: boolean
    reviewedSampleItems?: BulkRollbackReviewSampleItemInput[]
  }) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const jobId = toObjectId(input.jobId, 'jobId')
    const job = await AdminContentJob.findById(jobId)

    if (!job || job.type !== 'bulk_rollback' || job.status !== 'queued' || !job.approval?.required) {
      throw new AdminContentServiceError(404, 'Job de rollback em lote nao encontrado.')
    }

    if (job.approval.reviewStatus !== 'review') {
      throw new AdminContentServiceError(
        409,
        'Job de rollback em lote tem de passar por revisao antes da aprovacao.'
      )
    }

    const approval = job.approval as AdminContentJobApproval
    const criticalRiskCount = Number(approval.riskSummary?.criticalRiskCount ?? 0)
    if (criticalRiskCount > 0 && input.confirm !== true) {
      throw new AdminContentServiceError(
        400,
        'Aprovacao exige confirm=true porque existem thresholds criticos ativos no lote.'
      )
    }

    const reviewedSampleKeys = Array.from(
      new Set((input.reviewedSampleItems ?? []).map((item) => toSampleKey(item)))
    )
    const requiredSampleKeys = Array.isArray(approval.sampleItems)
      ? approval.sampleItems.map((item) => toSampleKey(item))
      : []

    if (approval.sampleRequired && requiredSampleKeys.some((key) => !reviewedSampleKeys.includes(key))) {
      throw new AdminContentServiceError(
        400,
        'Aprovacao exige revisao explicita de todos os itens da amostra recomendada.'
      )
    }

    if (job.markFalsePositive === true && approval.falsePositiveValidationRequired && input.falsePositiveValidated !== true) {
      throw new AdminContentServiceError(
        400,
        'Aprovacao exige validacao explicita dos false positives antes de executar rollback em lote.'
      )
    }

    job.confirm = job.confirm === true || input.confirm === true
    job.approval.reviewStatus = 'approved'
    job.approval.approvalNote = input.note?.trim() ? input.note.trim() : null
    job.approval.approvedAt = new Date()
    job.approval.approvedBy = actorId
    job.approval.reviewedSampleKeys = reviewedSampleKeys
    job.approval.falsePositiveValidated = input.falsePositiveValidated === true
    await job.save()

    this.scheduleWorker()
    return this.getJob(String(job._id))
  }

  async listJobs(filters: AdminContentJobFilters = {}, options: PaginationOptions = {}) {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}
    if (filters.type) query.type = filters.type
    if (filters.status) query.status = filters.status

    const [items, total] = await Promise.all([
      AdminContentJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name username email role')
        .populate('approval.reviewRequestedBy', 'name username email role')
        .populate('approval.approvedBy', 'name username email role')
        .lean(),
      AdminContentJob.countDocuments(query),
    ])

    return {
      items: items.map((item) => this.mapJob(item as any)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getJob(jobId: string) {
    toObjectId(jobId, 'jobId')

    const job = await AdminContentJob.findById(jobId)
      .populate('actor', 'name username email role')
      .populate('approval.reviewRequestedBy', 'name username email role')
      .populate('approval.approvedBy', 'name username email role')
      .lean()

    if (!job) {
      throw new AdminContentServiceError(404, 'Job de moderacao nao encontrado.')
    }

    return this.mapJob(job as any)
  }

  async getWorkerStatus() {
    const now = new Date()
    const staleFallback = new Date(now.getTime() - JOB_LEASE_MS)
    const runtime = await AdminWorkerRuntime.findOne({ key: WORKER_RUNTIME_KEY }).lean()

    const currentJobPromise =
      runtime?.currentJobId && mongoose.Types.ObjectId.isValid(runtime.currentJobId)
        ? AdminContentJob.findById(runtime.currentJobId)
            .populate('actor', 'name username email role')
            .populate('approval.reviewRequestedBy', 'name username email role')
            .populate('approval.approvedBy', 'name username email role')
            .lean()
        : Promise.resolve(null)

    const [queued, awaitingApproval, running, staleRunning, retrying, maxAttemptsReached, failedLast24h, currentJob] =
      await Promise.all([
        AdminContentJob.countDocuments({
          status: 'queued',
          $or: [
            { type: 'bulk_moderate' },
            {
              type: 'bulk_rollback',
              'approval.required': { $ne: true },
            },
            {
              type: 'bulk_rollback',
              'approval.reviewStatus': 'approved',
            },
          ],
        }),
        AdminContentJob.countDocuments({
          type: 'bulk_rollback',
          status: 'queued',
          'approval.required': true,
          'approval.reviewStatus': { $in: ['draft', 'review'] },
        }),
        AdminContentJob.countDocuments({ status: 'running' }),
        AdminContentJob.countDocuments({
          status: 'running',
          $or: [
            { leaseExpiresAt: { $lt: now } },
            { leaseExpiresAt: null, startedAt: { $lt: staleFallback } },
          ],
        }),
        AdminContentJob.countDocuments({
          $or: [
            { status: 'queued', attemptCount: { $gt: 0 } },
            { status: 'running', attemptCount: { $gt: 1 } },
          ],
        }),
        AdminContentJob.countDocuments({
          status: 'failed',
          $expr: { $gte: ['$attemptCount', '$maxAttempts'] },
        }),
        AdminContentJob.countDocuments({
          status: { $in: ['failed', 'completed_with_errors'] },
          finishedAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        }),
        currentJobPromise,
      ])

    const derivedStatus = this.resolveWorkerRuntimeStatus(runtime as Partial<IAdminWorkerRuntime> | null, now)

    return {
      generatedAt: now,
      worker: {
        key: WORKER_RUNTIME_KEY,
        status: derivedStatus,
        workerId: runtime?.workerId ?? null,
        processId: typeof runtime?.processId === 'number' ? runtime.processId : null,
        host: runtime?.host ?? null,
        startedAt: runtime?.startedAt ?? null,
        stoppedAt: runtime?.stoppedAt ?? null,
        lastHeartbeatAt: runtime?.lastHeartbeatAt ?? null,
        currentJobId: runtime?.currentJobId ?? null,
        currentJobType:
          runtime?.currentJobType === 'bulk_rollback'
            ? 'bulk_rollback'
            : runtime?.currentJobType === 'bulk_moderate'
              ? 'bulk_moderate'
              : null,
        currentJobStartedAt: runtime?.currentJobStartedAt ?? null,
        lastJobFinishedAt: runtime?.lastJobFinishedAt ?? null,
        stats: {
          claimedJobs: Number(runtime?.stats?.claimedJobs ?? 0),
          completedJobs: Number(runtime?.stats?.completedJobs ?? 0),
          failedJobs: Number(runtime?.stats?.failedJobs ?? 0),
          requeuedJobs: Number(runtime?.stats?.requeuedJobs ?? 0),
        },
        lastError: runtime?.lastError ?? null,
        lastErrorAt: runtime?.lastErrorAt ?? null,
      },
      queue: {
        queued,
        awaitingApproval,
        running,
        staleRunning,
        retrying,
        maxAttemptsReached,
        failedLast24h,
      },
      currentJob: currentJob ? this.mapJob(currentJob as any) : null,
      config: {
        leaseMs: JOB_LEASE_MS,
        heartbeatMs: WORKER_HEARTBEAT_MS,
        staleAfterMs: WORKER_STATUS_STALE_MS,
        maxAttempts: MAX_JOB_ATTEMPTS,
      },
    }
  }

  private async buildBulkRollbackApproval(
    items: BulkRollbackContentInput['items'],
    markFalsePositive: boolean
  ): Promise<AdminContentJobApproval> {
    const automatedSeverityRank: Record<'none' | 'low' | 'medium' | 'high' | 'critical', number> = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    }
    const creatorRiskRank: Record<'low' | 'medium' | 'high' | 'critical', number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    }

    const reviewedItems = await Promise.all(
      items.map(async (item) => {
        const review = await adminContentService.getRollbackReview({
          contentType: item.contentType,
          contentId: item.contentId,
          eventId: item.eventId,
        })

        if (!review.rollback.canRollback) {
          throw new AdminContentServiceError(
            409,
            `Rollback em lote bloqueado para ${item.contentType}:${item.contentId}. ${review.rollback.blockers[0] ?? 'Rollback indisponivel.'}`
          )
        }

        if (markFalsePositive && !review.rollback.falsePositiveEligible) {
          throw new AdminContentServiceError(
            400,
            `False positive em lote so e permitido quando ${item.contentType}:${item.contentId} volta a visivel.`
          )
        }

        const automatedSeverity =
          review.rollback.checks.automatedSeverity in automatedSeverityRank
            ? (review.rollback.checks.automatedSeverity as keyof typeof automatedSeverityRank)
            : 'none'
        const creatorRiskLevel =
          review.rollback.checks.creatorRiskLevel &&
          review.rollback.checks.creatorRiskLevel in creatorRiskRank
            ? (review.rollback.checks.creatorRiskLevel as keyof typeof creatorRiskRank)
            : null
        const highRisk =
          review.rollback.requiresConfirm ||
          automatedSeverity === 'high' ||
          automatedSeverity === 'critical' ||
          creatorRiskLevel === 'high' ||
          creatorRiskLevel === 'critical' ||
          review.rollback.checks.openReports >= 3
        const criticalRisk =
          automatedSeverity === 'critical' ||
          creatorRiskLevel === 'critical' ||
          review.rollback.checks.openReports >= 5
        const riskScore =
          (criticalRisk ? 200 : highRisk ? 100 : 0) +
          (review.rollback.requiresConfirm ? 50 : 0) +
          review.rollback.checks.openReports * 4 +
          review.rollback.checks.uniqueReporters * 3 +
          automatedSeverityRank[automatedSeverity] * 6 +
          (creatorRiskLevel ? creatorRiskRank[creatorRiskLevel] * 5 : 0)

        return {
          review,
          highRisk,
          criticalRisk,
          riskScore,
        }
      })
    )

    const riskSummary = reviewedItems.reduce(
      (summary, item) => {
        if (item.review.rollback.targetStatus === 'visible') {
          summary.restoreVisibleCount += 1
        }
        if (
          item.review.rollback.requiresConfirm ||
          item.review.rollback.checks.openReports > 0 ||
          item.review.rollback.checks.automatedSignalActive
        ) {
          summary.activeRiskCount += 1
        }
        if (item.highRisk) {
          summary.highRiskCount += 1
        }
        if (item.criticalRisk) {
          summary.criticalRiskCount += 1
        }
        if (item.review.rollback.falsePositiveEligible) {
          summary.falsePositiveEligibleCount += 1
        }

        return summary
      },
      {
        restoreVisibleCount: 0,
        activeRiskCount: 0,
        highRiskCount: 0,
        criticalRiskCount: 0,
        falsePositiveEligibleCount: 0,
      }
    )

    const sampleRequired =
      riskSummary.criticalRiskCount > 0 ||
      riskSummary.highRiskCount >= 3 ||
      riskSummary.restoreVisibleCount >= ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD ||
      markFalsePositive
    const recommendedSampleSize = sampleRequired
      ? Math.min(
          reviewedItems.length,
          Math.max(
            1,
            Math.min(
              6,
              Math.max(
                riskSummary.criticalRiskCount > 0 ? 3 : 2,
                Math.ceil(reviewedItems.length / 4)
              )
            )
          )
        )
      : 0

    const sampleItems =
      recommendedSampleSize > 0
        ? reviewedItems
            .sort((left, right) => right.riskScore - left.riskScore)
            .slice(0, recommendedSampleSize)
            .map(({ review }) => ({
              contentType: review.content.contentType,
              contentId: review.content.id,
              eventId: review.event.id,
              title: review.content.title || `${review.content.contentType}:${review.content.id}`,
              targetStatus: review.rollback.targetStatus,
              openReports: review.rollback.checks.openReports,
              uniqueReporters: review.rollback.checks.uniqueReporters,
              automatedSeverity: review.rollback.checks.automatedSeverity,
              creatorRiskLevel: review.rollback.checks.creatorRiskLevel,
              requiresConfirm: review.rollback.requiresConfirm,
              warnings: review.rollback.warnings.slice(0, 4),
            }))
        : []

    return {
      required: true,
      reviewStatus: 'draft',
      reviewNote: null,
      reviewRequestedAt: null,
      reviewRequestedBy: null,
      approvalNote: null,
      approvedAt: null,
      approvedBy: null,
      sampleRequired,
      recommendedSampleSize,
      reviewedSampleKeys: [],
      sampleItems,
      riskSummary,
      falsePositiveValidationRequired: markFalsePositive,
      falsePositiveValidated: false,
    }
  }

  private startHeartbeatLoop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      void this.refreshWorkerHeartbeat()
    }, WORKER_HEARTBEAT_MS)
  }

  private async refreshWorkerHeartbeat() {
    if (!this.workerEnabled || mongoose.connection.readyState !== 1) return

    const now = new Date()
    const nextLeaseAt = nowPlusMs(JOB_LEASE_MS)

    await this.upsertWorkerRuntime({
      workerId: this.workerId,
      status: this.stopRequested ? 'stopping' : this.currentJobId ? 'processing' : 'idle',
      processId: process.pid,
      host: os.hostname(),
      startedAt: this.workerStartedAt,
      stoppedAt: null,
      lastHeartbeatAt: now,
      currentJobId: this.currentJobId,
      currentJobType: this.currentJobType,
      currentJobStartedAt: this.currentJobStartedAt,
    })

    if (!this.currentJobId || !mongoose.Types.ObjectId.isValid(this.currentJobId)) {
      return
    }

    await AdminContentJob.updateOne(
      {
        _id: new mongoose.Types.ObjectId(this.currentJobId),
        status: 'running',
        workerId: this.workerId,
      },
      {
        $set: {
          lastHeartbeatAt: now,
          leaseExpiresAt: nextLeaseAt,
        },
      }
    )
  }

  private scheduleWorker() {
    if (!this.workerEnabled || this.workerScheduled || this.workerRunning || this.stopRequested) return
    if (mongoose.connection.readyState !== 1) return

    this.workerScheduled = true
    this.scheduledTimer = setTimeout(() => {
      this.workerScheduled = false
      this.scheduledTimer = null
      void this.processNextJobs()
    }, 0)
  }

  private async requeueStaleRunningJobs() {
    await this.requeueRunningJobs('Job reencaminhado apos execucao interrompida.', {
      onlyStale: true,
    })
  }

  private async requeueRunningJobs(
    message: string,
    options: {
      onlyStale: boolean
    }
  ) {
    if (mongoose.connection.readyState !== 1) return

    const now = new Date()
    const staleBefore = new Date(now.getTime() - JOB_LEASE_MS)
    const query: Record<string, unknown> = {
      status: 'running',
    }

    if (options.onlyStale) {
      query.$or = [
        { leaseExpiresAt: { $lt: now } },
        { leaseExpiresAt: null, startedAt: { $lt: staleBefore } },
      ]
    }

    const jobs = await AdminContentJob.find(query).lean()
    let requeuedJobs = 0
    let failedJobs = 0

    for (const job of jobs) {
      const attemptsUsed = Number(job.attemptCount ?? 0)
      const maxAttempts = Number(job.maxAttempts ?? MAX_JOB_ATTEMPTS)
      const exhaustedRetries = attemptsUsed >= maxAttempts
      const errorMessage = exhaustedRetries
        ? `${message} Limite de retry esgotado.`
        : message

      const update =
        exhaustedRetries
          ? {
              status: 'failed' as const,
              finishedAt: now,
              expiresAt: this.getExpiresAt('failed'),
            }
          : {
              status: 'queued' as const,
              startedAt: null,
              finishedAt: null,
              expiresAt: null,
            }

      const result = await AdminContentJob.updateOne(
        {
          _id: job._id,
          status: 'running',
        },
        {
          $set: {
            ...update,
            error: errorMessage,
            workerId: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: job.lastHeartbeatAt ?? null,
          },
        }
      )

      if (result.modifiedCount > 0) {
        if (exhaustedRetries) {
          failedJobs += 1
        } else {
          requeuedJobs += 1
        }
      }
    }

    if (requeuedJobs > 0 || failedJobs > 0) {
      await this.incrementWorkerStats({
        requeuedJobs,
        failedJobs,
      })
    }
  }

  private async processNextJobs() {
    if (!this.workerEnabled || this.workerRunning || mongoose.connection.readyState !== 1 || this.stopRequested) {
      return
    }

    this.workerRunning = true

    try {
      while (!this.stopRequested) {
        const claimStartedAt = new Date()
        const claimedJob = await AdminContentJob.findOneAndUpdate(
          {
            status: 'queued',
            $or: [
              { type: 'bulk_moderate' },
              {
                type: 'bulk_rollback',
                'approval.required': { $ne: true },
              },
              {
                type: 'bulk_rollback',
                'approval.reviewStatus': 'approved',
              },
            ],
          },
          {
            $set: {
              status: 'running',
              startedAt: claimStartedAt,
              finishedAt: null,
              expiresAt: null,
              error: null,
              workerId: this.workerId,
              leaseExpiresAt: nowPlusMs(JOB_LEASE_MS),
              lastHeartbeatAt: claimStartedAt,
              lastAttemptAt: claimStartedAt,
            },
            $inc: {
              attemptCount: 1,
            },
          },
          {
            new: true,
            sort: { createdAt: 1, _id: 1 },
          }
        )

        if (!claimedJob) break

        await this.incrementWorkerStats({ claimedJobs: 1 })
        await this.setCurrentJobContext({
          id: String(claimedJob._id),
          type: claimedJob.type,
          startedAt: claimedJob.startedAt ?? claimStartedAt,
        })
        await this.executeJob(claimedJob)
      }
    } finally {
      this.workerRunning = false
      if (this.workerEnabled && mongoose.connection.readyState === 1) {
        await this.upsertWorkerRuntime({
          status: this.stopRequested ? 'stopping' : 'idle',
          workerId: this.workerId,
          currentJobId: this.currentJobId,
          currentJobType: this.currentJobType,
          currentJobStartedAt: this.currentJobStartedAt,
        })
      }
    }
  }

  private async executeJob(job: IAdminContentJob) {
    const items = job.items.map((item) => ({
      contentType: item.contentType,
      contentId: item.contentId,
      eventId: item.eventId ?? null,
      status: item.status,
      changed: item.changed,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      error: item.error ?? null,
      statusCode: item.statusCode ?? null,
    }))
    const progress = this.buildProgressFromItems(items, job.progress.requested)
    const jobId = new mongoose.Types.ObjectId(String(job._id))

    try {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]

        if (item.status !== 'pending') {
          continue
        }

        if (this.stopRequested) {
          await this.persistJobState(jobId, {
            items,
            progress,
            status: 'queued',
            startedAt: null,
            finishedAt: null,
            expiresAt: null,
            error: 'Job reencaminhado apos paragem controlada do worker.',
            workerId: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: new Date(),
          })
          await this.incrementWorkerStats({ requeuedJobs: 1 })
          return
        }

        try {
          if (job.type === 'bulk_moderate') {
            const result = await adminContentService.moderateContent({
              actorId: String(job.actor),
              contentType: item.contentType,
              contentId: item.contentId,
              action: job.action ?? 'hide',
              reason: job.reason,
              note: job.note ?? undefined,
              metadata: {
                bulkModeration: true,
                bulkJob: true,
                bulkJobId: String(job._id),
                bulkSize: items.length,
                asyncJob: true,
              },
            })

            item.status = 'success'
            item.changed = result.changed
            item.fromStatus = result.fromStatus
            item.toStatus = result.toStatus
            item.error = null
            item.statusCode = null
            progress.succeeded += 1
            if (result.changed) progress.changed += 1
          } else {
            const result = await adminContentService.rollbackContent({
              actorId: String(job.actor),
              contentType: item.contentType,
              contentId: item.contentId,
              eventId: item.eventId ?? '',
              reason: job.reason,
              note: job.note ?? undefined,
              confirm: job.confirm === true,
              markFalsePositive: job.markFalsePositive === true,
              metadata: {
                bulkRollback: true,
                bulkJob: true,
                bulkJobId: String(job._id),
                bulkSize: items.length,
                asyncJob: true,
              },
            })

            item.status = 'success'
            item.changed = result.changed
            item.fromStatus = result.fromStatus
            item.toStatus = result.toStatus
            item.error = null
            item.statusCode = null
            progress.succeeded += 1
            if (result.changed) progress.changed += 1
          }
        } catch (error: unknown) {
          if (error instanceof AdminContentServiceError) {
            item.status = 'failed'
            item.error = error.message
            item.statusCode = error.statusCode
          } else if (error instanceof Error) {
            item.status = 'failed'
            item.error = error.message
            item.statusCode = 500
          } else {
            item.status = 'failed'
            item.error = 'Erro desconhecido.'
            item.statusCode = 500
          }
          progress.failed += 1
        }

        progress.processed = progress.succeeded + progress.failed
        await this.persistJobState(jobId, {
          items,
          progress,
          status: 'running',
          startedAt: job.startedAt ?? null,
          expiresAt: null,
          workerId: this.workerId,
          leaseExpiresAt: nowPlusMs(JOB_LEASE_MS),
          lastHeartbeatAt: new Date(),
        })
      }

      const finalStatus: AdminContentJobStatus =
        progress.failed === 0
          ? 'completed'
          : progress.succeeded === 0
            ? 'failed'
            : 'completed_with_errors'
      const finishedAt = new Date()
      const finalError =
        finalStatus === 'failed' ? items.find((item) => item.error)?.error ?? null : null

      await this.persistJobState(jobId, {
        items,
        progress,
        status: finalStatus,
        finishedAt,
        startedAt: job.startedAt ?? null,
        expiresAt: this.getExpiresAt(finalStatus),
        error: finalError,
        workerId: null,
        leaseExpiresAt: null,
        lastHeartbeatAt: finishedAt,
      })

      await this.incrementWorkerStats({
        completedJobs: finalStatus === 'completed' ? 1 : 0,
        failedJobs: finalStatus === 'completed' ? 0 : 1,
      })
      await this.upsertWorkerRuntime({
        lastJobFinishedAt: finishedAt,
        lastError: finalStatus === 'completed' ? null : finalError ?? 'Job concluido com falhas.',
        lastErrorAt: finalStatus === 'completed' ? null : finishedAt,
      })
    } catch (error: unknown) {
      const finishedAt = new Date()
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido ao processar job.'

      await this.persistJobState(jobId, {
        items,
        progress,
        status: 'failed',
        finishedAt,
        startedAt: job.startedAt ?? null,
        expiresAt: this.getExpiresAt('failed'),
        error: errorMessage,
        workerId: null,
        leaseExpiresAt: null,
        lastHeartbeatAt: finishedAt,
      })

      await this.incrementWorkerStats({ failedJobs: 1 })
      await this.upsertWorkerRuntime({
        lastJobFinishedAt: finishedAt,
        lastError: errorMessage,
        lastErrorAt: finishedAt,
      })
    } finally {
      await this.clearCurrentJobContext()
    }
  }

  private buildProgressFromItems(items: IAdminContentJob['items'], requested: number) {
    const succeeded = items.filter((item) => item.status === 'success').length
    const failed = items.filter((item) => item.status === 'failed').length
    const changed = items.filter((item) => item.status === 'success' && item.changed === true).length

    return {
      requested,
      processed: succeeded + failed,
      succeeded,
      failed,
      changed,
    }
  }

  private getExpiresAt(status: AdminContentJobStatus): Date | null {
    const now = new Date()

    if (status === 'completed') {
      now.setDate(now.getDate() + COMPLETED_JOB_TTL_DAYS)
      return now
    }

    if (status === 'failed' || status === 'completed_with_errors') {
      now.setDate(now.getDate() + FAILED_JOB_TTL_DAYS)
      return now
    }

    return null
  }

  private async persistJobState(
    jobId: mongoose.Types.ObjectId,
    payload: {
      items: IAdminContentJob['items']
      progress: IAdminContentJob['progress']
      status: AdminContentJobStatus
      startedAt?: Date | null
      finishedAt?: Date | null
      expiresAt?: Date | null
      error?: string | null
      workerId?: string | null
      leaseExpiresAt?: Date | null
      lastHeartbeatAt?: Date | null
    }
  ) {
    await AdminContentJob.updateOne(
      { _id: jobId },
      {
        $set: {
          items: payload.items,
          progress: payload.progress,
          status: payload.status,
          startedAt: payload.startedAt ?? null,
          finishedAt: payload.finishedAt ?? null,
          expiresAt: payload.expiresAt ?? null,
          error: payload.error ?? null,
          workerId: payload.workerId ?? null,
          leaseExpiresAt: payload.leaseExpiresAt ?? null,
          lastHeartbeatAt: payload.lastHeartbeatAt ?? null,
        },
      }
    )
  }

  private async setCurrentJobContext(input: {
    id: string
    type: AdminContentJobType
    startedAt: Date
  }) {
    this.currentJobId = input.id
    this.currentJobType = input.type
    this.currentJobStartedAt = input.startedAt

    await this.upsertWorkerRuntime({
      status: 'processing',
      workerId: this.workerId,
      currentJobId: input.id,
      currentJobType: input.type,
      currentJobStartedAt: input.startedAt,
    })
  }

  private async clearCurrentJobContext() {
    this.clearCurrentJobContextLocally()
    await this.upsertWorkerRuntime({
      status: this.stopRequested ? 'stopping' : 'idle',
      workerId: this.workerId,
      currentJobId: null,
      currentJobType: null,
      currentJobStartedAt: null,
    })
  }

  private clearCurrentJobContextLocally() {
    this.currentJobId = null
    this.currentJobType = null
    this.currentJobStartedAt = null
  }

  private async upsertWorkerRuntime(
    payload: Partial<IAdminWorkerRuntime> & {
      status?: AdminWorkerRuntimeStatus
    }
  ) {
    if (mongoose.connection.readyState !== 1) return

    await AdminWorkerRuntime.findOneAndUpdate(
      { key: WORKER_RUNTIME_KEY },
      {
        $set: {
          ...(payload.workerId !== undefined ? { workerId: payload.workerId } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.processId !== undefined ? { processId: payload.processId } : {}),
          ...(payload.host !== undefined ? { host: payload.host } : {}),
          ...(payload.startedAt !== undefined ? { startedAt: payload.startedAt } : {}),
          ...(payload.stoppedAt !== undefined ? { stoppedAt: payload.stoppedAt } : {}),
          ...(payload.lastHeartbeatAt !== undefined ? { lastHeartbeatAt: payload.lastHeartbeatAt } : {}),
          ...(payload.currentJobId !== undefined ? { currentJobId: payload.currentJobId } : {}),
          ...(payload.currentJobType !== undefined ? { currentJobType: payload.currentJobType } : {}),
          ...(payload.currentJobStartedAt !== undefined
            ? { currentJobStartedAt: payload.currentJobStartedAt }
            : {}),
          ...(payload.lastJobFinishedAt !== undefined
            ? { lastJobFinishedAt: payload.lastJobFinishedAt }
            : {}),
          ...(payload.lastError !== undefined ? { lastError: payload.lastError } : {}),
          ...(payload.lastErrorAt !== undefined ? { lastErrorAt: payload.lastErrorAt } : {}),
        },
        $setOnInsert: {
          key: WORKER_RUNTIME_KEY,
          stats: runtimeStatsDefaults(),
        },
      },
      {
        upsert: true,
      }
    )
  }

  private async incrementWorkerStats(payload: {
    claimedJobs?: number
    completedJobs?: number
    failedJobs?: number
    requeuedJobs?: number
  }) {
    if (mongoose.connection.readyState !== 1) return

    const increments: Record<string, number> = {}
    if (payload.claimedJobs) increments['stats.claimedJobs'] = payload.claimedJobs
    if (payload.completedJobs) increments['stats.completedJobs'] = payload.completedJobs
    if (payload.failedJobs) increments['stats.failedJobs'] = payload.failedJobs
    if (payload.requeuedJobs) increments['stats.requeuedJobs'] = payload.requeuedJobs
    if (Object.keys(increments).length === 0) return

    await AdminWorkerRuntime.findOneAndUpdate(
      { key: WORKER_RUNTIME_KEY },
      {
        $inc: increments,
        $setOnInsert: {
          key: WORKER_RUNTIME_KEY,
          status: 'offline',
          stats: runtimeStatsDefaults(),
        },
      },
      {
        upsert: true,
      }
    )
  }

  private resolveWorkerRuntimeStatus(
    runtime: Partial<IAdminWorkerRuntime> | null,
    now: Date
  ): AdminWorkerRuntimeStatus | 'stale' {
    if (!runtime) return 'offline'
    if (runtime.status === 'offline') return 'offline'

    const lastHeartbeatAt =
      runtime.lastHeartbeatAt instanceof Date
        ? runtime.lastHeartbeatAt
        : runtime.lastHeartbeatAt
          ? new Date(runtime.lastHeartbeatAt)
          : null

    if (!lastHeartbeatAt || lastHeartbeatAt.getTime() < now.getTime() - WORKER_STATUS_STALE_MS) {
      return 'stale'
    }

    return runtime.status ?? 'offline'
  }

  private mapJob(item: any) {
    const actor = item.actor
      ? {
          id: typeof item.actor._id === 'string' ? item.actor._id : String(item.actor._id ?? item.actor),
          name: item.actor.name,
          username: item.actor.username,
          email: item.actor.email,
          role: item.actor.role,
        }
      : null
    const reviewRequestedBy = item.approval?.reviewRequestedBy
      ? {
          id:
            typeof item.approval.reviewRequestedBy._id === 'string'
              ? item.approval.reviewRequestedBy._id
              : String(item.approval.reviewRequestedBy._id ?? item.approval.reviewRequestedBy),
          name: item.approval.reviewRequestedBy.name,
          username: item.approval.reviewRequestedBy.username,
          email: item.approval.reviewRequestedBy.email,
          role: item.approval.reviewRequestedBy.role,
        }
      : null
    const approvedBy = item.approval?.approvedBy
      ? {
          id:
            typeof item.approval.approvedBy._id === 'string'
              ? item.approval.approvedBy._id
              : String(item.approval.approvedBy._id ?? item.approval.approvedBy),
          name: item.approval.approvedBy.name,
          username: item.approval.approvedBy.username,
          email: item.approval.approvedBy.email,
          role: item.approval.approvedBy.role,
        }
      : null

    return {
      id: String(item._id),
      type: item.type as AdminContentJobType,
      status: item.status as AdminContentJobStatus,
      action: item.action ?? null,
      reason: item.reason,
      note: item.note ?? null,
      confirm: item.confirm === true,
      markFalsePositive: item.markFalsePositive === true,
      attemptCount: Number(item.attemptCount ?? 0),
      maxAttempts: Number(item.maxAttempts ?? MAX_JOB_ATTEMPTS),
      workerId: item.workerId ?? null,
      leaseExpiresAt: item.leaseExpiresAt ?? null,
      lastHeartbeatAt: item.lastHeartbeatAt ?? null,
      actor,
      items: Array.isArray(item.items)
        ? item.items.map((jobItem: any) => ({
            contentType: jobItem.contentType,
            contentId: jobItem.contentId,
            eventId: jobItem.eventId ?? null,
            status: jobItem.status,
            changed: typeof jobItem.changed === 'boolean' ? jobItem.changed : undefined,
            fromStatus: jobItem.fromStatus ?? undefined,
            toStatus: jobItem.toStatus ?? undefined,
            error: jobItem.error ?? null,
            statusCode: typeof jobItem.statusCode === 'number' ? jobItem.statusCode : null,
          }))
        : [],
      progress: {
        requested: Number(item.progress?.requested ?? 0),
        processed: Number(item.progress?.processed ?? 0),
        succeeded: Number(item.progress?.succeeded ?? 0),
        failed: Number(item.progress?.failed ?? 0),
        changed: Number(item.progress?.changed ?? 0),
      },
      guardrails: item.guardrails
        ? {
            maxItems: Number(item.guardrails.maxItems ?? ADMIN_CONTENT_BULK_MAX_ITEMS),
            confirmThreshold: Number(
              item.guardrails.confirmThreshold ?? ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD
            ),
            duplicatesSkipped: Number(item.guardrails.duplicatesSkipped ?? 0),
          }
        : null,
      approval:
        item.approval && item.type === 'bulk_rollback'
          ? {
              required: item.approval.required === true,
              reviewStatus: isValidAdminContentJobApprovalStatus(item.approval.reviewStatus)
                ? item.approval.reviewStatus
                : 'draft',
              reviewNote: item.approval.reviewNote ?? null,
              reviewRequestedAt: item.approval.reviewRequestedAt ?? null,
              reviewRequestedBy,
              approvalNote: item.approval.approvalNote ?? null,
              approvedAt: item.approval.approvedAt ?? null,
              approvedBy,
              sampleRequired: item.approval.sampleRequired === true,
              recommendedSampleSize: Number(item.approval.recommendedSampleSize ?? 0),
              reviewedSampleKeys: Array.isArray(item.approval.reviewedSampleKeys)
                ? item.approval.reviewedSampleKeys.filter(
                    (sampleKey: unknown): sampleKey is string => typeof sampleKey === 'string'
                  )
                : [],
              sampleItems: Array.isArray(item.approval.sampleItems)
                ? item.approval.sampleItems.map((sampleItem: any) => ({
                    contentType: sampleItem.contentType,
                    contentId: sampleItem.contentId,
                    eventId: sampleItem.eventId,
                    title: sampleItem.title,
                    targetStatus: sampleItem.targetStatus,
                    openReports: Number(sampleItem.openReports ?? 0),
                    uniqueReporters: Number(sampleItem.uniqueReporters ?? 0),
                    automatedSeverity: sampleItem.automatedSeverity ?? 'none',
                    creatorRiskLevel: sampleItem.creatorRiskLevel ?? null,
                    requiresConfirm: sampleItem.requiresConfirm === true,
                    warnings: Array.isArray(sampleItem.warnings)
                      ? sampleItem.warnings.filter(
                          (warning: unknown): warning is string => typeof warning === 'string'
                        )
                      : [],
                  }))
                : [],
              riskSummary: {
                restoreVisibleCount: Number(item.approval.riskSummary?.restoreVisibleCount ?? 0),
                activeRiskCount: Number(item.approval.riskSummary?.activeRiskCount ?? 0),
                highRiskCount: Number(item.approval.riskSummary?.highRiskCount ?? 0),
                criticalRiskCount: Number(item.approval.riskSummary?.criticalRiskCount ?? 0),
                falsePositiveEligibleCount: Number(
                  item.approval.riskSummary?.falsePositiveEligibleCount ?? 0
                ),
              },
              falsePositiveValidationRequired: item.approval.falsePositiveValidationRequired === true,
              falsePositiveValidated: item.approval.falsePositiveValidated === true,
            }
          : null,
      error: item.error ?? null,
      startedAt: item.startedAt ?? null,
      finishedAt: item.finishedAt ?? null,
      expiresAt: item.expiresAt ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }
}

export const adminContentJobService = new AdminContentJobService()
