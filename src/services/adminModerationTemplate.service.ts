import mongoose from 'mongoose'
import {
  AdminModerationTemplate,
  AdminModerationTemplateHistoryChangeType,
  IAdminModerationTemplate,
} from '../models/AdminModerationTemplate'
import { resolvePagination } from '../utils/pagination'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const CODE_PATTERN = /^[a-z0-9_.-]{3,64}$/

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const normalizeCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string') continue
    const normalized = item
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48)

    if (normalized.length > 0) {
      unique.add(normalized)
    }
  }

  return Array.from(unique).slice(0, 15)
}

const buildSnapshot = (template: {
  label: string
  reason: string
  defaultNote?: string | null
  tags: string[]
  active: boolean
  requiresNote: boolean
  requiresDoubleConfirm: boolean
}) => ({
  label: template.label,
  reason: template.reason,
  defaultNote: template.defaultNote ?? null,
  tags: template.tags,
  active: template.active,
  requiresNote: template.requiresNote,
  requiresDoubleConfirm: template.requiresDoubleConfirm,
})

const mapActor = (
  value: unknown
): { id: string; name?: string; username?: string; email?: string; role?: string } | null => {
  if (!value || typeof value !== 'object') return null
  const actor = value as {
    _id?: unknown
    id?: unknown
    name?: unknown
    username?: unknown
    email?: unknown
    role?: unknown
  }

  const idRaw =
    typeof actor._id === 'string'
      ? actor._id
      : actor._id instanceof mongoose.Types.ObjectId
        ? String(actor._id)
        : typeof actor.id === 'string'
          ? actor.id
          : null
  if (!idRaw) return null

  return {
    id: idRaw,
    name: typeof actor.name === 'string' ? actor.name : undefined,
    username: typeof actor.username === 'string' ? actor.username : undefined,
    email: typeof actor.email === 'string' ? actor.email : undefined,
    role: typeof actor.role === 'string' ? actor.role : undefined,
  }
}

export class AdminModerationTemplateServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export interface ListAdminModerationTemplatesFilters {
  active?: boolean
  tag?: string
  search?: string
}

export interface CreateAdminModerationTemplateInput {
  actorId: string
  code: string
  label: string
  reason: string
  defaultNote?: string
  tags?: string[]
  active?: boolean
  requiresNote?: boolean
  requiresDoubleConfirm?: boolean
  changeReason?: string
}

export interface UpdateAdminModerationTemplateInput {
  actorId: string
  templateId: string
  label?: string
  reason?: string
  defaultNote?: string
  tags?: string[]
  active?: boolean
  requiresNote?: boolean
  requiresDoubleConfirm?: boolean
  changeReason?: string
}

export interface SetAdminModerationTemplateStatusInput {
  actorId: string
  templateId: string
  active: boolean
  changeReason?: string
}

export class AdminModerationTemplateService {
  async listTemplates(
    filters: ListAdminModerationTemplatesFilters = {},
    options: { page?: number; limit?: number } = {}
  ) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (typeof filters.active === 'boolean') {
      query.active = filters.active
    }

    const tag = toStringOrNull(filters.tag)
    if (tag) {
      query.tags = normalizeTags([tag])[0]
    }

    const search = toStringOrNull(filters.search)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [{ code: { $regex: escaped, $options: 'i' } }, { label: { $regex: escaped, $options: 'i' } }]
    }

    const [rows, total] = await Promise.all([
      AdminModerationTemplate.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name username email role')
        .populate('updatedBy', 'name username email role')
        .lean(),
      AdminModerationTemplate.countDocuments(query),
    ])

    return {
      items: rows.map((row) => this.mapTemplate(row as any)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getTemplate(templateId: string) {
    const template = await this.findTemplateById(templateId)
    return this.mapTemplate(template.toObject())
  }

  async createTemplate(input: CreateAdminModerationTemplateInput) {
    this.assertActor(input.actorId)

    const codeRaw = toStringOrNull(input.code)
    const label = toStringOrNull(input.label)
    const reason = toStringOrNull(input.reason)
    const changeReason = toStringOrNull(input.changeReason) ?? 'template_created'
    if (!codeRaw || !label || !reason) {
      throw new AdminModerationTemplateServiceError(400, 'Campos obrigatorios: code, label, reason.')
    }

    const code = normalizeCode(codeRaw)
    if (!CODE_PATTERN.test(code)) {
      throw new AdminModerationTemplateServiceError(
        400,
        'Campo code invalido. Usa 3-64 chars com [a-z0-9_.-].'
      )
    }

    const exists = await AdminModerationTemplate.exists({ code })
    if (exists) {
      throw new AdminModerationTemplateServiceError(409, 'Ja existe um template com esse code.')
    }

    const defaultNote = toStringOrNull(input.defaultNote)
    const tags = normalizeTags(input.tags)
    const active = typeof input.active === 'boolean' ? input.active : true
    const requiresNote = input.requiresNote === true
    const requiresDoubleConfirm = input.requiresDoubleConfirm === true
    const actorObjectId = new mongoose.Types.ObjectId(input.actorId)

    const template = await AdminModerationTemplate.create({
      code,
      label,
      reason,
      defaultNote,
      tags,
      active,
      requiresNote,
      requiresDoubleConfirm,
      version: 1,
      createdBy: actorObjectId,
      updatedBy: actorObjectId,
      history: [
        {
          version: 1,
          changeType: 'created',
          changedAt: new Date(),
          changedBy: actorObjectId,
          changeReason,
          snapshot: buildSnapshot({
            label,
            reason,
            defaultNote,
            tags,
            active,
            requiresNote,
            requiresDoubleConfirm,
          }),
        },
      ],
    })

    return this.mapTemplate(template.toObject())
  }

  async updateTemplate(input: UpdateAdminModerationTemplateInput) {
    this.assertActor(input.actorId)
    const template = await this.findTemplateById(input.templateId)
    const previousActive = template.active

    const nextLabel = input.label !== undefined ? toStringOrNull(input.label) : template.label
    const nextReason = input.reason !== undefined ? toStringOrNull(input.reason) : template.reason
    const nextDefaultNote =
      input.defaultNote !== undefined ? toStringOrNull(input.defaultNote) : template.defaultNote ?? null
    const nextTags = input.tags !== undefined ? normalizeTags(input.tags) : template.tags
    const nextActive = typeof input.active === 'boolean' ? input.active : template.active
    const nextRequiresNote =
      typeof input.requiresNote === 'boolean' ? input.requiresNote : template.requiresNote
    const nextRequiresDoubleConfirm =
      typeof input.requiresDoubleConfirm === 'boolean'
        ? input.requiresDoubleConfirm
        : template.requiresDoubleConfirm

    if (!nextLabel || !nextReason) {
      throw new AdminModerationTemplateServiceError(400, 'Campos label/reason invalidos.')
    }

    const hasChanges =
      nextLabel !== template.label ||
      nextReason !== template.reason ||
      (nextDefaultNote ?? null) !== (template.defaultNote ?? null) ||
      JSON.stringify(nextTags) !== JSON.stringify(template.tags) ||
      nextActive !== template.active ||
      nextRequiresNote !== template.requiresNote ||
      nextRequiresDoubleConfirm !== template.requiresDoubleConfirm

    if (!hasChanges) {
      throw new AdminModerationTemplateServiceError(400, 'Sem alteracoes para aplicar no template.')
    }

    template.label = nextLabel
    template.reason = nextReason
    template.defaultNote = nextDefaultNote
    template.tags = nextTags
    template.active = nextActive
    template.requiresNote = nextRequiresNote
    template.requiresDoubleConfirm = nextRequiresDoubleConfirm
    template.version += 1
    template.updatedBy = new mongoose.Types.ObjectId(input.actorId)

    const changeReason = toStringOrNull(input.changeReason) ?? 'template_updated'
    const changeType: AdminModerationTemplateHistoryChangeType =
      nextActive !== previousActive ? 'status_change' : 'updated'

    template.history.push({
      version: template.version,
      changeType,
      changedAt: new Date(),
      changedBy: new mongoose.Types.ObjectId(input.actorId),
      changeReason,
      snapshot: buildSnapshot({
        label: template.label,
        reason: template.reason,
        defaultNote: template.defaultNote,
        tags: template.tags,
        active: template.active,
        requiresNote: template.requiresNote,
        requiresDoubleConfirm: template.requiresDoubleConfirm,
      }),
    })

    await template.save()
    await template.populate('createdBy', 'name username email role')
    await template.populate('updatedBy', 'name username email role')

    return this.mapTemplate(template.toObject())
  }

  async setTemplateStatus(input: SetAdminModerationTemplateStatusInput) {
    return this.updateTemplate({
      actorId: input.actorId,
      templateId: input.templateId,
      active: input.active,
      changeReason: input.changeReason ?? (input.active ? 'template_activated' : 'template_deactivated'),
    })
  }

  private assertActor(actorId: string) {
    if (!mongoose.Types.ObjectId.isValid(actorId)) {
      throw new AdminModerationTemplateServiceError(400, 'actorId invalido.')
    }
  }

  private async findTemplateById(templateIdRaw: string): Promise<IAdminModerationTemplate> {
    if (!mongoose.Types.ObjectId.isValid(templateIdRaw)) {
      throw new AdminModerationTemplateServiceError(400, 'templateId invalido.')
    }

    const template = await AdminModerationTemplate.findById(templateIdRaw)
      .populate('createdBy', 'name username email role')
      .populate('updatedBy', 'name username email role')

    if (!template) {
      throw new AdminModerationTemplateServiceError(404, 'Template de moderacao nao encontrado.')
    }

    return template
  }

  private mapTemplate(template: {
    _id?: unknown
    code?: unknown
    label?: unknown
    reason?: unknown
    defaultNote?: unknown
    tags?: unknown
    active?: unknown
    requiresNote?: unknown
    requiresDoubleConfirm?: unknown
    version?: unknown
    createdBy?: unknown
    updatedBy?: unknown
    history?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }) {
    const historyRows = Array.isArray(template.history) ? template.history : []

    return {
      id:
        template._id instanceof mongoose.Types.ObjectId
          ? String(template._id)
          : typeof template._id === 'string'
            ? template._id
            : null,
      code: typeof template.code === 'string' ? template.code : '',
      label: typeof template.label === 'string' ? template.label : '',
      reason: typeof template.reason === 'string' ? template.reason : '',
      defaultNote: typeof template.defaultNote === 'string' ? template.defaultNote : null,
      tags: Array.isArray(template.tags) ? template.tags.filter((item): item is string => typeof item === 'string') : [],
      active: template.active === true,
      requiresNote: template.requiresNote === true,
      requiresDoubleConfirm: template.requiresDoubleConfirm === true,
      version: typeof template.version === 'number' ? template.version : 1,
      createdBy: mapActor(template.createdBy),
      updatedBy: mapActor(template.updatedBy),
      historyCount: historyRows.length,
      lastHistoryEntry:
        historyRows.length > 0 && typeof historyRows[historyRows.length - 1] === 'object'
          ? historyRows[historyRows.length - 1]
          : null,
      createdAt: template.createdAt instanceof Date ? template.createdAt.toISOString() : null,
      updatedAt: template.updatedAt instanceof Date ? template.updatedAt.toISOString() : null,
    }
  }
}

export const adminModerationTemplateService = new AdminModerationTemplateService()
