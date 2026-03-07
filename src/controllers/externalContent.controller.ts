import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  SuggestedExternalContentType,
  externalContentService,
} from '../services/externalContent.service'

/**
 * List supported providers
 * GET /api/external-content/providers
 */
export const listSupportedExternalProviders = async (_req: AuthRequest, res: Response) => {
  try {
    const providers = externalContentService.getSupportedProviders()
    return res.status(200).json({ providers })
  } catch (error: any) {
    console.error('List external providers error:', error)
    return res.status(500).json({
      error: 'Erro ao listar providers externos',
      details: error.message,
    })
  }
}

/**
 * Import metadata from external URL
 * POST /api/external-content/import-url
 */
export const importExternalContentFromUrl = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const url = typeof req.body?.url === 'string' ? req.body.url : ''
    const requestedContentType =
      typeof req.body?.requestedContentType === 'string'
        ? (req.body.requestedContentType as SuggestedExternalContentType)
        : undefined

    if (!url.trim()) {
      return res.status(400).json({
        error: 'Campo obrigatorio: url',
      })
    }

    const result = await externalContentService.importFromUrl({
      url,
      requestedContentType,
    })

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Import external content error:', error)

    const message = String(error?.message ?? '')
    if (message.includes('URL invalida')) {
      return res.status(400).json({ error: message })
    }

    return res.status(500).json({
      error: 'Erro ao importar URL externa',
      details: message || 'Erro interno',
    })
  }
}