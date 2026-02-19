import { NextFunction, Request, Response } from 'express'
import { recordRequestMetric } from '../observability/metrics'
import { logInfo } from '../utils/logger'

const normalizeRoute = (req: Request) => {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`
  }
  return req.originalUrl.split('?')[0]
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = req.requestStartTimeMs || Date.now()

  logInfo('http_request_started', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userAgent: req.headers['user-agent'],
  })

  res.on('finish', () => {
    const durationMs = Date.now() - start
    const route = normalizeRoute(req)

    recordRequestMetric(req.method, route, res.statusCode, durationMs)
    logInfo('http_request_finished', {
      requestId: req.requestId,
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
    })
  })

  next()
}
