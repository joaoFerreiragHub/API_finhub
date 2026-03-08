import { AsyncLocalStorage } from 'node:async_hooks'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogPayload {
  level: LogLevel
  message: string
  timestamp: string
  requestId?: string
  [key: string]: unknown
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const contextStorage = new AsyncLocalStorage<Record<string, unknown>>()
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
}

let consolePatched = false

const resolveConfiguredLogLevel = (): LogLevel => {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw
  }
  return 'info'
}

const configuredLogLevel = resolveConfiguredLogLevel()

const shouldWrite = (level: LogLevel) =>
  LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLogLevel]

const normalizeError = (error: unknown) =>
  error instanceof Error
    ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
    : { error: serializeValue(error) }

const serializeValue = (value: unknown): unknown => {
  if (value === undefined) return 'undefined'
  if (value === null) return null
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
  if (typeof value === 'symbol') return value.toString()
  if (value instanceof Error) return normalizeError(value)
  if (typeof value !== 'object') return value

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

const toJsonLine = (payload: LogPayload) => {
  try {
    return JSON.stringify(payload)
  } catch {
    return JSON.stringify({
      level: payload.level,
      message: payload.message,
      timestamp: payload.timestamp,
      serializationError: true,
    })
  }
}

const writeLog = (payload: LogPayload) => {
  if (!shouldWrite(payload.level)) return

  const line = `${toJsonLine(payload)}\n`
  const stream = payload.level === 'warn' || payload.level === 'error' ? process.stderr : process.stdout
  stream.write(line)
}

const withRuntimeContext = (meta: Record<string, unknown>) => {
  const activeContext = contextStorage.getStore() ?? {}
  return {
    ...activeContext,
    ...meta,
  }
}

const normalizeConsoleArgs = (args: unknown[]) => {
  if (args.length === 0) {
    return { message: 'console_call', meta: {} as Record<string, unknown> }
  }

  const [first, ...rest] = args
  const meta: Record<string, unknown> = {}
  let message = 'console_call'

  if (typeof first === 'string' && first.trim().length > 0) {
    message = first
  } else if (first instanceof Error) {
    message = first.message || 'console_error'
    Object.assign(meta, normalizeError(first))
  } else {
    meta.value = serializeValue(first)
  }

  if (rest.length === 1) {
    meta.extra = serializeValue(rest[0])
  } else if (rest.length > 1) {
    meta.extra = rest.map((item) => serializeValue(item))
  }

  return { message, meta }
}

const logWithLevel = (level: LogLevel, message: string, meta: Record<string, unknown> = {}) => {
  writeLog({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...withRuntimeContext(meta),
  })
}

export const runWithLogContext = <T>(context: Record<string, unknown>, callback: () => T): T => {
  const current = contextStorage.getStore() ?? {}
  return contextStorage.run({ ...current, ...context }, callback)
}

export const logDebug = (message: string, meta: Record<string, unknown> = {}) => {
  logWithLevel('debug', message, meta)
}

export const logInfo = (message: string, meta: Record<string, unknown> = {}) => {
  logWithLevel('info', message, meta)
}

export const logWarn = (message: string, meta: Record<string, unknown> = {}) => {
  logWithLevel('warn', message, meta)
}

export const logError = (
  message: string,
  error?: unknown,
  meta: Record<string, unknown> = {}
) => {
  const errorMeta = error !== undefined ? normalizeError(error) : {}
  logWithLevel('error', message, {
    ...errorMeta,
    ...meta,
  })
}

export const patchConsoleWithStructuredLogger = (meta: Record<string, unknown> = {}) => {
  if (consolePatched) return
  if (process.env.NODE_ENV === 'test') return
  if ((process.env.LOG_PATCH_CONSOLE ?? 'true').toLowerCase() === 'false') return

  consolePatched = true

  console.log = (...args: unknown[]) => {
    const normalized = normalizeConsoleArgs(args)
    logInfo(normalized.message, { ...meta, channel: 'console.log', ...normalized.meta })
  }

  console.info = (...args: unknown[]) => {
    const normalized = normalizeConsoleArgs(args)
    logInfo(normalized.message, { ...meta, channel: 'console.info', ...normalized.meta })
  }

  console.warn = (...args: unknown[]) => {
    const normalized = normalizeConsoleArgs(args)
    logWarn(normalized.message, { ...meta, channel: 'console.warn', ...normalized.meta })
  }

  console.error = (...args: unknown[]) => {
    const normalized = normalizeConsoleArgs(args)
    logError(normalized.message, undefined, { ...meta, channel: 'console.error', ...normalized.meta })
  }

  console.debug = (...args: unknown[]) => {
    const normalized = normalizeConsoleArgs(args)
    logDebug(normalized.message, { ...meta, channel: 'console.debug', ...normalized.meta })
  }
}

export const restoreOriginalConsole = () => {
  if (!consolePatched) return

  console.log = originalConsole.log
  console.info = originalConsole.info
  console.warn = originalConsole.warn
  console.error = originalConsole.error
  console.debug = originalConsole.debug
  consolePatched = false
}
