import { Request } from 'express'
import rateLimit, { IncrementCallback } from 'express-rate-limit'
import { ResponseBuilder, ErrorCodes } from '../types/responses'

const store = new Map<string, { count: number; resetTime: number }>()

const incrFn = (key: string, callback: IncrementCallback): void => {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    const resetTime = now + 60000
    store.set(key, { count: 1, resetTime })
    callback(undefined, 1, new Date(resetTime))
    return
  }

  entry.count += 1
  callback(undefined, entry.count, new Date(entry.resetTime))
}

const memoryStore = {
  incr: incrFn,
  decrement: (key: string): void => {
    const entry = store.get(key)
    if (entry && entry.count > 0) {
      entry.count -= 1
    }
  },
  resetKey: (key: string, callback?: (error?: Error) => void): void => {
    store.delete(key)
    callback?.()
  },
  resetAll: (callback?: (error?: Error) => void): void => {
    store.clear()
    callback?.()
  },
}

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

const createLimiter = (
  windowMs: number,
  max: number,
  message: string,
  options?: { keyPrefix?: string }
) => {
  const keyPrefix = options?.keyPrefix ?? 'default'

  return rateLimit({
    windowMs,
    max,
    message: ResponseBuilder.error(ErrorCodes.RATE_LIMIT_EXCEEDED, message),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${keyPrefix}:${getRequesterKey(req)}`,
    store: {
      incr: incrFn,
      decrement: memoryStore.decrement,
      resetKey: memoryStore.resetKey,
      resetAll: memoryStore.resetAll,
    },
    skip: () => false,
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
  })
}

export const rateLimiter = {
  api: createLimiter(15 * 60 * 1000, 1000, 'Muitas requisicoes. Tente novamente em 15 minutos.', {
    keyPrefix: 'api',
  }),
  news: createLimiter(1 * 60 * 1000, 60, 'Muitas requisicoes de noticias. Tente novamente em 1 minuto.', {
    keyPrefix: 'news',
  }),
  search: createLimiter(1 * 60 * 1000, 30, 'Muitas pesquisas. Tente novamente em 1 minuto.', {
    keyPrefix: 'search',
  }),
  stats: createLimiter(
    5 * 60 * 1000,
    50,
    'Muitas requisicoes de estatisticas. Tente novamente em 5 minutos.',
    { keyPrefix: 'stats' }
  ),
  admin: createLimiter(60 * 60 * 1000, 10, 'Muitas operacoes administrativas. Tente novamente em 1 hora.', {
    keyPrefix: 'admin',
  }),
  adminModerationAction: createLimiter(
    1 * 60 * 1000,
    30,
    'Muitas acoes de moderacao. Tente novamente em 1 minuto.',
    { keyPrefix: 'admin-moderation-action' }
  ),
  adminModerationBulk: createLimiter(
    10 * 60 * 1000,
    10,
    'Muitos lotes de moderacao. Tente novamente em 10 minutos.',
    { keyPrefix: 'admin-moderation-bulk' }
  ),
  userReport: createLimiter(10 * 60 * 1000, 20, 'Muitos reports enviados. Tente novamente em 10 minutos.', {
    keyPrefix: 'user-report',
  }),
  general: createLimiter(5 * 60 * 1000, 100, 'Muitas requisicoes. Tente novamente em 5 minutos.', {
    keyPrefix: 'general',
  }),
}

setInterval((): void => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)
