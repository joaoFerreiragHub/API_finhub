import { Request, Response } from 'express'
import {
  isValidSurfaceControlKey,
  surfaceControlService,
  SurfaceControlServiceError,
} from '../services/surfaceControl.service'

const handleSurfaceControlError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof SurfaceControlServiceError) {
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
 * GET /api/platform/surfaces
 */
export const listPublicSurfaceControls = async (_req: Request, res: Response) => {
  try {
    const result = await surfaceControlService.listPublicControls()
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List public surface controls error:', error)
    return handleSurfaceControlError(res, error, 'Erro ao listar superficies publicas.')
  }
}

/**
 * GET /api/platform/surfaces/:surfaceKey
 */
export const getPublicSurfaceControl = async (req: Request, res: Response) => {
  try {
    const surfaceKey = req.params.surfaceKey
    if (!isValidSurfaceControlKey(surfaceKey)) {
      return res.status(400).json({
        error: 'Parametro surfaceKey invalido.',
      })
    }

    const result = await surfaceControlService.getPublicControl(surfaceKey)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get public surface control error:', error)
    return handleSurfaceControlError(res, error, 'Erro ao carregar superficie publica.')
  }
}
