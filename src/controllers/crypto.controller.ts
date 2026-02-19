import { Request, Response } from 'express'
import axios from 'axios'

// Binance API response format
interface BinanceTicker {
  symbol: string
  priceChange: string
  priceChangePercent: string
  weightedAvgPrice: string
  prevClosePrice: string
  lastPrice: string
  bidPrice: string
  askPrice: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
  openTime: number
  closeTime: number
  count: number
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
}

let cachedData: FormattedCrypto[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutos

// Usar Binance Public API (gratuita, sem autenticação, 1200 req/min)
const binanceApi = axios.create({
  baseURL: 'https://api.binance.com/api/v3',
  timeout: 15000,
})

// Mapeamento de símbolos Binance para nomes e IDs conhecidos
const CRYPTO_NAMES: Record<string, { name: string; id: string }> = {
  BTC: { name: 'Bitcoin', id: 'bitcoin' },
  ETH: { name: 'Ethereum', id: 'ethereum' },
  BNB: { name: 'Binance Coin', id: 'binancecoin' },
  SOL: { name: 'Solana', id: 'solana' },
  XRP: { name: 'Ripple', id: 'ripple' },
  ADA: { name: 'Cardano', id: 'cardano' },
  DOGE: { name: 'Dogecoin', id: 'dogecoin' },
  AVAX: { name: 'Avalanche', id: 'avalanche-2' },
  MATIC: { name: 'Polygon', id: 'matic-network' },
  DOT: { name: 'Polkadot', id: 'polkadot' },
  LINK: { name: 'Chainlink', id: 'chainlink' },
  UNI: { name: 'Uniswap', id: 'uniswap' },
  LTC: { name: 'Litecoin', id: 'litecoin' },
  ATOM: { name: 'Cosmos', id: 'cosmos' },
  XLM: { name: 'Stellar', id: 'stellar' },
  BCH: { name: 'Bitcoin Cash', id: 'bitcoin-cash' },
  ALGO: { name: 'Algorand', id: 'algorand' },
  VET: { name: 'VeChain', id: 'vechain' },
  TRX: { name: 'TRON', id: 'tron' },
  FIL: { name: 'Filecoin', id: 'filecoin' },
  ETC: { name: 'Ethereum Classic', id: 'ethereum-classic' },
  NEAR: { name: 'NEAR Protocol', id: 'near' },
  APT: { name: 'Aptos', id: 'aptos' },
  ARB: { name: 'Arbitrum', id: 'arbitrum' },
  OP: { name: 'Optimism', id: 'optimism' },
  ICP: { name: 'Internet Computer', id: 'internet-computer' },
  HBAR: { name: 'Hedera', id: 'hedera-hashgraph' },
  INJ: { name: 'Injective', id: 'injective-protocol' },
  STX: { name: 'Stacks', id: 'blockstack' },
  IMX: { name: 'Immutable X', id: 'immutable-x' },
}

const fetchCryptoData = async (): Promise<FormattedCrypto[]> => {
  try {
    console.log('📊 Fetching crypto data from Binance API...')

    // Buscar todos os tickers 24h
    const response = await binanceApi.get<BinanceTicker[]>('/ticker/24hr')

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Resposta inválida da API Binance')
    }

    // Filtrar apenas pares USDT (equivalente a USD) e principais cryptos
    const usdtPairs = response.data
      .filter((ticker) => ticker.symbol.endsWith('USDT'))
      .map((ticker) => {
        const symbol = ticker.symbol.replace('USDT', '')
        const price = parseFloat(ticker.lastPrice)
        const high = parseFloat(ticker.highPrice)
        const low = parseFloat(ticker.lowPrice)
        const quoteVolume = parseFloat(ticker.quoteVolume)

        // Estimar market cap baseado no volume de 24h em USDT
        const marketCap = quoteVolume

        const cryptoInfo = CRYPTO_NAMES[symbol] || {
          name: symbol,
          id: symbol.toLowerCase(),
        }

        return {
          id: cryptoInfo.id,
          symbol: symbol,
          name: cryptoInfo.name,
          image: `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`,
          price: price,
          dayLow: low,
          dayHigh: high,
          marketCap: marketCap,
        }
      })
      .filter((crypto) => crypto.price > 0) // Remover cryptos sem preço
      .sort((a, b) => b.marketCap - a.marketCap) // Ordenar por volume (proxy market cap)
      .slice(0, 200) // Top 200 cryptos

    console.log(`✅ Fetched ${usdtPairs.length} cryptos from Binance`)
    return usdtPairs
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados de criptomoedas:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', JSON.stringify(error.response.data).substring(0, 200))
    }
    return []
  }
}

export const getCryptoInfo = async (req: Request, res: Response) => {
  try {
    const currentTime = Date.now()

    // Verificar se o cache é válido
    if (cachedData && currentTime - lastFetchTime < CACHE_DURATION) {
      console.log('✅ Servindo dados do cache crypto')
      return res.json(cachedData)
    }

    console.log('🔄 Buscando novos dados da API Binance...')
    const cryptoData = await fetchCryptoData()

    if (cryptoData.length === 0) {
      console.error('⚠️ Nenhum dado retornado pela API Binance')
      throw new Error('Nenhum dado retornado pela API.')
    }

    // Atualizar o cache
    cachedData = cryptoData
    lastFetchTime = currentTime

    console.log(`✅ Dados atualizados no cache: ${cryptoData.length} cryptos`)
    res.json(cryptoData)
  } catch (error: any) {
    console.error('❌ Erro ao processar a solicitação crypto:', error.message)
    res.status(500).json({
      success: false,
      errorCode: 'FETCH_ERROR',
      message: 'Falha ao buscar dados de criptomoedas.',
      details: error.message,
    })
  }
}
