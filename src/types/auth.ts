import { Request } from 'express'
import { IUser, UserAccountStatus, UserRole } from '../models/User'
import { AssistedSessionTokenPayload } from '../utils/jwt'

export interface AuthCreatorControlsResponse {
  creationBlocked: boolean
  creationBlockedReason?: string | null
  publishingBlocked: boolean
  publishingBlockedReason?: string | null
  cooldownUntil?: Date | null
  updatedAt?: Date | null
  updatedBy?: string | null
}

export interface RegisterLegalAcceptanceDTO {
  termsAccepted: boolean
  privacyAccepted: boolean
  financialDisclaimerAccepted: boolean
  version?: string
}

export interface CookieConsentDTO {
  analytics?: boolean
  marketing?: boolean
  preferences?: boolean
  version?: string
}

/**
 * Request estendido com user autenticado
 */
export interface AuthRequest extends Request {
  user?: IUser
  assistedSession?: AssistedSessionTokenPayload
}

/**
 * Payload do JWT
 */
export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  tokenVersion: number
  assistedSession?: AssistedSessionTokenPayload
}

/**
 * Response de login/register
 */
export interface AuthResponse {
  user: {
    id: string
    email: string
    emailVerified: boolean
    name: string
    username: string
    avatar?: string
    role: UserRole
    accountStatus: UserAccountStatus
    adminReadOnly: boolean
    adminScopes: string[]
    legalAcceptance?: {
      termsAcceptedAt?: Date | null
      privacyAcceptedAt?: Date | null
      financialDisclaimerAcceptedAt?: Date | null
      version?: string | null
    }
    cookieConsent?: {
      essential: boolean
      analytics: boolean
      marketing: boolean
      preferences: boolean
      consentedAt?: Date | null
      version?: string | null
    }
    creatorControls: AuthCreatorControlsResponse
    assistedSession?: AssistedSessionTokenPayload
    favoriteTopics?: string[]
  }
  tokens: {
    accessToken: string
    refreshToken: string
  }
}

/**
 * DTOs
 */
export interface RegisterDTO {
  email: string
  password: string
  name: string
  username: string
  role?: 'free' | 'creator'
  captchaToken?: string
  legalAcceptance?: RegisterLegalAcceptanceDTO
  cookieConsent?: CookieConsentDTO
}

export interface LoginDTO {
  email: string
  password: string
  captchaToken?: string
}

export interface RefreshTokenDTO {
  refreshToken: string
}

export interface ForgotPasswordDTO {
  email: string
}

export interface ResetPasswordDTO {
  token: string
  newPassword: string
}

export interface ChangePasswordDTO {
  currentPassword: string
  newPassword: string
}

export interface UpdateCookieConsentDTO extends CookieConsentDTO {}
