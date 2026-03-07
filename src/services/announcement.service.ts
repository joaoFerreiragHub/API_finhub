import mongoose from 'mongoose'
import { Announcement, AnnouncementScope, AnnouncementType } from '../models/Announcement'
import { UserRole } from '../models/User'

export interface CreateAnnouncementDTO {
  title: string
  body?: string
  text?: string
  type?: AnnouncementType
  scope?: AnnouncementScope
  imageUrl?: string
  isVisible?: boolean
  expiresAt?: Date | string | null
  publishedAt?: Date | string
}

export interface UpdateAnnouncementDTO {
  title?: string
  body?: string
  text?: string
  type?: AnnouncementType
  scope?: AnnouncementScope
  imageUrl?: string
  isVisible?: boolean
  expiresAt?: Date | string | null
  publishedAt?: Date | string
}

export interface AnnouncementFilters {
  creator?: string
  scope?: AnnouncementScope
  type?: AnnouncementType
  isVisible?: boolean
  search?: string
  includeExpired?: boolean
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
}

interface AnnouncementListQuery {
  creator?: mongoose.Types.ObjectId
  scope?: AnnouncementScope
  type?: AnnouncementType
  isVisible?: boolean
  $and?: Array<Record<string, unknown>>
}

const parseDateInput = (value: unknown): Date | null | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === '') {
    return null
  }

  const parsed = value instanceof Date ? value : new Date(String(value))

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data invalida')
  }

  return parsed
}

const normalizeBody = (payload: { body?: string; text?: string }) => {
  return String(payload.body ?? payload.text ?? '').trim()
}

const normalizeImageUrl = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const getActiveWindowClause = (now: Date) => ({
  $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
})

const isExpiredAt = (value: unknown, now: Date) => {
  if (!value) {
    return false
  }

  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return false
  }

  return date <= now
}

const toAnnouncementResponse = (input: unknown) => {
  const announcement =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : ({} as Record<string, unknown>)

  const creator = announcement.creator
  let creatorId = ''

  if (creator instanceof mongoose.Types.ObjectId) {
    creatorId = creator.toString()
  } else if (typeof creator === 'string') {
    creatorId = creator
  } else if (creator && typeof creator === 'object') {
    const creatorRecord = creator as Record<string, unknown>
    if (creatorRecord._id instanceof mongoose.Types.ObjectId) {
      creatorId = creatorRecord._id.toString()
    } else if (typeof creatorRecord._id === 'string') {
      creatorId = creatorRecord._id
    } else if (typeof creatorRecord.id === 'string') {
      creatorId = creatorRecord.id
    }
  }

  const body = typeof announcement.body === 'string' ? announcement.body : ''
  const idValue = announcement._id ?? announcement.id ?? ''
  const id = typeof idValue === 'string' ? idValue : String(idValue)

  return {
    ...announcement,
    id,
    creatorId,
    text: body,
  }
}

export class AnnouncementService {
  async list(filters: AnnouncementFilters = {}, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const query: AnnouncementListQuery = {}

    if (filters.creator && mongoose.Types.ObjectId.isValid(filters.creator)) {
      query.creator = new mongoose.Types.ObjectId(filters.creator)
    }

    if (filters.scope) {
      query.scope = filters.scope
    }

    if (filters.type) {
      query.type = filters.type
    }

    query.isVisible = filters.isVisible !== undefined ? filters.isVisible : true

    const andClauses: Array<Record<string, unknown>> = []
    if (!filters.includeExpired) {
      andClauses.push(getActiveWindowClause(new Date()))
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = filters.search.trim()
      andClauses.push({
        $or: [
          { title: { $regex: term, $options: 'i' } },
          { body: { $regex: term, $options: 'i' } },
        ],
      })
    }

    if (andClauses.length > 0) {
      query.$and = andClauses
    }

    let sort: Record<string, 1 | -1> = { publishedAt: -1, createdAt: -1 }
    if (options.sort === 'oldest') {
      sort = { publishedAt: 1, createdAt: 1 }
    } else if (options.sort === 'title') {
      sort = { title: 1 }
    }

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Announcement.countDocuments(query),
    ])

    return {
      announcements: announcements.map((announcement) => toAnnouncementResponse(announcement)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getById(id: string) {
    const announcement = await Announcement.findOne({
      _id: id,
      isVisible: true,
      $and: [getActiveWindowClause(new Date())],
    })
      .populate('creator', 'name username avatar bio')
      .lean()

    if (!announcement) {
      throw new Error('Announcement nao encontrado')
    }

    return toAnnouncementResponse(announcement)
  }

  async create(creatorId: string, role: UserRole, data: CreateAnnouncementDTO) {
    const title = String(data.title ?? '').trim()
    if (!title) {
      throw new Error('Campo obrigatorio: title')
    }

    const body = normalizeBody(data)
    if (!body) {
      throw new Error('Campo obrigatorio: body ou text')
    }

    const publishedAt = parseDateInput(data.publishedAt) || new Date()
    const expiresAt = parseDateInput(data.expiresAt)

    if (expiresAt && expiresAt <= publishedAt) {
      throw new Error('expiresAt deve ser posterior a publishedAt')
    }

    const scope: AnnouncementScope =
      role === 'admin' && data.scope === 'platform' ? 'platform' : 'creator'

    const announcement = await Announcement.create({
      title,
      body,
      creator: creatorId,
      type: data.type || 'inline',
      scope,
      imageUrl: normalizeImageUrl(data.imageUrl) ?? null,
      isVisible: data.isVisible !== undefined ? data.isVisible : true,
      expiresAt: expiresAt ?? null,
      publishedAt,
    })

    return toAnnouncementResponse(announcement.toObject())
  }

  async update(id: string, actorId: string, role: UserRole, data: UpdateAnnouncementDTO) {
    const announcement = await Announcement.findById(id)

    if (!announcement) {
      throw new Error('Announcement nao encontrado')
    }

    const isAdmin = role === 'admin'
    if (!isAdmin && announcement.creator.toString() !== actorId) {
      throw new Error('Nao tens permissao para editar este announcement')
    }

    if (data.title !== undefined) {
      const title = String(data.title).trim()
      if (!title) {
        throw new Error('Campo title invalido')
      }
      announcement.title = title
    }

    if (data.body !== undefined || data.text !== undefined) {
      const body = normalizeBody(data)
      if (!body) {
        throw new Error('Campo body/text invalido')
      }
      announcement.body = body
    }

    if (data.type !== undefined) {
      announcement.type = data.type
    }

    if (data.scope !== undefined) {
      if (!isAdmin) {
        throw new Error('Apenas admin pode alterar o scope')
      }
      announcement.scope = data.scope
    }

    if (data.imageUrl !== undefined) {
      announcement.imageUrl = normalizeImageUrl(data.imageUrl) ?? null
    }

    if (data.isVisible !== undefined) {
      announcement.isVisible = data.isVisible
    }

    if (data.publishedAt !== undefined) {
      announcement.publishedAt = parseDateInput(data.publishedAt) || new Date()
    }

    if (data.expiresAt !== undefined) {
      announcement.expiresAt = parseDateInput(data.expiresAt) ?? null
    }

    if (announcement.expiresAt && announcement.expiresAt <= announcement.publishedAt) {
      throw new Error('expiresAt deve ser posterior a publishedAt')
    }

    await announcement.save()

    return toAnnouncementResponse(announcement.toObject())
  }

  async delete(id: string, actorId: string, isAdmin = false) {
    const announcement = await Announcement.findById(id)

    if (!announcement) {
      throw new Error('Announcement nao encontrado')
    }

    if (!isAdmin && announcement.creator.toString() !== actorId) {
      throw new Error('Nao tens permissao para eliminar este announcement')
    }

    await announcement.deleteOne()

    return { message: 'Announcement eliminado com sucesso' }
  }

  async getMyAnnouncements(creatorId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    let sort: Record<string, 1 | -1> = { createdAt: -1 }
    if (options.sort === 'title') {
      sort = { title: 1 }
    } else if (options.sort === 'oldest') {
      sort = { createdAt: 1 }
    }

    const query = { creator: creatorId }

    const [announcements, total] = await Promise.all([
      Announcement.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Announcement.countDocuments(query),
    ])

    return {
      announcements: announcements.map((announcement) => toAnnouncementResponse(announcement)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getStats(creatorId: string) {
    const announcements = await Announcement.find({ creator: creatorId }).lean()
    const now = new Date()

    const expiredCount = announcements.filter((item) => isExpiredAt(item.expiresAt, now)).length

    return {
      total: announcements.length,
      visibleCount: announcements.filter((item) => item.isVisible).length,
      hiddenCount: announcements.filter((item) => !item.isVisible).length,
      inlineCount: announcements.filter((item) => item.type === 'inline').length,
      popupCount: announcements.filter((item) => item.type === 'popup').length,
      creatorScopeCount: announcements.filter((item) => item.scope === 'creator').length,
      platformScopeCount: announcements.filter((item) => item.scope === 'platform').length,
      activeCount: announcements.length - expiredCount,
      expiredCount,
    }
  }
}

export const announcementService = new AnnouncementService()
