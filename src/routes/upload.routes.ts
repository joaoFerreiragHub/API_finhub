import { Router } from 'express'
import {
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadDocument,
  deleteFile,
  listFiles,
  getUploadStats,
} from '../controllers/upload.controller'
import { authenticate } from '../middlewares/auth'
import { requireAdminScope } from '../middlewares/roleGuard'
import { auditAdminAction } from '../middlewares/adminAudit'
import { imageUploader, videoUploader, audioUploader, documentUploader } from '../config/upload.config'

const router = Router()

// ==========================================
// Rotas de Upload (Autenticadas)
// ==========================================

/**
 * @route   POST /api/upload/image
 * @desc    Upload de imagem
 * @access  Private (Auth)
 * @form    multipart/form-data com campo 'file'
 * @limits  5MB, tipos: jpeg, png, gif, webp
 */
router.post('/image', authenticate, imageUploader.single('file'), uploadImage)

/**
 * @route   POST /api/upload/video
 * @desc    Upload de vídeo
 * @access  Private (Auth)
 * @form    multipart/form-data com campo 'file'
 * @limits  100MB, tipos: mp4, webm, ogg
 */
router.post('/video', authenticate, videoUploader.single('file'), uploadVideo)

/**
 * @route   POST /api/upload/audio
 * @desc    Upload de áudio
 * @access  Private (Auth)
 * @form    multipart/form-data com campo 'file'
 * @limits  20MB, tipos: mp3, wav, ogg
 */
router.post('/audio', authenticate, audioUploader.single('file'), uploadAudio)

/**
 * @route   POST /api/upload/document
 * @desc    Upload de documento
 * @access  Private (Auth)
 * @form    multipart/form-data com campo 'file'
 * @limits  10MB, tipos: pdf, doc, docx
 */
router.post('/document', authenticate, documentUploader.single('file'), uploadDocument)

/**
 * @route   DELETE /api/upload
 * @desc    Eliminar ficheiro
 * @access  Private (Auth)
 * @body    { url: string }
 */
router.delete('/', authenticate, deleteFile)

// ==========================================
// Rotas Admin
// ==========================================

/**
 * @route   GET /api/upload/list/:type
 * @desc    Listar ficheiros por tipo
 * @access  Private (Admin)
 * @params  type: image|video|audio|document
 */
router.get(
  '/list/:type',
  authenticate,
  auditAdminAction({
    action: 'upload.files.list',
    resourceType: 'upload',
    scope: 'admin.uploads.read',
    getResourceId: (req) => String(req.params.type ?? ''),
  }),
  requireAdminScope('admin.uploads.read'),
  listFiles
)

/**
 * @route   GET /api/upload/stats
 * @desc    Estatísticas de uploads
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  authenticate,
  auditAdminAction({
    action: 'upload.stats.read',
    resourceType: 'upload',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getUploadStats
)

export default router
