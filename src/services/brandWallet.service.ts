import mongoose from 'mongoose'
import { BrandWallet } from '../models/BrandWallet'
import {
  BrandWalletTransaction,
  BrandWalletTransactionStatus,
  BrandWalletTransactionType,
} from '../models/BrandWalletTransaction'
import { DirectoryEntry } from '../models/DirectoryEntry'
import { resolvePagination } from '../utils/pagination'

const DEFAULT_CURRENCY = 'EUR'
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

const VALID_TRANSACTION_TYPES: ReadonlyArray<BrandWalletTransactionType> = [
  'top_up',
  'campaign_spend',
  'refund',
  'manual_adjustment',
]

const VALID_TRANSACTION_STATUSES: ReadonlyArray<BrandWalletTransactionStatus> = [
  'pending',
  'completed',
  'failed',
  'cancelled',
]

const toSafeAmountEuros = (amountCents: number): number =>
  Number((Math.max(0, amountCents) / 100).toFixed(2))

const toSafeNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return value
}

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const parseAmountCents = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value)
    return rounded > 0 ? rounded : null
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.')
    if (!normalized) return null
    const parsed = Number.parseFloat(normalized)
    if (!Number.isFinite(parsed)) return null
    const cents = Math.round(parsed * 100)
    return cents > 0 ? cents : null
  }

  return null
}

const mapDirectorySummary = (entry: any) => ({
  id: String(entry._id),
  name: entry.name,
  slug: entry.slug,
  verticalType: entry.verticalType,
  status: entry.status,
  verificationStatus: entry.verificationStatus,
})

const mapWallet = (wallet: any, directoryEntry: any) => ({
  id: String(wallet._id),
  directoryEntry: mapDirectorySummary(directoryEntry),
  currency: wallet.currency,
  balanceCents: toSafeNumber(wallet.balanceCents),
  balance: toSafeAmountEuros(toSafeNumber(wallet.balanceCents)),
  reservedCents: toSafeNumber(wallet.reservedCents),
  reserved: toSafeAmountEuros(toSafeNumber(wallet.reservedCents)),
  availableCents: Math.max(0, toSafeNumber(wallet.balanceCents) - toSafeNumber(wallet.reservedCents)),
  available: toSafeAmountEuros(
    Math.max(0, toSafeNumber(wallet.balanceCents) - toSafeNumber(wallet.reservedCents))
  ),
  lifetimeCreditsCents: toSafeNumber(wallet.lifetimeCreditsCents),
  lifetimeCredits: toSafeAmountEuros(toSafeNumber(wallet.lifetimeCreditsCents)),
  lifetimeDebitsCents: toSafeNumber(wallet.lifetimeDebitsCents),
  lifetimeDebits: toSafeAmountEuros(toSafeNumber(wallet.lifetimeDebitsCents)),
  lastTransactionAt: wallet.lastTransactionAt ?? null,
  updatedAt: wallet.updatedAt ?? null,
})

const mapTransaction = (item: any) => ({
  id: String(item._id),
  walletId: String(item.wallet),
  directoryEntryId: String(item.directoryEntry),
  type: item.type,
  direction: item.direction,
  status: item.status,
  amountCents: toSafeNumber(item.amountCents),
  amount: toSafeAmountEuros(toSafeNumber(item.amountCents)),
  currency: item.currency,
  description: item.description ?? null,
  reference: item.reference ?? null,
  metadata: item.metadata ?? null,
  requestedBy: item.requestedBy ?? null,
  settledAt: item.settledAt ?? null,
  createdAt: item.createdAt ?? null,
  updatedAt: item.updatedAt ?? null,
})

export class BrandWalletServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class BrandWalletService {
  private toObjectId(rawId: string, fieldName: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(rawId)) {
      throw new BrandWalletServiceError(400, `${fieldName} invalido.`)
    }
    return new mongoose.Types.ObjectId(rawId)
  }

  private async getOwnedDirectoryEntry(ownerUserId: string, directoryEntryId: string) {
    const ownerObjectId = this.toObjectId(ownerUserId, 'ownerUserId')
    const directoryEntryObjectId = this.toObjectId(directoryEntryId, 'directoryEntryId')

    const entry = await DirectoryEntry.findOne({
      _id: directoryEntryObjectId,
      ownerUser: ownerObjectId,
    })
      .select('name slug verticalType status verificationStatus ownerUser')
      .lean()

    if (!entry) {
      throw new BrandWalletServiceError(
        403,
        'Sem permissao para aceder a wallet deste DirectoryEntry.'
      )
    }

    return {
      ownerObjectId,
      directoryEntryObjectId,
      entry,
    }
  }

  private async ensureWallet(
    ownerObjectId: mongoose.Types.ObjectId,
    directoryEntryObjectId: mongoose.Types.ObjectId
  ) {
    return BrandWallet.findOneAndUpdate(
      {
        directoryEntry: directoryEntryObjectId,
      },
      {
        $set: {
          ownerUser: ownerObjectId,
          updatedBy: ownerObjectId,
        },
        $setOnInsert: {
          currency: DEFAULT_CURRENCY,
          balanceCents: 0,
          reservedCents: 0,
          lifetimeCreditsCents: 0,
          lifetimeDebitsCents: 0,
          createdBy: ownerObjectId,
        },
      },
      {
        new: true,
        upsert: true,
      }
    ).lean()
  }

  async listWallets(ownerUserId: string) {
    const ownerObjectId = this.toObjectId(ownerUserId, 'ownerUserId')
    const entries = await DirectoryEntry.find({
      ownerUser: ownerObjectId,
    })
      .select('name slug verticalType status verificationStatus')
      .sort({ updatedAt: -1, name: 1 })
      .lean()

    if (entries.length === 0) {
      return {
        summary: {
          totalWallets: 0,
          totalBalanceCents: 0,
          totalBalance: 0,
          totalReservedCents: 0,
          totalReserved: 0,
          totalAvailableCents: 0,
          totalAvailable: 0,
        },
        items: [],
      }
    }

    const walletsRaw = await Promise.all(
      entries.map((entry) => this.ensureWallet(ownerObjectId, this.toObjectId(String(entry._id), '_id')))
    )

    const items = walletsRaw.map((wallet, index) => mapWallet(wallet, entries[index]))
    const summary = items.reduce(
      (acc, item) => {
        acc.totalWallets += 1
        acc.totalBalanceCents += item.balanceCents
        acc.totalReservedCents += item.reservedCents
        acc.totalAvailableCents += item.availableCents
        return acc
      },
      {
        totalWallets: 0,
        totalBalanceCents: 0,
        totalReservedCents: 0,
        totalAvailableCents: 0,
      }
    )

    return {
      summary: {
        ...summary,
        totalBalance: toSafeAmountEuros(summary.totalBalanceCents),
        totalReserved: toSafeAmountEuros(summary.totalReservedCents),
        totalAvailable: toSafeAmountEuros(summary.totalAvailableCents),
      },
      items,
    }
  }

  async getWallet(ownerUserId: string, directoryEntryId: string) {
    const { ownerObjectId, directoryEntryObjectId, entry } = await this.getOwnedDirectoryEntry(
      ownerUserId,
      directoryEntryId
    )

    const wallet = await this.ensureWallet(ownerObjectId, directoryEntryObjectId)
    return mapWallet(wallet, entry)
  }

  async listTransactions(
    ownerUserId: string,
    directoryEntryId: string,
    filters: {
      type?: BrandWalletTransactionType
      status?: BrandWalletTransactionStatus
      search?: string
    } = {},
    options: {
      page?: number
      limit?: number
    } = {}
  ) {
    const { ownerObjectId, directoryEntryObjectId, entry } = await this.getOwnedDirectoryEntry(
      ownerUserId,
      directoryEntryId
    )

    const wallet = await this.ensureWallet(ownerObjectId, directoryEntryObjectId)

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {
      wallet: wallet._id,
      directoryEntry: directoryEntryObjectId,
      ownerUser: ownerObjectId,
    }

    if (filters.type && VALID_TRANSACTION_TYPES.includes(filters.type)) {
      query.type = filters.type
    }

    if (filters.status && VALID_TRANSACTION_STATUSES.includes(filters.status)) {
      query.status = filters.status
    }

    const search = toOptionalString(filters.search)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      query.$or = [{ reference: regex }, { description: regex }]
    }

    const [items, total] = await Promise.all([
      BrandWalletTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requestedBy', 'name username email role')
        .lean(),
      BrandWalletTransaction.countDocuments(query),
    ])

    return {
      wallet: mapWallet(wallet, entry),
      items: items.map(mapTransaction),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        type: filters.type ?? null,
        status: filters.status ?? null,
        search: search ?? null,
      },
    }
  }

  async requestTopUp(
    ownerUserId: string,
    directoryEntryId: string,
    input: {
      amountCents?: unknown
      amount?: unknown
      description?: unknown
      reference?: unknown
      metadata?: unknown
    } = {}
  ) {
    const { ownerObjectId, directoryEntryObjectId, entry } = await this.getOwnedDirectoryEntry(
      ownerUserId,
      directoryEntryId
    )

    const wallet = await this.ensureWallet(ownerObjectId, directoryEntryObjectId)

    const amountCents =
      parseAmountCents(input.amountCents) ??
      parseAmountCents(input.amount) ??
      null

    if (!amountCents) {
      throw new BrandWalletServiceError(400, 'amount/amountCents invalido.')
    }

    if (amountCents > 5_000_000_00) {
      throw new BrandWalletServiceError(400, 'Montante excede o limite permitido por pedido.')
    }

    const description =
      toOptionalString(input.description) ??
      `Pedido de top-up para ${entry.name}`
    const reference = toOptionalString(input.reference)
    const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : null

    const tx = await BrandWalletTransaction.create({
      wallet: wallet._id,
      directoryEntry: directoryEntryObjectId,
      ownerUser: ownerObjectId,
      type: 'top_up',
      direction: 'credit',
      status: 'pending',
      amountCents,
      currency: wallet.currency ?? DEFAULT_CURRENCY,
      description,
      reference,
      metadata: metadata
        ? {
            ...(metadata as Record<string, unknown>),
            source: 'brand_portal_top_up_request',
          }
        : {
            source: 'brand_portal_top_up_request',
          },
      requestedBy: ownerObjectId,
      settledAt: null,
    })

    return {
      wallet: mapWallet(wallet, entry),
      transaction: mapTransaction(tx.toObject()),
    }
  }
}

export const brandWalletService = new BrandWalletService()

export const isValidBrandWalletTransactionType = (
  value: unknown
): value is BrandWalletTransactionType =>
  typeof value === 'string' && VALID_TRANSACTION_TYPES.includes(value as BrandWalletTransactionType)

export const isValidBrandWalletTransactionStatus = (
  value: unknown
): value is BrandWalletTransactionStatus =>
  typeof value === 'string' &&
  VALID_TRANSACTION_STATUSES.includes(value as BrandWalletTransactionStatus)
