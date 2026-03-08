import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AdminCreatorAnalyticsServiceError,
  adminCreatorAnalyticsService,
} from '../services/adminCreatorAnalytics.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_creator_analytics_controller'

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminCreatorAnalyticsServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/admin/creators/analytics/positive
 */
export const listAdminCreatorPositiveAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminCreatorAnalyticsService.listPositiveAnalytics(
      {
        search: toOptionalString(req.query.search),
        accountStatus: toOptionalString(req.query.accountStatus) as
          | import('../models/User').UserAccountStatus
          | undefined,
        riskLevel: toOptionalString(req.query.riskLevel) as
          | import('../services/creatorTrust.service').CreatorRiskLevel
          | undefined,
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
        sortBy: toOptionalString(req.query.sortBy) as
          | 'growth'
          | 'engagement'
          | 'followers'
          | 'trust'
          | undefined,
        sortOrder: toOptionalString(req.query.sortOrder) as 'asc' | 'desc' | undefined,
        windowDays: toOptionalNumber(req.query.windowDays),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_creator_positive_analytics', error, req)
    return handleError(res, error, 'Erro ao listar analytics positivos de creators.')
  }
}

/**
 * GET /api/admin/creators/analytics/positive/export.csv
 */
export const exportAdminCreatorPositiveAnalyticsCsv = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminCreatorAnalyticsService.exportPositiveAnalyticsCsv(
      {
        search: toOptionalString(req.query.search),
        accountStatus: toOptionalString(req.query.accountStatus) as
          | import('../models/User').UserAccountStatus
          | undefined,
        riskLevel: toOptionalString(req.query.riskLevel) as
          | import('../services/creatorTrust.service').CreatorRiskLevel
          | undefined,
      },
      {
        sortBy: toOptionalString(req.query.sortBy) as
          | 'growth'
          | 'engagement'
          | 'followers'
          | 'trust'
          | undefined,
        sortOrder: toOptionalString(req.query.sortOrder) as 'asc' | 'desc' | undefined,
        windowDays: toOptionalNumber(req.query.windowDays),
        maxRows: toOptionalNumber(req.query.maxRows),
      }
    )

    const filename = `admin-creator-positive-analytics-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`)
    return res.status(200).send(result.csv)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'export_admin_creator_positive_analytics_csv', error, req)
    return handleError(res, error, 'Erro ao exportar analytics positivos de creators em CSV.')
  }
}
