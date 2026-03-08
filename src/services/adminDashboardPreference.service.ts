import mongoose from 'mongoose'
import { AdminScope, getAdminScopesForUser } from '../admin/permissions'
import {
  ADMIN_DASHBOARD_DENSITY_MODES,
  ADMIN_DASHBOARD_PRESETS,
  ADMIN_DASHBOARD_WIDGET_KEYS,
  AdminDashboardDensityMode,
  AdminDashboardLayoutItem,
  AdminDashboardPinnedFilter,
  AdminDashboardPreference,
  AdminDashboardPreset,
  AdminDashboardWidgetKey,
} from '../models/AdminDashboardPreference'

const DEFAULT_REFRESH_SECONDS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_DASHBOARD_DEFAULT_REFRESH_SECONDS ?? '', 10)
  if (!Number.isFinite(parsed)) return 120
  return Math.min(3600, Math.max(30, parsed))
})()

const MAX_WIDGETS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_DASHBOARD_MAX_WIDGETS ?? '', 10)
  if (!Number.isFinite(parsed)) return 10
  return Math.min(20, Math.max(3, parsed))
})()

const MAX_PINNED_FILTERS = (() => {
  const parsed = Number.parseInt(process.env.ADMIN_DASHBOARD_MAX_PINNED_FILTERS ?? '', 10)
  if (!Number.isFinite(parsed)) return 10
  return Math.min(20, Math.max(1, parsed))
})()

const MAX_REASON_LENGTH = 500
const MAX_NOTE_LENGTH = 2000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isPreset = (value: unknown): value is AdminDashboardPreset =>
  typeof value === 'string' && ADMIN_DASHBOARD_PRESETS.includes(value as AdminDashboardPreset)

const isDensity = (value: unknown): value is AdminDashboardDensityMode =>
  typeof value === 'string' && ADMIN_DASHBOARD_DENSITY_MODES.includes(value as AdminDashboardDensityMode)

const isWidgetKey = (value: unknown): value is AdminDashboardWidgetKey =>
  typeof value === 'string' && ADMIN_DASHBOARD_WIDGET_KEYS.includes(value as AdminDashboardWidgetKey)

const toPositiveInt = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(max, Math.max(min, Math.floor(value)))
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return Math.min(max, Math.max(min, parsed))
    }
  }
  return fallback
}

const normalizeReason = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!normalized) return fallback
  return normalized.slice(0, MAX_REASON_LENGTH)
}

const normalizeNote = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  return normalized.slice(0, MAX_NOTE_LENGTH)
}

interface AdminDashboardWidgetDefinition {
  key: AdminDashboardWidgetKey
  label: string
  description: string
  requiredScopes: AdminScope[]
  dataEndpoint: string
  defaultLayout: {
    column: number
    order: number
    width: number
    height: number
  }
}

const WIDGET_CATALOG: AdminDashboardWidgetDefinition[] = [
  {
    key: 'kpi_usage_overview',
    label: 'Usage Overview',
    description: 'DAU/WAU/MAU e saude de uso da plataforma.',
    requiredScopes: ['admin.metrics.read'],
    dataEndpoint: '/api/admin/metrics/overview',
    defaultLayout: { column: 1, order: 1, width: 6, height: 3 },
  },
  {
    key: 'kpi_moderation_queue',
    label: 'Moderation Queue',
    description: 'Volume atual da fila de moderacao e backlog.',
    requiredScopes: ['admin.content.read'],
    dataEndpoint: '/api/admin/metrics/overview',
    defaultLayout: { column: 2, order: 1, width: 6, height: 3 },
  },
  {
    key: 'kpi_creator_trust',
    label: 'Creator Trust',
    description: 'Distribuicao de risco e creators com necessidade de intervencao.',
    requiredScopes: ['admin.users.read'],
    dataEndpoint: '/api/admin/metrics/overview',
    defaultLayout: { column: 1, order: 2, width: 6, height: 3 },
  },
  {
    key: 'chart_reports_trend',
    label: 'Reports Trend',
    description: 'Intake e resolucao de reports nos ultimos periodos.',
    requiredScopes: ['admin.content.read'],
    dataEndpoint: '/api/admin/metrics/overview',
    defaultLayout: { column: 2, order: 2, width: 6, height: 4 },
  },
  {
    key: 'chart_jobs_health',
    label: 'Jobs Health',
    description: 'Estado dos jobs assicronos de moderacao e rollback.',
    requiredScopes: ['admin.content.read'],
    dataEndpoint: '/api/admin/metrics/overview',
    defaultLayout: { column: 1, order: 3, width: 6, height: 4 },
  },
  {
    key: 'table_priority_targets',
    label: 'Priority Targets',
    description: 'Top alvos com risco elevado para triagem rapida.',
    requiredScopes: ['admin.content.read'],
    dataEndpoint: '/api/admin/metrics/drilldown',
    defaultLayout: { column: 2, order: 3, width: 6, height: 5 },
  },
  {
    key: 'table_creator_positive',
    label: 'Creator Positive',
    description: 'Creators em destaque por crescimento e engagement.',
    requiredScopes: ['admin.metrics.read'],
    dataEndpoint: '/api/admin/creators/analytics/positive',
    defaultLayout: { column: 1, order: 4, width: 12, height: 5 },
  },
  {
    key: 'table_subscriptions_health',
    label: 'Subscriptions Health',
    description: 'Estado de subscricoes, trial e churn operacional.',
    requiredScopes: ['admin.users.read'],
    dataEndpoint: '/api/admin/monetization/subscriptions',
    defaultLayout: { column: 1, order: 4, width: 12, height: 5 },
  },
  {
    key: 'table_ads_inventory',
    label: 'Ads Inventory',
    description: 'Cobertura de slots e campanhas por superficie.',
    requiredScopes: ['admin.content.read'],
    dataEndpoint: '/api/admin/ads/inventory/overview',
    defaultLayout: { column: 1, order: 5, width: 12, height: 4 },
  },
  {
    key: 'kpi_revenue_health',
    label: 'Revenue Health',
    description: 'Visao sintetica de monetizacao e indicadores de receita.',
    requiredScopes: ['admin.metrics.read'],
    dataEndpoint: '/api/admin/tools/financial/usage',
    defaultLayout: { column: 1, order: 1, width: 12, height: 3 },
  },
]

const PRESET_WIDGETS: Record<Exclude<AdminDashboardPreset, 'custom'>, AdminDashboardWidgetKey[]> = {
  operations: [
    'kpi_usage_overview',
    'kpi_moderation_queue',
    'chart_jobs_health',
    'chart_reports_trend',
    'table_priority_targets',
    'kpi_creator_trust',
  ],
  moderation: [
    'kpi_moderation_queue',
    'chart_reports_trend',
    'table_priority_targets',
    'chart_jobs_health',
    'kpi_creator_trust',
    'table_creator_positive',
  ],
  monetization: [
    'kpi_revenue_health',
    'table_subscriptions_health',
    'table_ads_inventory',
    'table_creator_positive',
    'kpi_usage_overview',
  ],
}

export interface AdminDashboardActor {
  id: string
  role: string
  adminScopes?: string[]
}

export interface AdminDashboardWidgetCatalogItem {
  key: AdminDashboardWidgetKey
  label: string
  description: string
  requiredScopes: AdminScope[]
  dataEndpoint: string
  defaultLayout: {
    column: number
    order: number
    width: number
    height: number
  }
}

export interface AdminDashboardPreferenceResult {
  availableWidgets: AdminDashboardWidgetCatalogItem[]
  preference: {
    preset: AdminDashboardPreset
    density: AdminDashboardDensityMode
    refreshSeconds: number
    layout: AdminDashboardLayoutItem[]
    pinnedFilters: AdminDashboardPinnedFilter[]
    version: number
    createdAt: string
    updatedAt: string
  }
}

export class AdminDashboardPreferenceServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class AdminDashboardPreferenceService {
  private validateActor(actor: AdminDashboardActor): mongoose.Types.ObjectId {
    if (actor.role !== 'admin') {
      throw new AdminDashboardPreferenceServiceError(403, 'Acesso reservado a administradores.')
    }
    if (!mongoose.Types.ObjectId.isValid(actor.id)) {
      throw new AdminDashboardPreferenceServiceError(400, 'adminId invalido.')
    }
    return new mongoose.Types.ObjectId(actor.id)
  }

  private resolveCatalog(actor: AdminDashboardActor): AdminDashboardWidgetDefinition[] {
    const scopeSet = getAdminScopesForUser({
      role: 'admin',
      adminScopes: actor.adminScopes ?? [],
    } as any)

    return WIDGET_CATALOG.filter((widget) =>
      widget.requiredScopes.every((scope) => scopeSet.has(scope))
    )
  }

  private buildDefaultLayout(
    preset: AdminDashboardPreset,
    catalog: AdminDashboardWidgetDefinition[]
  ): AdminDashboardLayoutItem[] {
    const catalogByKey = new Map(catalog.map((widget) => [widget.key, widget]))
    const orderedKeys =
      preset === 'custom' ? [] : (PRESET_WIDGETS[preset] ?? []).filter((key) => catalogByKey.has(key))

    const usedKeys = new Set<AdminDashboardWidgetKey>()
    const items: AdminDashboardLayoutItem[] = []

    for (const key of orderedKeys) {
      const definition = catalogByKey.get(key)
      if (!definition) continue
      usedKeys.add(key)
      items.push({
        widgetKey: key,
        column: definition.defaultLayout.column,
        order: definition.defaultLayout.order,
        width: definition.defaultLayout.width,
        height: definition.defaultLayout.height,
        collapsed: false,
      })
    }

    for (const definition of catalog) {
      if (items.length >= MAX_WIDGETS) break
      if (usedKeys.has(definition.key)) continue
      items.push({
        widgetKey: definition.key,
        column: definition.defaultLayout.column,
        order: items.length + 1,
        width: definition.defaultLayout.width,
        height: definition.defaultLayout.height,
        collapsed: false,
      })
    }

    return items.slice(0, MAX_WIDGETS)
  }

  private sanitizeLayout(
    layoutInput: unknown,
    catalog: AdminDashboardWidgetDefinition[]
  ): AdminDashboardLayoutItem[] {
    if (!Array.isArray(layoutInput)) return []

    const catalogByKey = new Map(catalog.map((widget) => [widget.key, widget]))
    const usedKeys = new Set<AdminDashboardWidgetKey>()
    const result: AdminDashboardLayoutItem[] = []

    for (const row of layoutInput) {
      if (!isRecord(row)) continue
      if (!isWidgetKey(row.widgetKey)) continue
      if (!catalogByKey.has(row.widgetKey)) continue
      if (usedKeys.has(row.widgetKey)) continue

      usedKeys.add(row.widgetKey)
      result.push({
        widgetKey: row.widgetKey,
        column: toPositiveInt(row.column, 1, 1, 4),
        order: toPositiveInt(row.order, result.length + 1, 0, 100),
        width: toPositiveInt(row.width, 6, 1, 12),
        height: toPositiveInt(row.height, 4, 1, 12),
        collapsed: typeof row.collapsed === 'boolean' ? row.collapsed : false,
      })
    }

    return result.slice(0, MAX_WIDGETS)
  }

  private sanitizePinnedFilters(input: unknown): AdminDashboardPinnedFilter[] {
    if (!Array.isArray(input)) return []

    const filters: AdminDashboardPinnedFilter[] = []
    for (const row of input) {
      if (!isRecord(row)) continue
      if (typeof row.key !== 'string' || typeof row.value !== 'string') continue

      const key = row.key.trim().slice(0, 64)
      const value = row.value.trim().slice(0, 240)
      if (!key || !value) continue

      filters.push({ key, value })
      if (filters.length >= MAX_PINNED_FILTERS) break
    }

    return filters
  }

  private buildSnapshot(preference: {
    preset: AdminDashboardPreset
    density: AdminDashboardDensityMode
    refreshSeconds: number
    layout: AdminDashboardLayoutItem[]
    pinnedFilters: AdminDashboardPinnedFilter[]
  }) {
    return {
      preset: preference.preset,
      density: preference.density,
      refreshSeconds: preference.refreshSeconds,
      layout: preference.layout.map((item) => ({ ...item })),
      pinnedFilters: preference.pinnedFilters.map((filter) => ({ ...filter })),
    }
  }

  private async ensurePreference(
    actorId: mongoose.Types.ObjectId,
    catalog: AdminDashboardWidgetDefinition[]
  ) {
    const existing = await AdminDashboardPreference.findOne({ user: actorId })
    if (existing) return existing

    const defaultPreset: AdminDashboardPreset = 'operations'
    const defaultLayout = this.buildDefaultLayout(defaultPreset, catalog)
    const created = await AdminDashboardPreference.create({
      user: actorId,
      preset: defaultPreset,
      density: 'comfortable',
      refreshSeconds: DEFAULT_REFRESH_SECONDS,
      layout: defaultLayout,
      pinnedFilters: [],
      version: 1,
      createdBy: actorId,
      updatedBy: actorId,
      history: [
        {
          version: 1,
          action: 'created',
          changedBy: actorId,
          reason: 'dashboard_preference_created',
          note: null,
          changedAt: new Date(),
          snapshot: this.buildSnapshot({
            preset: defaultPreset,
            density: 'comfortable',
            refreshSeconds: DEFAULT_REFRESH_SECONDS,
            layout: defaultLayout,
            pinnedFilters: [],
          }),
        },
      ],
    })

    return created
  }

  private presentResult(
    preference: any,
    catalog: AdminDashboardWidgetDefinition[]
  ): AdminDashboardPreferenceResult {
    const sanitizedLayout = this.sanitizeLayout(preference.layout, catalog)
    const fallbackLayout =
      sanitizedLayout.length > 0
        ? sanitizedLayout
        : this.buildDefaultLayout(
            isPreset(preference.preset) ? preference.preset : 'operations',
            catalog
          )

    return {
      availableWidgets: catalog.map((widget) => ({
        key: widget.key,
        label: widget.label,
        description: widget.description,
        requiredScopes: widget.requiredScopes,
        dataEndpoint: widget.dataEndpoint,
        defaultLayout: widget.defaultLayout,
      })),
      preference: {
        preset: isPreset(preference.preset) ? preference.preset : 'operations',
        density: isDensity(preference.density) ? preference.density : 'comfortable',
        refreshSeconds: toPositiveInt(preference.refreshSeconds, DEFAULT_REFRESH_SECONDS, 30, 3600),
        layout: fallbackLayout,
        pinnedFilters: this.sanitizePinnedFilters(preference.pinnedFilters),
        version: Number(preference.version ?? 1),
        createdAt: new Date(preference.createdAt).toISOString(),
        updatedAt: new Date(preference.updatedAt).toISOString(),
      },
    }
  }

  async getPreference(actor: AdminDashboardActor): Promise<AdminDashboardPreferenceResult> {
    const actorId = this.validateActor(actor)
    const catalog = this.resolveCatalog(actor)
    const preference = await this.ensurePreference(actorId, catalog)
    return this.presentResult(preference.toObject(), catalog)
  }

  async updatePreference(
    actor: AdminDashboardActor,
    patch: Record<string, unknown>,
    reasonInput?: unknown,
    noteInput?: unknown
  ): Promise<AdminDashboardPreferenceResult> {
    const actorId = this.validateActor(actor)
    const catalog = this.resolveCatalog(actor)
    const preference = await this.ensurePreference(actorId, catalog)

    const before = JSON.stringify(
      this.buildSnapshot({
        preset: preference.preset,
        density: preference.density,
        refreshSeconds: preference.refreshSeconds,
        layout: this.sanitizeLayout(preference.layout, catalog),
        pinnedFilters: this.sanitizePinnedFilters(preference.pinnedFilters),
      })
    )

    let changed = false

    if ('preset' in patch) {
      if (!isPreset(patch.preset)) {
        throw new AdminDashboardPreferenceServiceError(400, 'preset invalido.')
      }
      if (preference.preset !== patch.preset) {
        preference.preset = patch.preset
        changed = true
      }
    }

    if ('density' in patch) {
      if (!isDensity(patch.density)) {
        throw new AdminDashboardPreferenceServiceError(400, 'density invalido.')
      }
      if (preference.density !== patch.density) {
        preference.density = patch.density
        changed = true
      }
    }

    if ('refreshSeconds' in patch) {
      const parsed = toPositiveInt(patch.refreshSeconds, preference.refreshSeconds, 30, 3600)
      if (preference.refreshSeconds !== parsed) {
        preference.refreshSeconds = parsed
        changed = true
      }
    }

    if ('pinnedFilters' in patch) {
      const normalizedFilters = this.sanitizePinnedFilters(patch.pinnedFilters)
      const currentFilters = JSON.stringify(this.sanitizePinnedFilters(preference.pinnedFilters))
      const nextFilters = JSON.stringify(normalizedFilters)
      if (currentFilters !== nextFilters) {
        preference.pinnedFilters = normalizedFilters
        changed = true
      }
    }

    if ('layout' in patch) {
      const normalizedLayout = this.sanitizeLayout(patch.layout, catalog)
      if (normalizedLayout.length === 0) {
        throw new AdminDashboardPreferenceServiceError(
          400,
          'layout invalido ou sem widgets permitidos.'
        )
      }
      const currentLayout = JSON.stringify(this.sanitizeLayout(preference.layout, catalog))
      const nextLayout = JSON.stringify(normalizedLayout)
      if (currentLayout !== nextLayout) {
        preference.layout = normalizedLayout
        changed = true
      }
    } else if ('preset' in patch && preference.preset !== 'custom') {
      const defaultLayout = this.buildDefaultLayout(preference.preset, catalog)
      const currentLayout = JSON.stringify(this.sanitizeLayout(preference.layout, catalog))
      const nextLayout = JSON.stringify(defaultLayout)
      if (currentLayout !== nextLayout) {
        preference.layout = defaultLayout
        changed = true
      }
    }

    const after = JSON.stringify(
      this.buildSnapshot({
        preset: preference.preset,
        density: preference.density,
        refreshSeconds: preference.refreshSeconds,
        layout: this.sanitizeLayout(preference.layout, catalog),
        pinnedFilters: this.sanitizePinnedFilters(preference.pinnedFilters),
      })
    )

    if (!changed || before === after) {
      throw new AdminDashboardPreferenceServiceError(409, 'Sem alteracoes validas para aplicar.')
    }

    preference.updatedBy = actorId
    preference.version += 1
    preference.history.push({
      version: preference.version,
      action: 'updated',
      changedBy: actorId,
      reason: normalizeReason(reasonInput, 'dashboard_preference_updated'),
      note: normalizeNote(noteInput),
      changedAt: new Date(),
      snapshot: this.buildSnapshot({
        preset: preference.preset,
        density: preference.density,
        refreshSeconds: preference.refreshSeconds,
        layout: this.sanitizeLayout(preference.layout, catalog),
        pinnedFilters: this.sanitizePinnedFilters(preference.pinnedFilters),
      }),
    })

    await preference.save()
    return this.presentResult(preference.toObject(), catalog)
  }

  async resetPreference(
    actor: AdminDashboardActor,
    presetInput?: unknown,
    reasonInput?: unknown,
    noteInput?: unknown
  ): Promise<AdminDashboardPreferenceResult> {
    const actorId = this.validateActor(actor)
    const catalog = this.resolveCatalog(actor)
    const preference = await this.ensurePreference(actorId, catalog)

    const nextPreset: AdminDashboardPreset = isPreset(presetInput) ? presetInput : 'operations'
    const nextLayout = this.buildDefaultLayout(nextPreset, catalog)

    preference.preset = nextPreset
    preference.density = 'comfortable'
    preference.refreshSeconds = DEFAULT_REFRESH_SECONDS
    preference.layout = nextLayout
    preference.pinnedFilters = []
    preference.updatedBy = actorId
    preference.version += 1
    preference.history.push({
      version: preference.version,
      action: 'reset',
      changedBy: actorId,
      reason: normalizeReason(reasonInput, 'dashboard_preference_reset'),
      note: normalizeNote(noteInput),
      changedAt: new Date(),
      snapshot: this.buildSnapshot({
        preset: nextPreset,
        density: preference.density,
        refreshSeconds: preference.refreshSeconds,
        layout: nextLayout,
        pinnedFilters: [],
      }),
    })

    await preference.save()
    return this.presentResult(preference.toObject(), catalog)
  }
}

export const adminDashboardPreferenceService = new AdminDashboardPreferenceService()
