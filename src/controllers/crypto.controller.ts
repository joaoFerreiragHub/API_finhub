import { Request, Response } from 'express'
import axios from 'axios'
import { cacheService, CacheKeys, CacheStrategies } from '../services/cacheService'

interface CoinGeckoMarketItem {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  circulating_supply: number | null
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
  marketCap: number | null
  change24hPercent: number
}

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
        const circulatingSupply =
          typeof item.circulating_supply === 'number' &&
          Number.isFinite(item.circulating_supply) &&
          item.circulating_supply > 0
            ? item.circulating_supply
            : null
        // Fonte: CoinGecko /coins/markets -> campo `circulating_supply`.
        const marketCap = circulatingSupply === null ? null : price * circulatingSupply
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
      .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))

    console.log(`Fetched ${items.length} cryptos from CoinGecko`)
    return items
  } catch (error: any) {
    console.error('Erro ao buscar dados de criptomoedas:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 200))
    }
    throw error
  }
}

export const getCryptoInfo = async (_req: Request, res: Response) => {
  try {
    const cacheKey = CacheKeys.crypto.list(
      'vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false&price_change_percentage=24h',
    )
    const cryptoData = await cacheService.remember(
      cacheKey,
      fetchCryptoData,
      CacheStrategies.CRYPTO,
    )

    if (cryptoData.length === 0) {
      console.error('No crypto data returned by provider')
      throw new Error('Nenhum dado retornado pela API.')
    }

    return res.json(cryptoData)
  } catch (error: any) {
    console.error('Erro ao processar a solicitacao crypto:', error.message)
    return res.status(500).json({
      success: false,
      errorCode: 'FETCH_ERROR',
      message: 'Falha ao buscar dados de criptomoedas.',
      details: error.message,
    })
  }
}
