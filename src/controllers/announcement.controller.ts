import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AnnouncementFilters,
  CreateAnnouncementDTO,
  UpdateAnnouncementDTO,
  announcementService,
} from '../services/announcement.service'

/**
 * List announcements (public)
 * GET /api/announcements
 */
export const listAnnouncements = async (req: Request, res: Response) => {
  try {
    const filters: AnnouncementFilters = {
      creator: req.query.creator as string,
      scope: req.query.scope as AnnouncementFilters['scope'],
      type: req.query.type as AnnouncementFilters['type'],
      isVisible:
        req.query.isVisible === 'true' ? true : req.query.isVisible === 'false' ? false : undefined,
      search: req.query.search as string,
      includeExpired: req.query.includeExpired === 'true',
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await announcementService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List announcements error:', error)
    return res.status(500).json({
      error: 'Erro ao listar announcements',
      details: error.message,
    })
  }
}

/**
 * Get announcement by id (public)
 * GET /api/announcements/id/:id
 */
export const getAnnouncementById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? '')

    const announcement = await announcementService.getById(id)

    return res.status(200).json(announcement)
  } catch (error: any) {
    console.error('Get announcement by id error:', error)
    return res.status(404).json({
      error: 'Announcement nao encontrado',
      details: error.message,
    })
  }
}

/**
 * Create announcement (protected - creator/admin)
 * POST /api/announcements
 */
export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const data: CreateAnnouncementDTO = req.body

    if (!data.title || (!data.body && !data.text)) {
      return res.status(400).json({
        error: 'Campos obrigatorios: title e body/text',
      })
    }

    const announcement = await announcementService.create(req.user.id, req.user.role, data)

    return res.status(201).json(announcement)
  } catch (error: any) {
    console.error('Create announcement error:', error)
    return res.status(500).json({
      error: 'Erro ao criar announcement',
      details: error.message,
    })
  }
}

/**
 * Update announcement (protected - owner/admin)
 * PATCH /api/announcements/:id
 */
export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const data: UpdateAnnouncementDTO = req.body

    const announcement = await announcementService.update(id, req.user.id, req.user.role, data)

    return res.status(200).json(announcement)
  } catch (error: any) {
    console.error('Update announcement error:', error)

    if (error.message.includes('permissao') || error.message.includes('Apenas admin')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar announcement',
      details: error.message,
    })
  }
}

/**
 * Delete announcement (protected - owner/admin)
 * DELETE /api/announcements/:id
 */
export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const id = String(req.params.id ?? '')
    const isAdmin = req.user.role === 'admin'

    const result = await announcementService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete announcement error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar announcement',
      details: error.message,
    })
  }
}

/**
 * List my announcements (protected - creator)
 * GET /api/announcements/me
 */
export const getMyAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await announcementService.getMyAnnouncements(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my announcements error:', error)
    return res.status(500).json({
      error: 'Erro ao listar announcements',
      details: error.message,
    })
  }
}

/**
 * My announcement stats (protected - creator)
 * GET /api/announcements/stats
 */
export const getMyAnnouncementStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const stats = await announcementService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get announcement stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatisticas',
      details: error.message,
    })
  }
}
