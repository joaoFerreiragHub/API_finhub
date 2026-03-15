# FinHub — Company Brief para Equipa de Agentes AI

*Data: 2026-03-15*
*Propósito: briefing completo do projecto para uma equipa de agentes AI que gere a empresa em todas as vertentes de negócio*

---

## SUMÁRIO EXECUTIVO

O **FinHub** é uma plataforma portuguesa de literacia financeira e investimentos que combina três pilares num único ecossistema:

1. **Ferramentas de mercado** — análise de acções, REITs, ETFs, cripto, watchlist, simulador FIRE
2. **Hub de conteúdo** — criadores de conteúdo financeiro (artigos, vídeos, cursos, podcasts, livros)
3. **Diretório de entidades** — corretoras, seguradoras, plataformas de investimento (reviews + comparação)

**Posicionamento:** O sweet spot entre Koyfin (ferramentas pro) e Simply Wall St (narrativa visual) — prosumer, dados densos, mas visualmente cuidado. A alternativa séria ao Reddit r/literaciafinanceira.

**Estado actual:** Plataforma tecnicamente madura a aproximar-se de beta fechado. Core funcional completo. A trabalhar em polish UI/UX (P8) e ligação FIRE frontend.

**Stack:** Node.js/Express + TypeScript (backend) | React 19 + Vite + Tailwind + shadcn/ui (frontend) | MongoDB + Redis | Docker + GitHub Actions CI/CD

---

## PARTE 1 — O PRODUTO

### 1.1 Tipos de Utilizadores

| Tipo | Descrição | O que procuram |
|------|-----------|----------------|
| **Investidor retail** | Pessoa singular a investir em acções/ETFs/REITs/cripto | Ferramentas de análise, educação, comunidade |
| **Criador de conteúdo** | Especialista que publica conteúdo financeiro | Audiência, monetização, dashboard de análise |
| **Marca/Entidade financeira** | Corretoras, seguradoras, plataformas | Presença no diretório, campanhas, leads qualificados |
| **Administrador** | Equipa FinHub | Moderação, operação, métricas, configuração |

### 1.2 Ferramentas de Mercado (core diferenciador)

#### Análise de Acções (Stocks)
- **Quick Analysis:** Score 0-100 (FinHubScore) com 4 dimensões — Qualidade, Crescimento, Valuation, Risco
- **60+ indicadores calculados:** ROE, ROIC, margem EBITDA, P/E, P/FCF, EV/EBITDA, debt/equity, CAGR receita, etc.
- **Detailed Analysis:** Valuation histórica, Profitabilidade, Crescimento, Dívida, Saúde financeira, Dividendos, Riscos
- **Peer comparison:** Tabela + radar chart com pares sectoriais
- **ML Predictions:** Price target 3M, earnings forecast, análise de risco AI sector-específica
- **Charts:** Demonstrações financeiras, balanço, cash flow, ROIC vs WACC, surpresas EPS
- **News & Events:** Feed de notícias com sentimento, earnings calendar, macro calendar
- **Alerts:** Alertas configuráveis por ticker
- **Export:** PDF ou JSON da análise
- **Radar ceilings sectoriais:** thresholds ajustados por sector (tech, saúde, financeiro, etc.)
- **Fonte de dados:** Financial Modeling Prep (FMP) API + fallback Yahoo/Google

#### REIT Toolkit
- **3 métodos de valuation:** DDM (Dividend Discount Model), FFO (Funds From Operations), NAV (Net Asset Value)
- **Confidence badges:** alto/médio/baixo confiança por método
- **Profile detection:** Growth REIT / Income REIT / Mixed — raciocínio transparente
- **Cap rate por sector:** 3 cenários (optimista/base/conservador)
- **mREIT vs equity REIT:** handling diferenciado
- **Implied cap rate:** calculado automaticamente
- **Valuation score:** combinado dos 3 métodos

#### ETF Overlap Analyzer
- **Objetivo:** Detectar sobreposição entre ETFs na watchlist/portfolio
- **Nota:** Dados de overlap são actualmente simulados (bug conhecido, requer fix antes de beta)
- **Expense ratio:** mostrar custo anual do ETF

#### Crypto Dashboard
- **Listagem:** top moedas com preço, market cap, variação 24h
- **Bug conhecido:** market cap usa `quoteVolume` em vez de `price × circulatingSupply` (fix pendente)
- **Ordenação:** por preço, variação, nome

#### Watchlist
- **CRUD:** adicionar/remover tickers
- **Multi-asset:** acções + REITs + cripto + ETFs
- **Bug conhecido:** N chamadas paralelas em vez de batch (performance issue)
- **Nota futura:** sparklines 7d por item, sorting, alertas de preço

#### Simulador FIRE (Financial Independence, Retire Early)
- **Portfolio CRUD:** criar portfolio com holdings (acções, ETFs, obrigações, cripto, imobiliário)
- **3 cenários:** optimista/base/conservador
- **Monte Carlo:** simulações com `successProbabilityPct`, percentis, curva anual
- **Calibração histórica:** retorno/yield/volatilidade calibrados por ativo com dados reais FMP
- **What-If:** `contributionDelta`, `annualReturnShock`, `inflationShock` — comparativo baseline vs ajustado
- **Estado:** backend completo incluindo Monte Carlo; frontend a ligar os blocos what-if e Monte Carlo

### 1.3 Hub de Conteúdo

#### Tipos de conteúdo suportados
| Tipo | Descrição |
|------|-----------|
| **Artigo** | Texto longo, formatado, com SEO optimizado |
| **Vídeo** | Player integrado ou embed (YouTube/Vimeo) |
| **Curso** | Estrutura multi-lição com progresso |
| **Podcast** | Episódios com player de áudio |
| **Livro** | Resenhas ou livros digitais |
| **Evento** | Webinars, conferências, meetups |
| **Reel** *(em desenvolvimento)* | Vídeo curto <60s |
| **Playlist** *(em desenvolvimento)* | Colecção ordenada de conteúdo |
| **Announcement** *(em desenvolvimento)* | Post curto/update |

#### Funcionalidades de conteúdo
- **Comments universais:** em qualquer tipo de conteúdo, com threading
- **Ratings:** sistema de rating por conteúdo
- **Follows:** seguir criadores
- **Likes/Saves:** guardar conteúdo favorito
- **Explore/Discover:** listagem agregada com filtros por tipo, categoria, tags
- **Feed personalizado:** conteúdo dos criadores seguidos (`/a-seguir`)
- **SEO:** meta tags dinâmicas, sitemap.xml, Open Graph/Twitter Cards

#### Dashboard do Criador
- **Overview:** KPIs (views, seguidores, engagement)
- **CRUD conteúdo:** criar, editar, publicar, arquivar
- **Estatísticas:** analytics por conteúdo
- **Agendamento** *(futuro)*: publicação programada
- **Wallet** *(futuro)*: monetização, pagamentos

### 1.4 Diretório de Entidades

- **Categorias:** corretoras, seguradoras, plataformas de robo-advisor, bancos, fintechs
- **Perfil de entidade:** info, reviews de utilizadores, ratings, comentários
- **Claims:** entidades podem reclamar o seu perfil
- **Admin:** CRUD completo, publish/archive, gestão de claims
- **Estado:** backend + admin completos; páginas públicas a desenvolver (Onda 3 do beta)

### 1.5 Funcionalidades Sociais e de Comunidade

**Actualmente:**
- Follow/unfollow criadores
- Comments em conteúdo (universal)
- Ratings (1-5 estrelas)
- Likes + saves

**Em roadmap (pós-beta):**
- **Discussions:** threads tipo Reddit — fórum integrado por tópicos (FIRE Portugal, ETFs europeus, iniciantes, impostos, etc.)
- **Upvote/downvote** em discussões
- **Q&A:** perguntas que criadores e comunidade respondem
- **Reputation system:** pontos, badges, karma

---

## PARTE 2 — ARQUITETURA TÉCNICA

### 2.1 Backend (`API_finhub/`)

**Stack:** Node.js + Express + TypeScript + MongoDB + Redis + JWT

**Estrutura:**
```
src/
├── controllers/        — lógica de endpoint (stocks, reits, admin, auth, etc.)
├── models/             — 37 modelos MongoDB
├── services/           — serviços reutilizáveis (email, upload, moderação, etc.)
├── middlewares/        — auth, rate limit, moderação, validação
├── routes/             — rotas organizadas por domínio
└── utils/
    └── financial/      — helpers de cálculo financeiro
        ├── resultBuilder.ts   — 60+ indicadores stocks
        ├── helpers.ts         — fmt, fmtPercent, plausibleOrNull
    └── stockFetchers.ts       — fetchers FMP + radar
```

**Modelos principais (37 total):**
- `User` — autenticação, roles (user/creator/admin), trust score, tokenVersion
- `BaseContent` + 6 discriminadores (Article, Video, Course, Podcast, Book, Event)
- `Comment`, `Rating`, `Follow`, `Notification`, `Report`
- `DirectoryEntry`, `Brand`, `AdCampaign`, `AdMetrics`
- `ContentAccessPolicy` — sistema de paywall/premium
- `Portfolio`, `PortfolioHolding` — simulador FIRE
- `Discussion` *(planeado)*
- `AuditLog`, `ModeratorAction`, `AppealCase`, `TrustProfile`
- `EditorialSection`, `EditorialItem`, `SurfaceControl`
- `AdminNotification`, `AdminAlert`, `PlatformConfig`

**Autenticação:**
- JWT access token + refresh token (rotação automática)
- OAuth Google (Passport.js)
- Email verification obrigatório para acções críticas
- CAPTCHA (hCaptcha/Turnstile) no registo e login
- Rate limiting via Redis (brute force protection)
- 22 scopes de permissão para admin

**APIs externas:**
- **Financial Modeling Prep (FMP):** dados de mercado, fundamentais, preços, peers, news
- **Resend/SendGrid:** email transacional (verificação, reset password, alertas)
- **S3-compatible storage:** avatares, uploads de conteúdo (R2/Spaces/AWS)
- **PostHog:** analytics de produto
- **Sentry:** error tracking

**Endpoints principais:**
```
/api/auth/*              — login, registo, refresh, OAuth, email verify, password reset
/api/users/*             — perfil, conta, export RGPD, delete
/api/stocks/*            — análise quick/detailed, ML predictions, peers, news
/api/reits/*             — DDM, FFO, NAV
/api/etfs/*              — análise ETF
/api/crypto/*            — listagem crypto
/api/watchlist/*         — CRUD watchlist
/api/portfolio/*         — CRUD portfolio + simulação FIRE (incluindo Monte Carlo + what-if)
/api/content/*           — CRUD conteúdo (articles, videos, courses, etc.)
/api/creators/*          — endpoints públicos de criadores
/api/comments/*          — comments universais
/api/ratings/*           — ratings
/api/feed/*              — feed personalizado
/api/search/*            — pesquisa global
/api/notifications/*     — notificações
/api/directory/*         — diretório de entidades
/api/admin/*             — dashboard admin (moderação, users, editorial, métricas, config)
/api/platform/*          — runtime config, legal, integrações
```

### 2.2 Frontend (`FinHub-Vite/`)

**Stack:** React 19 + TypeScript + Vite + Tailwind 3.4 + shadcn/ui (New York) + React Router 6 + React Query + Zustand

**71 rotas definidas (80+ páginas):**
```
Públicas:
  /                       — Homepage com hero, content rows
  /explorar/*             — Descoberta de conteúdo
  /artigos/:slug          — Detalhe de artigo
  /videos/:slug           — Player de vídeo
  /cursos/:slug           — Detalhe de curso
  /criadores              — Lista de criadores
  /criadores/:username    — Perfil público do criador
  /recursos/*             — Diretório de entidades

Autenticadas:
  /mercados/acoes         — Análise de acções
  /mercados/reits         — REIT Toolkit
  /mercados/etfs          — ETF Analyzer
  /mercados/cripto        — Crypto dashboard
  /mercados/watchlist     — Watchlist
  /ferramentas/fire/*     — Simulador FIRE

  /dashboard              — Dashboard pessoal do utilizador
  /a-seguir               — Feed personalizado
  /conta                  — Gestão de conta (perfil, password, RGPD)
  /notificacoes           — Centro de notificações

Criador:
  /creators/dashboard/*   — Dashboard + criar/gerir conteúdo

Admin:
  /admin/*                — Backoffice completo (22 sub-áreas)

Estáticas:
  /sobre, /faq, /contacto
  /termos, /privacidade, /cookies, /aviso-legal
```

**Componentes-chave:**
- `ReitsToolkitPage.tsx` — REIT UI (~1400 linhas, referência de padrão de design)
- `QuickAnalysis.tsx` — Stock quick analysis
- `StockDetails.tsx` — Stock detailed analysis
- `MLPredictions/` — 6 cards de previsões AI
- `FinHubScore.tsx` — Score 0-100 com barra de gradiente
- `PeersMiniTable.tsx` — Tabela de pares
- Múltiplos charts Recharts (BalanceSheet, CashFlow, FinancialStatements, Radar, etc.)

**Design system:**
- CSS variables HSL (light + dark mode via next-themes)
- Tailwind config extenso com tokens próprios
- 67+ componentes shadcn/ui (Radix UI por baixo)
- Lucide React como ícone principal
- Recharts para visualização financeira
- `design-tokens.css` com paleta completa, tipografia, spacing, shadows

**Issues de UI activos (P8):**
- 8+ MLPredictions cards com `bg-white` hardcoded (quebra dark mode)
- 9 chart files com hex colors hardcoded (não adaptam ao tema)
- Headings com `text-gray-900` hardcoded
- Chart colors não definidos no `.dark` CSS block
- Spec completa de execução em `dcos/P8_UI_UX_IMPLEMENTACAO_TECNICA.md`

### 2.3 Infraestrutura e DevOps

- **Docker:** Dockerfile para backend + frontend, docker-compose.yml para dev/prod
- **CI/CD:** GitHub Actions — build, test, deploy para GHCR, smoke de Docker image, uptime monitor (cada 5 min)
- **Error tracking:** Sentry backend + frontend (ErrorBoundary global)
- **Monitoring:** GitHub Actions uptime monitor com webhook de alerta
- **Rate limiting:** Redis-backed (mem fallback em dev)
- **SEO:** robots.txt, sitemap.xml gerado em build, meta tags dinâmicas

---

## PARTE 3 — MODELO DE NEGÓCIO

### 3.1 Streams de Revenue

#### Tier Gratuito (utilizadores)
- Acesso às ferramentas de mercado (com limites)
- Consumo de conteúdo público
- Feed básico, watchlist limitada
- Comunidade básica

#### Tier Premium (subscription utilizadores) *(futuro)*
- Ferramentas sem limites (análises ilimitadas, FIRE avançado)
- Acesso a conteúdo premium dos criadores
- Alertas avançados
- Exportação PDF/CSV das análises
- Sem anúncios de terceiros
- Preço: TBD (referência: €5-15/mês)

#### Criadores (modelo de partilha)
- **Free creators:** publicar grátis, sem monetização
- **Pro creators** *(futuro)*: subscrição por creator, paywall por conteúdo, merchandise
- **Plataforma:** comissão sobre receita do criador (TBD, referência: 15-30%)

#### Marcas/Entidades
- **Perfil no diretório:** listagem gratuita + premium (destaque, badges, features)
- **Campanhas publicitárias:** sponsored content, sponsored insights, campanhas directas
- **Value ads** (filosofia core):
  - *Insight Sponsorship:* facto financeiro educativo patrocinado
  - *Tool Sponsorship:* feature/calculadora patrocinada por uma marca
  - *Comparison Sponsorship:* "melhor ETF para..." patrocinado
  - *Data Sponsorship:* dataset exclusivo fornecido por entidade
- **Leads:** corretoras pagam por lead qualificado (utilizador que clica em "Abrir conta")
- **Parceiros estratégicos:** integrações API, co-marketing

#### Affiliates *(futuro)*
- Links de afiliado para corretoras (DEGIRO, IBKR, eToro, etc.)
- Revenue share por conta aberta via FinHub

### 3.2 Filosofia de Monetização
*"Win-Win-Win: plataforma ganha, anunciante ganha, utilizador ganha"*

Regra de ouro: **Se o utilizador não consegue distinguir o anúncio de uma feature útil, o anúncio está bem feito.** Sem banners disruptivos, sem popups. A publicidade deve dar valor funcional.

### 3.3 Backend de Monetização (já implementado)

- `ContentAccessPolicy` — regras de paywall por tipo de conteúdo, categoria, tags
- `AdCampaign` + `AdMetrics` — gestão de campanhas e métricas
- Admin `/admin/monetizacao` — gestão de paywall, planos, campanhas
- Subscrições + planos (modelo backend pronto, pagamentos não implementados)
- Sistema de apelação de moderação (P4.3-03) — criadores podem apelar decisões

---

## PARTE 4 — ESTADO ACTUAL DO PROJECTO

### 4.1 O que está completo e pronto para produção

| Módulo | Estado |
|--------|--------|
| Auth (JWT, OAuth Google, email verify, password reset, CAPTCHA) | ✅ Completo |
| Ferramentas de mercado (Stocks, REITs, ETFs, Crypto, Watchlist) | ✅ Completo |
| Simulador FIRE backend (incluindo Monte Carlo + what-if) | ✅ Completo |
| Admin dashboard (22 scopes, moderação, users, editorial, métricas) | ✅ Completo |
| Sistema de moderação (queue, trust scoring, auto-mod, appeals) | ✅ Completo |
| Conteúdo (6 tipos, comments, ratings, follows) | ✅ Completo |
| Dashboard do criador (overview, criar, publicar, listar) | ✅ MVP Completo |
| Páginas públicas (explorar, artigo, vídeo, curso, criadores, perfil) | ✅ MVP Completo |
| Diretório de entidades (backend + admin) | ✅ Completo |
| Email transacional (verify, reset, welcome, alertas) | ✅ Completo |
| Páginas legais (termos, privacidade, cookies, aviso legal) | ✅ Completo |
| Gestão de conta + RGPD (edit, change password, delete, export) | ✅ Completo |
| Storage S3-compatible | ✅ Completo |
| SEO (meta tags, sitemap, robots.txt) | ✅ Completo |
| Analytics (PostHog com consent) | ✅ Completo |
| Docker + CI/CD | ✅ Completo |
| Error tracking (Sentry) | ✅ Completo |
| Monitoring (uptime monitor GitHub Actions) | ✅ Completo |
| Monetização backend (paywall, campanhas, subscrições) | ✅ MVP Completo |
| E2E tests fluxos críticos | ✅ Baseline Green |

### 4.2 Em desenvolvimento activo

| Item | Estado |
|------|--------|
| FIRE frontend (what-if + Monte Carlo visual) | 🔄 Em curso |
| UI/UX Elevação P8 (dark mode, charts, polish) | 🔄 Planeado (spec completa em `P8_UI_UX_IMPLEMENTACAO_TECNICA.md`) |

### 4.3 Bugs conhecidos a corrigir antes de beta

| Bug | Impacto |
|-----|---------|
| Crypto market cap usa `quoteVolume` em vez de `price × circulatingSupply` | Dados errados visíveis |
| ETF overlap disclaimer ausente (dados simulados apresentados como reais) | Risco de confiança |
| Watchlist: N chamadas paralelas em vez de batch FMP | Performance + rate limits |

### 4.4 Próximos marcos

1. **Imediato:** Ligar FIRE frontend aos blocos what-if e Monte Carlo
2. **P8:** Execução da spec de UI/UX (dark mode + charts + polish)
3. **Beta preparação:** Correcção dos 3 bugs críticos
4. **Beta fechado:** 20-50 utilizadores reais, obter feedback
5. **Pós-beta:** Comunidade (discussions), recomendações, notificações real-time

---

## PARTE 5 — REGRAS OPERACIONAIS (para agentes que trabalham no código)

### 5.1 Regras obrigatórias (de `dcos/regras.md`)

1. **3 artefactos por ponto fechado:** implementação + docs + commit
2. **Working tree limpo** ao terminar qualquer ponto
3. **Mover para `dcos/done/`** quando um P fica concluído
4. **Actualizar `dcos/audiotira_04.md`** no mesmo ciclo de fecho
5. **Validação técnica mínima sempre:**
   - Backend: `npm run typecheck`
   - Frontend: `npm run typecheck:p1` (ou `npx tsc --noEmit --project tsconfig.app.json`)
6. **Não alterar lógica de negócio** durante fixes de UI/styling
7. **Não reverter alterações do utilizador** sem confirmação explícita
8. **Em handoff:** reportar entregue, ficheiros, validações, commit hash, próximo passo
9. **Checkpoint de retoma** (`dcos/regras.md` → secção "Checkpoint de Retoma") actualizado em cada ciclo

### 5.2 Padrão de design a seguir

- **Referência de código:** `ReitsToolkitPage.tsx` — padrão correcto de theming
- **CSS variables:** usar `bg-card`, `border-border`, `text-muted-foreground`, `text-foreground` — nunca `bg-white`, `border-gray-100`, `text-gray-500`
- **Dark mode:** todos os componentes devem funcionar em light E dark
- **Commit convention:** `area(scope): mensagem` ex: `feat(fire): add monte carlo frontend`

### 5.3 Ficheiros críticos por área

| Área | Ficheiro Principal |
|------|--------------------|
| Stocks backend | `API_finhub/src/utils/financial/resultBuilder.ts` |
| Stocks controller | `API_finhub/src/controllers/stock.controller.ts` |
| REIT backend | `API_finhub/src/controllers/reit.controller.ts` |
| FMP fetchers | `API_finhub/src/utils/stockFetchers.ts` |
| Helpers financeiros | `API_finhub/src/utils/financial/helpers.ts` |
| REIT UI | `FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx` |
| Stock UI | `FinHub-Vite/src/features/tools/stocks/components/` |
| Design tokens | `FinHub-Vite/src/styles/globals.css` |
| Tipos stocks | `FinHub-Vite/src/features/tools/stocks/types/stocks.ts` |
| Tipos REIT API | `FinHub-Vite/src/features/markets/services/marketToolsApi.ts` |
| Regras colaboração | `API_finhub/dcos/regras.md` |
| UI spec execução | `API_finhub/dcos/P8_UI_UX_IMPLEMENTACAO_TECNICA.md` |
| UI estratégia | `API_finhub/dcos/P8_UI_UX_ELEVACAO.md` |
| Backlog técnico | `API_finhub/dcos/audiotira_04.md` |
| Lista de P's | `API_finhub/dcos/done/LISTA_IMPLEMENTACOES_A_FAZER.md` |

---

## PARTE 6 — EQUIPA DE AGENTES SUGERIDA

Para gerir o FinHub como empresa em todas as vertentes, a equipa de agentes deve cobrir estas funções:

### Agente 1 — CTO / Engineering Lead
**Missão:** Supervisão técnica, arquitetura, code quality, CI/CD, resolução de bugs críticos

**Responsabilidades:**
- Executar spec `P8_UI_UX_IMPLEMENTACAO_TECNICA.md` (UI/dark mode fixes)
- Resolver os 3 bugs críticos de beta (crypto, ETF, watchlist)
- Ligar FIRE frontend aos blocos what-if e Monte Carlo
- Manter typecheck verde em ambos os repos
- Gerir dívida técnica (175 erros TS pre-existentes, mock data, tipos desalinhados)
- Review de PRs, definição de padrões de código
- Uptime monitoring, Sentry alerts, performance

**Comandos base:**
```bash
# Backend
cd API_finhub && npm run typecheck && npm run build
# Frontend
cd FinHub-Vite && npx tsc --noEmit --project tsconfig.app.json
# E2E críticos
cd FinHub-Vite && yarn test:e2e:critical
```

---

### Agente 2 — Product Manager
**Missão:** Priorização de features, roadmap, decisões de produto, user feedback

**Responsabilidades:**
- Gerir o backlog em `dcos/done/LISTA_IMPLEMENTACOES_A_FAZER.md`
- Priorizar ondas do beta (Ondas 1-4 de `ROADMAP_BETA.md`)
- Definir critérios de go/no-go para cada release
- Traduzir feedback de beta em user stories
- Gerir o roadmap pós-beta (comunidade, recomendações, monetização avançada)
- Monitorizar métricas de produto (DAU, retenção D7, engagement, NPS)
- Manter `dcos/audiotira_04.md` actualizado

**Documentos-chave:**
- `dcos/done/ROADMAP_BETA.md` — ondas de lançamento
- `dcos/P5_PRE_BETA_PLATAFORMA.md` — checklist pré-beta
- `dcos/done/LISTA_IMPLEMENTACOES_A_FAZER.md` — backlog completo
- `dcos/P5_FERRAMENTAS_AUDIT_E_NOVAS.md` — roadmap de ferramentas
- `dcos/P5_COMUNIDADE_SOCIAL.md` — roadmap de comunidade

---

### Agente 3 — Head of Growth / Marketing
**Missão:** Aquisição de utilizadores, SEO, conteúdo de marketing, presença pública

**Responsabilidades:**
- Estratégia SEO (conteúdo do blog/glossário financeiro para tráfego orgânico)
- Copy da landing page e páginas estáticas (/sobre, /faq, /precos)
- Glossário financeiro (Onda 3: ~100 termos)
- Campanhas de lançamento beta (lista de espera, early adopters)
- Social media (LinkedIn, Twitter/X para audiência financeira PT)
- Parcerias com criadores de conteúdo financeiro
- PR e media (jornais financeiros PT: Dinheiro Vivo, Eco, Jornal de Negócios)
- Métricas: traffic, conversão de registo, retorno de utilizadores

**Documentos-chave:**
- `dcos/P5_EDUCACAO_LITERACIA.md` — glossário e camada educativa
- `dcos/P5_CONTEXTO_MERCADO.md` — market pulse e contexto
- `dcos/P5_PRE_BETA_PLATAFORMA.md` § 5.2 — SEO baseline implementado

---

### Agente 4 — Head of Revenue / Business Development
**Missão:** Monetização, parcerias com marcas, modelo de negócio

**Responsabilidades:**
- Implementar e gerir campanhas de marcas (corretoras, seguradoras)
- Definir pricing para planos premium e enterprise
- Gestão do admin `/admin/monetizacao` (paywall rules, campanhas, planos)
- Negociar parcerias estratégicas (DEGIRO, eToro, IBKR, NovoBanco, etc.)
- Value ads: criar e aprovar "insights patrocinados" (filosofia Win-Win-Win)
- Affiliate program (links para corretoras com tracking)
- KPIs: MRR, ARPU, conversion free→premium, CPM de campanhas

**Documentos-chave:**
- `dcos/P_REVENUE_E_ADS_ESTRATEGIA.md` — estratégia completa de publicidade
- `dcos/done/P4_3_4_5_BACKOFFICE_NEGOCIO.md` — backend de monetização implementado
- `dcos/P5_MARCAS_ENTIDADES.md` — roadmap de marcas

---

### Agente 5 — Head of Operations / Community Manager
**Missão:** Moderação, suporte a utilizadores, operação da plataforma, gestão de criadores

**Responsabilidades:**
- Moderação de conteúdo via admin `/admin/moderacao`
- Gestão de reports e appeals (`/admin/apelacoes`)
- Onboarding e suporte a criadores
- Onboarding de novas entidades no diretório
- Resposta a tickets de suporte (/contacto → email de suporte)
- Gestão de utilizadores problemáticos (suspend/ban)
- Comunicações da plataforma (anúncios, newsletters)
- Execução de runbooks: `dcos/done/RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md`
- KPIs operacionais: tempo de resposta a reports, abuse rate, creator satisfaction

**Comandos admin:**
- `GET /api/admin/moderation/queue` — fila de moderação
- `GET /api/admin/users` — gestão de utilizadores
- `GET /api/admin/analytics/kpis` — métricas operacionais

**Documentos-chave:**
- `dcos/P4_MODERATION_CONTROL_PLANE.md` — sistema de moderação
- `dcos/done/RUNBOOK_MODERATION_PRE_RELEASE.md` — runbooks operacionais
- `dcos/done/RUNBOOK_RELEASE_E2E_OBRIGATORIO.md` — checklist de release

---

### Agente 6 — Head of Creator Relations
**Missão:** Atrair, reter e desenvolver criadores de conteúdo na plataforma

**Responsabilidades:**
- Identificar e contactar criadores financeiros PT (YouTube, Instagram, TikTok, podcasts)
- Onboarding de criadores (guiar na criação do perfil + primeiro conteúdo)
- Suporte ao dashboard do criador
- Programa de criadores em destaque (curadoria editorial)
- Feedback de criadores → roadmap (Reels, Playlists, analytics avançado, wallet)
- Gestão de conflitos criador/plataforma
- KPIs: criadores activos/mês, conteúdo publicado/semana, criadores monetizados

**Documentos-chave:**
- `dcos/P5_CRIADORES_CONTEUDO.md` — roadmap de funcionalidades de criadores
- Admin `/admin/creators` — gestão e analytics de criadores

---

### Agente 7 — Data & Finance Analyst
**Missão:** Qualidade dos dados financeiros, precisão das ferramentas, análise de métricas

**Responsabilidades:**
- Validar precisão do FinHubScore e indicadores (comparar com fontes externas)
- Auditar bugs de dados (crypto market cap, ETF overlap, watchlist)
- Monitorizar qualidade de dados FMP e propor fallbacks
- Análise de métricas de uso das ferramentas (quais são mais usadas, onde os utilizadores saem)
- Calibração do FIRE simulator (validar retornos históricos)
- Alertas de dados stale/incorrectos
- KPIs: precisão dos dados, cobertura de tickers, NPS das ferramentas

**Documentos-chave:**
- `dcos/P5_FERRAMENTAS_AUDIT_E_NOVAS.md` — audit completo das ferramentas
- `API_finhub/src/utils/financial/` — código dos cálculos

---

### Protocolo de Comunicação Entre Agentes

```
Cada agente deve:
1. Começar por ler o Checkpoint de Retoma em `dcos/regras.md`
2. Verificar o backlog activo em `dcos/done/LISTA_IMPLEMENTACOES_A_FAZER.md`
3. Operar dentro do seu scope — não sobrepor sem coordenação
4. No fim de cada tarefa: actualizar docs + commit + reportar ao CTO Agent
5. Issues técnicos → CTO Agent
6. Issues de produto/prioridade → Product Manager Agent
7. Issues de utilizadores/criadores → Operations Agent
```

---

## PARTE 7 — CONTEXTO COMPETITIVO

### Concorrentes directos PT
- **Reddit r/literaciafinanceira / r/financaspessoais** — comunidade sem ferramentas
- **InvestingPT** — fórum antigo, sem ferramentas
- **Nenhuma plataforma PT combina ferramentas + conteúdo + comunidade**

### Referências internacionais
| Plataforma | O que têm de bom | O que nos diferencia |
|-----------|-----------------|---------------------|
| **TradingView** | Charts profissionais | Temos conteúdo + comunidade + educação |
| **Koyfin** | Dashboard pro de dados | Mais acessível, em PT, com criadores |
| **Simply Wall St** | Análise visual narrativa | Ferramentas mais completas (FIRE, REIT) |
| **Seeking Alpha** | Conteúdo + análise | Gratuito, comunidade, PT |
| **StockAnalysis.com** | Dados limpos e gratuitos | Conteúdo, comunidade, FIRE, PT |

### Vantagem competitiva
1. **Único em PT** a combinar ferramentas pro + criadores + comunidade
2. **FIRE simulator** com Monte Carlo — nenhum concorrente PT tem
3. **REIT Toolkit** com 3 métodos de valuation — único em PT
4. **FinHubScore** com contexto sectorial — análise própria, não só dados FMP
5. **Diretório de entidades** com reviews — Booking.com para corretoras PT
6. **Modelo de monetização** que não destrói confiança (value ads vs banners)

---

## PARTE 8 — GLOSSÁRIO TÉCNICO RÁPIDO

| Termo | Significado |
|-------|-------------|
| **FMP** | Financial Modeling Prep — API de dados financeiros |
| **FinHubScore** | Score 0-100 calculado internamente: Qualidade×25% + Crescimento×25% + Valuation×25% + Risco×25% |
| **plausibleOrNull()** | Helper que converte `0` (sentinel FMP para dados em falta) em `null` para empresas grandes |
| **REIT_FLAGS / STOCK_FLAGS** | Feature flags para ligar/desligar funcionalidades por ferramenta |
| **em-dash (`—`)** | Padrão para valores em falta (substituiu `N/A` em todo o sistema) |
| **surfaceControl** | Feature flags por superfície UI (ligar/desligar secções inteiras) |
| **trust score** | Score de confiança de utilizador calculado por comportamento (reports, moderação) |
| **BaseContent** | Modelo base com 6 discriminadores para todos os tipos de conteúdo |
| **P8** | Plano de elevação UI/UX (estratégia: `P8_UI_UX_ELEVACAO.md`, execução: `P8_UI_UX_IMPLEMENTACAO_TECNICA.md`) |
| **tokenVersion** | Campo no User model para invalidar todos os tokens activos (logout global) |
| **tabular-nums** | CSS `font-variant-numeric: tabular-nums` — números de largura fixa para dados financeiros |
| **Onda 1-4** | Fases do roadmap de beta (ver `ROADMAP_BETA.md`) |
| **T-1/T-0** | Janela de validação pré-release com ambiente real (não pode ser feito em dev) |

---

*Documento criado: 2026-03-15*
*Actualizar quando houver mudanças significativas de arquitectura, modelo de negócio ou estado do projecto.*
*Complementar com: `dcos/regras.md` (regras operacionais), `dcos/done/ROADMAP_BETA.md` (plano de lançamento), `dcos/P8_UI_UX_ELEVACAO.md` (estratégia UI)*
