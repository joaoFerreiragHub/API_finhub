# FinHub — Contexto Completo para AI

> **Para qualquer AI que continue este projeto:**
> Lê este ficheiro do início ao fim antes de fazer qualquer coisa.
> É a fonte de verdade do estado actual, decisões tomadas, regras críticas e próximos passos.
> Última actualização: 2026-03-25

---

## 1. O QUE É O FINHUB

Plataforma portuguesa de literacia financeira. Agrega conteúdo educativo (artigos, vídeos, cursos, podcasts, livros), ferramentas financeiras (análise de stocks, FIRE simulator, ETF overlap, watchlist), comunidade (salas temáticas, posts, votação, XP/gamificação) e criadores de conteúdo.

**Modelo de negócio:** Freemium. Conteúdo e comunidade básicos gratuitos. Salas/conteúdo premium por subscrição (Stripe — ainda por implementar).

**Audiência:** Investidores portugueses, todos os níveis. O funil de valor está nos mais experientes.

**Estado actual:** Praticamente fechado para lançamento. Todos os 69 prompts Codex + V1.x features + GDPR completo + documentos legais criados. A aguardar: configuração de infra/deploy e acções humanas obrigatórias (DPIA assinatura João).

---

## 2. REPOSITÓRIOS E ESTRUTURA

```
Riquinho/api/Front/
├── API_finhub/          ← Backend (Express + TypeScript + MongoDB)
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── contracts/   ← validação de input (requestContracts)
│   ├── dcos/
│   │   └── finhub/
│   │       ├── TASKS.md              ← backlog completo (fonte de verdade)
│   │       ├── PROMPTS_EXECUCAO.md   ← todos os prompts Codex (69 executados)
│   │       ├── AI_CONTEXT.md         ← este ficheiro
│   │       ├── COMMUNITY.md          ← spec técnica da comunidade
│   │       ├── AUTH.md               ← spec autenticação
│   │       ├── NOTIFICATIONS.md      ← spec notificações
│   │       ├── PAYMENTS.md           ← spec pagamentos
│   │       └── MODERATION.md         ← spec moderação
│   └── package.json
│
└── FinHub-Vite/         ← Frontend (React + Vike SSR + Tailwind + shadcn/ui)
    ├── src/
    │   ├── pages/           ← file-based routing Vike
    │   │   ├── comunidade/
    │   │   │   ├── +Page.tsx              ← listagem de salas
    │   │   │   ├── @slug/+Page.tsx        ← detalhe de sala
    │   │   │   └── post/@id/+Page.tsx     ← detalhe de post
    │   │   ├── home/+Page.tsx
    │   │   └── ... (outras rotas)
    │   ├── features/        ← feature modules
    │   │   ├── auth/
    │   │   ├── community/
    │   │   │   ├── pages/
    │   │   │   │   ├── CommunityRoomsPage.tsx
    │   │   │   │   ├── CommunityRoomDetailPage.tsx
    │   │   │   │   └── CommunityPostDetailPage.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── LeaderboardWidget.tsx
    │   │   │   │   └── MarkdownEditor.tsx
    │   │   │   ├── services/communityService.ts
    │   │   │   ├── types/community.ts
    │   │   │   └── utils/markdown.ts
    │   │   └── ... (outras features)
    │   ├── components/
    │   │   ├── ui/           ← shadcn/ui components
    │   │   ├── home/         ← HeroBanner, ContentRow, etc.
    │   │   └── shared/       ← ContentCard, etc.
    │   ├── renderer/
    │   │   ├── PageShell.tsx ← wrapper global (QueryClient, Router, Auth, Theme)
    │   │   └── resolvePageComponent.ts
    │   ├── shared/
    │   │   └── layouts/      ← UnifiedTopShell, PublicShell
    │   ├── index.css         ← CSS variables + Tailwind base
    │   └── styles/globals.css
    ├── tailwind.config.ts
    └── vite.config.ts
```

---

## 3. TECH STACK

### Backend (API_finhub)
- **Runtime:** Node.js ≥ 20, TypeScript 5.8
- **Framework:** Express.js
- **DB:** MongoDB + Mongoose
- **Auth:** JWT (access token 15min + refresh token 7d)
- **Validation:** `requestContracts` (middleware de validação por rota)
- **Security:** Helmet.js, CORS whitelist (`ALLOWED_ORIGINS` env), rate limiting (6 limiters críticos), sem `as any` em código novo
- **Package manager:** npm

### Frontend (FinHub-Vite)
- **Framework:** React 18 + Vike SSR (file-based routing)
- **Build:** Vite + SWC
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State:** Zustand (`useAuthStore`), TanStack Query v5 (react-query)
- **Date:** date-fns v4 + react-day-picker v9
- **Icons:** lucide-react
- **Markdown:** custom `renderCommunityMarkdown()` + DOMPurify (browser-only)
- **Package manager:** yarn

---

## 4. REGRAS CRÍTICAS — LER ANTES DE QUALQUER TAREFA FRONTEND

### ⚠️ SSR OBRIGATÓRIO (Vike renderiza no servidor)
**NUNCA usar em componentes renderizados em SSR:**
- `useParams`, `useNavigate`, `Navigate`, `useLocation` do `react-router-dom`
- `window.*`, `document.*`, `localStorage.*` sem guard `typeof window !== 'undefined'`
- Bibliotecas DOM no top-level (ex: DOMPurify.sanitize() — usar guard SSR)

**Alternativas correctas:**
- Slug/params: receber via prop do `+Page.tsx` (`pageContext.routeParams`)
- Redirects: `window.location.replace(url)` dentro de `useEffect`
- `passToClient = ['routeParams']` em `+Page.tsx` para passar params do servidor ao cliente

### ⚠️ Routing Vike
- Cada página tem `+Page.tsx` + opcionalmente `+route.ts`
- `@slug` = parâmetro de um segmento (ex: `/comunidade/@slug`)
- Evitar colisões: `/comunidade/@slug` vs `/comunidade/post/@id` — route.ts explícito resolve
- `usePageContext()` (de `@/renderer/PageShell`) para aceder ao `pageContext` em componentes

### ⚠️ Hooks React
- Todos os hooks (`useState`, `useQuery`, `useMutation`, `useMemo`) ANTES de early returns
- Early returns com guards (`if (!data) return ...`) só depois de todos os hooks

### ⚠️ ESLint + Prettier
- Sem `any` explícito (TypeScript strict)
- Pre-commit hooks correm `eslint --fix` + `prettier --write` automaticamente
- Imports de tipo: `import type { ... }` para types-only

---

## 5. DESIGN SYSTEM

### Tokens de cor (index.css + tailwind.config.ts)
```css
/* Light mode */
--primary: near-black (estrutural, 60% do layout)
--brand: 239 84% 67%       /* indigo #6366F1 — CTAs, labels, accents */
--brand-foreground: white
--brand-subtle: 239 84% 97% /* fundo tinted */

/* Dark mode */
--brand: 243 75% 72%
--brand-subtle: 239 50% 14%
```

**Regra 60/30/10:**
- 60% → `--primary` (near-black) — estrutura, texto, borders
- 30% → `--brand` (indigo) — CTAs, super-labels, highlights, links hover
- 10% → amber/gold — rank medals (#1 amber-500, #2 slate-400, #3 amber-700/70)

### Padrões visuais estabelecidos
- **Super-label:** `text-xs font-semibold uppercase tracking-widest text-brand` antes de h1/h2
- **Brand accent line:** `absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand via-brand/50 to-transparent` (requer `relative overflow-hidden` no pai)
- **Secção destacada:** `border border-brand/20 bg-brand/[0.03] dark:bg-brand/[0.06]`
- **Headings:** `font-extrabold tracking-tighter text-foreground`
- **CTA primário:** `bg-brand text-brand-foreground hover:bg-brand/90`

### Personalidade da marca
- **Sério, moderno, educativo** — nem banco tradicional, nem fintech flashy
- **Referências:** Netflix (content grid), Trading 212 (clean charts), Instagram (feed social), Discord (comunidade)
- **Anti-referências:** Finviz, SeekingAlpha — demasiado denso, demasiado focado em números

### Comunidade — padrões visuais
- **Room cards:** icon badge 44px tinted (categoria), nome à direita, "Entrar →" no hover
- **Post rows:** coluna upvote (↑ score ↓) à esquerda, conteúdo à direita (Reddit-style)
- **Threaded replies:** linha vertical no vote column para indicar profundidade
- **Pill sort tabs:** `rounded-full border bg-muted/40 p-1` com active state `bg-brand text-brand-foreground`
- **Leaderboard:** medals gold/silver/bronze + XP em `text-brand`

### Categorias de salas (com cores)
```ts
general: rgba(99,102,241,0.10)    // indigo
budgeting: rgba(245,158,11,0.10)  // amber
investing: rgba(16,185,129,0.10)  // emerald
real_estate: rgba(249,115,22,0.10)// orange
fire: rgba(239,68,68,0.10)        // red
credit: rgba(59,130,246,0.10)     // blue
expat: rgba(6,182,212,0.10)       // cyan
beginners: rgba(139,92,246,0.10)  // violet
premium: rgba(245,158,11,0.15)    // amber deeper
```

---

## 6. WORKFLOW CODEX + CLAUDE

### Como funciona
1. **Claude** decide qual o próximo prompt a executar (baseado em TASKS.md + PROMPTS_EXECUCAO.md)
2. **Codex** executa o prompt autonomamente (lê os ficheiros, implementa, corre lint/build/tests)
3. **Codex** produz relatório no formato definido em PROMPTS_EXECUCAO.md
4. **Claude** valida o relatório: revê código, confirma que o resultado está correcto
5. **Claude** dá o OK para avançar para o próximo prompt
6. Repetir

### Formato de commit
```
tipo(área): descrição concisa em português

- detalhe 1
- detalhe 2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Tipos: `feat`, `fix`, `design`, `refactor`, `docs`, `chore`, `security`

### Git
- Branch principal: `master` (frontend) / `main` (backend)
- Não usar `--force` sem permissão explícita do utilizador
- Não fazer push sem aprovação do utilizador

---

## 7. ESTADO ACTUAL — O QUE FOI FEITO

### Backend (API_finhub) — COMPLETO ✅
- Auth (JWT, refresh, roles: visitor/free/premium/creator/brand_manager/admin)
- Hub de conteúdo (artigos, vídeos, cursos, podcasts, livros)
- Criadores (perfil público, dashboard, topics, redes sociais)
- Admin (editorial CMS, moderation, métricas reais DAU/utilizadores)
- Ferramentas (stocks análise rápida, FIRE, ETF overlap, watchlist, crypto)
- Comunidade completa (salas, posts, replies, votos, XP, níveis, badges, leaderboard)
- Segurança (Helmet, CORS, rate limiting, JWT env, 0 vulns `npm audit`)
- GDPR-01: cookie consent + analytics opt-out + data export endpoint ✅ validado 2026-03-24
- V1.1–V1.6: SecurityTab, feed/pesquisa, sitemap, Cloudinary avatar, export RGPD UI, field-level encryption audit ✅
- TTL indexes em AdminAuditLog, ContentModerationEvent, AgentActivityLog ✅
- Documentos legais: DPIA.md, BREACH_RESPONSE_PLAN.md, POLITICA_RETENCAO_DADOS.md ✅ (pendentes assinatura humana)

### Frontend (FinHub-Vite) — COMPLETO ✅
- Todas as páginas públicas e autenticadas
- Onboarding (3 passos), página de preços (estática)
- SEO (JSON-LD, structured data, sitemap dinâmico)
- Analytics (PostHog consent-gated, eventos AN-1, opt-out toggle em /conta/definicoes)
- Comunidade UI (rooms, posts Reddit-style, leaderboard, XP)
- Design system aplicado (brand indigo, dark mode, homepage redesenhada, ContentCard unificado)
- GDPR-01: CookieBanner.tsx + analytics conditional init ✅

---

## 8. O QUE ESTÁ PENDENTE

### ⚠️ Acções Humanas Obrigatórias (João — não são código)

| Item | Ficheiro |
|------|----------|
| **Assinar DPIA** — preencher "Aprovado por" + "Data de aprovação" (secção 8) | `dcos/finhub/legal/DPIA.md` |
| **Preencher número de telemóvel de emergência** | `dcos/finhub/legal/BREACH_RESPONSE_PLAN.md` |
| **Preencher `[email do fundador]`** em múltiplos ficheiros legais | `dcos/finhub/legal/` — 3 ficheiros |

### 🟡 Infra/Deploy (antes de abrir ao público)

| Item | Detalhes |
|------|----------|
| MongoDB não exposto publicamente | Confirmar na infra de deploy |
| HTTPS enforced | Redirect HTTP → HTTPS; HSTS activo |
| Variáveis de ambiente em prod configuradas | Ver `RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md` (necessita reescrita) |
| Backups MongoDB automatizados | Snapshot policy antes de release pública |
| Logs de erro em prod sem stack traces | Express error handler em prod devolve mensagem genérica |

### 🟡 Opcional pré-release (Codex)

| Item | Prompt |
|------|--------|
| **CLEANUP-03** — Remover scripts PS1 de fases obsoletas | `PROMPTS_EXECUCAO.md` → PROMPT CLEANUP-03 |
| **AN-8** — GDPR PostHog: apagar dados analytics ao encerrar conta | `PROMPTS_EXECUCAO.md` → PROMPT AN-8 |

### 🟢 Pós-v1.0

| Item | Notas |
|------|-------|
| Pagamentos / subscrições (Stripe) | Bloqueado por conta Stripe |
| Notificações real-time (WebSocket) | Hoje é polling |
| Lighthouse > 80 | Performance optimization |
| ~285 erros TS pré-existentes | Gradual, não bloqueia build |
| GA4/GTM, ads analytics, heatmaps PostHog | AN-2, AN-3, AN-7, AN-9 |

---

## 9. FICHEIROS-CHAVE A CONHECER

### Frontend
| Ficheiro | O que faz |
|----------|-----------|
| `src/index.css` | CSS variables (cores, dark mode) |
| `src/styles/globals.css` | Headings globais, dark mode tokens |
| `tailwind.config.ts` | Token `brand` + extensões Tailwind |
| `src/renderer/PageShell.tsx` | Wrapper global — QueryClient, Router, Auth, Shell |
| `src/pages/+onRenderClient.tsx` | Hydration/CSR logic |
| `src/features/auth/stores/useAuthStore.ts` | Auth state (Zustand) |
| `src/lib/api/client.ts` | Axios instance + `getErrorMessage()` |
| `src/lib/react-query-client.ts` | QueryClient global |
| `src/shared/layouts/UnifiedTopShell.tsx` | Layout autenticado (navbar + footer) |
| `src/shared/layouts/PublicShell.tsx` | Layout público |
| `.claude/skills/` | Skills Impeccable para design (bolder, arrange, etc.) |
| `.impeccable.md` | Design context para skills Impeccable |

### Backend
| Ficheiro | O que faz |
|----------|-----------|
| `src/app.ts` | Express app setup |
| `src/middleware/auth.ts` | JWT middleware |
| `src/middleware/requestContracts.ts` | Input validation |
| `src/services/xp.service.ts` | Sistema XP + leaderboard + badges |
| `src/services/communityThread.service.ts` | Posts, replies, votos (atomic) |
| `src/models/User.ts` | User model (roles, XP, badges) |

### Docs
| Ficheiro | O que faz |
|----------|-----------|
| `dcos/finhub/TASKS.md` | Backlog completo com estados |
| `dcos/finhub/PROMPTS_EXECUCAO.md` | Todos os 69 prompts Codex |
| `dcos/finhub/COMMUNITY.md` | Spec técnica completa da comunidade |
| `dcos/finhub/AI_CONTEXT.md` | Este ficheiro |

---

## 10. COMO CRIAR UM NOVO PROMPT CODEX

Quando um item de TASKS.md não tem prompt definido, cria um seguindo este template:

```markdown
## PROMPT [ID] — [Título] ⏳

**Contexto do projeto:**
- [descrever área backend/frontend]
- Stack relevante

**Ficheiros de referência:**
[listar ficheiros a ler antes de implementar]

**Tarefa:**
[descrição clara do que implementar]

**Requisitos:**
1. [requisito específico]
2. [requisito específico]

**Validações obrigatórias:**
- [ ] `npm run typecheck` PASS
- [ ] `npm run build` PASS
- [ ] `npm run lint` 0 erros

**Não fazer:**
- [lista de coisas a evitar]

**Relatório esperado:**
[formato padrão do PROMPTS_EXECUCAO.md]
```

Sempre incluir a REGRA SSR no topo se for frontend.

---

## 11. COMO VALIDAR UM PROMPT CODEX

Quando o Codex entrega um relatório:

1. **Ler o relatório** — ficheiros criados/modificados, comandos executados
2. **Ler o código** — abrir os ficheiros relevantes e verificar:
   - Sem violações SSR
   - Sem `any` explícito
   - Tipos correctos
   - Lógica faz o que o prompt pede
3. **Verificar integração** — o código está ligado ao resto do sistema?
4. **Confirmar testes** — typecheck + build + lint PASS
5. **Dar feedback** — VALIDADO / BLOQUEADO (com o que corrigir)
6. **Actualizar TASKS.md** — marcar o item como ✅ com data

---

## 12. DECISÕES IMPORTANTES TOMADAS

| Decisão | Contexto | Porquê |
|---------|----------|--------|
| `--brand` token separado de `--primary` | Design system | `--primary` é near-black (estrutural). Mudar para indigo quebraria toda a UI. Brand indigo aplicado cirurgicamente em CTAs/labels |
| DOMPurify com guard SSR | `markdown.ts` | DOMPurify precisa de `document` — crash em Node.js SSR sem guard |
| `passToClient = ['routeParams']` em `+Page.tsx` | Vike routing | Funciona mas a forma "correcta" Vike v1 é `+config.ts`. Mantido por consistência |
| Vike `+route.ts` explícito para `/comunidade/post/@id` | Bug BC2 | Sem route.ts explícito, Vike não resolvia correctamente a rota aninhada |
| shadcn Card removido da comunidade | Design | Substituído por divs custom com brand styling — mais controlo visual |
| `react-day-picker@9` | Tech debt | v8 incompatível com date-fns v4 — actualizado TECH-DEBT-02 |

---

## 13. CONTEXTO ADICIONAL DO UTILIZADOR

- **Nome do utilizador:** João (fundador do FinHub)
- **Idioma de comunicação:** Português (PT)
- **Estilo preferido de resposta:** Directo, sem rodeios, técnico quando necessário
- **Workflow preferido:** Claude pensa e planeia, Codex executa código pesado, Claude valida
- **Prioridade actual:** Fechar funcionalidades pendentes → beta fechado → v1.0 → release pública
- **Design:** Aplicar melhorias visuais (skills Impeccable) apenas PÓS-release das funcionalidades pendentes

---

## 14. PRÓXIMO PASSO IMEDIATO

**Validar GDPR-01.**

O Codex executou este prompt em 2026-03-24. Claude ainda não reviu o resultado.

Para validar:
1. Procurar `CookieBanner.tsx` em `src/components/consent/`
2. Procurar alterações em `src/lib/analyticsProviders.ts`
3. Procurar endpoint de export de dados no backend (`/api/account/export` ou similar)
4. Verificar se PostHog só inicia após consentimento
5. Verificar se opt-out toggle existe em `/conta/definicoes`
6. Actualizar TASKS.md com os itens GDPR como ✅

---

*Actualizar este ficheiro sempre que houver mudanças significativas no estado do projecto.*
