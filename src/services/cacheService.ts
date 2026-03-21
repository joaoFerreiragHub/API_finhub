import { logError, logInfo, logWarn } from '../utils/logger'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
  lastAccessed: number
}

interface CacheStats {
  totalKeys: number
  totalHits: number
  totalMisses: number
  hitRate: number
  memoryUsage: string
  oldestEntry: string
  newestEntry: string
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>()
  private hitCount = 0
  private missCount = 0
  private readonly cleanupInterval: NodeJS.Timeout

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
    this.cleanupInterval.unref?.()

    logInfo('cache_service_initialized', {
      backend: 'memory',
      cleanupIntervalSeconds: 300,
    })
  }

  async set<T>(key: string, data: T, ttlSeconds = 300): Promise<void> {
    try {
      const now = Date.now()
      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        ttl: ttlSeconds,
        hits: 0,
        lastAccessed: now,
      }

      this.cache.set(key, entry)
      logInfo('cache_set', {
        key,
        ttlSeconds,
        totalKeys: this.cache.size,
      })
    } catch (error) {
      logError('cache_set_error', error, { key, ttlSeconds })
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key)
      if (!entry) {
        this.missCount += 1
        logInfo('cache_miss', { key })
        return null
      }

      const now = Date.now()
      const ageSeconds = (now - entry.timestamp) / 1000
      if (ageSeconds > entry.ttl) {
        this.cache.delete(key)
        this.missCount += 1
        logInfo('cache_expired', {
          key,
          ageSeconds: Number(ageSeconds.toFixed(2)),
        })
        return null
      }

      entry.hits += 1
      entry.lastAccessed = now
      this.hitCount += 1

      logInfo('cache_hit', {
        key,
        ageSeconds: Number(ageSeconds.toFixed(2)),
        hits: entry.hits,
      })

      return entry.data as T
    } catch (error) {
      this.missCount += 1
      logError('cache_get_error', error, { key })
      return null
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key)
      if (!entry) return false

      const ageSeconds = (Date.now() - entry.timestamp) / 1000
      if (ageSeconds > entry.ttl) {
        this.cache.delete(key)
        return false
      }

      return true
    } catch (error) {
      logError('cache_has_error', error, { key })
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const deleted = this.cache.delete(key)
      if (deleted) {
        logInfo('cache_delete', {
          key,
          totalKeys: this.cache.size,
        })
      }
      return deleted
    } catch (error) {
      logError('cache_delete_error', error, { key })
      return false
    }
  }

  async clearPattern(pattern: string): Promise<number> {
    try {
      let deletedCount = 0
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key)
          deletedCount += 1
        }
      }

      logInfo('cache_clear_pattern', {
        pattern,
        deletedCount,
        totalKeys: this.cache.size,
      })

      return deletedCount
    } catch (error) {
      logError('cache_clear_pattern_error', error, { pattern })
      return 0
    }
  }

  async clear(): Promise<void> {
    try {
      const deletedCount = this.cache.size
      this.cache.clear()
      this.hitCount = 0
      this.missCount = 0

      logWarn('cache_clear_all', {
        deletedCount,
      })
    } catch (error) {
      logError('cache_clear_all_error', error)
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      if (!pattern) {
        return Array.from(this.cache.keys())
      }

      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return Array.from(this.cache.keys()).filter((key) => regex.test(key))
    } catch (error) {
      logError('cache_keys_error', error, { pattern })
      return []
    }
  }

  async increment(key: string, delta = 1, ttlSeconds = 300): Promise<number> {
    try {
      const currentValue = (await this.get<number>(key)) ?? 0
      const nextValue = currentValue + delta
      await this.set(key, nextValue, ttlSeconds)
      return nextValue
    } catch (error) {
      logError('cache_increment_error', error, {
        key,
        delta,
        ttlSeconds,
      })
      return 0
    }
  }

  async setMultiple<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
    try {
      await Promise.all(entries.map((entry) => this.set(entry.key, entry.data, entry.ttl ?? 300)))
      logInfo('cache_set_multiple', {
        totalEntries: entries.length,
      })
    } catch (error) {
      logError('cache_set_multiple_error', error, {
        totalEntries: entries.length,
      })
    }
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const pairs = await Promise.all(
        keys.map(async (key) => ({
          key,
          value: await this.get<T>(key),
        })),
      )

      return pairs.reduce((acc, pair) => {
        acc[pair.key] = pair.value
        return acc
      }, {} as Record<string, T | null>)
    } catch (error) {
      logError('cache_get_multiple_error', error, {
        totalKeys: keys.length,
      })
      return {}
    }
  }

  async remember<T>(key: string, callback: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await callback()

    try {
      await this.set(key, data, ttlSeconds)
    } catch (error) {
      logWarn('cache_remember_set_failed', {
        key,
        ttlSeconds,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    }

    return data
  }

  private cleanup(): void {
    const now = Date.now()
    let deletedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      const ageSeconds = (now - entry.timestamp) / 1000
      if (ageSeconds > entry.ttl) {
        this.cache.delete(key)
        deletedCount += 1
      }
    }

    if (deletedCount > 0) {
      logInfo('cache_cleanup', {
        deletedCount,
        totalKeys: this.cache.size,
      })
    }
  }

  getStats(): CacheStats {
    const now = Date.now()
    const entries = Array.from(this.cache.values())

    let oldestTimestamp = now
    let newestTimestamp = 0
    let totalMemoryBytes = 0

    for (const entry of entries) {
      if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp
      if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp

      try {
        totalMemoryBytes += JSON.stringify(entry.data).length
      } catch {
        totalMemoryBytes += 0
      }
    }

    const totalRequests = this.hitCount + this.missCount
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0

    return {
      totalKeys: this.cache.size,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      hitRate: Number(hitRate.toFixed(2)),
      memoryUsage: this.formatBytes(totalMemoryBytes),
      oldestEntry: oldestTimestamp < now ? new Date(oldestTimestamp).toISOString() : 'N/A',
      newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp).toISOString() : 'N/A',
    }
  }

  async getInfo(key: string): Promise<{
    exists: boolean
    data?: unknown
    ttl?: number
    age?: number
    hits?: number
    lastAccessed?: string
  }> {
    const entry = this.cache.get(key)
    if (!entry) {
      return { exists: false }
    }

    const now = Date.now()
    const ageSeconds = (now - entry.timestamp) / 1000
    const remainingTtl = Math.max(0, entry.ttl - ageSeconds)

    return {
      exists: true,
      data: entry.data,
      ttl: remainingTtl,
      age: ageSeconds,
      hits: entry.hits,
      lastAccessed: new Date(entry.lastAccessed).toISOString(),
    }
  }

  news = {
    set: (key: string, data: unknown, ttl = 300) => this.set(`news:${key}`, data, ttl),
    get: <T>(key: string) => this.get<T>(`news:${key}`),
    delete: (key: string) => this.delete(`news:${key}`),
    clear: () => this.clearPattern('news:*'),
    remember: <T>(key: string, callback: () => Promise<T>, ttl = 300) =>
      this.remember(`news:${key}`, callback, ttl),
  }

  health = {
    set: (key: string, data: unknown, ttl = 60) => this.set(`health:${key}`, data, ttl),
    get: <T>(key: string) => this.get<T>(`health:${key}`),
    clear: () => this.clearPattern('health:*'),
  }

  stats = {
    set: (key: string, data: unknown, ttl = 1800) => this.set(`stats:${key}`, data, ttl),
    get: <T>(key: string) => this.get<T>(`stats:${key}`),
    clear: () => this.clearPattern('stats:*'),
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${Number((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.cache.clear()
    logInfo('cache_service_destroyed')
  }
}

const encodeCacheSearchToken = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url')

export const CacheStrategies = {
  NEWS_SHORT: 300,
  NEWS_FEATURED: 600,
  STATS: 1800,
  HEALTH: 60,
  SEARCH: 120,
  SOURCES: 3600,
  STATIC: 86400,
  MARKET_QUOTE: 300,
  MARKET_FUNDAMENTALS: 3600,
  CRYPTO: 120,
  REIT_METRICS: 1800,
  WATCHLIST: 300,
}

export const CacheKeys = {
  news: {
    list: (filters: string) => `news:list:${filters}`,
    featured: () => 'news:featured',
    trending: (timeframe: string) => `news:trending:${timeframe}`,
    byTicker: (ticker: string, filters: string) => `news:ticker:${ticker}:${filters}`,
    byCategory: (category: string, filters: string) => `news:category:${category}:${filters}`,
    single: (id: string) => `news:single:${id}`,
    search: (query: string, filters: string) =>
      `news:search:${encodeCacheSearchToken(query)}:${filters}`,
  },
  stats: {
    general: (filters: string) => `stats:general:${filters}`,
    sources: () => 'stats:sources',
    trending: (timeframe: string) => `stats:trending:${timeframe}`,
  },
  health: {
    sources: () => 'health:sources',
    system: () => 'health:system',
  },
  sources: {
    list: () => 'sources:list',
    active: () => 'sources:active',
  },
  market: {
    quote: (symbol: string) => `market:quote:${symbol.toUpperCase()}`,
    fundamentals: (symbol: string) => `market:fundamentals:${symbol.toUpperCase()}`,
    batchSnapshot: (symbols: string) => `market:batch:${symbols}`,
  },
  crypto: {
    list: (params: string) => `crypto:list:${params}`,
  },
  reits: {
    metrics: (ticker: string) => `reits:metrics:${ticker.toUpperCase()}`,
  },
  watchlist: {
    batch: (symbols: string) => `watchlist:batch:${symbols}`,
  },
}

export const cacheService = new CacheService()

export const conditionalCache = async <T>(
  condition: boolean,
  key: string,
  callback: () => Promise<T>,
  ttl = 300,
): Promise<T> => {
  if (!condition) {
    return callback()
  }

  return cacheService.remember(key, callback, ttl)
}
