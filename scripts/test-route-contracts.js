const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const REPO_ROOT = path.resolve(__dirname, '..')

const ROUTE_CONTRACTS = [
  {
    filePath: 'src/routes/auth.routes.ts',
    method: 'post',
    routePath: '/register',
    requiredMiddleware: 'validateAuthRegisterContract',
  },
  {
    filePath: 'src/routes/auth.routes.ts',
    method: 'post',
    routePath: '/login',
    requiredMiddleware: 'validateAuthLoginContract',
  },
  {
    filePath: 'src/routes/auth.routes.ts',
    method: 'post',
    routePath: '/forgot-password',
    requiredMiddleware: 'validateAuthForgotPasswordContract',
  },
  {
    filePath: 'src/routes/auth.routes.ts',
    method: 'post',
    routePath: '/reset-password',
    requiredMiddleware: 'validateAuthResetPasswordContract',
  },
  {
    filePath: 'src/routes/auth.routes.ts',
    method: 'post',
    routePath: '/refresh',
    requiredMiddleware: 'validateAuthRefreshContract',
  },
  {
    filePath: 'src/routes/auth.routes.ts',
    method: 'get',
    routePath: '/verify-email',
    requiredMiddleware: 'validateAuthVerifyEmailQueryContract',
  },
  {
    filePath: 'src/routes/auth.routes.ts',
    method: 'patch',
    routePath: '/cookie-consent',
    requiredMiddleware: 'validateAuthCookieConsentContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/platform/surfaces/:surfaceKey',
    requiredMiddleware: 'validateAdminSurfaceControlContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/support/sessions/request',
    requiredMiddleware: 'validateAdminAssistedSessionRequestContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/access-policies/preview',
    requiredMiddleware: 'validateAdminContentAccessPolicyPreviewContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/access-policies',
    requiredMiddleware: 'validateAdminContentAccessPolicyCreateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'patch',
    routePath: '/content/access-policies/:policyId',
    requiredMiddleware: 'validateAdminContentAccessPolicyUpdateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/access-policies/:policyId/activate',
    requiredMiddleware: 'validateAdminContentAccessPolicySetActiveContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/access-policies/:policyId/deactivate',
    requiredMiddleware: 'validateAdminContentAccessPolicySetActiveContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'patch',
    routePath: '/content/appeals/:appealId/status',
    requiredMiddleware: 'validateAdminModerationAppealStatusContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/monetization/subscriptions/users/:userId/extend-trial',
    requiredMiddleware: 'validateAdminSubscriptionExtendTrialContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/monetization/subscriptions/users/:userId/revoke-entitlement',
    requiredMiddleware: 'validateAdminSubscriptionRevokeEntitlementContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/monetization/subscriptions/users/:userId/reactivate',
    requiredMiddleware: 'validateAdminSubscriptionReactivateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/moderation-templates',
    requiredMiddleware: 'validateAdminModerationTemplateCreateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'patch',
    routePath: '/content/moderation-templates/:templateId',
    requiredMiddleware: 'validateAdminModerationTemplateUpdateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/moderation-templates/:templateId/activate',
    requiredMiddleware: 'validateAdminModerationTemplateSetActiveContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/moderation-templates/:templateId/deactivate',
    requiredMiddleware: 'validateAdminModerationTemplateSetActiveContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/communications/broadcasts/preview',
    requiredMiddleware: 'validateAdminBroadcastPreviewContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/communications/broadcasts',
    requiredMiddleware: 'validateAdminBroadcastCreateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/communications/broadcasts/:broadcastId/approve',
    requiredMiddleware: 'validateAdminBroadcastApproveContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/communications/broadcasts/:broadcastId/send',
    requiredMiddleware: 'validateAdminBroadcastSendContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/ads/slots',
    requiredMiddleware: 'validateAdminAdSlotCreateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'patch',
    routePath: '/ads/slots/:slotId',
    requiredMiddleware: 'validateAdminAdSlotUpdateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/ads/campaigns',
    requiredMiddleware: 'validateAdminAdCampaignCreateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'patch',
    routePath: '/ads/campaigns/:campaignId',
    requiredMiddleware: 'validateAdminAdCampaignUpdateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/ads/campaigns/:campaignId/submit-approval',
    requiredMiddleware: 'validateAdminAdCampaignStatusContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/ads/campaigns/:campaignId/approve',
    requiredMiddleware: 'validateAdminAdCampaignStatusContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/ads/campaigns/:campaignId/reject',
    requiredMiddleware: 'validateAdminAdCampaignStatusContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/ads/campaigns/:campaignId/activate',
    requiredMiddleware: 'validateAdminAdCampaignStatusContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/ads/campaigns/:campaignId/pause',
    requiredMiddleware: 'validateAdminAdCampaignStatusContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'patch',
    routePath: '/tools/financial/:toolKey',
    requiredMiddleware: 'validateAdminFinancialToolUpdateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'patch',
    routePath: '/dashboard/personalization',
    requiredMiddleware: 'validateAdminDashboardPersonalizationPatchContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/dashboard/personalization/reset',
    requiredMiddleware: 'validateAdminDashboardPersonalizationResetContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/operations/bulk-import/preview',
    requiredMiddleware: 'validateAdminBulkImportPreviewContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/operations/bulk-import/jobs',
    requiredMiddleware: 'validateAdminBulkImportCreateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/content/:contentType/:contentId/unhide/schedule',
    requiredMiddleware: 'validateAdminContentScheduleUnhideContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/support/sessions/:sessionId/start',
    requiredMiddleware: 'validateAdminSessionIdParamContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/support/sessions/:sessionId/revoke',
    requiredMiddleware: 'validateAdminSessionRevokeContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'get',
    routePath: '/support/sessions/:sessionId/history',
    requiredMiddleware: 'validateAdminSessionIdParamContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/users/:userId/scope-delegations',
    requiredMiddleware: 'validateAdminScopeDelegationCreateContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/users/:userId/scope-delegations/:delegationId/revoke',
    requiredMiddleware: 'validateAdminScopeDelegationRevokeContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'get',
    routePath: '/integrations/api-keys',
    requiredMiddleware: 'validateBrandPortalIntegrationApiKeyListContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'post',
    routePath: '/integrations/api-keys',
    requiredMiddleware: 'validateBrandPortalIntegrationApiKeyCreateContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'post',
    routePath: '/integrations/api-keys/:keyId/revoke',
    requiredMiddleware: 'validateBrandPortalIntegrationApiKeyRevokeContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'get',
    routePath: '/integrations/api-keys/:keyId/usage',
    requiredMiddleware: 'validateBrandPortalIntegrationApiKeyUsageContract',
  },
  {
    filePath: 'src/routes/brandIntegration.routes.ts',
    method: 'get',
    routePath: '/affiliate/overview',
    requiredMiddleware: 'validateBrandIntegrationAffiliateOverviewQueryContract',
  },
  {
    filePath: 'src/routes/brandIntegration.routes.ts',
    method: 'get',
    routePath: '/affiliate/links',
    requiredMiddleware: 'validateBrandIntegrationAffiliateLinksQueryContract',
  },
  {
    filePath: 'src/routes/brandIntegration.routes.ts',
    method: 'get',
    routePath: '/affiliate/links/:linkId/clicks',
    requiredMiddleware: 'validateBrandIntegrationAffiliateLinkClicksQueryContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'get',
    routePath: '/affiliate-links',
    requiredMiddleware: 'validateBrandPortalAffiliateLinkListContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'post',
    routePath: '/affiliate-links',
    requiredMiddleware: 'validateBrandPortalAffiliateLinkCreateContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'patch',
    routePath: '/affiliate-links/:linkId',
    requiredMiddleware: 'validateBrandPortalAffiliateLinkUpdateContract',
  },
  {
    filePath: 'src/routes/brandPortal.routes.ts',
    method: 'get',
    routePath: '/affiliate-links/:linkId/clicks',
    requiredMiddleware: 'validateBrandPortalAffiliateLinkClicksContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'get',
    routePath: '/monetization/affiliates/overview',
    requiredMiddleware: 'validateAdminAffiliateOverviewContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'get',
    routePath: '/monetization/affiliates/links',
    requiredMiddleware: 'validateAdminAffiliateLinksContract',
  },
  {
    filePath: 'src/routes/admin.routes.ts',
    method: 'post',
    routePath: '/monetization/affiliates/clicks/:clickId/convert',
    requiredMiddleware: 'validateAdminAffiliateConvertContract',
  },
  {
    filePath: 'src/routes/affiliate.routes.ts',
    method: 'get',
    routePath: '/r/:code',
    requiredMiddleware: 'validateAffiliateRedirectContract',
  },
  {
    filePath: 'src/routes/affiliate.routes.ts',
    method: 'post',
    routePath: '/postback/conversion',
    requiredMiddleware: 'validateAffiliatePostbackConversionContract',
  },
]

const fail = (errors) => {
  const lines = Array.isArray(errors) ? errors : [errors]
  console.error('[route-contracts] FAIL')
  for (const line of lines) {
    console.error(`- ${line}`)
  }
  process.exit(1)
}

const readSourceFile = (repoRelativePath) => {
  const absolutePath = path.join(REPO_ROOT, repoRelativePath)
  const sourceText = fs.readFileSync(absolutePath, 'utf8')
  return ts.createSourceFile(absolutePath, sourceText, ts.ScriptTarget.Latest, true)
}

const parseRouteMiddlewares = (sourceFile) => {
  const results = []

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'router'
    ) {
      const method = node.expression.name.text.toLowerCase()
      const [firstArgument, ...handlerArguments] = node.arguments

      if (firstArgument && ts.isStringLiteral(firstArgument)) {
        const middlewareNames = []
        for (const arg of handlerArguments) {
          if (ts.isIdentifier(arg)) {
            middlewareNames.push(arg.text)
            continue
          }

          if (ts.isCallExpression(arg) && ts.isIdentifier(arg.expression)) {
            middlewareNames.push(arg.expression.text)
          }
        }

        results.push({
          method,
          routePath: firstArgument.text,
          middlewareNames,
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return results
}

const run = () => {
  const groupedContracts = new Map()
  for (const contract of ROUTE_CONTRACTS) {
    const list = groupedContracts.get(contract.filePath) || []
    list.push(contract)
    groupedContracts.set(contract.filePath, list)
  }

  const errors = []
  let validated = 0

  for (const [filePath, fileContracts] of groupedContracts.entries()) {
    const sourceFile = readSourceFile(filePath)
    const routes = parseRouteMiddlewares(sourceFile)

    for (const contract of fileContracts) {
      const targetRoute = routes.find(
        (route) => route.method === contract.method && route.routePath === contract.routePath
      )

      if (!targetRoute) {
        errors.push(
          `Rota nao encontrada em ${contract.filePath}: ${contract.method.toUpperCase()} ${contract.routePath}`
        )
        continue
      }

      if (!targetRoute.middlewareNames.includes(contract.requiredMiddleware)) {
        errors.push(
          `Middleware em falta em ${contract.filePath}: ${contract.method.toUpperCase()} ${contract.routePath} -> ${contract.requiredMiddleware}`
        )
        continue
      }

      validated += 1
    }
  }

  if (errors.length > 0) {
    fail(errors)
  }

  console.log(`[route-contracts] OK: ${validated} contratos de rota validados.`)
}

run()
