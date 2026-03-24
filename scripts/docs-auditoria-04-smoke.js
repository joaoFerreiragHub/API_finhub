const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')
const AUDIT_DOC = path.join(REPO_ROOT, 'dcos', 'done', 'audiotira_04.md')
const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json')
const STRICT_RELEASE = process.argv.includes('--strict-release')

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const CONCLUDED_STATUSES = new Set(['concluido', 'concluida', 'fechado', 'fechada', 'done'])
const PENDING_STATUSES = new Set([
  'em_curso',
  'planeado',
  'proposto',
  'aberto',
  'pendente',
  'todo',
])

const fail = (messages) => {
  const lines = Array.isArray(messages) ? messages : [messages]
  console.error('\n[docs-smoke] FAIL')
  for (const line of lines) {
    console.error(`- ${line}`)
  }
  process.exit(1)
}

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8')

const findSectionIndex = (lines, sectionName) => {
  const target = normalize(sectionName)
  return lines.findIndex((line) => normalize(line).includes(target))
}

const parseAuditTableRows = (markdown) => {
  const rows = []
  const lines = markdown.split(/\r?\n/)

  const sectionCandidates = [
    'Escopo obrigatorio de execucao (P4 + P5)',
    'Escopo obrigatorio pre-release final (P4 + P5)',
  ]
  const sectionIndex = sectionCandidates
    .map((candidate) => findSectionIndex(lines, candidate))
    .find((index) => index !== -1) ?? -1
  if (sectionIndex === -1) return rows

  for (let i = sectionIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim()

    if (line.startsWith('## ')) break
    if (!line.startsWith('|')) continue
    if (line.includes('|---|')) continue
    if (line.includes('| Bloco |')) continue

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())

    if (cells.length !== 4) continue

    rows.push({
      bloco: cells[0],
      filePath: cells[1],
      status: cells[2],
      mandatory: cells[3],
    })
  }

  return rows
}

const parseHistoricalSources = (markdown) => {
  const sources = []
  const lines = markdown.split(/\r?\n/)
  const sectionIndex = findSectionIndex(lines, 'Fontes historicas consolidadas')
  if (sectionIndex === -1) return sources

  for (let i = sectionIndex + 1; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (line.startsWith('## ')) break
    if (!line.startsWith('- ')) continue
    sources.push(line.slice(2).trim())
  }

  return sources
}

const parseNpmRunCommands = (markdown) => {
  const commands = new Set()
  const regex = /npm run ([A-Za-z0-9:._-]+)/g
  let match = regex.exec(markdown)
  while (match) {
    commands.add(match[1])
    match = regex.exec(markdown)
  }
  return Array.from(commands)
}

const asRepoPath = (rawPath) => rawPath.replace(/[\\/]+/g, path.sep)

const fileExists = (repoRelativePath) => {
  const safePath = repoRelativePath.replace(/^`|`$/g, '').trim()
  const absolutePath = path.join(REPO_ROOT, asRepoPath(safePath))
  return fs.existsSync(absolutePath)
}

const run = () => {
  if (!fs.existsSync(AUDIT_DOC)) {
    fail(`Ficheiro obrigatorio em falta: ${path.relative(REPO_ROOT, AUDIT_DOC)}`)
  }

  const markdown = readFile(AUDIT_DOC)
  const packageJson = JSON.parse(readFile(PACKAGE_JSON))
  const errors = []

  const rows = parseAuditTableRows(markdown)
  if (rows.length === 0) {
    fail('Tabela da secao 4 nao encontrada ou vazia em dcos/audiotira_04.md')
  }

  const pendingMandatory = []
  const mandatoryOutsideDone = []

  for (const row of rows) {
    const rowId = `${row.bloco} (${row.filePath})`
    const normalizedStatus = normalize(row.status)
    const normalizedMandatory = normalize(row.mandatory)
    const inDone = row.filePath.startsWith('dcos/done/')

    if (normalizedMandatory !== 'sim' && normalizedMandatory !== 'nao') {
      errors.push(`Valor invalido em "Obrigatorio para release final" para ${rowId}`)
    }

    if (!fileExists(row.filePath)) {
      errors.push(`Ficheiro referenciado nao existe: ${row.filePath}`)
    }

    if (CONCLUDED_STATUSES.has(normalizedStatus) && !inDone) {
      errors.push(`Item concluido fora de dcos/done/: ${rowId}`)
    }

    if (PENDING_STATUSES.has(normalizedStatus) && inDone) {
      errors.push(`Item pendente ja arquivado em dcos/done/: ${rowId}`)
    }

    if (!CONCLUDED_STATUSES.has(normalizedStatus) && !PENDING_STATUSES.has(normalizedStatus)) {
      errors.push(`Estado desconhecido na tabela para ${rowId}: "${row.status}"`)
    }

    if (normalizedMandatory === 'sim' && !CONCLUDED_STATUSES.has(normalizedStatus)) {
      pendingMandatory.push(rowId)
    }

    if (normalizedMandatory === 'sim' && !inDone) {
      mandatoryOutsideDone.push(rowId)
    }
  }

  const historicalSources = parseHistoricalSources(markdown)
  if (historicalSources.length === 0) {
    errors.push('Secao 8 sem fontes historicas consolidadas.')
  }

  for (const source of historicalSources) {
    if (!fileExists(source)) {
      errors.push(`Fonte historica em falta: ${source}`)
    }
    if (STRICT_RELEASE && !source.startsWith('dcos/done/')) {
      errors.push(`Em modo strict, fontes historicas devem apontar para dcos/done/: ${source}`)
    }
  }

  const documentedNpmScripts = parseNpmRunCommands(markdown)
  for (const scriptName of documentedNpmScripts) {
    if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
      errors.push(`Comando documentado sem script npm correspondente: npm run ${scriptName}`)
    }
  }

  if (STRICT_RELEASE) {
    if (pendingMandatory.length > 0) {
      errors.push(
        `Release gate bloqueado: itens obrigatorios ainda nao concluidos (${pendingMandatory.length}).`,
      )
    }
    if (mandatoryOutsideDone.length > 0) {
      errors.push(
        `Release gate bloqueado: itens obrigatorios ainda fora de dcos/done/ (${mandatoryOutsideDone.length}).`,
      )
    }
  }

  if (errors.length > 0) {
    fail(errors)
  }

  const mode = STRICT_RELEASE ? 'STRICT RELEASE' : 'SMOKE'
  console.log(`[docs-smoke] OK (${mode})`)
  console.log(`[docs-smoke] Tabela obrigatoria validada: ${rows.length} itens`)
  console.log(`[docs-smoke] Fontes historicas validadas: ${historicalSources.length}`)
  console.log(`[docs-smoke] Scripts npm documentados validados: ${documentedNpmScripts.length}`)
}

run()
