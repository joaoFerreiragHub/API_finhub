import { NextFunction, Request, Response } from 'express'

type RecordLike = Record<string, unknown>

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
