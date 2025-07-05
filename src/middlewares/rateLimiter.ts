import rateLimit, { IncrementCallback } from 'express-rate-limit'
import { ResponseBuilder, ErrorCodes } from '../types/responses'

// Store simples em memória para desenvolvimento
const store = new Map<string, { count: number; resetTime: number }>()

// Função base para incremento usando o tipo correto da biblioteca
const incrFn = (key: string, callback: IncrementCallback): void => {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetTime) {
    const resetTime = now + 60000 // 1 minuto
    store.set(key, { count: 1, resetTime })
    callback(undefined, 1, new Date(resetTime))
  } else {
    entry.count++
    callback(undefined, entry.count, new Date(entry.resetTime))
  }
}

// Custom store para evitar logs excessivos
const memoryStore = {
  incr: incrFn,
  decrement: (key: string): void => {
    const entry = store.get(key)
    if (entry && entry.count > 0) {
      entry.count--
    }
  },
  resetKey: (key: string, callback?: (error?: Error) => void): void => {
    store.delete(key)
    if (callback) callback()
  },
  resetAll: (callback?: (error?: Error) => void): void => {
    store.clear()
    if (callback) callback()
  }
}

const createLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: ResponseBuilder.error(ErrorCodes.RATE_LIMIT_EXCEEDED, message),
    standardHeaders: true,
    legacyHeaders: false,
    store: {
      incr: incrFn,
      decrement: memoryStore.decrement,
      resetKey: memoryStore.resetKey,
      resetAll: memoryStore.resetAll
    },
    skip: () => false,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  })
}

export const rateLimiter = {
  api: createLimiter(
    15 * 60 * 1000, // 15 minutos
    1000,
    'Muitas requisições. Tente novamente em 15 minutos.'
  ),
  news: createLimiter(
    1 * 60 * 1000,
    60,
    'Muitas requisições de notícias. Tente novamente em 1 minuto.'
  ),
  search: createLimiter(
    1 * 60 * 1000,
    30,
    'Muitas pesquisas. Tente novamente em 1 minuto.'
  ),
  stats: createLimiter(
    5 * 60 * 1000,
    50,
    'Muitas requisições de estatísticas. Tente novamente em 5 minutos.'
  ),
  admin: createLimiter(
    60 * 60 * 1000,
    10,
    'Muitas operações administrativas. Tente novamente em 1 hora.'
  ),
  general: createLimiter(
    5 * 60 * 1000,
    100,
    'Muitas requisições. Tente novamente em 5 minutos.'
  )
}

// Limpeza periódica do store para evitar crescimento desnecessário
setInterval((): void => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)