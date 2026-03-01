import mongoose from 'mongoose'
import {
  IPlatformSurfaceControl,
  PlatformSurfaceControl,
  PlatformSurfaceKey,
} from '../models/PlatformSurfaceControl'

interface SurfaceControlDefinition {
  key: PlatformSurfaceKey
  label: string
  description: string
  impact: 'read' | 'write'
}

interface SurfaceControlActor {
  id: string
  name?: string
  username?: string
  email?: string
  role?: string
}

interface UpdateSurfaceControlInput {
  actorId: string
  key: PlatformSurfaceKey
  enabled: boolean
  reason: string
  note?: string
  publicMessage?: string
}

const SURFACE_CONTROL_DEFINITIONS: SurfaceControlDefinition[] = [
  {
    key: 'editorial_home',
    label: 'Home editorial',
    description: 'Curadoria publica da homepage editorial.',
    impact: 'read',
  },
  {
    key: 'editorial_verticals',
    label: 'Landings editoriais',
    description: 'Landings/show-all das verticais editoriais.',
    impact: 'read',
  },
  {
    key: 'comments_read',
    label: 'Leitura de comentarios',
    description: 'Listagens e arvore publica de comentarios.',
    impact: 'read',
  },
  {
    key: 'comments_write',
    label: 'Escrita de comentarios',
    description: 'Criacao de comentarios, respostas e interacoes associadas.',
    impact: 'write',
  },
  {
    key: 'reviews_read',
    label: 'Leitura de reviews',
    description: 'Listagens e estatisticas publicas de reviews.',
    impact: 'read',
  },
  {
    key: 'reviews_write',
    label: 'Escrita de reviews',
    description: 'Criacao/edicao de ratings, reviews e reacoes.',
    impact: 'write',
  },
]

const SURFACE_KEYS = SURFACE_CONTROL_DEFINITIONS.map((item) => item.key)

const toNullableTrimmed = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toObjectId = (rawId: string, fieldName: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new SurfaceControlServiceError(400, `${fieldName} invalido.`)
  }

  return new mongoose.Types.ObjectId(rawId)
}

export const isValidSurfaceControlKey = (value: unknown): value is PlatformSurfaceKey =>
  typeof value === 'string' && SURFACE_KEYS.includes(value as PlatformSurfaceKey)

export class SurfaceControlServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class SurfaceControlService {
  async listControls() {
    const rows = (await PlatformSurfaceControl.find({
      key: { $in: SURFACE_KEYS },
    })
      .populate('updatedBy', 'name username email role')
      .lean()) as Array<Partial<IPlatformSurfaceControl> & { updatedBy?: SurfaceControlActor | null }>

    const lookup = new Map<string, Partial<IPlatformSurfaceControl> & { updatedBy?: SurfaceControlActor | null }>()
    for (const row of rows) {
      lookup.set(String(row.key), row)
    }

    return {
      generatedAt: new Date(),
      items: SURFACE_CONTROL_DEFINITIONS.map((definition) =>
        this.mapControl(definition, lookup.get(definition.key) ?? null)
      ),
    }
  }

  async updateControl(input: UpdateSurfaceControlInput) {
    const actorId = toObjectId(input.actorId, 'actorId')
    if (!isValidSurfaceControlKey(input.key)) {
      throw new SurfaceControlServiceError(400, 'surfaceKey invalido.')
    }

    const reason = toNullableTrimmed(input.reason)
    if (!reason) {
      throw new SurfaceControlServiceError(400, 'reason e obrigatorio.')
    }

    const updated = (await PlatformSurfaceControl.findOneAndUpdate(
      { key: input.key },
      {
        $set: {
          enabled: input.enabled,
          reason,
          note: toNullableTrimmed(input.note),
          publicMessage: toNullableTrimmed(input.publicMessage),
          updatedBy: actorId,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate('updatedBy', 'name username email role')
      .lean()) as (Partial<IPlatformSurfaceControl> & { updatedBy?: SurfaceControlActor | null }) | null

    const definition = SURFACE_CONTROL_DEFINITIONS.find((item) => item.key === input.key)
    if (!definition || !updated) {
      throw new SurfaceControlServiceError(500, 'Erro ao atualizar kill switch de superficie.')
    }

    return this.mapControl(definition, updated)
  }

  async getPublicControl(key: PlatformSurfaceKey) {
    if (!isValidSurfaceControlKey(key)) {
      throw new SurfaceControlServiceError(400, 'surfaceKey invalido.')
    }

    const doc = (await PlatformSurfaceControl.findOne({ key }).lean()) as Partial<IPlatformSurfaceControl> | null

    return {
      key,
      enabled: doc?.enabled !== false,
      publicMessage: doc?.publicMessage ?? null,
      reason: doc?.reason ?? null,
      updatedAt: doc?.updatedAt ?? null,
    }
  }

  private mapControl(
    definition: SurfaceControlDefinition,
    row: (Partial<IPlatformSurfaceControl> & { updatedBy?: SurfaceControlActor | null }) | null
  ) {
    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      impact: definition.impact,
      enabled: row?.enabled !== false,
      reason: row?.reason ?? null,
      note: row?.note ?? null,
      publicMessage: row?.publicMessage ?? null,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    }
  }
}

export const surfaceControlService = new SurfaceControlService()
