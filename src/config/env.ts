import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Em produção as variáveis são injectadas pelo host (Railway, etc.) — não há ficheiro .env
if (process.env.NODE_ENV !== 'production') {
  const envPathBySource = path.resolve(__dirname, '../../.env')
  const envPathByCwd = path.resolve(process.cwd(), '.env')
  const envPath = fs.existsSync(envPathBySource) ? envPathBySource : envPathByCwd

  if (!fs.existsSync(envPath)) {
    throw new Error(
      `❌ Ficheiro .env não encontrado. Verificado em: ${envPathBySource} e ${envPathByCwd}`,
    )
  }

  dotenv.config({ path: envPath })
}
