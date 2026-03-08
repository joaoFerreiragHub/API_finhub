import { Response } from 'express'
import {
  ContentAccessPolicyPayload,
  contentAccessPolicyService,
  ContentAccessPolicyServiceError,
} from '../services/contentAccessPolicy.service'
import { AuthRequest } from '../types/auth'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_content_access_policy_controller'

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

const toOptionalDateInput = (
  value: unknown
): string | Date | null | undefined => {
  if (value === null) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') return value
  return undefined
}

const parsePayload = (bodyInput: unknown): ContentAccessPolicyPayload => {
  const body = toRecord(bodyInput)
  const match = toRecord(body.match)
  const access = toRecord(body.access)

  return {
    code: toOptionalString(body.code),
    label: toOptionalString(body.label),
    description: toOptionalString(body.description),
    active: toOptionalBoolean(body.active),
    priority: toOptionalNumber(body.priority),
    effectiveFrom: toOptionalDateInput(body.effectiveFrom),
    effectiveTo: toOptionalDateInput(body.effectiveTo),
    changeReason: toOptionalString(body.changeReason),
    match: body.match !== undefined
      ? {
          contentTypes: Array.isArray(match.contentTypes) ? match.contentTypes : undefined,
          categories: Array.isArray(match.categories) ? match.categories : undefined,
          tags: Array.isArray(match.tags) ? match.tags : undefined,
          featuredOnly: toOptionalBoolean(match.featuredOnly),
        }
      : undefined,
    access: body.access !== undefined
      ? {
          requiredRole: toOptionalString(access.requiredRole),
          teaserAllowed: toOptionalBoolean(access.teaserAllowed),
          blockedMessage:
            access.blockedMessage === null
              ? null
              : toOptionalString(access.blockedMessage),
        }
      : undefined,
  }
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof ContentAccessPolicyServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

export const listAdminContentAccessPolicies = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const activeQuery = toOptionalString(req.query.active)
    const active =
      activeQuery === 'true'
        ? true
        : activeQuery === 'false'
          ? false
          : undefined
    const requiredRoleRaw = toOptionalString(req.query.requiredRole)
    const requiredRole =
      requiredRoleRaw === 'free' || requiredRoleRaw === 'premium'
        ? requiredRoleRaw
        : undefined
    const contentTypeRaw = toOptionalString(req.query.contentType)
    const contentType =
      contentTypeRaw === 'article' ||
      contentTypeRaw === 'video' ||
      contentTypeRaw === 'course' ||
      contentTypeRaw === 'live' ||
      contentTypeRaw === 'podcast' ||
      contentTypeRaw === 'book'
        ? contentTypeRaw
        : undefined

    const result = await contentAccessPolicyService.listPolicies(
      {
        active,
        requiredRole,
        contentType,
        search: toOptionalString(req.query.search),
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_content_access_policies', error, req)
    return handleError(res, error, 'Erro ao listar policies de acesso.')
  }
}

export const getAdminContentAccessPolicy = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result = await contentAccessPolicyService.getPolicy(req.params.policyId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_content_access_policy', error, req)
    return handleError(res, error, 'Erro ao obter policy de acesso.')
  }
}

export const previewAdminContentAccessPolicy = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result = await contentAccessPolicyService.previewPolicy(parsePayload(req.body))
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'preview_admin_content_access_policy', error, req)
    return handleError(res, error, 'Erro ao gerar preview da policy de acesso.')
  }
}

export const createAdminContentAccessPolicy = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await contentAccessPolicyService.createPolicy(
      req.user.id,
      parsePayload(req.body)
    )

    return res.status(201).json({
      message: 'Policy de acesso criada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_content_access_policy', error, req)
    return handleError(res, error, 'Erro ao criar policy de acesso.')
  }
}

export const updateAdminContentAccessPolicy = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const result = await contentAccessPolicyService.updatePolicy(
      req.user.id,
      req.params.policyId,
      parsePayload(req.body)
    )

    return res.status(200).json({
      message: 'Policy de acesso atualizada.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'update_admin_content_access_policy', error, req)
    return handleError(res, error, 'Erro ao atualizar policy de acesso.')
  }
}

export const activateAdminContentAccessPolicy = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = toRecord(req.body)
    const result = await contentAccessPolicyService.setPolicyActive(
      req.user.id,
      req.params.policyId,
      true,
      toOptionalString(body.changeReason)
    )

    return res.status(200).json({
      message: 'Policy de acesso ativada.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'activate_admin_content_access_policy', error, req)
    return handleError(res, error, 'Erro ao ativar policy de acesso.')
  }
}

export const deactivateAdminContentAccessPolicy = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = toRecord(req.body)
    const result = await contentAccessPolicyService.setPolicyActive(
      req.user.id,
      req.params.policyId,
      false,
      toOptionalString(body.changeReason)
    )

    return res.status(200).json({
      message: 'Policy de acesso desativada.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'deactivate_admin_content_access_policy', error, req)
    return handleError(res, error, 'Erro ao desativar policy de acesso.')
  }
}
