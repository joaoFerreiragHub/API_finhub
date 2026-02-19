import { Request } from 'express'
import { IUser } from '../models/User'

/**
 * Request estendido com user autenticado
 */
export interface AuthRequest extends Request {
  user?: IUser
}

/**
 * Payload do JWT
 */
export interface JWTPayload {
  userId: string
  email: string
  role: string
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
    role: string
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
