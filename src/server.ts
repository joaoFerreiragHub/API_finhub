import './config/env'
import { connectToDatabase } from './config/database'
import app from './app'
import { Server } from 'http'
import { initializeRateLimiter, shutdownRateLimiter } from './middlewares/rateLimiter'
import { captureException, flushSentry, initializeSentry } from './observability/sentry'
import { uploadService } from './services/upload.service'
import { logError } from './utils/logger'

const PORT = process.env.PORT || 3000
let server: Server | null = null
let shutdownStarted = false

async function startServer() {
  try {
    initializeSentry()
    await initializeRateLimiter()
    await connectToDatabase()
    console.log('Upload storage runtime:', uploadService.getRuntimeState())
    server = app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`)
    })
  } catch (error) {
    logError('server_start_failed', error)
    captureException(error, { phase: 'startup' })
    await flushSentry(2000)
    process.exit(1)
  }
}

async function shutdown(reason: NodeJS.Signals | 'fatal_error', exitCode = 0) {
  if (shutdownStarted) return
  shutdownStarted = true

  console.log(`Motivo ${reason} recebido. A encerrar servidor...`)

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    }

    await shutdownRateLimiter()
    await flushSentry(2000)

    process.exit(exitCode)
  } catch (error) {
    logError('server_shutdown_failed', error, { reason })
    captureException(error, { phase: 'shutdown', reason })
    await flushSentry(1000)
    process.exit(1)
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('unhandledRejection', (reason) => {
  logError('process_unhandled_rejection', reason)
  captureException(reason, { phase: 'unhandledRejection' })
})

process.on('uncaughtException', (error) => {
  logError('process_uncaught_exception', error)
  captureException(error, { phase: 'uncaughtException' })
  void shutdown('fatal_error', 1)
})

startServer()
