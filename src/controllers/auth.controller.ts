import { Request, Response } from 'express'
import crypto from 'crypto'
import { User, UserAccountStatus } from '../models/User'
import { BetaInvite } from '../models/BetaInvite'
import { generateTokens, verifyRefreshToken } from '../utils/jwt'
import {
  AuthRequest,
  AuthResponse,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterDTO,
  RefreshTokenDTO,
  ChangePasswordDTO,
  ResetPasswordDTO,
  UpdateCookieConsentDTO,
} from '../types/auth'
import { AssistedSessionServiceError, assistedSessionService } from '../services/assistedSession.service'
import { emailService } from '../services/email.service'
import { captchaService, CaptchaServiceError } from '../services/captcha.service'
import { xpService } from '../services/xp.service'
import { logControllerError } from '../utils/domainLogger'

interface GoogleOAuthStateEntry {
  redirectPath: string
  createdAt: number
}

interface GoogleOAuthTokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  id_token?: string
}

interface GoogleOAuthUserInfo {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

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

const mapLegalAcceptance = (
  legalAcceptance: any
): NonNullable<AuthResponse['user']['legalAcceptance']> => ({
  termsAcceptedAt: legalAcceptance?.termsAcceptedAt ?? null,
  privacyAcceptedAt: legalAcceptance?.privacyAcceptedAt ?? null,
  financialDisclaimerAcceptedAt: legalAcceptance?.financialDisclaimerAcceptedAt ?? null,
  version: typeof legalAcceptance?.version === 'string' ? legalAcceptance.version : null,
})

const mapCookieConsent = (
  cookieConsent: any
): NonNullable<AuthResponse['user']['cookieConsent']> => ({
  essential: Boolean(cookieConsent?.essential ?? true),
  analytics: Boolean(cookieConsent?.analytics),
  marketing: Boolean(cookieConsent?.marketing),
  preferences: Boolean(cookieConsent?.preferences),
  consentedAt: cookieConsent?.consentedAt ?? null,
  version: typeof cookieConsent?.version === 'string' ? cookieConsent.version : null,
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
  legalAcceptance?: AuthResponse['user']['legalAcceptance']
  cookieConsent?: AuthResponse['user']['cookieConsent']
  allowAnalytics?: boolean
  creatorControls?: AuthResponse['user']['creatorControls']
  assistedSession?: AuthResponse['user']['assistedSession']
  favoriteTopics?: string[]
  level?: number
  levelName?: string
  totalXp?: number
  badges?: Array<{ id: string; unlockedAt: string }>
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
  legalAcceptance: mapLegalAcceptance(user.legalAcceptance),
  cookieConsent: mapCookieConsent(user.cookieConsent),
  allowAnalytics: user.allowAnalytics !== false,
  creatorControls: user.creatorControls ?? mapCreatorControls(undefined),
  assistedSession: user.assistedSession,
  favoriteTopics: Array.isArray(user.favoriteTopics) ? user.favoriteTopics : [],
  level: Number.isFinite(user.level) ? Math.max(1, Math.floor(user.level!)) : 1,
  levelName: typeof user.levelName === 'string' && user.levelName.trim() ? user.levelName : 'Novato Financeiro',
  totalXp: Number.isFinite(user.totalXp) ? Math.max(0, Math.floor(user.totalXp!)) : 0,
  badges: Array.isArray(user.badges) ? user.badges : [],
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
const LEGAL_VERSION = (process.env.LEGAL_VERSION ?? 'v1').trim() || 'v1'
const COOKIE_CONSENT_VERSION =
  (process.env.COOKIE_CONSENT_VERSION ?? LEGAL_VERSION).trim() || LEGAL_VERSION
const GOOGLE_OAUTH_CLIENT_ID = (process.env.GOOGLE_OAUTH_CLIENT_ID ?? '').trim()
const GOOGLE_OAUTH_CLIENT_SECRET = (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '').trim()
const GOOGLE_OAUTH_REDIRECT_URI = (process.env.GOOGLE_OAUTH_REDIRECT_URI ?? '').trim()
const GOOGLE_OAUTH_FRONTEND_CALLBACK_URL =
  (process.env.GOOGLE_OAUTH_FRONTEND_CALLBACK_URL ?? '').trim() ||
  `${(process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '')}/oauth/google/callback`
const GOOGLE_OAUTH_STATE_TTL_SECONDS = parsePositiveInteger(
  process.env.GOOGLE_OAUTH_STATE_TTL_SECONDS,
  600
)
const GOOGLE_OAUTH_STATE_TTL_MS = GOOGLE_OAUTH_STATE_TTL_SECONDS * 1000
const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_OAUTH_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const CONTROLLER_DOMAIN = 'auth_controller'

const googleOAuthStateStore = new Map<string, GoogleOAuthStateEntry>()

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex')

const buildForgotPasswordResponse = () => ({
  message:
    'Se o email existir, vais receber instrucoes para redefinir a password em breve.',
})

const buildResendVerificationResponse = () => ({
  message: 'Se a conta existir e nao estiver verificada, enviamos novo email de verificacao.',
})

const isGoogleOAuthConfigured = (): boolean => {
  return (
    GOOGLE_OAUTH_CLIENT_ID.length > 0 &&
    GOOGLE_OAUTH_CLIENT_SECRET.length > 0 &&
    GOOGLE_OAUTH_REDIRECT_URI.length > 0
  )
}

const normalizeRedirectPath = (input: unknown): string => {
  if (typeof input !== 'string') return '/dashboard'
  const value = input.trim()
  if (!value.startsWith('/')) return '/dashboard'
  if (value.startsWith('//')) return '/dashboard'
  if (value.length > 400) return '/dashboard'
  return value
}

const cleanupGoogleOAuthStateStore = () => {
  const now = Date.now()
  for (const [state, entry] of googleOAuthStateStore.entries()) {
    if (entry.createdAt + GOOGLE_OAUTH_STATE_TTL_MS <= now) {
      googleOAuthStateStore.delete(state)
    }
  }
}

const createGoogleOAuthState = (redirectPath: string): string => {
  cleanupGoogleOAuthStateStore()

  const state = crypto.randomBytes(24).toString('hex')
  googleOAuthStateStore.set(state, {
    redirectPath,
    createdAt: Date.now(),
  })

  if (googleOAuthStateStore.size > 1000) {
    const firstKey = googleOAuthStateStore.keys().next().value
    if (firstKey) {
      googleOAuthStateStore.delete(firstKey)
    }
  }

  return state
}

const consumeGoogleOAuthState = (state: string): GoogleOAuthStateEntry | null => {
  cleanupGoogleOAuthStateStore()
  const entry = googleOAuthStateStore.get(state)
  if (!entry) {
    return null
  }

  googleOAuthStateStore.delete(state)
  return entry
}

const normalizeUsernameBase = (rawValue: string): string => {
  const normalized = rawValue
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (normalized.length >= 3) {
    return normalized.slice(0, 20)
  }

  return `user_${normalized || 'google'}`
}

const generateUniqueUsername = async (seed: string): Promise<string> => {
  const base = normalizeUsernameBase(seed)

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}_${attempt + 1}`
    const exists = await User.exists({ username: candidate })
    if (!exists) {
      return candidate
    }
  }

  return `user_${crypto.randomBytes(4).toString('hex')}`
}

const exchangeGoogleCodeForToken = async (code: string): Promise<GoogleOAuthTokenResponse> => {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
    grant_type: 'authorization_code',
  })

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Google token exchange falhou (${response.status}): ${details}`)
  }

  return (await response.json()) as GoogleOAuthTokenResponse
}

const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleOAuthUserInfo> => {
  const response = await fetch(GOOGLE_OAUTH_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Google userinfo falhou (${response.status}): ${details}`)
  }

  return (await response.json()) as GoogleOAuthUserInfo
}

const buildGoogleOAuthCallbackUrl = (params: {
  accessToken?: string
  refreshToken?: string
  redirectPath?: string
  error?: string
  errorDescription?: string
}) => {
  const callbackUrl = new URL(GOOGLE_OAUTH_FRONTEND_CALLBACK_URL)
  const fragment = new URLSearchParams()

  if (params.accessToken) fragment.set('accessToken', params.accessToken)
  if (params.refreshToken) fragment.set('refreshToken', params.refreshToken)
  if (params.redirectPath) fragment.set('redirectPath', normalizeRedirectPath(params.redirectPath))
  if (params.error) fragment.set('error', params.error)
  if (params.errorDescription) fragment.set('errorDescription', params.errorDescription)

  callbackUrl.hash = fragment.toString()
  return callbackUrl.toString()
}

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
    const legalAcceptance = req.body.legalAcceptance
    const cookieConsent = req.body.cookieConsent

    if (!email || !password || !name || !username) {
      return res.status(400).json({
        error: 'Campos obrigatorios: email, password, name, username',
      })
    }

    try {
      await captchaService.assertToken(req.body.captchaToken, req.ip)
    } catch (captchaError) {
      if (captchaError instanceof CaptchaServiceError) {
        return res.status(captchaError.statusCode).json({
          error: captchaError.message,
          provider: captchaService.getProvider(),
        })
      }
      throw captchaError
    }

    if (
      !legalAcceptance ||
      legalAcceptance.termsAccepted !== true ||
      legalAcceptance.privacyAccepted !== true ||
      legalAcceptance.financialDisclaimerAccepted !== true
    ) {
      return res.status(400).json({
        error:
          'Aceitacao de termos, privacidade e aviso financeiro e obrigatoria para registo.',
      })
    }

    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({
        error: 'Email ja esta em uso.',
      })
    }

    if (process.env.BETA_MODE === 'true') {
      const invite = await BetaInvite.findOne({ email }).select('_id').lean()
      if (!invite) {
        return res.status(403).json({
          error: 'Este email nao esta na lista de beta testers. Pede um convite ao administrador.',
          code: 'BETA_INVITE_REQUIRED',
        })
      }
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
      allowAnalytics: Boolean(cookieConsent?.analytics),
      lastLoginAt: now,
      lastActiveAt: now,
      emailVerified: false,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationTokenExpiresAt: verificationExpiresAt,
      legalAcceptance: {
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        financialDisclaimerAcceptedAt: now,
        version: legalAcceptance.version?.trim() || LEGAL_VERSION,
      },
      cookieConsent: {
        essential: true,
        analytics: Boolean(cookieConsent?.analytics),
        marketing: Boolean(cookieConsent?.marketing),
        preferences: Boolean(cookieConsent?.preferences),
        consentedAt: now,
        version: cookieConsent?.version?.trim() || COOKIE_CONSENT_VERSION,
      },
    })

    if (process.env.BETA_MODE === 'true') {
      try {
        await BetaInvite.updateOne(
          { email: user.email },
          {
            $set: {
              usedAt: new Date(),
              usedBy: user.id,
            },
          }
        )
      } catch (betaInviteError: unknown) {
        logControllerError(CONTROLLER_DOMAIN, 'register_mark_beta_invite_used', betaInviteError, req)
      }
    }

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
        legalAcceptance: mapLegalAcceptance(user.legalAcceptance),
        cookieConsent: mapCookieConsent(user.cookieConsent),
        creatorControls: mapCreatorControls(user.creatorControls),
        favoriteTopics: user.topics ?? [],
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
        logControllerError(CONTROLLER_DOMAIN, 'send_verification_email_async', emailError, req)
      })

    return res.status(201).json(response)
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'register', error, req)
    return res.status(500).json({
      error: 'Erro ao criar conta.',
      details: error.message,
    })
  }
}

/**
 * Google OAuth Start
 * GET /api/auth/google/start
 */
export const googleOAuthStart = async (req: Request, res: Response) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({
        error:
          'Google OAuth nao configurado. Define GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI.',
      })
    }

    const redirectPath = normalizeRedirectPath(req.query.redirectPath)
    const state = createGoogleOAuthState(redirectPath)

    const query = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      redirect_uri: GOOGLE_OAUTH_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    })

    return res.redirect(`${GOOGLE_OAUTH_AUTH_URL}?${query.toString()}`)
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'google_oauth_start', error, req)
    return res.status(500).json({
      error: 'Erro ao iniciar autenticacao Google.',
      details: error.message,
    })
  }
}

/**
 * Google OAuth Callback
 * GET /api/auth/google/callback
 */
export const googleOAuthCallback = async (req: Request, res: Response) => {
  const redirectWithError = (errorCode: string, errorDescription: string) =>
    res.redirect(
      buildGoogleOAuthCallbackUrl({
        error: errorCode,
        errorDescription,
      })
    )

  try {
    if (!isGoogleOAuthConfigured()) {
      return redirectWithError('oauth_not_configured', 'Google OAuth nao esta configurado no backend.')
    }

    const code = typeof req.query.code === 'string' ? req.query.code.trim() : ''
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : ''

    if (!code || !state) {
      return redirectWithError('invalid_oauth_callback', 'Parametros code/state em falta.')
    }

    const stateEntry = consumeGoogleOAuthState(state)
    if (!stateEntry) {
      return redirectWithError('invalid_oauth_state', 'State invalido ou expirado.')
    }

    const tokenResponse = await exchangeGoogleCodeForToken(code)
    const accessToken = tokenResponse.access_token?.trim() || ''
    if (!accessToken) {
      return redirectWithError('google_token_missing', 'Google nao devolveu access token.')
    }

    const googleUser = await fetchGoogleUserInfo(accessToken)
    const email = googleUser.email?.trim().toLowerCase() || ''
    const isEmailVerified = Boolean(googleUser.email_verified)

    if (!email) {
      return redirectWithError('google_email_missing', 'Google nao devolveu email valido.')
    }

    if (!isEmailVerified) {
      return redirectWithError('google_email_unverified', 'Conta Google sem email verificado.')
    }

    const displayName = googleUser.name?.trim() || email.split('@')[0]
    const avatarUrl = googleUser.picture?.trim() || undefined
    const now = new Date()

    let user = await User.findOne({ email })
    if (!user) {
      const username = await generateUniqueUsername(email.split('@')[0] || displayName)
      const generatedPassword = crypto.randomBytes(24).toString('hex')

      user = await User.create({
        email,
        password: generatedPassword,
        name: displayName,
        username,
        avatar: avatarUrl,
        role: 'free',
        allowAnalytics: false,
        emailVerified: true,
        lastLoginAt: now,
        lastActiveAt: now,
      })
    } else {
      if (isAccountBlocked(user.accountStatus)) {
        return redirectWithError('account_blocked', ACCOUNT_STATUS_MESSAGES[user.accountStatus])
      }

      user.lastLoginAt = now
      user.lastActiveAt = now
      if (!user.emailVerified) {
        user.emailVerified = true
      }
      if (avatarUrl && avatarUrl !== user.avatar) {
        user.avatar = avatarUrl
      }
      if (!user.name && displayName) {
        user.name = displayName
      }
      await user.save()
    }

    if (isAccountBlocked(user.accountStatus)) {
      return redirectWithError('account_blocked', ACCOUNT_STATUS_MESSAGES[user.accountStatus])
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    })

    return res.redirect(
      buildGoogleOAuthCallbackUrl({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        redirectPath: stateEntry.redirectPath,
      })
    )
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'google_oauth_callback', error, req)
    return redirectWithError('oauth_callback_failed', error?.message || 'Erro interno no callback Google.')
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
    logControllerError(CONTROLLER_DOMAIN, 'send_email_test', error, req)
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
    logControllerError(CONTROLLER_DOMAIN, 'forgot_password', error, req)
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
        logControllerError(CONTROLLER_DOMAIN, 'send_welcome_email_async', emailError, req)
      })

    return res.status(200).json({
      message: 'Email verificado com sucesso.',
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'verify_email', error, req)
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
    logControllerError(CONTROLLER_DOMAIN, 'resend_verification', error, req)
    return res.status(500).json({
      error: 'Erro ao reenviar verificacao de email.',
      details: error.message,
    })
  }
}

/**
 * Update Cookie Consent - Atualizar preferencias de consentimento
 * PATCH /api/auth/cookie-consent
 */
export const updateCookieConsent = async (
  req: Request<{}, {}, UpdateCookieConsentDTO> & AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const now = new Date()
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({
        error: 'Utilizador nao encontrado.',
      })
    }

    user.cookieConsent = {
      essential: true,
      analytics: Boolean(req.body.analytics),
      marketing: Boolean(req.body.marketing),
      preferences: Boolean(req.body.preferences),
      consentedAt: now,
      version: req.body.version?.trim() || COOKIE_CONSENT_VERSION,
    }
    user.allowAnalytics = Boolean(req.body.analytics)

    await user.save()

    return res.status(200).json({
      message: 'Consentimento de cookies atualizado.',
      cookieConsent: mapCookieConsent(user.cookieConsent),
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'update_cookie_consent', error, req)
    return res.status(500).json({
      error: 'Erro ao atualizar consentimento de cookies.',
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
    logControllerError(CONTROLLER_DOMAIN, 'reset_password', error, req)
    return res.status(500).json({
      error: 'Erro ao redefinir password.',
      details: error.message,
    })
  }
}

/**
 * Change Password - Atualizar password da conta autenticada
 * POST /api/auth/change-password
 */
export const changePassword = async (
  req: Request<{}, {}, ChangePasswordDTO> & AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Nao autenticado.',
      })
    }

    const currentPassword = req.body.currentPassword?.trim()
    const newPassword = req.body.newPassword?.trim()

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Password atual e nova password sao obrigatorias.',
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'A nova password deve ter pelo menos 6 caracteres.',
      })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'A nova password deve ser diferente da password atual.',
      })
    }

    const user = await User.findById(req.user.id).select('+password')
    if (!user) {
      return res.status(404).json({
        error: 'Utilizador nao encontrado.',
      })
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Password atual invalida.',
      })
    }

    const now = new Date()
    user.password = newPassword
    user.passwordResetTokenHash = undefined
    user.passwordResetTokenExpiresAt = undefined
    user.tokenVersion += 1
    user.lastForcedLogoutAt = now
    user.lastActiveAt = now
    await user.save()

    return res.status(200).json({
      message: 'Password alterada com sucesso. Inicia sessao novamente.',
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'change_password', error, req)
    return res.status(500).json({
      error: 'Erro ao alterar password.',
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

    try {
      await captchaService.assertToken(req.body.captchaToken, req.ip)
    } catch (captchaError) {
      if (captchaError instanceof CaptchaServiceError) {
        return res.status(captchaError.statusCode).json({
          error: captchaError.message,
          provider: captchaService.getProvider(),
        })
      }
      throw captchaError
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
        legalAcceptance: mapLegalAcceptance(user.legalAcceptance),
        cookieConsent: mapCookieConsent(user.cookieConsent),
        creatorControls: mapCreatorControls(user.creatorControls),
        favoriteTopics: user.topics ?? [],
      }),
      tokens,
    }

    return res.status(200).json(response)
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'login', error, req)
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

    logControllerError(CONTROLLER_DOMAIN, 'refresh', error, req)
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

    const xpProfile = await xpService.getUserXpPublicProfile(req.user.id)

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
        legalAcceptance: mapLegalAcceptance(req.user.legalAcceptance),
        cookieConsent: mapCookieConsent(req.user.cookieConsent),
        creatorControls: mapCreatorControls(req.user.creatorControls),
        assistedSession: req.assistedSession,
        welcomeVideoUrl: req.user.welcomeVideoUrl,
        cardConfig: req.user.cardConfig,
        bio: req.user.bio,
        socialLinks: req.user.socialLinks,
        favoriteTopics: req.user.topics ?? [],
        level: xpProfile.level,
        levelName: xpProfile.levelName,
        totalXp: xpProfile.totalXp,
        badges: xpProfile.badges,
        followers: req.user.followers,
        following: req.user.following,
        lastLoginAt: req.user.lastLoginAt,
        lastActiveAt: req.user.lastActiveAt,
        createdAt: req.user.createdAt,
      },
    })
  } catch (error: any) {
    logControllerError(CONTROLLER_DOMAIN, 'me', error, req)
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
