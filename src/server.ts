import './config/env'
import { connectToDatabase } from './config/database'
import app from './app'
import { Server } from 'http'
import { initializeRateLimiter, shutdownRateLimiter } from './middlewares/rateLimiter'
import { uploadService } from './services/upload.service'

const PORT = process.env.PORT || 3000
let server: Server | null = null
let shutdownStarted = false

async function startServer() {
  try {
    await initializeRateLimiter()
    await connectToDatabase()
    console.log('Upload storage runtime:', uploadService.getRuntimeState())
    server = app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Falha ao iniciar o servidor:', error)
    process.exit(1)
  }
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownStarted) return
  shutdownStarted = true

  console.log(`Sinal ${signal} recebido. A encerrar servidor...`)

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

    process.exit(0)
  } catch (error) {
    console.error('Falha ao encerrar o servidor:', error)
    process.exit(1)
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

startServer()
