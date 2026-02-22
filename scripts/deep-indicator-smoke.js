#!/usr/bin/env node

/**
 * Deep indicator smoke test — 2 tickers, ALL indicators analysed.
 *
 * Usage:
 *   node scripts/deep-indicator-smoke.js
 *   node scripts/deep-indicator-smoke.js --api-base=http://localhost:5000/api
 */

const DEFAULT_API_BASE = 'http://localhost:5000/api'

const TICKERS = [
  { symbol: 'GOOGL', sector: 'Communication Services' },
  { symbol: 'AAPL',  sector: 'Technology' },
]

const DASH_VALUES = new Set(['', '-', '--', '---', 'N/A', 'n/a', '\u2014'])
function isDash(v) { return !v || DASH_VALUES.has(String(v).trim()) }

function parseArgs(argv) {
  let apiBase = DEFAULT_API_BASE
  argv.forEach(a => { if (a.startsWith('--api-base=')) apiBase = a.slice('--api-base='.length) })
  return { apiBase }
}

async function fetchQuickAnalysis(apiBase, symbol) {
  const url = `${apiBase.replace(/\/$/, '')}/stocks/quick-analysis/${encodeURIComponent(symbol)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally { clearTimeout(timer) }
}

// ─── Key indicators expected per sector ─────────────────────────────────────

const CRITICAL_KEYS = {
  'Communication Services': [
    // Crescimento
    'Crescimento Receita', 'CAGR Receita 3Y', 'Crescimento EBITDA', 'CAGR EPS',
    // Rentabilidade
    'ROE', 'ROIC', 'Margem EBITDA', 'Margem Bruta', 'Margem Líquida', 'Margem Operacional',
    // Avaliação
    'P/L', 'P/S', 'P/VPA',
    // Fluxo de Caixa
    'Free Cash Flow', 'FCF Yield', 'CapEx/Receita',
    // Estrutura
    'Dívida/EBITDA', 'Cobertura de Juros', 'Liquidez Corrente', 'Dívida / Capitais Próprios',
    // Dividendos
    'Dividend Yield', 'Payout Ratio',
    // Risco
    'Beta',
  ],
  'Technology': [
    // Crescimento
    'Crescimento Receita', 'CAGR EPS', 'EPS',
    // Rentabilidade
    'ROE', 'ROIC', 'Margem EBITDA', 'Margem Bruta', 'Margem Líquida', 'Margem Operacional',
    // Avaliação
    'P/L', 'P/S', 'PEG',
    // Estrutura
    'Dívida/EBITDA', 'Cobertura de Juros', 'Liquidez Corrente', 'Dívida / Capitais Próprios', 'Cash Ratio',
    // Tech-específicos
    'Investimento em P&D', 'Eficiência de P&D', 'Cash Flow / CapEx', 'Free Cash Flow', 'SG&A / Receita', 'Payout Ratio',
    // Risco
    'Beta',
  ],
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { apiBase } = parseArgs(process.argv.slice(2))
  console.log(`\n🔬 Deep Indicator Smoke Test`)
  console.log(`   API: ${apiBase}\n`)

  const results = []

  for (const { symbol, sector } of TICKERS) {
    console.log(`\n${'═'.repeat(70)}`)
    console.log(`  ${symbol} (${sector})`)
    console.log(`${'═'.repeat(70)}`)

    let payload
    try {
      payload = await fetchQuickAnalysis(apiBase, symbol)
    } catch (e) {
      console.log(`  ❌ FETCH FAILED: ${e.message}`)
      results.push({ symbol, sector, error: e.message })
      continue
    }

    const indicadores = payload?.indicadores || {}
    const keys = Object.keys(indicadores).sort()

    // Stats
    const total = keys.length
    const withData = keys.filter(k => !isDash(indicadores[k]))
    const withDash = keys.filter(k => isDash(indicadores[k]))
    const yKeys = keys.filter(k => k.includes('(Y-1)') || k.includes('_anterior'))
    const currentKeys = keys.filter(k => !k.includes('(Y-1)') && !k.includes('_anterior'))

    console.log(`\n  📊 Resumo: ${total} chaves no payload (${currentKeys.length} atuais + ${yKeys.length} Y-1)`)
    console.log(`  ✅ Com dados: ${withData.length}/${total} (${((withData.length/total)*100).toFixed(0)}%)`)
    console.log(`  — Sem dados: ${withDash.length}/${total}`)

    // ─── Tabela completa de indicadores atuais ───
    console.log(`\n  ${'─'.repeat(66)}`)
    console.log(`  ${'Indicador'.padEnd(40)} ${'Valor'.padEnd(15)} ${'Y-1'.padEnd(15)}`)
    console.log(`  ${'─'.repeat(66)}`)

    const currentOnly = currentKeys.filter(k => !k.includes('(Y-1)') && !k.includes('_anterior'))
    for (const key of currentOnly) {
      const val = indicadores[key] ?? '—'
      const y1Key = indicadores[`${key} (Y-1)`] ?? indicadores[`${key}_anterior`] ?? '—'
      const hasVal = !isDash(val)
      const hasY1 = !isDash(y1Key)
      const status = hasVal ? '✅' : '⚠️'
      const y1Status = hasY1 ? '' : '⚠️'
      console.log(`  ${status} ${key.padEnd(38)} ${String(val).padEnd(15)} ${y1Status}${String(y1Key).substring(0, 14)}`)
    }

    // ─── Verificar indicadores críticos esperados ───
    const criticalKeys = CRITICAL_KEYS[sector] || []
    const missingCritical = []
    const dashCritical = []
    const okCritical = []

    for (const ck of criticalKeys) {
      if (!(ck in indicadores)) {
        missingCritical.push(ck)
      } else if (isDash(indicadores[ck])) {
        dashCritical.push(ck)
      } else {
        okCritical.push(ck)
      }
    }

    console.log(`\n  🎯 Indicadores Críticos para ${sector}: ${okCritical.length}/${criticalKeys.length} OK`)

    if (missingCritical.length > 0) {
      console.log(`  ❌ AUSENTES do payload (chave não existe):`)
      missingCritical.forEach(k => console.log(`     - ${k}`))
    }
    if (dashCritical.length > 0) {
      console.log(`  ⚠️  Com '—' (sem dado):`)
      dashCritical.forEach(k => console.log(`     - ${k}`))
    }

    // ─── Verificar fixes específicos ───
    console.log(`\n  🔧 Verificações específicas:`)

    // Fix 1: CAGR Receita 3Y
    const cagr3y = indicadores['CAGR Receita 3Y']
    console.log(`     CAGR Receita 3Y: ${cagr3y ?? 'MISSING'} ${!isDash(cagr3y) ? '✅' : '⚠️ sem dado'}`)

    // Fix 2: Crescimento EBITDA
    const crescEbitda = indicadores['Crescimento EBITDA']
    console.log(`     Crescimento EBITDA: ${crescEbitda ?? 'MISSING'} ${!isDash(crescEbitda) ? '✅' : '⚠️ sem dado'}`)

    // Fix 3: CapEx/Receita
    const capexRev = indicadores['CapEx/Receita']
    console.log(`     CapEx/Receita: ${capexRev ?? 'MISSING'} ${!isDash(capexRev) ? '✅' : '⚠️ sem dado'}`)

    // Fix 4: Cobertura de Juros (sentinel fix)
    const cobJuros = indicadores['Cobertura de Juros']
    const isSentinelZero = cobJuros === '0.00' || cobJuros === '0'
    console.log(`     Cobertura de Juros: ${cobJuros ?? 'MISSING'} ${isSentinelZero ? '❌ SENTINEL 0!' : !isDash(cobJuros) ? '✅' : '⚠️ sem dado (esperado se sem dívida)'}`)

    // Fix 5: Dívida / Capitais Próprios
    const divCap = indicadores['Dívida / Capitais Próprios']
    const divCapY1 = indicadores['Dívida / Capitais Próprios (Y-1)']
    console.log(`     Dívida/Cap.Próprios: ${divCap ?? 'MISSING'} (Y-1: ${divCapY1 ?? 'MISSING'}) ${!isDash(divCap) ? '✅' : '⚠️'}`)

    // ─── Scores ───
    console.log(`\n  📈 Scores:`)
    console.log(`     finHubScore: ${payload.finHubScore ?? 'N/A'}`)
    console.log(`     sectorContextScore: ${JSON.stringify(payload.sectorContextScore?.score ?? 'N/A')}`)
    console.log(`     dataQualityScore: ${JSON.stringify(payload.dataQualityScore?.score ?? 'N/A')}`)

    // ─── quickMetricSummary ───
    const qms = payload.quickMetricSummary
    if (qms) {
      console.log(`     coreReady/coreTotal: ${qms.coreReady}/${qms.coreTotal} ${qms.coreReady === qms.coreTotal ? '✅ 100%' : '⚠️'}`)
    }

    results.push({
      symbol, sector,
      total, withData: withData.length, withDash: withDash.length,
      criticalOk: okCritical.length, criticalTotal: criticalKeys.length,
      missingCritical, dashCritical,
      fixes: {
        cagr3y: !isDash(cagr3y),
        crescEbitda: !isDash(crescEbitda),
        capexRev: !isDash(capexRev),
        cobJurosSentinel: !isSentinelZero,
        divCapProprios: !isDash(divCap),
      },
      scores: {
        finHub: payload.finHubScore,
        sectorContext: payload.sectorContextScore?.score,
        dataQuality: payload.dataQualityScore?.score,
      }
    })

    // Wait between requests
    await new Promise(r => setTimeout(r, 2000))
  }

  // ─── Conclusão Final ───
  console.log(`\n\n${'═'.repeat(70)}`)
  console.log(`  📋 CONCLUSÃO FINAL`)
  console.log(`${'═'.repeat(70)}\n`)

  let allGood = true
  for (const r of results) {
    if (r.error) {
      console.log(`  ❌ ${r.symbol}: FALHOU (${r.error})`)
      allGood = false
      continue
    }

    const fixResults = Object.entries(r.fixes)
    const fixesPassed = fixResults.filter(([,v]) => v).length
    const fixesFailed = fixResults.filter(([,v]) => !v)

    console.log(`  ${r.symbol} (${r.sector}):`)
    console.log(`     Indicadores: ${r.withData}/${r.total} com dados (${((r.withData/r.total)*100).toFixed(0)}%)`)
    console.log(`     Críticos: ${r.criticalOk}/${r.criticalTotal} OK`)
    console.log(`     Fixes recentes: ${fixesPassed}/${fixResults.length} OK`)

    if (fixesFailed.length > 0) {
      fixesFailed.forEach(([name]) => console.log(`       ⚠️ ${name} não passou`))
    }
    if (r.missingCritical.length > 0) {
      console.log(`     ❌ Chaves críticas ausentes: ${r.missingCritical.join(', ')}`)
      allGood = false
    }
    if (r.dashCritical.length > 0) {
      console.log(`     ⚠️ Críticos sem dado: ${r.dashCritical.join(', ')}`)
    }
    console.log()
  }

  if (allGood) {
    console.log(`  ✅ Todos os indicadores críticos presentes no payload.`)
  } else {
    console.log(`  ⚠️ Existem indicadores críticos em falta — ver detalhes acima.`)
  }

  process.exit(allGood ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
