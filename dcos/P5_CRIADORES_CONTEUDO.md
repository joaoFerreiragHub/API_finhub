# P5 — Criadores de Conteudo: Avaliacao e Roadmap

## Visao

O FinHub quer ser a plataforma de referencia para agregar criadores de conteudo sobre financas pessoais e investimentos. O objetivo e:

- dar aos criadores varias formas de se expressarem (reels, artigos, podcasts, videos, cursos, lives, ficheiros, anuncios);
- dar-lhes montra para os seus conteudos e produtos (internos ou de plataformas externas);
- contribuir para a literacia financeira, com conteudo curado, organizado e acessivel;
- gerir todo o ciclo de vida do conteudo: criacao, publicacao, moderacao, descoberta e engagement.

Inicialmente os criadores vao partilhar conteudos que ja tem noutras plataformas (YouTube, Spotify, Instagram, TikTok, etc.) mas progressivamente tambem vao criar dentro da plataforma.

---

## Estado atual consolidado

Data desta avaliacao: 2026-03-06.

---

## 1. O que ja existe e funciona

### 1.1 Backend — Base solida

| Componente | Estado | Ficheiros |
|-----------|--------|-----------|
| **BaseContent schema** | ✅ Completo | `src/models/BaseContent.ts` |
| **6 content types** (Article, Video, Course, Podcast, Book, LiveEvent) | ✅ Model + Controller + Service + Routes | `src/models/*.ts`, `src/controllers/*.controller.ts`, `src/services/*.service.ts` |
| **CRUD completo por tipo** | ✅ list/getBySlug/create/update/delete/publish/like/favorite/myContent/stats | Todos os controllers de conteudo |
| **Sistema de comentarios universal** | ✅ 8 target types, threading (depth 3), pins, likes, moderacao | `src/models/Comment.ts`, `src/controllers/comment.controller.ts` |
| **Sistema de ratings universal** | ✅ 8 target types, 1 por user, reviews, distribuicao | `src/models/Rating.ts`, `src/controllers/rating.controller.ts` |
| **Follow/unfollow** | ✅ Com stats, mutual follows, bulk check | `src/services/follow.service.ts` |
| **Favoritos** | ✅ 6 content types | `src/models/Favorite.ts` |
| **Notificacoes** | ✅ 8 tipos, bulk create, mark read, stats por tipo | `src/services/notification.service.ts` |
| **Creator operational controls** | ✅ creationBlocked, publishingBlocked, cooldownUntil | `src/middlewares/creatorOperationalControl.ts` |
| **Creator trust service** | ✅ Score 0-100, risk levels, recomendacoes automaticas | `src/services/creatorTrust.service.ts` |
| **Upload** | ✅ image/video/audio/document, delete, list, stats | `src/controllers/upload.controller.ts` |
| **Editorial sections** | ✅ Seccoes + items com time-based visibility | `src/models/EditorialSection.ts` |
| **Claims** | ✅ Criadores reclamam ownership de conteudo seed | `src/models/ClaimRequest.ts` |
| **Directory entries** | ✅ Claimaveis, verificaveis | `src/models/DirectoryEntry.ts` |
| **Roles & guards** | ✅ requireCreator, requirePremium, roleGuard | `src/middlewares/roleGuard.ts` |
| **Auto-moderacao** | ✅ Integrada nos comments e conteudo | `automatedModerationService` |
| **Social event bus** | ✅ Eventos de follow, content interaction | Event publishing em services |

### 1.2 Frontend — Estrutura montada

| Componente | Estado | Ficheiros |
|-----------|--------|-----------|
| **Dashboard principal** | ✅ 13 cards, layout com sidebar | `pages/creators/dashboard/index.page.tsx` |
| **Sidebar de navegacao** | ✅ 5 grupos, avatar, XP progress | `components/sidebar/creatorSidebar.tsx` |
| **Rotas protegidas** | ✅ creator + admin, 20+ paginas definidas | `routes/creator.ts`, `routes/creatorDashboardRouts.ts` |
| **Gestao de anuncios** | ✅ CRUD completo (mockado) | `contentManagement/announcements/` (6 components + hooks) |
| **Gestao de cursos** | ✅ API real integrada, form multi-step | `dashboard/courses/`, `contentManagement/courses/` |
| **Gestao de artigos** | ✅ API real integrada, filtros, stats | `dashboard/articles/ManageArticles.tsx` |
| **Gestao de playlists** | ✅ CRUD, videos por URL, YouTube thumbnails (mock) | `contentManagement/playlists/` |
| **Gestao de reels** | ⚠️ UI funcional, mock data | `contentManagement/reels/reelsManager.tsx` |
| **Gestao de ficheiros** | ⚠️ Upload real + localStorage para persistencia | `contentManagement/files/` |
| **Gestao de lives** | ⚠️ Calendar + form, precisa validacao | `contentManagement/lives/` |
| **Gestao de podcasts** | ⚠️ Manager + episodios (mock) | `contentManagement/podcasts/` |
| **Welcome videos** | ⚠️ Cards + panel (mock) | `contentManagement/welcomeVideos/` |
| **Statistics dashboard** | ⚠️ 8 tabs, GlobalOverview com mock data | `components/stats/ContentStatsDashboard.tsx` |
| **Marketing/campanhas** | ⚠️ AdManager, wizard, insights (tudo mock) | `components/marketing/campanhas/` |
| **Wallet** | ⚠️ TopUp modal, KPIs, spending chart (tudo mock) | `components/marketing/wallet/` |
| **Perfil publico de criador** | ⚠️ Componente existe mas pagina desactivada via surfaceControl | `components/public/CreatorProfile.tsx` |
| **Lista de criadores** | ⚠️ Filtros + grid + 4 mock creators | `pages/creators/index.page.tsx` |
| **Hub de conteudos** | ✅ Pagina de descoberta com categorias | `pages/hub/conteudos/index.page.tsx` |
| **Detalhe de artigo/curso** | ✅ Paginas com slug dinamico | `pages/hub/articles/@slug.page.tsx` |
| **Registo de criador** | ✅ Zod schema completo (validacao, 18+, agreements) | `auth/schemas/creatorFormSchema.ts` |
| **Creator types** | ✅ Creator, CreatorFull, content types definidos | `types/creator.ts`, `types/content.ts` |
| **Gamificacao** | ⚠️ Hooks + components base, integracao incompleta | `hooks/useUserLevel.ts`, `hooks/useMissions.ts` |

---

## 2. Gaps criticos — Backend sem implementacao

Estes sao content types que o frontend referencia mas nao tem backend correspondente.

### 2.1 Reels/Shorts

**O que falta:**
- Model `Reel.ts` (estender BaseContent ou schema dedicado)
- Controller `reel.controller.ts`
- Service `reel.service.ts`
- Routes `reel.routes.ts`

**Decisoes a tomar:**

| Questao | Opcoes |
|---------|--------|
| Reel e um content type do BaseContent? | (a) Sim — discriminator como Article/Video. Vantagem: engagement, moderacao, editorial tudo incluido. (b) Nao — schema leve separado. Vantagem: mais simples, menos overhead. |
| Onde fica o video? | (a) Upload interno (storage nosso). (b) Embed externo (YouTube Shorts, TikTok, Instagram Reel). (c) Ambos — `sourceType` do BaseContent ja suporta isto. |
| Duracao maxima? | Sugestao: 90 segundos (alinhado com Reels/Shorts standard). |

**Campos sugeridos (se BaseContent):**
```
videoUrl: string (required)
duration: number (seconds, max 90)
orientation: 'vertical' | 'horizontal' (default 'vertical')
externalPlatform?: 'youtube' | 'tiktok' | 'instagram' | null
externalId?: string
```

**Prioridade:** P1 — reels sao o formato mais consumido e o mais provavel de ser usado por criadores a partilhar conteudo externo.

---

### 2.2 Playlists

**O que falta:**
- Model `Playlist.ts`
- Controller `playlist.controller.ts`
- Service `playlist.service.ts`
- Routes `playlist.routes.ts`

**Contexto:** O frontend ja tem tipos definidos (`Playlist`, `PlaylistResolved`, `PlaylistVideo`) com campos como `playlistName`, `videoLinks[]`, `isSelected`, `type` (regular/shorts/podcast), `topic`. A logica de YouTube thumbnails ja existe.

**Decisoes a tomar:**

| Questao | Opcoes |
|---------|--------|
| Playlist e um BaseContent? | Sugestao: **Nao.** Playlist e um agrupador/organizador, nao e conteudo em si. Schema proprio. |
| Playlist pode ter itens mistos? | (a) So videos/links. (b) Qualquer content type (artigos, podcasts, etc.). Sugestao: comecar com (a), expandir depois. |
| Quem pode criar? | Creator + admin (admin pode criar playlists editoriais). |

**Campos sugeridos:**
```
name: string (required)
slug: string (unique)
creator: ObjectId (ref User)
description?: string
type: 'regular' | 'shorts' | 'podcast' (indexed)
topic: string (enum dos topics existentes)
items: [{
  url: string
  title?: string
  duration?: number
  thumbnailUrl?: string
  order: number
  platform?: 'youtube' | 'spotify' | 'tiktok' | 'vimeo' | 'internal'
}]
isPublic: boolean (default true)
isMain: boolean (default false) — playlist principal do perfil
coverImage?: string
views: number (default 0)
status: 'active' | 'archived'
```

**Prioridade:** P1 — e a forma principal de os criadores organizarem e apresentarem o seu conteudo externo (videos YouTube, episodios podcast).

---

### 2.3 Announcements/Avisos

**O que falta:**
- Model `Announcement.ts`
- Controller `announcement.controller.ts`
- Service `announcement.service.ts`
- Routes `announcement.routes.ts`

**Contexto:** O frontend ja tem CRUD completo mockado com React Query hooks (`useAnnouncements`, `useCreateAnnouncement`, etc.). Tipos definidos: `title`, `body`, `publishedAt`, `type` (inline/popup), `imageUrl`, `isVisible`.

**Decisoes a tomar:**

| Questao | Opcoes |
|---------|--------|
| Announcement e um BaseContent? | Sugestao: **Nao.** Anuncios sao efemeros, sem ratings/comments/engagement pesado. Schema leve proprio. |
| Scope? | (a) Por criador — cada criador tem os seus avisos para os seus seguidores. (b) Global — admin tambem pode criar avisos da plataforma. Sugestao: ambos, com campo `scope`. |
| Expiracao automatica? | Sugestao: campo `expiresAt` opcional. |

**Campos sugeridos:**
```
title: string (required, max 200)
body: string (required, max 2000)
creator: ObjectId (ref User)
type: 'inline' | 'popup' (default 'inline')
scope: 'creator' | 'platform' (default 'creator')
imageUrl?: string
isVisible: boolean (default true)
expiresAt?: Date
publishedAt: Date
```

**Prioridade:** P1 — criadores precisam de comunicar com os seus seguidores (novos conteudos, lives agendadas, avisos importantes).

---

### 2.4 Files/Documents

**O que falta:**
- Model `CreatorFile.ts`
- Controller `creatorFile.controller.ts`
- Service `creatorFile.service.ts`
- Routes `creatorFile.routes.ts`

**Contexto:** O frontend usa localStorage para persistir ficheiros (`creatorContentStorage.ts`) e o endpoint `/api/upload` para o upload real. Falta um model para registar os ficheiros no MongoDB com metadata.

**Campos sugeridos:**
```
creator: ObjectId (ref User, indexed)
title: string (required)
originalName: string
mimeType: string
url: string (required) — URL do ficheiro no storage
size: number (bytes)
topic?: string
description?: string
isPublic: boolean (default true)
downloads: number (default 0)
isPremium: boolean (default false) — ficheiros so para premium
status: 'active' | 'archived'
```

**Nota:** Nao e BaseContent porque ficheiros nao tem engagement rico (likes, ratings, comments). E um recurso partilhavel, nao conteudo editorial.

**Prioridade:** P2 — util mas nao bloqueante para o MVP dos criadores.

---

### 2.5 Endpoint `/api/creators` (listagem publica)

**O que falta:**
- Controller `creator.controller.ts` (ou `publicCreator.controller.ts`)
- Service `creator.service.ts`
- Routes `creator.routes.ts`

**O frontend ja espera:**
- Listagem com filtros (topic, rating, frequency, tipo de conteudo, sort)
- Pesquisa por nome/username
- Top creators
- Perfil publico individual

**Endpoints sugeridos:**
```
GET  /api/creators              — lista publica com filtros e paginacao
GET  /api/creators/:username    — perfil publico de um criador
GET  /api/creators/top          — top creators por followers/rating/engagement
GET  /api/creators/:id/content  — conteudo publicado de um criador (agregado)
GET  /api/creators/:id/stats    — stats publicas (total conteudos, seguidores, rating)
```

**Filtros sugeridos:**
```
topic: string (filter por topics do criador)
search: string (nome/username regex)
sort: 'popular' | 'rating' | 'recent' | 'content_count'
contentType: string (criadores que publicam este tipo)
publicationFrequency: string
page, limit: paginacao
```

**Logica do perfil publico:**
- Retornar: username, nome, avatar, bio, socialLinks, topics, followers, averageRating, contentCounts
- Nao retornar: email, password, creatorControls, tokenVersion, etc.
- Respeitar `contentVisibility` do criador para seccoes publicas

**Prioridade:** P1 — sem isto nao ha descoberta de criadores, e a montra nao funciona.

---

## 3. Gaps criticos — Frontend sem UI

### 3.1 Videos — criar/editar

**Estado atual:** O backend tem controller + service completos para Videos. O frontend tem rotas definidas (`/creators/dashboard/videos/create.page.tsx`, `videos/@id/edit.page.tsx`) mas os forms de criacao/edicao podem estar incompletos.

**O que precisa:**
- VideoForm.tsx (seguir padrao de CourseForm/ArticleForm)
- Campos: titulo, descricao, videoUrl (upload ou embed), duracao, qualidade, categoria, tags, coverImage, isPremium
- Preview do video integrado
- Draft/publish flow

**Prioridade:** P1 — videos sao core da plataforma.

---

### 3.2 Books — criar/editar

**Estado atual:** Backend completo. Frontend tem rotas mas UI pode estar incompleta.

**Campos do form:** titulo, descricao, autor, ISBN, paginas, lingua, data de publicacao, buyLinks (amazon, kobo, other), keyPhrases, coverImage, isPremium.

**Prioridade:** P2 — livros sao um tipo de conteudo complementar, nao o canal principal.

---

### 3.3 Podcasts/Lives — verificar integracao

**Estado atual:** Frontend tem componentes (`PodcastsManagementPage`, `livesManager`) mas precisa de validar se estao ligados as APIs reais ou ainda com mocks.

**Prioridade:** P2 — validar e ligar.

---

## 4. Gaps de experiencia — Fluxos em falta

### 4.1 Onboarding de criador

**Estado atual:** Existe schema de registo com validacao Zod (nome, email, password, 18+, topics, 3 agreements). Nao existe fluxo multi-step pos-registo.

**Fluxo sugerido:**

```
Passo 1: Registo (ja existe)
  └─ userName, nome, email, password, dateOfBirth, topics, agreements

Passo 2: Completar perfil (novo)
  └─ Bio, foto de perfil, socialLinks, website
  └─ typeOfContent, contentCategories, publicationFrequency

Passo 3: Primeiro conteudo (novo)
  └─ Wizard: "Que tipo de conteudo queres partilhar?"
  └─ Opcoes: Criar playlist (importar do YouTube), escrever artigo, publicar reel
  └─ Skip allowed mas incentivado

Passo 4: Tour guiado (novo)
  └─ Highlights do dashboard
  └─ Como publicar, como ver stats, como comunicar com seguidores
```

**Implementacao:**
- Flag `onboardingCompleted: boolean` no User model
- Middleware/guard que redireciona criadores novos para o onboarding
- Progress tracker visual (stepper)
- Pode ser gamificado (XP por completar passos — ja ha sistema de gamificacao no frontend)

**Prioridade:** P2 — importante para retencao mas nao bloqueia operacao basica.

---

### 4.2 Moderacao de comentarios pelo criador

**Estado atual:** O sistema de comentarios suporta `pin` por creator/admin. O criador pode ver comentarios no seu conteudo mas nao tem UI dedicada para gerir (ocultar, reportar, moderar).

**O que falta:**
- Endpoint: `GET /api/creators/me/comments` — todos os comentarios nos conteudos do criador
- UI: painel de moderacao de comentarios no dashboard do criador
- Acoes: ocultar, reportar, responder, pin

**Nota:** O backend ja suporta `moderationStatus` nos comentarios e `togglePin`. Falta essencialmente o endpoint agregado e a UI.

**Prioridade:** P2 — criadores vao precisar disto assim que tiverem engagement.

---

### 4.3 Scheduling de publicacao

**Estado atual:** O BaseContent tem `status: draft | published | archived` e `publishedAt`. Nao ha logica de scheduling — publicar e uma acao imediata.

**O que falta:**
- Campo: `scheduledAt: Date` no BaseContent
- Logica: se `scheduledAt` esta definido e no futuro, o conteudo fica em `scheduled` (novo status ou flag)
- Cron job ou worker: verifica periodicamente conteudos com `scheduledAt <= now` e muda para `published`
- UI: DateTimePicker no form de publicacao, preview de "Agendado para X"

**Campos a adicionar ao BaseContent:**
```
scheduledAt?: Date
// ou novo status: 'draft' | 'scheduled' | 'published' | 'archived'
```

**Prioridade:** P3 — nice to have, nao bloqueante.

---

### 4.4 Analytics integrado

**Estado atual:**
- Backend: cada controller tem `getStats(creatorId)` que retorna totais basicos (total conteudos, views, etc.)
- Frontend: `ContentStatsDashboard.tsx` com 8 tabs, `GlobalContentOverview.tsx` com 4 KPIs mockados

**O que falta:**
- Endpoint agregado: `GET /api/creators/me/analytics` com dados de todos os content types
- Metricas temporais: views/likes/comments por dia/semana/mes (requer agregacao MongoDB)
- Top content: conteudos com mais engagement
- Growth: evolucao de seguidores, views totais
- Frontend: ligar os componentes existentes as APIs reais

**Prioridade:** P2 — criadores precisam de feedback sobre o seu desempenho.

---

### 4.5 Perfil publico de criador

**Estado atual:**
- `CreatorProfile.tsx` (195 linhas) existe e funciona com follow/unfollow via API real
- As paginas publicas (`/creators`, `/creators/:username`) estao desactivadas via `usePublicSurfaceControl('creator_page')`
- Mock data com 4 criadores

**O que falta:**
- Endpoint `/api/creators/:username` no backend (ver gap 2.5)
- Activar surfaceControl
- Seccoes do perfil: bio, social links, playlists, ultimos conteudos, rating
- `contentVisibility` respeitado na exibicao publica

**Prioridade:** P1 — e a montra principal do criador.

---

## 5. Gaps de monetizacao e negocio

### 5.1 Wallet e pagamentos

**Estado atual:** Frontend tem UI completa (modal top-up, KPIs, spending chart, transacoes) mas tudo mock.

**O que falta (backend):**
- Model `Transaction.ts` — registo de movimentos financeiros
- Model `CreatorWallet.ts` — saldo, historico, settings
- Integracao com payment gateway (Stripe, PayPal)
- Endpoints: top-up, withdraw, balance, history

**Prioridade:** P3 — importante para o modelo de negocio mas pode vir depois do MVP funcional.

---

### 5.2 Campanhas publicitarias

**Estado atual:** Frontend tem AdManager, wizard de criacao, insights cards — tudo mock.

**O que falta (backend):**
- Model `Campaign.ts` — status, budget, targeting, metricas
- Model `Ad.ts` — criativo, placement, impressoes, cliques
- Logica de aprovacao (admin revê antes de publicar)
- Billing: debitar wallet do criador por impressoes/cliques
- Reporting: metricas de campanha em tempo real
- Regras de placement por zonas dedicadas (perfil do user, seccoes de recursos, slots editoriais)
- Politica de relevancia: campanhas financeiras/contextuais, sem serving quando nao houver match

**Prioridade:** P3 — feature de monetizacao avancada.

---

### 5.3 Conteudo premium / paywall

**Estado atual:**
- BaseContent tem `isPremium: boolean`
- roleGuard tem `requirePremium` (premium, creator, admin) - precisa revisao de regra de negocio
- Nao ha logica de compra/acesso individual a conteudo pago

**Decisao funcional obrigatoria:**
1. `creator` nao equivale a `premium` por defeito.
2. `admin` nao equivale a `premium` por defeito para consumo da app.
3. Acesso premium/no-ads deve ser decidido por `plan/entitlements`, nao por role operacional.

**O que falta:**
- Decidir modelo: (a) subscription da plataforma da acesso a tudo, (b) compra individual por conteudo, (c) hibrido
- Se (b) ou (c): Model `Purchase.ts`, checkout flow, access control por conteudo
- Cursos ja tem campo `price` — falta o checkout real

**Prioridade:** P3 — pode comecar com modelo simples (subscription = acesso total a premium).

---

## 6. Desconexoes frontend ↔ backend

### 6.1 Tipos desalinhados

| Frontend type | Backend model | Problema |
|--------------|--------------|----------|
| `Playlist` (content.ts) | Nao existe | Frontend define `videoLinks[]`, backend nao tem model |
| `Announcement` (content.ts) | Nao existe | Frontend define `title, body`, backend nao tem model |
| `CreatorFile` (creatorFile.ts) | Nao existe | Frontend define `name, url, topic, mimeType`, backend nao tem model |
| `Creator.famous[]` | Nao existe no User model | Frontend define array de plataformas onde e famoso, backend nao tem campo |
| `Creator.contentVisibility` | Nao existe no User model | Frontend define toggles por tipo de conteudo, backend nao tem |
| `Creator.typeOfContent` | Nao existe no User model | Frontend define tipo de conteudo principal |
| `Creator.contentCategories` | Nao existe no User model | Frontend define categorias |
| `Creator.publicationFrequency` | Nao existe no User model | Frontend define frequencia |
| `Creator.courses/articles/events/files/announcements` (arrays) | Nao existe no User model | Frontend embedded refs, backend usa queries por creator ObjectId |

### 6.2 Abordagem recomendada

**Campos a adicionar ao User model:**
```typescript
// Profile enrichment
typeOfContent?: string
contentCategories?: string[]
publicationFrequency?: 'daily' | 'weekly' | 'monthly' | 'occasional'
famousPlatforms?: string[]  // onde o criador tem presenca significativa

// Content visibility (public profile control)
contentVisibility?: {
  announcements: boolean
  courses: boolean
  articles: boolean
  events: boolean
  files: boolean
  playlists: boolean
  welcomeVideo: boolean
}

// Onboarding
onboardingCompleted?: boolean
onboardingCompletedAt?: Date
```

**Nao adicionar ao User model:**
- `courses[]`, `articles[]`, `events[]`, `files[]`, `announcements[]` — estes devem ser queries ao BaseContent/respectivos models pelo `creator` ObjectId, nao embedded arrays no User. O frontend pode resolver via API calls ao perfil publico.

---

## 7. Conteudo externo vs interno

### 7.1 Estrategia de importacao

O BaseContent ja tem `sourceType: 'internal' | 'external_profile' | 'external_content'`. Isto e a base para suportar a fase inicial onde criadores partilham conteudo de outras plataformas.

**Fluxo sugerido para conteudo externo:**

```
1. Criador cola URL (YouTube, Spotify, Instagram, etc.)
2. Backend extrai metadata via oEmbed/API:
   - Titulo, descricao, thumbnail, duracao
   - Plataforma de origem
3. Cria entry no BaseContent com:
   - sourceType: 'external_content'
   - campos preenchidos automaticamente
   - criador confirma/edita antes de publicar
4. Conteudo aparece no perfil do criador e na descoberta
```

**O que falta:**
- Service `externalContent.service.ts` — resolver URLs, extrair metadata via oEmbed
- Suporte para: YouTube, Spotify, Instagram, TikTok, Vimeo, SoundCloud
- Cache de thumbnails (nao depender de hotlink externo)
- UI: campo "Importar de URL" nos forms de conteudo

**Prioridade:** P1 — e assim que a maioria dos criadores vai comecar.

---

## 8. Roadmap de implementacao sugerido

### Fase 1 — MVP Criador (P1)

Sem isto o criador nao consegue operar de forma minimamente util.

| # | Item | Backend | Frontend | Esforco estimado |
|---|------|---------|----------|-----------------|
| 1.1 | **Reels model + CRUD** | Model, controller, service, routes | Ligar reelsManager.tsx a API real | Medio |
| 1.2 | **Playlists model + CRUD** | Model, controller, service, routes | Ligar PlaylistsManager.tsx a API real | Medio |
| 1.3 | **Announcements model + CRUD** | Model, controller, service, routes | Swap mocks por API real nos hooks existentes | Baixo |
| 1.4 | **Endpoint /api/creators** | Controller + service de listagem publica | Ligar lista/perfil de criadores a API | Medio |
| 1.5 | **Perfil publico activado** | Endpoint /:username com projection segura | Activar surfaceControl, ligar a API | Baixo |
| 1.6 | **Video create/edit UI** | Ja existe | Completar VideoForm.tsx | Baixo |
| 1.7 | **Campos de perfil no User model** | Adicionar contentVisibility, typeOfContent, etc. | Alinhar tipos | Baixo |
| 1.8 | **Importacao de URL externo** | oEmbed service, metadata extraction | Campo "Importar de URL" nos forms | Medio |

### Fase 2 — Experiencia completa (P2)

Criador opera mas com limitacoes de gestao e feedback.

| # | Item | Backend | Frontend | Esforco estimado |
|---|------|---------|----------|-----------------|
| 2.1 | **Onboarding multi-step** | Flag no User model, redirect logic | Wizard 4 passos | Medio |
| 2.2 | **CreatorFiles model** | Model + CRUD, substituir localStorage | Migrar CreatorFilesPanel para API | Baixo |
| 2.3 | **Moderacao de comentarios (criador)** | Endpoint /creators/me/comments | Painel de comentarios no dashboard | Medio |
| 2.4 | **Analytics integrado** | Endpoint agregado /creators/me/analytics | Ligar ContentStatsDashboard a API | Medio |
| 2.5 | **Books create/edit UI** | Ja existe | Completar BookForm.tsx | Baixo |
| 2.6 | **Podcasts/Lives — validar integracao** | Ja existe | Verificar se mocks ou API, ligar | Baixo |
| 2.7 | **Notificacoes para seguidores** | Ja existe (content_published) | UI de notificacao no perfil do seguidor | Baixo |

### Fase 3 — Diferenciacao e monetizacao (P3)

Features que tornam a plataforma sustentavel e competitiva.

| # | Item | Backend | Frontend | Esforco estimado |
|---|------|---------|----------|-----------------|
| 3.1 | **Scheduling de publicacao** | scheduledAt + cron worker | DateTimePicker nos forms | Medio |
| 3.2 | **Wallet & pagamentos** | Transaction + Wallet models, Stripe | Ligar UI existente | Alto |
| 3.3 | **Campanhas publicitarias** | Campaign + Ad models, billing | Ligar UI existente | Alto |
| 3.4 | **Conteudo premium / paywall** | Purchase model, access control | Checkout flow | Alto |
| 3.5 | **Verificacao de criador** | Badge system, verificacao manual | Badge no perfil, request flow | Medio |
| 3.6 | **SEO tools** | Metadata endpoints | Ligar SEOSettingsPanel | Baixo |
| 3.7 | **Templates de conteudo** | Template model | Ligar templatesManager | Medio |
| 3.8 | **Gamificacao completa** | XP/levels/missions backend | Ligar hooks existentes | Medio |

---

## 9. Padrao de implementacao (referencia)

Para manter consistencia, todos os novos content types devem seguir o padrao existente:

### Backend — novo content type

```
1. Model — src/models/NovaTipo.ts
   - Se BaseContent: usar discriminator (ver Article.ts como exemplo)
   - Se schema proprio: incluir creator ref, timestamps, indexes

2. Service — src/services/novaTipo.service.ts
   - list(filters, options) com paginacao
   - getBySlug(slug) / getById(id)
   - create(creatorId, dto)
   - update(id, creatorId, dto, isAdmin)
   - delete(id, creatorId, isAdmin)
   - publish(id, creatorId) (se aplicavel)
   - getMyItems(creatorId, options)
   - getStats(creatorId)

3. Controller — src/controllers/novaTipo.controller.ts
   - Seguir padrao article.controller.ts
   - Validacao de DTOs no controller
   - try/catch com mensagens em PT

4. Routes — src/routes/novaTipo.routes.ts
   - GET  / (public)
   - GET  /:slug (public)
   - GET  /my (authenticate + requireCreator)
   - GET  /stats (authenticate + requireCreator)
   - POST / (authenticate + requireCreator + enforceCreatorOperationalControl('create'))
   - PATCH /:id (authenticate + requireCreator)
   - DELETE /:id (authenticate + requireCreator)
   - PATCH /:id/publish (authenticate + requireCreator + enforceCreatorOperationalControl('publish'))
   - POST /:id/like (authenticate)
   - POST /:id/favorite (authenticate)

5. Registar em src/routes/index.ts
```

### Frontend — ligar a API

```
1. Hooks — src/features/creators/hooks/useNovaTipo.ts
   - useMyItems(filters)
   - useCreateItem()
   - useUpdateItem()
   - useDeleteItem()
   - usePublishItem()

2. Service — src/features/hub/novaTipo/services/novaApiService.ts
   - Axios/fetch calls ao backend

3. Substituir mocks pelos hooks reais nos componentes existentes
```

---

## 10. Notas finais

### Pontos fortes da base atual
- **BaseContent** e um schema robusto e extensivel — novos content types sao faceis de adicionar
- **Moderacao, trust, operational controls** ja estao implementados — criadores novos ja tem guardrails
- **Sistema universal de comments/ratings/favorites** poupa muito trabalho — nao precisa de reimplementar por tipo
- **Editorial visibility** permite curar conteudo para homepage/landing sem logica custom
- **Claims** permitem transicionar conteudo seed do admin para ownership real de criadores

### Riscos a monitorizar
- **Mock data disperso** — ha mocks em localStorage, in-memory arrays, e ficheiros .ts separados. A migracao para API real precisa de ser sistematica para nao deixar mocks esquecidos.
- **Tipos frontend desalinhados** — os tipos em `creator.ts` e `content.ts` podem divergir dos models reais do backend. Manter alinhados ao implementar.
- **surfaceControl** — varias features estao desactivadas por flag. Ao implementar, documentar quais flags precisam de ser activadas.
