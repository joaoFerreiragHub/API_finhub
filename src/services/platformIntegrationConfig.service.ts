import mongoose from 'mongoose'
import {
  IPlatformIntegrationConfig,
  PlatformIntegrationConfig,
  PlatformIntegrationKey,
  PLATFORM_INTEGRATION_KEYS,
} from '../models/PlatformIntegrationConfig'

type CaptchaProvider = 'disabled' | 'turnstile' | 'hcaptcha'
type PlatformIntegrationCategory = 'analytics' | 'security' | 'seo'

interface AnalyticsPosthogConfig {
  key: string | null
  host: string
}

interface AnalyticsGoogleAnalyticsConfig {
  measurementId: string | null
}

interface AnalyticsGoogleTagManagerConfig {
  containerId: string | null
}

interface AnalyticsMetaPixelConfig {
  pixelId: string | null
}

interface CaptchaClientConfig {
  provider: CaptchaProvider
  siteKey: string | null
}

interface SeoDefaultsConfig {
  siteName: string
  siteUrl: string
  defaultDescription: string
  defaultImage: string
  noIndexExactPaths: string[]
  noIndexPrefixes: string[]
}

interface PlatformIntegrationDefinition {
  key: PlatformIntegrationKey
  label: string
  description: string
  category: PlatformIntegrationCategory
  defaultEnabled: boolean
  defaultConfig: unknown
  normalize: (raw: unknown, fallback: unknown) => Record<string, unknown>
}

interface PlatformIntegrationActor {
  id: string
  name?: string
  username?: string
  email?: string
  role?: string
}

interface UpdatePlatformIntegrationInput {
  actorId: string
  key: PlatformIntegrationKey
  enabled?: boolean
  config?: Record<string, unknown>
  reason: string
  note?: string
}

export interface PlatformIntegrationConfigItem {
  key: PlatformIntegrationKey
  label: string
  description: string
  category: PlatformIntegrationCategory
  enabled: boolean
  config: Record<string, unknown>
  reason: string | null
  note: string | null
  updatedAt: Date | null
  updatedBy: PlatformIntegrationActor | null
}

export interface PlatformRuntimeConfigResponse {
  generatedAt: Date
  analytics: {
    posthog: {
      enabled: boolean
      key: string | null
      host: string
    }
    googleAnalytics: {
      enabled: boolean
      measurementId: string | null
    }
    googleTagManager: {
      enabled: boolean
      containerId: string | null
    }
    metaPixel: {
      enabled: boolean
      pixelId: string | null
    }
  }
  captcha: {
    enabled: boolean
    provider: CaptchaProvider
    siteKey: string | null
  }
  seo: SeoDefaultsConfig
}

const DEFAULT_POSTHOG_KEY =
  typeof process.env.POSTHOG_KEY === 'string' && process.env.POSTHOG_KEY.trim().length > 0
    ? process.env.POSTHOG_KEY.trim()
    : typeof process.env.VITE_POSTHOG_KEY === 'string' && process.env.VITE_POSTHOG_KEY.trim().length > 0
      ? process.env.VITE_POSTHOG_KEY.trim()
      : null

const normalizeUrl = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback

  try {
    const parsed = new URL(trimmed)
    return parsed.toString().replace(/\/$/, '')
  } catch (_error) {
    return fallback
  }
}

const DEFAULT_POSTHOG_HOST = normalizeUrl(
  process.env.POSTHOG_HOST ?? process.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com',
  'https://app.posthog.com'
)

const DEFAULT_GA_MEASUREMENT_ID =
  typeof process.env.GA_MEASUREMENT_ID === 'string' && process.env.GA_MEASUREMENT_ID.trim().length > 0
    ? process.env.GA_MEASUREMENT_ID.trim()
    : typeof process.env.VITE_GA_ID === 'string' && process.env.VITE_GA_ID.trim().length > 0
      ? process.env.VITE_GA_ID.trim()
      : null

const DEFAULT_GTM_CONTAINER_ID =
  typeof process.env.GTM_CONTAINER_ID === 'string' && process.env.GTM_CONTAINER_ID.trim().length > 0
    ? process.env.GTM_CONTAINER_ID.trim()
    : typeof process.env.VITE_GTM_ID === 'string' && process.env.VITE_GTM_ID.trim().length > 0
      ? process.env.VITE_GTM_ID.trim()
      : null

const DEFAULT_META_PIXEL_ID =
  typeof process.env.FB_PIXEL_ID === 'string' && process.env.FB_PIXEL_ID.trim().length > 0
    ? process.env.FB_PIXEL_ID.trim()
    : typeof process.env.VITE_FB_PIXEL_ID === 'string' && process.env.VITE_FB_PIXEL_ID.trim().length > 0
      ? process.env.VITE_FB_PIXEL_ID.trim()
      : null

const rawCaptchaProvider = (process.env.CAPTCHA_PROVIDER ?? process.env.VITE_CAPTCHA_PROVIDER ?? 'disabled')
  .trim()
  .toLowerCase()
const DEFAULT_CAPTCHA_PROVIDER: CaptchaProvider =
  rawCaptchaProvider === 'turnstile' || rawCaptchaProvider === 'hcaptcha'
    ? rawCaptchaProvider
    : 'disabled'

const DEFAULT_CAPTCHA_SITE_KEY =
  typeof process.env.CAPTCHA_SITE_KEY === 'string' && process.env.CAPTCHA_SITE_KEY.trim().length > 0
    ? process.env.CAPTCHA_SITE_KEY.trim()
    : typeof process.env.VITE_CAPTCHA_SITE_KEY === 'string' && process.env.VITE_CAPTCHA_SITE_KEY.trim().length > 0
      ? process.env.VITE_CAPTCHA_SITE_KEY.trim()
      : null

const DEFAULT_SEO_SITE_NAME =
  typeof process.env.SITE_NAME === 'string' && process.env.SITE_NAME.trim().length > 0
    ? process.env.SITE_NAME.trim()
    : 'FinHub'
const DEFAULT_SEO_SITE_URL = normalizeUrl(
  process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? 'https://finhub.pt',
  'https://finhub.pt'
)
const DEFAULT_SEO_DESCRIPTION =
  typeof process.env.SEO_DEFAULT_DESCRIPTION === 'string' &&
  process.env.SEO_DEFAULT_DESCRIPTION.trim().length > 0
    ? process.env.SEO_DEFAULT_DESCRIPTION.trim()
    : 'Plataforma de literacia financeira com conteudo, criadores e ferramentas para melhorar decisoes de investimento.'
const DEFAULT_SEO_IMAGE =
  typeof process.env.SEO_DEFAULT_IMAGE === 'string' && process.env.SEO_DEFAULT_IMAGE.trim().length > 0
    ? process.env.SEO_DEFAULT_IMAGE.trim()
    : `${DEFAULT_SEO_SITE_URL}/vite.svg`
const DEFAULT_SEO_NOINDEX_EXACT_PATHS = [
  '/login',
  '/registar',
  '/esqueci-password',
  '/reset-password',
  '/verificar-email',
  '/conta',
  '/meus-favoritos',
  '/a-seguir',
  '/notificacoes',
]
const DEFAULT_SEO_NOINDEX_PREFIXES = ['/admin', '/dashboard', '/oauth']

const DEFAULT_POSTHOG_CONFIG: AnalyticsPosthogConfig = {
  key: DEFAULT_POSTHOG_KEY,
  host: DEFAULT_POSTHOG_HOST,
}

const DEFAULT_GOOGLE_ANALYTICS_CONFIG: AnalyticsGoogleAnalyticsConfig = {
  measurementId: DEFAULT_GA_MEASUREMENT_ID,
}

const DEFAULT_GOOGLE_TAG_MANAGER_CONFIG: AnalyticsGoogleTagManagerConfig = {
  containerId: DEFAULT_GTM_CONTAINER_ID,
}

const DEFAULT_META_PIXEL_CONFIG: AnalyticsMetaPixelConfig = {
  pixelId: DEFAULT_META_PIXEL_ID,
}

const DEFAULT_CAPTCHA_CONFIG: CaptchaClientConfig = {
  provider: DEFAULT_CAPTCHA_PROVIDER,
  siteKey: DEFAULT_CAPTCHA_SITE_KEY,
}

const DEFAULT_SEO_CONFIG: SeoDefaultsConfig = {
  siteName: DEFAULT_SEO_SITE_NAME,
  siteUrl: DEFAULT_SEO_SITE_URL,
  defaultDescription: DEFAULT_SEO_DESCRIPTION,
  defaultImage: DEFAULT_SEO_IMAGE,
  noIndexExactPaths: DEFAULT_SEO_NOINDEX_EXACT_PATHS,
  noIndexPrefixes: DEFAULT_SEO_NOINDEX_PREFIXES,
}

const parseBooleanEnv = (envName: string, fallback: boolean): boolean => {
  const rawValue = process.env[envName]
  if (typeof rawValue !== 'string') return fallback
  const normalized = rawValue.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return [...fallback]
  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
  return Array.from(new Set(normalized))
}

const trimReason = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const normalizeAnalyticsPosthogConfig = (
  raw: unknown,
  fallback: AnalyticsPosthogConfig
): AnalyticsPosthogConfig => {
  const source = isRecord(raw) ? raw : {}
  const nextKey = hasOwn(source, 'key') ? toOptionalString(source.key) : fallback.key
  const nextHost = hasOwn(source, 'host') ? normalizeUrl(source.host, fallback.host) : fallback.host

  return {
    key: nextKey,
    host: nextHost,
  }
}

const normalizeAnalyticsGoogleAnalyticsConfig = (
  raw: unknown,
  fallback: AnalyticsGoogleAnalyticsConfig
): AnalyticsGoogleAnalyticsConfig => {
  const source = isRecord(raw) ? raw : {}
  const nextMeasurementId = hasOwn(source, 'measurementId')
    ? toOptionalString(source.measurementId)
    : fallback.measurementId

  return {
    measurementId: nextMeasurementId,
  }
}

const normalizeAnalyticsGoogleTagManagerConfig = (
  raw: unknown,
  fallback: AnalyticsGoogleTagManagerConfig
): AnalyticsGoogleTagManagerConfig => {
  const source = isRecord(raw) ? raw : {}
  const nextContainerId = hasOwn(source, 'containerId')
    ? toOptionalString(source.containerId)
    : fallback.containerId

  return {
    containerId: nextContainerId,
  }
}

const normalizeAnalyticsMetaPixelConfig = (
  raw: unknown,
  fallback: AnalyticsMetaPixelConfig
): AnalyticsMetaPixelConfig => {
  const source = isRecord(raw) ? raw : {}
  const nextPixelId = hasOwn(source, 'pixelId') ? toOptionalString(source.pixelId) : fallback.pixelId

  return {
    pixelId: nextPixelId,
  }
}

const normalizeCaptchaClientConfig = (
  raw: unknown,
  fallback: CaptchaClientConfig
): CaptchaClientConfig => {
  const source = isRecord(raw) ? raw : {}

  const providerFromPatch = hasOwn(source, 'provider') ? String(source.provider ?? '').trim().toLowerCase() : ''
  const nextProvider: CaptchaProvider =
    providerFromPatch === 'turnstile' || providerFromPatch === 'hcaptcha' || providerFromPatch === 'disabled'
      ? providerFromPatch
      : fallback.provider

  const nextSiteKey = hasOwn(source, 'siteKey') ? toOptionalString(source.siteKey) : fallback.siteKey

  return {
    provider: nextProvider,
    siteKey: nextSiteKey,
  }
}

const normalizeSeoDefaultsConfig = (raw: unknown, fallback: SeoDefaultsConfig): SeoDefaultsConfig => {
  const source = isRecord(raw) ? raw : {}

  const nextSiteName =
    hasOwn(source, 'siteName') && typeof source.siteName === 'string' && source.siteName.trim().length > 0
      ? source.siteName.trim()
      : fallback.siteName
  const nextSiteUrl = hasOwn(source, 'siteUrl') ? normalizeUrl(source.siteUrl, fallback.siteUrl) : fallback.siteUrl
  const nextDefaultDescription =
    hasOwn(source, 'defaultDescription') &&
    typeof source.defaultDescription === 'string' &&
    source.defaultDescription.trim().length > 0
      ? source.defaultDescription.trim()
      : fallback.defaultDescription
  const nextDefaultImage =
    hasOwn(source, 'defaultImage') &&
    typeof source.defaultImage === 'string' &&
    source.defaultImage.trim().length > 0
      ? source.defaultImage.trim()
      : fallback.defaultImage
  const nextNoIndexExactPaths = hasOwn(source, 'noIndexExactPaths')
    ? toStringArray(source.noIndexExactPaths, [])
    : [...fallback.noIndexExactPaths]
  const nextNoIndexPrefixes = hasOwn(source, 'noIndexPrefixes')
    ? toStringArray(source.noIndexPrefixes, [])
    : [...fallback.noIndexPrefixes]

  return {
    siteName: nextSiteName,
    siteUrl: nextSiteUrl,
    defaultDescription: nextDefaultDescription,
    defaultImage: nextDefaultImage,
    noIndexExactPaths: nextNoIndexExactPaths,
    noIndexPrefixes: nextNoIndexPrefixes,
  }
}

const PLATFORM_INTEGRATION_DEFINITIONS: ReadonlyArray<PlatformIntegrationDefinition> = [
  {
    key: 'analytics_posthog',
    label: 'PostHog',
    description: 'Tracking principal de analytics no cliente.',
    category: 'analytics',
    defaultEnabled: parseBooleanEnv('POSTHOG_ENABLED', Boolean(DEFAULT_POSTHOG_KEY)),
    defaultConfig: DEFAULT_POSTHOG_CONFIG,
    normalize: (raw, fallback) =>
      normalizeAnalyticsPosthogConfig(raw, fallback as AnalyticsPosthogConfig) as unknown as Record<
        string,
        unknown
      >,
  },
  {
    key: 'analytics_google_analytics',
    label: 'Google Analytics',
    description: 'Measurement ID para GA4 (pre-release).',
    category: 'analytics',
    defaultEnabled: parseBooleanEnv('GOOGLE_ANALYTICS_ENABLED', Boolean(DEFAULT_GA_MEASUREMENT_ID)),
    defaultConfig: DEFAULT_GOOGLE_ANALYTICS_CONFIG,
    normalize: (raw, fallback) =>
      normalizeAnalyticsGoogleAnalyticsConfig(
        raw,
        fallback as AnalyticsGoogleAnalyticsConfig
      ) as unknown as Record<string, unknown>,
  },
  {
    key: 'analytics_google_tag_manager',
    label: 'Google Tag Manager',
    description: 'Container ID para GTM (pre-release).',
    category: 'analytics',
    defaultEnabled: parseBooleanEnv('GOOGLE_TAG_MANAGER_ENABLED', Boolean(DEFAULT_GTM_CONTAINER_ID)),
    defaultConfig: DEFAULT_GOOGLE_TAG_MANAGER_CONFIG,
    normalize: (raw, fallback) =>
      normalizeAnalyticsGoogleTagManagerConfig(
        raw,
        fallback as AnalyticsGoogleTagManagerConfig
      ) as unknown as Record<string, unknown>,
  },
  {
    key: 'analytics_meta_pixel',
    label: 'Meta Pixel',
    description: 'Pixel ID para tracking de conversao (pre-release).',
    category: 'analytics',
    defaultEnabled: parseBooleanEnv('META_PIXEL_ENABLED', Boolean(DEFAULT_META_PIXEL_ID)),
    defaultConfig: DEFAULT_META_PIXEL_CONFIG,
    normalize: (raw, fallback) =>
      normalizeAnalyticsMetaPixelConfig(raw, fallback as AnalyticsMetaPixelConfig) as unknown as Record<
        string,
        unknown
      >,
  },
  {
    key: 'captcha_client',
    label: 'Captcha cliente',
    description: 'Provider e site key usados no login/registo.',
    category: 'security',
    defaultEnabled: parseBooleanEnv('CAPTCHA_CLIENT_ENABLED', DEFAULT_CAPTCHA_PROVIDER !== 'disabled'),
    defaultConfig: DEFAULT_CAPTCHA_CONFIG,
    normalize: (raw, fallback) =>
      normalizeCaptchaClientConfig(raw, fallback as CaptchaClientConfig) as unknown as Record<
        string,
        unknown
      >,
  },
  {
    key: 'seo_defaults',
    label: 'SEO default',
    description: 'Metadados base de SEO para rotas publicas.',
    category: 'seo',
    defaultEnabled: true,
    defaultConfig: DEFAULT_SEO_CONFIG,
    normalize: (raw, fallback) =>
      normalizeSeoDefaultsConfig(raw, fallback as SeoDefaultsConfig) as unknown as Record<
        string,
        unknown
      >,
  },
]

const getIntegrationDefinition = (key: PlatformIntegrationKey): PlatformIntegrationDefinition | null =>
  PLATFORM_INTEGRATION_DEFINITIONS.find((item) => item.key === key) ?? null

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new PlatformIntegrationConfigServiceError(400, `${fieldName} invalido.`)
  }
  return new mongoose.Types.ObjectId(rawId)
}

export const isValidPlatformIntegrationKey = (value: unknown): value is PlatformIntegrationKey =>
  typeof value === 'string' && PLATFORM_INTEGRATION_KEYS.includes(value as PlatformIntegrationKey)

export class PlatformIntegrationConfigServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class PlatformIntegrationConfigService {
  async listIntegrations() {
    const lookup = await this.getIntegrationLookup()

    return {
      generatedAt: new Date(),
      items: PLATFORM_INTEGRATION_DEFINITIONS.map((definition) =>
        this.mapIntegration(definition, lookup.get(definition.key) ?? null)
      ),
    }
  }

  async updateIntegration(input: UpdatePlatformIntegrationInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    if (!isValidPlatformIntegrationKey(input.key)) {
      throw new PlatformIntegrationConfigServiceError(400, 'integrationKey invalida.')
    }

    const definition = getIntegrationDefinition(input.key)
    if (!definition) {
      throw new PlatformIntegrationConfigServiceError(400, 'integrationKey invalida.')
    }

    const reason = trimReason(input.reason)
    if (!reason) {
      throw new PlatformIntegrationConfigServiceError(400, 'reason e obrigatorio.')
    }

    const currentLookup = await this.getIntegrationLookup()
    const currentItem = this.mapIntegration(definition, currentLookup.get(definition.key) ?? null)

    const nextEnabled = typeof input.enabled === 'boolean' ? input.enabled : currentItem.enabled
    let nextConfig = currentItem.config
    if (typeof input.config !== 'undefined') {
      if (!isRecord(input.config)) {
        throw new PlatformIntegrationConfigServiceError(400, 'Campo config invalido.')
      }
      nextConfig = definition.normalize(
        {
          ...currentItem.config,
          ...input.config,
        },
        currentItem.config
      )
    }

    const note = trimReason(input.note)

    const changed =
      nextEnabled !== currentItem.enabled ||
      JSON.stringify(nextConfig) !== JSON.stringify(currentItem.config)

    if (!changed) {
      throw new PlatformIntegrationConfigServiceError(409, 'Sem alteracoes validas para aplicar.')
    }

    const updated = (await PlatformIntegrationConfig.findOneAndUpdate(
      { key: input.key },
      {
        $set: {
          enabled: nextEnabled,
          config: nextConfig,
          reason,
          note,
          updatedBy: actorId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate('updatedBy', 'name username email role')
      .lean()) as (Partial<IPlatformIntegrationConfig> & {
      updatedBy?: PlatformIntegrationActor | null
    }) | null

    if (!updated) {
      throw new PlatformIntegrationConfigServiceError(500, 'Erro ao atualizar integracao de plataforma.')
    }

    return this.mapIntegration(definition, updated)
  }

  async getPublicRuntimeConfig(): Promise<PlatformRuntimeConfigResponse> {
    const lookup = await this.getIntegrationLookup()

    const posthogItem = this.mapIntegration(
      getIntegrationDefinition('analytics_posthog')!,
      lookup.get('analytics_posthog') ?? null
    )
    const gaItem = this.mapIntegration(
      getIntegrationDefinition('analytics_google_analytics')!,
      lookup.get('analytics_google_analytics') ?? null
    )
    const gtmItem = this.mapIntegration(
      getIntegrationDefinition('analytics_google_tag_manager')!,
      lookup.get('analytics_google_tag_manager') ?? null
    )
    const metaPixelItem = this.mapIntegration(
      getIntegrationDefinition('analytics_meta_pixel')!,
      lookup.get('analytics_meta_pixel') ?? null
    )
    const captchaItem = this.mapIntegration(
      getIntegrationDefinition('captcha_client')!,
      lookup.get('captcha_client') ?? null
    )
    const seoItem = this.mapIntegration(
      getIntegrationDefinition('seo_defaults')!,
      lookup.get('seo_defaults') ?? null
    )

    const posthogConfig = normalizeAnalyticsPosthogConfig(posthogItem.config, DEFAULT_POSTHOG_CONFIG)
    const gaConfig = normalizeAnalyticsGoogleAnalyticsConfig(
      gaItem.config,
      DEFAULT_GOOGLE_ANALYTICS_CONFIG
    )
    const gtmConfig = normalizeAnalyticsGoogleTagManagerConfig(
      gtmItem.config,
      DEFAULT_GOOGLE_TAG_MANAGER_CONFIG
    )
    const metaPixelConfig = normalizeAnalyticsMetaPixelConfig(metaPixelItem.config, DEFAULT_META_PIXEL_CONFIG)
    const captchaConfig = normalizeCaptchaClientConfig(captchaItem.config, DEFAULT_CAPTCHA_CONFIG)
    const seoConfig = normalizeSeoDefaultsConfig(seoItem.config, DEFAULT_SEO_CONFIG)

    return {
      generatedAt: new Date(),
      analytics: {
        posthog: {
          enabled: posthogItem.enabled,
          key: posthogConfig.key,
          host: posthogConfig.host,
        },
        googleAnalytics: {
          enabled: gaItem.enabled,
          measurementId: gaConfig.measurementId,
        },
        googleTagManager: {
          enabled: gtmItem.enabled,
          containerId: gtmConfig.containerId,
        },
        metaPixel: {
          enabled: metaPixelItem.enabled,
          pixelId: metaPixelConfig.pixelId,
        },
      },
      captcha: {
        enabled: captchaItem.enabled,
        provider: captchaConfig.provider,
        siteKey: captchaConfig.siteKey,
      },
      seo: seoConfig,
    }
  }

  private async getIntegrationLookup() {
    const rows = (await PlatformIntegrationConfig.find({
      key: { $in: PLATFORM_INTEGRATION_KEYS },
    })
      .populate('updatedBy', 'name username email role')
      .lean()) as Array<Partial<IPlatformIntegrationConfig> & { updatedBy?: PlatformIntegrationActor | null }>

    const lookup = new Map<
      PlatformIntegrationKey,
      Partial<IPlatformIntegrationConfig> & { updatedBy?: PlatformIntegrationActor | null }
    >()
    for (const row of rows) {
      if (isValidPlatformIntegrationKey(row.key)) {
        lookup.set(row.key, row)
      }
    }

    return lookup
  }

  private mapIntegration(
    definition: PlatformIntegrationDefinition,
    row: (Partial<IPlatformIntegrationConfig> & { updatedBy?: PlatformIntegrationActor | null }) | null
  ): PlatformIntegrationConfigItem {
    const normalizedConfig = definition.normalize(row?.config, definition.defaultConfig)

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      category: definition.category,
      enabled: typeof row?.enabled === 'boolean' ? row.enabled : definition.defaultEnabled,
      config: normalizedConfig,
      reason: typeof row?.reason === 'string' ? row.reason : null,
      note: typeof row?.note === 'string' ? row.note : null,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    }
  }
}

export const platformIntegrationConfigService = new PlatformIntegrationConfigService()
