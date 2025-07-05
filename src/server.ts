// src/server.ts
import 'dotenv/config'
import { connectToDatabase } from './config/database'
import app from './app'

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    await connectToDatabase()
    app.listen(PORT, () => {
      console.log(`🚀 Servidor a correr em http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Falha ao iniciar o servidor:', error)
    process.exit(1)
  }
}

startServer()
