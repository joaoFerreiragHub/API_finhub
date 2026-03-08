import fs from 'fs'
import path from 'path'
import assert from 'assert'
import ts from 'typescript'
import { ADMIN_SCOPES, AdminScope, canAdminUseScope, isAdminWriteScope } from '../src/admin/permissions'
import { requireAdminScope } from '../src/middlewares/roleGuard'

type RouteMethod = 'get' | 'post' | 'patch' | 'delete' | 'put'

interface RouteScopeContract {
  method: RouteMethod
  routePath: string
  scope: AdminScope | null
}

interface MockResponse {
  statusCode: number | null
  payload: unknown
  status: (statusCode: number) => MockResponse
  json: (payload: unknown) => MockResponse
}

const adminRoutesFilePath = path.resolve(__dirname, '../src/routes/admin.routes.ts')
const source = fs.readFileSync(adminRoutesFilePath, 'utf8')
const sourceFile = ts.createSourceFile(
  adminRoutesFilePath,
  source,
  ts.ScriptTarget.ESNext,
  true
)

const routeMethods = new Set<RouteMethod>(['get', 'post', 'patch', 'delete', 'put'])

const findRequireAdminScopeCall = (
  node: ts.CallExpression
): ts.CallExpression | undefined => {
  for (const arg of node.arguments) {
    if (!ts.isCallExpression(arg)) {
      continue
    }

    if (ts.isIdentifier(arg.expression) && arg.expression.text === 'requireAdminScope') {
      return arg
    }
  }

  return undefined
}

const parseRouteContracts = (): RouteScopeContract[] => {
  const contracts: RouteScopeContract[] = []

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const maybeRouter = node.expression.expression
      const maybeMethod = node.expression.name

      if (
        ts.isIdentifier(maybeRouter) &&
        maybeRouter.text === 'router' &&
        routeMethods.has(maybeMethod.text as RouteMethod)
      ) {
        const [pathArg] = node.arguments
        if (pathArg && ts.isStringLiteral(pathArg)) {
          const requireScopeCall = findRequireAdminScopeCall(node)
          const scopeArg = requireScopeCall?.arguments[0]
          const scope =
            scopeArg && ts.isStringLiteral(scopeArg)
              ? (scopeArg.text as AdminScope)
              : null

          contracts.push({
            method: maybeMethod.text as RouteMethod,
            routePath: pathArg.text,
            scope,
          })
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return contracts
}

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: null,
    payload: null,
    status(statusCode: number): MockResponse {
      response.statusCode = statusCode
      return response
    },
    json(payload: unknown): MockResponse {
      response.payload = payload
      return response
    },
  }

  return response
}

const run = async () => {
  const contracts = parseRouteContracts()
  assert(contracts.length > 0, 'Nenhuma rota admin foi encontrada para validacao.')

  const routesWithoutScope = contracts.filter((contract) => contract.scope === null)
  assert.strictEqual(
    routesWithoutScope.length,
    0,
    `Rotas admin sem requireAdminScope: ${routesWithoutScope
      .map((route) => `${route.method.toUpperCase()} ${route.routePath}`)
      .join(', ')}`
  )

  const invalidScopeContracts = contracts.filter(
    (contract) => contract.scope && !ADMIN_SCOPES.includes(contract.scope)
  )
  assert.strictEqual(
    invalidScopeContracts.length,
    0,
    `Rotas admin com escopo invalido: ${invalidScopeContracts
      .map((route) => `${route.method.toUpperCase()} ${route.routePath} -> ${route.scope}`)
      .join(', ')}`
  )

  const uniqueScopes = Array.from(
    new Set(
      contracts
        .map((contract) => contract.scope)
        .filter((scope): scope is AdminScope => scope !== null)
    )
  )
  assert(uniqueScopes.length > 0, 'Nao foi encontrado nenhum escopo admin nas rotas.')

  const fallbackScope = uniqueScopes[0]

  for (const scope of uniqueScopes) {
    const unrelatedScope = uniqueScopes.find((candidate) => candidate !== scope) ?? fallbackScope

    const allowedCheck = canAdminUseScope(
      {
        role: 'admin',
        adminScopes: [scope],
        adminReadOnly: false,
      } as any,
      scope
    )
    assert.strictEqual(
      allowedCheck.allowed,
      true,
      `Esperava permitir escopo ${scope} com admin configurado para esse escopo.`
    )

    const deniedCheck = canAdminUseScope(
      {
        role: 'admin',
        adminScopes: [unrelatedScope],
        adminReadOnly: false,
      } as any,
      scope
    )
    assert.strictEqual(
      deniedCheck.allowed,
      false,
      `Esperava negar escopo ${scope} para admin sem esse escopo.`
    )

    const deniedNonAdmin = canAdminUseScope(
      {
        role: 'creator',
        adminScopes: [scope],
        adminReadOnly: false,
      } as any,
      scope
    )
    assert.strictEqual(
      deniedNonAdmin.allowed,
      false,
      `Esperava negar escopo ${scope} para role nao admin.`
    )

    const readOnlyCheck = canAdminUseScope(
      {
        role: 'admin',
        adminScopes: [scope],
        adminReadOnly: true,
      } as any,
      scope
    )
    assert.strictEqual(
      readOnlyCheck.allowed,
      !isAdminWriteScope(scope),
      `Modo read-only com comportamento inesperado para escopo ${scope}.`
    )

    const middleware = requireAdminScope(scope)

    {
      const req = { user: undefined } as any
      const res = createMockResponse() as any
      let nextCalled = false

      await Promise.resolve(
        middleware(req, res, () => {
          nextCalled = true
        })
      )

      assert.strictEqual(nextCalled, false, `Middleware deveria negar sem utilizador (${scope}).`)
      assert.strictEqual(res.statusCode, 401, `Middleware sem user deve responder 401 (${scope}).`)
    }

    {
      const req = {
        user: {
          role: 'admin',
          adminScopes: [unrelatedScope],
          adminReadOnly: false,
        },
      } as any
      const res = createMockResponse() as any
      let nextCalled = false

      await Promise.resolve(
        middleware(req, res, () => {
          nextCalled = true
        })
      )

      assert.strictEqual(nextCalled, false, `Middleware deveria negar sem escopo (${scope}).`)
      assert.strictEqual(res.statusCode, 403, `Middleware sem escopo deve responder 403 (${scope}).`)
      assert.deepStrictEqual(
        res.payload,
        {
          error: `Permissao admin em falta para o escopo '${scope}'.`,
          requiredScope: scope,
        },
        `Payload inesperado para negacao de escopo (${scope}).`
      )
    }

    {
      const req = {
        user: {
          role: 'admin',
          adminScopes: [scope],
          adminReadOnly: false,
        },
      } as any
      const res = createMockResponse() as any
      let nextCalled = false

      await Promise.resolve(
        middleware(req, res, () => {
          nextCalled = true
        })
      )

      assert.strictEqual(nextCalled, true, `Middleware deveria permitir com escopo valido (${scope}).`)
      assert.strictEqual(res.statusCode, null, `Middleware permitido nao deve setar status (${scope}).`)
    }
  }

  console.log(
    `OK: ${contracts.length} rotas admin com escopo e ${uniqueScopes.length} scopes validados (allow/deny).`
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
