import mongoose from 'mongoose'
import { User, UserRole } from '../models/User'
import {
  IUserSubscription,
  SubscriptionBillingCycle,
  SubscriptionHistoryAction,
  SubscriptionStatus,
  UserSubscription,
} from '../models/UserSubscription'
import { resolvePagination } from '../utils/pagination'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const MAX_TRIAL_DAYS = 365
const MAX_PERIOD_DAYS = 3650
const DEFAULT_TRIAL_DAYS = 7
const DEFAULT_REACTIVATION_DAYS = 30

const ELIGIBLE_ROLES = new Set<UserRole>(['free', 'premium'])
const VALID_STATUS = new Set<SubscriptionStatus>(['active', 'trialing', 'past_due', 'canceled'])
const VALID_BILLING_CYCLES = new Set<SubscriptionBillingCycle>([
  'monthly',
  'annual',
  'lifetime',
  'custom',
])

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toDateOrNull = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

const toPositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = Math.floor(value)
    return parsed > 0 ? parsed : fallback
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }
  return fallback
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizePlanCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const isEligibleRole = (role: unknown): role is UserRole =>
  typeof role === 'string' && ELIGIBLE_ROLES.has(role as UserRole)

const mapActor = (
  value: unknown
): { id: string; name?: string; username?: string; email?: string; role?: string } | null => {
  if (!value || typeof value !== 'object') return null
  const actor = value as {
    _id?: unknown
    id?: unknown
    name?: unknown
    username?: unknown
    email?: unknown
    role?: unknown
  }

  const id =
    typeof actor._id === 'string'
      ? actor._id
      : actor._id instanceof mongoose.Types.ObjectId
        ? String(actor._id)
        : typeof actor.id === 'string'
          ? actor.id
          : null

  if (!id) return null

  return {
    id,
    name: typeof actor.name === 'string' ? actor.name : undefined,
    username: typeof actor.username === 'string' ? actor.username : undefined,
    email: typeof actor.email === 'string' ? actor.email : undefined,
    role: typeof actor.role === 'string' ? actor.role : undefined,
  }
}

const mapUserSummary = (
  userLike: unknown
): {
  id: string
  name?: string
  username?: string
  email?: string
  role?: UserRole
  accountStatus?: string
  subscriptionExpiry?: string | null
} | null => {
  if (!userLike || typeof userLike !== 'object') return null
  const user = userLike as {
    _id?: unknown
    id?: unknown
    name?: unknown
    username?: unknown
    email?: unknown
    role?: unknown
    accountStatus?: unknown
    subscriptionExpiry?: unknown
  }

  const id =
    typeof user._id === 'string'
      ? user._id
      : user._id instanceof mongoose.Types.ObjectId
        ? String(user._id)
        : typeof user.id === 'string'
          ? user.id
          : null
  if (!id) return null

  const subscriptionExpiryDate = toDateOrNull(user.subscriptionExpiry)

  return {
    id,
    name: typeof user.name === 'string' ? user.name : undefined,
    username: typeof user.username === 'string' ? user.username : undefined,
    email: typeof user.email === 'string' ? user.email : undefined,
    role: typeof user.role === 'string' ? (user.role as UserRole) : undefined,
    accountStatus: typeof user.accountStatus === 'string' ? user.accountStatus : undefined,
    subscriptionExpiry: subscriptionExpiryDate ? subscriptionExpiryDate.toISOString() : null,
  }
}

const resolveDerivedStatus = (subscription: {
  status: SubscriptionStatus
  entitlementActive: boolean
  trialEndsAt?: Date | null
  currentPeriodEnd?: Date | null
}): SubscriptionStatus => {
  const now = Date.now()
  if (subscription.status === 'trialing') {
    const trialEndsAt = subscription.trialEndsAt ? subscription.trialEndsAt.getTime() : null
    if (trialEndsAt && trialEndsAt < now) {
      return subscription.entitlementActive ? 'active' : 'past_due'
    }
  }

  if (subscription.status === 'active' && subscription.currentPeriodEnd) {
    const periodEnd = subscription.currentPeriodEnd.getTime()
    if (periodEnd < now && !subscription.entitlementActive) {
      return 'past_due'
    }
  }

  return subscription.status
}

const buildSnapshot = (subscription: {
  planCode: string
  planLabel: string
  billingCycle: SubscriptionBillingCycle
  status: SubscriptionStatus
  entitlementActive: boolean
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  trialEndsAt?: Date | null
  canceledAt?: Date | null
  cancelAtPeriodEnd: boolean
}) => ({
  planCode: subscription.planCode,
  planLabel: subscription.planLabel,
  billingCycle: subscription.billingCycle,
  status: subscription.status,
  entitlementActive: subscription.entitlementActive,
  currentPeriodStart: subscription.currentPeriodStart ?? null,
  currentPeriodEnd: subscription.currentPeriodEnd ?? null,
  trialEndsAt: subscription.trialEndsAt ?? null,
  canceledAt: subscription.canceledAt ?? null,
  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
})

const toObjectId = (value: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AdminSubscriptionServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(value)
}

const toHistoryAction = (
  action: SubscriptionHistoryAction
): SubscriptionHistoryAction => action

const toIsoOrNull = (value: Date | null | undefined): string | null =>
  value instanceof Date ? value.toISOString() : null

export class AdminSubscriptionServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export interface ListAdminSubscriptionsFilters {
  status?: SubscriptionStatus
  planCode?: string
  periodFrom?: string | Date
  periodTo?: string | Date
  search?: string
}

export interface ListAdminSubscriptionsOptions {
  page?: number
  limit?: number
}

export interface AdminSubscriptionActionBaseInput {
  actorId: string
  userId: string
  reason: string
  note?: string
}

export interface AdminExtendTrialInput extends AdminSubscriptionActionBaseInput {
  days?: number
  trialEndsAt?: string | Date
}

export interface AdminRevokeEntitlementInput extends AdminSubscriptionActionBaseInput {
  nextStatus?: 'past_due' | 'canceled'
}

export interface AdminReactivateSubscriptionInput extends AdminSubscriptionActionBaseInput {
  periodDays?: number
  planCode?: string
  planLabel?: string
  billingCycle?: SubscriptionBillingCycle
}

interface ManagedUserRecord {
  _id: mongoose.Types.ObjectId
  email: string
  name: string
  username: string
  role: UserRole
  accountStatus: string
  subscriptionExpiry?: Date | null
}

export class AdminSubscriptionService {
  async listSubscriptions(
    filters: ListAdminSubscriptionsFilters = {},
    options: ListAdminSubscriptionsOptions = {}
  ) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (filters.status && VALID_STATUS.has(filters.status)) {
      query.status = filters.status
    }

    const planCode = toStringOrNull(filters.planCode)
    if (planCode) {
      query.planCode = normalizePlanCode(planCode)
    }

    const periodFrom = toDateOrNull(filters.periodFrom)
    const periodTo = toDateOrNull(filters.periodTo)
    if (periodFrom && periodTo && periodFrom.getTime() > periodTo.getTime()) {
      throw new AdminSubscriptionServiceError(400, 'periodFrom nao pode ser superior a periodTo.')
    }

    if (periodFrom || periodTo) {
      query.currentPeriodEnd = {}
      if (periodFrom) {
        ;(query.currentPeriodEnd as Record<string, unknown>).$gte = periodFrom
      }
      if (periodTo) {
        ;(query.currentPeriodEnd as Record<string, unknown>).$lte = periodTo
      }
    }

    const search = toStringOrNull(filters.search)
    if (search) {
      const regex = new RegExp(escapeRegExp(search), 'i')
      const matchedUsers = await User.find({
        $or: [{ name: regex }, { username: regex }, { email: regex }],
      })
        .select('_id')
        .limit(300)
        .lean()

      const userIds = matchedUsers
        .map((row) => {
          if (row._id instanceof mongoose.Types.ObjectId) return row._id
          if (typeof row._id === 'string' && mongoose.Types.ObjectId.isValid(row._id)) {
            return new mongoose.Types.ObjectId(row._id)
          }
          return null
        })
        .filter((item): item is mongoose.Types.ObjectId => item instanceof mongoose.Types.ObjectId)

      if (userIds.length === 0) {
        return {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 1,
          },
          summary: {
            active: 0,
            trialing: 0,
            pastDue: 0,
            canceled: 0,
            entitlementActive: 0,
            total: 0,
          },
        }
      }
      query.user = { $in: userIds }
    }

    const [rows, total, summaryRows] = await Promise.all([
      UserSubscription.find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name username email role accountStatus subscriptionExpiry')
        .populate('updatedBy', 'name username email role')
        .lean(),
      UserSubscription.countDocuments(query),
      UserSubscription.aggregate<{ _id: SubscriptionStatus; count: number; entitlementActive: number }>([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            entitlementActive: {
              $sum: {
                $cond: [{ $eq: ['$entitlementActive', true] }, 1, 0],
              },
            },
          },
        },
      ]),
    ])

    const summary = {
      active: 0,
      trialing: 0,
      pastDue: 0,
      canceled: 0,
      entitlementActive: 0,
      total,
    }

    for (const row of summaryRows) {
      if (row._id === 'active') summary.active = row.count
      if (row._id === 'trialing') summary.trialing = row.count
      if (row._id === 'past_due') summary.pastDue = row.count
      if (row._id === 'canceled') summary.canceled = row.count
      summary.entitlementActive += row.entitlementActive
    }

    return {
      items: rows.map((row) => this.mapSubscription(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    }
  }

  async getSubscriptionByUser(userIdRaw: string) {
    const userId = toObjectId(userIdRaw, 'userId')
    const user = await User.findById(userId)
      .select('email name username role accountStatus subscriptionExpiry')

    if (!user) {
      throw new AdminSubscriptionServiceError(404, 'Utilizador nao encontrado.')
    }

    if (!isEligibleRole(user.role)) {
      throw new AdminSubscriptionServiceError(
        409,
        'Gestao de subscricoes admin aplica-se apenas a utilizadores free/premium.'
      )
    }

    const subscription = await this.ensureSubscriptionDocument(user, null, 'bootstrap_read')
    await subscription.populate('updatedBy', 'name username email role')
    await subscription.populate('createdBy', 'name username email role')

    return this.mapSubscription(subscription.toObject(), true)
  }

  async extendTrial(input: AdminExtendTrialInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const userId = toObjectId(input.userId, 'userId')
    const reason = this.assertReason(input.reason)
    const note = toStringOrNull(input.note)

    const user = await this.findManagedUser(userId)
    const subscription = await this.ensureSubscriptionDocument(user, actorId, 'bootstrap_action')

    const now = new Date()
    const baseTrial = subscription.trialEndsAt && subscription.trialEndsAt > now
      ? subscription.trialEndsAt
      : now

    const explicitTrialEnd = toDateOrNull(input.trialEndsAt)
    const days = clamp(
      toPositiveInt(input.days, DEFAULT_TRIAL_DAYS),
      1,
      MAX_TRIAL_DAYS
    )

    const nextTrialEnd = explicitTrialEnd
      ? explicitTrialEnd
      : new Date(baseTrial.getTime() + days * 24 * 60 * 60 * 1000)

    if (nextTrialEnd.getTime() <= now.getTime()) {
      throw new AdminSubscriptionServiceError(400, 'trialEndsAt deve ser uma data futura.')
    }

    const previousStatus = subscription.status

    subscription.status = 'trialing'
    subscription.entitlementActive = true
    subscription.trialEndsAt = nextTrialEnd
    subscription.currentPeriodStart = subscription.currentPeriodStart ?? now
    subscription.currentPeriodEnd = nextTrialEnd
    subscription.canceledAt = null
    subscription.cancelAtPeriodEnd = false
    subscription.source = 'manual_admin'

    if (!subscription.planCode) subscription.planCode = 'premium_monthly'
    if (!subscription.planLabel) subscription.planLabel = 'Premium Monthly'

    subscription.version += 1
    subscription.updatedBy = actorId
    this.appendHistory(subscription, {
      action: toHistoryAction('extend_trial'),
      actorId,
      reason,
      note,
    })

    user.role = 'premium'
    user.subscriptionExpiry = nextTrialEnd

    await Promise.all([subscription.save(), user.save()])

    if (previousStatus !== subscription.status) {
      this.appendHistory(subscription, {
        action: toHistoryAction('status_change'),
        actorId,
        reason: `${reason} (status ${previousStatus} -> ${subscription.status})`,
        note,
      })
      await subscription.save()
    }

    await subscription.populate('user', 'name username email role accountStatus subscriptionExpiry')
    await subscription.populate('updatedBy', 'name username email role')
    return this.mapSubscription(subscription.toObject(), true)
  }

  async revokeEntitlement(input: AdminRevokeEntitlementInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const userId = toObjectId(input.userId, 'userId')
    const reason = this.assertReason(input.reason)
    const note = toStringOrNull(input.note)
    const nextStatus: SubscriptionStatus =
      input.nextStatus === 'canceled' ? 'canceled' : 'past_due'

    const user = await this.findManagedUser(userId)
    const subscription = await this.ensureSubscriptionDocument(user, actorId, 'bootstrap_action')
    const now = new Date()
    const previousStatus = subscription.status

    subscription.entitlementActive = false
    subscription.status = nextStatus
    subscription.currentPeriodEnd = now
    subscription.trialEndsAt = null
    subscription.cancelAtPeriodEnd = false
    subscription.canceledAt = nextStatus === 'canceled' ? now : null
    subscription.source = 'manual_admin'
    subscription.version += 1
    subscription.updatedBy = actorId

    this.appendHistory(subscription, {
      action: toHistoryAction('revoke_entitlement'),
      actorId,
      reason,
      note,
    })

    if (previousStatus !== subscription.status) {
      this.appendHistory(subscription, {
        action: toHistoryAction('status_change'),
        actorId,
        reason: `${reason} (status ${previousStatus} -> ${subscription.status})`,
        note,
      })
    }

    user.role = 'free'
    user.subscriptionExpiry = now

    await Promise.all([subscription.save(), user.save()])

    await subscription.populate('user', 'name username email role accountStatus subscriptionExpiry')
    await subscription.populate('updatedBy', 'name username email role')
    return this.mapSubscription(subscription.toObject(), true)
  }

  async reactivateSubscription(input: AdminReactivateSubscriptionInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    const userId = toObjectId(input.userId, 'userId')
    const reason = this.assertReason(input.reason)
    const note = toStringOrNull(input.note)
    const periodDays = clamp(
      toPositiveInt(input.periodDays, DEFAULT_REACTIVATION_DAYS),
      1,
      MAX_PERIOD_DAYS
    )

    const user = await this.findManagedUser(userId)
    const subscription = await this.ensureSubscriptionDocument(user, actorId, 'bootstrap_action')
    const now = new Date()
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000)
    const previousStatus = subscription.status

    const planCode = toStringOrNull(input.planCode)
    if (planCode) {
      const normalized = normalizePlanCode(planCode)
      if (!normalized || normalized.length < 3) {
        throw new AdminSubscriptionServiceError(400, 'planCode invalido.')
      }
      subscription.planCode = normalized
    }

    const planLabel = toStringOrNull(input.planLabel)
    if (planLabel) {
      subscription.planLabel = planLabel.slice(0, 120)
    }

    if (input.billingCycle !== undefined) {
      if (!VALID_BILLING_CYCLES.has(input.billingCycle)) {
        throw new AdminSubscriptionServiceError(400, 'billingCycle invalido.')
      }
      subscription.billingCycle = input.billingCycle
    }

    subscription.status = 'active'
    subscription.entitlementActive = true
    subscription.currentPeriodStart = now
    subscription.currentPeriodEnd = periodEnd
    subscription.trialEndsAt = null
    subscription.canceledAt = null
    subscription.cancelAtPeriodEnd = false
    subscription.source = 'manual_admin'
    subscription.version += 1
    subscription.updatedBy = actorId

    this.appendHistory(subscription, {
      action: toHistoryAction('reactivate'),
      actorId,
      reason,
      note,
    })

    if (previousStatus !== subscription.status) {
      this.appendHistory(subscription, {
        action: toHistoryAction('status_change'),
        actorId,
        reason: `${reason} (status ${previousStatus} -> ${subscription.status})`,
        note,
      })
    }

    user.role = 'premium'
    user.subscriptionExpiry = periodEnd

    await Promise.all([subscription.save(), user.save()])

    await subscription.populate('user', 'name username email role accountStatus subscriptionExpiry')
    await subscription.populate('updatedBy', 'name username email role')
    return this.mapSubscription(subscription.toObject(), true)
  }

  private assertReason(reasonRaw: string): string {
    const reason = toStringOrNull(reasonRaw)
    if (!reason) {
      throw new AdminSubscriptionServiceError(400, 'Motivo obrigatorio para esta acao.')
    }
    if (reason.length > 500) {
      throw new AdminSubscriptionServiceError(400, 'Motivo excede limite de 500 caracteres.')
    }
    return reason
  }

  private async findManagedUser(userId: mongoose.Types.ObjectId): Promise<ManagedUserRecord & mongoose.Document> {
    const user = await User.findById(userId).select(
      'email name username role accountStatus subscriptionExpiry'
    )

    if (!user) {
      throw new AdminSubscriptionServiceError(404, 'Utilizador nao encontrado.')
    }

    if (!isEligibleRole(user.role)) {
      throw new AdminSubscriptionServiceError(
        409,
        'Gestao de subscricoes admin aplica-se apenas a utilizadores free/premium.'
      )
    }

    return user as unknown as ManagedUserRecord & mongoose.Document
  }

  private getInitialSubscriptionState(user: {
    role: UserRole
    subscriptionExpiry?: Date | null
  }): {
    status: SubscriptionStatus
    entitlementActive: boolean
    currentPeriodEnd: Date | null
  } {
    const now = new Date()
    const expiry = user.subscriptionExpiry ?? null
    const isPremium = user.role === 'premium'

    if (!isPremium) {
      return {
        status: 'canceled',
        entitlementActive: false,
        currentPeriodEnd: expiry,
      }
    }

    if (!expiry) {
      return {
        status: 'active',
        entitlementActive: true,
        currentPeriodEnd: null,
      }
    }

    if (expiry.getTime() > now.getTime()) {
      return {
        status: 'active',
        entitlementActive: true,
        currentPeriodEnd: expiry,
      }
    }

    return {
      status: 'past_due',
      entitlementActive: false,
      currentPeriodEnd: expiry,
    }
  }

  private async ensureSubscriptionDocument(
    user: {
      _id: unknown
      role: UserRole
      subscriptionExpiry?: Date | null
      save?: () => Promise<unknown>
    },
    actorId: mongoose.Types.ObjectId | null,
    bootstrapReason: string
  ): Promise<IUserSubscription> {
    const userObjectId = this.resolveUserObjectId(user._id)
    const existing = await UserSubscription.findOne({ user: userObjectId })
    if (existing) {
      return existing
    }

    const initial = this.getInitialSubscriptionState(user)
    const now = new Date()

    const created = await UserSubscription.create({
      user: userObjectId,
      planCode: 'premium_monthly',
      planLabel: 'Premium Monthly',
      billingCycle: 'monthly',
      status: initial.status,
      entitlementActive: initial.entitlementActive,
      currentPeriodStart: now,
      currentPeriodEnd: initial.currentPeriodEnd,
      trialEndsAt: null,
      canceledAt: initial.status === 'canceled' ? now : null,
      cancelAtPeriodEnd: false,
      source: 'internal',
      version: 1,
      createdBy: actorId,
      updatedBy: actorId,
      history: [
        {
          version: 1,
          action: 'created',
          reason: bootstrapReason,
          note: null,
          changedAt: now,
          changedBy: actorId,
          snapshot: buildSnapshot({
            planCode: 'premium_monthly',
            planLabel: 'Premium Monthly',
            billingCycle: 'monthly',
            status: initial.status,
            entitlementActive: initial.entitlementActive,
            currentPeriodStart: now,
            currentPeriodEnd: initial.currentPeriodEnd,
            trialEndsAt: null,
            canceledAt: initial.status === 'canceled' ? now : null,
            cancelAtPeriodEnd: false,
          }),
        },
      ],
    })

    return created
  }

  private resolveUserObjectId(rawValue: unknown): mongoose.Types.ObjectId {
    if (rawValue instanceof mongoose.Types.ObjectId) {
      return rawValue
    }

    if (typeof rawValue === 'string' && mongoose.Types.ObjectId.isValid(rawValue)) {
      return new mongoose.Types.ObjectId(rawValue)
    }

    throw new AdminSubscriptionServiceError(500, 'Falha ao resolver id de utilizador na subscricao.')
  }

  private appendHistory(
    subscription: IUserSubscription,
    input: {
      action: SubscriptionHistoryAction
      actorId: mongoose.Types.ObjectId
      reason: string
      note?: string | null
    }
  ) {
    subscription.history.push({
      version: subscription.version,
      action: input.action,
      reason: input.reason,
      note: input.note ?? null,
      changedAt: new Date(),
      changedBy: input.actorId,
      snapshot: buildSnapshot({
        planCode: subscription.planCode,
        planLabel: subscription.planLabel,
        billingCycle: subscription.billingCycle,
        status: subscription.status,
        entitlementActive: subscription.entitlementActive,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        canceledAt: subscription.canceledAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }),
    })
  }

  private mapSubscription(
    row: {
      _id?: unknown
      user?: unknown
      planCode?: unknown
      planLabel?: unknown
      billingCycle?: unknown
      status?: unknown
      entitlementActive?: unknown
      currentPeriodStart?: unknown
      currentPeriodEnd?: unknown
      trialEndsAt?: unknown
      canceledAt?: unknown
      cancelAtPeriodEnd?: unknown
      source?: unknown
      externalSubscriptionId?: unknown
      metadata?: unknown
      version?: unknown
      createdBy?: unknown
      updatedBy?: unknown
      history?: unknown
      createdAt?: unknown
      updatedAt?: unknown
    },
    includeHistory = false
  ) {
    const historyRows = Array.isArray(row.history) ? row.history : []
    const currentStatus =
      typeof row.status === 'string' && VALID_STATUS.has(row.status as SubscriptionStatus)
        ? (row.status as SubscriptionStatus)
        : 'canceled'

    const derivedStatus = resolveDerivedStatus({
      status: currentStatus,
      entitlementActive: row.entitlementActive === true,
      trialEndsAt: toDateOrNull(row.trialEndsAt),
      currentPeriodEnd: toDateOrNull(row.currentPeriodEnd),
    })

    return {
      id:
        row._id instanceof mongoose.Types.ObjectId
          ? String(row._id)
          : typeof row._id === 'string'
            ? row._id
            : null,
      user: mapUserSummary(row.user),
      planCode: typeof row.planCode === 'string' ? row.planCode : 'premium_monthly',
      planLabel: typeof row.planLabel === 'string' ? row.planLabel : 'Premium Monthly',
      billingCycle:
        typeof row.billingCycle === 'string' && VALID_BILLING_CYCLES.has(row.billingCycle as SubscriptionBillingCycle)
          ? (row.billingCycle as SubscriptionBillingCycle)
          : 'monthly',
      status: currentStatus,
      derivedStatus,
      entitlementActive: row.entitlementActive === true,
      currentPeriodStart: toIsoOrNull(toDateOrNull(row.currentPeriodStart)),
      currentPeriodEnd: toIsoOrNull(toDateOrNull(row.currentPeriodEnd)),
      trialEndsAt: toIsoOrNull(toDateOrNull(row.trialEndsAt)),
      canceledAt: toIsoOrNull(toDateOrNull(row.canceledAt)),
      cancelAtPeriodEnd: row.cancelAtPeriodEnd === true,
      source:
        typeof row.source === 'string' &&
        (row.source === 'manual_admin' ||
          row.source === 'internal' ||
          row.source === 'stripe' ||
          row.source === 'import')
          ? row.source
          : 'internal',
      externalSubscriptionId:
        typeof row.externalSubscriptionId === 'string' ? row.externalSubscriptionId : null,
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : null,
      version: typeof row.version === 'number' ? row.version : 1,
      createdBy: mapActor(row.createdBy),
      updatedBy: mapActor(row.updatedBy),
      historyCount: historyRows.length,
      lastHistoryEntry:
        historyRows.length > 0 && typeof historyRows[historyRows.length - 1] === 'object'
          ? historyRows[historyRows.length - 1]
          : null,
      history: includeHistory
        ? historyRows
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
            .map((item) => ({
              version:
                typeof item.version === 'number' ? item.version : 1,
              action: typeof item.action === 'string' ? item.action : 'updated',
              reason: typeof item.reason === 'string' ? item.reason : '',
              note: typeof item.note === 'string' ? item.note : null,
              changedAt: toIsoOrNull(toDateOrNull(item.changedAt)),
              changedBy: mapActor(item.changedBy),
              snapshot:
                item.snapshot && typeof item.snapshot === 'object'
                  ? item.snapshot
                  : null,
            }))
        : undefined,
      createdAt: toIsoOrNull(toDateOrNull(row.createdAt)),
      updatedAt: toIsoOrNull(toDateOrNull(row.updatedAt)),
    }
  }
}

export const adminSubscriptionService = new AdminSubscriptionService()
