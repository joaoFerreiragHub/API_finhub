import { Request, Response } from 'express'
import {
  adminEditorialCmsService,
  AdminEditorialCmsServiceError,
  isValidDirectoryVerticalType,
} from '../services/adminEditorialCms.service'

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

    const result = await adminEditorialCmsService.listPublicVertical(vertical, {
      showAll: false,
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

    const result = await adminEditorialCmsService.listPublicVertical(vertical, {
      showAll: true,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get editorial vertical show-all error:', error)
    return handleEditorialError(res, error, 'Erro ao carregar lista editorial completa.')
  }
}
