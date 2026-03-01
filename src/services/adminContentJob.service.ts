import mongoose from 'mongoose'
import {
  AdminContentJob,
  AdminContentJobStatus,
  AdminContentJobType,
  IAdminContentJob,
} from '../models/AdminContentJob'
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

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const STALE_RUNNING_MS = 10 * 60 * 1000
const COMPLETED_JOB_TTL_DAYS = 90
const FAILED_JOB_TTL_DAYS = 180
const WORKER_STOP_POLL_MS = 100

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

export const isValidAdminContentJobType = (value: unknown): value is AdminContentJobType =>
  value === 'bulk_moderate' || value === 'bulk_rollback'

export const isValidAdminContentJobStatus = (value: unknown): value is AdminContentJobStatus =>
  value === 'queued' ||
  value === 'running' ||
  value === 'completed' ||
  value === 'completed_with_errors' ||
  value === 'failed'

class AdminContentJobService {
  private workerScheduled = false
  private workerRunning = false
  private stopRequested = false
  private scheduledTimer: NodeJS.Timeout | null = null

  startWorker() {
    this.stopRequested = false
    void this.requeueStaleRunningJobs().finally(() => {
      this.scheduleWorker()
    })
  }

  async stopWorker(timeoutMs = 15_000) {
    this.stopRequested = true

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

    if (this.workerRunning) {
      await this.requeueRunningJobs('Job reencaminhado apos paragem controlada do worker.')
      return false
    }

    return true
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

    if (uniqueItems.length >= ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD && input.confirm !== true) {
      throw new AdminContentServiceError(
        400,
        `Lotes com ${ADMIN_CONTENT_BULK_CONFIRM_THRESHOLD} ou mais itens exigem confirm=true.`
      )
    }

    const job = await AdminContentJob.create({
      type: 'bulk_rollback',
      status: 'queued',
      actor: actorId,
      reason: input.reason.trim(),
      note: input.note?.trim() ? input.note.trim() : null,
      confirm: input.confirm === true,
      markFalsePositive: input.markFalsePositive === true,
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

    const job = await AdminContentJob.findById(jobId).populate('actor', 'name username email role').lean()

    if (!job) {
      throw new AdminContentServiceError(404, 'Job de moderacao nao encontrado.')
    }

    return this.mapJob(job as any)
  }

  private scheduleWorker() {
    if (this.workerScheduled || this.workerRunning || this.stopRequested) return
    if (mongoose.connection.readyState !== 1) return

    this.workerScheduled = true
    this.scheduledTimer = setTimeout(() => {
      this.workerScheduled = false
      this.scheduledTimer = null
      void this.processNextJobs()
    }, 0)
  }

  private async requeueStaleRunningJobs() {
    await this.requeueRunningJobs('Job reencaminhado apos execucao interrompida.')
  }

  private async requeueRunningJobs(message: string) {
    if (mongoose.connection.readyState !== 1) return

    const staleBefore = new Date(Date.now() - STALE_RUNNING_MS)
    const query: Record<string, unknown> = {
      status: 'running',
    }

    if (!this.stopRequested) {
      query.startedAt = { $lt: staleBefore }
    }

    await AdminContentJob.updateMany(query, {
      $set: {
        status: 'queued',
        startedAt: null,
        finishedAt: null,
        expiresAt: null,
        error: message,
      },
    })
  }

  private async processNextJobs() {
    if (this.workerRunning || mongoose.connection.readyState !== 1 || this.stopRequested) return
    this.workerRunning = true

    try {
      while (!this.stopRequested) {
        const job = await AdminContentJob.findOneAndUpdate(
          { status: 'queued' },
          {
            $set: {
              status: 'running',
              startedAt: new Date(),
              finishedAt: null,
              expiresAt: null,
              error: null,
            },
          },
          {
            new: true,
            sort: { createdAt: 1, _id: 1 },
          }
        )

        if (!job) break
        await this.executeJob(job)
      }
    } finally {
      this.workerRunning = false
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

    try {
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]

        if (item.status !== 'pending') {
          continue
        }

        if (this.stopRequested) {
          await this.persistJobState(new mongoose.Types.ObjectId(String(job._id)), {
            items,
            progress,
            status: 'queued',
            startedAt: null,
            finishedAt: null,
            expiresAt: null,
            error: 'Job reencaminhado apos paragem controlada do worker.',
          })
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
        await this.persistJobState(new mongoose.Types.ObjectId(String(job._id)), {
          items,
          progress,
          status: 'running',
          startedAt: job.startedAt ?? null,
          expiresAt: null,
        })
      }

      const finalStatus: AdminContentJobStatus =
        progress.failed === 0
          ? 'completed'
          : progress.succeeded === 0
            ? 'failed'
            : 'completed_with_errors'

      await this.persistJobState(new mongoose.Types.ObjectId(String(job._id)), {
        items,
        progress,
        status: finalStatus,
        finishedAt: new Date(),
        startedAt: job.startedAt ?? null,
        expiresAt: this.getExpiresAt(finalStatus),
        error: finalStatus === 'failed' ? items.find((item) => item.error)?.error ?? null : null,
      })
    } catch (error: unknown) {
      await this.persistJobState(new mongoose.Types.ObjectId(String(job._id)), {
        items,
        progress,
        status: 'failed',
        finishedAt: new Date(),
        startedAt: job.startedAt ?? null,
        expiresAt: this.getExpiresAt('failed'),
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar job.',
      })
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
        },
      }
    )
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

    return {
      id: String(item._id),
      type: item.type as AdminContentJobType,
      status: item.status as AdminContentJobStatus,
      action: item.action ?? null,
      reason: item.reason,
      note: item.note ?? null,
      confirm: item.confirm === true,
      markFalsePositive: item.markFalsePositive === true,
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
