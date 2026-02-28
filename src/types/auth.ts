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
    name: string
    username: string
    avatar?: string
    role: UserRole
    accountStatus: UserAccountStatus
    adminReadOnly: boolean
    adminScopes: string[]
    creatorControls: AuthCreatorControlsResponse
    assistedSession?: AssistedSessionTokenPayload
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
}

export interface LoginDTO {
  email: string
  password: string
}

export interface RefreshTokenDTO {
  refreshToken: string
}
