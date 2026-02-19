import fs from 'fs'
import path from 'path'
import { UploadType } from '../config/upload.config'

/**
 * DTO para resposta de upload
 */
export interface UploadResponse {
  filename: string
  originalName: string
  mimetype: string
  size: number
  uploadType: UploadType
  url: string
  path: string
}

/**
 * Service de Upload
 */
export class UploadService {
  /**
   * Processar ficheiro uploaded
   */
  processUpload(file: Express.Multer.File): UploadResponse {
    // Determinar tipo de upload
    let uploadType = UploadType.DOCUMENT

    if (file.mimetype.startsWith('image/')) {
      uploadType = UploadType.IMAGE
    } else if (file.mimetype.startsWith('video/')) {
      uploadType = UploadType.VIDEO
    } else if (file.mimetype.startsWith('audio/')) {
      uploadType = UploadType.AUDIO
    }

    // Construir URL pública
    const url = `/uploads/${uploadType}/${file.filename}`

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadType,
      url,
      path: file.path,
    }
  }

  /**
   * Eliminar ficheiro
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      throw new Error('Erro ao eliminar ficheiro')
    }
  }

  /**
   * Eliminar ficheiro por URL
   */
  async deleteFileByUrl(url: string): Promise<void> {
    try {
      // Extrair path relativo da URL
      // URL format: /uploads/{type}/{filename}
      const urlPath = url.replace(/^\//, '') // Remove leading slash
      const absolutePath = path.join(__dirname, '../../', urlPath)

      await this.deleteFile(absolutePath)
    } catch (error) {
      console.error('Error deleting file by URL:', error)
      throw new Error('Erro ao eliminar ficheiro')
    }
  }

  /**
   * Obter informação de ficheiro
   */
  async getFileInfo(filePath: string) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Ficheiro não encontrado')
      }

      const stats = fs.statSync(filePath)
      const ext = path.extname(filePath)
      const filename = path.basename(filePath)

      return {
        filename,
        size: stats.size,
        extension: ext,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      }
    } catch (error: any) {
      console.error('Error getting file info:', error)
      throw new Error(error.message || 'Erro ao obter informação do ficheiro')
    }
  }

  /**
   * Listar ficheiros de um tipo
   */
  async listFiles(uploadType: UploadType) {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads', uploadType)

      if (!fs.existsSync(uploadsDir)) {
        return []
      }

      const files = fs.readdirSync(uploadsDir)

      const filesInfo = files.map((filename) => {
        const filePath = path.join(uploadsDir, filename)
        const stats = fs.statSync(filePath)

        return {
          filename,
          url: `/uploads/${uploadType}/${filename}`,
          size: stats.size,
          createdAt: stats.birthtime,
        }
      })

      return filesInfo
    } catch (error) {
      console.error('Error listing files:', error)
      throw new Error('Erro ao listar ficheiros')
    }
  }

  /**
   * Obter tamanho total de uploads
   */
  async getTotalSize(uploadType?: UploadType) {
    try {
      let totalSize = 0
      const uploadsBaseDir = path.join(__dirname, '../../uploads')

      if (uploadType) {
        // Tamanho de um tipo específico
        const typeDir = path.join(uploadsBaseDir, uploadType)
        if (fs.existsSync(typeDir)) {
          const files = fs.readdirSync(typeDir)
          files.forEach((file) => {
            const filePath = path.join(typeDir, file)
            const stats = fs.statSync(filePath)
            totalSize += stats.size
          })
        }
      } else {
        // Tamanho total de todos os tipos
        Object.values(UploadType).forEach((type) => {
          const typeDir = path.join(uploadsBaseDir, type)
          if (fs.existsSync(typeDir)) {
            const files = fs.readdirSync(typeDir)
            files.forEach((file) => {
              const filePath = path.join(typeDir, file)
              const stats = fs.statSync(filePath)
              totalSize += stats.size
            })
          }
        })
      }

      return totalSize
    } catch (error) {
      console.error('Error getting total size:', error)
      throw new Error('Erro ao calcular tamanho total')
    }
  }

  /**
   * Limpar ficheiros antigos (opcional - para manutenção)
   */
  async cleanOldFiles(daysOld = 30) {
    try {
      const uploadsBaseDir = path.join(__dirname, '../../uploads')
      const now = Date.now()
      const maxAge = daysOld * 24 * 60 * 60 * 1000 // dias em ms

      let deletedCount = 0

      Object.values(UploadType).forEach((type) => {
        const typeDir = path.join(uploadsBaseDir, type)
        if (fs.existsSync(typeDir)) {
          const files = fs.readdirSync(typeDir)
          files.forEach((file) => {
            const filePath = path.join(typeDir, file)
            const stats = fs.statSync(filePath)
            const age = now - stats.mtimeMs

            if (age > maxAge) {
              fs.unlinkSync(filePath)
              deletedCount++
            }
          })
        }
      })

      return {
        deletedCount,
        message: `${deletedCount} ficheiros antigos eliminados`,
      }
    } catch (error) {
      console.error('Error cleaning old files:', error)
      throw new Error('Erro ao limpar ficheiros antigos')
    }
  }
}

export const uploadService = new UploadService()
