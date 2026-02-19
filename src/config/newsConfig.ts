// config/newsConfig.ts

export interface NewsAPIConfig {
    fmp?: {
      apiKey: string
      enabled: boolean
    }
    newsApi?: {
      apiKey: string
      enabled: boolean
    }
    alphaVantage?: {
      apiKey: string
      enabled: boolean
    }
    polygon?: {
      apiKey: string
      enabled: boolean
    }
    rss?: {
      enabled: boolean
      feeds: string[] // 'infomoney', 'eco', etc.
    }
  }
  
  // FIXED: Use process.env instead of import.meta.env for Node.js
  export const newsConfig: NewsAPIConfig = {
    fmp: {
      apiKey: process.env.FMP_API_KEY || '',
      enabled: Boolean(process.env.FMP_API_KEY)
    },
    newsApi: {
      apiKey: process.env.NEWS_API_KEY || '',
      enabled: Boolean(process.env.NEWS_API_KEY)
    },
    alphaVantage: {
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
      enabled: Boolean(process.env.ALPHA_VANTAGE_API_KEY)
    },
    polygon: {
      apiKey: process.env.POLYGON_API_KEY || '',
      enabled: Boolean(process.env.POLYGON_API_KEY)
    },
    rss: {
      enabled: true, // RSS sempre ativo (não precisa API key)
      feeds: ['infomoney', 'eco'] // Feeds ativos por padrão
    }
  }
  
  // Configurações padrão
  export const defaultNewsSettings = {
    refreshInterval: 5, // minutos
    maxArticlesPerSource: 50,
    enabledCategories: ['all', 'market', 'crypto', 'economy', 'earnings', 'general'],
    defaultSources: {
      fmp: true,
      newsApi: true,
      alphaVantage: false, // Requer API key premium
      polygon: false, // Requer API key
      yahoo: false, // Requer implementação backend
      rss: true // RSS sempre ativo (InfoMoney BR + ECO PT)
    },
    rateLimiting: {
      fmp: 1000, // 1 request per second
      newsApi: 1000, // 1 request per second
      alphaVantage: 2000, // 1 request per 2 seconds
      polygon: 2000 // 1 request per 2 seconds
    }
  }
  
  // Validar configuração
  export const validateNewsConfig = (config: NewsAPIConfig): {
    isValid: boolean
    errors: string[]
    availableServices: string[]
  } => {
    const errors: string[] = []
    const availableServices: string[] = []
  
    // Verificar FMP
    if (config.fmp?.enabled) {
      if (!config.fmp.apiKey) {
        errors.push('FMP API key is required but not provided')
      } else {
        availableServices.push('Financial Modeling Prep')
      }
    }
  
    // Verificar News API
    if (config.newsApi?.enabled) {
      if (!config.newsApi.apiKey) {
        errors.push('News API key is required but not provided')
      } else {
        availableServices.push('News API')
      }
    }
  
    // Verificar Alpha Vantage
    if (config.alphaVantage?.enabled) {
      if (!config.alphaVantage.apiKey) {
        errors.push('Alpha Vantage API key is required but not provided')
      } else {
        availableServices.push('Alpha Vantage')
      }
    }
  
    // Verificar Polygon
    if (config.polygon?.enabled) {
      if (!config.polygon.apiKey) {
        errors.push('Polygon API key is required but not provided')
      } else {
        availableServices.push('Polygon.io')
      }
    }
  
    return {
      isValid: errors.length === 0 && availableServices.length > 0,
      errors,
      availableServices
    }
  }
  
  // Obter APIs disponíveis
  export const getAvailableAPIs = (): string[] => {
    const available: string[] = []
    
    if (newsConfig.fmp?.enabled) available.push('FMP')
    if (newsConfig.newsApi?.enabled) available.push('NewsAPI')
    if (newsConfig.alphaVantage?.enabled) available.push('AlphaVantage')
    if (newsConfig.polygon?.enabled) available.push('Polygon')
    
    return available
  }
  
  // URLs de documentação das APIs
  export const apiDocumentation = {
    fmp: {
      name: 'Financial Modeling Prep',
      url: 'https://financialmodelingprep.com/developer/docs',
      pricing: 'https://financialmodelingprep.com/pricing',
      description: 'API financeira completa com notícias, dados de ações e análises'
    },
    newsApi: {
      name: 'News API',
      url: 'https://newsapi.org/docs',
      pricing: 'https://newsapi.org/pricing',
      description: 'API de notícias gerais com cobertura global'
    },
    alphaVantage: {
      name: 'Alpha Vantage',
      url: 'https://www.alphavantage.co/documentation/',
      pricing: 'https://www.alphavantage.co/premium/',
      description: 'API de dados financeiros com análise de sentimento'
    },
    polygon: {
      name: 'Polygon.io',
      url: 'https://polygon.io/docs/stocks',
      pricing: 'https://polygon.io/pricing',
      description: 'API de dados de mercado em tempo real'
    }
  }
  
  // FIXED: Example for Node.js .env file (without VITE_ prefix)
  export const envExample = `
  # Financial Modeling Prep (obrigatório para notícias básicas)
  FMP_API_KEY=your_fmp_api_key_here
  
  # News API (recomendado para notícias gerais)
  NEWS_API_KEY=your_newsapi_key_here
  
  # Alpha Vantage (opcional - análise de sentimento)
  ALPHA_VANTAGE_API_KEY=your_alphavantage_key_here
  
  # Polygon.io (opcional - dados premium)
  POLYGON_API_KEY=your_polygon_key_here
  `
  
  // FIXED: Helper function to initialize API keys in services
  export const initializeAPIServices = (): void => {
    // This function can be called at app startup to configure all services
    console.log('🔧 Initializing News API services...')
    
    const validation = validateNewsConfig(newsConfig)
    
    if (validation.isValid) {
      console.log('✅ News APIs configured successfully')
      console.log('📡 Available services:', validation.availableServices.join(', '))
    } else {
      console.warn('⚠️ Some News API configurations have issues:')
      validation.errors.forEach(error => console.warn(`  - ${error}`))
      
      if (validation.availableServices.length > 0) {
        console.log('📡 Available services:', validation.availableServices.join(', '))
      } else {
        console.error('❌ No news API services are available. Please check your environment variables.')
      }
    }
  }
  
  // FIXED: Environment type declarations for TypeScript
  declare global {
    namespace NodeJS {
      interface ProcessEnv {
        FMP_API_KEY?: string
        NEWS_API_KEY?: string
        ALPHA_VANTAGE_API_KEY?: string
        POLYGON_API_KEY?: string
      }
    }
  }