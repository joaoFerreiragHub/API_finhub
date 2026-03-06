import { Request, Response } from 'express'
import crypto from 'crypto'
import { User, UserAccountStatus } from '../models/User'
import { generateTokens, verifyRefreshToken } from '../utils/jwt'
import {
  AuthRequest,
  AuthResponse,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterDTO,
  RefreshTokenDTO,
  ResetPasswordDTO,
} from '../types/auth'
import { AssistedSessionServiceError, assistedSessionService } from '../services/assistedSession.service'
import { emailService } from '../services/email.service'

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
  emailVerified: boolean
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
  emailVerified: Boolean(user.emailVerified),
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

const parsePositiveInteger = (rawValue: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(rawValue ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

const PASSWORD_RESET_TOKEN_TTL_MINUTES = parsePositiveInteger(
  process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
  30
)
const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = parsePositiveInteger(
  process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
  24
)

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex')

const buildForgotPasswordResponse = () => ({
  message:
    'Se o email existir, vais receber instrucoes para redefinir a password em breve.',
})

const buildResendVerificationResponse = () => ({
  message: 'Se a conta existir e nao estiver verificada, enviamos novo email de verificacao.',
})

/**
 * Register - Criar nova conta
 * POST /api/auth/register
 */
export const register = async (req: Request<{}, {}, RegisterDTO>, res: Response) => {
  try {
    const email = req.body.email?.trim().toLowerCase()
    const password = req.body.password
    const name = req.body.name?.trim()
    const username = req.body.username?.trim().toLowerCase()
    const role = req.body.role

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
    const verificationTokenRaw = crypto.randomBytes(32).toString('hex')
    const verificationTokenHash = hashToken(verificationTokenRaw)
    const verificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
    )

    const user = await User.create({
      email,
      password,
      name,
      username,
      role: role || 'free',
      lastLoginAt: now,
      lastActiveAt: now,
      emailVerified: false,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationTokenExpiresAt: verificationExpiresAt,
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
        emailVerified: user.emailVerified,
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

    void emailService
      .sendVerificationEmail({
        toEmail: user.email,
        recipientName: user.name,
        verificationToken: verificationTokenRaw,
      })
      .catch((emailError) => {
        console.error('Verification email error:', emailError)
      })

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
 * Operational Email Test - Enviar email de teste para o utilizador autenticado
 * POST /api/auth/email/test
 */
export const sendEmailTest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const result = await emailService.sendOperationalTestEmail({
      toEmail: req.user.email,
      recipientName: req.user.name,
    })

    if (result.accepted) {
      return res.status(200).json({
        message: 'Email de teste enviado com sucesso.',
        result,
      })
    }

    if (result.skipped) {
      return res.status(503).json({
        error: 'Servico de email nao esta configurado para envio.',
        result,
      })
    }

    return res.status(502).json({
      error: 'Falha ao enviar email de teste no provider configurado.',
      result,
    })
  } catch (error: any) {
    console.error('Email test error:', error)
    return res.status(500).json({
      error: 'Erro ao enviar email de teste.',
      details: error.message,
    })
  }
}

/**
 * Forgot Password - Gerar token de reset e enviar email
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordDTO>, res: Response) => {
  try {
    const email = req.body.email?.trim().toLowerCase()

    if (!email) {
      return res.status(400).json({
        error: 'Email e obrigatorio.',
      })
    }

    const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetTokenExpiresAt')
    if (!user) {
      return res.status(200).json(buildForgotPasswordResponse())
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000)

    user.passwordResetTokenHash = tokenHash
    user.passwordResetTokenExpiresAt = expiresAt
    await user.save()

    await emailService.sendPasswordResetEmail({
      toEmail: user.email,
      recipientName: user.name,
      resetToken: rawToken,
      expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES,
    })

    return res.status(200).json(buildForgotPasswordResponse())
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return res.status(500).json({
      error: 'Erro ao iniciar reset de password.',
      details: error.message,
    })
  }
}

/**
 * Verify Email - Confirmar email por token
 * GET /api/auth/verify-email?token=...
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const tokenParam = req.query.token
    const token = typeof tokenParam === 'string' ? tokenParam.trim() : ''

    if (!token) {
      return res.status(400).json({
        error: 'Token de verificacao e obrigatorio.',
      })
    }

    const tokenHash = hashToken(token)
    const now = new Date()

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: { $gt: now },
    }).select('+emailVerificationTokenHash +emailVerificationTokenExpiresAt')

    if (!user) {
      return res.status(400).json({
        error: 'Token invalido ou expirado.',
      })
    }

    user.emailVerified = true
    user.emailVerificationTokenHash = undefined
    user.emailVerificationTokenExpiresAt = undefined
    await user.save()

    void emailService
      .sendWelcomeEmail({
        toEmail: user.email,
        recipientName: user.name,
      })
      .catch((emailError) => {
        console.error('Welcome email error:', emailError)
      })

    return res.status(200).json({
      message: 'Email verificado com sucesso.',
    })
  } catch (error: any) {
    console.error('Verify email error:', error)
    return res.status(500).json({
      error: 'Erro ao verificar email.',
      details: error.message,
    })
  }
}

/**
 * Resend Verification - Reenviar email de verificacao
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const user = await User.findById(req.user.id).select(
      '+emailVerificationTokenHash +emailVerificationTokenExpiresAt'
    )

    if (!user || user.emailVerified) {
      return res.status(200).json(buildResendVerificationResponse())
    }

    const verificationTokenRaw = crypto.randomBytes(32).toString('hex')
    const verificationTokenHash = hashToken(verificationTokenRaw)
    const verificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
    )

    user.emailVerificationTokenHash = verificationTokenHash
    user.emailVerificationTokenExpiresAt = verificationExpiresAt
    await user.save()

    await emailService.sendVerificationEmail({
      toEmail: user.email,
      recipientName: user.name,
      verificationToken: verificationTokenRaw,
    })

    return res.status(200).json(buildResendVerificationResponse())
  } catch (error: any) {
    console.error('Resend verification error:', error)
    return res.status(500).json({
      error: 'Erro ao reenviar verificacao de email.',
      details: error.message,
    })
  }
}

/**
 * Reset Password - Validar token e atualizar password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request<{}, {}, ResetPasswordDTO>, res: Response) => {
  try {
    const token = req.body.token?.trim()
    const newPassword = req.body.newPassword?.trim()

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token e nova password sao obrigatorios.',
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'A nova password deve ter pelo menos 6 caracteres.',
      })
    }

    const tokenHash = hashToken(token)
    const now = new Date()

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetTokenExpiresAt: { $gt: now },
    }).select('+passwordResetTokenHash +passwordResetTokenExpiresAt')

    if (!user) {
      return res.status(400).json({
        error: 'Token invalido ou expirado.',
      })
    }

    user.password = newPassword
    user.passwordResetTokenHash = undefined
    user.passwordResetTokenExpiresAt = undefined
    user.tokenVersion += 1
    user.lastForcedLogoutAt = now
    await user.save()

    return res.status(200).json({
      message: 'Password atualizada com sucesso.',
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return res.status(500).json({
      error: 'Erro ao redefinir password.',
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
        emailVerified: user.emailVerified,
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
        emailVerified: req.user.emailVerified,
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
