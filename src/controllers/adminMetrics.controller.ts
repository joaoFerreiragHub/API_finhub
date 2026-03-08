import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { adminMetricsService } from '../services/adminMetrics.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_metrics_controller'

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
export const getAdminMetricsOverview = async (req: AuthRequest, res: Response) => {
  try {
    const overview = await adminMetricsService.getOverview()
    return res.status(200).json(overview)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_metrics_overview', error, req)
    return handleError(res, error, 'Erro ao carregar metricas administrativas.')
  }
}

/**
 * GET /api/admin/metrics/drilldown
 */
export const getAdminMetricsDrilldown = async (req: AuthRequest, res: Response) => {
  try {
    const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined
    const drilldown = await adminMetricsService.getDrilldown(limitRaw)
    return res.status(200).json(drilldown)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_metrics_drilldown', error, req)
    return handleError(res, error, 'Erro ao carregar drill-down administrativo.')
  }
}
