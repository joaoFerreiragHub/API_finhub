import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { getRateLimiterRuntimeState } from '../middlewares/rateLimiter'
import { getSentryRuntimeState } from '../observability/sentry'
import { uploadService } from '../services/upload.service'
import { getLoggerRuntimeSnapshot } from '../utils/logger'

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

/**
 * GET /api/platform/monitoring/logging
 */
export const getPublicLoggingMonitoring = (_req: Request, res: Response) => {
  const snapshot = getLoggerRuntimeSnapshot()
  return res.status(200).json({
    status: 'ok',
    logging: snapshot,
    timestamp: new Date().toISOString(),
  })
}

