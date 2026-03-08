import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AdminSubscriptionServiceError,
  adminSubscriptionService,
} from '../services/adminSubscription.service'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { SubscriptionBillingCycle, SubscriptionStatus } from '../models/UserSubscription'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_subscription_controller'
const VALID_STATUS = new Set<SubscriptionStatus>(['active', 'trialing', 'past_due', 'canceled'])
const VALID_BILLING_CYCLES = new Set<SubscriptionBillingCycle>([
  'monthly',
  'annual',
  'lifetime',
  'custom',
])

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

const toOptionalStatus = (value: unknown): SubscriptionStatus | undefined =>
  typeof value === 'string' && VALID_STATUS.has(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : undefined

const toOptionalBillingCycle = (value: unknown): SubscriptionBillingCycle | undefined =>
  typeof value === 'string' && VALID_BILLING_CYCLES.has(value as SubscriptionBillingCycle)
    ? (value as SubscriptionBillingCycle)
    : undefined

const requireActor = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticacao necessaria.' })
    return null
  }
  return req.user.id
}

const requireReason = (req: AuthRequest, res: Response): string | null => {
  const parsed = readAdminReason(req)
  if (parsed.error) {
    res.status(400).json({ error: parsed.error })
    return null
  }
  if (!parsed.value) {
    res.status(400).json({ error: 'Motivo obrigatorio para esta acao.' })
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
  if (error instanceof AdminSubscriptionServiceError) {
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
 * GET /api/admin/monetization/subscriptions
 */
export const listAdminSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const statusRaw = toOptionalString(req.query.status)
    if (statusRaw && !VALID_STATUS.has(statusRaw as SubscriptionStatus)) {
      return res.status(400).json({
        error: 'Parametro status invalido.',
      })
    }

    const result = await adminSubscriptionService.listSubscriptions(
      {
        status: toOptionalStatus(req.query.status),
        planCode: toOptionalString(req.query.planCode),
        periodFrom: toOptionalString(req.query.periodFrom),
        periodTo: toOptionalString(req.query.periodTo),
        search: toOptionalString(req.query.search),
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_subscriptions', error, req)
    return handleError(res, error, 'Erro ao listar subscricoes admin.')
  }
}

/**
 * GET /api/admin/monetization/subscriptions/users/:userId
 */
export const getAdminSubscriptionByUser = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminSubscriptionService.getSubscriptionByUser(req.params.userId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_subscription_by_user', error, req)
    return handleError(res, error, 'Erro ao obter subscricao do utilizador.')
  }
}

/**
 * POST /api/admin/monetization/subscriptions/users/:userId/extend-trial
 */
export const extendAdminSubscriptionTrial = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = requireActor(req, res)
    if (!actorId) return

    const reason = requireReason(req, res)
    if (!reason) return

    const note = resolveNote(req, res)
    if (note === null) return

    const result = await adminSubscriptionService.extendTrial({
      actorId,
      userId: req.params.userId,
      reason,
      note,
      days: toOptionalNumber(req.body?.days),
      trialEndsAt:
        typeof req.body?.trialEndsAt === 'string' || req.body?.trialEndsAt instanceof Date
          ? req.body.trialEndsAt
          : undefined,
    })

    return res.status(200).json({
      message: 'Trial estendido com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'extend_admin_subscription_trial', error, req)
    return handleError(res, error, 'Erro ao estender trial da subscricao.')
  }
}

/**
 * POST /api/admin/monetization/subscriptions/users/:userId/revoke-entitlement
 */
export const revokeAdminSubscriptionEntitlement = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = requireActor(req, res)
    if (!actorId) return

    const reason = requireReason(req, res)
    if (!reason) return

    const note = resolveNote(req, res)
    if (note === null) return

    const nextStatusRaw = toOptionalString(req.body?.nextStatus)
    if (nextStatusRaw && nextStatusRaw !== 'past_due' && nextStatusRaw !== 'canceled') {
      return res.status(400).json({
        error: "nextStatus invalido. Valores permitidos: 'past_due' ou 'canceled'.",
      })
    }

    const result = await adminSubscriptionService.revokeEntitlement({
      actorId,
      userId: req.params.userId,
      reason,
      note,
      nextStatus:
        nextStatusRaw === 'past_due' || nextStatusRaw === 'canceled'
          ? nextStatusRaw
          : undefined,
    })

    return res.status(200).json({
      message: 'Entitlement revogado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'revoke_admin_subscription_entitlement', error, req)
    return handleError(res, error, 'Erro ao revogar entitlement da subscricao.')
  }
}

/**
 * POST /api/admin/monetization/subscriptions/users/:userId/reactivate
 */
export const reactivateAdminSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const actorId = requireActor(req, res)
    if (!actorId) return

    const reason = requireReason(req, res)
    if (!reason) return

    const note = resolveNote(req, res)
    if (note === null) return

    const billingCycleRaw = toOptionalString(req.body?.billingCycle)
    if (billingCycleRaw && !VALID_BILLING_CYCLES.has(billingCycleRaw as SubscriptionBillingCycle)) {
      return res.status(400).json({
        error: "billingCycle invalido. Valores permitidos: 'monthly', 'annual', 'lifetime' ou 'custom'.",
      })
    }

    const result = await adminSubscriptionService.reactivateSubscription({
      actorId,
      userId: req.params.userId,
      reason,
      note,
      periodDays: toOptionalNumber(req.body?.periodDays),
      planCode: toOptionalString(req.body?.planCode),
      planLabel: toOptionalString(req.body?.planLabel),
      billingCycle: toOptionalBillingCycle(req.body?.billingCycle),
    })

    return res.status(200).json({
      message: 'Subscricao reativada com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'reactivate_admin_subscription', error, req)
    return handleError(res, error, 'Erro ao reativar subscricao.')
  }
}
