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

## PROMPT P5.9 — Creator Dashboard: Criar/Editar/Publicar Artigo ⏳

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

## PROMPT P5.10 — Creator Dashboard: Criar/Editar/Publicar Vídeo ⏳

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

## PROMPT P5.11 — Páginas de Marcas/Entidades Públicas ⏳

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
21. PROMPT P5.6  → Páginas legais + footer funcional (B5)             ⏳ ← PRÓXIMO
22. PROMPT P5.9  → Creator dashboard: criar/editar/publicar artigo    ⏳
23. PROMPT P5.10 → Creator dashboard: criar/editar/publicar vídeo     ⏳
24. PROMPT P5.11 → Páginas de marcas/entidades públicas               ⏳
25. PROMPT P3-GATE → Gate final análise rápida (lint+test+build+e2e)  ⏳
26. PROMPT P4-GATE → Gate pre-release editorial + moderation          ⏳
27. PROMPT P8.5  → Header redesenhado (nav, search, avatar/menu)      ⏳
28. PROMPT P8.6  → FinHubScore visual (radar/snowflake)               ⏳
```

> Cada prompt depende do anterior ser validado pelo Claude antes de avançar.

> Cada prompt depende do anterior ser validado pelo Claude antes de avançar.
