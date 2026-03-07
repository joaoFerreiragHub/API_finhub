import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  CreatePlaylistDTO,
  PlaylistFilters,
  UpdatePlaylistDTO,
  playlistService,
} from '../services/playlist.service'

/**
 * Listar playlists (publico)
 * GET /api/playlists
 */
export const listPlaylists = async (req: Request, res: Response) => {
  try {
    const filters: PlaylistFilters = {
      creator: req.query.creator as string,
      type: req.query.type as PlaylistFilters['type'],
      topic: req.query.topic as string,
      status: req.query.status as PlaylistFilters['status'],
      isMain: req.query.isMain === 'true' ? true : req.query.isMain === 'false' ? false : undefined,
      isPublic:
        req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      search: req.query.search as string,
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await playlistService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List playlists error:', error)
    return res.status(500).json({
      error: 'Erro ao listar playlists',
      details: error.message,
    })
  }
}

/**
 * Obter playlist por slug (publico)
 * GET /api/playlists/:slug
 */
export const getPlaylistBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? '')

    const playlist = await playlistService.getBySlug(slug)

    playlistService.incrementViews(String((playlist as { _id?: unknown })._id ?? '')).catch(console.error)

    return res.status(200).json(playlist)
  } catch (error: any) {
    console.error('Get playlist by slug error:', error)
    return res.status(404).json({
      error: 'Playlist nao encontrada',
      details: error.message,
    })
  }
}

/**
 * Obter playlist por ID (publico)
 * GET /api/playlists/id/:id
 */
export const getPlaylistById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? '')

    const playlist = await playlistService.getById(id)

    return res.status(200).json(playlist)
  } catch (error: any) {
    console.error('Get playlist by id error:', error)
    return res.status(404).json({
      error: 'Playlist nao encontrada',
      details: error.message,
    })
  }
}

/**
 * Criar playlist (protegido - creator/admin)
 * POST /api/playlists
 */
export const createPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const data: CreatePlaylistDTO = req.body

    if (!data.name) {
      return res.status(400).json({
        error: 'Campo obrigatorio: name',
      })
    }

    const playlist = await playlistService.create(req.user.id, data)

    return res.status(201).json(playlist)
  } catch (error: any) {
    console.error('Create playlist error:', error)
    return res.status(500).json({
      error: 'Erro ao criar playlist',
      details: error.message,
    })
  }
}

/**
 * Atualizar playlist (protegido - owner/admin)
 * PATCH /api/playlists/:id
 */
export const updatePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const data: UpdatePlaylistDTO = req.body

    const playlist = await playlistService.update(id, req.user.id, data)

    return res.status(200).json(playlist)
  } catch (error: any) {
    console.error('Update playlist error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar playlist',
      details: error.message,
    })
  }
}

/**
 * Eliminar playlist (protegido - owner/admin)
 * DELETE /api/playlists/:id
 */
export const deletePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const isAdmin = req.user.role === 'admin'

    const result = await playlistService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete playlist error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar playlist',
      details: error.message,
    })
  }
}

/**
 * Listar minhas playlists (protegido - creator)
 * GET /api/playlists/me
 */
export const getMyPlaylists = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await playlistService.getMyPlaylists(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my playlists error:', error)
    return res.status(500).json({
      error: 'Erro ao listar playlists',
      details: error.message,
    })
  }
}

/**
 * Estatisticas das minhas playlists (protegido - creator)
 * GET /api/playlists/stats
 */
export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const stats = await playlistService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get playlist stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatisticas',
      details: error.message,
    })
  }
}
