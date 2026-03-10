
import mongoose from 'mongoose'
import {
  AdminBulkImportJob,
  AdminBulkImportResultRow,
  AdminBulkImportErrorRow,
  AdminBulkImportType,
  AdminBulkImportStatus,
  ADMIN_BULK_IMPORT_TYPES,
} from '../models/AdminBulkImportJob'
import { User, UserRole } from '../models/User'
import {
  SubscriptionBillingCycle,
  SubscriptionStatus,
  UserSubscription,
} from '../models/UserSubscription'
import { AdCampaign, AdCampaignStatus } from '../models/AdCampaign'
import { AdSlotConfig } from '../models/AdSlotConfig'
import {
  AdPartnershipType,
  AdPartnershipVisibility,
  SlotCompatibilityInput,
  ensureDisclosureLabel,
  ensureExternalAdsNoPremium,
  ensureFinancialRelevance,
  ensureSlotCompatibility,
  resolveDisclosureLabel,
} from './adminAdPartnership.service'
import { resolvePagination } from '../utils/pagination'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

const MAX_IMPORT_ROWS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_BULK_IMPORT_MAX_ROWS ?? '', 10)
  if (!Number.isFinite(parsed)) return 2000
  return Math.max(10, Math.min(10000, parsed))
})()

const MAX_IMPORT_BYTES = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_BULK_IMPORT_MAX_BYTES ?? '', 10)
  if (!Number.isFinite(parsed)) return 1024 * 1024
  return Math.max(2048, Math.min(10 * 1024 * 1024, parsed))
})()

const MAX_STORED_ERRORS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_BULK_IMPORT_MAX_STORED_ERRORS ?? '', 10)
  if (!Number.isFinite(parsed)) return 200
  return Math.max(10, Math.min(2000, parsed))
})()

const MAX_STORED_RESULTS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_BULK_IMPORT_MAX_STORED_RESULTS ?? '', 10)
  if (!Number.isFinite(parsed)) return 200
  return Math.max(10, Math.min(5000, parsed))
})()

const JOB_RETENTION_DAYS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_BULK_IMPORT_JOB_RETENTION_DAYS ?? '', 10)
  if (!Number.isFinite(parsed)) return 30
  return Math.max(1, Math.min(365, parsed))
})()

const SUBSCRIPTION_STATUS = new Set<SubscriptionStatus>(['active', 'trialing', 'past_due', 'canceled'])
const SUBSCRIPTION_BILLING_CYCLES = new Set<SubscriptionBillingCycle>([
  'monthly',
  'annual',
  'lifetime',
  'custom',
])
const AD_CAMPAIGN_STATUS = new Set<AdCampaignStatus>([
  'draft',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'completed',
  'rejected',
  'archived',
])
const ELIGIBLE_USER_ROLES = new Set<UserRole>(['free', 'premium'])

interface ParsedCsvRow {
  rowNumber: number
  values: Record<string, string>
}

interface ParsedCsvData {
  delimiter: string
  headers: string[]
  rows: ParsedCsvRow[]
  warnings: string[]
}

type RowPlanStatus = 'valid' | 'invalid' | 'skipped'

interface ImportRowPlan {
  rowNumber: number
  status: RowPlanStatus
  message: string
  code?: string
  targetType?: string
  targetId?: string
  payload?: Record<string, unknown>
}

interface ImportPlanningOutput {
  source: {
    delimiter: string
    headers: string[]
    totalRows: number
  }
  plans: ImportRowPlan[]
  warnings: string[]
  stats: Record<string, number>
  validRows: number
  failedRows: number
  skippedRows: number
}

export interface BulkImportPreviewInput {
  actorId: string
  actorRole: string
  importType: AdminBulkImportType
  csv: string
  delimiter?: string
}

export interface BulkImportExecuteInput extends BulkImportPreviewInput {
  dryRun?: boolean
  reason: string
  note?: string
}

export interface BulkImportListFilters {
  importType?: AdminBulkImportType
  status?: AdminBulkImportStatus
  dryRun?: boolean
}

export interface BulkImportListOptions {
  page?: number
  limit?: number
}

export class AdminBulkImportServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const normalizeEmail = (value: unknown): string | null => {
  const normalized = normalizeText(value)
  if (!normalized) return null
  const email = normalized.toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

const normalizePlanCode = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)

const normalizeBool = (
  value: string | null
): { provided: boolean; value?: boolean; error?: string } => {
  if (value === null) return { provided: false }

  const normalized = value.trim().toLowerCase()
  if (!normalized) return { provided: false }
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return { provided: true, value: true }
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return { provided: true, value: false }
  }

  return { provided: true, error: `Booleano invalido: ${value}` }
}

const normalizeInteger = (
  value: string | null,
  config: { min: number; max: number }
): { provided: boolean; value?: number; error?: string } => {
  if (value === null) return { provided: false }

  const normalized = value.trim()
  if (!normalized) return { provided: false }
  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isFinite(parsed)) {
    return { provided: true, error: `Numero invalido: ${value}` }
  }

  const clamped = Math.min(config.max, Math.max(config.min, parsed))
  return { provided: true, value: clamped }
}

const normalizeDate = (
  value: string | null
): { provided: boolean; value?: Date | null; error?: string } => {
  if (value === null) return { provided: false }

  const normalized = value.trim()
  if (!normalized) return { provided: false }
  if (['null', 'none', '-'].includes(normalized.toLowerCase())) {
    return { provided: true, value: null }
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return { provided: true, error: `Data invalida: ${value}` }
  }

  return { provided: true, value: parsed }
}

const normalizeDelimiter = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) return ','
  const trimmed = value.trim()
  if (trimmed === '\\t') return '\t'

  const allowed = new Set([',', ';', '\t', '|'])
  return allowed.has(trimmed) ? trimmed : ','
}

const normalizeHeader = (value: string): string =>
  value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

const parseCsv = (rawCsv: string, delimiter: string): ParsedCsvData => {
  const csv = rawCsv.replace(/^\uFEFF/, '')
  const warnings: string[] = []

  const rawRows: Array<{ lineNumber: number; columns: string[] }> = []
  let currentField = ''
  let currentRow: string[] = []
  let inQuotes = false
  let lineNumber = 1

  const pushRow = (line: number) => {
    currentRow.push(currentField)
    rawRows.push({ lineNumber: line, columns: currentRow })
    currentField = ''
    currentRow = []
  }

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]

    if (inQuotes) {
      if (char === '"') {
        if (csv[index + 1] === '"') {
          currentField += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === delimiter) {
      currentRow.push(currentField)
      currentField = ''
      continue
    }

    if (char === '\n') {
      pushRow(lineNumber)
      lineNumber += 1
      continue
    }

    if (char === '\r') continue

    currentField += char
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushRow(lineNumber)
  }

  while (
    rawRows.length > 0 &&
    rawRows[rawRows.length - 1].columns.every((column) => column.trim().length === 0)
  ) {
    rawRows.pop()
  }

  if (rawRows.length === 0) {
    throw new AdminBulkImportServiceError(400, 'CSV vazio.')
  }

  const headerRow = rawRows[0]
  const headers = headerRow.columns.map((value) => normalizeHeader(value))

  if (headers.length === 0 || headers.every((header) => !header)) {
    throw new AdminBulkImportServiceError(400, 'CSV sem cabecalhos validos.')
  }

  const usedHeaders = new Set<string>()
  for (const header of headers) {
    if (!header) {
      throw new AdminBulkImportServiceError(400, 'Cabecalho vazio detetado no CSV.')
    }

    if (usedHeaders.has(header)) {
      throw new AdminBulkImportServiceError(400, `Cabecalho duplicado no CSV: ${header}`)
    }
    usedHeaders.add(header)
  }

  if (rawRows.length - 1 > MAX_IMPORT_ROWS) {
    throw new AdminBulkImportServiceError(
      400,
      `CSV excede limite de ${MAX_IMPORT_ROWS} linhas de dados.`
    )
  }

  const rows: ParsedCsvRow[] = []
  for (const row of rawRows.slice(1)) {
    const hasContent = row.columns.some((column) => column.trim().length > 0)
    if (!hasContent) continue

    const values: Record<string, string> = {}
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index]
      values[header] = row.columns[index] ?? ''
    }

    if (row.columns.length > headers.length) {
      warnings.push(
        `Linha ${row.lineNumber} tem colunas extras; valores adicionais foram ignorados.`
      )
    }

    rows.push({ rowNumber: row.lineNumber, values })
  }

  if (rows.length === 0) {
    throw new AdminBulkImportServiceError(400, 'CSV sem linhas de dados validas.')
  }

  return {
    delimiter,
    headers,
    rows,
    warnings,
  }
}

const parseImportType = (value: unknown): AdminBulkImportType => {
  if (typeof value === 'string' && ADMIN_BULK_IMPORT_TYPES.includes(value as AdminBulkImportType)) {
    return value as AdminBulkImportType
  }

  throw new AdminBulkImportServiceError(400, 'importType invalido.')
}

const assertRoleAdmin = (role: unknown) => {
  if (role !== 'admin') {
    throw new AdminBulkImportServiceError(403, 'Acesso reservado a administradores.')
  }
}

const toObjectId = (value: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AdminBulkImportServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(value)
}

const buildSubscriptionSnapshot = (subscription: {
  planCode: string
  planLabel: string
  billingCycle: SubscriptionBillingCycle
  status: SubscriptionStatus
  entitlementActive: boolean
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  trialEndsAt?: Date | null
  canceledAt?: Date | null
  cancelAtPeriodEnd: boolean
}) => ({
  planCode: subscription.planCode,
  planLabel: subscription.planLabel,
  billingCycle: subscription.billingCycle,
  status: subscription.status,
  entitlementActive: subscription.entitlementActive,
  currentPeriodStart: subscription.currentPeriodStart ?? null,
  currentPeriodEnd: subscription.currentPeriodEnd ?? null,
  trialEndsAt: subscription.trialEndsAt ?? null,
  canceledAt: subscription.canceledAt ?? null,
  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
})

export class AdminBulkImportService {
  async listJobs(filters: BulkImportListFilters = {}, options: BulkImportListOptions = {}) {
    const { page, limit, skip } = resolvePagination(options, {
      defaultPage: DEFAULT_PAGE,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    })

    const query: Record<string, unknown> = {}
    if (filters.importType && ADMIN_BULK_IMPORT_TYPES.includes(filters.importType)) {
      query.importType = filters.importType
    }
    if (
      filters.status &&
      ['running', 'completed', 'completed_with_errors', 'failed'].includes(filters.status)
    ) {
      query.status = filters.status
    }
    if (typeof filters.dryRun === 'boolean') {
      query.dryRun = filters.dryRun
    }

    const [rows, total] = await Promise.all([
      AdminBulkImportJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name username email role')
        .lean(),
      AdminBulkImportJob.countDocuments(query),
    ])

    return {
      items: rows.map((row) => this.mapJob(row, false)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getJob(jobIdRaw: string) {
    const jobId = toObjectId(jobIdRaw, 'jobId')
    const row = await AdminBulkImportJob.findById(jobId)
      .populate('actor', 'name username email role')
      .lean()

    if (!row) {
      throw new AdminBulkImportServiceError(404, 'Job de bulk import nao encontrado.')
    }

    return this.mapJob(row, true)
  }

  async previewImport(input: BulkImportPreviewInput) {
    assertRoleAdmin(input.actorRole)
    toObjectId(input.actorId, 'actorId')

    const importType = parseImportType(input.importType)
    const planning = await this.planImport({
      importType,
      csv: input.csv,
      delimiter: input.delimiter,
    })

    return {
      importType,
      source: planning.source,
      summary: {
        totalRows: planning.source.totalRows,
        validRows: planning.validRows,
        failedRows: planning.failedRows,
        skippedRows: planning.skippedRows,
        warningsCount: planning.warnings.length,
      },
      stats: planning.stats,
      warnings: planning.warnings,
      rowsSample: planning.plans.slice(0, 60).map((row) => ({
        rowNumber: row.rowNumber,
        status: row.status,
        code: row.code,
        message: row.message,
        targetType: row.targetType ?? null,
        targetId: row.targetId ?? null,
      })),
    }
  }

  async createAndRunImport(input: BulkImportExecuteInput) {
    assertRoleAdmin(input.actorRole)
    const actorId = toObjectId(input.actorId, 'actorId')
    const importType = parseImportType(input.importType)

    const reason = normalizeText(input.reason)
    if (!reason) {
      throw new AdminBulkImportServiceError(400, 'Motivo obrigatorio para executar importacao.')
    }

    if (reason.length > 500) {
      throw new AdminBulkImportServiceError(400, 'Motivo excede limite de 500 caracteres.')
    }

    const note = normalizeText(input.note)
    const dryRun = input.dryRun === true

    const planning = await this.planImport({
      importType,
      csv: input.csv,
      delimiter: input.delimiter,
    })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000)

    const job = await AdminBulkImportJob.create({
      importType,
      status: 'running',
      actor: actorId,
      reason,
      note,
      dryRun,
      source: {
        format: 'csv',
        delimiter: planning.source.delimiter,
        headers: planning.source.headers,
      },
      summary: {
        totalRows: planning.source.totalRows,
        validRows: planning.validRows,
        processedRows: 0,
        succeededRows: 0,
        failedRows: planning.failedRows,
        skippedRows: planning.skippedRows,
        warningsCount: planning.warnings.length,
        errorsCount: planning.failedRows,
      },
      stats: planning.stats,
      warnings: planning.warnings.slice(0, MAX_STORED_ERRORS),
      errorRows: [],
      results: [],
      startedAt: now,
      finishedAt: null,
      expiresAt,
    })

    const errors: AdminBulkImportErrorRow[] = []
    const results: AdminBulkImportResultRow[] = []

    for (const plan of planning.plans) {
      if (plan.status === 'invalid') {
        errors.push({
          rowNumber: plan.rowNumber,
          code: plan.code ?? 'row_invalid',
          message: plan.message,
          targetType: plan.targetType ?? null,
          targetId: plan.targetId ?? null,
        })
        results.push({
          rowNumber: plan.rowNumber,
          status: 'failed',
          message: plan.message,
          targetType: plan.targetType ?? null,
          targetId: plan.targetId ?? null,
        })
      } else if (plan.status === 'skipped') {
        results.push({
          rowNumber: plan.rowNumber,
          status: 'skipped',
          message: plan.message,
          targetType: plan.targetType ?? null,
          targetId: plan.targetId ?? null,
        })
      }
    }

    let succeededRows = 0
    let failedExecutionRows = 0
    let skippedExecutionRows = 0

    for (const plan of planning.plans) {
      if (plan.status !== 'valid') continue

      if (dryRun) {
        succeededRows += 1
        results.push({
          rowNumber: plan.rowNumber,
          status: 'success',
          message: 'Linha validada (dry-run).',
          targetType: plan.targetType ?? null,
          targetId: plan.targetId ?? null,
        })
        continue
      }

      try {
        if (importType === 'subscription_entitlements') {
          const result = await this.applySubscriptionPlan(plan, actorId, reason, note)
          results.push({
            rowNumber: plan.rowNumber,
            status: result.status,
            message: result.message,
            targetType: result.targetType,
            targetId: result.targetId,
          })

          if (result.status === 'success') {
            succeededRows += 1
          } else if (result.status === 'skipped') {
            skippedExecutionRows += 1
          } else {
            failedExecutionRows += 1
            errors.push({
              rowNumber: plan.rowNumber,
              code: result.code,
              message: result.message,
              targetType: result.targetType,
              targetId: result.targetId,
            })
          }
        } else {
          const result = await this.applyCampaignPlan(plan, actorId, reason, note)
          results.push({
            rowNumber: plan.rowNumber,
            status: result.status,
            message: result.message,
            targetType: result.targetType,
            targetId: result.targetId,
          })

          if (result.status === 'success') {
            succeededRows += 1
          } else if (result.status === 'skipped') {
            skippedExecutionRows += 1
          } else {
            failedExecutionRows += 1
            errors.push({
              rowNumber: plan.rowNumber,
              code: result.code,
              message: result.message,
              targetType: result.targetType,
              targetId: result.targetId,
            })
          }
        }
      } catch (error: unknown) {
        failedExecutionRows += 1
        errors.push({
          rowNumber: plan.rowNumber,
          code: 'row_execution_error',
          message: error instanceof Error ? error.message : String(error),
          targetType: plan.targetType ?? null,
          targetId: plan.targetId ?? null,
        })
        results.push({
          rowNumber: plan.rowNumber,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Erro ao processar linha.',
          targetType: plan.targetType ?? null,
          targetId: plan.targetId ?? null,
        })
      }
    }

    const processedRows = planning.validRows
    const failedRows = planning.failedRows + failedExecutionRows
    const skippedRows = planning.skippedRows + skippedExecutionRows

    const finalStatus: AdminBulkImportStatus =
      failedRows > 0 ? 'completed_with_errors' : 'completed'

    job.status = finalStatus
    job.summary = {
      totalRows: planning.source.totalRows,
      validRows: planning.validRows,
      processedRows,
      succeededRows,
      failedRows,
      skippedRows,
      warningsCount: planning.warnings.length,
      errorsCount: errors.length,
    }
    job.errorRows = errors.slice(0, MAX_STORED_ERRORS)
    job.results = results.slice(0, MAX_STORED_RESULTS)
    job.finishedAt = new Date()

    await job.save()

    const saved = await AdminBulkImportJob.findById(job._id)
      .populate('actor', 'name username email role')
      .lean()

    if (!saved) {
      throw new AdminBulkImportServiceError(500, 'Falha ao obter job de bulk import apos execucao.')
    }

    return this.mapJob(saved, true)
  }

  private async planImport(input: {
    importType: AdminBulkImportType
    csv: string
    delimiter?: string
  }): Promise<ImportPlanningOutput> {
    if (typeof input.csv !== 'string') {
      throw new AdminBulkImportServiceError(400, 'CSV obrigatorio.')
    }

    if (input.csv.length === 0) {
      throw new AdminBulkImportServiceError(400, 'CSV obrigatorio.')
    }

    const byteSize = Buffer.byteLength(input.csv, 'utf8')
    if (byteSize > MAX_IMPORT_BYTES) {
      throw new AdminBulkImportServiceError(
        400,
        `CSV excede limite de ${MAX_IMPORT_BYTES} bytes.`
      )
    }

    const delimiter = normalizeDelimiter(input.delimiter)
    const parsed = parseCsv(input.csv, delimiter)

    if (input.importType === 'subscription_entitlements') {
      return this.planSubscriptionImport(parsed)
    }

    return this.planCampaignImport(parsed)
  }
  private async planSubscriptionImport(parsed: ParsedCsvData): Promise<ImportPlanningOutput> {
    const requiredHeaders = ['email']
    for (const header of requiredHeaders) {
      if (!parsed.headers.includes(header)) {
        throw new AdminBulkImportServiceError(400, `CSV sem cabecalho obrigatorio: ${header}`)
      }
    }

    const plans: ImportRowPlan[] = []
    const warnings = [...parsed.warnings]
    const stats: Record<string, number> = {
      subscriptionCreateCandidates: 0,
      subscriptionUpdateCandidates: 0,
      premiumUpgradeCandidates: 0,
      premiumDowngradeCandidates: 0,
    }

    const emails = Array.from(
      new Set(
        parsed.rows
          .map((row) => normalizeEmail(row.values.email))
          .filter((email): email is string => Boolean(email))
      )
    )

    const users = emails.length
      ? await User.find({ email: { $in: emails } })
          .select('_id email role subscriptionExpiry')
          .lean<
            Array<{
              _id: mongoose.Types.ObjectId
              email: string
              role: UserRole
              subscriptionExpiry?: Date | null
            }>
          >()
      : []

    const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]))

    const userIds = users.map((user) => user._id)
    const subscriptions = userIds.length
      ? await UserSubscription.find({ user: { $in: userIds } })
          .select('_id user status entitlementActive')
          .lean<
            Array<{
              _id: mongoose.Types.ObjectId
              user: mongoose.Types.ObjectId
              status: SubscriptionStatus
              entitlementActive: boolean
            }>
          >()
      : []

    const subscriptionsByUserId = new Map(subscriptions.map((row) => [String(row.user), row]))

    for (const row of parsed.rows) {
      const email = normalizeEmail(row.values.email)
      if (!email) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_email',
          message: 'Email invalido ou em falta.',
          targetType: 'user',
        })
        continue
      }

      const user = usersByEmail.get(email)
      if (!user) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'user_not_found',
          message: `Utilizador nao encontrado para email ${email}.`,
          targetType: 'user',
        })
        continue
      }

      if (!ELIGIBLE_USER_ROLES.has(user.role)) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'skipped',
          code: 'unsupported_user_role',
          message: `Role ${user.role} nao elegivel para importacao de subscricao.`,
          targetType: 'user',
          targetId: String(user._id),
        })
        continue
      }

      const existingSubscription = subscriptionsByUserId.get(String(user._id))

      const statusRaw = normalizeText(row.values.status)
      if (statusRaw && !SUBSCRIPTION_STATUS.has(statusRaw as SubscriptionStatus)) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_status',
          message: `Status invalido: ${statusRaw}`,
          targetType: 'subscription',
          targetId: String(existingSubscription?._id ?? user._id),
        })
        continue
      }

      const billingCycleRaw = normalizeText(row.values.billingcycle ?? row.values.billing_cycle)
      if (billingCycleRaw && !SUBSCRIPTION_BILLING_CYCLES.has(billingCycleRaw as SubscriptionBillingCycle)) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_billing_cycle',
          message: `Billing cycle invalido: ${billingCycleRaw}`,
          targetType: 'subscription',
          targetId: String(existingSubscription?._id ?? user._id),
        })
        continue
      }

      const entitlementParsed = normalizeBool(
        normalizeText(row.values.entitlementactive ?? row.values.entitlement_active)
      )
      if (entitlementParsed.error) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_entitlement',
          message: entitlementParsed.error,
          targetType: 'subscription',
          targetId: String(existingSubscription?._id ?? user._id),
        })
        continue
      }

      const cancelAtPeriodEndParsed = normalizeBool(
        normalizeText(row.values.cancelatperiodend ?? row.values.cancel_at_period_end)
      )
      if (cancelAtPeriodEndParsed.error) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_cancel_at_period_end',
          message: cancelAtPeriodEndParsed.error,
          targetType: 'subscription',
          targetId: String(existingSubscription?._id ?? user._id),
        })
        continue
      }

      const currentPeriodEndParsed = normalizeDate(
        normalizeText(row.values.periodend ?? row.values.currentperiodend ?? row.values.current_period_end)
      )
      if (currentPeriodEndParsed.error) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_period_end',
          message: currentPeriodEndParsed.error,
          targetType: 'subscription',
          targetId: String(existingSubscription?._id ?? user._id),
        })
        continue
      }

      const trialEndsAtParsed = normalizeDate(
        normalizeText(row.values.trialendsat ?? row.values.trial_ends_at)
      )
      if (trialEndsAtParsed.error) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_trial_end',
          message: trialEndsAtParsed.error,
          targetType: 'subscription',
          targetId: String(existingSubscription?._id ?? user._id),
        })
        continue
      }

      const finalStatus: SubscriptionStatus = statusRaw
        ? (statusRaw as SubscriptionStatus)
        : existingSubscription?.status ?? (user.role === 'premium' ? 'active' : 'canceled')
      const finalEntitlement = entitlementParsed.provided
        ? Boolean(entitlementParsed.value)
        : finalStatus === 'active' || finalStatus === 'trialing'

      if (finalStatus === 'trialing' && trialEndsAtParsed.provided && trialEndsAtParsed.value === null) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'trial_requires_date',
          message: 'status=trialing requer trialEndsAt com data valida.',
          targetType: 'subscription',
          targetId: String(existingSubscription?._id ?? user._id),
        })
        continue
      }

      if (existingSubscription) {
        stats.subscriptionUpdateCandidates += 1
      } else {
        stats.subscriptionCreateCandidates += 1
      }

      if (user.role === 'free' && finalEntitlement) {
        stats.premiumUpgradeCandidates += 1
      }
      if (user.role === 'premium' && !finalEntitlement) {
        stats.premiumDowngradeCandidates += 1
      }

      const planCodeRaw = normalizeText(row.values.plancode ?? row.values.plan_code)
      const planCode = planCodeRaw ? normalizePlanCode(planCodeRaw) : null
      const planLabel = normalizeText(row.values.planlabel ?? row.values.plan_label)

      plans.push({
        rowNumber: row.rowNumber,
        status: 'valid',
        code: existingSubscription ? 'subscription_update' : 'subscription_create',
        message: existingSubscription
          ? `Subscricao sera atualizada para ${email}.`
          : `Subscricao sera criada para ${email}.`,
        targetType: 'subscription',
        targetId: String(existingSubscription?._id ?? user._id),
        payload: {
          userId: String(user._id),
          email,
          status: finalStatus,
          entitlementActive: finalEntitlement,
          billingCycle: (billingCycleRaw as SubscriptionBillingCycle | null) ?? undefined,
          planCode: planCode ?? undefined,
          planLabel: planLabel ?? undefined,
          cancelAtPeriodEnd: cancelAtPeriodEndParsed.provided
            ? Boolean(cancelAtPeriodEndParsed.value)
            : undefined,
          currentPeriodEnd: currentPeriodEndParsed.provided
            ? currentPeriodEndParsed.value ?? null
            : undefined,
          trialEndsAt: trialEndsAtParsed.provided ? trialEndsAtParsed.value ?? null : undefined,
        },
      })
    }

    const validRows = plans.filter((row) => row.status === 'valid').length
    const failedRows = plans.filter((row) => row.status === 'invalid').length
    const skippedRows = plans.filter((row) => row.status === 'skipped').length

    return {
      source: {
        delimiter: parsed.delimiter,
        headers: parsed.headers,
        totalRows: parsed.rows.length,
      },
      plans,
      warnings,
      stats,
      validRows,
      failedRows,
      skippedRows,
    }
  }

  private async planCampaignImport(parsed: ParsedCsvData): Promise<ImportPlanningOutput> {
    const requiredHeaders = ['code']
    for (const header of requiredHeaders) {
      if (!parsed.headers.includes(header)) {
        throw new AdminBulkImportServiceError(400, `CSV sem cabecalho obrigatorio: ${header}`)
      }
    }

    const plans: ImportRowPlan[] = []
    const warnings = [...parsed.warnings]
    const stats: Record<string, number> = {
      campaignUpdateCandidates: 0,
      campaignStatusChanges: 0,
      campaignPriorityChanges: 0,
    }

    const codes = Array.from(
      new Set(
        parsed.rows
          .map((row) => normalizeText(row.values.code))
          .filter((code): code is string => Boolean(code))
          .map((code) => code.toUpperCase())
      )
    )

    const campaigns = codes.length
      ? await AdCampaign.find({ code: { $in: codes } })
          .select(
            '_id code status priority startAt endAt adType visibleTo slotIds disclosureLabel relevanceTags'
          )
          .lean<
            Array<{
              _id: mongoose.Types.ObjectId
              code: string
              status: AdCampaignStatus
              priority: number
              startAt?: Date | null
              endAt?: Date | null
              adType: AdPartnershipType
              visibleTo: AdPartnershipVisibility[]
              slotIds: string[]
              disclosureLabel?: string | null
              relevanceTags: string[]
            }>
          >()
      : []
    const referencedSlotIds = Array.from(
      new Set(
        campaigns
          .flatMap((campaign) => campaign.slotIds ?? [])
          .map((slotId) => slotId.trim().toUpperCase())
          .filter((slotId) => slotId.length > 0)
      )
    )
    const slots = referencedSlotIds.length
      ? await AdSlotConfig.find({ slotId: { $in: referencedSlotIds } })
          .select('slotId allowedTypes visibleTo isActive')
          .lean<Array<SlotCompatibilityInput>>()
      : []
    const slotById = new Map(slots.map((slot) => [slot.slotId, slot]))
    const campaignByCode = new Map(campaigns.map((campaign) => [campaign.code.toUpperCase(), campaign]))

    for (const row of parsed.rows) {
      const code = normalizeText(row.values.code)
      if (!code) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'missing_code',
          message: 'code em falta.',
          targetType: 'campaign',
        })
        continue
      }

      const campaign = campaignByCode.get(code.toUpperCase())
      if (!campaign) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'campaign_not_found',
          message: `Campanha nao encontrada para code ${code}.`,
          targetType: 'campaign',
          targetId: code.toUpperCase(),
        })
        continue
      }

      const statusRaw = normalizeText(row.values.status)
      if (statusRaw && !AD_CAMPAIGN_STATUS.has(statusRaw as AdCampaignStatus)) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_campaign_status',
          message: `Status invalido: ${statusRaw}`,
          targetType: 'campaign',
          targetId: String(campaign._id),
        })
        continue
      }

      const priorityParsed = normalizeInteger(normalizeText(row.values.priority), {
        min: 1,
        max: 10000,
      })
      if (priorityParsed.error) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_priority',
          message: priorityParsed.error,
          targetType: 'campaign',
          targetId: String(campaign._id),
        })
        continue
      }

      const startAtParsed = normalizeDate(normalizeText(row.values.startat ?? row.values.start_at))
      if (startAtParsed.error) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_start_at',
          message: startAtParsed.error,
          targetType: 'campaign',
          targetId: String(campaign._id),
        })
        continue
      }

      const endAtParsed = normalizeDate(normalizeText(row.values.endat ?? row.values.end_at))
      if (endAtParsed.error) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_end_at',
          message: endAtParsed.error,
          targetType: 'campaign',
          targetId: String(campaign._id),
        })
        continue
      }

      const nextStart = startAtParsed.provided
        ? startAtParsed.value ?? null
        : campaign.startAt ?? null
      const nextEnd = endAtParsed.provided
        ? endAtParsed.value ?? null
        : campaign.endAt ?? null

      if (nextStart && nextEnd && nextEnd.getTime() <= nextStart.getTime()) {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'invalid',
          code: 'invalid_schedule',
          message: 'endAt deve ser superior a startAt.',
          targetType: 'campaign',
          targetId: String(campaign._id),
        })
        continue
      }

      const nextStatus = statusRaw ? (statusRaw as AdCampaignStatus) : campaign.status
      if (campaign.status === 'archived' && nextStatus !== 'archived') {
        plans.push({
          rowNumber: row.rowNumber,
          status: 'skipped',
          code: 'archived_locked',
          message: 'Campanha arquivada nao pode regressar a estado ativo.',
          targetType: 'campaign',
          targetId: String(campaign._id),
        })
        continue
      }

      if (nextStatus === 'active') {
        const nowMs = Date.now()
        if (nextStart && nextStart.getTime() > nowMs) {
          plans.push({
            rowNumber: row.rowNumber,
            status: 'invalid',
            code: 'campaign_not_started',
            message: 'Campanha ainda nao atingiu startAt.',
            targetType: 'campaign',
            targetId: String(campaign._id),
          })
          continue
        }
        if (nextEnd && nextEnd.getTime() <= nowMs) {
          plans.push({
            rowNumber: row.rowNumber,
            status: 'invalid',
            code: 'campaign_expired',
            message: 'Campanha ja expirou (endAt).',
            targetType: 'campaign',
            targetId: String(campaign._id),
          })
          continue
        }

        const visibleTo = campaign.visibleTo as AdPartnershipVisibility[]
        const disclosureLabel = resolveDisclosureLabel(campaign.adType, campaign.disclosureLabel)
        try {
          ensureDisclosureLabel(campaign.adType, disclosureLabel)
          ensureFinancialRelevance(campaign.adType, campaign.relevanceTags ?? [])
          ensureExternalAdsNoPremium(campaign.adType, visibleTo)
        } catch (error: unknown) {
          plans.push({
            rowNumber: row.rowNumber,
            status: 'invalid',
            code: 'campaign_compliance_violation',
            message: error instanceof Error ? error.message : 'Campanha viola guardrails de compliance.',
            targetType: 'campaign',
            targetId: String(campaign._id),
          })
          continue
        }

        let slotMissing = false
        for (const slotId of campaign.slotIds ?? []) {
          const normalizedSlotId = slotId.trim().toUpperCase()
          const slot = slotById.get(normalizedSlotId)
          if (!slot) {
            plans.push({
              rowNumber: row.rowNumber,
              status: 'invalid',
              code: 'campaign_slot_not_found',
              message: `Slot ${normalizedSlotId} nao encontrado.`,
              targetType: 'campaign',
              targetId: String(campaign._id),
            })
            slotMissing = true
            break
          }
          try {
            ensureSlotCompatibility(slot, campaign.adType, visibleTo, { requireActive: true })
          } catch (error: unknown) {
            plans.push({
              rowNumber: row.rowNumber,
              status: 'invalid',
              code: 'campaign_slot_incompatible',
              message:
                error instanceof Error
                  ? error.message
                  : `Slot ${normalizedSlotId} incompativel com a campanha.`,
              targetType: 'campaign',
              targetId: String(campaign._id),
            })
            slotMissing = true
            break
          }
        }
        if (slotMissing) continue
      }

      if (statusRaw && nextStatus !== campaign.status) {
        stats.campaignStatusChanges += 1
      }
      if (priorityParsed.provided && priorityParsed.value !== campaign.priority) {
        stats.campaignPriorityChanges += 1
      }
      stats.campaignUpdateCandidates += 1

      plans.push({
        rowNumber: row.rowNumber,
        status: 'valid',
        code: 'campaign_update',
        message: `Campanha ${campaign.code} sera atualizada.`,
        targetType: 'campaign',
        targetId: String(campaign._id),
        payload: {
          campaignId: String(campaign._id),
          code: campaign.code,
          status: statusRaw ? (statusRaw as AdCampaignStatus) : undefined,
          priority: priorityParsed.provided ? priorityParsed.value : undefined,
          startAt: startAtParsed.provided ? startAtParsed.value ?? null : undefined,
          endAt: endAtParsed.provided ? endAtParsed.value ?? null : undefined,
        },
      })
    }

    const validRows = plans.filter((row) => row.status === 'valid').length
    const failedRows = plans.filter((row) => row.status === 'invalid').length
    const skippedRows = plans.filter((row) => row.status === 'skipped').length

    return {
      source: {
        delimiter: parsed.delimiter,
        headers: parsed.headers,
        totalRows: parsed.rows.length,
      },
      plans,
      warnings,
      stats,
      validRows,
      failedRows,
      skippedRows,
    }
  }
  private async applySubscriptionPlan(
    plan: ImportRowPlan,
    actorId: mongoose.Types.ObjectId,
    reason: string,
    note: string | null
  ): Promise<{ status: 'success' | 'failed' | 'skipped'; code: string; message: string; targetType: string; targetId: string }> {
    const payload = (plan.payload ?? {}) as {
      userId: string
      email: string
      status: SubscriptionStatus
      entitlementActive: boolean
      billingCycle?: SubscriptionBillingCycle
      planCode?: string
      planLabel?: string
      cancelAtPeriodEnd?: boolean
      currentPeriodEnd?: Date | null
      trialEndsAt?: Date | null
    }

    if (!payload.userId || !mongoose.Types.ObjectId.isValid(payload.userId)) {
      return {
        status: 'failed',
        code: 'invalid_user_id',
        message: 'userId invalido na linha.',
        targetType: 'subscription',
        targetId: payload.userId ?? '',
      }
    }

    const userId = new mongoose.Types.ObjectId(payload.userId)
    const user = await User.findById(userId).select('role subscriptionExpiry')
    if (!user) {
      return {
        status: 'failed',
        code: 'user_not_found',
        message: 'Utilizador nao encontrado durante execucao.',
        targetType: 'subscription',
        targetId: payload.userId,
      }
    }

    if (!ELIGIBLE_USER_ROLES.has(user.role)) {
      return {
        status: 'skipped',
        code: 'unsupported_user_role',
        message: `Role ${user.role} nao elegivel para importacao de subscricao.`,
        targetType: 'subscription',
        targetId: payload.userId,
      }
    }

    const now = new Date()
    let subscription = await UserSubscription.findOne({ user: userId })

    const planCode = payload.planCode ? normalizePlanCode(payload.planCode) : null
    const planLabel = payload.planLabel?.trim() ? payload.planLabel.trim().slice(0, 120) : null

    if (!subscription) {
      subscription = await UserSubscription.create({
        user: userId,
        planCode: planCode || 'premium_monthly',
        planLabel: planLabel || 'Premium Monthly',
        billingCycle: payload.billingCycle ?? 'monthly',
        status: payload.status,
        entitlementActive: payload.entitlementActive,
        currentPeriodStart: now,
        currentPeriodEnd: payload.currentPeriodEnd ?? null,
        trialEndsAt: payload.status === 'trialing' ? payload.trialEndsAt ?? now : null,
        canceledAt: payload.status === 'canceled' ? now : null,
        cancelAtPeriodEnd: payload.cancelAtPeriodEnd === true,
        source: 'import',
        version: 1,
        createdBy: actorId,
        updatedBy: actorId,
        history: [
          {
            version: 1,
            action: 'created',
            reason,
            note,
            changedAt: now,
            changedBy: actorId,
            snapshot: buildSubscriptionSnapshot({
              planCode: planCode || 'premium_monthly',
              planLabel: planLabel || 'Premium Monthly',
              billingCycle: payload.billingCycle ?? 'monthly',
              status: payload.status,
              entitlementActive: payload.entitlementActive,
              currentPeriodStart: now,
              currentPeriodEnd: payload.currentPeriodEnd ?? null,
              trialEndsAt: payload.status === 'trialing' ? payload.trialEndsAt ?? now : null,
              canceledAt: payload.status === 'canceled' ? now : null,
              cancelAtPeriodEnd: payload.cancelAtPeriodEnd === true,
            }),
          },
        ],
      })
    } else {
      subscription.status = payload.status
      subscription.entitlementActive = payload.entitlementActive
      subscription.billingCycle = payload.billingCycle ?? subscription.billingCycle
      subscription.planCode = planCode || subscription.planCode || 'premium_monthly'
      subscription.planLabel = planLabel || subscription.planLabel || 'Premium Monthly'
      if (payload.currentPeriodEnd !== undefined) {
        subscription.currentPeriodEnd = payload.currentPeriodEnd
      }
      if (payload.trialEndsAt !== undefined) {
        subscription.trialEndsAt = payload.trialEndsAt
      } else if (payload.status !== 'trialing') {
        subscription.trialEndsAt = null
      }
      subscription.canceledAt = payload.status === 'canceled' ? now : null
      if (payload.cancelAtPeriodEnd !== undefined) {
        subscription.cancelAtPeriodEnd = payload.cancelAtPeriodEnd
      }
      subscription.source = 'import'
      subscription.updatedBy = actorId
      subscription.version += 1
      subscription.history.push({
        version: subscription.version,
        action: 'updated',
        reason,
        note,
        changedAt: now,
        changedBy: actorId,
        snapshot: buildSubscriptionSnapshot({
          planCode: subscription.planCode,
          planLabel: subscription.planLabel,
          billingCycle: subscription.billingCycle,
          status: subscription.status,
          entitlementActive: subscription.entitlementActive,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          trialEndsAt: subscription.trialEndsAt,
          canceledAt: subscription.canceledAt,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }),
      })
    }

    if (subscription.entitlementActive) {
      user.role = 'premium'
      user.subscriptionExpiry =
        subscription.trialEndsAt ?? subscription.currentPeriodEnd ?? user.subscriptionExpiry
    } else {
      user.role = 'free'
      user.subscriptionExpiry = subscription.currentPeriodEnd ?? now
    }

    await Promise.all([subscription.save(), user.save()])

    return {
      status: 'success',
      code: 'subscription_saved',
      message: `Subscricao processada para ${payload.email}.`,
      targetType: 'subscription',
      targetId: String(subscription._id),
    }
  }

  private async applyCampaignPlan(
    plan: ImportRowPlan,
    actorId: mongoose.Types.ObjectId,
    reason: string,
    note: string | null
  ): Promise<{ status: 'success' | 'failed' | 'skipped'; code: string; message: string; targetType: string; targetId: string }> {
    const payload = (plan.payload ?? {}) as {
      campaignId: string
      code: string
      status?: AdCampaignStatus
      priority?: number
      startAt?: Date | null
      endAt?: Date | null
    }

    if (!payload.campaignId || !mongoose.Types.ObjectId.isValid(payload.campaignId)) {
      return {
        status: 'failed',
        code: 'invalid_campaign_id',
        message: 'campaignId invalido na linha.',
        targetType: 'campaign',
        targetId: payload.campaignId ?? '',
      }
    }

    const campaign = await AdCampaign.findById(payload.campaignId)
    if (!campaign) {
      return {
        status: 'failed',
        code: 'campaign_not_found',
        message: 'Campanha nao encontrada durante execucao.',
        targetType: 'campaign',
        targetId: payload.campaignId,
      }
    }

    if (campaign.status === 'archived' && payload.status && payload.status !== 'archived') {
      return {
        status: 'skipped',
        code: 'archived_locked',
        message: 'Campanha arquivada nao pode regressar a estado ativo.',
        targetType: 'campaign',
        targetId: String(campaign._id),
      }
    }

    if (payload.status) campaign.status = payload.status
    if (typeof payload.priority === 'number' && Number.isFinite(payload.priority)) {
      campaign.priority = payload.priority
    }
    if (payload.startAt !== undefined) {
      campaign.startAt = payload.startAt
    }
    if (payload.endAt !== undefined) {
      campaign.endAt = payload.endAt
    }

    if (campaign.startAt && campaign.endAt && campaign.endAt.getTime() <= campaign.startAt.getTime()) {
      return {
        status: 'failed',
        code: 'invalid_schedule',
        message: 'endAt deve ser superior a startAt.',
        targetType: 'campaign',
        targetId: String(campaign._id),
      }
    }

    if (campaign.status === 'active') {
      const nowMs = Date.now()
      if (campaign.startAt && campaign.startAt.getTime() > nowMs) {
        return {
          status: 'failed',
          code: 'campaign_not_started',
          message: 'Campanha ainda nao atingiu startAt.',
          targetType: 'campaign',
          targetId: String(campaign._id),
        }
      }
      if (campaign.endAt && campaign.endAt.getTime() <= nowMs) {
        return {
          status: 'failed',
          code: 'campaign_expired',
          message: 'Campanha ja expirou (endAt).',
          targetType: 'campaign',
          targetId: String(campaign._id),
        }
      }

      const campaignAdType = campaign.adType as AdPartnershipType
      const campaignVisibility = campaign.visibleTo as unknown as AdPartnershipVisibility[]
      campaign.disclosureLabel = resolveDisclosureLabel(campaignAdType, campaign.disclosureLabel)
      try {
        ensureDisclosureLabel(campaignAdType, campaign.disclosureLabel)
        ensureFinancialRelevance(campaignAdType, campaign.relevanceTags ?? [])
        ensureExternalAdsNoPremium(campaignAdType, campaignVisibility)
      } catch (error: unknown) {
        return {
          status: 'failed',
          code: 'campaign_compliance_violation',
          message: error instanceof Error ? error.message : 'Campanha viola guardrails de compliance.',
          targetType: 'campaign',
          targetId: String(campaign._id),
        }
      }

      const slots =
        campaign.slotIds.length > 0
          ? await AdSlotConfig.find({ slotId: { $in: campaign.slotIds } })
              .select('slotId allowedTypes visibleTo isActive')
              .lean<Array<SlotCompatibilityInput>>()
          : []
      const slotMap = new Map(slots.map((slot) => [slot.slotId, slot]))
      for (const slotId of campaign.slotIds) {
        const normalizedSlotId = slotId.trim().toUpperCase()
        const slot = slotMap.get(normalizedSlotId)
        if (!slot) {
          return {
            status: 'failed',
            code: 'campaign_slot_not_found',
            message: `Slot ${normalizedSlotId} nao encontrado.`,
            targetType: 'campaign',
            targetId: String(campaign._id),
          }
        }
        try {
          ensureSlotCompatibility(slot, campaignAdType, campaignVisibility, { requireActive: true })
        } catch (error: unknown) {
          return {
            status: 'failed',
            code: 'campaign_slot_incompatible',
            message:
              error instanceof Error
                ? error.message
                : `Slot ${normalizedSlotId} incompativel com a campanha.`,
            targetType: 'campaign',
            targetId: String(campaign._id),
          }
        }
      }

      campaign.approvedAt = new Date()
      campaign.approvedBy = actorId
    }

    campaign.updatedBy = actorId
    campaign.version += 1
    campaign.history.push({
      changedBy: actorId,
      reason,
      note,
      changedAt: new Date(),
      snapshot: {
        status: campaign.status,
        startAt: campaign.startAt ?? null,
        endAt: campaign.endAt ?? null,
        priority: campaign.priority,
        visibleTo: [...campaign.visibleTo],
        slotIds: [...campaign.slotIds],
      },
    })

    await campaign.save()

    return {
      status: 'success',
      code: 'campaign_saved',
      message: `Campanha ${payload.code} atualizada com sucesso.`,
      targetType: 'campaign',
      targetId: String(campaign._id),
    }
  }

  private mapJob(row: any, includeDetails = false) {
    return {
      id: String(row._id),
      importType: row.importType,
      status: row.status,
      dryRun: row.dryRun === true,
      reason: row.reason,
      note: typeof row.note === 'string' ? row.note : null,
      source: {
        format: row.source?.format ?? 'csv',
        delimiter: row.source?.delimiter ?? ',',
        headers: Array.isArray(row.source?.headers) ? row.source.headers : [],
      },
      summary: {
        totalRows: Number(row.summary?.totalRows ?? 0),
        validRows: Number(row.summary?.validRows ?? 0),
        processedRows: Number(row.summary?.processedRows ?? 0),
        succeededRows: Number(row.summary?.succeededRows ?? 0),
        failedRows: Number(row.summary?.failedRows ?? 0),
        skippedRows: Number(row.summary?.skippedRows ?? 0),
        warningsCount: Number(row.summary?.warningsCount ?? 0),
        errorsCount: Number(row.summary?.errorsCount ?? 0),
      },
      stats: row.stats && typeof row.stats === 'object' ? row.stats : {},
      actor:
        row.actor && typeof row.actor === 'object'
          ? {
              id: String(row.actor._id ?? row.actor.id),
              name: row.actor.name,
              username: row.actor.username,
              email: row.actor.email,
              role: row.actor.role,
            }
          : null,
      startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
      finishedAt: row.finishedAt ? new Date(row.finishedAt).toISOString() : null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      warnings: includeDetails && Array.isArray(row.warnings) ? row.warnings : undefined,
      errors:
        includeDetails && Array.isArray(row.errorRows)
          ? row.errorRows.map((error: any) => ({
              rowNumber: Number(error.rowNumber ?? 0),
              code: typeof error.code === 'string' ? error.code : 'error',
              message: typeof error.message === 'string' ? error.message : 'Erro',
              targetType: typeof error.targetType === 'string' ? error.targetType : null,
              targetId: typeof error.targetId === 'string' ? error.targetId : null,
            }))
          : undefined,
      results:
        includeDetails && Array.isArray(row.results)
          ? row.results.map((result: any) => ({
              rowNumber: Number(result.rowNumber ?? 0),
              status: result.status,
              message: typeof result.message === 'string' ? result.message : '',
              targetType: typeof result.targetType === 'string' ? result.targetType : null,
              targetId: typeof result.targetId === 'string' ? result.targetId : null,
            }))
          : undefined,
    }
  }
}

export const adminBulkImportService = new AdminBulkImportService()
