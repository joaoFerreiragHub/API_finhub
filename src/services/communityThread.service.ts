import mongoose from 'mongoose'
import type { ClientSession, PipelineStage } from 'mongoose'
import { CommunityPost, ICommunityHubContentRef } from '../models/CommunityPost'
import { CommunityReply } from '../models/CommunityReply'
import {
  CommunityVote,
  CommunityVoteDirection,
  CommunityVoteTargetType,
} from '../models/CommunityVote'
import { CommunityRoom } from '../models/CommunityRoom'
import { IUser, UserRole } from '../models/User'
import { UserXP } from '../models/UserXP'
import { getLevelName, xpService, XpAction } from './xp.service'

type CommunityPostSort = 'recent' | 'popular'

interface CommunityAuthorView {
  id: string
  name: string
  username: string
  avatar?: string
  level?: number
  levelName?: string
}

interface CommunityRoomSummaryView {
  id: string
  slug: string
  name: string
  requiredRole: UserRole
  isPremium: boolean
}

export interface CommunityPostListItemView {
  id: string
  room: CommunityRoomSummaryView
  author: CommunityAuthorView
  title: string
  imageUrl?: string
  upvotes: number
  downvotes: number
  score: number
  replyCount: number
  isPinned: boolean
  isLocked: boolean
  moderationStatus: 'visible' | 'hidden' | 'restricted'
  viewerVote: CommunityVoteDirection | null
  createdAt: string
  updatedAt: string
}

export interface CommunityPostDetailView extends CommunityPostListItemView {
  content: string
  hubContentRef?: {
    contentType: string
    contentId: string
  }
}

export interface CommunityReplyView {
  id: string
  postId: string
  parentReplyId: string | null
  author: CommunityAuthorView
  content: string
  upvotes: number
  downvotes: number
  score: number
  isMarkedHelpful: boolean
  moderationStatus: 'visible' | 'hidden' | 'restricted'
  viewerVote: CommunityVoteDirection | null
  createdAt: string
  updatedAt: string
}

export interface CommunityReplyThreadView extends CommunityReplyView {
  replies: CommunityReplyView[]
}

export interface CommunityPostsListResponse {
  room: CommunityRoomSummaryView
  items: CommunityPostListItemView[]
  pageInfo: {
    limit: number
    sort: CommunityPostSort
    hasMore: boolean
    nextCursor: string | null
  }
}

export interface CommunityPostDetailResponse {
  post: CommunityPostDetailView
  replies: CommunityReplyThreadView[]
}

export interface CommunityVoteResultResponse {
  targetType: CommunityVoteTargetType
  targetId: string
  upvotes: number
  downvotes: number
  score: number
  viewerVote: CommunityVoteDirection | null
}

export interface CreateCommunityPostInput {
  title: string
  content: string
  imageUrl?: string
  hubContentRef?: {
    contentType: string
    contentId: string
  }
}

export interface CreateCommunityReplyInput {
  content: string
  parentReplyId?: string
}

interface RoomAccessProjection {
  _id: unknown
  slug: string
  name: string
  requiredRole: UserRole
}

interface RawCommunityAuthor {
  _id?: unknown
  id?: string
  name?: string
  username?: string
  avatar?: string
}

interface RawCommunityPostProjection {
  _id: unknown
  room: unknown
  author: unknown
  title: string
  content: string
  imageUrl?: string | null
  upvotes: number
  downvotes: number
  replyCount: number
  isPinned: boolean
  isLocked: boolean
  moderationStatus: 'visible' | 'hidden' | 'restricted'
  hubContentRef?: ICommunityHubContentRef | null
  createdAt: Date
  updatedAt: Date
}

interface RawCommunityReplyProjection {
  _id: unknown
  post: unknown
  parentReply?: unknown
  author: unknown
  content: string
  upvotes: number
  downvotes: number
  isMarkedHelpful: boolean
  moderationStatus: 'visible' | 'hidden' | 'restricted'
  createdAt: Date
  updatedAt: Date
}

interface RecentCursorPayload {
  sort: 'recent'
  createdAt: string
  id: string
}

interface PopularCursorPayload {
  sort: 'popular'
  upvotes: number
  replyCount: number
  createdAt: string
  id: string
}

type CommunityCursorPayload = RecentCursorPayload | PopularCursorPayload

const DEFAULT_LIMIT = 15
const MAX_LIMIT = 40
const MAX_COMMUNITY_POST_IMAGE_URL_LENGTH = 2048

const ROLE_RANK: Record<UserRole, number> = {
  visitor: 0,
  free: 1,
  premium: 2,
  creator: 3,
  brand_manager: 4,
  admin: 5,
}

const normalizeLimit = (value?: number): number => {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(value), MAX_LIMIT)
}

const normalizeRole = (value?: UserRole): UserRole => {
  if (!value) return 'visitor'
  return ROLE_RANK[value] !== undefined ? value : 'visitor'
}

const canAccessRequiredRole = (role: UserRole, requiredRole: UserRole): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[requiredRole]

const toIso = (value?: Date): string => {
  if (!value || Number.isNaN(value.getTime())) {
    return new Date().toISOString()
  }
  return value.toISOString()
}

const TRANSACTION_UNSUPPORTED_PATTERN =
  /Transaction numbers are only allowed on a replica set member or mongos|does not support transactions|not a replica set member/i

const isTransactionUnsupportedError = (error: unknown): boolean => {
  const code =
    error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'number'
      ? ((error as { code: number }).code as number)
      : null

  if (code === 20 || code === 303) {
    return true
  }

  const message = error instanceof Error ? error.message : String(error ?? '')
  return TRANSACTION_UNSUPPORTED_PATTERN.test(message)
}

const toObjectId = (value: string, errorMessage: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new CommunityThreadServiceError(400, errorMessage)
  }

  return new mongoose.Types.ObjectId(value)
}

const toAuthorView = (value: unknown, authorLevelsMap?: Map<string, number>): CommunityAuthorView => {
  if (typeof value === 'string') {
    return {
      id: value,
      name: 'Utilizador',
      username: value,
    }
  }

  if (!value || typeof value !== 'object') {
    return {
      id: '',
      name: 'Utilizador',
      username: 'utilizador',
    }
  }

  const author = value as RawCommunityAuthor
  const id = String(author.id ?? author._id ?? '')
  const username = (author.username || '').trim()
  const name = (author.name || '').trim()
  const level = authorLevelsMap?.get(id)

  return {
    id,
    name: name || username || 'Utilizador',
    username: username || (id ? `user-${id.slice(-6)}` : 'utilizador'),
    avatar: typeof author.avatar === 'string' && author.avatar.trim() ? author.avatar : undefined,
    level: Number.isFinite(level) ? level : undefined,
    levelName: Number.isFinite(level) ? getLevelName(level as number) : undefined,
  }
}

const mapRoomSummary = (room: RoomAccessProjection): CommunityRoomSummaryView => ({
  id: String(room._id),
  slug: room.slug,
  name: room.name,
  requiredRole: room.requiredRole,
  isPremium: room.requiredRole !== 'visitor',
})

const decodeCursor = (
  cursorRaw: string | undefined,
  expectedSort: CommunityPostSort
): CommunityCursorPayload | null => {
  if (!cursorRaw) return null

  try {
    const parsed = JSON.parse(Buffer.from(cursorRaw, 'base64url').toString('utf8')) as {
      sort?: unknown
      createdAt?: unknown
      id?: unknown
      upvotes?: unknown
      replyCount?: unknown
    }

    if (parsed.sort !== expectedSort) {
      throw new Error('sort_mismatch')
    }

    if (expectedSort === 'recent') {
      if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
        throw new Error('invalid_recent_cursor')
      }

      if (Number.isNaN(new Date(parsed.createdAt).getTime()) || !mongoose.Types.ObjectId.isValid(parsed.id)) {
        throw new Error('invalid_recent_cursor')
      }

      return {
        sort: 'recent',
        createdAt: parsed.createdAt,
        id: parsed.id,
      }
    }

    const parsedPopular = parsed as {
      upvotes?: unknown
      replyCount?: unknown
      createdAt?: unknown
      id?: unknown
    }

    if (
      typeof parsedPopular.upvotes !== 'number' ||
      typeof parsedPopular.replyCount !== 'number' ||
      typeof parsedPopular.createdAt !== 'string' ||
      typeof parsedPopular.id !== 'string'
    ) {
      throw new Error('invalid_popular_cursor')
    }

    if (
      Number.isNaN(new Date(parsedPopular.createdAt).getTime()) ||
      !mongoose.Types.ObjectId.isValid(parsedPopular.id)
    ) {
      throw new Error('invalid_popular_cursor')
    }

    return {
      sort: 'popular',
      upvotes: Math.floor(parsedPopular.upvotes),
      replyCount: Math.floor(parsedPopular.replyCount),
      createdAt: parsedPopular.createdAt,
      id: parsedPopular.id,
    }
  } catch {
    throw new CommunityThreadServiceError(400, 'Cursor invalido.')
  }
}

const encodeCursor = (payload: CommunityCursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')

const mapPostListItem = (
  post: RawCommunityPostProjection,
  room: CommunityRoomSummaryView,
  viewerVote: CommunityVoteDirection | null,
  authorLevelsMap?: Map<string, number>
): CommunityPostListItemView => {
  const upvotes = Number(post.upvotes || 0)
  const downvotes = Number(post.downvotes || 0)

  return {
    id: String(post._id),
    room,
    author: toAuthorView(post.author, authorLevelsMap),
    title: post.title || '',
    imageUrl:
      typeof post.imageUrl === 'string' && post.imageUrl.trim().length > 0
        ? post.imageUrl
        : undefined,
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    replyCount: Number(post.replyCount || 0),
    isPinned: Boolean(post.isPinned),
    isLocked: Boolean(post.isLocked),
    moderationStatus: post.moderationStatus || 'visible',
    viewerVote,
    createdAt: toIso(post.createdAt),
    updatedAt: toIso(post.updatedAt),
  }
}

const mapReply = (
  reply: RawCommunityReplyProjection,
  viewerVote: CommunityVoteDirection | null,
  authorLevelsMap?: Map<string, number>
): CommunityReplyView => {
  const upvotes = Number(reply.upvotes || 0)
  const downvotes = Number(reply.downvotes || 0)

  return {
    id: String(reply._id),
    postId: String(reply.post),
    parentReplyId: reply.parentReply ? String(reply.parentReply) : null,
    author: toAuthorView(reply.author, authorLevelsMap),
    content: reply.content || '',
    upvotes,
    downvotes,
    score: upvotes - downvotes,
    isMarkedHelpful: Boolean(reply.isMarkedHelpful),
    moderationStatus: reply.moderationStatus || 'visible',
    viewerVote,
    createdAt: toIso(reply.createdAt),
    updatedAt: toIso(reply.updatedAt),
  }
}

const extractEntityId = (value: unknown): string | null => {
  if (!value) return null

  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || null
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return String(value)
  }

  if (typeof value === 'object') {
    const maybeRecord = value as { _id?: unknown; id?: unknown }
    if (typeof maybeRecord.id === 'string' && maybeRecord.id.trim()) {
      return maybeRecord.id.trim()
    }

    if (typeof maybeRecord._id === 'string' && maybeRecord._id.trim()) {
      return maybeRecord._id.trim()
    }

    if (maybeRecord._id instanceof mongoose.Types.ObjectId) {
      return String(maybeRecord._id)
    }
  }

  return null
}

export class CommunityThreadServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export class CommunityThreadService {
  private async awardXpBestEffort(input: {
    userId: string
    action: XpAction
    contentId?: string
  }): Promise<void> {
    try {
      await xpService.awardXp(input.userId, input.action, undefined, {
        contentId: input.contentId,
      })
    } catch (error) {
      console.error('Community XP award error:', error)
    }
  }

  private async getAuthorLevelsMap(authorValues: unknown[]): Promise<Map<string, number>> {
    const authorIds = Array.from(
      new Set(
        authorValues
          .map((value) => extractEntityId(value))
          .filter(
            (value): value is string =>
              typeof value === 'string' &&
              value.length > 0 &&
              mongoose.Types.ObjectId.isValid(value)
          )
      )
    )

    if (authorIds.length === 0) {
      return new Map()
    }

    const objectIds = authorIds.map((id) => new mongoose.Types.ObjectId(id))
    const rows = await UserXP.find({ user: { $in: objectIds } })
      .select('user level')
      .lean<Array<{ user: mongoose.Types.ObjectId; level?: number }>>()

    const levels = new Map<string, number>()
    for (const row of rows) {
      levels.set(String(row.user), Number.isFinite(row.level) ? Math.max(1, Math.floor(row.level!)) : 1)
    }

    return levels
  }

  async listPostsByRoom(
    slugRaw: string,
    viewer: IUser | undefined,
    options: { limit?: number; cursor?: string; sort?: CommunityPostSort } = {}
  ): Promise<CommunityPostsListResponse> {
    const sort: CommunityPostSort = options.sort === 'popular' ? 'popular' : 'recent'
    const limit = normalizeLimit(options.limit)
    const actorRole = normalizeRole(viewer?.role)

    const room = await this.getRoomBySlugWithAccess(slugRaw, actorRole)
    const roomSummary = mapRoomSummary(room)
    const cursor = decodeCursor(options.cursor, sort)

    const query: Record<string, unknown> = {
      room: room._id,
      moderationStatus: 'visible',
    }

    if (sort === 'recent' && cursor) {
      const cursorDate = new Date(cursor.createdAt)
      const cursorId = new mongoose.Types.ObjectId(cursor.id)
      query.$or = [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: cursorId } },
      ]
    }

    if (sort === 'popular' && cursor) {
      const popularCursor = cursor as PopularCursorPayload
      const cursorDate = new Date(popularCursor.createdAt)
      const cursorId = new mongoose.Types.ObjectId(popularCursor.id)

      query.$or = [
        { upvotes: { $lt: popularCursor.upvotes } },
        {
          upvotes: popularCursor.upvotes,
          replyCount: { $lt: popularCursor.replyCount },
        },
        {
          upvotes: popularCursor.upvotes,
          replyCount: popularCursor.replyCount,
          createdAt: { $lt: cursorDate },
        },
        {
          upvotes: popularCursor.upvotes,
          replyCount: popularCursor.replyCount,
          createdAt: cursorDate,
          _id: { $lt: cursorId },
        },
      ]
    }

    const sortSpec: Record<string, 1 | -1> =
      sort === 'popular'
        ? { upvotes: -1, replyCount: -1, createdAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 }

    const rows = await CommunityPost.find(query)
      .sort(sortSpec)
      .limit(limit + 1)
      .populate('author', 'name username avatar')
      .lean<RawCommunityPostProjection[]>()

    const hasMore = rows.length > limit
    const itemsSlice = hasMore ? rows.slice(0, limit) : rows

    const postIds = itemsSlice.map((item) => new mongoose.Types.ObjectId(String(item._id)))
    const viewerVotesMap = await this.getViewerVotesMap(viewer?.id, 'post', postIds)
    const authorLevelsMap = await this.getAuthorLevelsMap(itemsSlice.map((item) => item.author))

    const items = itemsSlice.map((item) =>
      mapPostListItem(item, roomSummary, viewerVotesMap.get(String(item._id)) ?? null, authorLevelsMap)
    )

    let nextCursor: string | null = null
    if (hasMore && itemsSlice.length > 0) {
      const last = itemsSlice[itemsSlice.length - 1]
      if (sort === 'popular') {
        nextCursor = encodeCursor({
          sort: 'popular',
          upvotes: Number(last.upvotes || 0),
          replyCount: Number(last.replyCount || 0),
          createdAt: toIso(last.createdAt),
          id: String(last._id),
        })
      } else {
        nextCursor = encodeCursor({
          sort: 'recent',
          createdAt: toIso(last.createdAt),
          id: String(last._id),
        })
      }
    }

    return {
      room: roomSummary,
      items,
      pageInfo: {
        limit,
        sort,
        hasMore,
        nextCursor,
      },
    }
  }

  async createPost(
    slugRaw: string,
    author: IUser,
    input: CreateCommunityPostInput
  ): Promise<{ post: CommunityPostDetailView }> {
    const room = await this.getRoomBySlugWithAccess(slugRaw, normalizeRole(author.role))

    const title = input.title.trim()
    const content = input.content.trim()
    const imageUrl = this.normalizePostImageUrl(input.imageUrl)
    if (!title || title.length > 200) {
      throw new CommunityThreadServiceError(400, 'Titulo invalido. Usa entre 1 e 200 caracteres.')
    }
    if (!content || content.length > 10000) {
      throw new CommunityThreadServiceError(400, 'Conteudo invalido. Usa entre 1 e 10000 caracteres.')
    }

    const hubContentRef = this.normalizeHubContentRef(input.hubContentRef)
    const isFirstPostInRoomByAuthor =
      (await CommunityPost.countDocuments({
        room: room._id,
        author: author._id,
      })) === 0

    const created = await CommunityPost.create({
      room: room._id,
      author: author._id,
      title,
      content,
      imageUrl,
      hubContentRef,
    })

    await CommunityRoom.findByIdAndUpdate(room._id, {
      $inc: { postCount: 1 },
    })

    const createdPost = await CommunityPost.findById(created._id)
      .populate('author', 'name username avatar')
      .lean<RawCommunityPostProjection | null>()

    if (!createdPost) {
      throw new CommunityThreadServiceError(500, 'Nao foi possivel carregar o post criado.')
    }

    await this.awardXpBestEffort({
      userId: author.id,
      action: 'post_created',
      contentId: `post:${String(created._id)}`,
    })

    if (isFirstPostInRoomByAuthor) {
      await this.awardXpBestEffort({
        userId: author.id,
        action: 'first_room_post',
        contentId: `room:${String(room._id)}`,
      })
    }

    const authorLevelsMap = await this.getAuthorLevelsMap([createdPost.author])
    const base = mapPostListItem(createdPost, mapRoomSummary(room), null, authorLevelsMap)
    return {
      post: {
        ...base,
        content: createdPost.content || '',
        hubContentRef: createdPost.hubContentRef
          ? {
              contentType: createdPost.hubContentRef.contentType,
              contentId: String(createdPost.hubContentRef.contentId),
            }
          : undefined,
      },
    }
  }

  async getPostDetailById(
    postIdRaw: string,
    viewer?: IUser
  ): Promise<CommunityPostDetailResponse> {
    const postId = toObjectId(postIdRaw, 'Post invalido.')

    const post = await CommunityPost.findOne({
      _id: postId,
      moderationStatus: 'visible',
    })
      .populate('author', 'name username avatar')
      .populate('room', 'slug name requiredRole')
      .lean<RawCommunityPostProjection | null>()

    if (!post) {
      throw new CommunityThreadServiceError(404, 'Post nao encontrado.')
    }

    const room = this.extractRoomFromPost(post.room)
    this.assertRoleAccess(normalizeRole(viewer?.role), room.requiredRole)

    const replies = await CommunityReply.find({
      post: postId,
      moderationStatus: 'visible',
    })
      .sort({ createdAt: 1, _id: 1 })
      .populate('author', 'name username avatar')
      .lean<RawCommunityReplyProjection[]>()

    const replyIds = replies.map((item) => new mongoose.Types.ObjectId(String(item._id)))
    const postVotesMap = await this.getViewerVotesMap(
      viewer?.id,
      'post',
      [new mongoose.Types.ObjectId(String(post._id))]
    )
    const replyVotesMap = await this.getViewerVotesMap(viewer?.id, 'reply', replyIds)
    const authorLevelsMap = await this.getAuthorLevelsMap([post.author, ...replies.map((reply) => reply.author)])

    const postSummary = mapPostListItem(
      post,
      mapRoomSummary(room),
      postVotesMap.get(String(post._id)) ?? null,
      authorLevelsMap
    )

    const mappedReplies = replies.map((reply) =>
      mapReply(reply, replyVotesMap.get(String(reply._id)) ?? null, authorLevelsMap)
    )

    const roots: CommunityReplyThreadView[] = []
    const rootsById = new Map<string, CommunityReplyThreadView>()

    for (const reply of mappedReplies) {
      if (!reply.parentReplyId) {
        const node: CommunityReplyThreadView = { ...reply, replies: [] }
        roots.push(node)
        rootsById.set(node.id, node)
      }
    }

    for (const reply of mappedReplies) {
      if (!reply.parentReplyId) continue
      const parent = rootsById.get(reply.parentReplyId)
      if (parent) {
        parent.replies.push(reply)
      } else {
        const fallbackRoot: CommunityReplyThreadView = { ...reply, parentReplyId: null, replies: [] }
        roots.push(fallbackRoot)
        rootsById.set(fallbackRoot.id, fallbackRoot)
      }
    }

    return {
      post: {
        ...postSummary,
        content: post.content || '',
        hubContentRef: post.hubContentRef
          ? {
              contentType: post.hubContentRef.contentType,
              contentId: String(post.hubContentRef.contentId),
            }
          : undefined,
      },
      replies: roots,
    }
  }

  async createReply(
    postIdRaw: string,
    author: IUser,
    input: CreateCommunityReplyInput
  ): Promise<{ reply: CommunityReplyView }> {
    const postId = toObjectId(postIdRaw, 'Post invalido.')
    const content = input.content.trim()

    if (!content || content.length > 5000) {
      throw new CommunityThreadServiceError(400, 'Conteudo invalido. Usa entre 1 e 5000 caracteres.')
    }

    const post = await CommunityPost.findOne({
      _id: postId,
      moderationStatus: 'visible',
    })
      .populate('room', 'slug name requiredRole')
      .lean<RawCommunityPostProjection | null>()

    if (!post) {
      throw new CommunityThreadServiceError(404, 'Post nao encontrado.')
    }

    const room = this.extractRoomFromPost(post.room)
    this.assertRoleAccess(normalizeRole(author.role), room.requiredRole)

    if (post.isLocked) {
      throw new CommunityThreadServiceError(409, 'Este post esta bloqueado para novas respostas.')
    }

    let parentReplyId: mongoose.Types.ObjectId | null = null
    if (input.parentReplyId) {
      parentReplyId = toObjectId(input.parentReplyId, 'parentReply invalido.')

      const parentReply = await CommunityReply.findOne({
        _id: parentReplyId,
        post: postId,
        moderationStatus: 'visible',
      }).lean<RawCommunityReplyProjection | null>()

      if (!parentReply) {
        throw new CommunityThreadServiceError(404, 'Resposta pai nao encontrada.')
      }

      if (parentReply.parentReply) {
        throw new CommunityThreadServiceError(
          400,
          'Apenas um nivel de aninhamento e permitido nas respostas.'
        )
      }
    }

    const reply = await CommunityReply.create({
      post: postId,
      parentReply: parentReplyId,
      author: author._id,
      content,
    })

    await CommunityPost.findByIdAndUpdate(postId, {
      $inc: { replyCount: 1 },
    })

    const createdReply = await CommunityReply.findById(reply._id)
      .populate('author', 'name username avatar')
      .lean<RawCommunityReplyProjection | null>()

    if (!createdReply) {
      throw new CommunityThreadServiceError(500, 'Nao foi possivel carregar a resposta criada.')
    }

    await this.awardXpBestEffort({
      userId: author.id,
      action: 'reply_created',
      contentId: `reply:${String(reply._id)}`,
    })

    const authorLevelsMap = await this.getAuthorLevelsMap([createdReply.author])

    return {
      reply: mapReply(createdReply, null, authorLevelsMap),
    }
  }

  async votePost(
    postIdRaw: string,
    user: IUser,
    direction: CommunityVoteDirection
  ): Promise<CommunityVoteResultResponse> {
    const postId = toObjectId(postIdRaw, 'Post invalido.')

    const post = await CommunityPost.findOne({
      _id: postId,
      moderationStatus: 'visible',
    })
      .populate('room', 'slug name requiredRole')
      .lean<RawCommunityPostProjection | null>()

    if (!post) {
      throw new CommunityThreadServiceError(404, 'Post nao encontrado.')
    }

    const room = this.extractRoomFromPost(post.room)
    this.assertRoleAccess(normalizeRole(user.role), room.requiredRole)

    const result = await this.applyVote('post', postId, user.id, direction)
    const postAuthorId = extractEntityId(post.author)
    if (
      direction === 'up' &&
      result.appliedUpvote &&
      postAuthorId &&
      postAuthorId !== user.id
    ) {
      await this.awardXpBestEffort({
        userId: postAuthorId,
        action: 'upvote_received',
        contentId: `post:${String(postId)}:voter:${user.id}`,
      })
    }

    return {
      targetType: 'post',
      targetId: String(postId),
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      score: result.upvotes - result.downvotes,
      viewerVote: result.viewerVote,
    }
  }

  async voteReply(
    replyIdRaw: string,
    user: IUser,
    direction: CommunityVoteDirection
  ): Promise<CommunityVoteResultResponse> {
    const replyId = toObjectId(replyIdRaw, 'Resposta invalida.')

    const reply = await CommunityReply.findOne({
      _id: replyId,
      moderationStatus: 'visible',
    }).lean<RawCommunityReplyProjection | null>()

    if (!reply) {
      throw new CommunityThreadServiceError(404, 'Resposta nao encontrada.')
    }

    const post = await CommunityPost.findOne({
      _id: reply.post,
      moderationStatus: 'visible',
    })
      .populate('room', 'slug name requiredRole')
      .lean<RawCommunityPostProjection | null>()

    if (!post) {
      throw new CommunityThreadServiceError(404, 'Post associado nao encontrado.')
    }

    const room = this.extractRoomFromPost(post.room)
    this.assertRoleAccess(normalizeRole(user.role), room.requiredRole)

    const result = await this.applyVote('reply', replyId, user.id, direction)

    return {
      targetType: 'reply',
      targetId: String(replyId),
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      score: result.upvotes - result.downvotes,
      viewerVote: result.viewerVote,
    }
  }

  private async getRoomBySlugWithAccess(
    slugRaw: string,
    actorRole: UserRole
  ): Promise<RoomAccessProjection> {
    const slug = slugRaw.trim().toLowerCase()
    if (!slug) {
      throw new CommunityThreadServiceError(400, 'Slug da sala invalido.')
    }

    const room = await CommunityRoom.findOne({
      slug,
      isPublic: true,
    }).lean<RoomAccessProjection | null>()

    if (!room) {
      throw new CommunityThreadServiceError(404, 'Sala da comunidade nao encontrada.')
    }

    this.assertRoleAccess(actorRole, room.requiredRole)
    return room
  }

  private assertRoleAccess(actorRole: UserRole, requiredRole: UserRole): void {
    if (!canAccessRequiredRole(actorRole, requiredRole)) {
      throw new CommunityThreadServiceError(
        403,
        'Nao tens permissao para aceder ao conteudo desta sala.'
      )
    }
  }

  private normalizeHubContentRef(
    value: CreateCommunityPostInput['hubContentRef']
  ): ICommunityHubContentRef | null {
    if (!value) return null

    const contentType = value.contentType.trim()
    const contentIdRaw = value.contentId.trim()

    if (!contentType) {
      throw new CommunityThreadServiceError(400, 'hubContentRef.contentType invalido.')
    }

    if (!mongoose.Types.ObjectId.isValid(contentIdRaw)) {
      throw new CommunityThreadServiceError(400, 'hubContentRef.contentId invalido.')
    }

    return {
      contentType,
      contentId: new mongoose.Types.ObjectId(contentIdRaw),
    }
  }

  private normalizePostImageUrl(value?: string): string | null {
    if (typeof value !== 'string') return null
    const imageUrl = value.trim()
    if (!imageUrl) return null

    if (imageUrl.length > MAX_COMMUNITY_POST_IMAGE_URL_LENGTH) {
      throw new CommunityThreadServiceError(
        400,
        `Campo imageUrl excede ${MAX_COMMUNITY_POST_IMAGE_URL_LENGTH} caracteres.`
      )
    }

    if (!/^https?:\/\/\S+$/i.test(imageUrl)) {
      throw new CommunityThreadServiceError(
        400,
        'Campo imageUrl invalido. Usa URL absoluta iniciada por http:// ou https://.'
      )
    }

    return imageUrl
  }

  private extractRoomFromPost(value: unknown): RoomAccessProjection {
    if (!value || typeof value !== 'object') {
      throw new CommunityThreadServiceError(500, 'Falha ao resolver sala do post.')
    }

    const room = value as Partial<RoomAccessProjection>
    if (!room._id || typeof room.slug !== 'string' || typeof room.name !== 'string' || !room.requiredRole) {
      throw new CommunityThreadServiceError(500, 'Dados da sala do post incompletos.')
    }

    return {
      _id: room._id,
      slug: room.slug,
      name: room.name,
      requiredRole: room.requiredRole,
    }
  }

  private async applyVote(
    targetType: CommunityVoteTargetType,
    targetId: mongoose.Types.ObjectId,
    userId: string,
    direction: CommunityVoteDirection
  ): Promise<{
    upvotes: number
    downvotes: number
    viewerVote: CommunityVoteDirection | null
    appliedUpvote: boolean
  }> {
    const userObjectId = toObjectId(userId, 'Utilizador invalido.')
    const session = await mongoose.startSession()

    try {
      const transactionalResult = await session.withTransaction(() =>
        this.applyVoteMutation({
          targetType,
          targetId,
          userObjectId,
          direction,
          session,
          rollbackOnCounterFailure: false,
        })
      )

      if (transactionalResult) {
        return transactionalResult
      }

      throw new CommunityThreadServiceError(500, 'Nao foi possivel concluir o voto.')
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error
      }

      // NOTE: MongoDB transactions require a replica set (Atlas/mongos). In standalone development
      // we fallback to sequential writes with best-effort rollback to keep vote/counter consistency.
      return this.applyVoteMutation({
        targetType,
        targetId,
        userObjectId,
        direction,
        rollbackOnCounterFailure: true,
      })
    } finally {
      await session.endSession()
    }
  }

  private async applyVoteMutation(input: {
    targetType: CommunityVoteTargetType
    targetId: mongoose.Types.ObjectId
    userObjectId: mongoose.Types.ObjectId
    direction: CommunityVoteDirection
    session?: ClientSession
    rollbackOnCounterFailure: boolean
  }): Promise<{
    upvotes: number
    downvotes: number
    viewerVote: CommunityVoteDirection | null
    appliedUpvote: boolean
  }> {
    let voteQuery = CommunityVote.findOne({
      user: input.userObjectId,
      targetType: input.targetType,
      targetId: input.targetId,
    })

    if (input.session) {
      voteQuery = voteQuery.session(input.session)
    }

    const existingVote = await voteQuery
    const previousDirection = existingVote ? existingVote.direction : null

    let viewerVote: CommunityVoteDirection | null = input.direction
    let deltaUp = 0
    let deltaDown = 0
    let appliedUpvote = false

    if (!existingVote) {
      const createdVote = new CommunityVote({
        user: input.userObjectId,
        targetType: input.targetType,
        targetId: input.targetId,
        direction: input.direction,
      })

      await createdVote.save(input.session ? { session: input.session } : undefined)

      if (input.direction === 'up') {
        deltaUp = 1
        appliedUpvote = true
      } else {
        deltaDown = 1
      }
    } else if (existingVote.direction === input.direction) {
      await existingVote.deleteOne(input.session ? { session: input.session } : undefined)
      viewerVote = null

      if (input.direction === 'up') {
        deltaUp = -1
      } else {
        deltaDown = -1
      }
    } else {
      const existingDirection = existingVote.direction
      existingVote.direction = input.direction
      await existingVote.save(input.session ? { session: input.session } : undefined)

      if (existingDirection === 'up') {
        deltaUp = -1
        deltaDown = 1
      } else {
        deltaUp = 1
        deltaDown = -1
        appliedUpvote = true
      }
    }

    try {
      const counters = await this.updateVoteCounters({
        targetType: input.targetType,
        targetId: input.targetId,
        deltaUp,
        deltaDown,
        session: input.session,
      })

      return {
        upvotes: counters.upvotes,
        downvotes: counters.downvotes,
        viewerVote,
        appliedUpvote,
      }
    } catch (error) {
      if (input.rollbackOnCounterFailure) {
        try {
          await this.rollbackVoteMutation({
            userObjectId: input.userObjectId,
            targetType: input.targetType,
            targetId: input.targetId,
            previousDirection,
          })
        } catch (rollbackError) {
          console.error('Community vote rollback error:', rollbackError)
        }
      }

      throw error
    }
  }

  private async rollbackVoteMutation(input: {
    userObjectId: mongoose.Types.ObjectId
    targetType: CommunityVoteTargetType
    targetId: mongoose.Types.ObjectId
    previousDirection: CommunityVoteDirection | null
  }): Promise<void> {
    if (!input.previousDirection) {
      await CommunityVote.deleteOne({
        user: input.userObjectId,
        targetType: input.targetType,
        targetId: input.targetId,
      })
      return
    }

    await CommunityVote.findOneAndUpdate(
      {
        user: input.userObjectId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
      {
        $set: {
          direction: input.previousDirection,
        },
        $setOnInsert: {
          user: input.userObjectId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      {
        upsert: true,
      }
    )
  }

  private async updateVoteCounters(input: {
    targetType: CommunityVoteTargetType,
    targetId: mongoose.Types.ObjectId,
    deltaUp: number,
    deltaDown: number
    session?: ClientSession
  }): Promise<{ upvotes: number; downvotes: number }> {
    const updatePipeline: PipelineStage[] = [
      {
        $set: {
          upvotes: {
            $max: [0, { $add: ['$upvotes', input.deltaUp] }],
          },
          downvotes: {
            $max: [0, { $add: ['$downvotes', input.deltaDown] }],
          },
        },
      },
    ]

    if (input.targetType === 'post') {
      let postQuery = CommunityPost.findOneAndUpdate({ _id: input.targetId }, updatePipeline, {
        new: true,
      }).select('upvotes downvotes')

      if (input.session) {
        postQuery = postQuery.session(input.session)
      }

      const post = await postQuery.lean<{ upvotes?: number; downvotes?: number } | null>()
      if (!post) {
        throw new CommunityThreadServiceError(404, 'Post nao encontrado.')
      }

      return {
        upvotes: Number(post.upvotes || 0),
        downvotes: Number(post.downvotes || 0),
      }
    }

    let replyQuery = CommunityReply.findOneAndUpdate({ _id: input.targetId }, updatePipeline, {
      new: true,
    }).select('upvotes downvotes')

    if (input.session) {
      replyQuery = replyQuery.session(input.session)
    }

    const reply = await replyQuery.lean<{ upvotes?: number; downvotes?: number } | null>()
    if (!reply) {
      throw new CommunityThreadServiceError(404, 'Resposta nao encontrada.')
    }

    return {
      upvotes: Number(reply.upvotes || 0),
      downvotes: Number(reply.downvotes || 0),
    }
  }

  private async getViewerVotesMap(
    userId: string | undefined,
    targetType: CommunityVoteTargetType,
    targetIds: mongoose.Types.ObjectId[]
  ): Promise<Map<string, CommunityVoteDirection>> {
    if (!userId || targetIds.length === 0) {
      return new Map()
    }

    const userObjectId = toObjectId(userId, 'Utilizador invalido.')
    const votes = await CommunityVote.find({
      user: userObjectId,
      targetType,
      targetId: { $in: targetIds },
    })
      .select('targetId direction')
      .lean<Array<{ targetId: mongoose.Types.ObjectId; direction: CommunityVoteDirection }>>()

    return new Map(votes.map((vote) => [String(vote.targetId), vote.direction]))
  }
}

export const communityThreadService = new CommunityThreadService()
