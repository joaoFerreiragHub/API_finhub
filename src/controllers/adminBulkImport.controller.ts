import { Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  AdminBulkImportServiceError,
  adminBulkImportService,
} from '../services/adminBulkImport.service'
import { readAdminNote, readAdminReason } from '../utils/adminActionPayload'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'admin_bulk_import_controller'

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const extractBodyRecord = (req: AuthRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return {}
  return req.body as Record<string, unknown>
}

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof AdminBulkImportServiceError) {
    return res.status(error.statusCode).json({ error: error.message })
  }

  return res.status(500).json({
    error: fallbackMessage,
    details: error instanceof Error ? error.message : undefined,
  })
}

/**
 * GET /api/admin/operations/bulk-import/jobs
 */
export const listAdminBulkImportJobs = async (req: AuthRequest, res: Response) => {
  try {
    const isDryRunRaw = toOptionalString(req.query.dryRun)
    const dryRun =
      isDryRunRaw === 'true' || isDryRunRaw === '1'
        ? true
        : isDryRunRaw === 'false' || isDryRunRaw === '0'
          ? false
          : undefined

    const result = await adminBulkImportService.listJobs(
      {
        importType: toOptionalString(req.query.importType) as any,
        status: toOptionalString(req.query.status) as any,
        dryRun,
      },
      {
        page: toOptionalNumber(req.query.page),
        limit: toOptionalNumber(req.query.limit),
      }
    )

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_admin_bulk_import_jobs', error, req)
    return handleError(res, error, 'Erro ao listar jobs de bulk import.')
  }
}

/**
 * GET /api/admin/operations/bulk-import/jobs/:jobId
 */
export const getAdminBulkImportJob = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminBulkImportService.getJob(req.params.jobId)
    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'get_admin_bulk_import_job', error, req)
    return handleError(res, error, 'Erro ao obter job de bulk import.')
  }
}

/**
 * POST /api/admin/operations/bulk-import/preview
 */
export const previewAdminBulkImport = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const body = extractBodyRecord(req)
    const result = await adminBulkImportService.previewImport({
      actorId: req.user.id,
      actorRole: req.user.role,
      importType: body.importType as any,
      csv: typeof body.csv === 'string' ? body.csv : '',
      delimiter: toOptionalString(body.delimiter),
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'preview_admin_bulk_import', error, req)
    return handleError(res, error, 'Erro ao pre-visualizar bulk import.')
  }
}

/**
 * POST /api/admin/operations/bulk-import/jobs
 */
export const createAdminBulkImportJob = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria.' })
    }

    const reasonParsed = readAdminReason(req)
    if (reasonParsed.error) {
      return res.status(400).json({ error: reasonParsed.error })
    }
    if (!reasonParsed.value) {
      return res.status(400).json({ error: 'Motivo obrigatorio para executar bulk import.' })
    }

    const noteParsed = readAdminNote(req)
    if (noteParsed.error) {
      return res.status(400).json({ error: noteParsed.error })
    }

    const body = extractBodyRecord(req)
    const result = await adminBulkImportService.createAndRunImport({
      actorId: req.user.id,
      actorRole: req.user.role,
      importType: body.importType as any,
      csv: typeof body.csv === 'string' ? body.csv : '',
      delimiter: toOptionalString(body.delimiter),
      dryRun: body.dryRun === true,
      reason: reasonParsed.value,
      note: noteParsed.value,
    })

    return res.status(201).json({
      message: 'Job de bulk import executado com sucesso.',
      item: result,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'create_admin_bulk_import_job', error, req)
    return handleError(res, error, 'Erro ao executar bulk import.')
  }
}
