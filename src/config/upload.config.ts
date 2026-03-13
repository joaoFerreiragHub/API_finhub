import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { resolveEffectiveUploadStorageProvider } from './uploadStorage.config'

/**
 * Tipos de upload permitidos
 */
export enum UploadType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

/**
 * Configuracao de limites por tipo
 */
export const uploadLimits = {
  [UploadType.IMAGE]: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  [UploadType.VIDEO]: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedMimes: ['video/mp4', 'video/webm', 'video/ogg'],
    allowedExtensions: ['.mp4', '.webm', '.ogg'],
  },
  [UploadType.AUDIO]: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedMimes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
    allowedExtensions: ['.mp3', '.wav', '.ogg'],
  },
  [UploadType.DOCUMENT]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  },
}

/**
 * Diretorio base para uploads locais
 */
const uploadsDir = path.join(__dirname, '../../uploads')
const storageProvider = resolveEffectiveUploadStorageProvider()

const resolveUploadTypeFromMime = (mimetype: string): UploadType => {
  if (mimetype.startsWith('image/')) return UploadType.IMAGE
  if (mimetype.startsWith('video/')) return UploadType.VIDEO
  if (mimetype.startsWith('audio/')) return UploadType.AUDIO
  return UploadType.DOCUMENT
}

export const generateUploadFilename = (originalName: string): string => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  const ext = path.extname(originalName)
  const nameWithoutExt = path.basename(originalName, ext)
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  return `${uniqueSuffix}-${sanitizedName}${ext}`
}

if (storageProvider === 'local') {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  for (const type of Object.values(UploadType)) {
    const typeDir = path.join(uploadsDir, type)
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true })
    }
  }
}

const diskStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const uploadType = resolveUploadTypeFromMime(file.mimetype)
    const destination = path.join(uploadsDir, uploadType)
    cb(null, destination)
  },
  filename: (_req, file, cb) => {
    cb(null, generateUploadFilename(file.originalname))
  },
})

const storage = storageProvider === 's3' ? multer.memoryStorage() : diskStorage

const fileFilter = (uploadType: UploadType) => {
  return (_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const config = uploadLimits[uploadType]
    const ext = path.extname(file.originalname).toLowerCase()

    if (!config.allowedMimes.includes(file.mimetype)) {
      return cb(
        new Error(`Tipo de ficheiro nao permitido. Permitidos: ${config.allowedMimes.join(', ')}`),
      )
    }

    if (!config.allowedExtensions.includes(ext)) {
      return cb(
        new Error(
          `Extensao nao permitida. Permitidas: ${config.allowedExtensions.join(', ')}`,
        ),
      )
    }

    cb(null, true)
  }
}

/**
 * Criar uploader para tipo especifico
 */
export const createUploader = (uploadType: UploadType) => {
  return multer({
    storage,
    limits: {
      fileSize: uploadLimits[uploadType].maxSize,
    },
    fileFilter: fileFilter(uploadType),
  })
}

/**
 * Uploaders pre-configurados
 */
export const imageUploader = createUploader(UploadType.IMAGE)
export const videoUploader = createUploader(UploadType.VIDEO)
export const audioUploader = createUploader(UploadType.AUDIO)
export const documentUploader = createUploader(UploadType.DOCUMENT)

/**
 * Diretorio de uploads (para servir ficheiros estaticos)
 */
export { uploadsDir }
