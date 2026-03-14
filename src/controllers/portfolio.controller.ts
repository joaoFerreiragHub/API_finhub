import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  CreatePortfolioHoldingInput,
  CreatePortfolioInput,
  PortfolioServiceError,
  SimulatePortfolioInput,
  UpdatePortfolioHoldingInput,
  UpdatePortfolioInput,
  portfolioService,
} from '../services/portfolio.service'

const parseOptionalPositiveInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isInteger(parsed) && parsed > 0) return parsed
  }
  return undefined
}

const handlePortfolioError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof PortfolioServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

const requireAuthUserId = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticacao necessaria.' })
    return null
  }
  return req.user.id
}

/**
 * POST /api/portfolio
 */
export const createPortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const input = req.body as CreatePortfolioInput
    const result = await portfolioService.createPortfolio(userId, input)
    return res.status(201).json(result)
  } catch (error: unknown) {
    console.error('Create portfolio error:', error)
    return handlePortfolioError(res, error, 'Erro ao criar portfolio.')
  }
}

/**
 * GET /api/portfolio
 */
export const listPortfolios = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const result = await portfolioService.listPortfolios(userId, {
      page: parseOptionalPositiveInt(req.query.page),
      limit: parseOptionalPositiveInt(req.query.limit),
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('List portfolios error:', error)
    return handlePortfolioError(res, error, 'Erro ao listar portfolios.')
  }
}

/**
 * GET /api/portfolio/:id
 */
export const getPortfolioById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const result = await portfolioService.getPortfolio(userId, req.params.id)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Get portfolio error:', error)
    return handlePortfolioError(res, error, 'Erro ao obter portfolio.')
  }
}

/**
 * PATCH /api/portfolio/:id
 */
export const updatePortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const input = req.body as UpdatePortfolioInput
    const result = await portfolioService.updatePortfolio(userId, req.params.id, input)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Update portfolio error:', error)
    return handlePortfolioError(res, error, 'Erro ao atualizar portfolio.')
  }
}

/**
 * DELETE /api/portfolio/:id
 */
export const deletePortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const result = await portfolioService.deletePortfolio(userId, req.params.id)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Delete portfolio error:', error)
    return handlePortfolioError(res, error, 'Erro ao eliminar portfolio.')
  }
}

/**
 * POST /api/portfolio/:id/holdings
 */
export const addPortfolioHolding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const input = req.body as CreatePortfolioHoldingInput
    const result = await portfolioService.addHolding(userId, req.params.id, input)
    return res.status(201).json(result)
  } catch (error: unknown) {
    console.error('Add portfolio holding error:', error)
    return handlePortfolioError(res, error, 'Erro ao adicionar holding.')
  }
}

/**
 * PATCH /api/portfolio/:id/holdings/:holdingId
 */
export const updatePortfolioHolding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const input = req.body as UpdatePortfolioHoldingInput
    const result = await portfolioService.updateHolding(
      userId,
      req.params.id,
      req.params.holdingId,
      input
    )
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Update portfolio holding error:', error)
    return handlePortfolioError(res, error, 'Erro ao atualizar holding.')
  }
}

/**
 * DELETE /api/portfolio/:id/holdings/:holdingId
 */
export const deletePortfolioHolding = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const result = await portfolioService.deleteHolding(userId, req.params.id, req.params.holdingId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Delete portfolio holding error:', error)
    return handlePortfolioError(res, error, 'Erro ao eliminar holding.')
  }
}

/**
 * POST /api/portfolio/:id/simulate
 */
export const simulatePortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireAuthUserId(req, res)
    if (!userId) return

    const input = req.body as SimulatePortfolioInput
    const result = await portfolioService.simulatePortfolio(userId, req.params.id, input)
    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Simulate portfolio error:', error)
    return handlePortfolioError(res, error, 'Erro ao simular portfolio FIRE.')
  }
}
