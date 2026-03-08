import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import {
  AdminFinancialToolsServiceError,
  adminFinancialToolsService,
  isFinancialToolEnvironment,
  isFinancialToolKey,
} from '../services/adminFinancialTools.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_financial_tools_controller'

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

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const resolveReason = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminReason(req)
  if (parsed.error) {
    res.status(400).json({ error: parsed.error })
    return null
  }
  return parsed.value
}

const resolveNote = (req: AuthRequest, res: Response): string | undefined | null => {
  const parsed = readAdminNote(req)
  if (parsed.error) {
    res.status(400).json({ error: parsed.error })
    return null
  }
  return parsed.value
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminFinancialToolsServiceError) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/admin/tools/financial
 */
export const listAdminFinancialTools = async (req: AuthRequest, res: Response) => {
  try {
    const environment = toOptionalString(req.query.environment)
    if (environment && !isFinancialToolEnvironment(environment)) {
      return res.status(400).json({ error: 'Parametro environment invalido.' })
    }

    const tool = toOptionalString(req.query.tool)
    if (tool && !isFinancialToolKey(tool)) {
      return res.status(400).json({ error: 'Parametro tool invalido.' })
    }

    const result = await adminFinancialToolsService.listToolControls({
      environment,
      tool,
    })
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_financial_tools', error, req)
    return handleError(res, error, 'Erro ao listar controlos de financial tools.')
  }
}

/**
 * PATCH /api/admin/tools/financial/:toolKey
 */
export const updateAdminFinancialTool = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    if (!isFinancialToolKey(req.params.toolKey)) {
      return res.status(400).json({ error: 'toolKey invalido.' })
    }

    const reason = resolveReason(req, res)
    if (reason === null) return
    if (!reason) {
      return res.status(400).json({ error: 'Motivo obrigatorio para atualizar financial tool.' })
    }

    const note = resolveNote(req, res)
    if (note === null) return

    const body = extractBodyRecord(req)
    const result = await adminFinancialToolsService.updateToolControl({
      actorId: req.user.id,
      tool: req.params.toolKey,
      reason,
      note: note ?? undefined,
      patch: body,
    })

    return res.status(200).json({
      message: 'Financial tool atualizada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_financial_tool', error, req)
    return handleError(res, error, 'Erro ao atualizar financial tool.')
  }
}

/**
 * GET /api/admin/tools/financial/usage
 */
export const getAdminFinancialToolsUsage = async (req: AuthRequest, res: Response) => {
  try {
    const environment = toOptionalString(req.query.environment)
    if (environment && !isFinancialToolEnvironment(environment)) {
      return res.status(400).json({ error: 'Parametro environment invalido.' })
    }

    const tool = toOptionalString(req.query.tool)
    if (tool && !isFinancialToolKey(tool)) {
      return res.status(400).json({ error: 'Parametro tool invalido.' })
    }

    const result = await adminFinancialToolsService.getUsageOverview({
      environment,
      tool,
      days: toOptionalNumber(req.query.days),
    })
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_financial_tools_usage', error, req)
    return handleError(res, error, 'Erro ao obter usage de financial tools.')
  }
}
