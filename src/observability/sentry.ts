import * as Sentry from '@sentry/node'
import { logError, logInfo, logWarn } from '../utils/logger'

interface SentryRuntimeState {
  initialized: boolean
  enabled: boolean
  dsnConfigured: boolean
  environment: string
  release: string | null
  tracesSampleRate: number
}

const parseSampleRate = (rawValue: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(rawValue ?? '')
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback
  }

  return parsed
}

const sentryDsn = (process.env.SENTRY_DSN ?? '').trim()
const sentryEnvironment = (process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development').trim()
const sentryRelease = (process.env.SENTRY_RELEASE ?? '').trim() || null
const sentryTracesSampleRate = parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0)
const sentryEnabledByEnv = sentryDsn.length > 0 && process.env.NODE_ENV !== 'test'

let sentryInitialized = false

export const initializeSentry = (): void => {
  if (sentryInitialized) {
    return
  }

  if (!sentryEnabledByEnv) {
    logWarn('sentry_disabled', {
      reason: sentryDsn.length === 0 ? 'missing_dsn' : 'test_environment',
      environment: sentryEnvironment,
    })
    sentryInitialized = true
    return
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: sentryEnvironment,
      release: sentryRelease ?? undefined,
      tracesSampleRate: sentryTracesSampleRate,
    })

    sentryInitialized = true
    logInfo('sentry_initialized', {
      environment: sentryEnvironment,
      release: sentryRelease,
      tracesSampleRate: sentryTracesSampleRate,
    })
  } catch (error) {
    logError('sentry_init_failed', error, {
      environment: sentryEnvironment,
    })
    sentryInitialized = true
  }
}

export const captureException = (
  error: unknown,
  context?: {
    requestId?: string
    method?: string
    path?: string
    userId?: string
    [key: string]: unknown
  }
): void => {
  if (!sentryEnabledByEnv) {
    return
  }

  try {
    Sentry.withScope((scope) => {
      if (context) {
        if (context.requestId) scope.setTag('request_id', String(context.requestId))
        if (context.method) scope.setTag('http_method', String(context.method))
        if (context.path) scope.setTag('http_path', String(context.path))
        if (context.userId) scope.setUser({ id: String(context.userId) })
        scope.setContext('runtime', context)
      }
      Sentry.captureException(error)
    })
  } catch (captureError) {
    logError('sentry_capture_failed', captureError)
  }
}

export const flushSentry = async (timeoutMs = 2000): Promise<boolean> => {
  if (!sentryEnabledByEnv) {
    return true
  }

  try {
    return await Sentry.flush(timeoutMs)
  } catch (error) {
    logError('sentry_flush_failed', error, { timeoutMs })
    return false
  }
}

export const getSentryRuntimeState = (): SentryRuntimeState => ({
  initialized: sentryInitialized,
  enabled: sentryEnabledByEnv,
  dsnConfigured: sentryDsn.length > 0,
  environment: sentryEnvironment,
  release: sentryRelease,
  tracesSampleRate: sentryTracesSampleRate,
})

