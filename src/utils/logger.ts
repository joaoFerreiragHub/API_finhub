import { AsyncLocalStorage } from 'node:async_hooks'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogPayload {
  level: LogLevel
  message: string
  event: string
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

const levelCounters = new Map<LogLevel, number>([
  ['debug', 0],
  ['info', 0],
  ['warn', 0],
  ['error', 0],
])
const eventCounters = new Map<string, number>()
const legacyConsoleDomainCounters = new Map<string, number>()

let consolePatched = false

const toEventSegment = (value: string, fallback = 'event'): string => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72)

  return normalized.length > 0 ? normalized : fallback
}

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
      event: payload.event,
      timestamp: payload.timestamp,
      serializationError: true,
    })
  }
}

const incrementCounter = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1)
}

const trackPayload = (payload: LogPayload) => {
  levelCounters.set(payload.level, (levelCounters.get(payload.level) ?? 0) + 1)
  incrementCounter(eventCounters, payload.event)

  if (payload.eventSource === 'legacy_console') {
    const domain =
      typeof payload.sourceDomain === 'string' && payload.sourceDomain.length > 0
        ? payload.sourceDomain
        : 'runtime'
    incrementCounter(legacyConsoleDomainCounters, domain)
  }
}

const writeLog = (payload: LogPayload) => {
  if (!shouldWrite(payload.level)) return

  trackPayload(payload)
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

const extractCallerFilePath = (): string | undefined => {
  const stack = new Error().stack
  if (!stack) return undefined

  const lines = stack.split('\n').slice(2)
  for (const line of lines) {
    if (line.includes('src\\utils\\logger.ts') || line.includes('src/utils/logger.ts')) continue

    const parenthesesMatch = line.match(/\((.*):\d+:\d+\)$/)
    if (parenthesesMatch?.[1]) {
      return parenthesesMatch[1]
    }

    const barePathMatch = line.match(/at (.*):\d+:\d+$/)
    if (barePathMatch?.[1]) {
      return barePathMatch[1]
    }
  }

  return undefined
}

const deriveDomainFromFilePath = (filePath?: string): string => {
  if (!filePath) return 'runtime'

  const normalizedPath = filePath.replace(/\\/g, '/')
  const srcMarker = '/src/'
  const srcIndex = normalizedPath.lastIndexOf(srcMarker)
  if (srcIndex < 0) return 'runtime'

  const relativePath = normalizedPath.slice(srcIndex + srcMarker.length)

  if (relativePath.startsWith('controllers/')) {
    const fileName = relativePath.split('/').pop() ?? ''
    const base = fileName.replace(/\.controller\.[tj]s$/, '')
    return `controller_${toEventSegment(base, 'unknown')}`
  }

  if (relativePath.startsWith('services/')) {
    const fileName = relativePath.split('/').pop() ?? ''
    const base = fileName.replace(/\.service\.[tj]s$/, '')
    return `service_${toEventSegment(base, 'unknown')}`
  }

  return `runtime_${toEventSegment(relativePath.replace(/\.[tj]s$/, '').replace(/\//g, '_'), 'unknown')}`
}

const buildLegacyConsoleEventName = (
  channel: string,
  rawMessage: string,
  callerPath?: string
) => {
  const levelSuffix = channel.replace('console.', '')
  const domain = deriveDomainFromFilePath(callerPath)
  const action = toEventSegment(rawMessage, 'call')
  return `legacy_${domain}_${action}_${toEventSegment(levelSuffix, 'log')}`
}

const logWithLevel = (level: LogLevel, message: string, meta: Record<string, unknown> = {}) => {
  const runtimeMeta = withRuntimeContext(meta)
  const rawEvent = typeof runtimeMeta.event === 'string' && runtimeMeta.event.trim().length > 0
    ? runtimeMeta.event
    : message

  const event = toEventSegment(rawEvent, `${level}_event`)
  const payloadMeta = { ...runtimeMeta }
  delete payloadMeta.event

  writeLog({
    level,
    message,
    event,
    timestamp: new Date().toISOString(),
    ...payloadMeta,
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

const createConsoleBridgeHandler = (
  level: LogLevel,
  channel: string,
  baseMeta: Record<string, unknown>
) => {
  return (...args: unknown[]) => {
    const normalized = normalizeConsoleArgs(args)
    const callerPath = extractCallerFilePath()
    const sourceDomain = deriveDomainFromFilePath(callerPath)
    const legacyEvent = buildLegacyConsoleEventName(channel, normalized.message, callerPath)

    logWithLevel(level, normalized.message, {
      ...baseMeta,
      ...normalized.meta,
      channel,
      event: legacyEvent,
      eventSource: 'legacy_console',
      sourceFile: callerPath,
      sourceDomain,
      legacyMessage: normalized.message,
    })
  }
}

export const patchConsoleWithStructuredLogger = (meta: Record<string, unknown> = {}) => {
  if (consolePatched) return
  if (process.env.NODE_ENV === 'test') return
  if ((process.env.LOG_PATCH_CONSOLE ?? 'true').toLowerCase() === 'false') return

  consolePatched = true

  console.log = createConsoleBridgeHandler('info', 'console.log', meta)
  console.info = createConsoleBridgeHandler('info', 'console.info', meta)
  console.warn = createConsoleBridgeHandler('warn', 'console.warn', meta)
  console.error = createConsoleBridgeHandler('error', 'console.error', meta)
  console.debug = createConsoleBridgeHandler('debug', 'console.debug', meta)
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

export const getLoggerRuntimeSnapshot = (topEventsLimit = 25) => {
  const topEvents = Array.from(eventCounters.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, Math.max(1, topEventsLimit))
    .map(([event, count]) => ({ event, count }))

  const legacyDomains = Array.from(legacyConsoleDomainCounters.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([domain, count]) => ({ domain, count }))

  return {
    configuredLevel: configuredLogLevel,
    consolePatched,
    totals: {
      debug: levelCounters.get('debug') ?? 0,
      info: levelCounters.get('info') ?? 0,
      warn: levelCounters.get('warn') ?? 0,
      error: levelCounters.get('error') ?? 0,
      uniqueEvents: eventCounters.size,
    },
    topEvents,
    legacyConsoleDomains: legacyDomains,
    generatedAt: new Date().toISOString(),
  }
}
