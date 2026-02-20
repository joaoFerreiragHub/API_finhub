import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth'
import { verifyAccessToken } from '../utils/jwt'
import { User } from '../models/User'
import { AssistedSessionServiceError, assistedSessionService } from '../services/assistedSession.service'

const resolveAuthFailureStatus = (accountStatus: string) => {
  return accountStatus === 'active' ? 401 : 403
}

const buildAuthFailureMessage = (accountStatus: string): string => {
  if (accountStatus === 'suspended') return 'Conta suspensa. Contacta o suporte.'
  if (accountStatus === 'banned') return 'Conta banida. Contacta o suporte.'
  return 'Token invalido ou expirado.'
}

const SAFE_ASSISTED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

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

    if (decoded.assistedSession) {
      req.assistedSession = await assistedSessionService.validateActiveClaim(
        decoded.assistedSession,
        decoded.userId
      )
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

    if (req.assistedSession && !SAFE_ASSISTED_METHODS.has(req.method.toUpperCase())) {
      return res.status(403).json({
        error:
          'Sessao assistida com escopo minimo: apenas operacoes de leitura sao permitidas.',
      })
    }

    if (req.assistedSession) {
      const startedAtMs = Date.now()
      res.on('finish', () => {
        void assistedSessionService
          .recordRequestAudit({
            sessionId: req.assistedSession!.sessionId,
            adminUserId: req.assistedSession!.adminUserId,
            targetUserId: req.assistedSession!.targetUserId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            requestId: req.requestId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            metadata: {
              durationMs: Date.now() - startedAtMs,
              scope: req.assistedSession!.scope,
            },
          })
          .catch((error) => {
            console.error('Assisted session audit logging error:', error)
          })
      })
    }

    next()
  } catch (error: any) {
    if (error instanceof AssistedSessionServiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
      })
    }

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

      if (decoded.assistedSession) {
        req.assistedSession = await assistedSessionService.validateActiveClaim(
          decoded.assistedSession,
          decoded.userId
        )
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
