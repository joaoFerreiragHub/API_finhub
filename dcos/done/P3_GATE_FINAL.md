# P3 - Gate Final da Analise Rapida

Data: 2026-03-20

## Execucao do gate setorial (11 setores)

Comando executado:

```bash
node scripts/quick-metrics-sector-coverage.js --fixture=scripts/fixtures/quick-metrics-sector-coverage.offline.json
```

Resultado:

| Setor esperado | Ticker | Setor resolvido | Core | Optional | Calculado | Nao aplicavel | Sem dado atual | Erro fonte | Observacao |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Technology | AAPL | Technology | 18/18 | 0/0 | 6 | 0 | 0 | 0 | ok |
| Communication Services | GOOGL | Communication Services | 18/18 | 0/0 | 6 | 0 | 0 | 0 | ok |
| Healthcare | JNJ | Healthcare | 18/18 | 0/0 | 6 | 0 | 0 | 0 | ok |
| Financial Services | JPM | Financial Services | 10/10 | 6/6 | 5 | 2 | 0 | 0 | ok |
| Real Estate | PLD | Real Estate | 15/15 | 3/3 | 6 | 0 | 0 | 0 | ok |
| Industrials | CAT | Industrials | 18/18 | 0/0 | 6 | 0 | 0 | 0 | ok |
| Energy | XOM | Energy | 17/17 | 1/1 | 6 | 0 | 0 | 0 | ok |
| Consumer Defensive | PG | Consumer Defensive | 18/18 | 0/0 | 6 | 0 | 0 | 0 | ok |
| Consumer Cyclical | AMZN | Consumer Cyclical | 18/18 | 0/0 | 6 | 0 | 0 | 0 | ok |
| Basic Materials | LIN | Basic Materials | 18/18 | 0/0 | 6 | 0 | 0 | 0 | ok |
| Utilities | NFE | Utilities | 15/16 | 2/2 | 5 | 0 | 1 | 0 | ok |

Legenda:
- Core/Optional: cobertura por prioridade setorial no `quickMetricSummary`.
- Calculado/Nao aplicavel/Sem dado atual/Erro fonte: contagem total por estado no payload.

Conclusao de cobertura:
- Cobertura core minima observada: `15/16` (93.75%).
- Cobertura core >= 80% nos setores onde as metricas sao aplicaveis.

## Matriz tecnica - metricas nucleo

Estados possiveis para todas as metricas:
- `ok`
- `calculated`
- `nao_aplicavel`
- `sem_dado_atual`
- `erro_fonte`

### ROE
- Fonte primaria: `fmp.ratios-ttm`, `fmp.key-metrics-ttm`.
- Fallback (ordem): `benchmark.peer_median` -> `sector.fallback`.
- Formula quando nao vem pronta: `ROE = netIncome / avgShareholderEquity`.
- Nota setorial: aplicavel em todos os setores.

### ROIC
- Fonte primaria: `fmp.ratios-ttm`, `fmp.key-metrics-ttm`.
- Fallback (ordem): `benchmark.peer_median`.
- Formula quando nao vem pronta: `ROIC = NOPAT / investedCapital`.
- Nota setorial: `nao_aplicavel` para `Financial Services`.

### PEG
- Fonte primaria: `fmp.ratios-ttm`.
- Fallback (ordem): `benchmark.peer_median` -> `sector.fallback`.
- Formula quando nao vem pronta: `PEG = (P/L) / abs(growth_percent)`.
- Nota setorial: core em setores de crescimento; optional em setores como `Energy` e `Utilities`.

### Margem EBITDA
- Fonte primaria: `fmp.ratios-ttm`.
- Fallback (ordem): `benchmark.peer_median` -> `sector.fallback`.
- Formula quando nao vem pronta: `EBITDA margin = EBITDA / revenue`.
- Nota setorial: core na maioria dos setores; optional em `Financial Services`.

### Divida / Capitais Proprios
- Fonte primaria: `fmp.ratios-ttm`, `fmp.key-metrics-ttm`.
- Fallback (ordem): `benchmark.peer_median`.
- Formula quando nao vem pronta: `Debt/Equity = totalDebt / totalShareholderEquity`.
- Nota setorial: aplicavel em todos os setores.

### Payout Ratio
- Fonte primaria: `fmp.ratios-ttm`, `fmp.key-metrics-ttm`.
- Fallback (ordem): `benchmark.peer_median`.
- Formula quando nao vem pronta: `Payout = abs(dividendsPaid) / abs(netIncome)`.
- Nota setorial: aplicavel em todos os setores.

## Correcoes aplicadas neste gate

1. Contrato `quickMetric*` atualizado para incluir `Payout Ratio` na matriz oficial de governanca (`src/utils/quickAnalysisMetrics.ts`).
2. Script `quick-metrics-sector-coverage.js` atualizado com modo `--fixture` para execucao deterministica de gate em ambiente offline.
