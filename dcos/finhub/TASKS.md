# FinHub — Backlog de Tasks

> Fonte de verdade para o que está por fazer.
> Última atualização: 2026-03-23

**Legenda:** 🔴 Bloqueador beta | 🟡 Importante | 🟢 Desejável | 🔄 Em curso | ✅ Fechado | ⏳ Por iniciar

---

## SECÇÃO 0 — Bugs Críticos Conhecidos

> Corrigir antes de qualquer fase de beta.

| # | Bug | Ficheiro/Área | Prioridade |
|---|-----|--------------|-----------|
| B1 | Crypto market cap usa `quoteVolume` em vez de `price × circulatingSupply` | `API_finhub` — crypto service | ✅ |
| B2 | ETF Overlap: disclaimer ausente (dados simulados apresentados como reais) | `FinHub-Vite` — EtfOverlapPage | ✅ |
| B3 | Watchlist: N chamadas paralelas ao FMP em vez de batch único | `API_finhub` — watchlist service | ✅ |
| B4 | Cards de conteúdo e criadores sem navegação — clicar não leva a lado nenhum nos cards antigos | `FinHub-Vite` — cards componentes globais | ✅ CarouselCreators `/criadores`→`/creators`, CreatorCardMini+ArticlesSection+CoursesSection+BookCard+CommentCard+ContentMeta+RatingCard: Link→`<a href>` |
| B5 | Footer: links de páginas legais (Privacidade, Termos, Cookies, Sobre) apontam para rotas inexistentes (404) | `FinHub-Vite` — Footer + páginas legais | ⏳ PROMPT P5.6 |
| B6 | Creator profile page não recebia username — `@username/+Page.tsx` lia `routeParams` dos props (sempre undefined); "Ver perfil" redirecionava para `/creators` | `FinHub-Vite` — `@username/+Page.tsx` + `CreatorProfilePage.tsx` | ✅ Fix: usePageContext() + fallback regex no pathname |
| B7 | CI P5.7 falhava — `toSocialMediaLinks` mapper usava `'Other'` em vez de `'website'` para platform website | `FinHub-Vite` — `publicCreatorsService.ts` | ✅ |
| B8 | CommentCard apontava para `/users/:username` (rota inexistente) — deve ser `/perfil/:username` | `CommentCard.tsx` | ✅ ROUTING-CHECK (Claude) |

---

## SECÇÃO 1 — P3: Análise Rápida de Stocks (Em Curso)

> Objetivo: cobertura setorial consistente sem regressões cross-setor.

| Task | Estado | Notas |
|------|--------|-------|
| P3.3 — Matriz setorial validada (11 setores, 1 ticker cada) | ✅ | Tabela em `API_finhub/dcos/P3_COBERTURA_SETORIAL_QUICK_ANALYSIS.md` |
| P3.4 — Badges de estado por métrica no UI (Direto / Calculado / N/A / Sem dado / Erro) | ✅ | Arranque técnico concluído |
| P3.5 — Validação cruzada e gate de qualidade final | ✅ | 11 setores, cobertura mínima 93.75%, payout_ratio adicionado ao contrato |
| P3.5 — Documentar fonte/fallback/fórmula por métrica | ✅ | `API_finhub/dcos/P3_GATE_FINAL.md` |
| P3 — Gate final: `lint + test + build + e2e + smoke quick analysis` | ⏳ | Próximo passo |

---

## SECÇÃO 2 — P4: Admin Editorial CMS + Moderation (Em Curso)

### 4.1 Editorial CMS

| Task | Estado | Notas |
|------|--------|-------|
| Backend + frontend CMS operacional em `/admin/editorial` | ✅ | |
| Recursos operacional em `/admin/recursos` | ✅ | |
| Claims creator, review admin, historico de ownership | ✅ | |
| **Fase E — Hardening + E2E editorial** | ✅ | Suite `admin.editorial.p4.spec.ts` — 3 testes: flow + audit log + idempotência |
| Gate pre-release: E2E com backend/DB reais + validação de scopes/auditoria | ⏳ | |

### 4.2 Moderation Control Plane

| Task | Estado | Notas |
|------|--------|-------|
| Fast hide, bulk guardrails, policy engine, trust scoring | ✅ | |
| Creator controls, kill switches, jobs assíncronos, drill-down | ✅ | |
| Frontend: queue enriquecida, risk board, trust profile, surface controls | ✅ | |
| **Consolidação de docs e runbook operacional** | ✅ | `RUNBOOK_MODERATION_CONTROL_PLANE.md` — 3 procedimentos |
| **Graceful shutdown do worker de jobs** | ✅ | drain mode em service + worker (SIGINT/SIGTERM) |
| **TTL/index/rate limit/caching nos pontos mais caros** | ✅ | 3 limiters (quickAnalysis/marketData/reits), cache em stock/crypto/reit, TTL indexes Notification+AssistedSession |
| **E2E dos fluxos novos do Moderation Control Plane** | ✅ | 4 testes: fast hide, bulk guardrail, creator controls, rollback |
| **Regressões E2E pré-existentes** | ✅ | 3 testes corrigidos em 2026-03-20 — ver nota abaixo |

---

## SECÇÃO 3 — P5: Pré-Beta Funcional (A Iniciar)

> Objetivo: ter um ciclo completo funcional para utilizador e criador antes do beta.

### 3.1 Bloqueadores de Beta 🔴

| Task | Estado | Área |
|------|--------|------|
| Hub de conteúdo público — página Explore (listagem agregada) | ✅ | Frontend |
| Hub de conteúdo público — detalhe de Artigo (com comments + ratings) | ✅ | Frontend |
| Hub de conteúdo público — detalhe de Curso | ✅ | Frontend |
| Hub de conteúdo público — detalhe de Vídeo | ✅ | Frontend |
| Lista de criadores pública + perfil público de criador | ✅ | Frontend |
| Creator dashboard — overview com KPIs reais | ✅ | Frontend |
| Creator dashboard — gestão de artigos (tabela + publicar/despublicar/eliminar) | ✅ | Frontend |
| Creator dashboard — criar/editar/publicar artigo (flow completo) | ⏳ PROMPT P5.9 | Frontend |
| Creator dashboard — criar/editar/publicar vídeo (flow completo) | ⏳ PROMPT P5.10 | Frontend |
| Creator dashboard — campo welcome video (URL YouTube/Vimeo para introdução pública) | ✅ | Backend + Frontend |
| Popup de criador — modal ao clicar em card de criador (welcome video + cursos + conteúdos top) | ✅ | Frontend |
| P5.8 — Creator Welcome Card configurável: criador escolhe o que mostra no seu cartão de visita público | ✅ | Backend + Frontend — `ICreatorCardConfig`, `CreatorCardConfigPanel`, `CreatorModal` com render condicional + previewMode |
| Redesign visual do CreatorModal — header com avatar/nome/rating, tabs polidas, social com cores, layout vídeo+bio lado a lado | ✅ | Frontend — `CreatorHeader`, `CreatorModal`, `CreatorSocial`, `CreatorCourses` redesenhados |
| Creator profile page — navegação "Ver perfil" funcional (rota `@username` + fallback URL path) | ✅ | Frontend |
| Auditoria completa de navegação — todos os cards e botões "Ver perfil" com href correcto | 🔄 Após B4 — ROUTING-CHECK (Claude) | Frontend |
| Páginas de marcas/entidades públicas | ⏳ PROMPT P5.11 | Frontend |

### 3.2 Importantes para Beta 🟡

| Task | Estado | Área |
|------|--------|------|
| FIRE frontend — what-if + Monte Carlo visual completo | 🔄 | Frontend |
| Onboarding de utilizador regular (1ª vez na plataforma) | ⏳ | Frontend |
| Perfil de utilizador editável | ⏳ | Frontend |
| Recomendações básicas (popular, relacionado) | ⏳ | Frontend |
| Página de preços/premium | ⏳ | Frontend |
| Pagamentos/subscrições | ⏳ | Backend + Frontend |
| Metricas de negócio no admin (DAU/MAU, retenção, conversion) | ⏳ | Backend + Frontend |

### 3.3 Desejável 🟢

| Task | Estado | Área |
|------|--------|------|
| WebSocket para notificações real-time | ⏳ | Backend + Frontend |
| Newsletter/digest semanal | ⏳ | Backend |
| Status page externa (Statuspage.io ou Instatus) | ⏳ | Infra |
| Widget de feedback (Canny ou form simples) | ⏳ | Frontend |
| Audit de acessibilidade | ⏳ | Frontend |
| Lighthouse performance > 80 | ⏳ | Frontend |
| i18n prep (marcar strings com `t()`) | ⏳ | Frontend |
| PWA / offline básico | ⏳ | Frontend |

---

## SECÇÃO 4 — P8: Elevação UI/UX (Planeado)

> Ver [DESIGN.md](./DESIGN.md) para contexto completo.

### 4.1 Fundações (máximo impacto, mínimo risco)

| Task | Estado | Ficheiro alvo |
|------|--------|--------------|
| Instalar fonte Inter (`@fontsource/inter`) | ✅ | `package.json` + `main.tsx` |
| Aplicar `--font-sans: 'Inter'` no CSS global | ✅ | `styles/globals.css` |
| Adicionar `.tabular-nums` para valores financeiros | ✅ | `styles/globals.css` |
| Dark mode mais escuro (`--background: 222 25% 8%`) | ✅ | `styles/globals.css` |
| Chart colors semânticas (`--chart-1` a `--chart-5`) | ✅ | `styles/globals.css` |
| Cores de mercado no Tailwind (`market.bull/bear/neutral`) | ✅ | `tailwind.config.ts` |

### 4.2 Componentes Críticos

| Task | Estado | Componente |
|------|--------|-----------|
| Header redesenhado (nav limpa, search, avatar) | ⏳ | `Header.tsx` |
| Cards de conteúdo modernizados — imagem grande, rating stars, metadata limpo | ✅ | `ArticleCard`, `CourseCard`, `VideoCard`, `PodcastCard`, `BookCard` |
| Cards de criador modernizados — imagem/avatar grande, rating stars, contadores | ✅ | `CreatorCard` |
| Charts financeiros customizados (tooltips ricos, gradient fill) | ✅ | `ChartTooltip`, `ValueCreationChart`, `FireSimulatorPage` |
| FinHubScore visual proeminente (radar/snowflake) | ⏳ | `QuickAnalysis` |
| MetricCard com badge de estado e tabular-nums | ✅ | `MetricCard` |

### 4.3 Páginas Prioritárias para Redesign

| Página | Prioridade |
|--------|-----------|
| Homepage | 🔴 Primeiro impacto |
| Detalhe de Ação (Quick Analysis) | 🔴 Core diferenciador |
| Hub de conteúdo (listagem) | 🟡 |
| Detalhe de artigo/curso | 🟡 |
| Perfil de criador | 🟡 |
| FIRE Dashboard | 🟢 |

---

## SECÇÃO 5 — Dívida Técnica a Monitorizar

| Item | Risco | Quando tratar |
|------|-------|--------------|
| Mock data disperso no frontend | Mocks esquecidos em produção | Antes do beta — audit |
| Tipos frontend ↔ backend desalinhados | Runtime errors | Ao implementar cada feature |
| 2 modelos de marcas (Brand + DirectoryEntry) | Dados duplicados | Fase 2 — unificar |
| Upload disco local (não S3) | Não escala | Antes do beta |
| ~285 erros TS pré-existentes (cresceu de ~175) | Build warnings, não bloqueia `typecheck:p1` | Gradual — isolar |
| Componentes de cards duplicados (3 versões de CreatorCard, 2 de ArticleCard, 3 de BookCard) | Dificulta manutenção, bugs diferentes por versão | Cleanup antes de beta — consolidar na versão `features/` |
| Dados mock para teste visual de cards (4 criadores `@mock-card-test.finhub`) | Não podem ir para produção | Limpar com `npm run seed:cards:clean` antes do deploy |
| SEO structured data ausente (JSON-LD) | Rich results limitados | Pós-beta imediato |
| Excesso de bibliotecas UI (PrimeReact + Mantine + shadcn) | Inconsistência visual | Ao redesenhar componentes |
| IC-1: Header duplo para users auth em páginas públicas | 2 headers empilhados em ~50 páginas | ✅ P8.7 |
| IC-2: Admin Vike sem sidebar nem AdminLayout | Admin navega sem sidebar | ⏳ P8.9 |
| IC-3: Creator dashboard com 2 sidebars diferentes | Sidebar muda entre páginas do dashboard | ⏳ P8.8 |
| IC-4: PublicLayout stub vazio | Visitantes sem nav em páginas sem HomepageLayout | ✅ P8.7 |
| IC-5: FIRE tool pages sem layout | User fica preso sem nav | ✅ P8.7 |
| IC-6: CreatorProfile vs CreatorsList layout diferente | Transição visual abrupta | ✅ P8.7 |
| `router.tsx` (React Router legacy) provavelmente dead code | Duplicação de rotas, confusão | Cleanup após P8.7-P8.9 |
| `getRoutesByRole(CREATOR)` não inclui `regularRoutes` nem `creatorContentRoutes` | Sidebar creator incompleta | P8.8 |
| Rota `/hub/counteudos/` com typo | Typo no filesystem | Cleanup menor |
| 3 componentes órfãos: DashboardHeader, AdminHeader, AuthLayout (shared) | Dead code | Cleanup |

---

## Sequência de Execução Actualizada

> Última revisão: 2026-03-23

```
CONCLUÍDO
  ✅ B1–B8 — Todos os bugs críticos resolvidos
  ✅ P3 — Análise rápida (cobertura + badges + gate)
  ✅ P4 — Editorial CMS + Moderation hardening + E2E
  ✅ P8.1–P8.4 — Fundações de design + cards redesenhados
  ✅ P5.1–P5.8 — Hub conteúdo + Creator dashboard + modal + card config
  ✅ P5.6 — Páginas legais + footer funcional
  ✅ B4 + ROUTING-CHECK — Fix navegação cards + auditoria routing

EM CURSO / PRÓXIMO IMEDIATO (layout consolidation)
  ✅ P8.7  — PageShell inteligente + fim header duplo (IC-1,4,5,6)
  ⏳ P8.8  — Creator sidebar unificada (IC-3) ← PRÓXIMO
  ⏳ P8.9  — Admin layout Vike + visibilidade cross-role (IC-2)

DEPOIS (features P5)
  ⏳ P5.9  — Creator: criar/editar/publicar artigo
  ⏳ P5.10 — Creator: criar/editar/publicar vídeo
  ⏳ P5.11 — Páginas de marcas/entidades públicas

A SEGUIR
  ⏳ P3-GATE — Gate final análise rápida
  ⏳ P4-GATE — Gate pre-release editorial + moderation
  ⏳ P8.6  — FinHubScore visual proeminente

MAIS TARDE
  ⏳ Pagamentos/subscrições
  ⏳ Onboarding utilizador
  ⏳ Recomendações básicas
  ⏳ Analytics de negócio (DAU/MAU)
  ⏳ Cleanup: router.tsx, componentes órfãos, typo /hub/counteudos
```
