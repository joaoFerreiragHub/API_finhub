import './config/env'
import { connectToDatabase } from './config/database'
import app from './app'
import { adminContentJobService } from './services/adminContentJob.service'

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    await connectToDatabase()
    adminContentJobService.startWorker()
    app.listen(PORT, () => {
      console.log(`Servidor a correr em http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Falha ao iniciar o servidor:', error)
    process.exit(1)
  }
}

startServer()
