const fs = require('fs')
const path = require('path')

const openApiPath = path.join(process.cwd(), 'openapi', 'openapi.json')

const requiredPathMethods = [
  ['GET', '/healthz'],
  ['GET', '/readyz'],
  ['GET', '/metrics'],
  ['GET', '/api'],
  ['POST', '/api/follow/{userId}'],
  ['DELETE', '/api/follow/{userId}'],
  ['GET', '/api/follow/check/{userId}'],
  ['POST', '/api/favorites'],
  ['DELETE', '/api/favorites'],
  ['GET', '/api/favorites/check'],
  ['GET', '/api/notifications'],
  ['PATCH', '/api/notifications/read-all'],
  ['DELETE', '/api/notifications/read'],
  ['POST', '/api/ratings'],
  ['POST', '/api/ratings/{id}/reaction'],
  ['GET', '/api/ratings/{id}/reaction/my'],
  ['POST', '/api/comments'],
  ['GET', '/api/articles'],
  ['GET', '/api/courses'],
  ['GET', '/api/books']
]

const fail = (message) => {
  console.error(`[openapi] ${message}`)
  process.exit(1)
}

if (!fs.existsSync(openApiPath)) {
  fail(`Ficheiro nao encontrado: ${openApiPath}`)
}

let spec
try {
  const raw = fs.readFileSync(openApiPath, 'utf-8')
  spec = JSON.parse(raw)
} catch (error) {
  fail(`JSON invalido: ${error instanceof Error ? error.message : String(error)}`)
}

if (!spec || typeof spec !== 'object') {
  fail('Especificacao OpenAPI invalida: raiz nao e objeto')
}

if (typeof spec.openapi !== 'string' || !spec.openapi.startsWith('3.')) {
  fail('Campo "openapi" deve comecar por 3.x')
}

if (!spec.info || typeof spec.info !== 'object') {
  fail('Campo "info" obrigatorio')
}

if (typeof spec.info.title !== 'string' || spec.info.title.trim().length === 0) {
  fail('Campo "info.title" obrigatorio')
}

if (typeof spec.info.version !== 'string' || spec.info.version.trim().length === 0) {
  fail('Campo "info.version" obrigatorio')
}

if (!spec.paths || typeof spec.paths !== 'object') {
  fail('Campo "paths" obrigatorio')
}

for (const [method, endpoint] of requiredPathMethods) {
  const pathItem = spec.paths[endpoint]
  if (!pathItem || typeof pathItem !== 'object') {
    fail(`Path obrigatorio em falta: ${endpoint}`)
  }

  const operation = pathItem[method.toLowerCase()]
  if (!operation || typeof operation !== 'object') {
    fail(`Metodo obrigatorio em falta: ${method} ${endpoint}`)
  }

  if (!operation.responses || typeof operation.responses !== 'object') {
    fail(`Responses obrigatorias em falta em: ${method} ${endpoint}`)
  }
}

console.log(`[openapi] Validacao concluida com sucesso: ${requiredPathMethods.length} contratos verificados.`)
