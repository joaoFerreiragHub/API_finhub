import fs from 'fs'
import path from 'path'
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import {
  generateUploadFilename,
  UploadType,
} from '../config/upload.config'
import {
  resolveRequestedUploadStorageProvider,
  resolveUploadS3RuntimeConfig,
  isUploadS3ConfigReady,
  type UploadStorageProvider,
} from '../config/uploadStorage.config'

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
  storageProvider: UploadStorageProvider
}

const encodeS3KeyForUrl = (key: string): string =>
  key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

/**
 * Service de Upload
 */
export class UploadService {
  private readonly requestedStorageProvider: UploadStorageProvider
  private readonly storageProvider: UploadStorageProvider
  private readonly s3Client: S3Client | null
  private readonly s3Bucket: string
  private readonly s3Region: string
  private readonly s3Endpoint: string
  private readonly s3PublicBaseUrl: string
  private readonly s3ForcePathStyle: boolean
  private readonly s3AccessKeyId: string
  private readonly s3SecretAccessKey: string

  constructor() {
    this.requestedStorageProvider = resolveRequestedUploadStorageProvider()
    const s3Config = resolveUploadS3RuntimeConfig()

    this.s3Bucket = s3Config.bucket
    this.s3Region = s3Config.region
    this.s3Endpoint = s3Config.endpoint
    this.s3PublicBaseUrl = s3Config.publicBaseUrl
    this.s3ForcePathStyle = s3Config.forcePathStyle
    this.s3AccessKeyId = s3Config.accessKeyId
    this.s3SecretAccessKey = s3Config.secretAccessKey

    if (this.requestedStorageProvider === 's3' && isUploadS3ConfigReady(s3Config)) {
      this.storageProvider = 's3'
      this.s3Client = new S3Client({
        region: this.s3Region,
        endpoint: this.s3Endpoint || undefined,
        forcePathStyle: this.s3ForcePathStyle,
        credentials: this.resolveS3Credentials(),
      })
      return
    }

    this.storageProvider = 'local'
    this.s3Client = null

    if (this.requestedStorageProvider === 's3') {
      console.warn(
        'UPLOAD_STORAGE_PROVIDER=s3 configurado sem credenciais/bucket suficientes. A usar fallback local.'
      )
    }
  }

  /**
   * Processar ficheiro uploaded
   */
  async processUpload(file: Express.Multer.File): Promise<UploadResponse> {
    const uploadType = this.resolveUploadType(file.mimetype)
    const normalizedFile = this.ensureUploadFilename(file)

    if (this.storageProvider === 's3') {
      return this.processUploadToS3(normalizedFile, uploadType)
    }

    return this.processUploadLocal(normalizedFile, uploadType)
  }

  /**
   * Eliminar ficheiro
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (this.isS3Path(filePath)) {
        const key = this.extractS3KeyFromPath(filePath)
        if (key && this.storageProvider === 's3' && this.s3Client) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.s3Bucket,
              Key: key,
            })
          )
        }
        return
      }

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
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
      if (this.storageProvider === 's3' && this.s3Client) {
        const key = this.extractS3KeyFromUrl(url)
        if (!key) {
          throw new Error('Nao foi possivel resolver a chave S3 pela URL informada.')
        }

        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.s3Bucket,
            Key: key,
          })
        )
        return
      }

      // URL format local: /uploads/{type}/{filename}
      const urlPath = url.replace(/^\//, '')
      const absolutePath = path.join(__dirname, '../../', urlPath)
      await this.deleteFile(absolutePath)
    } catch (error) {
      console.error('Error deleting file by URL:', error)
      throw new Error('Erro ao eliminar ficheiro')
    }
  }

  /**
   * Obter informacao de ficheiro
   */
  async getFileInfo(filePath: string) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Ficheiro nao encontrado')
      }

      const stats = await fs.promises.stat(filePath)
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
      throw new Error(error.message || 'Erro ao obter informacao do ficheiro')
    }
  }

  /**
   * Listar ficheiros de um tipo
   */
  async listFiles(uploadType: UploadType) {
    try {
      if (this.storageProvider === 's3' && this.s3Client) {
        const files: Array<{
          filename: string
          url: string
          size: number
          createdAt: Date | null
        }> = []
        let continuationToken: string | undefined

        do {
          const response = await this.s3Client.send(
            new ListObjectsV2Command({
              Bucket: this.s3Bucket,
              Prefix: `${uploadType}/`,
              ContinuationToken: continuationToken,
            })
          )

          const objects = response.Contents ?? []
          for (const object of objects) {
            if (!object.Key || object.Key.endsWith('/')) continue
            files.push({
              filename: path.basename(object.Key),
              url: this.buildS3PublicUrl(object.Key),
              size: Number(object.Size ?? 0),
              createdAt: object.LastModified ?? null,
            })
          }

          continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
        } while (continuationToken)

        return files
      }

      const uploadsDir = path.join(__dirname, '../../uploads', uploadType)
      if (!fs.existsSync(uploadsDir)) {
        return []
      }

      const files = await fs.promises.readdir(uploadsDir)
      const filesInfo = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(uploadsDir, filename)
          const stats = await fs.promises.stat(filePath)
          return {
            filename,
            url: `/uploads/${uploadType}/${filename}`,
            size: stats.size,
            createdAt: stats.birthtime,
          }
        })
      )

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
      if (this.storageProvider === 's3' && this.s3Client) {
        let totalSize = 0
        let continuationToken: string | undefined
        const prefix = uploadType ? `${uploadType}/` : undefined

        do {
          const response = await this.s3Client.send(
            new ListObjectsV2Command({
              Bucket: this.s3Bucket,
              Prefix: prefix,
              ContinuationToken: continuationToken,
            })
          )

          for (const object of response.Contents ?? []) {
            totalSize += Number(object.Size ?? 0)
          }

          continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
        } while (continuationToken)

        return totalSize
      }

      let totalSize = 0
      const uploadsBaseDir = path.join(__dirname, '../../uploads')

      if (uploadType) {
        const typeDir = path.join(uploadsBaseDir, uploadType)
        if (fs.existsSync(typeDir)) {
          const files = await fs.promises.readdir(typeDir)
          for (const file of files) {
            const filePath = path.join(typeDir, file)
            const stats = await fs.promises.stat(filePath)
            totalSize += stats.size
          }
        }
      } else {
        for (const type of Object.values(UploadType)) {
          const typeDir = path.join(uploadsBaseDir, type)
          if (!fs.existsSync(typeDir)) continue
          const files = await fs.promises.readdir(typeDir)
          for (const file of files) {
            const filePath = path.join(typeDir, file)
            const stats = await fs.promises.stat(filePath)
            totalSize += stats.size
          }
        }
      }

      return totalSize
    } catch (error) {
      console.error('Error getting total size:', error)
      throw new Error('Erro ao calcular tamanho total')
    }
  }

  /**
   * Limpar ficheiros antigos (opcional - para manutencao)
   */
  async cleanOldFiles(daysOld = 30) {
    try {
      if (this.storageProvider === 's3' && this.s3Client) {
        return {
          deletedCount: 0,
          message: 'Limpeza automatica para S3 nao ativada neste endpoint.',
        }
      }

      const uploadsBaseDir = path.join(__dirname, '../../uploads')
      const now = Date.now()
      const maxAge = daysOld * 24 * 60 * 60 * 1000
      let deletedCount = 0

      for (const type of Object.values(UploadType)) {
        const typeDir = path.join(uploadsBaseDir, type)
        if (!fs.existsSync(typeDir)) continue

        const files = await fs.promises.readdir(typeDir)
        for (const file of files) {
          const filePath = path.join(typeDir, file)
          const stats = await fs.promises.stat(filePath)
          const age = now - stats.mtimeMs
          if (age > maxAge) {
            await fs.promises.unlink(filePath)
            deletedCount += 1
          }
        }
      }

      return {
        deletedCount,
        message: `${deletedCount} ficheiros antigos eliminados`,
      }
    } catch (error) {
      console.error('Error cleaning old files:', error)
      throw new Error('Erro ao limpar ficheiros antigos')
    }
  }

  getRuntimeState() {
    return {
      requestedStorageProvider: this.requestedStorageProvider,
      storageProvider: this.storageProvider,
      s3Configured: this.isS3ConfigReady(),
      s3Bucket: this.s3Bucket || null,
      s3Region: this.s3Region || null,
      s3Endpoint: this.s3Endpoint || null,
      s3ForcePathStyle: this.s3ForcePathStyle,
      s3PublicBaseUrl: this.s3PublicBaseUrl || null,
    }
  }

  private processUploadLocal(
    file: Express.Multer.File,
    uploadType: UploadType
  ): UploadResponse {
    const url = `/uploads/${uploadType}/${file.filename}`

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadType,
      url,
      path: file.path,
      storageProvider: 'local',
    }
  }

  private async processUploadToS3(
    file: Express.Multer.File,
    uploadType: UploadType
  ): Promise<UploadResponse> {
    if (!this.s3Client) {
      throw new Error('Cliente S3 nao inicializado.')
    }

    const key = `${uploadType}/${file.filename}`
    const hasBuffer = Buffer.isBuffer((file as Express.Multer.File & { buffer?: Buffer }).buffer)
    const fileBuffer = hasBuffer
      ? (file as Express.Multer.File & { buffer: Buffer }).buffer
      : null
    const uploadStream = !fileBuffer && file.path ? fs.createReadStream(file.path) : null
    const body = fileBuffer ?? uploadStream

    if (!body) {
      throw new Error('Ficheiro invalido: sem conteudo em memoria nem caminho temporario.')
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: body,
          ContentType: file.mimetype,
          ContentLength: file.size,
          Metadata: {
            originalname: file.originalname,
            uploadtype: uploadType,
          },
        })
      )
    } finally {
      uploadStream?.destroy()
    }

    if (file.path) {
      // Remove o temporario local apos upload bem sucedido para evitar crescimento em disco.
      await fs.promises.unlink(file.path).catch((error) => {
        console.warn('Nao foi possivel remover ficheiro temporario local apos upload S3:', error)
      })
    }

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadType,
      url: this.buildS3PublicUrl(key),
      path: `s3://${this.s3Bucket}/${key}`,
      storageProvider: 's3',
    }
  }

  private resolveUploadType(mimetype: string): UploadType {
    if (mimetype.startsWith('image/')) return UploadType.IMAGE
    if (mimetype.startsWith('video/')) return UploadType.VIDEO
    if (mimetype.startsWith('audio/')) return UploadType.AUDIO
    return UploadType.DOCUMENT
  }

  private ensureUploadFilename(file: Express.Multer.File): Express.Multer.File {
    const filename = typeof file.filename === 'string' ? file.filename.trim() : ''
    if (filename.length > 0) {
      return file
    }

    return {
      ...file,
      filename: generateUploadFilename(file.originalname || 'upload.bin'),
    }
  }

  private isS3ConfigReady(): boolean {
    const hasBucket = this.s3Bucket.length > 0
    const hasAccessKey = this.s3AccessKeyId.length > 0
    const hasSecretKey = this.s3SecretAccessKey.length > 0
    return hasBucket && hasAccessKey && hasSecretKey
  }

  private resolveS3Credentials():
    | {
        accessKeyId: string
        secretAccessKey: string
      }
    | undefined {
    if (!this.s3AccessKeyId || !this.s3SecretAccessKey) return undefined

    return {
      accessKeyId: this.s3AccessKeyId,
      secretAccessKey: this.s3SecretAccessKey,
    }
  }

  private buildS3PublicUrl(key: string): string {
    const encodedKey = encodeS3KeyForUrl(key)

    if (this.s3PublicBaseUrl) {
      return `${this.s3PublicBaseUrl}/${encodedKey}`
    }

    if (this.s3Endpoint) {
      return `${this.s3Endpoint}/${this.s3Bucket}/${encodedKey}`
    }

    return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${encodedKey}`
  }

  private extractS3KeyFromPath(filePath: string): string | null {
    if (!this.isS3Path(filePath)) return null
    const prefix = `s3://${this.s3Bucket}/`
    if (!filePath.startsWith(prefix)) return null
    return filePath.slice(prefix.length)
  }

  private isS3Path(filePath: string): boolean {
    return filePath.startsWith(`s3://${this.s3Bucket}/`)
  }

  private extractS3KeyFromUrl(url: string): string | null {
    // Compatibilidade com path interno
    const fromPath = this.extractS3KeyFromPath(url)
    if (fromPath) return fromPath

    if (this.s3PublicBaseUrl && url.startsWith(`${this.s3PublicBaseUrl}/`)) {
      return decodeURIComponent(url.slice(this.s3PublicBaseUrl.length + 1))
    }

    try {
      const parsed = new URL(url)
      const pathWithoutLeadingSlash = parsed.pathname.replace(/^\/+/, '')

      // endpoint path style: /bucket/key
      if (pathWithoutLeadingSlash.startsWith(`${this.s3Bucket}/`)) {
        return decodeURIComponent(pathWithoutLeadingSlash.slice(this.s3Bucket.length + 1))
      }

      // virtual host style: bucket.s3.region.amazonaws.com/key
      if (parsed.hostname.startsWith(`${this.s3Bucket}.`)) {
        return decodeURIComponent(pathWithoutLeadingSlash)
      }
    } catch {
      // URL invalida, segue fallback
    }

    return null
  }
}

export const uploadService = new UploadService()
