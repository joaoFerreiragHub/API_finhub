import { Response } from 'express'
import { Types } from 'mongoose'
import { ClaimRequest } from '../models/ClaimRequest'
import { CreatorNotificationSubscription } from '../models/CreatorNotificationSubscription'
import { Favorite } from '../models/Favorite'
import { Follow } from '../models/Follow'
import { Notification } from '../models/Notification'
import { ICreatorCardConfig, User } from '../models/User'
import { UserPreferences } from '../models/UserPreferences'
import { UserSubscription } from '../models/UserSubscription'
import { AuthRequest } from '../types/auth'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'user_controller'
const DELETE_ACCOUNT_CONFIRMATION_TEXT = 'ELIMINAR'

type UserSocialLinkKey = 'website' | 'twitter' | 'linkedin' | 'instagram'

const SOCIAL_LINK_KEYS: readonly UserSocialLinkKey[] = [
  'website',
  'twitter',
  'linkedin',
  'instagram',
]
type CreatorCardConfigFlagKey =
  | 'showWelcomeVideo'
  | 'showBio'
  | 'showCourses'
  | 'showArticles'
  | 'showProducts'
  | 'showWebsite'
  | 'showSocialLinks'
  | 'showRatings'

const CARD_CONFIG_FLAG_KEYS: readonly CreatorCardConfigFlagKey[] = [
  'showWelcomeVideo',
  'showBio',
  'showCourses',
  'showArticles',
  'showProducts',
  'showWebsite',
  'showSocialLinks',
  'showRatings',
]

const normalizeCardConfigInput = (
  value: unknown
): { valid: boolean; value?: ICreatorCardConfig; error?: string } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      valid: false,
      error: 'Campo cardConfig invalido.',
    }
  }

  const payload = value as Record<string, unknown>
  const allowedKeys = new Set([...CARD_CONFIG_FLAG_KEYS, 'featuredContentIds'])
  const keys = Object.keys(payload)

  if (keys.length === 0) {
    return {
      valid: false,
      error: 'Campo cardConfig invalido. Informa pelo menos uma opcao.',
    }
  }

  for (const key of keys) {
    if (!allowedKeys.has(key as CreatorCardConfigFlagKey | 'featuredContentIds')) {
      return {
        valid: false,
        error: `Campo cardConfig.${key} nao permitido.`,
      }
    }
  }

  const nextConfig: ICreatorCardConfig = {}

  for (const key of CARD_CONFIG_FLAG_KEYS) {
    if (!(key in payload)) continue

    if (typeof payload[key] !== 'boolean') {
      return {
        valid: false,
        error: `Campo cardConfig.${key} invalido.`,
      }
    }

    nextConfig[key] = payload[key] as boolean
  }

  if ('featuredContentIds' in payload) {
    const rawFeaturedContentIds = payload.featuredContentIds

    if (!Array.isArray(rawFeaturedContentIds)) {
      return {
        valid: false,
        error: 'Campo cardConfig.featuredContentIds invalido.',
      }
    }

    const normalizedFeaturedContentIds = rawFeaturedContentIds
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0)

    if (normalizedFeaturedContentIds.length !== rawFeaturedContentIds.length) {
      return {
        valid: false,
        error: 'Campo cardConfig.featuredContentIds invalido.',
      }
    }

    const dedupedFeaturedContentIds = Array.from(new Set(normalizedFeaturedContentIds))
    if (dedupedFeaturedContentIds.length > 3) {
      return {
        valid: false,
        error: 'Campo cardConfig.featuredContentIds suporta no maximo 3 itens.',
      }
    }

    nextConfig.featuredContentIds = dedupedFeaturedContentIds
  }

  return {
    valid: true,
    value: nextConfig,
  }
}

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const normalizeRequiredText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const mapAuthenticatedUser = (user: NonNullable<AuthRequest['user']>) => ({
  id: user.id,
  email: user.email,
  emailVerified: user.emailVerified,
  name: user.name,
  username: user.username,
  avatar: user.avatar,
  welcomeVideoUrl: user.welcomeVideoUrl,
  bio: user.bio,
  cardConfig: user.cardConfig,
  socialLinks: user.socialLinks,
  role: user.role,
  accountStatus: user.accountStatus,
  adminReadOnly: user.adminReadOnly,
  adminScopes: user.adminScopes ?? [],
  legalAcceptance: user.legalAcceptance,
  cookieConsent: user.cookieConsent,
  followers: user.followers,
  following: user.following,
  lastLoginAt: user.lastLoginAt,
  lastActiveAt: user.lastActiveAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

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

    if ('welcomeVideoUrl' in payload) {
      const welcomeVideoUrlRaw = payload.welcomeVideoUrl
      if (welcomeVideoUrlRaw === null) {
        req.user.welcomeVideoUrl = undefined
        hasChanges = true
      } else {
        const welcomeVideoUrl = normalizeOptionalText(welcomeVideoUrlRaw)
        if (!welcomeVideoUrl) {
          return res.status(400).json({
            error: 'Campo welcomeVideoUrl invalido.',
          })
        }

        req.user.welcomeVideoUrl = welcomeVideoUrl
        hasChanges = true
      }
    }

    if ('cardConfig' in payload) {
      const cardConfigRaw = payload.cardConfig

      if (cardConfigRaw === null) {
        req.user.cardConfig = undefined
        hasChanges = true
      } else {
        const normalizedCardConfig = normalizeCardConfigInput(cardConfigRaw)
        if (!normalizedCardConfig.valid || !normalizedCardConfig.value) {
          return res.status(400).json({
            error: normalizedCardConfig.error || 'Campo cardConfig invalido.',
          })
        }

        const mergedCardConfig: ICreatorCardConfig = {
          ...(req.user.cardConfig ?? {}),
          ...normalizedCardConfig.value,
        }

        if ('featuredContentIds' in normalizedCardConfig.value) {
          mergedCardConfig.featuredContentIds = normalizedCardConfig.value.featuredContentIds
        }

        req.user.cardConfig = mergedCardConfig
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
      user: mapAuthenticatedUser(req.user),
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'update_my_profile', error, req)
    return res.status(500).json({
      error: 'Erro ao atualizar perfil.',
      details: error.message,
    })
  }
}

/**
 * GET /api/users/me/export
 * Exporta dados essenciais da conta autenticada em JSON.
 */
export const exportMyData = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const userId = req.user.id

    const [
      favorites,
      followingRelationships,
      followerRelationships,
      claimRequests,
      userPreferences,
      creatorSubscriptions,
      userSubscription,
    ] = await Promise.all([
      Favorite.find({ user: userId }).select('targetType targetId createdAt').lean(),
      Follow.find({ follower: userId }).select('following createdAt').lean(),
      Follow.find({ following: userId }).select('follower createdAt').lean(),
      ClaimRequest.find({ requestedBy: userId })
        .select('targetType targetId status reason note evidenceLinks reviewedAt reviewNote createdAt updatedAt')
        .lean(),
      UserPreferences.findOne({ user: userId }).select('notificationPreferences').lean(),
      CreatorNotificationSubscription.find({ user: userId })
        .select('creator eventType isEnabled createdAt updatedAt')
        .lean(),
      UserSubscription.findOne({ user: userId })
        .select(
          'planCode planLabel billingCycle status entitlementActive currentPeriodStart currentPeriodEnd trialEndsAt canceledAt cancelAtPeriodEnd source createdAt updatedAt'
        )
        .lean(),
    ])

    const payload = {
      exportedAt: new Date().toISOString(),
      formatVersion: 'v1',
      user: mapAuthenticatedUser(req.user),
      data: {
        favorites: favorites.map((item: any) => ({
          targetType: item.targetType,
          targetId: String(item.targetId),
          createdAt: item.createdAt,
        })),
        following: followingRelationships.map((item: any) => ({
          userId: String(item.following),
          createdAt: item.createdAt,
        })),
        followers: followerRelationships.map((item: any) => ({
          userId: String(item.follower),
          createdAt: item.createdAt,
        })),
        claimRequests: claimRequests.map((item: any) => ({
          id: String(item._id),
          targetType: item.targetType,
          targetId: item.targetId,
          status: item.status,
          reason: item.reason,
          note: item.note ?? null,
          evidenceLinks: item.evidenceLinks ?? [],
          reviewedAt: item.reviewedAt ?? null,
          reviewNote: item.reviewNote ?? null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        notificationPreferences: userPreferences?.notificationPreferences ?? null,
        creatorSubscriptions: creatorSubscriptions.map((item: any) => ({
          creatorId: String(item.creator),
          eventType: item.eventType,
          isEnabled: item.isEnabled,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        subscription:
          userSubscription === null
            ? null
            : {
                planCode: userSubscription.planCode,
                planLabel: userSubscription.planLabel,
                billingCycle: userSubscription.billingCycle,
                status: userSubscription.status,
                entitlementActive: userSubscription.entitlementActive,
                currentPeriodStart: userSubscription.currentPeriodStart ?? null,
                currentPeriodEnd: userSubscription.currentPeriodEnd ?? null,
                trialEndsAt: userSubscription.trialEndsAt ?? null,
                canceledAt: userSubscription.canceledAt ?? null,
                cancelAtPeriodEnd: userSubscription.cancelAtPeriodEnd,
                source: userSubscription.source,
                createdAt: userSubscription.createdAt,
                updatedAt: userSubscription.updatedAt,
              },
      },
      summary: {
        favoritesCount: favorites.length,
        followingCount: followingRelationships.length,
        followersCount: followerRelationships.length,
        claimRequestsCount: claimRequests.length,
        creatorSubscriptionsCount: creatorSubscriptions.length,
      },
    }

    return res.status(200).json(payload)
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'export_my_data', error, req)
    return res.status(500).json({
      error: 'Erro ao exportar dados da conta.',
      details: error.message,
    })
  }
}

/**
 * DELETE /api/users/me
 * Elimina (anonimiza e desativa) a conta autenticada.
 */
export const deleteMyAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const payload = req.body as Record<string, unknown>
    const currentPassword = normalizeRequiredText(payload.currentPassword)
    const confirmation = normalizeRequiredText(payload.confirmation)
    const reason = normalizeRequiredText(payload.reason)

    if (!currentPassword || !confirmation || !reason) {
      return res.status(400).json({
        error: 'Campos obrigatorios em falta: currentPassword, confirmation, reason.',
      })
    }

    if (confirmation !== DELETE_ACCOUNT_CONFIRMATION_TEXT) {
      return res.status(400).json({
        error: `Confirmacao invalida. Escreve exatamente "${DELETE_ACCOUNT_CONFIRMATION_TEXT}".`,
      })
    }

    const user = await User.findById(req.user.id).select('+password')
    if (!user) {
      return res.status(404).json({
        error: 'Utilizador nao encontrado.',
      })
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        error: 'Contas admin exigem processo manual de eliminacao.',
      })
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Password atual invalida.',
      })
    }

    const now = new Date()
    const userId = user.id.toString()
    const userObjectId = new Types.ObjectId(userId)
    const anonymizedSuffix = userId.slice(-12)

    user.email = `deleted+${userId}@deleted.local`
    user.emailVerified = false
    user.password = `deleted_${userId}_${now.getTime()}`
    user.name = 'Conta eliminada'
    user.username = `deleted_${anonymizedSuffix}`
    user.avatar = undefined
    user.welcomeVideoUrl = undefined
    user.bio = undefined
    user.cardConfig = undefined
    user.socialLinks = undefined
    user.role = 'free'
    user.accountStatus = 'suspended'
    user.statusReason = `Conta eliminada pelo utilizador: ${reason.slice(0, 180)}`
    user.statusChangedAt = now
    user.statusChangedBy = userObjectId
    user.adminReadOnly = false
    user.adminScopes = undefined
    user.legalAcceptance = {
      termsAcceptedAt: null,
      privacyAcceptedAt: null,
      financialDisclaimerAcceptedAt: null,
      version: null,
    }
    user.cookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false,
      consentedAt: null,
      version: null,
    }
    user.creatorControls = {
      creationBlocked: false,
      publishingBlocked: false,
      updatedAt: now,
      updatedBy: userObjectId,
    }
    user.followers = 0
    user.following = 0
    user.subscriptionExpiry = undefined
    user.passwordResetTokenHash = undefined
    user.passwordResetTokenExpiresAt = undefined
    user.emailVerificationTokenHash = undefined
    user.emailVerificationTokenExpiresAt = undefined
    user.tokenVersion += 1
    user.lastForcedLogoutAt = now
    user.lastActiveAt = now

    await user.save()

    try {
      const followFilter = {
        $or: [{ follower: user.id }, { following: user.id }],
      }

      const followRelationships = await Follow.find(followFilter).select('follower following').lean()
      const impactedUserIds = new Set<string>()
      for (const relationship of followRelationships as any[]) {
        const followerId = String(relationship.follower)
        const followingId = String(relationship.following)
        if (followerId !== userId) impactedUserIds.add(followerId)
        if (followingId !== userId) impactedUserIds.add(followingId)
      }

      await Follow.deleteMany(followFilter)

      await Promise.all(
        [...impactedUserIds].map(async (impactedUserId) => {
          const [followersCount, followingCount] = await Promise.all([
            Follow.countDocuments({ following: impactedUserId }),
            Follow.countDocuments({ follower: impactedUserId }),
          ])

          await User.findByIdAndUpdate(impactedUserId, {
            followers: followersCount,
            following: followingCount,
          })
        })
      )

      await Promise.allSettled([
        Favorite.deleteMany({ user: user.id }),
        Notification.deleteMany({ $or: [{ user: user.id }, { triggeredBy: user.id }] }),
        CreatorNotificationSubscription.deleteMany({ $or: [{ user: user.id }, { creator: user.id }] }),
        ClaimRequest.deleteMany({ $or: [{ requestedBy: user.id }, { creatorId: user.id }, { reviewedBy: user.id }] }),
        UserPreferences.deleteOne({ user: user.id }),
        UserSubscription.deleteOne({ user: user.id }),
      ])
    } catch (cleanupError: any) {
      logControllerError(CONTROLLER_DOMAIN, 'delete_my_account_cleanup', cleanupError, req)
    }

    return res.status(200).json({
      message: 'Conta eliminada com sucesso. Os dados pessoais foram removidos/anonimizados.',
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'delete_my_account', error, req)
    return res.status(500).json({
      error: 'Erro ao eliminar conta.',
      details: error.message,
    })
  }
}
