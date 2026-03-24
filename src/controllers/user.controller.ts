import { Response } from 'express'
import { Types } from 'mongoose'
import { Article } from '../models/Article'
import { ClaimRequest } from '../models/ClaimRequest'
import { CommunityPost } from '../models/CommunityPost'
import { CommunityReply } from '../models/CommunityReply'
import { CreatorNotificationSubscription } from '../models/CreatorNotificationSubscription'
import { Course } from '../models/Course'
import { Favorite } from '../models/Favorite'
import { Follow } from '../models/Follow'
import { Notification } from '../models/Notification'
import { ICreatorCardConfig, User } from '../models/User'
import { UserPreferences } from '../models/UserPreferences'
import { UserSubscription } from '../models/UserSubscription'
import { UserXP } from '../models/UserXP'
import { Video } from '../models/Video'
import { xpService } from '../services/xp.service'
import { AuthRequest } from '../types/auth'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'user_controller'
const DELETE_ACCOUNT_CONFIRMATION_TEXT = 'ELIMINAR'
const ACCOUNT_EXPORT_RATE_LIMIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

type UserSocialLinkKey = 'website' | 'twitter' | 'linkedin' | 'instagram' | 'youtube'

const SOCIAL_LINK_KEYS: readonly UserSocialLinkKey[] = [
  'website',
  'twitter',
  'linkedin',
  'instagram',
  'youtube',
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
  favoriteTopics: user.topics ?? [],
  cardConfig: user.cardConfig,
  socialLinks: user.socialLinks,
  onboardingCompleted: user.onboardingCompleted,
  level: 1,
  levelName: 'Novato Financeiro',
  totalXp: 0,
  badges: [] as Array<{ id: string; unlockedAt: string }>,
  role: user.role,
  accountStatus: user.accountStatus,
  adminReadOnly: user.adminReadOnly,
  adminScopes: user.adminScopes ?? [],
  legalAcceptance: user.legalAcceptance,
  cookieConsent: user.cookieConsent,
  allowAnalytics: user.allowAnalytics !== false,
  followers: user.followers,
  following: user.following,
  lastLoginAt: user.lastLoginAt,
  lastActiveAt: user.lastActiveAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

type UserWithXpView = ReturnType<typeof mapAuthenticatedUser> & {
  level: number
  levelName: string
  totalXp: number
  badges: Array<{ id: string; unlockedAt: string }>
}

const withXpProfile = (
  base: ReturnType<typeof mapAuthenticatedUser>,
  xpProfile?: {
    level: number
    levelName: string
    totalXp: number
    badges: Array<{ id: string; unlockedAt: string }>
  }
): UserWithXpView => ({
  ...base,
  level: xpProfile?.level ?? 1,
  levelName: xpProfile?.levelName ?? 'Novato Financeiro',
  totalXp: xpProfile?.totalXp ?? 0,
  badges: Array.isArray(xpProfile?.badges) ? xpProfile!.badges : [],
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
    const wasOnboardingCompleted = Boolean(req.user.onboardingCompleted)
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
      } else if (Array.isArray(socialLinksRaw)) {
        if (socialLinksRaw.length === 0) {
          req.user.socialLinks = undefined
          hasChanges = true
        } else {
          const nextSocialLinks: {
            website?: string
            twitter?: string
            linkedin?: string
            instagram?: string
            youtube?: string
          } = {
            website: undefined,
            twitter: undefined,
            linkedin: undefined,
            instagram: undefined,
            youtube: undefined,
          }

          for (const entry of socialLinksRaw) {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
              return res.status(400).json({
                error: 'Campo socialLinks invalido.',
              })
            }

            const row = entry as Record<string, unknown>
            const platformRaw = normalizeOptionalText(row.platform)
            const urlRaw = normalizeOptionalText(row.url)

            if (!platformRaw || !urlRaw) {
              return res.status(400).json({
                error: 'Campo socialLinks invalido.',
              })
            }

            const platform = platformRaw.toLowerCase() as UserSocialLinkKey
            if (!SOCIAL_LINK_KEYS.includes(platform)) {
              return res.status(400).json({
                error: `Campo socialLinks.${platformRaw} nao permitido.`,
              })
            }

            nextSocialLinks[platform] = urlRaw
          }

          req.user.socialLinks = nextSocialLinks
          hasChanges = true
        }
      } else if (socialLinksRaw && typeof socialLinksRaw === 'object' && !Array.isArray(socialLinksRaw)) {
        const socialLinksPayload = socialLinksRaw as Record<string, unknown>
        const nextSocialLinks: {
          website?: string
          twitter?: string
          linkedin?: string
          instagram?: string
          youtube?: string
        } = {
          website: req.user.socialLinks?.website,
          twitter: req.user.socialLinks?.twitter,
          linkedin: req.user.socialLinks?.linkedin,
          instagram: req.user.socialLinks?.instagram,
          youtube: req.user.socialLinks?.youtube,
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

    if ('topics' in payload) {
      const topicsRaw = payload.topics
      if (topicsRaw === null) {
        req.user.topics = undefined
        hasChanges = true
      } else if (Array.isArray(topicsRaw)) {
        const normalizedTopics = topicsRaw
          .map((entry) => normalizeOptionalText(entry))
          .filter((entry): entry is string => Boolean(entry))

        if (normalizedTopics.length !== topicsRaw.length) {
          return res.status(400).json({
            error: 'Campo topics invalido.',
          })
        }

        const dedupedTopics = Array.from(new Set(normalizedTopics))
        if (dedupedTopics.length > 5) {
          return res.status(400).json({
            error: 'Campo topics suporta no maximo 5 itens.',
          })
        }

        req.user.topics = dedupedTopics
        hasChanges = true
      } else {
        return res.status(400).json({
          error: 'Campo topics invalido.',
        })
      }
    }

    if ('onboardingCompleted' in payload) {
      if (typeof payload.onboardingCompleted !== 'boolean') {
        return res.status(400).json({
          error: 'Campo onboardingCompleted invalido.',
        })
      }

      req.user.onboardingCompleted = payload.onboardingCompleted
      hasChanges = true
    }

    if ('allowAnalytics' in payload) {
      if (typeof payload.allowAnalytics !== 'boolean') {
        return res.status(400).json({
          error: 'Campo allowAnalytics invalido.',
        })
      }

      req.user.allowAnalytics = payload.allowAnalytics

      if (!payload.allowAnalytics) {
        req.user.cookieConsent = {
          ...req.user.cookieConsent,
          essential: true,
          analytics: false,
        }
      }

      hasChanges = true
    }

    if (!hasChanges) {
      return res.status(400).json({
        error: 'Sem alteracoes para atualizar.',
      })
    }

    req.user.lastActiveAt = new Date()
    await req.user.save()

    const onboardingJustCompleted = !wasOnboardingCompleted && req.user.onboardingCompleted
    if (onboardingJustCompleted) {
      try {
        await xpService.awardXp(req.user.id, 'onboarding_completed', undefined, {
          contentId: 'onboarding:completed',
        })
      } catch (xpError) {
        logControllerError(CONTROLLER_DOMAIN, 'award_xp_onboarding_completed', xpError, req)
      }
    }

    const xpProfile = await xpService.getUserXpPublicProfile(req.user.id)

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso.',
      user: withXpProfile(mapAuthenticatedUser(req.user), xpProfile),
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
 * Exporta dados essenciais da conta autenticada em JSON (RGPD Art. 20).
 */
export const exportMyData = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const now = new Date()
    const lastExportAt = req.user.lastDataExportAt ? new Date(req.user.lastDataExportAt) : null
    if (
      lastExportAt &&
      Number.isFinite(lastExportAt.getTime()) &&
      now.getTime() - lastExportAt.getTime() < ACCOUNT_EXPORT_RATE_LIMIT_WINDOW_MS
    ) {
      const nextAvailableAt = new Date(
        lastExportAt.getTime() + ACCOUNT_EXPORT_RATE_LIMIT_WINDOW_MS
      ).toISOString()

      return res.status(429).json({
        error: 'Exportacao disponivel no maximo 1 vez a cada 7 dias.',
        nextAvailableAt,
      })
    }

    const userObjectId = new Types.ObjectId(req.user.id)
    const [articleDocs, courseDocs, videoDocs, postDocs, replyDocs, xpDoc] = await Promise.all([
      Article.find({ creator: userObjectId }).select('_id').lean<Array<{ _id: unknown }>>(),
      Course.find({ creator: userObjectId }).select('_id').lean<Array<{ _id: unknown }>>(),
      Video.find({ creator: userObjectId }).select('_id').lean<Array<{ _id: unknown }>>(),
      CommunityPost.find({ author: userObjectId }).select('_id').lean<Array<{ _id: unknown }>>(),
      CommunityReply.find({ author: userObjectId }).select('_id').lean<Array<{ _id: unknown }>>(),
      UserXP.findOne({ user: userObjectId })
        .select('level totalXp badges')
        .lean<{
          level?: number
          totalXp?: number
          badges?: Array<{ id?: string; unlockedAt?: Date | string | null }>
        } | null>(),
    ])

    const toIdList = (rows: Array<{ _id: unknown }>): string[] => rows.map((row) => String(row._id))
    const xpBadges = (xpDoc?.badges ?? [])
      .map((badge) => {
        if (!badge || typeof badge !== 'object') return null
        const id = typeof badge.id === 'string' ? badge.id : ''
        if (!id) return null
        const unlockedAt = badge.unlockedAt ? new Date(badge.unlockedAt) : null
        return {
          id,
          unlockedAt:
            unlockedAt && Number.isFinite(unlockedAt.getTime())
              ? unlockedAt.toISOString()
              : now.toISOString(),
        }
      })
      .filter((badge): badge is { id: string; unlockedAt: string } => Boolean(badge))

    req.user.lastDataExportAt = now
    await req.user.save()

    return res.status(200).json({
      profile: {
        name: req.user.name,
        email: req.user.email,
        bio: req.user.bio ?? null,
        avatar: req.user.avatar ?? null,
        topics: req.user.topics ?? [],
        socialLinks: req.user.socialLinks ?? {},
        createdAt: req.user.createdAt,
      },
      content: {
        articles: toIdList(articleDocs),
        courses: toIdList(courseDocs),
        videos: toIdList(videoDocs),
      },
      community: {
        posts: toIdList(postDocs),
        replies: toIdList(replyDocs),
        xp: {
          level:
            typeof xpDoc?.level === 'number' && Number.isFinite(xpDoc.level) ? xpDoc.level : 1,
          totalXp:
            typeof xpDoc?.totalXp === 'number' && Number.isFinite(xpDoc.totalXp)
              ? xpDoc.totalXp
              : 0,
          badges: xpBadges,
        },
      },
      analytics: {
        allowAnalytics: req.user.allowAnalytics !== false,
      },
      exportedAt: now.toISOString(),
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'export_my_data', error, req)
    return res.status(500).json({
      error: 'Erro ao exportar dados da conta.',
      details: error.message,
    })
  }
}

/**
 * GET /api/users/me
 * Perfil autenticado com dados de progresso (XP/nivel/badges).
 */
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const [favoritesCount, followingCount, xpProfile] = await Promise.all([
      Favorite.countDocuments({ user: req.user.id }),
      Follow.countDocuments({ follower: req.user.id }),
      xpService.getUserXpPublicProfile(req.user.id),
    ])

    return res.status(200).json({
      user: {
        ...withXpProfile(mapAuthenticatedUser(req.user), xpProfile),
        favoritesCount,
        followingCount,
      },
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'get_my_profile', error, req)
    return res.status(500).json({
      error: 'Erro ao obter perfil da conta autenticada.',
      details: error.message,
    })
  }
}

/**
 * GET /api/users/:username/public
 * Perfil publico por username.
 */
export const getPublicProfileByUsername = async (req: AuthRequest, res: Response) => {
  try {
    const usernameRaw = typeof req.params.username === 'string' ? req.params.username : ''
    const username = usernameRaw.trim().toLowerCase()
    if (!username) {
      return res.status(400).json({
        error: 'Username invalido.',
      })
    }

    const user = await User.findOne({ username, accountStatus: 'active' })
      .select('name username avatar bio createdAt role')
      .lean<{
        _id: unknown
        name?: string
        username?: string
        avatar?: string
        bio?: string
        createdAt?: Date
        role?: string
      } | null>()

    if (!user) {
      return res.status(404).json({
        error: 'Utilizador nao encontrado.',
      })
    }

    const userId = String(user._id)
    const [favoriteArticlesCount, followingCreatorsCount, xpProfile] = await Promise.all([
      Favorite.countDocuments({ user: userId, targetType: 'article' }),
      Follow.countDocuments({ follower: userId }),
      xpService.getUserXpPublicProfile(userId),
    ])

    return res.status(200).json({
      user: {
        id: userId,
        name: user.name ?? user.username ?? 'Utilizador',
        username: user.username ?? username,
        avatar: user.avatar ?? null,
        bio: user.bio ?? null,
        createdAt: user.createdAt ?? null,
        role: user.role ?? 'free',
        favoriteArticlesCount,
        followingCreatorsCount,
        totalXp: xpProfile.totalXp,
        level: xpProfile.level,
        levelName: xpProfile.levelName,
        badges: xpProfile.badges,
      },
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'get_public_profile_by_username', error, req)
    return res.status(500).json({
      error: 'Erro ao carregar perfil publico.',
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
    user.topics = undefined
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
    user.allowAnalytics = false
    user.lastDataExportAt = undefined
    user.creatorControls = {
      creationBlocked: false,
      publishingBlocked: false,
      updatedAt: now,
      updatedBy: userObjectId,
    }
    user.followers = 0
    user.following = 0
    user.subscriptionExpiry = undefined
    user.onboardingCompleted = false
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
