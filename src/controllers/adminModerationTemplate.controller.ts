import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  adminModerationTemplateService,
  AdminModerationTemplateServiceError,
} from '../services/adminModerationTemplate.service'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_moderation_template_controller'

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const toOptionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminModerationTemplateServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

export const listAdminModerationTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const activeQuery = toOptionalString(req.query.active)
    const active =
      activeQuery === 'true' ? true : activeQuery === 'false' ? false : undefined

    const result = await adminModerationTemplateService.listTemplates(
      {
        active,
        tag: toOptionalString(req.query.tag),
        search: toOptionalString(req.query.search),
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_moderation_templates', error, req)
    return handleError(res, error, 'Erro ao listar templates de moderacao.')
  }
}

export const getAdminModerationTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminModerationTemplateService.getTemplate(req.params.templateId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_moderation_template', error, req)
    return handleError(res, error, 'Erro ao obter template de moderacao.')
  }
}

export const createAdminModerationTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = toRecord(req.body)
    const result = await adminModerationTemplateService.createTemplate({
      actorId: req.user.id,
      code: toOptionalString(body.code) ?? '',
      label: toOptionalString(body.label) ?? '',
      reason: toOptionalString(body.reason) ?? '',
      defaultNote: toOptionalString(body.defaultNote),
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
      active: toOptionalBoolean(body.active),
      requiresNote: toOptionalBoolean(body.requiresNote),
      requiresDoubleConfirm: toOptionalBoolean(body.requiresDoubleConfirm),
      changeReason: toOptionalString(body.changeReason),
    })

    return res.status(201).json({
      message: 'Template de moderacao criado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_moderation_template', error, req)
    return handleError(res, error, 'Erro ao criar template de moderacao.')
  }
}

export const updateAdminModerationTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = toRecord(req.body)
    const result = await adminModerationTemplateService.updateTemplate({
      actorId: req.user.id,
      templateId: req.params.templateId,
      label: toOptionalString(body.label),
      reason: toOptionalString(body.reason),
      defaultNote: toOptionalString(body.defaultNote),
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
      active: toOptionalBoolean(body.active),
      requiresNote: toOptionalBoolean(body.requiresNote),
      requiresDoubleConfirm: toOptionalBoolean(body.requiresDoubleConfirm),
      changeReason: toOptionalString(body.changeReason),
    })

    return res.status(200).json({
      message: 'Template de moderacao atualizado.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_moderation_template', error, req)
    return handleError(res, error, 'Erro ao atualizar template de moderacao.')
  }
}

export const activateAdminModerationTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = toRecord(req.body)
    const result = await adminModerationTemplateService.setTemplateStatus({
      actorId: req.user.id,
      templateId: req.params.templateId,
      active: true,
      changeReason: toOptionalString(body.changeReason),
    })

    return res.status(200).json({
      message: 'Template de moderacao ativado.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'activate_admin_moderation_template', error, req)
    return handleError(res, error, 'Erro ao ativar template de moderacao.')
  }
}

export const deactivateAdminModerationTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = toRecord(req.body)
    const result = await adminModerationTemplateService.setTemplateStatus({
      actorId: req.user.id,
      templateId: req.params.templateId,
      active: false,
      changeReason: toOptionalString(body.changeReason),
    })

    return res.status(200).json({
      message: 'Template de moderacao desativado.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'deactivate_admin_moderation_template', error, req)
    return handleError(res, error, 'Erro ao desativar template de moderacao.')
  }
}
