import mongoose from 'mongoose'
import type { PipelineStage } from 'mongoose'
import { calculateXpLevel, IUserXP, IUserXpHistoryEntry, UserXP } from '../models/UserXP'
import { User } from '../models/User'

export type XpAction =
  | 'post_created'
  | 'reply_created'
  | 'upvote_received'
  | 'article_completed'
  | 'course_completed'
  | 'onboarding_completed'
  | 'daily_streak'
  | 'first_room_post'
  | 'helpful_answer'
  | 'content_saved_by_others'
  | 'profile_completed'
  | 'post_spam'
  | 'content_hidden'

export const XP_ACTION_VALUES: Record<XpAction, number> = {
  post_created: 10,
  reply_created: 5,
  upvote_received: 2,
  article_completed: 15,
  course_completed: 100,
  onboarding_completed: 25,
  daily_streak: 5,
  first_room_post: 20,
  helpful_answer: 30,
  content_saved_by_others: 10,
  profile_completed: 50,
  post_spam: -20,
  content_hidden: -50,
}

const MAX_HISTORY_ENTRIES = 100
const DAILY_STREAK_DAYS_FOR_BADGE = 7
const LEADERBOARD_LIMIT = 10
const LEADERBOARD_TOP_BADGE_LIMIT = 3
const LEADERBOARD_VISIBLE_BADGE_IDS = new Set<XpBadgeId>(['top_da_semana', 'fire_master'])

const LEVEL_NAMES: Record<number, string> = {
  1: 'Novato Financeiro',
  2: 'Poupador',
  3: 'Investidor',
  4: 'Estratega',
  5: 'Independente',
  6: 'FIRE Walker',
  7: 'Guru Financeiro',
}

export type XpBadgeId =
  | 'primeiros_passos'
  | 'leitor_dedicado'
  | 'estudante'
  | 'sociavel'
  | 'contribuidor'
  | 'em_chama'
  | 'top_da_semana'
  | 'premium'
  | 'fire_master'

export interface UserXpBadgeView {
  id: XpBadgeId | string
  unlockedAt: string
}

export interface UserXpHistoryView {
  action: string
  xp: number
  contentId?: string
  createdAt: string
}

export interface UserXpSummaryView {
  totalXp: number
  level: number
  levelName: string
  weeklyXp: number
  badges: UserXpBadgeView[]
  history: UserXpHistoryView[]
}

export interface UserXpPublicProfileView {
  totalXp: number
  level: number
  levelName: string
  badges: UserXpBadgeView[]
}

export interface WeeklyLeaderboardEntryView {
  rank: number
  username: string
  avatar?: string
  level: number
  levelName: string
  weeklyXp: number
  badges: UserXpBadgeView[]
}

export interface WeeklyLeaderboardMeView {
  rank: number
  weeklyXp: number
}

export interface WeeklyLeaderboardView {
  items: WeeklyLeaderboardEntryView[]
  me?: WeeklyLeaderboardMeView
}

export interface WeeklyResetResult {
  resetCount: number
  awardedTopCount: number
  topUserIds: string[]
  resetAt: string
}

export interface AwardXpOptions {
  contentId?: string
}

export interface AwardXpResult {
  awarded: boolean
  duplicate: boolean
  summary: UserXpSummaryView
}

export class XpServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

const normalizeContentId = (value?: string): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

const toIso = (value?: Date): string => {
  if (!value || Number.isNaN(value.getTime())) {
    return new Date().toISOString()
  }
  return value.toISOString()
}

const toObjectId = (rawId: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    throw new XpServiceError(400, 'Utilizador invalido para atribuir XP.')
  }

  return new mongoose.Types.ObjectId(rawId)
}

const hasDuplicateAward = (
  history: IUserXpHistoryEntry[] | undefined,
  action: XpAction,
  contentId: string | null
): boolean => {
  if (!contentId || !Array.isArray(history) || history.length === 0) {
    return false
  }

  return history.some((entry) => entry.action === action && entry.contentId === contentId)
}

const countHistoryAction = (history: IUserXpHistoryEntry[] | undefined, action: XpAction): number => {
  if (!Array.isArray(history) || history.length === 0) return 0
  return history.reduce((total, entry) => (entry.action === action ? total + 1 : total), 0)
}

const toUtcDayKey = (value: Date): string =>
  `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(
    value.getUTCDate()
  ).padStart(2, '0')}`

const hasDailyStreakAtLeast = (
  history: IUserXpHistoryEntry[] | undefined,
  minimumStreak: number
): boolean => {
  if (!Array.isArray(history) || history.length === 0) return false

  const dayKeys = Array.from(
    new Set(
      history
        .filter((entry) => entry.action === 'daily_streak' && entry.createdAt instanceof Date)
        .map((entry) => toUtcDayKey(entry.createdAt))
    )
  )
    .map((key) => Date.parse(`${key}T00:00:00.000Z`))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)

  if (dayKeys.length === 0) return false

  let best = 1
  let current = 1
  const oneDayMs = 24 * 60 * 60 * 1000

  for (let index = 1; index < dayKeys.length; index += 1) {
    if (dayKeys[index] - dayKeys[index - 1] === oneDayMs) {
      current += 1
      best = Math.max(best, current)
    } else if (dayKeys[index] !== dayKeys[index - 1]) {
      current = 1
    }
  }

  return best >= minimumStreak
}

const hasBadge = (record: IUserXP, badgeId: XpBadgeId): boolean =>
  Array.isArray(record.badges) && record.badges.some((badge) => badge.id === badgeId)

const addBadgeIfMissing = (record: IUserXP, badgeId: XpBadgeId): boolean => {
  if (hasBadge(record, badgeId)) return false
  record.badges.push({
    id: badgeId,
    unlockedAt: new Date(),
  })
  return true
}

const removeBadgeIfExists = (record: IUserXP, badgeId: XpBadgeId): boolean => {
  if (!Array.isArray(record.badges) || record.badges.length === 0) return false
  const nextBadges = record.badges.filter((badge) => badge.id !== badgeId)
  const changed = nextBadges.length !== record.badges.length
  if (changed) {
    record.badges = nextBadges
  }
  return changed
}

const toNonNegativeInt = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.floor(parsed))
}

const toLevelValue = (value: unknown, totalXpRaw: unknown): number => {
  const parsedLevel = Number(value)
  if (Number.isFinite(parsedLevel) && parsedLevel > 0) {
    return Math.max(1, Math.floor(parsedLevel))
  }
  return calculateXpLevel(toNonNegativeInt(totalXpRaw, 0))
}

const pickLeaderboardBadges = (
  badgesRaw: Array<{ id?: unknown; unlockedAt?: unknown }> | undefined
): UserXpBadgeView[] => {
  if (!Array.isArray(badgesRaw) || badgesRaw.length === 0) return []

  return badgesRaw
    .filter((badge) => typeof badge.id === 'string' && LEADERBOARD_VISIBLE_BADGE_IDS.has(badge.id as XpBadgeId))
    .map((badge) => ({
      id: String(badge.id),
      unlockedAt: badge.unlockedAt instanceof Date ? toIso(badge.unlockedAt) : toIso(),
    }))
}

const toSummary = (record: IUserXP): UserXpSummaryView => {
  const badges = Array.isArray(record.badges)
    ? record.badges.map((badge) => ({
        id: badge.id,
        unlockedAt: toIso(badge.unlockedAt),
      }))
    : []

  const history = Array.isArray(record.history)
    ? [...record.history]
        .sort((left, right) => {
          const leftTime = left.createdAt?.getTime?.() ?? 0
          const rightTime = right.createdAt?.getTime?.() ?? 0
          return rightTime - leftTime
        })
        .slice(0, 10)
        .map((entry) => ({
          action: entry.action,
          xp: Number(entry.xp || 0),
          contentId: typeof entry.contentId === 'string' ? entry.contentId : undefined,
          createdAt: toIso(entry.createdAt),
        }))
    : []

  return {
    totalXp: Number(record.totalXp || 0),
    level: Number(record.level || 1),
    levelName: getLevelName(Number(record.level || 1)),
    weeklyXp: Number(record.weeklyXp || 0),
    badges,
    history,
  }
}

const toPublicProfile = (record: IUserXP): UserXpPublicProfileView => ({
  totalXp: Number(record.totalXp || 0),
  level: Number(record.level || 1),
  levelName: getLevelName(Number(record.level || 1)),
  badges: Array.isArray(record.badges)
    ? record.badges.map((badge) => ({
        id: badge.id,
        unlockedAt: toIso(badge.unlockedAt),
      }))
    : [],
})

export const getLevelName = (levelRaw: number): string => {
  const normalized = Number.isFinite(levelRaw) ? Math.max(1, Math.floor(levelRaw)) : 1
  return LEVEL_NAMES[normalized] ?? LEVEL_NAMES[7]
}

export class XpService {
  getXpForAction(action: XpAction): number {
    return XP_ACTION_VALUES[action]
  }

  private async getOrCreateUserXp(userId: mongoose.Types.ObjectId): Promise<IUserXP> {
    let row = await UserXP.findOne({ user: userId })
    if (row) return row

    row = await UserXP.create({
      user: userId,
      totalXp: 0,
      level: 1,
      weeklyXp: 0,
      weeklyResetAt: new Date(),
      badges: [],
      history: [],
    })

    return row
  }

  private async getTopWeeklyRows(limit: number): Promise<
    Array<{
      userId: string
      username: string
      avatar?: string
      weeklyXp: number
      level: number
      levelName: string
      badges: UserXpBadgeView[]
    }>
  > {
    const rows = await UserXP.aggregate<{
      user: mongoose.Types.ObjectId
      weeklyXp?: number
      totalXp?: number
      level?: number
      badges?: Array<{ id?: unknown; unlockedAt?: unknown }>
      username?: string
      avatar?: string
    }>([
      {
        $match: {
          weeklyXp: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      {
        $unwind: '$userDoc',
      },
      {
        $match: {
          $or: [{ 'userDoc.accountStatus': 'active' }, { 'userDoc.accountStatus': { $exists: false } }],
        },
      },
      {
        $sort: {
          weeklyXp: -1,
          totalXp: -1,
          _id: 1,
        },
      },
      {
        $limit: Math.max(1, limit),
      },
      {
        $project: {
          user: 1,
          weeklyXp: 1,
          totalXp: 1,
          level: 1,
          badges: 1,
          username: '$userDoc.username',
          avatar: '$userDoc.avatar',
        },
      },
    ])

    const mapped = rows
      .map((row) => {
        const username = typeof row.username === 'string' ? row.username.trim() : ''
        if (!username) return null

        const weeklyXp = toNonNegativeInt(row.weeklyXp, 0)
        const level = toLevelValue(row.level, row.totalXp)

        return {
          userId: String(row.user),
          username,
          avatar: typeof row.avatar === 'string' && row.avatar.trim().length > 0 ? row.avatar : undefined,
          weeklyXp,
          level,
          levelName: getLevelName(level),
          badges: pickLeaderboardBadges(row.badges),
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))

    return mapped
  }

  private async countActiveUsersAheadOfWeeklyXp(input: {
    weeklyXp: number
    totalXp: number
    userXpRowId: mongoose.Types.ObjectId
  }): Promise<number> {
    const normalizedWeeklyXp = Math.max(0, input.weeklyXp)
    const normalizedTotalXp = Math.max(0, input.totalXp)

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { weeklyXp: { $gt: normalizedWeeklyXp } },
            { weeklyXp: normalizedWeeklyXp, totalXp: { $gt: normalizedTotalXp } },
            {
              weeklyXp: normalizedWeeklyXp,
              totalXp: normalizedTotalXp,
              _id: { $lt: input.userXpRowId },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      {
        $unwind: '$userDoc',
      },
      {
        $match: {
          $or: [{ 'userDoc.accountStatus': 'active' }, { 'userDoc.accountStatus': { $exists: false } }],
        },
      },
      {
        $count: 'count',
      },
    ]

    const rows = await UserXP.aggregate<{ count: number }>(pipeline)

    return toNonNegativeInt(rows[0]?.count, 0)
  }

  async getWeeklyLeaderboard(viewerUserIdRaw?: string): Promise<WeeklyLeaderboardView> {
    const rows = await this.getTopWeeklyRows(LEADERBOARD_LIMIT * 5)
    const topRows = rows.slice(0, LEADERBOARD_LIMIT)
    const topUserIds = new Set(topRows.map((row) => row.userId))
    const items = topRows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      avatar: row.avatar,
      level: row.level,
      levelName: row.levelName,
      weeklyXp: row.weeklyXp,
      badges: row.badges,
    }))

    let me: WeeklyLeaderboardMeView | undefined
    const viewerUserId =
      typeof viewerUserIdRaw === 'string' && mongoose.Types.ObjectId.isValid(viewerUserIdRaw)
        ? new mongoose.Types.ObjectId(viewerUserIdRaw)
        : null

    if (viewerUserId) {
      const viewerUserIdString = String(viewerUserId)
      const isViewerInTop = topUserIds.has(viewerUserIdString)

      if (!isViewerInTop) {
        const viewerXp = await UserXP.findOne({ user: viewerUserId })
          .select('_id weeklyXp totalXp')
          .lean<{ _id: mongoose.Types.ObjectId; weeklyXp?: number; totalXp?: number } | null>()

        if (viewerXp) {
          const weeklyXp = toNonNegativeInt(viewerXp.weeklyXp, 0)
          const totalXp = toNonNegativeInt(viewerXp.totalXp, 0)
          const viewerXpRowId = new mongoose.Types.ObjectId(String(viewerXp._id))
          const aheadCount = await this.countActiveUsersAheadOfWeeklyXp({
            weeklyXp,
            totalXp,
            userXpRowId: viewerXpRowId,
          })
          const rank = aheadCount + 1

          if (rank > LEADERBOARD_LIMIT) {
            me = {
              rank,
              weeklyXp,
            }
          }
        }
      }
    }

    return me ? { items, me } : { items }
  }

  async awardTopWeekBadge(userIdsRaw: string[], unlockedAt = new Date()): Promise<number> {
    const userIds = Array.from(
      new Set(
        userIdsRaw
          .filter((value): value is string => typeof value === 'string' && mongoose.Types.ObjectId.isValid(value))
          .map((value) => String(new mongoose.Types.ObjectId(value)))
      )
    )

    if (userIds.length === 0) return 0

    let awardedCount = 0

    for (const userIdRaw of userIds) {
      const userId = new mongoose.Types.ObjectId(userIdRaw)
      const record = await this.getOrCreateUserXp(userId)

      const existing = Array.isArray(record.badges)
        ? record.badges.find((badge) => badge.id === 'top_da_semana')
        : undefined

      if (existing) {
        existing.unlockedAt = unlockedAt
        awardedCount += 1
      } else {
        record.badges.push({
          id: 'top_da_semana',
          unlockedAt,
        })
        awardedCount += 1
      }

      await record.save()
    }

    return awardedCount
  }

  async resetWeeklyXp(): Promise<WeeklyResetResult> {
    const now = new Date()
    const topRows = await this.getTopWeeklyRows(LEADERBOARD_TOP_BADGE_LIMIT)
    const topUserIds = topRows.map((row) => row.userId)
    const awardedTopCount = await this.awardTopWeekBadge(topUserIds, now)

    const historyEntry = {
      action: 'weekly_reset',
      xp: 0,
      contentId: null,
      createdAt: now,
    }

    const resetPipeline: PipelineStage[] = [
      {
        $set: {
          weeklyXp: 0,
          weeklyResetAt: now,
          history: {
            $slice: [{ $concatArrays: [{ $ifNull: ['$history', []] }, [historyEntry]] }, -MAX_HISTORY_ENTRIES],
          },
        },
      },
    ]

    const resetResult = await UserXP.updateMany({}, resetPipeline)

    return {
      resetCount: toNonNegativeInt(resetResult.modifiedCount, 0),
      awardedTopCount,
      topUserIds,
      resetAt: now.toISOString(),
    }
  }

  async checkAndAwardBadges(userIdRaw: string): Promise<UserXpBadgeView[]> {
    const userId = toObjectId(userIdRaw)
    const [record, user] = await Promise.all([
      this.getOrCreateUserXp(userId),
      User.findById(userId).select('role onboardingCompleted').lean<{ role?: string; onboardingCompleted?: boolean } | null>(),
    ])

    let hasChanges = false

    if (user?.onboardingCompleted) {
      hasChanges = addBadgeIfMissing(record, 'primeiros_passos') || hasChanges
    }

    if (countHistoryAction(record.history, 'article_completed') >= 10) {
      hasChanges = addBadgeIfMissing(record, 'leitor_dedicado') || hasChanges
    }

    if (countHistoryAction(record.history, 'course_completed') >= 1) {
      hasChanges = addBadgeIfMissing(record, 'estudante') || hasChanges
    }

    if (countHistoryAction(record.history, 'reply_created') >= 50) {
      hasChanges = addBadgeIfMissing(record, 'sociavel') || hasChanges
    }

    if (countHistoryAction(record.history, 'upvote_received') >= 10) {
      hasChanges = addBadgeIfMissing(record, 'contribuidor') || hasChanges
    }

    if (hasDailyStreakAtLeast(record.history, DAILY_STREAK_DAYS_FOR_BADGE)) {
      hasChanges = addBadgeIfMissing(record, 'em_chama') || hasChanges
    }

    if ((user?.role || '').toLowerCase() === 'premium') {
      hasChanges = addBadgeIfMissing(record, 'premium') || hasChanges
    } else {
      hasChanges = removeBadgeIfExists(record, 'premium') || hasChanges
    }

    if (Number(record.level || 1) >= 7) {
      hasChanges = addBadgeIfMissing(record, 'fire_master') || hasChanges
    }

    if (hasChanges) {
      await record.save()
    }

    return Array.isArray(record.badges)
      ? record.badges.map((badge) => ({
          id: badge.id,
          unlockedAt: toIso(badge.unlockedAt),
        }))
      : []
  }

  async awardXp(
    userIdRaw: string,
    action: XpAction,
    xpRaw?: number,
    options: AwardXpOptions = {}
  ): Promise<AwardXpResult> {
    const userId = toObjectId(userIdRaw)
    const contentId = normalizeContentId(options.contentId)
    const xpValue = Number.isFinite(xpRaw) ? Math.trunc(xpRaw as number) : this.getXpForAction(action)

    if (!Number.isFinite(xpValue)) {
      throw new XpServiceError(400, 'Valor de XP invalido.')
    }

    const record = await this.getOrCreateUserXp(userId)
    if (hasDuplicateAward(record.history, action, contentId)) {
      return {
        awarded: false,
        duplicate: true,
        summary: toSummary(record),
      }
    }

    const nextTotalXp = Math.max(0, Number(record.totalXp || 0) + xpValue)
    const nextWeeklyXp = Math.max(0, Number(record.weeklyXp || 0) + xpValue)

    record.totalXp = nextTotalXp
    record.weeklyXp = nextWeeklyXp
    record.level = calculateXpLevel(nextTotalXp)

    const nextHistoryEntry: IUserXpHistoryEntry = {
      action,
      xp: xpValue,
      contentId,
      createdAt: new Date(),
    }

    record.history.push(nextHistoryEntry)
    if (record.history.length > MAX_HISTORY_ENTRIES) {
      record.history = record.history.slice(-MAX_HISTORY_ENTRIES)
    }

    await record.save()
    await this.checkAndAwardBadges(String(userId))

    return {
      awarded: true,
      duplicate: false,
      summary: toSummary(record),
    }
  }

  async getMyXp(userIdRaw: string): Promise<UserXpSummaryView> {
    const userId = toObjectId(userIdRaw)
    const record = await this.getOrCreateUserXp(userId)
    await this.checkAndAwardBadges(String(userId))
    return toSummary(record)
  }

  async getUserXpPublicProfile(userIdRaw: string): Promise<UserXpPublicProfileView> {
    const userId = toObjectId(userIdRaw)
    const record = await this.getOrCreateUserXp(userId)
    await this.checkAndAwardBadges(String(userId))
    return toPublicProfile(record)
  }
}

export const xpService = new XpService()
