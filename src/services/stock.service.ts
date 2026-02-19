// src/services/stock.service.ts
import axios from 'axios'

const FMP_STABLE = 'https://financialmodelingprep.com/stable'
const API_KEY = process.env.FMP_API_KEY

export async function fetchCompanyOverview(symbol: string) {
  const url = `${FMP_STABLE}/profile?symbol=${symbol}&apikey=${API_KEY}`

  try {
    const response = await axios.get(url)
    const data = response.data

    if (!data || data.length === 0) return null

    const company = data[0]

    return {
      symbol: company.symbol,
      name: company.companyName,
      industry: company.industry,
      sector: company.sector,
      description: company.description,
      ceo: company.ceo,
      website: company.website,
      image: company.image,
      ipoDate: company.ipoDate,
      price: company.price,
      marketCap: company.marketCap,
      beta: company.beta,
      lastDividend: company.lastDividend,
      employees: company.fullTimeEmployees,
      address: `${company.address}, ${company.city}, ${company.state}, ${company.zip}, ${company.country}`
    }
  } catch (error: any) {
    console.error('Erro ao chamar a API da FMP:', error.response?.data || error.message)
    throw new Error('Erro ao obter dados da empresa')
  }
}
