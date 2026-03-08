const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')

const REQUIREMENTS = [
  {
    filePath: 'src/models/AdminAuditLog.ts',
    mustInclude: 'AdminAuditLogSchema.index({ actor: 1, createdAt: -1 })',
    label: 'admin_audit_by_actor_createdAt',
  },
  {
    filePath: 'src/models/ContentReport.ts',
    mustInclude: 'ContentReportSchema.index({ status: 1, createdAt: -1 })',
    label: 'content_report_by_status_createdAt',
  },
  {
    filePath: 'src/models/ContentReport.ts',
    mustInclude: 'ContentReportSchema.index({ contentType: 1, contentId: 1, status: 1, createdAt: -1 })',
    label: 'content_report_by_target_status_createdAt',
  },
  {
    filePath: 'src/models/ContentModerationEvent.ts',
    mustInclude: 'ContentModerationEventSchema.index({ contentType: 1, contentId: 1, createdAt: -1 })',
    label: 'moderation_event_by_target_createdAt',
  },
  {
    filePath: 'src/models/AdminContentJob.ts',
    mustInclude: 'AdminContentJobSchema.index({ status: 1, leaseExpiresAt: 1 })',
    label: 'admin_content_job_by_status_leaseExpiresAt',
  },
  {
    filePath: 'src/models/UserModerationEvent.ts',
    mustInclude: 'UserModerationEventSchema.index({ user: 1, createdAt: -1 })',
    label: 'user_moderation_event_by_user_createdAt',
  },
  {
    filePath: 'src/models/Notification.ts',
    mustInclude: 'NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })',
    label: 'notification_by_user_isRead_createdAt',
  },
]

const fail = (errors) => {
  const lines = Array.isArray(errors) ? errors : [errors]
  console.error('[perf-index-smoke] FAIL')
  for (const line of lines) {
    console.error(`- ${line}`)
  }
  process.exit(1)
}

const normalizeForMatch = (value) => String(value || '').replace(/\s+/g, '')

const run = () => {
  const errors = []
  let validated = 0

  for (const requirement of REQUIREMENTS) {
    const absolutePath = path.join(REPO_ROOT, requirement.filePath)
    if (!fs.existsSync(absolutePath)) {
      errors.push(`Ficheiro em falta: ${requirement.filePath}`)
      continue
    }

    const raw = fs.readFileSync(absolutePath, 'utf8')
    const normalizedRaw = normalizeForMatch(raw)
    const expected = normalizeForMatch(requirement.mustInclude)

    if (!normalizedRaw.includes(expected)) {
      errors.push(
        `Indice obrigatorio em falta (${requirement.label}) em ${requirement.filePath}`
      )
      continue
    }

    validated += 1
  }

  if (errors.length > 0) {
    fail(errors)
  }

  console.log(`[perf-index-smoke] OK: ${validated} indices criticos validados.`)
}

run()
