# FinHub — Backlog de Tasks

> Fonte de verdade para o que está por fazer.
> Última atualização: 2026-03-26

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
| **DPIA documento (Data Protection Impact Assessment)** | ✅ | 4-6h | `dcos/finhub/legal/DPIA.md` — Claude 2026-03-25. **Requer aprovação do fundador** (assinar campos "Aprovado por"). |
| **Política de retenção de dados** | ✅ | 2-3h | `docs/finhub/legal/POLITICA_RETENCAO_DADOS.md` — Claude 2026-03-25. |
| **Breach Response Plan** (documento + contactos CNPD) | ✅ | 2-3h | `dcos/finhub/legal/BREACH_RESPONSE_PLAN.md` — Claude 2026-03-25. **Preencher telefone de emergência do fundador.** |
| **TTL indexes em modelos de log** | ✅ | LEGAL-01 | AdminAuditLog (2a), ContentModerationEvent (1a), AgentActivityLog (90d) — LEGAL-01 2026-03-26. typecheck PASS |
| **Documentos legais com texto completo** (/privacidade, /termos, /cookies) | ✅ | LEGAL-02 | `legalDocument.service.ts` — Termos (10 sec), Privacidade (8 sec), Cookies (5 sec), Aviso Legal — LEGAL-02 2026-03-26. typecheck PASS |

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
| **Dark mode no editor de posts** - contrast baixo no textarea em dark mode | ✅ | DARK-FIX-01 2026-03-26 - tokens bg-background/text-foreground aplicados no editor + inputs da comunidade |
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
| **SecurityTab wired à API real** | ✅ | V1.1 | Form real 3 campos + submit `authService.changePassword` + validação min 8 + toast sucesso/erro — validado 2026-03-26 |
| **Feed personalizado `/feed` validado** | ✅ | V1.2 | Rota Vike `src/pages/feed/+Page.tsx` + `useActivityFeed` → `socialService.getActivityFeed` → `GET /api/feed` real (sem mocks), com loading/erro/empty state — validado 2026-03-26 |
| **Pesquisa global funcional** | ✅ | V1.2 | `GlobalSearchBar` + `useGlobalSearch` com debounce 300ms e `min 2 chars` → `GET /api/search?q=` real, resultados agrupados por tipo e estados de erro/empty — validado 2026-03-26 |
| **Sitemap dinâmico (SEO-4)** | ✅ | V1.3 | `src/controllers/sitemap.controller.ts` (+ `sitemap.service.ts` JSON) e middleware `server/index.mjs` geram XML dinâmico com fallback estático em `public/sitemap.xml` — validado 2026-03-26; podcasts/books/directory incluídos — FIX-V1.3 2026-03-26 |
| **Upload de imagens real (Cloudinary)** | ✅ | V1.4 | Upload real ativo via backend (`POST /api/account/avatar` + alias `/api/users/me/avatar`), validação 5MB/JPEG-PNG-WebP, persistência Mongo e atualização frontend — V1.4 2026-03-26 |
| **Export de dados (RGPD Art 20)** | ✅ | V1.5 | UI em /conta/definicoes com botao "Exportar os meus dados" + GET /api/account/export (blob) + download JSON + guard SSR + toasts — 2026-03-26 |
| **Analytics opt-out toggle** | ✅ | GDPR-01 | Toggle em /conta/definicoes + `allowAnalytics` no User model — 2026-03-24 |

#### Fixes de validação — Detectados em 2026-03-25
| Fix | Estado | Prompt | Notas |
|-----|--------|--------|-------|
| **Sitemap: Podcasts, Books, DirectoryEntry** | ✅ | FIX-V1.3 | OBSOLETO — já estava implementado no V1.3. Reconfirmado (sem code changes) em 2026-03-26 |
| **Avatar: file picker em AccountDetailsTab** | ✅ | FIX-V1.4 | OBSOLETO — já estava implementado. Toasts + validação + spinner adicionados por Claude. 2026-03-25 |
| **SecurityTab: success toast** | ✅ | — | `toastSuccess` adicionado por Claude. 2026-03-25 |

#### Features v1.0 — Ainda pendentes (novos prompts)
| Feature | Estado | Prompt | Notas |
|---------|--------|--------|-------|
| **RGPD: UI de exportação de dados** | ✅ | V1.5 | Card + botão "Exportar os meus dados" em /conta/definicoes — blob download JSON. Codex impl + Claude fix toast (react-toastify → useToast). 2026-03-25 |
| **MongoDB: auditoria de field-level encryption** | ✅ | V1.6 | `dcos/finhub/ENCRYPTION_AUDIT.md` — auditoria RGPD Art. 32 (User model + tipo de ligação Mongo) e recomendação de infra. 2026-03-26 |

#### 🔴 Beta Fechado — Controlo de Acesso
| Feature | Estado | Prompt | Notas |
|---------|--------|--------|-------|
| **Backend: BetaInvite model + middleware + admin endpoints** | ✅ | BETA-GATE-01 2026-03-26 | BetaInvite model, 3 endpoints admin (`POST/GET/DELETE /api/admin/beta/invites`), gate no register com `BETA_INVITE_REQUIRED`, convite marcado com `usedAt/usedBy`, `BETA_MODE=false` default, typecheck PASS. |
| **Frontend: landing page /beta + gate global em PageShell** | ✅ | BETA-GATE-02 2026-03-26 | `/beta` criada com layout dark branded + 2 CTAs nativos; gate global SSR-safe no `PageShell` com `VITE_BETA_MODE` e whitelist de rotas isentas. `yarn typecheck:p1` + `yarn build` PASS. |
| **Frontend SSR beta gate (cookie `betaSession`) no servidor** | ✅ | BETA-GATE-03 2026-03-26 | Middleware em `server/index.mjs` antes do render Vike com redirect `302 /beta`; `useAuthStore` passa a definir/remover cookie `betaSession`; `.env.example` com `BETA_MODE=false`. |

#### Features v1.0 — Bloqueadas ou pós-v1.0
| Feature | Estado | Notas |
|---------|--------|-------|
| **Pagamentos / subscrições** | ⏳ | Stripe — bloqueado (precisa de conta Stripe + chaves antes de criar prompt) |
| **Notificações real-time (WebSocket)** | ⏳ | Arquitectura grande; pós-v1.0 se o polling for suficiente para beta |

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
| **Vike navigation bug — `vikeNavigate` em Server Routing** | ✅ | `PageShell.tsx`: removido import `vike/client/router`, push/replace usam `window.location.assign/replace`. `VideoForm.tsx` + `ArticleForm.tsx`: migrados para `useNavigate` do compat layer. Claude 2026-03-25 |

##### Infra / Deploy
| Item | Estado | Notas |
|------|--------|-------|
| **HTTPS enforced** | ⏳ | Redirect HTTP → HTTPS; HSTS activo |
| **Variáveis de ambiente em prod configuradas** | ⏳ | Checklist no `RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md` |
| **Backups MongoDB automatizados** | ⏳ | Confirmar snapshot policy antes de abrir ao público |
| **Logs de erro em prod não expõem stack traces ao cliente** | ⏳ | Express error handler em prod deve devolver mensagem genérica, não `err.stack` |

##### Documentação & Acções Humanas Obrigatórias (pré-release pública)
| Item | Estado | Responsável |
|------|--------|------------|
| **Reescrever `RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md`** (referencia ficheiros movidos para `dcos/done/`) | ✅ | Claude 2026-03-26 — refs actualizadas (FINHUB_DOCUMENTACAO_CRITICA→MASTER_CONTEXT, B16 marcado ✅, CLEANUP-03/AN-8 marcados ✅) |
| **DPIA — preencher e assinar "Aprovado por" + "Data de aprovação"** (`dcos/finhub/legal/DPIA.md` — secção 8) | ⏳ | João (humano) |
| **BREACH_RESPONSE_PLAN — preencher número de telemóvel de emergência do fundador** (`dcos/finhub/legal/BREACH_RESPONSE_PLAN.md`) | ⏳ | João (humano) |
| **DPIA + BREACH_RESPONSE_PLAN + POLITICA_RETENCAO_DADOS — preencher `[email do fundador]`** (múltiplos ficheiros em `dcos/finhub/legal/`) | ⏳ | João (humano) |
| **AN-8 — GDPR PostHog: apagar dados analytics ao encerrar conta** | ✅ | AN-8 2026-03-25 — `src/lib/posthog.ts` + `deletePostHogPerson` em `user.controller.ts` |

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
| **AN-2/AN-3 — Activar GA4 e GTM via runtime config** (admin insere IDs) | Quando houver plano de ads |
| **AN-7 — Ads analytics** (impressões + CTR por slot) | Quando existirem slots de publicidade |
| **AN-9 — Activar heatmaps PostHog** em páginas prioritárias | Após dados reais de utilizadores |

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
| B16 | `useAuthStore` em dev mode restaura sempre utilizador fake (`dev-admin-access-token`) — todas as chamadas API autenticadas falham com token inválido | `useAuthStore.ts` — `onRehydrateStorage` + SSR fallback | ✅ \| B16-FIX 2026-03-26 — dev auth opt-in via `VITE_DEV_AUTO_LOGIN` |

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
| **Scripts PS1 de fase obsoletos** (`pre-p1-smoke.ps1`, `moderation-pre-release-smoke.ps1`, `release-e2e-required-flows.ps1`, `o3-final-audit.ps1`) | ✅ | CLEANUP-03 2026-03-25 — movidos para `dcos/archive/scripts/` — commit c7d437f. Entradas npm mantidas em `package.json` (referência histórica). |
| **Ficheiros OpenClaw na raiz de `API_finhub/`** (`AGENTS.md`, `HEARTBEAT.md`, `IDENTITY.md`, `SOUL.md`, `TOOLS.md`, `USER.md`, `OPENCLAW_GATEWAY_SETUP.md`) | ✅ | CLEANUP-04 2026-03-26 — movidos para `dcos/done/openclaw/`. |
| **Cloudinary cleanup** (`src/services/cloudinaryAvatar.service.ts` + `CLOUDINARY_URL` redundante no `.env.example`) | ✅ | CLEANUP-05 2026-03-26 — serviço sem imports removido e variável redundante eliminada. |

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
| **Correr `/teach-impeccable`** | ✅ | Concluído 2026-03-24 — contexto FinHub gravado em `FinHub-Vite/.impeccable.md` (brand, audiência, princípios de design, referências). |
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

## Sequência de Execução — Estado Real

> Última revisão: 2026-03-26 ← **ATUALIZADO** (anterior estava stale desde 2026-03-22)

```
TUDO CONCLUÍDO — P1 a P11 + todos os prompts de polish e fix
  ✅ P1–P8     — Core da plataforma + fundações de design + layout consolidado
  ✅ P9.1–P9.5 — Perfil editável, "Para Ti", admin métricas, /conta, /perfil auditado
  ✅ P9-GATE   — Gate pós-beta + overlay fix + SSR null fix
  ✅ P10.1–P10.5 — Nav fix, creator profile, SEO JSON-LD, analytics events, reco engine
  ✅ P11.1–P11.5 — Comunidade: salas, posts, XP, badges, leaderboard
  ✅ COMMUNITY-FIX-01/02 — Nav menu, post routing, imagens, markdown editor
  ✅ TECH-DEBT-01/02 — Atomicidade votos, react-day-picker@9, window.location fixes
  ✅ CLEANUP-01 — Dívida técnica B15 + dead code + typo /hub/counteudos
  ✅ CLEANUP-02 — Ficheiros/pastas obsoletos eliminados
  ✅ CLEANUP-03 — Scripts PS1 obsoletos arquivados
  ✅ B1–B16    — Todos os bugs conhecidos resolvidos
  ✅ DARK-FIX-01 — Dark mode comunidade (textarea contrast fix)
  ✅ V1.1–V1.6 — SecurityTab, feed/pesquisa, sitemap, export RGPD, encryption audit
  ✅ GDPR-01   — Cookie banner + PostHog consent-gate + opt-out toggle
  ✅ AN-8      — PostHog forget-me ao encerrar conta
  ✅ LEGAL-01  — TTL indexes AdminAuditLog, ContentModerationEvent, AgentActivityLog
  ✅ LEGAL-02  — Legal docs com texto completo (termos, privacidade, cookies, disclaimer)
  ✅ SEC-01/02 — Helmet, CORS, rate limiting, JWT env, VITE audit, CSP
  ✅ CI-FIX-01 — shellConfig split + CI Node.js 20→22
  ✅ B16-FIX   — Dev auth opt-in via VITE_DEV_AUTO_LOGIN

PENDENTE TÉCNICO
  ✅ V1.4     — Upload Cloudinary real validado (endpoint `/api/account/avatar`) — 2026-03-26

PENDENTE HUMANO (João)
  ⏳ DPIA — assinar campos "Aprovado por" + "Data de aprovação" (secção 8)
  ⏳ BREACH_RESPONSE_PLAN — preencher telemóvel de emergência
  ⏳ Legal (3 docs) — preencher [email do fundador]

PENDENTE INFRA / DEPLOY
  ⏳ HTTPS enforced (HTTP → HTTPS redirect + HSTS activo)
  ⏳ Variáveis de ambiente em produção configuradas
  ⏳ Backups MongoDB automatizados
  ⏳ MongoDB não exposto publicamente confirmado

PENDENTE CLAUDE / CODEX
  ✅ Reescrever RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md — Claude 2026-03-26
  ✅ CLEANUP-04 — Ficheiros OpenClaw na raiz de API_finhub/ (→ dcos/done/) — validado 2026-03-26

MAIS TARDE (pós-release pública)
  ⏳ Pagamentos/subscrições (Stripe — aguarda conta + chaves)
  ⏳ WebSocket notificações real-time
  ⏳ Lighthouse > 80
  ⏳ Audit de acessibilidade completo
  ⏳ i18n prep
  ⏳ PWA / offline básico
```
