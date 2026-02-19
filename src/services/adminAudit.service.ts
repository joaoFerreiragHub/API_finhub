import mongoose from 'mongoose'
import { AdminScope } from '../admin/permissions'
import { AdminAuditLog, AdminAuditOutcome } from '../models/AdminAuditLog'

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
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export class AdminAuditService {
  async record(input: RecordAdminAuditInput) {
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
      metadata: input.metadata ?? null,
    })
  }

  async list(filters: AdminAuditFilters = {}, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 50
    const skip = (page - 1) * limit

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
}

export const adminAuditService = new AdminAuditService()
