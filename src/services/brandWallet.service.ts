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

type AdminTopUpRequestStatus = Extract<BrandWalletTransactionStatus, 'pending' | 'completed' | 'failed' | 'cancelled'>

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

const mapWalletSummary = (wallet: any) => ({
  id: String(wallet._id),
  currency: wallet.currency ?? DEFAULT_CURRENCY,
  balanceCents: toSafeNumber(wallet.balanceCents),
  reservedCents: toSafeNumber(wallet.reservedCents),
  availableCents: Math.max(0, toSafeNumber(wallet.balanceCents) - toSafeNumber(wallet.reservedCents)),
  updatedAt: wallet.updatedAt ?? null,
})

const mapAdminTopUpRequestItem = (
  item: any,
  directoryMap: Map<string, any>,
  walletMap: Map<string, any>
) => {
  const directoryEntryId = String(item.directoryEntry)
  const walletId = String(item.wallet)
  const directory = directoryMap.get(directoryEntryId) ?? null
  const wallet = walletMap.get(walletId) ?? null

  return {
    ...mapTransaction(item),
    directoryEntry: directory,
    wallet,
  }
}

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

  async listAdminTopUpRequests(
    filters: {
      status?: AdminTopUpRequestStatus
      ownerUserId?: string
      directoryEntryId?: string
      search?: string
    } = {},
    options: {
      page?: number
      limit?: number
    } = {}
  ) {
    const query: Record<string, unknown> = {
      type: 'top_up',
    }

    if (filters.status && VALID_TRANSACTION_STATUSES.includes(filters.status)) {
      query.status = filters.status
    }

    if (filters.ownerUserId) {
      query.ownerUser = this.toObjectId(filters.ownerUserId, 'ownerUserId')
    }

    if (filters.directoryEntryId) {
      query.directoryEntry = this.toObjectId(filters.directoryEntryId, 'directoryEntryId')
    }

    const search = toOptionalString(filters.search)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      query.$or = [{ reference: regex }, { description: regex }]
    }

    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const [items, total, summaryRows] = await Promise.all([
      BrandWalletTransaction.find(query)
        .sort({ createdAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requestedBy', 'name username email role')
        .lean(),
      BrandWalletTransaction.countDocuments(query),
      BrandWalletTransaction.aggregate<{
        _id: BrandWalletTransactionStatus
        count: number
        amountCents: number
      }>([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amountCents: { $sum: '$amountCents' },
          },
        },
      ]),
    ])

    const directoryIds = Array.from(new Set(items.map((item) => String(item.directoryEntry)))).map((id) =>
      new mongoose.Types.ObjectId(id)
    )
    const walletIds = Array.from(new Set(items.map((item) => String(item.wallet)))).map(
      (id) => new mongoose.Types.ObjectId(id)
    )

    const [directories, wallets] = await Promise.all([
      directoryIds.length > 0
        ? DirectoryEntry.find({ _id: { $in: directoryIds } })
            .select('name slug verticalType status verificationStatus')
            .lean()
        : Promise.resolve([]),
      walletIds.length > 0
        ? BrandWallet.find({ _id: { $in: walletIds } })
            .select('currency balanceCents reservedCents updatedAt')
            .lean()
        : Promise.resolve([]),
    ])

    const directoryMap = new Map(
      directories.map((entry: any) => [String(entry._id), mapDirectorySummary(entry)])
    )
    const walletMap = new Map(
      wallets.map((wallet: any) => [String(wallet._id), mapWalletSummary(wallet)])
    )

    const summary = summaryRows.reduce(
      (acc, row) => {
        const status = row._id
        if (status in acc.byStatus) {
          acc.byStatus[status] = row.count
        }
        acc.totalAmountCents += toSafeNumber(row.amountCents)
        return acc
      },
      {
        byStatus: {
          pending: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
        } as Record<BrandWalletTransactionStatus, number>,
        totalAmountCents: 0,
      }
    )

    return {
      items: items.map((item) => mapAdminTopUpRequestItem(item, directoryMap, walletMap)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        status: filters.status ?? null,
        ownerUserId: filters.ownerUserId ?? null,
        directoryEntryId: filters.directoryEntryId ?? null,
        search: search ?? null,
      },
      summary: {
        byStatus: summary.byStatus,
        totalAmountCents: summary.totalAmountCents,
        totalAmount: toSafeAmountEuros(summary.totalAmountCents),
      },
    }
  }

  async approveTopUpRequest(
    actorUserId: string,
    transactionId: string,
    input: {
      reason?: unknown
      note?: unknown
      reference?: unknown
      metadata?: unknown
      force?: unknown
    } = {}
  ) {
    const actorObjectId = this.toObjectId(actorUserId, 'actorUserId')
    const transactionObjectId = this.toObjectId(transactionId, 'transactionId')
    const reason = toOptionalString(input.reason)
    if (!reason) {
      throw new BrandWalletServiceError(400, 'reason obrigatorio para aprovar top-up.')
    }

    const note = toOptionalString(input.note)
    const nextReference = toOptionalString(input.reference)
    const force = input.force === true
    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : null

    const now = new Date()

    await mongoose.connection.transaction(async (session) => {
      const tx = await BrandWalletTransaction.findById(transactionObjectId).session(session)
      if (!tx || tx.type !== 'top_up') {
        throw new BrandWalletServiceError(404, 'Pedido de top-up nao encontrado.')
      }

      if (tx.status === 'completed') {
        if (force) {
          tx.metadata = {
            ...(tx.metadata && typeof tx.metadata === 'object' ? (tx.metadata as Record<string, unknown>) : {}),
            adminDecision: {
              action: 'approve',
              reason,
              note: note ?? null,
              actorUserId: String(actorObjectId),
              processedAt: now.toISOString(),
              forced: true,
            },
          }
          if (nextReference) tx.reference = nextReference
          await tx.save({ session })
          return
        }

        throw new BrandWalletServiceError(409, 'Pedido de top-up ja se encontra concluido.')
      }

      if (tx.status !== 'pending' && !force) {
        throw new BrandWalletServiceError(
          409,
          'Pedido de top-up so pode ser aprovado a partir de estado pending.'
        )
      }

      const wallet = await BrandWallet.findById(tx.wallet).session(session)
      if (!wallet) {
        throw new BrandWalletServiceError(404, 'Wallet associada ao pedido nao encontrada.')
      }

      wallet.balanceCents += tx.amountCents
      wallet.lifetimeCreditsCents += tx.amountCents
      wallet.lastTransactionAt = now
      wallet.updatedBy = actorObjectId
      await wallet.save({ session })

      tx.status = 'completed'
      tx.settledAt = now
      if (nextReference) tx.reference = nextReference
      tx.metadata = {
        ...(tx.metadata && typeof tx.metadata === 'object' ? (tx.metadata as Record<string, unknown>) : {}),
        ...(metadata ?? {}),
        adminDecision: {
          action: 'approve',
          reason,
          note: note ?? null,
          actorUserId: String(actorObjectId),
          processedAt: now.toISOString(),
          force,
        },
      }
      await tx.save({ session })
    })

    const transactionRow = await BrandWalletTransaction.findById(transactionObjectId)
      .populate('requestedBy', 'name username email role')
      .lean()

    if (!transactionRow) {
      throw new BrandWalletServiceError(500, 'Falha ao carregar top-up aprovado.')
    }

    const [wallet, directoryEntry] = await Promise.all([
      mongoose.Types.ObjectId.isValid(String(transactionRow.wallet))
        ? BrandWallet.findById(transactionRow.wallet)
            .select('currency balanceCents reservedCents updatedAt')
            .lean()
        : Promise.resolve(null),
      mongoose.Types.ObjectId.isValid(String(transactionRow.directoryEntry))
        ? DirectoryEntry.findById(transactionRow.directoryEntry)
            .select('name slug verticalType status verificationStatus')
            .lean()
        : Promise.resolve(null),
    ])

    return {
      updated: true,
      item: mapTransaction(transactionRow),
      wallet: wallet ? mapWalletSummary(wallet) : null,
      directoryEntry: directoryEntry ? mapDirectorySummary(directoryEntry) : null,
    }
  }

  async rejectTopUpRequest(
    actorUserId: string,
    transactionId: string,
    input: {
      reason?: unknown
      note?: unknown
      status?: unknown
      reference?: unknown
      metadata?: unknown
      force?: unknown
    } = {}
  ) {
    const actorObjectId = this.toObjectId(actorUserId, 'actorUserId')
    const transactionObjectId = this.toObjectId(transactionId, 'transactionId')
    const reason = toOptionalString(input.reason)
    if (!reason) {
      throw new BrandWalletServiceError(400, 'reason obrigatorio para rejeitar top-up.')
    }

    const nextStatusRaw = toOptionalString(input.status)
    const nextStatus: BrandWalletTransactionStatus =
      nextStatusRaw === 'cancelled' ? 'cancelled' : 'failed'

    const note = toOptionalString(input.note)
    const nextReference = toOptionalString(input.reference)
    const force = input.force === true
    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : null

    const now = new Date()

    await mongoose.connection.transaction(async (session) => {
      const tx = await BrandWalletTransaction.findById(transactionObjectId).session(session)
      if (!tx || tx.type !== 'top_up') {
        throw new BrandWalletServiceError(404, 'Pedido de top-up nao encontrado.')
      }

      if (tx.status === 'completed') {
        throw new BrandWalletServiceError(
          409,
          'Pedido de top-up concluido nao pode ser rejeitado/cancelado.'
        )
      }

      if (tx.status !== 'pending' && tx.status !== nextStatus && !force) {
        throw new BrandWalletServiceError(
          409,
          'Pedido de top-up so pode ser rejeitado/cancelado a partir de pending.'
        )
      }

      tx.status = nextStatus
      tx.settledAt = now
      if (nextReference) tx.reference = nextReference
      tx.metadata = {
        ...(tx.metadata && typeof tx.metadata === 'object' ? (tx.metadata as Record<string, unknown>) : {}),
        ...(metadata ?? {}),
        adminDecision: {
          action: nextStatus === 'cancelled' ? 'cancel' : 'reject',
          reason,
          note: note ?? null,
          actorUserId: String(actorObjectId),
          processedAt: now.toISOString(),
          force,
        },
      }
      await tx.save({ session })
    })

    const transactionRow = await BrandWalletTransaction.findById(transactionObjectId)
      .populate('requestedBy', 'name username email role')
      .lean()
    if (!transactionRow) {
      throw new BrandWalletServiceError(500, 'Falha ao carregar top-up rejeitado/cancelado.')
    }

    return {
      updated: true,
      item: mapTransaction(transactionRow),
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
