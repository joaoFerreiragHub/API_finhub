import { NextFunction, Request, Response } from 'express'

type RecordLike = Record<string, unknown>
type DashboardPreset = 'operations' | 'moderation' | 'monetization' | 'custom'
type DashboardDensity = 'comfortable' | 'compact'
type DashboardTheme = 'system' | 'light' | 'dark'
type BulkImportType = 'subscription_entitlements' | 'ad_campaign_status'
type ContentAccessPolicyContentType = 'article' | 'video' | 'course' | 'live' | 'podcast' | 'book'
type ContentAccessPolicyCategory =
  | 'finance'
  | 'investing'
  | 'trading'
  | 'crypto'
  | 'economics'
  | 'personal-finance'
  | 'business'
  | 'technology'
  | 'education'
  | 'news'
  | 'analysis'
  | 'other'
type ContentAccessPolicyRequiredRole = 'free' | 'premium'
type ModerationAppealStatus = 'open' | 'under_review' | 'accepted' | 'rejected' | 'closed'
type SubscriptionBillingCycle = 'monthly' | 'annual' | 'lifetime' | 'custom'
type AdminBroadcastRole = 'visitor' | 'free' | 'premium' | 'creator' | 'admin'
type AdminBroadcastAccountStatus = 'active' | 'suspended' | 'banned'
type AdminBroadcastChannel = 'in_app'

const CONTENT_ACCESS_POLICY_CONTENT_TYPES: readonly ContentAccessPolicyContentType[] = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
]
const CONTENT_ACCESS_POLICY_CATEGORIES: readonly ContentAccessPolicyCategory[] = [
  'finance',
  'investing',
  'trading',
  'crypto',
  'economics',
  'personal-finance',
  'business',
  'technology',
  'education',
  'news',
  'analysis',
  'other',
]
const CONTENT_ACCESS_POLICY_REQUIRED_ROLES: readonly ContentAccessPolicyRequiredRole[] = [
  'free',
  'premium',
]
const MODERATION_APPEAL_STATUSES: readonly ModerationAppealStatus[] = [
  'open',
  'under_review',
  'accepted',
  'rejected',
  'closed',
]
const SUBSCRIPTION_BILLING_CYCLES: readonly SubscriptionBillingCycle[] = [
  'monthly',
  'annual',
  'lifetime',
  'custom',
]
const ADMIN_BROADCAST_ROLES: readonly AdminBroadcastRole[] = [
  'visitor',
  'free',
  'premium',
  'creator',
  'admin',
]
const ADMIN_BROADCAST_ACCOUNT_STATUSES: readonly AdminBroadcastAccountStatus[] = [
  'active',
  'suspended',
  'banned',
]
const ADMIN_BROADCAST_CHANNELS: readonly AdminBroadcastChannel[] = ['in_app']

const isRecord = (value: unknown): value is RecordLike =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const trimString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const respondValidationError = (
  res: Response,
  message: string,
  details?: Record<string, unknown>
) => {
  res.status(400).json({
    error: message,
    details,
  })
}

const validateRequiredNonEmptyString = (
  payload: RecordLike,
  field: string
): string | null => {
  const value = trimString(payload[field])
  return value
}

const validateOptionalString = (
  payload: RecordLike,
  field: string
): { valid: boolean; value?: string } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true }
  }

  const value = trimString(payload[field])
  if (!value) return { valid: false }

  return { valid: true, value }
}

const validateOptionalBoolean = (
  payload: RecordLike,
  field: string
): { valid: boolean; value?: boolean } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true }
  }

  if (typeof payload[field] !== 'boolean') {
    return { valid: false }
  }

  return { valid: true, value: payload[field] as boolean }
}

const validateOptionalPositiveInteger = (
  payload: RecordLike,
  field: string
): { valid: boolean; value?: number } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true }
  }

  if (typeof payload[field] !== 'number') {
    return { valid: false }
  }

  const value = payload[field] as number
  if (!Number.isInteger(value) || value <= 0) {
    return { valid: false }
  }

  return { valid: true, value }
}

const validateOptionalEnum = <T extends string>(
  payload: RecordLike,
  field: string,
  allowedValues: readonly T[]
): { valid: boolean; value?: T } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true }
  }

  if (typeof payload[field] !== 'string') {
    return { valid: false }
  }

  const normalized = payload[field].trim()
  if (!normalized || !allowedValues.includes(normalized as T)) {
    return { valid: false }
  }

  return { valid: true, value: normalized as T }
}

const validateAdminDashboardLayoutPayload = (
  payload: RecordLike
): { valid: boolean; hasValue: boolean } => {
  if (!('layout' in payload) || payload.layout === undefined || payload.layout === null) {
    return { valid: true, hasValue: false }
  }

  if (!Array.isArray(payload.layout) || payload.layout.length === 0) {
    return { valid: false, hasValue: true }
  }

  for (const item of payload.layout) {
    if (!isRecord(item)) return { valid: false, hasValue: true }

    const widgetKey = validateRequiredNonEmptyString(item, 'widgetKey')
    if (!widgetKey) return { valid: false, hasValue: true }

    for (const numericField of ['column', 'order', 'width', 'height'] as const) {
      if (numericField in item && item[numericField] !== undefined && item[numericField] !== null) {
        if (typeof item[numericField] !== 'number') return { valid: false, hasValue: true }
        if (!Number.isInteger(item[numericField] as number)) return { valid: false, hasValue: true }
      }
    }

    if ('collapsed' in item && item.collapsed !== undefined && item.collapsed !== null) {
      if (typeof item.collapsed !== 'boolean') return { valid: false, hasValue: true }
    }
  }

  return { valid: true, hasValue: true }
}

const validateAdminDashboardPinnedFiltersPayload = (
  payload: RecordLike
): { valid: boolean; hasValue: boolean } => {
  if (
    !('pinnedFilters' in payload) ||
    payload.pinnedFilters === undefined ||
    payload.pinnedFilters === null
  ) {
    return { valid: true, hasValue: false }
  }

  if (!Array.isArray(payload.pinnedFilters)) {
    return { valid: false, hasValue: true }
  }

  for (const item of payload.pinnedFilters) {
    if (!isRecord(item)) return { valid: false, hasValue: true }
    const key = validateRequiredNonEmptyString(item, 'key')
    const value = validateRequiredNonEmptyString(item, 'value')
    if (!key || !value) return { valid: false, hasValue: true }
  }

  return { valid: true, hasValue: true }
}

const validateOptionalDelimiter = (
  payload: RecordLike,
  field: string
): { valid: boolean; value?: string } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true }
  }

  if (typeof payload[field] !== 'string') {
    return { valid: false }
  }

  const value = payload[field].trim()
  if (!value) return { valid: false }
  if (![';', ',', '|', '\t', '\\t'].includes(value)) {
    return { valid: false }
  }

  return { valid: true, value }
}

const validateOptionalDateField = (
  payload: RecordLike,
  field: string,
  options: { allowNull?: boolean } = {}
): { valid: boolean; value?: string | Date | null } => {
  if (!(field in payload) || payload[field] === undefined) {
    return { valid: true }
  }

  const rawValue = payload[field]
  if (rawValue === null) {
    return options.allowNull ? { valid: true, value: null } : { valid: false }
  }

  if (rawValue instanceof Date) {
    return Number.isNaN(rawValue.getTime()) ? { valid: false } : { valid: true, value: rawValue }
  }

  if (typeof rawValue !== 'string') {
    return { valid: false }
  }

  const value = rawValue.trim()
  if (!value) return { valid: false }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { valid: false }

  return { valid: true, value }
}

const validateOptionalStringArray = (
  payload: RecordLike,
  field: string
): { valid: boolean; value?: string[] } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true }
  }

  if (!Array.isArray(payload[field])) {
    return { valid: false }
  }

  const parsed: string[] = []
  for (const item of payload[field] as unknown[]) {
    if (typeof item !== 'string') return { valid: false }
    const normalized = item.trim()
    if (!normalized) return { valid: false }
    parsed.push(normalized)
  }

  return { valid: true, value: parsed }
}

const validateOptionalEnumArray = <T extends string>(
  payload: RecordLike,
  field: string,
  allowedValues: readonly T[]
): { valid: boolean; value?: T[] } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true }
  }

  if (!Array.isArray(payload[field])) {
    return { valid: false }
  }

  const parsed: T[] = []
  for (const item of payload[field] as unknown[]) {
    if (typeof item !== 'string') return { valid: false }
    const normalized = item.trim()
    if (!normalized || !allowedValues.includes(normalized as T)) {
      return { valid: false }
    }
    parsed.push(normalized as T)
  }

  return { valid: true, value: parsed }
}

const validateOptionalObjectField = (
  payload: RecordLike,
  field: string
): { valid: boolean; hasValue: boolean; value?: RecordLike } => {
  if (!(field in payload) || payload[field] === undefined || payload[field] === null) {
    return { valid: true, hasValue: false }
  }

  if (!isRecord(payload[field])) {
    return { valid: false, hasValue: true }
  }

  return { valid: true, hasValue: true, value: payload[field] as RecordLike }
}

const validateRequiredRouteParam = (
  req: Request,
  res: Response,
  paramName: string
): string | null => {
  const value = trimString(req.params[paramName])
  if (!value) {
    respondValidationError(res, `Parametro ${paramName} obrigatorio.`)
    return null
  }
  return value
}

const readHeaderString = (req: Request, headerName: string): string | undefined => {
  const value = req.headers[headerName]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.find((entry) => typeof entry === 'string')
  return undefined
}

const validateAdminReasonFromBodyOrHeader = (
  req: Request,
  res: Response,
  errorMessage: string
): boolean => {
  const reasonFromBody =
    isRecord(req.body) && typeof req.body.reason === 'string' ? req.body.reason.trim() : ''
  const reasonFromHeader = (readHeaderString(req, 'x-admin-reason') || '').trim()

  if (!reasonFromBody && !reasonFromHeader) {
    respondValidationError(res, errorMessage)
    return false
  }

  return true
}

const validateAdminContentAccessPolicyMatchPayload = (
  payload: RecordLike
): { valid: boolean; hasValue: boolean } => {
  const matchResult = validateOptionalObjectField(payload, 'match')
  if (!matchResult.valid) return { valid: false, hasValue: true }
  if (!matchResult.hasValue || !matchResult.value) return { valid: true, hasValue: false }

  const matchPayload = matchResult.value
  const allowedKeys = new Set(['contentTypes', 'categories', 'tags', 'featuredOnly'])
  for (const key of Object.keys(matchPayload)) {
    if (!allowedKeys.has(key)) return { valid: false, hasValue: true }
  }

  const contentTypes = validateOptionalEnumArray<ContentAccessPolicyContentType>(
    matchPayload,
    'contentTypes',
    CONTENT_ACCESS_POLICY_CONTENT_TYPES
  )
  if (!contentTypes.valid) return { valid: false, hasValue: true }

  const categories = validateOptionalEnumArray<ContentAccessPolicyCategory>(
    matchPayload,
    'categories',
    CONTENT_ACCESS_POLICY_CATEGORIES
  )
  if (!categories.valid) return { valid: false, hasValue: true }

  const tags = validateOptionalStringArray(matchPayload, 'tags')
  if (!tags.valid) return { valid: false, hasValue: true }

  const featuredOnly = validateOptionalBoolean(matchPayload, 'featuredOnly')
  if (!featuredOnly.valid) return { valid: false, hasValue: true }

  return { valid: true, hasValue: true }
}

const validateAdminContentAccessPolicyAccessPayload = (
  payload: RecordLike
): { valid: boolean; hasValue: boolean } => {
  const accessResult = validateOptionalObjectField(payload, 'access')
  if (!accessResult.valid) return { valid: false, hasValue: true }
  if (!accessResult.hasValue || !accessResult.value) return { valid: true, hasValue: false }

  const accessPayload = accessResult.value
  const allowedKeys = new Set(['requiredRole', 'teaserAllowed', 'blockedMessage'])
  for (const key of Object.keys(accessPayload)) {
    if (!allowedKeys.has(key)) return { valid: false, hasValue: true }
  }

  const requiredRole = validateOptionalEnum<ContentAccessPolicyRequiredRole>(
    accessPayload,
    'requiredRole',
    CONTENT_ACCESS_POLICY_REQUIRED_ROLES
  )
  if (!requiredRole.valid) return { valid: false, hasValue: true }

  const teaserAllowed = validateOptionalBoolean(accessPayload, 'teaserAllowed')
  if (!teaserAllowed.valid) return { valid: false, hasValue: true }

  const blockedMessage = validateOptionalString(accessPayload, 'blockedMessage')
  if (!blockedMessage.valid) return { valid: false, hasValue: true }

  return { valid: true, hasValue: true }
}

const validateAdminContentAccessPolicyPayload = (
  payload: RecordLike,
  res: Response,
  options: { requireCodeAndLabel?: boolean; requireMutableField?: boolean } = {}
): boolean => {
  const allowedKeys = new Set([
    'code',
    'label',
    'description',
    'active',
    'priority',
    'effectiveFrom',
    'effectiveTo',
    'changeReason',
    'match',
    'access',
  ])

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na policy de acesso.`)
      return false
    }
  }

  if (options.requireCodeAndLabel) {
    const code = validateRequiredNonEmptyString(payload, 'code')
    const label = validateRequiredNonEmptyString(payload, 'label')
    if (!code || !label) {
      respondValidationError(res, 'Campos obrigatorios em falta: code, label.')
      return false
    }
  } else {
    const code = validateOptionalString(payload, 'code')
    if (!code.valid) {
      respondValidationError(res, 'Campo code invalido.')
      return false
    }

    const label = validateOptionalString(payload, 'label')
    if (!label.valid) {
      respondValidationError(res, 'Campo label invalido.')
      return false
    }
  }

  const description = validateOptionalString(payload, 'description')
  if (!description.valid) {
    respondValidationError(res, 'Campo description invalido.')
    return false
  }

  const active = validateOptionalBoolean(payload, 'active')
  if (!active.valid) {
    respondValidationError(res, 'Campo active invalido.')
    return false
  }

  const priority = validateOptionalPositiveInteger(payload, 'priority')
  if (!priority.valid) {
    respondValidationError(res, 'Campo priority invalido.')
    return false
  }

  const effectiveFrom = validateOptionalDateField(payload, 'effectiveFrom', { allowNull: true })
  if (!effectiveFrom.valid) {
    respondValidationError(res, 'Campo effectiveFrom invalido.')
    return false
  }

  const effectiveTo = validateOptionalDateField(payload, 'effectiveTo', { allowNull: true })
  if (!effectiveTo.valid) {
    respondValidationError(res, 'Campo effectiveTo invalido.')
    return false
  }

  const changeReason = validateOptionalString(payload, 'changeReason')
  if (!changeReason.valid) {
    respondValidationError(res, 'Campo changeReason invalido.')
    return false
  }

  const match = validateAdminContentAccessPolicyMatchPayload(payload)
  if (!match.valid) {
    respondValidationError(res, 'Campo match invalido.')
    return false
  }

  const access = validateAdminContentAccessPolicyAccessPayload(payload)
  if (!access.valid) {
    respondValidationError(res, 'Campo access invalido.')
    return false
  }

  if (options.requireMutableField) {
    const hasMutableField = [
      'label',
      'description',
      'active',
      'priority',
      'effectiveFrom',
      'effectiveTo',
      'match',
      'access',
    ].some((key) => key in payload)

    if (!hasMutableField) {
      respondValidationError(
        res,
        'Payload sem alteracoes de policy. Envia label, description, active, priority, effectiveFrom, effectiveTo, match ou access.'
      )
      return false
    }
  }

  return true
}

const validateAdminModerationTemplatePayload = (
  payload: RecordLike,
  res: Response,
  options: { requireCreateFields?: boolean; requireMutableField?: boolean } = {}
): boolean => {
  const allowedKeys = new Set([
    'code',
    'label',
    'reason',
    'defaultNote',
    'tags',
    'active',
    'requiresNote',
    'requiresDoubleConfirm',
    'changeReason',
  ])

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no template de moderacao.`)
      return false
    }
  }

  if (options.requireCreateFields) {
    const code = validateRequiredNonEmptyString(payload, 'code')
    const label = validateRequiredNonEmptyString(payload, 'label')
    const reason = validateRequiredNonEmptyString(payload, 'reason')
    if (!code || !label || !reason) {
      respondValidationError(res, 'Campos obrigatorios em falta: code, label, reason.')
      return false
    }
  } else {
    const code = validateOptionalString(payload, 'code')
    if (!code.valid) {
      respondValidationError(res, 'Campo code invalido.')
      return false
    }

    const label = validateOptionalString(payload, 'label')
    if (!label.valid) {
      respondValidationError(res, 'Campo label invalido.')
      return false
    }

    const reason = validateOptionalString(payload, 'reason')
    if (!reason.valid) {
      respondValidationError(res, 'Campo reason invalido.')
      return false
    }
  }

  const defaultNote = validateOptionalString(payload, 'defaultNote')
  if (!defaultNote.valid) {
    respondValidationError(res, 'Campo defaultNote invalido.')
    return false
  }

  const tags = validateOptionalStringArray(payload, 'tags')
  if (!tags.valid) {
    respondValidationError(res, 'Campo tags invalido.')
    return false
  }

  const active = validateOptionalBoolean(payload, 'active')
  if (!active.valid) {
    respondValidationError(res, 'Campo active invalido.')
    return false
  }

  const requiresNote = validateOptionalBoolean(payload, 'requiresNote')
  if (!requiresNote.valid) {
    respondValidationError(res, 'Campo requiresNote invalido.')
    return false
  }

  const requiresDoubleConfirm = validateOptionalBoolean(payload, 'requiresDoubleConfirm')
  if (!requiresDoubleConfirm.valid) {
    respondValidationError(res, 'Campo requiresDoubleConfirm invalido.')
    return false
  }

  const changeReason = validateOptionalString(payload, 'changeReason')
  if (!changeReason.valid) {
    respondValidationError(res, 'Campo changeReason invalido.')
    return false
  }

  if (options.requireMutableField) {
    const hasMutableField = [
      'label',
      'reason',
      'defaultNote',
      'tags',
      'active',
      'requiresNote',
      'requiresDoubleConfirm',
    ].some((key) => key in payload)

    if (!hasMutableField) {
      respondValidationError(
        res,
        'Payload sem alteracoes de template. Envia label, reason, defaultNote, tags, active, requiresNote ou requiresDoubleConfirm.'
      )
      return false
    }
  }

  return true
}

const validateAdminBroadcastSegmentPayload = (
  payload: RecordLike
): { valid: boolean; hasValue: boolean } => {
  const segmentResult = validateOptionalObjectField(payload, 'segment')
  if (!segmentResult.valid) return { valid: false, hasValue: true }
  if (!segmentResult.hasValue || !segmentResult.value) return { valid: true, hasValue: false }

  const segmentPayload = segmentResult.value
  const allowedKeys = new Set([
    'roles',
    'accountStatuses',
    'includeUsers',
    'excludeUsers',
    'lastActiveWithinDays',
  ])
  for (const key of Object.keys(segmentPayload)) {
    if (!allowedKeys.has(key)) return { valid: false, hasValue: true }
  }

  const roles = validateOptionalEnumArray<AdminBroadcastRole>(
    segmentPayload,
    'roles',
    ADMIN_BROADCAST_ROLES
  )
  if (!roles.valid) return { valid: false, hasValue: true }

  const accountStatuses = validateOptionalEnumArray<AdminBroadcastAccountStatus>(
    segmentPayload,
    'accountStatuses',
    ADMIN_BROADCAST_ACCOUNT_STATUSES
  )
  if (!accountStatuses.valid) return { valid: false, hasValue: true }

  const includeUsers = validateOptionalStringArray(segmentPayload, 'includeUsers')
  if (!includeUsers.valid) return { valid: false, hasValue: true }

  const excludeUsers = validateOptionalStringArray(segmentPayload, 'excludeUsers')
  if (!excludeUsers.valid) return { valid: false, hasValue: true }

  const lastActiveWithinDays = validateOptionalPositiveInteger(segmentPayload, 'lastActiveWithinDays')
  if (!lastActiveWithinDays.valid) return { valid: false, hasValue: true }

  return { valid: true, hasValue: true }
}

export const validateAuthRegisterContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de registo invalido.')
    return
  }

  const email = validateRequiredNonEmptyString(req.body, 'email')
  const password = validateRequiredNonEmptyString(req.body, 'password')
  const name = validateRequiredNonEmptyString(req.body, 'name')
  const username = validateRequiredNonEmptyString(req.body, 'username')

  if (!email || !password || !name || !username) {
    respondValidationError(res, 'Campos obrigatorios em falta: email, password, name, username.')
    return
  }

  const role = validateOptionalString(req.body, 'role')
  if (!role.valid) {
    respondValidationError(res, 'Campo role invalido.')
    return
  }

  const captchaToken = validateOptionalString(req.body, 'captchaToken')
  if (!captchaToken.valid) {
    respondValidationError(res, 'Campo captchaToken invalido.')
    return
  }

  const legalAcceptanceRaw = req.body.legalAcceptance
  if (!isRecord(legalAcceptanceRaw)) {
    respondValidationError(res, 'Campo legalAcceptance obrigatorio no registo.')
    return
  }

  if (
    legalAcceptanceRaw.termsAccepted !== true ||
    legalAcceptanceRaw.privacyAccepted !== true ||
    legalAcceptanceRaw.financialDisclaimerAccepted !== true
  ) {
    respondValidationError(
      res,
      'Aceitacao legal invalida.',
      {
        required: ['termsAccepted', 'privacyAccepted', 'financialDisclaimerAccepted'],
      }
    )
    return
  }

  const legalVersion = validateOptionalString(legalAcceptanceRaw, 'version')
  if (!legalVersion.valid) {
    respondValidationError(res, 'Campo legalAcceptance.version invalido.')
    return
  }

  const cookieConsentRaw = req.body.cookieConsent
  if (cookieConsentRaw !== undefined && cookieConsentRaw !== null) {
    if (!isRecord(cookieConsentRaw)) {
      respondValidationError(res, 'Campo cookieConsent invalido.')
      return
    }

    for (const key of ['analytics', 'marketing', 'preferences'] as const) {
      const result = validateOptionalBoolean(cookieConsentRaw, key)
      if (!result.valid) {
        respondValidationError(res, `Campo cookieConsent.${key} invalido.`)
        return
      }
    }

    const consentVersion = validateOptionalString(cookieConsentRaw, 'version')
    if (!consentVersion.valid) {
      respondValidationError(res, 'Campo cookieConsent.version invalido.')
      return
    }
  }

  next()
}

export const validateAuthLoginContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de login invalido.')
    return
  }

  const email = validateRequiredNonEmptyString(req.body, 'email')
  const password = validateRequiredNonEmptyString(req.body, 'password')
  if (!email || !password) {
    respondValidationError(res, 'Campos obrigatorios em falta: email, password.')
    return
  }

  const captchaToken = validateOptionalString(req.body, 'captchaToken')
  if (!captchaToken.valid) {
    respondValidationError(res, 'Campo captchaToken invalido.')
    return
  }

  next()
}

export const validateAuthForgotPasswordContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de forgot-password invalido.')
    return
  }

  const email = validateRequiredNonEmptyString(req.body, 'email')
  if (!email) {
    respondValidationError(res, 'Campo email obrigatorio.')
    return
  }

  next()
}

export const validateAuthResetPasswordContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de reset-password invalido.')
    return
  }

  const token = validateRequiredNonEmptyString(req.body, 'token')
  const newPassword = validateRequiredNonEmptyString(req.body, 'newPassword')
  if (!token || !newPassword) {
    respondValidationError(res, 'Campos obrigatorios em falta: token, newPassword.')
    return
  }

  next()
}

export const validateAuthRefreshContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de refresh invalido.')
    return
  }

  const refreshToken = validateRequiredNonEmptyString(req.body, 'refreshToken')
  if (!refreshToken) {
    respondValidationError(res, 'Campo refreshToken obrigatorio.')
    return
  }

  next()
}

export const validateAuthVerifyEmailQueryContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = trimString(req.query.token)
  if (!token) {
    respondValidationError(res, 'Parametro query token obrigatorio.')
    return
  }

  next()
}

export const validateAuthCookieConsentContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de cookie-consent invalido.')
    return
  }

  for (const key of ['analytics', 'marketing', 'preferences'] as const) {
    const result = validateOptionalBoolean(req.body, key)
    if (!result.valid) {
      respondValidationError(res, `Campo ${key} invalido.`)
      return
    }
  }

  const version = validateOptionalString(req.body, 'version')
  if (!version.valid) {
    respondValidationError(res, 'Campo version invalido.')
    return
  }

  next()
}

export const validateAdminSurfaceControlContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const surfaceKey = trimString(req.params.surfaceKey)
  if (!surfaceKey) {
    respondValidationError(res, 'Parametro surfaceKey obrigatorio.')
    return
  }

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de superficie invalido.')
    return
  }

  if (typeof req.body.enabled !== 'boolean') {
    respondValidationError(res, 'Campo enabled obrigatorio (boolean).')
    return
  }

  const reason = validateRequiredNonEmptyString(req.body, 'reason')
  if (!reason) {
    respondValidationError(res, 'Campo reason obrigatorio.')
    return
  }

  for (const key of ['note', 'publicMessage'] as const) {
    const result = validateOptionalString(req.body, key)
    if (!result.valid) {
      respondValidationError(res, `Campo ${key} invalido.`)
      return
    }
  }

  next()
}

export const validateAdminAssistedSessionRequestContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de pedido de sessao assistida invalido.')
    return
  }

  const targetUserId = validateRequiredNonEmptyString(req.body, 'targetUserId')
  if (!targetUserId) {
    respondValidationError(res, 'Campo targetUserId obrigatorio.')
    return
  }

  const reason = validateRequiredNonEmptyString(req.body, 'reason')
  if (!reason) {
    respondValidationError(res, 'Campo reason obrigatorio.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const consentTtl = validateOptionalPositiveInteger(req.body, 'consentTtlMinutes')
  if (!consentTtl.valid) {
    respondValidationError(res, 'Campo consentTtlMinutes invalido.')
    return
  }

  const sessionTtl = validateOptionalPositiveInteger(req.body, 'sessionTtlMinutes')
  if (!sessionTtl.valid) {
    respondValidationError(res, 'Campo sessionTtlMinutes invalido.')
    return
  }

  next()
}

export const validateAdminSessionIdParamContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sessionId = trimString(req.params.sessionId)
  if (!sessionId) {
    respondValidationError(res, 'Parametro sessionId obrigatorio.')
    return
  }

  next()
}

export const validateAdminSessionRevokeContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sessionId = trimString(req.params.sessionId)
  if (!sessionId) {
    respondValidationError(res, 'Parametro sessionId obrigatorio.')
    return
  }

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de revogacao de sessao assistida invalido.')
    return
  }

  const reason = validateRequiredNonEmptyString(req.body, 'reason')
  if (!reason) {
    respondValidationError(res, 'Campo reason obrigatorio.')
    return
  }

  next()
}

export const validateAdminDashboardPersonalizationPatchContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de personalizacao do dashboard invalido.')
    return
  }

  const allowedKeys = new Set([
    'preset',
    'density',
    'theme',
    'refreshSeconds',
    'layout',
    'pinnedFilters',
    'reason',
    'note',
  ])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na personalizacao do dashboard.`)
      return
    }
  }

  const preset = validateOptionalEnum<DashboardPreset>(req.body, 'preset', [
    'operations',
    'moderation',
    'monetization',
    'custom',
  ])
  if (!preset.valid) {
    respondValidationError(res, 'Campo preset invalido.')
    return
  }

  const density = validateOptionalEnum<DashboardDensity>(req.body, 'density', [
    'comfortable',
    'compact',
  ])
  if (!density.valid) {
    respondValidationError(res, 'Campo density invalido.')
    return
  }

  const theme = validateOptionalEnum<DashboardTheme>(req.body, 'theme', ['system', 'light', 'dark'])
  if (!theme.valid) {
    respondValidationError(res, 'Campo theme invalido.')
    return
  }

  const refreshSeconds = validateOptionalPositiveInteger(req.body, 'refreshSeconds')
  if (!refreshSeconds.valid) {
    respondValidationError(res, 'Campo refreshSeconds invalido.')
    return
  }

  const layout = validateAdminDashboardLayoutPayload(req.body)
  if (!layout.valid) {
    respondValidationError(res, 'Campo layout invalido.')
    return
  }

  const pinnedFilters = validateAdminDashboardPinnedFiltersPayload(req.body)
  if (!pinnedFilters.valid) {
    respondValidationError(res, 'Campo pinnedFilters invalido.')
    return
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const hasPatchField =
    'preset' in req.body ||
    'density' in req.body ||
    'theme' in req.body ||
    'refreshSeconds' in req.body ||
    layout.hasValue ||
    pinnedFilters.hasValue
  if (!hasPatchField) {
    respondValidationError(
      res,
      'Payload sem campos de personalizacao. Envia preset, density, theme, refreshSeconds, layout ou pinnedFilters.'
    )
    return
  }

  next()
}

export const validateAdminDashboardPersonalizationResetContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de reset da personalizacao do dashboard invalido.')
    return
  }

  const allowedKeys = new Set(['preset', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no reset de personalizacao.`)
      return
    }
  }

  const preset = validateOptionalEnum<DashboardPreset>(req.body, 'preset', [
    'operations',
    'moderation',
    'monetization',
    'custom',
  ])
  if (!preset.valid) {
    respondValidationError(res, 'Campo preset invalido.')
    return
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  next()
}

export const validateAdminBulkImportPreviewContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de preview de bulk import invalido.')
    return
  }

  const allowedKeys = new Set(['importType', 'csv', 'delimiter'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no preview de bulk import.`)
      return
    }
  }

  const importType = validateOptionalEnum<BulkImportType>(req.body, 'importType', [
    'subscription_entitlements',
    'ad_campaign_status',
  ])
  if (!importType.valid || !importType.value) {
    respondValidationError(res, 'Campo importType invalido.')
    return
  }

  const csv = validateRequiredNonEmptyString(req.body, 'csv')
  if (!csv) {
    respondValidationError(res, 'Campo csv obrigatorio.')
    return
  }

  const delimiter = validateOptionalDelimiter(req.body, 'delimiter')
  if (!delimiter.valid) {
    respondValidationError(res, 'Campo delimiter invalido.')
    return
  }

  next()
}

export const validateAdminBulkImportCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de execucao de bulk import invalido.')
    return
  }

  const allowedKeys = new Set(['importType', 'csv', 'delimiter', 'dryRun', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na execucao de bulk import.`)
      return
    }
  }

  const importType = validateOptionalEnum<BulkImportType>(req.body, 'importType', [
    'subscription_entitlements',
    'ad_campaign_status',
  ])
  if (!importType.valid || !importType.value) {
    respondValidationError(res, 'Campo importType invalido.')
    return
  }

  const csv = validateRequiredNonEmptyString(req.body, 'csv')
  if (!csv) {
    respondValidationError(res, 'Campo csv obrigatorio.')
    return
  }

  const delimiter = validateOptionalDelimiter(req.body, 'delimiter')
  if (!delimiter.valid) {
    respondValidationError(res, 'Campo delimiter invalido.')
    return
  }

  const dryRun = validateOptionalBoolean(req.body, 'dryRun')
  if (!dryRun.valid) {
    respondValidationError(res, 'Campo dryRun invalido.')
    return
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const reasonFromBody = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''
  const reasonFromHeader = (readHeaderString(req, 'x-admin-reason') || '').trim()
  if (!reasonFromBody && !reasonFromHeader) {
    respondValidationError(res, 'Motivo obrigatorio para executar bulk import.')
    return
  }

  next()
}

export const validateAdminContentAccessPolicyPreviewContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de preview de policy de acesso invalido.')
    return
  }

  const isValid = validateAdminContentAccessPolicyPayload(req.body, res)
  if (!isValid) return

  next()
}

export const validateAdminContentAccessPolicyCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de policy de acesso invalido.')
    return
  }

  const isValid = validateAdminContentAccessPolicyPayload(req.body, res, {
    requireCodeAndLabel: true,
  })
  if (!isValid) return

  next()
}

export const validateAdminContentAccessPolicyUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const policyId = validateRequiredRouteParam(req, res, 'policyId')
  if (!policyId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de policy de acesso invalido.')
    return
  }

  const isValid = validateAdminContentAccessPolicyPayload(req.body, res, {
    requireMutableField: true,
  })
  if (!isValid) return

  next()
}

export const validateAdminContentAccessPolicySetActiveContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const policyId = validateRequiredRouteParam(req, res, 'policyId')
  if (!policyId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de alteracao de estado da policy de acesso invalido.')
    return
  }

  const allowedKeys = new Set(['changeReason'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na alteracao de estado da policy.`)
      return
    }
  }

  const changeReason = validateOptionalString(req.body, 'changeReason')
  if (!changeReason.valid) {
    respondValidationError(res, 'Campo changeReason invalido.')
    return
  }

  next()
}

export const validateAdminModerationAppealStatusContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const appealId = validateRequiredRouteParam(req, res, 'appealId')
  if (!appealId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de estado da apelacao invalido.')
    return
  }

  const allowedKeys = new Set(['status', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na atualizacao de apelacao.`)
      return
    }
  }

  const status = validateRequiredNonEmptyString(req.body, 'status')
  if (!status || !MODERATION_APPEAL_STATUSES.includes(status as ModerationAppealStatus)) {
    respondValidationError(res, 'Campo status invalido.')
    return
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para atualizar estado da apelacao.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminSubscriptionExtendTrialContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = validateRequiredRouteParam(req, res, 'userId')
  if (!userId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de extensao de trial invalido.')
    return
  }

  const allowedKeys = new Set(['days', 'trialEndsAt', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na extensao de trial.`)
      return
    }
  }

  const days = validateOptionalPositiveInteger(req.body, 'days')
  if (!days.valid) {
    respondValidationError(res, 'Campo days invalido.')
    return
  }

  const trialEndsAt = validateOptionalDateField(req.body, 'trialEndsAt', { allowNull: true })
  if (!trialEndsAt.valid) {
    respondValidationError(res, 'Campo trialEndsAt invalido.')
    return
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para estender trial.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminSubscriptionRevokeEntitlementContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = validateRequiredRouteParam(req, res, 'userId')
  if (!userId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de revogacao de entitlement invalido.')
    return
  }

  const allowedKeys = new Set(['nextStatus', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na revogacao de entitlement.`)
      return
    }
  }

  const nextStatus = validateOptionalEnum<'past_due' | 'canceled'>(req.body, 'nextStatus', [
    'past_due',
    'canceled',
  ])
  if (!nextStatus.valid) {
    respondValidationError(res, 'Campo nextStatus invalido.')
    return
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para revogar entitlement.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminSubscriptionReactivateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = validateRequiredRouteParam(req, res, 'userId')
  if (!userId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de reativacao de subscricao invalido.')
    return
  }

  const allowedKeys = new Set([
    'periodDays',
    'planCode',
    'planLabel',
    'billingCycle',
    'reason',
    'note',
  ])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na reativacao de subscricao.`)
      return
    }
  }

  const periodDays = validateOptionalPositiveInteger(req.body, 'periodDays')
  if (!periodDays.valid) {
    respondValidationError(res, 'Campo periodDays invalido.')
    return
  }

  const planCode = validateOptionalString(req.body, 'planCode')
  if (!planCode.valid) {
    respondValidationError(res, 'Campo planCode invalido.')
    return
  }

  const planLabel = validateOptionalString(req.body, 'planLabel')
  if (!planLabel.valid) {
    respondValidationError(res, 'Campo planLabel invalido.')
    return
  }

  const billingCycle = validateOptionalEnum<SubscriptionBillingCycle>(
    req.body,
    'billingCycle',
    SUBSCRIPTION_BILLING_CYCLES
  )
  if (!billingCycle.valid) {
    respondValidationError(res, 'Campo billingCycle invalido.')
    return
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para reativar subscricao.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminModerationTemplateCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de template de moderacao invalido.')
    return
  }

  const isValid = validateAdminModerationTemplatePayload(req.body, res, {
    requireCreateFields: true,
  })
  if (!isValid) return

  next()
}

export const validateAdminModerationTemplateUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const templateId = validateRequiredRouteParam(req, res, 'templateId')
  if (!templateId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de template de moderacao invalido.')
    return
  }

  const isValid = validateAdminModerationTemplatePayload(req.body, res, {
    requireMutableField: true,
  })
  if (!isValid) return

  next()
}

export const validateAdminModerationTemplateSetActiveContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const templateId = validateRequiredRouteParam(req, res, 'templateId')
  if (!templateId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de alteracao de estado do template de moderacao invalido.')
    return
  }

  const allowedKeys = new Set(['changeReason'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na alteracao de estado do template.`)
      return
    }
  }

  const changeReason = validateOptionalString(req.body, 'changeReason')
  if (!changeReason.valid) {
    respondValidationError(res, 'Campo changeReason invalido.')
    return
  }

  next()
}

export const validateAdminBroadcastPreviewContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de preview de broadcast invalido.')
    return
  }

  const allowedKeys = new Set(['segment', 'sampleLimit'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no preview de broadcast.`)
      return
    }
  }

  const sampleLimit = validateOptionalPositiveInteger(req.body, 'sampleLimit')
  if (!sampleLimit.valid) {
    respondValidationError(res, 'Campo sampleLimit invalido.')
    return
  }

  const segment = validateAdminBroadcastSegmentPayload(req.body)
  if (!segment.valid) {
    respondValidationError(res, 'Campo segment invalido.')
    return
  }

  next()
}

export const validateAdminBroadcastCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de broadcast invalido.')
    return
  }

  const allowedKeys = new Set(['title', 'message', 'channel', 'segment', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na criacao de broadcast.`)
      return
    }
  }

  const title = validateRequiredNonEmptyString(req.body, 'title')
  const message = validateRequiredNonEmptyString(req.body, 'message')
  if (!title || !message) {
    respondValidationError(res, 'Campos obrigatorios em falta: title, message.')
    return
  }

  const channel = validateOptionalEnum<AdminBroadcastChannel>(
    req.body,
    'channel',
    ADMIN_BROADCAST_CHANNELS
  )
  if (!channel.valid) {
    respondValidationError(res, 'Campo channel invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const segment = validateAdminBroadcastSegmentPayload(req.body)
  if (!segment.valid) {
    respondValidationError(res, 'Campo segment invalido.')
    return
  }

  next()
}

export const validateAdminBroadcastApproveContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const broadcastId = validateRequiredRouteParam(req, res, 'broadcastId')
  if (!broadcastId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de aprovacao de broadcast invalido.')
    return
  }

  const allowedKeys = new Set(['reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na aprovacao de broadcast.`)
      return
    }
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para aprovar broadcast.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminBroadcastSendContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const broadcastId = validateRequiredRouteParam(req, res, 'broadcastId')
  if (!broadcastId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de envio de broadcast invalido.')
    return
  }

  const allowedKeys = new Set(['reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no envio de broadcast.`)
      return
    }
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para enviar broadcast.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminContentScheduleUnhideContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de agendamento de unhide invalido.')
    return
  }

  const allowedKeys = new Set(['scheduledFor', 'scheduleAt', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no agendamento de unhide.`)
      return
    }
  }

  const reason = validateOptionalString(req.body, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return
  }

  const note = validateOptionalString(req.body, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return
  }

  const reasonFromBody = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''
  const reasonFromHeader = (readHeaderString(req, 'x-admin-reason') || '').trim()
  if (!reasonFromBody && !reasonFromHeader) {
    respondValidationError(res, 'Motivo obrigatorio para agendar unhide.')
    return
  }

  const scheduledRaw =
    typeof req.body.scheduledFor === 'string'
      ? req.body.scheduledFor.trim()
      : typeof req.body.scheduleAt === 'string'
        ? req.body.scheduleAt.trim()
        : ''

  if (!scheduledRaw) {
    respondValidationError(res, 'Campo scheduledFor obrigatorio para agendar unhide.')
    return
  }

  const parsed = new Date(scheduledRaw)
  if (Number.isNaN(parsed.getTime())) {
    respondValidationError(res, 'Campo scheduledFor invalido.')
    return
  }

  if (parsed.getTime() <= Date.now()) {
    respondValidationError(res, 'Campo scheduledFor deve ser uma data futura.')
    return
  }

  next()
}
