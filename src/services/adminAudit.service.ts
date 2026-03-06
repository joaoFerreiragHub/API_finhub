import mongoose from 'mongoose'
import { AdminScope } from '../admin/permissions'
import { AdminAuditLog, AdminAuditOutcome } from '../models/AdminAuditLog'
import { normalizeAdminAuditMetadata } from '../utils/adminAuditMetadata'

export interface RecordAdminAuditInput {
  actorId: string
  actorRole: string
  action: string
  scope?: AdminScope
  resourceType: string
  resourceId?: string
  reason?: string
  requestId?: string
  method: string
  path: string
  statusCode: number
  outcome: AdminAuditOutcome
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export interface AdminAuditFilters {
  actorId?: string
  action?: string
  resourceType?: string
  outcome?: AdminAuditOutcome
  requestId?: string
  from?: Date
  to?: Date
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface AuditExportOptions {
  limit?: number
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50
const DEFAULT_EXPORT_LIMIT = 2000
const MAX_EXPORT_LIMIT = 5000

export class AdminAuditService {
  private buildQuery(filters: AdminAuditFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {}

    if (filters.actorId && mongoose.Types.ObjectId.isValid(filters.actorId)) {
      query.actor = new mongoose.Types.ObjectId(filters.actorId)
    }

    if (filters.action) {
      query.action = filters.action
    }

    if (filters.resourceType) {
      query.resourceType = filters.resourceType
    }

    if (filters.outcome) {
      query.outcome = filters.outcome
    }

    if (filters.requestId) {
      query.requestId = filters.requestId
    }

    if (filters.from || filters.to) {
      const createdAtQuery: Record<string, unknown> = {}
      if (filters.from) createdAtQuery.$gte = filters.from
      if (filters.to) createdAtQuery.$lte = filters.to
      query.createdAt = createdAtQuery
    }

    return query
  }

  async record(input: RecordAdminAuditInput) {
    const metadata = normalizeAdminAuditMetadata(input.metadata)

    return AdminAuditLog.create({
      actor: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      scope: input.scope ?? null,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      reason: input.reason ?? null,
      requestId: input.requestId ?? null,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      outcome: input.outcome,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata,
    })
  }

  async list(filters: AdminAuditFilters = {}, options: PaginationOptions = {}) {
    const page = Math.max(Math.floor(options.page || DEFAULT_PAGE), 1)
    const limit = Math.max(Math.floor(options.limit || DEFAULT_LIMIT), 1)
    const skip = (page - 1) * limit

    const query = this.buildQuery(filters)

    const [items, total] = await Promise.all([
      AdminAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name username email role'),
      AdminAuditLog.countDocuments(query),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async listForExport(filters: AdminAuditFilters = {}, options: AuditExportOptions = {}) {
    const requestedLimit = Math.floor(options.limit || DEFAULT_EXPORT_LIMIT)
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_EXPORT_LIMIT)
    const query = this.buildQuery(filters)

    return AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name username email role')
  }
}

export const adminAuditService = new AdminAuditService()
