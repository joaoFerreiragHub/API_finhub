// services/newsProcessorService.ts

import { NewsArticle, NewsCategory, SentimentLabel, SentimentAnalysis } from '../types/news'

interface ProcessingOptions {
  skipSentimentAnalysis?: boolean
  skipCategorization?: boolean
  skipTickerExtraction?: boolean
  skipQualityScore?: boolean
}

interface ProcessingStats {
  articlesProcessed: number
  sentimentAnalyzed: number
  categoriesUpdated: number
  tickersExtracted: number
  processingTime: number
}

class NewsProcessorService {
  
  // Dicionários para análise de sentimento
  private readonly positiveWords = [
    'bullish', 'surge', 'rally', 'gain', 'rise', 'up', 'positive', 'growth', 
    'beat', 'strong', 'outperform', 'buy', 'upgrade', 'breakthrough', 'record', 
    'high', 'boom', 'success', 'profit', 'soar', 'jump', 'climb', 'advance',
    'optimistic', 'confident', 'promising', 'robust', 'solid', 'impressive',
    'exceeded', 'surpass', 'milestone', 'achievement', 'expansion', 'launch'
  ]

  private readonly negativeWords = [
    'bearish', 'fall', 'drop', 'decline', 'down', 'negative', 'loss', 'weak',
    'miss', 'underperform', 'sell', 'downgrade', 'crash', 'low', 'concern',
    'risk', 'warning', 'cut', 'plunge', 'tumble', 'slide', 'sink', 'retreat',
    'pessimistic', 'worried', 'uncertain', 'volatile', 'struggle', 'challenge',
    'disappointed', 'failed', 'missed', 'below', 'worse', 'crisis', 'problem'
  ]

  // Palavras-chave por categoria
  private readonly categoryKeywords = {
    crypto: [
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency', 'blockchain',
      'defi', 'nft', 'altcoin', 'mining', 'wallet', 'exchange', 'coin', 'token',
      'satoshi', 'hodl', 'staking', 'yield', 'dapp', 'smart contract'
    ],
    earnings: [
      'earnings', 'quarterly', 'q1', 'q2', 'q3', 'q4', 'revenue', 'profit',
      'eps', 'guidance', 'outlook', 'forecast', 'results', 'report', 'beat',
      'miss', 'consensus', 'estimate', 'financial results', 'income statement'
    ],
    economy: [
      'fed', 'federal reserve', 'interest rate', 'inflation', 'gdp', 'unemployment',
      'recession', 'economic', 'monetary policy', 'fiscal policy', 'cpi', 'ppi',
      'jobless', 'employment', 'consumer confidence', 'retail sales', 'housing'
    ],
    market: [
      'stock market', 'nasdaq', 'dow', 's&p', 'nyse', 'trading', 'market',
      'investment', 'portfolio', 'equity', 'shares', 'volume', 'volatility',
      'correction', 'bull market', 'bear market', 'index', 'sector'
    ]
  }

  // Tickers comuns para filtrar falsos positivos
  private readonly commonNonTickers = [
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER',
    'WAS', 'ONE', 'OUR', 'HAD', 'HAS', 'HIS', 'LET', 'WHO', 'DID', 'YES',
    'OLD', 'GET', 'NOW', 'NEW', 'MAY', 'WAY', 'USE', 'MAN', 'DAY', 'TOO',
    'OWN', 'SAY', 'SHE', 'WHY', 'HOW', 'ITS', 'WHO', 'OIL', 'CEO', 'CFO',
    'USA', 'API', 'SEC', 'FDA', 'GDP', 'ETF', 'IPO', 'LLC', 'INC', 'LTD',
    'PLC', 'CORP', 'CO', 'GROUP', 'HOLDINGS', 'INTERNATIONAL', 'GLOBAL'
  ]

  // Método principal - processar múltiplos artigos
  async processArticles(
    articles: NewsArticle[], 
    options: ProcessingOptions = {}
  ): Promise<NewsArticle[]> {
    const startTime = Date.now()
    
    try {
      console.log(`🧠 Processing ${articles.length} articles...`)
      
      const processedArticles = await Promise.all(
        articles.map(article => this.processArticle(article, options))
      )

      const processingTime = Date.now() - startTime
      
      const stats: ProcessingStats = {
        articlesProcessed: processedArticles.length,
        sentimentAnalyzed: processedArticles.filter(a => a.sentiment).length,
        categoriesUpdated: processedArticles.filter(a => a.category !== 'general').length,
        tickersExtracted: processedArticles.filter(a => a.tickers && a.tickers.length > 0).length,
        processingTime
      }

      console.log(`✅ Processing completed:`, stats)
      
      return processedArticles

    } catch (error) {
      console.error('❌ Error processing articles:', error)
      // Em caso de erro, retornar artigos originais
      return articles
    }
  }

  // Processar um artigo individual
  async processArticle(
    article: NewsArticle, 
    options: ProcessingOptions = {}
  ): Promise<NewsArticle> {
    try {
      const processed = { ...article }

      // 1. Análise de sentimento
      if (!options.skipSentimentAnalysis) {
        processed.sentiment = this.analyzeSentiment(article.title, article.summary, article.content)
      }

      // 2. Categorização automática (se ainda não tem categoria específica)
      if (!options.skipCategorization && (article.category === 'general' || !article.category)) {
        processed.category = this.categorizeArticle(article.title, article.summary, article.content)
      }

      // 3. Extração de tickers
      if (!options.skipTickerExtraction) {
        const extractedTickers = this.extractTickers(article.title, article.summary, article.content)
        processed.tickers = this.mergeTickers(article.tickers || [], extractedTickers)
      }

      // 4. Score de qualidade
      if (!options.skipQualityScore) {
        // TODO: Implementar score de qualidade baseado em múltiplos fatores
        // processed.qualityScore = this.calculateQualityScore(processed)
      }

      return processed

    } catch (error) {
      console.error(`❌ Error processing article "${article.title}":`, error)
      return article // Retornar original em caso de erro
    }
  }

  // Análise de sentimento avançada
  private analyzeSentiment(title: string, summary: string, content: string): SentimentLabel {
    const text = `${title} ${summary} ${content}`.toLowerCase()
    
    // Contar palavras positivas e negativas
    const positiveMatches = this.positiveWords.filter(word => text.includes(word))
    const negativeMatches = this.negativeWords.filter(word => text.includes(word))
    
    const positiveScore = positiveMatches.length
    const negativeScore = negativeMatches.length
    
    // Aplicar pesos baseados na posição (título tem mais peso)
    const titleText = title.toLowerCase()
    const titlePositive = this.positiveWords.filter(word => titleText.includes(word)).length * 2
    const titleNegative = this.negativeWords.filter(word => titleText.includes(word)).length * 2
    
    const totalPositive = positiveScore + titlePositive
    const totalNegative = negativeScore + titleNegative
    
    // Determinar sentimento
    if (totalPositive > totalNegative + 1) {
      return 'positive'
    } else if (totalNegative > totalPositive + 1) {
      return 'negative'
    } else {
      return 'neutral'
    }
  }

  // Análise de sentimento detalhada (para uso futuro)
  analyzeSentimentDetailed(title: string, summary: string, content: string): SentimentAnalysis {
    const text = `${title} ${summary} ${content}`.toLowerCase()
    
    const positiveMatches = this.positiveWords.filter(word => text.includes(word))
    const negativeMatches = this.negativeWords.filter(word => text.includes(word))
    
    const positiveScore = positiveMatches.length
    const negativeScore = negativeMatches.length
    const totalWords = text.split(' ').length
    
    // Calcular score normalizado (-1 a 1)
    const rawScore = (positiveScore - negativeScore) / Math.max(totalWords / 100, 1)
    const normalizedScore = Math.max(-1, Math.min(1, rawScore))
    
    // Determinar label
    let label: SentimentLabel = 'neutral'
    if (normalizedScore > 0.2) label = 'positive'
    else if (normalizedScore < -0.2) label = 'negative'
    
    // Calcular confiança baseada na intensidade das palavras encontradas
    const confidence = Math.min(1, (positiveScore + negativeScore) / 10)
    
    return {
      score: Number(normalizedScore.toFixed(3)),
      label,
      confidence: Number(confidence.toFixed(3)),
      keywords: [...positiveMatches, ...negativeMatches]
    }
  }

  // Categorização automática
  private categorizeArticle(title: string, summary: string, content: string): NewsCategory {
    const text = `${title} ${summary} ${content}`.toLowerCase()
    
    const scores = Object.entries(this.categoryKeywords).map(([category, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length
      
      // Dar peso extra se a keyword aparecer no título
      const titleMatches = keywords.filter(keyword => title.toLowerCase().includes(keyword)).length
      const totalScore = matches + (titleMatches * 2)
      
      return { category, score: totalScore }
    })
    
    // Encontrar categoria com maior score
    const bestMatch = scores.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    )
    
    // Só classificar se tiver pelo menos 1 match
    if (bestMatch.score > 0) {
      return bestMatch.category as NewsCategory
    }
    
    return 'general'
  }

  // Extração de tickers do texto
  private extractTickers(title: string, summary: string, content: string): string[] {
    const text = `${title} ${summary} ${content}`
    
    // Regex para tickers: 1-5 letras maiúsculas, potencialmente precedidas por $
    const tickerRegex = /\$?([A-Z]{1,5})(?=\s|$|[.,!?;:])/g
    const matches = text.match(tickerRegex) || []
    
    // Limpar e filtrar tickers
    const cleanedTickers = matches
      .map(match => match.replace('$', '').toUpperCase())
      .filter(ticker => {
        // Filtrar palavras comuns que não são tickers
        if (this.commonNonTickers.includes(ticker)) return false
        
        // Filtrar tickers muito curtos ou muito longos
        if (ticker.length < 2 || ticker.length > 5) return false
        
        // Filtrar se for apenas números
        if (/^\d+$/.test(ticker)) return false
        
        return true
      })
    
    // Remover duplicatas e limitar a 10 tickers
    return [...new Set(cleanedTickers)].slice(0, 10)
  }

  // Merge de tickers existentes com novos extraídos
  private mergeTickers(existing: string[], extracted: string[]): string[] {
    const combined = [...existing, ...extracted]
    const unique = [...new Set(combined.map(ticker => ticker.toUpperCase()))]
    
    // Limitar a 15 tickers máximo e ordenar
    return unique.slice(0, 15).sort()
  }

  // Calcular score de qualidade do artigo
  private calculateQualityScore(article: NewsArticle): number {
    let score = 0.5 // Base score
    
    // Pontuação baseada no conteúdo
    if (article.content && article.content.length > 200) score += 0.1
    if (article.content && article.content.length > 500) score += 0.1
    if (article.content && article.content.length > 1000) score += 0.1
    
    // Pontuação baseada na presença de imagem
    if (article.image) score += 0.1
    
    // Pontuação baseada em tickers (indica relevância financeira)
    if (article.tickers && article.tickers.length > 0) score += 0.1
    if (article.tickers && article.tickers.length > 2) score += 0.1
    
    // Pontuação baseada no título
    if (article.title.length > 20 && article.title.length < 120) score += 0.1
    
    // Pontuação baseada no resumo
    if (article.summary && article.summary.length > 50) score += 0.1
    
    // Penalização por conteúdo muito curto
    if (article.content && article.content.length < 100) score -= 0.2
    
    // Bonificação por fonte conhecida
    const knownSources = ['Reuters', 'Bloomberg', 'Financial Times', 'CNBC', 'Wall Street Journal']
    if (knownSources.some(source => article.source.includes(source))) score += 0.1
    
    return Math.max(0, Math.min(1, score))
  }

  // Detectar possíveis duplicatas baseado em similaridade
  detectDuplicates(articles: NewsArticle[]): Array<{ 
    article1: string, 
    article2: string, 
    similarity: number 
  }> {
    const duplicates: Array<{ article1: string, article2: string, similarity: number }> = []
    
    for (let i = 0; i < articles.length; i++) {
      for (let j = i + 1; j < articles.length; j++) {
        const similarity = this.calculateSimilarity(articles[i], articles[j])
        
        if (similarity > 0.8) { // 80% de similaridade
          duplicates.push({
            article1: articles[i].id,
            article2: articles[j].id,
            similarity: Number(similarity.toFixed(3))
          })
        }
      }
    }
    
    return duplicates
  }

  // Calcular similaridade entre dois artigos
  private calculateSimilarity(article1: NewsArticle, article2: NewsArticle): number {
    // Similaridade do título (peso 50%)
    const titleSimilarity = this.stringSimilarity(
      article1.title.toLowerCase(),
      article2.title.toLowerCase()
    ) * 0.5
    
    // Similaridade do resumo (peso 30%)
    const summarySimilarity = this.stringSimilarity(
      article1.summary?.toLowerCase() || '',
      article2.summary?.toLowerCase() || ''
    ) * 0.3
    
    // Similaridade da URL (peso 20%)
    const urlSimilarity = this.stringSimilarity(
      article1.url,
      article2.url
    ) * 0.2
    
    return titleSimilarity + summarySimilarity + urlSimilarity
  }

  // Calcular similaridade entre duas strings (algoritmo básico)
  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (str1.length === 0 || str2.length === 0) return 0
    
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // Calcular distância de Levenshtein entre duas strings
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Extrair entidades nomeadas (placeholder para ML futuro)
  extractNamedEntities(text: string): {
    companies: string[]
    people: string[]
    locations: string[]
  } {
    // TODO: Implementar com biblioteca de NLP ou ML
    // Por agora, retornar estrutura vazia
    return {
      companies: [],
      people: [],
      locations: []
    }
  }

  // Análise de tendências por palavra-chave
  analyzeKeywordTrends(articles: NewsArticle[], timeframe: 'day' | 'week' | 'month' = 'day'): Array<{
    keyword: string
    frequency: number
    sentiment: SentimentLabel
    articles: string[]
  }> {
    const keywordMap = new Map<string, {
      count: number
      sentiments: SentimentLabel[]
      articleIds: string[]
    }>()
    
    articles.forEach(article => {
      const words = `${article.title} ${article.summary}`.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4) // Apenas palavras com mais de 4 caracteres
        .filter(word => !/^\d+$/.test(word)) // Excluir números
      
      words.forEach(word => {
        if (!keywordMap.has(word)) {
          keywordMap.set(word, { count: 0, sentiments: [], articleIds: [] })
        }
        
        const data = keywordMap.get(word)!
        data.count++
        data.sentiments.push(article.sentiment || 'neutral')
        data.articleIds.push(article.id)
      })
    })
    
    // Converter para array e ordenar por frequência
    return Array.from(keywordMap.entries())
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.count,
        sentiment: this.calculateDominantSentiment(data.sentiments),
        articles: data.articleIds
      }))
      .filter(item => item.frequency > 1) // Apenas keywords com mais de 1 ocorrência
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50) // Top 50 keywords
  }

  // Calcular sentimento dominante de uma lista
  private calculateDominantSentiment(sentiments: SentimentLabel[]): SentimentLabel {
    const counts = sentiments.reduce((acc, sentiment) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1
      return acc
    }, {} as Record<SentimentLabel, number>)
    
    const dominant = Object.entries(counts).reduce((prev, current) => 
      current[1] > prev[1] ? current : prev
    )
    
    return dominant[0] as SentimentLabel
  }

  // Obter estatísticas do processamento
  getProcessingStats(): {
    positiveWordsCount: number
    negativeWordsCount: number
    categoryKeywordsCount: number
    commonNonTickersCount: number
  } {
    return {
      positiveWordsCount: this.positiveWords.length,
      negativeWordsCount: this.negativeWords.length,
      categoryKeywordsCount: Object.values(this.categoryKeywords).reduce((sum, arr) => sum + arr.length, 0),
      commonNonTickersCount: this.commonNonTickers.length
    }
  }
}

export const newsProcessorService = new NewsProcessorService()