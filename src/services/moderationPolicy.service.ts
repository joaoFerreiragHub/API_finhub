import mongoose from 'mongoose'
import { Article } from '../models/Article'
import { ContentModerationStatus, ContentType } from '../models/BaseContent'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import { ContentReportReason } from '../models/ContentReport'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { ModeratableContentType } from '../models/ContentModerationEvent'
import { PlatformSurfaceKey } from '../models/PlatformSurfaceControl'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { Video } from '../models/Video'
import {
  contentReportService,
  ContentReportPriority,
  isPriorityAtLeast,
  isValidContentReportPriority,
  ReportSignalSummary,
} from './contentReport.service'

interface ContentModel {
  findById(id: string): any
}

interface PolicyTargetSnapshot {
  moderationStatus: ContentModerationStatus
}

export type ModerationPolicyRecommendedAction = 'none' | 'review' | 'restrict' | 'hide'
export type ModerationPolicyEscalation = 'none' | 'watch' | 'urgent' | 'critical'
export type ModerationPolicyProfileKey =
  | 'multi_surface_discovery'
  | 'discussion_comments'
  | 'discussion_reviews'

export interface ModerationPolicyProfileSummary {
  key: ModerationPolicyProfileKey
  label: string
  primarySurface: PlatformSurfaceKey
  surfaces: PlatformSurfaceKey[]
}

export interface ModerationPolicyThresholds {
  reviewMinPriority: ContentReportPriority
  restrictMinPriority: ContentReportPriority
  highPriorityHideMinUniqueReporters: number
  highRiskHideMinUniqueReporters: number
  autoHideMinPriority: ContentReportPriority
  autoHideMinUniqueReporters: number
  autoHideAllowedReasons: ContentReportReason[]
}

export interface ModerationPolicySignals {
  recommendedAction: ModerationPolicyRecommendedAction
  escalation: ModerationPolicyEscalation
  automationEligible: boolean
  automationEnabled: boolean
  automationBlockedReason: string | null
  matchedReasons: ContentReportReason[]
  profile: ModerationPolicyProfileSummary
  thresholds: ModerationPolicyThresholds
}

export interface ModerationPolicyEvaluation {
  contentType: ModeratableContentType
  contentId: string
  moderationStatus: ContentModerationStatus
  reportSignals: ReportSignalSummary
  policySignals: ModerationPolicySignals
}

interface ModerationPolicyConfig {
  autoHideEnabled: boolean
  autoHideActorId: string | null
  baseAutoHideMinPriority: ContentReportPriority
  baseAutoHideMinUniqueReporters: number
  baseAutoHideAllowedReasons: ContentReportReason[]
}

interface ModerationPolicyProfileDefinition {
  key: ModerationPolicyProfileKey
  label: string
  primarySurface: PlatformSurfaceKey
  surfaces: PlatformSurfaceKey[]
  reviewMinPriority: ContentReportPriority
  restrictMinPriority: ContentReportPriority
  highPriorityHideMinUniqueReporters: number
  highRiskHideMinUniqueReporters: number
  autoHideMinPriority: ContentReportPriority
  autoHideMinUniqueReporters: number
  autoHideAllowedReasons: ContentReportReason[]
}

const BASE_CONTENT_TYPES: ContentType[] = ['article', 'video', 'course', 'live', 'podcast', 'book']
const HIGH_RISK_REASONS: ContentReportReason[] = ['scam', 'hate', 'sexual', 'violence']
const DEFAULT_AUTO_HIDE_ALLOWED_REASONS: ContentReportReason[] = ['scam', 'hate', 'sexual', 'violence']
const DEFAULT_AUTO_HIDE_MIN_PRIORITY: ContentReportPriority = 'critical'
const DEFAULT_AUTO_HIDE_MIN_UNIQUE_REPORTERS = 3
const DISCOVERY_SURFACES: PlatformSurfaceKey[] = [
  'editorial_home',
  'editorial_verticals',
  'creator_page',
  'search',
  'derived_feeds',
]
const COMMENT_SURFACES: PlatformSurfaceKey[] = ['comments_read', 'comments_write']
const REVIEW_SURFACES: PlatformSurfaceKey[] = ['reviews_read', 'reviews_write']

const contentModelByType: Record<ModeratableContentType, ContentModel> = {
  article: Article as unknown as ContentModel,
  video: Video as unknown as ContentModel,
  course: Course as unknown as ContentModel,
  live: LiveEvent as unknown as ContentModel,
  podcast: Podcast as unknown as ContentModel,
  book: Book as unknown as ContentModel,
  comment: Comment as unknown as ContentModel,
  review: Rating as unknown as ContentModel,
}

const DISCOVERY_POLICY_PROFILE: ModerationPolicyProfileDefinition = {
  key: 'multi_surface_discovery',
  label: 'Discovery multi-superficie',
  primarySurface: 'editorial_home',
  surfaces: DISCOVERY_SURFACES,
  reviewMinPriority: 'low',
  restrictMinPriority: 'medium',
  highPriorityHideMinUniqueReporters: 2,
  highRiskHideMinUniqueReporters: 2,
  autoHideMinPriority: 'critical',
  autoHideMinUniqueReporters: 3,
  autoHideAllowedReasons: DEFAULT_AUTO_HIDE_ALLOWED_REASONS,
}

const COMMENT_POLICY_PROFILE: ModerationPolicyProfileDefinition = {
  key: 'discussion_comments',
  label: 'Discussao publica: comentarios',
  primarySurface: 'comments_read',
  surfaces: COMMENT_SURFACES,
  reviewMinPriority: 'low',
  restrictMinPriority: 'medium',
  highPriorityHideMinUniqueReporters: 3,
  highRiskHideMinUniqueReporters: 2,
  autoHideMinPriority: 'critical',
  autoHideMinUniqueReporters: 4,
  autoHideAllowedReasons: ['hate', 'sexual', 'violence', 'scam'],
}

const REVIEW_POLICY_PROFILE: ModerationPolicyProfileDefinition = {
  key: 'discussion_reviews',
  label: 'Discussao publica: reviews',
  primarySurface: 'reviews_read',
  surfaces: REVIEW_SURFACES,
  reviewMinPriority: 'low',
  restrictMinPriority: 'medium',
  highPriorityHideMinUniqueReporters: 3,
  highRiskHideMinUniqueReporters: 2,
  autoHideMinPriority: 'critical',
  autoHideMinUniqueReporters: 4,
  autoHideAllowedReasons: ['hate', 'sexual', 'violence', 'scam'],
}

const POLICY_PROFILE_BY_CONTENT_TYPE: Record<ModeratableContentType, ModerationPolicyProfileDefinition> = {
  article: DISCOVERY_POLICY_PROFILE,
  video: DISCOVERY_POLICY_PROFILE,
  course: DISCOVERY_POLICY_PROFILE,
  live: DISCOVERY_POLICY_PROFILE,
  podcast: DISCOVERY_POLICY_PROFILE,
  book: DISCOVERY_POLICY_PROFILE,
  comment: COMMENT_POLICY_PROFILE,
  review: REVIEW_POLICY_PROFILE,
}

const parseBoolean = (value: string | undefined): boolean => value === 'true' || value === '1'

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const parseAllowedReasons = (value: string | undefined): ContentReportReason[] => {
  if (!value || value.trim().length === 0) return DEFAULT_AUTO_HIDE_ALLOWED_REASONS

  const allowed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is ContentReportReason =>
      item === 'spam' ||
      item === 'abuse' ||
      item === 'misinformation' ||
      item === 'sexual' ||
      item === 'violence' ||
      item === 'hate' ||
      item === 'scam' ||
      item === 'copyright' ||
      item === 'other'
    )

  return allowed.length > 0 ? allowed : DEFAULT_AUTO_HIDE_ALLOWED_REASONS
}

const getPolicyConfig = (): ModerationPolicyConfig => {
  const minPriorityRaw = process.env.MODERATION_POLICY_AUTO_HIDE_MIN_PRIORITY
  const minPriority = isValidContentReportPriority(minPriorityRaw)
    ? minPriorityRaw
    : DEFAULT_AUTO_HIDE_MIN_PRIORITY
  const actorIdRaw = process.env.MODERATION_POLICY_AUTO_HIDE_ACTOR_ID?.trim()
  const autoHideActorId =
    actorIdRaw && mongoose.Types.ObjectId.isValid(actorIdRaw) ? actorIdRaw : null

  return {
    autoHideEnabled: parseBoolean(process.env.MODERATION_POLICY_AUTO_HIDE_ENABLED),
    autoHideActorId,
    baseAutoHideMinPriority: minPriority,
    baseAutoHideMinUniqueReporters: parsePositiveInt(
      process.env.MODERATION_POLICY_AUTO_HIDE_MIN_UNIQUE_REPORTERS,
      DEFAULT_AUTO_HIDE_MIN_UNIQUE_REPORTERS
    ),
    baseAutoHideAllowedReasons: parseAllowedReasons(process.env.MODERATION_POLICY_AUTO_HIDE_ALLOWED_REASONS),
  }
}

const toModerationStatus = (value: unknown): ContentModerationStatus => {
  if (value === 'hidden') return 'hidden'
  if (value === 'restricted') return 'restricted'
  return 'visible'
}

const hasReasonIntersection = (
  currentReasons: ContentReportReason[],
  expectedReasons: ContentReportReason[]
): boolean => currentReasons.some((reason) => expectedReasons.includes(reason))

const toPriorityRank = (priority: ContentReportPriority): number => {
  if (priority === 'critical') return 4
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  if (priority === 'low') return 1
  return 0
}

const pickStricterPriority = (
  left: ContentReportPriority,
  right: ContentReportPriority
): ContentReportPriority => (toPriorityRank(left) >= toPriorityRank(right) ? left : right)

const intersectAllowedReasons = (
  profileReasons: ContentReportReason[],
  configReasons: ContentReportReason[]
): ContentReportReason[] => {
  const intersection = profileReasons.filter((reason) => configReasons.includes(reason))
  return Array.from(new Set(intersection))
}

const toProfileSummary = (
  profile: ModerationPolicyProfileDefinition
): ModerationPolicyProfileSummary => ({
  key: profile.key,
  label: profile.label,
  primarySurface: profile.primarySurface,
  surfaces: [...profile.surfaces],
})

const buildThresholds = (
  profile: ModerationPolicyProfileDefinition,
  config: ModerationPolicyConfig
): ModerationPolicyThresholds => ({
  reviewMinPriority: profile.reviewMinPriority,
  restrictMinPriority: profile.restrictMinPriority,
  highPriorityHideMinUniqueReporters: profile.highPriorityHideMinUniqueReporters,
  highRiskHideMinUniqueReporters: profile.highRiskHideMinUniqueReporters,
  autoHideMinPriority: pickStricterPriority(profile.autoHideMinPriority, config.baseAutoHideMinPriority),
  autoHideMinUniqueReporters: Math.max(
    profile.autoHideMinUniqueReporters,
    config.baseAutoHideMinUniqueReporters
  ),
  autoHideAllowedReasons: intersectAllowedReasons(
    profile.autoHideAllowedReasons,
    config.baseAutoHideAllowedReasons
  ),
})

const getPolicyProfileDefinition = (
  contentType: ModeratableContentType
): ModerationPolicyProfileDefinition => {
  const profile = POLICY_PROFILE_BY_CONTENT_TYPE[contentType]
  if (!profile) {
    throw new Error('contentType invalido para policy.')
  }

  return profile
}

export class ModerationPolicyService {
  getAutomationConfig() {
    const config = getPolicyConfig()
    return {
      autoHideEnabled: config.autoHideEnabled,
      autoHideActorId: config.autoHideActorId,
      autoHideMinPriority: config.baseAutoHideMinPriority,
      autoHideMinUniqueReporters: config.baseAutoHideMinUniqueReporters,
      autoHideAllowedReasons: config.baseAutoHideAllowedReasons,
    }
  }

  getPolicyProfile(contentType: ModeratableContentType) {
    const profile = getPolicyProfileDefinition(contentType)
    const config = getPolicyConfig()

    return {
      ...toProfileSummary(profile),
      thresholds: buildThresholds(profile, config),
    }
  }

  buildPolicySignals(
    contentType: ModeratableContentType,
    reportSignals: ReportSignalSummary,
    moderationStatus: ContentModerationStatus
  ): ModerationPolicySignals {
    const config = getPolicyConfig()
    const profile = getPolicyProfileDefinition(contentType)
    const thresholds = buildThresholds(profile, config)
    const matchedReasons = reportSignals.topReasons.map((item) => item.reason)
    const hasHighRiskReason = hasReasonIntersection(matchedReasons, HIGH_RISK_REASONS)
    const meetsHighRiskHide =
      hasHighRiskReason && reportSignals.uniqueReporters >= thresholds.highRiskHideMinUniqueReporters
    const meetsPriorityHide =
      isPriorityAtLeast(reportSignals.priority, 'high') &&
      reportSignals.uniqueReporters >= thresholds.highPriorityHideMinUniqueReporters
    const hasCriticalPressure =
      reportSignals.priority === 'critical' &&
      reportSignals.uniqueReporters >= thresholds.highPriorityHideMinUniqueReporters + 1

    let recommendedAction: ModerationPolicyRecommendedAction = 'none'
    let escalation: ModerationPolicyEscalation = 'none'

    if (reportSignals.openReports > 0) {
      if (meetsHighRiskHide || hasCriticalPressure || (reportSignals.priority === 'critical' && meetsPriorityHide)) {
        recommendedAction = 'hide'
        escalation = reportSignals.priority === 'critical' ? 'critical' : 'urgent'
      } else if (meetsPriorityHide) {
        recommendedAction = 'hide'
        escalation = 'urgent'
      } else if (isPriorityAtLeast(reportSignals.priority, thresholds.restrictMinPriority)) {
        recommendedAction = 'restrict'
        escalation =
          reportSignals.priority === 'critical' || reportSignals.priority === 'high' ? 'urgent' : 'watch'
      } else if (isPriorityAtLeast(reportSignals.priority, thresholds.reviewMinPriority)) {
        recommendedAction = 'review'
        escalation = 'watch'
      }
    }

    let automationBlockedReason: string | null = null
    let automationEligible = false

    if (recommendedAction !== 'hide') {
      automationBlockedReason = reportSignals.openReports > 0 ? 'recommended_action_not_hide' : 'no_open_reports'
    } else if (moderationStatus !== 'visible') {
      automationBlockedReason = 'already_moderated'
    } else if (!isPriorityAtLeast(reportSignals.priority, thresholds.autoHideMinPriority)) {
      automationBlockedReason = 'priority_below_threshold'
    } else if (reportSignals.uniqueReporters < thresholds.autoHideMinUniqueReporters) {
      automationBlockedReason = 'not_enough_unique_reporters'
    } else if (!hasReasonIntersection(matchedReasons, thresholds.autoHideAllowedReasons)) {
      automationBlockedReason = 'reason_not_allowed'
    } else if (!config.autoHideActorId) {
      automationBlockedReason = 'auto_hide_actor_missing'
    } else {
      automationEligible = true
    }

    if (!config.autoHideEnabled && automationEligible) {
      automationBlockedReason = 'auto_hide_disabled'
    }

    return {
      recommendedAction,
      escalation,
      automationEligible,
      automationEnabled: config.autoHideEnabled,
      automationBlockedReason: config.autoHideEnabled ? automationBlockedReason : automationBlockedReason ?? 'auto_hide_disabled',
      matchedReasons,
      profile: toProfileSummary(profile),
      thresholds,
    }
  }

  async evaluateTarget(
    contentType: ModeratableContentType,
    contentId: string
  ): Promise<ModerationPolicyEvaluation> {
    const target = await this.getTargetSnapshot(contentType, contentId)
    if (!target) {
      throw new Error('Conteudo alvo nao encontrado para avaliacao de policy.')
    }

    const summaries = await contentReportService.getOpenReportSummaries([{ contentType, contentId }])
    const reportSignals =
      summaries.get(`${contentType}:${contentId}`) ?? contentReportService.getEmptySummary()
    const policySignals = this.buildPolicySignals(contentType, reportSignals, target.moderationStatus)

    return {
      contentType,
      contentId,
      moderationStatus: target.moderationStatus,
      reportSignals,
      policySignals,
    }
  }

  buildAutoHideReason(evaluation: ModerationPolicyEvaluation): string {
    const topReasons = evaluation.reportSignals.topReasons.map((item) => item.reason).join(', ') || 'n/a'
    return `Auto-hide preventivo via policy engine. perfil=${evaluation.policySignals.profile.key}; prioridade=${evaluation.reportSignals.priority}; reporters=${evaluation.reportSignals.uniqueReporters}; reasons=${topReasons}`
  }

  private async getTargetSnapshot(
    contentType: ModeratableContentType,
    contentId: string
  ): Promise<PolicyTargetSnapshot | null> {
    const model = contentModelByType[contentType]
    if (!model) {
      throw new Error('contentType invalido para policy.')
    }

    const item = await model.findById(contentId).select('moderationStatus').lean()
    if (!item) return null

    return {
      moderationStatus: toModerationStatus(item.moderationStatus),
    }
  }
}

export const moderationPolicyService = new ModerationPolicyService()
