import { Response } from 'express'
import {
  contentReportService,
  ContentReportServiceError,
  isValidContentReportReason,
  isValidReportedContentType,
} from '../services/contentReport.service'
import { AuthRequest } from '../types/auth'

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> | undefined => {
  const body = req.body
  if (!body || typeof body !== 'object') return undefined
  return body as Record<string, unknown>
}

const handleContentReportError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof ContentReportServiceError) {
    return res.status(error.statusCode).json({
      error: error.message,
    })
  }

  const details = error instanceof Error ? error.message : undefined
  return res.status(500).json({
    error: fallbackMessage,
    details,
  })
}

/**
 * POST /api/reports/content
 */
export const createContentReport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const body = extractBodyRecord(req)
    const contentType = body?.contentType
    const contentId = body?.contentId
    const reason = body?.reason
    const note = typeof body?.note === 'string' ? body.note : undefined

    if (!isValidReportedContentType(contentType)) {
      return res.status(400).json({
        error: 'Parametro contentType invalido.',
      })
    }

    if (typeof contentId !== 'string') {
      return res.status(400).json({
        error: 'Parametro contentId invalido.',
      })
    }

    if (!isValidContentReportReason(reason)) {
      return res.status(400).json({
        error: 'Parametro reason invalido.',
      })
    }

    const result = await contentReportService.createOrUpdateReport({
      reporterId: req.user.id,
      contentType,
      contentId,
      reason,
      note,
    })

    return res.status(result.created ? 201 : 200).json({
      message: result.created ? 'Report criado com sucesso.' : 'Report atualizado com sucesso.',
      created: result.created,
      report: result.report,
    })
  } catch (error: unknown) {
    console.error('Create content report error:', error)
    return handleContentReportError(res, error, 'Erro ao criar report de conteudo.')
  }
}
