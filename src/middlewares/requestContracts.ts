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
type AdPartnershipType = 'external_ads' | 'sponsored_ads' | 'house_ads' | 'value_ads'
type AdPartnershipVisibility = 'free' | 'premium' | 'all'
type AdPartnershipSurface =
  | 'home_feed'
  | 'tools'
  | 'directory'
  | 'content'
  | 'learning'
  | 'community'
  | 'dashboard'
  | 'profile'
type AdPartnershipPosition =
  | 'sidebar'
  | 'inline'
  | 'footer'
  | 'header'
  | 'banner'
  | 'card'
  | 'comparison_strip'
type AdPartnershipDevice = 'all' | 'desktop' | 'mobile'
type AdPartnershipCampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected'
  | 'archived'
type AdPartnershipSponsorType = 'brand' | 'creator' | 'platform'
type FinancialToolKey = 'stocks' | 'etf' | 'reit' | 'crypto'
type FinancialToolEnvironment = 'development' | 'staging' | 'production'
type FinancialToolExperienceMode = 'legacy' | 'standard' | 'enhanced'
type PlatformIntegrationKey =
  | 'analytics_posthog'
  | 'analytics_google_analytics'
  | 'analytics_google_tag_manager'
  | 'analytics_meta_pixel'
  | 'captcha_client'
  | 'seo_defaults'
type BrandWalletTransactionType = 'top_up' | 'campaign_spend' | 'refund' | 'manual_adjustment'
type BrandWalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
type PublicDirectoryVerticalType =
  | 'broker'
  | 'exchange'
  | 'site'
  | 'app'
  | 'podcast'
  | 'event'
  | 'insurance'
  | 'bank'
  | 'fund'
  | 'fintech'
  | 'newsletter'
  | 'other'
type PublicDirectoryVerificationStatus = 'unverified' | 'pending' | 'verified'
type PublicDirectorySortBy = 'featured' | 'popular' | 'rating' | 'recent' | 'name'

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
const AD_PARTNERSHIP_TYPES: readonly AdPartnershipType[] = [
  'external_ads',
  'sponsored_ads',
  'house_ads',
  'value_ads',
]
const AD_PARTNERSHIP_VISIBILITY: readonly AdPartnershipVisibility[] = ['free', 'premium', 'all']
const AD_PARTNERSHIP_SURFACES: readonly AdPartnershipSurface[] = [
  'home_feed',
  'tools',
  'directory',
  'content',
  'learning',
  'community',
  'dashboard',
  'profile',
]
const AD_PARTNERSHIP_POSITIONS: readonly AdPartnershipPosition[] = [
  'sidebar',
  'inline',
  'footer',
  'header',
  'banner',
  'card',
  'comparison_strip',
]
const AD_PARTNERSHIP_DEVICES: readonly AdPartnershipDevice[] = ['all', 'desktop', 'mobile']
const AD_PARTNERSHIP_CAMPAIGN_STATUSES: readonly AdPartnershipCampaignStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'completed',
  'rejected',
  'archived',
]
const AD_PARTNERSHIP_SPONSOR_TYPES: readonly AdPartnershipSponsorType[] = [
  'brand',
  'creator',
  'platform',
]
const FINANCIAL_TOOL_KEYS: readonly FinancialToolKey[] = ['stocks', 'etf', 'reit', 'crypto']
const FINANCIAL_TOOL_ENVIRONMENTS: readonly FinancialToolEnvironment[] = [
  'development',
  'staging',
  'production',
]
const FINANCIAL_TOOL_EXPERIENCE_MODES: readonly FinancialToolExperienceMode[] = [
  'legacy',
  'standard',
  'enhanced',
]
const PLATFORM_INTEGRATION_KEYS: readonly PlatformIntegrationKey[] = [
  'analytics_posthog',
  'analytics_google_analytics',
  'analytics_google_tag_manager',
  'analytics_meta_pixel',
  'captcha_client',
  'seo_defaults',
]
const BRAND_WALLET_TRANSACTION_TYPES: readonly BrandWalletTransactionType[] = [
  'top_up',
  'campaign_spend',
  'refund',
  'manual_adjustment',
]
const BRAND_WALLET_TRANSACTION_STATUSES: readonly BrandWalletTransactionStatus[] = [
  'pending',
  'completed',
  'failed',
  'cancelled',
]
const PUBLIC_DIRECTORY_VERTICAL_TYPES: readonly PublicDirectoryVerticalType[] = [
  'broker',
  'exchange',
  'site',
  'app',
  'podcast',
  'event',
  'insurance',
  'bank',
  'fund',
  'fintech',
  'newsletter',
  'other',
]
const PUBLIC_DIRECTORY_VERIFICATION_STATUSES: readonly PublicDirectoryVerificationStatus[] = [
  'unverified',
  'pending',
  'verified',
]
const PUBLIC_DIRECTORY_SORT_OPTIONS: readonly PublicDirectorySortBy[] = [
  'featured',
  'popular',
  'rating',
  'recent',
  'name',
]
const BRAND_INTEGRATION_ALLOWED_SCOPES = ['brand.affiliate.read'] as const

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

const validateOptionalNonNegativeInteger = (
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
  if (!Number.isInteger(value) || value < 0) {
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

const readSingleQueryValue = (
  value: unknown
): { present: boolean; valid: boolean; value?: string } => {
  if (value === undefined) {
    return { present: false, valid: true }
  }

  if (Array.isArray(value)) {
    return { present: true, valid: false }
  }

  if (typeof value !== 'string') {
    return { present: true, valid: false }
  }

  return { present: true, valid: true, value: value.trim() }
}

const parseOptionalBooleanQuery = (value: unknown): { present: boolean; valid: boolean } => {
  const result = readSingleQueryValue(value)
  if (!result.present) {
    return { present: false, valid: true }
  }

  if (!result.valid || !result.value) {
    return { present: true, valid: false }
  }

  const normalized = result.value.toLowerCase()
  if (normalized === 'true' || normalized === 'false' || normalized === '1' || normalized === '0') {
    return { present: true, valid: true }
  }

  return { present: true, valid: false }
}

const parseOptionalPositiveIntegerQuery = (
  value: unknown
): { present: boolean; valid: boolean; value?: number } => {
  const result = readSingleQueryValue(value)
  if (!result.present) {
    return { present: false, valid: true }
  }

  if (!result.valid || !result.value) {
    return { present: true, valid: false }
  }

  const parsed = Number.parseInt(result.value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return { present: true, valid: false }
  }

  return { present: true, valid: true, value: parsed }
}

const parseOptionalIntegerQuery = (
  value: unknown
): { present: boolean; valid: boolean; value?: number } => {
  const result = readSingleQueryValue(value)
  if (!result.present) {
    return { present: false, valid: true }
  }

  if (!result.valid || !result.value) {
    return { present: true, valid: false }
  }

  const parsed = Number.parseInt(result.value, 10)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { present: true, valid: false }
  }

  return { present: true, valid: true, value: parsed }
}

const parseOptionalDateQuery = (value: unknown): { present: boolean; valid: boolean } => {
  const result = readSingleQueryValue(value)
  if (!result.present) {
    return { present: false, valid: true }
  }

  if (!result.valid || !result.value) {
    return { present: true, valid: false }
  }

  const parsedDate = new Date(result.value)
  return { present: true, valid: !Number.isNaN(parsedDate.getTime()) }
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

const validateAdminAdSlotPayload = (
  payload: RecordLike,
  res: Response,
  options: { requireCreateFields?: boolean; requireMutableField?: boolean } = {}
): boolean => {
  const allowedKeys = new Set([
    'slotId',
    'label',
    'surface',
    'position',
    'device',
    'allowedTypes',
    'visibleTo',
    'maxPerSession',
    'minSecondsBetweenImpressions',
    'minContentBefore',
    'isActive',
    'priority',
    'fallbackType',
    'notes',
    'reason',
    'note',
  ])

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no slot de anuncios.`)
      return false
    }
  }

  if (options.requireCreateFields) {
    const slotId = validateRequiredNonEmptyString(payload, 'slotId')
    const label = validateRequiredNonEmptyString(payload, 'label')
    if (!slotId || !label) {
      respondValidationError(res, 'Campos obrigatorios em falta: slotId, label.')
      return false
    }
  } else {
    const slotId = validateOptionalString(payload, 'slotId')
    if (!slotId.valid) {
      respondValidationError(res, 'Campo slotId invalido.')
      return false
    }

    const label = validateOptionalString(payload, 'label')
    if (!label.valid) {
      respondValidationError(res, 'Campo label invalido.')
      return false
    }
  }

  const surface = validateOptionalEnum<AdPartnershipSurface>(
    payload,
    'surface',
    AD_PARTNERSHIP_SURFACES
  )
  if (!surface.valid) {
    respondValidationError(res, 'Campo surface invalido.')
    return false
  }
  if (options.requireCreateFields && !surface.value) {
    respondValidationError(res, 'Campo surface obrigatorio.')
    return false
  }

  const position = validateOptionalEnum<AdPartnershipPosition>(
    payload,
    'position',
    AD_PARTNERSHIP_POSITIONS
  )
  if (!position.valid) {
    respondValidationError(res, 'Campo position invalido.')
    return false
  }
  if (options.requireCreateFields && !position.value) {
    respondValidationError(res, 'Campo position obrigatorio.')
    return false
  }

  const device = validateOptionalEnum<AdPartnershipDevice>(
    payload,
    'device',
    AD_PARTNERSHIP_DEVICES
  )
  if (!device.valid) {
    respondValidationError(res, 'Campo device invalido.')
    return false
  }

  const allowedTypes = validateOptionalEnumArray<AdPartnershipType>(
    payload,
    'allowedTypes',
    AD_PARTNERSHIP_TYPES
  )
  if (!allowedTypes.valid) {
    respondValidationError(res, 'Campo allowedTypes invalido.')
    return false
  }
  if (options.requireCreateFields && (!allowedTypes.value || allowedTypes.value.length === 0)) {
    respondValidationError(res, 'Campo allowedTypes obrigatorio com pelo menos 1 tipo.')
    return false
  }

  const visibleTo = validateOptionalEnumArray<AdPartnershipVisibility>(
    payload,
    'visibleTo',
    AD_PARTNERSHIP_VISIBILITY
  )
  if (!visibleTo.valid) {
    respondValidationError(res, 'Campo visibleTo invalido.')
    return false
  }

  const maxPerSession = validateOptionalNonNegativeInteger(payload, 'maxPerSession')
  if (!maxPerSession.valid) {
    respondValidationError(res, 'Campo maxPerSession invalido.')
    return false
  }

  const minSecondsBetweenImpressions = validateOptionalNonNegativeInteger(
    payload,
    'minSecondsBetweenImpressions'
  )
  if (!minSecondsBetweenImpressions.valid) {
    respondValidationError(res, 'Campo minSecondsBetweenImpressions invalido.')
    return false
  }

  const minContentBefore = validateOptionalNonNegativeInteger(payload, 'minContentBefore')
  if (!minContentBefore.valid) {
    respondValidationError(res, 'Campo minContentBefore invalido.')
    return false
  }

  const isActive = validateOptionalBoolean(payload, 'isActive')
  if (!isActive.valid) {
    respondValidationError(res, 'Campo isActive invalido.')
    return false
  }

  const priority = validateOptionalNonNegativeInteger(payload, 'priority')
  if (!priority.valid) {
    respondValidationError(res, 'Campo priority invalido.')
    return false
  }

  if ('fallbackType' in payload && payload.fallbackType !== undefined && payload.fallbackType !== null) {
    if (
      typeof payload.fallbackType !== 'string' ||
      !AD_PARTNERSHIP_TYPES.includes(payload.fallbackType.trim() as AdPartnershipType)
    ) {
      respondValidationError(res, 'Campo fallbackType invalido.')
      return false
    }
  }

  const notes = validateOptionalString(payload, 'notes')
  if (!notes.valid) {
    respondValidationError(res, 'Campo notes invalido.')
    return false
  }

  const reason = validateOptionalString(payload, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return false
  }

  const note = validateOptionalString(payload, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return false
  }

  if (options.requireMutableField) {
    const hasMutableField = [
      'label',
      'surface',
      'position',
      'device',
      'allowedTypes',
      'visibleTo',
      'maxPerSession',
      'minSecondsBetweenImpressions',
      'minContentBefore',
      'isActive',
      'priority',
      'fallbackType',
    ].some((key) => key in payload)

    if (!hasMutableField) {
      respondValidationError(
        res,
        'Payload sem alteracoes de slot. Envia ao menos um campo de configuracao.'
      )
      return false
    }
  }

  return true
}

const validateAdminAdCampaignPayload = (
  payload: RecordLike,
  res: Response,
  options: { requireCreateFields?: boolean; requireMutableField?: boolean } = {}
): boolean => {
  const allowedKeys = new Set([
    'title',
    'description',
    'adType',
    'sponsorType',
    'brandId',
    'directoryEntryId',
    'surfaces',
    'slotIds',
    'visibleTo',
    'priority',
    'startAt',
    'endAt',
    'headline',
    'disclosureLabel',
    'body',
    'ctaText',
    'ctaUrl',
    'imageUrl',
    'relevanceTags',
    'estimatedMonthlyBudget',
    'currency',
    'status',
    'reason',
    'note',
  ])
  if (options.requireCreateFields) {
    allowedKeys.add('code')
  }

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na campanha de anuncios.`)
      return false
    }
  }

  if (options.requireCreateFields) {
    const title = validateRequiredNonEmptyString(payload, 'title')
    const headline = validateRequiredNonEmptyString(payload, 'headline')
    if (!title || !headline) {
      respondValidationError(res, 'Campos obrigatorios em falta: title, headline.')
      return false
    }
  } else {
    const title = validateOptionalString(payload, 'title')
    if (!title.valid) {
      respondValidationError(res, 'Campo title invalido.')
      return false
    }

    const headline = validateOptionalString(payload, 'headline')
    if (!headline.valid) {
      respondValidationError(res, 'Campo headline invalido.')
      return false
    }
  }

  if (options.requireCreateFields) {
    const code = validateOptionalString(payload, 'code')
    if (!code.valid) {
      respondValidationError(res, 'Campo code invalido.')
      return false
    }
  }

  const adType = validateOptionalEnum<AdPartnershipType>(payload, 'adType', AD_PARTNERSHIP_TYPES)
  if (!adType.valid) {
    respondValidationError(res, 'Campo adType invalido.')
    return false
  }
  if (options.requireCreateFields && !adType.value) {
    respondValidationError(res, 'Campo adType obrigatorio.')
    return false
  }

  const sponsorType = validateOptionalEnum<AdPartnershipSponsorType>(
    payload,
    'sponsorType',
    AD_PARTNERSHIP_SPONSOR_TYPES
  )
  if (!sponsorType.valid) {
    respondValidationError(res, 'Campo sponsorType invalido.')
    return false
  }

  const status = validateOptionalEnum<AdPartnershipCampaignStatus>(
    payload,
    'status',
    AD_PARTNERSHIP_CAMPAIGN_STATUSES
  )
  if (!status.valid) {
    respondValidationError(res, 'Campo status invalido.')
    return false
  }

  const description = validateOptionalString(payload, 'description')
  if (!description.valid) {
    respondValidationError(res, 'Campo description invalido.')
    return false
  }

  const brandId = validateOptionalString(payload, 'brandId')
  if (!brandId.valid) {
    respondValidationError(res, 'Campo brandId invalido.')
    return false
  }

  const directoryEntryId = validateOptionalString(payload, 'directoryEntryId')
  if (!directoryEntryId.valid) {
    respondValidationError(res, 'Campo directoryEntryId invalido.')
    return false
  }

  if (options.requireCreateFields) {
    const resolvedSponsorType = sponsorType.value ?? 'brand'
    if (resolvedSponsorType === 'brand' && !brandId.value && !directoryEntryId.value) {
      respondValidationError(
        res,
        'Campanhas sponsorType=brand exigem directoryEntryId (ou brandId legacy mapeado).'
      )
      return false
    }
  }

  const surfaces = validateOptionalEnumArray<AdPartnershipSurface>(
    payload,
    'surfaces',
    AD_PARTNERSHIP_SURFACES
  )
  if (!surfaces.valid) {
    respondValidationError(res, 'Campo surfaces invalido.')
    return false
  }

  const slotIds = validateOptionalStringArray(payload, 'slotIds')
  if (!slotIds.valid) {
    respondValidationError(res, 'Campo slotIds invalido.')
    return false
  }

  const visibleTo = validateOptionalEnumArray<AdPartnershipVisibility>(
    payload,
    'visibleTo',
    AD_PARTNERSHIP_VISIBILITY
  )
  if (!visibleTo.valid) {
    respondValidationError(res, 'Campo visibleTo invalido.')
    return false
  }

  const priority = validateOptionalNonNegativeInteger(payload, 'priority')
  if (!priority.valid) {
    respondValidationError(res, 'Campo priority invalido.')
    return false
  }

  const startAt = validateOptionalDateField(payload, 'startAt', { allowNull: true })
  if (!startAt.valid) {
    respondValidationError(res, 'Campo startAt invalido.')
    return false
  }

  const endAt = validateOptionalDateField(payload, 'endAt', { allowNull: true })
  if (!endAt.valid) {
    respondValidationError(res, 'Campo endAt invalido.')
    return false
  }

  const disclosureLabel = validateOptionalString(payload, 'disclosureLabel')
  if (!disclosureLabel.valid) {
    respondValidationError(res, 'Campo disclosureLabel invalido.')
    return false
  }

  const body = validateOptionalString(payload, 'body')
  if (!body.valid) {
    respondValidationError(res, 'Campo body invalido.')
    return false
  }

  const ctaText = validateOptionalString(payload, 'ctaText')
  if (!ctaText.valid) {
    respondValidationError(res, 'Campo ctaText invalido.')
    return false
  }

  const ctaUrl = validateOptionalString(payload, 'ctaUrl')
  if (!ctaUrl.valid) {
    respondValidationError(res, 'Campo ctaUrl invalido.')
    return false
  }

  const imageUrl = validateOptionalString(payload, 'imageUrl')
  if (!imageUrl.valid) {
    respondValidationError(res, 'Campo imageUrl invalido.')
    return false
  }

  const relevanceTags = validateOptionalStringArray(payload, 'relevanceTags')
  if (!relevanceTags.valid) {
    respondValidationError(res, 'Campo relevanceTags invalido.')
    return false
  }

  const estimatedMonthlyBudget = validateOptionalNonNegativeInteger(payload, 'estimatedMonthlyBudget')
  if (!estimatedMonthlyBudget.valid) {
    respondValidationError(res, 'Campo estimatedMonthlyBudget invalido.')
    return false
  }

  const currency = validateOptionalString(payload, 'currency')
  if (!currency.valid) {
    respondValidationError(res, 'Campo currency invalido.')
    return false
  }

  const reason = validateOptionalString(payload, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return false
  }

  const note = validateOptionalString(payload, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return false
  }

  if (options.requireMutableField) {
    const hasMutableField = [
      'title',
      'description',
      'adType',
      'sponsorType',
      'status',
      'brandId',
      'directoryEntryId',
      'surfaces',
      'slotIds',
      'visibleTo',
      'priority',
      'startAt',
      'endAt',
      'headline',
      'disclosureLabel',
      'body',
      'ctaText',
      'ctaUrl',
      'imageUrl',
      'relevanceTags',
      'estimatedMonthlyBudget',
      'currency',
    ].some((key) => key in payload)

    if (!hasMutableField) {
      respondValidationError(
        res,
        'Payload sem alteracoes de campanha. Envia ao menos um campo de configuracao.'
      )
      return false
    }
  }

  return true
}

const validateFinancialToolConfigPatchPayload = (
  payload: RecordLike,
  res: Response,
  fieldPathPrefix: string
): boolean => {
  const allowedKeys = new Set([
    'enabled',
    'maxSymbolsPerRequest',
    'cacheTtlSeconds',
    'requestsPerMinute',
    'experienceMode',
  ])

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${fieldPathPrefix}.${key} nao suportado.`)
      return false
    }
  }

  const enabled = validateOptionalBoolean(payload, 'enabled')
  if (!enabled.valid) {
    respondValidationError(res, `Campo ${fieldPathPrefix}.enabled invalido.`)
    return false
  }

  const maxSymbolsPerRequest = validateOptionalPositiveInteger(payload, 'maxSymbolsPerRequest')
  if (!maxSymbolsPerRequest.valid) {
    respondValidationError(res, `Campo ${fieldPathPrefix}.maxSymbolsPerRequest invalido.`)
    return false
  }

  const cacheTtlSeconds = validateOptionalNonNegativeInteger(payload, 'cacheTtlSeconds')
  if (!cacheTtlSeconds.valid) {
    respondValidationError(res, `Campo ${fieldPathPrefix}.cacheTtlSeconds invalido.`)
    return false
  }

  const requestsPerMinute = validateOptionalPositiveInteger(payload, 'requestsPerMinute')
  if (!requestsPerMinute.valid) {
    respondValidationError(res, `Campo ${fieldPathPrefix}.requestsPerMinute invalido.`)
    return false
  }

  const experienceMode = validateOptionalEnum<FinancialToolExperienceMode>(
    payload,
    'experienceMode',
    FINANCIAL_TOOL_EXPERIENCE_MODES
  )
  if (!experienceMode.valid) {
    respondValidationError(res, `Campo ${fieldPathPrefix}.experienceMode invalido.`)
    return false
  }

  return true
}

const validateAdminFinancialToolPatchPayload = (
  payload: RecordLike,
  res: Response
): boolean => {
  const allowedKeys = new Set(['label', 'notes', 'baseConfig', 'envOverrides', 'reason', 'note'])
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na financial tool.`)
      return false
    }
  }

  const label = validateOptionalString(payload, 'label')
  if (!label.valid) {
    respondValidationError(res, 'Campo label invalido.')
    return false
  }

  if ('notes' in payload && payload.notes !== undefined && payload.notes !== null) {
    if (typeof payload.notes !== 'string') {
      respondValidationError(res, 'Campo notes invalido.')
      return false
    }
  }

  const reason = validateOptionalString(payload, 'reason')
  if (!reason.valid) {
    respondValidationError(res, 'Campo reason invalido.')
    return false
  }

  const note = validateOptionalString(payload, 'note')
  if (!note.valid) {
    respondValidationError(res, 'Campo note invalido.')
    return false
  }

  if ('baseConfig' in payload && payload.baseConfig !== undefined) {
    if (!isRecord(payload.baseConfig)) {
      respondValidationError(res, 'Campo baseConfig invalido.')
      return false
    }

    const baseConfigValid = validateFinancialToolConfigPatchPayload(
      payload.baseConfig as RecordLike,
      res,
      'baseConfig'
    )
    if (!baseConfigValid) return false
  }

  if ('envOverrides' in payload && payload.envOverrides !== undefined) {
    if (!isRecord(payload.envOverrides)) {
      respondValidationError(res, 'Campo envOverrides invalido.')
      return false
    }

    const envOverridesPayload = payload.envOverrides as RecordLike
    for (const key of Object.keys(envOverridesPayload)) {
      if (!FINANCIAL_TOOL_ENVIRONMENTS.includes(key as FinancialToolEnvironment)) {
        respondValidationError(res, `Campo envOverrides.${key} nao suportado.`)
        return false
      }

      const envValue = envOverridesPayload[key]
      if (envValue === null) continue
      if (!isRecord(envValue)) {
        respondValidationError(res, `Campo envOverrides.${key} invalido.`)
        return false
      }

      const envConfigValid = validateFinancialToolConfigPatchPayload(
        envValue as RecordLike,
        res,
        `envOverrides.${key}`
      )
      if (!envConfigValid) return false
    }
  }

  const hasPatchField = ['label', 'notes', 'baseConfig', 'envOverrides'].some((key) => key in payload)
  if (!hasPatchField) {
    respondValidationError(
      res,
      'Payload sem alteracoes de financial tool. Envia label, notes, baseConfig ou envOverrides.'
    )
    return false
  }

  return true
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

export const validateAuthChangePasswordContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de change-password invalido.')
    return
  }

  const currentPassword = validateRequiredNonEmptyString(req.body, 'currentPassword')
  const newPassword = validateRequiredNonEmptyString(req.body, 'newPassword')
  if (!currentPassword || !newPassword) {
    respondValidationError(res, 'Campos obrigatorios em falta: currentPassword, newPassword.')
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

export const validateUserUpdateMeContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de update profile invalido.')
    return
  }

  const allowedFields = new Set(['name', 'avatar', 'bio', 'socialLinks'])
  const payloadKeys = Object.keys(req.body)

  if (payloadKeys.length === 0) {
    respondValidationError(res, 'Payload vazio para update profile.')
    return
  }

  for (const key of payloadKeys) {
    if (!allowedFields.has(key)) {
      respondValidationError(res, `Campo nao permitido: ${key}.`)
      return
    }
  }

  if ('name' in req.body) {
    const name = req.body.name
    if (typeof name !== 'string' || name.trim().length === 0) {
      respondValidationError(res, 'Campo name invalido.')
      return
    }
  }

  const validateNullableStringField = (field: 'avatar' | 'bio') => {
    if (!(field in req.body)) return true
    const value = req.body[field]
    if (value === null) return true
    if (typeof value !== 'string' || value.trim().length === 0) {
      respondValidationError(res, `Campo ${field} invalido.`)
      return false
    }
    return true
  }

  if (!validateNullableStringField('avatar')) return
  if (!validateNullableStringField('bio')) return

  if ('socialLinks' in req.body) {
    const socialLinks = req.body.socialLinks
    if (socialLinks !== null) {
      if (!isRecord(socialLinks)) {
        respondValidationError(res, 'Campo socialLinks invalido.')
        return
      }

      const allowedSocialLinks = new Set(['website', 'twitter', 'linkedin', 'instagram'])
      const socialKeys = Object.keys(socialLinks)

      for (const key of socialKeys) {
        if (!allowedSocialLinks.has(key)) {
          respondValidationError(res, `Campo socialLinks.${key} nao permitido.`)
          return
        }

        const value = socialLinks[key]
        if (value === null) continue
        if (typeof value !== 'string' || value.trim().length === 0) {
          respondValidationError(res, `Campo socialLinks.${key} invalido.`)
          return
        }
      }
    }
  }

  next()
}

export const validateUserDeleteMeContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de eliminacao de conta invalido.')
    return
  }

  const allowedFields = new Set(['currentPassword', 'confirmation', 'reason'])
  for (const key of Object.keys(req.body)) {
    if (!allowedFields.has(key)) {
      respondValidationError(res, `Campo nao permitido: ${key}.`)
      return
    }
  }

  const currentPassword = validateRequiredNonEmptyString(req.body, 'currentPassword')
  const confirmation = validateRequiredNonEmptyString(req.body, 'confirmation')
  const reason = validateRequiredNonEmptyString(req.body, 'reason')

  if (!currentPassword || !confirmation || !reason) {
    respondValidationError(
      res,
      'Campos obrigatorios em falta: currentPassword, confirmation, reason.'
    )
    return
  }

  if (confirmation !== 'ELIMINAR') {
    respondValidationError(res, 'Campo confirmation invalido. Escreve exatamente "ELIMINAR".')
    return
  }

  if (reason.length < 5) {
    respondValidationError(res, 'Campo reason invalido. Usa pelo menos 5 caracteres.')
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

export const validateAdminPlatformIntegrationUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const integrationKey = trimString(req.params.integrationKey)
  if (!integrationKey) {
    respondValidationError(res, 'Parametro integrationKey obrigatorio.')
    return
  }

  if (!PLATFORM_INTEGRATION_KEYS.includes(integrationKey as PlatformIntegrationKey)) {
    respondValidationError(
      res,
      `Parametro integrationKey invalido. Valores: ${PLATFORM_INTEGRATION_KEYS.join(', ')}.`
    )
    return
  }

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de integracao invalido.')
    return
  }

  const allowedKeys = new Set(['enabled', 'config', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na atualizacao de integracao.`)
      return
    }
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

  const hasEnabledField = Object.prototype.hasOwnProperty.call(req.body, 'enabled')
  const hasConfigField = Object.prototype.hasOwnProperty.call(req.body, 'config')

  if (!hasEnabledField && !hasConfigField) {
    respondValidationError(res, 'Envia pelo menos enabled ou config na atualizacao da integracao.')
    return
  }

  if (hasEnabledField && typeof req.body.enabled !== 'boolean') {
    respondValidationError(res, 'Campo enabled invalido (boolean).')
    return
  }

  if (hasConfigField && !isRecord(req.body.config)) {
    respondValidationError(res, 'Campo config invalido (objeto).')
    return
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

export const validateAdminFinancialToolUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const toolKey = validateRequiredRouteParam(req, res, 'toolKey')
  if (!toolKey) return
  if (!FINANCIAL_TOOL_KEYS.includes(toolKey as FinancialToolKey)) {
    respondValidationError(res, 'Parametro toolKey invalido.')
    return
  }

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de financial tool invalido.')
    return
  }

  const isValid = validateAdminFinancialToolPatchPayload(req.body, res)
  if (!isValid) return

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para atualizar financial tool.'
  )
  if (!hasReason) return

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

export const validateAdminScopeDelegationCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = validateRequiredRouteParam(req, res, 'userId')
  if (!userId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de delegacao de scopes invalido.')
    return
  }

  const allowedKeys = new Set(['scope', 'scopes', 'expiresAt', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na delegacao de scopes.`)
      return
    }
  }

  const scope = validateOptionalString(req.body, 'scope')
  if (!scope.valid) {
    respondValidationError(res, 'Campo scope invalido.')
    return
  }

  const scopes = validateOptionalStringArray(req.body, 'scopes')
  if (!scopes.valid) {
    respondValidationError(res, 'Campo scopes invalido.')
    return
  }

  const hasScope =
    (typeof req.body.scope === 'string' && req.body.scope.trim().length > 0) ||
    (Array.isArray(req.body.scopes) && req.body.scopes.length > 0)
  if (!hasScope) {
    respondValidationError(res, 'Campo scope/scopes obrigatorio para delegacao de scopes.')
    return
  }

  const expiresAt = validateOptionalDateField(req.body, 'expiresAt')
  if (!expiresAt.valid || !expiresAt.value) {
    respondValidationError(res, 'Campo expiresAt obrigatorio e invalido.')
    return
  }

  const parsedExpiry = new Date(expiresAt.value)
  if (Number.isNaN(parsedExpiry.getTime()) || parsedExpiry.getTime() <= Date.now()) {
    respondValidationError(res, 'Campo expiresAt deve ser uma data futura.')
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
    'Motivo obrigatorio para delegacao temporaria.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminScopeDelegationRevokeContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = validateRequiredRouteParam(req, res, 'userId')
  if (!userId) return

  const delegationId = validateRequiredRouteParam(req, res, 'delegationId')
  if (!delegationId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de revogacao de delegacao de scopes invalido.')
    return
  }

  const allowedKeys = new Set(['reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na revogacao de delegacao.`)
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
    'Motivo obrigatorio para revogar delegacao temporaria.'
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

export const validateAdminAdSlotCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de slot de anuncios invalido.')
    return
  }

  const isValid = validateAdminAdSlotPayload(req.body, res, {
    requireCreateFields: true,
  })
  if (!isValid) return

  const hasReason = validateAdminReasonFromBodyOrHeader(req, res, 'Motivo obrigatorio para criar slot.')
  if (!hasReason) return

  next()
}

export const validateAdminAdSlotUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const slotId = validateRequiredRouteParam(req, res, 'slotId')
  if (!slotId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de slot de anuncios invalido.')
    return
  }

  const isValid = validateAdminAdSlotPayload(req.body, res, {
    requireMutableField: true,
  })
  if (!isValid) return

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para atualizar slot.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminAdCampaignCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de campanha de anuncios invalido.')
    return
  }

  const isValid = validateAdminAdCampaignPayload(req.body, res, {
    requireCreateFields: true,
  })
  if (!isValid) return

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para criar campanha.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminAdCampaignUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const campaignId = validateRequiredRouteParam(req, res, 'campaignId')
  if (!campaignId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de campanha de anuncios invalido.')
    return
  }

  const isValid = validateAdminAdCampaignPayload(req.body, res, {
    requireMutableField: true,
  })
  if (!isValid) return

  const hasReason = validateAdminReasonFromBodyOrHeader(
    req,
    res,
    'Motivo obrigatorio para atualizar campanha.'
  )
  if (!hasReason) return

  next()
}

export const validateAdminAdCampaignStatusContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const campaignId = validateRequiredRouteParam(req, res, 'campaignId')
  if (!campaignId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de alteracao de estado da campanha invalido.')
    return
  }

  const allowedKeys = new Set(['reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na alteracao de estado da campanha.`)
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
    'Motivo obrigatorio para alterar estado da campanha.'
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

export const validateBrandPortalIntegrationApiKeyListContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['directoryEntryId', 'isActive', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const directoryEntryId = readSingleQueryValue(req.query.directoryEntryId)
  if (directoryEntryId.present && (!directoryEntryId.valid || !directoryEntryId.value)) {
    respondValidationError(res, 'Parametro query directoryEntryId invalido.')
    return
  }

  const isActive = parseOptionalBooleanQuery(req.query.isActive)
  if (!isActive.valid) {
    respondValidationError(res, 'Parametro query isActive invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateBrandPortalIntegrationApiKeyCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de API key de integracao invalido.')
    return
  }

  const allowedKeys = new Set(['directoryEntryId', 'label', 'scopes', 'expiresAt', 'metadata'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na criacao da API key.`)
      return
    }
  }

  const directoryEntryId = validateRequiredNonEmptyString(req.body, 'directoryEntryId')
  if (!directoryEntryId) {
    respondValidationError(res, 'Campo directoryEntryId obrigatorio.')
    return
  }

  const label = validateOptionalString(req.body, 'label')
  if (!label.valid) {
    respondValidationError(res, 'Campo label invalido.')
    return
  }

  if ('scopes' in req.body && req.body.scopes !== undefined && req.body.scopes !== null) {
    if (!Array.isArray(req.body.scopes)) {
      respondValidationError(res, 'Campo scopes invalido.')
      return
    }

    for (const scope of req.body.scopes as unknown[]) {
      if (typeof scope !== 'string') {
        respondValidationError(res, 'Campo scopes invalido.')
        return
      }

      const normalizedScope = scope.trim()
      if (
        !normalizedScope ||
        !(BRAND_INTEGRATION_ALLOWED_SCOPES as readonly string[]).includes(normalizedScope)
      ) {
        respondValidationError(
          res,
          `Scope invalido. Valores permitidos: ${BRAND_INTEGRATION_ALLOWED_SCOPES.join(', ')}.`
        )
        return
      }
    }
  }

  const expiresAt = validateOptionalDateField(req.body, 'expiresAt')
  if (!expiresAt.valid) {
    respondValidationError(res, 'Campo expiresAt invalido.')
    return
  }

  if (expiresAt.value) {
    const parsedExpiry = new Date(expiresAt.value)
    if (Number.isNaN(parsedExpiry.getTime()) || parsedExpiry.getTime() <= Date.now()) {
      respondValidationError(res, 'Campo expiresAt deve ser uma data futura.')
      return
    }
  }

  const metadata = validateOptionalObjectField(req.body, 'metadata')
  if (!metadata.valid) {
    respondValidationError(res, 'Campo metadata invalido.')
    return
  }

  next()
}

export const validateBrandPortalIntegrationApiKeyRevokeContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const keyId = validateRequiredRouteParam(req, res, 'keyId')
  if (!keyId) return

  if (req.body !== undefined && req.body !== null) {
    if (!isRecord(req.body)) {
      respondValidationError(res, 'Payload de revogacao de API key invalido.')
      return
    }

    const allowedKeys = new Set(['reason', 'note'])
    for (const key of Object.keys(req.body)) {
      if (!allowedKeys.has(key)) {
        respondValidationError(res, `Campo ${key} nao suportado na revogacao da API key.`)
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
  }

  next()
}

export const validateBrandPortalIntegrationApiKeyUsageContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const keyId = validateRequiredRouteParam(req, res, 'keyId')
  if (!keyId) return

  const allowedKeys = new Set([
    'days',
    'method',
    'statusCodeFrom',
    'statusCodeTo',
    'page',
    'limit',
  ])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const days = parseOptionalPositiveIntegerQuery(req.query.days)
  if (!days.valid) {
    respondValidationError(res, 'Parametro query days invalido.')
    return
  }

  const method = readSingleQueryValue(req.query.method)
  if (method.present && (!method.valid || !method.value)) {
    respondValidationError(res, 'Parametro query method invalido.')
    return
  }

  const statusCodeFrom = parseOptionalIntegerQuery(req.query.statusCodeFrom)
  if (!statusCodeFrom.valid) {
    respondValidationError(res, 'Parametro query statusCodeFrom invalido.')
    return
  }

  const statusCodeTo = parseOptionalIntegerQuery(req.query.statusCodeTo)
  if (!statusCodeTo.valid) {
    respondValidationError(res, 'Parametro query statusCodeTo invalido.')
    return
  }

  if (
    statusCodeFrom.value !== undefined &&
    (statusCodeFrom.value < 100 || statusCodeFrom.value > 599)
  ) {
    respondValidationError(res, 'Parametro query statusCodeFrom fora do intervalo 100..599.')
    return
  }

  if (statusCodeTo.value !== undefined && (statusCodeTo.value < 100 || statusCodeTo.value > 599)) {
    respondValidationError(res, 'Parametro query statusCodeTo fora do intervalo 100..599.')
    return
  }

  if (
    statusCodeFrom.value !== undefined &&
    statusCodeTo.value !== undefined &&
    statusCodeFrom.value > statusCodeTo.value
  ) {
    respondValidationError(
      res,
      'Parametro query statusCodeFrom nao pode ser maior que statusCodeTo.'
    )
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateBrandIntegrationAffiliateOverviewQueryContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['days'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const days = parseOptionalPositiveIntegerQuery(req.query.days)
  if (!days.valid) {
    respondValidationError(res, 'Parametro query days invalido.')
    return
  }

  next()
}

export const validateBrandIntegrationAffiliateLinksQueryContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['isActive', 'search', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const isActive = parseOptionalBooleanQuery(req.query.isActive)
  if (!isActive.valid) {
    respondValidationError(res, 'Parametro query isActive invalido.')
    return
  }

  const search = readSingleQueryValue(req.query.search)
  if (search.present && (!search.valid || !search.value)) {
    respondValidationError(res, 'Parametro query search invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateBrandIntegrationAffiliateLinkClicksQueryContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const linkId = validateRequiredRouteParam(req, res, 'linkId')
  if (!linkId) return

  const allowedKeys = new Set(['converted', 'days', 'from', 'to', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const converted = parseOptionalBooleanQuery(req.query.converted)
  if (!converted.valid) {
    respondValidationError(res, 'Parametro query converted invalido.')
    return
  }

  const days = parseOptionalPositiveIntegerQuery(req.query.days)
  if (!days.valid) {
    respondValidationError(res, 'Parametro query days invalido.')
    return
  }

  const from = parseOptionalDateQuery(req.query.from)
  if (!from.valid) {
    respondValidationError(res, 'Parametro query from invalido.')
    return
  }

  const to = parseOptionalDateQuery(req.query.to)
  if (!to.valid) {
    respondValidationError(res, 'Parametro query to invalido.')
    return
  }

  const fromValue = readSingleQueryValue(req.query.from)
  const toValue = readSingleQueryValue(req.query.to)
  if (
    fromValue.value &&
    toValue.value &&
    !Number.isNaN(new Date(fromValue.value).getTime()) &&
    !Number.isNaN(new Date(toValue.value).getTime()) &&
    new Date(fromValue.value).getTime() > new Date(toValue.value).getTime()
  ) {
    respondValidationError(res, 'Parametro query from nao pode ser maior que to.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

const isHttpUrlString = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const getAffiliateLinkPatchPayload = (
  payload: RecordLike
): { valid: boolean; patch: RecordLike | null } => {
  if ('patch' in payload && payload.patch !== undefined && payload.patch !== null) {
    if (!isRecord(payload.patch)) {
      return { valid: false, patch: null }
    }
    return { valid: true, patch: payload.patch as RecordLike }
  }

  return { valid: true, patch: payload }
}

const validateAffiliateLinkPayload = (
  payload: RecordLike,
  res: Response,
  options: { requireCreateFields?: boolean; requireMutableField?: boolean } = {}
): boolean => {
  const allowedKeys = new Set([
    'directoryEntryId',
    'destinationUrl',
    'label',
    'isActive',
    'commissionRateBps',
    'code',
    'metadata',
    'patch',
  ])
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no payload de afiliacao.`)
      return false
    }
  }

  const patchResult = getAffiliateLinkPatchPayload(payload)
  if (!patchResult.valid || !patchResult.patch) {
    respondValidationError(res, 'Campo patch invalido.')
    return false
  }

  const targetPayload = patchResult.patch
  if (targetPayload !== payload) {
    const patchAllowedKeys = new Set([
      'directoryEntryId',
      'destinationUrl',
      'label',
      'isActive',
      'commissionRateBps',
      'code',
      'metadata',
    ])
    for (const key of Object.keys(targetPayload)) {
      if (!patchAllowedKeys.has(key)) {
        respondValidationError(res, `Campo patch.${key} nao suportado no payload de afiliacao.`)
        return false
      }
    }
  }

  if (options.requireCreateFields) {
    const directoryEntryId = validateRequiredNonEmptyString(targetPayload, 'directoryEntryId')
    const destinationUrl = validateRequiredNonEmptyString(targetPayload, 'destinationUrl')
    if (!directoryEntryId || !destinationUrl) {
      respondValidationError(res, 'Campos obrigatorios em falta: directoryEntryId, destinationUrl.')
      return false
    }

    if (!isHttpUrlString(destinationUrl)) {
      respondValidationError(res, 'Campo destinationUrl invalido. Usa URL http/https.')
      return false
    }
  } else {
    const directoryEntryId = validateOptionalString(targetPayload, 'directoryEntryId')
    if (!directoryEntryId.valid) {
      respondValidationError(res, 'Campo directoryEntryId invalido.')
      return false
    }

    const destinationUrl = validateOptionalString(targetPayload, 'destinationUrl')
    if (!destinationUrl.valid) {
      respondValidationError(res, 'Campo destinationUrl invalido.')
      return false
    }
    if (destinationUrl.value && !isHttpUrlString(destinationUrl.value)) {
      respondValidationError(res, 'Campo destinationUrl invalido. Usa URL http/https.')
      return false
    }
  }

  const label = validateOptionalString(targetPayload, 'label')
  if (!label.valid) {
    respondValidationError(res, 'Campo label invalido.')
    return false
  }

  const isActive = validateOptionalBoolean(targetPayload, 'isActive')
  if (!isActive.valid) {
    respondValidationError(res, 'Campo isActive invalido.')
    return false
  }

  const code = validateOptionalString(targetPayload, 'code')
  if (!code.valid) {
    respondValidationError(res, 'Campo code invalido.')
    return false
  }

  if ('commissionRateBps' in targetPayload && targetPayload.commissionRateBps !== undefined) {
    const value = targetPayload.commissionRateBps
    if (value !== null) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10000) {
        respondValidationError(
          res,
          'Campo commissionRateBps invalido. Usa inteiro entre 0 e 10000.'
        )
        return false
      }
    }
  }

  const metadata = validateOptionalObjectField(targetPayload, 'metadata')
  if (!metadata.valid) {
    respondValidationError(res, 'Campo metadata invalido.')
    return false
  }

  if (options.requireMutableField) {
    const hasMutableField = [
      'directoryEntryId',
      'destinationUrl',
      'label',
      'isActive',
      'commissionRateBps',
      'code',
      'metadata',
    ].some((key) => key in targetPayload)

    if (!hasMutableField) {
      respondValidationError(
        res,
        'Payload sem alteracoes de afiliacao. Envia pelo menos um campo mutavel.'
      )
      return false
    }
  }

  return true
}

export const validateBrandPortalAffiliateLinkListContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['directoryEntryId', 'isActive', 'search', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const directoryEntryId = readSingleQueryValue(req.query.directoryEntryId)
  if (directoryEntryId.present && (!directoryEntryId.valid || !directoryEntryId.value)) {
    respondValidationError(res, 'Parametro query directoryEntryId invalido.')
    return
  }

  const isActive = parseOptionalBooleanQuery(req.query.isActive)
  if (!isActive.valid) {
    respondValidationError(res, 'Parametro query isActive invalido.')
    return
  }

  const search = readSingleQueryValue(req.query.search)
  if (search.present && (!search.valid || !search.value)) {
    respondValidationError(res, 'Parametro query search invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateBrandPortalAffiliateLinkCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de link de afiliacao invalido.')
    return
  }

  const isValid = validateAffiliateLinkPayload(req.body, res, { requireCreateFields: true })
  if (!isValid) return

  next()
}

export const validateBrandPortalAffiliateLinkUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const linkId = validateRequiredRouteParam(req, res, 'linkId')
  if (!linkId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de link de afiliacao invalido.')
    return
  }

  const isValid = validateAffiliateLinkPayload(req.body, res, { requireMutableField: true })
  if (!isValid) return

  next()
}

export const validateBrandPortalAffiliateLinkClicksContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const linkId = validateRequiredRouteParam(req, res, 'linkId')
  if (!linkId) return

  const allowedKeys = new Set(['converted', 'days', 'from', 'to', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const converted = parseOptionalBooleanQuery(req.query.converted)
  if (!converted.valid) {
    respondValidationError(res, 'Parametro query converted invalido.')
    return
  }

  const days = parseOptionalPositiveIntegerQuery(req.query.days)
  if (!days.valid) {
    respondValidationError(res, 'Parametro query days invalido.')
    return
  }

  const from = parseOptionalDateQuery(req.query.from)
  if (!from.valid) {
    respondValidationError(res, 'Parametro query from invalido.')
    return
  }

  const to = parseOptionalDateQuery(req.query.to)
  if (!to.valid) {
    respondValidationError(res, 'Parametro query to invalido.')
    return
  }

  const fromValue = readSingleQueryValue(req.query.from)
  const toValue = readSingleQueryValue(req.query.to)
  if (
    fromValue.value &&
    toValue.value &&
    !Number.isNaN(new Date(fromValue.value).getTime()) &&
    !Number.isNaN(new Date(toValue.value).getTime()) &&
    new Date(fromValue.value).getTime() > new Date(toValue.value).getTime()
  ) {
    respondValidationError(res, 'Parametro query from nao pode ser maior que to.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateAdminAffiliateOverviewContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['days', 'ownerUserId', 'directoryEntryId', 'code'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const days = parseOptionalPositiveIntegerQuery(req.query.days)
  if (!days.valid) {
    respondValidationError(res, 'Parametro query days invalido.')
    return
  }

  for (const key of ['ownerUserId', 'directoryEntryId', 'code'] as const) {
    const parsedValue = readSingleQueryValue(req.query[key])
    if (parsedValue.present && (!parsedValue.valid || !parsedValue.value)) {
      respondValidationError(res, `Parametro query ${key} invalido.`)
      return
    }
  }

  next()
}

export const validateAdminAffiliateLinksContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['ownerUserId', 'directoryEntryId', 'isActive', 'search', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  for (const key of ['ownerUserId', 'directoryEntryId', 'search'] as const) {
    const parsedValue = readSingleQueryValue(req.query[key])
    if (parsedValue.present && (!parsedValue.valid || !parsedValue.value)) {
      respondValidationError(res, `Parametro query ${key} invalido.`)
      return
    }
  }

  const isActive = parseOptionalBooleanQuery(req.query.isActive)
  if (!isActive.valid) {
    respondValidationError(res, 'Parametro query isActive invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateAdminAffiliateConvertContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clickId = validateRequiredRouteParam(req, res, 'clickId')
  if (!clickId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de conversao de afiliacao invalido.')
    return
  }

  const allowedKeys = new Set(['valueCents', 'value', 'currency', 'reference', 'metadata', 'force'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na conversao de afiliacao.`)
      return
    }
  }

  if ('valueCents' in req.body && req.body.valueCents !== undefined) {
    const valueCents = req.body.valueCents
    if (typeof valueCents !== 'number' || !Number.isInteger(valueCents) || valueCents < 0) {
      respondValidationError(res, 'Campo valueCents invalido. Usa inteiro >= 0.')
      return
    }
  }

  if ('value' in req.body && req.body.value !== undefined) {
    const value = req.body.value
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      respondValidationError(res, 'Campo value invalido. Usa numero >= 0.')
      return
    }
  }

  const currency = validateOptionalString(req.body, 'currency')
  if (!currency.valid) {
    respondValidationError(res, 'Campo currency invalido.')
    return
  }

  const reference = validateOptionalString(req.body, 'reference')
  if (!reference.valid) {
    respondValidationError(res, 'Campo reference invalido.')
    return
  }

  const force = validateOptionalBoolean(req.body, 'force')
  if (!force.valid) {
    respondValidationError(res, 'Campo force invalido.')
    return
  }

  const metadata = validateOptionalObjectField(req.body, 'metadata')
  if (!metadata.valid) {
    respondValidationError(res, 'Campo metadata invalido.')
    return
  }

  next()
}

export const validateAffiliateRedirectContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const code = validateRequiredRouteParam(req, res, 'code')
  if (!code) return

  next()
}

export const validateAffiliatePostbackConversionContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de postback de conversao invalido.')
    return
  }

  const allowedKeys = new Set([
    'clickId',
    'valueCents',
    'value',
    'currency',
    'reference',
    'provider',
    'metadata',
    'force',
  ])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no postback de conversao.`)
      return
    }
  }

  const clickId = validateRequiredNonEmptyString(req.body, 'clickId')
  if (!clickId) {
    respondValidationError(res, 'Campo clickId obrigatorio.')
    return
  }

  if ('valueCents' in req.body && req.body.valueCents !== undefined) {
    const valueCents = req.body.valueCents
    if (typeof valueCents !== 'number' || !Number.isInteger(valueCents) || valueCents < 0) {
      respondValidationError(res, 'Campo valueCents invalido. Usa inteiro >= 0.')
      return
    }
  }

  if ('value' in req.body && req.body.value !== undefined) {
    const value = req.body.value
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      respondValidationError(res, 'Campo value invalido. Usa numero >= 0.')
      return
    }
  }

  for (const key of ['currency', 'reference', 'provider'] as const) {
    const value = validateOptionalString(req.body, key)
    if (!value.valid) {
      respondValidationError(res, `Campo ${key} invalido.`)
      return
    }
  }

  const metadata = validateOptionalObjectField(req.body, 'metadata')
  if (!metadata.valid) {
    respondValidationError(res, 'Campo metadata invalido.')
    return
  }

  const force = validateOptionalBoolean(req.body, 'force')
  if (!force.valid) {
    respondValidationError(res, 'Campo force invalido.')
    return
  }

  next()
}

const validateBrandPortalCampaignPatchPayload = (
  payload: RecordLike,
  res: Response,
  options: { requireCreateFields?: boolean; requireAtLeastOneField?: boolean } = {}
): boolean => {
  const allowedKeys = new Set([
    'title',
    'description',
    'adType',
    'directoryEntryId',
    'surfaces',
    'slotIds',
    'visibleTo',
    'priority',
    'startAt',
    'endAt',
    'headline',
    'disclosureLabel',
    'body',
    'ctaText',
    'ctaUrl',
    'imageUrl',
    'relevanceTags',
    'estimatedMonthlyBudget',
    'currency',
  ])

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no payload de campanha.`)
      return false
    }
  }

  const title = options.requireCreateFields
    ? validateRequiredNonEmptyString(payload, 'title')
    : validateOptionalString(payload, 'title').value
  if (options.requireCreateFields && !title) {
    respondValidationError(res, 'Campo title obrigatorio.')
    return false
  }
  if (!options.requireCreateFields) {
    const titleOptional = validateOptionalString(payload, 'title')
    if (!titleOptional.valid) {
      respondValidationError(res, 'Campo title invalido.')
      return false
    }
  }

  const description = validateOptionalString(payload, 'description')
  if (!description.valid) {
    respondValidationError(res, 'Campo description invalido.')
    return false
  }

  const headline = options.requireCreateFields
    ? validateRequiredNonEmptyString(payload, 'headline')
    : validateOptionalString(payload, 'headline').value
  if (options.requireCreateFields && !headline) {
    respondValidationError(res, 'Campo headline obrigatorio.')
    return false
  }
  if (!options.requireCreateFields) {
    const headlineOptional = validateOptionalString(payload, 'headline')
    if (!headlineOptional.valid) {
      respondValidationError(res, 'Campo headline invalido.')
      return false
    }
  }

  const adType = options.requireCreateFields
    ? validateRequiredNonEmptyString(payload, 'adType')
    : validateOptionalString(payload, 'adType').value
  if (options.requireCreateFields && (!adType || !AD_PARTNERSHIP_TYPES.includes(adType as any))) {
    respondValidationError(
      res,
      `Campo adType obrigatorio e invalido. Valores: ${AD_PARTNERSHIP_TYPES.join(', ')}.`
    )
    return false
  }
  if (!options.requireCreateFields && 'adType' in payload) {
    if (!adType || !AD_PARTNERSHIP_TYPES.includes(adType as any)) {
      respondValidationError(
        res,
        `Campo adType invalido. Valores: ${AD_PARTNERSHIP_TYPES.join(', ')}.`
      )
      return false
    }
  }

  const directoryEntryId = options.requireCreateFields
    ? validateRequiredNonEmptyString(payload, 'directoryEntryId')
    : validateOptionalString(payload, 'directoryEntryId').value
  if (options.requireCreateFields && !directoryEntryId) {
    respondValidationError(res, 'Campo directoryEntryId obrigatorio.')
    return false
  }
  if (!options.requireCreateFields) {
    const directoryEntryOptional = validateOptionalString(payload, 'directoryEntryId')
    if (!directoryEntryOptional.valid) {
      respondValidationError(res, 'Campo directoryEntryId invalido.')
      return false
    }
  }

  const surfaces = validateOptionalEnumArray<AdPartnershipSurface>(
    payload,
    'surfaces',
    AD_PARTNERSHIP_SURFACES
  )
  if (!surfaces.valid) {
    respondValidationError(res, 'Campo surfaces invalido.')
    return false
  }
  if (options.requireCreateFields && (!surfaces.value || surfaces.value.length === 0)) {
    respondValidationError(res, 'Campo surfaces obrigatorio.')
    return false
  }

  const slotIds = validateOptionalStringArray(payload, 'slotIds')
  if (!slotIds.valid) {
    respondValidationError(res, 'Campo slotIds invalido.')
    return false
  }
  if (options.requireCreateFields && (!slotIds.value || slotIds.value.length === 0)) {
    respondValidationError(res, 'Campo slotIds obrigatorio.')
    return false
  }

  const visibleTo = validateOptionalEnumArray<AdPartnershipVisibility>(
    payload,
    'visibleTo',
    AD_PARTNERSHIP_VISIBILITY
  )
  if (!visibleTo.valid) {
    respondValidationError(res, 'Campo visibleTo invalido.')
    return false
  }
  if (options.requireCreateFields && (!visibleTo.value || visibleTo.value.length === 0)) {
    respondValidationError(res, 'Campo visibleTo obrigatorio.')
    return false
  }

  const priority = validateOptionalNonNegativeInteger(payload, 'priority')
  if (!priority.valid) {
    respondValidationError(res, 'Campo priority invalido.')
    return false
  }

  const startAt = validateOptionalDateField(payload, 'startAt', { allowNull: true })
  if (!startAt.valid) {
    respondValidationError(res, 'Campo startAt invalido.')
    return false
  }

  const endAt = validateOptionalDateField(payload, 'endAt', { allowNull: true })
  if (!endAt.valid) {
    respondValidationError(res, 'Campo endAt invalido.')
    return false
  }

  if (startAt.value && endAt.value && startAt.value !== null && endAt.value !== null) {
    const startDate = new Date(startAt.value)
    const endDate = new Date(endAt.value)
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      if (endDate.getTime() <= startDate.getTime()) {
        respondValidationError(res, 'Campo endAt deve ser posterior a startAt.')
        return false
      }
    }
  }

  for (const key of ['disclosureLabel', 'body', 'ctaText', 'ctaUrl', 'imageUrl', 'currency'] as const) {
    const result = validateOptionalString(payload, key)
    if (!result.valid) {
      respondValidationError(res, `Campo ${key} invalido.`)
      return false
    }
  }

  const relevanceTags = validateOptionalStringArray(payload, 'relevanceTags')
  if (!relevanceTags.valid) {
    respondValidationError(res, 'Campo relevanceTags invalido.')
    return false
  }

  if ('estimatedMonthlyBudget' in payload && payload.estimatedMonthlyBudget !== undefined) {
    const budget = payload.estimatedMonthlyBudget
    if (budget !== null) {
      if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0) {
        respondValidationError(res, 'Campo estimatedMonthlyBudget invalido. Usa numero >= 0.')
        return false
      }
    }
  }

  if (options.requireAtLeastOneField && Object.keys(payload).length === 0) {
    respondValidationError(res, 'Patch sem campos atualizaveis.')
    return false
  }

  return true
}

export const validateBrandPortalCampaignListContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['status', 'adType', 'surface', 'search', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const status = readSingleQueryValue(req.query.status)
  if (status.present) {
    if (
      !status.valid ||
      !status.value ||
      !(AD_PARTNERSHIP_CAMPAIGN_STATUSES as readonly string[]).includes(status.value)
    ) {
      respondValidationError(
        res,
        `Parametro query status invalido. Valores: ${AD_PARTNERSHIP_CAMPAIGN_STATUSES.join(', ')}.`
      )
      return
    }
  }

  const adType = readSingleQueryValue(req.query.adType)
  if (adType.present) {
    if (!adType.valid || !adType.value || !(AD_PARTNERSHIP_TYPES as readonly string[]).includes(adType.value)) {
      respondValidationError(
        res,
        `Parametro query adType invalido. Valores: ${AD_PARTNERSHIP_TYPES.join(', ')}.`
      )
      return
    }
  }

  const surface = readSingleQueryValue(req.query.surface)
  if (surface.present) {
    if (
      !surface.valid ||
      !surface.value ||
      !(AD_PARTNERSHIP_SURFACES as readonly string[]).includes(surface.value)
    ) {
      respondValidationError(
        res,
        `Parametro query surface invalido. Valores: ${AD_PARTNERSHIP_SURFACES.join(', ')}.`
      )
      return
    }
  }

  const search = readSingleQueryValue(req.query.search)
  if (search.present && (!search.valid || !search.value)) {
    respondValidationError(res, 'Parametro query search invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateBrandPortalCampaignCreateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de criacao de campanha invalido.')
    return
  }

  const allowedKeys = new Set([
    'code',
    'title',
    'description',
    'adType',
    'directoryEntryId',
    'surfaces',
    'slotIds',
    'visibleTo',
    'priority',
    'startAt',
    'endAt',
    'headline',
    'disclosureLabel',
    'body',
    'ctaText',
    'ctaUrl',
    'imageUrl',
    'relevanceTags',
    'estimatedMonthlyBudget',
    'currency',
    'reason',
    'note',
  ])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na criacao de campanha.`)
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

  const isValid = validateBrandPortalCampaignPatchPayload(req.body, res, {
    requireCreateFields: true,
  })
  if (!isValid) return

  next()
}

export const validateBrandPortalCampaignUpdateContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const campaignId = validateRequiredRouteParam(req, res, 'campaignId')
  if (!campaignId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de atualizacao de campanha invalido.')
    return
  }

  const allowedKeys = new Set(['patch', 'reason', 'note'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na atualizacao de campanha.`)
      return
    }
  }

  if (!isRecord(req.body.patch)) {
    respondValidationError(res, 'Campo patch obrigatorio e invalido.')
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

  const isValid = validateBrandPortalCampaignPatchPayload(req.body.patch as RecordLike, res, {
    requireAtLeastOneField: true,
  })
  if (!isValid) return

  next()
}

export const validateBrandPortalCampaignSubmitApprovalContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const campaignId = validateRequiredRouteParam(req, res, 'campaignId')
  if (!campaignId) return

  if (req.body !== undefined && req.body !== null) {
    if (!isRecord(req.body)) {
      respondValidationError(res, 'Payload de submit para aprovacao invalido.')
      return
    }

    const allowedKeys = new Set(['reason', 'note'])
    for (const key of Object.keys(req.body)) {
      if (!allowedKeys.has(key)) {
        respondValidationError(res, `Campo ${key} nao suportado no submit para aprovacao.`)
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
  }

  next()
}

export const validateBrandPortalCampaignMetricsContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const campaignId = validateRequiredRouteParam(req, res, 'campaignId')
  if (!campaignId) return

  const allowedKeys = new Set(['days'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const days = parseOptionalPositiveIntegerQuery(req.query.days)
  if (!days.valid) {
    respondValidationError(res, 'Parametro query days invalido.')
    return
  }

  next()
}

export const validateBrandPortalOverviewContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['days'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const days = parseOptionalPositiveIntegerQuery(req.query.days)
  if (!days.valid) {
    respondValidationError(res, 'Parametro query days invalido.')
    return
  }

  next()
}

export const validateBrandPortalDirectoriesContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set<string>()
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  next()
}

const isPositiveNumericLike = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return false
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) && parsed > 0
  }

  return false
}

const isPositiveIntegerLike = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || !/^\d+$/.test(trimmed)) return false
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isFinite(parsed) && parsed > 0
  }

  return false
}

export const validateBrandPortalWalletListContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set<string>()
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  next()
}

export const validateBrandPortalWalletDetailContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const directoryEntryId = validateRequiredRouteParam(req, res, 'directoryEntryId')
  if (!directoryEntryId) return

  const allowedKeys = new Set<string>()
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  next()
}

export const validateBrandPortalWalletTransactionsContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const directoryEntryId = validateRequiredRouteParam(req, res, 'directoryEntryId')
  if (!directoryEntryId) return

  const allowedKeys = new Set(['type', 'status', 'search', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const type = readSingleQueryValue(req.query.type)
  if (
    type.present &&
    (!type.valid ||
      !type.value ||
      !(BRAND_WALLET_TRANSACTION_TYPES as readonly string[]).includes(type.value))
  ) {
    respondValidationError(
      res,
      `Parametro query type invalido. Valores: ${BRAND_WALLET_TRANSACTION_TYPES.join(', ')}.`
    )
    return
  }

  const status = readSingleQueryValue(req.query.status)
  if (
    status.present &&
    (!status.valid ||
      !status.value ||
      !(BRAND_WALLET_TRANSACTION_STATUSES as readonly string[]).includes(status.value))
  ) {
    respondValidationError(
      res,
      `Parametro query status invalido. Valores: ${BRAND_WALLET_TRANSACTION_STATUSES.join(', ')}.`
    )
    return
  }

  const search = readSingleQueryValue(req.query.search)
  if (search.present && (!search.valid || !search.value)) {
    respondValidationError(res, 'Parametro query search invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateBrandPortalWalletTopUpRequestContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const directoryEntryId = validateRequiredRouteParam(req, res, 'directoryEntryId')
  if (!directoryEntryId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de pedido de top-up invalido.')
    return
  }

  const allowedKeys = new Set(['amountCents', 'amount', 'description', 'reference', 'metadata'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado no pedido de top-up.`)
      return
    }
  }

  const hasAmountCents = 'amountCents' in req.body && req.body.amountCents !== undefined
  const hasAmount = 'amount' in req.body && req.body.amount !== undefined
  if (!hasAmountCents && !hasAmount) {
    respondValidationError(res, 'Campo amount ou amountCents obrigatorio.')
    return
  }

  if (hasAmountCents && !isPositiveIntegerLike(req.body.amountCents)) {
    respondValidationError(res, 'Campo amountCents invalido. Usa inteiro > 0.')
    return
  }

  if (hasAmount && !isPositiveNumericLike(req.body.amount)) {
    respondValidationError(res, 'Campo amount invalido. Usa numero > 0.')
    return
  }

  const description = validateOptionalString(req.body, 'description')
  if (!description.valid) {
    respondValidationError(res, 'Campo description invalido.')
    return
  }

  const reference = validateOptionalString(req.body, 'reference')
  if (!reference.valid) {
    respondValidationError(res, 'Campo reference invalido.')
    return
  }

  const metadata = validateOptionalObjectField(req.body, 'metadata')
  if (!metadata.valid) {
    respondValidationError(res, 'Campo metadata invalido.')
    return
  }

  next()
}

export const validateAdminBrandWalletTopUpListContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['status', 'ownerUserId', 'directoryEntryId', 'search', 'page', 'limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const status = readSingleQueryValue(req.query.status)
  if (
    status.present &&
    (!status.valid ||
      !status.value ||
      !(BRAND_WALLET_TRANSACTION_STATUSES as readonly string[]).includes(status.value))
  ) {
    respondValidationError(
      res,
      `Parametro query status invalido. Valores: ${BRAND_WALLET_TRANSACTION_STATUSES.join(', ')}.`
    )
    return
  }

  for (const key of ['ownerUserId', 'directoryEntryId', 'search'] as const) {
    const parsedValue = readSingleQueryValue(req.query[key])
    if (parsedValue.present && (!parsedValue.valid || !parsedValue.value)) {
      respondValidationError(res, `Parametro query ${key} invalido.`)
      return
    }
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validateAdminBrandWalletTopUpApproveContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const transactionId = validateRequiredRouteParam(req, res, 'transactionId')
  if (!transactionId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de aprovacao de top-up invalido.')
    return
  }

  const allowedKeys = new Set(['reason', 'note', 'reference', 'metadata', 'force'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Campo ${key} nao suportado na aprovacao de top-up.`)
      return
    }
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

  const reference = validateOptionalString(req.body, 'reference')
  if (!reference.valid) {
    respondValidationError(res, 'Campo reference invalido.')
    return
  }

  const metadata = validateOptionalObjectField(req.body, 'metadata')
  if (!metadata.valid) {
    respondValidationError(res, 'Campo metadata invalido.')
    return
  }

  const force = validateOptionalBoolean(req.body, 'force')
  if (!force.valid) {
    respondValidationError(res, 'Campo force invalido.')
    return
  }

  next()
}

export const validateAdminBrandWalletTopUpRejectContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const transactionId = validateRequiredRouteParam(req, res, 'transactionId')
  if (!transactionId) return

  if (!isRecord(req.body)) {
    respondValidationError(res, 'Payload de rejeicao/cancelamento de top-up invalido.')
    return
  }

  const allowedKeys = new Set(['reason', 'note', 'status', 'reference', 'metadata', 'force'])
  for (const key of Object.keys(req.body)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(
        res,
        `Campo ${key} nao suportado na rejeicao/cancelamento de top-up.`
      )
      return
    }
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

  const status = validateOptionalEnum<BrandWalletTransactionStatus>(
    req.body,
    'status',
    ['failed', 'cancelled']
  )
  if (!status.valid) {
    respondValidationError(res, 'Campo status invalido. Valores: failed, cancelled.')
    return
  }

  const reference = validateOptionalString(req.body, 'reference')
  if (!reference.valid) {
    respondValidationError(res, 'Campo reference invalido.')
    return
  }

  const metadata = validateOptionalObjectField(req.body, 'metadata')
  if (!metadata.valid) {
    respondValidationError(res, 'Campo metadata invalido.')
    return
  }

  const force = validateOptionalBoolean(req.body, 'force')
  if (!force.valid) {
    respondValidationError(res, 'Campo force invalido.')
    return
  }

  next()
}

const parseOptionalQueryStringList = (
  value: unknown
): { present: boolean; valid: boolean; values?: string[] } => {
  if (value === undefined) {
    return { present: false, valid: true }
  }

  const values: string[] = []
  if (typeof value === 'string') {
    values.push(...value.split(','))
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== 'string') {
        return { present: true, valid: false }
      }
      values.push(...item.split(','))
    }
  } else {
    return { present: true, valid: false }
  }

  const normalized = values.map((item) => item.trim()).filter((item) => item.length > 0)
  if (normalized.length === 0) {
    return { present: true, valid: false }
  }

  return { present: true, valid: true, values: Array.from(new Set(normalized)) }
}

const validateOptionalPublicDirectoryVerticalQuery = (
  req: Request,
  res: Response,
  key: string
): boolean => {
  const value = readSingleQueryValue(req.query[key])
  if (!value.present) return true
  if (
    !value.valid ||
    !value.value ||
    !(PUBLIC_DIRECTORY_VERTICAL_TYPES as readonly string[]).includes(value.value)
  ) {
    respondValidationError(
      res,
      `Parametro query ${key} invalido. Valores: ${PUBLIC_DIRECTORY_VERTICAL_TYPES.join(', ')}.`
    )
    return false
  }

  return true
}

const validateOptionalPublicDirectoryVerificationStatusQuery = (
  req: Request,
  res: Response,
  key: string
): boolean => {
  const value = readSingleQueryValue(req.query[key])
  if (!value.present) return true
  if (
    !value.valid ||
    !value.value ||
    !(PUBLIC_DIRECTORY_VERIFICATION_STATUSES as readonly string[]).includes(value.value)
  ) {
    respondValidationError(
      res,
      `Parametro query ${key} invalido. Valores: ${PUBLIC_DIRECTORY_VERIFICATION_STATUSES.join(', ')}.`
    )
    return false
  }

  return true
}

const validateOptionalPublicDirectorySortQuery = (
  req: Request,
  res: Response,
  key: string
): boolean => {
  const value = readSingleQueryValue(req.query[key])
  if (!value.present) return true
  if (
    !value.valid ||
    !value.value ||
    !(PUBLIC_DIRECTORY_SORT_OPTIONS as readonly string[]).includes(value.value)
  ) {
    respondValidationError(
      res,
      `Parametro query ${key} invalido. Valores: ${PUBLIC_DIRECTORY_SORT_OPTIONS.join(', ')}.`
    )
    return false
  }

  return true
}

const validateOptionalSingleNonEmptyQuery = (
  req: Request,
  res: Response,
  key: string
): boolean => {
  const value = readSingleQueryValue(req.query[key])
  if (value.present && (!value.valid || !value.value)) {
    respondValidationError(res, `Parametro query ${key} invalido.`)
    return false
  }
  return true
}

const validateOptionalPublicDirectoryTagsQuery = (
  req: Request,
  res: Response,
  key: string
): boolean => {
  const value = parseOptionalQueryStringList(req.query[key])
  if (value.present && !value.valid) {
    respondValidationError(res, `Parametro query ${key} invalido.`)
    return false
  }
  return true
}

export const validatePublicDirectoryListContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set([
    'verticalType',
    'country',
    'verificationStatus',
    'search',
    'featured',
    'tags',
    'page',
    'limit',
    'sort',
  ])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  if (!validateOptionalPublicDirectoryVerticalQuery(req, res, 'verticalType')) return
  if (!validateOptionalSingleNonEmptyQuery(req, res, 'country')) return
  if (!validateOptionalPublicDirectoryVerificationStatusQuery(req, res, 'verificationStatus')) return
  if (!validateOptionalSingleNonEmptyQuery(req, res, 'search')) return
  if (!validateOptionalPublicDirectorySortQuery(req, res, 'sort')) return
  if (!validateOptionalPublicDirectoryTagsQuery(req, res, 'tags')) return

  const featured = parseOptionalBooleanQuery(req.query.featured)
  if (!featured.valid) {
    respondValidationError(res, 'Parametro query featured invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validatePublicDirectoryFeaturedContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validatePublicDirectorySearchContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set([
    'q',
    'verticalType',
    'country',
    'verificationStatus',
    'featured',
    'tags',
    'page',
    'limit',
    'sort',
  ])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const q = readSingleQueryValue(req.query.q)
  if (!q.present || !q.valid || !q.value || q.value.length < 2) {
    respondValidationError(res, 'Parametro query q invalido. Usa pelo menos 2 caracteres.')
    return
  }

  if (!validateOptionalPublicDirectoryVerticalQuery(req, res, 'verticalType')) return
  if (!validateOptionalSingleNonEmptyQuery(req, res, 'country')) return
  if (!validateOptionalPublicDirectoryVerificationStatusQuery(req, res, 'verificationStatus')) return
  if (!validateOptionalPublicDirectorySortQuery(req, res, 'sort')) return
  if (!validateOptionalPublicDirectoryTagsQuery(req, res, 'tags')) return

  const featured = parseOptionalBooleanQuery(req.query.featured)
  if (!featured.valid) {
    respondValidationError(res, 'Parametro query featured invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validatePublicDirectoryCompareContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['slugs'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const slugs = parseOptionalQueryStringList(req.query.slugs)
  if (!slugs.present || !slugs.valid || !slugs.values || slugs.values.length < 2 || slugs.values.length > 3) {
    respondValidationError(
      res,
      'Parametro query slugs invalido. Informa 2 a 3 slugs separados por virgula.'
    )
    return
  }

  next()
}

export const validatePublicDirectoryCategoriesContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedKeys = new Set(['country', 'verificationStatus', 'search', 'featured', 'tags'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  if (!validateOptionalSingleNonEmptyQuery(req, res, 'country')) return
  if (!validateOptionalPublicDirectoryVerificationStatusQuery(req, res, 'verificationStatus')) return
  if (!validateOptionalSingleNonEmptyQuery(req, res, 'search')) return
  if (!validateOptionalPublicDirectoryTagsQuery(req, res, 'tags')) return

  const featured = parseOptionalBooleanQuery(req.query.featured)
  if (!featured.valid) {
    respondValidationError(res, 'Parametro query featured invalido.')
    return
  }

  next()
}

export const validatePublicDirectoryByVerticalContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const vertical = validateRequiredRouteParam(req, res, 'vertical')
  if (!vertical) return
  if (!(PUBLIC_DIRECTORY_VERTICAL_TYPES as readonly string[]).includes(vertical)) {
    respondValidationError(
      res,
      `Parametro vertical invalido. Valores: ${PUBLIC_DIRECTORY_VERTICAL_TYPES.join(', ')}.`
    )
    return
  }

  const allowedKeys = new Set([
    'country',
    'verificationStatus',
    'search',
    'featured',
    'tags',
    'page',
    'limit',
    'sort',
  ])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  if (!validateOptionalSingleNonEmptyQuery(req, res, 'country')) return
  if (!validateOptionalPublicDirectoryVerificationStatusQuery(req, res, 'verificationStatus')) return
  if (!validateOptionalSingleNonEmptyQuery(req, res, 'search')) return
  if (!validateOptionalPublicDirectorySortQuery(req, res, 'sort')) return
  if (!validateOptionalPublicDirectoryTagsQuery(req, res, 'tags')) return

  const featured = parseOptionalBooleanQuery(req.query.featured)
  if (!featured.valid) {
    respondValidationError(res, 'Parametro query featured invalido.')
    return
  }

  const page = parseOptionalPositiveIntegerQuery(req.query.page)
  if (!page.valid) {
    respondValidationError(res, 'Parametro query page invalido.')
    return
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}

export const validatePublicDirectoryDetailContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const vertical = validateRequiredRouteParam(req, res, 'vertical')
  if (!vertical) return
  if (!(PUBLIC_DIRECTORY_VERTICAL_TYPES as readonly string[]).includes(vertical)) {
    respondValidationError(
      res,
      `Parametro vertical invalido. Valores: ${PUBLIC_DIRECTORY_VERTICAL_TYPES.join(', ')}.`
    )
    return
  }

  const slug = validateRequiredRouteParam(req, res, 'slug')
  if (!slug) return

  const allowedKeys = new Set<string>()
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  next()
}

export const validatePublicDirectoryRelatedContentContract = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const vertical = validateRequiredRouteParam(req, res, 'vertical')
  if (!vertical) return
  if (!(PUBLIC_DIRECTORY_VERTICAL_TYPES as readonly string[]).includes(vertical)) {
    respondValidationError(
      res,
      `Parametro vertical invalido. Valores: ${PUBLIC_DIRECTORY_VERTICAL_TYPES.join(', ')}.`
    )
    return
  }

  const slug = validateRequiredRouteParam(req, res, 'slug')
  if (!slug) return

  const allowedKeys = new Set(['limit'])
  for (const key of Object.keys(req.query)) {
    if (!allowedKeys.has(key)) {
      respondValidationError(res, `Parametro query ${key} nao suportado.`)
      return
    }
  }

  const limit = parseOptionalPositiveIntegerQuery(req.query.limit)
  if (!limit.valid) {
    respondValidationError(res, 'Parametro query limit invalido.')
    return
  }

  next()
}
