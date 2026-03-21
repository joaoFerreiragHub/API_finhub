import crypto from 'crypto'
import { Request } from 'express'
import rateLimit, {
  MemoryStore,
  Options as RateLimitOptions,
  RateLimitRequestHandler,
  Store,
} from 'express-rate-limit'
import { RedisStore, SendCommandFn } from 'rate-limit-redis'
import {
  AppRedisClient,
  closeRedisClient,
  connectRedisClient,
  getOrCreateRedisClient,
} from '../config/redis'
import { recordRateLimitExceededMetric, setRateLimiterBackendMode } from '../observability/metrics'
import { ResponseBuilder, ErrorCodes } from '../types/responses'
import { logError, logInfo, logWarn } from '../utils/logger'

type RateLimiterName =
  | 'api'
  | 'news'
  | 'search'
  | 'stats'
  | 'quickAnalysis'
  | 'marketData'
  | 'reits'
  | 'admin'
  | 'adminModerationAction'
  | 'adminModerationBulk'
  | 'adminMetricsDrilldown'
  | 'userReport'
  | 'brandIntegration'
  | 'general'

type LimiterKeyStrategy = 'requester' | 'integrationApiKey'

type StoreMode = 'auto' | 'memory' | 'redis'

interface LimiterDefinition {
  name: RateLimiterName
  envKey: string
  keyPrefix: string
  keyStrategy: LimiterKeyStrategy
  defaultWindowMs: number
  defaultLimit: number
  message: string
}

interface LimiterRuntimeConfig {
  name: RateLimiterName
  keyPrefix: string
  keyStrategy: LimiterKeyStrategy
  windowMs: number
  limit: number
  message: string
}

const parseBooleanEnv = (envName: string, fallback: boolean): boolean => {
  const rawValue = process.env[envName]
  if (rawValue === undefined) {
    return fallback
  }

  const normalized = rawValue.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false
  }

  logWarn('rate_limiter_invalid_boolean_env', { envName, rawValue, fallback })
  return fallback
}

const parsePositiveIntegerEnv = (envName: string, fallback: number): number => {
  const rawValue = process.env[envName]
  if (rawValue === undefined) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logWarn('rate_limiter_invalid_numeric_env', { envName, rawValue, fallback })
    return fallback
  }

  return parsed
}

const rawStoreMode = (process.env.RATE_LIMIT_STORE_MODE ?? 'auto').trim().toLowerCase()
const rateLimitStoreMode: StoreMode =
  rawStoreMode === 'auto' || rawStoreMode === 'memory' || rawStoreMode === 'redis'
    ? rawStoreMode
    : 'auto'

if (rawStoreMode !== rateLimitStoreMode) {
  logWarn('rate_limiter_invalid_store_mode', {
    rawStoreMode,
    fallback: 'auto',
    allowed: ['auto', 'memory', 'redis'],
  })
}

const allowMemoryFallback = parseBooleanEnv('RATE_LIMIT_ALLOW_MEMORY_FALLBACK', true)
const redisRequiredByEnv = parseBooleanEnv(
  'RATE_LIMIT_REDIS_REQUIRED',
  rateLimitStoreMode === 'redis'
)
const redisUrl = (process.env.RATE_LIMIT_REDIS_URL ?? process.env.REDIS_URL ?? '').trim()
const redisPrefix = (process.env.RATE_LIMIT_REDIS_PREFIX ?? 'finhub:ratelimit:').trim()
const redisConnectTimeoutMs = parsePositiveIntegerEnv(
  'RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS',
  parsePositiveIntegerEnv('REDIS_CONNECT_TIMEOUT_MS', 5000)
)

const limiterDefinitions: LimiterDefinition[] = [
  {
    name: 'api',
    envKey: 'API',
    keyPrefix: 'api',
    keyStrategy: 'requester',
    defaultWindowMs: 15 * 60 * 1000,
    defaultLimit: 1000,
    message: 'Muitas requisicoes. Tente novamente em 15 minutos.',
  },
  {
    name: 'news',
    envKey: 'NEWS',
    keyPrefix: 'news',
    keyStrategy: 'requester',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 60,
    message: 'Muitas requisicoes de noticias. Tente novamente em 1 minuto.',
  },
  {
    name: 'search',
    envKey: 'SEARCH',
    keyPrefix: 'search',
    keyStrategy: 'requester',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 30,
    message: 'Muitas pesquisas. Tente novamente em 1 minuto.',
  },
  {
    name: 'stats',
    envKey: 'STATS',
    keyPrefix: 'stats',
    keyStrategy: 'requester',
    defaultWindowMs: 5 * 60 * 1000,
    defaultLimit: 50,
    message: 'Muitas requisicoes de estatisticas. Tente novamente em 5 minutos.',
  },
  {
    name: 'quickAnalysis',
    envKey: 'QUICK_ANALYSIS',
    keyPrefix: 'quick-analysis',
    keyStrategy: 'requester',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 10,
    message: 'Muitas requisicoes de analise rapida. Tente novamente em 1 minuto.',
  },
  {
    name: 'marketData',
    envKey: 'MARKET_DATA',
    keyPrefix: 'market-data',
    keyStrategy: 'requester',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 30,
    message: 'Muitas requisicoes de dados de mercado. Tente novamente em 1 minuto.',
  },
  {
    name: 'reits',
    envKey: 'REITS',
    keyPrefix: 'reits',
    keyStrategy: 'requester',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 20,
    message: 'Muitas requisicoes de REITs. Tente novamente em 1 minuto.',
  },
  {
    name: 'admin',
    envKey: 'ADMIN',
    keyPrefix: 'admin',
    keyStrategy: 'requester',
    defaultWindowMs: 60 * 60 * 1000,
    defaultLimit: 10,
    message: 'Muitas operacoes administrativas. Tente novamente em 1 hora.',
  },
  {
    name: 'adminModerationAction',
    envKey: 'ADMIN_MODERATION_ACTION',
    keyPrefix: 'admin-moderation-action',
    keyStrategy: 'requester',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 30,
    message: 'Muitas acoes de moderacao. Tente novamente em 1 minuto.',
  },
  {
    name: 'adminModerationBulk',
    envKey: 'ADMIN_MODERATION_BULK',
    keyPrefix: 'admin-moderation-bulk',
    keyStrategy: 'requester',
    defaultWindowMs: 10 * 60 * 1000,
    defaultLimit: 10,
    message: 'Muitos lotes de moderacao. Tente novamente em 10 minutos.',
  },
  {
    name: 'adminMetricsDrilldown',
    envKey: 'ADMIN_METRICS_DRILLDOWN',
    keyPrefix: 'admin-metrics-drilldown',
    keyStrategy: 'requester',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 5,
    message: 'Muitos pedidos de drill-down. Tente novamente em 1 minuto.',
  },
  {
    name: 'userReport',
    envKey: 'USER_REPORT',
    keyPrefix: 'user-report',
    keyStrategy: 'requester',
    defaultWindowMs: 10 * 60 * 1000,
    defaultLimit: 20,
    message: 'Muitos reports enviados. Tente novamente em 10 minutos.',
  },
  {
    name: 'brandIntegration',
    envKey: 'BRAND_INTEGRATION',
    keyPrefix: 'brand-integration',
    keyStrategy: 'integrationApiKey',
    defaultWindowMs: 1 * 60 * 1000,
    defaultLimit: 120,
    message: 'Muitas requisicoes de integracao. Tente novamente em 1 minuto.',
  },
  {
    name: 'general',
    envKey: 'GENERAL',
    keyPrefix: 'general',
    keyStrategy: 'requester',
    defaultWindowMs: 5 * 60 * 1000,
    defaultLimit: 100,
    message: 'Muitas requisicoes. Tente novamente em 5 minutos.',
  },
]

const getRequesterKey = (req: Request): string => {
  const authReq = req as Request & {
    user?: {
      id?: string
      _id?: unknown
    }
  }

  const userId =
    authReq.user?.id ||
    (authReq.user?._id !== undefined && authReq.user?._id !== null
      ? String(authReq.user._id)
      : undefined)

  if (typeof userId === 'string' && userId.length > 0) {
    return `user:${userId}`
  }

  const requestIp =
    typeof req.ip === 'string' && req.ip.length > 0
      ? req.ip
      : req.socket.remoteAddress || 'unknown'

  return `ip:${requestIp}`
}

const extractBrandIntegrationApiKey = (req: Request): string | null => {
  const headerValue = req.headers['x-finhub-api-key']
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim()
  }

  const authHeader = req.headers.authorization
  if (typeof authHeader !== 'string' || authHeader.trim().length === 0) {
    return null
  }

  const normalized = authHeader.trim()
  const lowerCaseNormalized = normalized.toLowerCase()

  if (lowerCaseNormalized.startsWith('apikey ')) {
    const rawToken = normalized.slice(7).trim()
    return rawToken || null
  }

  if (lowerCaseNormalized.startsWith('bearer ')) {
    const rawToken = normalized.slice(7).trim()
    return rawToken || null
  }

  return null
}

const getBrandIntegrationKey = (req: Request): string => {
  const rawApiKey = extractBrandIntegrationApiKey(req)
  if (!rawApiKey) {
    return getRequesterKey(req)
  }

  const prefix = rawApiKey.split('.', 1)[0]?.trim()
  const candidate = prefix && prefix.length >= 6 ? prefix : rawApiKey
  const digest = crypto.createHash('sha256').update(candidate).digest('hex').slice(0, 24)
  return `integration:${digest}`
}

const getLimiterRequesterKey = (req: Request, config: LimiterRuntimeConfig): string => {
  if (config.keyStrategy === 'integrationApiKey') {
    return getBrandIntegrationKey(req)
  }

  return getRequesterKey(req)
}

const buildRuntimeConfig = (
  definition: LimiterDefinition
): LimiterRuntimeConfig => ({
  name: definition.name,
  keyPrefix: definition.keyPrefix,
  keyStrategy: definition.keyStrategy,
  windowMs: parsePositiveIntegerEnv(
    `RATE_LIMIT_${definition.envKey}_WINDOW_MS`,
    definition.defaultWindowMs
  ),
  limit: parsePositiveIntegerEnv(
    `RATE_LIMIT_${definition.envKey}_MAX`,
    definition.defaultLimit
  ),
  message: definition.message,
})

const limiterConfigByName = limiterDefinitions.reduce(
  (acc, definition) => {
    acc[definition.name] = buildRuntimeConfig(definition)
    return acc
  },
  {} as Record<RateLimiterName, LimiterRuntimeConfig>
)

const adaptiveStores = new Map<RateLimiterName, AdaptiveRateLimitStore>()

const disableRedisForAllStores = (reason: string): void => {
  for (const store of adaptiveStores.values()) {
    store.disableRedis()
  }

  setRateLimiterBackendMode('memory', reason)
}

class AdaptiveRateLimitStore implements Store {
  private readonly memoryStore = new MemoryStore()
  private redisStore: RedisStore | null = null
  private options: RateLimitOptions | null = null

  constructor(private readonly limiterName: RateLimiterName, readonly prefix: string) {}

  get localKeys(): boolean {
    return this.redisStore === null
  }

  init(options: RateLimitOptions): void {
    this.options = options
    this.memoryStore.init(options)
    this.redisStore?.init(options)
  }

  enableRedis(sendCommand: SendCommandFn): void {
    const redisStore = new RedisStore({
      sendCommand,
      prefix: `${redisPrefix}${this.prefix}:`,
    })

    if (this.options) {
      redisStore.init(this.options)
    }

    this.redisStore = redisStore
  }

  disableRedis(): void {
    this.redisStore = null
  }

  async get(key: string) {
    const activeStore = this.redisStore ?? this.memoryStore
    try {
      return await activeStore.get?.(key)
    } catch (error) {
      return this.handleStoreError('get', key, error, () => this.memoryStore.get(key))
    }
  }

  async increment(key: string) {
    const activeStore = this.redisStore ?? this.memoryStore
    try {
      return await activeStore.increment(key)
    } catch (error) {
      return this.handleStoreError('increment', key, error, () => this.memoryStore.increment(key))
    }
  }

  async decrement(key: string) {
    const activeStore = this.redisStore ?? this.memoryStore
    try {
      await activeStore.decrement(key)
    } catch (error) {
      await this.handleStoreError('decrement', key, error, () =>
        this.memoryStore.decrement(key)
      )
    }
  }

  async resetKey(key: string) {
    const activeStore = this.redisStore ?? this.memoryStore
    try {
      await activeStore.resetKey(key)
    } catch (error) {
      await this.handleStoreError('resetKey', key, error, () =>
        this.memoryStore.resetKey(key)
      )
    }
  }

  async resetAll() {
    if (this.redisStore) {
      return
    }

    await this.memoryStore.resetAll()
  }

  async shutdown() {
    this.memoryStore.shutdown()
  }

  private async handleStoreError<T>(
    operation: string,
    key: string,
    error: unknown,
    fallbackFn: () => Promise<T>
  ): Promise<T> {
    if (!this.redisStore) {
      throw error
    }

    if (!allowMemoryFallback) {
      throw error
    }

    const keyType = key.startsWith('user:')
      ? 'user'
      : key.startsWith('ip:')
        ? 'ip'
        : key.startsWith('integration:')
          ? 'integration'
          : 'unknown'
    const errorMessage = error instanceof Error ? error.message : String(error)

    logWarn('rate_limiter_redis_runtime_error', {
      limiter: this.limiterName,
      operation,
      keyType,
      errorMessage,
      fallback: 'memory',
    })

    disableRedisForAllStores(`redis_runtime_error:${this.limiterName}`)

    return fallbackFn()
  }
}

const createAdaptiveStore = (
  limiterName: RateLimiterName,
  keyPrefix: string
): AdaptiveRateLimitStore => {
  const store = new AdaptiveRateLimitStore(limiterName, keyPrefix)
  adaptiveStores.set(limiterName, store)
  return store
}

const createLimiter = (
  config: LimiterRuntimeConfig,
  store: AdaptiveRateLimitStore
): RateLimitRequestHandler =>
  rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    message: ResponseBuilder.error(ErrorCodes.RATE_LIMIT_EXCEEDED, config.message),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getLimiterRequesterKey(req, config),
    store,
    skip: () => false,
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    passOnStoreError: false,
    handler: (_req, res, _next, optionsUsed) => {
      const requesterKey = getLimiterRequesterKey(_req, config)
      recordRateLimitExceededMetric(config.name, requesterKey)
      res.status(optionsUsed.statusCode).send(optionsUsed.message)
    },
  })

const buildLimiter = (name: RateLimiterName): RateLimitRequestHandler => {
  const config = limiterConfigByName[name]
  const store = createAdaptiveStore(name, config.keyPrefix)
  return createLimiter(config, store)
}

export const rateLimiter: Record<RateLimiterName, RateLimitRequestHandler> = {
  api: buildLimiter('api'),
  news: buildLimiter('news'),
  search: buildLimiter('search'),
  stats: buildLimiter('stats'),
  quickAnalysis: buildLimiter('quickAnalysis'),
  marketData: buildLimiter('marketData'),
  reits: buildLimiter('reits'),
  admin: buildLimiter('admin'),
  adminModerationAction: buildLimiter('adminModerationAction'),
  adminModerationBulk: buildLimiter('adminModerationBulk'),
  adminMetricsDrilldown: buildLimiter('adminMetricsDrilldown'),
  userReport: buildLimiter('userReport'),
  brandIntegration: buildLimiter('brandIntegration'),
  general: buildLimiter('general'),
}

let initialized = false
let redisEnabled = false
let redisClient: AppRedisClient | null = null

export const initializeRateLimiter = async (): Promise<void> => {
  if (initialized) {
    return
  }

  if (rateLimitStoreMode === 'memory') {
    setRateLimiterBackendMode('memory', 'config_memory_mode')
    logInfo('rate_limiter_initialized', {
      mode: 'memory',
      reason: 'RATE_LIMIT_STORE_MODE=memory',
    })
    initialized = true
    return
  }

  if (!redisUrl) {
    const missingUrlMessage =
      'RATE_LIMIT_REDIS_URL/REDIS_URL nao configurado para modo redis de rate limiter.'

    if (redisRequiredByEnv || rateLimitStoreMode === 'redis') {
      throw new Error(missingUrlMessage)
    }

    logWarn('rate_limiter_redis_url_missing', {
      fallback: 'memory',
      allowMemoryFallback,
    })
    setRateLimiterBackendMode('memory', 'redis_url_missing')
    initialized = true
    return
  }

  try {
    const client = getOrCreateRedisClient({
      url: redisUrl,
      connectTimeoutMs: redisConnectTimeoutMs,
      label: 'rate_limiter',
    })
    redisClient = client

    await connectRedisClient(client)

    const sendCommand: SendCommandFn = (...args: string[]) =>
      client.sendCommand(args as unknown as [string, ...string[]])

    for (const store of adaptiveStores.values()) {
      store.enableRedis(sendCommand)
    }

    redisEnabled = true
    initialized = true
    setRateLimiterBackendMode('redis', 'redis_connected')
    logInfo('rate_limiter_initialized', {
      mode: 'redis',
      limiterCount: adaptiveStores.size,
      redisPrefix,
      connectTimeoutMs: redisConnectTimeoutMs,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (redisRequiredByEnv || rateLimitStoreMode === 'redis' || !allowMemoryFallback) {
      logError('rate_limiter_redis_init_failed', error, {
        fallbackAllowed: allowMemoryFallback,
      })
      throw new Error(`Falha ao inicializar rate limiter Redis: ${errorMessage}`)
    }

    disableRedisForAllStores('redis_connect_failed')
    initialized = true
    logWarn('rate_limiter_redis_unavailable_memory_fallback', {
      errorMessage,
      allowMemoryFallback,
    })
  }
}

export const shutdownRateLimiter = async (): Promise<void> => {
  if (!initialized) {
    return
  }

  for (const store of adaptiveStores.values()) {
    await store.shutdown()
  }

  if (redisEnabled) {
    await closeRedisClient()
  }

  redisClient = null
  redisEnabled = false
  initialized = false
  disableRedisForAllStores('shutdown')
}

export const getRateLimiterRuntimeState = () => ({
  initialized,
  activeMode: redisEnabled ? 'redis' : 'memory',
  configuredStoreMode: rateLimitStoreMode,
  redisConfigured: redisUrl.length > 0,
  redisRequired: redisRequiredByEnv,
  memoryFallbackAllowed: allowMemoryFallback,
})
