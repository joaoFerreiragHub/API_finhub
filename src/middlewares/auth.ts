import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth'
import { verifyAccessToken } from '../utils/jwt'
import { User } from '../models/User'

/**
 * Middleware para verificar se o utilizador está autenticado
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Acesso negado. Token não fornecido.',
      })
    }

    const token = authHeader.substring(7) // Remove "Bearer "

    // Verify token
    const decoded = verifyAccessToken(token)

    // Get user from database
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        error: 'Utilizador não encontrado.',
      })
    }

    // Attach user to request
    req.user = user
    next()
  } catch (error: any) {
    return res.status(401).json({
      error: 'Token inválido ou expirado.',
      details: error.message,
    })
  }
}

/**
 * Middleware opcional - não falha se não houver token
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyAccessToken(token)
      const user = await User.findById(decoded.userId)
      if (user) {
        req.user = user
      }
    }
  } catch (error) {
    // Ignore errors, just don't attach user
  }
  next()
}
