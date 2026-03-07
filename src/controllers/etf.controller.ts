import { Request, Response } from 'express'
import axios from 'axios'

const FMP_API_KEY = process.env.FMP_API_KEY

export const getETFInfo = async (req: Request, res: Response) => {
  const symbol = String(req.params.symbol ?? '')

  try {
    // Usa endpoints /stable/ compativeis com plano Starter.
    const [profileResponse, quoteResponse] = await Promise.all([
      axios.get(`https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${FMP_API_KEY}`),
      axios.get(`https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${FMP_API_KEY}`),
    ])

    if (!profileResponse?.data?.[0]) {
      return res.status(404).json({ error: 'ETF nao encontrado.' })
    }

    const profile = profileResponse.data[0]
    const quote = quoteResponse?.data?.[0] || {}

    const aggregatedData = {
      symbol: profile.symbol,
      name: profile.companyName,
      description: profile.description,
      sector: profile.sector,
      industry: profile.industry,
      price: quote.price || profile.price,
      marketCap: profile.marketCap,
      beta: profile.beta,
      volume: quote.volume,
      avgVolume: profile.averageVolume,
      change: quote.change,
      changesPercentage: quote.changePercentage,
      dayLow: quote.dayLow,
      dayHigh: quote.dayHigh,
      yearLow: quote.yearLow,
      yearHigh: quote.yearHigh,
      isEtf: profile.isEtf,
      note: 'Informacao basica. Para holdings detalhados e peso por setor, usa endpoint Yahoo ou plano premium.',
    }

    res.json(aggregatedData)
  } catch (error: any) {
    console.error(`Erro ao buscar dados do ETF (${symbol}):`, error.message)

    if (error.response) {
      return res.status(error.response.status).json({ error: error.response.data })
    }

    res.status(500).json({ error: 'Erro ao buscar informacoes do ETF.' })
  }
}

export const listETFs = async (_req: Request, res: Response) => {
  try {
    // Lista simplificada de ETFs populares sem endpoint dedicado no Starter.
    const popularETFs = [
      'SPY', 'VOO', 'IVV', 'QQQ', 'VTI', 'VEA', 'IEFA', 'AGG', 'VTV', 'VUG',
      'IWF', 'IWD', 'IWM', 'EFA', 'VWO', 'IEMG', 'BND', 'GLD', 'VNQ', 'XLF',
    ]

    const symbols = popularETFs.join(',')
    const response = await axios.get(`https://financialmodelingprep.com/stable/batch-quote?symbols=${symbols}&apikey=${FMP_API_KEY}`)

    res.json(response.data)
  } catch (error: any) {
    console.error('Erro ao buscar lista de ETFs:', error.message)
    res.status(500).json({ error: 'Erro ao buscar lista de ETFs.' })
  }
}

export const getETFsOverlap = async (req: Request, res: Response) => {
  const { etf1, etf2 } = req.query

  if (!etf1 || !etf2) {
    return res.status(400).json({ error: 'Parametros "etf1" e "etf2" sao obrigatorios.' })
  }

  try {
    console.log(`Comparando ETFs ${etf1} e ${etf2} com estimativa setorial...`)

    const [etf1ProfileResponse, etf2ProfileResponse] = await Promise.all([
      axios.get(`https://financialmodelingprep.com/stable/profile?symbol=${etf1}&apikey=${FMP_API_KEY}`),
      axios.get(`https://financialmodelingprep.com/stable/profile?symbol=${etf2}&apikey=${FMP_API_KEY}`),
    ])

    if (!etf1ProfileResponse?.data?.[0] || !etf2ProfileResponse?.data?.[0]) {
      return res.status(404).json({
        error: 'Nao foi possivel encontrar perfil de um ou ambos os ETFs.',
      })
    }

    const etf1Profile = etf1ProfileResponse.data[0]
    const etf2Profile = etf2ProfileResponse.data[0]

    const sameSector = etf1Profile.sector === etf2Profile.sector
    const sameIndustry = etf1Profile.industry === etf2Profile.industry

    // Estimativa simplificada por similaridade setorial.
    let totalOverlapWeight = 0
    if (sameSector && sameIndustry) totalOverlapWeight = 95
    else if (sameSector) totalOverlapWeight = 60
    else if (sameIndustry) totalOverlapWeight = 30
    else totalOverlapWeight = 10

    const overlappingHoldings: Record<string, number> = {}
    if (totalOverlapWeight > 50) {
      overlappingHoldings['top_holdings_estimate'] = totalOverlapWeight * 0.6
      overlappingHoldings[etf1Profile.sector || 'sector_estimate'] = totalOverlapWeight * 0.4
    }

    res.json({
      etf1: String(etf1),
      etf2: String(etf2),
      source: 'estimated_sector_similarity',
      isEstimated: true,
      totalOverlapWeight: parseFloat(totalOverlapWeight.toFixed(2)),
      overlappingHoldings,
      disclaimer:
        'Estimativa por setor/industria. Nao representa overlap real de holdings.',
      recommendedRealHoldingsEndpoint: `/api/etfs/compare-yahoo?etf1=${String(etf1)}&etf2=${String(etf2)}`,
      _details: {
        etf1Name: etf1Profile.companyName,
        etf2Name: etf2Profile.companyName,
        sameSector,
        sameIndustry,
      },
    })
  } catch (error: any) {
    console.error(`Erro ao comparar ETFs (${etf1} e ${etf2}):`, error.message)

    if (error.response) {
      return res.status(error.response.status).json({ error: error.response.data })
    }

    res.status(500).json({ error: 'Erro ao comparar os ETFs.' })
  }
}

export const getETFsSectorOverlap = async (req: Request, res: Response) => {
  const { etf1, etf2 } = req.query

  if (!etf1 || !etf2) {
    return res.status(400).json({ error: 'Parametros "etf1" e "etf2" sao obrigatorios.' })
  }

  try {
    console.log(`Comparando setores dos ETFs ${etf1} e ${etf2} com estimativa setorial...`)

    const [etf1ProfileResponse, etf2ProfileResponse] = await Promise.all([
      axios.get(`https://financialmodelingprep.com/stable/profile?symbol=${etf1}&apikey=${FMP_API_KEY}`),
      axios.get(`https://financialmodelingprep.com/stable/profile?symbol=${etf2}&apikey=${FMP_API_KEY}`),
    ])

    if (!etf1ProfileResponse?.data?.[0] || !etf2ProfileResponse?.data?.[0]) {
      return res.status(404).json({
        error: 'Nao foi possivel encontrar perfil de um ou ambos os ETFs.',
      })
    }

    const etf1Profile = etf1ProfileResponse.data[0]
    const etf2Profile = etf2ProfileResponse.data[0]

    const sameSector = etf1Profile.sector === etf2Profile.sector
    const sameIndustry = etf1Profile.industry === etf2Profile.industry

    const sectorOverlap: Record<string, number> = {}
    let totalSectorOverlapWeight = 0

    if (sameSector && etf1Profile.sector) {
      sectorOverlap[etf1Profile.sector] = 85
      totalSectorOverlapWeight = 85
    } else {
      if (etf1Profile.sector) sectorOverlap[etf1Profile.sector] = 5
      if (etf2Profile.sector && etf2Profile.sector !== etf1Profile.sector) {
        sectorOverlap[etf2Profile.sector] = 5
      }
      totalSectorOverlapWeight = 10
    }

    res.json({
      etf1: String(etf1),
      etf2: String(etf2),
      source: 'estimated_sector_similarity',
      isEstimated: true,
      totalSectorOverlapWeight: parseFloat(totalSectorOverlapWeight.toFixed(2)),
      sectorOverlap,
      disclaimer:
        'Estimativa por perfil setorial. Nao representa pesos reais de holdings por setor.',
      recommendedRealHoldingsEndpoint: `/api/etfs/compare-yahoo?etf1=${String(etf1)}&etf2=${String(etf2)}`,
      _details: {
        etf1Sector: etf1Profile.sector,
        etf2Sector: etf2Profile.sector,
        etf1Industry: etf1Profile.industry,
        etf2Industry: etf2Profile.industry,
        sameSector,
        sameIndustry,
      },
    })
  } catch (error: any) {
    console.error(`Erro ao comparar setores entre ETFs (${etf1} e ${etf2}):`, error.message)

    if (error.response) {
      return res.status(error.response.status).json({ error: error.response.data })
    }

    res.status(500).json({ error: 'Erro ao comparar setores dos ETFs.' })
  }
}
