import { Request, Response } from 'express'
import axios from 'axios'

interface CoinGeckoMarketItem {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  low_24h: number | null
  high_24h: number | null
  market_cap: number | null
  price_change_percentage_24h: number | null
}

interface FormattedCrypto {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  dayLow: number
  dayHigh: number
  marketCap: number
  change24hPercent: number
}

let cachedData: FormattedCrypto[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 15 * 60 * 1000

// CoinGecko fornece market cap real, volume e variacao 24h.
const coinGeckoApi = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 15000,
})

const fetchCryptoData = async (): Promise<FormattedCrypto[]> => {
  try {
    console.log('Fetching crypto data from CoinGecko API...')

    const response = await coinGeckoApi.get<CoinGeckoMarketItem[]>('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 200,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
    })

    if (!Array.isArray(response.data)) {
      throw new Error('Resposta invalida da API CoinGecko')
    }

    const items = response.data
      .map((item) => {
        const price = Number(item.current_price ?? 0)
        const dayLow = Number(item.low_24h ?? item.current_price ?? 0)
        const dayHigh = Number(item.high_24h ?? item.current_price ?? 0)
        const marketCap = Number(item.market_cap ?? 0)
        const change24hPercent = Number(item.price_change_percentage_24h ?? 0)

        return {
          id: item.id,
          symbol: item.symbol.toUpperCase(),
          name: item.name,
          image: item.image,
          price,
          dayLow,
          dayHigh,
          marketCap,
          change24hPercent,
        } satisfies FormattedCrypto
      })
      .filter((crypto) => crypto.price > 0)
      .sort((a, b) => b.marketCap - a.marketCap)

    console.log(`Fetched ${items.length} cryptos from CoinGecko`)
    return items
  } catch (error: any) {
    console.error('Erro ao buscar dados de criptomoedas:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 200))
    }
    return []
  }
}

export const getCryptoInfo = async (_req: Request, res: Response) => {
  try {
    const currentTime = Date.now()

    if (cachedData && currentTime - lastFetchTime < CACHE_DURATION) {
      console.log('Serving crypto data from cache')
      return res.json(cachedData)
    }

    console.log('Refreshing crypto data from provider...')
    const cryptoData = await fetchCryptoData()

    if (cryptoData.length === 0) {
      console.error('No crypto data returned by provider')
      throw new Error('Nenhum dado retornado pela API.')
    }

    cachedData = cryptoData
    lastFetchTime = currentTime

    console.log(`Crypto cache updated with ${cryptoData.length} assets`)
    res.json(cryptoData)
  } catch (error: any) {
    console.error('Erro ao processar a solicitacao crypto:', error.message)
    res.status(500).json({
      success: false,
      errorCode: 'FETCH_ERROR',
      message: 'Falha ao buscar dados de criptomoedas.',
      details: error.message,
    })
  }
}
