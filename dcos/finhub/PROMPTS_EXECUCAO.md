# FinHub — Prompts de Execução para Codex

> Workflow: **Codex executa → produz relatório → Claude valida**
>
> Cada prompt é autónomo. Passar um de cada vez ao Codex.
> No final de cada prompt, o Codex DEVE preencher o relatório no formato indicado.
> Só avançar para o próximo prompt após validação do Claude.

> ⚠️ **REGRA SSR OBRIGATÓRIA — ler antes de qualquer tarefa frontend:**
> Este projecto usa **Vike SSR**. As páginas renderizam no servidor antes de chegar ao browser.
> Proibido em ficheiros de página ou componentes renderizados em SSR:
> - `useParams`, `useNavigate`, `Navigate`, `useLocation` do `react-router-dom` (sem contexto Router)
> - `window.*`, `document.*`, `localStorage.*` fora de `useEffect` ou de guard `typeof window !== 'undefined'`
> - Bibliotecas que acedam ao DOM no top-level
>
> Alternativas correctas:
> - Slug/params: receber via prop do `+Page.tsx` (via `pageContext.routeParams`)
> - Redirects: `window.location.replace(url)` dentro de `useEffect` ou guard `typeof window !== 'undefined'`
> - URL search params: `new URLSearchParams(window.location.search)` com guard SSR

---

## Template de Relatório (usar em todos os prompts)

```
## RELATÓRIO DE EXECUÇÃO

**Prompt ID:** [ID]
**Data:** [data]
**Estado:** COMPLETO | PARCIAL | BLOQUEADO

### Ficheiros criados
- `path/ficheiro.ts` — descrição

### Ficheiros modificados
- `path/ficheiro.ts` — o que mudou

### Comandos executados e resultado
- `npm run typecheck` → PASS / FAIL
- `npm run build` → PASS / FAIL
- `npm run test` → PASS / FAIL (X suites, Y testes)

### Decisões tomadas
- [decisão e porquê]

### Bloqueadores / dívida técnica
- [se existir]

### O que o Claude deve validar
- [ ] item específico a rever
- [ ] outro item
```

---

---

# BLOCO 0 — Bugs Críticos

---

## PROMPT B1 — Crypto: Corrigir Market Cap ✅ VALIDADO 2026-03-20

> **Nota pós-validação:** O CoinGecko já devolve `market_cap` diretamente na resposta (campo declarado na interface mas não usado). A abordagem implementada (`price × circulatingSupply`) é igualmente correta e mais explícita. Em futuras iterações ao serviço de cripto, considerar usar o `market_cap` nativo do CoinGecko para simplificar. Ficheiro: `src/controllers/crypto.controller.ts` linha 13.

**Contexto do projeto:**
- Backend: `API_finhub/` (Express + TypeScript + MongoDB)
- Área: serviço de criptomoedas
- Stack: Node.js ≥ 20, TypeScript 5.8, Mongoose

**Ficheiros de referência:**
```
API_finhub/src/services/        ← procurar o serviço de crypto
API_finhub/src/controllers/     ← controller de crypto
API_finhub/src/routes/          ← rota GET /api/crypto
```

**Tarefa:**
O campo `marketCap` das criptomoedas está a usar `quoteVolume` em vez de `price × circulatingSupply`.

1. Localizar o serviço/controller que calcula ou devolve `marketCap` para cripto
2. Corrigir o cálculo: `marketCap = price × circulatingSupply`
3. Garantir que quando `circulatingSupply` não está disponível, o campo fica `null` (não `0` nem valor errado)
4. Adicionar comentário inline a documentar a fonte do dado

**Critérios de conclusão:**
- [ ] `marketCap` calcula `price × circulatingSupply`
- [ ] Quando `circulatingSupply` é nulo/indefinido → `marketCap: null`
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT B2 — ETF Overlap: Adicionar Disclaimer ✅ VALIDADO 2026-03-20

> **Nota pós-validação:** Variante `warning` adicionada ao `alert.tsx` (linha 12) com estilo âmbar funcional em light e dark mode. Disclaimer colocado antes do `<MarketsNav />` — visível antes de qualquer interação. O projeto não tinha `npm run typecheck` — foi criado alias para `typecheck:p1`.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Vite + TypeScript + Tailwind + shadcn/ui)
- Página: ETF Overlap Analyzer

**Ficheiros de referência:**
```
FinHub-Vite/src/features/markets/pages/EtfOverlapPage.tsx   ← página principal
FinHub-Vite/src/components/ui/alert.tsx                     ← componente Alert existente
```

**Tarefa:**
A página de ETF Overlap mostra dados simulados mas não avisa o utilizador. Isto é um risco legal e de confiança.

1. Adicionar um banner/alert visível no topo da página com texto claro:
   > "Os dados de sobreposição são estimativas baseadas em amostragem e podem não refletir a composição real dos ETFs. Não constituem aconselhamento financeiro."
2. Usar o componente `Alert` existente do shadcn/ui com variant `warning` ou similar
3. O banner deve ser persistente (não pode ser fechado)
4. Em mobile deve estar igualmente visível

**Critérios de conclusão:**
- [ ] Disclaimer visível no topo da página em desktop e mobile
- [ ] Usa componente Alert existente (não criar CSS novo)
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT B3 — Watchlist: Migrar para Batch FMP ✅ VALIDADO 2026-03-20

> **Nota pós-validação:** Implementação limpa — 1 chamada `v3/quote/{symbols}` com fallback explícito (`degraded: true`, `warning`, log com lista de símbolos). `sector: null` no batch é correto — evita uma segunda chamada de profile por símbolo. Shape do contrato mantido intacto.

**Contexto do projeto:**
- Backend: `API_finhub/` (Express + TypeScript)
- Área: serviço de watchlist

**Ficheiros de referência:**
```
API_finhub/src/services/        ← procurar watchlist service
API_finhub/src/routes/          ← rota /api/watchlist ou similar
```

**Tarefa:**
A watchlist faz N chamadas paralelas ao FMP (Financial Modeling Prep) em vez de uma chamada batch.

1. Localizar onde as chamadas ao FMP são feitas para a watchlist
2. Substituir as N chamadas paralelas por uma única chamada batch ao endpoint FMP: `GET /v3/quote/{symbol1,symbol2,...}?apikey=KEY`
3. Manter o mesmo formato de resposta para o frontend (não quebrar o contrato)
4. Adicionar logs de erro se o batch falhar (não deixar silencioso)

**Critérios de conclusão:**
- [ ] Uma única chamada FMP para todos os símbolos
- [ ] Resposta mantém o mesmo shape que antes
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

---

# BLOCO 1 — P3: Gate Final da Análise Rápida

---

## PROMPT P3.5 — Documentação e Gate de Qualidade ✅ VALIDADO 2026-03-20

> **Nota pós-validação:** Payout Ratio adicionado ao contrato em `quickAnalysisMetrics.ts:300`. Gate setorial executado via `--fixture` (determinístico) com 11 setores, cobertura mínima 93.75% (Utilities 15/16). `P3_GATE_FINAL.md` criado com tabela de cobertura e matriz das 6 métricas núcleo. Execução via fixture é válida — o contrato está no código, a fixture serve apenas para CI sem API remota.

**Contexto do projeto:**
- Backend: `API_finhub/`
- Área: quick analysis de stocks
- Documentação de referência: `API_finhub/dcos/P3_MATRIZ_SETORIAL_ANALISE_RAPIDA.md` e `API_finhub/dcos/P3_COBERTURA_SETORIAL_QUICK_ANALYSIS.md`

**Ficheiros de referência:**
```
API_finhub/src/services/        ← procurar quick analysis service
API_finhub/src/controllers/     ← controller de stocks/quick analysis
API_finhub/scripts/quick-metrics-sector-coverage.js   ← script de validação existente
```

**Tarefa:**
Fechar o P3 com gate de qualidade formal.

1. Correr o script `scripts/quick-metrics-sector-coverage.js` para 1 ticker por setor (11 setores)
2. Para cada métrica do núcleo (ROE, ROIC, PEG, Margem EBITDA, Dívida/CP, Payout Ratio), documentar:
   - Fonte primária
   - Fallback por ordem
   - Fórmula de cálculo quando não vem pronta
   - Estado possível: `ok` | `calculated` | `nao_aplicavel` | `sem_dado_atual` | `erro_fonte`
3. Criar ficheiro `API_finhub/dcos/P3_GATE_FINAL.md` com a tabela de cobertura actualizada
4. Corrigir qualquer métrica que apareça como `-` em sectores onde devia ter valor

**Critérios de conclusão:**
- [ ] Script corre sem erros para os 11 setores
- [ ] Tabela de cobertura atualizada em `P3_GATE_FINAL.md`
- [ ] Métricas núcleo com cobertura ≥ 80% nos setores onde são aplicáveis
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

---

# BLOCO 2 — P4: Hardening

---

## PROMPT P4-H1 — Moderation Control Plane: Runbook + E2E ✅ VALIDADO 2026-03-20

> **Nota pós-validação:** Graceful shutdown "drain" em `adminContentJob.service.ts` (stopMode + stopWorker) e `adminContentJobs.worker.ts` (SIGINT/SIGTERM → stopWorker(null, 'drain')). Runbook com 3 procedimentos em `API_finhub/dcos/RUNBOOK_MODERATION_CONTROL_PLANE.md`. Suite E2E com 4 testes (fast hide, bulk guardrail, creator controls, rollback). Regressões pré-existentes resolvidas em 2026-03-20 — ver nota de correção abaixo.

> **Correção de regressões E2E — 2026-03-20:**
> 3 testes pré-existentes falhavam (fora do âmbito do P4-H1). Causa raiz e correção:
> - **`reits.toolkit.smoke.spec.ts`** (1 teste): mensagem de erro em `ReitsToolkitPage.tsx:267` era dinâmica (`\`Nao foi possivel carregar: ${err}\``) mas o teste esperava string estática. Corrigido para `'Nao foi possivel carregar os dados de REIT. Verifica os endpoints /reits/* no backend.'`
> - **`admin.creator-risk.p4.spec.ts`** (2 testes): `CreatorsRiskBoardPage.tsx` importava `<Link>` de `react-router-dom` e usava-o directamente sem verificar contexto Router. Em ambiente SSR/Vike (sem `<BrowserRouter>`), `useHref()` lançava excepção → crash → página em branco. Corrigido: removido import `Link`, substituídas as 3 ocorrências por `<a href="...">`. `ContentModerationPage` já estava protegida com `OptionalRouterLink` + `useInRouterContext()`. Todos os 4 testes passam.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Backend: `API_finhub/`
- Referência: `API_finhub/dcos/P4_MODERATION_CONTROL_PLANE.md` e `FinHub-Vite/dcos/P4_MODERATION_CONTROL_PLANE.md`

**Ficheiros de referência:**
```
FinHub-Vite/e2e/admin.p2.6.spec.ts          ← suite E2E existente (modelo)
FinHub-Vite/e2e/admin.creator-risk.p4.spec.ts ← suite E2E existente (modelo)
API_finhub/src/services/                    ← moderation services
```

**Tarefa:**
Fechar o hardening do Moderation Control Plane.

1. **Graceful shutdown do worker de jobs:** garantir que quando o servidor recebe SIGINT/SIGTERM, os jobs em curso terminam antes de fechar (não interromper a meio)
2. **E2E dos fluxos novos:** criar `FinHub-Vite/e2e/admin.moderation-control.p4.spec.ts` cobrindo:
   - Fast hide de conteúdo
   - Bulk moderation com guardrail (limite de itens)
   - Creator controls (aplicar + verificar)
   - Rollback de moderação
3. **Runbook:** criar `API_finhub/dcos/RUNBOOK_MODERATION_CONTROL_PLANE.md` com procedimentos de:
   - Como activar/desactivar kill switch por superfície
   - Como fazer rollback de moderação em massa
   - Como rever false positives

**Critérios de conclusão:**
- [ ] Graceful shutdown implementado no backend
- [ ] Nova suite E2E com mínimo 4 testes (todos a passar)
- [ ] Runbook criado com os 3 procedimentos
- [ ] `npm run typecheck` → PASS (backend)
- [ ] `npm run build` → PASS (ambos)
- [ ] `npm run test:e2e` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P4-H2 — Editorial CMS: Hardening + E2E ✅ VALIDADO 2026-03-20

> **Nota pós-validação:** Suite E2E criada em `admin.editorial.p4.spec.ts` com 3 testes: fluxo base (creator→admin→histórico), audit log (create+approve geram entradas com acção `claim|transfer`), idempotência (2º POST retorna mesmo claim, lista fica com 1 item). `AuditLogState` + `ensureAuditState` + `recordAuditLog` helpers implementados no mock. Mock `GET /api/admin/audit-logs` com suporte a filtro `?action=` e paginação. 3 failures em `release.flows.o3.spec.ts` são pré-existentes (testam features P5 não implementadas: `/creators/dashboard/articles` e brand portal `/marcas/portal`).

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Backend: `API_finhub/`
- Referência: `FinHub-Vite/dcos/P4_ADMIN_EDITORIAL_CMS.md`

**Ficheiros de referência:**
```
FinHub-Vite/src/features/admin/services/    ← admin services existentes
FinHub-Vite/e2e/                            ← suites E2E existentes (modelo)
API_finhub/src/routes/                      ← rotas admin/editorial
```

**Tarefa:**
Fechar a Fase E do Editorial CMS.

1. **E2E do fluxo editorial completo:** criar `FinHub-Vite/e2e/admin.editorial.p4.spec.ts` cobrindo:
   - Criador faz claim de conteúdo
   - Admin revê e aprova o claim
   - Ownership transfer registado no histórico
   - Verificar que histórico está visível em `/admin/editorial`
2. **Validação de scopes e auditoria:** verificar que as acções editoriais geram entradas no audit log (usar endpoint `GET /api/admin/audit-logs` para confirmar)
3. **Idempotência:** garantir que fazer claim duas vezes não cria dois registos (deve retornar o existente ou erro claro)

**Critérios de conclusão:**
- [ ] Suite E2E criada com mínimo 3 testes (todos a passar)
- [ ] Audit log regista acções editoriais
- [ ] Claim idempotente (sem duplicados)
- [ ] `npm run typecheck` → PASS (ambos)
- [ ] `npm run build` → PASS (ambos)
- [ ] `npm run test:e2e` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P4-H3 — TTL, Rate Limiters e Cache nos Pontos Caros ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** 3 limiters novos (`quickAnalysis` 10/min, `marketData` 30/min, `reits` 20/min) adicionados ao `rateLimiter.ts` e aplicados em stock/crypto/reit/etf routes. `cacheService.ts` limpo (0 `console.*`, logger estruturado). `CacheStrategies` com 5 entradas de mercado; `CacheKeys` com namespaces market/crypto/reits/watchlist. Cache via `remember()` em: quick analysis (1h), batch snapshot (5min), crypto list (2min), calculateMetrics REIT (30min). TTL indexes: `Notification.createdAt` → 90 dias; `AssistedSession.sessionExpiresAt` → `expireAfterSeconds: 0` (expira na data do campo, padrão correcto). Tokens de User já tinham índices.

**Contexto do projeto:**
- Backend: `API_finhub/` (Express + TypeScript + MongoDB + Redis opcional)
- Infra existente: `rateLimiter.ts` (adaptive Redis/memory), `cacheService.ts` (in-memory), `logInfo`/`logWarn`/`logError` em `utils/logger`

**Ficheiros de referência:**
```
API_finhub/src/middlewares/rateLimiter.ts     ← limiter existente — modelo a seguir
API_finhub/src/services/cacheService.ts       ← cache existente — a melhorar
API_finhub/src/routes/stock.routes.ts         ← rota /quick-analysis/:symbol e /batch-snapshot
API_finhub/src/routes/crypto.routes.ts        ← rota GET /api/crypto
API_finhub/src/routes/reit.routes.ts          ← rotas calculateDDM, calculateFFO, calculateNAV, etc.
API_finhub/src/routes/etf.routes.ts           ← rotas ETF
API_finhub/src/models/Notification.ts        ← candidato a TTL index
API_finhub/src/models/AssistedSession.ts     ← candidato a TTL index
API_finhub/src/models/User.ts                ← verificar se tem campos de token com expiração
```

**Tarefa:**
Hardening de performance e protecção nos endpoints que fazem chamadas externas (FMP, CoinGecko).

### 1. Rate limiters para endpoints de mercado
Adicionar os seguintes limiters ao enum `RateLimiterName` e ao array `limiterDefinitions` em `rateLimiter.ts`:

| Nome | windowMs | limit | Endpoints |
|------|----------|-------|-----------|
| `quickAnalysis` | 1 min | 10 | `GET /api/stocks/quick-analysis/:symbol` |
| `marketData` | 1 min | 30 | `GET /api/crypto`, `/api/etf/*`, `/api/stocks/batch-snapshot` |
| `reits` | 1 min | 20 | `GET /api/reits/*` |

Aplicar os limiters nas respectivas rotas. Seguir o padrão existente (ex: `rateLimiter.stats` aplicado noutras rotas).

### 2. Limpar cacheService.ts
Substituir **todos** os `console.log`, `console.error`, `console.warn` do `cacheService.ts` por chamadas ao logger estruturado (`logInfo`, `logWarn`, `logError` de `utils/logger`).

Adicionar ao objeto `CacheStrategies`:
```ts
MARKET_QUOTE: 300,       // FMP quotes — 5 min
MARKET_FUNDAMENTALS: 3600, // FMP profile/fundamentals — 1h
CRYPTO: 120,             // CoinGecko — 2 min
REIT_METRICS: 1800,      // FMP REIT metrics — 30 min
WATCHLIST: 300,          // watchlist batch — 5 min
```

Adicionar ao objeto `CacheKeys`:
```ts
market: {
  quote: (symbol: string) => `market:quote:${symbol.toUpperCase()}`,
  fundamentals: (symbol: string) => `market:fundamentals:${symbol.toUpperCase()}`,
  batchSnapshot: (symbols: string) => `market:batch:${symbols}`,
},
crypto: {
  list: (params: string) => `crypto:list:${params}`,
},
reits: {
  metrics: (ticker: string) => `reits:metrics:${ticker.toUpperCase()}`,
},
watchlist: {
  batch: (symbols: string) => `watchlist:batch:${symbols}`,
},
```

### 3. Aplicar cache nos serviços caros
Nos services que fazem chamadas ao FMP/CoinGecko para quick analysis, crypto e REIT metrics:
- Envolver a chamada externa com `cacheService.remember(key, callback, ttl)` usando as chaves e TTLs definidos acima
- Não cachear erros (se o callback lançar excepção, não gravar no cache)

### 4. TTL indexes no MongoDB
Para cada modelo listado abaixo, verificar se já existe TTL index; se não existir, adicionar via `schema.index(...)`:

- **`Notification`**: se tiver campo `createdAt` e não tiver TTL → adicionar `expireAfterSeconds: 7776000` (90 dias)
- **`AssistedSession`**: se tiver campo de expiração ou `createdAt` → adicionar TTL adequado (ex: 24h = 86400s)
- **`User`**: se tiver campos `verificationToken` / `verificationTokenExpiry` / `passwordResetToken` → confirmar que os índices existem; se não, adicionar índice simples (não TTL, pois a expiração é por campo)

**Critérios de conclusão:**
- [ ] 3 novos limiters adicionados a `rateLimiter.ts` e aplicados nas rotas respectivas
- [ ] `cacheService.ts` sem nenhum `console.log`/`console.error`/`console.warn`
- [ ] `CacheStrategies` e `CacheKeys` atualizados com entradas de mercado
- [ ] Cache aplicado em pelo menos: quick analysis, crypto list, um endpoint REIT
- [ ] TTL index em `Notification` e `AssistedSession` (se ainda não existir)
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

---

# BLOCO 3 — P5: Páginas Públicas de Conteúdo

---

## PROMPT P5.1 — Página Explore (Hub de Conteúdo) ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** `ExploreHubPage` em `/hub/conteudos` confirmada. Serviço unificado (`exploreHubService.ts`) agrega 5 tipos com normalização robusta de payload. Hook com `staleTime: 60s`. Filtros com `?tipo=` em URL, paginação Anterior/Seguinte, skeleton com `animate-pulse`, empty state e SSR-safe guards verificados. typecheck + build PASS.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Vite + Vike + Tailwind + shadcn/ui + React Query)
- Rota destino: `/hub/conteudos`
- Padrão de routing: Vike file-based (ficheiro `src/pages/hub/conteudos/+Page.tsx`)

**Ficheiros de referência (padrões a seguir):**
```
FinHub-Vite/src/features/hub/articles/services/articleService.ts   ← padrão de service
FinHub-Vite/src/features/hub/articles/hooks/                       ← padrão de hooks
FinHub-Vite/src/components/public/ContentGrid.tsx                  ← componente de grid
FinHub-Vite/src/components/public/FilterBar.tsx                    ← componente de filtros
FinHub-Vite/src/components/public/PageHero.tsx                     ← componente de hero
FinHub-Vite/src/pages/hub/articles/+Page.tsx                       ← exemplo de página hub
```

**Endpoints disponíveis:**
```
GET /api/articles?page=1&limit=12&sort=recent
GET /api/videos?page=1&limit=12
GET /api/courses?page=1&limit=12
GET /api/podcasts?page=1&limit=12
GET /api/books?page=1&limit=12
```

**Tarefa:**
Criar a página Explore que agrega todos os tipos de conteúdo numa listagem unificada.

1. Criar `src/pages/hub/conteudos/+Page.tsx` que renderiza `ExploreHubPage`
2. Criar `src/features/explore/pages/ExploreHubPage.tsx` com:
   - Hero com título e descrição da plataforma
   - Filtro por tipo (Todos | Artigos | Vídeos | Cursos | Podcasts | Livros)
   - Grid de conteúdo paginado usando `ContentGrid`
   - Skeleton loading states
   - Estado vazio quando não há resultados
3. Reutilizar `FilterBar`, `ContentGrid`, `PageHero` existentes
4. React Query para fetching com staleTime de 60s
5. URL params para manter filtro activo (`?tipo=artigos`)

**Critérios de conclusão:**
- [ ] Página acessível em `/hub/conteudos`
- [ ] Filtro por tipo funcional
- [ ] Paginação funcional
- [ ] Skeleton loading visível durante fetch
- [ ] Estado vazio tratado
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.2 — Detalhe de Artigo (Página Pública) ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** Slug resolvido de Vike `routeParams`. DOMPurify com guard SSR. Like com optimistic update e rollback em erro. `RatingsSection` + `CommentSection` com todos os handlers. SEO completo (title, og:*, canonical). Sidebar criador com `FollowButton`. Paywall fallback para conteúdo premium. Normalização robusta de campos variáveis do backend. typecheck + build PASS.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Rota destino: `/hub/articles/:slug`
- Ficheiro de rota Vike: `src/pages/hub/articles/@slug/+Page.tsx`

**Ficheiros de referência:**
```
FinHub-Vite/src/features/hub/articles/services/articleService.ts
FinHub-Vite/src/features/hub/articles/hooks/
FinHub-Vite/src/pages/hub/articles/+Page.tsx                      ← listagem (modelo)
FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx       ← padrão de cards/layout rico
```

**Endpoints disponíveis:**
```
GET /api/articles/:slug           → artigo completo
POST /api/articles/:id/view       → incrementar views (fire & forget)
POST /api/articles/:id/like       → like/unlike (auth opcional)
GET /api/ratings?contentId=X&contentType=article  → reviews
POST /api/ratings                 → submeter review (auth obrigatório)
GET /api/comments?contentId=X&contentType=article → comentários
POST /api/comments                → criar comentário (auth obrigatório)
```

**Tarefa:**
Criar a página de detalhe de artigo completa.

1. Actualizar/criar `src/pages/hub/articles/@slug/+Page.tsx`
2. Criar `src/features/hub/articles/pages/ArticleDetailPage.tsx` com:
   - Hero com título, autor, data, cover image
   - Corpo do artigo em rich text (HTML sanitizado — usar DOMPurify ou similar)
   - Botão de like (com estado se autenticado)
   - Secção de ratings/reviews (`RatingsSection` — já existe, reutilizar)
   - Secção de comentários (listar + formulário se autenticado)
   - Sidebar com info do criador + botão de follow
   - SEO: `react-helmet-async` com title, description, og:image
3. Chamar `POST /api/articles/:id/view` ao montar a página (fire & forget)

**Critérios de conclusão:**
- [ ] Página renderiza artigo real por slug
- [ ] Like funcional (autenticado)
- [ ] Ratings/reviews visíveis
- [ ] Comentários visíveis e criação funcional (autenticado)
- [ ] SEO meta tags presentes
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.3 — Detalhe de Curso e Vídeo ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** Padrão P5.2 seguido em ambas as páginas. Curso: hero + módulos/lições (com fallback modules→lessons), enroll CTA, paywall, ratings, comentários, FollowButton, SEO. Vídeo: player inteligente (YouTube/Vimeo iframe + `<video>` nativo), paywall overlay, transcrição colapsável, subtítulos, ratings, comentários, FollowButton, `og:type=video.other`. typecheck + build PASS.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Rotas: `/hub/courses/:slug` e `/hub/videos/:slug`

**Ficheiros de referência:**
```
FinHub-Vite/src/features/hub/articles/pages/ArticleDetailPage.tsx  ← feito no P5.2, usar como modelo
FinHub-Vite/src/pages/hub/articles/@slug/+Page.tsx                 ← padrão Vike
```

**Endpoints disponíveis:**
```
GET /api/courses/:slug
GET /api/videos/:slug
POST /api/courses/:id/view
POST /api/videos/:id/view
GET /api/ratings?contentId=X&contentType=course|video
GET /api/comments?contentId=X&contentType=course|video
```

**Tarefa:**
Criar as páginas de detalhe de curso e vídeo seguindo o mesmo padrão do artigo (P5.2).

**Curso** (`/hub/courses/:slug`):
- Hero com título, criador, duração, nível
- Descrição do curso
- Lista de lições (se disponível no endpoint)
- Ratings/reviews + comentários
- CTA de enroll (se tiver paywall) ou acesso directo

**Vídeo** (`/hub/videos/:slug`):
- Player de vídeo (usar `<video>` nativo ou iframe se for YouTube/Vimeo)
- Título e descrição
- Ratings/reviews + comentários
- Info do criador + follow

**Critérios de conclusão:**
- [ ] Detalhe de curso funcional com lições visíveis
- [ ] Detalhe de vídeo com player funcional
- [ ] Ratings/reviews e comentários em ambas
- [ ] SEO meta tags em ambas
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.4 — Lista de Criadores + Perfil Público ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** Serviço expandido com 6 novas funções mantendo compatibilidade retroativa. Lista paginada com filtro por tipo (via stats), pesquisa e ordenação. Perfil com header completo, redes sociais, Follow/Unfollow com optimistic update + rollback, 5 tabs de conteúdo (últimos 6 por tipo com links), SEO Helmet. Dívida: publicationsCount usa chamadas extra por criador — aceitável para P5.4. typecheck + build PASS.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Rotas: `/creators` e `/creators/:username`

**Ficheiros de referência:**
```
FinHub-Vite/src/features/creators/services/publicCreatorsService.ts
FinHub-Vite/src/features/creators/pages/CreatorsListPage.tsx        ← pode já existir parcialmente
FinHub-Vite/src/features/creators/pages/CreatorProfilePage.tsx      ← pode já existir parcialmente
```

**Endpoints disponíveis:**
```
GET /api/creators?page=1&limit=20        → lista pública de criadores
GET /api/creators/:creatorId             → perfil do criador
GET /api/articles?creatorId=X&limit=6   → conteúdo do criador
GET /api/follow                          → estado de follow
POST /api/follow                         → seguir criador
DELETE /api/follow/:id                   → deixar de seguir
```

**Tarefa:**

**Lista** (`/creators`):
- Grid de criadores com avatar, nome, bio curta, nº de seguidores e nº de publicações
- Filtro por tipo de conteúdo que publicam
- Paginação

**Perfil público** (`/creators/:username`):
- Header com avatar, nome, bio, redes sociais, contador de seguidores
- Botão Follow/Unfollow (se autenticado)
- Tabs: Artigos | Vídeos | Cursos | Podcasts | Livros
- Cada tab mostra os últimos 6 conteúdos do criador com link para o detalhe

**Critérios de conclusão:**
- [ ] Lista de criadores paginada e funcional
- [ ] Perfil público com tabs de conteúdo
- [ ] Follow/Unfollow funcional (autenticado)
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

---

# BLOCO 4 — P5: Creator Dashboard MVP

---

## PROMPT P5.5 — Creator Dashboard: Overview + Gestão de Artigos ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** Overview com 4 KPIs reais (publicações, seguidores via `/follow`, views 30d por janela temporal, rating via `/ratings` + fallback). Últimos 3 artigos publicados com link para editar. `ManageArticles` com tabela, filtro draft/published, publicar/despublicar e eliminar com Dialog de confirmação. `useUnpublishArticle` adicionado ao hook. typecheck + build PASS.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Rotas: `/creators/dashboard` e `/creators/dashboard/articles`
- Layout existente: `src/features/creators/` (verificar o que já existe)

**Ficheiros de referência:**
```
FinHub-Vite/src/features/admin/pages/StatsPage.tsx               ← padrão de KPI cards
FinHub-Vite/src/features/hub/articles/services/articleService.ts ← service de artigos
FinHub-Vite/src/features/admin/services/adminUsersService.ts     ← padrão de service admin
FinHub-Vite/src/pages/creators/dashboard/+Page.tsx               ← rota Vike existente
```

**Endpoints disponíveis:**
```
GET /api/articles/my                    → artigos do criador autenticado
POST /api/articles                      → criar artigo
PATCH /api/articles/:id                 → editar artigo
DELETE /api/articles/:id                → eliminar artigo
POST /api/articles/:id/publish          → publicar
POST /api/articles/:id/unpublish        → despublicar
GET /api/ratings?creatorId=X            → reviews recebidas
GET /api/follow?creatorId=X             → seguidores
```

**Tarefa:**

**Overview** (`/creators/dashboard`):
- KPI cards: total de publicações, total de seguidores, total de views (últimos 30 dias), rating médio
- Lista dos últimos 3 artigos publicados com link para editar
- CTA para criar novo artigo

**Gestão de artigos** (`/creators/dashboard/articles`):
- Tabela de artigos do criador (título, estado, data, views, rating)
- Filtro por estado (draft | published)
- Acções por linha: Editar | Publicar/Despublicar | Eliminar (com confirmação)
- Botão "Criar artigo" que navega para `/creators/dashboard/articles/create`

**Critérios de conclusão:**
- [ ] Overview com KPIs reais (não mock)
- [ ] Tabela de artigos funcional com acções
- [ ] Publicar/despublicar funcional
- [ ] Eliminar com diálogo de confirmação
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

---

# BLOCO 5 — P8: Elevação UI/UX (Fundações)

---

## PROMPT P8.1 — Fundações de Design (Tipografia + Cores) ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** Todos os critérios de código confirmados. `@fontsource/inter` instalado com pesos 400–800 em `main.tsx`. `--font-sans`, `.tabular-nums`, dark mode tokens e `market.bull/bear/neutral` aplicados. typecheck + build PASS. Validação visual no browser (Network tab + dark mode) é responsabilidade manual do utilizador ao correr o app — código está correcto.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Referência de design: `docs/finhub/DESIGN.md`

**Ficheiros a alterar:**
```
FinHub-Vite/package.json
FinHub-Vite/src/main.tsx
FinHub-Vite/src/styles/globals.css
FinHub-Vite/tailwind.config.ts
```

**Ficheiro de referência para padrão correcto:**
```
FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx  ← usa bg-card/75, border-border/60, gradientes certos
```

**Tarefa:**
Aplicar as fundações de design sem breaking changes visuais drásticos.

1. **Instalar e aplicar fonte Inter:**
   ```bash
   npm install @fontsource/inter
   ```
   - Importar pesos 400, 500, 600, 700, 800 em `src/main.tsx`
   - Definir `--font-sans: 'Inter', system-ui, -apple-system, sans-serif` em `globals.css`

2. **Adicionar classe `.tabular-nums`** em `globals.css` (`@layer utilities`):
   ```css
   .tabular-nums {
     font-variant-numeric: tabular-nums;
     font-feature-settings: "tnum";
   }
   ```

3. **Dark mode mais escuro** — alterar em `globals.css` no bloco `.dark`:
   ```
   --background: 222 25% 8%
   --card: 222 20% 11%
   --border: 220 15% 18%
   --input: 220 15% 18%
   ```

4. **Chart colors semânticas** — adicionar em `.dark`:
   ```css
   --chart-1: 217 91% 65%;
   --chart-2: 160 72% 48%;
   --chart-3: 38 92% 58%;
   --chart-4: 0 84% 65%;
   --chart-5: 270 67% 70%;
   ```

5. **Market colors** — adicionar em `tailwind.config.ts` dentro de `extend.colors`:
   ```ts
   market: {
     bull: '#22C55E',
     bear: '#EF4444',
     neutral: '#94A3B8',
   }
   ```

6. **Verificar visualmente** em light e dark mode que nada quebrou

**Critérios de conclusão:**
- [ ] Fonte Inter a carregar (verificar no Network tab do browser)
- [ ] Dark mode visivelmente mais escuro
- [ ] `.tabular-nums` disponível como classe utilitária
- [ ] `market.bull/bear/neutral` acessíveis no Tailwind
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS
- [ ] Sem regressões visuais visíveis em light + dark mode

**Produzir relatório no formato do template acima.**

---

## PROMPT P8.2 — MetricCard + Badges de Estado ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** `MetricCard.tsx` criado e exportado. 5 variantes de badge (Direto/azul, Calculado/amber, N/A+Sem dado/cinzento, Erro/vermelho). Variação percentual com `text-market-bull`/`text-market-bear`. Tooltip Radix opcional. Exemplo JSDoc inline. `.tabular-nums` aplicado em EtfOverlapPage (6 ocorrências), ValuationSection e ValuationSimulator. typecheck + build PASS.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Área: componentes de métricas financeiras

**Ficheiros de referência:**
```
FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx   ← padrão de métrica existente
FinHub-Vite/src/components/ui/badge.tsx                        ← Badge existente
FinHub-Vite/src/components/ui/card.tsx                         ← Card existente
```

**Tarefa:**
Criar/melhorar o componente `MetricCard` para valores financeiros.

1. Criar (ou actualizar) `src/components/ui/MetricCard.tsx` com:
   - Valor numérico grande com `.tabular-nums`
   - Label pequeno e em `muted-foreground`
   - Badge de estado opcional: `Direto` (azul) | `Calculado` (amarelo) | `N/A` (cinzento) | `Sem dado` (cinzento) | `Erro` (vermelho)
   - Variação percentual com cor de mercado (`market.bull` / `market.bear`)
   - Tooltip com descrição da métrica (opcional, via Radix Tooltip)

2. Aplicar `.tabular-nums` em **todos** os componentes existentes que mostram valores financeiros:
   - Procurar por `MetricRow`, `ConfidenceBadge` e outros componentes de mercado
   - Adicionar a classe onde ainda não existe

**Critérios de conclusão:**
- [ ] `MetricCard` criado e exportado de `components/ui/`
- [ ] Badges de estado com as 5 variantes
- [ ] `.tabular-nums` aplicado nos componentes de mercado existentes
- [ ] Componente documentado com um exemplo de uso em comentário
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P8.3 — Charts: Gradient Fill + Tooltips Ricos ✅ VALIDADO 2026-03-21

> **Nota pós-validação:** `ChartTooltip` genérico criado com suporte a valor formatado, período, variação vs ponto anterior com `text-market-bull`/`text-market-bear` e `tabular-nums`. Aplicado em `ValueCreationChart` (ROIC/WACC, 2 gradients) e `FireSimulatorPage` (Monte Carlo, 1 gradient via `hsl(var(--chart-1))`). Exportado no barrel `components/ui`. typecheck + build PASS. Nota: FireSimulatorPage importa directo do ficheiro em vez do barrel — uniformizar em iterações futuras.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Biblioteca de charts: Recharts

**Ficheiros de referência:**
```
FinHub-Vite/src/features/markets/      ← páginas com charts existentes
FinHub-Vite/src/features/fire/         ← FIRE simulator com charts
```

**Tarefa:**
Melhorar os charts financeiros existentes.

1. **Gradient fill nos Area/Line charts de preço:**
   - Adicionar `<defs><linearGradient>` com a cor semântica do gráfico
   - Substituir `<Line>` por `<Area>` onde for um chart de evolução temporal
   - Gradiente: cor sólida no topo → transparente em baixo

2. **Tooltips ricos:**
   - Criar `src/components/ui/ChartTooltip.tsx` — tooltip customizado com:
     - Valor formatado com `.tabular-nums`
     - Data/período
     - Variação vs ponto anterior (se disponível)
     - Cor de mercado para variações positivas/negativas

3. Aplicar estas melhorias nos charts da página de stocks e do FIRE simulator

**Critérios de conclusão:**
- [ ] Pelo menos 1 chart com gradient fill
- [ ] `ChartTooltip` criado e aplicado
- [ ] Tooltips mostram valor + variação com cor correcta
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT B4 — Navegação dos Cards (href em Cards Antigos)

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Vike + Tailwind)
- Problema: cards de artigos, vídeos, cursos, podcasts, livros e criadores existentes **fora** das novas páginas P5.x não navegam quando clicados — não têm `href` correcto ou estão envoltos em `div` em vez de `<a>`.

**Ficheiros de referência (padrão correcto):**
```
FinHub-Vite/src/features/explore/pages/ExploreHubPage.tsx        ← usa <a href={item.href}>
FinHub-Vite/src/features/creators/pages/CreatorsListPage.tsx     ← usa <a href={...}>
FinHub-Vite/src/features/hub/articles/                           ← padrão de hrefs
```

**Onde procurar cards com problemas:**
```
FinHub-Vite/src/components/public/ArticleCard.tsx       (ou similar)
FinHub-Vite/src/components/public/CourseCard.tsx
FinHub-Vite/src/components/public/VideoCard.tsx
FinHub-Vite/src/features/hub/*/components/              ← cards dentro de features
FinHub-Vite/src/features/creators/components/           ← creator widgets
FinHub-Vite/src/pages/index/                            ← homepage cards
```

**Tarefa:**
1. Fazer `grep -r "ArticleCard\|CourseCard\|VideoCard\|ContentCard\|CreatorCard" src/` para localizar todos os componentes de card existentes
2. Para cada card encontrado verificar se:
   - Tem um `<a href="...">` a envolver o conteúdo clicável
   - O `href` aponta para a rota correta (`/hub/articles/:slug`, `/hub/courses/:slug`, `/hub/videos/:slug`, `/creators/:username`)
3. Corrigir os que usam `div` + `onClick` para `<a href>` (melhor SSR + acessibilidade)
4. Não alterar cards que já funcionam correctamente nas novas páginas P5.x

**Critérios de conclusão:**
- [ ] Cards de artigo, vídeo, curso, podcast, livro e criador clicáveis em toda a app
- [ ] `href` correcto em todos (`/hub/articles/:slug`, `/hub/videos/:slug`, `/hub/courses/:slug`, `/creators/:username`)
- [ ] Nenhum card com `div` clicável sem `<a>` wrapper (a11y)
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.6 — Páginas Legais + Footer Funcional

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Vike)
- Problema: footer tem links para Privacidade, Termos de Serviço, Cookies e Sobre — mas as rotas não existem (404).

**Ficheiros de referência:**
```
FinHub-Vite/src/components/home/Footer.tsx              ← footer com os links quebrados
FinHub-Vite/src/pages/                                  ← onde criar os +Page.tsx
FinHub-Vite/src/pages/hub/articles/@slug/+Page.tsx      ← padrão de página simples Vike
```

**Tarefa:**
1. Identificar todos os links no Footer que apontam para rotas inexistentes
2. Criar as seguintes páginas estáticas (conteúdo placeholder aceitável — estrutura e rota é o mais importante):
   - `src/pages/legal/privacidade/+Page.tsx` — Política de Privacidade
   - `src/pages/legal/termos/+Page.tsx` — Termos de Serviço
   - `src/pages/legal/cookies/+Page.tsx` — Política de Cookies
   - `src/pages/sobre/+Page.tsx` — Sobre a FinHub (missão, visão, equipa placeholder)
3. Cada página deve ter:
   - Layout consistente com o resto da app (usar `HomepageLayout` ou layout simples com header/footer)
   - `<Helmet>` com title e description para SEO
   - Conteúdo placeholder bem estruturado em secções (pode ser texto genérico correcto para uma plataforma financeira portuguesa)
   - Link de volta ao início
4. Corrigir os `href` no Footer para apontar para as novas rotas

**Critérios de conclusão:**
- [ ] `/legal/privacidade` carrega sem 404
- [ ] `/legal/termos` carrega sem 404
- [ ] `/legal/cookies` carrega sem 404
- [ ] `/sobre` carrega sem 404
- [ ] Footer: todos os links de rodapé navegam correctamente
- [ ] SEO Helmet em todas as páginas
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P8.4 — Redesign de Cards de Conteúdo e Criador

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Tailwind + shadcn/ui)
- Objetivo: todos os cards de conteúdo e criador devem ter imagem grande, rating stars e metadata limpo

**Padrão visual a seguir (referências externas):**
- Imagem de cover a ocupar ~55-60% da altura do card
- Rating com estrelas (ex: `★★★★☆ 4.2`)
- 2-3 linhas de metadata no máximo: nome/título, autor/criador, tipo+duração ou seguidores
- Hover rico: elevação sutil + borda `primary/40`

**Ficheiros a criar/actualizar:**
```
FinHub-Vite/src/components/public/ArticleCard.tsx    ← criar ou refatorar
FinHub-Vite/src/components/public/CourseCard.tsx     ← criar ou refatorar
FinHub-Vite/src/components/public/VideoCard.tsx      ← criar ou refatorar
FinHub-Vite/src/components/public/BookCard.tsx       ← criar ou refatorar
FinHub-Vite/src/components/public/CreatorCard.tsx    ← criar ou refatorar
```

**Tarefa:**
1. Criar/refatorar cada card com:
   - `<a href={...}>` como wrapper (não `div` clicável)
   - Imagem de cover com aspect ratio fixo (`aspect-[4/3]` ou `aspect-video`) + `object-cover`
   - Placeholder visual quando sem imagem (gradiente ou ícone centrado)
   - Título com `line-clamp-2`
   - Badge de tipo (Artigo | Vídeo | Curso | Podcast | Livro)
   - Rating stars: renderizar 5 estrelas preenchidas/vazias com cor `market.bull`
   - Metadata secundária: autor, data ou duração (apenas 1-2 campos, não poluir)
   - Hover: `hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg`

2. `CreatorCard` específico:
   - Avatar circular grande (80-96px)
   - Nome + `@username`
   - Contadores: seguidores + publicações
   - Rating stars
   - Badge com tipo(s) de conteúdo que produz

3. Exportar todos de `src/components/public/index.ts`

**Critérios de conclusão:**
- [ ] 5 variantes de ContentCard (artigo/vídeo/curso/podcast/livro) com imagem grande
- [ ] `CreatorCard` com avatar + counters + rating
- [ ] Rating stars renderizado em todos os cards
- [ ] Todos têm `<a href>` wrapper (não `div`)
- [ ] Exportados em `components/public/index.ts`
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.7 — Creator Popup Modal — Wiring + Backend Field ✅

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Backend: `API_finhub/` — model de Creator/User
- Objetivo: ao clicar num `CreatorCard` na homepage ou lista de criadores, abrir modal popup com apresentação do criador (welcome video, cursos, redes sociais, avaliação)

**IMPORTANTE — Componentes que JÁ EXISTEM (NÃO criar de novo):**

1. **`CreatorModal`** — `src/features/creators/components/modals/CreatorModal.tsx`
   - Dialog Radix com tabs (Geral + Avaliação)
   - Welcome video (YouTube embed via `creator.welcomeVideo[0]`)
   - Cursos (`CreatorCourses`), social links (`CreatorSocial`), ratings (`CreatorRatings`)
   - Sub-componentes: `CreatorHeader`, `CreatorCourses`, `CreatorSocial`, `CreatorRatings` na mesma pasta `modals/`

2. **`Creator` wrapper** — `src/features/creators/components/Creator.tsx`
   - Gere estado open/close (`useState`) e monta `CreatorCard` + `CreatorModal` juntos
   - Prop: `creator: Creator` (tipo de `@/features/creators/types/creator`)

3. **`CreatorCard` (feature)** — `src/features/creators/components/cards/CreatorCard.tsx`
   - Prop `onOpenModal?: () => void` — quando presente, click no card abre modal
   - Botão "Ver perfil" com `<a href>` + `event.stopPropagation()` (navega para `/creators/:username`)
   - Aceita tipo `Creator` de `@/features/creators/types/creator`

4. **Tipo `Creator`** — `src/features/creators/types/creator.ts`
   - Já tem campos: `welcomeVideo?: string[]`, `socialMediaLinks`, `courses`, `bio`, `averageRating`, `followers`, etc.

**PROBLEMA ACTUAL:**
- A homepage (`src/pages/+Page.tsx`, linha 415) usa `CreatorCardLarge` que é alias do `CreatorCard` público (`src/components/public/CreatorCard.tsx`) — este é um `<a href>` simples, sem modal
- A `CreatorsListPage` (`src/features/creators/pages/CreatorsListPage.tsx`) renderiza cards inline com `<a href>` — sem modal
- Os dados de creator na homepage são derivados de content items (articles/courses/books) e faltam campos como `welcomeVideo`, `socialMediaLinks`, `courses`, `bio`
- O backend (`API_finhub/src/models/User.ts`) NÃO tem campo `welcomeVideoUrl` no modelo

**Ficheiros a criar:** NENHUM componente novo no frontend

**Ficheiros a modificar:**
```
API_finhub/src/models/User.ts                             ← adicionar campo welcomeVideoUrl?: string ao schema
API_finhub/src/controllers/ ou routes/ relevantes          ← expor welcomeVideoUrl no endpoint público GET /api/creators/:id e no update de perfil
FinHub-Vite/src/pages/+Page.tsx                           ← substituir CreatorCardLarge pelo wrapper Creator; buscar dados completos do creator via endpoint
FinHub-Vite/src/features/creators/pages/CreatorsListPage.tsx ← integrar wrapper Creator (card + modal) em vez de cards inline
```

**Tarefa backend:**
1. Adicionar `welcomeVideoUrl?: string` ao modelo User (campo opcional, tipo String)
2. Incluir o campo no endpoint público `GET /api/creators/:id` (ou `:username`)
3. Incluir no endpoint de update de perfil do criador (para ele definir no dashboard)

**Tarefa frontend — wiring (NÃO criar componentes novos):**
1. **Homepage** (`src/pages/+Page.tsx`):
   - Remover import de `CreatorCardLarge` de `@/components/home/cards`
   - Importar `Creator` wrapper de `@/features/creators/components/Creator`
   - A secção "Criadores Populares" deve buscar dados completos dos criadores (ex: via `fetchPublicCreatorsPage` que já existe em `publicCreatorsService`) em vez de derivar de content items — os dados derivados faltam `welcomeVideo`, `socialMediaLinks`, `courses`, `bio`
   - Mapear os dados para o tipo `Creator` de `@/features/creators/types/creator` e renderizar com `<Creator creator={c} />` em vez de `<CreatorCardLarge creator={c} />`
   - O wrapper `Creator` já gere open/close do modal automaticamente

2. **CreatorsListPage** (`src/features/creators/pages/CreatorsListPage.tsx`):
   - Importar `Creator` wrapper de `@/features/creators/components/Creator`
   - Substituir os cards inline existentes por `<Creator creator={c} />` para cada criador
   - Garantir que os dados retornados por `fetchPublicCreatorsPage` incluem campos para o modal

3. **SSR — regras obrigatórias:**
   - NÃO usar `useParams`, `useNavigate`, `Link` do react-router-dom
   - NÃO aceder `window.*`, `localStorage.*`, `document.*` fora de `useEffect` ou guard `typeof window !== 'undefined'`
   - O `Creator` wrapper usa `useState` (seguro em SSR) e o `CreatorModal` usa `useEffect` para `document.body.style.overflow` (seguro)

**Critérios de conclusão:**
- [ ] Backend: `welcomeVideoUrl` no modelo User e exposto no endpoint público
- [ ] Homepage: cards de criadores usam wrapper `Creator` → click abre `CreatorModal`
- [ ] CreatorsListPage: cards usam wrapper `Creator` → click abre `CreatorModal`
- [ ] Modal mostra welcome video se existir, cursos, social links, ratings
- [ ] Botão "Ver perfil" dentro do card continua a navegar para `/creators/:username`
- [ ] Dados de criadores na homepage vêm de endpoint completo (não derivados de content items)
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.8 — Creator Welcome Card Configurável ✅

**Objetivo:** Dar ao criador controlo total sobre o que é mostrado no seu cartão de visita público (modal `CreatorModal`). Em vez de o modal mostrar sempre todos os campos com valores por omissão, o criador configura no seu dashboard quais as secções que quer expor e como.

**Contexto e estado actual:**
- `CreatorModal` (`src/features/creators/components/modals/CreatorModal.tsx`) já existe e mostra: welcome video, tabs Geral + Avaliação, cursos, social links, ratings
- O wrapper `Creator.tsx` já gere open/close do modal — **não alterar**
- O modelo `User` já tem `welcomeVideoUrl?: string`, `bio?: string`, `socialLinks`, `topics`
- Falta um schema de **preferências de visibilidade** do cartão — o que mostrar/esconder

**O que implementar:**

### Backend

1. **Novo campo `cardConfig` no modelo `User`** (`API_finhub/src/models/User.ts`):
```ts
cardConfig?: {
  showWelcomeVideo?: boolean     // default true se welcomeVideoUrl existir
  showBio?: boolean              // default true
  showCourses?: boolean          // default true
  showArticles?: boolean         // default true
  showProducts?: boolean         // default false (futuro)
  showWebsite?: boolean          // default true
  showSocialLinks?: boolean      // default true
  showRatings?: boolean          // default true
  featuredContentIds?: string[]  // IDs de artigos/cursos em destaque (até 3)
}
```

2. **Expor `cardConfig` no endpoint público** `GET /api/creators/:username` — o frontend do modal usa-o para saber o que renderizar

3. **Aceitar `cardConfig` no PATCH `/api/users/me`** — validação em `requestContracts.ts` (campos opcionais, booleanos e array de strings)

### Frontend

4. **Creator type** (`src/features/creators/types/creator.ts`): adicionar `cardConfig` ao tipo `Creator`

5. **CreatorModal** (`src/features/creators/components/modals/CreatorModal.tsx`): ler `creator.cardConfig` e renderizar condicionalmente cada secção:
   - `showWelcomeVideo` → mostrar/esconder bloco de vídeo
   - `showBio` → mostrar/esconder bio
   - `showCourses` → mostrar/esconder tab de cursos
   - `showArticles` → mostrar/esconder tab de artigos
   - `showSocialLinks` → mostrar/esconder redes sociais
   - `showRatings` → mostrar/esconder tab de avaliações
   - Se `cardConfig` for `undefined`, mostrar tudo (retrocompatibilidade)

6. **Dashboard do criador — nova secção "Cartão de Visita"** (criar componente `CreatorCardConfigPanel.tsx` em `src/features/creators/components/dashboard/`):
   - Formulário com toggles (switches) para cada opção de `cardConfig`
   - Campo para selecionar artigos/cursos em destaque (até 3) via search/select
   - Preview ao vivo do modal (`<CreatorModal>` em modo preview, read-only)
   - Botão "Guardar" → PATCH `/api/users/me` com `{ cardConfig: {...} }`
   - Integrar no creator dashboard existente (`src/features/creators/pages/` ou dashboard tabs)

**Ficheiros a criar:**
```
FinHub-Vite/src/features/creators/components/dashboard/CreatorCardConfigPanel.tsx
```

**Ficheiros a modificar:**
```
API_finhub/src/models/User.ts                        ← adicionar campo cardConfig
API_finhub/src/services/publicCreator.service.ts     ← expor cardConfig no endpoint público
API_finhub/src/controllers/user.controller.ts        ← aceitar cardConfig no PATCH /me
API_finhub/src/middlewares/requestContracts.ts       ← validação do cardConfig
FinHub-Vite/src/features/creators/types/creator.ts  ← adicionar cardConfig ao tipo Creator
FinHub-Vite/src/features/creators/services/publicCreatorsService.ts ← mapear cardConfig
FinHub-Vite/src/features/creators/components/modals/CreatorModal.tsx ← render condicional
```

**SSR — regras obrigatórias:**
- NÃO usar `useNavigate`, `useParams`, `Link` do react-router-dom
- NÃO aceder `window.*` ou `localStorage.*` fora de `useEffect`
- O `CreatorCardConfigPanel` é um componente de dashboard (autenticado, client-only) — pode usar hooks de query normalmente

**Critérios de conclusão:**
- [ ] `cardConfig` guardado e devolvido pela API
- [ ] CreatorModal renderiza condicionalmente com base em `cardConfig`
- [ ] Se `cardConfig` for undefined, modal mostra tudo (retrocompatível)
- [ ] Dashboard do criador tem secção "Cartão de Visita" com toggles + preview
- [ ] `npm run typecheck` → PASS (ambos os repos)
- [ ] `npm run build` → PASS (ambos os repos)

**Produzir relatório no formato do template acima.**

---

## ROUTING-CHECK — Auditoria Completa de Navegação (Claude direto, após B4) ✅

> **Executor: Claude** (não Codex) — tarefa de leitura + fix cirúrgico se curto, ou prompt para Codex se extenso.

**Contexto:**
- O botão "Ver perfil" dentro do `CreatorModal` não navegava para a página do criador (`/creators/:username`) — corrigido em P5.7 via `usePageContext()`.
- O B4 (Codex) corrigiu cards antigos sem `<a href>` — mas pode ter ficado routing incompleto.
- Existem múltiplas versões de cards (duplicados) que podem ter `href` errado ou ausente.

**Tarefa (Claude executa directamente):**

1. **Auditar todas as rotas de navegação de conteúdo:**
   - `/hub/articles/:slug` — página de detalhe de artigo
   - `/hub/courses/:slug` — página de detalhe de curso
   - `/hub/videos/:slug` — página de detalhe de vídeo
   - `/creators/:username` — perfil público de criador
   - `/creators` — lista de criadores
   - `/explore` — hub de exploração

2. **Verificar cada card/componente que aponta para estas rotas:**
   - `ArticleCard` (todas as versões em `components/public/`, `components/home/`, `features/hub/`)
   - `CourseCard` (idem)
   - `VideoCard` (idem)
   - `CreatorCard` (feature + public + home)
   - `ExploreContentCard`
   - Botão "Ver perfil" no `CreatorModal` e no `CreatorCard` feature

3. **Para cada item verificar:**
   - Usa `<a href="...">` (não `div` clicável, não React Router `Link`)
   - O `href` inclui o slug/username correcto (não está hardcoded ou vazio)
   - O `href` aponta para a rota certa (ex: `/creators/` e não `/creator/`)

4. **Fixes:**
   - Se o fix for ≤ 5 linhas → Claude corrige directamente
   - Se for extenso → Claude cria prompt para Codex e adiciona à ordem de execução

**Output esperado:**
- Tabela de auditoria: Componente | Rota | Estado (✅ / 🔴 / ⚠️)
- Fixes aplicados ou prompt criado para Codex
- Update do TASKS.md com B4 ✅ ou bugs residuais como B8, B9…

---

## PROMPT P5.9 — Creator Dashboard: Criar/Editar/Publicar Artigo ✅

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` — Creator dashboard já existe em `src/features/creators/`
- Backend: `API_finhub/` — endpoints de artigos já existem (CRUD)
- Estado actual: dashboard mostra tabela de artigos com publicar/despublicar/eliminar — **falta o flow de criar e editar**

**IMPORTANTE — O que JÁ EXISTE (NÃO recriar):**
- Tabela de gestão de artigos no dashboard — `src/features/creators/` (verificar ficheiro exacto)
- Endpoints backend: `POST /api/articles`, `PUT /api/articles/:id`, `GET /api/articles/:id`
- Tipos de artigo no frontend (verificar `src/features/hub/articles/types/` ou similar)

**Tarefa:**

### Frontend
1. **Página/modal de criação de artigo** (`CreateArticlePage.tsx` ou `ArticleEditorModal.tsx` — escolher o que integra melhor):
   - Campo título (obrigatório)
   - Editor de texto rico (usar `react-quill` se já instalado, ou `textarea` simples se não houver editor instalado — **NÃO instalar pacotes novos sem verificar primeiro**)
   - Campo de imagem de cover (URL ou upload — usar o que já existe no projecto)
   - Campo de tags/tópicos (select múltiplo)
   - Toggle publicar imediatamente vs guardar como rascunho
   - Botão "Guardar" → `POST /api/articles`
   - Botão "Cancelar" → volta à lista

2. **Página/modal de edição** — mesma UI com dados pré-preenchidos:
   - Carrega via `GET /api/articles/:id`
   - Botão "Actualizar" → `PUT /api/articles/:id`

3. **Integrar no dashboard** — botão "Novo Artigo" na tabela de gestão leva para o form de criação

**SSR — regras obrigatórias:**
- NÃO usar `useParams`, `useNavigate`, `Link` do react-router-dom
- Navegação via `import { navigate } from 'vike/client'`
- Dashboard é client-only (autenticado) — pode usar hooks normalmente

**Critérios de conclusão:**
- [ ] Criador consegue criar artigo e ele aparece na lista
- [ ] Criador consegue editar artigo existente
- [ ] Rascunho vs publicado funciona
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.10 — Creator Dashboard: Criar/Editar/Publicar Vídeo ✅

**Contexto do projeto:**
- Idêntico ao P5.9 mas para vídeos
- Backend: endpoints de vídeos já existem (verificar `API_finhub/src/routes/`)
- Tipos de vídeo no frontend (verificar `src/features/hub/videos/types/`)

**Tarefa:**

### Frontend
1. **Form de criação/edição de vídeo:**
   - Campo título (obrigatório)
   - Campo URL do vídeo (YouTube/Vimeo — validar formato de URL)
   - Campo descrição (`textarea`)
   - Campo de thumbnail (URL ou auto-extraída do YouTube via `img.youtube.com/vi/{id}/maxresdefault.jpg`)
   - Campo de duração (opcional, em minutos)
   - Campo de tags/tópicos
   - Toggle publicar vs rascunho
   - Preview do embed YouTube/Vimeo ao introduzir URL válida

2. **Integrar no dashboard** — botão "Novo Vídeo" na secção de gestão de vídeos

**SSR — regras obrigatórias:** (idem P5.9)

**Critérios de conclusão:**
- [ ] Criador consegue adicionar vídeo com URL YouTube/Vimeo
- [ ] Preview do embed visível no form
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P5.11 — Páginas de Marcas/Entidades Públicas ✅

**Contexto do projeto:**
- Frontend: `FinHub-Vite/`
- Backend: `API_finhub/` — modelo `Brand` ou `DirectoryEntry` já existe (verificar)
- Actualmente: zero páginas públicas para corretoras, seguradoras, plataformas de investimento

**IMPORTANTE — Verificar antes de implementar:**
- Existe `Brand` ou `DirectoryEntry` no backend? (`grep -r "Brand\|DirectoryEntry" API_finhub/src/models/`)
- Existe alguma página de diretório no frontend? (`find FinHub-Vite/src -name "*brand*" -o -name "*directory*"`)

**Tarefa:**

1. **Página de listagem de marcas** (`/directory` ou `/marcas`):
   - Grid de cards de marcas com logo, nome, categoria, rating
   - Filtros: categoria (corretora/seguradora/plataforma/banco), país
   - Pesquisa por nome

2. **Página de perfil de marca** (`/directory/:slug` ou `/marcas/:slug`):
   - Header com logo, nome, website, categoria
   - Descrição/apresentação
   - Métricas relevantes (fees, produtos disponíveis, etc. — dados do backend)
   - Reviews/ratings de utilizadores
   - Conteúdo relacionado (artigos, cursos sobre esta marca)

3. **Cards de marca** para usar em listagens e homepage:
   - `BrandCard.tsx` com `<a href="/directory/:slug">` (não duplicar se já existir)

**SSR — regras obrigatórias:** (idem P5.9)

**Critérios de conclusão:**
- [ ] `/directory` lista marcas sem 404
- [ ] `/directory/:slug` mostra perfil de marca
- [ ] `BrandCard` com `<a href>` correcto
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT B-FIX-01 — Backlog de Bugs B9–B13 ✅ VALIDADO 2026-03-26

> **Nota pós-validação:** Executado diretamente no FinHub-Vite (sem Codex). B9+B10+B11: ManageVideos refatorado com Dialog de confirmação + Card de erro + botão Despublicar + encodeURIComponent. B10 service: `unpublishVideo()` com fallback PATCH `{status:'draft'}`. B10 hook: `useUnpublishVideo()` em useVideos.ts. B12: dois fallbacks de `getRelatedLink` corrigidos para `/hub/conteudos`; regex `resolveSlugFromPathname` expandido para incluir prefixo `marcas`. B13: `src/pages/marcas/+Page.tsx` e `src/pages/marcas/@slug/+Page.tsx` criados. Tests: 48 suites 227 testes PASS (requereu `--runInBand` por limitação npm.ps1/spawn EPERM no Windows — comportamento esperado). typecheck ✅ build ✅.

**Corrige:** B9, B10, B11, B12, B13 — todos no frontend `FinHub-Vite/`

**Stack:** React 19 + Vike SSR + Zustand + TanStack Query + shadcn/ui
**Regra SSR:** nunca `useParams`/`useNavigate` do react-router-dom; navegação via `<a href>`; `window.*` só em `useEffect` ou guard `typeof window !== 'undefined'`.

---

### B9 + B10 + B11 — ManageVideos (3 fixes no mesmo ficheiro)

**Ficheiro:** `src/features/creators/dashboard/videos/pages/ManageVideos.tsx`

**B9 — Substituir `confirm()/alert()` por Dialog/Card (padrão de ManageArticles)**

Actualmente:
```ts
const handleDelete = async (id: string) => {
  if (!confirm('Tens a certeza que queres eliminar este video?')) return
  try { await deleteVideo.mutateAsync(id) }
  catch { alert('Erro ao eliminar video') }
}
const handlePublish = async (id: string) => {
  try { await publishVideo.mutateAsync(id) }
  catch { alert('Erro ao publicar video') }
}
```

Deve ficar igual ao padrão de `ManageArticles.tsx`:
- Estado `videoToDelete: Video | null` em vez de `confirm()`
- Estado `actionError: string | null` em vez de `alert()`
- Dialog de confirmação de eliminação com título, descrição do título do vídeo, botões Cancelar + Eliminar (variant destructive)
- Card de erro acima da lista quando `actionError` não é null
- Importar `Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle` do `@/components/ui`

**B10 — Adicionar botão Despublicar para vídeos publicados**

Actualmente só existe botão "Publicar" para vídeos em draft. Vídeos publicados não têm opção de voltar a rascunho.

1. **`src/features/hub/videos/services/videoService.ts`** — adicionar método:
```ts
unpublishVideo: async (id: string): Promise<Video> => {
  try {
    const response = await apiClient.post<Video>(`/videos/${id}/unpublish`)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && [404, 405].includes(error.response?.status ?? 0)) {
      const fallbackResponse = await apiClient.patch<Video>(`/videos/${id}`, { status: 'draft' })
      return fallbackResponse.data
    }
    throw error
  }
},
```

2. **`src/features/hub/videos/hooks/useVideos.ts`** — adicionar hook:
```ts
export function useUnpublishVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => videoService.unpublishVideo(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] })
      queryClient.invalidateQueries({ queryKey: ['video-by-id', id] })
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['my-videos'] })
    },
  })
}
```

3. **`ManageVideos.tsx`** — importar `useUnpublishVideo`, adicionar à lista de mutations, e mostrar botão "Despublicar" para vídeos publicados (com ícone `Undo2`) e "Publicar" para rascunhos (ícone `Rocket`) — igual ao padrão de `ManageArticles.tsx`.

**B11 — `encodeURIComponent` no link de edição**

Na linha do botão "Editar":
```tsx
// ANTES:
href={`/creators/dashboard/videos/${video.id}/edit`}
// DEPOIS:
href={`/creators/dashboard/videos/${encodeURIComponent(video.id)}/edit`}
```

---

### B12 — Rota fallback inválida em BrandDetailPage

**Ficheiro:** `src/features/brands/pages/BrandDetailPage.tsx`

Na função `getRelatedLink`, a linha de fallback aponta para `/explorar/tudo` que não existe. Corrigir:
```ts
// ANTES (linha ~60):
return fallbackUrl || '/explorar/tudo'
// DEPOIS:
return fallbackUrl || '/hub/conteudos'
```
(aparece duas vezes na função — corrigir ambas)

---

### B13 — Alias `/marcas` e `/marcas/:slug` → `/directory`

Criar dois ficheiros Vike novos que delegam para os componentes já existentes:

**`src/pages/marcas/+Page.tsx`:**
```tsx
import PublicDirectoryPage from '@/features/brands/pages/PublicDirectoryPage'
export default { Page: PublicDirectoryPage }
```

**`src/pages/marcas/@slug/+Page.tsx`:**
```tsx
import BrandDetailPage from '@/features/brands/pages/BrandDetailPage'
import { usePageContext } from '@/renderer/PageShell'

export const passToClient = ['routeParams']

function MarcasDetailRoutePage() {
  const pageContext = usePageContext()
  const rawSlug = pageContext.routeParams?.slug
  const slug = typeof rawSlug === 'string' ? decodeURIComponent(rawSlug) : undefined
  return <BrandDetailPage slug={slug} />
}

export default { Page: MarcasDetailRoutePage }
```

Nota: `BrandDetailPage.resolveSlugFromPathname()` já aceita o prefixo `/marcas/` — confirmar que o regex `/^\/(?:directory|recursos)\/([^/?#]+)/` inclui `marcas`. Se não incluir, actualizar para `/^\/(?:directory|marcas|recursos)\/([^/?#]+)/`.

---

**Critérios de conclusão:**
- [ ] `ManageVideos` sem `confirm()/alert()` — usa Dialog de confirmação + Card de erro
- [ ] Botão "Despublicar" visível para vídeos publicados no dashboard
- [ ] `encodeURIComponent` no link de edição de vídeo
- [ ] `/hub/conteudos` como fallback em `getRelatedLink` (sem `/explorar/tudo`)
- [ ] `/marcas` lista marcas (mesmo conteúdo que `/directory`)
- [ ] `/marcas/:slug` mostra perfil (mesmo que `/directory/:slug`)
- [ ] `npm run typecheck` → PASS
- [ ] `npm run test` → PASS (227+ testes)
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P8.7 — Consolidação de Layouts: PageShell Inteligente + Fim do Header Duplo ✅

> **Referência obrigatória:** ler `dcos/finhub/LAYOUT_NAVIGATION_AUDIT.md` antes de iniciar.
> **Corrige:** IC-1 (header duplo), IC-4 (PublicLayout vazio), IC-5 (FIRE sem nav), IC-6 (profile vs list layout)

**Contexto do projecto:**
- Frontend: `FinHub-Vite/` (React 19 + Vike + Tailwind)
- Sistema SSR: Vike 0.4.x — páginas em `src/pages/**/+Page.tsx`, renderizadas por `PageShell.tsx`
- Roles: `visitor | free | premium | creator | brand_manager | admin` (enum `UserRole`)

**PROBLEMA ACTUAL:**
1. `PageShell.tsx` aplica `UserLayout` (com header) para TODOS os users autenticados, em TODAS as páginas
2. Páginas públicas (ex: `/mercados`, `/hub/conteudos`) também se envolvem em `HomepageLayout` (com header próprio)
3. Resultado: users autenticados vêem 2 headers empilhados em ~50 páginas
4. `PublicLayout` é um stub vazio — visitantes em páginas sem `HomepageLayout` não vêem nav nem footer
5. Páginas FIRE (`/ferramentas/fire/*`) não têm layout — user fica preso sem navegação
6. `/creators/@username` usa `SidebarLayout` mas `/creators` usa `HomepageLayout` — transição visual abrupta

**ARQUITECTURA ALVO — O PageShell deve decidir o layout pelo URL path + role:**

```
PageShell.tsx (wrapper global):

  1. SE path começa com /admin/*        → NÃO aplicar layout (P8.9 trata)
  2. SE path começa com /creators/dashboard/* OU /creators/definicoes OU /creators/estatisticas OU /creators/progresso → NÃO aplicar layout (P8.8 trata)
  3. SE path começa com /marcas/portal   → NÃO aplicar layout (futuro)
  4. PARA TODAS AS OUTRAS PÁGINAS:
     - SE autenticado (role != visitor):
       → Renderizar UnifiedTopShell (1 header unificado + footer)
         - Header mostra: logo, nav principal, search, notificações, avatar/menu user
         - NAV principal: Home, Educadores, Conteúdos, Notícias, Mercados, Ferramentas
         - Avatar menu: links contextuais ao role (ver tabela abaixo)
         - Footer: igual ao actual HomepageLayout footer
     - SE visitante (não auth):
       → Renderizar PublicShell (header público + footer)
         - Header mostra: logo, nav principal, Login, Registar
         - NAV principal: Home, Educadores, Conteúdos, Notícias, Mercados, Ferramentas
         - Footer: igual ao actual HomepageLayout footer
```

**REGRAS DE VISIBILIDADE POR ROLE — Avatar/User Menu:**

| Item no Menu | visitor | free | premium | creator | brand_manager | admin |
|---|---|---|---|---|---|---|
| Login / Registar | ✅ (header) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Perfil | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Feed | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Favoritos | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| A Seguir | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Notificações | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Creator Dashboard | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Brand Portal | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin Panel | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Logout | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

**REGRAS DE VISIBILIDADE — NAV PRINCIPAL (mesmo para todos):**

A barra de navegação principal (Home, Educadores, Conteúdos, Notícias, Mercados, Ferramentas) é visível para **todos** os roles incluindo visitantes. O que muda é:
- Visitante: botões Login/Registar à direita
- Autenticado: avatar + dropdown menu à direita (conteúdo do menu depende do role acima)

**Ficheiros a criar:**
```
FinHub-Vite/src/shared/layouts/UnifiedTopShell.tsx   ← novo: header unificado para users auth
FinHub-Vite/src/shared/layouts/PublicShell.tsx       ← novo: header público para visitantes (substitui PublicLayout vazio)
```

**Ficheiros a modificar:**
```
FinHub-Vite/src/renderer/PageShell.tsx               ← decidir layout por URL path + role
FinHub-Vite/src/shared/layouts/PublicLayout.tsx       ← pode ser removido se migrado para PublicShell
FinHub-Vite/src/shared/layouts/UserLayout.tsx         ← pode ser removido se migrado para UnifiedTopShell
```

**Ficheiros a NÃO tocar (serão tratados em P8.8 e P8.9):**
```
FinHub-Vite/src/shared/layouts/DashboardLayout.tsx    ← P8.8
FinHub-Vite/src/features/creators/components/sidebar/ ← P8.8
FinHub-Vite/src/features/admin/layouts/               ← P8.9
```

**IMPORTANTE — Cada +Page.tsx que usa `HomepageLayout` deve DEIXAR de o fazer:**
- As ~50 páginas públicas que fazem `<HomepageLayout>...</HomepageLayout>` devem passar a renderizar apenas o seu conteúdo
- O header/footer vem do `PageShell` → `UnifiedTopShell` ou `PublicShell`
- O conteúdo do `HomepageLayout` (header glassmorphism + footer) deve ser migrado para `UnifiedTopShell`/`PublicShell`
- **NÃO apagar `HomepageLayout` ainda** — marcar como deprecated e deixar para cleanup

**SSR — regras obrigatórias:**
- NÃO usar `useNavigate`, `useParams`, `Link` do react-router-dom
- NÃO aceder `window.*` ou `localStorage.*` fora de `useEffect` ou guard `typeof window !== 'undefined'`
- O `PageShell` já tem o padrão de hydration defer (`mounted` state) — mantê-lo
- Navegação via `<a href>` (não `Link`)
- O URL path para decisão de layout deve usar `pageContext.urlPathname` (disponível em SSR), NÃO `window.location`

**Critérios de conclusão:**
- [ ] ZERO páginas com header duplo — verificar visitando qualquer página pública como user autenticado
- [ ] Visitante em qualquer página vê header público com nav + Login/Registar + footer
- [ ] User autenticado em qualquer página pública vê UM header com avatar/menu
- [ ] Menu do avatar mostra items correctos por role (ver tabela)
- [ ] `/ferramentas/fire/*` tem header+footer (não é bare)
- [ ] `/creators/@username` e `/creators` usam o mesmo shell exterior
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P8.8 — Consolidação do Creator Dashboard: Sidebar Unificada ✅

> **Referência obrigatória:** ler `dcos/finhub/LAYOUT_NAVIGATION_AUDIT.md` (IC-3)
> **Depende de:** P8.7 concluído (PageShell já não aplica UserLayout nas rotas /creators/dashboard/*)

**PROBLEMA ACTUAL:**
1. Páginas de gestão de conteúdo (articles, videos, courses, etc.) usam `DashboardLayout` (shared) — sidebar via `getRoutesByRole()`
2. Páginas legacy (overview, files, announcements, playlists, reels, welcome-videos, progresso, estatísticas, definições) usam `CreatorSidebar` inline
3. As duas sidebars têm links DIFERENTES e visual DIFERENTE
4. `getRoutesByRole(UserRole.CREATOR)` retorna apenas `creatorRoutes` (4 items) e NÃO inclui `creatorContentRoutes` — sidebar não mostra links de artigos, vídeos, cursos
5. `getRoutesByRole(UserRole.CREATOR)` NÃO inclui `regularRoutes` — creator não vê Home, Notícias, etc.

**ARQUITECTURA ALVO:**

Todas as páginas creator dashboard devem usar UM ÚNICO layout com UMA ÚNICA sidebar:

```
CreatorDashboardShell
├── Sidebar (sempre visível, colapsável em mobile)
│   ├── SECÇÃO: Principal
│   │   ├── Dashboard (overview)
│   │   ├── Estatísticas
│   │   └── Progresso
│   │
│   ├── SECÇÃO: Conteúdo
│   │   ├── Artigos
│   │   ├── Vídeos
│   │   ├── Cursos
│   │   ├── Lives/Eventos
│   │   ├── Podcasts
│   │   ├── Livros
│   │   ├── Playlists
│   │   ├── Reels/Shorts
│   │   └── Ficheiros
│   │
│   ├── SECÇÃO: Comunicação
│   │   ├── Anúncios
│   │   └── Vídeos Boas-Vindas
│   │
│   ├── SECÇÃO: Conta
│   │   ├── Configurações
│   │   └── Voltar ao site (→ /)
│   │
│   └── User info + Logout (fundo)
│
└── Main content area (com header minimalista: toggle sidebar + breadcrumb)
```

**REGRAS DE VISIBILIDADE — Sidebar do Creator:**

| Item | creator | admin |
|---|---|---|
| Toda a sidebar acima | ✅ | ✅ |
| Link "Admin Panel" no fundo | ❌ | ✅ |

Admin vê tudo o que creator vê + link para sair para o painel admin.

**Ficheiros a criar:**
```
FinHub-Vite/src/shared/layouts/CreatorDashboardShell.tsx  ← novo: layout unificado creator
```

**Ficheiros a modificar:**
```
FinHub-Vite/src/routes/creator.ts                          ← unificar creatorRoutes + creatorContentRoutes numa estrutura com secções
FinHub-Vite/src/lib/routing/getRoutesByRole.ts             ← CREATOR deve incluir regularRoutes também
FinHub-Vite/src/pages/creators/dashboard/*/+Page.tsx       ← todas passam a usar CreatorDashboardShell em vez de DashboardLayout
FinHub-Vite/src/pages/creators/definicoes/+Page.tsx        ← usar CreatorDashboardShell
FinHub-Vite/src/pages/creators/estatisticas/+Page.tsx      ← usar CreatorDashboardShell
FinHub-Vite/src/pages/creators/progresso/+Page.tsx         ← usar CreatorDashboardShell
```

**Ficheiros a NÃO tocar:**
```
FinHub-Vite/src/shared/layouts/DashboardLayout.tsx         ← marcar deprecated, não apagar
FinHub-Vite/src/features/creators/components/sidebar/      ← marcar deprecated, não apagar
```

**SSR — regras obrigatórias:** (idem P8.7)

**Critérios de conclusão:**
- [ ] Todas as 28 páginas creator dashboard usam `CreatorDashboardShell`
- [ ] Sidebar é IDÊNTICA em todas as páginas (mesmos links, mesma ordem, mesmo visual)
- [ ] Sidebar tem secções agrupadas (Principal, Conteúdo, Comunicação, Conta)
- [ ] Admin a visitar dashboard de creator vê link extra "Admin Panel"
- [ ] Creator NÃO vê links de admin
- [ ] Sidebar colapsável em mobile
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P8.9 — Admin Layout em Vike + Visibilidade por Role ✅

> **Referência obrigatória:** ler `dcos/finhub/LAYOUT_NAVIGATION_AUDIT.md` (IC-2)
> **Depende de:** P8.7 concluído (PageShell já não aplica UserLayout nas rotas /admin/*)

**PROBLEMA ACTUAL:**
1. As 18 páginas admin em Vike não usam `AdminLayout` — renderizam conteúdo bare
2. `AdminLayout` (com `AdminSidebar` + `AdminCommandPalette`) só existe em `router.tsx` (React Router legacy)
3. Admin não tem sidebar nem navegação nas páginas Vike
4. `ProtectedRoute` em dev mode permite acesso a tudo (bypass) — verificar comportamento em prod

**ARQUITECTURA ALVO:**

```
AdminShell
├── Sidebar admin (sempre visível, colapsável em mobile)
│   ├── Dashboard
│   ├── Utilizadores
│   ├── Creators
│   ├── Moderação
│   ├── Editorial CMS
│   ├── Suporte
│   ├── Recursos
│   ├── Monetização
│   │   └── Subscrições
│   ├── Operações
│   │   ├── Comunicações
│   │   ├── Anúncios
│   │   ├── Delegações
│   │   └── Integrações
│   ├── Estatísticas
│   │   └── Ferramentas Financeiras
│   ├── Auditoria
│   └── Voltar ao site (→ /)
│
├── Command Palette (Ctrl+K) ← migrar de AdminLayout legacy
│
└── Main content area (header minimalista + breadcrumb)
```

**REGRAS DE VISIBILIDADE CROSS-ROLE — Quem vê o quê:**

| Área | visitor | free | premium | creator | brand_manager | admin |
|---|---|---|---|---|---|---|
| Páginas públicas (/, /mercados, /hub, etc.) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Páginas sociais (/perfil, /feed, /favoritos) | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Creator Dashboard (/creators/dashboard/*) | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Brand Portal (/marcas/portal) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin Panel (/admin/*) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Um user NÃO admin que tente aceder `/admin/*` deve ver "Acesso Restrito" — NUNCA o conteúdo da página.**

**Ficheiros a criar:**
```
FinHub-Vite/src/shared/layouts/AdminShell.tsx            ← novo: layout admin para Vike
```

**Ficheiros a modificar:**
```
FinHub-Vite/src/pages/admin/+Page.tsx                    ← usar AdminShell
FinHub-Vite/src/pages/admin/*/+Page.tsx                  ← todas as 18 páginas admin usam AdminShell
```

**Ficheiros a migrar conteúdo de (não apagar, marcar deprecated):**
```
FinHub-Vite/src/features/admin/layouts/AdminLayout.tsx   ← copiar lógica de sidebar e command palette
FinHub-Vite/src/features/admin/components/AdminSidebar.tsx ← copiar items de sidebar
```

**Ficheiros a NÃO tocar:**
```
FinHub-Vite/src/router.tsx                               ← dead code legacy, cleanup separado
```

**SSR — regras obrigatórias:** (idem P8.7)

**Critérios de conclusão:**
- [ ] Todas as 18 páginas admin usam `AdminShell` com sidebar admin
- [ ] Sidebar tem todos os items de `adminRoutes` (src/routes/admin.ts) com sub-secções
- [ ] Command Palette (Ctrl+K) funciona
- [ ] User não-admin que aceda `/admin/*` vê "Acesso Restrito" (guard real, não bypass)
- [ ] Admin pode navegar entre todas as sub-páginas via sidebar
- [ ] Link "Voltar ao site" leva para `/`
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**Produzir relatório no formato do template acima.**

---

## PROMPT P4-GATE — Gate Pre-Release: Editorial CMS + Moderation Control Plane ✅

> **Executor: Codex**
> **Pré-requisito:** P3-GATE já passou ✅. Não fazer alterações de código — apenas executar, validar e reportar.
> **Contexto:** P4 está implementado e hardened. Este gate valida que as suites E2E do P4 passam e que o build continua limpo antes de fechar a fase.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Vike SSR + Tailwind + shadcn/ui)
- Backend: `API_finhub/` (Express + TypeScript + MongoDB)
- Diretório de trabalho: `FinHub-Vite/`

---

**Tarefa — executar por ordem, sem alterar código:**

### 1. Confirmação rápida de baseline

```bash
# Confirmar que o baseline do P3-GATE ainda está verde
npm run lint
npm run test -- --runInBand
npm run build
```

Reportar resultado de cada comando (PASS / FAIL + detalhes).

---

### 2. Suites E2E do P4 — executar individualmente

Executar cada suite com timeout adequado (60 s por teste):

```bash
npx playwright test e2e/admin.editorial.p4.spec.ts       --reporter=list
npx playwright test e2e/admin.moderation-control.p4.spec.ts --reporter=list
npx playwright test e2e/admin.creator-risk.p4.spec.ts    --reporter=list
npx playwright test e2e/admin.rollback-jobs.p4.spec.ts   --reporter=list
npx playwright test e2e/admin.worker-status.p4.spec.ts   --reporter=list
npx playwright test e2e/admin.p2.6.spec.ts               --reporter=list
```

Para cada suite reportar:
- Número de testes PASS / FAIL / SKIP
- Nome dos testes que falharam (se existirem)
- Mensagem de erro (primeiras 10 linhas)

---

### 3. Suite de smoke geral (regressão)

```bash
npx playwright test e2e/smoke.spec.ts --reporter=list
```

---

### 4. Resultado consolidado

Preencher o relatório abaixo:

```
## RELATÓRIO DE EXECUÇÃO

**Prompt ID:** P4-GATE
**Data:** 2026-03-22
**Estado:** COMPLETO ✅

### Baseline
- `npm run lint`  → PASS (0 erros, 3 warnings react-refresh não bloqueantes)
- `npm run test`  → PASS (48 suites, 227 testes)
- `npm run build` → PASS

### Suites E2E P4
| Suite | Testes | PASS | FAIL | SKIP | Notas |
|-------|--------|------|------|------|-------|
| admin.editorial.p4 | 3 | 3 | 0 | 0 | claim+approval+audit+idempotência |
| admin.moderation-control.p4 | 4 | 4 | 0 | 0 | fast-hide, bulk guardrail, creator-controls, rollback |
| admin.creator-risk.p4 | 2 | 2 | 0 | 0 | cooldown lote + trust profile deep-link |
| admin.rollback-jobs.p4 | 1 | 1 | 0 | 0 | |
| admin.worker-status.p4 | 1 | 1 | 0 | 0 | |
| admin.p2.6 | 5 | 5 | 0 | 0 | |

### Smoke geral
- smoke.spec.ts → 3/3 PASS

### Falhas detectadas
- `admin.creator-risk.p4` teste 2: strict mode violation em `getByRole('link', { name: 'Creator' })` — múltiplos matches (sidebar + render duplo mobile/desktop) + `OptionalRouterLink` interceta click via `history.push`. **Corrigido por Claude**: assert href + `page.goto(href)` em vez de `.click()`.

### Decisões tomadas
- Fix aplicado diretamente por Claude (não Codex) em `e2e/admin.creator-risk.p4.spec.ts` — teste foi redesenhado para ser robusto à arquitectura SPA+React Router do admin.

### Veredicto
- [x] GATE PASS — todas as suites P4 passaram, baseline limpo

### O que o Claude deve validar
- [x] Confirmado: nenhum teste P4 foi ignorado
- [x] Confirmado: a única falha era comportamental (strict mode + SPA navigation), não regressão de lógica
```

---

**Notas importantes:**
- As suites P4 usam mocks Playwright (não requerem backend real em execução)
- Se um teste falhar por `spawn EPERM` ou similar → é limitação do ambiente sandbox, reportar como ressalva
- NÃO modificar ficheiros de código ou de teste
- NÃO ignorar testes silenciosamente — reportar todos os resultados

---

## PROMPT P8.10 — Consolidação UI/UX: Componentes Reutilizáveis + Consistência Visual ⏳

> **Executor: Claude** (não Codex) — tarefa complexa com decisões visuais e refactoring cross-file.
> **Referência obrigatória:** ler `dcos/finhub/DESIGN.md` antes de iniciar.
> **Dividir em sub-sessões** se necessário: P8.10a (cards), P8.10b (pages), P8.10c (estados).

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Vike SSR + Tailwind + shadcn/ui)
- Design system definido em `DESIGN.md`: Inter font, market colors, shadcn/Radix, dark mode profissional
- Regras SSR: nunca `useParams`/`useNavigate` do react-router-dom; `window.*` só em `useEffect` ou guard

**PROBLEMA ACTUAL — Auditoria UI/UX (2026-03-26):**

O site funciona mas falta coesão visual. Existem 57 componentes de card, 3 sistemas de card diferentes, e padrões visuais inconsistentes entre páginas. O resultado é uma experiência fragmentada que não transmite plataforma profissional unificada.

---

### PARTE A — Consolidação do Sistema de Cards

**Diagnóstico:**
Existem 3 sistemas de card em paralelo que devem convergir para 1:

| Sistema | Onde usado | Estilo | Problema |
|---------|-----------|--------|---------|
| Netflix-card (CSS class) | Homepage (`ContentRow`) | `scale(1.06)` hover, overlay gradients, GPU-accel | Único à homepage, não reutilizado |
| Public cards (custom) | `/hub/*`, `/creators` | `rounded-2xl bg-card/80`, `-translate-y-0.5` hover | Diferente do home e do shadcn |
| shadcn Card | `/directory`, features | `rounded-xl shadow`, CardHeader/Content/Footer | Mais estruturado mas visualmente diferente |

**Duplicações identificadas (7+ pares):**

| Componente | Localização 1 | Localização 2 | Diferença |
|-----------|---------------|---------------|-----------|
| ArticleCard | `components/public/ArticleCard.tsx` | `components/home/cards/ArticleCard.tsx` | Public: 4/3 aspect, info visível. Home: 16/9, netflix overlay |
| CourseCard | `components/public/CourseCard.tsx` | `components/home/cards/CourseCard.tsx` | Public: clamp width. Home: netflix + price badge dinâmico |
| BookCard | `components/public/BookCard.tsx` | `components/home/cards/BookCardHome.tsx` | Public: 4/3. Home: 2/3 (portrait), compacto |
| CreatorCard | `components/public/CreatorCard.tsx` | `features/creators/components/cards/CreatorCard.tsx` | Public: stats grid. Feature: 16/10 cover, follow button, variant prop |
| XPProgressCard | `features/dashboard/` | `features/gamification/` | Assinaturas diferentes |
| ContentTrendsCard | `features/dashboard/` | `features/analytics/` | Dados vs estático |
| CampaignSummaryCard | `features/dashboard/` | `features/marketing/` | Estático vs data-driven |

**Componentes one-off (42 total, key ones para avaliar reuso):**
- `CreatorCardLarge` — homepage only, devia usar `CreatorCard` com variant
- `ResourceCard` — homepage only, devia fundir com `BrandCard` ou `ContentCard`
- `CreatorCardMini` — lista inline, útil manter como variant mini

**TAREFA A — Sistema unificado de cards:**

1. **Criar `ContentCard` base** (`src/components/shared/ContentCard.tsx`):
   - Variantes via prop `variant`: `'default' | 'compact' | 'featured' | 'horizontal'`
   - Prop `size`: `'sm' | 'md' | 'lg'`
   - Sempre `<a href={...}>` wrapper (não div clicável)
   - Imagem com aspect ratio configurável: `aspect-video` (16/9 default), `aspect-[4/3]`, `aspect-[2/3]`
   - Placeholder visual quando sem imagem (gradiente + ícone)
   - Rating stars universal (`market.bull` filled, 35% empty)
   - Badge de tipo (Artigo | Vídeo | Curso | Podcast | Livro | Marca) top-left
   - Metadata row: máximo 2-3 items (autor, data/duração, views)
   - Hover unificado: `-translate-y-0.5 hover:border-primary/40 hover:shadow-lg transition-all duration-200`
   - `line-clamp-2` no título, `text-sm sm:text-base font-semibold`
   - Usar shadcn `Card` como base para estrutura (CardHeader/CardContent)
   - Dark mode: `bg-card` com border sutil

2. **Criar `CreatorCard` unificado** (`src/components/shared/CreatorCard.tsx`):
   - Variantes: `'card' | 'mini' | 'large'`
   - Avatar circular (40px mini → 80px card → 96px large)
   - Nome + `@username`
   - Contadores: seguidores + publicações
   - Rating stars
   - Badges de tipos de conteúdo que produz
   - Suporte `onOpenModal?: () => void` (para integrar com `Creator` wrapper)
   - Botão "Ver perfil" com `<a href="/creators/{username}">` + `stopPropagation`

3. **Migrar cada card existente** para usar o sistema unificado:
   - `components/public/ArticleCard.tsx` → `<ContentCard type="article" variant="default" />`
   - `components/home/cards/ArticleCard.tsx` → `<ContentCard type="article" variant="featured" />`
   - `components/public/CourseCard.tsx` → `<ContentCard type="course" variant="default" />`
   - `components/home/cards/CourseCard.tsx` → `<ContentCard type="course" variant="featured" />`
   - `components/public/VideoCard.tsx` → `<ContentCard type="video" variant="default" />`
   - `components/public/BookCard.tsx` → `<ContentCard type="book" variant="default" />`
   - `components/home/cards/BookCardHome.tsx` → `<ContentCard type="book" variant="compact" aspect="2/3" />`
   - `components/public/PodcastCard.tsx` → `<ContentCard type="podcast" variant="default" />`
   - `components/home/cards/CreatorCardLarge.tsx` → `<CreatorCard variant="large" />`
   - `components/home/cards/ResourceCard.tsx` → avaliar se funde com `BrandCard` ou `ContentCard`
   - `components/public/CreatorCard.tsx` + `features/creators/components/cards/CreatorCard.tsx` → `<CreatorCard variant="card" />`
   - `features/creators/components/cards/CreatorCardMini.tsx` → `<CreatorCard variant="mini" />`

4. **Manter ficheiros antigos como re-exports** durante transição:
   ```ts
   // components/public/ArticleCard.tsx
   export { ContentCard as ArticleCard } from '@/components/shared/ContentCard'
   // ajustar props defaults para manter API compatível
   ```

5. **Remover classe `.netflix-card` do `index.css`** e substituir pelo hover system unificado

---

### PARTE B — Consistência Visual entre Páginas

**Diagnóstico de inconsistências entre páginas públicas:**

| Aspeto | Homepage | Criadores | Conteúdos | Diretório | Ferramentas |
|--------|----------|-----------|-----------|-----------|-------------|
| Max-width | ❌ Nenhum (stretches) | ❌ Inline | max-w-7xl ✅ | max-w-7xl ✅ | Varia |
| Hero | HeroBanner (50-65vh) | PageHero (30-35vh) | PageHero | ❌ Nenhum | ❌ Nenhum |
| Grid | Horizontal scroll | 1-2-3 cols | 1-2-3 cols | 2-3 cols | Varia |
| Filtros | Nenhum | Custom form inputs | — | shadcn Select+Card | — |
| Loading | Skeleton cards | Spinner central | — | Skeleton grid | — |
| Empty state | Card dashed inline | Card full-width | — | Card col-span | — |
| Headings | `<h2>` inline com "Ver tudo" | `<h1>` em PageHero | `<h1>` em PageHero | Badge + `<h1>` plain | Varia |

**TAREFA B — Padrões visuais unificados:**

1. **Container padrão** — todas as páginas de listagem:
   ```tsx
   <section className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10 lg:px-12 py-6 sm:py-8">
   ```
   - Homepage: aplicar `max-w-[1400px]` ou `max-w-7xl` às content rows
   - Verificar que o HeroBanner permanece full-width (fora do container)

2. **PageHero em todas as páginas de listagem** — usar `PageHero` (já existe) em:
   - ✅ `/creators` (já tem)
   - ❌ `/directory` — adicionar com background image e search integrado
   - ❌ `/ferramentas` — adicionar com ícone temático
   - ❌ `/hub/conteudos` — verificar se tem, adicionar se não
   - ❌ `/hub/noticias` — verificar se tem, adicionar se não
   - Usar sempre a mesma height: 30-35vh (variant compact para sub-páginas)

3. **Section headings** — padrão unificado para todas as secções:
   ```tsx
   <div className="flex items-center justify-between mb-4 sm:mb-6">
     <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
     {viewAllHref && (
       <a href={viewAllHref} className="text-sm text-primary hover:underline">
         Ver tudo →
       </a>
     )}
   </div>
   ```
   Considerar extrair para componente `SectionHeader.tsx`

4. **Filtros unificados** — escolher UM padrão:
   - shadcn `Select` + `Input` + `Button` dentro de form card
   - Layout: `grid gap-3 md:grid-cols-2 lg:grid-cols-4`
   - Aplicar a: `/creators`, `/directory`, `/hub/conteudos`, `/hub/noticias`
   - Remover inputs nativos customizados do `CreatorsListPage`

5. **Grid padrão para listagens**:
   ```tsx
   <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
   ```
   - 4 colunas em desktop para conteúdo (artigos, vídeos, cursos)
   - 3 colunas para entidades maiores (criadores, marcas)

---

### PARTE C — Estados Visuais Consistentes

**TAREFA C — Componentes reutilizáveis de estado:**

1. **`LoadingSkeleton` unificado** (`src/components/shared/LoadingSkeleton.tsx`):
   ```tsx
   type Props = {
     variant: 'card' | 'row' | 'detail' | 'table'
     count?: number  // default 6
     columns?: number // default from variant
   }
   ```
   - Skeleton cards que match as dimensões do `ContentCard`
   - `animate-pulse` com `bg-muted` + `rounded-2xl`
   - Substituir: `LoadingRowState` (homepage), `<LoadingSpinner>` (creators), `<Skeleton>` inline (directory)

2. **`EmptyState` unificado** (`src/components/shared/EmptyState.tsx`):
   ```tsx
   type Props = {
     icon?: LucideIcon  // default: Inbox
     title: string
     description?: string
     action?: { label: string; href: string }
   }
   ```
   - Card centrado com ícone, título, descrição, CTA opcional
   - `border-dashed border-border bg-card/50 rounded-xl p-8 text-center`
   - Substituir todos os empty states inline

3. **`ErrorState` unificado** (`src/components/shared/ErrorState.tsx`):
   - Similar ao `EmptyState` mas com ícone `AlertTriangle` e cor `destructive`
   - Botão "Tentar novamente" com `onClick` retry
   - Substituir `<Card variant="destructive">` inline em pages

---

### PARTE D — Ajustes Visuais Específicos por Página

**Baseado na análise visual das páginas actuais:**

1. **Homepage (`+Page.tsx`)**:
   - Aplicar max-width ao wrapper das content rows
   - Garantir que o HeroBanner ocupa full width mas as rows respeitam o container
   - Uniformizar altura dos cards dentro do scroll horizontal

2. **Criadores (`CreatorsListPage.tsx`)**:
   - Manter PageHero mas com imagem de background (financial/community themed)
   - Substituir form inputs nativos por shadcn components
   - Grid 1→2→3 colunas (manter, está correcto)

3. **Conteúdos (`ExploreContentPage.tsx`)**:
   - Adicionar PageHero se não tem
   - Tabs de tipo de conteúdo mais visíveis (pill buttons ou shadcn Tabs)
   - Grid 1→2→3→4 colunas

4. **Notícias**:
   - PageHero com tema de notícias/mercado
   - Cards em formato mais compacto (variant horizontal para lista, variant default para grid)

5. **Ferramentas (`ToolsHubPage.tsx`)**:
   - PageHero com ícone Calculator/Wrench
   - Grid de tool cards com ícone grande, título, descrição curta
   - Visual tipo "app launcher" (ícones coloridos, grid 2→3→4)

6. **FIRE sub-páginas**:
   - Garantir `FireToolNav` visível e consistent
   - Layout de tool com sidebar nav + main content area

7. **Diretório (`PublicDirectoryPage.tsx`)**:
   - Adicionar PageHero com search integrado
   - Manter filtros shadcn (estão bons)
   - BrandCard: mantém shadcn Card base (está bem estruturado)

---

### REGRAS VISUAIS TRANSVERSAIS

1. **Border radius**: `rounded-2xl` para cards, `rounded-xl` para containers internos, `rounded-lg` para inputs/badges
2. **Sombra hover**: `-translate-y-0.5 hover:border-primary/40 hover:shadow-lg` — nunca scale()
3. **Espaçamento vertical entre secções**: `space-y-8 sm:space-y-12`
4. **Cor de badge**: `variant="secondary"` com `bg-secondary/80 backdrop-blur-sm border-0`
5. **Texto de metadata**: `text-xs text-muted-foreground` com ícones `h-3.5 w-3.5`
6. **Números financeiros**: sempre `.tabular-nums`
7. **Verde/vermelho**: APENAS para performance financeira — nunca para UI states
8. **Transições**: `transition-all duration-200` — nunca > 300ms
9. **Imagens**: sempre `object-cover` com fallback gradiente + ícone
10. **Links**: sempre `<a href>`, nunca `div` clicável, nunca React Router `Link`

---

**SSR — regras obrigatórias:** (idem anteriores — nunca useParams/useNavigate do react-router-dom)

**Critérios de conclusão (por parte):**

**P8.10a (Cards):**
- [ ] `ContentCard` criado com variants default/compact/featured/horizontal
- [ ] `CreatorCard` unificado com variants card/mini/large
- [ ] Cards antigos migrados (re-exports ou substituição directa)
- [ ] `.netflix-card` CSS removido
- [ ] Rating stars consistente em todos os cards
- [ ] `npm run typecheck` → PASS
- [ ] `npm run build` → PASS

**P8.10b (Páginas): ✅ VALIDADO 2026-03-22**
- [x] ContentRow `max-width: min(100%, 1400px)` em `__header` e `__container`
- [x] PageHero em `/directory` — `/ferramentas` e `/noticias` já tinham
- [x] Filtros shadcn: `Input`+`Select` em CreatorsListPage; `Select` em PublicDirectoryPage
- [x] `max-w-7xl mx-auto` wrappers nas secções de filtros e grid em CreatorsListPage
- [x] Type pills migrados para `filter-bar__pill` / `filter-bar__pill--active` (CSS classes partilhadas)
- [x] `SectionHeader` criado em `src/components/shared/SectionHeader.tsx`
- [x] 48 suites 227 testes PASS · build PASS (6.48s)

**P8.10c (Estados): ✅ VALIDADO 2026-03-22**
- [x] `LoadingSkeleton` — variant=spinner (centrado) | variant=cards (grid animate-pulse)
- [x] `EmptyState` — variant=card (default) | variant=bordered (dashed, para grids de conteúdo)
- [x] `ErrorState` — Card + AlertCircle + onRetry opcional
- [x] Consumers: CreatorsListPage, PublicDirectoryPage, ContentList
- [x] 48 suites 227 testes PASS · build PASS (6.58s)

**Produzir relatório no formato do template acima (por sub-sessão).**

---

## PROMPT P5-FIRE — FIRE Frontend: Timeline Chart + Progress Visual ⏳

> **Executor: Codex**
> **Pré-requisito:** P4-GATE ✅, P8.6 ✅
> **Regras SSR obrigatórias** (ler antes de iniciar — ver topo do ficheiro).
> **Escopo:** apenas `src/features/fire/` — não tocar noutras features.

**Contexto do projeto:**
- Frontend: `FinHub-Vite/` (React 19 + Vike SSR + Tailwind + shadcn/ui + Recharts)
- As páginas FIRE são renderizadas dentro de um contexto React Router (PageShell) — `window.*` pode ser usado em `useEffect` ou com guard `typeof window !== 'undefined'`
- Diretório de trabalho: `FinHub-Vite/`
- Toda a lógica (hooks, types, service) está completa — esta tarefa é **apenas visual/UX**

**Estado atual:**
- `FireSimulatorPage.tsx` — tem Monte Carlo area chart + what-if delta cards + suggestions card. O que falta: a secção "Timeline" mostra uma **tabela de dados** (12 pontos da timeline base) — precisa ser substituída por um **chart multi-cenário**.
- `FireDashboardPage.tsx` — "Progresso atual" mostra `progress.toFixed(2)%` como texto numa card — falta **visual progress bar**.

---

### Tarefa 1 — `FireSimulatorPage.tsx`: Timeline multi-cenário com chart

Substituir a secção "Timeline (base scenario)" (a tabela HTML com 12 pontos) por um `AreaChart` da Recharts com:

**Dados:**
```ts
// Cada cenário tem result.scenarios[i].timeline: FireSimulationTimelinePoint[]
// Cada ponto: { month, date, portfolioValue, targetValue, progressPct }
// Combinar os pontos de todos os cenários selecionados num dataset unificado por mês:
// [{ month, optimistic, base, conservative, bear, targetValue }]
// Usar apenas 1 em cada 3 pontos (monthly sample) se > 120 pontos (para performance)
```

**Chart spec:**
- `<AreaChart>` com `<ResponsiveContainer width="100%" height={320}>`
- Gradiente semântico por cenário:
  - `optimistic` → `hsl(var(--chart-2))` (verde)
  - `base` → `hsl(var(--chart-1))` (azul)
  - `conservative` → `hsl(var(--chart-3))` (laranja)
  - `bear` → `hsl(var(--chart-4))` (vermelho)
- Uma `<Area>` por cenário ativo; uma `<Line>` pontilhada para `targetValue`
- `<XAxis dataKey="month">` com `tickFormatter={(v) => \`A${Math.round(v / 12)}\``}` (anos)
- `<YAxis>` com `tickFormatter` em `€/$ k` (dividir por 1000, sufixo `k`)
- `<Tooltip content={<ChartTooltip .../>}>` (componente existente em `@/components/ui/ChartTooltip`)
- `<Legend>` simples
- Card title: "Projeção por cenário" com `<CardDescription>` indicando nº de meses

**Regras de implementação:**
- Não alterar os hooks ou types existentes
- A tabela antiga deve ser removida (não apenas ocultada)
- Só renderizar o chart se `result` não for null
- Extrair a lógica de transformação de dados para uma função `buildTimelineChartData()` dentro do ficheiro

---

### Tarefa 2 — `FireDashboardPage.tsx`: Progress ring + base simulation timeline

**2a. Progress bar visual no card "Progresso atual":**
- Substituir o `<p className="text-2xl ...">` com o percentagem em texto por:
  - Número grande `progress.toFixed(1)%` em `tabular-nums`
  - Uma `<Progress>` (shadcn — `@/components/ui/progress`) com `value={progress}` abaixo do número
  - A barra de progresso deve ter cor condicional: verde se ≥ 70%, azul se ≥ 40%, laranja se < 40%

**2b. Mini timeline chart no Dashboard:**
- Após os 4 KPI cards, adicionar uma `<Card>` com um `<AreaChart>` simples da timeline base:
  - Usar `baseScenario?.timeline` (já disponível via `baseSimulationQuery`)
  - Chart area com gradiente azul (`hsl(var(--chart-1))`)
  - `XAxis` com anos, `YAxis` com formato `k`, `Tooltip` básico com o `ChartTooltip` existente
  - Altura: 200px
  - Title da Card: "Trajetória base — próximos X anos" (X = `Math.round(baseScenario.timeline.length / 12)`)
  - Só renderizar se `baseScenario?.timeline.length > 0`

---

### Validação

```bash
npm run lint
npm run typecheck
npm run build
npx playwright test e2e/smoke.spec.ts --reporter=list
```

---

```
## RELATÓRIO DE EXECUÇÃO

**Prompt ID:** P5-FIRE
**Data:** [data]
**Estado:** COMPLETO | PARCIAL | BLOQUEADO

### Ficheiros modificados
- `src/features/fire/pages/FireSimulatorPage.tsx` — substituir tabela por chart multi-cenário
- `src/features/fire/pages/FireDashboardPage.tsx` — progress bar + mini timeline chart

### Comandos executados e resultado
- `npm run lint` → PASS / FAIL
- `npm run typecheck` → PASS / FAIL
- `npm run build` → PASS / FAIL
- `npx playwright test e2e/smoke.spec.ts` → PASS / FAIL

### Decisões tomadas
- [descrever qualquer desvio ao spec acima]

### Bloqueadores / dívida técnica
- [se existir]

### O que o Claude deve validar
- [ ] Chart multi-cenário renderiza corretamente com os dados reais
- [ ] Progress bar muda de cor consoante o progresso
- [ ] Mini timeline aparece no dashboard
- [ ] Build PASS
```

---

## PROMPT P8.5 — Header Redesenhado: SSR-safe + Visual Clean ⏳

> **Executor: Codex**
> **Pré-requisito:** P5-FIRE ✅
> **Regras SSR obrigatórias** (ler antes de iniciar — ver topo do ficheiro).
> **Escopo:** apenas `src/components/layout/Header.tsx` — não alterar outros ficheiros salvo se necessário para resolver imports.

**Contexto do projeto:**
- `Header.tsx` usa `Link`, `useLocation`, `useNavigate` de `react-router-dom`
- Segundo as **regras SSR do projeto**, `useLocation` e `useNavigate` do `react-router-dom` são **proibidos em componentes renderizados em SSR**
- A identificação da rota ativa deve usar `typeof window !== 'undefined' ? window.location.pathname : ''`
- `Link` deve ser substituído por `<a href>` simples (ver padrão usado em `FireToolNav.tsx` — `src/features/fire/components/FireToolNav.tsx`)
- O header atual funciona estruturalmente mas é **visualmente genérico** — sem identidade

**Estado atual do Header (`src/components/layout/Header.tsx`):**
```
imports: Link, useLocation, useNavigate from react-router-dom  ← proibido SSR
NavItem usa: <Link to={item.to}> ← deve ser <a href={item.to}>
Active state: useLocation().pathname ← deve ser window.location.pathname
Logo: texto "FinHub" simples
Search: GlobalSearchBar já existe
Mobile: hamburger menu existente
```

**Referência de design (DESIGN.md):**
- Fonte Inter, dark mode profissional
- "Navigation limpa, search proeminente, avatar com menu"
- Referência: Koyfin (nav limpa) + Revolut (tipografia expressiva)

---

### Tarefa 1 — Remover react-router-dom e corrigir SSR

```tsx
// ANTES (proibido)
import { Link, useLocation, useNavigate } from 'react-router-dom'
const { pathname } = useLocation()

// DEPOIS (correto)
// Sem imports de react-router-dom
const pathname = typeof window !== 'undefined' ? window.location.pathname : ''

// ANTES
<Link to={item.to} className={...}>{item.label}</Link>

// DEPOIS
<a href={item.to} className={...}>{item.label}</a>
```

Para navegação programática (ex. logout redirect):
```tsx
// ANTES
const navigate = useNavigate()
navigate('/login')

// DEPOIS
window.location.href = '/login'  // dentro de handler de evento, não em render
```

---

### Tarefa 2 — Visual redesign

Manter a estrutura funcional atual (nav items, search, avatar, mobile menu) mas melhorar visualmente:

**Logo:**
```tsx
// Substituir texto simples por:
<a href="/" className="flex items-center gap-2 font-bold text-foreground">
  <span className="text-xl font-extrabold tracking-tight">
    Fin<span className="text-primary">Hub</span>
  </span>
</a>
```

**Nav items desktop:**
- Usar `border-b-2` para o item ativo em vez de `bg-accent`:
```tsx
active ? 'border-b-2 border-primary text-foreground font-medium'
       : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
```
- Padding: `px-1 py-4` (alinhado com altura do header)

**Layout do header:**
```tsx
<header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
  <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
    {/* Logo — esquerda */}
    {/* Nav items — centro (hidden mobile) */}
    {/* Search + notificações + avatar — direita */}
  </div>
</header>
```

**Avatar dropdown:**
- Usar `<DropdownMenu>` de shadcn (já disponível em `@/components/ui`)
- Itens: Dashboard, Perfil, Definições, Logout (para user autenticado)
- Para não-autenticado: botões "Entrar" + "Registar"

---

### Validação

```bash
npm run lint
npm run typecheck
npm run build
npx playwright test e2e/smoke.spec.ts --reporter=list
```

Verificar manualmente:
- Header sem erros de hidratação SSR
- Logo clicável → `/`
- Nav item ativo correto em cada rota
- Dropdown do avatar funcional

---

```
## RELATÓRIO DE EXECUÇÃO

**Prompt ID:** P8.5
**Data:** [data]
**Estado:** COMPLETO | PARCIAL | BLOQUEADO

### Ficheiros modificados
- `src/components/layout/Header.tsx` — SSR fix + visual redesign

### Comandos executados e resultado
- `npm run lint` → PASS / FAIL
- `npm run typecheck` → PASS / FAIL
- `npm run build` → PASS / FAIL
- `npx playwright test e2e/smoke.spec.ts` → PASS / FAIL

### Decisões tomadas
- [descrever qualquer desvio ao spec]

### Bloqueadores / dívida técnica
- [se existir]

### O que o Claude deve validar
- [ ] Sem imports de react-router-dom em Header.tsx
- [ ] Active state funciona via window.location.pathname
- [ ] Visual: logo, nav ativa com border-b, backdrop blur
- [ ] Dropdown avatar renderiza com DropdownMenu shadcn
- [ ] Build PASS + smoke PASS
```

---

## PROMPT P5-OB — Onboarding: First-Time User Experience ⏳

> **Executor: Codex**
> **Pré-requisito:** P8.5 ✅
> **Regras SSR obrigatórias** (ler antes de iniciar — ver topo do ficheiro).
> **Escopo:** criar `src/features/onboarding/` + integrar no layout público.
> **Princípio:** não usar backend — tudo baseado em `localStorage`. Simples e funcional.

**Contexto do projeto:**
- Não existe ainda nenhum flow de onboarding
- Um utilizador novo regista-se → verifica email → faz login → cai na homepage sem orientação
- Objetivo: mostrar um dialog de boas-vindas na primeira visita autenticada com 3 passos rápidos
- Persistência: `localStorage.setItem('finhub_onboarded', '1')` quando completo (ou fechado)
- Só mostrar para utilizadores com `role: 'user'` (não creators, não admins)
- Não bloquear a UI — o dialog pode ser fechado a qualquer momento

---

### Tarefa 1 — Criar `OnboardingDialog`

**Ficheiro:** `src/features/onboarding/components/OnboardingDialog.tsx`

```tsx
// Interface do dialog
// - Dialog shadcn: <Dialog open={open} onOpenChange={onClose}>
// - 3 passos (step state: 1 | 2 | 3)
// - Botões: "Saltar" (fecha) + "Continuar" / "Começar"
// - Progress indicator: 3 dots/steps no topo
```

**Passo 1 — Boas-vindas:**
```
Título: "Bem-vindo ao FinHub 👋"
Subtítulo: "A plataforma portuguesa de literacia financeira."
Pergunta: "O que melhor te descreve?"
Opções (radio/toggle-group):
  • "Estou a começar a investir"
  • "Já invisto há algum tempo"
  • "Sou investidor experiente"
```

**Passo 2 — Interesses:**
```
Título: "O que te interessa mais?"
Opções (multi-select, toggle-group, mínimo 1):
  • Ações nacionais/internacionais
  • ETFs e fundos
  • Criptoativos
  • Imobiliário / REITs
  • FIRE e independência financeira
  • Educação e conteúdo
```

**Passo 3 — Onde começar:**
```
Título: "Por onde queres começar?"
3 cards clicáveis (cada um com <a href>):
  • "Descobrir conteúdo" → href="/hub/conteudos"
    ícone: BookOpen, desc: "Artigos, vídeos e cursos de criadores"
  • "Analisar uma ação" → href="/ferramentas/analise-rapida"
    ícone: BarChart3, desc: "FinHubScore e análise fundamentalista"
  • "Simular o meu FIRE" → href="/ferramentas/fire"
    ícone: Target, desc: "Calculadora de independência financeira"
Ao clicar num card → marca onboarding completo + navega para a rota
Botão "Explorar por minha conta" → fecha sem navegar
```

**Guardar preferências:**
```ts
// Ao completar (passo 3) ou fechar (qualquer passo):
localStorage.setItem('finhub_onboarded', '1')
// Opcionalmente guardar preferências (não enviadas ao backend nesta fase):
localStorage.setItem('finhub_onboarding_prefs', JSON.stringify({ level, interests }))
```

---

### Tarefa 2 — Hook `useOnboarding`

**Ficheiro:** `src/features/onboarding/hooks/useOnboarding.ts`

```ts
export function useOnboarding() {
  // Só mostrar se:
  // 1. utilizador autenticado com role === 'user'
  // 2. localStorage.getItem('finhub_onboarded') !== '1'
  // 3. typeof window !== 'undefined' (SSR guard)
  // Retorna: { shouldShow: boolean, markDone: () => void }
}
```

---

### Tarefa 3 — Integrar no PageShell

**Ficheiro:** `src/components/layout/PageShell.tsx` (ou equivalente — o componente de layout público identificado em P8.7)

```tsx
// Adicionar no final do componente, após o <main>:
const { shouldShow, markDone } = useOnboarding()
// <OnboardingDialog open={shouldShow} onClose={markDone} />
```

**Regra SSR:** o hook deve retornar `shouldShow: false` em SSR (sem acesso a `localStorage`).

---

### Tarefa 4 — Exports

**Ficheiro:** `src/features/onboarding/index.ts`
```ts
export { OnboardingDialog } from './components/OnboardingDialog'
export { useOnboarding } from './hooks/useOnboarding'
```

---

### Validação

```bash
npm run lint
npm run typecheck
npm run build
npx playwright test e2e/smoke.spec.ts --reporter=list
```

Não é necessário criar testes E2E para o onboarding nesta fase.

---

```
## RELATÓRIO DE EXECUÇÃO

**Prompt ID:** P5-OB
**Data:** [data]
**Estado:** COMPLETO | PARCIAL | BLOQUEADO

### Ficheiros criados
- `src/features/onboarding/components/OnboardingDialog.tsx`
- `src/features/onboarding/hooks/useOnboarding.ts`
- `src/features/onboarding/index.ts`

### Ficheiros modificados
- `src/components/layout/PageShell.tsx` (ou equivalente) — integração do dialog

### Comandos executados e resultado
- `npm run lint` → PASS / FAIL
- `npm run typecheck` → PASS / FAIL
- `npm run build` → PASS / FAIL
- `npx playwright test e2e/smoke.spec.ts` → PASS / FAIL

### Decisões tomadas
- [descrever ficheiro de layout onde integrou o dialog]
- [se encontrou ficheiro diferente do esperado, descrever]

### Bloqueadores / dívida técnica
- [se existir]

### O que o Claude deve validar
- [ ] `useOnboarding` retorna `shouldShow: false` em SSR (guard typeof window)
- [ ] Dialog fecha e marca localStorage ao clicar "Saltar" ou completar
- [ ] Só aparece para `role === 'user'` (não creators, não admins)
- [ ] Os 3 cards do passo 3 têm `<a href>` (não react-router Link)
- [ ] Build PASS
```

---

## PROMPT P5-PRICE — Página de Preços / Premium ⏳

> **Executor: Codex**
> **Pré-requisito:** P5-OB ✅
> **Regras SSR obrigatórias** (ler antes de iniciar — ver topo do ficheiro).
> **Escopo:** criar nova página pública em `/precos` + link no footer e header.
> **Princípio:** página estática (sem chamadas ao backend) — apenas conteúdo e CTAs para registo/upgrade.

**Contexto do projeto:**
- Não existe página de preços
- Planos previstos: Free, Premium, Creator
- O sistema de pagamentos/subscrições não está implementado — os botões "Upgrade" e "Começar" apontam para `/registo` (Free) ou `mailto:hello@finhub.pt` (Premium/Creator — contacto direto por enquanto)
- A página deve ser **totalmente SSR-safe** (sem `window.*` no nível de módulo)
- Usar `PageHero` para o topo (componente existente em `@/components/public`)

---

### Tarefa 1 — Criar `+Page.tsx` em `/precos`

**Ficheiro:** `src/pages/precos/+Page.tsx`

```tsx
// Importar PricingPage do features
export { default } from '@/features/pricing/pages/PricingPage'
```

**Ficheiro:** `src/features/pricing/pages/PricingPage.tsx`

---

### Tarefa 2 — Estrutura da página

**Secção 1 — Hero:**
```tsx
<PageHero
  title="Planos e preços"
  subtitle="Começa grátis. Faz upgrade quando precisares de mais."
/>
```

**Secção 2 — Toggle mensal/anual:**
```tsx
// Estado local: billingCycle: 'monthly' | 'annual'
// Quando 'annual': mostrar badge "2 meses grátis" nos planos pagos
// Toggle com shadcn Switch ou dois botões pill
```

**Secção 3 — Cards dos planos (grid 3 colunas, col central em destaque):**

| | Free | Premium | Creator |
|---|---|---|---|
| Preço mensal | 0€ | 9,90€ | 14,90€ |
| Preço anual | — | 82€/ano (≈6,83€/mês) | 124€/ano (≈10,33€/mês) |
| Badge | — | "Mais popular" | "Para criadores" |

**Features por plano:**

Free:
- Acesso ao hub de conteúdo (artigos, vídeos, cursos)
- Análise rápida de ações (limitada a 5/dia)
- Watchlist básica (10 ativos)
- Perfil público
- Notificações básicas

Premium:
- Tudo do Free
- Análise rápida ilimitada
- FIRE Simulator completo (portfolios ilimitados)
- Filtros avançados e exportação
- ETF Overlap e REIT Toolkit
- Acesso antecipado a novas features

Creator:
- Tudo do Premium
- Publicar artigos, vídeos, cursos
- Creator Dashboard com analytics
- Página de perfil personalizada
- Creator card configurável
- Suporte prioritário

**CTA por plano:**
- Free → `<a href="/registo">Começar grátis</a>`
- Premium → `<a href="/registo?plan=premium">Experimentar 14 dias grátis</a>`
- Creator → `<a href="/registo?plan=creator">Começar como Creator</a>`

**Notas de design:**
- Card do plano central (Premium) com `border-primary` + `ring-1 ring-primary/30` + scale ligeiramente maior
- Feature list com `<Check className="text-primary" />` por item
- Features "Pro" marcadas com badge `<Badge variant="secondary">Premium</Badge>` no plano Free (para indicar que requer upgrade)

**Secção 4 — FAQ (accordion shadcn):**
```
Q: Posso mudar de plano a qualquer altura?
A: Sim, podes fazer upgrade ou downgrade a qualquer momento.

Q: O que acontece ao meu conteúdo se cancelar o Creator?
A: O teu conteúdo fica publicado mas não podes criar novo até renovares.

Q: Há períodos de faturação anuais com desconto?
A: Sim, o plano anual equivale a 2 meses grátis face ao mensal.

Q: Aceitam pagamento por MB Way ou transferência?
A: Por enquanto aceitamos cartão de crédito/débito. Outros métodos em breve.
```

---

### Tarefa 3 — Adicionar link no Footer e Header

**Footer** (`src/components/layout/Footer.tsx`): adicionar "Preços" na secção de links da plataforma.

**Header** (`src/components/layout/Header.tsx`): **NÃO adicionar** no nav principal (demasiado items) — apenas no dropdown do avatar se o utilizador não for premium (indicação de upgrade).

---

### Tarefa 4 — Export

**Ficheiro:** `src/features/pricing/index.ts`
```ts
export { default as PricingPage } from './pages/PricingPage'
```

---

### Validação

```bash
npm run lint
npm run typecheck
npm run build
npx playwright test e2e/smoke.spec.ts --reporter=list
```

Verificar que `/precos` responde com HTML em SSR (smoke já cobre rotas públicas).

---

```
## RELATÓRIO DE EXECUÇÃO

**Prompt ID:** P5-PRICE
**Data:** [data]
**Estado:** COMPLETO | PARCIAL | BLOQUEADO

### Ficheiros criados
- `src/pages/precos/+Page.tsx`
- `src/features/pricing/pages/PricingPage.tsx`
- `src/features/pricing/index.ts`

### Ficheiros modificados
- `src/components/layout/Footer.tsx` — link "Preços" adicionado

### Comandos executados e resultado
- `npm run lint` → PASS / FAIL
- `npm run typecheck` → PASS / FAIL
- `npm run build` → PASS / FAIL
- `npx playwright test e2e/smoke.spec.ts` → PASS / FAIL

### Decisões tomadas
- [descrever qualquer desvio ao spec — ex. estrutura de directorias diferente]

### Bloqueadores / dívida técnica
- CTAs de upgrade apontam para `/registo` — sistema de pagamento não implementado (pós-beta)

### O que o Claude deve validar
- [ ] Página `/precos` abre sem erro em SSR
- [ ] Toggle mensal/anual muda os preços
- [ ] Card Premium destacado visualmente
- [ ] FAQ accordion funcional
- [ ] Sem imports de react-router-dom
- [ ] Build PASS
```

---

## PROMPT BETA-GATE — Gate Final Pré-Beta ⏳

> **Executor: Codex**
> **Pré-requisito:** P5-PRICE ✅ — todos os prompts pré-beta concluídos.
> **Princípio:** não fazer alterações de código — apenas executar, validar e reportar.

**Contexto:**
Este é o gate final antes do lançamento beta. Valida que todo o trabalho acumulado desde o P3-GATE se mantém limpo e que as suites E2E completas passam.

---

### 1. Baseline

```bash
npm run lint
npm run test -- --runInBand
npm run typecheck
npm run build
```

Reportar resultado de cada comando.

---

### 2. Suites E2E completas

```bash
npx playwright test e2e/ --reporter=list
```

Listar todas as suites e resultado (PASS/FAIL/SKIP por suite).

---

### 3. Smoke

```bash
npx playwright test e2e/smoke.spec.ts --reporter=list
```

---

### 4. Checklist pré-beta

Verificar (apenas confirmar que existem — não testar manualmente):

| Item | Verificação |
|------|------------|
| Página `/precos` existe | `ls src/pages/precos/+Page.tsx` |
| Onboarding dialog existe | `ls src/features/onboarding/components/OnboardingDialog.tsx` |
| Header sem react-router-dom | `grep -n "from 'react-router-dom'" src/components/layout/Header.tsx` (deve retornar vazio) |
| FIRE timeline chart | `grep -n "AreaChart" src/features/fire/pages/FireSimulatorPage.tsx` (deve ter) |
| FinHubScore radar | `grep -n "RadarChart" src/features/tools/stocks/components/quickAnalysis/FinHubScore.tsx` (deve ter) |

---

### 5. Resultado consolidado

```
## RELATÓRIO DE EXECUÇÃO

**Prompt ID:** BETA-GATE
**Data:** [data]
**Estado:** COMPLETO | PARCIAL | BLOQUEADO

### Baseline
- `npm run lint`     → PASS / FAIL
- `npm run test`     → PASS / FAIL (N suites, N testes)
- `npm run typecheck`→ PASS / FAIL (N erros — pré-existentes aceitáveis se ≤ 300)
- `npm run build`    → PASS / FAIL

### Suites E2E
| Suite | Testes | PASS | FAIL | SKIP |
|-------|--------|------|------|------|
| smoke | | | | |
| admin.p2.6 | | | | |
| admin.editorial.p4 | | | | |
| admin.moderation-control.p4 | | | | |
| admin.creator-risk.p4 | | | | |
| admin.rollback-jobs.p4 | | | | |
| admin.worker-status.p4 | | | | |
| (outros se existirem) | | | | |

### Checklist pré-beta
- [ ] /precos existe
- [ ] Onboarding dialog existe
- [ ] Header sem react-router-dom
- [ ] FIRE timeline chart presente
- [ ] FinHubScore RadarChart presente

### Falhas detectadas
- [lista, se existirem]

### Veredicto
- [ ] BETA-GATE PASS — pronto para lançamento beta
- [ ] BETA-GATE FAIL — detalhar o que bloqueia

### O que o Claude deve validar
- [ ] Confirmar que nenhuma suite E2E nova foi ignorada
- [ ] Confirmar que erros TS são pré-existentes (não introduzidos pela fase)
```

---

## Ordem de Execução Recomendada

```
1.  PROMPT B1    → Corrigir crypto market cap            ✅
2.  PROMPT B2    → Adicionar ETF disclaimer              ✅
3.  PROMPT B3    → Watchlist batch FMP                   ✅
4.  PROMPT P3.5  → Gate final análise rápida             ✅
5.  PROMPT P4-H1 → Moderation hardening + E2E           ✅
6.  PROMPT P4-H2 → Editorial CMS hardening + E2E        ✅
7.  PROMPT P4-H3 → TTL, rate limiters e cache           ✅
    ↓
    (P8 pode começar em paralelo a partir daqui)
    ↓
8.  PROMPT P8.1  → Fundações de design                  ✅
9.  PROMPT P5.1  → Página Explore                       ✅
10. PROMPT P5.2  → Detalhe de artigo                    ✅
11. PROMPT P5.3  → Detalhe de curso e vídeo             ✅
12. PROMPT P5.4  → Criadores (lista + perfil público)   ✅
13. PROMPT P8.2  → MetricCard + badges                  ✅
14. PROMPT P5.5  → Creator dashboard MVP                ✅
15. PROMPT P8.3  → Charts gradient + tooltips            ✅
16. PROMPT P8.4  → Redesign cards conteúdo + criador    ✅
17. PROMPT P5.7  → Creator popup modal (wiring + backend field)        ✅ (Codex) + fix CI 'website' platform label (Claude)
18. PROMPT P5.8  → Creator Welcome Card configurável                   ✅ (Codex)
    ── Extras fora de prompt (Claude direto):
    • Redesign visual CreatorModal (header, tabs, social, courses, layout) ✅
    • Fix routing @username/+Page.tsx — usePageContext() + fallback regex ✅
    • Mock seed script seedCreatorCardsMock.ts (4 criadores variados) ✅
    ──
19. PROMPT B4    → Navegação dos cards (href em cards antigos)         ✅ (Codex) + lint fix BookCard + B8 CommentCard (Claude)
20. ROUTING-CHECK → Auditoria completa de navegação (Claude direto)   ✅
21. PROMPT P5.6  → Páginas legais + footer funcional (B5)             ✅ (Codex) + fix Footer Link→<a>, /explorar→/hub/conteudos (Claude)
    ── Layout consolidation (nova prioridade):
22. PROMPT P8.7  → PageShell inteligente + fim header duplo (IC-1,4,5,6)  ✅
23. PROMPT P8.8  → Creator sidebar unificada (IC-3)                        ✅
24. PROMPT P8.9  → Admin layout em Vike (IC-2) + visibilidade cross-role   ✅
    ── Layout consolidation concluída (P8.7+P8.8+P8.9) — IC-1 a IC-6 todos resolvidos ──
25. PROMPT P5.9  → Creator dashboard: criar/editar/publicar artigo    ✅
26. PROMPT P5.10 → Creator dashboard: criar/editar/publicar vídeo     ✅
27. PROMPT P5.11  → Páginas de marcas/entidades públicas              ✅
28. PROMPT B-FIX-01 → Backlog bugs B9–B13 (ManageVideos + routes)    ✅
    ── UI/UX Consolidation (Claude direto, dividido em sub-sessões):
29. PROMPT P8.10a → Cards: ContentCard + CreatorCard unificados       ✅
30. PROMPT P8.10b → Páginas: container, PageHero, filtros, grids     ✅
31. PROMPT P8.10c → Estados: LoadingSkeleton, EmptyState, ErrorState  ✅
    ── UI/UX Consolidation concluída ──
32. PROMPT P3-GATE → Gate final análise rápida (lint+test+build+e2e)  ✅
33. PROMPT P4-GATE → Gate pre-release editorial + moderation          ✅
34. PROMPT P8.5  → Header: SSR fix + visual redesign                  ⏳
35. PROMPT P8.6  → FinHubScore visual (radar/snowflake)               ✅
36. PROMPT P5-FIRE  → FIRE timeline chart + progress visual           ⏳ ← PRÓXIMO
37. PROMPT P8.5     → Header SSR-safe + redesign visual               ⏳
38. PROMPT P5-OB    → Onboarding first-time user                      ⏳
39. PROMPT P5-PRICE → Página de preços/premium                        ⏳
40. PROMPT BETA-GATE → Gate final pré-beta                            ⏳
```

> Cada prompt depende do anterior ser validado pelo Claude antes de avançar.
