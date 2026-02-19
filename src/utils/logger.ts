type LogLevel = 'info' | 'warn' | 'error'

interface LogPayload {
  level: LogLevel
  message: string
  timestamp: string
  requestId?: string
  [key: string]: unknown
}

const writeLog = (payload: LogPayload) => {
  const line = JSON.stringify(payload)
  if (payload.level === 'error') {
    console.error(line)
    return
  }
  console.log(line)
}

export const logInfo = (message: string, meta: Record<string, unknown> = {}) => {
  writeLog({
    level: 'info',
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

export const logWarn = (message: string, meta: Record<string, unknown> = {}) => {
  writeLog({
    level: 'warn',
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

export const logError = (
  message: string,
  error?: unknown,
  meta: Record<string, unknown> = {}
) => {
  const errorMeta =
    error instanceof Error
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : { error }

  writeLog({
    level: 'error',
    message,
    timestamp: new Date().toISOString(),
    ...errorMeta,
    ...meta,
  })
}
