import { ContentSourceType, ContentType } from '../models/BaseContent'
import { logInfo, logWarn } from '../utils/logger'

export type ExternalProviderKey =
  | 'youtube'
  | 'spotify'
  | 'instagram'
  | 'tiktok'
  | 'vimeo'
  | 'soundcloud'
  | 'generic'

export type ExternalTypeHint = 'video' | 'audio' | 'post' | 'unknown'
export type SuggestedExternalContentType = ContentType | 'reel'

export interface ExternalImportMetadata {
  title: string
  description: string
  thumbnailUrl: string | null
  authorName: string | null
  authorUrl: string | null
  durationSeconds: number | null
  embedHtml: string | null
  width: number | null
  height: number | null
}

export interface ExternalImportDraft {
  title: string
  description: string
  content: string
  coverImage: string | null
  thumbnail: string | null
  sourceType: ContentSourceType
  sourceUrl: string
  tags: string[]
  contentType: SuggestedExternalContentType
}

export interface ExternalImportResult {
  sourceType: ContentSourceType
  provider: ExternalProviderKey
  providerDisplayName: string
  url: string
  normalizedUrl: string
  contentTypeHint: ExternalTypeHint
  suggestedContentType: SuggestedExternalContentType
  metadata: ExternalImportMetadata
  suggestedDraft: ExternalImportDraft
  warnings: string[]
  cache: {
    hit: boolean
    ttlSeconds: number
  }
}

export interface ExternalImportInput {
  url: string
  requestedContentType?: SuggestedExternalContentType
}

interface OEmbedResponse {
  title?: unknown
  author_name?: unknown
  author_url?: unknown
  provider_name?: unknown
  provider_url?: unknown
  type?: unknown
  width?: unknown
  height?: unknown
  html?: unknown
  thumbnail_url?: unknown
  description?: unknown
  duration?: unknown
}

interface ExternalProviderDefinition {
  key: ExternalProviderKey
  displayName: string
  typeHint: ExternalTypeHint
  hosts: string[]
  hasOEmbed: boolean
  requiresToken?: boolean
}

interface ExternalMetadataCacheEntry {
  expiresAt: number
  value: Omit<ExternalImportResult, 'cache'>
}

const SUPPORTED_PROVIDERS: ExternalProviderDefinition[] = [
  {
    key: 'youtube',
    displayName: 'YouTube',
    typeHint: 'video',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
    hasOEmbed: true,
  },
  {
    key: 'spotify',
    displayName: 'Spotify',
    typeHint: 'audio',
    hosts: ['open.spotify.com', 'spotify.com'],
    hasOEmbed: true,
  },
  {
    key: 'instagram',
    displayName: 'Instagram',
    typeHint: 'post',
    hosts: ['instagram.com', 'www.instagram.com'],
    hasOEmbed: true,
    requiresToken: true,
  },
  {
    key: 'tiktok',
    displayName: 'TikTok',
    typeHint: 'video',
    hosts: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
    hasOEmbed: true,
  },
  {
    key: 'vimeo',
    displayName: 'Vimeo',
    typeHint: 'video',
    hosts: ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'],
    hasOEmbed: true,
  },
  {
    key: 'soundcloud',
    displayName: 'SoundCloud',
    typeHint: 'audio',
    hosts: ['soundcloud.com', 'www.soundcloud.com'],
    hasOEmbed: true,
  },
]

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
  'si',
])

const CACHE_MAX_ENTRIES = 500

const toPositiveInt = (
  rawValue: string | undefined,
  fallback: number,
  min: number,
  max: number
): number => {
  if (!rawValue) return fallback
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.round(parsed)
  if (rounded < min || rounded > max) return fallback
  return rounded
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

const toReadableSlug = (input: string): string => {
  const cleaned = input
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return ''

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase())
}

const resolveFallbackTitle = (normalizedUrl: string): string => {
  try {
    const parsed = new URL(normalizedUrl)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const lastPart = parts.length > 0 ? decodeURIComponent(parts[parts.length - 1]) : ''
    const readable = toReadableSlug(lastPart)
    if (readable) {
      return readable
    }
    return `Conteudo externo (${parsed.hostname})`
  } catch {
    return 'Conteudo externo'
  }
}

const ensureValidHttpUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    throw new Error('URL invalida: vazia')
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('URL invalida: formato nao reconhecido')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL invalida: apenas http/https sao suportados')
  }

  parsed.hash = ''
  for (const param of Array.from(parsed.searchParams.keys())) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) {
      parsed.searchParams.delete(param)
    }
  }

  // Remove barra final para estabilidade de cache (exceto raiz).
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  }

  return parsed.toString()
}

const detectProvider = (normalizedUrl: string): ExternalProviderDefinition => {
  try {
    const hostname = new URL(normalizedUrl).hostname.toLowerCase()
    for (const provider of SUPPORTED_PROVIDERS) {
      if (provider.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
        return provider
      }
    }
  } catch {
    // fallback below
  }

  return {
    key: 'generic',
    displayName: 'Generic',
    typeHint: 'unknown',
    hosts: [],
    hasOEmbed: false,
  }
}

const extractYouTubeId = (normalizedUrl: string): string | null => {
  try {
    const url = new URL(normalizedUrl)
    const hostname = url.hostname.toLowerCase()

    if (hostname.includes('youtu.be')) {
      const candidate = url.pathname.split('/').filter(Boolean)[0] || ''
      return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null
    }

    if (hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v')
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) {
        return v
      }

      const pathMatch = url.pathname.match(/\/(embed|shorts)\/([A-Za-z0-9_-]{11})/)
      if (pathMatch?.[2]) {
        return pathMatch[2]
      }
    }
  } catch {
    // ignore
  }

  return null
}

const resolveFallbackThumbnail = (
  provider: ExternalProviderDefinition,
  normalizedUrl: string
): string | null => {
  if (provider.key === 'youtube') {
    const videoId = extractYouTubeId(normalizedUrl)
    if (videoId) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    }
  }

  return null
}

const resolveSuggestedContentType = (
  hint: ExternalTypeHint,
  requested?: SuggestedExternalContentType
): SuggestedExternalContentType => {
  if (requested) {
    return requested
  }

  if (hint === 'video') return 'video'
  if (hint === 'audio') return 'podcast'
  if (hint === 'post') return 'article'
  return 'article'
}

const buildOEmbedEndpoint = (
  provider: ExternalProviderDefinition,
  normalizedUrl: string,
  instagramToken: string
): string | null => {
  const encodedUrl = encodeURIComponent(normalizedUrl)

  if (provider.key === 'youtube') {
    return `https://www.youtube.com/oembed?url=${encodedUrl}&format=json`
  }

  if (provider.key === 'spotify') {
    return `https://open.spotify.com/oembed?url=${encodedUrl}&format=json`
  }

  if (provider.key === 'tiktok') {
    return `https://www.tiktok.com/oembed?url=${encodedUrl}`
  }

  if (provider.key === 'vimeo') {
    return `https://vimeo.com/api/oembed.json?url=${encodedUrl}`
  }

  if (provider.key === 'soundcloud') {
    return `https://soundcloud.com/oembed?url=${encodedUrl}&format=json`
  }

  if (provider.key === 'instagram') {
    if (!instagramToken) {
      return null
    }
    return `https://graph.facebook.com/v22.0/instagram_oembed?url=${encodedUrl}&access_token=${encodeURIComponent(instagramToken)}&omitscript=true`
  }

  return null
}

const mapOEmbedToMetadata = (
  raw: OEmbedResponse,
  fallbackTitle: string,
  fallbackThumbnail: string | null,
  fallbackDescription: string
): ExternalImportMetadata => {
  const title = asString(raw.title) || fallbackTitle
  const description = asString(raw.description) || fallbackDescription
  const thumbnailUrl = asString(raw.thumbnail_url) || fallbackThumbnail
  const width = asNumber(raw.width)
  const height = asNumber(raw.height)
  const durationSeconds = asNumber(raw.duration)

  return {
    title,
    description,
    thumbnailUrl,
    authorName: asString(raw.author_name),
    authorUrl: asString(raw.author_url),
    durationSeconds,
    embedHtml: asString(raw.html),
    width,
    height,
  }
}

const buildFallbackMetadata = (
  provider: ExternalProviderDefinition,
  normalizedUrl: string
): ExternalImportMetadata => ({
  title: resolveFallbackTitle(normalizedUrl),
  description: `Conteudo importado de ${provider.displayName}.`,
  thumbnailUrl: resolveFallbackThumbnail(provider, normalizedUrl),
  authorName: null,
  authorUrl: null,
  durationSeconds: null,
  embedHtml: null,
  width: null,
  height: null,
})

const fetchJsonWithTimeout = async (url: string, timeoutMs: number): Promise<OEmbedResponse> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json, text/json;q=0.9, */*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const json = (await response.json()) as OEmbedResponse
    return json
  } finally {
    clearTimeout(timeoutId)
  }
}

export class ExternalContentService {
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly instagramToken: string
  private readonly metadataCache = new Map<string, ExternalMetadataCacheEntry>()

  constructor() {
    const timeoutMs = toPositiveInt(process.env.EXTERNAL_CONTENT_OEMBED_TIMEOUT_MS, 7000, 1000, 30000)
    const cacheTtlSeconds = toPositiveInt(
      process.env.EXTERNAL_CONTENT_IMPORT_CACHE_TTL_SECONDS,
      900,
      30,
      86400
    )

    this.timeoutMs = timeoutMs
    this.cacheTtlMs = cacheTtlSeconds * 1000
    this.instagramToken = (process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN ?? '').trim()
  }

  getSupportedProviders() {
    return SUPPORTED_PROVIDERS.map((provider) => ({
      key: provider.key,
      displayName: provider.displayName,
      typeHint: provider.typeHint,
      oEmbed: {
        supported: provider.hasOEmbed,
        requiresToken: Boolean(provider.requiresToken),
        configured: provider.requiresToken ? this.instagramToken.length > 0 : provider.hasOEmbed,
      },
    }))
  }

  async importFromUrl(input: ExternalImportInput): Promise<ExternalImportResult> {
    const normalizedUrl = ensureValidHttpUrl(input.url)
    const provider = detectProvider(normalizedUrl)
    const cacheKey = `${normalizedUrl}::${input.requestedContentType ?? ''}`
    const now = Date.now()

    this.pruneCache(now)

    const cached = this.metadataCache.get(cacheKey)
    if (cached && cached.expiresAt > now) {
      const ttlSeconds = Math.max(0, Math.round((cached.expiresAt - now) / 1000))
      return {
        ...cached.value,
        cache: {
          hit: true,
          ttlSeconds,
        },
      }
    }

    const warnings: string[] = []
    let metadata = buildFallbackMetadata(provider, normalizedUrl)

    if (provider.key === 'generic') {
      warnings.push('Provider nao identificado. Foi aplicado fallback de metadata basica.')
    }

    if (provider.hasOEmbed) {
      const endpoint = buildOEmbedEndpoint(provider, normalizedUrl, this.instagramToken)

      if (!endpoint) {
        warnings.push('oEmbed indisponivel para este provider sem configuracao adicional.')
      } else {
        try {
          const oembed = await fetchJsonWithTimeout(endpoint, this.timeoutMs)
          metadata = mapOEmbedToMetadata(
            oembed,
            metadata.title,
            metadata.thumbnailUrl,
            metadata.description
          )

          logInfo('external_content_oembed_import_success', {
            provider: provider.key,
            normalizedUrl,
          })
        } catch (error) {
          warnings.push('Nao foi possivel obter metadata via oEmbed. Foi aplicado fallback local.')
          logWarn('external_content_oembed_import_fallback', {
            provider: provider.key,
            normalizedUrl,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    const suggestedContentType = resolveSuggestedContentType(provider.typeHint, input.requestedContentType)
    const sourceType: ContentSourceType = 'external_content'

    const suggestedDraft: ExternalImportDraft = {
      title: metadata.title,
      description: metadata.description,
      content: metadata.embedHtml || `Fonte externa: ${normalizedUrl}`,
      coverImage: metadata.thumbnailUrl,
      thumbnail: metadata.thumbnailUrl,
      sourceType,
      sourceUrl: normalizedUrl,
      tags: provider.key === 'generic' ? [] : [provider.key],
      contentType: suggestedContentType,
    }

    const resultWithoutCache = {
      sourceType,
      provider: provider.key,
      providerDisplayName: provider.displayName,
      url: input.url,
      normalizedUrl,
      contentTypeHint: provider.typeHint,
      suggestedContentType,
      metadata,
      suggestedDraft,
      warnings,
    }

    this.metadataCache.set(cacheKey, {
      expiresAt: now + this.cacheTtlMs,
      value: resultWithoutCache,
    })

    this.enforceCacheLimit()

    return {
      ...resultWithoutCache,
      cache: {
        hit: false,
        ttlSeconds: Math.round(this.cacheTtlMs / 1000),
      },
    }
  }

  private pruneCache(now: number) {
    for (const [key, entry] of this.metadataCache.entries()) {
      if (entry.expiresAt <= now) {
        this.metadataCache.delete(key)
      }
    }
  }

  private enforceCacheLimit() {
    if (this.metadataCache.size <= CACHE_MAX_ENTRIES) {
      return
    }

    const overflow = this.metadataCache.size - CACHE_MAX_ENTRIES
    let removed = 0
    for (const [key] of this.metadataCache) {
      this.metadataCache.delete(key)
      removed += 1
      if (removed >= overflow) {
        break
      }
    }

    logWarn('external_content_cache_pruned', {
      removed,
      cacheSize: this.metadataCache.size,
      maxEntries: CACHE_MAX_ENTRIES,
    })
  }
}

export const externalContentService = new ExternalContentService()