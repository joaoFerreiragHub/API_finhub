import '../config/env'
import { connectToDatabase } from '../config/database'
import { adminContentJobService } from '../services/adminContentJob.service'

let shutdownStarted = false

async function startWorker() {
  try {
    await connectToDatabase()
    await adminContentJobService.startWorker()
    console.log('Worker dedicado de admin content jobs iniciado.')
  } catch (error) {
    console.error('Falha ao iniciar worker de admin content jobs:', error)
    process.exit(1)
  }
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownStarted) return
  shutdownStarted = true

  console.log(`Sinal ${signal} recebido. A encerrar worker de admin content jobs...`)

  try {
    const gracefulStop = await adminContentJobService.stopWorker()
    if (!gracefulStop) {
      console.warn('Worker de admin content jobs parou com requeue forcado de jobs em running.')
    }

    process.exit(0)
  } catch (error) {
    console.error('Falha ao encerrar worker de admin content jobs:', error)
    process.exit(1)
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

void startWorker()
