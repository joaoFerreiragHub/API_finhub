import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import mongoose from 'mongoose'
import routes from './routes'
import { withRequestContext } from './middlewares/requestContext'
import { requestLogger } from './middlewares/requestLogger'
import { getMetricsSnapshot, renderPrometheusMetrics } from './observability/metrics'
import { registerSocialEventHandlers } from './events/registerSocialEventHandlers'

const app = express()

registerSocialEventHandlers()

app.use(cors())
app.use(helmet())
app.use(withRequestContext)
app.use(requestLogger)
app.use(express.json())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
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

export default app
