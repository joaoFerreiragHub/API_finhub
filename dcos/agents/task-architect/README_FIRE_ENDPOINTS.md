# README — TASK_PACKET_FIRE_ENDPOINTS

## 📋 Quick Start

Este diretório contém o **task packet decomposição atómica** para a tarefa:
> **"Ligar o frontend FIRE aos endpoints existentes"**

### Ficheiros Principais

1. **`TASK_PACKET_FIRE_ENDPOINTS.md`** — Decomposição completa em formato markdown
   - 18 sub-tarefas atómicas
   - Dependências mapeadas
   - Critérios de aceitação detalhados
   - Estimativas de esforço
   - Instruções de execução

2. **`TASK_PACKET_FIRE_ENDPOINTS.json`** — Mesma informação em JSON (para parse automático)
   - Estrutura machine-readable
   - Para integração com CI/CD ou ferramentas de rastreio
   - Útil para dashboards de progresso

3. **`README_FIRE_ENDPOINTS.md`** — Este ficheiro (instruções de uso)

---

## 🎯 Como Usar Este Task Packet

### Para Desenvolvedores

1. **Leia primeiro:** `TASK_PACKET_FIRE_ENDPOINTS.md` — Secções "Resumo Executivo" + "Sub-Tarefas Atómicas"
2. **Entenda as dependências:** Consulte a "Matriz de Dependências" — mostra ordem de execução
3. **Comece pela FASE 1:** Setup + Diagnóstico (1h)
4. **Siga a ordem:** Cada tarefa só começa quando suas dependências estão prontas
5. **Marque progresso:** Tick os `[x]` nos "Critérios de Aceitação" conforme completa
6. **Commit após cada FASE:** Evita perder trabalho, facilita code review
7. **Teste frequentemente:** Valide componentes isolados, não deixe para o final

### Para Code Reviewers

1. **Valide FASE 1 primeiro:** Setup é crítico, sem ele tudo pode estar mal
2. **Review FASE 2:** Hooks e serviços → core da integração backend ↔ frontend
3. **Review FASE 3:** Componentes → validar design system compliance (CSS variables, light/dark mode)
4. **Validate FASE 4:** Testes + TypeScript → garante qualidade técnica
5. **Check checklist final:** Veja secção "✅ Checklist de Entrega Final" no markdown

### Para Project Managers / Orchestradores

1. **Esforço total:** 27 horas (~3.5 dias de desenvolvimento focado)
2. **Milestones críticos:**
   - FASE 1 completa (1h) — Go/No-Go para FASE 2
   - FASE 2 completa (6.5h) — Hooks prontos, pode começar componentes
   - FASE 3 completa (14h) — UI pronta para testes
   - FASE 4 completa (5.5h) — Entrega final
3. **Riscos principais:**
   - Contrato API diferente do esperado → pode bloquear FASE 2
   - TypeScript errors pré-existentes → não bloqueia, mas complicam FASE 4
   - Theme compliance → requer validação visual, não automática
4. **Comunicação:** Ficheiro de handoff será criado em `.project-agent-bridge/outbox/result-TASK_FIRE_ENDPOINTS.md`

---

## 📊 Estrutura de Dependências (Simplificada)

```
FASE 1: Setup (1h)
    ↓
FASE 2: Integração (6.5h)
    → API Service (2.1)
    → 3 Hooks: Portfolio, Simulation, Holdings (2.2, 2.3, 2.4)
    → Context (2.5)
    ↓
FASE 3: UI Components (14h)
    → 8 Componentes: Portfolio Manager, Holdings Manager, Controls, Results, whatIf, MC, Page, Dashboard
    → Podem ser paralelos entre eles (exceto UI principal que vem por último)
    ↓
FASE 4: Testes (5.5h)
    → E2E Tests (2.5h)
    → TypeScript Validation (1h)
    → Theme Compliance (1h)
    → Docs + Handoff (1.5h)
```

---

## 🔧 Comandos Essenciais

Ao longo da execução, vais usar estes comandos:

### Frontend (FinHub-Vite)

```bash
# Validar TypeScript
npm run typecheck:p1
# ou
npx tsc --noEmit --project tsconfig.app.json

# Lint
npm run lint

# Build
npm run build

# Testes
npm run test

# Dev server (para testar componentes)
npm run dev
```

### Backend (API_finhub)

```bash
# Validar TypeScript
npm run typecheck

# Smoke test de docs
npm run test:docs:smoke

# Confirmar endpoints estão disponíveis
curl -X GET http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer <token>"
```

---

## 📝 Template de Commit por FASE

Quando fechar cada FASE, usa este padrão:

```
feat(p5-fire): phase <N> complete — <descrição>

Phase <N>: <Nome da FASE>

Subtasks completed:
- <ID>: <Nome>
- <ID>: <Nome>
- ...

Files created/modified:
- FinHub-Vite/src/features/fire/...
- FinHub-Vite/src/services/...

Validations:
- npm run typecheck: PASS
- Light/dark mode: PASS
- E2E tests (if applicable): PASS

Blocking issues: None
```

---

## ⚠️ Problemas Comuns e Soluções

| Problema | Causa Provável | Solução |
|----------|-------------|---------|
| `npm run typecheck` falha com "Property 'X' does not exist" | Tipo de resposta API não bate | Verificar response em `API_finhub/src/controllers/portfolio.controller.ts` e update tipos em frontend |
| Componentes não renderizam cores em dark mode | CSS variables não definidas | Verificar `FinHub-Vite/src/styles/globals.css` para `--background`, `--foreground`, etc. |
| Simulação não executa (erro 401) | Token expirado ou não enviado | Verificar `portfolioApiClient.ts` headers Authorization |
| Gráficos Recharts não renderizam | Dados malformados | Console.log `simulationResult` e verifica formato esperado |
| Form de portfolio não submete | Hook `usePortfolio()` não encontrado | Confirmar que ficheiro `.ts` está em `hooks/` e exportado |

---

## 🎓 Referências de Código Existente

Para manter consistência com o resto do projeto, usa estes padrões como referência:

| Padrão | Referência no FinHub-Vite |
|--------|---------------------------|
| Custom hooks com React Query | `src/hooks/useMarkets.ts`, `src/hooks/useSearch.ts` |
| Context Provider | `src/context/ThemeContext.tsx` (para referência de padrão) |
| Componentes com shadcn/ui | `src/features/markets/components/*.tsx` |
| API Client (fetch + auth) | `src/services/stockApiClient.ts` |
| Charts com Recharts | `src/features/markets/components/MarketCharts.tsx` |
| Light/Dark mode CSS variables | `src/styles/globals.css` |
| Form validation | `src/features/markets/components/SearchForm.tsx` |

---

## ✅ Pre-Execution Checklist

Antes de iniciar, confirma:

- [ ] Backend `API_finhub` está em branch `main` e git status é limpo
- [ ] Frontend `FinHub-Vite` está em branch `master` e git status é limpo
- [ ] Ambos os repos têm as dependências instaladas (`npm install`)
- [ ] Consegues fazer curl num endpoint FIRE: `GET /api/portfolio` (com token válido)
- [ ] `npm run typecheck` passes em ambos os repos (mesmo com erros pré-existentes)
- [ ] Tens editor com TypeScript support aberto (VS Code recomendado)
- [ ] Entendeste a "Matriz de Dependências" na secção anterior

---

## 📞 Support / Escalação

Se encontrar **bloqueadores durante execução:**

1. **Erro de API:** Verifica resposta real de `/api/portfolio/:id/simulate` em Postman/curl
2. **Erro TypeScript:** Copia mensagem exata e procura em `src/controllers/portfolio.controller.ts`
3. **Erro visual:** Screenshot em light + dark mode e compara com referência em `ReitsToolkitPage.tsx`
4. **Erro de hook:** Valida que Provider está no topo da árvore (`pages/` que wraps toda a app FIRE)

---

## 🚀 Próximos Passos (After Task Complete)

Após conclusão bem-sucedida deste task packet:

1. **Validação visual:** QA testa simulador em navegador real (não só typecheck)
2. **Performance:** Se portfolio muito grande (50+ holdings) testar latência simulação
3. **Data:** Criar alguns cenários teste com dados reais (portfólio exemplo do demo)
4. **Documentação:** Redigir user guide para ferramenta FIRE (como usar simulador)
5. **Bugs P2:** Passar para os 3 bugs críticos: crypto market cap, ETF overlap, watchlist batching

---

## 📚 Estrutura Ficheiros Criados (Overview)

```
FinHub-Vite/src/
├── features/fire/
│   ├── pages/
│   │   ├── PortfolioManagerPage.tsx       [3.1]
│   │   ├── FireSimulatorPage.tsx          [3.7] (completar)
│   │   └── FireDashboardPage.tsx          [3.8]
│   ├── components/
│   │   ├── HoldingsTable.tsx              [3.2]
│   │   ├── HoldingForm.tsx                [3.2]
│   │   ├── SimulatorControls.tsx          [3.3]
│   │   ├── SimulationResultsTable.tsx     [3.4]
│   │   ├── PortfolioEvolutionChart.tsx    [3.4]
│   │   ├── WhatIfComparison.tsx           [3.5]
│   │   ├── MonteCarloChart.tsx            [3.6]
│   │   └── MonteCarloStats.tsx            [3.6]
│   ├── hooks/
│   │   ├── usePortfolio.ts                [2.2]
│   │   ├── usePortfolioSimulation.ts      [2.3]
│   │   └── usePortfolioHoldings.ts        [2.4]
│   ├── context/
│   │   └── FireContext.tsx                [2.5]
│   └── tests/
│       └── simulatorE2E.test.ts           [4.1]
└── services/
    └── portfolioApiClient.ts              [2.1]
```

---

## 🎯 Success Criteria (Final Validation)

Task packet é **considerado bem-sucedido** quando:

✅ Todas 18 sub-tarefas completadas  
✅ Nenhum erro TypeScript novo no frontend FIRE  
✅ Todos 4 testes de validação FASE 4 PASSAM  
✅ Documentação atualizada  
✅ Ficheiro de handoff criado  
✅ CTO/Revisor aprova  

---

**Data Criação:** 2026-03-17  
**Versão:** 1.0  
**Status:** Ready for Execution

Boa sorte! 🚀
