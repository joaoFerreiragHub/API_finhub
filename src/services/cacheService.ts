// services/cacheService.ts

// Implementação de cache em memória para desenvolvimento
// TODO: Para produção, substituir por Redis

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number // Time to live em segundos
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
    private cache = new Map<string, CacheEntry<any>>()
    private hitCount = 0
    private missCount = 0
    private cleanupInterval: NodeJS.Timeout
  
    constructor() {
      // Limpar cache expirado a cada 5 minutos
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 5 * 60 * 1000)
  
      console.log('💾 Cache Service initialized (in-memory)')
    }
  
    // Armazenar dados no cache
    async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl: ttlSeconds,
          hits: 0,
          lastAccessed: Date.now()
        }
  
        this.cache.set(key, entry)
  
        console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`)
      } catch (error) {
        console.error('❌ Cache SET error:', error)
        // Não lançar erro - cache é opcional
      }
    }
  
    // Obter dados do cache
    async get<T>(key: string): Promise<T | null> {
      try {
        const entry = this.cache.get(key)
  
        if (!entry) {
          this.missCount++
          console.log(`💾 Cache MISS: ${key}`)
          return null
        }
  
        // Verificar se expirou
        const now = Date.now()
        const ageSeconds = (now - entry.timestamp) / 1000
  
        if (ageSeconds > entry.ttl) {
          this.cache.delete(key)
          this.missCount++
          console.log(`💾 Cache EXPIRED: ${key} (age: ${ageSeconds.toFixed(1)}s)`)
          return null
        }
  
        // Atualizar estatísticas
        entry.hits++
        entry.lastAccessed = now
        this.hitCount++
  
        console.log(`💾 Cache HIT: ${key} (age: ${ageSeconds.toFixed(1)}s, hits: ${entry.hits})`)
        return entry.data as T
  
      } catch (error) {
        console.error('❌ Cache GET error:', error)
        this.missCount++
        return null
      }
    }
  
    // Verificar se uma chave existe no cache
    async has(key: string): Promise<boolean> {
      try {
        const entry = this.cache.get(key)
        
        if (!entry) return false
  
        // Verificar se expirou
        const ageSeconds = (Date.now() - entry.timestamp) / 1000
        if (ageSeconds > entry.ttl) {
          this.cache.delete(key)
          return false
        }
  
        return true
      } catch (error) {
        console.error('❌ Cache HAS error:', error)
        return false
      }
    }
  
    // Remover uma chave específica
    async delete(key: string): Promise<boolean> {
      try {
        const deleted = this.cache.delete(key)
        if (deleted) {
          console.log(`💾 Cache DELETE: ${key}`)
        }
        return deleted
      } catch (error) {
        console.error('❌ Cache DELETE error:', error)
        return false
      }
    }
  
    // Limpar cache por padrão (usando wildcards)
    async clearPattern(pattern: string): Promise<number> {
      try {
        let deletedCount = 0
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
  
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.cache.delete(key)
            deletedCount++
          }
        }
  
        console.log(`💾 Cache CLEAR PATTERN: ${pattern} (${deletedCount} keys deleted)`)
        return deletedCount
      } catch (error) {
        console.error('❌ Cache CLEAR PATTERN error:', error)
        return 0
      }
    }
  
    // Limpar todo o cache
    async clear(): Promise<void> {
      try {
        const keyCount = this.cache.size
        this.cache.clear()
        this.hitCount = 0
        this.missCount = 0
  
        console.log(`💾 Cache CLEAR ALL: ${keyCount} keys deleted`)
      } catch (error) {
        console.error('❌ Cache CLEAR ALL error:', error)
      }
    }
  
    // Obter todas as chaves que correspondem a um padrão
    async keys(pattern?: string): Promise<string[]> {
      try {
        if (!pattern) {
          return Array.from(this.cache.keys())
        }
  
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return Array.from(this.cache.keys()).filter(key => regex.test(key))
      } catch (error) {
        console.error('❌ Cache KEYS error:', error)
        return []
      }
    }
  
    // Incrementar um valor numérico no cache
    async increment(key: string, delta: number = 1, ttlSeconds: number = 300): Promise<number> {
      try {
        const current = await this.get<number>(key) || 0
        const newValue = current + delta
        await this.set(key, newValue, ttlSeconds)
        return newValue
      } catch (error) {
        console.error('❌ Cache INCREMENT error:', error)
        return 0
      }
    }
  
    // Armazenar múltiplas chaves de uma vez
    async setMultiple<T>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
      try {
        const promises = entries.map(entry => 
          this.set(entry.key, entry.data, entry.ttl || 300)
        )
        
        await Promise.all(promises)
        console.log(`💾 Cache SET MULTIPLE: ${entries.length} keys`)
      } catch (error) {
        console.error('❌ Cache SET MULTIPLE error:', error)
      }
    }
  
    // Obter múltiplas chaves de uma vez
    async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
      try {
        const promises = keys.map(async key => ({
          key,
          value: await this.get<T>(key)
        }))
  
        const results = await Promise.all(promises)
        
        return results.reduce((acc, { key, value }) => {
          acc[key] = value
          return acc
        }, {} as Record<string, T | null>)
      } catch (error) {
        console.error('❌ Cache GET MULTIPLE error:', error)
        return {}
      }
    }
  
    // Cache com callback para buscar dados se não existir
    async remember<T>(
      key: string, 
      callback: () => Promise<T>, 
      ttlSeconds: number = 300
    ): Promise<T> {
      try {
        // Tentar obter do cache primeiro
        const cached = await this.get<T>(key)
        if (cached !== null) {
          return cached
        }
  
        // Se não existe, executar callback e cachear resultado
        console.log(`💾 Cache REMEMBER: executing callback for ${key}`)
        const data = await callback()
        await this.set(key, data, ttlSeconds)
        
        return data
      } catch (error) {
        console.error('❌ Cache REMEMBER error:', error)
        // Se falhar, executar callback sem cache
        return await callback()
      }
    }
  
    // Limpar entradas expiradas
    private cleanup(): void {
      const now = Date.now()
      let cleanedCount = 0
  
      for (const [key, entry] of this.cache.entries()) {
        const ageSeconds = (now - entry.timestamp) / 1000
        
        if (ageSeconds > entry.ttl) {
          this.cache.delete(key)
          cleanedCount++
        }
      }
  
      if (cleanedCount > 0) {
        console.log(`💾 Cache CLEANUP: ${cleanedCount} expired entries removed`)
      }
    }
  
    // Obter estatísticas do cache
    getStats(): CacheStats {
      const now = Date.now()
      const entries = Array.from(this.cache.values())
      
      let oldestTimestamp = now
      let newestTimestamp = 0
      let totalMemory = 0
  
      entries.forEach(entry => {
        if (entry.timestamp < oldestTimestamp) oldestTimestamp = entry.timestamp
        if (entry.timestamp > newestTimestamp) newestTimestamp = entry.timestamp
        
        // Estimativa aproximada do uso de memória
        totalMemory += JSON.stringify(entry.data).length
      })
  
      const totalRequests = this.hitCount + this.missCount
      const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0
  
      return {
        totalKeys: this.cache.size,
        totalHits: this.hitCount,
        totalMisses: this.missCount,
        hitRate: Number(hitRate.toFixed(2)),
        memoryUsage: this.formatBytes(totalMemory),
        oldestEntry: oldestTimestamp < now ? new Date(oldestTimestamp).toISOString() : 'N/A',
        newestEntry: newestTimestamp > 0 ? new Date(newestTimestamp).toISOString() : 'N/A'
      }
    }
  
    // Obter informações detalhadas de uma chave
    async getInfo(key: string): Promise<{
      exists: boolean
      data?: any
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
        lastAccessed: new Date(entry.lastAccessed).toISOString()
      }
    }
  
    // Namespace para chaves relacionadas a notícias
    news = {
      set: (key: string, data: any, ttl: number = 300) => 
        this.set(`news:${key}`, data, ttl),
      
      get: <T>(key: string) => 
        this.get<T>(`news:${key}`),
      
      delete: (key: string) => 
        this.delete(`news:${key}`),
      
      clear: () => 
        this.clearPattern('news:*'),
  
      remember: <T>(key: string, callback: () => Promise<T>, ttl: number = 300) =>
        this.remember(`news:${key}`, callback, ttl)
    }
  
    // Namespace para health checks
    health = {
      set: (key: string, data: any, ttl: number = 60) => 
        this.set(`health:${key}`, data, ttl),
      
      get: <T>(key: string) => 
        this.get<T>(`health:${key}`),
      
      clear: () => 
        this.clearPattern('health:*')
    }
  
    // Namespace para estatísticas
    stats = {
      set: (key: string, data: any, ttl: number = 1800) => // 30 minutos default
        this.set(`stats:${key}`, data, ttl),
      
      get: <T>(key: string) => 
        this.get<T>(`stats:${key}`),
      
      clear: () => 
        this.clearPattern('stats:*')
    }
  
    // Utilitário para formatar bytes
    private formatBytes(bytes: number): string {
      if (bytes === 0) return '0 Bytes'
      
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
  
    // Destruir cache service
    destroy(): void {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
      }
      this.cache.clear()
      console.log('💾 Cache Service destroyed')
    }
  }
  
  // Cache strategies para diferentes tipos de dados
  export const CacheStrategies = {
    // Cache para notícias (5 minutos)
    NEWS_SHORT: 300,
    
    // Cache para notícias featured (10 minutos)  
    NEWS_FEATURED: 600,
    
    // Cache para estatísticas (30 minutos)
    STATS: 1800,
    
    // Cache para health checks (1 minuto)
    HEALTH: 60,
    
    // Cache para searches (2 minutos)
    SEARCH: 120,
    
    // Cache para fontes (1 hora)
    SOURCES: 3600,
    
    // Cache longo para dados estáticos (24 horas)
    STATIC: 86400
  }
  
  // Chaves de cache padronizadas
  export const CacheKeys = {
    news: {
      list: (filters: string) => `news:list:${filters}`,
      featured: () => 'news:featured',
      trending: (timeframe: string) => `news:trending:${timeframe}`,
      byTicker: (ticker: string, filters: string) => `news:ticker:${ticker}:${filters}`,
      byCategory: (category: string, filters: string) => `news:category:${category}:${filters}`,
      single: (id: string) => `news:single:${id}`,
      search: (query: string, filters: string) => `news:search:${btoa(query)}:${filters}`
    },
    
    stats: {
      general: (filters: string) => `stats:general:${filters}`,
      sources: () => 'stats:sources',
      trending: (timeframe: string) => `stats:trending:${timeframe}`
    },
    
    health: {
      sources: () => 'health:sources',
      system: () => 'health:system'
    },
    
    sources: {
      list: () => 'sources:list',
      active: () => 'sources:active'
    }
  }
  
  // Instância singleton do cache service
  export const cacheService = new CacheService()
  
  // Helper para cache condicional
  export const conditionalCache = async <T>(
    condition: boolean,
    key: string,
    callback: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> => {
    if (!condition) {
      return await callback()
    }
    
    return await cacheService.remember(key, callback, ttl)
  }