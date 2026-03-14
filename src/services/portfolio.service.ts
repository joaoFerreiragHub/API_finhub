import mongoose from 'mongoose'
import { Portfolio, PortfolioCurrency, PortfolioFireTargetMethod } from '../models/Portfolio'
import { PortfolioAssetType, PortfolioHolding } from '../models/PortfolioHolding'
import { resolvePagination } from '../utils/pagination'

const SUPPORTED_CURRENCIES: readonly PortfolioCurrency[] = ['EUR', 'USD', 'GBP']
const SUPPORTED_ASSET_TYPES: readonly PortfolioAssetType[] = [
  'stock',
  'etf',
  'reit',
  'crypto',
  'bond',
  'cash',
]
const SUPPORTED_FIRE_METHODS: readonly PortfolioFireTargetMethod[] = [
  'expenses',
  'passive_income',
  'target_amount',
]
const SUPPORTED_SCENARIOS = ['optimistic', 'base', 'conservative', 'bear'] as const

type SimulationScenario = (typeof SUPPORTED_SCENARIOS)[number]

interface ScenarioPreset {
  returnMultiplier: number
  inflationOverride?: number
}

const SCENARIO_PRESETS: Record<SimulationScenario, ScenarioPreset> = {
  optimistic: { returnMultiplier: 1.2, inflationOverride: 0.015 },
  base: { returnMultiplier: 1 },
  conservative: { returnMultiplier: 0.75, inflationOverride: 0.03 },
  bear: { returnMultiplier: 0.45, inflationOverride: 0.035 },
}

const DEFAULT_ANNUAL_RETURN_BY_ASSET: Record<PortfolioAssetType, number> = {
  stock: 0.08,
  etf: 0.07,
  reit: 0.065,
  crypto: 0.12,
  bond: 0.03,
  cash: 0.01,
}

const DEFAULT_DIVIDEND_YIELD_BY_ASSET: Record<PortfolioAssetType, number> = {
  stock: 0.02,
  etf: 0.018,
  reit: 0.045,
  crypto: 0,
  bond: 0.025,
  cash: 0.01,
}

export interface PortfolioFireTargetInput {
  method: PortfolioFireTargetMethod
  monthlyExpenses?: number
  desiredMonthlyIncome?: number
  targetAmount?: number
  withdrawalRate?: number
  inflationRate?: number
}

export interface CreatePortfolioInput {
  name: string
  currency?: PortfolioCurrency
  fireTarget: PortfolioFireTargetInput
  monthlyContribution?: number
  contributionGrowthRate?: number
  isDefault?: boolean
}

export interface UpdatePortfolioInput {
  name?: string
  currency?: PortfolioCurrency
  fireTarget?: PortfolioFireTargetInput
  monthlyContribution?: number
  contributionGrowthRate?: number
  isDefault?: boolean
}

export interface CreatePortfolioHoldingInput {
  ticker: string
  assetType: PortfolioAssetType
  name: string
  shares: number
  averageCost: number
  monthlyAllocation?: number
  allocationPercent?: number
  currentPrice?: number
  dividendYield?: number
  dividendCAGR?: number
  totalReturnCAGR?: number
  sector?: string
  notes?: string
}

export interface UpdatePortfolioHoldingInput {
  ticker?: string
  assetType?: PortfolioAssetType
  name?: string
  shares?: number
  averageCost?: number
  monthlyAllocation?: number
  allocationPercent?: number
  currentPrice?: number
  dividendYield?: number
  dividendCAGR?: number
  totalReturnCAGR?: number
  sector?: string
  notes?: string
}

export interface PortfolioListFilters {
  page?: number
  limit?: number
}

export interface PortfolioSimulationCustomOverride {
  annualReturn?: number
  dividendYield?: number
}

export interface SimulatePortfolioInput {
  scenarios?: SimulationScenario[]
  maxYears?: number
  drip?: boolean
  includeInflation?: boolean
  customOverrides?: Record<string, PortfolioSimulationCustomOverride>
}

interface HoldingState {
  ticker: string
  assetType: PortfolioAssetType
  shares: number
  price: number
  annualReturn: number
  annualDividendYield: number
  allocationWeight: number
}

interface ScenarioSimulationResult {
  scenario: SimulationScenario
  achieved: boolean
  monthsToFire: number | null
  yearsToFire: number | null
  fireDate: string | null
  finalPortfolioValue: number
  targetAtEnd: number
  projectedMonthlyPassiveIncome: number
  totalContributed: number
  timeline: Array<{
    month: number
    date: string
    portfolioValue: number
    targetValue: number
    monthlyContribution: number
    monthlyPassiveIncome: number
    progressPct: number
  }>
}

interface SummaryByPortfolio {
  portfolioId: string
  holdingsCount: number
  totalInvested: number
  currentValue: number
}

interface HoldingLeanLike {
  _id?: unknown
  ticker?: unknown
  assetType?: unknown
  name?: unknown
  shares?: unknown
  averageCost?: unknown
  totalInvested?: unknown
  monthlyAllocation?: unknown
  allocationPercent?: unknown
  currentPrice?: unknown
  dividendYield?: unknown
  dividendCAGR?: unknown
  totalReturnCAGR?: unknown
  sector?: unknown
  notes?: unknown
  addedAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

interface PortfolioLeanLike {
  _id?: unknown
  user?: unknown
  name?: unknown
  currency?: unknown
  fireTarget?: unknown
  monthlyContribution?: unknown
  contributionGrowthRate?: unknown
  isDefault?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

interface HoldingSummaryLike {
  _id?: unknown
  holdingsCount?: number
  totalInvested?: number
  currentValue?: number
}

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new PortfolioServiceError(`${fieldName} invalido.`, 400, 'INVALID_OBJECT_ID')
  }
  return new mongoose.Types.ObjectId(rawId)
}

const sanitizeTicker = (value: string): string => value.trim().toUpperCase()

const readNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return value
}

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const toIsoYearMonth = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const shiftMonths = (date: Date, months: number): Date => {
  const clone = new Date(date.getTime())
  clone.setUTCMonth(clone.getUTCMonth() + months)
  return clone
}

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min
  if (value > max) return max
  return value
}

const normalizeAllocationWeights = (holdings: HoldingLeanLike[], monthlyContribution: number): number[] => {
  const allocations = holdings.map((item) => Math.max(0, readNumber(item.monthlyAllocation)))
  const allocationTotal = allocations.reduce((sum, value) => sum + value, 0)
  if (allocationTotal > 0 && monthlyContribution > 0) {
    return allocations.map((value) => value / allocationTotal)
  }

  const percentages = holdings.map((item) => {
    const raw = readNumber(item.allocationPercent)
    if (raw > 1) return raw / 100
    return raw
  })
  const percentTotal = percentages.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (percentTotal > 0) {
    return percentages.map((value) => Math.max(0, value) / percentTotal)
  }

  const fallbackWeight = holdings.length > 0 ? 1 / holdings.length : 0
  return holdings.map(() => fallbackWeight)
}

const toHoldingState = (
  holdings: HoldingLeanLike[],
  overrides: Record<string, PortfolioSimulationCustomOverride>,
  scenario: SimulationScenario,
  allocationWeights: number[]
): HoldingState[] => {
  const preset = SCENARIO_PRESETS[scenario]
  return holdings.map((holding, index) => {
    const ticker = sanitizeTicker(String(holding.ticker ?? ''))
    const assetType =
      SUPPORTED_ASSET_TYPES.find((value) => value === holding.assetType) ??
      ('stock' as PortfolioAssetType)
    const override = overrides[ticker] ?? {}
    const baseAnnualReturn =
      typeof override.annualReturn === 'number'
        ? override.annualReturn
        : typeof holding.totalReturnCAGR === 'number'
        ? readNumber(holding.totalReturnCAGR)
        : DEFAULT_ANNUAL_RETURN_BY_ASSET[assetType]
    const adjustedAnnualReturn = clamp(baseAnnualReturn * preset.returnMultiplier, -0.9, 2)
    const annualDividendYield =
      typeof override.dividendYield === 'number'
        ? clamp(override.dividendYield, 0, 1)
        : typeof holding.dividendYield === 'number'
        ? clamp(readNumber(holding.dividendYield), 0, 1)
        : DEFAULT_DIVIDEND_YIELD_BY_ASSET[assetType]
    const fallbackPrice = Math.max(0.0001, readNumber(holding.averageCost))
    const price = Math.max(0.0001, readNumber(holding.currentPrice) || fallbackPrice)

    return {
      ticker,
      assetType,
      shares: Math.max(0, readNumber(holding.shares)),
      price,
      annualReturn: adjustedAnnualReturn,
      annualDividendYield,
      allocationWeight: allocationWeights[index] ?? 0,
    }
  })
}

const calculateFireTarget = (
  method: PortfolioFireTargetMethod,
  fireTarget: {
    monthlyExpenses: number
    desiredMonthlyIncome: number
    targetAmount: number
    withdrawalRate: number
  },
  inflationFactor: number
) => {
  if (method === 'expenses') {
    const target = (fireTarget.monthlyExpenses * 12) / fireTarget.withdrawalRate
    return target * inflationFactor
  }

  if (method === 'passive_income') {
    return fireTarget.desiredMonthlyIncome * inflationFactor
  }

  return fireTarget.targetAmount * inflationFactor
}

const mapHolding = (holding: HoldingLeanLike) => ({
  id: String(holding._id ?? ''),
  ticker: String(holding.ticker ?? ''),
  assetType: String(holding.assetType ?? ''),
  name: String(holding.name ?? ''),
  shares: readNumber(holding.shares),
  averageCost: readNumber(holding.averageCost),
  totalInvested: readNumber(holding.totalInvested),
  monthlyAllocation: readNumber(holding.monthlyAllocation),
  allocationPercent: readNumber(holding.allocationPercent),
  currentPrice: readNumber(holding.currentPrice),
  dividendYield: readNumber(holding.dividendYield),
  dividendCAGR: readNumber(holding.dividendCAGR),
  totalReturnCAGR: readNumber(holding.totalReturnCAGR),
  sector: normalizeOptionalString(holding.sector),
  notes: normalizeOptionalString(holding.notes),
  addedAt: holding.addedAt ?? null,
  createdAt: holding.createdAt ?? null,
  updatedAt: holding.updatedAt ?? null,
})

const normalizeFireTarget = (
  input: PortfolioFireTargetInput,
  fallback?: {
    method: PortfolioFireTargetMethod
    monthlyExpenses: number
    desiredMonthlyIncome: number
    targetAmount: number
    withdrawalRate: number
    inflationRate: number
  }
) => {
  const method = input.method
  if (!SUPPORTED_FIRE_METHODS.includes(method)) {
    throw new PortfolioServiceError('fireTarget.method invalido.', 400, 'INVALID_FIRE_METHOD')
  }

  const monthlyExpenses =
    typeof input.monthlyExpenses === 'number'
      ? Math.max(0, input.monthlyExpenses)
      : fallback?.monthlyExpenses ?? 0
  const desiredMonthlyIncome =
    typeof input.desiredMonthlyIncome === 'number'
      ? Math.max(0, input.desiredMonthlyIncome)
      : fallback?.desiredMonthlyIncome ?? 0
  const targetAmount =
    typeof input.targetAmount === 'number'
      ? Math.max(0, input.targetAmount)
      : fallback?.targetAmount ?? 0
  const withdrawalRate = clamp(
    typeof input.withdrawalRate === 'number' ? input.withdrawalRate : fallback?.withdrawalRate ?? 0.04,
    0.01,
    0.1
  )
  const inflationRate = clamp(
    typeof input.inflationRate === 'number' ? input.inflationRate : fallback?.inflationRate ?? 0.02,
    0,
    0.2
  )

  if (method === 'expenses' && monthlyExpenses <= 0) {
    throw new PortfolioServiceError(
      'fireTarget.monthlyExpenses e obrigatorio para method=expenses.',
      400,
      'INVALID_FIRE_TARGET'
    )
  }

  if (method === 'passive_income' && desiredMonthlyIncome <= 0) {
    throw new PortfolioServiceError(
      'fireTarget.desiredMonthlyIncome e obrigatorio para method=passive_income.',
      400,
      'INVALID_FIRE_TARGET'
    )
  }

  if (method === 'target_amount' && targetAmount <= 0) {
    throw new PortfolioServiceError(
      'fireTarget.targetAmount e obrigatorio para method=target_amount.',
      400,
      'INVALID_FIRE_TARGET'
    )
  }

  return {
    method,
    monthlyExpenses,
    desiredMonthlyIncome,
    targetAmount,
    withdrawalRate,
    inflationRate,
  }
}

const mapPortfolio = (
  portfolio: PortfolioLeanLike,
  summary?: SummaryByPortfolio
) => ({
  id: String(portfolio._id ?? ''),
  userId: String(portfolio.user ?? ''),
  name: String(portfolio.name ?? ''),
  currency: String(portfolio.currency ?? 'EUR'),
  fireTarget: portfolio.fireTarget ?? null,
  monthlyContribution: readNumber(portfolio.monthlyContribution),
  contributionGrowthRate: readNumber(portfolio.contributionGrowthRate),
  isDefault: Boolean(portfolio.isDefault),
  summary: {
    holdingsCount: summary?.holdingsCount ?? 0,
    totalInvested: summary?.totalInvested ?? 0,
    currentValue: summary?.currentValue ?? 0,
  },
  createdAt: portfolio.createdAt ?? null,
  updatedAt: portfolio.updatedAt ?? null,
})

const buildSummaryByPortfolio = (rows: HoldingSummaryLike[]): Map<string, SummaryByPortfolio> => {
  const summaryMap = new Map<string, SummaryByPortfolio>()
  rows.forEach((row) => {
    const portfolioId = String(row._id ?? '')
    summaryMap.set(portfolioId, {
      portfolioId,
      holdingsCount: readNumber(row.holdingsCount),
      totalInvested: readNumber(row.totalInvested),
      currentValue: readNumber(row.currentValue),
    })
  })
  return summaryMap
}

export class PortfolioServiceError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode: number, code: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

class PortfolioService {
  async createPortfolio(userIdRaw: string, input: CreatePortfolioInput) {
    const userId = toObjectId(userIdRaw, 'userId')
    const name = String(input.name ?? '').trim()
    if (!name) {
      throw new PortfolioServiceError('Campo name obrigatorio.', 400, 'INVALID_NAME')
    }

    const currency = input.currency ?? 'EUR'
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new PortfolioServiceError('Campo currency invalido.', 400, 'INVALID_CURRENCY')
    }

    if (!input.fireTarget) {
      throw new PortfolioServiceError('Campo fireTarget obrigatorio.', 400, 'INVALID_FIRE_TARGET')
    }

    const fireTarget = normalizeFireTarget(input.fireTarget)
    const monthlyContribution = Math.max(0, readNumber(input.monthlyContribution))
    const contributionGrowthRate = clamp(readNumber(input.contributionGrowthRate), 0, 1)

    const existingCount = await Portfolio.countDocuments({ user: userId })
    const isDefault = input.isDefault === true || existingCount === 0

    if (isDefault) {
      await Portfolio.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } })
    }

    const portfolio = await Portfolio.create({
      user: userId,
      name,
      currency,
      fireTarget,
      monthlyContribution,
      contributionGrowthRate,
      isDefault,
    })

    return mapPortfolio(portfolio.toObject() as PortfolioLeanLike)
  }

  async listPortfolios(userIdRaw: string, filters: PortfolioListFilters = {}) {
    const userId = toObjectId(userIdRaw, 'userId')
    const pagination = resolvePagination(
      {
        page: filters.page,
        limit: filters.limit,
      },
      {
        defaultLimit: 20,
        maxLimit: 100,
      }
    )

    const portfolioIds = await this.listPortfolioIds(userId)
    const [portfolios, total, holdingSummaryRows] = await Promise.all([
      Portfolio.find({ user: userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Portfolio.countDocuments({ user: userId }),
      PortfolioHolding.aggregate([
        { $match: { portfolio: { $in: portfolioIds } } },
        {
          $group: {
            _id: '$portfolio',
            holdingsCount: { $sum: 1 },
            totalInvested: { $sum: '$totalInvested' },
            currentValue: {
              $sum: {
                $multiply: ['$shares', { $ifNull: ['$currentPrice', '$averageCost'] }],
              },
            },
          },
        },
      ]),
    ])

    const summaryByPortfolio = buildSummaryByPortfolio(holdingSummaryRows as HoldingSummaryLike[])

    return {
      items: portfolios.map((portfolio) =>
        mapPortfolio(
          portfolio as PortfolioLeanLike,
          summaryByPortfolio.get(String((portfolio as PortfolioLeanLike)._id ?? ''))
        )
      ),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    }
  }

  async getPortfolio(userIdRaw: string, portfolioIdRaw: string) {
    const userId = toObjectId(userIdRaw, 'userId')
    const portfolioId = toObjectId(portfolioIdRaw, 'portfolioId')

    const portfolio = await Portfolio.findOne({ _id: portfolioId, user: userId }).lean()
    if (!portfolio) {
      throw new PortfolioServiceError('Portfolio nao encontrado.', 404, 'PORTFOLIO_NOT_FOUND')
    }

    const holdings = await PortfolioHolding.find({ portfolio: portfolioId }).sort({ addedAt: 1 }).lean()
    const summary = this.buildHoldingsSummary(holdings as HoldingLeanLike[])

    return {
      ...mapPortfolio(portfolio as PortfolioLeanLike, {
        portfolioId: String(portfolioId),
        holdingsCount: summary.holdingsCount,
        totalInvested: summary.totalInvested,
        currentValue: summary.currentValue,
      }),
      holdings: holdings.map((holding) => mapHolding(holding as HoldingLeanLike)),
    }
  }

  async updatePortfolio(userIdRaw: string, portfolioIdRaw: string, input: UpdatePortfolioInput) {
    const userId = toObjectId(userIdRaw, 'userId')
    const portfolioId = toObjectId(portfolioIdRaw, 'portfolioId')
    const portfolio = await Portfolio.findOne({ _id: portfolioId, user: userId })
    if (!portfolio) {
      throw new PortfolioServiceError('Portfolio nao encontrado.', 404, 'PORTFOLIO_NOT_FOUND')
    }

    if (input.name !== undefined) {
      const name = String(input.name).trim()
      if (!name) {
        throw new PortfolioServiceError('Campo name invalido.', 400, 'INVALID_NAME')
      }
      portfolio.name = name
    }

    if (input.currency !== undefined) {
      if (!SUPPORTED_CURRENCIES.includes(input.currency)) {
        throw new PortfolioServiceError('Campo currency invalido.', 400, 'INVALID_CURRENCY')
      }
      portfolio.currency = input.currency
    }

    if (input.monthlyContribution !== undefined) {
      portfolio.monthlyContribution = Math.max(0, readNumber(input.monthlyContribution))
    }

    if (input.contributionGrowthRate !== undefined) {
      portfolio.contributionGrowthRate = clamp(readNumber(input.contributionGrowthRate), 0, 1)
    }

    if (input.fireTarget) {
      const normalized = normalizeFireTarget(input.fireTarget, {
        method: portfolio.fireTarget.method,
        monthlyExpenses: portfolio.fireTarget.monthlyExpenses ?? 0,
        desiredMonthlyIncome: portfolio.fireTarget.desiredMonthlyIncome ?? 0,
        targetAmount: portfolio.fireTarget.targetAmount ?? 0,
        withdrawalRate: portfolio.fireTarget.withdrawalRate,
        inflationRate: portfolio.fireTarget.inflationRate,
      })
      portfolio.fireTarget = normalized
    }

    if (input.isDefault === true && !portfolio.isDefault) {
      await Portfolio.updateMany({ user: userId, isDefault: true }, { $set: { isDefault: false } })
      portfolio.isDefault = true
    }

    await portfolio.save()
    return this.getPortfolio(String(userId), String(portfolioId))
  }

  async deletePortfolio(userIdRaw: string, portfolioIdRaw: string) {
    const userId = toObjectId(userIdRaw, 'userId')
    const portfolioId = toObjectId(portfolioIdRaw, 'portfolioId')
    const portfolio = await Portfolio.findOne({ _id: portfolioId, user: userId })

    if (!portfolio) {
      throw new PortfolioServiceError('Portfolio nao encontrado.', 404, 'PORTFOLIO_NOT_FOUND')
    }

    const wasDefault = portfolio.isDefault
    await Promise.all([
      PortfolioHolding.deleteMany({ portfolio: portfolioId }),
      Portfolio.deleteOne({ _id: portfolioId }),
    ])

    if (wasDefault) {
      const fallbackPortfolio = await Portfolio.findOne({ user: userId }).sort({ createdAt: 1 })
      if (fallbackPortfolio && !fallbackPortfolio.isDefault) {
        fallbackPortfolio.isDefault = true
        await fallbackPortfolio.save()
      }
    }

    return { deleted: true, portfolioId: String(portfolioId) }
  }

  async addHolding(userIdRaw: string, portfolioIdRaw: string, input: CreatePortfolioHoldingInput) {
    const portfolio = await this.requireUserPortfolio(userIdRaw, portfolioIdRaw)
    const ticker = sanitizeTicker(String(input.ticker ?? ''))
    if (!ticker) {
      throw new PortfolioServiceError('Campo ticker obrigatorio.', 400, 'INVALID_HOLDING')
    }

    if (!SUPPORTED_ASSET_TYPES.includes(input.assetType)) {
      throw new PortfolioServiceError('Campo assetType invalido.', 400, 'INVALID_HOLDING')
    }

    const name = String(input.name ?? '').trim()
    if (!name) {
      throw new PortfolioServiceError('Campo name obrigatorio.', 400, 'INVALID_HOLDING')
    }

    const shares = Math.max(0, readNumber(input.shares))
    const averageCost = Math.max(0, readNumber(input.averageCost))
    if (shares <= 0 || averageCost < 0) {
      throw new PortfolioServiceError('Campos shares/averageCost invalidos.', 400, 'INVALID_HOLDING')
    }

    const existing = await PortfolioHolding.findOne({
      portfolio: portfolio._id,
      ticker,
    }).lean()
    if (existing) {
      throw new PortfolioServiceError(
        'Ja existe um holding para este ticker no portfolio.',
        409,
        'HOLDING_ALREADY_EXISTS'
      )
    }

    const allocationPercentRaw = readNumber(input.allocationPercent)
    const allocationPercent = allocationPercentRaw > 1 ? allocationPercentRaw / 100 : allocationPercentRaw

    const holding = await PortfolioHolding.create({
      portfolio: portfolio._id,
      ticker,
      assetType: input.assetType,
      name,
      shares,
      averageCost,
      monthlyAllocation: Math.max(0, readNumber(input.monthlyAllocation)),
      allocationPercent: clamp(allocationPercent, 0, 1),
      currentPrice: readNumber(input.currentPrice) || undefined,
      dividendYield: input.dividendYield !== undefined ? clamp(readNumber(input.dividendYield), 0, 1) : undefined,
      dividendCAGR: input.dividendCAGR !== undefined ? clamp(readNumber(input.dividendCAGR), 0, 1) : undefined,
      totalReturnCAGR:
        input.totalReturnCAGR !== undefined ? clamp(readNumber(input.totalReturnCAGR), -1, 2) : undefined,
      sector: normalizeOptionalString(input.sector),
      notes: normalizeOptionalString(input.notes),
    })

    return mapHolding(holding.toObject() as HoldingLeanLike)
  }

  async updateHolding(
    userIdRaw: string,
    portfolioIdRaw: string,
    holdingIdRaw: string,
    input: UpdatePortfolioHoldingInput
  ) {
    const portfolio = await this.requireUserPortfolio(userIdRaw, portfolioIdRaw)
    const holdingId = toObjectId(holdingIdRaw, 'holdingId')
    const holding = await PortfolioHolding.findOne({
      _id: holdingId,
      portfolio: portfolio._id,
    })
    if (!holding) {
      throw new PortfolioServiceError('Holding nao encontrado.', 404, 'HOLDING_NOT_FOUND')
    }

    if (input.ticker !== undefined) {
      const ticker = sanitizeTicker(String(input.ticker))
      if (!ticker) {
        throw new PortfolioServiceError('Campo ticker invalido.', 400, 'INVALID_HOLDING')
      }

      if (ticker !== holding.ticker) {
        const conflict = await PortfolioHolding.findOne({
          portfolio: portfolio._id,
          ticker,
          _id: { $ne: holdingId },
        }).lean()
        if (conflict) {
          throw new PortfolioServiceError(
            'Ja existe um holding para este ticker no portfolio.',
            409,
            'HOLDING_ALREADY_EXISTS'
          )
        }
      }
      holding.ticker = ticker
    }

    if (input.assetType !== undefined) {
      if (!SUPPORTED_ASSET_TYPES.includes(input.assetType)) {
        throw new PortfolioServiceError('Campo assetType invalido.', 400, 'INVALID_HOLDING')
      }
      holding.assetType = input.assetType
    }

    if (input.name !== undefined) {
      const name = String(input.name).trim()
      if (!name) {
        throw new PortfolioServiceError('Campo name invalido.', 400, 'INVALID_HOLDING')
      }
      holding.name = name
    }

    if (input.shares !== undefined) {
      holding.shares = Math.max(0, readNumber(input.shares))
    }

    if (input.averageCost !== undefined) {
      holding.averageCost = Math.max(0, readNumber(input.averageCost))
    }

    if (input.monthlyAllocation !== undefined) {
      holding.monthlyAllocation = Math.max(0, readNumber(input.monthlyAllocation))
    }

    if (input.allocationPercent !== undefined) {
      const raw = readNumber(input.allocationPercent)
      holding.allocationPercent = clamp(raw > 1 ? raw / 100 : raw, 0, 1)
    }

    if (input.currentPrice !== undefined) {
      holding.currentPrice = Math.max(0, readNumber(input.currentPrice))
    }

    if (input.dividendYield !== undefined) {
      holding.dividendYield = clamp(readNumber(input.dividendYield), 0, 1)
    }

    if (input.dividendCAGR !== undefined) {
      holding.dividendCAGR = clamp(readNumber(input.dividendCAGR), 0, 1)
    }

    if (input.totalReturnCAGR !== undefined) {
      holding.totalReturnCAGR = clamp(readNumber(input.totalReturnCAGR), -1, 2)
    }

    if (input.sector !== undefined) {
      holding.sector = normalizeOptionalString(input.sector)
    }

    if (input.notes !== undefined) {
      holding.notes = normalizeOptionalString(input.notes)
    }

    await holding.save()
    return mapHolding(holding.toObject() as HoldingLeanLike)
  }

  async deleteHolding(userIdRaw: string, portfolioIdRaw: string, holdingIdRaw: string) {
    const portfolio = await this.requireUserPortfolio(userIdRaw, portfolioIdRaw)
    const holdingId = toObjectId(holdingIdRaw, 'holdingId')
    const deleted = await PortfolioHolding.findOneAndDelete({
      _id: holdingId,
      portfolio: portfolio._id,
    }).lean()

    if (!deleted) {
      throw new PortfolioServiceError('Holding nao encontrado.', 404, 'HOLDING_NOT_FOUND')
    }

    return { deleted: true, holdingId: String(holdingId) }
  }

  async simulatePortfolio(userIdRaw: string, portfolioIdRaw: string, input: SimulatePortfolioInput = {}) {
    const portfolio = await this.requireUserPortfolio(userIdRaw, portfolioIdRaw)
    const holdings = (await PortfolioHolding.find({ portfolio: portfolio._id }).lean()) as HoldingLeanLike[]

    if (holdings.length === 0) {
      throw new PortfolioServiceError(
        'Nao existem holdings para simular neste portfolio.',
        400,
        'SIMULATION_EMPTY_PORTFOLIO'
      )
    }

    const scenarios = this.normalizeScenarios(input.scenarios)
    const maxYears = clamp(Math.floor(readNumber(input.maxYears) || 40), 1, 50)
    const maxMonths = maxYears * 12
    const drip = input.drip !== false
    const includeInflation = input.includeInflation !== false
    const overrides = Object.entries(input.customOverrides ?? {}).reduce(
      (acc, [ticker, value]) => {
        acc[sanitizeTicker(ticker)] = value
        return acc
      },
      {} as Record<string, PortfolioSimulationCustomOverride>
    )
    const monthlyContribution = Math.max(0, readNumber(portfolio.monthlyContribution))
    const contributionGrowthRate = clamp(readNumber(portfolio.contributionGrowthRate), 0, 1)
    const fireTargetMethod = portfolio.fireTarget.method
    const fireTarget = {
      monthlyExpenses: Math.max(0, readNumber(portfolio.fireTarget.monthlyExpenses)),
      desiredMonthlyIncome: Math.max(0, readNumber(portfolio.fireTarget.desiredMonthlyIncome)),
      targetAmount: Math.max(0, readNumber(portfolio.fireTarget.targetAmount)),
      withdrawalRate: clamp(readNumber(portfolio.fireTarget.withdrawalRate) || 0.04, 0.01, 0.1),
      inflationRate: clamp(readNumber(portfolio.fireTarget.inflationRate) || 0.02, 0, 0.2),
    }
    const allocationWeights = normalizeAllocationWeights(holdings, monthlyContribution)

    const scenarioResults = scenarios.map((scenario) => {
      const states = toHoldingState(holdings, overrides, scenario, allocationWeights)
      return this.runScenarioSimulation({
        scenario,
        states,
        maxMonths,
        drip,
        includeInflation,
        monthlyContribution,
        contributionGrowthRate,
        fireTargetMethod,
        fireTarget,
      })
    })

    const baseScenario =
      scenarioResults.find((item) => item.scenario === 'base') ?? scenarioResults[0]
    const suggestions = this.buildSuggestions(baseScenario, monthlyContribution)

    return {
      portfolioId: String(portfolio._id),
      portfolioName: portfolio.name,
      currency: portfolio.currency,
      assumptions: {
        monthlyContribution,
        contributionGrowthRate,
        drip,
        includeInflation,
        maxYears,
      },
      fireTarget: {
        method: fireTargetMethod,
        monthlyExpenses: fireTarget.monthlyExpenses,
        desiredMonthlyIncome: fireTarget.desiredMonthlyIncome,
        targetAmount: fireTarget.targetAmount,
        withdrawalRate: fireTarget.withdrawalRate,
        inflationRate: fireTarget.inflationRate,
      },
      scenarios: scenarioResults,
      suggestions,
      generatedAt: new Date().toISOString(),
    }
  }

  private async requireUserPortfolio(userIdRaw: string, portfolioIdRaw: string) {
    const userId = toObjectId(userIdRaw, 'userId')
    const portfolioId = toObjectId(portfolioIdRaw, 'portfolioId')
    const portfolio = await Portfolio.findOne({ _id: portfolioId, user: userId })
    if (!portfolio) {
      throw new PortfolioServiceError('Portfolio nao encontrado.', 404, 'PORTFOLIO_NOT_FOUND')
    }
    return portfolio
  }

  private async listPortfolioIds(userId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> {
    const rows = await Portfolio.find({ user: userId }).select('_id').lean()
    return rows
      .map((row) => row._id)
      .filter((value): value is mongoose.Types.ObjectId => value instanceof mongoose.Types.ObjectId)
  }

  private buildHoldingsSummary(holdings: HoldingLeanLike[]) {
    const holdingsCount = holdings.length
    const totalInvested = holdings.reduce((sum, item) => sum + readNumber(item.totalInvested), 0)
    const currentValue = holdings.reduce((sum, item) => {
      const shares = readNumber(item.shares)
      const price = Math.max(0, readNumber(item.currentPrice) || readNumber(item.averageCost))
      return sum + shares * price
    }, 0)

    return {
      holdingsCount,
      totalInvested: Number(totalInvested.toFixed(2)),
      currentValue: Number(currentValue.toFixed(2)),
    }
  }

  private normalizeScenarios(inputScenarios: SimulatePortfolioInput['scenarios']) {
    if (!inputScenarios || inputScenarios.length === 0) {
      return ['optimistic', 'base', 'conservative'] as SimulationScenario[]
    }

    const sanitized = Array.from(
      new Set(inputScenarios.filter((item): item is SimulationScenario => SUPPORTED_SCENARIOS.includes(item)))
    )
    if (sanitized.length === 0) {
      throw new PortfolioServiceError('Campo scenarios invalido.', 400, 'INVALID_SCENARIOS')
    }
    return sanitized
  }

  private runScenarioSimulation(input: {
    scenario: SimulationScenario
    states: HoldingState[]
    maxMonths: number
    drip: boolean
    includeInflation: boolean
    monthlyContribution: number
    contributionGrowthRate: number
    fireTargetMethod: PortfolioFireTargetMethod
    fireTarget: {
      monthlyExpenses: number
      desiredMonthlyIncome: number
      targetAmount: number
      withdrawalRate: number
      inflationRate: number
    }
  }): ScenarioSimulationResult {
    const startDate = new Date()
    const scenarioPreset = SCENARIO_PRESETS[input.scenario]
    const inflationRate =
      scenarioPreset.inflationOverride !== undefined
        ? scenarioPreset.inflationOverride
        : input.fireTarget.inflationRate
    const states = input.states.map((state) => ({ ...state }))
    const timeline: ScenarioSimulationResult['timeline'] = []
    let totalContributed = 0
    let achieved = false
    let fireMonth: number | null = null
    let fireDate: string | null = null
    let lastTarget = calculateFireTarget(input.fireTargetMethod, input.fireTarget, 1)
    let lastPortfolioValue = 0
    let lastPassiveIncome = 0

    for (let month = 1; month <= input.maxMonths; month += 1) {
      const annualContributionMultiplier = Math.pow(1 + input.contributionGrowthRate, Math.floor((month - 1) / 12))
      const monthlyContribution = input.monthlyContribution * annualContributionMultiplier
      let portfolioValue = 0
      let passiveIncome = 0

      states.forEach((state) => {
        const monthlyReturn = Math.pow(1 + state.annualReturn, 1 / 12) - 1
        state.price = Math.max(0.0001, state.price * (1 + monthlyReturn))
        const allocation = monthlyContribution * state.allocationWeight
        if (allocation > 0) {
          const newShares = allocation / state.price
          state.shares += newShares
          totalContributed += allocation
        }

        const monthlyDividend = state.shares * state.price * (state.annualDividendYield / 12)
        if (input.drip && monthlyDividend > 0) {
          state.shares += monthlyDividend / state.price
        }

        const holdingValue = state.shares * state.price
        portfolioValue += holdingValue
        passiveIncome += holdingValue * (state.annualDividendYield / 12)
      })

      const yearsElapsed = month / 12
      const inflationFactor = input.includeInflation ? Math.pow(1 + inflationRate, yearsElapsed) : 1
      const targetValue = calculateFireTarget(input.fireTargetMethod, input.fireTarget, inflationFactor)
      const currentDate = shiftMonths(startDate, month)
      const progressBase =
        input.fireTargetMethod === 'passive_income' ? passiveIncome : portfolioValue
      const progressPct = targetValue > 0 ? (progressBase / targetValue) * 100 : 0

      timeline.push({
        month,
        date: toIsoYearMonth(currentDate),
        portfolioValue: Number(portfolioValue.toFixed(2)),
        targetValue: Number(targetValue.toFixed(2)),
        monthlyContribution: Number(monthlyContribution.toFixed(2)),
        monthlyPassiveIncome: Number(passiveIncome.toFixed(2)),
        progressPct: Number(progressPct.toFixed(2)),
      })

      lastTarget = targetValue
      lastPortfolioValue = portfolioValue
      lastPassiveIncome = passiveIncome

      const fireReached =
        input.fireTargetMethod === 'passive_income'
          ? passiveIncome >= targetValue
          : portfolioValue >= targetValue

      if (fireReached) {
        achieved = true
        fireMonth = month
        fireDate = toIsoYearMonth(currentDate)
        break
      }
    }

    const monthsToFire = achieved ? fireMonth : null
    const yearsToFire = achieved && fireMonth ? Number((fireMonth / 12).toFixed(2)) : null

    return {
      scenario: input.scenario,
      achieved,
      monthsToFire,
      yearsToFire,
      fireDate,
      finalPortfolioValue: Number(lastPortfolioValue.toFixed(2)),
      targetAtEnd: Number(lastTarget.toFixed(2)),
      projectedMonthlyPassiveIncome: Number(lastPassiveIncome.toFixed(2)),
      totalContributed: Number(totalContributed.toFixed(2)),
      timeline,
    }
  }

  private buildSuggestions(baseScenario: ScenarioSimulationResult, monthlyContribution: number) {
    const suggestions: Array<{ type: string; message: string }> = []

    if (baseScenario.achieved) {
      suggestions.push({
        type: 'on_track',
        message: `No cenario base, o objetivo FIRE e atingido em ${baseScenario.fireDate}.`,
      })
      return suggestions
    }

    const deficit = Math.max(0, baseScenario.targetAtEnd - baseScenario.finalPortfolioValue)
    if (monthlyContribution > 0 && deficit > 0) {
      const accelerationMonths = Math.max(
        1,
        Math.round((200 / Math.max(1, monthlyContribution)) * 8)
      )
      suggestions.push({
        type: 'fire_accelerator',
        message: `Aumentar contribuicao em €200/mes pode reduzir cerca de ${accelerationMonths} meses ao objetivo.`,
      })
    }

    suggestions.push({
      type: 'target_gap',
      message:
        'No cenario base, o objetivo nao e atingido no horizonte escolhido. Ajusta contribuicoes, horizonte ou target.',
    })

    return suggestions
  }
}

export const portfolioService = new PortfolioService()
