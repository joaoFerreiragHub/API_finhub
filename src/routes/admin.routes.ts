import { Router } from 'express'
import { exportAdminAuditLogsCsv, listAdminAuditLogs } from '../controllers/adminAudit.controller'
import {
  acknowledgeAdminInternalAlert,
  dismissAdminInternalAlert,
  listAdminInternalAlerts,
} from '../controllers/adminOperationalAlerts.controller'
import {
  listAdminAssistedSessionHistory,
  listAdminAssistedSessions,
  requestAdminAssistedSession,
  revokeAdminAssistedSession,
  startAdminAssistedSession,
} from '../controllers/adminAssistedSession.controller'
import {
  approveBulkRollbackJob,
  bulkModerateContent,
  bulkRollbackContent,
  createBulkModerationJob,
  createBulkRollbackJob,
  getAdminContentJob,
  getAdminContentJobWorkerStatus,
  getContentRollbackReview,
  hideContent,
  hideContentFast,
  listAdminContentJobs,
  listAdminContentQueue,
  listContentReports,
  listContentModerationHistory,
  requestBulkRollbackJobReview,
  rollbackContent,
  scheduleContentUnhide,
  restrictContent,
  unhideContent,
} from '../controllers/adminContent.controller'
import {
  getAdminMetricsDrilldown,
  getAdminMetricsOverview,
} from '../controllers/adminMetrics.controller'
import {
  exportAdminCreatorPositiveAnalyticsCsv,
  listAdminCreatorPositiveAnalytics,
} from '../controllers/adminCreatorAnalytics.controller'
import {
  getAdminDashboardPersonalization,
  resetAdminDashboardPersonalization,
  updateAdminDashboardPersonalization,
} from '../controllers/adminDashboardPreference.controller'
import {
  getAdminFinancialToolsUsage,
  listAdminFinancialTools,
  updateAdminFinancialTool,
} from '../controllers/adminFinancialTools.controller'
import {
  listAdminSurfaceControls,
  updateAdminSurfaceControl,
} from '../controllers/adminSurfaceControl.controller'
import {
  activateAdminContentAccessPolicy,
  createAdminContentAccessPolicy,
  deactivateAdminContentAccessPolicy,
  getAdminContentAccessPolicy,
  listAdminContentAccessPolicies,
  previewAdminContentAccessPolicy,
  updateAdminContentAccessPolicy,
} from '../controllers/adminContentAccessPolicy.controller'
import {
  activateAdminModerationTemplate,
  createAdminModerationTemplate,
  deactivateAdminModerationTemplate,
  getAdminModerationTemplate,
  listAdminModerationTemplates,
  updateAdminModerationTemplate,
} from '../controllers/adminModerationTemplate.controller'
import {
  getAdminModerationAppeal,
  listAdminModerationAppeals,
  updateAdminModerationAppealStatus,
} from '../controllers/adminModerationAppeal.controller'
import {
  extendAdminSubscriptionTrial,
  getAdminSubscriptionByUser,
  listAdminSubscriptions,
  reactivateAdminSubscription,
  revokeAdminSubscriptionEntitlement,
} from '../controllers/adminSubscription.controller'
import {
  getAdminAffiliateOverview,
  listAdminAffiliateLinks,
  markAdminAffiliateClickConversion,
} from '../controllers/adminAffiliate.controller'
import {
  createAdminBulkImportJob,
  getAdminBulkImportJob,
  listAdminBulkImportJobs,
  previewAdminBulkImport,
} from '../controllers/adminBulkImport.controller'
import {
  approveAdminBroadcast,
  createAdminBroadcast,
  getAdminBroadcast,
  listAdminBroadcasts,
  previewAdminBroadcastAudience,
  sendAdminBroadcast,
} from '../controllers/adminBroadcast.controller'
import {
  activateAdminAdCampaign,
  approveAdminAdCampaign,
  createAdminAdCampaign,
  createAdminAdSlot,
  getAdminAdCampaign,
  getAdminAdCampaignMetrics,
  getAdminAdsInventoryOverview,
  listAdminAdCampaigns,
  listAdminAdSlots,
  pauseAdminAdCampaign,
  rejectAdminAdCampaign,
  submitAdminAdCampaignForApproval,
  updateAdminAdCampaign,
  updateAdminAdSlot,
} from '../controllers/adminAdPartnership.controller'
import {
  applyCreatorControls,
  addUserInternalNote,
  banUser,
  forceLogoutUser,
  getAdminUserTrustProfile,
  listAdminUsers,
  listUserModerationHistory,
  suspendUser,
  updateAdminUserPermissions,
  unbanUser,
} from '../controllers/adminUser.controller'
import {
  createAdminScopeDelegations,
  listAdminScopeDelegations,
  revokeAdminScopeDelegation,
} from '../controllers/adminScopeDelegation.controller'
import {
  addEditorialSectionItem,
  approveAdminClaim,
  archiveAdminDirectory,
  createAdminDirectory,
  createEditorialSection,
  listAdminClaims,
  listAdminOwnershipTransfers,
  listAdminDirectories,
  listEditorialSections,
  rejectAdminClaim,
  removeEditorialSectionItem,
  reorderEditorialSectionItems,
  transferAdminOwnership,
  updateAdminDirectory,
  updateEditorialSection,
  publishAdminDirectory,
} from '../controllers/adminEditorialCms.controller'
import { authenticate } from '../middlewares/auth'
import { auditAdminAction } from '../middlewares/adminAudit'
import { rateLimiter } from '../middlewares/rateLimiter'
import {
  validateAdminAdCampaignCreateContract,
  validateAdminAdCampaignStatusContract,
  validateAdminAdCampaignUpdateContract,
  validateAdminAffiliateConvertContract,
  validateAdminAffiliateLinksContract,
  validateAdminAffiliateOverviewContract,
  validateAdminAdSlotCreateContract,
  validateAdminAdSlotUpdateContract,
  validateAdminAssistedSessionRequestContract,
  validateAdminBroadcastApproveContract,
  validateAdminBroadcastCreateContract,
  validateAdminBroadcastPreviewContract,
  validateAdminBroadcastSendContract,
  validateAdminBulkImportCreateContract,
  validateAdminBulkImportPreviewContract,
  validateAdminContentAccessPolicyCreateContract,
  validateAdminContentAccessPolicyPreviewContract,
  validateAdminContentAccessPolicySetActiveContract,
  validateAdminContentAccessPolicyUpdateContract,
  validateAdminContentScheduleUnhideContract,
  validateAdminDashboardPersonalizationPatchContract,
  validateAdminDashboardPersonalizationResetContract,
  validateAdminFinancialToolUpdateContract,
  validateAdminModerationAppealStatusContract,
  validateAdminModerationTemplateCreateContract,
  validateAdminModerationTemplateSetActiveContract,
  validateAdminModerationTemplateUpdateContract,
  validateAdminSessionIdParamContract,
  validateAdminSessionRevokeContract,
  validateAdminScopeDelegationCreateContract,
  validateAdminScopeDelegationRevokeContract,
  validateAdminSubscriptionExtendTrialContract,
  validateAdminSubscriptionReactivateContract,
  validateAdminSubscriptionRevokeEntitlementContract,
  validateAdminSurfaceControlContract,
} from '../middlewares/requestContracts'
import { requireAdminScope } from '../middlewares/roleGuard'

const router = Router()

/**
 * @route   GET /api/admin/audit-logs/export.csv
 * @desc    Exportar logs de auditoria administrativa em CSV
 * @access  Private (Admin com escopo admin.audit.read)
 */
router.get(
  '/audit-logs/export.csv',
  authenticate,
  auditAdminAction({
    action: 'admin.audit_logs.export_csv',
    resourceType: 'admin_audit_log',
    scope: 'admin.audit.read',
  }),
  requireAdminScope('admin.audit.read'),
  exportAdminAuditLogsCsv
)

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Listar logs de auditoria administrativa
 * @access  Private (Admin com escopo admin.audit.read)
 */
router.get(
  '/audit-logs',
  authenticate,
  auditAdminAction({
    action: 'admin.audit_logs.list',
    resourceType: 'admin_audit_log',
    scope: 'admin.audit.read',
  }),
  requireAdminScope('admin.audit.read'),
  listAdminAuditLogs
)

/**
 * @route   GET /api/admin/alerts/internal
 * @desc    Alertas internos para eventos admin criticos
 * @access  Private (Admin com escopo admin.audit.read)
 */
router.get(
  '/alerts/internal',
  authenticate,
  auditAdminAction({
    action: 'admin.alerts.internal.list',
    resourceType: 'admin_operational_alert',
    scope: 'admin.audit.read',
  }),
  requireAdminScope('admin.audit.read'),
  listAdminInternalAlerts
)

/**
 * @route   POST /api/admin/alerts/internal/:alertId/acknowledge
 * @desc    Marcar alerta interno como acknowledged
 * @access  Private (Admin com escopo admin.audit.read)
 */
router.post(
  '/alerts/internal/:alertId/acknowledge',
  authenticate,
  auditAdminAction({
    action: 'admin.alerts.internal.acknowledge',
    resourceType: 'admin_operational_alert',
    scope: 'admin.audit.read',
    getResourceId: (req) => req.params.alertId,
  }),
  requireAdminScope('admin.audit.read'),
  acknowledgeAdminInternalAlert
)

/**
 * @route   POST /api/admin/alerts/internal/:alertId/dismiss
 * @desc    Marcar alerta interno como dismissed
 * @access  Private (Admin com escopo admin.audit.read)
 */
router.post(
  '/alerts/internal/:alertId/dismiss',
  authenticate,
  auditAdminAction({
    action: 'admin.alerts.internal.dismiss',
    resourceType: 'admin_operational_alert',
    scope: 'admin.audit.read',
    getResourceId: (req) => req.params.alertId,
  }),
  requireAdminScope('admin.audit.read'),
  dismissAdminInternalAlert
)

/**
 * @route   GET /api/admin/metrics/overview
 * @desc    Dashboard consolidado de metricas administrativas
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/metrics/overview',
  authenticate,
  auditAdminAction({
    action: 'admin.metrics.overview.read',
    resourceType: 'admin_metrics',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getAdminMetricsOverview
)

/**
 * @route   GET /api/admin/metrics/drilldown
 * @desc    Drill-down operacional por creator, alvo, superficie e jobs
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/metrics/drilldown',
  authenticate,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.metrics.drilldown.read',
    resourceType: 'admin_metrics',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getAdminMetricsDrilldown
)

/**
 * @route   GET /api/admin/creators/analytics/positive/export.csv
 * @desc    Exportar CSV de analytics positivos de creators
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/creators/analytics/positive/export.csv',
  authenticate,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.creators.analytics.positive.export_csv',
    resourceType: 'creator_analytics_positive',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  exportAdminCreatorPositiveAnalyticsCsv
)

/**
 * @route   GET /api/admin/creators/analytics/positive
 * @desc    Top creators por crescimento/engagement com trust side-by-side
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/creators/analytics/positive',
  authenticate,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.creators.analytics.positive.list',
    resourceType: 'creator_analytics_positive',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  listAdminCreatorPositiveAnalytics
)

/**
 * @route   GET /api/admin/dashboard/personalization
 * @desc    Ler configuracao personalizada do dashboard admin
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/dashboard/personalization',
  authenticate,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.dashboard.personalization.read',
    resourceType: 'admin_dashboard_preference',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getAdminDashboardPersonalization
)

/**
 * @route   PATCH /api/admin/dashboard/personalization
 * @desc    Atualizar layout/widgets/filtros do dashboard admin
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.patch(
  '/dashboard/personalization',
  authenticate,
  validateAdminDashboardPersonalizationPatchContract,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.dashboard.personalization.update',
    resourceType: 'admin_dashboard_preference',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  updateAdminDashboardPersonalization
)

/**
 * @route   POST /api/admin/dashboard/personalization/reset
 * @desc    Repor dashboard admin para preset base
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.post(
  '/dashboard/personalization/reset',
  authenticate,
  validateAdminDashboardPersonalizationResetContract,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.dashboard.personalization.reset',
    resourceType: 'admin_dashboard_preference',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  resetAdminDashboardPersonalization
)

/**
 * @route   GET /api/admin/tools/financial/usage
 * @desc    Metricas de uso por financial tool e vertical
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/tools/financial/usage',
  authenticate,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.tools.financial.usage.read',
    resourceType: 'financial_tool_usage',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getAdminFinancialToolsUsage
)

/**
 * @route   GET /api/admin/tools/financial
 * @desc    Ler controlos de financial tools com config efetiva por ambiente
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/tools/financial',
  authenticate,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.tools.financial.list',
    resourceType: 'financial_tool_control',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  listAdminFinancialTools
)

/**
 * @route   PATCH /api/admin/tools/financial/:toolKey
 * @desc    Atualizar feature flags e limites de financial tool
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.patch(
  '/tools/financial/:toolKey',
  authenticate,
  validateAdminFinancialToolUpdateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.tools.financial.update',
    resourceType: 'financial_tool_control',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.toolKey,
  }),
  requireAdminScope('admin.content.moderate'),
  updateAdminFinancialTool
)

/**
 * @route   GET /api/admin/platform/surfaces
 * @desc    Ler kill switches operacionais por superficie
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/platform/surfaces',
  authenticate,
  auditAdminAction({
    action: 'admin.platform.surfaces.list',
    resourceType: 'platform_surface_control',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminSurfaceControls
)

/**
 * @route   POST /api/admin/platform/surfaces/:surfaceKey
 * @desc    Atualizar kill switch operacional de uma superficie
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/platform/surfaces/:surfaceKey',
  authenticate,
  rateLimiter.adminModerationAction,
  validateAdminSurfaceControlContract,
  auditAdminAction({
    action: 'admin.platform.surfaces.update',
    resourceType: 'platform_surface_control',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.surfaceKey,
    getMetadata: (req) => ({
      enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : undefined,
      publicMessage:
        typeof req.body?.publicMessage === 'string' ? req.body.publicMessage.trim() || null : undefined,
      note: typeof req.body?.note === 'string' ? req.body.note.trim() || null : undefined,
    }),
  }),
  requireAdminScope('admin.content.moderate'),
  updateAdminSurfaceControl
)

/**
 * @route   GET /api/admin/support/sessions
 * @desc    Listar sessoes assistidas do admin autenticado
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.get(
  '/support/sessions',
  authenticate,
  auditAdminAction({
    action: 'admin.support.sessions.list',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
  }),
  requireAdminScope('admin.support.session.assist'),
  listAdminAssistedSessions
)

/**
 * @route   POST /api/admin/support/sessions/request
 * @desc    Criar pedido de sessao assistida para um utilizador alvo
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.post(
  '/support/sessions/request',
  authenticate,
  validateAdminAssistedSessionRequestContract,
  auditAdminAction({
    action: 'admin.support.sessions.request',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
  }),
  requireAdminScope('admin.support.session.assist'),
  requestAdminAssistedSession
)

/**
 * @route   POST /api/admin/support/sessions/:sessionId/start
 * @desc    Iniciar sessao assistida apos consentimento
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.post(
  '/support/sessions/:sessionId/start',
  authenticate,
  validateAdminSessionIdParamContract,
  auditAdminAction({
    action: 'admin.support.sessions.start',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
    getResourceId: (req) => req.params.sessionId,
  }),
  requireAdminScope('admin.support.session.assist'),
  startAdminAssistedSession
)

/**
 * @route   POST /api/admin/support/sessions/:sessionId/revoke
 * @desc    Revogar sessao assistida ativa/pendente/aprovada
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.post(
  '/support/sessions/:sessionId/revoke',
  authenticate,
  validateAdminSessionRevokeContract,
  auditAdminAction({
    action: 'admin.support.sessions.revoke',
    resourceType: 'assisted_session',
    scope: 'admin.support.session.assist',
    getResourceId: (req) => req.params.sessionId,
  }),
  requireAdminScope('admin.support.session.assist'),
  revokeAdminAssistedSession
)

/**
 * @route   GET /api/admin/support/sessions/:sessionId/history
 * @desc    Listar auditoria detalhada de uma sessao assistida
 * @access  Private (Admin com escopo admin.support.session.assist)
 */
router.get(
  '/support/sessions/:sessionId/history',
  authenticate,
  validateAdminSessionIdParamContract,
  auditAdminAction({
    action: 'admin.support.sessions.history.list',
    resourceType: 'assisted_session_audit_log',
    scope: 'admin.support.session.assist',
    getResourceId: (req) => req.params.sessionId,
  }),
  requireAdminScope('admin.support.session.assist'),
  listAdminAssistedSessionHistory
)

/**
 * @route   GET /api/admin/content/queue
 * @desc    Listar fila unificada de moderacao de conteudo
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/queue',
  authenticate,
  auditAdminAction({
    action: 'admin.content.queue.list',
    resourceType: 'content',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminContentQueue
)

/**
 * @route   GET /api/admin/content/jobs
 * @desc    Listar jobs assíncronos de moderacao/rollback
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/jobs',
  authenticate,
  auditAdminAction({
    action: 'admin.content.jobs.list',
    resourceType: 'content_job',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminContentJobs
)

/**
 * @route   GET /api/admin/content/jobs/worker-status
 * @desc    Ler estado do worker dedicado e backlog de jobs
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/jobs/worker-status',
  authenticate,
  auditAdminAction({
    action: 'admin.content.jobs.worker_status.read',
    resourceType: 'content_job_worker',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  getAdminContentJobWorkerStatus
)

/**
 * @route   POST /api/admin/content/jobs/:jobId/request-review
 * @desc    Submeter job de rollback em lote para revisao operacional
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/jobs/:jobId/request-review',
  authenticate,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.content.bulk_rollback_job.request_review',
    resourceType: 'content_job',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.jobId,
  }),
  requireAdminScope('admin.content.moderate'),
  requestBulkRollbackJobReview
)

/**
 * @route   POST /api/admin/content/jobs/:jobId/approve
 * @desc    Aprovar job de rollback em lote apos revisao faseada
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/jobs/:jobId/approve',
  authenticate,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.content.bulk_rollback_job.approve',
    resourceType: 'content_job',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.jobId,
  }),
  requireAdminScope('admin.content.moderate'),
  approveBulkRollbackJob
)

/**
 * @route   GET /api/admin/content/jobs/:jobId
 * @desc    Ler detalhe de um job assíncrono de conteudo
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/jobs/:jobId',
  authenticate,
  auditAdminAction({
    action: 'admin.content.jobs.read',
    resourceType: 'content_job',
    scope: 'admin.content.read',
    getResourceId: (req) => req.params.jobId,
  }),
  requireAdminScope('admin.content.read'),
  getAdminContentJob
)

/**
 * @route   GET /api/admin/content/:contentType/:contentId/history
 * @desc    Listar historico de moderacao de um conteudo
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/:contentType/:contentId/history',
  authenticate,
  auditAdminAction({
    action: 'admin.content.history.list',
    resourceType: 'content_moderation_event',
    scope: 'admin.content.read',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.read'),
  listContentModerationHistory
)

/**
 * @route   GET /api/admin/content/:contentType/:contentId/rollback-review
 * @desc    Rever guardrails e impacto antes de rollback de moderacao
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/:contentType/:contentId/rollback-review',
  authenticate,
  auditAdminAction({
    action: 'admin.content.rollback_review.read',
    resourceType: 'content_moderation_event',
    scope: 'admin.content.read',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.read'),
  getContentRollbackReview
)

/**
 * @route   GET /api/admin/content/:contentType/:contentId/reports
 * @desc    Listar reports de users sobre um conteudo
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/:contentType/:contentId/reports',
  authenticate,
  auditAdminAction({
    action: 'admin.content.reports.list',
    resourceType: 'content_report',
    scope: 'admin.content.read',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.read'),
  listContentReports
)

/**
 * @route   GET /api/admin/content/access-policies
 * @desc    Listar policies de acesso premium/paywall
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/access-policies',
  authenticate,
  auditAdminAction({
    action: 'admin.content.access_policies.list',
    resourceType: 'content_access_policy',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminContentAccessPolicies
)

/**
 * @route   GET /api/admin/content/access-policies/:policyId
 * @desc    Ler detalhe de policy de acesso premium/paywall
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/access-policies/:policyId',
  authenticate,
  auditAdminAction({
    action: 'admin.content.access_policies.read',
    resourceType: 'content_access_policy',
    scope: 'admin.content.read',
    getResourceId: (req) => req.params.policyId,
  }),
  requireAdminScope('admin.content.read'),
  getAdminContentAccessPolicy
)

/**
 * @route   POST /api/admin/content/access-policies/preview
 * @desc    Simular impacto de policy de acesso premium/paywall
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/access-policies/preview',
  authenticate,
  validateAdminContentAccessPolicyPreviewContract,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.content.access_policies.preview',
    resourceType: 'content_access_policy',
    scope: 'admin.content.moderate',
  }),
  requireAdminScope('admin.content.moderate'),
  previewAdminContentAccessPolicy
)

/**
 * @route   POST /api/admin/content/access-policies
 * @desc    Criar policy de acesso premium/paywall
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/access-policies',
  authenticate,
  validateAdminContentAccessPolicyCreateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.access_policies.create',
    resourceType: 'content_access_policy',
    scope: 'admin.content.moderate',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      const access =
        body.access && typeof body.access === 'object'
          ? (body.access as Record<string, unknown>)
          : null

      return {
        code: typeof body.code === 'string' ? body.code : undefined,
        requiredRole:
          access && typeof access.requiredRole === 'string' ? access.requiredRole : undefined,
        active: typeof body.active === 'boolean' ? body.active : undefined,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  createAdminContentAccessPolicy
)

/**
 * @route   PATCH /api/admin/content/access-policies/:policyId
 * @desc    Atualizar policy de acesso premium/paywall
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.patch(
  '/content/access-policies/:policyId',
  authenticate,
  validateAdminContentAccessPolicyUpdateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.access_policies.update',
    resourceType: 'content_access_policy',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.policyId,
  }),
  requireAdminScope('admin.content.moderate'),
  updateAdminContentAccessPolicy
)

/**
 * @route   POST /api/admin/content/access-policies/:policyId/activate
 * @desc    Ativar policy de acesso premium/paywall
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/access-policies/:policyId/activate',
  authenticate,
  validateAdminContentAccessPolicySetActiveContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.access_policies.activate',
    resourceType: 'content_access_policy',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.policyId,
  }),
  requireAdminScope('admin.content.moderate'),
  activateAdminContentAccessPolicy
)

/**
 * @route   POST /api/admin/content/access-policies/:policyId/deactivate
 * @desc    Desativar policy de acesso premium/paywall
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/access-policies/:policyId/deactivate',
  authenticate,
  validateAdminContentAccessPolicySetActiveContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.access_policies.deactivate',
    resourceType: 'content_access_policy',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.policyId,
  }),
  requireAdminScope('admin.content.moderate'),
  deactivateAdminContentAccessPolicy
)

/**
 * @route   GET /api/admin/content/appeals
 * @desc    Listar inbox de apelacoes de moderacao
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/appeals',
  authenticate,
  auditAdminAction({
    action: 'admin.content.appeals.list',
    resourceType: 'moderation_appeal',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminModerationAppeals
)

/**
 * @route   GET /api/admin/content/appeals/:appealId
 * @desc    Ler detalhe de apelacao de moderacao
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/appeals/:appealId',
  authenticate,
  auditAdminAction({
    action: 'admin.content.appeals.read',
    resourceType: 'moderation_appeal',
    scope: 'admin.content.read',
    getResourceId: (req) => req.params.appealId,
  }),
  requireAdminScope('admin.content.read'),
  getAdminModerationAppeal
)

/**
 * @route   PATCH /api/admin/content/appeals/:appealId/status
 * @desc    Atualizar estado de apelacao de moderacao com motivo obrigatorio
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.patch(
  '/content/appeals/:appealId/status',
  authenticate,
  validateAdminModerationAppealStatusContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.appeals.status.update',
    resourceType: 'moderation_appeal',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.appealId,
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        nextStatus: typeof body.status === 'string' ? body.status : undefined,
        reason: typeof body.reason === 'string' ? body.reason : undefined,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  updateAdminModerationAppealStatus
)

/**
 * @route   GET /api/admin/monetization/subscriptions
 * @desc    Listar subscricoes premium/trial/canceladas
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/monetization/subscriptions',
  authenticate,
  auditAdminAction({
    action: 'admin.monetization.subscriptions.list',
    resourceType: 'user_subscription',
    scope: 'admin.users.read',
  }),
  requireAdminScope('admin.users.read'),
  listAdminSubscriptions
)

/**
 * @route   GET /api/admin/monetization/subscriptions/users/:userId
 * @desc    Obter detalhe da subscricao de um utilizador
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/monetization/subscriptions/users/:userId',
  authenticate,
  auditAdminAction({
    action: 'admin.monetization.subscriptions.read',
    resourceType: 'user_subscription',
    scope: 'admin.users.read',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.read'),
  getAdminSubscriptionByUser
)

/**
 * @route   POST /api/admin/monetization/subscriptions/users/:userId/extend-trial
 * @desc    Estender trial da subscricao com motivo obrigatorio
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/monetization/subscriptions/users/:userId/extend-trial',
  authenticate,
  validateAdminSubscriptionExtendTrialContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.monetization.subscriptions.extend_trial',
    resourceType: 'user_subscription',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  extendAdminSubscriptionTrial
)

/**
 * @route   POST /api/admin/monetization/subscriptions/users/:userId/revoke-entitlement
 * @desc    Revogar entitlement premium com motivo obrigatorio
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/monetization/subscriptions/users/:userId/revoke-entitlement',
  authenticate,
  validateAdminSubscriptionRevokeEntitlementContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.monetization.subscriptions.revoke_entitlement',
    resourceType: 'user_subscription',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  revokeAdminSubscriptionEntitlement
)

/**
 * @route   POST /api/admin/monetization/subscriptions/users/:userId/reactivate
 * @desc    Reativar subscricao premium com motivo obrigatorio
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/monetization/subscriptions/users/:userId/reactivate',
  authenticate,
  validateAdminSubscriptionReactivateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.monetization.subscriptions.reactivate',
    resourceType: 'user_subscription',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  reactivateAdminSubscription
)

/**
 * @route   GET /api/admin/monetization/affiliates/overview
 * @desc    Ler overview de cliques/conversoes/revenue de afiliacao
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/monetization/affiliates/overview',
  authenticate,
  validateAdminAffiliateOverviewContract,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.monetization.affiliates.overview.read',
    resourceType: 'affiliate_click',
    scope: 'admin.metrics.read',
  }),
  requireAdminScope('admin.metrics.read'),
  getAdminAffiliateOverview
)

/**
 * @route   GET /api/admin/monetization/affiliates/links
 * @desc    Listar links de afiliacao no painel admin
 * @access  Private (Admin com escopo admin.brands.read)
 */
router.get(
  '/monetization/affiliates/links',
  authenticate,
  validateAdminAffiliateLinksContract,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.monetization.affiliates.links.list',
    resourceType: 'affiliate_link',
    scope: 'admin.brands.read',
  }),
  requireAdminScope('admin.brands.read'),
  listAdminAffiliateLinks
)

/**
 * @route   POST /api/admin/monetization/affiliates/clicks/:clickId/convert
 * @desc    Marcar clique de afiliacao como convertido
 * @access  Private (Admin com escopo admin.brands.write)
 */
router.post(
  '/monetization/affiliates/clicks/:clickId/convert',
  authenticate,
  validateAdminAffiliateConvertContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.monetization.affiliates.clicks.convert',
    resourceType: 'affiliate_click',
    scope: 'admin.brands.write',
    getResourceId: (req) => req.params.clickId,
  }),
  requireAdminScope('admin.brands.write'),
  markAdminAffiliateClickConversion
)

/**
 * @route   GET /api/admin/operations/bulk-import/jobs
 * @desc    Listar jobs de bulk import operacional (CSV)
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/operations/bulk-import/jobs',
  authenticate,
  auditAdminAction({
    action: 'admin.operations.bulk_import.jobs.list',
    resourceType: 'admin_bulk_import_job',
    scope: 'admin.users.read',
  }),
  requireAdminScope('admin.users.read'),
  listAdminBulkImportJobs
)

/**
 * @route   GET /api/admin/operations/bulk-import/jobs/:jobId
 * @desc    Ler detalhe de job de bulk import operacional
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/operations/bulk-import/jobs/:jobId',
  authenticate,
  auditAdminAction({
    action: 'admin.operations.bulk_import.jobs.read',
    resourceType: 'admin_bulk_import_job',
    scope: 'admin.users.read',
    getResourceId: (req) => req.params.jobId,
  }),
  requireAdminScope('admin.users.read'),
  getAdminBulkImportJob
)

/**
 * @route   POST /api/admin/operations/bulk-import/preview
 * @desc    Pre-visualizar bulk import CSV operacional sem persistir alteracoes
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/operations/bulk-import/preview',
  authenticate,
  validateAdminBulkImportPreviewContract,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.operations.bulk_import.preview',
    resourceType: 'admin_bulk_import_job',
    scope: 'admin.users.write',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        importType: typeof body.importType === 'string' ? body.importType : undefined,
      }
    },
  }),
  requireAdminScope('admin.users.write'),
  previewAdminBulkImport
)

/**
 * @route   POST /api/admin/operations/bulk-import/jobs
 * @desc    Executar bulk import CSV operacional (dry-run ou efetivo)
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/operations/bulk-import/jobs',
  authenticate,
  validateAdminBulkImportCreateContract,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.operations.bulk_import.jobs.create',
    resourceType: 'admin_bulk_import_job',
    scope: 'admin.users.write',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        importType: typeof body.importType === 'string' ? body.importType : undefined,
        dryRun: body.dryRun === true,
      }
    },
  }),
  requireAdminScope('admin.users.write'),
  createAdminBulkImportJob
)

/**
 * @route   GET /api/admin/communications/broadcasts
 * @desc    Listar comunicacoes admin segmentadas
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/communications/broadcasts',
  authenticate,
  auditAdminAction({
    action: 'admin.communications.broadcasts.list',
    resourceType: 'admin_broadcast',
    scope: 'admin.users.read',
  }),
  requireAdminScope('admin.users.read'),
  listAdminBroadcasts
)

/**
 * @route   GET /api/admin/communications/broadcasts/:broadcastId
 * @desc    Ler detalhe de broadcast administrativo
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/communications/broadcasts/:broadcastId',
  authenticate,
  auditAdminAction({
    action: 'admin.communications.broadcasts.read',
    resourceType: 'admin_broadcast',
    scope: 'admin.users.read',
    getResourceId: (req) => req.params.broadcastId,
  }),
  requireAdminScope('admin.users.read'),
  getAdminBroadcast
)

/**
 * @route   POST /api/admin/communications/broadcasts/preview
 * @desc    Dry-run de audiencia para comunicacao segmentada
 * @access  Private (Admin com escopo admin.users.read)
 */
router.post(
  '/communications/broadcasts/preview',
  authenticate,
  validateAdminBroadcastPreviewContract,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.communications.broadcasts.preview',
    resourceType: 'admin_broadcast',
    scope: 'admin.users.read',
  }),
  requireAdminScope('admin.users.read'),
  previewAdminBroadcastAudience
)

/**
 * @route   POST /api/admin/communications/broadcasts
 * @desc    Criar broadcast administrativo segmentado
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/communications/broadcasts',
  authenticate,
  validateAdminBroadcastCreateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.communications.broadcasts.create',
    resourceType: 'admin_broadcast',
    scope: 'admin.users.write',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        title: typeof body.title === 'string' ? body.title : undefined,
        channel: typeof body.channel === 'string' ? body.channel : undefined,
      }
    },
  }),
  requireAdminScope('admin.users.write'),
  createAdminBroadcast
)

/**
 * @route   POST /api/admin/communications/broadcasts/:broadcastId/approve
 * @desc    Aprovar broadcast (obrigatorio para envios massivos)
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/communications/broadcasts/:broadcastId/approve',
  authenticate,
  validateAdminBroadcastApproveContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.communications.broadcasts.approve',
    resourceType: 'admin_broadcast',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.broadcastId,
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        reason: typeof body.reason === 'string' ? body.reason : undefined,
      }
    },
  }),
  requireAdminScope('admin.users.write'),
  approveAdminBroadcast
)

/**
 * @route   POST /api/admin/communications/broadcasts/:broadcastId/send
 * @desc    Enviar broadcast para audiencia segmentada
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/communications/broadcasts/:broadcastId/send',
  authenticate,
  validateAdminBroadcastSendContract,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.communications.broadcasts.send',
    resourceType: 'admin_broadcast',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.broadcastId,
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        reason: typeof body.reason === 'string' ? body.reason : undefined,
      }
    },
  }),
  requireAdminScope('admin.users.write'),
  sendAdminBroadcast
)

/**
 * @route   GET /api/admin/ads/inventory/overview
 * @desc    Overview de inventario e cobertura de campanhas por superficie
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/ads/inventory/overview',
  authenticate,
  auditAdminAction({
    action: 'admin.ads.inventory.overview.read',
    resourceType: 'ad_inventory',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  getAdminAdsInventoryOverview
)

/**
 * @route   GET /api/admin/ads/slots
 * @desc    Listar configuracoes de slots publicitarios
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/ads/slots',
  authenticate,
  auditAdminAction({
    action: 'admin.ads.slots.list',
    resourceType: 'ad_slot_config',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminAdSlots
)

/**
 * @route   POST /api/admin/ads/slots
 * @desc    Criar configuracao de slot publicitario
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/ads/slots',
  authenticate,
  validateAdminAdSlotCreateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.slots.create',
    resourceType: 'ad_slot_config',
    scope: 'admin.content.moderate',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        slotId: typeof body.slotId === 'string' ? body.slotId : undefined,
        surface: typeof body.surface === 'string' ? body.surface : undefined,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  createAdminAdSlot
)

/**
 * @route   PATCH /api/admin/ads/slots/:slotId
 * @desc    Atualizar configuracao de slot publicitario
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.patch(
  '/ads/slots/:slotId',
  authenticate,
  validateAdminAdSlotUpdateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.slots.update',
    resourceType: 'ad_slot_config',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.slotId,
  }),
  requireAdminScope('admin.content.moderate'),
  updateAdminAdSlot
)

/**
 * @route   GET /api/admin/ads/campaigns
 * @desc    Listar campanhas de anuncios e partnerships
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/ads/campaigns',
  authenticate,
  auditAdminAction({
    action: 'admin.ads.campaigns.list',
    resourceType: 'ad_campaign',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminAdCampaigns
)

/**
 * @route   GET /api/admin/ads/campaigns/:campaignId
 * @desc    Ler detalhe de campanha de anuncios
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/ads/campaigns/:campaignId',
  authenticate,
  auditAdminAction({
    action: 'admin.ads.campaigns.read',
    resourceType: 'ad_campaign',
    scope: 'admin.content.read',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.content.read'),
  getAdminAdCampaign
)

/**
 * @route   GET /api/admin/ads/campaigns/:campaignId/metrics
 * @desc    Ler metricas agregadas da campanha (janela: ?days=1..90)
 * @access  Private (Admin com escopo admin.metrics.read)
 */
router.get(
  '/ads/campaigns/:campaignId/metrics',
  authenticate,
  rateLimiter.adminMetricsDrilldown,
  auditAdminAction({
    action: 'admin.ads.campaigns.metrics.read',
    resourceType: 'ad_campaign',
    scope: 'admin.metrics.read',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.metrics.read'),
  getAdminAdCampaignMetrics
)

/**
 * @route   POST /api/admin/ads/campaigns
 * @desc    Criar campanha de anuncios/partnership
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/ads/campaigns',
  authenticate,
  validateAdminAdCampaignCreateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.campaigns.create',
    resourceType: 'ad_campaign',
    scope: 'admin.content.moderate',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        code: typeof body.code === 'string' ? body.code : undefined,
        adType: typeof body.adType === 'string' ? body.adType : undefined,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  createAdminAdCampaign
)

/**
 * @route   PATCH /api/admin/ads/campaigns/:campaignId
 * @desc    Atualizar campanha de anuncios/partnership
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.patch(
  '/ads/campaigns/:campaignId',
  authenticate,
  validateAdminAdCampaignUpdateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.campaigns.update',
    resourceType: 'ad_campaign',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.content.moderate'),
  updateAdminAdCampaign
)

/**
 * @route   POST /api/admin/ads/campaigns/:campaignId/submit-approval
 * @desc    Submeter campanha para revisao/aprovacao
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/ads/campaigns/:campaignId/submit-approval',
  authenticate,
  validateAdminAdCampaignStatusContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.campaigns.submit_approval',
    resourceType: 'ad_campaign',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.content.moderate'),
  submitAdminAdCampaignForApproval
)

/**
 * @route   POST /api/admin/ads/campaigns/:campaignId/approve
 * @desc    Aprovar campanha apos revisao de compliance
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/ads/campaigns/:campaignId/approve',
  authenticate,
  validateAdminAdCampaignStatusContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.campaigns.approve',
    resourceType: 'ad_campaign',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.content.moderate'),
  approveAdminAdCampaign
)

/**
 * @route   POST /api/admin/ads/campaigns/:campaignId/reject
 * @desc    Rejeitar campanha em revisao
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/ads/campaigns/:campaignId/reject',
  authenticate,
  validateAdminAdCampaignStatusContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.campaigns.reject',
    resourceType: 'ad_campaign',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.content.moderate'),
  rejectAdminAdCampaign
)

/**
 * @route   POST /api/admin/ads/campaigns/:campaignId/activate
 * @desc    Ativar campanha de anuncios
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/ads/campaigns/:campaignId/activate',
  authenticate,
  validateAdminAdCampaignStatusContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.campaigns.activate',
    resourceType: 'ad_campaign',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.content.moderate'),
  activateAdminAdCampaign
)

/**
 * @route   POST /api/admin/ads/campaigns/:campaignId/pause
 * @desc    Pausar campanha de anuncios
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/ads/campaigns/:campaignId/pause',
  authenticate,
  validateAdminAdCampaignStatusContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.ads.campaigns.pause',
    resourceType: 'ad_campaign',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.campaignId,
  }),
  requireAdminScope('admin.content.moderate'),
  pauseAdminAdCampaign
)

/**
 * @route   GET /api/admin/content/moderation-templates
 * @desc    Listar templates de moderacao operacionais
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/moderation-templates',
  authenticate,
  auditAdminAction({
    action: 'admin.content.moderation_templates.list',
    resourceType: 'moderation_template',
    scope: 'admin.content.read',
  }),
  requireAdminScope('admin.content.read'),
  listAdminModerationTemplates
)

/**
 * @route   GET /api/admin/content/moderation-templates/:templateId
 * @desc    Ler detalhe de um template de moderacao
 * @access  Private (Admin com escopo admin.content.read)
 */
router.get(
  '/content/moderation-templates/:templateId',
  authenticate,
  auditAdminAction({
    action: 'admin.content.moderation_templates.read',
    resourceType: 'moderation_template',
    scope: 'admin.content.read',
    getResourceId: (req) => req.params.templateId,
  }),
  requireAdminScope('admin.content.read'),
  getAdminModerationTemplate
)

/**
 * @route   POST /api/admin/content/moderation-templates
 * @desc    Criar template de moderacao
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/moderation-templates',
  authenticate,
  validateAdminModerationTemplateCreateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.moderation_templates.create',
    resourceType: 'moderation_template',
    scope: 'admin.content.moderate',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        code: typeof body.code === 'string' ? body.code : undefined,
        requiresNote: typeof body.requiresNote === 'boolean' ? body.requiresNote : undefined,
        requiresDoubleConfirm:
          typeof body.requiresDoubleConfirm === 'boolean' ? body.requiresDoubleConfirm : undefined,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  createAdminModerationTemplate
)

/**
 * @route   PATCH /api/admin/content/moderation-templates/:templateId
 * @desc    Atualizar template de moderacao
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.patch(
  '/content/moderation-templates/:templateId',
  authenticate,
  validateAdminModerationTemplateUpdateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.moderation_templates.update',
    resourceType: 'moderation_template',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.templateId,
  }),
  requireAdminScope('admin.content.moderate'),
  updateAdminModerationTemplate
)

/**
 * @route   POST /api/admin/content/moderation-templates/:templateId/activate
 * @desc    Ativar template de moderacao
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/moderation-templates/:templateId/activate',
  authenticate,
  validateAdminModerationTemplateSetActiveContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.moderation_templates.activate',
    resourceType: 'moderation_template',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.templateId,
  }),
  requireAdminScope('admin.content.moderate'),
  activateAdminModerationTemplate
)

/**
 * @route   POST /api/admin/content/moderation-templates/:templateId/deactivate
 * @desc    Desativar template de moderacao
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/moderation-templates/:templateId/deactivate',
  authenticate,
  validateAdminModerationTemplateSetActiveContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.moderation_templates.deactivate',
    resourceType: 'moderation_template',
    scope: 'admin.content.moderate',
    getResourceId: (req) => req.params.templateId,
  }),
  requireAdminScope('admin.content.moderate'),
  deactivateAdminModerationTemplate
)

/**
 * @route   POST /api/admin/content/bulk-moderate
 * @desc    Executar moderacao em lote com guardrails
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/bulk-moderate',
  authenticate,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.content.bulk_moderate',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: () => 'bulk',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      const action = typeof body.action === 'string' ? body.action : null
      const bulkItemCount = Array.isArray(body.items) ? body.items.length : 0
      return {
        bulkAction: action,
        bulkItemCount,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  bulkModerateContent
)

/**
 * @route   POST /api/admin/content/bulk-rollback
 * @desc    Executar rollback em lote com guardrails
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/bulk-rollback',
  authenticate,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.content.bulk_rollback',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: () => 'bulk',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      const bulkItemCount = Array.isArray(body.items) ? body.items.length : 0
      return {
        bulkItemCount,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  bulkRollbackContent
)

/**
 * @route   POST /api/admin/content/bulk-moderate/jobs
 * @desc    Criar job assíncrono para moderacao em lote
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/bulk-moderate/jobs',
  authenticate,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.content.bulk_moderate_job.create',
    resourceType: 'content_job',
    scope: 'admin.content.moderate',
    getResourceId: () => 'bulk_moderate',
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        bulkAction: typeof body.action === 'string' ? body.action : undefined,
        bulkItemCount: Array.isArray(body.items) ? body.items.length : 0,
        scheduledFor: typeof body.scheduledFor === 'string' ? body.scheduledFor : undefined,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  createBulkModerationJob
)

/**
 * @route   POST /api/admin/content/bulk-rollback/jobs
 * @desc    Criar job assíncrono para rollback em lote
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/bulk-rollback/jobs',
  authenticate,
  rateLimiter.adminModerationBulk,
  auditAdminAction({
    action: 'admin.content.bulk_rollback_job.create',
    resourceType: 'content_job',
    scope: 'admin.content.moderate',
    getResourceId: () => 'bulk_rollback',
  }),
  requireAdminScope('admin.content.moderate'),
  createBulkRollbackJob
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/hide-fast
 * @desc    Ocultar conteudo com trilho rapido operacional
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/hide-fast',
  authenticate,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.hide_fast',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  hideContentFast
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/hide
 * @desc    Ocultar conteudo da superficie publica
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/hide',
  authenticate,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.hide',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  hideContent
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/unhide
 * @desc    Reativar conteudo para visibilidade publica
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/unhide',
  authenticate,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.unhide',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  unhideContent
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/unhide/schedule
 * @desc    Agendar reativacao automatica de conteudo (unhide)
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/unhide/schedule',
  authenticate,
  validateAdminContentScheduleUnhideContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.unhide.schedule',
    resourceType: 'content_job',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
    getMetadata: (req) => {
      const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {}
      return {
        scheduledFor: typeof body.scheduledFor === 'string' ? body.scheduledFor : undefined,
      }
    },
  }),
  requireAdminScope('admin.content.moderate'),
  scheduleContentUnhide
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/restrict
 * @desc    Restringir conteudo por acao administrativa
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/restrict',
  authenticate,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.restrict',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  restrictContent
)

/**
 * @route   POST /api/admin/content/:contentType/:contentId/rollback
 * @desc    Executar rollback assistido do ultimo estado de moderacao
 * @access  Private (Admin com escopo admin.content.moderate)
 */
router.post(
  '/content/:contentType/:contentId/rollback',
  authenticate,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.content.rollback',
    resourceType: 'content',
    scope: 'admin.content.moderate',
    getResourceId: (req) => `${req.params.contentType}:${req.params.contentId}`,
  }),
  requireAdminScope('admin.content.moderate'),
  rollbackContent
)

/**
 * @route   GET /api/admin/editorial/sections
 * @desc    Listar secoes editoriais admin
 * @access  Private (Admin com escopo admin.home.curate)
 */
router.get(
  '/editorial/sections',
  authenticate,
  auditAdminAction({
    action: 'admin.editorial.sections.list',
    resourceType: 'editorial_section',
    scope: 'admin.home.curate',
  }),
  requireAdminScope('admin.home.curate'),
  listEditorialSections
)

/**
 * @route   POST /api/admin/editorial/sections
 * @desc    Criar secao editorial admin
 * @access  Private (Admin com escopo admin.home.curate)
 */
router.post(
  '/editorial/sections',
  authenticate,
  auditAdminAction({
    action: 'admin.editorial.sections.create',
    resourceType: 'editorial_section',
    scope: 'admin.home.curate',
  }),
  requireAdminScope('admin.home.curate'),
  createEditorialSection
)

/**
 * @route   PATCH /api/admin/editorial/sections/:sectionId
 * @desc    Atualizar secao editorial admin
 * @access  Private (Admin com escopo admin.home.curate)
 */
router.patch(
  '/editorial/sections/:sectionId',
  authenticate,
  auditAdminAction({
    action: 'admin.editorial.sections.update',
    resourceType: 'editorial_section',
    scope: 'admin.home.curate',
    getResourceId: (req) => req.params.sectionId,
  }),
  requireAdminScope('admin.home.curate'),
  updateEditorialSection
)

/**
 * @route   POST /api/admin/editorial/sections/:sectionId/items
 * @desc    Adicionar item a secao editorial
 * @access  Private (Admin com escopo admin.home.curate)
 */
router.post(
  '/editorial/sections/:sectionId/items',
  authenticate,
  auditAdminAction({
    action: 'admin.editorial.section_items.add',
    resourceType: 'editorial_section_item',
    scope: 'admin.home.curate',
    getResourceId: (req) => req.params.sectionId,
  }),
  requireAdminScope('admin.home.curate'),
  addEditorialSectionItem
)

/**
 * @route   PATCH /api/admin/editorial/sections/:sectionId/items/reorder
 * @desc    Reordenar itens de secao editorial
 * @access  Private (Admin com escopo admin.home.curate)
 */
router.patch(
  '/editorial/sections/:sectionId/items/reorder',
  authenticate,
  auditAdminAction({
    action: 'admin.editorial.section_items.reorder',
    resourceType: 'editorial_section_item',
    scope: 'admin.home.curate',
    getResourceId: (req) => req.params.sectionId,
  }),
  requireAdminScope('admin.home.curate'),
  reorderEditorialSectionItems
)

/**
 * @route   DELETE /api/admin/editorial/sections/:sectionId/items/:itemId
 * @desc    Remover item de secao editorial
 * @access  Private (Admin com escopo admin.home.curate)
 */
router.delete(
  '/editorial/sections/:sectionId/items/:itemId',
  authenticate,
  auditAdminAction({
    action: 'admin.editorial.section_items.remove',
    resourceType: 'editorial_section_item',
    scope: 'admin.home.curate',
    getResourceId: (req) => req.params.itemId,
  }),
  requireAdminScope('admin.home.curate'),
  removeEditorialSectionItem
)

/**
 * @route   GET /api/admin/directories/:vertical
 * @desc    Listar entradas de diretorio por vertical
 * @access  Private (Admin com escopo admin.directory.manage)
 */
router.get(
  '/directories/:vertical',
  authenticate,
  auditAdminAction({
    action: 'admin.directories.list',
    resourceType: 'directory_entry',
    scope: 'admin.directory.manage',
    getResourceId: (req) => req.params.vertical,
  }),
  requireAdminScope('admin.directory.manage'),
  listAdminDirectories
)

/**
 * @route   POST /api/admin/directories/:vertical
 * @desc    Criar entrada de diretorio
 * @access  Private (Admin com escopo admin.directory.manage)
 */
router.post(
  '/directories/:vertical',
  authenticate,
  auditAdminAction({
    action: 'admin.directories.create',
    resourceType: 'directory_entry',
    scope: 'admin.directory.manage',
    getResourceId: (req) => req.params.vertical,
  }),
  requireAdminScope('admin.directory.manage'),
  createAdminDirectory
)

/**
 * @route   PATCH /api/admin/directories/:vertical/:entryId
 * @desc    Atualizar entrada de diretorio
 * @access  Private (Admin com escopo admin.directory.manage)
 */
router.patch(
  '/directories/:vertical/:entryId',
  authenticate,
  auditAdminAction({
    action: 'admin.directories.update',
    resourceType: 'directory_entry',
    scope: 'admin.directory.manage',
    getResourceId: (req) => req.params.entryId,
  }),
  requireAdminScope('admin.directory.manage'),
  updateAdminDirectory
)

/**
 * @route   POST /api/admin/directories/:vertical/:entryId/publish
 * @desc    Publicar entrada de diretorio
 * @access  Private (Admin com escopo admin.directory.manage)
 */
router.post(
  '/directories/:vertical/:entryId/publish',
  authenticate,
  auditAdminAction({
    action: 'admin.directories.publish',
    resourceType: 'directory_entry',
    scope: 'admin.directory.manage',
    getResourceId: (req) => req.params.entryId,
  }),
  requireAdminScope('admin.directory.manage'),
  publishAdminDirectory
)

/**
 * @route   POST /api/admin/directories/:vertical/:entryId/archive
 * @desc    Arquivar entrada de diretorio
 * @access  Private (Admin com escopo admin.directory.manage)
 */
router.post(
  '/directories/:vertical/:entryId/archive',
  authenticate,
  auditAdminAction({
    action: 'admin.directories.archive',
    resourceType: 'directory_entry',
    scope: 'admin.directory.manage',
    getResourceId: (req) => req.params.entryId,
  }),
  requireAdminScope('admin.directory.manage'),
  archiveAdminDirectory
)

/**
 * @route   GET /api/admin/claims
 * @desc    Listar pedidos de claim
 * @access  Private (Admin com escopo admin.claim.review)
 */
router.get(
  '/claims',
  authenticate,
  auditAdminAction({
    action: 'admin.claims.list',
    resourceType: 'claim_request',
    scope: 'admin.claim.review',
  }),
  requireAdminScope('admin.claim.review'),
  listAdminClaims
)

/**
 * @route   POST /api/admin/claims/:claimId/approve
 * @desc    Aprovar claim e transferir ownership
 * @access  Private (Admin com escopo admin.claim.review)
 */
router.post(
  '/claims/:claimId/approve',
  authenticate,
  auditAdminAction({
    action: 'admin.claims.approve',
    resourceType: 'claim_request',
    scope: 'admin.claim.review',
    getResourceId: (req) => req.params.claimId,
  }),
  requireAdminScope('admin.claim.review'),
  approveAdminClaim
)

/**
 * @route   POST /api/admin/claims/:claimId/reject
 * @desc    Rejeitar claim
 * @access  Private (Admin com escopo admin.claim.review)
 */
router.post(
  '/claims/:claimId/reject',
  authenticate,
  auditAdminAction({
    action: 'admin.claims.reject',
    resourceType: 'claim_request',
    scope: 'admin.claim.review',
    getResourceId: (req) => req.params.claimId,
  }),
  requireAdminScope('admin.claim.review'),
  rejectAdminClaim
)

/**
 * @route   GET /api/admin/ownership/transfers
 * @desc    Listar historico de transferencias de ownership
 * @access  Private (Admin com escopo admin.claim.transfer)
 */
router.get(
  '/ownership/transfers',
  authenticate,
  auditAdminAction({
    action: 'admin.ownership.transfers.list',
    resourceType: 'ownership_transfer',
    scope: 'admin.claim.transfer',
  }),
  requireAdminScope('admin.claim.transfer'),
  listAdminOwnershipTransfers
)

/**
 * @route   POST /api/admin/ownership/transfer
 * @desc    Transferir ownership manualmente
 * @access  Private (Admin com escopo admin.claim.transfer)
 */
router.post(
  '/ownership/transfer',
  authenticate,
  auditAdminAction({
    action: 'admin.ownership.transfer',
    resourceType: 'ownership_transfer',
    scope: 'admin.claim.transfer',
  }),
  requireAdminScope('admin.claim.transfer'),
  transferAdminOwnership
)

/**
 * @route   GET /api/admin/users
 * @desc    Listar/pesquisar utilizadores para operacao admin
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/users',
  authenticate,
  auditAdminAction({
    action: 'admin.users.list',
    resourceType: 'user',
    scope: 'admin.users.read',
  }),
  requireAdminScope('admin.users.read'),
  listAdminUsers
)

/**
 * @route   GET /api/admin/users/:userId/trust-profile
 * @desc    Ler trust/risk profile consolidado de um creator
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/users/:userId/trust-profile',
  authenticate,
  auditAdminAction({
    action: 'admin.users.trust_profile.read',
    resourceType: 'user',
    scope: 'admin.users.read',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.read'),
  getAdminUserTrustProfile
)

/**
 * @route   GET /api/admin/users/:userId/history
 * @desc    Listar historico de sancoes e anotacoes de um utilizador
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/users/:userId/history',
  authenticate,
  auditAdminAction({
    action: 'admin.users.history.list',
    resourceType: 'user_moderation_event',
    scope: 'admin.users.read',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.read'),
  listUserModerationHistory
)

/**
 * @route   POST /api/admin/users/:userId/admin-permissions
 * @desc    Atualizar permissoes administrativas (scopes/read-only) de um admin
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/admin-permissions',
  authenticate,
  auditAdminAction({
    action: 'admin.users.permissions.update',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
    getMetadata: (_req, res) => {
      const metadata = (res.locals as Record<string, unknown>).adminPermissionsChange
      if (!metadata || typeof metadata !== 'object') return undefined
      return metadata as Record<string, unknown>
    },
  }),
  requireAdminScope('admin.users.write'),
  updateAdminUserPermissions
)

/**
 * @route   GET /api/admin/users/:userId/scope-delegations
 * @desc    Listar delegacoes temporarias de scopes admin para um utilizador
 * @access  Private (Admin com escopo admin.users.read)
 */
router.get(
  '/users/:userId/scope-delegations',
  authenticate,
  auditAdminAction({
    action: 'admin.users.scope_delegations.list',
    resourceType: 'admin_scope_delegation',
    scope: 'admin.users.read',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.read'),
  listAdminScopeDelegations
)

/**
 * @route   POST /api/admin/users/:userId/scope-delegations
 * @desc    Delegar scopes admin temporarios com expiracao automatica
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/scope-delegations',
  authenticate,
  validateAdminScopeDelegationCreateContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.users.scope_delegations.create',
    resourceType: 'admin_scope_delegation',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
    getMetadata: (_req, res) => {
      const metadata = (res.locals as Record<string, unknown>).adminScopeDelegationChange
      if (!metadata || typeof metadata !== 'object') return undefined
      return metadata as Record<string, unknown>
    },
  }),
  requireAdminScope('admin.users.write'),
  createAdminScopeDelegations
)

/**
 * @route   POST /api/admin/users/:userId/scope-delegations/:delegationId/revoke
 * @desc    Revogar delegacao temporaria de scope admin
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/scope-delegations/:delegationId/revoke',
  authenticate,
  validateAdminScopeDelegationRevokeContract,
  rateLimiter.adminModerationAction,
  auditAdminAction({
    action: 'admin.users.scope_delegations.revoke',
    resourceType: 'admin_scope_delegation',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.delegationId,
    getMetadata: (_req, res) => {
      const metadata = (res.locals as Record<string, unknown>).adminScopeDelegationChange
      if (!metadata || typeof metadata !== 'object') return undefined
      return metadata as Record<string, unknown>
    },
  }),
  requireAdminScope('admin.users.write'),
  revokeAdminScopeDelegation
)

/**
 * @route   POST /api/admin/users/:userId/notes
 * @desc    Adicionar nota interna ao historico do utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/notes',
  authenticate,
  auditAdminAction({
    action: 'admin.users.note.add',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  addUserInternalNote
)

/**
 * @route   POST /api/admin/users/:userId/creator-controls
 * @desc    Aplicar controlos operacionais a um creator
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/creator-controls',
  authenticate,
  auditAdminAction({
    action: 'admin.users.creator_controls.apply',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  applyCreatorControls
)

/**
 * @route   POST /api/admin/users/:userId/suspend
 * @desc    Suspender utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/suspend',
  authenticate,
  auditAdminAction({
    action: 'admin.users.suspend',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  suspendUser
)

/**
 * @route   POST /api/admin/users/:userId/ban
 * @desc    Banir utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/ban',
  authenticate,
  auditAdminAction({
    action: 'admin.users.ban',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  banUser
)

/**
 * @route   POST /api/admin/users/:userId/unban
 * @desc    Reativar utilizador banido/suspenso
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/unban',
  authenticate,
  auditAdminAction({
    action: 'admin.users.unban',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  unbanUser
)

/**
 * @route   POST /api/admin/users/:userId/force-logout
 * @desc    Revogar todas as sessoes do utilizador
 * @access  Private (Admin com escopo admin.users.write)
 */
router.post(
  '/users/:userId/force-logout',
  authenticate,
  auditAdminAction({
    action: 'admin.users.force_logout',
    resourceType: 'user',
    scope: 'admin.users.write',
    getResourceId: (req) => req.params.userId,
  }),
  requireAdminScope('admin.users.write'),
  forceLogoutUser
)

export default router
