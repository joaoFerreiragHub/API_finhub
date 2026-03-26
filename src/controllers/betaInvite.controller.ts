import { Response } from 'express'
import { isValidObjectId } from 'mongoose'
import { BetaInvite } from '../models/BetaInvite'
import { AuthRequest } from '../types/auth'
import { logControllerError } from '../utils/domainLogger'

const CONTROLLER_DOMAIN = 'beta_invite_controller'
const EMAIL_REGEX = /^\S+@\S+\.\S+$/
const MAX_EMAILS_PER_REQUEST = 100

const parsePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const normalizeEmail = (value: string): string => value.trim().toLowerCase()

const isBulkDuplicateError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: unknown; name?: unknown }
  return maybeError.code === 11000 || maybeError.name === 'MongoBulkWriteError'
}

const countInsertedDocs = (error: unknown): number => {
  if (!error || typeof error !== 'object') return 0

  const maybeError = error as {
    insertedDocs?: unknown
    result?: { nInserted?: unknown }
  }

  if (Array.isArray(maybeError.insertedDocs)) {
    return maybeError.insertedDocs.length
  }

  if (typeof maybeError.result?.nInserted === 'number' && maybeError.result.nInserted >= 0) {
    return maybeError.result.nInserted
  }

  return 0
}

/**
 * POST /api/admin/beta/invites
 */
export const addBetaInvites = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }
    const actorId = req.user.id

    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
    const rawEmails = body.emails

    if (!Array.isArray(rawEmails)) {
      return res.status(400).json({
        error: 'Body invalido. Usa { emails: string[] }.',
      })
    }

    if (rawEmails.length === 0) {
      return res.status(400).json({
        error: 'Lista de emails vazia.',
      })
    }

    if (rawEmails.length > MAX_EMAILS_PER_REQUEST) {
      return res.status(400).json({
        error: `Maximo de ${MAX_EMAILS_PER_REQUEST} emails por pedido.`,
      })
    }

    const uniqueValidEmails: string[] = []
    const seen = new Set<string>()

    for (const entry of rawEmails) {
      if (typeof entry !== 'string') continue

      const email = normalizeEmail(entry)
      if (!email || !EMAIL_REGEX.test(email)) continue
      if (seen.has(email)) continue

      seen.add(email)
      uniqueValidEmails.push(email)
    }

    if (uniqueValidEmails.length === 0) {
      return res.status(200).json({
        added: 0,
        skipped: rawEmails.length,
        total: rawEmails.length,
      })
    }

    const mapped = uniqueValidEmails.map((email) => ({
      email,
      createdBy: actorId,
    }))

    let added = 0
    try {
      const inserted = await BetaInvite.insertMany(mapped, { ordered: false })
      added = inserted.length
    } catch (error: unknown) {
      if (!isBulkDuplicateError(error)) {
        throw error
      }
      added = countInsertedDocs(error)
    }

    return res.status(200).json({
      added,
      skipped: Math.max(0, rawEmails.length - added),
      total: rawEmails.length,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'add_beta_invites', error, req)
    return res.status(500).json({
      error: 'Erro ao adicionar convites beta.',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

/**
 * GET /api/admin/beta/invites
 */
export const listBetaInvites = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const usedRaw = typeof req.query.used === 'string' ? req.query.used.trim() : undefined
    if (usedRaw && usedRaw !== 'true' && usedRaw !== 'false') {
      return res.status(400).json({
        error: 'Parametro used invalido. Usa true ou false.',
      })
    }

    const page = parsePositiveInt(req.query.page, 1)
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 100)

    const filter: Record<string, unknown> = {}
    if (usedRaw === 'true') {
      filter.usedAt = { $ne: null }
    } else if (usedRaw === 'false') {
      filter.usedAt = null
    }

    const [invites, total] = await Promise.all([
      BetaInvite.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('email createdBy usedAt usedBy createdAt updatedAt')
        .lean(),
      BetaInvite.countDocuments(filter),
    ])

    return res.status(200).json({
      invites,
      total,
      page,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'list_beta_invites', error, req)
    return res.status(500).json({
      error: 'Erro ao listar convites beta.',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}

/**
 * DELETE /api/admin/beta/invites/:id
 */
export const deleteBetaInvite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticacao necessaria.',
      })
    }

    const inviteId = req.params.id
    if (!isValidObjectId(inviteId)) {
      return res.status(400).json({
        error: 'ID de convite invalido.',
      })
    }

    const invite = await BetaInvite.findById(inviteId).select('usedAt')
    if (!invite) {
      return res.status(404).json({
        error: 'Convite nao encontrado.',
      })
    }

    if (invite.usedAt) {
      return res.status(400).json({
        error: 'Convite ja foi utilizado. Nao pode ser removido.',
      })
    }

    await BetaInvite.findByIdAndDelete(inviteId)

    return res.status(200).json({
      success: true,
    })
  } catch (error: unknown) {
    logControllerError(CONTROLLER_DOMAIN, 'delete_beta_invite', error, req)
    return res.status(500).json({
      error: 'Erro ao remover convite beta.',
      details: error instanceof Error ? error.message : undefined,
    })
  }
}
