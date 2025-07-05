// src/config/database.ts
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('❌ MONGODB_URI não definido no .env')
  }

  try {
    await mongoose.connect(uri)
    console.log('✅ Ligado à base de dados MongoDB')
  } catch (error) {
    console.error('❌ Erro ao ligar à base de dados MongoDB:', error)
    throw error
  }
}
