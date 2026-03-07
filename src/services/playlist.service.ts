import mongoose from 'mongoose'
import { Playlist, PlaylistPlatform, PlaylistStatus, PlaylistType } from '../models/Playlist'

export interface PlaylistItemInput {
  url: string
  title?: string
  duration?: number
  thumbnailUrl?: string
  order?: number
  platform?: PlaylistPlatform
}

export interface CreatePlaylistDTO {
  name: string
  description?: string
  type?: PlaylistType
  topic?: string
  items?: PlaylistItemInput[]
  isPublic?: boolean
  isMain?: boolean
  coverImage?: string
  status?: PlaylistStatus
}

export interface UpdatePlaylistDTO {
  name?: string
  description?: string
  type?: PlaylistType
  topic?: string
  items?: PlaylistItemInput[]
  isPublic?: boolean
  isMain?: boolean
  coverImage?: string
  status?: PlaylistStatus
}

export interface PlaylistFilters {
  creator?: string
  type?: PlaylistType
  topic?: string
  isMain?: boolean
  status?: PlaylistStatus
  isPublic?: boolean
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
}

interface PublicPlaylistListQuery {
  status?: PlaylistStatus
  isPublic?: boolean
  creator?: mongoose.Types.ObjectId
  type?: PlaylistType
  topic?: string
  isMain?: boolean
  $or?: Array<Record<string, { $regex: string; $options: string }>>
}

const normalizeItems = (items: PlaylistItemInput[] = []) =>
  items
    .filter((item) => typeof item.url === 'string' && item.url.trim().length > 0)
    .map((item, index) => ({
      url: item.url.trim(),
      title: item.title?.trim() || undefined,
      duration: typeof item.duration === 'number' ? Math.max(0, Math.round(item.duration)) : undefined,
      thumbnailUrl: item.thumbnailUrl?.trim() || undefined,
      order: index + 1,
      platform: item.platform || 'youtube',
    }))

const toLegacyPlaylistShape = (input: unknown) => {
  const playlist = (input ?? {}) as Record<string, unknown>
  const items = Array.isArray(playlist.items)
    ? (playlist.items as Array<Record<string, unknown>>)
    : []

  return {
    ...playlist,
    playlistName: playlist.name,
    videoLinks: items
      .map((item) => (typeof item.url === 'string' ? item.url : null))
      .filter((url): url is string => url !== null),
    isSelected: Boolean(playlist.isMain),
    viewsCount: typeof playlist.views === 'number' ? playlist.views : 0,
    videos: items,
  }
}

export class PlaylistService {
  async list(filters: PlaylistFilters = {}, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const query: PublicPlaylistListQuery = {
      status: filters.status || 'active',
      isPublic: filters.isPublic !== undefined ? filters.isPublic : true,
    }

    if (filters.creator && mongoose.Types.ObjectId.isValid(filters.creator)) {
      query.creator = new mongoose.Types.ObjectId(filters.creator)
    }

    if (filters.type) {
      query.type = filters.type
    }

    if (filters.topic) {
      query.topic = filters.topic
    }

    if (typeof filters.isMain === 'boolean') {
      query.isMain = filters.isMain
    }

    if (filters.search && filters.search.trim().length > 0) {
      query.$or = [
        { name: { $regex: filters.search.trim(), $options: 'i' } },
        { description: { $regex: filters.search.trim(), $options: 'i' } },
        { topic: { $regex: filters.search.trim(), $options: 'i' } },
      ]
    }

    let sort: Record<string, 1 | -1> = { createdAt: -1 }
    if (options.sort === 'popular') {
      sort = { views: -1, createdAt: -1 }
    } else if (options.sort === 'title') {
      sort = { name: 1 }
    }

    const [playlists, total] = await Promise.all([
      Playlist.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Playlist.countDocuments(query),
    ])

    return {
      playlists: playlists.map((playlist) => toLegacyPlaylistShape(playlist)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getBySlug(slug: string) {
    const playlist = await Playlist.findOne({
      slug,
      status: 'active',
      isPublic: true,
    })
      .populate('creator', 'name username avatar bio')
      .lean()

    if (!playlist) {
      throw new Error('Playlist nao encontrada')
    }

    return toLegacyPlaylistShape(playlist)
  }

  async getById(id: string) {
    const playlist = await Playlist.findOne({
      _id: id,
      status: 'active',
      isPublic: true,
    })
      .populate('creator', 'name username avatar bio')
      .lean()

    if (!playlist) {
      throw new Error('Playlist nao encontrada')
    }

    return toLegacyPlaylistShape(playlist)
  }

  async create(creatorId: string, data: CreatePlaylistDTO) {
    if (data.isMain) {
      await Playlist.updateMany({ creator: creatorId, isMain: true }, { isMain: false })
    }

    const playlist = await Playlist.create({
      ...data,
      creator: creatorId,
      items: normalizeItems(data.items),
      status: data.status || 'active',
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      isMain: Boolean(data.isMain),
      type: data.type || 'regular',
    })

    return toLegacyPlaylistShape(playlist.toObject())
  }

  async update(id: string, creatorId: string, data: UpdatePlaylistDTO) {
    const playlist = await Playlist.findById(id)

    if (!playlist) {
      throw new Error('Playlist nao encontrada')
    }

    if (playlist.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar esta playlist')
    }

    if (data.isMain) {
      await Playlist.updateMany({ creator: creatorId, isMain: true, _id: { $ne: id } }, { isMain: false })
    }

    if (data.name !== undefined) playlist.name = data.name
    if (data.description !== undefined) playlist.description = data.description
    if (data.type !== undefined) playlist.type = data.type
    if (data.topic !== undefined) playlist.topic = data.topic
    if (data.coverImage !== undefined) playlist.coverImage = data.coverImage
    if (data.status !== undefined) playlist.status = data.status
    if (data.isPublic !== undefined) playlist.isPublic = data.isPublic
    if (data.isMain !== undefined) playlist.isMain = data.isMain
    if (data.items !== undefined) {
      ;(playlist.items as unknown) = normalizeItems(data.items)
    }

    await playlist.save()

    return toLegacyPlaylistShape(playlist.toObject())
  }

  async delete(id: string, creatorId: string, isAdmin = false) {
    const playlist = await Playlist.findById(id)

    if (!playlist) {
      throw new Error('Playlist nao encontrada')
    }

    if (!isAdmin && playlist.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar esta playlist')
    }

    await playlist.deleteOne()

    return { message: 'Playlist eliminada com sucesso' }
  }

  async getMyPlaylists(creatorId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    let sort: Record<string, 1 | -1> = { createdAt: -1 }
    if (options.sort === 'title') {
      sort = { name: 1 }
    } else if (options.sort === 'popular') {
      sort = { views: -1, createdAt: -1 }
    }

    const query = { creator: creatorId }

    const [playlists, total] = await Promise.all([
      Playlist.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Playlist.countDocuments(query),
    ])

    return {
      playlists: playlists.map((playlist) => toLegacyPlaylistShape(playlist)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getStats(creatorId: string) {
    const playlists = await Playlist.find({ creator: creatorId }).lean()

    const totalVideos = playlists.reduce((sum, playlist) => {
      const itemsCount = Array.isArray(playlist.items) ? playlist.items.length : 0
      return sum + itemsCount
    }, 0)

    return {
      total: playlists.length,
      active: playlists.filter((item) => item.status === 'active').length,
      archived: playlists.filter((item) => item.status === 'archived').length,
      publicCount: playlists.filter((item) => item.isPublic).length,
      mainCount: playlists.filter((item) => item.isMain).length,
      totalViews: playlists.reduce((sum, item) => sum + (item.views || 0), 0),
      totalVideos,
    }
  }

  async incrementViews(id: string) {
    await Playlist.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }
}

export const playlistService = new PlaylistService()

