import { logError, logInfo, logWarn } from './logger'

type RequestLogContext = {
  requestId?: string
  method?: string
  originalUrl?: string
}

const toEventSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const buildEventName = (domain: string, action: string, suffix: string) => {
  const normalizedDomain = toEventSegment(domain) || 'unknown_domain'
  const normalizedAction = toEventSegment(action) || 'unknown_action'
  const normalizedSuffix = toEventSegment(suffix) || 'event'
  return `${normalizedDomain}_${normalizedAction}_${normalizedSuffix}`
}

export const logControllerError = (
  domain: string,
  action: string,
  error: unknown,
  req?: RequestLogContext,
  meta: Record<string, unknown> = {}
) => {
  logError(buildEventName(domain, action, 'failed'), error, {
    requestId: req?.requestId,
    method: req?.method,
    path: req?.originalUrl,
    ...meta,
  })
}

export const logServiceError = (
  domain: string,
  action: string,
  error: unknown,
  meta: Record<string, unknown> = {}
) => {
  logError(buildEventName(domain, action, 'failed'), error, meta)
}

export const logServiceWarn = (
  domain: string,
  action: string,
  meta: Record<string, unknown> = {}
) => {
  logWarn(buildEventName(domain, action, 'warn'), meta)
}

export const logServiceInfo = (
  domain: string,
  action: string,
  meta: Record<string, unknown> = {}
) => {
  logInfo(buildEventName(domain, action, 'info'), meta)
}
