import { Request, Response } from 'express'
import {
  isValidDirectorySortBy,
  isValidDirectoryVerificationStatus,
  isValidDirectoryVerticalType,
  PublicDirectoryServiceError,
  publicDirectoryService,
} from '../services/publicDirectory.service'

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

  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined
}

const handleDirectoryError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof PublicDirectoryServiceError) {
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
 * GET /api/directories
 */
export const listPublicDirectories = async (req: Request, res: Response) => {
  try {
    const verticalTypeRaw =
      typeof req.query.verticalType === 'string' ? req.query.verticalType : undefined
    if (verticalTypeRaw && !isValidDirectoryVerticalType(verticalTypeRaw)) {
      return res.status(400).json({
        error: 'Parametro verticalType invalido.',
      })
    }
    const verticalType = verticalTypeRaw && isValidDirectoryVerticalType(verticalTypeRaw)
      ? verticalTypeRaw
      : undefined

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
    const verificationStatus =
      verificationStatusRaw && isValidDirectoryVerificationStatus(verificationStatusRaw)
        ? verificationStatusRaw
        : undefined

    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined
    if (sortRaw && !isValidDirectorySortBy(sortRaw)) {
      return res.status(400).json({
        error: 'Parametro sort invalido. Use featured, popular, rating, recent ou name.',
      })
    }
    const sort = sortRaw && isValidDirectorySortBy(sortRaw) ? sortRaw : undefined

    const featured = parseBoolean(req.query.featured)
    if (typeof req.query.featured === 'string' && featured === undefined) {
      return res.status(400).json({
        error: 'Parametro featured invalido. Usa true ou false.',
      })
    }

    const result = await publicDirectoryService.listPublicDirectories(
      {
        verticalType,
        country: typeof req.query.country === 'string' ? req.query.country : undefined,
        verificationStatus,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        isFeatured: featured,
        tags: parseStringArray(req.query.tags),
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
        sort,
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List public directories error:', error)
    return handleDirectoryError(res, error, 'Erro ao listar diretorio publico.')
  }
}

/**
 * GET /api/directories/featured
 */
export const listFeaturedPublicDirectories = async (req: Request, res: Response) => {
  try {
    const limit = parsePositiveInt(req.query.limit)
    if (typeof req.query.limit === 'string' && limit === undefined) {
      return res.status(400).json({
        error: 'Parametro limit invalido.',
      })
    }

    const result = await publicDirectoryService.getFeaturedPublicDirectories(limit)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List featured public directories error:', error)
    return handleDirectoryError(res, error, 'Erro ao listar recursos em destaque.')
  }
}

/**
 * GET /api/directories/search
 */
export const searchPublicDirectories = async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (q.length < 2) {
      return res.status(400).json({
        error: 'Parametro q invalido. Usa pelo menos 2 caracteres.',
      })
    }

    const verticalTypeRaw =
      typeof req.query.verticalType === 'string' ? req.query.verticalType : undefined
    if (verticalTypeRaw && !isValidDirectoryVerticalType(verticalTypeRaw)) {
      return res.status(400).json({
        error: 'Parametro verticalType invalido.',
      })
    }
    const verticalType = verticalTypeRaw && isValidDirectoryVerticalType(verticalTypeRaw)
      ? verticalTypeRaw
      : undefined

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
    const verificationStatus =
      verificationStatusRaw && isValidDirectoryVerificationStatus(verificationStatusRaw)
        ? verificationStatusRaw
        : undefined

    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined
    if (sortRaw && !isValidDirectorySortBy(sortRaw)) {
      return res.status(400).json({
        error: 'Parametro sort invalido. Use featured, popular, rating, recent ou name.',
      })
    }
    const sort = sortRaw && isValidDirectorySortBy(sortRaw) ? sortRaw : undefined

    const featured = parseBoolean(req.query.featured)
    if (typeof req.query.featured === 'string' && featured === undefined) {
      return res.status(400).json({
        error: 'Parametro featured invalido. Usa true ou false.',
      })
    }

    const result = await publicDirectoryService.searchPublicDirectories(
      q,
      {
        verticalType,
        country: typeof req.query.country === 'string' ? req.query.country : undefined,
        verificationStatus,
        isFeatured: featured,
        tags: parseStringArray(req.query.tags),
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
        sort,
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Search public directories error:', error)
    return handleDirectoryError(res, error, 'Erro ao pesquisar diretorio publico.')
  }
}

/**
 * GET /api/directories/compare
 */
export const comparePublicDirectories = async (req: Request, res: Response) => {
  try {
    const slugs = parseStringArray(req.query.slugs)
    if (!slugs || slugs.length < 2 || slugs.length > 3) {
      return res.status(400).json({
        error: 'Parametro slugs invalido. Informa 2 a 3 slugs separados por virgula.',
      })
    }

    const result = await publicDirectoryService.comparePublicDirectories(slugs)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Compare public directories error:', error)
    return handleDirectoryError(res, error, 'Erro ao comparar recursos do diretorio.')
  }
}

/**
 * GET /api/directories/:vertical
 */
export const listPublicDirectoriesByVertical = async (req: Request, res: Response) => {
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
    const verificationStatus =
      verificationStatusRaw && isValidDirectoryVerificationStatus(verificationStatusRaw)
        ? verificationStatusRaw
        : undefined

    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined
    if (sortRaw && !isValidDirectorySortBy(sortRaw)) {
      return res.status(400).json({
        error: 'Parametro sort invalido. Use featured, popular, rating, recent ou name.',
      })
    }
    const sort = sortRaw && isValidDirectorySortBy(sortRaw) ? sortRaw : undefined

    const featured = parseBoolean(req.query.featured)
    if (typeof req.query.featured === 'string' && featured === undefined) {
      return res.status(400).json({
        error: 'Parametro featured invalido. Usa true ou false.',
      })
    }

    const result = await publicDirectoryService.listPublicDirectoriesByVertical(
      vertical,
      {
        country: typeof req.query.country === 'string' ? req.query.country : undefined,
        verificationStatus,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        isFeatured: featured,
        tags: parseStringArray(req.query.tags),
      },
      {
        page: parsePositiveInt(req.query.page),
        limit: parsePositiveInt(req.query.limit),
        sort,
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List public directories by vertical error:', error)
    return handleDirectoryError(res, error, 'Erro ao listar recursos por vertical.')
  }
}

/**
 * GET /api/directories/:vertical/:slug
 */
export const getPublicDirectoryByVerticalAndSlug = async (req: Request, res: Response) => {
  try {
    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const slug = typeof req.params.slug === 'string' ? req.params.slug : ''
    if (!slug.trim()) {
      return res.status(400).json({
        error: 'Parametro slug invalido.',
      })
    }

    const result = await publicDirectoryService.getPublicDirectoryByVerticalAndSlug(
      vertical,
      slug
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get public directory by vertical and slug error:', error)
    return handleDirectoryError(res, error, 'Erro ao carregar detalhe do recurso.')
  }
}

/**
 * GET /api/directories/:vertical/:slug/related-content
 */
export const listRelatedPublicDirectoryContent = async (req: Request, res: Response) => {
  try {
    const vertical = req.params.vertical
    if (!isValidDirectoryVerticalType(vertical)) {
      return res.status(400).json({
        error: 'Parametro vertical invalido.',
      })
    }

    const slug = typeof req.params.slug === 'string' ? req.params.slug : ''
    if (!slug.trim()) {
      return res.status(400).json({
        error: 'Parametro slug invalido.',
      })
    }

    const limit = parsePositiveInt(req.query.limit)
    if (typeof req.query.limit === 'string' && limit === undefined) {
      return res.status(400).json({
        error: 'Parametro limit invalido.',
      })
    }

    const result = await publicDirectoryService.getRelatedPublicDirectoryContent(
      vertical,
      slug,
      limit
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List related public directory content error:', error)
    return handleDirectoryError(res, error, 'Erro ao carregar conteudo relacionado do recurso.')
  }
}
