import mongoose from 'mongoose'
import { AutomatedModerationRule } from '../models/AutomatedModerationSignal'
import { Article } from '../models/Article'
import { ContentModerationStatus } from '../models/BaseContent'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import {
  ContentFalsePositiveCategory,
  ContentFalsePositiveFeedback,
} from '../models/ContentFalsePositiveFeedback'
import { ContentReport, ContentReportReason } from '../models/ContentReport'
import { ContentModerationEvent, ModeratableContentType } from '../models/ContentModerationEvent'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { User, UserRole } from '../models/User'
import { UserModerationEvent } from '../models/UserModerationEvent'
import { Video } from '../models/Video'
import { buildReportSignalSummary, isPriorityAtLeast } from './contentReport.service'

export type CreatorRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type CreatorTrustRecommendedAction =
  | 'none'
  | 'review'
  | 'set_cooldown'
  | 'block_publishing'
  | 'suspend_creator_ops'

export interface CreatorFalsePositiveCategoryBreakdown {
  reports: number
  policy_auto_hide: number
  automated_detection: number
  manual_moderation: number
}

export interface CreatorAutomatedFalsePositiveRuleBreakdown {
  spam: number
  suspicious_link: number
  flood: number
  mass_creation: number
}

export interface CreatorTrustSignals {
  trustScore: number
  riskLevel: CreatorRiskLevel
  recommendedAction: CreatorTrustRecommendedAction
  generatedAt: string
  summary: {
    openReports: number
    highPriorityTargets: number
    criticalTargets: number
    hiddenItems: number
    restrictedItems: number
    recentModerationActions30d: number
    repeatModerationTargets30d: number
    recentCreatorControlActions30d: number
    falsePositiveEvents30d: number
    automatedFalsePositiveEvents30d: number
    falsePositiveRate30d: number
    falsePositiveCompensationScore30d: number
    dominantFalsePositiveCategory30d: ContentFalsePositiveCategory | null
    dominantAutomatedFalsePositiveRule30d: AutomatedModerationRule | null
    falsePositiveCategoryBreakdown30d: CreatorFalsePositiveCategoryBreakdown
    automatedFalsePositiveRuleBreakdown30d: CreatorAutomatedFalsePositiveRuleBreakdown
    activeControlFlags: string[]
  }
  flags: string[]
  reasons: string[]
}

interface CreatorSnapshot {
  id: string
  role: UserRole
  creatorControls?: {
    creationBlocked?: boolean
    publishingBlocked?: boolean
    cooldownUntil?: Date | null
  }
}

interface ModeratableOwnerDoc {
  _id: mongoose.Types.ObjectId
  creator?: mongoose.Types.ObjectId | null
  user?: mongoose.Types.ObjectId | null
  moderationStatus?: ContentModerationStatus | null
}

interface CreatorAccumulator {
  creatorId: string
  activeControlFlags: Set<string>
  openReports: number
  highPriorityTargets: number
  criticalTargets: number
  hiddenItems: number
  restrictedItems: number
  recentModerationActions30d: number
  repeatModerationTargets30d: number
  recentCreatorControlActions30d: number
  falsePositiveEvents30d: number
  automatedFalsePositiveEvents30d: number
  falsePositiveCategoryBreakdown30d: CreatorFalsePositiveCategoryBreakdown
  automatedFalsePositiveRuleBreakdown30d: CreatorAutomatedFalsePositiveRuleBreakdown
  reasonCounts: Map<string, number>
}

const DAY_MS = 24 * 60 * 60 * 1000
const CONTENT_TYPES: ModeratableContentType[] = [
  'article',
  'video',
  'course',
  'live',
  'podcast',
  'book',
  'comment',
  'review',
]
const FALSE_POSITIVE_CATEGORIES: ContentFalsePositiveCategory[] = [
  'reports',
  'policy_auto_hide',
  'automated_detection',
  'manual_moderation',
]
const AUTOMATED_RULES: AutomatedModerationRule[] = ['spam', 'suspicious_link', 'flood', 'mass_creation']

const FALSE_POSITIVE_CATEGORY_WEIGHTS: Record<ContentFalsePositiveCategory, number> = {
  reports: 2.5,
  policy_auto_hide: 4.5,
  automated_detection: 3.5,
  manual_moderation: 1.5,
}

const FALSE_POSITIVE_RULE_WEIGHTS: Record<AutomatedModerationRule, number> = {
  spam: 0.5,
  suspicious_link: 1.5,
  flood: 1,
  mass_creation: 0.75,
}

interface ModeratableModel {
  find(query: Record<string, unknown>): {
    select(fields: string): {
      lean(): Promise<ModeratableOwnerDoc[]>
    }
  }
}

const modelByType: Record<ModeratableContentType, ModeratableModel> = {
  article: Article as unknown as ModeratableModel,
  video: Video as unknown as ModeratableModel,
  course: Course as unknown as ModeratableModel,
  live: LiveEvent as unknown as ModeratableModel,
  podcast: Podcast as unknown as ModeratableModel,
  book: Book as unknown as ModeratableModel,
  comment: Comment as unknown as ModeratableModel,
  review: Rating as unknown as ModeratableModel,
}

const ownerFieldByType: Record<ModeratableContentType, 'creator' | 'user'> = {
  article: 'creator',
  video: 'creator',
  course: 'creator',
  live: 'creator',
  podcast: 'creator',
  book: 'creator',
  comment: 'user',
  review: 'user',
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)
const round = (value: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const toObjectId = (rawId: string): mongoose.Types.ObjectId | null =>
  mongoose.Types.ObjectId.isValid(rawId) ? new mongoose.Types.ObjectId(rawId) : null

const toModerationStatus = (value: unknown): ContentModerationStatus => {
  if (value === 'hidden') return 'hidden'
  if (value === 'restricted') return 'restricted'
  return 'visible'
}

const buildActiveControlFlags = (snapshot: CreatorSnapshot, now: Date): string[] => {
  const flags: string[] = []
  if (snapshot.creatorControls?.creationBlocked) flags.push('creation_blocked')
  if (snapshot.creatorControls?.publishingBlocked) flags.push('publishing_blocked')
  if (
    snapshot.creatorControls?.cooldownUntil instanceof Date &&
    snapshot.creatorControls.cooldownUntil.getTime() > now.getTime()
  ) {
    flags.push('cooldown_active')
  }
  return flags
}

const pushReason = (reasons: string[], reason: string) => {
  if (!reasons.includes(reason)) {
    reasons.push(reason)
  }
}

const createEmptyFalsePositiveCategoryBreakdown = (): CreatorFalsePositiveCategoryBreakdown => ({
  reports: 0,
  policy_auto_hide: 0,
  automated_detection: 0,
  manual_moderation: 0,
})

const createEmptyAutomatedFalsePositiveRuleBreakdown = (): CreatorAutomatedFalsePositiveRuleBreakdown => ({
  spam: 0,
  suspicious_link: 0,
  flood: 0,
  mass_creation: 0,
})

const getDominantFalsePositiveCategory = (
  breakdown: CreatorFalsePositiveCategoryBreakdown
): ContentFalsePositiveCategory | null => {
  const rows = FALSE_POSITIVE_CATEGORIES.map((category) => [category, breakdown[category]] as const).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
  )

  return rows[0] && rows[0][1] > 0 ? rows[0][0] : null
}

const getDominantAutomatedRule = (
  breakdown: CreatorAutomatedFalsePositiveRuleBreakdown
): AutomatedModerationRule | null => {
  const rows = AUTOMATED_RULES.map((rule) => [rule, breakdown[rule]] as const).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
  )

  return rows[0] && rows[0][1] > 0 ? rows[0][0] : null
}

const buildFalsePositiveCompensation = (acc: CreatorAccumulator): number => {
  const categoryScore = FALSE_POSITIVE_CATEGORIES.reduce(
    (sum, category) => sum + acc.falsePositiveCategoryBreakdown30d[category] * FALSE_POSITIVE_CATEGORY_WEIGHTS[category],
    0
  )
  const ruleScore = AUTOMATED_RULES.reduce(
    (sum, rule) => sum + acc.automatedFalsePositiveRuleBreakdown30d[rule] * FALSE_POSITIVE_RULE_WEIGHTS[rule],
    0
  )
  const streakBonus = acc.falsePositiveEvents30d >= 2 ? 2 : 0

  return clamp(round(categoryScore + ruleScore + streakBonus), 0, 24)
}

const buildTrustSignals = (acc: CreatorAccumulator, now: Date): CreatorTrustSignals => {
  const falsePositiveRate30d =
    acc.recentModerationActions30d > 0
      ? round((acc.falsePositiveEvents30d / acc.recentModerationActions30d) * 100, 2)
      : acc.falsePositiveEvents30d > 0
        ? 100
        : 0

  const penalties =
    acc.openReports * 2 +
    acc.highPriorityTargets * 8 +
    acc.criticalTargets * 14 +
    acc.hiddenItems * 5 +
    acc.restrictedItems * 3 +
    acc.recentModerationActions30d * 2 +
    acc.repeatModerationTargets30d * 8 +
    acc.recentCreatorControlActions30d * 4 +
    (acc.activeControlFlags.has('creation_blocked') ? 8 : 0) +
    (acc.activeControlFlags.has('publishing_blocked') ? 12 : 0) +
    (acc.activeControlFlags.has('cooldown_active') ? 6 : 0)

  const falsePositiveCompensationScore30d = buildFalsePositiveCompensation(acc)
  const trustScore = clamp(100 - penalties + falsePositiveCompensationScore30d, 0, 100)
  const dominantFalsePositiveCategory30d = getDominantFalsePositiveCategory(
    acc.falsePositiveCategoryBreakdown30d
  )
  const dominantAutomatedFalsePositiveRule30d = getDominantAutomatedRule(
    acc.automatedFalsePositiveRuleBreakdown30d
  )
  let riskLevel: CreatorRiskLevel = 'low'

  if (trustScore <= 25 || acc.criticalTargets >= 2) {
    riskLevel = 'critical'
  } else if (trustScore <= 50 || acc.criticalTargets >= 1 || acc.hiddenItems >= 2) {
    riskLevel = 'high'
  } else if (
    trustScore <= 75 ||
    acc.highPriorityTargets >= 1 ||
    acc.recentModerationActions30d >= 2 ||
    acc.activeControlFlags.size > 0
  ) {
    riskLevel = 'medium'
  }

  let recommendedAction: CreatorTrustRecommendedAction = 'none'
  if (
    riskLevel === 'critical' ||
    (acc.activeControlFlags.has('publishing_blocked') && acc.criticalTargets >= 1)
  ) {
    recommendedAction = 'suspend_creator_ops'
  } else if (
    riskLevel === 'high' ||
    acc.hiddenItems >= 1 ||
    acc.activeControlFlags.has('publishing_blocked')
  ) {
    recommendedAction = 'block_publishing'
  } else if (
    riskLevel === 'medium' ||
    acc.activeControlFlags.has('cooldown_active') ||
    acc.activeControlFlags.has('creation_blocked')
  ) {
    recommendedAction = 'set_cooldown'
  } else if (acc.openReports > 0 || acc.restrictedItems > 0) {
    recommendedAction = 'review'
  }

  const flags = Array.from(acc.activeControlFlags)
  if (acc.criticalTargets > 0) flags.push('critical_report_targets')
  if (acc.highPriorityTargets > 0) flags.push('high_priority_targets')
  if (acc.hiddenItems > 0) flags.push('hidden_content_present')
  if (acc.repeatModerationTargets30d > 0) flags.push('repeat_moderation_targets')
  if (acc.falsePositiveEvents30d > 0) flags.push('false_positive_feedback')
  if (acc.falsePositiveCategoryBreakdown30d.policy_auto_hide > 0) flags.push('policy_false_positive_feedback')
  if (acc.falsePositiveCategoryBreakdown30d.automated_detection > 0) {
    flags.push('automated_false_positive_feedback')
  }

  const reasons: string[] = []
  if (acc.criticalTargets > 0) {
    pushReason(reasons, `${acc.criticalTargets} alvo(s) com reports criticos.`)
  }
  if (acc.hiddenItems > 0) {
    pushReason(reasons, `${acc.hiddenItems} item(ns) atualmente ocultos.`)
  }
  if (acc.repeatModerationTargets30d > 0) {
    pushReason(reasons, `${acc.repeatModerationTargets30d} alvo(s) com reincidencia de moderacao em 30 dias.`)
  }
  if (acc.activeControlFlags.has('publishing_blocked')) {
    pushReason(reasons, 'Publicacao bloqueada neste momento.')
  }
  if (acc.activeControlFlags.has('creation_blocked')) {
    pushReason(reasons, 'Criacao bloqueada neste momento.')
  }
  if (acc.activeControlFlags.has('cooldown_active')) {
    pushReason(reasons, 'Cooldown operacional ativo.')
  }
  if (acc.falsePositiveEvents30d > 0) {
    pushReason(
      reasons,
      `${acc.falsePositiveEvents30d} reversao(oes) marcada(s) como falso positivo em 30 dias; compensacao ${falsePositiveCompensationScore30d} pts.`
    )
  }
  if (dominantFalsePositiveCategory30d) {
    pushReason(
      reasons,
      `Categoria FP dominante: ${dominantFalsePositiveCategory30d} (${acc.falsePositiveCategoryBreakdown30d[dominantFalsePositiveCategory30d]}).`
    )
  }
  if (dominantAutomatedFalsePositiveRule30d) {
    pushReason(
      reasons,
      `Regra automatica mais revertida: ${dominantAutomatedFalsePositiveRule30d} (${acc.automatedFalsePositiveRuleBreakdown30d[dominantAutomatedFalsePositiveRule30d]}).`
    )
  }
  if (reasons.length === 0 && acc.openReports > 0) {
    pushReason(reasons, `${acc.openReports} report(s) abertos em observacao.`)
  }

  const topReasonRows = Array.from(acc.reasonCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)

  for (const [reason, count] of topReasonRows) {
    pushReason(reasons, `Motivo dominante: ${reason} (${count}).`)
  }

  return {
    trustScore,
    riskLevel,
    recommendedAction,
    generatedAt: now.toISOString(),
    summary: {
      openReports: acc.openReports,
      highPriorityTargets: acc.highPriorityTargets,
      criticalTargets: acc.criticalTargets,
      hiddenItems: acc.hiddenItems,
      restrictedItems: acc.restrictedItems,
      recentModerationActions30d: acc.recentModerationActions30d,
      repeatModerationTargets30d: acc.repeatModerationTargets30d,
      recentCreatorControlActions30d: acc.recentCreatorControlActions30d,
      falsePositiveEvents30d: acc.falsePositiveEvents30d,
      automatedFalsePositiveEvents30d: acc.automatedFalsePositiveEvents30d,
      falsePositiveRate30d,
      falsePositiveCompensationScore30d,
      dominantFalsePositiveCategory30d,
      dominantAutomatedFalsePositiveRule30d,
      falsePositiveCategoryBreakdown30d: { ...acc.falsePositiveCategoryBreakdown30d },
      automatedFalsePositiveRuleBreakdown30d: { ...acc.automatedFalsePositiveRuleBreakdown30d },
      activeControlFlags: Array.from(acc.activeControlFlags),
    },
    flags,
    reasons: reasons.slice(0, 5),
  }
}

const createAccumulator = (snapshot: CreatorSnapshot, now: Date): CreatorAccumulator => ({
  creatorId: snapshot.id,
  activeControlFlags: new Set(buildActiveControlFlags(snapshot, now)),
  openReports: 0,
  highPriorityTargets: 0,
  criticalTargets: 0,
  hiddenItems: 0,
  restrictedItems: 0,
  recentModerationActions30d: 0,
  repeatModerationTargets30d: 0,
  recentCreatorControlActions30d: 0,
  falsePositiveEvents30d: 0,
  automatedFalsePositiveEvents30d: 0,
  falsePositiveCategoryBreakdown30d: createEmptyFalsePositiveCategoryBreakdown(),
  automatedFalsePositiveRuleBreakdown30d: createEmptyAutomatedFalsePositiveRuleBreakdown(),
  reasonCounts: new Map<string, number>(),
})

export class CreatorTrustService {
  async getSignalsForCreators(creatorIds: string[]): Promise<Map<string, CreatorTrustSignals>> {
    const now = new Date()
    const objectIds = Array.from(new Set(creatorIds))
      .map((id) => toObjectId(id))
      .filter((id): id is mongoose.Types.ObjectId => id !== null)

    if (objectIds.length === 0) {
      return new Map<string, CreatorTrustSignals>()
    }

    const creators = (await User.find({
      _id: { $in: objectIds },
      role: 'creator',
    })
      .select('_id role creatorControls')
      .lean()) as unknown as Array<{
      _id: mongoose.Types.ObjectId
      role: UserRole
      creatorControls?: CreatorSnapshot['creatorControls']
    }>

    if (creators.length === 0) {
      return new Map<string, CreatorTrustSignals>()
    }

    const creatorSnapshots: CreatorSnapshot[] = creators.map((creator) => ({
      id: String(creator._id),
      role: creator.role,
      creatorControls: creator.creatorControls,
    }))

    const accumulators = new Map<string, CreatorAccumulator>()
    for (const snapshot of creatorSnapshots) {
      accumulators.set(snapshot.id, createAccumulator(snapshot, now))
    }

    const ownerObjectIds = creatorSnapshots.map((creator) => new mongoose.Types.ObjectId(creator.id))
    const targetOwnerByKey = new Map<string, string>()
    const contentIdsByType: Record<ModeratableContentType, string[]> = {
      article: [],
      video: [],
      course: [],
      live: [],
      podcast: [],
      book: [],
      comment: [],
      review: [],
    }

    await Promise.all(
      CONTENT_TYPES.map(async (contentType) => {
        const ownerField = ownerFieldByType[contentType]
        const docs = await modelByType[contentType]
          .find({ [ownerField]: { $in: ownerObjectIds } })
          .select(`_id moderationStatus ${ownerField}`)
          .lean()

        for (const doc of docs) {
          const ownerId = doc[ownerField] ? String(doc[ownerField]) : null
          if (!ownerId) continue

          const acc = accumulators.get(ownerId)
          if (!acc) continue

          const moderationStatus = toModerationStatus(doc.moderationStatus)
          if (moderationStatus === 'hidden') acc.hiddenItems += 1
          if (moderationStatus === 'restricted') acc.restrictedItems += 1

          const contentId = String(doc._id)
          targetOwnerByKey.set(`${contentType}:${contentId}`, ownerId)
          contentIdsByType[contentType].push(contentId)
        }
      })
    )

    const last30dStart = new Date(now.getTime() - 30 * DAY_MS)

    await Promise.all(
      CONTENT_TYPES.map(async (contentType) => {
        const ids = Array.from(new Set(contentIdsByType[contentType]))
        if (ids.length === 0) return

        const [openReportRows, moderationRows] = await Promise.all([
          ContentReport.aggregate<{
            _id: string
            openReports: number
            uniqueReporterIds: mongoose.Types.ObjectId[]
            latestReportAt: Date | null
            reasons: ContentReportReason[]
          }>([
            {
              $match: {
                status: 'open',
                contentType,
                contentId: { $in: ids },
              },
            },
            {
              $group: {
                _id: '$contentId',
                openReports: { $sum: 1 },
                uniqueReporterIds: { $addToSet: '$reporter' },
                latestReportAt: { $max: '$createdAt' },
                reasons: { $push: '$reason' },
              },
            },
          ]),
          ContentModerationEvent.aggregate<{
            _id: string
            total: number
          }>([
            {
              $match: {
                contentType,
                contentId: { $in: ids },
                createdAt: { $gte: last30dStart },
              },
            },
            {
              $group: {
                _id: '$contentId',
                total: { $sum: 1 },
              },
            },
          ]),
        ])

        for (const row of openReportRows) {
          const ownerId = targetOwnerByKey.get(`${contentType}:${row._id}`)
          if (!ownerId) continue
          const acc = accumulators.get(ownerId)
          if (!acc) continue

          const summary = buildReportSignalSummary({
            openReports: row.openReports,
            uniqueReporters: row.uniqueReporterIds.length,
            latestReportAt: row.latestReportAt,
            reasons: row.reasons,
          })

          acc.openReports += summary.openReports
          if (isPriorityAtLeast(summary.priority, 'high')) {
            acc.highPriorityTargets += 1
          }
          if (summary.priority === 'critical') {
            acc.criticalTargets += 1
          }

          for (const reasonRow of summary.topReasons) {
            acc.reasonCounts.set(
              reasonRow.reason,
              (acc.reasonCounts.get(reasonRow.reason) ?? 0) + reasonRow.count
            )
          }
        }

        for (const row of moderationRows) {
          const ownerId = targetOwnerByKey.get(`${contentType}:${row._id}`)
          if (!ownerId) continue
          const acc = accumulators.get(ownerId)
          if (!acc) continue

          acc.recentModerationActions30d += row.total
          if (row.total > 1) {
            acc.repeatModerationTargets30d += 1
          }
        }
      })
    )

    const creatorControlRows = await UserModerationEvent.aggregate<{
      _id: mongoose.Types.ObjectId
      count: number
    }>([
      {
        $match: {
          action: 'creator_control',
          user: { $in: ownerObjectIds },
          createdAt: { $gte: last30dStart },
        },
      },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
        },
      },
    ])

    for (const row of creatorControlRows) {
      const acc = accumulators.get(String(row._id))
      if (acc) {
        acc.recentCreatorControlActions30d = row.count
      }
    }

    const falsePositiveRows = await ContentFalsePositiveFeedback.aggregate<{
      _id: mongoose.Types.ObjectId
      count: number
      automatedCount: number
      reportsCount: number
      policyAutoHideCount: number
      automatedDetectionCount: number
      manualModerationCount: number
      spamRuleCount: number
      suspiciousLinkRuleCount: number
      floodRuleCount: number
      massCreationRuleCount: number
    }>([
      {
        $match: {
          creatorId: { $in: ownerObjectIds },
          createdAt: { $gte: last30dStart },
        },
      },
      {
        $project: {
          creatorId: 1,
          categories: 1,
          automatedRules: {
            $cond: [{ $isArray: '$metadata.automatedRules' }, '$metadata.automatedRules', []],
          },
        },
      },
      {
        $group: {
          _id: '$creatorId',
          count: { $sum: 1 },
          automatedCount: {
            $sum: {
              $cond: [{ $in: ['automated_detection', '$categories'] }, 1, 0],
            },
          },
          reportsCount: {
            $sum: {
              $cond: [{ $in: ['reports', '$categories'] }, 1, 0],
            },
          },
          policyAutoHideCount: {
            $sum: {
              $cond: [{ $in: ['policy_auto_hide', '$categories'] }, 1, 0],
            },
          },
          automatedDetectionCount: {
            $sum: {
              $cond: [{ $in: ['automated_detection', '$categories'] }, 1, 0],
            },
          },
          manualModerationCount: {
            $sum: {
              $cond: [{ $in: ['manual_moderation', '$categories'] }, 1, 0],
            },
          },
          spamRuleCount: {
            $sum: {
              $cond: [{ $in: ['spam', '$automatedRules'] }, 1, 0],
            },
          },
          suspiciousLinkRuleCount: {
            $sum: {
              $cond: [{ $in: ['suspicious_link', '$automatedRules'] }, 1, 0],
            },
          },
          floodRuleCount: {
            $sum: {
              $cond: [{ $in: ['flood', '$automatedRules'] }, 1, 0],
            },
          },
          massCreationRuleCount: {
            $sum: {
              $cond: [{ $in: ['mass_creation', '$automatedRules'] }, 1, 0],
            },
          },
        },
      },
    ])

    for (const row of falsePositiveRows) {
      const acc = accumulators.get(String(row._id))
      if (!acc) continue

      acc.falsePositiveEvents30d = row.count
      acc.automatedFalsePositiveEvents30d = row.automatedCount
      acc.falsePositiveCategoryBreakdown30d.reports = row.reportsCount
      acc.falsePositiveCategoryBreakdown30d.policy_auto_hide = row.policyAutoHideCount
      acc.falsePositiveCategoryBreakdown30d.automated_detection = row.automatedDetectionCount
      acc.falsePositiveCategoryBreakdown30d.manual_moderation = row.manualModerationCount
      acc.automatedFalsePositiveRuleBreakdown30d.spam = row.spamRuleCount
      acc.automatedFalsePositiveRuleBreakdown30d.suspicious_link = row.suspiciousLinkRuleCount
      acc.automatedFalsePositiveRuleBreakdown30d.flood = row.floodRuleCount
      acc.automatedFalsePositiveRuleBreakdown30d.mass_creation = row.massCreationRuleCount
    }

    const signalMap = new Map<string, CreatorTrustSignals>()
    for (const [creatorId, acc] of accumulators.entries()) {
      signalMap.set(creatorId, buildTrustSignals(acc, now))
    }

    return signalMap
  }
}

export const creatorTrustService = new CreatorTrustService()
