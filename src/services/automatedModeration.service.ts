import mongoose from 'mongoose'
import { Article } from '../models/Article'
import {
  AutomatedModerationActivitySignals,
  AutomatedModerationRecommendedAction,
  AutomatedModerationRule,
  AutomatedModerationSeverity,
  AutomatedModerationSignal,
  AutomatedModerationStatus,
  AutomatedModerationTextSignals,
  AutomatedModerationTriggerSource,
  AutomatedModerationTriggeredRule,
  IAutomatedModerationSignal,
} from '../models/AutomatedModerationSignal'
import { ContentModerationStatus, ContentType } from '../models/BaseContent'
import { Book } from '../models/Book'
import { Comment } from '../models/Comment'
import { ContentModerationAction, ModeratableContentType } from '../models/ContentModerationEvent'
import { Course } from '../models/Course'
import { LiveEvent } from '../models/LiveEvent'
import { Podcast } from '../models/Podcast'
import { Rating } from '../models/Rating'
import { Video } from '../models/Video'
import { adminAuditService } from './adminAudit.service'

interface ContentModel {
  countDocuments(query: Record<string, unknown>): Promise<number>
  findById(id: string): any
}

interface DetectionTargetSnapshot {
  contentType: ModeratableContentType
  contentId: string
  actorUserId: string | null
  ownerUserId: string | null
  moderationStatus: ContentModerationStatus
  publishStatus: 'draft' | 'published' | 'archived' | 'published_implicit'
  text: string
}

interface AutomatedModerationConfig {
  autoHideEnabled: boolean
  autoHideActorId: string | null
  autoHideMinSeverity: AutomatedModerationSeverity
  autoHideAllowedRules: AutomatedModerationRule[]
}

export interface AutomatedModerationSummary {
  active: boolean
  status: AutomatedModerationStatus | 'none'
  score: number
  severity: AutomatedModerationSeverity
  recommendedAction: AutomatedModerationRecommendedAction
  triggerSource: AutomatedModerationTriggerSource | null
  triggeredRules: AutomatedModerationTriggeredRule[]
  lastDetectedAt: Date | null
  lastEvaluatedAt: Date | null
  textSignals: AutomatedModerationTextSignals
  activitySignals: AutomatedModerationActivitySignals
  automation: {
    enabled: boolean
    eligible: boolean
    blockedReason: string | null
    attempted: boolean
    executed: boolean
    action: ContentModerationAction | null
    lastOutcome: 'success' | 'error' | null
    lastError: string | null
    lastAttemptAt: Date | null
  }
}

export interface AutomatedModerationAutomationState {
  attempted: boolean
  executed: boolean
  blockedReason: string | null
  action: ContentModerationAction | null
  error: string | null
}

export interface AutomatedModerationEvaluation {
  contentType: ModeratableContentType
  contentId: string
  actorUserId: string | null
  ownerUserId: string | null
  moderationStatus: ContentModerationStatus
  publishStatus: DetectionTargetSnapshot['publishStatus']
  triggerSource: AutomatedModerationTriggerSource
  score: number
  severity: AutomatedModerationSeverity
  recommendedAction: AutomatedModerationRecommendedAction
  triggeredRules: AutomatedModerationTriggeredRule[]
  textSignals: AutomatedModerationTextSignals
  activitySignals: AutomatedModerationActivitySignals
  automation: {
    enabled: boolean
    eligible: boolean
    blockedReason: string | null
  }
}

interface EvaluateTargetInput {
  contentType: ModeratableContentType
  contentId: string
  triggerSource: AutomatedModerationTriggerSource
}

interface RuleBuildInput {
  rule: AutomatedModerationRule
  score: number
  description: string
  metadata?: Record<string, unknown>
}

const BASE_CONTENT_TYPES: ContentType[] = ['article', 'video', 'course', 'live', 'podcast', 'book']
const DEFAULT_AUTO_HIDE_ALLOWED_RULES: AutomatedModerationRule[] = [
  'spam',
  'suspicious_link',
  'mass_creation',
]
const DEFAULT_AUTO_HIDE_MIN_SEVERITY: AutomatedModerationSeverity = 'critical'
const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi
const TOKEN_REGEX = /[A-Za-z0-9_-]{4,}/g
const SUSPICIOUS_HOSTS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'cutt.ly',
  'rebrand.ly',
  'shorturl.at',
  'goo.su',
  'is.gd',
  't.me',
  'telegram.me',
  'wa.me',
])

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

const emptyTextSignals = (): AutomatedModerationTextSignals => ({
  textLength: 0,
  tokenCount: 0,
  uniqueTokenRatio: 0,
  urlCount: 0,
  suspiciousUrlCount: 0,
  duplicateUrlCount: 0,
  repeatedTokenCount: 0,
  duplicateLineCount: 0,
})

const emptyActivitySignals = (): AutomatedModerationActivitySignals => ({
  sameSurfaceLast10m: 0,
  sameSurfaceLast60m: 0,
  portfolioLast10m: 0,
  portfolioLast60m: 0,
})

export const createEmptyAutomatedModerationSummary = (): AutomatedModerationSummary => ({
  active: false,
  status: 'none',
  score: 0,
  severity: 'none',
  recommendedAction: 'none',
  triggerSource: null,
  triggeredRules: [],
  lastDetectedAt: null,
  lastEvaluatedAt: null,
  textSignals: emptyTextSignals(),
  activitySignals: emptyActivitySignals(),
  automation: {
    enabled: false,
    eligible: false,
    blockedReason: null,
    attempted: false,
    executed: false,
    action: null,
    lastOutcome: null,
    lastError: null,
    lastAttemptAt: null,
  },
})

const parseBoolean = (value: string | undefined): boolean => value === 'true' || value === '1'

const toSeverityRank = (severity: AutomatedModerationSeverity): number => {
  if (severity === 'critical') return 4
  if (severity === 'high') return 3
  if (severity === 'medium') return 2
  if (severity === 'low') return 1
  return 0
}

export const isAutomatedModerationSeverityAtLeast = (
  current: AutomatedModerationSeverity,
  minimum: AutomatedModerationSeverity
): boolean => toSeverityRank(current) >= toSeverityRank(minimum)

export const isValidAutomatedModerationSeverity = (
  value: unknown
): value is AutomatedModerationSeverity =>
  value === 'none' ||
  value === 'low' ||
  value === 'medium' ||
  value === 'high' ||
  value === 'critical'

const toSeverity = (score: number): AutomatedModerationSeverity => {
  if (score >= 12) return 'critical'
  if (score >= 8) return 'high'
  if (score >= 4) return 'medium'
  if (score >= 1) return 'low'
  return 'none'
}

const buildRule = (input: RuleBuildInput): AutomatedModerationTriggeredRule => ({
  rule: input.rule,
  score: input.score,
  severity: toSeverity(input.score),
  description: input.description,
  metadata: input.metadata,
})

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim()

const stripMarkup = (value: string): string =>
  value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\r/g, '')

const extractUrls = (value: string): string[] => {
  const matches = value.match(URL_REGEX)
  return matches ? matches.map((item) => item.trim()) : []
}

const normalizeUrlHost = (rawUrl: string): string | null => {
  try {
    const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    const parsed = new URL(withProtocol)
    return parsed.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

const toModerationStatus = (value: unknown): ContentModerationStatus => {
  if (value === 'hidden') return 'hidden'
  if (value === 'restricted') return 'restricted'
  return 'visible'
}

const toPublishStatus = (
  value: unknown
): DetectionTargetSnapshot['publishStatus'] => {
  if (value === 'draft') return 'draft'
  if (value === 'archived') return 'archived'
  if (value === 'published') return 'published'
  return 'published_implicit'
}

const parseAllowedRules = (value: string | undefined): AutomatedModerationRule[] => {
  if (!value || value.trim().length === 0) return DEFAULT_AUTO_HIDE_ALLOWED_RULES

  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter(
      (item): item is AutomatedModerationRule =>
        item === 'spam' ||
        item === 'suspicious_link' ||
        item === 'flood' ||
        item === 'mass_creation'
    )

  return parsed.length > 0 ? parsed : DEFAULT_AUTO_HIDE_ALLOWED_RULES
}

const getAutomationConfig = (): AutomatedModerationConfig => {
  const rawSeverity = process.env.AUTOMATED_MODERATION_AUTO_HIDE_MIN_SEVERITY
  const actorIdRaw = process.env.AUTOMATED_MODERATION_AUTO_HIDE_ACTOR_ID?.trim()

  return {
    autoHideEnabled: parseBoolean(process.env.AUTOMATED_MODERATION_AUTO_HIDE_ENABLED),
    autoHideActorId:
      actorIdRaw && mongoose.Types.ObjectId.isValid(actorIdRaw) ? actorIdRaw : null,
    autoHideMinSeverity: isValidAutomatedModerationSeverity(rawSeverity)
      ? rawSeverity
      : DEFAULT_AUTO_HIDE_MIN_SEVERITY,
    autoHideAllowedRules: parseAllowedRules(
      process.env.AUTOMATED_MODERATION_AUTO_HIDE_ALLOWED_RULES
    ),
  }
}

const buildSummaryFromSignal = (
  signal?: Partial<IAutomatedModerationSignal> | null
): AutomatedModerationSummary => {
  if (!signal) return createEmptyAutomatedModerationSummary()

  const textSignals =
    signal.textSignals && typeof signal.textSignals === 'object'
      ? { ...emptyTextSignals(), ...signal.textSignals }
      : emptyTextSignals()
  const activitySignals =
    signal.activitySignals && typeof signal.activitySignals === 'object'
      ? { ...emptyActivitySignals(), ...signal.activitySignals }
      : emptyActivitySignals()
  const automation =
    signal.automation && typeof signal.automation === 'object'
      ? signal.automation
      : undefined

  return {
    active: signal.status === 'active',
    status: signal.status ?? 'none',
    score: typeof signal.score === 'number' ? signal.score : 0,
    severity: signal.severity ?? 'none',
    recommendedAction: signal.recommendedAction ?? 'none',
    triggerSource: signal.triggerSource ?? null,
    triggeredRules: Array.isArray(signal.triggeredRules) ? signal.triggeredRules : [],
    lastDetectedAt: signal.lastDetectedAt ?? null,
    lastEvaluatedAt: signal.lastEvaluatedAt ?? null,
    textSignals,
    activitySignals,
    automation: {
      enabled: automation?.enabled === true,
      eligible: automation?.eligible === true,
      blockedReason:
        typeof automation?.blockedReason === 'string' ? automation.blockedReason : null,
      attempted: automation?.attempted === true,
      executed: automation?.executed === true,
      action:
        automation?.action === 'hide' ||
        automation?.action === 'restrict' ||
        automation?.action === 'unhide'
          ? automation.action
          : null,
      lastOutcome:
        automation?.lastOutcome === 'success' || automation?.lastOutcome === 'error'
          ? automation.lastOutcome
          : null,
      lastError: typeof automation?.lastError === 'string' ? automation.lastError : null,
      lastAttemptAt: automation?.lastAttemptAt ?? null,
    },
  }
}

const isBaseContentType = (contentType: ModeratableContentType): contentType is ContentType =>
  BASE_CONTENT_TYPES.includes(contentType as ContentType)

const resolveActorId = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  if (value instanceof mongoose.Types.ObjectId) return String(value)
  if (typeof value === 'object') {
    const record = value as { _id?: unknown; id?: unknown }
    if (typeof record.id === 'string' && record.id.trim().length > 0) return record.id.trim()
    if (typeof record._id === 'string' && record._id.trim().length > 0) return record._id.trim()
    if (record._id instanceof mongoose.Types.ObjectId) return String(record._id)
  }
  return null
}

const selectFieldsByType = (contentType: ModeratableContentType): string => {
  if (contentType === 'comment') {
    return 'user targetType targetId content moderationStatus createdAt updatedAt'
  }

  if (contentType === 'review') {
    return 'user targetType targetId rating review moderationStatus createdAt updatedAt'
  }

  return 'creator title description content moderationStatus status createdAt updatedAt'
}

const mapRecommendedAction = (
  severity: AutomatedModerationSeverity,
  triggeredRules: AutomatedModerationTriggeredRule[]
): AutomatedModerationRecommendedAction => {
  if (severity === 'critical') return 'hide'

  if (severity === 'high') {
    return triggeredRules.some(
      (rule) =>
        rule.rule === 'spam' ||
        rule.rule === 'suspicious_link' ||
        rule.rule === 'mass_creation'
    )
      ? 'hide'
      : 'restrict'
  }

  if (severity === 'medium' || severity === 'low') return 'review'
  return 'none'
}

const buildTextSignals = (text: string): AutomatedModerationTextSignals => {
  const strippedText = stripMarkup(text)
  const normalizedText = normalizeWhitespace(strippedText)
  const urls = extractUrls(strippedText)
  const urlHosts = urls
    .map((url) => normalizeUrlHost(url))
    .filter((value): value is string => Boolean(value))
  const suspiciousUrlCount = urlHosts.filter((host) => SUSPICIOUS_HOSTS.has(host)).length
  const duplicateUrlCount = Math.max(
    0,
    urls.length - new Set(urls.map((url) => url.toLowerCase())).size
  )

  const lines = strippedText
    .split(/\r?\n+/)
    .map((line) => normalizeWhitespace(line.toLowerCase()))
    .filter((line) => line.length > 0)
  const duplicateLineCount = Math.max(0, lines.length - new Set(lines).size)

  const tokens = (normalizedText.toLowerCase().match(TOKEN_REGEX) ?? []).map((token) =>
    token.toLowerCase()
  )
  const tokenCounts = new Map<string, number>()
  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1)
  }

  let repeatedTokenCount = 0
  for (const count of tokenCounts.values()) {
    if (count > repeatedTokenCount) {
      repeatedTokenCount = count
    }
  }

  const uniqueTokenRatio =
    tokens.length > 0 ? Number((tokenCounts.size / tokens.length).toFixed(4)) : 0

  return {
    textLength: normalizedText.length,
    tokenCount: tokens.length,
    uniqueTokenRatio,
    urlCount: urls.length,
    suspiciousUrlCount,
    duplicateUrlCount,
    repeatedTokenCount,
    duplicateLineCount,
  }
}

const buildSpamRule = (
  textSignals: AutomatedModerationTextSignals
): AutomatedModerationTriggeredRule | null => {
  let score = 0
  const signals: string[] = []

  if (textSignals.repeatedTokenCount >= 4) {
    score += Math.min(textSignals.repeatedTokenCount - 2, 4)
    signals.push(`token repetido ${textSignals.repeatedTokenCount}x`)
  }

  if (textSignals.duplicateLineCount >= 2) {
    score += Math.min(textSignals.duplicateLineCount + 1, 4)
    signals.push(`${textSignals.duplicateLineCount} linhas duplicadas`)
  }

  if (textSignals.tokenCount >= 20 && textSignals.uniqueTokenRatio <= 0.35) {
    score += 3
    signals.push(`diversidade lexical baixa (${textSignals.uniqueTokenRatio})`)
  }

  if (textSignals.duplicateUrlCount >= 1) {
    score += Math.min(textSignals.duplicateUrlCount + 1, 3)
    signals.push(`${textSignals.duplicateUrlCount} URL repetida`)
  }

  if (textSignals.urlCount >= 3 && textSignals.uniqueTokenRatio <= 0.45) {
    score += 2
    signals.push('muitos links externos com texto pouco diverso')
  }

  if (score < 3) return null

  return buildRule({
    rule: 'spam',
    score,
    description: `Padrao de spam detetado (${signals.join('; ')}).`,
    metadata: {
      repeatedTokenCount: textSignals.repeatedTokenCount,
      duplicateLineCount: textSignals.duplicateLineCount,
      duplicateUrlCount: textSignals.duplicateUrlCount,
      uniqueTokenRatio: textSignals.uniqueTokenRatio,
      urlCount: textSignals.urlCount,
    },
  })
}

const buildSuspiciousLinkRule = (
  textSignals: AutomatedModerationTextSignals
): AutomatedModerationTriggeredRule | null => {
  let score = 0
  const signals: string[] = []

  if (textSignals.suspiciousUrlCount > 0) {
    score += 6 + Math.min(textSignals.suspiciousUrlCount - 1, 3)
    signals.push(`${textSignals.suspiciousUrlCount} link(s) suspeitos`)
  }

  if (textSignals.urlCount >= 4) {
    score += textSignals.urlCount >= 6 ? 4 : 3
    signals.push(`${textSignals.urlCount} links externos`)
  }

  if (score < 4) return null

  return buildRule({
    rule: 'suspicious_link',
    score,
    description: `Padrao de links suspeitos detetado (${signals.join('; ')}).`,
    metadata: {
      urlCount: textSignals.urlCount,
      suspiciousUrlCount: textSignals.suspiciousUrlCount,
      duplicateUrlCount: textSignals.duplicateUrlCount,
    },
  })
}

const buildFloodRule = (
  contentType: ModeratableContentType,
  activitySignals: AutomatedModerationActivitySignals
): AutomatedModerationTriggeredRule | null => {
  let score = 0
  const signals: string[] = []
  const shortWindowThreshold = isBaseContentType(contentType) ? 4 : 8
  const longWindowThreshold = isBaseContentType(contentType) ? 8 : 20

  if (activitySignals.sameSurfaceLast10m >= shortWindowThreshold) {
    score += activitySignals.sameSurfaceLast10m >= shortWindowThreshold * 2 ? 6 : 4
    signals.push(`${activitySignals.sameSurfaceLast10m} itens em 10m`)
  }

  if (activitySignals.sameSurfaceLast60m >= longWindowThreshold) {
    score += activitySignals.sameSurfaceLast60m >= longWindowThreshold * 2 ? 5 : 3
    signals.push(`${activitySignals.sameSurfaceLast60m} itens em 60m`)
  }

  if (score < 4) return null

  return buildRule({
    rule: 'flood',
    score,
    description: `Cadencia de publicacao acima do normal (${signals.join('; ')}).`,
    metadata: {
      sameSurfaceLast10m: activitySignals.sameSurfaceLast10m,
      sameSurfaceLast60m: activitySignals.sameSurfaceLast60m,
    },
  })
}

const buildMassCreationRule = (
  contentType: ModeratableContentType,
  activitySignals: AutomatedModerationActivitySignals
): AutomatedModerationTriggeredRule | null => {
  if (!isBaseContentType(contentType)) return null

  let score = 0
  const signals: string[] = []

  if (activitySignals.portfolioLast10m >= 3) {
    score += activitySignals.portfolioLast10m >= 6 ? 6 : 4
    signals.push(`${activitySignals.portfolioLast10m} criacoes em 10m`)
  }

  if (activitySignals.portfolioLast60m >= 6) {
    score += activitySignals.portfolioLast60m >= 10 ? 5 : 3
    signals.push(`${activitySignals.portfolioLast60m} criacoes em 60m`)
  }

  if (score < 4) return null

  return buildRule({
    rule: 'mass_creation',
    score,
    description: `Volume de criacao transversal acima do esperado (${signals.join('; ')}).`,
    metadata: {
      portfolioLast10m: activitySignals.portfolioLast10m,
      portfolioLast60m: activitySignals.portfolioLast60m,
    },
  })
}

export class AutomatedModerationService {
  getAutomationConfig() {
    return getAutomationConfig()
  }

  getEmptySummary() {
    return createEmptyAutomatedModerationSummary()
  }

  async evaluateAndApplyTarget(
    input: EvaluateTargetInput
  ): Promise<{
    evaluation: AutomatedModerationEvaluation
    signal: AutomatedModerationSummary
    automation: AutomatedModerationAutomationState
  }> {
    const snapshot = await this.getTargetSnapshot(input.contentType, input.contentId)
    if (!snapshot) {
      throw new Error('Conteudo alvo nao encontrado para deteccao automatica.')
    }

    const evaluation = await this.buildEvaluation(snapshot, input.triggerSource)
    let signalDoc = await this.persistEvaluation(evaluation)
    const automation = await this.maybeAutoHide(evaluation)

    if (automation.attempted) {
      signalDoc = await AutomatedModerationSignal.findOneAndUpdate(
        {
          contentType: input.contentType,
          contentId: input.contentId,
        },
        {
          $set: {
            automation: {
              enabled: evaluation.automation.enabled,
              eligible: evaluation.automation.eligible,
              blockedReason: automation.blockedReason,
              attempted: automation.attempted,
              executed: automation.executed,
              action: automation.action,
              lastOutcome: automation.executed ? 'success' : 'error',
              lastError: automation.error,
              lastAttemptAt: new Date(),
            },
          },
        },
        { new: true }
      )
    }

    return {
      evaluation,
      signal: buildSummaryFromSignal(signalDoc),
      automation,
    }
  }

  async getActiveSummaries(targets: Array<{ contentType: ModeratableContentType; contentId: string }>) {
    const uniqueTargets = Array.from(
      new Map(targets.map((target) => [`${target.contentType}:${target.contentId}`, target])).values()
    )

    if (uniqueTargets.length === 0) {
      return new Map<string, AutomatedModerationSummary>()
    }

    const rows = await AutomatedModerationSignal.find({
      status: 'active',
      $or: uniqueTargets.map((target) => ({
        contentType: target.contentType,
        contentId: target.contentId,
      })),
    })
      .select(
        'contentType contentId status triggerSource score severity recommendedAction triggeredRules textSignals activitySignals automation lastDetectedAt lastEvaluatedAt'
      )
      .lean<Array<Partial<IAutomatedModerationSignal> & { contentType: ModeratableContentType; contentId: string }>>()

    const result = new Map<string, AutomatedModerationSummary>()
    for (const row of rows) {
      result.set(`${row.contentType}:${row.contentId}`, buildSummaryFromSignal(row))
    }

    return result
  }

  private async buildEvaluation(
    snapshot: DetectionTargetSnapshot,
    triggerSource: AutomatedModerationTriggerSource
  ): Promise<AutomatedModerationEvaluation> {
    const textSignals = buildTextSignals(snapshot.text)
    const activitySignals = await this.buildActivitySignals(snapshot)

    const triggeredRules = [
      buildSpamRule(textSignals),
      buildSuspiciousLinkRule(textSignals),
      buildFloodRule(snapshot.contentType, activitySignals),
      buildMassCreationRule(snapshot.contentType, activitySignals),
    ].filter((rule): rule is AutomatedModerationTriggeredRule => Boolean(rule))

    const score = triggeredRules.reduce((sum, rule) => sum + rule.score, 0)
    const severity = toSeverity(score)
    const recommendedAction = mapRecommendedAction(severity, triggeredRules)
    const config = getAutomationConfig()

    let blockedReason: string | null = null
    let automationEligible = false

    if (recommendedAction !== 'hide') {
      blockedReason = triggeredRules.length > 0 ? 'recommended_action_not_hide' : 'no_triggered_rules'
    } else if (snapshot.moderationStatus !== 'visible') {
      blockedReason = 'already_moderated'
    } else if (snapshot.publishStatus === 'draft' || snapshot.publishStatus === 'archived') {
      blockedReason = 'content_not_public'
    } else if (!isAutomatedModerationSeverityAtLeast(severity, config.autoHideMinSeverity)) {
      blockedReason = 'severity_below_threshold'
    } else if (!triggeredRules.some((rule) => config.autoHideAllowedRules.includes(rule.rule))) {
      blockedReason = 'rule_not_allowed'
    } else if (!config.autoHideActorId) {
      blockedReason = 'auto_hide_actor_missing'
    } else {
      automationEligible = true
    }

    if (!config.autoHideEnabled && automationEligible) {
      blockedReason = 'auto_hide_disabled'
    }

    return {
      contentType: snapshot.contentType,
      contentId: snapshot.contentId,
      actorUserId: snapshot.actorUserId,
      ownerUserId: snapshot.ownerUserId,
      moderationStatus: snapshot.moderationStatus,
      publishStatus: snapshot.publishStatus,
      triggerSource,
      score,
      severity,
      recommendedAction,
      triggeredRules,
      textSignals,
      activitySignals,
      automation: {
        enabled: config.autoHideEnabled,
        eligible: automationEligible,
        blockedReason: config.autoHideEnabled ? blockedReason : blockedReason ?? 'auto_hide_disabled',
      },
    }
  }

  private async buildActivitySignals(
    snapshot: DetectionTargetSnapshot
  ): Promise<AutomatedModerationActivitySignals> {
    const actorUserId = snapshot.actorUserId
    if (!actorUserId || !mongoose.Types.ObjectId.isValid(actorUserId)) {
      return emptyActivitySignals()
    }

    const actorObjectId = new mongoose.Types.ObjectId(actorUserId)
    const last10m = new Date(Date.now() - 10 * 60 * 1000)
    const last60m = new Date(Date.now() - 60 * 60 * 1000)

    let sameSurfaceLast10m = 0
    let sameSurfaceLast60m = 0

    if (snapshot.contentType === 'comment') {
      ;[sameSurfaceLast10m, sameSurfaceLast60m] = await Promise.all([
        Comment.countDocuments({
          createdAt: { $gte: last10m },
          user: actorObjectId,
        }),
        Comment.countDocuments({
          createdAt: { $gte: last60m },
          user: actorObjectId,
        }),
      ])
    } else if (snapshot.contentType === 'review') {
      ;[sameSurfaceLast10m, sameSurfaceLast60m] = await Promise.all([
        Rating.countDocuments({
          createdAt: { $gte: last10m },
          user: actorObjectId,
        }),
        Rating.countDocuments({
          createdAt: { $gte: last60m },
          user: actorObjectId,
        }),
      ])
    } else {
      const sameSurfaceModel = contentModelByType[snapshot.contentType]
      ;[sameSurfaceLast10m, sameSurfaceLast60m] = await Promise.all([
        sameSurfaceModel.countDocuments({
          createdAt: { $gte: last10m },
          creator: actorObjectId,
        }),
        sameSurfaceModel.countDocuments({
          createdAt: { $gte: last60m },
          creator: actorObjectId,
        }),
      ])
    }

    if (!isBaseContentType(snapshot.contentType)) {
      return {
        sameSurfaceLast10m,
        sameSurfaceLast60m,
        portfolioLast10m: sameSurfaceLast10m,
        portfolioLast60m: sameSurfaceLast60m,
      }
    }

    const portfolioRows = await Promise.all(
      BASE_CONTENT_TYPES.map(async (contentType) => {
        const model = contentModelByType[contentType]
        const [last10mCount, last60mCount] = await Promise.all([
          model.countDocuments({
            createdAt: { $gte: last10m },
            creator: actorObjectId,
          }),
          model.countDocuments({
            createdAt: { $gte: last60m },
            creator: actorObjectId,
          }),
        ])

        return {
          last10mCount,
          last60mCount,
        }
      })
    )

    return {
      sameSurfaceLast10m,
      sameSurfaceLast60m,
      portfolioLast10m: portfolioRows.reduce((sum, row) => sum + row.last10mCount, 0),
      portfolioLast60m: portfolioRows.reduce((sum, row) => sum + row.last60mCount, 0),
    }
  }

  private async persistEvaluation(
    evaluation: AutomatedModerationEvaluation
  ): Promise<IAutomatedModerationSignal | null> {
    const now = new Date()
    const baseUpdate = {
      actor:
        evaluation.actorUserId && mongoose.Types.ObjectId.isValid(evaluation.actorUserId)
          ? new mongoose.Types.ObjectId(evaluation.actorUserId)
          : null,
      ownerUserId:
        evaluation.ownerUserId && mongoose.Types.ObjectId.isValid(evaluation.ownerUserId)
          ? new mongoose.Types.ObjectId(evaluation.ownerUserId)
          : null,
      triggerSource: evaluation.triggerSource,
      score: evaluation.score,
      severity: evaluation.severity,
      recommendedAction: evaluation.recommendedAction,
      triggeredRules: evaluation.triggeredRules,
      textSignals: evaluation.textSignals,
      activitySignals: evaluation.activitySignals,
      automation: {
        enabled: evaluation.automation.enabled,
        eligible: evaluation.automation.eligible,
        blockedReason: evaluation.automation.blockedReason,
        attempted: false,
        executed: false,
        action: null,
        lastOutcome: null,
        lastError: null,
        lastAttemptAt: null,
      },
      lastEvaluatedAt: now,
    }

    if (evaluation.triggeredRules.length === 0) {
      const existing = await AutomatedModerationSignal.findOne({
        contentType: evaluation.contentType,
        contentId: evaluation.contentId,
      })

      if (!existing) {
        return null
      }

      existing.status = 'cleared'
      existing.triggerSource = evaluation.triggerSource
      existing.score = 0
      existing.severity = 'none'
      existing.recommendedAction = 'none'
      existing.triggeredRules = []
      existing.textSignals = evaluation.textSignals
      existing.activitySignals = evaluation.activitySignals
      existing.automation = {
        enabled: evaluation.automation.enabled,
        eligible: false,
        blockedReason: 'no_triggered_rules',
        attempted: false,
        executed: false,
        action: null,
        lastOutcome: null,
        lastError: null,
        lastAttemptAt: null,
      }
      existing.lastEvaluatedAt = now
      existing.resolvedAt = now
      existing.resolutionAction = 'cleared'
      await existing.save()
      return existing
    }

    return AutomatedModerationSignal.findOneAndUpdate(
      {
        contentType: evaluation.contentType,
        contentId: evaluation.contentId,
      },
      {
        $set: {
          ...baseUpdate,
          status: 'active',
          resolvedBy: null,
          resolvedAt: null,
          resolutionAction: null,
          lastDetectedAt: now,
        },
        $setOnInsert: {
          firstDetectedAt: now,
        },
      },
      {
        new: true,
        upsert: true,
      }
    )
  }

  private async maybeAutoHide(
    evaluation: AutomatedModerationEvaluation
  ): Promise<AutomatedModerationAutomationState> {
    if (
      evaluation.recommendedAction !== 'hide' ||
      !evaluation.automation.eligible ||
      !evaluation.automation.enabled
    ) {
      return {
        attempted: false,
        executed: false,
        blockedReason: evaluation.automation.blockedReason,
        action: null,
        error: null,
      }
    }

    const config = getAutomationConfig()
    if (!config.autoHideActorId) {
      return {
        attempted: false,
        executed: false,
        blockedReason: 'auto_hide_actor_missing',
        action: null,
        error: null,
      }
    }

    try {
      const { adminContentService } = await import('./adminContent.service')
      const reason = this.buildAutoHideReason(evaluation)
      const autoHideResult = await adminContentService.fastHideContent({
        actorId: config.autoHideActorId,
        contentType: evaluation.contentType,
        contentId: evaluation.contentId,
        reason,
        note: 'Detecao automatica de moderacao acionou hide-fast preventivo.',
        metadata: {
          automatedDetection: true,
          triggerSource: evaluation.triggerSource,
          severity: evaluation.severity,
          score: evaluation.score,
          triggeredRules: evaluation.triggeredRules.map((rule) => rule.rule),
        },
      })

      await adminAuditService.record({
        actorId: config.autoHideActorId,
        actorRole: 'admin',
        action: 'admin.content.automated_detection_auto_hide',
        scope: 'admin.content.moderate',
        resourceType: 'content',
        resourceId: `${evaluation.contentType}:${evaluation.contentId}`,
        reason,
        method: 'SYSTEM',
        path: 'automation://moderation/content',
        statusCode: 200,
        outcome: 'success',
        metadata: {
          triggerSource: evaluation.triggerSource,
          severity: evaluation.severity,
          score: evaluation.score,
          triggeredRules: evaluation.triggeredRules.map((rule) => rule.rule),
          changed: autoHideResult.changed,
          fromStatus: autoHideResult.fromStatus,
          toStatus: autoHideResult.toStatus,
        },
      })

      return {
        attempted: true,
        executed: true,
        blockedReason: null,
        action: 'hide',
        error: null,
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido em auto-hide de deteccao.'
      const reason = this.buildAutoHideReason(evaluation)

      await adminAuditService.record({
        actorId: config.autoHideActorId,
        actorRole: 'admin',
        action: 'admin.content.automated_detection_auto_hide',
        scope: 'admin.content.moderate',
        resourceType: 'content',
        resourceId: `${evaluation.contentType}:${evaluation.contentId}`,
        reason,
        method: 'SYSTEM',
        path: 'automation://moderation/content',
        statusCode: 500,
        outcome: 'error',
        metadata: {
          triggerSource: evaluation.triggerSource,
          severity: evaluation.severity,
          score: evaluation.score,
          triggeredRules: evaluation.triggeredRules.map((rule) => rule.rule),
          error: errorMessage,
        },
      })

      return {
        attempted: true,
        executed: false,
        blockedReason: 'automation_error',
        action: null,
        error: errorMessage,
      }
    }
  }

  buildAutoHideReason(evaluation: AutomatedModerationEvaluation): string {
    const rules = evaluation.triggeredRules.map((rule) => rule.rule).join(', ') || 'n/a'
    return `Auto-hide preventivo via detecao automatica. severity=${evaluation.severity}; score=${evaluation.score}; rules=${rules}`
  }

  private async getTargetSnapshot(
    contentType: ModeratableContentType,
    contentId: string
  ): Promise<DetectionTargetSnapshot | null> {
    const model = contentModelByType[contentType]
    if (!model) {
      throw new Error('contentType invalido para deteccao automatica.')
    }

    const item = await model.findById(contentId).select(selectFieldsByType(contentType)).lean()
    if (!item) return null

    if (contentType === 'comment') {
      const content = typeof item.content === 'string' ? item.content : ''
      const actorUserId = resolveActorId(item.user)

      return {
        contentType,
        contentId,
        actorUserId,
        ownerUserId: actorUserId,
        moderationStatus: toModerationStatus(item.moderationStatus),
        publishStatus: 'published_implicit',
        text: content,
      }
    }

    if (contentType === 'review') {
      const review = typeof item.review === 'string' ? item.review : ''
      const actorUserId = resolveActorId(item.user)

      return {
        contentType,
        contentId,
        actorUserId,
        ownerUserId: actorUserId,
        moderationStatus: toModerationStatus(item.moderationStatus),
        publishStatus: 'published_implicit',
        text: review,
      }
    }

    const title = typeof item.title === 'string' ? item.title : ''
    const description = typeof item.description === 'string' ? item.description : ''
    const content = typeof item.content === 'string' ? item.content : ''
    const creatorId = resolveActorId(item.creator)

    return {
      contentType,
      contentId,
      actorUserId: creatorId,
      ownerUserId: creatorId,
      moderationStatus: toModerationStatus(item.moderationStatus),
      publishStatus: toPublishStatus(item.status),
      text: [title, description, content].filter(Boolean).join('\n'),
    }
  }
}

export const automatedModerationService = new AutomatedModerationService()
