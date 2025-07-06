// ===== ENHANCED ALPHA VANTAGE SERVICE =====
  
  // src/services/external/alphaVantageServiceEnhanced.ts
  
  import { rateLimitManager } from '../rateLimitManager'
  import { NewsArticle, NewsQueryParams } from '../../types/news'
  import { SourceConfig } from '../../models/NewsSource'
  
  interface AlphaVantageError {
    isRateLimit: boolean
    isDailyLimit: boolean
    message: string
    retryAfter?: number
  }
  
  class AlphaVantageServiceEnhanced {
    private readonly baseUrl = 'https://www.alphavantage.co/query'
    private apiKey: string
    private readonly serviceName = 'alphavantage'
  
    constructor() {
      this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || ''
    }
  
    // Verificar se API está disponível
    isAvailable(): boolean {
      return this.isConfigured() && rateLimitManager.canMakeRequest(this.serviceName)
    }
  
    // Obter status do rate limit
    getRateLimitStatus() {
      return rateLimitManager.getServiceStatus(this.serviceName)
    }
  
    // Obter tempo até reset
    getTimeUntilReset(): number {
      return rateLimitManager.getTimeUntilReset(this.serviceName)
    }
  
    // Request com gestão de rate limit
    private async makeRequestWithRateLimit<T>(params: any): Promise<T> {
      // Verificar se pode fazer request
      if (!rateLimitManager.canMakeRequest(this.serviceName)) {
        const timeUntilReset = this.getTimeUntilReset()
        const hoursUntilReset = Math.ceil(timeUntilReset / (1000 * 60 * 60))
        
        throw this.createRateLimitError(
          `Alpha Vantage daily limit reached. Reset in ${hoursUntilReset} hours.`,
          true,
          timeUntilReset
        )
      }
  
      // Registar request
      rateLimitManager.recordRequest(this.serviceName)
  
      try {
        const url = new URL(this.baseUrl)
        
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, value.toString())
          }
        })
        
        url.searchParams.append('apikey', this.apiKey)
  
        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'FinHub-API/1.0',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(30000)
        })
  
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
  
        const data = await response.json() as T & { 
          'Error Message'?: string
          'Note'?: string
          'Information'?: string
        }
  
        // Verificar erros de rate limit
        if ('Information' in data && data['Information']) {
          const info = data['Information'] as string
          
          if (info.includes('rate limit') || info.includes('premium plan')) {
            // Marcar serviço como limitado
            const status = rateLimitManager.getServiceStatus(this.serviceName)
            if (status) {
              status.isLimitReached = true
            }
            
            throw this.createRateLimitError(info, true)
          }
        }
  
        if ('Error Message' in data && data['Error Message']) {
          throw new Error(`Alpha Vantage Error: ${data['Error Message']}`)
        }
  
        if ('Note' in data && data['Note']) {
          throw this.createRateLimitError(`Rate Limit: ${data['Note']}`, false)
        }
  
        return data
  
      } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new Error('Alpha Vantage request timeout (30s)')
        }
        throw error
      }
    }
  
    // Criar erro de rate limit estruturado
    private createRateLimitError(message: string, isDailyLimit: boolean, retryAfter?: number): AlphaVantageError {
      const error = new Error(message) as Error & AlphaVantageError
      error.isRateLimit = true
      error.isDailyLimit = isDailyLimit
      error.message = message
      if (retryAfter) {
        error.retryAfter = retryAfter
      }
      return error
    }
  
    // Método principal com fallback
    async getNews(params: NewsQueryParams, config: SourceConfig): Promise<NewsArticle[]> {
      try {
        if (!this.isAvailable()) {
          console.log('⚠️ Alpha Vantage not available (rate limit or not configured)')
          return []
        }
  
        const requestParams = {
          function: 'NEWS_SENTIMENT',
          limit: Math.min(params.limit || 20, 50),
          sort: 'LATEST'
        }
  
        const response = await this.makeRequestWithRateLimit(requestParams)
        
        // Processar resposta...
        return this.processResponse(response, params, config)
  
      } catch (error) {
        if (this.isRateLimitError(error)) {
          console.log(`⏳ Alpha Vantage rate limited: ${error.message}`)
          
          // Log para monitorização
          if (error.isDailyLimit) {
            console.log(`📊 Alpha Vantage daily limit reached. Reset in ${Math.ceil(this.getTimeUntilReset() / (1000 * 60 * 60))} hours`)
          }
          
          return [] // Retorna array vazio em vez de erro
        }
  
        console.error('❌ Alpha Vantage error:', error)
        return []
      }
    }
  
    // Verificar se é erro de rate limit
    private isRateLimitError(error: any): error is AlphaVantageError {
      return error && typeof error === 'object' && error.isRateLimit === true
    }
  
    // Processar resposta (implementação existente)
    private processResponse(response: any, params: NewsQueryParams, config: SourceConfig): NewsArticle[] {
      // Implementação da conversão de dados...
      // (usar código existente do alphaVantageService)
      return []
    }
  
    isConfigured(): boolean {
      return Boolean(this.apiKey && this.apiKey.trim() !== '')
    }
  }
  
  export const alphaVantageServiceEnhanced = new AlphaVantageServiceEnhanced()
  