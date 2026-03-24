# FinHub — Backlog de Tasks

> Fonte de verdade para o que está por fazer.
> Última atualização: 2026-03-24

**Legenda:** 🔴 Beta obrigatório | 🟡 v1.0 (pós-beta, pré-release pública) | 🟢 Pós-v1.0 (iterativo) | 🔄 Em curso | ✅ Fechado | ⏳ Por iniciar

---

## ⚠️ SCOPE FREEZE — Decisão de 2026-03-23

> **Nenhuma nova feature será adicionada até à full release pública**, excepto se for crítica para o negócio.
> O foco é arredondar o que existe, implementar o planeado (P10.x + P11.x Comunidade) e lançar.
>
> **Fluxo de release:**
> 1. 🔨 Desenvolver features planeadas (P10.x polish + P11.x Comunidade + features v1.0)
> 2. 🧪 Beta Testing — grupo fechado, recolher feedback, corrigir bugs reais
> 3. ✨ Melhorias sugeridas pelo beta — implementar feedback crítico
> 4. 🚀 Full Release Pública — abertura geral + activação Stripe
> 5. 📱 Versão Android e iOS

---

## RELEASE MAP — O que sai em cada fase

> Princípio: Beta fecha o ciclo funcional mínimo. v1.0 adiciona polish e Comunidade. Full Release é o lançamento público.

### 🔴 Beta Fechado (objectivo actual — prompts 44–51)
Plataforma **funcional e estável** para um grupo limitado de utilizadores reais.
Tudo o que está nesta lista tem de estar completo antes do convite beta.

| Feature | Estado | Prompt |
|---------|--------|--------|
| Hub de conteúdo público completo (artigos, vídeos, cursos, podcasts, livros) | ✅ | P5.1–P5.3 |
| Lista de criadores + perfil público de criador | ✅ | P5.4 |
| Creator dashboard (gerir artigos + vídeos) | ✅ | P5.5, P5.9, P5.10 |
| Onboarding first-time user (3 passos) | ✅ | P5-OB |
| Página de preços (estática, sem pagamento) | ✅ | P5-PRICE |
| Footer com todos os links legais | ✅ | B-FIX-03 |
| Header SSR-safe e redesenhado | ✅ | P8.5 |
| FIRE simulator completo (timeline + progress bar) | ✅ | P5-FIRE |
| Perfil público de utilizador (/perfil/:username) | ✅ | P8.7-PUB |
| Análise rápida de stocks (FinHubScore + métricas) | ✅ | P3 |
| Admin moderation + editorial CMS | ✅ | P4 |
| Perfil editável (name/bio/avatar) | ✅ | P9.1 |
| Cleanup técnico (B15 + dead code + typo) | ✅ | CLEANUP-01 |
| **Homepage personalizada ("Para Ti")** | ✅ | P9.2 |
| **Admin métricas reais (DAU/utilizadores/conteúdo)** | ✅ | P9.3 |
| **User account dashboard (/conta com sidebar)** | ✅ | P9.4 |
| **Audit e fix /perfil para todos os roles** | ✅ | P9.5 |
| **P9-GATE (qualidade pós-beta)** | ✅ | P9-GATE + P9-GATE-FIX — overlay fix + SSR null fix |
| **Limpeza pré-release (ficheiros/pastas obsoletos)** | ✅ | CLEANUP-02 (Claude) |
| **Documentação sistemas (AUTH, NOTIF, PAYMENTS, MOD, COMMUNITY)** | ✅ | Claude — AUTH.md, NOTIFICATIONS.md, PAYMENTS.md, MODERATION.md, COMMUNITY.md |

#### 🔴 Segurança — Vulnerabilidades de Dependências (Beta Obrigatório)

> **Processo:** criar branch `security/audit-fix` → correr `npm audit fix` → testar build+typecheck → merge se PASS.
> Nunca correr `npm audit fix --force` (pode fazer breaking changes). Ver `P6_SECURITY_CHECKLIST.md`.

| Task | Repo | Severidade | Estado | Notas |
|------|------|-----------|--------|-------|
| **Auditoria e fix de dependências — API_finhub** | Backend | 1 critical, 4 high, 3 moderate, 4 low | ✅ | multer/morgan/qs patched — `npm audit: 0 vulns` — build+typecheck PASS — merged 2026-03-23 |
| **Auditoria e fix de dependências — FinHub-Vite** | Frontend | 1 high | ✅ | flatted ReDoS patched (via eslint dep) — `npm audit: 0 vulns` — build PASS — merged 2026-03-23 |

#### ✅ CI/DevOps — Resolvido (2026-03-24)

> **Detectado:** 2026-03-23 após push do commit `678c409`
> **Resolvido:** 2026-03-24 commit `d0ef0f5` (CI-FIX-01)

| Task | Repo | Estado | Notas |
|------|------|--------|-------|
| **`shellConfig.tsx` → separar em `shellConfig.ts` + `ShellFooter.tsx`** | FinHub-Vite | ✅ | `shellConfig.ts` (types/constants/funcs), `ShellFooter.tsx` (componente isolado), imports actualizados em UnifiedTopShell + PublicShell. `yarn lint` PASS. |
| **GitHub Actions: upgrade Node.js 20 → 22** | FinHub-Vite | ✅ | `ci.yml` + `deploy.yml`: `actions/checkout@v5`, `actions/setup-node@v5`, `node-version: 22` |
| **Dependabot: 17 vulns reportadas** | FinHub-Vite | ✅ | Diagnosticado: `npm audit` = 0 vulns; `yarn audit` = 1 low (test dep `@tootallnate/once` via `jest-environment-jsdom`, não afecta produção). As 17 do Dependabot são da GitHub Advisory Database (mais agressiva que npm/yarn registry). Risco de produção: nulo. |

**Contexto:**
- `API_finhub`: `multer` (3× DoS), `on-headers` (HTTP header manipulation via `morgan`), `qs` (2× DoS) — total 12 vulns
- `FinHub-Vite`: `minimatch` ReDoS via `matchOne()` com múltiplos GLOBSTAR não-adjacentes (CVE-2026-27903, High)

**Procedimento (ambos os repos, em separado):**
```bash
# 1. criar branch dedicado
git checkout -b security/audit-fix

# 2. ver o que vai mudar ANTES de aplicar
npm audit
npm audit fix --dry-run

# 3. aplicar apenas fixes não-breaking
npm audit fix          # NÃO usar --force

# 4. validar
npm run typecheck      # ou typecheck:p1 no frontend
npm run build

# 5. se PASS → merge para main/master
# 6. se FAIL → investigar qual pacote quebrou e fixar manualmente ou aguardar patch
```

#### 🔴 GDPR / Legal — Beta Obrigatório
Items identificados em `dcos/agents/legal-compliance/GAPS_E_TIMELINE.md`. Bloqueiam beta público.

| Task | Estado | Esforço | Notas |
|------|--------|---------|-------|
| **Cookie banner: validar comportamento real + PostHog conditional init** | ✅ | 4-6h | GDPR-01 (Codex 2026-03-24, validado Claude 2026-03-24) — CookieBanner.tsx + analyticsProviders consent-gate + opt-out toggle + GET /api/account/export — typecheck+build PASS |
| **DPIA documento (Data Protection Impact Assessment)** | ⏳ | 4-6h | RGPD Art 35 — document + aprovação fundador |
| **Política de retenção de dados** (documento em `dcos/finhub/`) | ⏳ | 2-3h | RGPD Art 5(1)(e) — logs moderação 2a, acesso 1a, analytics 12m |
| **Breach Response Plan** (documento + contatos CNPD) | ⏳ | 2-3h | RGPD Art 33 — notificação obrigatória 72h |

### 🟡 v1.0 — Release Pública (pós-beta, funcionalidade visível ao utilizador)
Funcionalidades que fazem a diferença para o utilizador final. Entram na release pública.
**Inclui P10.x (polish) + P11.x (Comunidade + Gamificação) — última feature grande antes do lançamento.**

#### P10.x — Polish e Fix (Codex)
| Feature | Estado | Prompt | Notas |
|---------|--------|--------|-------|
| **Nav fix: Mercados/Ferramentas → user menu; Feed → HUB nav** | ✅ | P10.1 | shellConfig + UnifiedTopShell |
| **Perfil editável de criador** (bio, redes, temas) | ✅ | P10.2 | CreatorProfileEditForm + definicoes/+Page + backend topics/youtube |
| **SEO structured data (JSON-LD)** | ✅ | P10.3 | JsonLd.tsx + Organization/Article/VideoObject/Course/Person schemas |
| **Analytics: eventos em falta** | ✅ | P10.4 | content_completed, onboarding, search, etc. (AN-1) |
| **Motor de recomendação: foundation** | ✅ | P10.5 | R1+R2: tags obrigatórias + endpoint recomendação real |

#### P11.x — Comunidade + Gamificação (Codex — após P10)
Ver especificação completa em `COMMUNITY.md`.

| Feature | Estado | Prompt | Notas |
|---------|--------|--------|-------|
| **Salas: modelos, API, listagem** | ✅ | P11.1 | CommunityRoom model + routes + listagem frontend + seed 8 salas públicas |
| **Posts e threads: criar, votar, responder** | ✅ | P11.2 | CommunityPost + CommunityReply + CommunityVote + voto idempotente + thread UI |
| **Sistema XP: eventos, cálculo, persistência** | ✅ | P11.3 | UserXP model + xp.service (idempotente) + integração comunidade/conteúdo/onboarding |
| **Níveis e badges: display no perfil e posts** | ✅ | P11.4 | checkAndAwardBadges + pills Nv.X nos posts + conquistas no perfil + /conta |
| **Leaderboard semanal + integração HUB** | ✅ | P11.5 | Top 10 + rank próprio + reset dominical + badge top_da_semana + LeaderboardWidget |

#### 🔴 Bugs Comunidade — Detectados em teste manual 2026-03-23

> Detectados pelo fundador ao testar a funcionalidade em local. Bloqueiam experiência real da comunidade.

| # | Bug | Área | Estado | Prompt | Notas |
|---|-----|------|--------|--------|-------|
| BC1 | **Comunidade sem entrada no menu de navegação** — nenhum link para `/comunidade` no top nav ou user menu | `shellConfig.tsx` | ✅ | COMMUNITY-FIX-01 | Adicionado "Comunidade" ao `AUTHENTICATED_MAIN_NAV_LINKS` + UserMenuItem para todos os roles autenticados |
| BC2 | **Clicar num post não abre a página de detalhe** — link `href=/comunidade/post/:id` existe no HTML mas navegação não funciona | `CommunityRoomDetailPage.tsx`, Vike routing | ✅ | COMMUNITY-FIX-01 | Corrigido com `+route.ts` explícito em `post/@id` e `@slug` para eliminar colisão de routing Vike |
| BC3 | **Posts não suportam imagens** — formulário de criação de post só aceita texto plain; sem upload ou embed de imagem | `CommunityRoomDetailPage.tsx` form | ✅ | COMMUNITY-FIX-02 | Campo imageUrl (http/https, max 2048) em form + modelo + contract + service; imagem visível em listagem e detalhe |
| BC4 | **Posts sem editor rich text / markdown** — utilizador escreve texto plain sem formatação; o resultado final é renderizado como markdown mas a escrita é em raw | `CommunityRoomDetailPage.tsx` form | ✅ | COMMUNITY-FIX-02 | `MarkdownEditor.tsx` com toolbar (B, I, code, link) + toggle Editar/Preview usando `renderCommunityMarkdown()` |

#### 🟢 Features Comunidade — Inspiradas em Reddit/Discord (pós-v1.0)

> Identificadas em teste manual 2026-03-23. Não bloqueiam lançamento mas fazem diferença na experiência.

| Feature | Estado | Notas |
|---------|--------|-------|
| **Partilhar post** — botão share com URL copiado para clipboard + partilha nativa Web Share API | ⏳ | Reddit pattern — link para `/comunidade/post/:id` copiado |
| **Guardar / bookmarks de posts** | ⏳ | Ver posts guardados em `/conta` ou `/favoritos` |
| **Mencionar utilizadores** `@username` nos posts/replies | ⏳ | Autocomplete de utilizadores + notificação ao mencionado |
| **Tags/flair nos posts** | ⏳ | Categorização dentro de sala (ex: "Análise", "Questão", "Discussão") |
| **Moderação de sala** — creator da sala pode fixar/remover posts | ⏳ | Papel de "moderador de sala" |
| **Notificações de resposta** — ser notificado quando alguém responde ao teu post | ⏳ | Integrar com sistema de notificações existente |
| **Crosspost entre salas** | ⏳ | Partilhar post de uma sala para outra |
| **Feed da comunidade** (todos os posts de todas as salas seguidas) | ⏳ | Versão comunidade do `/feed` — posts recentes de salas onde participas |
| **Dark mode no editor de posts** — contrast baixo no textarea em dark mode | ⏳ | CSS fix pontual |
| **Reações aos posts** (além de upvote/downvote) | ⏳ | 🔥 ❤️ 💡 — tipo Discord reactions |

#### 🟡 Tech Debt — Detectado em Revisão P11 (resolver antes da release)

> Issues identificados durante revisão de código P11.1–P11.5. Nenhum é bloqueador funcional mas todos devem ser resolvidos antes da release pública para garantir qualidade top-level.

| Issue | Ficheiro(s) | Tipo | Estado | Prompt | Notas |
|-------|------------|------|--------|--------|-------|
| **Vote counter: leitura após update tem janela de timing** | `communityThread.service.ts` | Backend atomicidade | ✅ | TECH-DEBT-01 | `findOneAndUpdate({ new: true })` resolve atomicidade — 2026-03-24 |
| **Vote: criação de CommunityVote + `$inc` no Post sem transacção** | `communityThread.service.ts`, `CommunityVote` | Backend atomicidade | ✅ | TECH-DEBT-01 | `withTransaction` + fallback `isTransactionUnsupportedError` para standalone MongoDB — 2026-03-24 |
| **`as any` cast em pipeline de agregação MongoDB** | `xp.service.ts` linha 565 | TypeScript | ✅ | TECH-DEBT-01 | `PipelineStage[]` explícito, sem `as any` — 2026-03-24 |
| **Leaderboard rank off-by-1 em empate de `weeklyXp`** | `xp.service.ts` — `getWeeklyLeaderboard` | Lógica | ✅ | TECH-DEBT-01 | Desempate correcto: `weeklyXp DESC → totalXp DESC → _id ASC` — 2026-03-24 |
| **`window.location.href` em handlers nas páginas de comunidade** | `CommunityRoomDetailPage.tsx`, `CommunityPostDetailPage.tsx` | Frontend / Vike | ✅ | TECH-DEBT-02 | Auth gating declarativo com `<a href={loginRedirect}>` — sem redirect imperativo — 2026-03-24 |
| **`react-day-picker@8` incompatível com `date-fns@4`** | `FinHub-Vite/package.json` | Peer dep | ✅ | TECH-DEBT-02 | Upgrade para `react-day-picker@^9.14.0` + `calendar.tsx` Chevron v9 API — 2026-03-24 |

#### Features v1.0 — Prompts Codex definidos
| Feature | Estado | Prompt | Notas |
|---------|--------|--------|-------|
| **SecurityTab wired à API real** | ⏳ | V1.1 | Remove mockFormik; form real com authService.changePassword() |
| **Feed personalizado `/feed` validado** | ⏳ | V1.2 | Backend + frontend existem; auditar shape + empty states |
| **Pesquisa global funcional** | ⏳ | V1.2 | Backend MongoDB real existe; validar shape + navegação |
| **Sitemap dinâmico (SEO-4)** | ⏳ | V1.3 | Backend endpoint JSON + Vike middleware XML |
| **Upload de imagens real (Cloudinary)** | ⏳ | V1.4 | Avatar hoje é URL manual; upload real Cloudinary free tier |
| **Export de dados (RGPD Art 20)** | ✅ | GDPR-01 | GET /api/account/export → JSON inline; rate limit 7 dias — 2026-03-24 |
| **Analytics opt-out toggle** | ✅ | GDPR-01 | Toggle em /conta/definicoes + `allowAnalytics` no User model — 2026-03-24 |

#### Features v1.0 — Bloqueadas ou pós-v1.0
| Feature | Estado | Notas |
|---------|--------|-------|
| **Pagamentos / subscrições** | ⏳ | Stripe — bloqueado (precisa de conta Stripe + chaves antes de criar prompt) |
| **Notificações real-time (WebSocket)** | ⏳ | Arquitectura grande; pós-v1.0 se o polling for suficiente para beta |
| **MongoDB field encryption audit** | ⏳ | Confirmar se field-level encryption está activo; RGPD Art 32 |

#### 🟡 Segurança — Gate Pré-Release Pública

> Executar **depois das features fechadas e antes do lançamento público**. Com o projecto praticamente fechado, rever calma e sistematicamente. Cada item tem um responsável claro: backend (API_finhub) ou frontend (FinHub-Vite).

##### Dependências
| Item | Repo | Estado | Notas |
|------|------|--------|-------|
| `npm audit` limpo na release | Ambos | ✅ | `npm audit`: 0 vulns em ambos os repos — 2026-03-24 |
| **Actualizar `react-day-picker@8` → `@9+`** | Frontend | ✅ | `react-day-picker@^9.14.0` instalado + `calendar.tsx` Chevron v9 API — TECH-DEBT-02 2026-03-24 |

##### Backend — API_finhub
| Item | Estado | Notas |
|------|--------|-------|
| **Helmet.js activo e configurado** | ✅ | Headers validados: `nosniff`, `SAMEORIGIN`, `X-XSS-Protection:0`, `HSTS`, `Referrer-Policy` — SEC-01 2026-03-24 |
| **CORS — whitelist explícita** | ✅ | `ALLOWED_ORIGINS` env var; cai para `[]` (bloqueia tudo) em produção sem config — SEC-01 2026-03-24 |
| **Rate limiting em endpoints críticos** | ✅ | 6 rate limiters: `authRegister`, `authLogin`, `authRefresh`, `userProfilePatch`, `communityCreatePost`, `communityVote` — SEC-01 2026-03-24 |
| **JWT secrets em variáveis de ambiente** | ✅ | `jwt.ts` lança `Error` no boot se `JWT_SECRET`/`JWT_REFRESH_SECRET` ausentes — sem fallback hardcoded — SEC-01 2026-03-24 |
| **`.env` não committed** | ✅ | `.gitignore` cobre `.env*`; histórico git sem `.env` confirmado — SEC-01 2026-03-24 |
| **Senhas/tokens não logados** | ✅ | Error handler sem `error.stack` em produção — SEC-01 2026-03-24 |
| **Input validation em endpoints novos** | ✅ | Todos P10.x + P11.x têm `requestContracts` aplicados (validado em P10-P11 reviews) |
| **MongoDB não exposto publicamente** | ⏳ | Confirmar na infra de deploy — depende da configuração do servidor |

##### Frontend — FinHub-Vite
| Item | Estado | Notas |
|------|--------|-------|
| **VITE_* vars — sem secrets no bundle** | ✅ | Auditado em SEC-02: sem keys privadas em `VITE_*` — 2026-03-24 |
| **`dangerouslySetInnerHTML` auditado** | ✅ | 4 ocorrências — todas com DOMPurify ou renderer sanitizado — SEC-02 2026-03-24 |
| **Content Security Policy** | ✅ | CSP global em `server/index.mjs`: `script-src 'self' 'unsafe-inline'` (JSON-LD), sem `unsafe-eval` — SEC-02 2026-03-24 |
| **Dependências desactualizadas (major)** | ⏳ | `npm outdated` inventariado em SEC-02; majors pendentes (react-router-dom@7, vite@8, ts@6) — não blocking, backlog pós-v1.0 |

##### Infra / Deploy
| Item | Estado | Notas |
|------|--------|-------|
| **HTTPS enforced** | ⏳ | Redirect HTTP → HTTPS; HSTS activo |
| **Variáveis de ambiente em prod configuradas** | ⏳ | Checklist no `RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md` |
| **Backups MongoDB automatizados** | ⏳ | Confirmar snapshot policy antes de abrir ao público |
| **Logs de erro em prod não expõem stack traces ao cliente** | ⏳ | Express error handler em prod deve devolver mensagem genérica, não `err.stack` |

---

### 🟢 Pós-v1.0 (iterativo, sem data fixa)
Não bloqueiam lançamento. Entram quando houver capacidade ou feedback de utilizadores pede.

| Feature | Notas |
|---------|-------|
| Lighthouse > 80 | Performance optimization, lazy loading, image CDN |
| Audit de acessibilidade (a11y) | ARIA, focus management, contraste |
| i18n prep | Só se houver expansão internacional |
| PWA / offline básico | Service worker + manifest |
| Newsletter / digest semanal | Notificações por email |
| Status page externa | Statuspage.io ou Instatus |
| Widget de feedback | Canny ou form simples |
| Excesso de libs UI (PrimeReact + Mantine) | Cleanup gradual ao redesenhar |
| Tipagem TS — ~285 erros pré-existentes | Gradual, não bloqueia build |
| **UI/UX elevação** (Inter font, dark mode tokens, DataTable, KPI cards) | Spec em dcos/done/P8_UI_UX_IMPLEMENTACAO_TECNICA.md + P8_ADMIN_UI_PILOT.md |
| **Agent Dashboard frontend** (/admin/agent-dashboard) | Backend 85% done (Sprint S0A); frontend 0% — 7 tasks (Timeline, Scorecard, Burndown views) |
| **Directory pública `/recursos/*`** (9 páginas de marcas/entidades) | Backend done; 9 placeholder pages por implementar |
| **Disclaimers por ferramenta auditados** | FIRE, Watchlist, REIT, ETF, Crypto — RGPD/Lei 34/88 |

---

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
| B9 | ManageVideos usa `confirm()/alert()` (browser dialogs) em vez de Dialog/Card como ManageArticles — inconsistência UX | `ManageVideos.tsx` linhas 22/26/34 | ✅ B-FIX-01 |
| B10 | ManageVideos sem botão "Despublicar" — vídeo publicado não volta a rascunho pelo dashboard (artigos têm `unpublishArticle`) | `ManageVideos.tsx`, `videoService.ts`, `useVideos.ts` | ✅ B-FIX-01 |
| B11 | ManageVideos edit link sem `encodeURIComponent` — `href=\`/creators/dashboard/videos/${video.id}/edit\`` (ManageArticles usa encode) | `ManageVideos.tsx` linha 197 | ✅ B-FIX-01 |
| B12 | `getRelatedLink` fallback aponta para `/explorar/tudo` (rota inexistente) — deve ser `/hub/conteudos` | `BrandDetailPage.tsx` linha 60 | ✅ B-FIX-01 |
| B13 | Sem alias `/marcas` → `/directory` — URLs de diretório públicas usam `/directory` mas marca-se `/marcas` noutros locais | `src/pages/` — faltam `marcas/+Page.tsx` e `marcas/@slug/+Page.tsx` | ✅ B-FIX-01 |
| B14 | FIRE landing: `Link`/`NavLink`/`useInRouterContext` de `react-router-dom` — viola SSR rules, links não navegáveis | `FireLandingPage.tsx` + `FireToolNav.tsx` | ✅ Fix: `<a href>` nativo |
| B15 | `/login` e `/registar` sem `+Page.tsx` Vike — rota não existe, página em branco ao navegar directamente | `src/pages/login/+Page.tsx` + `src/pages/registar/+Page.tsx` | 🟡 Fix criado — requer restart do dev server para activar |
| B16 | `useAuthStore` em dev mode restaura sempre utilizador fake (`dev-admin-access-token`) — todas as chamadas API autenticadas falham com token inválido | `useAuthStore.ts` — `onRehydrateStorage` + SSR fallback | 🟡 Para resolver com login real via `/login` após B15 activado |

---

## SECÇÃO 1 — P3: Análise Rápida de Stocks (Em Curso)

> Objetivo: cobertura setorial consistente sem regressões cross-setor.

| Task | Estado | Notas |
|------|--------|-------|
| P3.3 — Matriz setorial validada (11 setores, 1 ticker cada) | ✅ | Tabela em `API_finhub/dcos/P3_COBERTURA_SETORIAL_QUICK_ANALYSIS.md` |
| P3.4 — Badges de estado por métrica no UI (Direto / Calculado / N/A / Sem dado / Erro) | ✅ | Arranque técnico concluído |
| P3.5 — Validação cruzada e gate de qualidade final | ✅ | 11 setores, cobertura mínima 93.75%, payout_ratio adicionado ao contrato |
| P3.5 — Documentar fonte/fallback/fórmula por métrica | ✅ | `API_finhub/dcos/P3_GATE_FINAL.md` |
| P3 — Gate final: `lint + test + build + e2e + smoke quick analysis` | ✅ | lint 0 erros (3 warns react-refresh não bloqueantes); test 48/227 PASS (--runInBand); build PASS; smoke 3/3 PASS |

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
| Creator dashboard — criar/editar/publicar artigo (flow completo) | ✅ | Frontend — `ArticleForm`, `CreateArticle`, `EditArticle`, `ManageArticles`, `articleService` (PUT+PATCH fallback), Vike routeParams, sem react-router |
| Creator dashboard — criar/editar/publicar vídeo (flow completo) | ✅ | Frontend — `VideoForm` (YouTube/Vimeo embed preview, auto-thumbnail), `CreateVideo`, `EditVideo`, `ManageVideos`, `videoService` (PUT+PATCH fallback, /videos/my→/me), Vike routeParams, sem react-router |
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
| FIRE frontend — what-if + Monte Carlo visual completo | ✅ | Frontend — P5-FIRE: timeline chart multi-cenário + progress bar |
| Onboarding de utilizador regular (1ª vez na plataforma) | ✅ | Frontend — P5-OB: OnboardingOverlay 3 passos + localStorage |
| Perfil público de utilizador (leitura) | ✅ | Frontend — P8.7-PUB: PublicUserProfilePage + fix routeParams (Claude) |
| Perfil de utilizador editável | ⏳ | Frontend |
| Recomendações básicas (popular, relacionado) | ⏳ | Frontend |
| Página de preços/premium | ✅ | Frontend — P5-PRICE: 3 planos + toggle anual/mensal + FAQ |
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
| Header redesenhado (nav limpa, search, avatar) | ✅ | `Header.tsx` — P8.5: SSR-safe, sem react-router-dom, Popover avatar, sticky+blur |
| Cards de conteúdo modernizados — imagem grande, rating stars, metadata limpo | ✅ | `ArticleCard`, `CourseCard`, `VideoCard`, `PodcastCard`, `BookCard` |
| Cards de criador modernizados — imagem/avatar grande, rating stars, contadores | ✅ | `CreatorCard` |
| Charts financeiros customizados (tooltips ricos, gradient fill) | ✅ | `ChartTooltip`, `ValueCreationChart`, `FireSimulatorPage` |
| FinHubScore visual proeminente (radar/snowflake) | ✅ | `QuickAnalysis` — P8.6: RadarChart + PerformanceRadarChart |
| MetricCard com badge de estado e tabular-nums | ✅ | `MetricCard` |

### 4.3 P8.10 — Consolidação UI/UX (Claude direto)

> Prompt completo em `PROMPTS_EXECUCAO.md` (PROMPT P8.10). Dividido em 3 sub-sessões.

| Sub-task | Estado | Scope |
|----------|--------|-------|
| P8.10a — Sistema unificado de cards (ContentCard + CreatorCard) | ✅ | `ContentCard` + `RatingStars` + `cardUtils` criados; 5 public cards → thin wrappers; `ResourceCard` migrado; 4 ficheiros dead-code eliminados; `.netflix-card` CSS removido; 227 testes PASS |
| P8.10b — Consistência visual entre páginas | ✅ | ContentRow max-w 1400px; PageHero em `/directory`; filtros shadcn (Input+Select) em CreatorsListPage + PublicDirectoryPage; max-w-7xl wrappers; filter-bar__pill nos type pills; SectionHeader criado |
| P8.10c — Estados visuais reutilizáveis | ✅ | LoadingSkeleton (spinner/cards), EmptyState (card/bordered), ErrorState criados; 3 consumers actualizados (CreatorsListPage, PublicDirectoryPage, ContentList) |

**Auditoria que fundamenta o P8.10 (2026-03-26):**
- 57 componentes de card, 15 reutilizáveis, 42 one-off
- 3 sistemas de card paralelos (netflix-card, public custom, shadcn Card)
- 7+ pares duplicados (ArticleCard, CourseCard, BookCard, CreatorCard, XPProgress, ContentTrends, CampaignSummary)
- Homepage sem max-width (stretches em 4K+)
- Directório e Ferramentas sem PageHero (inconsistente com Criadores/Conteúdos)
- 3 patterns diferentes de loading (skeleton, spinner, inline)
- 3 patterns diferentes de empty state (dashed card, full-width card, col-span card)
- Filtros: CreatorsListPage usa inputs nativos custom, Directory usa shadcn Select

### 4.4 Páginas Prioritárias para Redesign

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
| Upload disco local (não S3) | Não escala | Pre-beta config (third-party, fora do fluxo de código) |
| ~285 erros TS pré-existentes (cresceu de ~175) | Build warnings, não bloqueia `typecheck:p1` | Gradual — isolar |
| Componentes de cards duplicados (3 versões de CreatorCard, 2 de ArticleCard, 3 de BookCard) | Dificulta manutenção, bugs diferentes por versão | ⏳ P8.10a — consolidar em ContentCard + CreatorCard unificados |
| Dados mock para teste visual de cards (4 criadores `@mock-card-test.finhub`) | Não podem ir para produção | Limpar com `npm run seed:cards:clean` antes do deploy |
| SEO structured data ausente (JSON-LD) | Rich results limitados | Pós-beta imediato |
| Excesso de bibliotecas UI (PrimeReact + Mantine + shadcn) | Inconsistência visual | Ao redesenhar componentes |
| IC-1: Header duplo para users auth em páginas públicas | 2 headers empilhados em ~50 páginas | ✅ P8.7 |
| IC-2: Admin Vike sem sidebar nem AdminLayout | Admin navega sem sidebar | ✅ P8.9 |
| IC-3: Creator dashboard com 2 sidebars diferentes | Sidebar muda entre páginas do dashboard | ✅ P8.8 |
| IC-4: PublicLayout stub vazio | Visitantes sem nav em páginas sem HomepageLayout | ✅ P8.7 |
| IC-5: FIRE tool pages sem layout | User fica preso sem nav | ✅ P8.7 |
| IC-6: CreatorProfile vs CreatorsList layout diferente | Transição visual abrupta | ✅ P8.7 |
| `router.tsx` (React Router legacy) provavelmente dead code | Duplicação de rotas, confusão | Cleanup após P8.7-P8.9 |
| `getRoutesByRole(CREATOR)` não inclui `regularRoutes` nem `creatorContentRoutes` | Sidebar creator incompleta | ✅ P8.8 |
| Rota `/hub/counteudos/` com typo | Typo no filesystem | Cleanup menor |
| 3 componentes órfãos: DashboardHeader, AdminHeader, AuthLayout (shared) | Dead code | Cleanup |

---

## 🤖 Ferramentas AI / Dev Workflow (para Claude — não Codex)

> Tasks de exploração e integração de ferramentas AI no workflow FinHub.
> **Executor: Claude directo** (não Codex — requerem julgamento e setup no ambiente de trabalho).
> Investigação feita em 2026-03-24 com base em vídeo "Code Report" + research de repos GitHub.

---

### 🔴 CRÍTICO — Fazer antes da próxima sessão de frontend

#### Impeccable — Design anti-slop para Claude Code
> **GitHub:** https://github.com/pbakaus/impeccable
> **Instalação:** `npx skills add pbakaus/impeccable` (detecta Claude Code automaticamente)
> **Porquê é crítico:** FinHub é uma plataforma fintech onde a qualidade visual afecta directamente a confiança do utilizador. Sem isto, o Claude Code produz o típico "fintech dashboard genérico" (Inter font, gradiente purple-to-blue, nested cards) que destrói credibilidade. Com isto, cada sessão de frontend tem anti-patterns explícitos no contexto.

| Task | Estado | Notas |
|------|--------|-------|
| **Instalar Impeccable no ambiente Claude Code** | ✅ | Instalado 2026-03-24 — 21 skills em `.agents/skills/`. Disponível em Claude Code, Codex, Cursor, Windsurf. Ver `dcos/finhub/IMPECCABLE.md` |
| **Correr `/teach-impeccable`** | ⏳ | Setup inicial: o comando recolhe contexto de design do projecto e grava em config. Fazer uma vez. **PRÓXIMA sessão de frontend.** |
| **Aplicar `/audit` ao FIRE Simulator** | ⏳ | A11y, responsivo, edge cases — antes da release |
| **Aplicar `/distill` à página de detalhes de post da Comunidade** | ⏳ | Remover complexidade visual desnecessária |
| **Aplicar `/harden` aos formulários de criação de post e perfil** | ⏳ | Error handling, i18n, edge cases nos formulários — fintech precisa de robustez |
| **Aplicar `/onboard` ao fluxo de onboarding** | ⏳ | Redesign orientado por UX do overlay de onboarding |
| **Definir sessão dedicada com `/colorize` para identidade visual FinHub** | ⏳ | Distinguir do concorrente — aplicar brand colors estrategicamente no XP/badges/leaderboard |

**Comandos disponíveis (20 total):**
`/distill` · `/animate` · `/colorize` · `/delight` · `/overdrive` · `/audit` · `/polish` · `/typeset` · `/arrange` · `/harden` · `/onboard` · `/bolder` · `/quieter` · `/normalize` · `/critique` · `/clarify` · `/extract` · `/adapt` · `/optimize` · `/teach-impeccable`

---

### 🟡 ALTA PRIORIDADE — Antes da release pública

#### Agency — Agentes especializados por role
> **GitHub:** https://github.com/msitarzewski/agency-agents
> **Instalação:** `install.sh` copia ficheiros Markdown para `.claude/` — sem código, sem infra
> **Porquê:** Hoje o Codex é usado como "full-stack genérico". Com Agency, cada sessão tem um agente com role específico, workflows definidos e métricas de qualidade. 100+ agentes em 11 divisões.

| Task | Estado | Notas |
|------|--------|-------|
| **Instalar Agency e explorar a divisão Engineering** | ⏳ | Identificar agentes mais relevantes: Security Engineer, Backend Architect, Frontend Developer, AI Engineer |
| **Activar Security Engineer na próxima sessão de SEC/GDPR** | ⏳ | Agente já tem workflow de fintech security — JWT, rate limiting, PII |
| **Explorar divisão Marketing para pós-launch** | ⏳ | Reddit Community Builder, SEO Specialist, LinkedIn Content Creator — úteis para crescimento da Comunidade FinHub |
| **Documentar os 3-5 agentes mais úteis para o workflow FinHub** | ⏳ | Criar shortlist para usar por default em cada tipo de sessão |

---

#### Promptfoo — Red team de prompts e testes de segurança AI
> **GitHub:** https://github.com/promptfoo/promptfoo (adquirido pela OpenAI em 2026)
> **Instalação:** `npm install -g promptfoo` + config YAML
> **Porquê:** Qualquer feature da FinHub que use LLM com input de utilizador (FIRE simulator, posts da Comunidade, recomendações) é vulnerável a prompt injection. Promptfoo testa isso automaticamente antes da release.

| Task | Estado | Notas |
|------|--------|-------|
| **Instalar Promptfoo e explorar a documentação de red-teaming** | ⏳ | Perceber quais attack vectors cobrem casos FinHub |
| **Mapear superfícies de ataque com input de utilizador** | ⏳ | Posts da Comunidade (markdown), campos de perfil (bio, nome), FIRE simulator inputs, search bar |
| **Criar suite de testes de prompt injection para posts da Comunidade** | ⏳ | Posts com conteúdo malicioso que tentem escapar ao DOMPurify ou injectar em prompts de recomendação |
| **Integrar Promptfoo no gate de segurança pré-release (SEC checklist)** | ⏳ | Adicionar ao `TASKS.md` secção 🟡 Segurança Gate |
| **Definir threshold de pass/fail para CI** | ⏳ | Quando existirem features LLM-facing, Promptfoo deve correr em CI como `yarn test:security:prompts` |

---

### 🟢 PÓS-v1.0 — Avaliar quando existirem features AI para utilizadores

#### OpenViking — Contexto de agente com tiered loading
> **GitHub:** https://github.com/volcengine/OpenViking (ByteDance/Volcano Engine)
> **Stack:** Python + `pip install openviking` (SDK principal é Python — não Node.js nativo)
> **Porquê interessa:** Reduz consumo de tokens em ~95% vs vector search. Organiza memória em filesystem `viking://` com 3 tiers: L0 (50 tokens, relevance check), L1 (500 tokens, planning), L2 (5000 tokens, full content). Agentes escrevem as suas próprias skills em `viking://agent/skills/` — memória evolutiva.
> **Limitação actual:** SDK primário é Python. Integrar com Node.js/MongoDB requer wrapper ou API bridge. Não é trivial.

| Task | Estado | Notas |
|------|--------|-------|
| **Avaliar OpenViking para o sistema de recomendação (P10.5)** | ⏳ | O motor de recomendação já existe — OpenViking poderia gerir o contexto de preferências do utilizador com tiered loading em vez de carregar todo o histórico |
| **Protótipo: estruturar MEMORY.md / PROMPTS_EXECUCAO.md como store OpenViking** | ⏳ | Explorar se a estrutura `viking://` substituiria o sistema manual de docs de contexto |
| **Avaliar esforço de integração Node.js ↔ OpenViking** | ⏳ | Necessário antes de comprometer — pode exigir microserviço Python separado |
| **Decidir: OpenViking vs continuar com sistema manual** | ⏳ | Só faz sentido quando houver features AI-facing para utilizadores com contexto persistente |

---

#### MiroFish — Simulação multi-agente para comportamento de mercado
> **GitHub:** https://github.com/666ghj/MiroFish (fork EN: https://github.com/abhi6982/MiroFish-EN)
> **Stack:** Node.js + Python/FastAPI + Zep Cloud para memória de agentes
> **Porquê pode interessar pós-launch:** Simular como a comunidade FinHub reagiria a eventos de mercado (decisão BCE, choque imobiliário português) seeding agents com perfis de utilizador FinHub. Ou stress-test ao sistema XP/gamification sob evento de mercado. Feature potencial: "O que pensam os utilizadores FinHub sobre este activo?" via simulação.
> **Limitação actual:** Projecto early-stage, principalmente em Chinês, requer infra separada e dados reais de utilizadores para ser útil. Não tem sentido antes de ter utilizadores reais.

| Task | Estado | Notas |
|------|--------|-------|
| **Revisitar MiroFish após 3 meses de utilizadores reais** | ⏳ | Com dados comportamentais reais, a simulação tem valor. Antes disso é ficção científica. |
| **Avaliar como feature premium: "Simulação de sentimento da comunidade"** | ⏳ | Diferenciador interessante — mostrar como agentes com perfis de investidor PT reagiriam a notícia X |

---

## Sequência de Execução Actualizada

> Última revisão: 2026-03-22

```
CONCLUÍDO
  ✅ B1–B8 — Todos os bugs críticos resolvidos
  ✅ P3 — Análise rápida (cobertura + badges + gate)
  ✅ P4 — Editorial CMS + Moderation hardening + E2E
  ✅ P8.1–P8.4 — Fundações de design + cards redesenhados
  ✅ P5.1–P5.8 — Hub conteúdo + Creator dashboard + modal + card config
  ✅ P5.6 — Páginas legais + footer funcional
  ✅ B4 + ROUTING-CHECK — Fix navegação cards + auditoria routing

CONCLUÍDO (layout consolidation completa ✅)
  ✅ P8.7  — PageShell inteligente + fim header duplo (IC-1,4,5,6)
  ✅ P8.8  — Creator sidebar unificada (IC-3)
  ✅ P8.9  — Admin layout Vike + guard real + CommandPalette (IC-2)
  ── IC-1 a IC-6 todos resolvidos ──

CONCLUÍDO (P5 fechado ✅)
  ✅ P5.9  — Creator: criar/editar/publicar artigo
  ✅ P5.10 — Creator: criar/editar/publicar vídeo
  ✅ P5.11 — Páginas de marcas/entidades públicas (/directory + /marcas)

CONCLUÍDO (bugs backlog)
  ✅ B-FIX-01 — B9+B10+B11+B12+B13 (ManageVideos Dialog/unpublish/encode + BrandDetail route + /marcas alias)

A SEGUIR (sequência completa pré-beta)
  ✅ P3-GATE — Gate final análise rápida
  ✅ P4-GATE — Gate editorial + moderation (16/16 E2E + 3/3 smoke)
  ✅ P8.6   — FinHubScore hero treatment + snowflake radar (4 eixos)
  ✅ P5-FIRE — FIRE: timeline chart + progress bar + seed mock (2 portfolios)
  ✅ P8.5   — Header SSR-safe + redesign visual (lint 0 · typecheck PASS · build PASS · smoke 3/3)
  ✅ P5-OB  — Onboarding first-time user (3 passos, localStorage · lint 0 · typecheck PASS · smoke 3/3)
  ✅ P5-PRICE  — Página de preços/premium (3 planos, toggle anual/mensal, FAQ)
  ✅ B-FIX-03  — ShellFooter: Precos link + todos os links legais funcionais
  ✅ P8.7-PUB  — Perfil público de utilizador (/perfil/:username) + fix routeParams
  ✅ P8.8-FIRE — FIRE landing redesign (hero + cards + tabela comparação)
  ✅ BETA-GATE — Gate final pré-beta PASS (lint ✅ · typecheck ✅ · build ✅ · tests 48/227 ✅)

EM CURSO — Bloco P9 (pós-beta)
  ⏳ 44. P9.1      → Perfil editável (name/bio/avatar)
  ⏳ 45. CLEANUP-01 → Dívida técnica (B15 + dead code + typo /hub/counteudos)
  ⏳ 46. P9.2      → Homepage "Para Ti" (personalização por tópicos do onboarding)
  ⏳ 47. P9.3      → Admin dashboard: métricas reais (ligar adminMetricsService)
  ⏳ 48. P9-GATE   → Gate pós-beta

MAIS TARDE (pós-P9-GATE)
  ⏳ Pagamentos/subscrições (Stripe ou integração externa)
  ⏳ WebSocket notificações real-time
  ⏳ SEO structured data (JSON-LD)
  ⏳ Lighthouse > 80
  ⏳ Audit de acessibilidade
```
