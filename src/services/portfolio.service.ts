import { createHash } from 'crypto'
import axios from 'axios'
import mongoose from 'mongoose'
import { Portfolio, PortfolioCurrency, PortfolioFireTargetMethod } from '../models/Portfolio'
import { PortfolioAssetType, PortfolioHolding } from '../models/PortfolioHolding'
import { resolvePagination } from '../utils/pagination'

const FMP_STABLE = 'https://financialmodelingprep.com/stable'
const FMP_API_KEY = process.env.FMP_API_KEY
const HISTORICAL_CALIBRATION_TIMEOUT_MS = 10000
const DEFAULT_HISTORICAL_LOOKBACK_MONTHS = 36
const MIN_HISTORICAL_LOOKBACK_MONTHS = 6
const MAX_HISTORICAL_LOOKBACK_MONTHS = 120
const MIN_HISTORICAL_RETURN_SAMPLES = 6
const DEFAULT_MONTE_CARLO_SIMULATIONS = 1000
const MIN_MONTE_CARLO_SIMULATIONS = 100
const MAX_MONTE_CARLO_SIMULATIONS = 5000
const MONTE_CARLO_CACHE_TTL_MS = 2 * 60 * 1000
const MONTE_CARLO_CACHE_MAX_ENTRIES = 40
const MONTE_CARLO_YIELD_EVERY_RUNS = 200

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
  volatilityPenalty: number
  inflationOverride?: number
}

const SCENARIO_PRESETS: Record<SimulationScenario, ScenarioPreset> = {
  optimistic: { returnMultiplier: 1.2, volatilityPenalty: 0.05, inflationOverride: 0.015 },
  base: { returnMultiplier: 1, volatilityPenalty: 0.12 },
  conservative: { returnMultiplier: 0.75, volatilityPenalty: 0.2, inflationOverride: 0.03 },
  bear: { returnMultiplier: 0.45, volatilityPenalty: 0.32, inflationOverride: 0.035 },
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

const DEFAULT_VOLATILITY_BY_ASSET: Record<PortfolioAssetType, number> = {
  stock: 0.18,
  etf: 0.14,
  reit: 0.16,
  crypto: 0.6,
  bond: 0.07,
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
  annualVolatility?: number
}

export interface PortfolioSimulationWhatIfInput {
  enabled?: boolean
  scenario?: SimulationScenario
  contributionDelta?: number
  annualReturnShock?: number
  inflationShock?: number
}

export interface PortfolioSimulationMonteCarloInput {
  enabled?: boolean
  scenario?: SimulationScenario
  simulations?: number
}

export interface SimulatePortfolioInput {
  scenarios?: SimulationScenario[]
  maxYears?: number
  drip?: boolean
  includeInflation?: boolean
  useHistoricalCalibration?: boolean
  historicalLookbackMonths?: number
  customOverrides?: Record<string, PortfolioSimulationCustomOverride>
  whatIf?: PortfolioSimulationWhatIfInput
  monteCarlo?: PortfolioSimulationMonteCarloInput
}

interface HoldingState {
  ticker: string
  assetType: PortfolioAssetType
  shares: number
  price: number
  annualReturn: number
  annualDividendYield: number
  annualVolatility: number
  allocationWeight: number
}

interface HoldingHistoricalCalibration {
  ticker: string
  annualReturn: number
  annualDividendYield: number
  annualVolatility: number
  lookbackMonths: number
  priceSamples: number
  monthlyReturnSamples: number
  dividendSamples: number
}

interface HoldingHistoricalCalibrationReportItem {
  ticker: string
  assetType: PortfolioAssetType
  status: 'calibrated' | 'fallback'
  annualReturn: number | null
  annualDividendYield: number | null
  annualVolatility: number | null
  lookbackMonths: number
  priceSamples: number
  monthlyReturnSamples: number
  dividendSamples: number
  reason?: string
}

interface HistoricalCalibrationContext {
  enabled: boolean
  source: 'fmp_stable' | null
  lookbackMonths: number
  attemptedHoldings: number
  calibratedHoldings: number
  items: HoldingHistoricalCalibrationReportItem[]
  byTicker: Map<string, HoldingHistoricalCalibration>
  reason?: string
}

interface HoldingCalibrationComputationResult {
  report: HoldingHistoricalCalibrationReportItem
  calibration?: HoldingHistoricalCalibration
}

interface FmpHistoricalPriceRow {
  date: string
  close: number
}

interface FmpDividendRow {
  date: string
  amount: number
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

interface MonteCarloSimulationInput {
  scenario: SimulationScenario
  simulations: number
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
}

interface MonteCarloPercentiles {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

interface MonteCarloSimulationResult {
  enabled: boolean
  scenario: SimulationScenario
  simulations: number
  achievedRuns: number
  successProbabilityPct: number
  monthsToFirePercentiles: MonteCarloPercentiles | null
  yearsToFirePercentiles: MonteCarloPercentiles | null
  finalPortfolioValuePercentiles: MonteCarloPercentiles
  timelineSuccessProbability: Array<{
    month: number
    years: number
    date: string
    probabilityPct: number
  }>
}

interface MonteCarloCacheEntry {
  expiresAt: number
  touchedAt: number
  result: MonteCarloSimulationResult
}

interface WhatIfSimulationResult {
  enabled: boolean
  scenario: SimulationScenario
  assumptions: {
    contributionDelta: number
    adjustedMonthlyContribution: number
    annualReturnShock: number
    inflationShock: number
  }
  baseline: ScenarioSimulationResult
  adjusted: ScenarioSimulationResult
  delta: {
    achievedChanged: boolean
    monthsToFire: number | null
    yearsToFire: number | null
    finalPortfolioValue: number
    projectedMonthlyPassiveIncome: number
    targetAtEnd: number
  }
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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

const percentileFromSorted = (values: number[], percentile: number): number | null => {
  if (values.length === 0) {
    return null
  }

  const boundedPercentile = clamp(percentile, 0, 1)
  const index = (values.length - 1) * boundedPercentile
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.min(values.length - 1, lowerIndex + 1)
  const weight = index - lowerIndex
  const interpolated = values[lowerIndex] + (values[upperIndex] - values[lowerIndex]) * weight
  return interpolated
}

const buildPercentiles = (values: number[]): MonteCarloPercentiles | null => {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const p10 = percentileFromSorted(sorted, 0.1)
  const p25 = percentileFromSorted(sorted, 0.25)
  const p50 = percentileFromSorted(sorted, 0.5)
  const p75 = percentileFromSorted(sorted, 0.75)
  const p90 = percentileFromSorted(sorted, 0.9)
  if (p10 === null || p25 === null || p50 === null || p75 === null || p90 === null) {
    return null
  }

  return {
    p10: Number(p10.toFixed(2)),
    p25: Number(p25.toFixed(2)),
    p50: Number(p50.toFixed(2)),
    p75: Number(p75.toFixed(2)),
    p90: Number(p90.toFixed(2)),
  }
}

const sampleStandardNormal = (): number => {
  // Box-Muller transform.
  const u1 = Math.max(Number.EPSILON, Math.random())
  const u2 = Math.max(Number.EPSILON, Math.random())
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

const yieldToEventLoop = async (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0))

const clonePercentiles = (value: MonteCarloPercentiles | null): MonteCarloPercentiles | null =>
  value === null ? null : { ...value }

const cloneMonteCarloSimulationResult = (
  value: MonteCarloSimulationResult
): MonteCarloSimulationResult => ({
  ...value,
  monthsToFirePercentiles: clonePercentiles(value.monthsToFirePercentiles),
  yearsToFirePercentiles: clonePercentiles(value.yearsToFirePercentiles),
  finalPortfolioValuePercentiles: { ...value.finalPortfolioValuePercentiles },
  timelineSuccessProbability: value.timelineSuccessProbability.map((point) => ({ ...point })),
})

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
  allocationWeights: number[],
  historicalCalibrationByTicker: Map<string, HoldingHistoricalCalibration>
): HoldingState[] => {
  const preset = SCENARIO_PRESETS[scenario]
  return holdings.map((holding, index) => {
    const ticker = sanitizeTicker(String(holding.ticker ?? ''))
    const assetType =
      SUPPORTED_ASSET_TYPES.find((value) => value === holding.assetType) ??
      ('stock' as PortfolioAssetType)
    const override = overrides[ticker] ?? {}
    const calibration = historicalCalibrationByTicker.get(ticker)
    const baseAnnualReturn =
      typeof override.annualReturn === 'number'
        ? override.annualReturn
        : calibration?.annualReturn !== undefined
        ? calibration.annualReturn
        : typeof holding.totalReturnCAGR === 'number'
        ? readNumber(holding.totalReturnCAGR)
        : DEFAULT_ANNUAL_RETURN_BY_ASSET[assetType]
    const annualVolatility =
      typeof override.annualVolatility === 'number'
        ? clamp(readNumber(override.annualVolatility), 0, 1.2)
        : calibration?.annualVolatility !== undefined
        ? clamp(calibration.annualVolatility, 0, 1.2)
        : DEFAULT_VOLATILITY_BY_ASSET[assetType]
    const adjustedAnnualReturn = clamp(
      baseAnnualReturn * preset.returnMultiplier - annualVolatility * preset.volatilityPenalty,
      -0.95,
      2
    )
    const annualDividendYield =
      typeof override.dividendYield === 'number'
        ? clamp(override.dividendYield, 0, 1)
        : calibration?.annualDividendYield !== undefined
        ? clamp(calibration.annualDividendYield, 0, 1)
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
      annualVolatility,
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
  private monteCarloCache = new Map<string, MonteCarloCacheEntry>()

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
    const useHistoricalCalibration = input.useHistoricalCalibration !== false
    const historicalLookbackMonths = clamp(
      Math.floor(readNumber(input.historicalLookbackMonths) || DEFAULT_HISTORICAL_LOOKBACK_MONTHS),
      MIN_HISTORICAL_LOOKBACK_MONTHS,
      MAX_HISTORICAL_LOOKBACK_MONTHS
    )
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
    const whatIfInput: PortfolioSimulationWhatIfInput = isRecord(input.whatIf)
      ? (input.whatIf as PortfolioSimulationWhatIfInput)
      : {}
    const whatIfEnabled =
      whatIfInput.enabled === true ||
      whatIfInput.contributionDelta !== undefined ||
      whatIfInput.annualReturnShock !== undefined ||
      whatIfInput.inflationShock !== undefined
    const whatIfScenario = this.resolveSimulationScenario(whatIfInput.scenario, scenarios)
    const whatIfContributionDelta = readNumber(whatIfInput.contributionDelta)
    const whatIfAnnualReturnShock = clamp(readNumber(whatIfInput.annualReturnShock), -0.5, 0.5)
    const whatIfInflationShock = clamp(readNumber(whatIfInput.inflationShock), -0.08, 0.08)

    const monteCarloInput: PortfolioSimulationMonteCarloInput = isRecord(input.monteCarlo)
      ? (input.monteCarlo as PortfolioSimulationMonteCarloInput)
      : {}
    const monteCarloEnabled =
      monteCarloInput.enabled === true || monteCarloInput.simulations !== undefined
    const monteCarloScenario = this.resolveSimulationScenario(monteCarloInput.scenario, scenarios)
    const monteCarloSimulations = clamp(
      Math.floor(readNumber(monteCarloInput.simulations) || DEFAULT_MONTE_CARLO_SIMULATIONS),
      MIN_MONTE_CARLO_SIMULATIONS,
      MAX_MONTE_CARLO_SIMULATIONS
    )

    const historicalCalibration = await this.buildHistoricalCalibrationContext({
      holdings,
      enabled: useHistoricalCalibration,
      lookbackMonths: historicalLookbackMonths,
    })

    const runScenario = (
      scenario: SimulationScenario,
      scenarioMonthlyContribution: number,
      annualReturnShock = 0,
      inflationShock = 0
    ) => {
      const states = toHoldingState(
        holdings,
        overrides,
        scenario,
        allocationWeights,
        historicalCalibration.byTicker
      )
      return this.runScenarioSimulation({
        scenario,
        states,
        maxMonths,
        drip,
        includeInflation,
        monthlyContribution: scenarioMonthlyContribution,
        contributionGrowthRate,
        annualReturnShock,
        inflationShock,
        fireTargetMethod,
        fireTarget,
      })
    }

    const scenarioResults = scenarios.map((scenario) => runScenario(scenario, monthlyContribution))

    const baseScenario =
      scenarioResults.find((item) => item.scenario === 'base') ?? scenarioResults[0]
    const suggestions = this.buildSuggestions(baseScenario, monthlyContribution)

    let whatIf: WhatIfSimulationResult | null = null
    if (whatIfEnabled) {
      const baseline =
        scenarioResults.find((item) => item.scenario === whatIfScenario) ??
        runScenario(whatIfScenario, monthlyContribution)
      const adjustedMonthlyContribution = Math.max(0, monthlyContribution + whatIfContributionDelta)
      const adjusted = runScenario(
        whatIfScenario,
        adjustedMonthlyContribution,
        whatIfAnnualReturnShock,
        whatIfInflationShock
      )
      const monthsDelta =
        baseline.monthsToFire !== null && adjusted.monthsToFire !== null
          ? adjusted.monthsToFire - baseline.monthsToFire
          : null
      const yearsDelta =
        baseline.yearsToFire !== null && adjusted.yearsToFire !== null
          ? Number((adjusted.yearsToFire - baseline.yearsToFire).toFixed(2))
          : null

      whatIf = {
        enabled: true,
        scenario: whatIfScenario,
        assumptions: {
          contributionDelta: Number(whatIfContributionDelta.toFixed(2)),
          adjustedMonthlyContribution: Number(adjustedMonthlyContribution.toFixed(2)),
          annualReturnShock: Number(whatIfAnnualReturnShock.toFixed(4)),
          inflationShock: Number(whatIfInflationShock.toFixed(4)),
        },
        baseline,
        adjusted,
        delta: {
          achievedChanged: baseline.achieved !== adjusted.achieved,
          monthsToFire: monthsDelta,
          yearsToFire: yearsDelta,
          finalPortfolioValue: Number(
            (adjusted.finalPortfolioValue - baseline.finalPortfolioValue).toFixed(2)
          ),
          projectedMonthlyPassiveIncome: Number(
            (
              adjusted.projectedMonthlyPassiveIncome - baseline.projectedMonthlyPassiveIncome
            ).toFixed(2)
          ),
          targetAtEnd: Number((adjusted.targetAtEnd - baseline.targetAtEnd).toFixed(2)),
        },
      }
    }

    let monteCarlo: MonteCarloSimulationResult | null = null
    if (monteCarloEnabled) {
      const states = toHoldingState(
        holdings,
        overrides,
        monteCarloScenario,
        allocationWeights,
        historicalCalibration.byTicker
      )
      monteCarlo = await this.runMonteCarloSimulationWithCache({
        scenario: monteCarloScenario,
        simulations: monteCarloSimulations,
        states,
        maxMonths,
        drip,
        includeInflation,
        monthlyContribution,
        contributionGrowthRate,
        fireTargetMethod,
        fireTarget,
      })
    }

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
        useHistoricalCalibration: historicalCalibration.enabled,
        historicalLookbackMonths: historicalCalibration.lookbackMonths,
        historicalCalibration: {
          source: historicalCalibration.source,
          attemptedHoldings: historicalCalibration.attemptedHoldings,
          calibratedHoldings: historicalCalibration.calibratedHoldings,
          reason: historicalCalibration.reason,
          items: historicalCalibration.items,
        },
        whatIf: whatIf
          ? {
              scenario: whatIf.scenario,
              contributionDelta: whatIf.assumptions.contributionDelta,
              annualReturnShock: whatIf.assumptions.annualReturnShock,
              inflationShock: whatIf.assumptions.inflationShock,
            }
          : null,
        monteCarlo: monteCarlo
          ? {
              scenario: monteCarlo.scenario,
              simulations: monteCarlo.simulations,
            }
          : null,
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
      whatIf,
      monteCarlo,
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

  private resolveSimulationScenario(
    scenarioInput: unknown,
    fallbackScenarios: SimulationScenario[]
  ): SimulationScenario {
    if (
      typeof scenarioInput === 'string' &&
      SUPPORTED_SCENARIOS.includes(scenarioInput as SimulationScenario)
    ) {
      return scenarioInput as SimulationScenario
    }

    return fallbackScenarios.find((scenario) => scenario === 'base') ?? fallbackScenarios[0] ?? 'base'
  }

  private async buildHistoricalCalibrationContext(input: {
    holdings: HoldingLeanLike[]
    enabled: boolean
    lookbackMonths: number
  }): Promise<HistoricalCalibrationContext> {
    const normalizedHoldings = input.holdings
      .map((holding) => {
        const ticker = sanitizeTicker(String(holding.ticker ?? ''))
        if (!ticker) return null

        const assetType =
          SUPPORTED_ASSET_TYPES.find((value) => value === holding.assetType) ??
          ('stock' as PortfolioAssetType)
        const fallbackPrice = Math.max(
          0.0001,
          readNumber(holding.currentPrice) || readNumber(holding.averageCost)
        )
        const fallbackDividendYield =
          typeof holding.dividendYield === 'number'
            ? clamp(readNumber(holding.dividendYield), 0, 1)
            : DEFAULT_DIVIDEND_YIELD_BY_ASSET[assetType]

        return {
          ticker,
          assetType,
          fallbackPrice,
          fallbackDividendYield,
        }
      })
      .filter(
        (item): item is {
          ticker: string
          assetType: PortfolioAssetType
          fallbackPrice: number
          fallbackDividendYield: number
        } => item !== null
      )

    if (!input.enabled) {
      return {
        enabled: false,
        source: null,
        lookbackMonths: input.lookbackMonths,
        attemptedHoldings: normalizedHoldings.length,
        calibratedHoldings: 0,
        reason: 'disabled_by_input',
        items: normalizedHoldings.map((holding) => ({
          ticker: holding.ticker,
          assetType: holding.assetType,
          status: 'fallback',
          annualReturn: null,
          annualDividendYield: null,
          annualVolatility: null,
          lookbackMonths: input.lookbackMonths,
          priceSamples: 0,
          monthlyReturnSamples: 0,
          dividendSamples: 0,
          reason: 'disabled_by_input',
        })),
        byTicker: new Map(),
      }
    }

    if (!FMP_API_KEY) {
      return {
        enabled: false,
        source: null,
        lookbackMonths: input.lookbackMonths,
        attemptedHoldings: normalizedHoldings.length,
        calibratedHoldings: 0,
        reason: 'missing_fmp_api_key',
        items: normalizedHoldings.map((holding) => ({
          ticker: holding.ticker,
          assetType: holding.assetType,
          status: 'fallback',
          annualReturn: null,
          annualDividendYield: null,
          annualVolatility: null,
          lookbackMonths: input.lookbackMonths,
          priceSamples: 0,
          monthlyReturnSamples: 0,
          dividendSamples: 0,
          reason: 'missing_fmp_api_key',
        })),
        byTicker: new Map(),
      }
    }

    const calibrationRows = await Promise.all(
      normalizedHoldings.map((holding) =>
        this.calibrateHoldingFromHistory(holding, input.lookbackMonths)
      )
    )
    const byTicker = new Map<string, HoldingHistoricalCalibration>()
    calibrationRows.forEach((row) => {
      if (row.calibration) {
        byTicker.set(row.calibration.ticker, row.calibration)
      }
    })

    return {
      enabled: true,
      source: 'fmp_stable',
      lookbackMonths: input.lookbackMonths,
      attemptedHoldings: normalizedHoldings.length,
      calibratedHoldings: byTicker.size,
      items: calibrationRows.map((row) => row.report),
      byTicker,
    }
  }

  private async calibrateHoldingFromHistory(
    input: {
      ticker: string
      assetType: PortfolioAssetType
      fallbackPrice: number
      fallbackDividendYield: number
    },
    lookbackMonths: number
  ): Promise<HoldingCalibrationComputationResult> {
    if (input.assetType === 'cash') {
      return {
        report: {
          ticker: input.ticker,
          assetType: input.assetType,
          status: 'fallback',
          annualReturn: null,
          annualDividendYield: null,
          annualVolatility: null,
          lookbackMonths,
          priceSamples: 0,
          monthlyReturnSamples: 0,
          dividendSamples: 0,
          reason: 'cash_uses_default_assumptions',
        },
      }
    }

    try {
      const priceRows = await this.fetchHistoricalPriceRows(input.ticker, lookbackMonths)
      const monthlyCloses = this.buildMonthlyCloseSeries(priceRows)
      const monthlyReturns = this.buildMonthlyReturns(monthlyCloses)

      if (monthlyReturns.length < MIN_HISTORICAL_RETURN_SAMPLES) {
        return {
          report: {
            ticker: input.ticker,
            assetType: input.assetType,
            status: 'fallback',
            annualReturn: null,
            annualDividendYield: null,
            annualVolatility: null,
            lookbackMonths,
            priceSamples: priceRows.length,
            monthlyReturnSamples: monthlyReturns.length,
            dividendSamples: 0,
            reason: 'not_enough_price_samples',
          },
        }
      }

      const annualReturn = clamp(
        this.annualizedReturnFromMonthlyReturns(monthlyReturns),
        -0.95,
        2
      )
      const annualVolatility = clamp(
        this.annualizedVolatilityFromMonthlyReturns(monthlyReturns),
        0,
        1.2
      )

      const priceAnchor = monthlyCloses[monthlyCloses.length - 1] ?? input.fallbackPrice
      const latestDate = priceRows[priceRows.length - 1]?.date
      const dividendStats = this.shouldFetchDividendHistory(input.assetType)
        ? await this.fetchTrailingDividendYield(input.ticker, priceAnchor, latestDate)
        : { annualDividendYield: null, dividendSamples: 0 }
      const annualDividendYield = clamp(
        dividendStats.annualDividendYield ?? input.fallbackDividendYield,
        0,
        1
      )

      const calibration: HoldingHistoricalCalibration = {
        ticker: input.ticker,
        annualReturn,
        annualDividendYield,
        annualVolatility,
        lookbackMonths,
        priceSamples: priceRows.length,
        monthlyReturnSamples: monthlyReturns.length,
        dividendSamples: dividendStats.dividendSamples,
      }

      return {
        calibration,
        report: {
          ticker: input.ticker,
          assetType: input.assetType,
          status: 'calibrated',
          annualReturn: calibration.annualReturn,
          annualDividendYield: calibration.annualDividendYield,
          annualVolatility: calibration.annualVolatility,
          lookbackMonths: calibration.lookbackMonths,
          priceSamples: calibration.priceSamples,
          monthlyReturnSamples: calibration.monthlyReturnSamples,
          dividendSamples: calibration.dividendSamples,
        },
      }
    } catch (error) {
      console.warn('[portfolio.simulation] historical calibration failed', {
        ticker: input.ticker,
        reason: error instanceof Error ? error.message : 'unknown_error',
      })
      return {
        report: {
          ticker: input.ticker,
          assetType: input.assetType,
          status: 'fallback',
          annualReturn: null,
          annualDividendYield: null,
          annualVolatility: null,
          lookbackMonths,
          priceSamples: 0,
          monthlyReturnSamples: 0,
          dividendSamples: 0,
          reason: 'historical_fetch_failed',
        },
      }
    }
  }

  private async fetchHistoricalPriceRows(
    ticker: string,
    lookbackMonths: number
  ): Promise<FmpHistoricalPriceRow[]> {
    if (!FMP_API_KEY) {
      return []
    }

    const now = new Date()
    const from = shiftMonths(now, -lookbackMonths)
    const fromIso = from.toISOString().slice(0, 10)
    const toIso = now.toISOString().slice(0, 10)
    const url =
      `${FMP_STABLE}/historical-price-eod/full?symbol=${encodeURIComponent(ticker)}` +
      `&from=${fromIso}&to=${toIso}&apikey=${FMP_API_KEY}`

    const response = await axios.get(url, {
      timeout: HISTORICAL_CALIBRATION_TIMEOUT_MS,
    })
    const payload = response.data

    const rawRows = Array.isArray(payload)
      ? payload
      : isRecord(payload) && Array.isArray(payload.historical)
      ? payload.historical
      : []

    const rows = rawRows
      .map((row) => {
        if (!isRecord(row)) return null
        const dateRaw = row.date
        const closeRaw = row.close
        const date = typeof dateRaw === 'string' ? dateRaw : ''
        const close = Number(closeRaw)
        if (!date || !Number.isFinite(close) || close <= 0) return null
        return { date, close }
      })
      .filter((row): row is FmpHistoricalPriceRow => row !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return rows
  }

  private buildMonthlyCloseSeries(rows: FmpHistoricalPriceRow[]): number[] {
    if (rows.length === 0) {
      return []
    }

    const closeByMonth = new Map<string, number>()
    rows.forEach((row) => {
      const monthKey = row.date.slice(0, 7)
      closeByMonth.set(monthKey, row.close)
    })

    return Array.from(closeByMonth.values()).filter((value) => value > 0)
  }

  private buildMonthlyReturns(prices: number[]): number[] {
    const returns: number[] = []
    for (let index = 1; index < prices.length; index += 1) {
      const previous = prices[index - 1]
      const current = prices[index]
      if (previous <= 0 || current <= 0) continue
      returns.push(current / previous - 1)
    }
    return returns
  }

  private annualizedReturnFromMonthlyReturns(monthlyReturns: number[]): number {
    if (monthlyReturns.length === 0) {
      return 0
    }

    const growthFactor = monthlyReturns.reduce((acc, value) => acc * (1 + value), 1)
    if (growthFactor <= 0) {
      return -0.95
    }
    const averageMonthlyGrowth = Math.pow(growthFactor, 1 / monthlyReturns.length)
    return Math.pow(averageMonthlyGrowth, 12) - 1
  }

  private annualizedVolatilityFromMonthlyReturns(monthlyReturns: number[]): number {
    if (monthlyReturns.length <= 1) {
      return 0
    }

    const mean = monthlyReturns.reduce((sum, value) => sum + value, 0) / monthlyReturns.length
    const variance =
      monthlyReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      (monthlyReturns.length - 1)
    return Math.sqrt(Math.max(variance, 0)) * Math.sqrt(12)
  }

  private shouldFetchDividendHistory(assetType: PortfolioAssetType): boolean {
    return assetType === 'stock' || assetType === 'etf' || assetType === 'reit' || assetType === 'bond'
  }

  private async fetchTrailingDividendYield(
    ticker: string,
    referencePrice: number,
    referenceDateIso?: string
  ): Promise<{ annualDividendYield: number | null; dividendSamples: number }> {
    if (!FMP_API_KEY || referencePrice <= 0) {
      return { annualDividendYield: null, dividendSamples: 0 }
    }

    const url = `${FMP_STABLE}/dividends?symbol=${encodeURIComponent(ticker)}&apikey=${FMP_API_KEY}`
    const response = await axios.get(url, {
      timeout: HISTORICAL_CALIBRATION_TIMEOUT_MS,
    })
    const payload = response.data
    const rawRows = Array.isArray(payload)
      ? payload
      : isRecord(payload) && Array.isArray(payload.historical)
      ? payload.historical
      : []

    const rows = rawRows
      .map((row) => {
        if (!isRecord(row)) return null
        const dateRaw = row.date
        const amountRaw = row.adjDividend ?? row.dividend
        const date = typeof dateRaw === 'string' ? dateRaw : ''
        const amount = Number(amountRaw)
        if (!date || !Number.isFinite(amount) || amount <= 0) return null
        return { date, amount }
      })
      .filter((row): row is FmpDividendRow => row !== null)

    if (rows.length === 0) {
      return { annualDividendYield: null, dividendSamples: 0 }
    }

    const referenceDate = referenceDateIso ? new Date(referenceDateIso) : new Date()
    const fromDate = new Date(referenceDate.getTime())
    fromDate.setUTCFullYear(fromDate.getUTCFullYear() - 1)
    const trailingRows = rows.filter((row) => {
      const date = new Date(row.date)
      return date >= fromDate && date <= referenceDate
    })

    const annualDividend = trailingRows.reduce((sum, row) => sum + row.amount, 0)
    if (annualDividend <= 0) {
      return { annualDividendYield: null, dividendSamples: trailingRows.length }
    }

    return {
      annualDividendYield: annualDividend / referencePrice,
      dividendSamples: trailingRows.length,
    }
  }

  private runScenarioSimulation(input: {
    scenario: SimulationScenario
    states: HoldingState[]
    maxMonths: number
    drip: boolean
    includeInflation: boolean
    monthlyContribution: number
    contributionGrowthRate: number
    annualReturnShock?: number
    inflationShock?: number
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
    const annualReturnShock = clamp(readNumber(input.annualReturnShock), -0.95, 1.5)
    const inflationShock = clamp(readNumber(input.inflationShock), -0.1, 0.1)
    const scenarioInflationBase =
      scenarioPreset.inflationOverride !== undefined
        ? scenarioPreset.inflationOverride
        : input.fireTarget.inflationRate
    const inflationRate = clamp(scenarioInflationBase + inflationShock, 0, 0.2)
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
        const effectiveAnnualReturn = clamp(state.annualReturn + annualReturnShock, -0.95, 2)
        const monthlyReturn = Math.pow(1 + effectiveAnnualReturn, 1 / 12) - 1
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

  private buildMonteCarloCacheKey(input: MonteCarloSimulationInput): string {
    const cachePayload = {
      scenario: input.scenario,
      simulations: input.simulations,
      maxMonths: input.maxMonths,
      drip: input.drip,
      includeInflation: input.includeInflation,
      monthlyContribution: Number(input.monthlyContribution.toFixed(4)),
      contributionGrowthRate: Number(input.contributionGrowthRate.toFixed(6)),
      fireTargetMethod: input.fireTargetMethod,
      fireTarget: {
        monthlyExpenses: Number(input.fireTarget.monthlyExpenses.toFixed(2)),
        desiredMonthlyIncome: Number(input.fireTarget.desiredMonthlyIncome.toFixed(2)),
        targetAmount: Number(input.fireTarget.targetAmount.toFixed(2)),
        withdrawalRate: Number(input.fireTarget.withdrawalRate.toFixed(6)),
        inflationRate: Number(input.fireTarget.inflationRate.toFixed(6)),
      },
      states: input.states.map((state) => ({
        ticker: state.ticker,
        assetType: state.assetType,
        shares: Number(state.shares.toFixed(8)),
        price: Number(state.price.toFixed(8)),
        annualReturn: Number(state.annualReturn.toFixed(8)),
        annualDividendYield: Number(state.annualDividendYield.toFixed(8)),
        annualVolatility: Number(state.annualVolatility.toFixed(8)),
        allocationWeight: Number(state.allocationWeight.toFixed(8)),
      })),
    }

    return createHash('sha256').update(JSON.stringify(cachePayload)).digest('hex')
  }

  private pruneMonteCarloCache(now = Date.now()) {
    for (const [key, entry] of this.monteCarloCache.entries()) {
      if (entry.expiresAt <= now) {
        this.monteCarloCache.delete(key)
      }
    }

    if (this.monteCarloCache.size <= MONTE_CARLO_CACHE_MAX_ENTRIES) {
      return
    }

    const entriesByLastUse = [...this.monteCarloCache.entries()].sort(
      (left, right) => left[1].touchedAt - right[1].touchedAt
    )
    const overflow = this.monteCarloCache.size - MONTE_CARLO_CACHE_MAX_ENTRIES
    for (let index = 0; index < overflow; index += 1) {
      const key = entriesByLastUse[index]?.[0]
      if (key) {
        this.monteCarloCache.delete(key)
      }
    }
  }

  private getCachedMonteCarloResult(cacheKey: string): MonteCarloSimulationResult | null {
    const now = Date.now()
    const cachedEntry = this.monteCarloCache.get(cacheKey)
    if (!cachedEntry) {
      return null
    }

    if (cachedEntry.expiresAt <= now) {
      this.monteCarloCache.delete(cacheKey)
      return null
    }

    cachedEntry.touchedAt = now
    return cloneMonteCarloSimulationResult(cachedEntry.result)
  }

  private setCachedMonteCarloResult(cacheKey: string, result: MonteCarloSimulationResult) {
    const now = Date.now()
    this.pruneMonteCarloCache(now)
    this.monteCarloCache.set(cacheKey, {
      expiresAt: now + MONTE_CARLO_CACHE_TTL_MS,
      touchedAt: now,
      result: cloneMonteCarloSimulationResult(result),
    })
    this.pruneMonteCarloCache(now)
  }

  private async runMonteCarloSimulationWithCache(
    input: MonteCarloSimulationInput
  ): Promise<MonteCarloSimulationResult> {
    const cacheKey = this.buildMonteCarloCacheKey(input)
    const cached = this.getCachedMonteCarloResult(cacheKey)
    if (cached) {
      return cached
    }

    const computed = await this.runMonteCarloSimulation(input)
    this.setCachedMonteCarloResult(cacheKey, computed)
    return cloneMonteCarloSimulationResult(computed)
  }

  private async runMonteCarloSimulation(
    input: MonteCarloSimulationInput
  ): Promise<MonteCarloSimulationResult> {
    const startDate = new Date()
    const scenarioPreset = SCENARIO_PRESETS[input.scenario]
    const baseInflationRate =
      scenarioPreset.inflationOverride !== undefined
        ? scenarioPreset.inflationOverride
        : input.fireTarget.inflationRate
    const inflationRate = clamp(baseInflationRate, 0, 0.2)
    const fireMonthByRun: Array<number | null> = []
    const finalPortfolioValues: number[] = []

    for (let simulation = 0; simulation < input.simulations; simulation += 1) {
      const states = input.states.map((state) => ({ ...state }))
      let fireMonth: number | null = null
      let lastPortfolioValue = 0

      for (let month = 1; month <= input.maxMonths; month += 1) {
        const annualContributionMultiplier = Math.pow(
          1 + input.contributionGrowthRate,
          Math.floor((month - 1) / 12)
        )
        const monthlyContribution = input.monthlyContribution * annualContributionMultiplier
        let portfolioValue = 0
        let passiveIncome = 0

        states.forEach((state) => {
          const expectedMonthlyReturn = Math.pow(1 + state.annualReturn, 1 / 12) - 1
          const monthlyVolatility = clamp(state.annualVolatility, 0, 1.2) / Math.sqrt(12)
          const stochasticReturn = expectedMonthlyReturn + sampleStandardNormal() * monthlyVolatility
          const monthlyReturn = clamp(stochasticReturn, -0.95, 2)
          state.price = Math.max(0.0001, state.price * (1 + monthlyReturn))

          const allocation = monthlyContribution * state.allocationWeight
          if (allocation > 0) {
            const newShares = allocation / state.price
            state.shares += newShares
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
        const targetValue = calculateFireTarget(
          input.fireTargetMethod,
          input.fireTarget,
          inflationFactor
        )
        lastPortfolioValue = portfolioValue

        const fireReached =
          input.fireTargetMethod === 'passive_income'
            ? passiveIncome >= targetValue
            : portfolioValue >= targetValue

        if (fireReached) {
          fireMonth = month
          break
        }
      }

      fireMonthByRun.push(fireMonth)
      finalPortfolioValues.push(Number(lastPortfolioValue.toFixed(2)))

      if (
        input.simulations >= MONTE_CARLO_YIELD_EVERY_RUNS &&
        (simulation + 1) % MONTE_CARLO_YIELD_EVERY_RUNS === 0
      ) {
        await yieldToEventLoop()
      }
    }

    const achievedRuns = fireMonthByRun.filter((month): month is number => month !== null).length
    const successProbabilityPct = Number(((achievedRuns / input.simulations) * 100).toFixed(2))
    const fireMonths = fireMonthByRun.filter((month): month is number => month !== null)
    const monthsToFirePercentiles = buildPercentiles(fireMonths)
    const yearsToFirePercentiles =
      monthsToFirePercentiles === null
        ? null
        : {
            p10: Number((monthsToFirePercentiles.p10 / 12).toFixed(2)),
            p25: Number((monthsToFirePercentiles.p25 / 12).toFixed(2)),
            p50: Number((monthsToFirePercentiles.p50 / 12).toFixed(2)),
            p75: Number((monthsToFirePercentiles.p75 / 12).toFixed(2)),
            p90: Number((monthsToFirePercentiles.p90 / 12).toFixed(2)),
          }
    const finalPortfolioValuePercentiles = buildPercentiles(finalPortfolioValues) ?? {
      p10: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p90: 0,
    }

    const timelineSuccessProbability: MonteCarloSimulationResult['timelineSuccessProbability'] = []
    const maxYears = Math.max(1, Math.ceil(input.maxMonths / 12))
    for (let year = 1; year <= maxYears; year += 1) {
      const month = Math.min(input.maxMonths, year * 12)
      const reachedByMonth = fireMonthByRun.reduce<number>((total, fireMonth) => {
        if (fireMonth === null) return total
        return fireMonth <= month ? total + 1 : total
      }, 0)
      timelineSuccessProbability.push({
        month,
        years: Number((month / 12).toFixed(2)),
        date: toIsoYearMonth(shiftMonths(startDate, month)),
        probabilityPct: Number(((reachedByMonth / input.simulations) * 100).toFixed(2)),
      })
    }

    return {
      enabled: true,
      scenario: input.scenario,
      simulations: input.simulations,
      achievedRuns,
      successProbabilityPct,
      monthsToFirePercentiles,
      yearsToFirePercentiles,
      finalPortfolioValuePercentiles,
      timelineSuccessProbability,
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
