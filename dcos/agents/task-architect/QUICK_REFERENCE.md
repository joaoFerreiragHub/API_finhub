# QUICK REFERENCE — FIRE Endpoints Task Packet

**Para consulta rápida durante desenvolvimento.**

---

## 📍 Onde Começar?

1. **LEI PRIMEIRO:** `TASK_PACKET_FIRE_ENDPOINTS.md` (secção "Resumo Executivo")
2. **DEPOIS:** `README_FIRE_ENDPOINTS.md` (instruções práticas)
3. **EM DÚVIDA:** Este ficheiro (quick answers)
4. **DETALHES:** Volta a `TASK_PACKET_FIRE_ENDPOINTS.md` seção específica

---

## ⏱️ Ordem de Execução (TL;DR)

```
1.1 (Diagnóstico)
  ↓
1.2 (Map frontend)
  ↓
2.1 (API client)
  ↓ ↓ ↓ ↓
2.2 2.3 2.4 2.5 (Hooks + Context — podem ser paralelos)
  ↓
3.1 (Portfolio Manager)
  ↓
3.2 (Holdings Manager)
  ↓
3.3, 3.4, 3.5, 3.6 (Componentes — paralelos OK)
  ↓
3.7 (Simulator Page)
  ↓
3.8 (Dashboard — opcional, não bloqueia)
  ↓
4.1, 4.2, 4.3, 4.4 (Testes + Validação)
```

---

## 📁 Ficheiros a Criar (Checklist)

```
FASE 2:
[ ] src/services/portfolioApiClient.ts
[ ] src/features/fire/hooks/usePortfolio.ts
[ ] src/features/fire/hooks/usePortfolioSimulation.ts
[ ] src/features/fire/hooks/usePortfolioHoldings.ts
[ ] src/features/fire/context/FireContext.tsx

FASE 3:
[ ] src/features/fire/pages/PortfolioManagerPage.tsx
[ ] src/features/fire/components/HoldingsTable.tsx
[ ] src/features/fire/components/HoldingForm.tsx
[ ] src/features/fire/components/SimulatorControls.tsx
[ ] src/features/fire/components/SimulationResultsTable.tsx
[ ] src/features/fire/components/PortfolioEvolutionChart.tsx
[ ] src/features/fire/components/WhatIfComparison.tsx
[ ] src/features/fire/components/MonteCarloChart.tsx
[ ] src/features/fire/components/MonteCarloStats.tsx
[ ] src/features/fire/pages/FireSimulatorPage.tsx (completar)
[ ] src/features/fire/pages/FireDashboardPage.tsx
[ ] src/features/fire/tests/simulatorE2E.test.ts

TOTAL: 18 ficheiros
```

---

## 🔌 API Endpoints Que Vais Chamar

```bash
# Portfolio CRUD
POST   /api/portfolio                    — criar
GET    /api/portfolio                    — listar
GET    /api/portfolio/:id                — detalhe
PATCH  /api/portfolio/:id                — atualizar
DELETE /api/portfolio/:id                — eliminar

# Holdings CRUD
POST   /api/portfolio/:id/holdings       — adicionar
PATCH  /api/portfolio/:id/holdings/:hid  — atualizar
DELETE /api/portfolio/:id/holdings/:hid  — eliminar

# Simulação (CRÍTICA)
POST   /api/portfolio/:id/simulate       — executa simulação whatIf + MC
```

---

## 🎛️ Request/Response Simulate (Exemplo)

```javascript
// REQUEST:
POST /api/portfolio/abc123/simulate
{
  "scenarios": ["optimistic", "base", "conservative"],
  "maxYears": 40,
  "whatIf": {
    "scenario": "base",
    "contributionDelta": 200,
    "annualReturnShock": 0.01,
    "inflationShock": 0.005
  },
  "monteCarlo": {
    "enabled": true,
    "scenario": "base",
    "simulations": 1000
  }
}

// RESPONSE (simplificado):
{
  "scenarios": [
    { "scenario": "optimistic", "monthsToFire": 95, "timeline": [...] },
    { "scenario": "base", "monthsToFire": 122, "timeline": [...] }
  ],
  "whatIf": {
    "baseline": { "monthsToFire": 122 },
    "adjusted": { "monthsToFire": 108 },
    "delta": { "monthsToFire": -14 }
  },
  "monteCarlo": {
    "successProbabilityPct": 68.4,
    "monthsToFirePercentiles": { "p10": 96, "p50": 126, "p90": 180 },
    "timelineSuccessProbability": [
      { "years": 5, "probabilityPct": 12.3 },
      { "years": 10, "probabilityPct": 54.8 }
    ]
  }
}
```

---

## 🧪 Comando de Teste Rápido

```bash
# Valida que backend está rodando + endpoint responde
curl -X POST http://localhost:3000/api/portfolio/test-id/simulate \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "scenarios": ["base"],
    "monteCarlo": { "enabled": false }
  }'
```

---

## 🎨 CSS Variables a Usar (Sem Hardcodes!)

```css
/* Light mode — automático, NOT hardcoded */
--background         /* fundo da página */
--foreground         /* texto principal */
--card              /* fundo de cards */
--border            /* bordercolor */
--input             /* background inputs */
--text-muted-foreground  /* texto secundário */
--primary           /* cor CTA (botões, links destaque) */
--destructive       /* cor delete/erro */
--success           /* cor OK/positivo */
--warning           /* cor aviso */

/* Em dark mode, estas mudam automaticamente */
/* Basta usar: bg-card, text-foreground, border-border */
```

---

## 🛠️ Dependências que Já Existem

```json
{
  "react-query": "^3.x",       // ← Para useQuery, useMutation
  "recharts": "^2.x",          // ← Para gráficos
  "shadcn/ui": "latest",       // ← Componentes UI
  "tailwindcss": "^3.x"        // ← Estilos
}
```

**Não precisa instalar nada novo!**

---

## 🚀 Validação Rápida (Por Tarefa)

| Tarefa | Comando | Esperado |
|--------|---------|----------|
| **2.1** | `npm run typecheck` | PASS, sem erros novos |
| **2.2-2.5** | `npm run typecheck` | PASS |
| **3.1-3.8** | `npm run typecheck` | PASS (erros pré-existentes ignorados) |
| **3.x Color** | Comparar screenshot light vs dark mode | cores adaptam-se |
| **4.1** | `npm run test` | E2E tests PASS |
| **4.2** | `npm run build` | sucede sem warnings críticos |

---

## 📋 Template Hook usePortfolio (Exemplo Rápido)

```typescript
// src/features/fire/hooks/usePortfolio.ts
import { useQuery, useMutation } from 'react-query'
import { portfolioApiClient } from '@/services/portfolioApiClient'

export function usePortfolio() {
  const { data: portfolios, isLoading, error } = useQuery(
    'portfolios',
    () => portfolioApiClient.listPortfolios()
  )

  const createMutation = useMutation(
    (data) => portfolioApiClient.createPortfolio(data),
    { onSuccess: () => { /* refetch */ } }
  )

  return {
    portfolios,
    loading: isLoading,
    error,
    createPortfolio: createMutation.mutate
  }
}
```

---

## 🎛️ Template Componente UI (Exemplo Rápido)

```typescript
// src/features/fire/components/SimulatorControls.tsx
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SimulatorControls() {
  const [contribution, setContribution] = useState(200)

  return (
    <div className="bg-card border border-border rounded-lg p-4 text-foreground">
      <label>Contribuição extra (€)</label>
      <Input
        type="number"
        value={contribution}
        onChange={(e) => setContribution(Number(e.target.value))}
        className="bg-input border-border"
      />
      <Button className="bg-primary text-white">Executar Simulação</Button>
    </div>
  )
}
```

**Nota:** Usa `bg-card`, `border-border`, `text-foreground` — automaticamente adapta light/dark mode!

---

## 🐛 Troubleshooting Rápido

**"npm run typecheck falha"**
→ Verifica se tipos do backend batem com tipos frontend
→ `API_finhub/src/controllers/portfolio.controller.ts` linha X

**"Componente não renderiza"**
→ `console.log(simulationResult)` para ver dados
→ Se undefined, simulação não executou — check hook loading state

**"Dark mode cores não mudam"**
→ Verifica se usaste CSS class names corretos: `bg-card` não `bg-white`
→ Sem hardcodes! Ctrl+F por `bg-white`, `text-gray`, etc.

**"Gráfico Recharts branco"**
→ Verifica `<ResponsiveContainer>` wrapper
→ Valores nos dados devem ser números, não strings

---

## 📝 Commit Message Template (Por FASE)

```
feat(p5-fire): phase X — <descrição curta>

Phase X: <Nome FASE>

Subtasks:
- X.Y: <Nome>
- X.Z: <Nome>

Changed files:
- src/...

Validations: npm run typecheck PASS, tests PASS
```

---

## ✅ Pre-Submit Checklist (Antes de PR)

- [ ] `npm run typecheck` PASS (novos erros = BLOCKER)
- [ ] `npm run lint` PASS ou documented exceptions
- [ ] Light mode: cores legíveis, UI alinhado
- [ ] Dark mode: cores legíveis (toggle no browser)
- [ ] Nenhum `console.log()` deixado no código
- [ ] Nenhum `TODO` ou `FIXME` sem resolver
- [ ] Ficheiros temos imports organizados
- [ ] git status limpo (nada sujo)

---

## 🎯 Quick Estimation (Para PM)

| Tarefa | Tempo | Paralelo? |
|--------|-------|-----------|
| 1.1-1.2 | 1h | Não (blocking) |
| 2.1 | 1.5h | Não (blocking) |
| 2.2-2.5 | 4.5h | ✅ Sim (pode fazer os 4 em paralelo) |
| 3.1-3.8 | 14h | ✅ Sim (alguns podem ser paralelos) |
| 4.1-4.4 | 5.5h | ✅ Sim (tests + docs em paralelo) |
| **TOTAL** | **27h** | **Pode ser ~18h com paralelização** |

---

## 🔗 Links Úteis

- Task packet completo: `TASK_PACKET_FIRE_ENDPOINTS.md`
- Instruções: `README_FIRE_ENDPOINTS.md`
- Spec FIRE: `dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md`
- Endpoints: `API_finhub/src/routes/portfolio.routes.ts`
- Padrões: `FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx`

---

## 🚨 CRITICAL GATES (Não Ignore!)

❌ **Não merge sem:**
1. `npm run typecheck` PASS (sem novos erros)
2. E2E tests PASS (FASE 4.1)
3. Light/dark mode visual check (FASE 4.3)
4. Code review approval

✅ **After merge:**
1. QA testa em navegador real
2. Performance check portfolio grande
3. Data seeding test com dados reais

---

## 📞 Stuck? Try This:

1. **Lê README_FIRE_ENDPOINTS.md seção "Problemas Comuns"**
2. **Abre `TASK_PACKET_FIRE_ENDPOINTS.md` em search (Ctrl+F)**
3. **Procura por "Task X.Y" — vê acceptance criteria**
4. **Compara código com referência: `ReitsToolkitPage.tsx`**
5. **Test com curl comando no "Validação Rápida" seção acima**

---

**Version:** 1.0  
**Last Updated:** 2026-03-17  
**Status:** ✅ Ready

Boa sorte! 🚀
