import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const envPathBySource = path.resolve(__dirname, '../../.env')
const envPathByCwd = path.resolve(process.cwd(), '.env')
const envPath = fs.existsSync(envPathBySource) ? envPathBySource : envPathByCwd

if (!fs.existsSync(envPath)) {
  throw new Error(
    `❌ Ficheiro .env não encontrado. Verificado em: ${envPathBySource} e ${envPathByCwd}`,
  )
}

dotenv.config({ path: envPath })
