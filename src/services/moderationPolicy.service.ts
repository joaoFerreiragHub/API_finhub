import mongoose from 'mongoose'
import { Article } from '../models/Article'
import { ContentModerationStatus, ContentType } from '../models/BaseContent'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import { ContentReportReason } from '../models/ContentReport'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { ModeratableContentType } from '../models/ContentModerationEvent'
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

export interface ModerationPolicySignals {
  recommendedAction: ModerationPolicyRecommendedAction
  escalation: ModerationPolicyEscalation
  automationEligible: boolean
  automationEnabled: boolean
  automationBlockedReason: string | null
  matchedReasons: ContentReportReason[]
  thresholds: {
    autoHideMinPriority: ContentReportPriority
    autoHideMinUniqueReporters: number
    autoHideAllowedReasons: ContentReportReason[]
  }
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
  autoHideMinPriority: ContentReportPriority
  autoHideMinUniqueReporters: number
  autoHideAllowedReasons: ContentReportReason[]
}

const BASE_CONTENT_TYPES: ContentType[] = ['article', 'video', 'course', 'live', 'podcast', 'book']
const HIGH_RISK_REASONS: ContentReportReason[] = ['scam', 'hate', 'sexual', 'violence']
const DEFAULT_AUTO_HIDE_ALLOWED_REASONS: ContentReportReason[] = ['scam', 'hate', 'sexual', 'violence']
const DEFAULT_AUTO_HIDE_MIN_PRIORITY: ContentReportPriority = 'critical'
const DEFAULT_AUTO_HIDE_MIN_UNIQUE_REPORTERS = 3

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
    autoHideMinPriority: minPriority,
    autoHideMinUniqueReporters: parsePositiveInt(
      process.env.MODERATION_POLICY_AUTO_HIDE_MIN_UNIQUE_REPORTERS,
      DEFAULT_AUTO_HIDE_MIN_UNIQUE_REPORTERS
    ),
    autoHideAllowedReasons: parseAllowedReasons(process.env.MODERATION_POLICY_AUTO_HIDE_ALLOWED_REASONS),
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

export class ModerationPolicyService {
  getAutomationConfig() {
    return getPolicyConfig()
  }

  buildPolicySignals(
    reportSignals: ReportSignalSummary,
    moderationStatus: ContentModerationStatus
  ): ModerationPolicySignals {
    const config = getPolicyConfig()
    const matchedReasons = reportSignals.topReasons.map((item) => item.reason)
    const hasHighRiskReason = hasReasonIntersection(matchedReasons, HIGH_RISK_REASONS)

    let recommendedAction: ModerationPolicyRecommendedAction = 'none'
    let escalation: ModerationPolicyEscalation = 'none'

    if (reportSignals.openReports > 0) {
      if (reportSignals.priority === 'critical' || (hasHighRiskReason && reportSignals.uniqueReporters >= 2)) {
        recommendedAction = 'hide'
        escalation = 'critical'
      } else if (reportSignals.priority === 'high') {
        recommendedAction = 'hide'
        escalation = 'urgent'
      } else if (reportSignals.priority === 'medium') {
        recommendedAction = 'restrict'
        escalation = 'urgent'
      } else {
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
    } else if (!isPriorityAtLeast(reportSignals.priority, config.autoHideMinPriority)) {
      automationBlockedReason = 'priority_below_threshold'
    } else if (reportSignals.uniqueReporters < config.autoHideMinUniqueReporters) {
      automationBlockedReason = 'not_enough_unique_reporters'
    } else if (!hasReasonIntersection(matchedReasons, config.autoHideAllowedReasons)) {
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
      thresholds: {
        autoHideMinPriority: config.autoHideMinPriority,
        autoHideMinUniqueReporters: config.autoHideMinUniqueReporters,
        autoHideAllowedReasons: config.autoHideAllowedReasons,
      },
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
    const policySignals = this.buildPolicySignals(reportSignals, target.moderationStatus)

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
    return `Auto-hide preventivo via policy engine. prioridade=${evaluation.reportSignals.priority}; reporters=${evaluation.reportSignals.uniqueReporters}; reasons=${topReasons}`
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
