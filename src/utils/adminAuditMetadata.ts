export const ADMIN_AUDIT_METADATA_MAX_BYTES = 8 * 1024
const ADMIN_AUDIT_METADATA_PREVIEW_CHARS = 512

const metadataJsonReplacer = (_key: string, value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    }
  }
  return value
}

const safeSerialize = (value: unknown): string | null => {
  try {
    return JSON.stringify(value, metadataJsonReplacer)
  } catch (_error) {
    return null
  }
}

const toUtf8Bytes = (value: string): number => Buffer.byteLength(value, 'utf8')

export const isAdminAuditMetadataWithinLimit = (value: unknown): boolean => {
  if (value === null || typeof value === 'undefined') return true

  const serialized = safeSerialize(value)
  if (!serialized) return false

  return toUtf8Bytes(serialized) <= ADMIN_AUDIT_METADATA_MAX_BYTES
}

const toNormalizedObject = (serialized: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(serialized) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch (_error) {
    return null
  }
}

export const normalizeAdminAuditMetadata = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const serialized = safeSerialize(value)
  if (!serialized) {
    return {
      _invalidMetadata: true,
      _reason: 'non-serializable',
      _maxBytes: ADMIN_AUDIT_METADATA_MAX_BYTES,
    }
  }

  const byteLength = toUtf8Bytes(serialized)
  if (byteLength <= ADMIN_AUDIT_METADATA_MAX_BYTES) {
    return toNormalizedObject(serialized)
  }

  return {
    _truncated: true,
    _originalBytes: byteLength,
    _maxBytes: ADMIN_AUDIT_METADATA_MAX_BYTES,
    preview: serialized.slice(0, ADMIN_AUDIT_METADATA_PREVIEW_CHARS),
  }
}
