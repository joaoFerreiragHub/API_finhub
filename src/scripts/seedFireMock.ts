/**
 * Seed FIRE Mock Portfolios — dados de teste para validação visual
 *
 * Cria 2 portfolios com holdings realistas para um investidor português:
 *   A) "Carteira ETF Global"   — método expenses, 4% rule, ETFs de acumulação
 *   B) "FIRE Dividendos"       — método passive_income, stocks + REITs + crypto
 *
 * Requer: API a correr em http://localhost:3000
 * Utilizador: user1@test.com / user123 (criado pelo seed-http.js principal)
 *
 * Run:   npx ts-node src/scripts/seedFireMock.ts
 * Clean: npx ts-node src/scripts/seedFireMock.ts --clean
 */

import '../config/env'
import mongoose from 'mongoose'
import { Portfolio } from '../models/Portfolio'
import { PortfolioHolding } from '../models/PortfolioHolding'
import { User } from '../models/User'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finhub'
const MOCK_TAG = '_MOCK_FIRE'
const TARGET_USER_EMAIL = 'user1@test.com'

// ─── Portfolio A — ETF Global ────────────────────────────────────────────────

const PORTFOLIO_A = {
  name: `Carteira ETF Global ${MOCK_TAG}`,
  currency: 'EUR' as const,
  fireTarget: {
    method: 'expenses' as const,
    monthlyExpenses: 2200,
    withdrawalRate: 0.04,
    inflationRate: 0.025,
  },
  monthlyContribution: 900,
  contributionGrowthRate: 0.02,
  isDefault: true,
}

const HOLDINGS_A = [
  {
    ticker: 'VWCE',
    assetType: 'etf' as const,
    name: 'Vanguard FTSE All-World UCITS ETF (ACC)',
    shares: 420,
    averageCost: 65.8,
    totalInvested: 420 * 65.8,
    monthlyAllocation: 450,
    allocationPercent: 50,
    currentPrice: 97.8,
    dividendYield: 0.5,
    dividendCAGR: 3.2,
    totalReturnCAGR: 9.2,
    sector: 'Global Equities',
    notes: 'Posição core. Acumulação — sem distribuição de dividendos. Cobre 3.700+ empresas.',
  },
  {
    ticker: 'IWDA',
    assetType: 'etf' as const,
    name: 'iShares Core MSCI World UCITS ETF (ACC)',
    shares: 180,
    averageCost: 58.4,
    totalInvested: 180 * 58.4,
    monthlyAllocation: 200,
    allocationPercent: 22,
    currentPrice: 82.15,
    dividendYield: 1.8,
    dividendCAGR: 4.1,
    totalReturnCAGR: 8.5,
    sector: 'Developed Markets',
    notes: 'Mercados desenvolvidos. Complementar ao VWCE para tilt em large-caps.',
  },
  {
    ticker: 'EIMI',
    assetType: 'etf' as const,
    name: 'iShares Core MSCI Emerging Markets IMI UCITS ETF',
    shares: 600,
    averageCost: 18.9,
    totalInvested: 600 * 18.9,
    monthlyAllocation: 120,
    allocationPercent: 13,
    currentPrice: 25.4,
    dividendYield: 2.1,
    dividendCAGR: 3.8,
    totalReturnCAGR: 6.8,
    sector: 'Emerging Markets',
    notes: 'Exposição a mercados emergentes: China, India, Brasil, Taiwan.',
  },
  {
    ticker: 'AGGH',
    assetType: 'bond' as const,
    name: 'iShares Core Global Aggregate Bond UCITS ETF (EUR Hedged)',
    shares: 1200,
    averageCost: 5.45,
    totalInvested: 1200 * 5.45,
    monthlyAllocation: 80,
    allocationPercent: 7,
    currentPrice: 5.03,
    dividendYield: 3.2,
    dividendCAGR: 0.8,
    totalReturnCAGR: 2.1,
    sector: 'Global Bonds',
    notes: 'Almofada de volatilidade. Cobertura cambial em EUR. Distribuição mensal.',
  },
  {
    ticker: 'XEON',
    assetType: 'cash' as const,
    name: 'Xtrackers EUR Overnight Rate Swap UCITS ETF',
    shares: 75,
    averageCost: 175.3,
    totalInvested: 75 * 175.3,
    monthlyAllocation: 50,
    allocationPercent: 8,
    currentPrice: 191.2,
    dividendYield: 3.5,
    dividendCAGR: 0,
    totalReturnCAGR: 3.5,
    sector: 'Money Market',
    notes: 'Equivalente a cash com rendimento. Taxa overnight BCE. Acumulação.',
  },
]

// ─── Portfolio B — Dividendos ────────────────────────────────────────────────

const PORTFOLIO_B = {
  name: `FIRE Dividendos ${MOCK_TAG}`,
  currency: 'EUR' as const,
  fireTarget: {
    method: 'passive_income' as const,
    desiredMonthlyIncome: 3000,
    withdrawalRate: 0.04,
    inflationRate: 0.025,
  },
  monthlyContribution: 1200,
  contributionGrowthRate: 0.03,
  isDefault: false,
}

const HOLDINGS_B = [
  {
    ticker: 'MSFT',
    assetType: 'stock' as const,
    name: 'Microsoft Corporation',
    shares: 35,
    averageCost: 285.4,
    totalInvested: 35 * 285.4,
    monthlyAllocation: 200,
    allocationPercent: 17,
    currentPrice: 415.26,
    dividendYield: 0.9,
    dividendCAGR: 10.2,
    totalReturnCAGR: 18.5,
    sector: 'Technology',
    notes: 'Crescimento + dividendo crescente. Azure + AI são catalisadores de longo prazo.',
  },
  {
    ticker: 'AAPL',
    assetType: 'stock' as const,
    name: 'Apple Inc.',
    shares: 48,
    averageCost: 152.8,
    totalInvested: 48 * 152.8,
    monthlyAllocation: 150,
    allocationPercent: 13,
    currentPrice: 219.86,
    dividendYield: 0.5,
    dividendCAGR: 7.8,
    totalReturnCAGR: 15.2,
    sector: 'Technology',
    notes: 'Baixo yield mas recompra agressiva de ações. Ecosistema defensivo.',
  },
  {
    ticker: 'O',
    assetType: 'reit' as const,
    name: 'Realty Income Corporation',
    shares: 120,
    averageCost: 51.2,
    totalInvested: 120 * 51.2,
    monthlyAllocation: 180,
    allocationPercent: 15,
    currentPrice: 57.84,
    dividendYield: 5.7,
    dividendCAGR: 4.2,
    totalReturnCAGR: 8.4,
    sector: 'Real Estate',
    notes: '"The Monthly Dividend Company". +25 anos de crescimento consecutivo do dividendo. NNN leases.',
  },
  {
    ticker: 'VYM',
    assetType: 'etf' as const,
    name: 'Vanguard High Dividend Yield ETF',
    shares: 85,
    averageCost: 108.4,
    totalInvested: 85 * 108.4,
    monthlyAllocation: 250,
    allocationPercent: 22,
    currentPrice: 132.5,
    dividendYield: 3.1,
    dividendCAGR: 6.5,
    totalReturnCAGR: 9.3,
    sector: 'High Dividend',
    notes: 'ETF diversificado de alto dividendo. 400+ empresas. Ótimo rácio custo/benefício.',
  },
  {
    ticker: 'REP',
    assetType: 'stock' as const,
    name: 'Repsol S.A.',
    shares: 500,
    averageCost: 12.4,
    totalInvested: 500 * 12.4,
    monthlyAllocation: 100,
    allocationPercent: 15,
    currentPrice: 13.85,
    dividendYield: 5.8,
    dividendCAGR: 3.1,
    totalReturnCAGR: 5.2,
    sector: 'Energy',
    notes: 'Dividendo elevado e crescente. Exposição ao sector energético europeu com transição renovável.',
  },
  {
    ticker: 'EDP',
    assetType: 'stock' as const,
    name: 'EDP — Energias de Portugal',
    shares: 800,
    averageCost: 4.85,
    totalInvested: 800 * 4.85,
    monthlyAllocation: 180,
    allocationPercent: 10,
    currentPrice: 3.42,
    dividendYield: 4.2,
    dividendCAGR: 2.8,
    totalReturnCAGR: 3.1,
    sector: 'Utilities',
    notes: 'Elétrica portuguesa com forte presença em renováveis (EDP Renováveis). Dividendo estável.',
  },
  {
    ticker: 'BTC',
    assetType: 'crypto' as const,
    name: 'Bitcoin',
    shares: 0.18,
    averageCost: 31500,
    totalInvested: 0.18 * 31500,
    monthlyAllocation: 140,
    allocationPercent: 8,
    currentPrice: 84600,
    dividendYield: 0,
    dividendCAGR: 0,
    totalReturnCAGR: 42.0,
    sector: 'Crypto',
    notes: 'Posição especulativa pequena. Store of value. Máx. 10% da carteira por política pessoal.',
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function clean(userId: mongoose.Types.ObjectId) {
  console.log('🧹 A limpar portfolios mock FIRE existentes...')
  const portfolios = await Portfolio.find({
    user: userId,
    name: { $regex: MOCK_TAG },
  })
  for (const p of portfolios) {
    await PortfolioHolding.deleteMany({ portfolio: p._id })
    await Portfolio.deleteOne({ _id: p._id })
    console.log(`  ✓ Removido: ${p.name}`)
  }
  console.log(`  ${portfolios.length} portfolio(s) removido(s).\n`)
}

interface PortfolioSeedData {
  name: string
  currency: 'EUR' | 'USD' | 'GBP'
  fireTarget: {
    method: 'expenses' | 'passive_income' | 'target_amount'
    monthlyExpenses?: number
    desiredMonthlyIncome?: number
    targetAmount?: number
    withdrawalRate: number
    inflationRate: number
  }
  monthlyContribution: number
  contributionGrowthRate: number
  isDefault: boolean
}

interface HoldingSeedData {
  ticker: string
  assetType: 'stock' | 'etf' | 'reit' | 'crypto' | 'bond' | 'cash'
  name: string
  shares: number
  averageCost: number
  totalInvested: number
  monthlyAllocation: number
  allocationPercent: number
  currentPrice?: number
  dividendYield?: number
  dividendCAGR?: number
  totalReturnCAGR?: number
  sector?: string
  notes?: string
}

async function createPortfolioWithHoldings(
  userId: mongoose.Types.ObjectId,
  portfolioData: PortfolioSeedData,
  holdings: HoldingSeedData[],
) {
  const portfolio = await Portfolio.create({
    user: userId,
    ...portfolioData,
  })

  console.log(`  ✓ Portfolio criado: ${portfolio.name} (${portfolio._id})`)

  for (const holding of holdings) {
    await PortfolioHolding.create({
      portfolio: portfolio._id,
      addedAt: new Date(),
      ...holding,
    })
    console.log(`    + ${holding.ticker} — ${holding.shares} shares @ €${holding.averageCost} (atual: €${holding.currentPrice})`)
  }

  const totalInvested = holdings.reduce((acc, h) => acc + h.totalInvested, 0)
  const currentValue = holdings.reduce((acc, h) => acc + h.shares * (h.currentPrice ?? h.averageCost), 0)
  const gain = currentValue - totalInvested
  const gainPct = ((gain / totalInvested) * 100).toFixed(1)

  console.log(`\n  📊 Resumo ${portfolio.name}:`)
  console.log(`     Investido: €${totalInvested.toFixed(2)}`)
  console.log(`     Valor atual: €${currentValue.toFixed(2)}`)
  console.log(`     Ganho/perda: €${gain.toFixed(2)} (${gainPct}%)`)

  return portfolio
}

async function main() {
  const isClean = process.argv.includes('--clean')

  console.log('🔗 A ligar ao MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Ligado.\n')

  const user = await User.findOne({ email: TARGET_USER_EMAIL })
  if (!user) {
    console.error(`❌ Utilizador "${TARGET_USER_EMAIL}" não encontrado.`)
    console.error('   Certifica-te de que corres o seed-http.js primeiro para criar os utilizadores.')
    process.exit(1)
  }

  console.log(`👤 Utilizador: ${user.name} (${user.email})\n`)

  await clean(user._id as mongoose.Types.ObjectId)

  if (isClean) {
    console.log('✅ Limpeza concluída.')
    await mongoose.disconnect()
    return
  }

  console.log('📁 A criar Portfolio A — Carteira ETF Global...')
  await createPortfolioWithHoldings(user._id as mongoose.Types.ObjectId, PORTFOLIO_A, HOLDINGS_A)

  console.log('\n📁 A criar Portfolio B — FIRE Dividendos...')
  await createPortfolioWithHoldings(user._id as mongoose.Types.ObjectId, PORTFOLIO_B, HOLDINGS_B)

  console.log('\n\n✅ Seed FIRE Mock concluído!')
  console.log('   Para limpar: npx ts-node src/scripts/seedFireMock.ts --clean')
  console.log('   Login com: user1@test.com / user123')
  console.log('   FIRE Dashboard: http://localhost:5173/ferramentas/fire/dashboard')
  console.log('   FIRE Simulador: http://localhost:5173/ferramentas/fire/simulador\n')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err)
  mongoose.disconnect()
  process.exit(1)
})
