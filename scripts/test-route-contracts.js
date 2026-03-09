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
