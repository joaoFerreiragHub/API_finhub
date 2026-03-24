import { CommunityRoom, CommunityRoomCategory } from '../models/CommunityRoom'
import { UserRole } from '../models/User'
import { logError, logInfo } from '../utils/logger'

interface CommunityRoomSeedItem {
  slug: string
  name: string
  description: string
  icon: string
  category: CommunityRoomCategory
  requiredRole: UserRole
  isPremium: boolean
  sortOrder: number
}

export interface CommunityRoomView {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  category: CommunityRoomCategory
  isPublic: boolean
  requiredRole: UserRole
  moderators: string[]
  postCount: number
  memberCount: number
  isPremium: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface CommunityRoomListResponse {
  items: CommunityRoomView[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export class CommunityRoomServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 12
const MAX_LIMIT = 50

const DEFAULT_COMMUNITY_ROOMS: readonly CommunityRoomSeedItem[] = [
  {
    slug: 'geral',
    name: 'Geral',
    description: 'Discussao geral sobre literacia financeira, noticias e ideias da comunidade.',
    icon: '📢',
    category: 'general',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 10,
  },
  {
    slug: 'poupanca-orcamento',
    name: 'Poupanca e Orcamento',
    description: 'Partilha estrategias de poupanca, organizacao financeira e controlo mensal.',
    icon: '💰',
    category: 'budgeting',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 20,
  },
  {
    slug: 'investimento-bolsa',
    name: 'Investimento e Bolsa',
    description: 'Debates sobre acoes, ETFs, estrategias de investimento e disciplina.',
    icon: '📈',
    category: 'investing',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 30,
  },
  {
    slug: 'imobiliario',
    name: 'Imobiliario',
    description: 'Conversa sobre compra de casa, arrendamento, REITs e analise de oportunidades.',
    icon: '🏠',
    category: 'real_estate',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 40,
  },
  {
    slug: 'fire-independencia-financeira',
    name: 'FIRE - Independencia Financeira',
    description: 'Metas FIRE, taxa de poupanca, planeamento de longo prazo e experiencias reais.',
    icon: '🔥',
    category: 'fire',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 50,
  },
  {
    slug: 'credito-dividas',
    name: 'Credito e Dividas',
    description: 'Duvidas sobre credito habitacao, consolidacao de divida e negociacao de taxas.',
    icon: '💳',
    category: 'credit',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 60,
  },
  {
    slug: 'financas-emigrantes',
    name: 'Financas para Emigrantes',
    description: 'Fiscalidade, transferencias e organizacao financeira para quem vive fora.',
    icon: '🌍',
    category: 'expat',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 70,
  },
  {
    slug: 'primeiros-passos',
    name: 'Primeiros Passos (Iniciantes)',
    description: 'Sala para comecar do zero em financas pessoais com linguagem simples.',
    icon: '🎓',
    category: 'beginners',
    requiredRole: 'visitor',
    isPremium: false,
    sortOrder: 80,
  },
  {
    slug: 'analise-carteiras',
    name: 'Analise de Carteiras',
    description: 'Discussao premium sobre composicao de carteira, risco e alocacao.',
    icon: '🔐',
    category: 'premium',
    requiredRole: 'premium',
    isPremium: true,
    sortOrder: 90,
  },
  {
    slug: 'oportunidades-avancadas',
    name: 'Oportunidades Avancadas',
    description: 'Sala premium para setups avancados, oportunidades e leitura de mercado.',
    icon: '🔐',
    category: 'premium',
    requiredRole: 'premium',
    isPremium: true,
    sortOrder: 100,
  },
  {
    slug: 'acesso-direto-a-criadores',
    name: 'Acesso Directo a Criadores',
    description: 'Espaco premium para interacao direta, perguntas e discussoes com criadores.',
    icon: '🔐',
    category: 'premium',
    requiredRole: 'premium',
    isPremium: true,
    sortOrder: 110,
  },
]

interface RawCommunityRoomProjection {
  _id: unknown
  slug: string
  name: string
  description: string
  icon: string
  category: CommunityRoomCategory
  isPublic: boolean
  requiredRole: UserRole
  moderators?: Array<unknown>
  postCount: number
  memberCount: number
  isPremium: boolean
  sortOrder: number
  createdAt?: Date
  updatedAt?: Date
}

const normalizePage = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_PAGE
  return Math.floor(value)
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const toIso = (value?: Date): string | undefined => {
  if (!value || Number.isNaN(value.getTime())) return undefined
  return value.toISOString()
}

const mapRoom = (room: RawCommunityRoomProjection): CommunityRoomView => ({
  id: String(room._id),
  slug: room.slug,
  name: room.name,
  description: room.description,
  icon: room.icon,
  category: room.category,
  isPublic: Boolean(room.isPublic),
  requiredRole: room.requiredRole,
  moderators: Array.isArray(room.moderators)
    ? room.moderators
        .filter((moderator) => moderator !== null && moderator !== undefined)
        .map((moderator) => String(moderator))
    : [],
  postCount: Number(room.postCount || 0),
  memberCount: Number(room.memberCount || 0),
  isPremium: Boolean(room.isPremium),
  sortOrder: Number(room.sortOrder || 0),
  createdAt: toIso(room.createdAt),
  updatedAt: toIso(room.updatedAt),
})

export const seedCommunityRooms = async (): Promise<void> => {
  try {
    const count = await CommunityRoom.countDocuments()
    if (count > 0) {
      return
    }

    await CommunityRoom.insertMany(
      DEFAULT_COMMUNITY_ROOMS.map((item) => ({
        ...item,
        isPublic: true,
        moderators: [],
        postCount: 0,
        memberCount: 0,
      }))
    )

    logInfo('community_rooms_seeded', {
      rooms: DEFAULT_COMMUNITY_ROOMS.length,
    })
  } catch (error) {
    logError('community_rooms_seed_failed', error)
    throw error
  }
}

export class CommunityRoomService {
  async listPublicRooms(
    options: { page?: number; limit?: number; category?: CommunityRoomCategory } = {}
  ): Promise<CommunityRoomListResponse> {
    const page = normalizePage(options.page)
    const limit = normalizeLimit(options.limit)
    const skip = (page - 1) * limit

    const query: { isPublic: boolean; category?: CommunityRoomCategory } = { isPublic: true }
    if (options.category) {
      query.category = options.category
    }

    const [items, total] = await Promise.all([
      CommunityRoom.find(query)
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean<RawCommunityRoomProjection[]>(),
      CommunityRoom.countDocuments(query),
    ])

    return {
      items: items.map((item) => mapRoom(item)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getPublicRoomBySlug(slugRaw: string): Promise<CommunityRoomView> {
    const slug = slugRaw.trim().toLowerCase()
    if (!slug) {
      throw new CommunityRoomServiceError(400, 'Slug da sala invalido.')
    }

    const room = await CommunityRoom.findOne({
      slug,
      isPublic: true,
    }).lean<RawCommunityRoomProjection | null>()

    if (!room) {
      throw new CommunityRoomServiceError(404, 'Sala da comunidade nao encontrada.')
    }

    return mapRoom(room)
  }
}

export const communityRoomService = new CommunityRoomService()
