import { Request, Response } from 'express'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// ============================================
// ETF Controller - Yahoo Finance (Europeus)
// ============================================
// Suporta ETFs da Euronext: VWCE.DE, IWDA.AS, etc.

export const getYahooETFInfo = async (req: Request, res: Response) => {
  const symbol = String(req.params.symbol ?? "")

  try {
    console.log(`📊 Buscando dados do ETF ${symbol} via Yahoo Finance...`)

    // Buscar quote e módulo de fundHoldings
    const [quote, fundHoldings] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.quoteSummary(symbol, {
        modules: ['fundProfile', 'topHoldings', 'assetProfile', 'summaryDetail'],
      }).catch(() => null),
    ])

    if (!quote) {
      return res.status(404).json({ error: 'ETF não encontrado no Yahoo Finance.' })
    }

    const response: any = {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      exchange: quote.fullExchangeName,
      marketCap: quote.marketCap,
      volume: quote.regularMarketVolume,
      dayLow: quote.regularMarketDayLow,
      dayHigh: quote.regularMarketDayHigh,
      yearLow: quote.fiftyTwoWeekLow,
      yearHigh: quote.fiftyTwoWeekHigh,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
    }

    // Adicionar holdings se disponível
    if (fundHoldings?.topHoldings) {
      response.topHoldings = fundHoldings.topHoldings.holdings?.slice(0, 10).map((h: any) => ({
        symbol: h.symbol,
        name: h.holdingName,
        weight: h.holdingPercent ? (h.holdingPercent * 100).toFixed(2) : null,
      }))
      response.sectorWeightings = fundHoldings.topHoldings.sectorWeightings
    }

    // Adicionar perfil do fundo
    if (fundHoldings?.fundProfile) {
      response.category = fundHoldings.fundProfile.categoryName
      response.family = fundHoldings.fundProfile.family
    }

    // Adicionar detalhes
    if (fundHoldings?.summaryDetail) {
      response.yield = fundHoldings.summaryDetail.yield
      response.ytdReturn = fundHoldings.summaryDetail.ytdReturn
    }

    res.json(response)
  } catch (error: any) {
    console.error(`Erro ao buscar ETF ${symbol} via Yahoo Finance:`, error.message)
    res.status(500).json({
      error: 'Erro ao buscar dados do ETF.',
      details: error.message,
    })
  }
}

export const compareYahooETFs = async (req: Request, res: Response) => {
  const { etf1, etf2 } = req.query

  if (!etf1 || !etf2) {
    return res.status(400).json({ error: 'Parâmetros "etf1" e "etf2" são obrigatórios.' })
  }

  try {
    console.log(`📊 Comparando ETFs ${etf1} e ${etf2} via Yahoo Finance...`)

    const [data1, data2] = await Promise.all([
      yahooFinance.quoteSummary(String(etf1), {
        modules: ['fundProfile', 'topHoldings', 'price', 'summaryDetail'],
      }),
      yahooFinance.quoteSummary(String(etf2), {
        modules: ['fundProfile', 'topHoldings', 'price', 'summaryDetail'],
      }),
    ])

    // Calcular overlap de holdings
    const holdings1 = data1.topHoldings?.holdings || []
    const holdings2 = data2.topHoldings?.holdings || []

    const overlappingHoldings: Record<string, number> = {}
    let totalOverlapWeight = 0

    holdings1.forEach((h1: any) => {
      const h2 = holdings2.find((h: any) => h.symbol === h1.symbol)
      if (h2 && h1.holdingPercent && h2.holdingPercent) {
        const weight1 = h1.holdingPercent * 100
        const weight2 = h2.holdingPercent * 100
        const overlap = Math.min(weight1, weight2)

        overlappingHoldings[h1.symbol] = parseFloat(overlap.toFixed(2))
        totalOverlapWeight += overlap
      }
    })

    // Calcular overlap setorial
    const sectors1 = data1.topHoldings?.sectorWeightings || []
    const sectors2 = data2.topHoldings?.sectorWeightings || []

    const sectorOverlap: Record<string, { overlap: number; etf1Weight: number; etf2Weight: number }> = {}
    let totalSectorOverlapWeight = 0

    sectors1.forEach((s1: any) => {
      const sectorKey = Object.keys(s1)[0]
      if (!sectorKey) return

      const s2: any = sectors2.find((s: any) => Object.keys(s)[0] === sectorKey)
      if (s2) {
        const weight1 = s1[sectorKey] * 100
        const weight2 = s2[sectorKey] * 100
        const overlap = Math.min(weight1, weight2)

        sectorOverlap[sectorKey] = {
          overlap: parseFloat(overlap.toFixed(2)),
          etf1Weight: parseFloat(weight1.toFixed(2)),
          etf2Weight: parseFloat(weight2.toFixed(2)),
        }
        totalSectorOverlapWeight += overlap
      }
    })

    res.json({
      overlap: {
        etf1: String(etf1),
        etf2: String(etf2),
        totalOverlapWeight: parseFloat(totalOverlapWeight.toFixed(2)),
        overlappingHoldings,
        _source: 'Yahoo Finance',
      },
      sectors: {
        etf1: String(etf1),
        etf2: String(etf2),
        totalSectorOverlapWeight: parseFloat(totalSectorOverlapWeight.toFixed(2)),
        sectorOverlap,
        _source: 'Yahoo Finance',
      },
    })
  } catch (error: any) {
    console.error(`Erro ao comparar ETFs via Yahoo Finance:`, error.message)
    res.status(500).json({
      error: 'Erro ao comparar ETFs.',
      details: error.message,
    })
  }
}

export const listPopularEuropeanETFs = async (req: Request, res: Response) => {
  try {
    // Lista de ETFs populares em Portugal/Europa
    const popularETFs = [
      'VWCE.DE',   // Vanguard FTSE All-World EUR
      'IWDA.AS',   // iShares Core MSCI World EUR
      'EQQQ.DE',   // Invesco EQQQ Nasdaq-100 EUR
      'CSPX.L',    // iShares Core S&P 500 USD
      'VUSA.L',    // Vanguard S&P 500 USD
      'VUAA.AS',   // Vanguard S&P 500 EUR
      'SWDA.L',    // SPDR MSCI World USD
      'VHYL.AS',   // Vanguard FTSE All-World High Div EUR
      'EMIM.L',    // iShares Core MSCI EM IMI USD
      'IEMA.L',    // iShares Core MSCI EM EUR
    ]

    const symbols = popularETFs.join(',')
    const quotes = await yahooFinance.quote(symbols)

    const data = Array.isArray(quotes) ? quotes : [quotes]

    res.json(
      data.map((q: any) => ({
        symbol: q.symbol,
        name: q.longName || q.shortName,
        price: q.regularMarketPrice,
        currency: q.currency,
        change: q.regularMarketChange,
        changePercent: q.regularMarketChangePercent,
        volume: q.regularMarketVolume,
      }))
    )
  } catch (error: any) {
    console.error('Erro ao listar ETFs europeus:', error.message)
    res.status(500).json({ error: 'Erro ao listar ETFs europeus.' })
  }
}
