import mongoose, { Document, Schema } from 'mongoose'

export const ADMIN_DASHBOARD_PRESETS = [
  'operations',
  'moderation',
  'monetization',
  'custom',
] as const
export const ADMIN_DASHBOARD_DENSITY_MODES = ['comfortable', 'compact'] as const
export const ADMIN_DASHBOARD_THEME_MODES = ['system', 'light', 'dark'] as const
export const ADMIN_DASHBOARD_WIDGET_KEYS = [
  'kpi_usage_overview',
  'kpi_moderation_queue',
  'kpi_creator_trust',
  'chart_reports_trend',
  'chart_jobs_health',
  'table_priority_targets',
  'table_creator_positive',
  'table_subscriptions_health',
  'table_ads_inventory',
  'kpi_revenue_health',
] as const

export type AdminDashboardPreset = (typeof ADMIN_DASHBOARD_PRESETS)[number]
export type AdminDashboardDensityMode = (typeof ADMIN_DASHBOARD_DENSITY_MODES)[number]
export type AdminDashboardThemeMode = (typeof ADMIN_DASHBOARD_THEME_MODES)[number]
export type AdminDashboardWidgetKey = (typeof ADMIN_DASHBOARD_WIDGET_KEYS)[number]

export interface AdminDashboardLayoutItem {
  widgetKey: AdminDashboardWidgetKey
  column: number
  order: number
  width: number
  height: number
  collapsed: boolean
}

export interface AdminDashboardPinnedFilter {
  key: string
  value: string
}

export interface AdminDashboardPreferenceSnapshot {
  preset: AdminDashboardPreset
  density: AdminDashboardDensityMode
  theme: AdminDashboardThemeMode
  refreshSeconds: number
  layout: AdminDashboardLayoutItem[]
  pinnedFilters: AdminDashboardPinnedFilter[]
}

export interface AdminDashboardPreferenceHistoryEntry {
  version: number
  action: 'created' | 'updated' | 'reset'
  changedBy: mongoose.Types.ObjectId
  reason: string
  note?: string | null
  changedAt: Date
  snapshot: AdminDashboardPreferenceSnapshot
}

export interface IAdminDashboardPreference extends Document {
  user: mongoose.Types.ObjectId
  preset: AdminDashboardPreset
  density: AdminDashboardDensityMode
  theme: AdminDashboardThemeMode
  refreshSeconds: number
  layout: AdminDashboardLayoutItem[]
  pinnedFilters: AdminDashboardPinnedFilter[]
  version: number
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId | null
  history: AdminDashboardPreferenceHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const AdminDashboardLayoutItemSchema = new Schema<AdminDashboardLayoutItem>(
  {
    widgetKey: {
      type: String,
      enum: ADMIN_DASHBOARD_WIDGET_KEYS,
      required: true,
    },
    column: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    width: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    collapsed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    _id: false,
  }
)

const AdminDashboardPinnedFilterSchema = new Schema<AdminDashboardPinnedFilter>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
  },
  {
    _id: false,
  }
)

const AdminDashboardPreferenceSnapshotSchema = new Schema<AdminDashboardPreferenceSnapshot>(
  {
    preset: {
      type: String,
      enum: ADMIN_DASHBOARD_PRESETS,
      required: true,
    },
    density: {
      type: String,
      enum: ADMIN_DASHBOARD_DENSITY_MODES,
      required: true,
    },
    theme: {
      type: String,
      enum: ADMIN_DASHBOARD_THEME_MODES,
      required: false,
      default: 'system',
    },
    refreshSeconds: {
      type: Number,
      required: true,
      min: 30,
      max: 3600,
    },
    layout: {
      type: [AdminDashboardLayoutItemSchema],
      default: [],
    },
    pinnedFilters: {
      type: [AdminDashboardPinnedFilterSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
)

const AdminDashboardPreferenceHistoryEntrySchema = new Schema<AdminDashboardPreferenceHistoryEntry>(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    action: {
      type: String,
      enum: ['created', 'updated', 'reset'],
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    note: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    snapshot: {
      type: AdminDashboardPreferenceSnapshotSchema,
      required: true,
    },
  },
  {
    _id: false,
  }
)

const AdminDashboardPreferenceSchema = new Schema<IAdminDashboardPreference>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    preset: {
      type: String,
      enum: ADMIN_DASHBOARD_PRESETS,
      required: true,
      default: 'operations',
    },
    density: {
      type: String,
      enum: ADMIN_DASHBOARD_DENSITY_MODES,
      required: true,
      default: 'comfortable',
    },
    theme: {
      type: String,
      enum: ADMIN_DASHBOARD_THEME_MODES,
      required: false,
      default: 'system',
    },
    refreshSeconds: {
      type: Number,
      required: true,
      min: 30,
      max: 3600,
      default: 120,
    },
    layout: {
      type: [AdminDashboardLayoutItemSchema],
      default: [],
    },
    pinnedFilters: {
      type: [AdminDashboardPinnedFilterSchema],
      default: [],
    },
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    history: {
      type: [AdminDashboardPreferenceHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

AdminDashboardPreferenceSchema.index({ preset: 1, updatedAt: -1 })

export const AdminDashboardPreference = mongoose.model<IAdminDashboardPreference>(
  'AdminDashboardPreference',
  AdminDashboardPreferenceSchema
)
