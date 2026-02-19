interface RequestMetric {
  count: number
  totalDurationMs: number
}

const requestMetrics = new Map<string, RequestMetric>()
let totalRequests = 0

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

  return `${lines.join('\n')}\n`
}
