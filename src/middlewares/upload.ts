import { NextFunction, Request, Response } from 'express'
import multer from 'multer'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AVATAR_MAX_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Formato invalido. Usa JPEG, PNG ou WebP.'))
      return
    }

    cb(null, true)
  },
})

export const handleAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
  avatarUpload.single('avatar')(req, res, (error: unknown) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: 'Avatar excede o limite maximo de 5MB.',
        })
        return
      }

      res.status(400).json({
        error: 'Upload de avatar invalido.',
        details: error.message,
      })
      return
    }

    res.status(400).json({
      error: 'Upload de avatar invalido.',
      details: error instanceof Error ? error.message : 'Erro desconhecido.',
    })
  })
}
