const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')
const ENV_EXAMPLE_PATH = path.join(REPO_ROOT, '.env.example')

const REQUIRED_KEYS = [
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'CORS_ALLOW_ALL',
  'CORS_ALLOW_CREDENTIALS',
  'HTTP_JSON_BODY_LIMIT',
  'LOG_LEVEL',
  'LOG_PATCH_CONSOLE',
]

const MAX_HTTP_JSON_BODY_LIMIT_BYTES = 2 * 1024 * 1024

const parseByteSize = (raw) => {
  const normalized = String(raw || '').trim().toLowerCase()
  const match = normalized.match(/^(\d+)(b|kb|mb)?$/)
  if (!match) return null

  const numeric = Number.parseInt(match[1], 10)
  if (!Number.isFinite(numeric) || numeric <= 0) return null

  const unit = match[2] || 'b'
  if (unit === 'kb') return numeric * 1024
  if (unit === 'mb') return numeric * 1024 * 1024
  return numeric
}

const fail = (errors) => {
  const lines = Array.isArray(errors) ? errors : [errors]
  console.error('[security-smoke] FAIL')
  for (const line of lines) {
    console.error(`- ${line}`)
  }
  process.exit(1)
}

const parseDotEnvLike = (raw) => {
  const map = new Map()
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    map.set(key, value)
  }
  return map
}

const run = () => {
  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    fail(`Ficheiro em falta: ${path.relative(REPO_ROOT, ENV_EXAMPLE_PATH)}`)
  }

  const raw = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf8')
  const envMap = parseDotEnvLike(raw)
  const errors = []

  for (const key of REQUIRED_KEYS) {
    if (!envMap.has(key)) {
      errors.push(`Chave obrigatoria em falta no .env.example: ${key}`)
    }
  }

  const corsAllowAll = (envMap.get('CORS_ALLOW_ALL') || '').toLowerCase()
  if (corsAllowAll !== 'false') {
    errors.push('CORS_ALLOW_ALL deve ter default "false" no .env.example.')
  }

  const bodyLimitRaw = envMap.get('HTTP_JSON_BODY_LIMIT') || ''
  const bodyLimitBytes = parseByteSize(bodyLimitRaw)
  if (bodyLimitBytes === null) {
    errors.push('HTTP_JSON_BODY_LIMIT invalido no .env.example.')
  } else if (bodyLimitBytes > MAX_HTTP_JSON_BODY_LIMIT_BYTES) {
    errors.push('HTTP_JSON_BODY_LIMIT acima do baseline maximo (2mb) no .env.example.')
  }

  const jwtSecret = envMap.get('JWT_SECRET') || ''
  const jwtRefreshSecret = envMap.get('JWT_REFRESH_SECRET') || ''
  if (!jwtSecret.includes('change-in-production')) {
    errors.push('JWT_SECRET deve indicar explicitamente mudanca em producao no .env.example.')
  }
  if (!jwtRefreshSecret.includes('change-in-production')) {
    errors.push('JWT_REFRESH_SECRET deve indicar explicitamente mudanca em producao no .env.example.')
  }

  if (errors.length > 0) {
    fail(errors)
  }

  console.log('[security-smoke] OK: baseline de configuracao validado.')
}

run()
