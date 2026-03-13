import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'user_controller'

type UserSocialLinkKey = 'website' | 'twitter' | 'linkedin' | 'instagram'

const SOCIAL_LINK_KEYS: readonly UserSocialLinkKey[] = [
  'website',
  'twitter',
  'linkedin',
  'instagram',
]

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * PATCH /api/users/me
 * Atualiza dados basicos do perfil da conta autenticada.
 */
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const payload = req.body as Record<string, unknown>
    let hasChanges = false

    if ('name' in payload) {
      const name = normalizeOptionalText(payload.name)
      if (!name) {
        return res.status(400).json({
          error: 'Campo name invalido.',
        })
      }

      req.user.name = name
      hasChanges = true
    }

    if ('avatar' in payload) {
      const avatarRaw = payload.avatar
      if (avatarRaw === null) {
        req.user.avatar = undefined
        hasChanges = true
      } else {
        const avatar = normalizeOptionalText(avatarRaw)
        if (!avatar) {
          return res.status(400).json({
            error: 'Campo avatar invalido.',
          })
        }
        req.user.avatar = avatar
        hasChanges = true
      }
    }

    if ('bio' in payload) {
      const bioRaw = payload.bio
      if (bioRaw === null) {
        req.user.bio = undefined
        hasChanges = true
      } else {
        const bio = normalizeOptionalText(bioRaw)
        if (!bio) {
          return res.status(400).json({
            error: 'Campo bio invalido.',
          })
        }
        req.user.bio = bio
        hasChanges = true
      }
    }

    if ('socialLinks' in payload) {
      const socialLinksRaw = payload.socialLinks

      if (socialLinksRaw === null) {
        req.user.socialLinks = undefined
        hasChanges = true
      } else if (socialLinksRaw && typeof socialLinksRaw === 'object' && !Array.isArray(socialLinksRaw)) {
        const socialLinksPayload = socialLinksRaw as Record<string, unknown>
        const nextSocialLinks: {
          website?: string
          twitter?: string
          linkedin?: string
          instagram?: string
        } = {
          website: req.user.socialLinks?.website,
          twitter: req.user.socialLinks?.twitter,
          linkedin: req.user.socialLinks?.linkedin,
          instagram: req.user.socialLinks?.instagram,
        }

        let changedInsideSocialLinks = false
        for (const key of SOCIAL_LINK_KEYS) {
          if (!(key in socialLinksPayload)) continue

          const rawValue = socialLinksPayload[key]
          if (rawValue === null) {
            nextSocialLinks[key] = undefined
            changedInsideSocialLinks = true
            continue
          }

          const normalized = normalizeOptionalText(rawValue)
          if (!normalized) {
            return res.status(400).json({
              error: `Campo socialLinks.${key} invalido.`,
            })
          }

          nextSocialLinks[key] = normalized
          changedInsideSocialLinks = true
        }

        if (changedInsideSocialLinks) {
          req.user.socialLinks = nextSocialLinks
          hasChanges = true
        }
      } else {
        return res.status(400).json({
          error: 'Campo socialLinks invalido.',
        })
      }
    }

    if (!hasChanges) {
      return res.status(400).json({
        error: 'Sem alteracoes para atualizar.',
      })
    }

    req.user.lastActiveAt = new Date()
    await req.user.save()

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso.',
      user: {
        id: req.user.id,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
        name: req.user.name,
        username: req.user.username,
        avatar: req.user.avatar,
        bio: req.user.bio,
        socialLinks: req.user.socialLinks,
        role: req.user.role,
        accountStatus: req.user.accountStatus,
        adminReadOnly: req.user.adminReadOnly,
        adminScopes: req.user.adminScopes ?? [],
        lastLoginAt: req.user.lastLoginAt,
        lastActiveAt: req.user.lastActiveAt,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'update_my_profile', error, req)
    return res.status(500).json({
      error: 'Erro ao atualizar perfil.',
      details: error.message,
    })
  }
}
