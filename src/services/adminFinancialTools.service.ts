import mongoose from 'mongoose'
import {
  FinancialToolControl,
  FinancialToolConfigOverride,
  FinancialToolConfigSnapshot,
  FINANCIAL_TOOL_ENVIRONMENTS,
  FINANCIAL_TOOL_EXPERIENCE_MODES,
  FINANCIAL_TOOL_KEYS,
  FinancialToolEnvironment,
  FinancialToolExperienceMode,
  FinancialToolKey,
  FinancialToolVertical,
} from '../models/FinancialToolControl'
import { FinancialToolUsageDaily } from '../models/FinancialToolUsageDaily'

const TOOL_METADATA: Record<
  FinancialToolKey,
  {
    label: string
    vertical: FinancialToolVertical
  }
> = {
  stocks: {
    label: 'Stocks',
    vertical: 'equities',
  },
  etf: {
    label: 'ETF',
    vertical: 'funds',
  },
  reit: {
    label: 'REIT',
    vertical: 'real_estate',
  },
  crypto: {
    label: 'Crypto',
    vertical: 'digital_assets',
  },
}

const MAX_REASON_LENGTH = 500
const MAX_NOTE_LENGTH = 2000
const MAX_LABEL_LENGTH = 120
const MAX_DAYS = 90
const DEFAULT_DAYS = 7

const toDayKey = (value: Date): string => value.toISOString().slice(0, 10)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const round = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const parseBooleanEnv = (envName: string, fallback: boolean): boolean => {
  const rawValue = process.env[envName]
  if (typeof rawValue !== 'string') return fallback

  const normalized = rawValue.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const parseIntEnv = (envName: string, fallback: number, min: number, max: number): number => {
  const rawValue = process.env[envName]
  if (typeof rawValue !== 'string') return fallback

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

const DEFAULT_MAX_SYMBOLS_PER_REQUEST = parseIntEnv(
  'ADMIN_FINANCIAL_TOOLS_DEFAULT_MAX_SYMBOLS',
  25,
  1,
  500
)
const DEFAULT_CACHE_TTL_SECONDS = parseIntEnv(
  'ADMIN_FINANCIAL_TOOLS_DEFAULT_CACHE_TTL_SECONDS',
  300,
  0,
  86400
)
const DEFAULT_REQUESTS_PER_MINUTE = parseIntEnv(
  'ADMIN_FINANCIAL_TOOLS_DEFAULT_REQUESTS_PER_MINUTE',
  120,
  1,
  5000
)
const DEFAULT_EXPERIENCE_MODE: FinancialToolExperienceMode = FINANCIAL_TOOL_EXPERIENCE_MODES.includes(
  (process.env.ADMIN_FINANCIAL_TOOLS_DEFAULT_EXPERIENCE_MODE ?? 'standard') as FinancialToolExperienceMode
)
  ? ((process.env.ADMIN_FINANCIAL_TOOLS_DEFAULT_EXPERIENCE_MODE ?? 'standard') as FinancialToolExperienceMode)
  : 'standard'
const RUNTIME_CACHE_MS = parseIntEnv(
  'ADMIN_FINANCIAL_TOOLS_RUNTIME_CACHE_MS',
  30000,
  1000,
  300000
)

const DEFAULT_ENABLED_BY_TOOL: Record<FinancialToolKey, boolean> = {
  stocks: parseBooleanEnv('ADMIN_FINANCIAL_TOOL_STOCKS_ENABLED', true),
  etf: parseBooleanEnv('ADMIN_FINANCIAL_TOOL_ETF_ENABLED', true),
  reit: parseBooleanEnv('ADMIN_FINANCIAL_TOOL_REIT_ENABLED', true),
  crypto: parseBooleanEnv('ADMIN_FINANCIAL_TOOL_CRYPTO_ENABLED', true),
}

const resolveEnvironment = (value?: unknown): FinancialToolEnvironment => {
  if (typeof value === 'string' && isFinancialToolEnvironment(value)) {
    return value
  }

  const rawNodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase()
  if (rawNodeEnv === 'production') return 'production'
  if (rawNodeEnv === 'staging' || rawNodeEnv === 'preproduction') return 'staging'
  return 'development'
}

const normalizeOverride = (value: unknown): FinancialToolConfigOverride => {
  if (!isRecord(value)) return {}

  const override: FinancialToolConfigOverride = {}
  if (typeof value.enabled === 'boolean') override.enabled = value.enabled

  if (typeof value.maxSymbolsPerRequest === 'number' && Number.isFinite(value.maxSymbolsPerRequest)) {
    override.maxSymbolsPerRequest = Math.max(1, Math.min(500, Math.floor(value.maxSymbolsPerRequest)))
  }
  if (typeof value.cacheTtlSeconds === 'number' && Number.isFinite(value.cacheTtlSeconds)) {
    override.cacheTtlSeconds = Math.max(0, Math.min(86400, Math.floor(value.cacheTtlSeconds)))
  }
  if (typeof value.requestsPerMinute === 'number' && Number.isFinite(value.requestsPerMinute)) {
    override.requestsPerMinute = Math.max(1, Math.min(5000, Math.floor(value.requestsPerMinute)))
  }
  if (
    typeof value.experienceMode === 'string' &&
    isFinancialToolExperienceMode(value.experienceMode)
  ) {
    override.experienceMode = value.experienceMode
  }

  return override
}

const cloneOverrides = (
  source: unknown
): Record<FinancialToolEnvironment, FinancialToolConfigOverride> => {
  const input = isRecord(source) ? source : {}

  return {
    development: normalizeOverride(input.development),
    staging: normalizeOverride(input.staging),
    production: normalizeOverride(input.production),
  }
}

const mergeConfig = (
  baseConfig: FinancialToolConfigSnapshot,
  override: FinancialToolConfigOverride
): FinancialToolConfigSnapshot => ({
  enabled: override.enabled ?? baseConfig.enabled,
  maxSymbolsPerRequest: override.maxSymbolsPerRequest ?? baseConfig.maxSymbolsPerRequest,
  cacheTtlSeconds: override.cacheTtlSeconds ?? baseConfig.cacheTtlSeconds,
  requestsPerMinute: override.requestsPerMinute ?? baseConfig.requestsPerMinute,
  experienceMode: override.experienceMode ?? baseConfig.experienceMode,
})

export const isFinancialToolKey = (value: unknown): value is FinancialToolKey =>
  typeof value === 'string' && FINANCIAL_TOOL_KEYS.includes(value as FinancialToolKey)

export const isFinancialToolEnvironment = (
  value: unknown
): value is FinancialToolEnvironment =>
  typeof value === 'string' && FINANCIAL_TOOL_ENVIRONMENTS.includes(value as FinancialToolEnvironment)

export const isFinancialToolExperienceMode = (
  value: unknown
): value is FinancialToolExperienceMode =>
  typeof value === 'string' && FINANCIAL_TOOL_EXPERIENCE_MODES.includes(value as FinancialToolExperienceMode)

export interface FinancialToolControlListItem {
  id: string
  tool: FinancialToolKey
  vertical: FinancialToolVertical
  label: string
  notes: string | null
  baseConfig: FinancialToolConfigSnapshot
  envOverrides: Record<FinancialToolEnvironment, FinancialToolConfigOverride>
  effectiveConfig: FinancialToolConfigSnapshot
  version: number
  createdAt: string
  updatedAt: string
}

interface ListToolControlsOptions {
  environment?: unknown
  tool?: unknown
}

interface UpdateToolControlInput {
  actorId: string
  tool: FinancialToolKey
  reason: string
  note?: string
  patch: Record<string, unknown>
}

interface UsageOverviewOptions {
  environment?: unknown
  tool?: unknown
  days?: unknown
}

export interface FinancialToolRuntimeControl {
  tool: FinancialToolKey
  vertical: FinancialToolVertical
  label: string
  environment: FinancialToolEnvironment
  enabled: boolean
  maxSymbolsPerRequest: number
  cacheTtlSeconds: number
  requestsPerMinute: number
  experienceMode: FinancialToolExperienceMode
  version: number
  updatedAt: string
}

interface RecordUsageInput {
  tool: FinancialToolKey
  statusCode: number
  durationMs: number
  authenticated: boolean
}

export class AdminFinancialToolsServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class AdminFinancialToolsService {
  private runtimeCache = new Map<
    FinancialToolKey,
    { expiresAt: number; value: FinancialToolRuntimeControl }
  >()

  private defaultBaseConfig(tool: FinancialToolKey): FinancialToolConfigSnapshot {
    return {
      enabled: DEFAULT_ENABLED_BY_TOOL[tool],
      maxSymbolsPerRequest: DEFAULT_MAX_SYMBOLS_PER_REQUEST,
      cacheTtlSeconds: DEFAULT_CACHE_TTL_SECONDS,
      requestsPerMinute: DEFAULT_REQUESTS_PER_MINUTE,
      experienceMode: DEFAULT_EXPERIENCE_MODE,
    }
  }

  private emptyOverrides(): Record<FinancialToolEnvironment, FinancialToolConfigOverride> {
    return {
      development: {},
      staging: {},
      production: {},
    }
  }

  private snapshotFromControl(control: {
    label: string
    notes?: string | null
    baseConfig: FinancialToolConfigSnapshot
    envOverrides: Record<FinancialToolEnvironment, FinancialToolConfigOverride>
  }) {
    return {
      label: control.label,
      notes: control.notes ?? null,
      baseConfig: {
        enabled: control.baseConfig.enabled,
        maxSymbolsPerRequest: control.baseConfig.maxSymbolsPerRequest,
        cacheTtlSeconds: control.baseConfig.cacheTtlSeconds,
        requestsPerMinute: control.baseConfig.requestsPerMinute,
        experienceMode: control.baseConfig.experienceMode,
      },
      envOverrides: {
        development: { ...control.envOverrides.development },
        staging: { ...control.envOverrides.staging },
        production: { ...control.envOverrides.production },
      },
    }
  }

  private mapControlItem(control: any, environment: FinancialToolEnvironment): FinancialToolControlListItem {
    const baseConfig: FinancialToolConfigSnapshot = {
      enabled: Boolean(control.baseConfig?.enabled),
      maxSymbolsPerRequest: Number(control.baseConfig?.maxSymbolsPerRequest ?? DEFAULT_MAX_SYMBOLS_PER_REQUEST),
      cacheTtlSeconds: Number(control.baseConfig?.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS),
      requestsPerMinute: Number(control.baseConfig?.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE),
      experienceMode: isFinancialToolExperienceMode(control.baseConfig?.experienceMode)
        ? control.baseConfig.experienceMode
        : DEFAULT_EXPERIENCE_MODE,
    }
    const envOverrides = cloneOverrides(control.envOverrides)

    return {
      id: String(control._id),
      tool: control.tool as FinancialToolKey,
      vertical: control.vertical as FinancialToolVertical,
      label: String(control.label),
      notes: typeof control.notes === 'string' ? control.notes : null,
      baseConfig,
      envOverrides,
      effectiveConfig: mergeConfig(baseConfig, envOverrides[environment]),
      version: Number(control.version ?? 1),
      createdAt: new Date(control.createdAt).toISOString(),
      updatedAt: new Date(control.updatedAt).toISOString(),
    }
  }

  private validateObjectId(rawId: string, fieldName: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(rawId)) {
      throw new AdminFinancialToolsServiceError(400, `${fieldName} invalido.`)
    }
    return new mongoose.Types.ObjectId(rawId)
  }

  private ensureReason(reason: string): string {
    const normalized = reason.trim()
    if (!normalized) {
      throw new AdminFinancialToolsServiceError(400, 'Motivo obrigatorio.')
    }
    if (normalized.length > MAX_REASON_LENGTH) {
      throw new AdminFinancialToolsServiceError(400, `Motivo excede ${MAX_REASON_LENGTH} caracteres.`)
    }
    return normalized
  }

  private normalizeOptionalNote(value?: string): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim()
    if (!normalized) return null
    if (normalized.length > MAX_NOTE_LENGTH) {
      throw new AdminFinancialToolsServiceError(400, `Nota excede ${MAX_NOTE_LENGTH} caracteres.`)
    }
    return normalized
  }

  private applyConfigPatch(
    target: FinancialToolConfigSnapshot,
    source: Record<string, unknown>
  ): boolean {
    let changed = false

    if ('enabled' in source) {
      if (typeof source.enabled !== 'boolean') {
        throw new AdminFinancialToolsServiceError(400, 'baseConfig.enabled invalido.')
      }
      if (target.enabled !== source.enabled) {
        target.enabled = source.enabled
        changed = true
      }
    }

    if ('maxSymbolsPerRequest' in source) {
      if (
        typeof source.maxSymbolsPerRequest !== 'number' ||
        !Number.isFinite(source.maxSymbolsPerRequest)
      ) {
        throw new AdminFinancialToolsServiceError(400, 'baseConfig.maxSymbolsPerRequest invalido.')
      }
      const parsed = Math.max(1, Math.min(500, Math.floor(source.maxSymbolsPerRequest)))
      if (target.maxSymbolsPerRequest !== parsed) {
        target.maxSymbolsPerRequest = parsed
        changed = true
      }
    }

    if ('cacheTtlSeconds' in source) {
      if (typeof source.cacheTtlSeconds !== 'number' || !Number.isFinite(source.cacheTtlSeconds)) {
        throw new AdminFinancialToolsServiceError(400, 'baseConfig.cacheTtlSeconds invalido.')
      }
      const parsed = Math.max(0, Math.min(86400, Math.floor(source.cacheTtlSeconds)))
      if (target.cacheTtlSeconds !== parsed) {
        target.cacheTtlSeconds = parsed
        changed = true
      }
    }

    if ('requestsPerMinute' in source) {
      if (
        typeof source.requestsPerMinute !== 'number' ||
        !Number.isFinite(source.requestsPerMinute)
      ) {
        throw new AdminFinancialToolsServiceError(400, 'baseConfig.requestsPerMinute invalido.')
      }
      const parsed = Math.max(1, Math.min(5000, Math.floor(source.requestsPerMinute)))
      if (target.requestsPerMinute !== parsed) {
        target.requestsPerMinute = parsed
        changed = true
      }
    }

    if ('experienceMode' in source) {
      if (!isFinancialToolExperienceMode(source.experienceMode)) {
        throw new AdminFinancialToolsServiceError(400, 'baseConfig.experienceMode invalido.')
      }
      if (target.experienceMode !== source.experienceMode) {
        target.experienceMode = source.experienceMode
        changed = true
      }
    }

    return changed
  }

  private applyOverridePatch(
    target: FinancialToolConfigOverride,
    source: Record<string, unknown>
  ): boolean {
    let changed = false

    const applyField = <K extends keyof FinancialToolConfigOverride>(
      key: K,
      value: FinancialToolConfigOverride[K]
    ) => {
      if (target[key] !== value) {
        target[key] = value
        changed = true
      }
    }

    if ('enabled' in source) {
      if (typeof source.enabled !== 'boolean') {
        throw new AdminFinancialToolsServiceError(400, 'envOverrides.enabled invalido.')
      }
      applyField('enabled', source.enabled)
    }

    if ('maxSymbolsPerRequest' in source) {
      if (
        typeof source.maxSymbolsPerRequest !== 'number' ||
        !Number.isFinite(source.maxSymbolsPerRequest)
      ) {
        throw new AdminFinancialToolsServiceError(400, 'envOverrides.maxSymbolsPerRequest invalido.')
      }
      applyField(
        'maxSymbolsPerRequest',
        Math.max(1, Math.min(500, Math.floor(source.maxSymbolsPerRequest)))
      )
    }

    if ('cacheTtlSeconds' in source) {
      if (typeof source.cacheTtlSeconds !== 'number' || !Number.isFinite(source.cacheTtlSeconds)) {
        throw new AdminFinancialToolsServiceError(400, 'envOverrides.cacheTtlSeconds invalido.')
      }
      applyField('cacheTtlSeconds', Math.max(0, Math.min(86400, Math.floor(source.cacheTtlSeconds))))
    }

    if ('requestsPerMinute' in source) {
      if (
        typeof source.requestsPerMinute !== 'number' ||
        !Number.isFinite(source.requestsPerMinute)
      ) {
        throw new AdminFinancialToolsServiceError(400, 'envOverrides.requestsPerMinute invalido.')
      }
      applyField('requestsPerMinute', Math.max(1, Math.min(5000, Math.floor(source.requestsPerMinute))))
    }

    if ('experienceMode' in source) {
      if (!isFinancialToolExperienceMode(source.experienceMode)) {
        throw new AdminFinancialToolsServiceError(400, 'envOverrides.experienceMode invalido.')
      }
      applyField('experienceMode', source.experienceMode)
    }

    return changed
  }

  private async ensureControl(tool: FinancialToolKey) {
    const existing = await FinancialToolControl.findOne({ tool })
    if (existing) return existing

    const metadata = TOOL_METADATA[tool]
    const baseConfig = this.defaultBaseConfig(tool)
    const envOverrides = this.emptyOverrides()

    try {
      const created = await FinancialToolControl.create({
        tool,
        vertical: metadata.vertical,
        label: metadata.label,
        notes: null,
        baseConfig,
        envOverrides,
        version: 1,
        createdBy: null,
        updatedBy: null,
        history: [
          {
            version: 1,
            changedBy: null,
            reason: 'bootstrap_default_control',
            note: 'Auto-created from runtime defaults.',
            changedAt: new Date(),
            snapshot: this.snapshotFromControl({
              label: metadata.label,
              notes: null,
              baseConfig,
              envOverrides,
            }),
          },
        ],
      })

      return created
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('E11000')) {
        const createdByRace = await FinancialToolControl.findOne({ tool })
        if (createdByRace) return createdByRace
      }
      throw error
    }
  }

  private invalidateRuntimeCache(tool?: FinancialToolKey) {
    if (tool) {
      this.runtimeCache.delete(tool)
      return
    }
    this.runtimeCache.clear()
  }

  async listToolControls(options: ListToolControlsOptions = {}) {
    const environment = resolveEnvironment(options.environment)
    const toolFilter = options.tool
    if (toolFilter !== undefined && !isFinancialToolKey(toolFilter)) {
      throw new AdminFinancialToolsServiceError(400, 'tool invalido.')
    }

    const selectedTools = toolFilter ? [toolFilter] : [...FINANCIAL_TOOL_KEYS]
    await Promise.all(selectedTools.map((tool) => this.ensureControl(tool)))

    const query: Record<string, unknown> = {
      tool: { $in: selectedTools },
    }
    const controls = await FinancialToolControl.find(query).sort({ tool: 1 }).lean()

    return {
      environment,
      items: controls.map((control) => this.mapControlItem(control, environment)),
      generatedAt: new Date().toISOString(),
    }
  }

  async updateToolControl(input: UpdateToolControlInput) {
    const actorId = this.validateObjectId(input.actorId, 'actorId')
    const reason = this.ensureReason(input.reason)
    const note = this.normalizeOptionalNote(input.note)
    const control = await this.ensureControl(input.tool)

    const beforeState = JSON.stringify(
      this.snapshotFromControl({
        label: control.label,
        notes: control.notes ?? null,
        baseConfig: control.baseConfig,
        envOverrides: cloneOverrides(control.envOverrides),
      })
    )

    let changed = false
    const patch = isRecord(input.patch) ? input.patch : {}

    if ('label' in patch) {
      if (typeof patch.label !== 'string' || !patch.label.trim()) {
        throw new AdminFinancialToolsServiceError(400, 'label invalido.')
      }
      const normalizedLabel = patch.label.trim()
      if (normalizedLabel.length > MAX_LABEL_LENGTH) {
        throw new AdminFinancialToolsServiceError(400, `label excede ${MAX_LABEL_LENGTH} caracteres.`)
      }
      if (control.label !== normalizedLabel) {
        control.label = normalizedLabel
        changed = true
      }
    }

    if ('notes' in patch) {
      if (patch.notes !== null && typeof patch.notes !== 'string') {
        throw new AdminFinancialToolsServiceError(400, 'notes invalido.')
      }
      const normalizedNotes =
        patch.notes === null ? null : patch.notes.trim().length > 0 ? patch.notes.trim() : null

      if (normalizedNotes && normalizedNotes.length > MAX_NOTE_LENGTH) {
        throw new AdminFinancialToolsServiceError(400, `notes excede ${MAX_NOTE_LENGTH} caracteres.`)
      }
      if ((control.notes ?? null) !== normalizedNotes) {
        control.notes = normalizedNotes
        changed = true
      }
    }

    if ('baseConfig' in patch) {
      if (!isRecord(patch.baseConfig)) {
        throw new AdminFinancialToolsServiceError(400, 'baseConfig invalido.')
      }
      if (this.applyConfigPatch(control.baseConfig, patch.baseConfig)) {
        changed = true
      }
    }

    if ('envOverrides' in patch) {
      if (!isRecord(patch.envOverrides)) {
        throw new AdminFinancialToolsServiceError(400, 'envOverrides invalido.')
      }

      for (const environment of FINANCIAL_TOOL_ENVIRONMENTS) {
        if (!(environment in patch.envOverrides)) continue
        const rawValue = patch.envOverrides[environment]

        if (rawValue === null) {
          const hasAnyValue = Object.keys(control.envOverrides[environment] ?? {}).length > 0
          if (hasAnyValue) {
            control.envOverrides[environment] = {}
            changed = true
          }
          continue
        }

        if (!isRecord(rawValue)) {
          throw new AdminFinancialToolsServiceError(
            400,
            `envOverrides.${environment} invalido.`
          )
        }

        if (this.applyOverridePatch(control.envOverrides[environment], rawValue)) {
          changed = true
        }
      }
    }

    const afterState = JSON.stringify(
      this.snapshotFromControl({
        label: control.label,
        notes: control.notes ?? null,
        baseConfig: control.baseConfig,
        envOverrides: cloneOverrides(control.envOverrides),
      })
    )

    if (!changed || beforeState === afterState) {
      throw new AdminFinancialToolsServiceError(409, 'Sem alteracoes validas para aplicar.')
    }

    control.updatedBy = actorId
    control.version += 1
    control.history.push({
      version: control.version,
      changedBy: actorId,
      reason,
      note,
      changedAt: new Date(),
      snapshot: this.snapshotFromControl({
        label: control.label,
        notes: control.notes ?? null,
        baseConfig: control.baseConfig,
        envOverrides: cloneOverrides(control.envOverrides),
      }),
    })

    await control.save()
    this.invalidateRuntimeCache(input.tool)

    const environment = resolveEnvironment()
    const reloaded = await FinancialToolControl.findById(control._id).lean()
    if (!reloaded) {
      throw new AdminFinancialToolsServiceError(500, 'Falha ao recarregar controlo atualizado.')
    }

    return this.mapControlItem(reloaded, environment)
  }

  async getUsageOverview(options: UsageOverviewOptions = {}) {
    const environment = resolveEnvironment(options.environment)
    const toolFilter = options.tool
    if (toolFilter !== undefined && !isFinancialToolKey(toolFilter)) {
      throw new AdminFinancialToolsServiceError(400, 'tool invalido.')
    }

    const daysRaw = options.days
    const days =
      typeof daysRaw === 'number' && Number.isFinite(daysRaw)
        ? Math.max(1, Math.min(MAX_DAYS, Math.floor(daysRaw)))
        : typeof daysRaw === 'string' && Number.isFinite(Number.parseInt(daysRaw, 10))
          ? Math.max(1, Math.min(MAX_DAYS, Number.parseInt(daysRaw, 10)))
          : DEFAULT_DAYS

    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    start.setUTCDate(start.getUTCDate() - days + 1)
    const sinceDay = toDayKey(start)

    const selectedTools = toolFilter ? [toolFilter] : [...FINANCIAL_TOOL_KEYS]
    const controls = await this.listToolControls({ environment, tool: toolFilter })
    const controlByTool = new Map(
      controls.items.map((item: FinancialToolControlListItem) => [item.tool, item])
    )

    const rows = await FinancialToolUsageDaily.find({
      environment,
      day: { $gte: sinceDay },
      tool: { $in: selectedTools },
    })
      .sort({ day: 1 })
      .lean()

    const byToolMap = new Map<
      FinancialToolKey,
      {
        tool: FinancialToolKey
        vertical: FinancialToolVertical
        label: string
        totalRequests: number
        authenticatedRequests: number
        successCount: number
        clientErrorCount: number
        serverErrorCount: number
        totalDurationMs: number
        maxDurationMs: number
        daily: Array<{
          day: string
          requests: number
          success: number
          clientError: number
          serverError: number
          avgLatencyMs: number
          maxLatencyMs: number
        }>
      }
    >()

    for (const tool of selectedTools) {
      const metadata = TOOL_METADATA[tool]
      byToolMap.set(tool, {
        tool,
        vertical: metadata.vertical,
        label: metadata.label,
        totalRequests: 0,
        authenticatedRequests: 0,
        successCount: 0,
        clientErrorCount: 0,
        serverErrorCount: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
        daily: [],
      })
    }

    for (const row of rows) {
      const tool = row.tool as FinancialToolKey
      const aggregate = byToolMap.get(tool)
      if (!aggregate) continue

      aggregate.totalRequests += Number(row.totalRequests ?? 0)
      aggregate.authenticatedRequests += Number(row.authenticatedRequests ?? 0)
      aggregate.successCount += Number(row.successCount ?? 0)
      aggregate.clientErrorCount += Number(row.clientErrorCount ?? 0)
      aggregate.serverErrorCount += Number(row.serverErrorCount ?? 0)
      aggregate.totalDurationMs += Number(row.totalDurationMs ?? 0)
      aggregate.maxDurationMs = Math.max(aggregate.maxDurationMs, Number(row.maxDurationMs ?? 0))
      aggregate.daily.push({
        day: String(row.day),
        requests: Number(row.totalRequests ?? 0),
        success: Number(row.successCount ?? 0),
        clientError: Number(row.clientErrorCount ?? 0),
        serverError: Number(row.serverErrorCount ?? 0),
        avgLatencyMs:
          Number(row.totalRequests ?? 0) > 0
            ? round(Number(row.totalDurationMs ?? 0) / Number(row.totalRequests ?? 0), 2)
            : 0,
        maxLatencyMs: Number(row.maxDurationMs ?? 0),
      })
    }

    const byTool = [...byToolMap.values()].map((item) => {
      const avgLatencyMs =
        item.totalRequests > 0 ? round(item.totalDurationMs / item.totalRequests, 2) : 0
      const successRatePercent =
        item.totalRequests > 0 ? round((item.successCount / item.totalRequests) * 100, 2) : 0
      const errorRatePercent =
        item.totalRequests > 0
          ? round(((item.clientErrorCount + item.serverErrorCount) / item.totalRequests) * 100, 2)
          : 0
      const authenticatedRatePercent =
        item.totalRequests > 0 ? round((item.authenticatedRequests / item.totalRequests) * 100, 2) : 0

      return {
        tool: item.tool,
        vertical: item.vertical,
        label: item.label,
        requests: item.totalRequests,
        authenticatedRequests: item.authenticatedRequests,
        successCount: item.successCount,
        clientErrorCount: item.clientErrorCount,
        serverErrorCount: item.serverErrorCount,
        successRatePercent,
        errorRatePercent,
        authenticatedRatePercent,
        avgLatencyMs,
        maxLatencyMs: item.maxDurationMs,
        effectiveConfig: controlByTool.get(item.tool)?.effectiveConfig ?? null,
        daily: item.daily,
      }
    })

    const byVerticalMap = new Map<
      FinancialToolVertical,
      {
        vertical: FinancialToolVertical
        requests: number
        successCount: number
        clientErrorCount: number
        serverErrorCount: number
      }
    >()

    for (const row of byTool) {
      const current = byVerticalMap.get(row.vertical) ?? {
        vertical: row.vertical,
        requests: 0,
        successCount: 0,
        clientErrorCount: 0,
        serverErrorCount: 0,
      }

      current.requests += row.requests
      current.successCount += row.successCount
      current.clientErrorCount += row.clientErrorCount
      current.serverErrorCount += row.serverErrorCount
      byVerticalMap.set(row.vertical, current)
    }

    const totals = byTool.reduce(
      (acc, row) => {
        acc.requests += row.requests
        acc.successCount += row.successCount
        acc.clientErrorCount += row.clientErrorCount
        acc.serverErrorCount += row.serverErrorCount
        return acc
      },
      {
        requests: 0,
        successCount: 0,
        clientErrorCount: 0,
        serverErrorCount: 0,
      }
    )

    return {
      environment,
      days,
      sinceDay,
      totals: {
        ...totals,
        successRatePercent:
          totals.requests > 0 ? round((totals.successCount / totals.requests) * 100, 2) : 0,
        errorRatePercent:
          totals.requests > 0
            ? round(((totals.clientErrorCount + totals.serverErrorCount) / totals.requests) * 100, 2)
            : 0,
      },
      byTool,
      byVertical: [...byVerticalMap.values()].map((item) => ({
        ...item,
        successRatePercent:
          item.requests > 0 ? round((item.successCount / item.requests) * 100, 2) : 0,
      })),
      generatedAt: new Date().toISOString(),
    }
  }

  async getRuntimeControl(tool: FinancialToolKey): Promise<FinancialToolRuntimeControl> {
    const now = Date.now()
    const cached = this.runtimeCache.get(tool)
    if (cached && cached.expiresAt > now) {
      return cached.value
    }

    const environment = resolveEnvironment()
    const control = await this.ensureControl(tool)
    const mapped = this.mapControlItem(control.toObject(), environment)
    const runtimeValue: FinancialToolRuntimeControl = {
      tool: mapped.tool,
      vertical: mapped.vertical,
      label: mapped.label,
      environment,
      enabled: mapped.effectiveConfig.enabled,
      maxSymbolsPerRequest: mapped.effectiveConfig.maxSymbolsPerRequest,
      cacheTtlSeconds: mapped.effectiveConfig.cacheTtlSeconds,
      requestsPerMinute: mapped.effectiveConfig.requestsPerMinute,
      experienceMode: mapped.effectiveConfig.experienceMode,
      version: mapped.version,
      updatedAt: mapped.updatedAt,
    }

    this.runtimeCache.set(tool, {
      value: runtimeValue,
      expiresAt: now + RUNTIME_CACHE_MS,
    })

    return runtimeValue
  }

  async recordUsageEvent(input: RecordUsageInput): Promise<void> {
    const metadata = TOOL_METADATA[input.tool]
    const environment = resolveEnvironment()
    const now = new Date()
    const day = toDayKey(now)

    const safeStatusCode =
      Number.isFinite(input.statusCode) && input.statusCode >= 100 && input.statusCode <= 599
        ? Math.floor(input.statusCode)
        : 500
    const safeDurationMs =
      Number.isFinite(input.durationMs) && input.durationMs > 0 ? round(input.durationMs, 2) : 0

    const successIncrement = safeStatusCode < 400 ? 1 : 0
    const clientErrorIncrement = safeStatusCode >= 400 && safeStatusCode < 500 ? 1 : 0
    const serverErrorIncrement = safeStatusCode >= 500 ? 1 : 0

    await FinancialToolUsageDaily.updateOne(
      {
        day,
        environment,
        tool: input.tool,
        vertical: metadata.vertical,
      },
      {
        $setOnInsert: {
          day,
          environment,
          tool: input.tool,
          vertical: metadata.vertical,
          totalRequests: 0,
          authenticatedRequests: 0,
          successCount: 0,
          clientErrorCount: 0,
          serverErrorCount: 0,
          totalDurationMs: 0,
          maxDurationMs: 0,
          lastStatusCode: safeStatusCode,
          lastRequestAt: now,
        },
        $inc: {
          totalRequests: 1,
          authenticatedRequests: input.authenticated ? 1 : 0,
          successCount: successIncrement,
          clientErrorCount: clientErrorIncrement,
          serverErrorCount: serverErrorIncrement,
          totalDurationMs: safeDurationMs,
        },
        $max: {
          maxDurationMs: safeDurationMs,
        },
        $set: {
          lastStatusCode: safeStatusCode,
          lastRequestAt: now,
        },
      },
      { upsert: true }
    )
  }
}

export const adminFinancialToolsService = new AdminFinancialToolsService()
