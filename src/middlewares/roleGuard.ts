import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types/auth'
import { UserRole } from '../models/User'
import { AdminScope, canAdminUseScope, isAdminWriteScope } from '../admin/permissions'
import { adminScopeDelegationService } from '../services/adminScopeDelegation.service'

type BrandPortalPermission = 'read' | 'write'

const BRAND_PORTAL_ROLE_MATRIX: Record<BrandPortalPermission, UserRole[]> = {
  read: ['brand_manager', 'admin'],
  write: ['brand_manager', 'admin'],
}

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
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const permissionCheck = canAdminUseScope(req.user, scope)
    if (!permissionCheck.allowed) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: permissionCheck.reason ?? 'Acesso negado. Permissoes insuficientes.',
          requiredScope: scope,
        })
      }

      if (req.user.adminReadOnly && isAdminWriteScope(scope)) {
        return res.status(403).json({
          error:
            permissionCheck.reason ??
            'Perfil admin em modo read-only nao pode executar acoes de escrita.',
          requiredScope: scope,
        })
      }

      const hasDelegatedScope = await adminScopeDelegationService.hasActiveScopeDelegation(
        req.user.id,
        scope
      )
      if (hasDelegatedScope) {
        return next()
      }

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

/**
 * Middleware especifico para matriz de permissoes do brand portal.
 */
export const requireBrandPortalPermission = (permission: BrandPortalPermission) =>
  requireRole(...BRAND_PORTAL_ROLE_MATRIX[permission])

export const requireBrandPortalRead = requireBrandPortalPermission('read')
export const requireBrandPortalWrite = requireBrandPortalPermission('write')

/**
 * Middleware para garantir que o email da conta esta verificado.
 */
export const requireVerifiedEmail = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autenticacao necessaria.',
    })
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Verifica o teu email para continuar.',
      code: 'EMAIL_NOT_VERIFIED',
    })
  }

  next()
}
