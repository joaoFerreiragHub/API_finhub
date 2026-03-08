import './env'
import mongoose from 'mongoose'
import { logError, logInfo } from '../utils/logger'

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI nao definido no .env')
  }

  try {
    await mongoose.connect(uri)
    logInfo('mongo_connected')
  } catch (error) {
    logError('mongo_connection_failed', error)
    throw error
  }
}
