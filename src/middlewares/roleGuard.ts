import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth'
import { UserRole } from '../models/User'
import { AdminScope, canAdminUseScope } from '../admin/permissions'

/**
 * Middleware para verificar se o utilizador tem uma das roles permitidas
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticação necessária.',
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado. Permissões insuficientes.',
        required: allowedRoles,
        current: req.user.role,
      })
    }

    next()
  }
}

/**
 * Middleware específico para admin
 */
export const requireAdmin = requireRole('admin')

/**
 * Middleware especifico para escopos admin granulares.
 */
export const requireAdminScope = (scope: AdminScope) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const permissionCheck = canAdminUseScope(req.user, scope)
    if (!permissionCheck.allowed) {
      return res.status(403).json({
        error: permissionCheck.reason ?? 'Acesso negado. Permissoes insuficientes.',
        requiredScope: scope,
      })
    }

    next()
  }
}

/**
 * Middleware específico para creator
 */
export const requireCreator = requireRole('creator', 'admin')

/**
 * Middleware específico para premium
 */
export const requirePremium = requireRole('premium', 'creator', 'admin')
