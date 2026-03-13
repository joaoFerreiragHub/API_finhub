import { Request, Response } from 'express'
import {
  platformIntegrationConfigService,
  PlatformIntegrationConfigServiceError,
} from '../services/platformIntegrationConfig.service'

const handlePlatformRuntimeConfigError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof PlatformIntegrationConfigServiceError) {
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
 * GET /api/platform/runtime-config
 */
export const getPublicPlatformRuntimeConfig = async (_req: Request, res: Response) => {
  try {
    const result = await platformIntegrationConfigService.getPublicRuntimeConfig()
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get public platform runtime config error:', error)
    return handlePlatformRuntimeConfigError(res, error, 'Erro ao carregar runtime config publica.')
  }
}
