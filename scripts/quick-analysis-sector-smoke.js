#!/usr/bin/env node

/**
 * P3 Quick Analysis sector smoke test.
 * Validates metric calculations, governance states, and scoring for 1 stock per sector.
 *
 * Usage:
 *   node scripts/quick-analysis-sector-smoke.js
 *   node scripts/quick-analysis-sector-smoke.js --api-base=http://localhost:5000/api
 *   node scripts/quick-analysis-sector-smoke.js --out=../FinHub-Vite/dcos/P3_SMOKE_SECTOR.md
 */

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_API_BASE = 'http://localhost:5000/api'

// 1 stock per sector, excluding REITs (dedicated tool)
const SAMPLES = [
  { sector: 'Technology', symbol: 'AAPL' },
  { sector: 'Communication Services', symbol: 'GOOGL' },
  { sector: 'Healthcare', symbol: 'JNJ' },
  { sector: 'Financial Services', symbol: 'JPM' },
  { sector: 'Industrials', symbol: 'CAT' },
  { sector: 'Energy', symbol: 'XOM' },
  { sector: 'Consumer Defensive', symbol: 'PG' },
  { sector: 'Consumer Cyclical', symbol: 'AMZN' },
  { sector: 'Basic Materials', symbol: 'LIN' },
  { sector: 'Utilities', symbol: 'NEE' },
]

const DASH_VALUES = new Set(['', '-', '--', '---', 'N/A', 'n/a', '\u2014'])

function isDash(value) {
  return !value || DASH_VALUES.has(String(value).trim())
}

function parseArgs(argv) {
  const parsed = { apiBase: DEFAULT_API_BASE, out: null, timeoutMs: 15000, interRequestMs: 1500, attempts: 4 }
  argv.forEach((arg) => {
    if (arg.startsWith('--api-base=')) parsed.apiBase = arg.slice('--api-base='.length)
    if (arg.startsWith('--out=')) parsed.out = arg.slice('--out='.length)
    if (arg.startsWith('--timeout-ms=')) {
      const v = Number(arg.slice('--timeout-ms='.length))
      if (!Number.isNaN(v) && v > 0) parsed.timeoutMs = v
    }
    if (arg.startsWith('--inter-request-ms=')) {
      const v = Number(arg.slice('--inter-request-ms='.length))
      if (!Number.isNaN(v) && v >= 0) parsed.interRequestMs = v
    }
  })
  return parsed
}

async function wait(ms) { await new Promise((r) => setTimeout(r, ms)) }

async function fetchQuickAnalysis(apiBase, symbol, timeoutMs) {
  const url = `${apiBase.replace(/\/$/, '')}/stocks/quick-analysis/${encodeURIComponent(symbol)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal })
    if (!res.ok) { const body = await res.text(); throw new Error(`HTTP ${res.status} -> ${body.slice(0, 200)}`) }
    return await res.json()
  } finally { clearTimeout(timer) }
}

async function fetchWithRetry(apiBase, symbol, timeoutMs, attempts) {
  let lastError = null
  for (let i = 1; i <= attempts; i++) {
    try { return await fetchQuickAnalysis(apiBase, symbol, timeoutMs) }
    catch (e) { lastError = e; if (i < attempts) await wait(1500 * i) }
  }
  throw lastError
}

// ─── Sector-specific checks ───────────────────────────────────────────────────

function commonChecks(payload) {
  const checks = []
  const ind = payload.indicadores || {}
  const summary = payload.quickMetricSummary || {}
  const states = payload.quickMetricStates || {}

  // Score checks
  checks.push({
    name: 'finHubScore exists',
    pass: typeof payload.finHubScore === 'number' && payload.finHubScore >= 0,
    detail: `finHubScore=${payload.finHubScore}`,
  })
  checks.push({
    name: 'sectorContextScore.score > 0',
    pass: payload.sectorContextScore?.score > 0,
    detail: `score=${payload.sectorContextScore?.score}`,
  })
  checks.push({
    name: 'dataQualityScore.score > 0',
    pass: payload.dataQualityScore?.score > 0,
    detail: `score=${payload.dataQualityScore?.score}`,
  })

  // Core coverage
  checks.push({
    name: 'core 100% coberto',
    pass: summary.coreReady === summary.coreTotal && summary.coreTotal > 0,
    detail: `${summary.coreReady}/${summary.coreTotal}`,
  })

  // No erro_fonte on core metrics
  const coreErros = Object.entries(states).filter(
    ([, s]) => s.status === 'erro_fonte' && s.requiredForSector,
  )
  checks.push({
    name: 'nenhum core com erro_fonte',
    pass: coreErros.length === 0,
    detail: coreErros.length > 0 ? coreErros.map(([k]) => k).join(', ') : 'ok',
  })

  // Universal metrics present
  const universals = ['ROE', 'P/L', 'P/S', 'Beta', 'Crescimento Receita', 'Margem Operacional']
  universals.forEach((m) => {
    checks.push({
      name: `${m} presente`,
      pass: !isDash(ind[m]),
      detail: `${m}=${ind[m] || 'MISSING'}`,
    })
  })

  return checks
}

function nonFinancialChecks(payload) {
  const checks = []
  const ind = payload.indicadores || {}

  // New metrics added in this sprint
  checks.push({
    name: 'Crescimento EBITDA presente',
    pass: !isDash(ind['Crescimento EBITDA']),
    detail: `val=${ind['Crescimento EBITDA'] || 'MISSING'}`,
  })
  checks.push({
    name: 'CapEx/Receita presente',
    pass: !isDash(ind['CapEx/Receita']),
    detail: `val=${ind['CapEx/Receita'] || 'MISSING'}`,
  })

  // Cobertura de Juros should not be sentinel zero
  const cj = ind['Cobertura de Juros']
  checks.push({
    name: 'Cobertura de Juros != 0.00 (sentinel)',
    pass: cj !== '0.00' && cj !== '0',
    detail: `val=${cj || 'MISSING'}`,
  })

  // Free Cash Flow
  checks.push({
    name: 'Free Cash Flow presente',
    pass: !isDash(ind['Free Cash Flow']),
    detail: `val=${ind['Free Cash Flow'] || 'MISSING'}`,
  })

  return checks
}

function financialChecks(payload) {
  const checks = []
  const states = payload.quickMetricStates || {}

  // Financial Services should have specific nao_aplicavel metrics
  const expectedNA = ['ROIC', 'Divida/EBITDA', 'Liquidez Corrente']
  expectedNA.forEach((m) => {
    const found = Object.entries(states).find(([label]) =>
      label.toLowerCase().replace(/[^a-z/]/g, '') === m.toLowerCase().replace(/[^a-z/]/g, ''),
    )
    checks.push({
      name: `${m} = nao_aplicavel`,
      pass: found ? found[1].status === 'nao_aplicavel' : false,
      detail: found ? `status=${found[1].status}` : 'not in states',
    })
  })

  return checks
}

function runSectorChecks(sector, payload) {
  const checks = commonChecks(payload)

  if (sector === 'Financial Services') {
    checks.push(...financialChecks(payload))
  } else {
    checks.push(...nonFinancialChecks(payload))
  }

  return checks
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function buildMarkdown(results) {
  const dateStr = new Date().toISOString().slice(0, 10)
  const lines = []
  lines.push('# P3 - Smoke Test Setorial Quick Analysis')
  lines.push('')
  lines.push(`Data: ${dateStr}`)
  lines.push('')

  let totalPass = 0
  let totalFail = 0

  results.forEach((item) => {
    lines.push(`## ${item.sector} (${item.symbol})`)
    lines.push('')

    if (item.error) {
      lines.push(`**ERRO:** ${item.error}`)
      lines.push('')
      totalFail++
      return
    }

    lines.push('| Check | Result | Detail |')
    lines.push('|---|---|---|')

    item.checks.forEach((c) => {
      const icon = c.pass ? 'PASS' : 'FAIL'
      if (c.pass) totalPass++
      else totalFail++
      lines.push(`| ${c.name} | ${icon} | ${c.detail} |`)
    })

    lines.push('')
  })

  lines.push('---')
  lines.push(`**Total: ${totalPass} PASS / ${totalFail} FAIL**`)
  lines.push('')
  return lines.join('\n')
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const results = []

  for (const sample of SAMPLES) {
    process.stdout.write(`Testing ${sample.symbol} (${sample.sector})...`)
    try {
      const payload = await fetchWithRetry(args.apiBase, sample.symbol, args.timeoutMs, args.attempts)
      const checks = runSectorChecks(sample.sector, payload)
      const fails = checks.filter((c) => !c.pass)
      results.push({ sector: sample.sector, symbol: sample.symbol, checks })
      process.stdout.write(` ${checks.length - fails.length}/${checks.length} passed\n`)
    } catch (error) {
      results.push({ sector: sample.sector, symbol: sample.symbol, error: error instanceof Error ? error.message : String(error) })
      process.stdout.write(` ERROR\n`)
    }
    if (args.interRequestMs > 0) await wait(args.interRequestMs)
  }

  const markdown = buildMarkdown(results)

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out)
    fs.writeFileSync(outPath, markdown, 'utf8')
    process.stdout.write(`\nResultados em: ${outPath}\n`)
  } else {
    process.stdout.write(`\n${markdown}\n`)
  }

  const totalFails = results.reduce((acc, r) => {
    if (r.error) return acc + 1
    return acc + r.checks.filter((c) => !c.pass).length
  }, 0)
  if (totalFails > 0) process.exitCode = 1
}

run().catch((error) => {
  process.stderr.write(`Erro fatal: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
