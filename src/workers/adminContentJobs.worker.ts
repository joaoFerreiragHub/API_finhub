import '../config/env'
import { connectToDatabase } from '../config/database'
import { adminContentJobService } from '../services/adminContentJob.service'
import { logError, logInfo, logWarn, patchConsoleWithStructuredLogger } from '../utils/logger'

let shutdownStarted = false

patchConsoleWithStructuredLogger({ service: 'admin_content_jobs_worker' })

async function startWorker() {
  try {
    await connectToDatabase()
    await adminContentJobService.startWorker()
    logInfo('admin_content_jobs_worker_started')
  } catch (error) {
    logError('admin_content_jobs_worker_start_failed', error)
    process.exit(1)
  }
}

async function shutdown(signal: NodeJS.Signals) {
  if (shutdownStarted) return
  shutdownStarted = true

  logInfo('admin_content_jobs_worker_shutdown_requested', { signal })

  try {
    const gracefulStop = await adminContentJobService.stopWorker(null, 'drain')
    if (!gracefulStop) {
      logWarn('admin_content_jobs_worker_force_requeue_on_shutdown')
    }

    process.exit(0)
  } catch (error) {
    logError('admin_content_jobs_worker_shutdown_failed', error)
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
