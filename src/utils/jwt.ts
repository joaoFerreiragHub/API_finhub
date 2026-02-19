import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import { UserRole } from '../models/User'

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn']
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn']

export interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  tokenVersion: number
}

/**
 * Gera um access token JWT
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Gera um refresh token JWT
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  })
}

/**
 * Verifica e decodifica um access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    throw new Error('Token inválido ou expirado')
  }
}

/**
 * Verifica e decodifica um refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
  } catch (error) {
    throw new Error('Refresh token inválido ou expirado')
  }
}

/**
 * Gera ambos os tokens (access + refresh)
 */
export const generateTokens = (payload: TokenPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}
