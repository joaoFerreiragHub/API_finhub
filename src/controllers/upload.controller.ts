import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import { uploadService } from '../services/upload.service'
import { UploadType } from '../config/upload.config'

/**
 * Upload de imagem
 * POST /api/upload/image
 */
export const uploadImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado' })
    }

    const result = uploadService.processUpload(req.file)

    return res.status(201).json(result)
  } catch (error: any) {
    console.error('Upload image error:', error)
    return res.status(500).json({
      error: 'Erro ao fazer upload da imagem',
      details: error.message,
    })
  }
}

/**
 * Upload de vídeo
 * POST /api/upload/video
 */
export const uploadVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado' })
    }

    const result = uploadService.processUpload(req.file)

    return res.status(201).json(result)
  } catch (error: any) {
    console.error('Upload video error:', error)
    return res.status(500).json({
      error: 'Erro ao fazer upload do vídeo',
      details: error.message,
    })
  }
}

/**
 * Upload de áudio
 * POST /api/upload/audio
 */
export const uploadAudio = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado' })
    }

    const result = uploadService.processUpload(req.file)

    return res.status(201).json(result)
  } catch (error: any) {
    console.error('Upload audio error:', error)
    return res.status(500).json({
      error: 'Erro ao fazer upload do áudio',
      details: error.message,
    })
  }
}

/**
 * Upload de documento
 * POST /api/upload/document
 */
export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum ficheiro enviado' })
    }

    const result = uploadService.processUpload(req.file)

    return res.status(201).json(result)
  } catch (error: any) {
    console.error('Upload document error:', error)
    return res.status(500).json({
      error: 'Erro ao fazer upload do documento',
      details: error.message,
    })
  }
}

/**
 * Eliminar ficheiro
 * DELETE /api/upload
 */
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL do ficheiro é obrigatória' })
    }

    await uploadService.deleteFileByUrl(url)

    return res.status(200).json({ message: 'Ficheiro eliminado com sucesso' })
  } catch (error: any) {
    console.error('Delete file error:', error)
    return res.status(500).json({
      error: 'Erro ao eliminar ficheiro',
      details: error.message,
    })
  }
}

/**
 * Listar ficheiros (Admin)
 * GET /api/upload/list/:type
 */
export const listFiles = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Apenas admin pode listar todos os ficheiros
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem listar ficheiros' })
    }

    const { type } = req.params

    if (!Object.values(UploadType).includes(type as UploadType)) {
      return res.status(400).json({ error: 'Tipo de ficheiro inválido' })
    }

    const files = await uploadService.listFiles(type as UploadType)

    return res.status(200).json({ files, total: files.length })
  } catch (error: any) {
    console.error('List files error:', error)
    return res.status(500).json({
      error: 'Erro ao listar ficheiros',
      details: error.message,
    })
  }
}

/**
 * Obter estatísticas de uploads (Admin)
 * GET /api/upload/stats
 */
export const getUploadStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Apenas admin pode ver stats
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem ver estatísticas' })
    }

    const stats: any = {
      byType: {},
      total: 0,
    }

    // Calcular tamanho por tipo
    for (const type of Object.values(UploadType)) {
      const size = await uploadService.getTotalSize(type)
      const files = await uploadService.listFiles(type)

      stats.byType[type] = {
        count: files.length,
        totalSize: size,
        totalSizeMB: (size / (1024 * 1024)).toFixed(2),
      }
    }

    // Calcular totais gerais
    stats.total = Object.values(stats.byType).reduce((sum: number, type: any) => sum + type.count, 0)
    stats.totalSize = await uploadService.getTotalSize()
    stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2)
    stats.totalSizeGB = (stats.totalSize / (1024 * 1024 * 1024)).toFixed(2)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get upload stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
