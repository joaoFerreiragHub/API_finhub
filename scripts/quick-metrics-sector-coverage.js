#!/usr/bin/env node

/**
 * P3 cross-sector quick metrics coverage validator.
 *
 * Usage:
 *   node scripts/quick-metrics-sector-coverage.js
 *   node scripts/quick-metrics-sector-coverage.js --api-base=http://localhost:5000/api
 *   node scripts/quick-metrics-sector-coverage.js --out=../FinHub-Vite/dcos/P3_COBERTURA_SETORIAL.md
 */

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_API_BASE = 'http://localhost:5000/api'

const DEFAULT_SAMPLES = [
  { expectedSector: 'Technology', symbol: 'AAPL' },
  { expectedSector: 'Communication Services', symbol: 'GOOGL' },
  { expectedSector: 'Healthcare', symbol: 'JNJ' },
  { expectedSector: 'Financial Services', symbol: 'JPM' },
  { expectedSector: 'Real Estate', symbol: 'PLD' },
  { expectedSector: 'Industrials', symbol: 'CAT' },
  { expectedSector: 'Energy', symbol: 'XOM' },
  { expectedSector: 'Consumer Defensive', symbol: 'PG' },
  { expectedSector: 'Consumer Cyclical', symbol: 'AMZN' },
  { expectedSector: 'Basic Materials', symbol: 'LIN' },
  { expectedSector: 'Utilities', symbol: 'NFE' },
]

function parseArgs(argv) {
  const parsed = {
    apiBase: DEFAULT_API_BASE,
    out: null,
    timeoutMs: 12000,
    interRequestMs: 1200,
    attempts: 4,
  }

  argv.forEach((arg) => {
    if (arg.startsWith('--api-base=')) parsed.apiBase = arg.slice('--api-base='.length)
    if (arg.startsWith('--out=')) parsed.out = arg.slice('--out='.length)
    if (arg.startsWith('--timeout-ms=')) {
      const value = Number(arg.slice('--timeout-ms='.length))
      if (!Number.isNaN(value) && value > 0) parsed.timeoutMs = value
    }
    if (arg.startsWith('--inter-request-ms=')) {
      const value = Number(arg.slice('--inter-request-ms='.length))
      if (!Number.isNaN(value) && value >= 0) parsed.interRequestMs = value
    }
    if (arg.startsWith('--attempts=')) {
      const value = Number(arg.slice('--attempts='.length))
      if (!Number.isNaN(value) && value >= 1) parsed.attempts = value
    }
  })

  return parsed
}

function fmtRatio(ready, total) {
  if (typeof ready !== 'number' || typeof total !== 'number') return '-'
  return `${ready}/${total}`
}

function fmtNumber(value) {
  return typeof value === 'number' ? String(value) : '-'
}

async function fetchQuickAnalysis(apiBase, symbol, timeoutMs) {
  const url = `${apiBase.replace(/\/$/, '')}/stocks/quick-analysis/${encodeURIComponent(symbol)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`HTTP ${response.status} ${response.statusText} -> ${body.slice(0, 240)}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchQuickAnalysisWithRetry(apiBase, symbol, timeoutMs, attempts = 4) {
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchQuickAnalysis(apiBase, symbol, timeoutMs)
    } catch (error) {
      lastError = error
      if (attempt < attempts) await wait(1200 * attempt)
    }
  }

  throw lastError
}

function buildMarkdown(results) {
  const dateStr = new Date().toISOString().slice(0, 10)
  const lines = []
  lines.push('# P3 - Cobertura Setorial da Analise Rapida')
  lines.push('')
  lines.push(`Data: ${dateStr}`)
  lines.push('')
  lines.push('| Setor esperado | Ticker | Setor resolvido | Core | Optional | Calculado | Nao aplicavel | Sem dado atual | Erro fonte | Observacao |')
  lines.push('|---|---|---|---:|---:|---:|---:|---:|---:|---|')

  results.forEach((item) => {
    if (item.error) {
      lines.push(
        `| ${item.expectedSector} | ${item.symbol} | - | - | - | - | - | - | - | ${item.error.replace(/\|/g, '/')} |`,
      )
      return
    }

    const resolved = item.resolvedSector || '-'
    const mismatch = resolved !== item.expectedSector ? 'setor divergente' : 'ok'
    lines.push(
      `| ${item.expectedSector} | ${item.symbol} | ${resolved} | ${fmtRatio(item.coreReady, item.coreTotal)} | ${fmtRatio(item.optionalReady, item.optionalTotal)} | ${fmtNumber(item.calculated)} | ${fmtNumber(item.naoAplicavel)} | ${fmtNumber(item.semDadoAtual)} | ${fmtNumber(item.erroFonte)} | ${mismatch} |`,
    )
  })

  lines.push('')
  lines.push('Legenda:')
  lines.push('- Core/Optional: cobertura por prioridade setorial no `quickMetricSummary`.')
  lines.push('- Calculado/Nao aplicavel/Sem dado atual/Erro fonte: contagem total por estado no payload.')
  lines.push('')
  return lines.join('\n')
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const results = []

  for (const sample of DEFAULT_SAMPLES) {
    try {
      const payload = await fetchQuickAnalysisWithRetry(
        args.apiBase,
        sample.symbol,
        args.timeoutMs,
        args.attempts,
      )
      const summary = payload.quickMetricSummary || {}
      const ingestion = payload.quickMetricIngestion || {}
      results.push({
        expectedSector: sample.expectedSector,
        symbol: sample.symbol,
        resolvedSector: ingestion.resolvedSector || payload.sector || null,
        coreReady: summary.coreReady,
        coreTotal: summary.coreTotal,
        optionalReady: summary.optionalReady,
        optionalTotal: summary.optionalTotal,
        calculated: summary.calculated,
        naoAplicavel: summary.nao_aplicavel,
        semDadoAtual: summary.sem_dado_atual,
        erroFonte: summary.erro_fonte,
      })
    } catch (error) {
      results.push({
        expectedSector: sample.expectedSector,
        symbol: sample.symbol,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    if (args.interRequestMs > 0) await wait(args.interRequestMs)
  }

  const markdown = buildMarkdown(results)

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out)
    fs.writeFileSync(outPath, markdown, 'utf8')
    process.stdout.write(`Tabela escrita em: ${outPath}\n`)
  } else {
    process.stdout.write(`${markdown}\n`)
  }

  const hasErrors = results.some((item) => Boolean(item.error))
  if (hasErrors) process.exitCode = 1
}

run().catch((error) => {
  process.stderr.write(`Erro fatal: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
