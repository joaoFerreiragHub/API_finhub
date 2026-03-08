import express, { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import path from 'path'
import mongoose from 'mongoose'
import routes from './routes'
import { withRequestContext } from './middlewares/requestContext'
import { requestLogger } from './middlewares/requestLogger'
import { corsMiddleware } from './middlewares/cors'
import { getMetricsSnapshot, renderPrometheusMetrics } from './observability/metrics'
import { captureException } from './observability/sentry'
import { registerSocialEventHandlers } from './events/registerSocialEventHandlers'
import { uploadService } from './services/upload.service'
import { logError } from './utils/logger'
import { resolveHttpJsonBodyLimit } from './config/runtimeSecurity'

const jsonBodyLimit = resolveHttpJsonBodyLimit()

const app = express()

registerSocialEventHandlers()

app.use(corsMiddleware)
app.use(helmet())
app.use(withRequestContext)
app.use(requestLogger)
app.use(express.json({ limit: jsonBodyLimit }))
app.use(express.urlencoded({ extended: true, limit: jsonBodyLimit }))
if (uploadService.getRuntimeState().storageProvider === 'local') {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
}
app.use('/openapi', express.static(path.join(process.cwd(), 'openapi')))

app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

app.get('/readyz', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1
  const statusCode = mongoReady ? 200 : 503
  res.status(statusCode).json({
    status: mongoReady ? 'ready' : 'not_ready',
    mongoReady,
    timestamp: new Date().toISOString(),
  })
})

app.get('/metrics', (_req, res) => {
  res.setHeader('content-type', 'text/plain; version=0.0.4')
  res.status(200).send(renderPrometheusMetrics())
})

app.get('/metrics.json', (_req, res) => {
  res.status(200).json(getMetricsSnapshot())
})

app.use('/api', routes)

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const statusCandidate =
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined
  const statusCode =
    typeof statusCandidate === 'number' && statusCandidate >= 400 && statusCandidate < 600
      ? statusCandidate
      : 500

  if (statusCode >= 500) {
    const authReq = req as Request & {
      user?: {
        id?: string
        _id?: unknown
      }
    }
    const userId =
      authReq.user?.id ||
      (authReq.user?._id !== undefined && authReq.user?._id !== null
        ? String(authReq.user._id)
        : undefined)

    captureException(error, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      userId,
      statusCode,
    })

    logError('http_unhandled_error', error, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
    })
  }

  const errorMessage =
    statusCode >= 500
      ? 'Erro interno do servidor.'
      : error instanceof Error
        ? error.message
        : 'Pedido invalido.'

  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: errorMessage,
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  })
})

export default app
