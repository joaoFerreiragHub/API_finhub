import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { getRateLimiterRuntimeState } from '../middlewares/rateLimiter'
import { getSentryRuntimeState } from '../observability/sentry'
import { uploadService } from '../services/upload.service'

const resolveMongoReady = (): boolean => mongoose.connection.readyState === 1

/**
 * GET /api/platform/monitoring/status
 */
export const getPublicMonitoringStatus = (_req: Request, res: Response) => {
  const mongoReady = resolveMongoReady()
  const rateLimiterState = getRateLimiterRuntimeState()
  const uploadState = uploadService.getRuntimeState()
  const sentryState = getSentryRuntimeState()

  const ready =
    mongoReady &&
    (rateLimiterState.activeMode === 'redis' || rateLimiterState.memoryFallbackAllowed === true)

  const statusCode = ready ? 200 : 503

  return res.status(statusCode).json({
    status: ready ? 'ready' : 'degraded',
    uptimeSeconds: process.uptime(),
    checks: {
      mongoReady,
      rateLimiter: rateLimiterState,
      uploadStorage: uploadState,
      sentry: sentryState,
    },
    timestamp: new Date().toISOString(),
  })
}

