import mongoose from 'mongoose'
import { AssistedSessionAuditLog, AssistedSessionAuditOutcome } from '../models/AssistedSessionAuditLog'

export interface RecordAssistedSessionAuditInput {
  sessionId: string
  adminUserId: string
  targetUserId: string
  method: string
  path: string
  statusCode: number
  outcome: AssistedSessionAuditOutcome
  requestId?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export interface AssistedSessionAuditFilters {
  sessionId?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

const normalizePage = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_PAGE
  return Math.floor(value)
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

export class AssistedSessionAuditService {
  async record(input: RecordAssistedSessionAuditInput) {
    return AssistedSessionAuditLog.create({
      session: input.sessionId,
      adminUser: input.adminUserId,
      targetUser: input.targetUserId,
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      outcome: input.outcome,
      requestId: input.requestId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? null,
    })
  }

  async list(filters: AssistedSessionAuditFilters = {}, options: PaginationOptions = {}) {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}
    if (filters.sessionId && mongoose.Types.ObjectId.isValid(filters.sessionId)) {
      query.session = new mongoose.Types.ObjectId(filters.sessionId)
    }

    const [items, total] = await Promise.all([
      AssistedSessionAuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AssistedSessionAuditLog.countDocuments(query),
    ])

    return {
      items: items.map((item) => ({
        id: String(item._id),
        session: String(item.session),
        adminUser: String(item.adminUser),
        targetUser: String(item.targetUser),
        method: item.method,
        path: item.path,
        statusCode: item.statusCode,
        outcome: item.outcome,
        requestId: item.requestId ?? null,
        ip: item.ip ?? null,
        userAgent: item.userAgent ?? null,
        metadata: item.metadata ?? null,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }
}

export const assistedSessionAuditService = new AssistedSessionAuditService()
