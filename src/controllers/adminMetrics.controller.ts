import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { adminMetricsService } from '../services/adminMetrics.service'

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  const details = error instanceof Error ? error.message : undefined
  return res.status(500).json({
    error: fallbackMessage,
    details,
  })
}

/**
 * GET /api/admin/metrics/overview
 */
export const getAdminMetricsOverview = async (_req: AuthRequest, res: Response) => {
  try {
    const overview = await adminMetricsService.getOverview()
    return res.status(200).json(overview)
  } catch (error: unknown) {
    console.error('Get admin metrics overview error:', error)
    return handleError(res, error, 'Erro ao carregar metricas administrativas.')
  }
}
