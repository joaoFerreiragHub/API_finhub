import { Request, Response } from 'express'
import { User } from '../models/User'
import { generateTokens, verifyRefreshToken } from '../utils/jwt'
import { AuthRequest, AuthResponse, LoginDTO, RegisterDTO, RefreshTokenDTO } from '../types/auth'

/**
 * Register - Criar nova conta
 * POST /api/auth/register
 */
export const register = async (req: Request<{}, {}, RegisterDTO>, res: Response) => {
  try {
    const { email, password, name, username, role } = req.body

    // Validar campos obrigatórios
    if (!email || !password || !name || !username) {
      return res.status(400).json({
        error: 'Campos obrigatórios: email, password, name, username',
      })
    }

    // Verificar se email já existe
    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return res.status(400).json({
        error: 'Email já está em uso.',
      })
    }

    // Verificar se username já existe
    const existingUsername = await User.findOne({ username })
    if (existingUsername) {
      return res.status(400).json({
        error: 'Username já está em uso.',
      })
    }

    // Criar user
    const user = await User.create({
      email,
      password,
      name,
      username,
      role: role || 'free', // Default: free
    })

    // Gerar tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
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

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e password são obrigatórios.',
      })
    }

    // Buscar user (incluir password)
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({
        error: 'Credenciais inválidas.',
      })
    }

    // Verificar password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenciais inválidas.',
      })
    }

    // Gerar tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
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
        error: 'Refresh token é obrigatório.',
      })
    }

    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken)

    // Buscar user
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        error: 'Utilizador não encontrado.',
      })
    }

    // Gerar novos tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return res.status(200).json({
      tokens,
    })
  } catch (error: any) {
    console.error('Refresh error:', error)
    return res.status(401).json({
      error: 'Refresh token inválido ou expirado.',
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
        error: 'Não autenticado.',
      })
    }

    // Retornar user (sem password)
    return res.status(200).json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        username: req.user.username,
        avatar: req.user.avatar,
        role: req.user.role,
        bio: req.user.bio,
        socialLinks: req.user.socialLinks,
        followers: req.user.followers,
        following: req.user.following,
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
 * Logout - Invalidar sessão (client-side apenas)
 * POST /api/auth/logout
 */
export const logout = async (req: AuthRequest, res: Response) => {
  // JWT é stateless, então logout é feito no client
  // Aqui podemos adicionar lógica futura (blacklist de tokens, etc.)
  return res.status(200).json({
    message: 'Logout efetuado com sucesso.',
  })
}
