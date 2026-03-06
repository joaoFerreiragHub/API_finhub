import { IncomingHttpHeaders } from 'http'
import { AuthRequest } from '../types/auth'

export const ADMIN_REASON_MAX_LENGTH = 500
export const ADMIN_NOTE_MAX_LENGTH = 2000
export const ADMIN_PUBLIC_MESSAGE_MAX_LENGTH = 500

export interface AdminTextFieldResult {
  value?: string
  error?: string
}

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> | undefined => {
  const body = req.body
  if (!body || typeof body !== 'object') return undefined
  return body as Record<string, unknown>
}

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const readHeaderValue = (headers: IncomingHttpHeaders, key: string): string | undefined => {
  const value = headers[key]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') return entry
    }
  }
  return undefined
}

const validateLength = (
  field: 'reason' | 'note' | 'publicMessage',
  value: string | undefined,
  maxLength: number
): AdminTextFieldResult => {
  if (!value) return {}
  if (value.length > maxLength) {
    return {
      error: `Campo ${field} excede limite de ${maxLength} caracteres.`,
    }
  }
  return { value }
}

const readReasonRaw = (req: AuthRequest): string | undefined => {
  const bodyReason = normalizeOptionalString(extractBodyRecord(req)?.reason)
  if (bodyReason) return bodyReason

  const headerReason = readHeaderValue(req.headers, 'x-admin-reason')
  return normalizeOptionalString(headerReason)
}

export const readAdminReason = (req: AuthRequest): AdminTextFieldResult =>
  validateLength('reason', readReasonRaw(req), ADMIN_REASON_MAX_LENGTH)

export const readAdminReasonForAudit = (req: AuthRequest): string | undefined => {
  const rawReason = readReasonRaw(req)
  if (!rawReason) return undefined
  return rawReason.slice(0, ADMIN_REASON_MAX_LENGTH)
}

export const readAdminNote = (req: AuthRequest): AdminTextFieldResult =>
  validateLength('note', normalizeOptionalString(extractBodyRecord(req)?.note), ADMIN_NOTE_MAX_LENGTH)

export const readAdminPublicMessage = (req: AuthRequest): AdminTextFieldResult =>
  validateLength(
    'publicMessage',
    normalizeOptionalString(extractBodyRecord(req)?.publicMessage),
    ADMIN_PUBLIC_MESSAGE_MAX_LENGTH
  )
