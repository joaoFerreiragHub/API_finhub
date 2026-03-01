import './config/env'
import { connectToDatabase } from './config/database'
import app from './app'
import { adminContentJobService } from './services/adminContentJob.service'
import { Server } from 'http'

const PORT = process.env.PORT || 3000
let server: Server | null = null
let shutdownStarted = false

async function startServer() {
  try {
    await connectToDatabase()
    adminContentJobService.startWorker()
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

    const gracefulWorkerStop = await adminContentJobService.stopWorker()
    if (!gracefulWorkerStop) {
      console.warn('Worker de moderacao parado com requeue forcado de jobs em running.')
    }

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
