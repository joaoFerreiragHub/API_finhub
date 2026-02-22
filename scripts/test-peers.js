// Quick test for the updated fetchPeers logic
const axios = require('axios')
require('dotenv').config()

const FMP_STABLE = 'https://financialmodelingprep.com/stable'
const API_KEY = process.env.FMP_API_KEY
const fetch = (url) => axios.get(url).then((r) => r.data)

async function fetchPeers(symbol) {
  const peersData = await fetch(`${FMP_STABLE}/stock-peers?symbol=${symbol}&apikey=${API_KEY}`)
  if (!Array.isArray(peersData) || peersData.length === 0) return { peers: [], quotes: [] }

  if (peersData[0]?.peersList) {
    const peers = peersData[0].peersList.slice(0, 6)
    const rawQuotes = peers.length > 0
      ? await fetch(`${FMP_STABLE}/quote?symbol=${peers.join(',')}&apikey=${API_KEY}`)
      : []
    return { peers, quotes: rawQuotes }
  }

  const peerEntries = peersData.filter((p) => p?.symbol).slice(0, 6)
  const peers = peerEntries.map((p) => p.symbol)
  const changeRaw = peers.length > 0
    ? await fetch(`${FMP_STABLE}/stock-price-change?symbol=${peers.join(',')}&apikey=${API_KEY}`)
    : []
  const changeMap = {}
  for (const c of Array.isArray(changeRaw) ? changeRaw : []) {
    if (c?.symbol) changeMap[c.symbol] = c['1D'] ?? 0
  }
  const quotes = peerEntries.map((p) => ({
    symbol: p.symbol,
    name: p.companyName,
    price: p.price ?? 0,
    changesPercentage: changeMap[p.symbol] ?? null,
    marketCap: p.mktCap ?? null,
    pe: null,
  }))
  return { peers, quotes }
}

async function main() {
  for (const sym of ['GOOGL', 'AAPL', 'JPM']) {
    console.log(`\n--- ${sym} ---`)
    const result = await fetchPeers(sym)
    console.log(`peers: ${result.peers.length}, quotes: ${result.quotes.length}`)
    result.quotes.slice(0, 3).forEach((q) => {
      const mktCap = q.marketCap ? (q.marketCap / 1e12).toFixed(2) + 'T' : 'null'
      console.log(`  ${q.symbol} | $${q.price.toFixed(2)} | ${q.changesPercentage?.toFixed(2)}% | ${mktCap} | ${q.name}`)
    })
  }
}

main().catch(console.error)
