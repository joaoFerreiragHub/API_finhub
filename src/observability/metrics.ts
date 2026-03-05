import { createHash } from 'crypto'

interface RequestMetric {
  count: number
  totalDurationMs: number
}

const requestMetrics = new Map<string, RequestMetric>()
const rateLimitExceededMetrics = new Map<string, number>()
let totalRequests = 0
let rateLimiterBackendMode: 'memory' | 'redis' = 'memory'
let rateLimiterBackendReason = 'startup_default'

const hashRequesterKey = (requesterKey: string): string =>
  createHash('sha256').update(requesterKey).digest('hex').slice(0, 12)

const getRequesterKeyType = (requesterKey: string): 'user' | 'ip' | 'unknown' => {
  if (requesterKey.startsWith('user:')) {
    return 'user'
  }

  if (requesterKey.startsWith('ip:')) {
    return 'ip'
  }

  return 'unknown'
}

export const setRateLimiterBackendMode = (
  mode: 'memory' | 'redis',
  reason: string
) => {
  rateLimiterBackendMode = mode
  rateLimiterBackendReason = reason
}

export const recordRateLimitExceededMetric = (
  limiterName: string,
  requesterKey: string
) => {
  const keyType = getRequesterKeyType(requesterKey)
  const keyHash = hashRequesterKey(requesterKey)
  const metricKey = `${limiterName}|${keyType}|${keyHash}`

  const currentCount = rateLimitExceededMetrics.get(metricKey) ?? 0
  rateLimitExceededMetrics.set(metricKey, currentCount + 1)
}

const getRateLimitExceededEntries = () =>
  Array.from(rateLimitExceededMetrics.entries()).map(([key, count]) => {
    const [limiterName, keyType, keyHash] = key.split('|')
    return {
      limiterName,
      keyType,
      keyHash,
      blockedCount: count,
    }
  })

export const recordRequestMetric = (
  method: string,
  route: string,
  statusCode: number,
  durationMs: number
) => {
  totalRequests += 1
  const key = `${method}|${route}|${statusCode}`
  const current = requestMetrics.get(key) || { count: 0, totalDurationMs: 0 }

  current.count += 1
  current.totalDurationMs += durationMs
  requestMetrics.set(key, current)
}

export const getMetricsSnapshot = () => {
  const entries = Array.from(requestMetrics.entries()).map(([key, value]) => {
    const [method, route, statusCode] = key.split('|')
    return {
      method,
      route,
      statusCode: Number(statusCode),
      count: value.count,
      avgDurationMs: value.count > 0 ? value.totalDurationMs / value.count : 0,
    }
  })

  return {
    totalRequests,
    byRoute: entries,
    rateLimiter: {
      backend: {
        mode: rateLimiterBackendMode,
        reason: rateLimiterBackendReason,
      },
      blocked: getRateLimitExceededEntries(),
    },
    generatedAt: new Date().toISOString(),
  }
}

export const renderPrometheusMetrics = () => {
  const lines: string[] = []
  lines.push('# HELP finhub_http_requests_total Total HTTP requests')
  lines.push('# TYPE finhub_http_requests_total counter')

  for (const [key, value] of requestMetrics.entries()) {
    const [method, route, statusCode] = key.split('|')
    const labels = `method="${method}",route="${route}",status="${statusCode}"`
    lines.push(`finhub_http_requests_total{${labels}} ${value.count}`)

    const avgDuration = value.count > 0 ? value.totalDurationMs / value.count : 0
    lines.push(
      `finhub_http_request_duration_ms_avg{${labels}} ${avgDuration.toFixed(2)}`
    )
  }

  lines.push(
    '# HELP finhub_rate_limiter_backend_info Active rate limiter backend mode'
  )
  lines.push('# TYPE finhub_rate_limiter_backend_info gauge')
  lines.push(
    `finhub_rate_limiter_backend_info{mode="${rateLimiterBackendMode}",reason="${rateLimiterBackendReason}"} 1`
  )

  lines.push(
    '# HELP finhub_rate_limit_exceeded_total Total requests blocked by rate limiter'
  )
  lines.push('# TYPE finhub_rate_limit_exceeded_total counter')

  for (const [key, value] of rateLimitExceededMetrics.entries()) {
    const [limiterName, keyType, keyHash] = key.split('|')
    lines.push(
      `finhub_rate_limit_exceeded_total{limiter="${limiterName}",key_type="${keyType}",key_hash="${keyHash}"} ${value}`
    )
  }

  return `${lines.join('\n')}\n`
}
