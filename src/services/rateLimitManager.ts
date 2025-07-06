// src/services/rateLimitManager.ts - Sistema de Gestão de Rate Limits

interface RateLimitConfig {
    requestsPerDay: number
    requestsPerMinute: number
    resetTime?: string // UTC time quando o limite reseta
  }
  
  interface RateLimitStatus {
    requestsToday: number
    requestsThisMinute: number
    lastReset: Date
    isLimitReached: boolean
    nextResetTime: Date
  }
  
  interface ServiceLimits {
    [serviceName: string]: {
      config: RateLimitConfig
      status: RateLimitStatus
    }
  }
  
  class RateLimitManager {
    private limits: ServiceLimits = {}
    private storageKey = 'api_rate_limits'
  
    constructor() {
      this.loadLimitsFromStorage()
      this.setupDefaultLimits()
    }
  
    // Configurar limites padrão para cada serviço
    private setupDefaultLimits(): void {
      this.setServiceLimits('alphavantage', {
        requestsPerDay: 25, // Free tier
        requestsPerMinute: 5,
        resetTime: '00:00' // Meia-noite UTC
      })
  
      this.setServiceLimits('newsapi', {
        requestsPerDay: 1000,
        requestsPerMinute: 60,
        resetTime: '00:00'
      })
  
      this.setServiceLimits('fmp', {
        requestsPerDay: 250,
        requestsPerMinute: 10,
        resetTime: '00:00'
      })
  
      this.setServiceLimits('polygon', {
        requestsPerDay: 1000,
        requestsPerMinute: 30,
        resetTime: '00:00'
      })
    }
  
    // Definir limites para um serviço
    setServiceLimits(serviceName: string, config: RateLimitConfig): void {
      if (!this.limits[serviceName]) {
        this.limits[serviceName] = {
          config,
          status: {
            requestsToday: 0,
            requestsThisMinute: 0,
            lastReset: new Date(),
            isLimitReached: false,
            nextResetTime: this.calculateNextReset(config.resetTime || '00:00')
          }
        }
      } else {
        this.limits[serviceName].config = config
      }
      
      this.saveLimitsToStorage()
    }
  
    // Verificar se pode fazer request
    canMakeRequest(serviceName: string): boolean {
      const service = this.limits[serviceName]
      if (!service) return true
  
      this.checkAndResetLimits(serviceName)
      
      const { config, status } = service
      
      // Verificar limite diário
      if (status.requestsToday >= config.requestsPerDay) {
        status.isLimitReached = true
        this.saveLimitsToStorage()
        return false
      }
  
      // Verificar limite por minuto
      if (status.requestsThisMinute >= config.requestsPerMinute) {
        return false
      }
  
      return true
    }
  
    // Registar um request
    recordRequest(serviceName: string): void {
      const service = this.limits[serviceName]
      if (!service) return
  
      this.checkAndResetLimits(serviceName)
      
      service.status.requestsToday++
      service.status.requestsThisMinute++
      
      this.saveLimitsToStorage()
      
      // Reset contador por minuto após 1 minuto
      setTimeout(() => {
        if (service.status.requestsThisMinute > 0) {
          service.status.requestsThisMinute = Math.max(0, service.status.requestsThisMinute - 1)
          this.saveLimitsToStorage()
        }
      }, 60000)
    }
  
    // Verificar e resetar limites se necessário
    private checkAndResetLimits(serviceName: string): void {
      const service = this.limits[serviceName]
      if (!service) return
  
      const now = new Date()
      
      // Reset diário
      if (now >= service.status.nextResetTime) {
        service.status.requestsToday = 0
        service.status.requestsThisMinute = 0
        service.status.isLimitReached = false
        service.status.lastReset = now
        service.status.nextResetTime = this.calculateNextReset(service.config.resetTime || '00:00')
        
        console.log(`🔄 Rate limit reset for ${serviceName}`)
        this.saveLimitsToStorage()
      }
    }
  
    // Calcular próximo reset
    private calculateNextReset(resetTime: string): Date {
      const [hours, minutes] = resetTime.split(':').map(Number)
      const tomorrow = new Date()
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(hours, minutes, 0, 0)
      return tomorrow
    }
  
    // Obter status de um serviço
    getServiceStatus(serviceName: string): RateLimitStatus | null {
      const service = this.limits[serviceName]
      if (!service) return null
  
      this.checkAndResetLimits(serviceName)
      return { ...service.status }
    }
  
    // Obter tempo até próximo reset
    getTimeUntilReset(serviceName: string): number {
      const service = this.limits[serviceName]
      if (!service) return 0
  
      return Math.max(0, service.status.nextResetTime.getTime() - Date.now())
    }
  
    // Obter todos os status
    getAllStatuses(): Record<string, RateLimitStatus> {
      const statuses: Record<string, RateLimitStatus> = {}
      
      Object.keys(this.limits).forEach(serviceName => {
        const status = this.getServiceStatus(serviceName)
        if (status) {
          statuses[serviceName] = status
        }
      })
      
      return statuses
    }
  
    // Persistência
    private saveLimitsToStorage(): void {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.limits))
      }
    }
  
    private loadLimitsFromStorage(): void {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            // Converter datas de string para Date
            Object.values(parsed).forEach((service: any) => {
              if (service.status) {
                service.status.lastReset = new Date(service.status.lastReset)
                service.status.nextResetTime = new Date(service.status.nextResetTime)
              }
            })
            this.limits = parsed
          } catch (error) {
            console.error('Error loading rate limits from storage:', error)
          }
        }
      }
    }
  }
  
  export const rateLimitManager = new RateLimitManager()
  
  
  // ===== ENHANCED NEWS SERVICE COM FALLBACKS =====
  
  