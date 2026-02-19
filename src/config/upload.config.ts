import multer from 'multer'
import path from 'path'
import fs from 'fs'

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
 * Configuração de limites por tipo
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
    allowedMimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  },
}

/**
 * Diretório base para uploads
 */
const uploadsDir = path.join(__dirname, '../../uploads')

// Garantir que o diretório existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Criar subdiretórios para cada tipo
Object.values(UploadType).forEach((type) => {
  const typeDir = path.join(uploadsDir, type)
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true })
  }
})

/**
 * Storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar tipo de upload baseado no mimetype
    let uploadType = UploadType.DOCUMENT

    if (file.mimetype.startsWith('image/')) {
      uploadType = UploadType.IMAGE
    } else if (file.mimetype.startsWith('video/')) {
      uploadType = UploadType.VIDEO
    } else if (file.mimetype.startsWith('audio/')) {
      uploadType = UploadType.AUDIO
    }

    const destination = path.join(uploadsDir, uploadType)
    cb(null, destination)
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname)
    const nameWithoutExt = path.basename(file.originalname, ext)
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    cb(null, `${uniqueSuffix}-${sanitizedName}${ext}`)
  },
})

/**
 * File filter para validar tipo
 */
const fileFilter = (uploadType: UploadType) => {
  return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const config = uploadLimits[uploadType]
    const ext = path.extname(file.originalname).toLowerCase()

    // Verificar mimetype
    if (!config.allowedMimes.includes(file.mimetype)) {
      return cb(new Error(`Tipo de ficheiro não permitido. Permitidos: ${config.allowedMimes.join(', ')}`))
    }

    // Verificar extensão
    if (!config.allowedExtensions.includes(ext)) {
      return cb(new Error(`Extensão não permitida. Permitidas: ${config.allowedExtensions.join(', ')}`))
    }

    cb(null, true)
  }
}

/**
 * Criar uploader para tipo específico
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
 * Uploaders pré-configurados
 */
export const imageUploader = createUploader(UploadType.IMAGE)
export const videoUploader = createUploader(UploadType.VIDEO)
export const audioUploader = createUploader(UploadType.AUDIO)
export const documentUploader = createUploader(UploadType.DOCUMENT)

/**
 * Diretório de uploads (para servir ficheiros estáticos)
 */
export { uploadsDir }
