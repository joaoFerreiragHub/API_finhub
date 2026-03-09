# P5 — Marcas e Entidades: Avaliacao e Roadmap

## Visao

O FinHub quer agregar entidades financeiras — corretoras, seguradoras, exchanges, plataformas, apps, podcasts — e dar-lhes montra dentro da plataforma. O objetivo nao e que estas entidades criem conteudo como os criadores, mas sim:

- **dar a conhecer os seus produtos e servicos** a uma audiencia interessada em financas pessoais e investimentos;
- **fazer campanhas e publicidade** direcionada a esta audiencia;
- **estar presente num diretorio de referencia** curado e verificado pela plataforma;
- **ser referenciada em conteudo editorial** (homepage, landing pages, seccoes tematicas).

A plataforma ganha com isto atraves de publicidade paga, posicionamento premium, e eventualmente comissoes/afiliacao.

---

## Estado atual consolidado

Data desta avaliacao: 2026-03-06.
Atualizacao de execucao: 2026-03-09 (backend P1.1 + P1.5 + P1.6 + P2.2 entregue).

---

## 1. Dois sistemas paralelos (legado vs atual)

Existem **dois sistemas** no codebase que tratam de marcas/entidades, o que pode causar confusao:

### 1.1 Sistema legado: Brand (`/api/brands`)

| Aspeto | Estado |
|--------|--------|
| **Model** | `src/models/Brand.ts` — schema simples com name, slug, brandType, logo, website, socialLinks, ratings, views |
| **Controller** | `src/controllers/brand.controller.ts` — CRUD completo + toggles (active, featured, verified) |
| **Service** | `src/services/brand.service.ts` — list, getBySlug, create, update, delete, toggles, stats, getFeatured, getByType |
| **Routes** | `src/routes/brand.routes.ts` — 11 endpoints (4 publicos, 7 admin) |
| **Scopes** | `admin.brands.write`, `admin.metrics.read` |
| **Frontend** | Nenhuma pagina funcional — components/ e hooks/ vazios |

**Brand types existentes:** broker, platform, website, podcast, tool, exchange, news-source, other.

**Problema:** Este sistema funciona no backend mas nao tem nenhum consumidor no frontend. E um modelo mais simples que o DirectoryEntry.

### 1.2 Sistema atual: DirectoryEntry (`/api/admin/directories`)

| Aspeto | Estado |
|--------|--------|
| **Model** | `src/models/DirectoryEntry.ts` — schema completo com ownership, claims, verificacao, editorial visibility, metadata |
| **Controller** | `src/controllers/adminEditorialCms.controller.ts` — list, create, update, publish, archive |
| **Service** | `src/services/adminEditorialCms.service.ts` — CRUD + publish/archive com audit |
| **Routes admin** | `src/routes/admin.routes.ts` — 5 endpoints admin |
| **Routes publicas** | `src/routes/editorial.routes.ts` — home, vertical landing, show-all |
| **Scopes** | `admin.directory.manage` |
| **Frontend admin** | `BrandsManagementPage.tsx` (1060 linhas) — **totalmente funcional** |
| **Frontend publico** | 9 paginas placeholder em `/recursos/*` |

**Vertical types existentes:** broker, exchange, site, app, podcast, event, other.

### 1.3 Decisao necessaria

| Opcao | Descricao | Recomendacao |
|-------|-----------|-------------|
| **(a) Migrar para DirectoryEntry** | Descontinuar Brand, usar so DirectoryEntry. Mais completo, ja tem ownership/claims/editorial. | **Recomendado** |
| (b) Manter os dois | Brand para entidades simples, DirectoryEntry para entidades ricas. Mais complexidade sem beneficio claro. | Nao recomendado |
| (c) Fundir num so model novo | Criar novo model unificado. Trabalho extra sem ganho real vs opcao (a). | Nao recomendado |

**Se opcao (a):** migrar dados existentes de Brand para DirectoryEntry, adicionar vertical types em falta (platform, tool, news-source → podem mapear para site, app, other), e retirar rotas `/api/brands`.

---

## 2. O que ja existe e funciona

### 2.1 Backend — DirectoryEntry

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **Model completo** | ✅ | name, slug, verticalType, descriptions, logo, coverImage, website, canonicalUrl, socialLinks (6 redes), country, region, categories, tags |
| **Status workflow** | ✅ | draft → published → archived, com publishedAt/archivedAt |
| **Verificacao** | ✅ | unverified → pending → verified |
| **Ownership** | ✅ | admin_seeded vs creator_owned, claimable flag, ownerUser ref |
| **Editorial visibility** | ✅ | showInHomeSection, showInDirectory, landingEnabled, showAllEnabled |
| **CRUD admin** | ✅ | list, create, update, publish (com reason opcional), archive (com reason obrigatorio) |
| **Audit trail** | ✅ | createdBy, updatedBy, adminAuditAction em todos os endpoints |
| **Scoped permissions** | ✅ | `admin.directory.manage` |
| **14+ indexes** | ✅ | Compostos para queries eficientes por vertical, status, visibility |

### 2.2 Backend — Editorial CMS

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **EditorialSection** | ✅ | key, title, subtitle, sectionType (content/directory/mixed/custom), order, maxItems, showOnHome/Landing/ShowAll |
| **EditorialSectionItem** | ✅ | targetType (article/video/course/directory_entry/external_link/custom), overrides (title/desc/image/url), badge, sortOrder, isPinned |
| **Time-based visibility** | ✅ | startAt/endAt nos items — visibilidade temporizada |
| **API publica** | ✅ | `/api/editorial/home`, `/api/editorial/:vertical`, `/api/editorial/:vertical/show-all` |
| **Admin CRUD** | ✅ | Criar seccoes, adicionar items, reordenar, remover |
| **Scope** | ✅ | `admin.home.curate` |

### 2.3 Backend — Claims

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **ClaimRequest model** | ✅ | targetType, targetId, creatorId, status (pending/approved/rejected/cancelled), reason, evidenceLinks |
| **Creator endpoints** | ✅ | criar claim, listar meus claims, cancelar claim |
| **Admin review** | ✅ | aprovar (transfere ownership), rejeitar (com motivo) |
| **OwnershipTransferLog** | ✅ | Registo imutavel de transferencias de ownership |
| **Scope** | ✅ | `admin.claim.review`, `admin.claim.transfer` |

### 2.4 Backend — Engagement nas entidades

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **Comentarios** | ✅ | Comment.targetType inclui `'brand'` — comentarios em entidades |
| **Ratings** | ✅ | Rating.targetType inclui `'brand'` — avaliacoes de entidades |
| **Views** | ✅ | Brand tem `views`, DirectoryEntry nao tem (gap) |

### 2.5 Frontend admin — Gestao de diretorios

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **BrandsManagementPage.tsx** | ✅ Totalmente funcional | 1060 linhas, vertical switcher, search, filtros, CRUD, publish/archive |
| **Hooks** | ✅ | `useAdminDirectories`, `useCreateAdminDirectory`, `useUpdateAdminDirectory`, `usePublishAdminDirectory`, `useArchiveAdminDirectory` |
| **API service** | ✅ | `adminDirectoriesService.ts` — calls ao backend |
| **Types** | ✅ | `adminDirectories.ts` — tipos completos |

### 2.6 Frontend publico — Rotas definidas (nao implementadas)

| Rota | Pagina | Estado |
|------|--------|--------|
| `/recursos` | BrandsListPage.tsx | 🔴 Placeholder |
| `/recursos/:slug` | BrandDetailPage.tsx | 🔴 Placeholder |
| `/recursos/corretoras` | BrandsBrokersPage.tsx | 🔴 Placeholder |
| `/recursos/plataformas` | BrandsPlatformsPage.tsx | 🔴 Placeholder |
| `/recursos/exchanges` | BrandsExchangesPage.tsx | 🔴 Placeholder |
| `/recursos/apps` | BrandsAppsPage.tsx | 🔴 Placeholder |
| `/recursos/sites` | BrandsSitesPage.tsx | 🔴 Placeholder |
| `/recursos/podcasts` | BrandsPodcastsPage.tsx | 🔴 Placeholder |
| `/recursos/livros` | BrandsLivrosPage.tsx | 🔴 Placeholder |

**Nota:** Os links ja estao no footer (Corretoras, Plataformas, Apps, Sites) e na navegacao do header.

---

## 3. Gaps criticos

### 3.1 Paginas publicas de recursos/diretorio

**O que falta:** Todas as 9 paginas publicas sao placeholder. O backend editorial ja tem APIs publicas prontas a consumir.

**Paginas necessarias:**

**a) Pagina index — `/recursos`**
- Hero com descricao da seccao
- Grid de categorias (corretoras, exchanges, apps, sites, podcasts, etc.) com contagem
- Entidades em destaque (isFeatured=true)
- Pesquisa global
- API: `GET /api/editorial/home` (seccoes de tipo 'directory') + `GET /api/brands` ou futuro `GET /api/directories`

**b) Pagina vertical — `/recursos/corretoras` (e analogas)**
- Listagem filtrada por verticalType
- Filtros: pais, verificacao, rating, ordenacao
- Cards com logo, nome, descricao curta, rating, badges (verificado, featured)
- API: `GET /api/editorial/:vertical` ou `GET /api/brands?brandType=broker`

**c) Pagina detalhe — `/recursos/:slug`**
- Header com logo, coverImage, nome, descricao
- Info: website, redes sociais, pais, fundacao
- Ratings e reviews (sistema universal ja existe)
- Comentarios (sistema universal ja existe)
- Conteudo relacionado (artigos/videos que mencionam esta entidade)
- Badge de verificacao
- API: `GET /api/brands/:slug` ou futuro endpoint de DirectoryEntry

**Prioridade:** P1 — sem paginas publicas, o diretorio nao tem utilidade para o utilizador final nem para as marcas.

---

### 3.2 API publica de DirectoryEntry

**Problema:** O DirectoryEntry so tem endpoints admin. Nao ha endpoints publicos dedicados para listar/detalhar entidades do diretorio (a API editorial publica serve seccoes curadas, nao o diretorio completo).

**Estado atual (2026-03-09):** backend base deste gap foi fechado com API publica dedicada:
- GET /api/directories (listagem com filtros e paginacao);
- GET /api/directories/:vertical (listagem por vertical);
- GET /api/directories/:vertical/:slug (detalhe + incremento de views);
- GET /api/directories/featured (destaques);
- GET /api/directories/search (pesquisa cross-vertical).

**O que falta:**
```
GET  /api/directories                    — lista publica com filtros e paginacao
GET  /api/directories/:vertical          — lista por vertical
GET  /api/directories/:vertical/:slug    — detalhe de uma entrada
GET  /api/directories/featured           — entradas em destaque
GET  /api/directories/search             — pesquisa cross-vertical
```

**Filtros sugeridos:**
```
verticalType: string
country: string
verificationStatus: 'verified' | 'pending' | 'unverified'
search: string (nome, descricao)
sort: 'popular' | 'rating' | 'recent' | 'name'
isFeatured: boolean
tags: string[]
page, limit
```

**Nota:** Estes endpoints devem filtrar automaticamente por `status='published'`, `isActive=true`, `showInDirectory=true`.

**Prioridade:** P1 — necessario para as paginas publicas.

---

### 3.3 Unificacao Brand ↔ DirectoryEntry

**Problema:** Dois models paralelos para a mesma funcionalidade. O Brand tem engagement (views, ratings, comments) ligado ao sistema universal. O DirectoryEntry tem ownership, claims, editorial, verificacao — mas nao tem views counter nem esta ligado ao sistema de ratings/comments da mesma forma.

**O que falta:**
- Decisao: migrar para DirectoryEntry (recomendado)
- Se migrar: adicionar `views` ao DirectoryEntry, garantir que ratings/comments apontam para DirectoryEntry
- Script de migracao de dados
- Retirar rotas `/api/brands` ou redirecionar

**Prioridade:** P2 — nao bloqueia mas a duplicacao causa confusao a longo prazo.

---

### 3.4 Vertical types adicionais

**Estado atual (2026-03-09):** gap parcialmente fechado no backend com novos verticais em `DirectoryVerticalType` e validacoes public/admin.

**Tipos existentes:** broker, exchange, site, app, podcast, event, insurance, bank, fund, fintech, newsletter, other.

**Tipos em falta para o caso de uso descrito:**

| Tipo sugerido | Exemplos | Justificacao |
|--------------|----------|-------------|
| `insurance` / seguradora | Fidelidade, Ageas, Allianz | Seguradoras sao entidades financeiras relevantes |
| `bank` / banco | Activo Bank, Moey, N26 | Bancos sao core em financas pessoais |
| `fund` / gestora | BlackRock, Vanguard, iShares | Gestoras de fundos/ETFs |
| `fintech` | Revolut, Wise, Trade Republic | Fintechs relevantes para investidores |
| `newsletter` | Morning Brew, Finimize | Newsletters financeiras |

**Implementacao entregue (backend):**
- enum `DirectoryVerticalType` atualizado no model `DirectoryEntry`;
- constantes/validadores de vertical sincronizados para APIs publicas e admin;
- eliminada duplicacao de lista de verticais nos servicos (fonte unica no model).

**Ainda opcional para iteracao futura:** `education` (pode continuar mapeado para `other` no MVP).

**Prioridade:** P2 — os tipos existentes cobrem o MVP, novos podem ser adicionados incrementalmente.

---

### 3.5 Sistema de publicidade / campanhas para marcas

**Estado atual:** Nao existe. O sistema de campanhas no frontend (`marketing/campanhas/`) e para criadores, nao para marcas/entidades.

**O que precisa de ser construido:**

#### 3.5.1 Model `BrandCampaign`

Conceito: uma marca paga para ter visibilidade adicional na plataforma.

**Tipos de campanha sugeridos:**

| Tipo | Descricao | Onde aparece |
|------|-----------|-------------|
| `featured_placement` | Posicao em destaque no diretorio | Topo da listagem vertical, badge "Patrocinado" |
| `banner_ad` | Banner publicitario | Homepage, paginas de conteudo, sidebar |
| `sponsored_content` | Conteudo patrocinado | Marcado como "Patrocinado" nos feeds |
| `directory_boost` | Boost de visibilidade | Mais exposicao na pesquisa e listagens |
| `newsletter_mention` | Mencao em newsletter | Email marketing da plataforma |

**Campos sugeridos:**
```
brand: ObjectId (ref DirectoryEntry ou Brand)
campaignType: enum dos tipos acima
title: string
description?: string
status: 'draft' | 'pending_review' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected'

// Targeting
targetVerticals?: string[] (em que verticais aparece)
targetCountries?: string[] (geolocalizacao)
targetAudience?: 'all' | 'free' | 'premium' | 'creator'

// Budget
budgetType: 'cpc' | 'cpm' | 'fixed' (custo por clique, por mil impressoes, valor fixo)
budgetTotal: number
budgetDaily?: number
spent: number (default 0)

// Timing
startDate: Date
endDate: Date

// Creative
creativeUrl?: string (imagem do banner)
creativeText?: string
ctaUrl: string (URL de destino)
ctaText?: string ('Saber mais', 'Abrir conta', etc.)

// Metrics
impressions: number (default 0)
clicks: number (default 0)
conversions: number (default 0)

// Review
reviewedBy?: ObjectId
reviewedAt?: Date
rejectionReason?: string

// Audit
createdBy: ObjectId
```

**Prioridade:** P3 — e o modelo de receita mas requer o diretorio publico primeiro.

---

#### 3.5.2 Fluxo de campanha

```
1. Marca/admin cria campanha (status: draft)
2. Submete para revisao (status: pending_review)
3. Admin revê e aprova/rejeita
   - Se aprovada: status → approved
   - Se rejeitada: status → rejected (com motivo)
4. Campanha ativa quando startDate chega (status: active)
5. Sistema serve ads com base no targeting
6. Metricas sao registadas (impressoes, cliques)
7. Budget esgotado ou endDate → status: completed
8. Marca pode pausar/retomar (status: paused ↔ active)
```

**Decisao importante:** Quem cria campanhas?

| Opcao | Descricao |
|-------|-----------|
| **(a) So admin** | Admin cria campanhas em nome das marcas. Mais simples, menos risco. Bom para fase inicial. |
| (b) Marca self-service | Marca tem login proprio e cria campanhas. Requer portal de marca, auth, billing. Mais complexo. |
| (c) Hibrido | Admin cria inicialmente, depois abre self-service. **Recomendado a longo prazo.** |

**Recomendacao fase 1:** Opcao (a) — admin gere tudo. As marcas contactam a plataforma, o admin configura.

---

#### 3.5.3 Ad serving (exibicao de anuncios)

**Onde colocar anuncios na plataforma:**

| Slot | Localizacao | Tipo de ad |
|------|------------|-----------|
| Homepage hero | Seccao principal da homepage | Banner, featured placement |
| Diretorio topo | Topo de cada listagem vertical | Featured placement com badge "Patrocinado" |
| Sidebar conteudo | Lateral em artigos/cursos/videos | Banner pequeno |
| Feed entre conteudos | Intercalado no feed de conteudos | Sponsored content card |
| Perfil de criador | Seccao patrocinada | Banner ou recomendacao |
| Resultado de pesquisa | Topo dos resultados | Sponsored result |

**Regras obrigatorias de experiencia:**
1. Premium remove apenas `external_ads` (rede externa, ex: Adsense).
2. Premium pode continuar a ver `sponsored_ads`/`house_ads` em zonas dedicadas e limitadas.
3. Free nao deve receber popups/interstitials; usar apenas slots nao intrusivos de layout.
4. Priorizar anuncios financeiros/contextuais; se nao houver relevancia, nao servir anuncio.
5. Definir limite de densidade por superficie para reduzir fadiga, sobretudo em utilizadores pagantes.

**Implementacao sugerida:**
```
// Endpoint
GET /api/ads/serve?slot=homepage_hero&vertical=broker&country=PT

// Resposta
{
  campaignId: string
  creativeUrl: string
  ctaUrl: string
  ctaText: string
  brandName: string
  brandLogo: string
  impressionToken: string  // para tracking
}

// Tracking
POST /api/ads/impression  { token: string }
POST /api/ads/click       { token: string }
```

**Governanca de slots por superficie (admin):**
1. Manter um `inventory map` com slots permitidos/proibidos por pagina e superficie.
2. Reservar zonas dedicadas para patrocinio em perfil do user e paginas de recursos/diretorio.
3. Evitar ruido em ferramentas financeiras criticas e fluxos de foco.
4. Marcar sempre conteudo patrocinado como `Patrocinado`.

**Prioridade:** P3 — depende das campanhas.

---

### 3.6 Portal de marca (self-service)

**Estado atual:** Nao existe. Marcas nao tem login nem dashboard.

**Se/quando implementar:**

**Roles necessarios:** Adicionar `brand_manager` ao sistema de roles, ou criar auth separado.

**Dashboard de marca:**
- Perfil da marca (editar info, logo, descricao)
- Campanhas ativas e historico
- Metricas (impressoes, cliques, CTR, gasto)
- Wallet/billing (saldo, faturas, top-up)
- Conteudo onde a marca e mencionada
- Mapa de placements/slots ativos por campanha
- Breakdown por audiencia (`free`, `premium`, `creator`) e por tipo (`external_ads`, `sponsored_ads`, `house_ads`)

**Prioridade:** P4 — so faz sentido quando o volume de marcas justificar self-service. Inicialmente o admin gere tudo.

---

### 3.7 Sistema de afiliacao

**Conceito:** Quando um utilizador clica num link de corretora/exchange e abre conta, a plataforma recebe comissao.

**O que precisaria:**
- Links de afiliacao rastreados (redirect com tracking)
- Model `AffiliateClick` (userId, brandId, timestamp, converted)
- Dashboard de afiliacao (admin: revenue por marca, conversoes)
- Integracao com programas de afiliacao das corretoras

**Prioridade:** P4 — modelo de receita alternativo, pode coexistir com campanhas.

---

## 4. Experiencia publica desejada

### 4.1 Jornada do utilizador

```
Utilizador chega ao FinHub
  └─ Ve entidades em destaque na homepage (editorial sections)
  └─ Clica em "Recursos" no menu
      └─ Ve categorias: Corretoras, Exchanges, Apps, Sites, etc.
      └─ Escolhe "Corretoras"
          └─ Ve listagem com filtros (pais, verificacao, rating)
          └─ Ve corretoras verificadas no topo, com badges
          └─ Clica numa corretora
              └─ Ve pagina de detalhe com info completa
              └─ Le reviews de outros utilizadores
              └─ Ve conteudos relacionados (artigos que falam desta corretora)
              └─ Pode deixar rating e comentario
              └─ Ve badge "Verificado pelo FinHub" se verificada
```

### 4.2 Jornada da marca (fase admin-managed)

```
Marca contacta FinHub
  └─ Admin cria DirectoryEntry (status: draft)
  └─ Preenche info: nome, descricao, logo, website, redes sociais, pais
  └─ Publica (status: published)
  └─ Opcionalmente: marca como featured, verificada
  └─ Opcionalmente: cria campanha de destaque
  └─ Marca aparece no diretorio e possivelmente na homepage
  └─ Admin monitoriza engagement (views, ratings, comments)
```

### 4.3 Relacao marca ↔ criador

Criadores podem interagir com marcas/entidades de varias formas:

| Interacao | Mecanismo | Estado |
|-----------|-----------|--------|
| Mencionar marca em conteudo | Tag/referencia no artigo/video | A implementar |
| Review de produto/servico | Rating + comment no DirectoryEntry | ✅ Backend pronto |
| Claim de pagina | ClaimRequest system | ✅ Backend pronto |
| Parceria/patrocinio | Campanha patrocinada | A implementar |
| Conteudo patrocinado | Marcado como sponsored no BaseContent | A implementar (flag `sponsoredBy?` no BaseContent) |

---

## 5. Campos a adicionar

### 5.1 No DirectoryEntry (se unificar)

```typescript
// Engagement (migrar de Brand)
views: number (default 0)
averageRating: number (0-5, default 0)
ratingsCount: number (default 0)
commentsCount: number (default 0)

// Detalhes de entidade financeira
founded?: number (ano de fundacao)
headquarters?: string (sede)
regulatedBy?: string[] (entidades reguladoras: CMVM, BdP, SEC, etc.)
licenses?: string[] (licencas)

// Contacto
contactEmail?: string
contactPhone?: string
supportUrl?: string

// Conteudo rico
pros?: string[] (pontos fortes, max 10)
cons?: string[] (pontos fracos, max 10)
keyFeatures?: string[] (funcionalidades principais)
pricing?: string (descricao de precos/comissoes)
```

### 5.2 No BaseContent (conteudo patrocinado)

```typescript
sponsoredBy?: ObjectId (ref DirectoryEntry)
isSponsored: boolean (default false)
```

---

## 6. Roadmap de implementacao

### Fase 1 — Diretorio publico funcional (P1)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 1.1 | **API publica de DirectoryEntry** | CONCLUIDO (2026-03-09): list, byVertical, bySlug, featured, search | - | Medio |
| 1.2 | **Pagina index `/recursos`** | — | Grid de categorias, featured, pesquisa | Medio |
| 1.3 | **Paginas verticais `/recursos/corretoras` etc.** | — | Listagem filtrada, cards com rating/badges | Medio |
| 1.4 | **Pagina detalhe `/recursos/:slug`** | — | Header, info, ratings, comments, conteudo relacionado | Medio |
| 1.5 | **Ratings e comments nas entidades** | CONCLUIDO (2026-03-09): `targetType=directory_entry` + contadores sincronizados no model | Componentes de rating/comment nas paginas | Baixo |
| 1.6 | **Views counter no DirectoryEntry** | CONCLUIDO (2026-03-09): campo `views` + incremento no detalhe publico | - | Baixo |

### Fase 2 — Qualidade e confianca (P2)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 2.1 | **Unificacao Brand → DirectoryEntry** | Migracao de dados, retirar rotas legacy | Atualizar imports/refs | Medio |
| 2.2 | **Vertical types adicionais** | CONCLUIDO (2026-03-09): `insurance`, `bank`, `fund`, `fintech`, `newsletter` no enum + validacoes sincronizadas | Novos icones/categorias | Baixo |
| 2.3 | **Campos de entidade financeira** | regulatedBy, licenses, pros, cons, keyFeatures, pricing | Seccoes no detalhe | Medio |
| 2.4 | **Badge de verificacao visual** | Ja existe no model | Componente de badge, tooltip com info | Baixo |
| 2.5 | **Conteudo relacionado** | Endpoint: artigos/videos que mencionam esta entidade | Seccao na pagina de detalhe | Medio |
| 2.6 | **Comparador de entidades** | Endpoint de comparacao lado a lado | UI tabela comparativa (2-3 entidades) | Alto |

### Fase 3 — Publicidade e campanhas (P3)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 3.1 | **Model BrandCampaign** | Model, controller, service, routes | — | Medio |
| 3.2 | **Admin: gestao de campanhas** | CRUD + review/approve flow | Pagina admin de campanhas | Medio |
| 3.3 | **Ad serving** | Endpoint /api/ads/serve com targeting | Componentes de ad slot nas paginas | Medio |
| 3.4 | **Tracking impressoes/cliques** | Endpoints de tracking, agregacao | Pixel de tracking, click handler | Medio |
| 3.5 | **Dashboard de metricas de campanha** | Agregacao MongoDB, stats por campanha | Graficos, KPIs, export | Alto |
| 3.6 | **Conteudo patrocinado** | Flag sponsoredBy no BaseContent | Badge "Patrocinado" nos cards | Baixo |
| 3.7 | **Featured placement** | Logica de boost no sorting | Badge "Patrocinado" no topo do diretorio | Baixo |

### Fase 4 — Self-service e afiliacao (P4)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 4.1 | **Portal de marca** | Auth, dashboard, billing | Portal separado ou seccao dedicada | Alto |
| 4.2 | **Wallet de marca** | Saldo, faturas, pagamentos | Top-up, historico | Alto |
| 4.3 | **Self-service de campanhas** | Marca cria/gere as suas campanhas | Wizard de campanha, metricas | Alto |
| 4.4 | **Sistema de afiliacao** | AffiliateClick model, tracking, revenue | Links rastreados, dashboard | Alto |
| 4.5 | **API de integracao** | API keys para marcas consultarem metricas | Documentacao, rate limiting | Medio |

---

## 7. Padrao de implementacao (referencia)

### Backend — API publica de DirectoryEntry

Seguir o padrao dos content controllers existentes:

```
1. Controller — src/controllers/publicDirectory.controller.ts
   - listEntries(req, res) — filtros, paginacao, sort
   - getBySlug(req, res) — detalhe + incrementViews
   - getFeatured(req, res) — entidades em destaque
   - getByVertical(req, res) — filtrado por vertical

2. Service — src/services/publicDirectory.service.ts
   - Queries com: status='published', isActive=true, showInDirectory=true
   - Projection segura (excluir metadata interna, createdBy detalhes)
   - Sort: featured first, then by rating/views

3. Routes — src/routes/directory.routes.ts
   - Publicas, sem auth
   - Rate limited para proteger de scraping
```

### Frontend — Paginas de recursos

```
1. Components
   - DirectoryCard.tsx — card de entidade (logo, nome, rating, badge)
   - DirectoryDetail.tsx — pagina de detalhe completa
   - DirectoryFilters.tsx — filtros laterais/top
   - VerifiedBadge.tsx — badge de verificacao

2. Hooks
   - useDirectories(filters) — listagem
   - useDirectoryDetail(slug) — detalhe
   - useFeaturedDirectories() — destaques

3. Service
   - directoryService.ts — calls ao backend
```

---

## 8. Diferenca entre marcas e criadores — resumo

| Dimensao | Criadores | Marcas/Entidades |
|----------|-----------|-----------------|
| **Objetivo** | Criar e partilhar conteudo | Dar a conhecer produtos/servicos |
| **Auth** | Login proprio, role `creator` | Inicialmente sem login (admin gere) |
| **Conteudo** | Artigos, videos, reels, cursos, podcasts, lives | Pagina de perfil no diretorio |
| **Engagement** | Followers, likes, comments no conteudo | Ratings, reviews, views na pagina |
| **Monetizacao** | Wallet (recebe), campanhas proprias | Campanhas pagas (paga), afiliacao |
| **Moderacao** | Operational controls, trust score | Verificacao, aprovacao admin |
| **Relacao c/ plataforma** | Parceiro de conteudo | Cliente publicitario |

---

## 9. Notas finais

### Pontos fortes
- **DirectoryEntry** e um model robusto com ownership, claims, editorial, verificacao — boa base
- **Editorial CMS** permite curar a homepage e landing pages com entidades em destaque — ja funcional
- **Claims system** permite que marcas "reclamem" paginas criadas pelo admin — workflow ja implementado
- **Admin management** totalmente funcional (BrandsManagementPage 1060 linhas) — o admin ja consegue gerir
- **Ratings/Comments universais** — engagement nas entidades nao precisa de implementacao extra

### Riscos
- **Dois models paralelos** (Brand vs DirectoryEntry) — decidir e unificar antes de construir mais
- **9 paginas publicas placeholder** — o diretorio nao tem valor para o utilizador ate estas serem implementadas
- **Sem API publica de DirectoryEntry** — as paginas publicas nao tem API para consumir
- **Campanhas/publicidade** sao o modelo de receita das marcas mas estao a zero de implementacao — priorizar apos diretorio funcional
- **Vertical types limitados** — faltam tipos relevantes para o mercado portugues (seguradoras, bancos, gestoras)

