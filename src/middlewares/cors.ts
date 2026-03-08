import cors from 'cors'
import { logWarn } from '../utils/logger'

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0),
].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000']
const allowedOrigins = Array.from(new Set(configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins))
const allowAllOrigins = parseBoolean(process.env.CORS_ALLOW_ALL, false)
const allowCredentials = parseBoolean(process.env.CORS_ALLOW_CREDENTIALS, true)

export const corsMiddleware = cors({
  credentials: allowCredentials,
  origin: (origin, callback) => {
    if (allowAllOrigins || !origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    logWarn('cors_origin_denied', { origin })
    callback(null, false)
  },
})
