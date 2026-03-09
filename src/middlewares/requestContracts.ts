import { NextFunction, Request, Response } from 'express'

type RecordLike = Record<string, unknown>
type DashboardPreset = 'operations' | 'moderation' | 'monetization' | 'custom'
type DashboardDensity = 'comfortable' | 'compact'
type DashboardTheme = 'system' | 'light' | 'dark'
type BulkImportType = 'subscription_entitlements' | 'ad_campaign_status'

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

const readHeaderString = (req: Request, headerName: string): string | undefined => {
  const value = req.headers[headerName]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.find((entry) => typeof entry === 'string')
  return undefined
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
