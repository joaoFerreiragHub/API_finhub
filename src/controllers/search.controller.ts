import { Request, Response } from 'express'
import { searchService } from '../services/search.service'
import { buildInternalErrorPayload } from '../utils/httpError'

const parsePositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

/**
 * GET /api/search
 */
export const globalSearch = async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (query.length < 2) {
      return res.status(400).json({
        error: 'Parametro q invalido. Usa pelo menos 2 caracteres.',
      })
    }

    const rawTypes: string[] = []

    if (typeof req.query.type === 'string') {
      rawTypes.push(req.query.type)
    }

    if (typeof req.query.types === 'string') {
      rawTypes.push(...req.query.types.split(','))
    }

    const result = await searchService.search(query, {
      limit: parsePositiveInt(req.query.limit),
      types: rawTypes,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    console.error('Global search error:', error)
    return res
      .status(500)
      .json(buildInternalErrorPayload('Erro ao executar pesquisa global.', error))
  }
}
