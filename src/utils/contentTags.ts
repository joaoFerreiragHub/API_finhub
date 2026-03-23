export const MAX_CONTENT_TAGS = 10
export const MAX_CONTENT_TAG_LENGTH = 50

export interface NormalizedTagsResult {
  valid: boolean
  value?: string[]
}

const normalizeSingleTag = (value: string): string => value.trim().toLowerCase()

export const normalizeTags = (tags: readonly string[]): string[] => {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const tag of tags) {
    const normalizedTag = normalizeSingleTag(tag)
    if (!normalizedTag) continue
    if (normalizedTag.length > MAX_CONTENT_TAG_LENGTH) continue
    if (seen.has(normalizedTag)) continue

    seen.add(normalizedTag)
    normalized.push(normalizedTag)

    if (normalized.length >= MAX_CONTENT_TAGS) {
      break
    }
  }

  return normalized
}

export const normalizeAndValidateTags = (
  rawTags: unknown,
  options: { maxTags?: number; maxTagLength?: number } = {}
): NormalizedTagsResult => {
  const maxTags = options.maxTags ?? MAX_CONTENT_TAGS
  const maxTagLength = options.maxTagLength ?? MAX_CONTENT_TAG_LENGTH

  if (!Array.isArray(rawTags)) {
    return { valid: false }
  }

  if (rawTags.length > maxTags) {
    return { valid: false }
  }

  const parsed: string[] = []
  const seen = new Set<string>()

  for (const item of rawTags) {
    if (typeof item !== 'string') {
      return { valid: false }
    }

    const normalizedTag = normalizeSingleTag(item)
    if (!normalizedTag || normalizedTag.length > maxTagLength) {
      return { valid: false }
    }

    if (seen.has(normalizedTag)) {
      continue
    }

    seen.add(normalizedTag)
    parsed.push(normalizedTag)
  }

  return {
    valid: true,
    value: parsed,
  }
}
