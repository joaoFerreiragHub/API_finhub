# P8 — Elevação UI/UX: Spec Técnica de Execução

*Data: 2026-03-15*
*Referência estratégica: `dcos/P8_UI_UX_ELEVACAO.md`*
*Pré-requisito: este doc é o guia de execução passo-a-passo para um agente de AI*

---

## Como usar este documento

Este doc contém substituições **exactas** de código (old → new) para cada ficheiro a alterar.
O agente deve seguir as fases em ordem. Após cada fase, executar:

```bash
cd FinHub-Vite && npx tsc --noEmit --project tsconfig.app.json
npm run dev  # verificar visualmente em light + dark mode
```

---

## Fase 0 — Verificação Inicial (ler antes de tudo)

**Padrão de referência correcto** (já bem implementado — usar como modelo):
- `FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx`
  - Usa `bg-card/75`, `border-border/60`, `text-muted-foreground` ✓
  - Gradientes de header: `bg-gradient-to-r from-emerald-500/80 to-emerald-400/40` ✓

---

## Fase 1 — P0: Fundações (breaking changes mínimos, máximo impacto)

### 1.1 — Inter Font

**Ficheiro:** `FinHub-Vite/package.json`
```bash
# Executar em FinHub-Vite/
npm install @fontsource/inter
```

**Ficheiro:** `FinHub-Vite/src/main.tsx` (ou `index.tsx` — verificar entry point)
Adicionar no topo dos imports:
```ts
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
```

**Ficheiro:** `FinHub-Vite/src/styles/globals.css`
Adicionar no `:root` (após `--ring`):
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
```

Adicionar nas utilities (`@layer utilities`):
```css
/* Números financeiros tabulares — usar em todos os valores numéricos */
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

---

### 1.2 — Dark mode mais escuro + Chart colors

**Ficheiro:** `FinHub-Vite/src/styles/globals.css`

**Substituição 1 — Background mais escuro (30 segundos de impacto visual):**
```
OLD: --background: 224 20% 12%;
NEW: --background: 222 25% 8%;

OLD: --card: 224 15% 16%;
NEW: --card: 222 20% 11%;

OLD: --border: 224 12% 18%;
NEW: --border: 220 15% 18%;

OLD: --input: 224 12% 18%;
NEW: --input: 220 15% 18%;
```

**Substituição 2 — Adicionar chart colors no `.dark` (após `--ring: 220 30% 70%;`):**
```css
    --chart-1: 217 91% 65%;
    --chart-2: 160 72% 48%;
    --chart-3: 38 92% 58%;
    --chart-4: 0 84% 65%;
    --chart-5: 270 67% 70%;
```

**Substituição 3 — Headings hardcoded (linha 105):**
```
OLD: @apply font-bold text-gray-900;
NEW: @apply font-bold text-foreground;
```

---

### 1.3 — Market Colors no Tailwind

**Ficheiro:** `FinHub-Vite/tailwind.config.ts`
Dentro de `extend: { colors: { ... } }`, adicionar:
```ts
market: {
  bull:    '#22C55E',
  bear:    '#EF4444',
  neutral: '#94A3B8',
},
```

---

### 1.4 — Toggle Theme (hover hardcoded)

**Ficheiro:** `FinHub-Vite/src/components/ui/toggle-theme.tsx`

A classe `"p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"` aparece **duas vezes** (linha 35 e linha 46). Substituir ambas:
```
OLD: "p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
NEW: "p-2 rounded-md hover:bg-accent transition-colors"
```
Usar `replace_all: true`.

---

## Fase 2 — P0: Fix Dark Mode dos Cards MLPredictions (crítico — `bg-white` quebra dark mode)

> **Padrão a aplicar em todos os cards:**
> - `bg-white` → `bg-muted/40`
> - `border-{color}-100` → `border-border/60`
> - `border-{color}-200` (outer card) → `border-{color}-500/20`
> - `from-{color}-50 to-{color}-50` (gradient) → remover gradient, usar `bg-card`
> - `text-gray-500` / `text-gray-600` → `text-muted-foreground`
> - `text-gray-700` / `text-gray-800` → `text-foreground`
> - Icon color `text-{color}-600` → `text-{color}-500 dark:text-{color}-400`

---

### 2.1 — EarningsCard.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/MLPredictions/EarningsCard.tsx`

```
LINE 15 — outer Card className:
OLD: <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
NEW: <Card className="border-purple-500/20 bg-card">

LINE 19 — icon color:
OLD: <Target className="w-5 h-5 text-purple-600" />
NEW: <Target className="w-5 h-5 text-purple-500 dark:text-purple-400" />

LINE 29 — main prediction inner box:
OLD: className="bg-white rounded-lg p-4 border border-purple-100"
NEW: className="bg-muted/40 rounded-lg p-4 border border-border/60"

LINE 31 — label text:
OLD: <span className="text-gray-600">Próximo Quarter</span>
NEW: <span className="text-muted-foreground">Próximo Quarter</span>

LINE 45 — vs label:
OLD: <span className="text-gray-500">vs estimativas</span>
NEW: <span className="text-muted-foreground">vs estimativas</span>

LINE 60 — driver item inner box:
OLD: className="flex items-center p-2 bg-white rounded border border-purple-100"
NEW: className="flex items-center p-2 bg-muted/40 rounded border border-border/60"

LINE 78 — trend item box:
OLD: className="bg-white rounded p-3 text-center border border-purple-100"
NEW: className="bg-muted/40 rounded p-3 text-center border border-border/60"

LINE 80 — Q label:
OLD: <div className="text-xs text-gray-500">Q{idx + 1}</div>
NEW: <div className="text-xs text-muted-foreground">Q{idx + 1}</div>

LINE 91 — confidence box:
OLD: className="bg-white rounded-lg p-3 border border-purple-100"
NEW: className="bg-muted/40 rounded-lg p-3 border border-border/60"

LINE 93 — confidence label:
OLD: <span className="text-sm text-gray-600">Confiança do Modelo</span>
NEW: <span className="text-sm text-muted-foreground">Confiança do Modelo</span>
```

---

### 2.2 — ModelMetricsCard.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/MLPredictions/ModelMetricsCard.tsx`

```
LINE 8 — outer Card className:
OLD: <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50">
NEW: <Card className="border-border bg-card">

LINE 12 — icon color:
OLD: <BarChart3 className="w-5 h-5 text-gray-600" />
NEW: <BarChart3 className="w-5 h-5 text-muted-foreground" />

LINES 23 e 32 — metric boxes (ambas iguais):
OLD: className="bg-white rounded-lg p-4 border border-gray-100"
NEW: className="bg-muted/40 rounded-lg p-4 border border-border/60"
(usar replace_all: true)

LINES 24 e 33 — metric labels:
OLD: <div className="text-sm text-gray-500 mb-2">
NEW: <div className="text-sm text-muted-foreground mb-2">
(usar replace_all: true)

LINE 45 — data quality box:
OLD: className="bg-white rounded-lg p-4 border border-gray-100"
NEW: className="bg-muted/40 rounded-lg p-4 border border-border/60"

LINE 47 — data quality label:
OLD: <span className="text-sm text-gray-600">Qualidade dos Dados</span>
NEW: <span className="text-sm text-muted-foreground">Qualidade dos Dados</span>

LINE 60 — model confidence box:
OLD: className="bg-white rounded-lg p-3 border border-gray-100"
NEW: className="bg-muted/40 rounded-lg p-3 border border-border/60"

LINE 61 — model confidence label:
OLD: <div className="text-sm text-gray-600 mb-2">Confiança Geral do Modelo</div>
NEW: <div className="text-sm text-muted-foreground mb-2">Confiança Geral do Modelo</div>
```

---

### 2.3 — ModelInsightsCard.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/MLPredictions/ModelInsightsCard.tsx`

```
LINE 7 — outer Card className:
OLD: <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
NEW: <Card className="border-blue-500/20 bg-card">

LINE 11 — icon color:
OLD: <Brain className="w-5 h-5 text-blue-600" />
NEW: <Brain className="w-5 h-5 text-blue-500 dark:text-blue-400" />

LINE 24 — insight list item box:
OLD: className="flex items-start space-x-3 bg-white rounded-lg p-3 border border-blue-100"
NEW: className="flex items-start space-x-3 bg-muted/40 rounded-lg p-3 border border-border/60"

LINE 27 — insight text (era text-blue-800, ilegível em dark):
OLD: <span className="text-sm text-blue-800 leading-relaxed">{insight}</span>
NEW: <span className="text-sm text-foreground leading-relaxed">{insight}</span>

LINE 33 — footer border:
OLD: <div className="mt-4 pt-4 border-t border-blue-200">
NEW: <div className="mt-4 pt-4 border-t border-border/50">

LINE 34 — footer text:
OLD: <div className="flex items-center justify-between text-xs text-blue-600">
NEW: <div className="flex items-center justify-between text-xs text-muted-foreground">
```

---

### 2.4 — PriceTargetCard.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/MLPredictions/PriceTargetCard.tsx`

```
LINE 10 — outer Card className:
OLD: <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
NEW: <Card className="border-green-500/20 bg-card">

LINE 14 — icon color:
OLD: <TrendingUp className="w-5 h-5 text-green-600" />
NEW: <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />

LINE 24 — price summary box:
OLD: className="bg-white rounded-lg p-4 border border-green-100"
NEW: className="bg-muted/40 rounded-lg p-4 border border-border/60"

LINE 27 — "Preço Atual" label:
OLD: <div className="text-sm text-gray-500">Preço Atual</div>
NEW: <div className="text-sm text-muted-foreground">Preço Atual</div>

LINE 31 — "Target IA" label:
OLD: <div className="text-sm text-gray-500">Target IA</div>
NEW: <div className="text-sm text-muted-foreground">Target IA</div>

LINE 35 — separator border:
OLD: className="mt-3 pt-3 border-t border-gray-100"
NEW: className="mt-3 pt-3 border-t border-border/50"

LINE 37 — "Upside Potencial" label:
OLD: <span className="text-sm text-gray-500">Upside Potencial</span>
NEW: <span className="text-sm text-muted-foreground">Upside Potencial</span>

LINES 51, 55, 58 — scenario labels:
OLD: <span className="text-gray-600">🔴 Pessimista</span>
NEW: <span className="text-muted-foreground">🔴 Pessimista</span>
(mesmo para "🟡 Base Case" e "🟢 Otimista" — replace_all)

LINE 71 — probability box:
OLD: className="bg-white rounded-lg p-3 border border-green-100"
NEW: className="bg-muted/40 rounded-lg p-3 border border-border/60"

LINE 73 — probability range label:
OLD: <span className="text-sm font-medium text-gray-700">{dist.range}</span>
NEW: <span className="text-sm font-medium text-foreground">{dist.range}</span>

LINE 76 — progress track (era bg-gray-200 — invisible em dark):
OLD: className="bg-gray-200 rounded-full h-2 relative overflow-hidden"
NEW: className="bg-muted rounded-full h-2 relative overflow-hidden"

LINE 89 — confidence box:
OLD: className="bg-white rounded-lg p-3 border border-green-100"
NEW: className="bg-muted/40 rounded-lg p-3 border border-border/60"

LINE 91 — confidence label:
OLD: <span className="text-sm text-gray-600">Confiança do Target</span>
NEW: <span className="text-sm text-muted-foreground">Confiança do Target</span>
```

---

### 2.5 — RiskAnalysisCard.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/MLPredictions/RiskAnalysisCard.tsx`

```
LINE 8 — outer Card className:
OLD: <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
NEW: <Card className="border-yellow-500/20 bg-card">

LINE 11 — icon color:
OLD: <Shield className="w-5 h-5 text-yellow-600" />
NEW: <Shield className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />

LINE 32 — risk item card:
OLD: className="bg-white rounded-lg p-4 border border-yellow-100 hover:shadow-md transition-shadow"
NEW: className="bg-muted/40 rounded-lg p-4 border border-border/60 hover:shadow-md hover:border-border transition-all"

LINE 35 — risk factor name:
OLD: <span className="font-semibold text-gray-800 text-sm">{risk.factor}</span>
NEW: <span className="font-semibold text-foreground text-sm">{risk.factor}</span>

LINE 43 — impact label:
OLD: <div className="text-xs text-gray-500">impacto no preço</div>
NEW: <div className="text-xs text-muted-foreground">impacto no preço</div>

LINE 44 — description text:
OLD: <p className="text-xs text-gray-600 leading-relaxed">{risk.description}</p>
NEW: <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>

LINE 52 — risk summary box:
OLD: className="mt-4 bg-white rounded-lg p-4 border border-yellow-100"
NEW: className="mt-4 bg-muted/40 rounded-lg p-4 border border-border/60"

LINE 54 — return label:
OLD: <span className="text-sm text-gray-600">Retorno Ajustado ao Risco</span>
NEW: <span className="text-sm text-muted-foreground">Retorno Ajustado ao Risco</span>
```

---

### 2.6 — SectorContextCard.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/MLPredictions/SectorContextCard.tsx`

```
LINE 24 — outer Card className:
OLD: <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
NEW: <Card className="border-indigo-500/20 bg-card">

LINE 28 — icon color:
OLD: <Building className="w-5 h-5 text-indigo-600" />
NEW: <Building className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />

LINES 39, 50, 54 — stat boxes (todas idênticas):
OLD: className="bg-white rounded-lg p-4 border border-indigo-100 text-center"
NEW: className="bg-muted/40 rounded-lg p-4 border border-border/60 text-center"
(usar replace_all: true)

LINES 40, 51, 55 — stat labels (todas "text-gray-500"):
OLD: <div className="text-sm text-gray-500">...</div>
NEW: <div className="text-sm text-muted-foreground">...</div>
(usar replace_all: true para "text-sm text-gray-500")

LINES 65-73 — key metric item boxes:
OLD: className="bg-white rounded p-2 border border-indigo-100 text-center"
NEW: className="bg-muted/40 rounded p-2 border border-border/60 text-center"

LINE 70 — metric label text:
OLD: <span className="text-xs text-gray-600">{metric}</span>
NEW: <span className="text-xs text-muted-foreground">{metric}</span>

LINES 83, 94 — comparison labels:
OLD: <span className="text-sm text-gray-600">Growth vs Setor</span>
OLD: <span className="text-sm text-gray-600">Ranking Geral</span>
NEW: <span className="text-sm text-muted-foreground">Growth vs Setor</span>
NEW: <span className="text-sm text-muted-foreground">Ranking Geral</span>

LINE 105 — empty state box:
OLD: className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center"
NEW: className="bg-muted/30 border border-border rounded-lg p-4 text-center"

LINE 106 — empty state text:
OLD: <p className="text-sm text-gray-600">📊 Dados do setor não disponíveis</p>
NEW: <p className="text-sm text-muted-foreground">📊 Dados do setor não disponíveis</p>
```

---

### 2.7 — ActionBar.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/MLPredictions/ActionBar.tsx`

```
LINE 28 — container:
OLD: className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
NEW: className="flex items-center justify-between bg-muted/30 rounded-lg p-4 border border-border/50"

LINE 29 — info text:
OLD: className="flex items-center space-x-2 text-sm text-gray-600"
NEW: className="flex items-center space-x-2 text-sm text-muted-foreground"
```

---

### 2.8 — FinHubScore.tsx (score indicator dot)

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/quickAnalysis/FinHubScore.tsx`

```
LINE 82 — score position indicator (bg-white quebraria em dark):
OLD: className="absolute top-1/2 -translate-y-1/2 z-20 size-3 rounded-full bg-white shadow-md ring-2 ring-background"
NEW: className="absolute top-1/2 -translate-y-1/2 z-20 size-3 rounded-full bg-background shadow-md ring-2 ring-border"
```

---

### 2.9 — PeersMiniTable.tsx (logo background)

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/quickAnalysis/PeersMiniTable.tsx`

```
LINE 52 — company logo image background:
OLD: className="size-8 rounded-lg object-contain bg-white shrink-0"
NEW: className="size-8 rounded-lg object-contain bg-muted shrink-0"
```

---

## Fase 3 — P0: Charts (Recharts theme-aware)

### 3.1 — Criar hook useChartColors

**Criar ficheiro:** `FinHub-Vite/src/hooks/useChartColors.ts`

```ts
import { useTheme } from 'next-themes'

export interface ChartColors {
  blue:      string
  green:     string
  amber:     string
  red:       string
  purple:    string
  cyan:      string
  teal:      string
  blueFill:  string
  greenFill: string
  amberFill: string
  redFill:   string
  grid:      string
  axis:      string
  tooltip: {
    bg:     string
    border: string
    text:   string
  }
}

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return {
    blue:      isDark ? '#60a5fa' : '#3b82f6',
    green:     isDark ? '#34d399' : '#10b981',
    amber:     isDark ? '#fbbf24' : '#f59e0b',
    red:       isDark ? '#f87171' : '#ef4444',
    purple:    isDark ? '#a78bfa' : '#8b5cf6',
    cyan:      isDark ? '#22d3ee' : '#06b6d4',
    teal:      isDark ? '#2dd4bf' : '#14b8a6',
    blueFill:  isDark ? 'rgba(96,165,250,0.18)' : 'rgba(59,130,246,0.12)',
    greenFill: isDark ? 'rgba(52,211,153,0.18)' : 'rgba(16,185,129,0.12)',
    amberFill: isDark ? 'rgba(251,191,36,0.18)' : 'rgba(245,158,11,0.12)',
    redFill:   isDark ? 'rgba(248,113,113,0.18)' : 'rgba(239,68,68,0.12)',
    grid:      isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    axis:      isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    tooltip: {
      bg:     isDark ? '#1e2535' : '#ffffff',
      border: isDark ? '#2d3a52' : '#e2e8f0',
      text:   isDark ? '#e2e8f0' : '#1a202c',
    },
  }
}
```

---

### 3.2 — Criar ChartTooltip component

**Criar ficheiro:** `FinHub-Vite/src/components/charts/ChartTooltip.tsx`

```tsx
import { useChartColors } from '@/hooks/useChartColors'

interface TooltipEntry {
  name: string
  value: number
  color: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  formatter?: (value: number, name: string) => string
}

export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  const colors = useChartColors()
  if (!active || !payload?.length) return null

  return (
    <div
      className="rounded-xl shadow-xl px-3 py-2.5 text-sm min-w-[120px]"
      style={{
        background: colors.tooltip.bg,
        border: `1px solid ${colors.tooltip.border}`,
        color: colors.tooltip.text,
      }}
    >
      {label && (
        <p className="text-xs text-muted-foreground mb-2 font-medium">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground text-xs">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-xs ml-auto pl-2">
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
```

Também exportar do barrel se existir `FinHub-Vite/src/components/charts/index.ts` — caso não exista, criar:
```ts
export { ChartTooltip } from './ChartTooltip'
```

---

### 3.3 — BalanceSheetChart.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/performance/BalanceSheetChart.tsx`

**Adicionar imports no topo:**
```ts
import { useChartColors } from '@/hooks/useChartColors'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
```

**Dentro do componente, antes do return, adicionar:**
```ts
const colors = useChartColors()
```

**Substituições:**
```
OLD: <CartesianGrid strokeDasharray="3 3" />
NEW: <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

OLD: <XAxis dataKey="year" />
NEW: <XAxis dataKey="year" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={{ stroke: colors.grid }} tickLine={false} />

OLD: <YAxis />
NEW: <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />

OLD: <Tooltip />
NEW: <Tooltip content={(props) => <ChartTooltip {...props} />} />

OLD: <Bar dataKey="assets" fill="#3b82f6" name="Ativos" />
NEW: <Bar dataKey="assets" fill={colors.blue} name="Ativos" radius={[3,3,0,0]} />

OLD: <Bar dataKey="liabilities" fill="#f59e0b" name="Passivos" />
NEW: <Bar dataKey="liabilities" fill={colors.amber} name="Passivos" radius={[3,3,0,0]} />

OLD: <Bar dataKey="equity" fill="#10b981" name="Património Líquido" />
NEW: <Bar dataKey="equity" fill={colors.green} name="Património Líquido" radius={[3,3,0,0]} />
```

---

### 3.4 — CashFlowChart.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/performance/CashFlowChart.tsx`

**Adicionar imports + `const colors = useChartColors()` (igual ao anterior)**

**Substituições:**
```
OLD: <CartesianGrid strokeDasharray="3 3" />
NEW: <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

OLD: <XAxis dataKey="year" />
NEW: <XAxis dataKey="year" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={{ stroke: colors.grid }} tickLine={false} />

OLD: <YAxis />
NEW: <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />

OLD: <Tooltip />
NEW: <Tooltip content={(props) => <ChartTooltip {...props} />} />

OLD: stroke="#10b981" fill="#6ee7b7"
NEW: stroke={colors.green} fill={colors.greenFill}

OLD: stroke="#ef4444" fill="#fecaca"
NEW: stroke={colors.red} fill={colors.redFill}

OLD: stroke="#3b82f6" fill="#bfdbfe"
NEW: stroke={colors.blue} fill={colors.blueFill}
```

---

### 3.5 — FinancialStatementsChart.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/performance/FinancialStatementsChart.tsx`

**Adicionar imports + `const colors = useChartColors()`**

**Substituições:**
```
OLD: <CartesianGrid strokeDasharray="3 3" />
NEW: <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

OLD: <XAxis dataKey="year" />
NEW: <XAxis dataKey="year" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={{ stroke: colors.grid }} tickLine={false} />

OLD: <YAxis />
NEW: <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />

OLD: <Tooltip />
NEW: <Tooltip content={(props) => <ChartTooltip {...props} />} />

OLD: stroke="#3b82f6" strokeWidth={2} name="Receita"
NEW: stroke={colors.blue} strokeWidth={2} name="Receita" dot={false} activeDot={{ r: 4 }}

OLD: stroke="#10b981" strokeWidth={2} name="EBITDA"
NEW: stroke={colors.green} strokeWidth={2} name="EBITDA" dot={false} activeDot={{ r: 4 }}

OLD: stroke="#f59e0b" strokeWidth={2} name="Lucro Líquido"
NEW: stroke={colors.amber} strokeWidth={2} name="Lucro Líquido" dot={false} activeDot={{ r: 4 }}
```

---

### 3.6 — ValueCreationChart.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/qualityAndRisk/ValueCreationChart.tsx`

**Adicionar imports + `const colors = useChartColors()`**

**Substituições:**
```
OLD: <CartesianGrid strokeDasharray="3 3" />
NEW: <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

OLD: <XAxis dataKey="year" />
NEW: <XAxis dataKey="year" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={{ stroke: colors.grid }} tickLine={false} />

OLD: <YAxis unit="%" />
NEW: <YAxis unit="%" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />

OLD: <Tooltip />
NEW: <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v}%`} />} />

OLD: stroke="#10b981" strokeWidth={2} dot={true} name="ROIC"
NEW: stroke={colors.green} strokeWidth={2} dot={{ fill: colors.green, r: 3 }} name="ROIC"

OLD: stroke="#ef4444" strokeWidth={2} dot={true} name="WACC"
NEW: stroke={colors.red} strokeWidth={2} dot={{ fill: colors.red, r: 3 }} name="WACC"
```

---

### 3.7 — ProfitVsDebtChart.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/qualityAndRisk/ProfitVsDebtChart.tsx`

**Adicionar imports + `const colors = useChartColors()`**

**Substituições:**
```
OLD: <XAxis dataKey="year" stroke="#8884d8" />
NEW: <XAxis dataKey="year" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={{ stroke: colors.grid }} tickLine={false} />

OLD: <YAxis />
NEW: <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />

OLD: <Tooltip />
NEW: <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v}%`} />} />

OLD: <Bar dataKey="roe" fill="#4ade80" name="ROE (%)" />
NEW: <Bar dataKey="roe" fill={colors.green} name="ROE (%)" radius={[3,3,0,0]} />

OLD: <Bar dataKey="debtRatio" fill="#f87171" name="Dívida/Capital" />
NEW: <Bar dataKey="debtRatio" fill={colors.red} name="Dívida/Capital" radius={[3,3,0,0]} />
```

Adicionar após `<YAxis`:
```
<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
```

---

### 3.8 — HistoricalMultiplesChart.tsx (+ Tooltip em falta)

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/valuation/HistoricalMultiplesChart.tsx`

**Adicionar imports + `const colors = useChartColors()`**

Adicionar também import de `Legend` se não existir: já existe.

**Substituições:**
```
OLD: <CartesianGrid strokeDasharray="3 3" />
NEW: <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />

OLD: <XAxis dataKey="year" />
NEW: <XAxis dataKey="year" tick={{ fill: colors.axis, fontSize: 11 }} axisLine={{ stroke: colors.grid }} tickLine={false} />

OLD: <YAxis />
NEW: <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />

OLD: <Tooltip />
NEW: <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v.toFixed(1)}x`} />} />
```

NOTA: este chart tinha `<Tooltip />` mas estava já importado — continua a funcionar, só muda para o custom.

```
OLD: <Line type="monotone" dataKey="pe" stroke="#3b82f6" name="P/E" />
NEW: <Line type="monotone" dataKey="pe" stroke={colors.blue} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="P/E" />

OLD: <Line type="monotone" dataKey="ps" stroke="#10b981" name="P/S" />
NEW: <Line type="monotone" dataKey="ps" stroke={colors.green} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="P/S" />

OLD: <Line type="monotone" dataKey="evEbitda" stroke="#f59e0b" name="EV/EBITDA" />
NEW: <Line type="monotone" dataKey="evEbitda" stroke={colors.amber} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="EV/EBITDA" />

OLD: <Line type="monotone" dataKey="pb" stroke="#ef4444" name="P/B" />
NEW: <Line type="monotone" dataKey="pb" stroke={colors.red} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="P/B" />
```

---

### 3.9 — EarningsSurpriseHistory.tsx

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/extras/EarningsSurpriseHistory.tsx`

**Adicionar imports + `const colors = useChartColors()`**

**Substituições:**
```
OLD: <XAxis dataKey="quarter" />
NEW: <XAxis dataKey="quarter" tick={{ fill: colors.axis, fontSize: 10 }} axisLine={{ stroke: colors.grid }} tickLine={false} />

OLD: <YAxis />
NEW: <YAxis tick={{ fill: colors.axis, fontSize: 11 }} axisLine={false} tickLine={false} />

OLD: <Tooltip formatter={(value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`} />
NEW: <Tooltip content={(props) => <ChartTooltip {...props} formatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`} />} />

OLD: <Bar dataKey="surprise" fill="#4ade80" />
NEW: <Bar dataKey="surprise" fill={colors.green} radius={[3,3,0,0]} />
```

Adicionar `<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />` após `<YAxis.../>`.

---

### 3.10 — PerformanceRadarChart.tsx (+ Tooltip em falta)

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/quickAnalysis/PerformanceRadarChart.tsx`

**Adicionar imports:**
```ts
import { Tooltip } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'
```

**Dentro do componente, adicionar:**
```ts
const colors = useChartColors()
```

**Substituições:**
```
OLD: className="flex flex-col items-center w-full sm:w-1/3 p-2"
NEW: className="flex flex-col items-center w-full p-2"

OLD: <PolarGrid strokeDasharray="3 3" />
NEW: <PolarGrid strokeDasharray="3 3" stroke={colors.grid} />

OLD: <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
NEW: <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: colors.axis }} />

OLD: <PolarRadiusAxis angle={30} domain={[0, 100]} tickCount={5} />
NEW: <PolarRadiusAxis angle={30} domain={[0, 100]} tickCount={5} tick={{ fontSize: 9, fill: colors.axis }} />

OLD: <Radar name="Desempenho" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} />
NEW: <Radar name="Desempenho" dataKey="value" stroke={colors.blue} fill={colors.blue} fillOpacity={0.25} />
```

**Adicionar `<Tooltip />` após `<PolarRadiusAxis.../>` e antes de `<Radar...>`:**
```tsx
<Tooltip
  content={(props) => <ChartTooltip {...props} formatter={(v) => `${v}/100`} />}
/>
```

---

### 3.11 — PeersRadarChart.tsx (cor HSL fixed → dinâmica)

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/detailedAnalysis/peers/PeersRadarChart.tsx`

**Adicionar imports:**
```ts
import { useChartColors } from '@/hooks/useChartColors'
```

**Dentro do componente, adicionar:**
```ts
const colors = useChartColors()

// Paleta de pares que adapta ao tema
const PEER_COLORS = [
  colors.blue,
  colors.green,
  colors.amber,
  colors.purple,
  colors.cyan,
]
```

**Substituições:**
```
OLD: <PolarGrid />
NEW: <PolarGrid stroke={colors.grid} />

OLD: <PolarAngleAxis dataKey="metric" />
NEW: <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: colors.axis }} />

OLD: <PolarRadiusAxis angle={30} domain={[0, 100]} />
NEW: <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: colors.axis }} />

OLD: stroke={`hsl(${(idx * 60) % 360}, 70%, 50%)`}
NEW: stroke={PEER_COLORS[idx % PEER_COLORS.length]}

OLD: fill={`hsl(${(idx * 60) % 360}, 70%, 50%)`}
NEW: fill={PEER_COLORS[idx % PEER_COLORS.length]}
```

---

## Fase 4 — P1: Visual Polish (premium feel)

### 4.1 — Card elevated hover state (global)

**Ficheiro:** `FinHub-Vite/src/styles/globals.css`
Adicionar em `@layer utilities`:
```css
/* Card interactivo com hover */
.card-interactive {
  @apply transition-all duration-200;
  @apply hover:shadow-md hover:border-border;
  @apply cursor-pointer;
}

/* Separador de secção com gradiente */
.section-divider {
  @apply h-px w-full bg-gradient-to-r from-transparent via-border to-transparent;
}

/* Spacing consistente entre secções */
.section-gap {
  @apply space-y-8 md:space-y-10;
}
```

---

### 4.2 — FinHubScore: Hero Treatment

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/quickAnalysis/FinHubScore.tsx`

O componente já está bem estruturado. Melhorias de polish:

```
LINE 36 — wrapper do card, adicionar animação subtil de entrada:
OLD: <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
NEW: <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 transition-shadow hover:shadow-md">

LINE 54 — score value, aumentar tamanho:
OLD: <span className={cn('text-3xl font-bold tabular-nums leading-none', color)}>{score}</span>
NEW: <span className={cn('text-4xl font-bold tabular-nums leading-none tracking-tight', color)}>{score}</span>
```

Adicionar condional background tint baseado no score (após o import de `cn`):
```ts
function scoreBg(score: number): string {
  if (score >= 70) return 'dark:bg-emerald-950/20'
  if (score >= 40) return ''
  return 'dark:bg-red-950/20'
}
```

Actualizar `LINE 36` para incluir o bg tint:
```tsx
<div className={cn(
  "rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 transition-shadow hover:shadow-md",
  scoreBg(score)
)}>
```

---

### 4.3 — Tipografia: tabular-nums nos valores financeiros

Auditar e adicionar `tabular-nums` (ou a classe `.tabular-nums` definida em 1.1) a:
- Todos os `text-2xl font-bold` que mostram valores numéricos
- Preços, percentagens, scores
- Já existe em `PeersMiniTable.tsx` e `FinHubScore.tsx` ✓

Ficheiros para verificar e adicionar:
- `EarningsCard.tsx` linha 41: `text-2xl font-bold text-green-600` → adicionar `tabular-nums`
- `ModelMetricsCard.tsx` linhas 26, 35: `text-2xl font-bold` → adicionar `tabular-nums`
- `SectorContextCard.tsx` linhas 46, 52, 56: `text-lg font-bold` → adicionar `tabular-nums`
- `PriceTargetCard.tsx` linhas 28, 32, 40: valores → adicionar `tabular-nums`

---

### 4.4 — Confidence Badges (REIT Toolkit — polish minor)

**Ficheiro:** `FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx`

Os ConfidenceBadge usam `border-emerald-500/40` etc. — já funcional. Para mais polish, adicionar fundo subtil:

Procurar o componente `ConfidenceBadge` dentro do ficheiro e actualizar as variantes:
```
OLD: 'high':    'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
NEW: 'high':    'border-emerald-500/40 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400'

OLD: 'medium':  'border-amber-500/40 text-amber-600 dark:text-amber-400'
NEW: 'medium':  'border-amber-500/40 bg-amber-500/8 text-amber-600 dark:text-amber-400'

OLD: 'low':     'border-red-500/40 text-red-600 dark:text-red-400'
NEW: 'low':     'border-red-500/40 bg-red-500/8 text-red-600 dark:text-red-400'
```

(Ler o ficheiro primeiro para confirmar as strings exactas antes de editar)

---

## Fase 5 — P2: Padrões Premium a Implementar

### 5.1 — DataFreshness Component (stale data indicator)

**Criar:** `FinHub-Vite/src/components/ui/DataFreshness.tsx`

```tsx
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'

interface DataFreshnessProps {
  updatedAt?: Date | string | null
  className?: string
}

export function DataFreshness({ updatedAt, className }: DataFreshnessProps) {
  const isRecent = updatedAt
    ? (new Date().getTime() - new Date(updatedAt).getTime()) < 5 * 60 * 1000
    : false

  return (
    <span className={cn('text-xs text-muted-foreground flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          isRecent ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
        )}
      />
      {updatedAt
        ? isRecent
          ? 'Ao vivo'
          : `Atualizado ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: pt })}`
        : 'Dados em cache'
      }
    </span>
  )
}
```

---

### 5.2 — SparklineChart Component (para listas)

**Criar:** `FinHub-Vite/src/components/charts/SparklineChart.tsx`

```tsx
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'

interface SparklineChartProps {
  data: number[]
  positive?: boolean
  width?: number
  height?: number
}

export function SparklineChart({ data, positive = true, width = 64, height = 28 }: SparklineChartProps) {
  const colors = useChartColors()
  const chartData = data.map((value, i) => ({ i, value }))
  const color = positive ? colors.green : colors.red

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Adicionar ao barrel `FinHub-Vite/src/components/charts/index.ts`:
```ts
export { SparklineChart } from './SparklineChart'
```

---

### 5.3 — Command Palette (Cmd+K) global

shadcn `Command` já está instalado. Ligar à navegação global:

**Criar:** `FinHub-Vite/src/components/ui/CommandPalette.tsx`

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { TrendingUp, Building2, LineChart, BookOpen } from 'lucide-react'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar ticker, REIT, criador, ferramenta..." />
      <CommandList>
        <CommandEmpty>Sem resultados.</CommandEmpty>
        <CommandGroup heading="Ferramentas">
          <CommandItem onSelect={() => runCommand(() => navigate('/markets/stocks'))}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Análise de Stocks
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/markets/reits'))}>
            <Building2 className="mr-2 h-4 w-4" />
            REIT Toolkit
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/fire'))}>
            <LineChart className="mr-2 h-4 w-4" />
            Simulador FIRE
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/learn'))}>
            <BookOpen className="mr-2 h-4 w-4" />
            Aprender
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

**Em `FinHub-Vite/src/layouts/MainLayout.tsx`** (ou equivalente), adicionar dentro do JSX:
```tsx
import { CommandPalette } from '@/components/ui/CommandPalette'
// ...
<CommandPalette />
```

Adicionar hint no Header para descoberta:
```tsx
<kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
  ⌘K
</kbd>
```

---

## Fase 6 — P3: Quick Analysis — Hierarquia de 3 Níveis

### 6.1 — Estrutura alvo do QuickAnalysis

**Ficheiro:** `FinHub-Vite/src/features/tools/stocks/components/quickAnalysis/QuickAnalysis.tsx`

Ler o ficheiro primeiro para verificar a estrutura actual. O target é:

```
┌─────────────────────────────────────────────┐
│  HERO STRIP (full width, bg-card elevado)   │
│  Ticker + Nome + Setor | Score 78/100       │
│  Preço $187.45 ▲ 2.3%  | Classificação     │
├─────────────────────────────────────────────┤
│  MIDDLE (2 cols desktop, 1 col mobile)      │
│  [Radar Chart]  | [Top 4 métricas com bench]│
├─────────────────────────────────────────────┤
│  DETAIL (tabs ou accordion)                 │
│  Valuation | Qualidade | Crescimento | ...  │
└─────────────────────────────────────────────┘
```

**Nota:** Implementação requer ler o componente completo primeiro. Não fazer alterações cegas.

---

## Fase 7 — P3: Framer Motion (micro-animações)

### 7.1 — Instalar

```bash
cd FinHub-Vite && npm install framer-motion
```

### 7.2 — Page transitions

**Ficheiro:** `FinHub-Vite/src/layouts/MainLayout.tsx`

Envolver o `<Outlet />` (ou equivalente de render de páginas):
```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

// Dentro do componente:
const location = useLocation()

// No JSX:
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```

### 7.3 — Stagger nos metric rows

Para qualquer lista de métricas (ex: indicadores no QuickAnalysis):
```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } }
}

// JSX:
<motion.div variants={container} initial="hidden" animate="show">
  {metrics.map(m => (
    <motion.div key={m.key} variants={item}>
      <MetricRow {...m} />
    </motion.div>
  ))}
</motion.div>
```

---

## Verificação Final

### Checklist por fase

**Fase 1 (P0 Fundações):**
- [ ] Inter carregada e visível na app (inspecionar font-family no browser DevTools)
- [ ] Dark mode mais escuro — `#0F1117` aproximado
- [ ] `market-bull` e `market-bear` disponíveis como classes Tailwind
- [ ] Headings sem `text-gray-900` hardcoded

**Fase 2 (P0 MLPredictions):**
- [ ] Alternar light/dark — todos os 6 cards visíveis em ambos os temas
- [ ] Sem `bg-white` nos cards da secção ML
- [ ] Gradientes removidos dos card backgrounds

**Fase 3 (P0 Charts):**
- [ ] `useChartColors` hook criado e sem erros TS
- [ ] `ChartTooltip` component criado
- [ ] Alternar light/dark com um chart visível — cores mudam
- [ ] Tooltips personalizados em todos os charts
- [ ] `PerformanceRadarChart` e `HistoricalMultiplesChart` agora têm Tooltip ✓

**TS check limpo:**
```bash
cd FinHub-Vite && npx tsc --noEmit --project tsconfig.app.json
# Target: 0 novos erros (os ~175 pré-existentes em admin/auth são aceitáveis)
```

---

## Notas para o Agente

1. **Ler sempre antes de editar** — os números de linha são aproximados. Confirmar o `old_string` exacto antes de fazer Edit.
2. **replace_all: true** quando a mesma string aparece múltiplas vezes no mesmo ficheiro.
3. **Não alterar** lógica de negócio, apenas classes CSS e props de styling.
4. **Referência de padrão:** `ReitsToolkitPage.tsx` — se tiver dúvidas sobre como deve ficar, comparar com este ficheiro.
5. **Framer Motion (Fase 7)** só instalar se a app ainda não tiver — verificar `package.json` primeiro.
6. **Commit por fase** — uma fase de cada vez para facilitar rollback se necessário.

---

*Criado: 2026-03-15*
*Referência: `dcos/P8_UI_UX_ELEVACAO.md` (estratégia), `dcos/P8_UI_UX_IMPLEMENTACAO_TECNICA.md` (este ficheiro — execução)*
