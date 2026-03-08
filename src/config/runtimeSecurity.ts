type NodeEnv = 'development' | 'test' | 'staging' | 'production'

interface RuntimeSecuritySnapshot {
  nodeEnv: NodeEnv
  corsAllowAll: boolean
  corsAllowCredentials: boolean
  httpJsonBodyLimit: string
  httpJsonBodyLimitBytes: number | null
  hasFrontendUrl: boolean
  hasJwtSecret: boolean
  hasJwtRefreshSecret: boolean
  jwtSecretLength: number
  jwtRefreshSecretLength: number
}

const DEFAULT_HTTP_JSON_BODY_LIMIT = '1mb'
const MAX_PROD_HTTP_JSON_BODY_BYTES = 2 * 1024 * 1024
const MIN_PROD_SECRET_LENGTH = 32

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const resolveNodeEnv = (raw: string | undefined): NodeEnv => {
  const normalized = (raw ?? '').trim().toLowerCase()
  if (normalized === 'production') return 'production'
  if (normalized === 'staging') return 'staging'
  if (normalized === 'test') return 'test'
  return 'development'
}

const parseByteSize = (raw: string): number | null => {
  const normalized = raw.trim().toLowerCase()
  const match = normalized.match(/^(\d+)(b|kb|mb)?$/)
  if (!match) return null

  const numeric = Number.parseInt(match[1], 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return null

  const unit = match[2] ?? 'b'
  if (unit === 'kb') return numeric * 1024
  if (unit === 'mb') return numeric * 1024 * 1024
  return numeric
}

const isWeakSecret = (value: string): boolean => {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true

  return (
    normalized.includes('your-') ||
    normalized.includes('change-in-production') ||
    normalized.includes('min-32') ||
    normalized.includes('secret-key') ||
    normalized === 'changeme'
  )
}

export const resolveHttpJsonBodyLimit = (): string => {
  const raw = (process.env.HTTP_JSON_BODY_LIMIT ?? DEFAULT_HTTP_JSON_BODY_LIMIT).trim()
  return raw.length > 0 ? raw : DEFAULT_HTTP_JSON_BODY_LIMIT
}

export const getRuntimeSecuritySnapshot = (): RuntimeSecuritySnapshot => {
  const nodeEnv = resolveNodeEnv(process.env.NODE_ENV)
  const httpJsonBodyLimit = resolveHttpJsonBodyLimit()
  const jwtSecret = (process.env.JWT_SECRET ?? '').trim()
  const jwtRefreshSecret = (process.env.JWT_REFRESH_SECRET ?? '').trim()
  const frontendUrl = (process.env.FRONTEND_URL ?? '').trim()

  return {
    nodeEnv,
    corsAllowAll: parseBoolean(process.env.CORS_ALLOW_ALL, false),
    corsAllowCredentials: parseBoolean(process.env.CORS_ALLOW_CREDENTIALS, true),
    httpJsonBodyLimit,
    httpJsonBodyLimitBytes: parseByteSize(httpJsonBodyLimit),
    hasFrontendUrl: frontendUrl.length > 0,
    hasJwtSecret: jwtSecret.length > 0,
    hasJwtRefreshSecret: jwtRefreshSecret.length > 0,
    jwtSecretLength: jwtSecret.length,
    jwtRefreshSecretLength: jwtRefreshSecret.length,
  }
}

export const validateRuntimeSecurityConfig = () => {
  const snapshot = getRuntimeSecuritySnapshot()
  const errors: string[] = []

  if (!snapshot.hasJwtSecret) {
    errors.push('JWT_SECRET em falta.')
  }

  if (!snapshot.hasJwtRefreshSecret) {
    errors.push('JWT_REFRESH_SECRET em falta.')
  }

  if (snapshot.httpJsonBodyLimitBytes === null) {
    errors.push(
      `HTTP_JSON_BODY_LIMIT invalido ("${snapshot.httpJsonBodyLimit}"). Formatos aceites: 1mb, 512kb, 1048576.`
    )
  }

  if (snapshot.nodeEnv === 'production' || snapshot.nodeEnv === 'staging') {
    if (snapshot.corsAllowAll) {
      errors.push('CORS_ALLOW_ALL nao pode estar ativo em staging/producao.')
    }

    if (!snapshot.hasFrontendUrl) {
      errors.push('FRONTEND_URL obrigatorio em staging/producao.')
    }

    const jwtSecret = (process.env.JWT_SECRET ?? '').trim()
    const jwtRefreshSecret = (process.env.JWT_REFRESH_SECRET ?? '').trim()

    if (
      snapshot.jwtSecretLength < MIN_PROD_SECRET_LENGTH ||
      isWeakSecret(jwtSecret)
    ) {
      errors.push('JWT_SECRET fraco para staging/producao (minimo 32 chars e sem placeholder).')
    }

    if (
      snapshot.jwtRefreshSecretLength < MIN_PROD_SECRET_LENGTH ||
      isWeakSecret(jwtRefreshSecret)
    ) {
      errors.push(
        'JWT_REFRESH_SECRET fraco para staging/producao (minimo 32 chars e sem placeholder).'
      )
    }

    if (
      typeof snapshot.httpJsonBodyLimitBytes === 'number' &&
      snapshot.httpJsonBodyLimitBytes > MAX_PROD_HTTP_JSON_BODY_BYTES
    ) {
      errors.push(
        `HTTP_JSON_BODY_LIMIT acima do permitido para staging/producao (${MAX_PROD_HTTP_JSON_BODY_BYTES} bytes).`
      )
    }
  }

  if (errors.length > 0) {
    throw new Error(`Runtime security validation failed:\n- ${errors.join('\n- ')}`)
  }
}
