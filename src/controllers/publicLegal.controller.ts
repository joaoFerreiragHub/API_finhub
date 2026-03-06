import { Request, Response } from 'express'
import {
  getLegalDocument,
  isLegalDocumentKey,
  listLegalDocuments,
} from '../services/legalDocument.service'

/**
 * GET /api/platform/legal/documents
 */
export const listPublicLegalDocuments = (_req: Request, res: Response) => {
  return res.status(200).json({
    documents: listLegalDocuments(),
  })
}

/**
 * GET /api/platform/legal/:documentKey
 */
export const getPublicLegalDocument = (req: Request, res: Response) => {
  const documentKey = req.params.documentKey?.trim()

  if (!documentKey || !isLegalDocumentKey(documentKey)) {
    return res.status(400).json({
      error: 'Parametro documentKey invalido.',
      allowed: ['terms', 'privacy', 'cookies', 'financial-disclaimer'],
    })
  }

  return res.status(200).json({
    document: getLegalDocument(documentKey),
  })
}

