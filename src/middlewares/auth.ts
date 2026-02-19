import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth'
import { verifyAccessToken } from '../utils/jwt'
import { User } from '../models/User'

const resolveAuthFailureStatus = (accountStatus: string) => {
  return accountStatus === 'active' ? 401 : 403
}

const buildAuthFailureMessage = (accountStatus: string): string => {
  if (accountStatus === 'suspended') return 'Conta suspensa. Contacta o suporte.'
  if (accountStatus === 'banned') return 'Conta banida. Contacta o suporte.'
  return 'Token invalido ou expirado.'
}

/**
 * Middleware para verificar se o utilizador esta autenticado.
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Acesso negado. Token nao fornecido.',
      })
    }

    const token = authHeader.substring(7)
    const decoded = verifyAccessToken(token)
    if (typeof decoded.tokenVersion !== 'number') {
      return res.status(401).json({
        error: 'Sessao invalida. Faz login novamente.',
      })
    }

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        error: 'Utilizador nao encontrado.',
      })
    }

    if (user.accountStatus !== 'active') {
      return res.status(resolveAuthFailureStatus(user.accountStatus)).json({
        error: buildAuthFailureMessage(user.accountStatus),
        accountStatus: user.accountStatus,
      })
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        error: 'Sessao expirada. Faz login novamente.',
      })
    }

    req.user = user
    next()
  } catch (error: any) {
    return res.status(401).json({
      error: 'Token invalido ou expirado.',
      details: error.message,
    })
  }
}

/**
 * Middleware opcional - nao falha se nao houver token.
 */
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyAccessToken(token)

      if (typeof decoded.tokenVersion !== 'number') {
        return next()
      }

      const user = await User.findById(decoded.userId)
      if (user && user.accountStatus === 'active' && user.tokenVersion === decoded.tokenVersion) {
        req.user = user
      }
    }
  } catch (error) {
    // Ignora erros para auth opcional.
  }

  next()
}
