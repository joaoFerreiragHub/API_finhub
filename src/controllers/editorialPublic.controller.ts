import { Request, Response } from 'express'
import {
  adminEditorialCmsService,
  AdminEditorialCmsServiceError,
  isValidDirectoryVerificationStatus,
  isValidDirectoryVerticalType,
} from '../services/adminEditorialCms.service'

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value !== 'string') return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

const parseStringArray = (value: unknown): string[] | undefined => {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  const normalized = values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (normalized.length === 0) return undefined
  return Array.from(new Set(normalized))
}

const parseSort = (value: unknown): 'featured' | 'recent' | 'name' | undefined => {
  if (typeof value !== 'string') return undefined
  if (value === 'featured' || value === 'recent' || value === 'name') return value
  return undefined
}

const handleEditorialError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminEditorialCmsServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  const details = error instanceof Error ? error.message : undefined
  return res.status(500).json({
    error: fallbackMessage,
    details,
  })
}

/**
 * GET /api/editorial/home
 */
export const getEditorialHome = async (_req: Request, res: Response) => {
  try {
    const result = await adminEditorialCmsService.listPublicHomeSections()
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get editorial home error:', error)
    return handleEditorialError(res, error, 'Erro ao carregar homepage editorial.')
  }
}

/**
 * GET /api/editorial/:vertical
 */
export const getEditorialVerticalLanding = async (req: Request, res: Response) => {
  try {
    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const verificationStatusRaw =
      typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus : undefined
    if (
      verificationStatusRaw &&
      !isValidDirectoryVerificationStatus(verificationStatusRaw)
    ) {
      return res.status(400).json({
        error: 'Parametro verificationStatus invalido.',
      })
    }

    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined
    if (sortRaw && !parseSort(sortRaw)) {
      return res.status(400).json({
        error: 'Parametro sort invalido. Use featured, recent ou name.',
      })
    }

    const result = await adminEditorialCmsService.listPublicVertical(vertical, {
      showAll: false,
      page: parsePositiveInt(req.query.page),
      limit: parsePositiveInt(req.query.limit),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      country: typeof req.query.country === 'string' ? req.query.country : undefined,
      region: typeof req.query.region === 'string' ? req.query.region : undefined,
      categories: parseStringArray(req.query.categories),
      tags: parseStringArray(req.query.tags),
      isFeatured: parseBoolean(req.query.featured),
      verificationStatus:
        verificationStatusRaw && isValidDirectoryVerificationStatus(verificationStatusRaw)
          ? verificationStatusRaw
          : undefined,
      sort: parseSort(req.query.sort),
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get editorial vertical landing error:', error)
    return handleEditorialError(res, error, 'Erro ao carregar landing editorial.')
  }
}

/**
 * GET /api/editorial/:vertical/show-all
 */
export const getEditorialVerticalShowAll = async (req: Request, res: Response) => {
  try {
    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const verificationStatusRaw =
      typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus : undefined
    if (
      verificationStatusRaw &&
      !isValidDirectoryVerificationStatus(verificationStatusRaw)
    ) {
      return res.status(400).json({
        error: 'Parametro verificationStatus invalido.',
      })
    }

    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined
    if (sortRaw && !parseSort(sortRaw)) {
      return res.status(400).json({
        error: 'Parametro sort invalido. Use featured, recent ou name.',
      })
    }

    const result = await adminEditorialCmsService.listPublicVertical(vertical, {
      showAll: true,
      page: parsePositiveInt(req.query.page),
      limit: parsePositiveInt(req.query.limit),
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      country: typeof req.query.country === 'string' ? req.query.country : undefined,
      region: typeof req.query.region === 'string' ? req.query.region : undefined,
      categories: parseStringArray(req.query.categories),
      tags: parseStringArray(req.query.tags),
      isFeatured: parseBoolean(req.query.featured),
      verificationStatus:
        verificationStatusRaw && isValidDirectoryVerificationStatus(verificationStatusRaw)
          ? verificationStatusRaw
          : undefined,
      sort: parseSort(req.query.sort),
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get editorial vertical show-all error:', error)
    return handleEditorialError(res, error, 'Erro ao carregar lista editorial completa.')
  }
}
