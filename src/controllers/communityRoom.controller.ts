import { Request, Response } from 'express'
import {
  CommunityRoomServiceError,
  communityRoomService,
} from '../services/communityRoom.service'
import { CommunityRoomCategory } from '../models/CommunityRoom'

const parsePositiveIntegerQuery = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

/**
 * GET /api/community/rooms
 */
export const listCommunityRooms = async (req: Request, res: Response) => {
  try {
    const category =
      typeof req.query.category === 'string' ? (req.query.category as CommunityRoomCategory) : undefined

    const result = await communityRoomService.listPublicRooms({
      page: parsePositiveIntegerQuery(req.query.page),
      limit: parsePositiveIntegerQuery(req.query.limit),
      category,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List community rooms error:', error)

    if (error instanceof CommunityRoomServiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
      })
    }

    const details = error instanceof Error ? error.message : undefined
    return res.status(500).json({
      error: 'Erro ao listar salas da comunidade.',
      details,
    })
  }
}

/**
 * GET /api/community/rooms/:slug
 */
export const getCommunityRoomBySlug = async (req: Request, res: Response) => {
  try {
    const slug = typeof req.params.slug === 'string' ? req.params.slug : ''
    const room = await communityRoomService.getPublicRoomBySlug(slug)
    return res.status(200).json({ room })
  } catch (error: unknown) {
    console.error('Get community room by slug error:', error)

    if (error instanceof CommunityRoomServiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
      })
    }

    const details = error instanceof Error ? error.message : undefined
    return res.status(500).json({
      error: 'Erro ao carregar sala da comunidade.',
      details,
    })
  }
}
