# TASK PACKET — FIRE Frontend Integration com Endpoints Existentes

**ID:** TASK_FIRE_ENDPOINTS_INTEGRATION
**Data Criação:** 2026-03-17
**Versão:** 1.0
**Status:** Actionable (Pronto para execução)
**Prioridade:** 1 (Máxima)

---

## 📋 Resumo Executivo

Decomposição em sub-tarefas atómicas para **integração total do frontend FIRE aos endpoints existentes no backend**. 

### Contexto
- Backend P5-FIRE já entregue: `/api/portfolio/*` endpoints completos com simulação, whatIf e Monte Carlo
- Frontend FIRE parcialmente implementado em `FinHub-Vite` (routes, componentes, mas ligações incompletas)
- Task: validar e completar todas as ligações frontend ↔ backend, garantindo fluxo end-to-end funcional

### Objetivo Final
Frontend FIRE completamente funcional com:
- ✅ CRUD de portfolios e holdings integrado aos endpoints
- ✅ Simulação whatIf + Monte Carlo renderizada corretamente
- ✅ Light/dark mode suportado
- ✅ Sem erros TypeScript novos introduzidos
- ✅ Validações tecnicas todas a passar

---

## 🎯 Sub-Tarefas Atómicas (Ordered by Dependency)

### **FASE 1: Setup e Diagnóstico**

---

#### **1.1 — Validar Estado Inicial do Projeto**

**Nome:** `FIRE-Setup-01-Diagnosis`  
**Descrição:** Verificar estado dos repos, branches, ficheiros sujos, e confirmar que backend está pronto.

**Ficheiros a ler (não editar):**
- `API_finhub/.git/config` → confirmar remote backend
- `FinHub-Vite/.git/config` → confirmar remote frontend
- `API_finhub/src/controllers/portfolio.controller.ts` (primeiras 50 linhas) → confirmar endpoints existem
- `API_finhub/src/models/Portfolio.ts` → confirmar schema completo
- `API_finhub/dcos/regras.md` → checkout de Retoma

**Critérios de Aceitação:**
- [ ] Backend: `git status` limpo em `API_finhub/main`
- [ ] Frontend: `git status` limpo em `FinHub-Vite/master`
- [ ] Último commit backend funcional identificado (esperado: `bbca1f5` ou posterior)
- [ ] Último commit frontend funcional identificado (esperado: `241abc3` ou posterior)
- [ ] Endpoints portfolio confirmados: POST/GET/PATCH/DELETE `/api/portfolio*`
- [ ] Endpoint simulação confirmado: POST `/api/portfolio/:id/simulate`
- [ ] Modelos Portfolio + PortfolioHolding confirmados com todos os campos

**Dependências:** Nenhuma (primeiro passo)  
**Esforço estimado:** 0.5h  
**Bloqueia:** Todas as sub-tarefas seguintes

---

#### **1.2 — Mapear Estrutura Frontend FIRE Existente**

**Nome:** `FIRE-Setup-02-Map-Frontend`  
**Descrição:** Explorar estrutura de componentes, páginas e rotas FIRE em FinHub-Vite.

**Ficheiros a ler (não editar):**
- `FinHub-Vite/src/features/fire/` → estrutura de componentes/páginas
- `FinHub-Vite/src/features/fire/pages/FireSimulatorPage.tsx` → página principal
- `FinHub-Vite/src/routes/` → definição de rotas `/ferramentas/fire/*`
- `FinHub-Vite/src/services/` → se existem services/API helpers para FIRE
- `FinHub-Vite/package.json` → deps (confirmar Recharts, React Query, etc.)

**Critérios de Aceitação:**
- [ ] Estrutura de pastas documentada (fire/components, fire/pages, fire/hooks)
- [ ] Rotas `/ferramentas/fire`, `/ferramentas/fire/portfolio`, `/ferramentas/fire/simulador` confirmadas
- [ ] Componentes principais identificados (Portfolio manager, Simulator, Dashboard)
- [ ] Serviços/API clients identificados (ou documentar falta)
- [ ] Dependencies verificadas (Recharts, Tailwind, shadcn/ui)
- [ ] Ficheiros com tipos TypeScript (.tsx) confirmados

**Dependências:** 1.1  
**Esforço estimado:** 0.5h  
**Bloqueia:** FASE 2 (implementação de ligações)

---

### **FASE 2: Integração Backend ↔ Frontend (Orden Lógica)**

---

#### **2.1 — Criar/Validar Service de API (Portfolio Client)**

**Nome:** `FIRE-Integration-01-API-Service`  
**Descrição:** Criar ou validar service de cliente HTTP para chamar endpoints `/api/portfolio/*`.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/services/portfolioApiClient.ts` (CRIAR se não existir)
  - Funções: `createPortfolio()`, `getPortfolios()`, `getPortfolioById()`, `updatePortfolio()`, `deletePortfolio()`
  - Funções: `addHolding()`, `updateHolding()`, `deleteHolding()`
  - Função: `simulatePortfolio(params)` ← **crítica**
  - Base URL: ler de env ou config
  - Auth: incluir header `Authorization: Bearer <token>` (usar React Query/Axios interceptors)
  - Error handling: try-catch com mensagens user-friendly

**Critérios de Aceitação:**
- [ ] Ficheiro `portfolioApiClient.ts` existe e exporta todas as funções acima
- [ ] URLs estão corretas (ex: `POST /api/portfolio`, `POST /api/portfolio/:id/simulate`)
- [ ] Headers incluem `Content-Type: application/json` e `Authorization`
- [ ] Função `simulatePortfolio()` aceita params: `{ scenarios, maxYears, whatIf?, monteCarlo?, ... }`
- [ ] Resposta parseada corretamente (JSON → tipada)
- [ ] Error handling: captura erros 401/403/500 e loga
- [ ] `npm run typecheck` passa para este ficheiro

**Dependências:** 1.1, 1.2  
**Esforço estimado:** 1.5h  
**Bloqueia:** 2.2, 2.3, 2.4, 2.5

---

#### **2.2 — Hook React para Portfolio CRUD (usePortfolio)**

**Nome:** `FIRE-Integration-02-Portfolio-Hook`  
**Descrição:** Criar hook customizado com estado e operações de portfolio (listar, criar, atualizar, eliminar).

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/hooks/usePortfolio.ts` (CRIAR)
  - Retorna: `{ portfolios, loading, error, createPortfolio(), getPortfolioById(), updatePortfolio(), deletePortfolio() }`
  - Usa React Query para caching e refetch automático
  - Sincroniza estado local com servidor após mutações

**Critérios de Aceitação:**
- [ ] Hook exportado e usa React Query `useQuery` + `useMutation`
- [ ] Estado: `portfolios[]`, `loading`, `error`, `selectedPortfolio`
- [ ] Métodos: `createPortfolio(name, config)`, `getPortfolioById(id)`, `updatePortfolio(id, updates)`, `deletePortfolio(id)`
- [ ] Refetch automático após mutação bem-sucedida
- [ ] Tipos TypeScript completos (interfaces para Portfolio, PortfolioHolding)
- [ ] `npm run typecheck` passa

**Dependências:** 2.1  
**Esforço estimado:** 1.5h  
**Bloqueia:** 2.3, 2.4, 3.1, 3.2

---

#### **2.3 — Hook React para Simulação (usePortfolioSimulation)**

**Nome:** `FIRE-Integration-03-Simulation-Hook`  
**Descrição:** Hook para executar e gerenciar simulação FIRE (whatIf + Monte Carlo).

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/hooks/usePortfolioSimulation.ts` (CRIAR)
  - Retorna: `{ simulationResult, loading, error, runSimulation(params) }`
  - Params incluem: `{ scenarios, maxYears, whatIf?, monteCarlo? }`
  - Cacheia resultado de simulação (5min TTL)
  - Usa React Query para loading/error states

**Critérios de Aceitação:**
- [ ] Hook exportado e usa React Query `useQuery` + `useMutation`
- [ ] `runSimulation(params)` chama `portfolioApiClient.simulatePortfolio()`
- [ ] `simulationResult` tipado com resposta completa do backend
- [ ] `loading` e `error` refletem estado HTTP
- [ ] Cache TTL = 5 minutos (evita re-executar simulação igual imediatamente)
- [ ] TypeScript sem erros
- [ ] `npm run typecheck` passa

**Dependências:** 2.1  
**Esforço estimado:** 1.5h  
**Bloqueia:** 3.3, 3.4, 3.5

---

#### **2.4 — Hook React para Holdings CRUD (usePortfolioHoldings)**

**Nome:** `FIRE-Integration-04-Holdings-Hook`  
**Descrição:** Hook para gerenciar holdings (ativos) de um portfolio.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/hooks/usePortfolioHoldings.ts` (CRIAR)
  - Retorna: `{ holdings, loading, error, addHolding(), updateHolding(), deleteHolding() }`
  - Trabalha com um portfolio selecionado (passa `portfolioId`)

**Critérios de Aceitação:**
- [ ] Hook exportado e usa React Query
- [ ] Métodos: `addHolding(portfolioId, data)`, `updateHolding(portfolioId, holdingId, updates)`, `deleteHolding(portfolioId, holdingId)`
- [ ] Estado sincronizado com servidor
- [ ] Refetch automático após mutação
- [ ] TypeScript sem erros
- [ ] `npm run typecheck` passa

**Dependências:** 2.1  
**Esforço estimado:** 1h  
**Bloqueia:** 3.2

---

#### **2.5 — Context/State Provider para Portfolio (FireContext)**

**Nome:** `FIRE-Integration-05-Fire-Context`  
**Descrição:** Context React para compartilhar estado FIRE entre componentes (portfolio selecionado, simulação atual).

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/context/FireContext.tsx` (CRIAR)
  - Exports: `FireProvider`, `useFireContext`
  - Estado: `{ selectedPortfolio, simulationResult, activeTab }`
  - Ações: `setSelectedPortfolio()`, `setSimulationResult()`

**Critérios de Aceitação:**
- [ ] Context criado e exportado
- [ ] Provider wraps aplicação ou seção FIRE
- [ ] Hook `useFireContext()` acessível em componentes
- [ ] TypeScript tipado completamente
- [ ] `npm run typecheck` passa

**Dependências:** 2.2  
**Esforço estimado:** 0.5h  
**Bloqueia:** 3.1, 3.2, 3.3

---

### **FASE 3: Componentes de UI (Renderização)**

---

#### **3.1 — Página Portfolio Manager**

**Nome:** `FIRE-Components-01-Portfolio-Manager-Page`  
**Descrição:** Página `/ferramentas/fire/portfolio` com tabela de portfolios + form de criar/editar.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/pages/PortfolioManagerPage.tsx` (CRIAR/VALIDAR)
  - Secções:
    1. **Listar portfolios:** tabela com colunas (Nome, Moeda, Holdings, Valor Total, Ação [Edit/Delete])
    2. **Form criar portfolio:** modal ou inline com campos (Nome, Moeda, FIRE target method, expenses/income/target, etc.)
    3. **Form editar portfolio:** reutilizavel
  - Usa `usePortfolio()` hook
  - Usa `FireContext` para selecionar portfolio
  - Design: shadow cards, Tailwind + shadcn/ui componentes

**Critérios de Aceitação:**
- [ ] Página renderiza lista de portfolios
- [ ] Botão "+ Novo Portfolio" abre form
- [ ] Form tem campos: nome, moeda, FIRE target (com radio buttons de método)
- [ ] Submit cria portfolio via API
- [ ] Ação "Editar" preenche form com dados atuais
- [ ] Ação "Eliminar" pede confirmação
- [ ] Mensagens success/error (toast)
- [ ] Light/dark mode: usa CSS variables (`bg-card`, `border-border`, etc.)
- [ ] Sem hardcodes de cores (`bg-white`, `text-gray-900`)
- [ ] `npm run typecheck` passa
- [ ] Responsive (mobile OK)

**Dependências:** 2.2, 2.5  
**Esforço estimado:** 2h  
**Bloqueia:** 3.2

---

#### **3.2 — Componente Holdings Manager (Tabela + Form)**

**Nome:** `FIRE-Components-02-Holdings-Manager`  
**Descrição:** Tabela de holdings (ativos) dentro de portfolio + form de adicionar/editar ativo.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/components/HoldingsTable.tsx` (CRIAR)
  - Tabela com colunas: Ticker, Tipo, Qtd, Preço Médio, Valor Total, Alocação Mensal, Ação [Edit/Delete]
  - Form inline ou modal para add/edit
  - Usa `usePortfolioHoldings()` hook
  - Auto-fetch de dados de mercado (ticker → nome, preço atual, dividend yield)

**Ficheiros a criar/editar (adicional):**
- `FinHub-Vite/src/features/fire/components/HoldingForm.tsx` (CRIAR)
  - Campos: ticker (autocomplete com FMP search), tipo (dropdown), shares, average cost, monthly allocation
  - Valida: ticker deve existir, shares > 0, average cost > 0

**Critérios de Aceitação:**
- [ ] Tabela renderiza todos holdings do portfolio selecionado
- [ ] Botão "+ Adicionar Ativo" abre form
- [ ] Form autocomplete de tickers (usa API FMP ou lista hardcoded)
- [ ] Form valida inputs (required, números positivos)
- [ ] Submit adiciona holding via API
- [ ] Ação "Editar" preenche form
- [ ] Ação "Eliminar" pede confirmação
- [ ] Preço atual + yield mostrados como info (read-only)
- [ ] Toast success/error após mutação
- [ ] Light/dark mode OK
- [ ] `npm run typecheck` passa
- [ ] Responsive

**Dependências:** 2.4, 2.5  
**Esforço estimado:** 2.5h  
**Bloqueia:** 3.3

---

#### **3.3 — Painel Simulador (Form de Entrada)**

**Nome:** `FIRE-Components-03-Simulator-Controls`  
**Descrição:** Form/painel de entrada para simulação: escolha de cenários, whatIf controls, Monte Carlo enable/simulations.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/components/SimulatorControls.tsx` (CRIAR)
  - Checkboxes: cenários (optimistic, base, conservative, bear)
  - Input: maxYears (default 40)
  - Toggle: DRIP (reinvestimento de dividendos)
  - Secção whatIf:
    - Input: contributionDelta (€, slider ou input)
    - Input: annualReturnShock (%)
    - Input: inflationShock (%)
  - Secção Monte Carlo:
    - Toggle: enabled
    - Input: simulations (default 1000, slider 100-5000)
  - Botão "Executar Simulação"

**Critérios de Aceitação:**
- [ ] Todos os inputs acima presentes
- [ ] Valores padrão sensatos (base scenario, maxYears=40, DRIP=true, MC=1000 sims)
- [ ] Validação: simulations ≥ 100 e ≤ 5000
- [ ] Botão desabilitado enquanto `loading` = true
- [ ] Click em "Executar Simulação" chama `usePortfolioSimulation().runSimulation(params)`
- [ ] Toast "Calculando..." enquanto loading
- [ ] Light/dark mode OK
- [ ] `npm run typecheck` passa
- [ ] Responsive (sliders adaptem-se a mobile)

**Dependências:** 2.3, 2.5  
**Esforço estimado:** 2h  
**Bloqueia:** 3.4, 3.5

---

#### **3.4 — Painel Resultado Simulação (Tabela + Gráfico)**

**Nome:** `FIRE-Components-04-Simulation-Results`  
**Descrição:** Render de `simulationResult` com tabela de cenários e gráfico evolução.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/components/SimulationResultsTable.tsx` (CRIAR)
  - Tabela: coluna por cenário (optimistic, base, conservative)
  - Linhas:
    - Tempo até FIRE (anos e meses)
    - Data FIRE projetada
    - Total investido
    - Valor final portfolio
    - Rendimento passivo/mês (se aplicável)
    - Ganho total %
  - Destaca melhor/pior cenário visualmente

- `FinHub-Vite/src/features/fire/components/PortfolioEvolutionChart.tsx` (CRIAR)
  - Gráfico: Area chart ou Line chart com Recharts
  - Eixo X: anos (0-40)
  - Eixo Y: valor portfolio (€)
  - 3 linhas: otimista, base, conservador
  - Marca ponto onde cada uma cruza target FIRE
  - Tooltip mostra valores ao hover
  - Legenda clara

**Critérios de Aceitação:**
- [ ] Tabela renderiza todos cenários da resposta backend
- [ ] Valores formatados corretamente (datas, euros, %)
- [ ] Gráfico Recharts renderiza sem erros
- [ ] Gráfico responsivo (redimensiona com container)
- [ ] Legenda clara
- [ ] Cores diferenciam cenários (verde otimista, azul base, laranja conservador)
- [ ] Light/dark mode: cores adaptem-se a theme
- [ ] `npm run typecheck` passa
- [ ] Sem hardcodes de cores

**Dependências:** 2.3  
**Esforço estimado:** 2.5h  
**Bloqueia:** 3.5

---

#### **3.5 — Painel whatIf (Comparativo Visual)**

**Nome:** `FIRE-Components-05-WhatIf-Comparison`  
**Descrição:** Render comparativo whatIf: baseline vs ajustado, com deltas destacadas.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/components/WhatIfComparison.tsx` (CRIAR)
  - Layout: 2 colunas (Baseline | Ajustado) OU toggle left/right
  - Cards informativos com:
    - Tempo até FIRE (meses/anos)
    - Valor final portfolio
    - Rendimento passivo/mês
  - Secção Delta:
    - "Impacto da mudança:"
    - -X meses
    - +€Y no valor final
    - Visualização de barra (mostra redução/aumento em %)

**Critérios de Aceitação:**
- [ ] Componente renderiza `simulationResult.whatIf` (baseline, adjusted, delta)
- [ ] Layout 2 colunas ou toggle funciona
- [ ] Deltas calculados corretamente: `adjusted - baseline`
- [ ] Destaque visual para delta (cor, ícone, size)
- [ ] Cards visualmente distintos (baseline = neutro, adjusted = destaque)
- [ ] Light/dark mode OK
- [ ] `npm run typecheck` passa
- [ ] Responsive

**Dependências:** 2.3  
**Esforço estimado:** 1.5h  
**Bloqueia:** 3.6

---

#### **3.6 — Painel Monte Carlo (Curva de Probabilidade + Percentis)**

**Nome:** `FIRE-Components-06-Monte-Carlo-Panel`  
**Descrição:** Render de Monte Carlo: curva anual + percentis P10/P50/P90, com destaque success probability.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/components/MonteCarloChart.tsx` (CRIAR)
  - Gráfico: Line chart com Recharts
  - Eixo X: anos (0-40)
  - Eixo Y: probabilidade % (0-100%)
  - 1 linha: `timelineSuccessProbability` (probabilidade acumulada ao longo do tempo)
  - Tooltip mostra: "Em X anos, Y% de probabilidade"
  - Sombrear area abaixo da linha (visual appeal)

- `FinHub-Vite/src/features/fire/components/MonteCarloStats.tsx` (CRIAR)
  - Card grande: `successProbabilityPct` em número grande (font-size 3xl) com contexto
    - "68.4% de probabilidade de atingir FIRE em X anos com este cenário"
  - Cards menores para percentis (P10/P25/P50/P75/P90):
    - "P10: 96 meses" (tempo mais otimista)
    - "P50: 126 meses" (mediana)
    - "P90: 180 meses" (tempo mais pessimista)
  - Também mostrar percentis de valor final se backend devolver

**Critérios de Aceitação:**
- [ ] Gráfico renderiza `timelineSuccessProbability` sem erros
- [ ] Curva mostra aumento suave de probabilidade ao longo dos anos
- [ ] Tooltip funciona ao hover
- [ ] Stats cards mostram `successProbabilityPct` em destaque
- [ ] Percentis formatados como meses/anos (ex: "P50: 10a 6m")
- [ ] Cores: linha em tom positivo (verde/azul)
- [ ] Light/dark mode OK
- [ ] `npm run typecheck` passa
- [ ] Responsive

**Dependências:** 2.3  
**Esforço estimado:** 2h  
**Bloqueia:** Nenhuma (última UI)

---

#### **3.7 — Página Simulador Unificada (Integrar Componentes)**

**Nome:** `FIRE-Components-07-Simulator-Page-Unified`  
**Descrição:** Página `/ferramentas/fire/simulador` que integra todos os componentes acima num fluxo coerente.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/pages/FireSimulatorPage.tsx` (VALIDAR/COMPLETAR)
  - Layout:
    1. **Header:** "Simulador FIRE" + seletor de portfolio (dropdown)
    2. **Seção esquerda:** SimulatorControls (form de entrada)
    3. **Seção direita/abaixo:** Tabs com:
       - Tab "Resultado": SimulationResultsTable + PortfolioEvolutionChart
       - Tab "What-If": WhatIfComparison
       - Tab "Monte Carlo": MonteCarloChart + MonteCarloStats
    4. **Footer:** info sobre suposições, atualização, etc.

  - UX Flow:
    - User seleciona portfolio
    - Preenche SimulatorControls (cenários, whatIf, MC)
    - Click "Executar Simulação"
    - Tabs preenchem-se com resultados
    - User pode alternar entre tabs para explorar

**Critérios de Aceitação:**
- [ ] Página renderiza com seletor de portfolio funcional
- [ ] Tabs renderizam componentes corretos
- [ ] Fluxo UX: controles → execução → resultados é claro
- [ ] Loading state: spinner enquanto `usePortfolioSimulation.loading === true`
- [ ] Error state: mensagem clara se simulação falhar
- [ ] Light/dark mode em toda a página
- [ ] Sem hardcodes de cores
- [ ] `npm run typecheck` passa
- [ ] Responsive (tabs adaptam-se a mobile)

**Dependências:** 3.3, 3.4, 3.5, 3.6  
**Esforço estimado:** 1.5h  
**Bloqueia:** 4.1 (testes end-to-end)

---

#### **3.8 — Dashboard FIRE (KPIs e Progresso)**

**Nome:** `FIRE-Components-08-FIRE-Dashboard`  
**Descrição:** Página `/ferramentas/fire/dashboard` com KPIs de progresso, gráfico composição, insights.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/pages/FireDashboardPage.tsx` (CRIAR)
  - Seções:
    1. **KPI Cards:** Progress para FIRE (%), valor atual vs target, tempo estimado
    2. **Gráfico composição:** Donut/pie chart com % por ativo ou por tipo
    3. **Milestones:** Timeline visual (10%, 25%, 50%, 75%, Coast FIRE, FIRE)
    4. **Insights:** Alertas (concentração, yield gap, diversificação)

**Critérios de Aceitação:**
- [ ] Dashboard renderiza com dados do portfolio selecionado
- [ ] KPI cards mostram valores formatados corretamente
- [ ] Gráfico composição (Donut) renderiza com Recharts
- [ ] Milestones timeline visual
- [ ] Insights renderizam com ícones/cores (✓ OK, ⚠️ aviso, ❌ erro)
- [ ] Light/dark mode OK
- [ ] `npm run typecheck` passa
- [ ] Responsive

**Dependências:** 2.2, 2.5  
**Esforço estimado:** 2h  
**Bloqueia:** Nenhuma (adicional, não crítica para P5)

---

### **FASE 4: Testes e Validação**

---

#### **4.1 — Testes End-to-End (E2E) no Simulador**

**Nome:** `FIRE-Validation-01-E2E-Tests`  
**Descrição:** Validar fluxo completo: criar portfolio → add holdings → simular → validar resultados contra backend.

**Ficheiros a criar/editar:**
- `FinHub-Vite/src/features/fire/tests/simulatorE2E.test.ts` (CRIAR com Playwright ou Vitest)
  - Teste 1: Create portfolio
  - Teste 2: Add 3 holdings (VWCE, AAPL, BTC)
  - Teste 3: Run simulation (base scenario)
  - Teste 4: Verify results table populates
  - Teste 5: Toggle whatIf and verify delta renders
  - Teste 6: Toggle Monte Carlo and verify success probability renders
  - Teste 7: Dark mode toggle and verify colors adapt

**Critérios de Aceitação:**
- [ ] Todos os 7 testes passam
- [ ] Não há falsos positivos (testes estáveis)
- [ ] Teste 4: valores na tabela formatados corretamente (datas, euros)
- [ ] Teste 5: delta negativo para menos contribuição
- [ ] Teste 6: curva de probabilidade renderiza
- [ ] Teste 7: cores mudam visualmente com dark mode
- [ ] `npm run test` passa
- [ ] Coverage > 70% para componentes FIRE

**Dependências:** 3.7, 3.5, 3.6  
**Esforço estimado:** 2.5h  
**Bloqueia:** 4.2

---

#### **4.2 — TypeScript e Validações Técnicas**

**Nome:** `FIRE-Validation-02-TypeScript-Build`  
**Descrição:** Correr validações TypeScript, build, lint no frontend e confirmar sem novos erros.

**Comandos a executar:**
```bash
# Frontend (FinHub-Vite)
cd FinHub-Vite
npm run typecheck:p1  # ou npx tsc --noEmit --project tsconfig.app.json
npm run lint          # ESLint
npm run build         # Vite build

# Backend (API_finhub)
cd ../API_finhub
npm run typecheck
npm run test:docs:smoke
```

**Critérios de Aceitação:**
- [ ] Frontend `npm run typecheck` não tem erros novos (permitido pre-existentes)
- [ ] Frontend `npm run lint` passa (ou documenta exceções)
- [ ] Frontend `npm run build` sucede sem warnings críticos
- [ ] Backend `npm run typecheck` passa 100%
- [ ] Backend `npm run test:docs:smoke` passa
- [ ] Commit hash de cada repo registado
- [ ] Nenhum ficheiro sujo em `git status`

**Dependências:** 3.7 (última alteração frontend)  
**Esforço estimado:** 1h  
**Bloqueia:** 4.3

---

#### **4.3 — Light/Dark Mode Validation**

**Nome:** `FIRE-Validation-03-Theme-Compliance`  
**Descrição:** Validar que todos componentes FIRE respeitem CSS variables e não têm hardcodes de cor.

**Ficheiros a validar:**
- Todos em `FinHub-Vite/src/features/fire/components/*.tsx`
- Todos em `FinHub-Vite/src/features/fire/pages/*.tsx`

**Critérios de Aceitação:**
- [ ] Nenhum hardcode de color: `bg-white`, `text-gray-900`, `border-gray-100`
- [ ] Todas as cores usam CSS variables: `bg-card`, `text-foreground`, `border-border`, etc.
- [ ] Visual test em light mode: cores legíveis, contraste adequado
- [ ] Visual test em dark mode: cores legíveis, contraste adequado
- [ ] Toggle dark mode no browser → FIRE componentes adaptam cores
- [ ] Documentar se alguma cor não pode ser adaptada (e porquê)

**Dependências:** 3.1-3.8  
**Esforço estimado:** 1h  
**Bloqueia:** 4.4

---

#### **4.4 — Documentação Final e Handoff**

**Nome:** `FIRE-Validation-04-Docs-and-Handoff`  
**Descrição:** Atualizar documentação FIRE, criar ficheiro de handoff, limpar repos.

**Ficheiros a criar/editar:**
- `API_finhub/dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md`
  - Secção "Frontend Integration" atualizada com:
    - Ficheiros criados (lista de .tsx)
    - Hooks criados (lista de custom hooks)
    - Testes E2E documentados
    - Validações executadas
- `API_finhub/dcos/regras.md` → Checkpoint de Retoma atualizado
  - Data de fecho
  - Último commit de ambos os repos
  - Próximo passo recomendado
- Ficheiro de handoff: `.project-agent-bridge/outbox/result-TASK_FIRE_ENDPOINTS.md`
  - Resumo do que foi entregue
  - Ficheiros alterados
  - Validações executadas
  - Riscos/pendências
  - Próximo passo

**Critérios de Aceitação:**
- [ ] `P5_FIRE_PORTFOLIO_SIMULATOR.md` atualizado com secção "Frontend Integration"
- [ ] Todos os ficheiros `.tsx` criados/alterados listados
- [ ] Hooks e context documentados
- [ ] Testes E2E documentados
- [ ] `regras.md` Checkpoint de Retoma preenchido com data, commits, estado
- [ ] Ficheiro de handoff criado em `.project-agent-bridge/outbox/`
- [ ] Nenhum ficheiro sujo em `git status`
- [ ] Commit final: `feat(p5-fire): complete frontend endpoint integration`

**Dependências:** 4.1, 4.2, 4.3  
**Esforço estimado:** 1.5h  
**Bloqueia:** Nenhuma (fecho)

---

## 📊 Matriz de Dependências

```
FASE 1: Setup
  1.1 (Diagnóstico)
    ↓
  1.2 (Map Frontend)

FASE 2: Integração Backend ↔ Frontend
  2.1 (API Service) ← 1.1, 1.2
    ↓
  2.2 (Portfolio Hook) ← 2.1
    ├─→ 2.3 (Simulation Hook) ← 2.1
    ├─→ 2.4 (Holdings Hook) ← 2.1
    └─→ 2.5 (Fire Context) ← 2.2

FASE 3: UI Components
  3.1 (Portfolio Manager) ← 2.2, 2.5
    ↓
  3.2 (Holdings Manager) ← 2.4, 2.5
    ↓
  3.3 (Simulator Controls) ← 2.3, 2.5
    ├─→ 3.4 (Results Table) ← 2.3
    ├─→ 3.5 (whatIf Comp) ← 2.3
    └─→ 3.6 (MC Panel) ← 2.3
    ↓
  3.7 (Simulator Page) ← 3.3, 3.4, 3.5, 3.6
    ↓
  3.8 (Dashboard) ← 2.2, 2.5

FASE 4: Testes e Validação
  4.1 (E2E Tests) ← 3.7, 3.5, 3.6
    ↓
  4.2 (TypeScript) ← 3.7
    ↓
  4.3 (Theme Validation) ← 3.1-3.8
    ↓
  4.4 (Docs + Handoff) ← 4.1, 4.2, 4.3
```

---

## ⏱️ Estimativa Total de Esforço

| Fase | Subtotal | Observações |
|------|----------|-----------|
| **FASE 1: Setup** | 1h | Diagnóstico + exploração |
| **FASE 2: Integração** | 6.5h | 2.1 (1.5h) + 2.2 (1.5h) + 2.3 (1.5h) + 2.4 (1h) + 2.5 (0.5h) |
| **FASE 3: UI Components** | 14h | 3.1 (2h) + 3.2 (2.5h) + 3.3 (2h) + 3.4 (2.5h) + 3.5 (1.5h) + 3.6 (2h) + 3.7 (1.5h) + 3.8 (2h) |
| **FASE 4: Testes** | 5.5h | 4.1 (2.5h) + 4.2 (1h) + 4.3 (1h) + 4.4 (1.5h) |
| **TOTAL** | **27h** | ~3.5 dias de trabalho focado (6+ horas/dia) |

---

## 🎯 Critérios de Sucesso (Definition of Done - Global)

Quando toda a tarefa estiver completa:

- ✅ Todas as sub-tarefas nas colunas 1.1-4.4 estão marcadas `[x] Concluído`
- ✅ Nenhum erro TypeScript novo introduzido (backend 100%, frontend sem novos erros no FIRE)
- ✅ Frontend FIRE renderiza corretamente em light mode
- ✅ Frontend FIRE renderiza corretamente em dark mode
- ✅ Todas as cores usam CSS variables (sem hardcodes)
- ✅ Fluxo end-to-end testado: portfolio → holdings → simulação → resultados
- ✅ whatIf e Monte Carlo renderizam corretamente
- ✅ Testes E2E passam
- ✅ Documentação FIRE atualizada
- ✅ `git status` limpo em ambos os repos
- ✅ Commit final criado: `feat(p5-fire): complete frontend endpoint integration`
- ✅ Ficheiro de handoff preenchido e entregue em `.project-agent-bridge/outbox/`

---

## 📝 Notas de Execução

### Para o Desenvolvedor/Agente:

1. **Siga a ordem de dependências:** A matriz acima garante que cada sub-tarefa só começa quando suas dependências estão prontas.
2. **Teste após cada tarefa:** Não deixe para testar tudo no final. Valide componentes isolados.
3. **Commit intermédio:** A cada FASE (ou a cada 3 sub-tarefas), faça commit com mensagem clara.
4. **Crie branches curtas:** Para cada componente ou hook, considere uma branch feature que depois integra.
5. **Comunique bloqueios:** Se encontrar erro de API ou contrato inesperado, pare e documente.
6. **Reutilize padrões existentes:** FinHub-Vite já tem padrões de hooks, context, components. Mantenha consistência.

### Para o Revisor/CTO:

1. **Validar FASE 1 primeiro:** Setup e diagnóstico são críticos. Sem eles, resto fica incerto.
2. **Code review por FASE:** Revisar FASE 2 depois de pronto, FASE 3 depois de pronto, etc.
3. **Validar TypeScript antes de merge:** `npm run typecheck` deve ser clean antes de PR aceito.
4. **Validar theme compliance:** Random sample de 3-5 componentes em light/dark mode.
5. **Testar fluxo end-to-end:** Criar portfolio com holdings reais, simular, explorar tabs whatIf/MC.

---

## 🔗 Referências

- **Especificação FIRE:** `dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md`
- **Regras Operacionais:** `dcos/regras.md`
- **Audiotira de Execução:** `dcos/audiotira_04.md`
- **Endpoint Backend:** `API_finhub/src/routes/portfolio.routes.ts`
- **Models Backend:** `API_finhub/src/models/Portfolio.ts`, `PortfolioHolding.ts`
- **Controller Backend:** `API_finhub/src/controllers/portfolio.controller.ts`
- **Padrões Frontend Existentes:** `FinHub-Vite/src/features/markets/` (referência de arquitetura)
- **Componentes shadcn/ui:** https://ui.shadcn.com/

---

## ✅ Checklist de Entrega Final

Antes de marcar como concluído:

- [ ] Todas as 18 sub-tarefas têm `[x]` marcado nos critérios de aceitação
- [ ] Nenhum TODO ou FIXME deixado no código
- [ ] Commit final feito e push realizado em ambos os repos
- [ ] Ficheiro de handoff criado e preenchido
- [ ] Documentação sincronizada (P5_FIRE_PORTFOLIO_SIMULATOR.md + regras.md)
- [ ] Todos os ficheiros `.tsx` criados têm imports organizados
- [ ] Nenhum erro de ESLint criado (pré-existentes OK)
- [ ] Visual test em light + dark mode completado
- [ ] E2E tests rodaram com sucesso
- [ ] CTO/Revisor revisou e aprovou

---

## 📞 Contacto / Escalação

Se durante execução encontrar:
- **Erro na API backend:** Verificar logs em `API_finhub` e endpoint `/api/portfolio/:id/simulate`
- **Erro TypeScript:** Validar tipos em `portfolio.controller.ts` resposta vs tipos esperados no frontend
- **Erro de CSS/Theme:** Verificar `FinHub-Vite/src/styles/globals.css` para definições de CSS variables
- **Erro de Hook/Context:** Validar que `FireProvider` wraps toda a aplicação FIRE

---

**Documento criado:** 2026-03-17  
**Versão:** 1.0  
**Estado:** Actionable — Pronto para execução imediata  
**Próximo passo:** Iniciar FASE 1, sub-tarefa 1.1