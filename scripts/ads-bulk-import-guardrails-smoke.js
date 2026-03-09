const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const REPO_ROOT = path.resolve(__dirname, '..')
const AD_PARTNERSHIP_SERVICE_PATH = path.join(
  REPO_ROOT,
  'src',
  'services',
  'adminAdPartnership.service.ts'
)
const BULK_IMPORT_SERVICE_PATH = path.join(REPO_ROOT, 'src', 'services', 'adminBulkImport.service.ts')

const REQUIRED_HELPER_EXPORTS = [
  'ensureDisclosureLabel',
  'ensureExternalAdsNoPremium',
  'ensureFinancialRelevance',
  'ensureSlotCompatibility',
  'resolveDisclosureLabel',
  'SlotCompatibilityInput',
]

const REQUIRED_HELPER_IMPORTS = [
  'ensureDisclosureLabel',
  'ensureExternalAdsNoPremium',
  'ensureFinancialRelevance',
  'ensureSlotCompatibility',
  'resolveDisclosureLabel',
]

const REQUIRED_METHOD_HELPER_CALLS = [
  'ensureDisclosureLabel',
  'ensureExternalAdsNoPremium',
  'ensureFinancialRelevance',
  'ensureSlotCompatibility',
  'resolveDisclosureLabel',
]

const REQUIRED_GUARDRAIL_CODES = [
  'campaign_not_started',
  'campaign_expired',
  'campaign_compliance_violation',
  'campaign_slot_not_found',
  'campaign_slot_incompatible',
]

const fail = (errors) => {
  const lines = Array.isArray(errors) ? errors : [errors]
  console.error('[ads-bulk-import-guardrails-smoke] FAIL')
  for (const line of lines) {
    console.error(`- ${line}`)
  }
  process.exit(1)
}

const readSourceFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    fail(`Ficheiro em falta: ${path.relative(REPO_ROOT, filePath)}`)
  }

  const sourceText = fs.readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  return { sourceText, sourceFile }
}

const hasExportModifier = (node) =>
  Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))

const collectExportedSymbols = (sourceFile) => {
  const exports = new Set()

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue

    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)
    ) {
      if (statement.name?.text) exports.add(statement.name.text)
      continue
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) exports.add(declaration.name.text)
      }
      continue
    }

    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        exports.add((element.name || element.propertyName).text)
      }
    }
  }

  return exports
}

const collectNamedImports = (sourceFile, moduleSuffix) => {
  const imports = new Set()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue

    const modulePath = statement.moduleSpecifier.text
    if (!modulePath.endsWith(moduleSuffix)) continue

    const namedBindings = statement.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue

    for (const element of namedBindings.elements) {
      imports.add(element.name.text)
    }
  }

  return imports
}

const findClassMethod = (sourceFile, className, methodName) => {
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || statement.name?.text !== className) continue

    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member) || !member.body) continue
      if (!ts.isIdentifier(member.name) || member.name.text !== methodName) continue
      return member
    }
  }

  return null
}

const collectCalledIdentifiers = (node) => {
  const identifiers = new Set()

  const visit = (current) => {
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
      identifiers.add(current.expression.text)
    }
    ts.forEachChild(current, visit)
  }

  visit(node)
  return identifiers
}

const collectStringLiterals = (node) => {
  const values = new Set()

  const visit = (current) => {
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
      values.add(current.text)
    }
    ts.forEachChild(current, visit)
  }

  visit(node)
  return values
}

const run = () => {
  const errors = []

  const adPartnershipService = readSourceFile(AD_PARTNERSHIP_SERVICE_PATH)
  const bulkImportService = readSourceFile(BULK_IMPORT_SERVICE_PATH)

  const exportedSymbols = collectExportedSymbols(adPartnershipService.sourceFile)
  for (const helper of REQUIRED_HELPER_EXPORTS) {
    if (!exportedSymbols.has(helper)) {
      errors.push(`Helper nao exportado em adminAdPartnership.service.ts: ${helper}`)
    }
  }

  const helperImports = collectNamedImports(bulkImportService.sourceFile, 'adminAdPartnership.service')
  for (const helper of REQUIRED_HELPER_IMPORTS) {
    if (!helperImports.has(helper)) {
      errors.push(`Helper nao importado em adminBulkImport.service.ts: ${helper}`)
    }
  }

  const targetMethods = ['planCampaignImport', 'applyCampaignPlan']
  for (const methodName of targetMethods) {
    const method = findClassMethod(bulkImportService.sourceFile, 'AdminBulkImportService', methodName)
    if (!method?.body) {
      errors.push(`Metodo nao encontrado em adminBulkImport.service.ts: ${methodName}`)
      continue
    }

    const calledIdentifiers = collectCalledIdentifiers(method.body)
    for (const helper of REQUIRED_METHOD_HELPER_CALLS) {
      if (!calledIdentifiers.has(helper)) {
        errors.push(`Metodo ${methodName} deixou de chamar helper obrigatorio: ${helper}`)
      }
    }

    const stringLiterals = collectStringLiterals(method.body)
    for (const code of REQUIRED_GUARDRAIL_CODES) {
      if (!stringLiterals.has(code)) {
        errors.push(`Metodo ${methodName} sem codigo de guardrail esperado: ${code}`)
      }
    }

    const methodText = bulkImportService.sourceText.slice(method.body.pos, method.body.end)
    if (!methodText.includes('requireActive: true')) {
      errors.push(`Metodo ${methodName} deve validar slots com requireActive: true.`)
    }
  }

  if (errors.length > 0) {
    fail(errors)
  }

  console.log(
    '[ads-bulk-import-guardrails-smoke] OK: guardrails de ativacao via bulk import estao protegidos.'
  )
}

run()
