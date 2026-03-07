import { Request, Response } from 'express'
import {
  CreatorListSortBy,
  PublicCreatorServiceError,
  publicCreatorService,
} from '../services/publicCreator.service'

const VALID_SORT_BY = new Set<CreatorListSortBy>(['followers', 'rating', 'newest', 'recent'])
const VALID_SORT_ORDER = new Set<'asc' | 'desc'>(['asc', 'desc'])

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value !== 'string') return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

/**
 * GET /api/creators
 */
export const listPublicCreators = async (req: Request, res: Response) => {
  try {
    const sortByRaw = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined
    if (sortByRaw && !VALID_SORT_BY.has(sortByRaw as CreatorListSortBy)) {
      return res.status(400).json({
        error: 'Parametro sortBy invalido.',
      })
    }

    const sortOrderRaw = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : undefined
    if (sortOrderRaw && !VALID_SORT_ORDER.has(sortOrderRaw as 'asc' | 'desc')) {
      return res.status(400).json({
        error: 'Parametro sortOrder invalido.',
      })
    }

    const minRating = parseNumber(req.query.minRating)
    if (
      typeof req.query.minRating === 'string' &&
      (minRating === undefined || minRating < 0 || minRating > 5)
    ) {
      return res.status(400).json({
        error: 'Parametro minRating invalido. Usa valor entre 0 e 5.',
      })
    }

    const emailVerified = parseBoolean(req.query.emailVerified)
    if (typeof req.query.emailVerified === 'string' && emailVerified === undefined) {
      return res.status(400).json({
        error: 'Parametro emailVerified invalido. Usa true ou false.',
      })
    }

    const minFollowers = parsePositiveInt(req.query.minFollowers)
    if (typeof req.query.minFollowers === 'string' && minFollowers === undefined) {
      return res.status(400).json({
        error: 'Parametro minFollowers invalido.',
      })
    }

    const result = await publicCreatorService.listPublicCreators(
      {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        minFollowers,
        minRating,
        emailVerified,
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
        sortBy: sortByRaw as CreatorListSortBy | undefined,
        sortOrder:
          sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : undefined,
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List public creators error:', error)

    if (error instanceof PublicCreatorServiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
      })
    }

    const details = error instanceof Error ? error.message : undefined
    return res.status(500).json({
      error: 'Erro ao listar creators publicos.',
      details,
    })
  }
}
