import { Request, Response } from 'express'
import { User, UserAccountStatus } from '../models/User'
import { generateTokens, verifyRefreshToken } from '../utils/jwt'
import { AuthRequest, AuthResponse, LoginDTO, RegisterDTO, RefreshTokenDTO } from '../types/auth'
import { AssistedSessionServiceError, assistedSessionService } from '../services/assistedSession.service'

const ACCOUNT_STATUS_MESSAGES: Record<Exclude<UserAccountStatus, 'active'>, string> = {
  suspended: 'Conta suspensa. Contacta o suporte para mais detalhes.',
  banned: 'Conta banida. Contacta o suporte para mais detalhes.',
}

const isAccountBlocked = (status: UserAccountStatus): status is Exclude<UserAccountStatus, 'active'> => {
  return status !== 'active'
}

const mapCreatorControls = (creatorControls: any): AuthResponse['user']['creatorControls'] => ({
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

const mapAuthResponseUser = (user: {
  id: string
  email: string
  name: string
  username: string
  avatar?: string
  role: AuthResponse['user']['role']
  accountStatus: AuthResponse['user']['accountStatus']
  adminReadOnly?: boolean
  adminScopes?: string[]
  creatorControls?: AuthResponse['user']['creatorControls']
  assistedSession?: AuthResponse['user']['assistedSession']
}): AuthResponse['user'] => ({
  id: user.id,
  email: user.email,
  name: user.name,
  username: user.username,
  avatar: user.avatar,
  role: user.role,
  accountStatus: user.accountStatus,
  adminReadOnly: Boolean(user.adminReadOnly),
  adminScopes: Array.isArray(user.adminScopes) ? user.adminScopes : [],
  creatorControls: user.creatorControls ?? mapCreatorControls(undefined),
  assistedSession: user.assistedSession,
})

const buildAccountStatusError = (status: Exclude<UserAccountStatus, 'active'>) => ({
  error: ACCOUNT_STATUS_MESSAGES[status],
  accountStatus: status,
})

/**
 * Register - Criar nova conta
 * POST /api/auth/register
 */
export const register = async (req: Request<{}, {}, RegisterDTO>, res: Response) => {
  try {
    const { email, password, name, username, role } = req.body

    if (!email || !password || !name || !username) {
      return res.status(400).json({
        error: 'Campos obrigatorios: email, password, name, username',
      })
    }

    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({
        error: 'Email ja esta em uso.',
      })
    }

    const existingUsername = await User.findOne({ username })
    if (existingUsername) {
      return res.status(400).json({
        error: 'Username ja esta em uso.',
      })
    }

    const now = new Date()
    const user = await User.create({
      email,
      password,
      name,
      username,
      role: role || 'free',
      lastLoginAt: now,
      lastActiveAt: now,
    })

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    })

    const response: AuthResponse = {
      user: mapAuthResponseUser({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        accountStatus: user.accountStatus,
        adminReadOnly: user.adminReadOnly,
        adminScopes: user.adminScopes,
        creatorControls: mapCreatorControls(user.creatorControls),
      }),
      tokens,
    }

    return res.status(201).json(response)
  } catch (error: any) {
    console.error('Register error:', error)
    return res.status(500).json({
      error: 'Erro ao criar conta.',
      details: error.message,
    })
  }
}

/**
 * Login - Autenticar utilizador
 * POST /api/auth/login
 */
export const login = async (req: Request<{}, {}, LoginDTO>, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e password sao obrigatorios.',
      })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({
        error: 'Credenciais invalidas.',
      })
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciais invalidas.',
      })
    }

    if (isAccountBlocked(user.accountStatus)) {
      return res.status(403).json(buildAccountStatusError(user.accountStatus))
    }

    const now = new Date()
    user.lastLoginAt = now
    user.lastActiveAt = now
    await user.save()

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    })

    const response: AuthResponse = {
      user: mapAuthResponseUser({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        accountStatus: user.accountStatus,
        adminReadOnly: user.adminReadOnly,
        adminScopes: user.adminScopes,
        creatorControls: mapCreatorControls(user.creatorControls),
      }),
      tokens,
    }

    return res.status(200).json(response)
  } catch (error: any) {
    console.error('Login error:', error)
    return res.status(500).json({
      error: 'Erro ao fazer login.',
      details: error.message,
    })
  }
}

/**
 * Refresh Token - Renovar access token
 * POST /api/auth/refresh
 */
export const refresh = async (req: Request<{}, {}, RefreshTokenDTO>, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token e obrigatorio.',
      })
    }

    const decoded = verifyRefreshToken(refreshToken)
    if (typeof decoded.tokenVersion !== 'number') {
      return res.status(401).json({
        error: 'Sessao invalida. Faz login novamente.',
      })
    }

    let assistedSession = decoded.assistedSession
    if (assistedSession) {
      assistedSession = await assistedSessionService.validateActiveClaim(
        assistedSession,
        decoded.userId
      )
    }

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        error: 'Utilizador nao encontrado.',
      })
    }

    if (isAccountBlocked(user.accountStatus)) {
      return res.status(403).json(buildAccountStatusError(user.accountStatus))
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        error: 'Sessao expirada. Faz login novamente.',
      })
    }

    const now = new Date()
    const sessionUpdate: { lastActiveAt: Date; lastLoginAt?: Date } = {
      lastActiveAt: now,
    }

    if (!user.lastLoginAt) {
      sessionUpdate.lastLoginAt = now
    }

    await User.findByIdAndUpdate(user.id, {
      $set: sessionUpdate,
    })

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      assistedSession,
    })

    return res.status(200).json({
      tokens,
    })
  } catch (error: any) {
    if (error instanceof AssistedSessionServiceError) {
      return res.status(error.statusCode).json({
        error: error.message,
      })
    }

    console.error('Refresh error:', error)
    return res.status(401).json({
      error: 'Refresh token invalido ou expirado.',
      details: error.message,
    })
  }
}

/**
 * Get Current User - Obter dados do utilizador autenticado
 * GET /api/auth/me
 */
export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    return res.status(200).json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        username: req.user.username,
        avatar: req.user.avatar,
        role: req.user.role,
        accountStatus: req.user.accountStatus,
        adminReadOnly: req.user.adminReadOnly,
        adminScopes: req.user.adminScopes ?? [],
        creatorControls: mapCreatorControls(req.user.creatorControls),
        assistedSession: req.assistedSession,
        bio: req.user.bio,
        socialLinks: req.user.socialLinks,
        followers: req.user.followers,
        following: req.user.following,
        lastLoginAt: req.user.lastLoginAt,
        lastActiveAt: req.user.lastActiveAt,
        createdAt: req.user.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Me error:', error)
    return res.status(500).json({
      error: 'Erro ao obter dados do utilizador.',
      details: error.message,
    })
  }
}

/**
 * Logout - Invalidar sessao (client-side apenas)
 * POST /api/auth/logout
 */
export const logout = async (_req: AuthRequest, res: Response) => {
  return res.status(200).json({
    message: 'Logout efetuado com sucesso.',
  })
}
