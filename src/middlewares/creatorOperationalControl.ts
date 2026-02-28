import { NextFunction, Response } from 'express'
import { AuthRequest } from '../types/auth'

export type CreatorOperationalGuardMode = 'create' | 'publish'

const mapCreatorControls = (creatorControls: any) => ({
  creationBlocked: Boolean(creatorControls?.creationBlocked),
  creationBlockedReason:
    typeof creatorControls?.creationBlockedReason === 'string'
      ? creatorControls.creationBlockedReason
      : null,
  publishingBlocked: Boolean(creatorControls?.publishingBlocked),
  publishingBlockedReason:
    typeof creatorControls?.publishingBlockedReason === 'string'
      ? creatorControls.publishingBlockedReason
      : null,
  cooldownUntil: creatorControls?.cooldownUntil ?? null,
  updatedAt: creatorControls?.updatedAt ?? null,
  updatedBy:
    creatorControls?.updatedBy !== undefined && creatorControls?.updatedBy !== null
      ? String(creatorControls.updatedBy)
      : null,
})

export const enforceCreatorOperationalControl = (mode: CreatorOperationalGuardMode) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    if (user.role === 'admin') {
      return next()
    }

    if (user.role !== 'creator') {
      return next()
    }

    const creatorControls = user.creatorControls
    const now = Date.now()

    if (mode === 'create') {
      if (creatorControls?.creationBlocked) {
        return res.status(403).json({
          error: creatorControls.creationBlockedReason || 'Criacao de conteudo bloqueada para este creator.',
          code: 'creator_creation_blocked',
          creatorControls: mapCreatorControls(creatorControls),
        })
      }

      const cooldownUntil =
        creatorControls?.cooldownUntil instanceof Date
          ? creatorControls.cooldownUntil
          : creatorControls?.cooldownUntil
            ? new Date(creatorControls.cooldownUntil)
            : null

      if (cooldownUntil && cooldownUntil.getTime() > now) {
        return res.status(429).json({
          error: 'Creator em cooldown operacional. Aguarda antes de criar novo conteudo.',
          code: 'creator_cooldown_active',
          retryAfterSeconds: Math.max(1, Math.ceil((cooldownUntil.getTime() - now) / 1000)),
          creatorControls: mapCreatorControls(creatorControls),
        })
      }
    }

    if (mode === 'publish' && creatorControls?.publishingBlocked) {
      return res.status(403).json({
        error:
          creatorControls.publishingBlockedReason ||
          'Publicacao de conteudo bloqueada para este creator.',
        code: 'creator_publishing_blocked',
        creatorControls: mapCreatorControls(creatorControls),
      })
    }

    next()
  }
}
