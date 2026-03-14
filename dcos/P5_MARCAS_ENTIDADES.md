# P5 â€” Marcas e Entidades: Avaliacao e Roadmap

## Visao

O FinHub quer agregar entidades financeiras â€” corretoras, seguradoras, exchanges, plataformas, apps, podcasts â€” e dar-lhes montra dentro da plataforma. O objetivo nao e que estas entidades criem conteudo como os criadores, mas sim:

- **dar a conhecer os seus produtos e servicos** a uma audiencia interessada em financas pessoais e investimentos;
- **fazer campanhas e publicidade** direcionada a esta audiencia;
- **estar presente num diretorio de referencia** curado e verificado pela plataforma;
- **ser referenciada em conteudo editorial** (homepage, landing pages, seccoes tematicas).

A plataforma ganha com isto atraves de publicidade paga, posicionamento premium, e eventualmente comissoes/afiliacao.

---

## Estado atual consolidado

Data desta avaliacao: 2026-03-06.
Atualizacao de execucao: 2026-03-14 (backend P1.1 + P1.5 + P1.6 + P2.1 + P2.2 + P2.3 + P2.5 + P2.6 + P3.1 + P3.2 + P3.3 + P3.4 + P3.5 + P3.6 + P3.7 entregue; P4.1/P4.2/P4.3/P4.4/P4.5 backend concluida; hardening da API publica de diretorio com contratos de request e endpoint `GET /api/directories/categories`; frontend publico de `/recursos*` implementado com listagem/verticais/detalhe/comparador e ad serving publico ligado a `/api/ads/serve` com tracking `/api/ads/impression` + `/api/ads/click`; frontend do portal de marca/self-service entregue em `/marcas/portal` com overview, wallet, campanhas, afiliacao e integracoes de API keys).

---

## 1. Dois sistemas paralelos (legado vs atual)

Existem **dois sistemas** no codebase que tratam de marcas/entidades, o que pode causar confusao:

### 1.1 Sistema legado: Brand (`/api/brands`)

| Aspeto | Estado |
|--------|--------|
| **Model** | `src/models/Brand.ts` â€” schema simples com name, slug, brandType, logo, website, socialLinks, ratings, views |
| **Controller** | `src/controllers/brand.controller.ts` â€” CRUD completo + toggles (active, featured, verified) |
| **Service** | `src/services/brand.service.ts` â€” list, getBySlug, create, update, delete, toggles, stats, getFeatured, getByType |
| **Routes** | `src/routes/brand.routes.ts` â€” legacy; desmontadas do router principal em 2026-03-10 |
| **Scopes** | `admin.brands.write`, `admin.metrics.read` |
| **Frontend** | Nenhuma pagina funcional â€” components/ e hooks/ vazios |

**Brand types existentes:** broker, platform, website, podcast, tool, exchange, news-source, other.

**Problema:** Este sistema funciona no backend mas nao tem nenhum consumidor no frontend. E um modelo mais simples que o DirectoryEntry.

### 1.2 Sistema atual: DirectoryEntry (`/api/admin/directories`)

| Aspeto | Estado |
|--------|--------|
| **Model** | `src/models/DirectoryEntry.ts` â€” schema completo com ownership, claims, verificacao, editorial visibility, metadata |
| **Controller** | `src/controllers/adminEditorialCms.controller.ts` â€” list, create, update, publish, archive |
| **Service** | `src/services/adminEditorialCms.service.ts` â€” CRUD + publish/archive com audit |
| **Routes admin** | `src/routes/admin.routes.ts` â€” 5 endpoints admin |
| **Routes publicas** | `src/routes/editorial.routes.ts` â€” home, vertical landing, show-all |
| **Scopes** | `admin.directory.manage` |
| **Frontend admin** | `BrandsManagementPage.tsx` (1060 linhas) â€” **totalmente funcional** |
| **Frontend publico** | 9 paginas placeholder em `/recursos/*` |

**Vertical types existentes:** broker, exchange, site, app, podcast, event, insurance, bank, fund, fintech, newsletter, other.

### 1.3 Decisao

| Opcao | Descricao | Recomendacao |
|-------|-----------|-------------|
| **(a) Migrar para DirectoryEntry** | Descontinuar Brand, usar so DirectoryEntry. Mais completo, ja tem ownership/claims/editorial. | **Recomendado** |
| (b) Manter os dois | Brand para entidades simples, DirectoryEntry para entidades ricas. Mais complexidade sem beneficio claro. | Nao recomendado |
| (c) Fundir num so model novo | Criar novo model unificado. Trabalho extra sem ganho real vs opcao (a). | Nao recomendado |

**Execucao da opcao (a) no backend (2026-03-10):**
- script de migracao `npm run migrate:brands:directory` (dry-run por default; `--apply` para persistir);
- remocao da exposicao de `/api/brands` no router principal;
- pesquisa global (`/api/search` tipo `brand`) migrada para `DirectoryEntry`.

---

## 2. O que ja existe e funciona

### 2.1 Backend â€” DirectoryEntry

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **Model completo** | âœ… | name, slug, verticalType, descriptions, logo, coverImage, website, canonicalUrl, socialLinks (6 redes), country, region, categories, tags |
| **Status workflow** | âœ… | draft â†’ published â†’ archived, com publishedAt/archivedAt |
| **Verificacao** | âœ… | unverified â†’ pending â†’ verified |
| **Ownership** | âœ… | admin_seeded vs creator_owned, claimable flag, ownerUser ref |
| **Editorial visibility** | âœ… | showInHomeSection, showInDirectory, landingEnabled, showAllEnabled |
| **CRUD admin** | âœ… | list, create, update, publish (com reason opcional), archive (com reason obrigatorio) |
| **Audit trail** | âœ… | createdBy, updatedBy, adminAuditAction em todos os endpoints |
| **Scoped permissions** | âœ… | `admin.directory.manage` |
| **14+ indexes** | âœ… | Compostos para queries eficientes por vertical, status, visibility |

### 2.2 Backend â€” Editorial CMS

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **EditorialSection** | âœ… | key, title, subtitle, sectionType (content/directory/mixed/custom), order, maxItems, showOnHome/Landing/ShowAll |
| **EditorialSectionItem** | âœ… | targetType (article/video/course/directory_entry/external_link/custom), overrides (title/desc/image/url), badge, sortOrder, isPinned |
| **Time-based visibility** | âœ… | startAt/endAt nos items â€” visibilidade temporizada |
| **API publica** | âœ… | `/api/editorial/home`, `/api/editorial/:vertical`, `/api/editorial/:vertical/show-all` |
| **Admin CRUD** | âœ… | Criar seccoes, adicionar items, reordenar, remover |
| **Scope** | âœ… | `admin.home.curate` |

### 2.3 Backend â€” Claims

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **ClaimRequest model** | âœ… | targetType, targetId, creatorId, status (pending/approved/rejected/cancelled), reason, evidenceLinks |
| **Creator endpoints** | âœ… | criar claim, listar meus claims, cancelar claim |
| **Admin review** | âœ… | aprovar (transfere ownership), rejeitar (com motivo) |
| **OwnershipTransferLog** | âœ… | Registo imutavel de transferencias de ownership |
| **Scope** | âœ… | `admin.claim.review`, `admin.claim.transfer` |

### 2.4 Backend â€” Engagement nas entidades

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **Comentarios** | âœ… | Comment.targetType inclui `'brand'` â€” comentarios em entidades |
| **Ratings** | âœ… | Rating.targetType inclui `'brand'` â€” avaliacoes de entidades |
| **Views** | âœ… | `views` no `DirectoryEntry` com incremento no detalhe publico |

### 2.5 Frontend admin â€” Gestao de diretorios

| Componente | Estado | Detalhes |
|-----------|--------|---------|
| **BrandsManagementPage.tsx** | âœ… Totalmente funcional | 1060 linhas, vertical switcher, search, filtros, CRUD, publish/archive |
| **Hooks** | âœ… | `useAdminDirectories`, `useCreateAdminDirectory`, `useUpdateAdminDirectory`, `usePublishAdminDirectory`, `useArchiveAdminDirectory` |
| **API service** | âœ… | `adminDirectoriesService.ts` â€” calls ao backend |
| **Types** | âœ… | `adminDirectories.ts` â€” tipos completos |

### 2.6 Frontend publico â€” Rotas implementadas (2026-03-13)

| Rota | Pagina | Estado |
|------|--------|--------|
| `/recursos` | BrandsListPage.tsx | âœ… Implementado |
| `/recursos/:slug` | BrandDetailPage.tsx | âœ… Implementado |
| `/recursos/corretoras` | BrandsBrokersPage.tsx | âœ… Implementado |
| `/recursos/plataformas` | BrandsPlatformsPage.tsx | âœ… Implementado |
| `/recursos/exchanges` | BrandsExchangesPage.tsx | âœ… Implementado |
| `/recursos/apps` | BrandsAppsPage.tsx | âœ… Implementado |
| `/recursos/sites` | BrandsSitesPage.tsx | âœ… Implementado |
| `/recursos/podcasts` | BrandsPodcastsPage.tsx | âœ… Implementado |
| `/recursos/livros` | BrandsLivrosPage.tsx | âœ… Implementado |
| `/recursos/comparar` | BrandsComparePage.tsx | âœ… Implementado |

**Nota:** Os links ja estao no footer (Corretoras, Plataformas, Apps, Sites) e na navegacao do header.

---

## 3. Gaps criticos

### 3.1 Paginas publicas de recursos/diretorio

**Estado atual (2026-03-13):** gap P1 fechado no frontend com paginas publicas reais (`/recursos`, verticais e detalhe), consumo da API publica de diretorio e comparador (`/recursos/comparar`).

**Evolucao futura (nao bloqueante):**
- enriquecer UX de comparacao (persistencia de shortlist por utilizador, share card e export);
- ampliar verticais com landing dedicada para `insurance`, `bank`, `fund`, `newsletter`.

**Paginas necessarias:**

**a) Pagina index â€” `/recursos`**
- Hero com descricao da seccao
- Grid de categorias (corretoras, exchanges, apps, sites, podcasts, etc.) com contagem
- Entidades em destaque (isFeatured=true)
- Pesquisa global
- API: `GET /api/editorial/home` (seccoes de tipo 'directory') + `GET /api/brands` ou futuro `GET /api/directories`

**b) Pagina vertical â€” `/recursos/corretoras` (e analogas)**
- Listagem filtrada por verticalType
- Filtros: pais, verificacao, rating, ordenacao
- Cards com logo, nome, descricao curta, rating, badges (verificado, featured)
- API: `GET /api/editorial/:vertical` ou `GET /api/brands?brandType=broker`

**c) Pagina detalhe â€” `/recursos/:slug`**
- Header com logo, coverImage, nome, descricao
- Info: website, redes sociais, pais, fundacao
- Ratings e reviews (sistema universal ja existe)
- Comentarios (sistema universal ja existe)
- Conteudo relacionado (artigos/videos que mencionam esta entidade) â€” backend pronto via `GET /api/directories/:vertical/:slug/related-content`
- Badge de verificacao
- API: `GET /api/directories/:vertical/:slug` + `GET /api/directories/:vertical/:slug/related-content`

**Prioridade:** P1 â€” FECHADO no baseline atual.

---

### 3.2 API publica de DirectoryEntry

**Problema:** O DirectoryEntry so tem endpoints admin. Nao ha endpoints publicos dedicados para listar/detalhar entidades do diretorio (a API editorial publica serve seccoes curadas, nao o diretorio completo).

**Estado atual (2026-03-10):** backend base deste gap foi fechado com API publica dedicada e hardening de contratos:
- GET /api/directories (listagem com filtros e paginacao);
- GET /api/directories/:vertical (listagem por vertical);
- GET /api/directories/:vertical/:slug (detalhe + incremento de views);
- GET /api/directories/featured (destaques);
- GET /api/directories/categories (resumo por vertical para grid/index);
- GET /api/directories/search (pesquisa cross-vertical);
- GET /api/directories/:vertical/:slug/related-content (conteudo relacionado);
- GET /api/directories/compare (comparacao lado a lado por slugs).

**Endpoints publicos disponiveis:**
```
GET  /api/directories                    â€” lista publica com filtros e paginacao
GET  /api/directories/:vertical          â€” lista por vertical
GET  /api/directories/:vertical/:slug    â€” detalhe de uma entrada
GET  /api/directories/featured           â€” entradas em destaque
GET  /api/directories/categories         â€” resumo de contagens por vertical
GET  /api/directories/search             â€” pesquisa cross-vertical
GET  /api/directories/:vertical/:slug/related-content â€” conteudo relacionado
GET  /api/directories/compare            â€” comparacao de 2 a 3 entidades
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

**Prioridade:** P1 â€” necessario para as paginas publicas.

---

### 3.3 Unificacao Brand â†” DirectoryEntry

**Problema:** Dois models paralelos para a mesma funcionalidade. O Brand tem engagement (views, ratings, comments) ligado ao sistema universal. O DirectoryEntry tem ownership, claims, editorial, verificacao â€” mas nao tem views counter nem esta ligado ao sistema de ratings/comments da mesma forma.

**Estado atual (2026-03-10):** base de unificacao backend entregue.

**Entregue no backend:**
- script `npm run migrate:brands:directory` para migrar Brand -> DirectoryEntry;
- rotas `/api/brands` retiradas do router principal (legacy descontinuado na API publica);
- pesquisa global de recursos (`type=brand`) passou a consultar `DirectoryEntry`.

**Ainda em aberto para fecho total:**
- executar migracao com `--apply` em cada ambiente alvo e validar contagens;
- limpar referencias residuais ao model `Brand` em modulos internos (ads, social metadata legacy, seeds);
- fechar adaptacao frontend para remover qualquer dependencia de `/api/brands`.

**Prioridade:** P2 â€” nao bloqueia mas a duplicacao causa confusao a longo prazo.

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

**Prioridade:** P2 â€” os tipos existentes cobrem o MVP, novos podem ser adicionados incrementalmente.

---

### 3.5 Sistema de publicidade / campanhas para marcas

**Estado atual (2026-03-14):** backend e frontend base de campanhas/ads ativos.

**Entregue:**
- backend com `AdCampaign` + `AdSlotConfig`, fluxo admin (`submit-approval`, `approve`, `reject`), serving publico com tracking (`/api/ads/serve`, `/api/ads/impression`, `/api/ads/click`) e metricas agregadas (`GET /api/admin/ads/campaigns/:campaignId/metrics`);
- frontend admin em `/admin/operacoes/anuncios` com gestao de slots/campanhas, workflow de estado e painel de metricas;
- frontend publico com slots patrocinados no diretorio (`/recursos`, verticais e detalhe) via `PublicAdSlot`, incluindo tracking de impressao/clique.

**Blueprint de referencia (iteracoes futuras):**

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
brand: ObjectId (ref DirectoryEntry)
campaignType: enum dos tipos acima
title: string
description?: string
status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected'

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

**Prioridade:** P3 â€” e o modelo de receita mas requer o diretorio publico primeiro.

---

#### 3.5.2 Fluxo de campanha

```
1. Marca/admin cria campanha (status: draft)
2. Submete para revisao (status: pending_approval)
3. Admin revÃª e aprova/rejeita
   - Se aprovada: status â†’ approved
   - Se rejeitada: status â†’ rejected (com motivo)
4. Campanha ativa quando startDate chega (status: active)
5. Sistema serve ads com base no targeting
6. Metricas sao registadas (impressoes, cliques)
7. Budget esgotado ou endDate â†’ status: completed
8. Marca pode pausar/retomar (status: paused â†” active)
```

**Decisao importante:** Quem cria campanhas?

| Opcao | Descricao |
|-------|-----------|
| **(a) So admin** | Admin cria campanhas em nome das marcas. Mais simples, menos risco. Bom para fase inicial. |
| (b) Marca self-service | Marca tem login proprio e cria campanhas. Requer portal de marca, auth, billing. Mais complexo. |
| (c) Hibrido | Admin cria inicialmente, depois abre self-service. **Recomendado a longo prazo.** |

**Recomendacao fase 1:** Opcao (a) â€” admin gere tudo. As marcas contactam a plataforma, o admin configura.

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

**Prioridade:** P3 â€” depende das campanhas.

---

### 3.6 Portal de marca (self-service)

**Estado atual (2026-03-14):** baseline tecnico da Fase 4 entregue com backend concluido e frontend MVP do portal de marca publicado em `/marcas/portal`.

**Ja entregue no frontend:**
- Overview com `GET /api/brand-portal/overview` e `GET /api/brand-portal/directories`
- Wallet com listagem de carteiras, detalhe, transacoes e pedido de top-up
- Campanhas com listagem, criacao, update, submit para aprovacao e metricas
- Afiliacao com criacao/edicao de links e consulta de cliques
- Integracoes com API keys (listar, criar, revogar, usage)

**Melhorias futuras (nao bloqueantes):**

**Roles necessarios:** formalizar role dedicada `brand_manager` (atual: ownership por `DirectoryEntry.ownerUser` + auth base).

**Dashboard de marca:**
- Perfil da marca (editar info, logo, descricao)
- Campanhas ativas e historico
- Metricas (impressoes, cliques, CTR, gasto)
- Wallet/billing (saldo, faturas, top-up)
- Conteudo onde a marca e mencionada
- Mapa de placements/slots ativos por campanha
- Breakdown por audiencia (`free`, `premium`, `creator`) e por tipo (`external_ads`, `sponsored_ads`, `house_ads`)

**Prioridade:** P4 fechado no baseline tecnico; melhorias de UX/governanca seguem em backlog de produto.
---

### 3.7 Sistema de afiliacao

**Conceito:** Quando um utilizador clica num link de corretora/exchange e abre conta, a plataforma recebe comissao.

**Estado atual (2026-03-10):** backend concluida com:
- Models `AffiliateLink` e `AffiliateClick`;
- Redirect publico com tracking: `GET /api/affiliates/r/:code`;
- Callback de conversao por postback: `POST /api/affiliates/postback/conversion` (segredo `AFFILIATE_POSTBACK_SECRET`);
- Portal de marca: `GET/POST /api/brand-portal/affiliate-links`, `PATCH /api/brand-portal/affiliate-links/:linkId`, `GET /api/brand-portal/affiliate-links/:linkId/clicks`;
- Admin monetizacao: `GET /api/admin/monetization/affiliates/overview`, `GET /api/admin/monetization/affiliates/links`, `POST /api/admin/monetization/affiliates/clicks/:clickId/convert`.

**O que precisaria:**
- Links de afiliacao rastreados (redirect com tracking)
- Model `AffiliateClick` (userId, brandId, timestamp, converted)
- Dashboard de afiliacao (admin: revenue por marca, conversoes)
- Integracao com programas de afiliacao das corretoras

**Prioridade:** P4 â€” modelo de receita alternativo, pode coexistir com campanhas.

---

## 4. Experiencia publica desejada

### 4.1 Jornada do utilizador

```
Utilizador chega ao FinHub
  â””â”€ Ve entidades em destaque na homepage (editorial sections)
  â””â”€ Clica em "Recursos" no menu
      â””â”€ Ve categorias: Corretoras, Exchanges, Apps, Sites, etc.
      â””â”€ Escolhe "Corretoras"
          â””â”€ Ve listagem com filtros (pais, verificacao, rating)
          â””â”€ Ve corretoras verificadas no topo, com badges
          â””â”€ Clica numa corretora
              â””â”€ Ve pagina de detalhe com info completa
              â””â”€ Le reviews de outros utilizadores
              â””â”€ Ve conteudos relacionados (artigos que falam desta corretora)
              â””â”€ Pode deixar rating e comentario
              â””â”€ Ve badge "Verificado pelo FinHub" se verificada
```

### 4.2 Jornada da marca (fase admin-managed)

```
Marca contacta FinHub
  â””â”€ Admin cria DirectoryEntry (status: draft)
  â””â”€ Preenche info: nome, descricao, logo, website, redes sociais, pais
  â””â”€ Publica (status: published)
  â””â”€ Opcionalmente: marca como featured, verificada
  â””â”€ Opcionalmente: cria campanha de destaque
  â””â”€ Marca aparece no diretorio e possivelmente na homepage
  â””â”€ Admin monitoriza engagement (views, ratings, comments)
```

### 4.3 Relacao marca â†” criador

Criadores podem interagir com marcas/entidades de varias formas:

| Interacao | Mecanismo | Estado |
|-----------|-----------|--------|
| Mencionar marca em conteudo | Tag/referencia no artigo/video | A implementar |
| Review de produto/servico | Rating + comment no DirectoryEntry | âœ… Backend pronto |
| Claim de pagina | ClaimRequest system | âœ… Backend pronto |
| Parceria/patrocinio | Campanha patrocinada | A implementar |
| Conteudo patrocinado | Marcado como sponsored no BaseContent | A implementar (flag `sponsoredBy?` no BaseContent) |

---

## 5. Campos a adicionar

### 5.1 No DirectoryEntry (se unificar)

**Estado atual (2026-03-09):** backend ja suporta `regulatedBy`, `licenses`, `pros`, `cons`, `keyFeatures` e `pricing` no model + APIs admin/public.

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

### Fase 1 â€” Diretorio publico funcional (P1)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 1.1 | **API publica de DirectoryEntry** | CONCLUIDO (2026-03-10): list, byVertical, bySlug, featured, categories, search, compare + contratos de request nas rotas publicas | - | Medio |
| 1.2 | **Pagina index `/recursos`** | â€” | CONCLUIDO (2026-03-13): grid de categorias, featured, pesquisa global e CTA para comparador | Medio |
| 1.3 | **Paginas verticais `/recursos/corretoras` etc.** | â€” | CONCLUIDO (2026-03-13): listagem filtrada com ordenacao/verificacao/featured e cards completos | Medio |
| 1.4 | **Pagina detalhe `/recursos/:slug`** | â€” | CONCLUIDO (2026-03-13): header, info, ratings, comments e related content | Medio |
| 1.5 | **Ratings e comments nas entidades** | CONCLUIDO (2026-03-09): `targetType=directory_entry` + contadores sincronizados no model | CONCLUIDO (2026-03-13): secoes de rating/comment ativas no detalhe publico | Baixo |
| 1.6 | **Views counter no DirectoryEntry** | CONCLUIDO (2026-03-09): campo `views` + incremento no detalhe publico | - | Baixo |

### Fase 2 â€” Qualidade e confianca (P2)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 2.1 | **Unificacao Brand â†’ DirectoryEntry** | CONCLUIDO (2026-03-10): script `migrate:brands:directory` + `/api/brands` desmontado do router principal + search de `brand` migrado para `DirectoryEntry` | Atualizar imports/refs | Medio |
| 2.2 | **Vertical types adicionais** | CONCLUIDO (2026-03-09): `insurance`, `bank`, `fund`, `fintech`, `newsletter` no enum + validacoes sincronizadas | Novos icones/categorias | Baixo |
| 2.3 | **Campos de entidade financeira** | CONCLUIDO (2026-03-09): `regulatedBy`, `licenses`, `pros`, `cons`, `keyFeatures`, `pricing` no model + respostas admin/public | Seccoes no detalhe | Medio |
| 2.4 | **Badge de verificacao visual** | Ja existe no model | CONCLUIDO (2026-03-13): badge visual aplicado nas listagens/detalhe | Baixo |
| 2.5 | **Conteudo relacionado** | CONCLUIDO (2026-03-09): `GET /api/directories/:vertical/:slug/related-content` (agrega artigos/cursos/videos/lives/books/podcasts publicados por relevancia) | CONCLUIDO (2026-03-13): secao de related content ativa no detalhe | Medio |
| 2.6 | **Comparador de entidades** | CONCLUIDO (2026-03-10): `GET /api/directories/compare?slugs=a,b[,c]` com metricas comparadas (`views`, `averageRating`, `ratingsCount`, `commentsCount`) | CONCLUIDO (2026-03-13): UI comparativa em `/recursos/comparar` com selecao 2-3 slugs, metricas lider e campos partilhados | Alto |

### Fase 3 â€” Publicidade e campanhas (P3)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 3.1 | **Model BrandCampaign** | CONCLUIDO (2026-03-10): `AdCampaign`/`AdSlotConfig` ativos no admin + alvo de marca desacoplado para `directoryEntryId` (com scripts de migracao legacy) | â€” | Medio |
| 3.2 | **Admin: gestao de campanhas** | CONCLUIDO (2026-03-10): CRUD + fluxo de revisao (`POST /api/admin/ads/campaigns/:campaignId/submit-approval`, `.../approve`, `.../reject`) | CONCLUIDO (2026-03-13): pagina admin em `/admin/operacoes/anuncios` com governance de slots/campanhas e acoes de estado | Medio |
| 3.3 | **Ad serving** | CONCLUIDO (2026-03-10): `GET /api/ads/serve` com selecao por slot ativo, audience/device e guardrails de visibilidade/tipos | CONCLUIDO (2026-03-14): componentes de ad slot aplicados no diretorio publico (`/recursos`, verticais e detalhe) | Medio |
| 3.4 | **Tracking impressoes/cliques** | CONCLUIDO (2026-03-10): `POST /api/ads/impression` + `POST /api/ads/click` com token assinado e contagem idempotente em metricas de campanha | CONCLUIDO (2026-03-14): tracking de impressao/clique ligado no componente publico (`PublicAdSlot`) | Medio |
| 3.5 | **Dashboard de metricas de campanha** | CONCLUIDO (2026-03-10): `GET /api/admin/ads/campaigns/:campaignId/metrics?days=30` com timeline e breakdown (`slot`, `audience`, `device`) + CTR/fill-rate | CONCLUIDO (2026-03-13): KPIs + timeline + breakdown no painel admin de anuncios | Alto |
| 3.6 | **Conteudo patrocinado** | CONCLUIDO (2026-03-10): `BaseContent` com `isSponsored` + `sponsoredBy` (todos os content types), filtros publicos e exposicao em search/related-content para badge | CONCLUIDO (2026-03-13): badge "Patrocinado" em cards/listagens e detalhe de recursos | Baixo |
| 3.7 | **Featured placement** | CONCLUIDO (2026-03-10): boost no sorting das listagens publicas de diretorio via campanhas `sponsored_ads` ativas (`surface=directory`) com prioridade de placement + metadata para badge de patrocinio | CONCLUIDO (2026-03-13): destaque patrocinado visivel no topo/listagens do diretorio | Baixo |

### Fase 4 â€” Self-service e afiliacao (P4)

| # | Item | Backend | Frontend | Esforco |
|---|------|---------|----------|---------|
| 4.1 | **Portal de marca** | CONCLUIDO (2026-03-10): `GET /api/brand-portal/overview?days=...` + `GET /api/brand-portal/directories` com ownership por `DirectoryEntry.ownerUser`, tracking agregado de campanhas/delivery no overview, contratos de request dedicados e `rateLimiter.api` aplicado; documentacao tecnica em `dcos/done/P4_1_PORTAL_MARCA_BACKEND.md` | CONCLUIDO (2026-03-14): rota protegida `/marcas/portal`, pagina `BrandPortalPage`, hooks React Query e service dedicado para overview/diretorios | Alto |
| 4.2 | **Wallet de marca** | CONCLUIDO (2026-03-10): `BrandWallet` + `BrandWalletTransaction` com portal da marca (`GET /wallets`, `GET /wallets/:directoryEntryId`, `GET /wallets/:directoryEntryId/transactions`, `POST /wallets/:directoryEntryId/top-up-requests`) e settlement admin (`GET /api/admin/monetization/brand-wallets/top-up-requests`, `POST .../:transactionId/approve`, `POST .../:transactionId/reject`), contratos de request e rate-limit aplicados; documentacao tecnica em `dcos/done/P4_2_WALLET_MARCA_BACKEND.md` | CONCLUIDO (2026-03-14): tab Wallet com listagem por entidade, detalhe, transacoes e pedido de top-up | Alto |
| 4.3 | **Self-service de campanhas** | CONCLUIDO (2026-03-10): `GET/POST /api/brand-portal/campaigns`, `GET/PATCH /api/brand-portal/campaigns/:campaignId`, `POST /api/brand-portal/campaigns/:campaignId/submit-approval`, `GET /metrics` com ownership enforcement, contratos de request, rate limit no portal e gate de orcamento por wallet (validacao de `availableCents` vs `estimatedMonthlyBudget`) | CONCLUIDO (2026-03-14): tab Campanhas com listagem, criacao, update, submit-approval e consulta de metricas | Alto |
| 4.4 | **Sistema de afiliacao** | CONCLUIDO (2026-03-10): `AffiliateLink` + `AffiliateClick`, redirect `GET /api/affiliates/r/:code` com tracking params (`fh_click_id`, `fh_aff_code`), postback `POST /api/affiliates/postback/conversion` com segredo (`AFFILIATE_POSTBACK_SECRET`), endpoints no `brand-portal` para CRUD/listagem de cliques, painel admin em `/api/admin/monetization/affiliates/*`, e contratos de request nas rotas de afiliacao | CONCLUIDO (2026-03-14): tab Afiliacao com gestao de links e consulta de cliques por link | Alto |
| 4.5 | **API de integracao** | CONCLUIDO (2026-03-10): `BrandIntegrationApiKey` (hash + scopes), gestao no `brand-portal` (`GET/POST /integrations/api-keys`, `POST /integrations/api-keys/:keyId/revoke`, `GET /integrations/api-keys/:keyId/usage`), consumo externo em `/api/integrations/brand/affiliate/*` com `x-finhub-api-key`, limiter dedicado por API key (`rateLimiter.brandIntegration`) e logging por request (`BrandIntegrationApiUsage`) | CONCLUIDO (2026-03-14): tab Integracoes com API keys (listar/criar/revogar/usage) e teste unitario de mapping em `brandPortalService.test.ts` | Medio |

---

## 7. Padrao de implementacao (referencia)

### Backend â€” API publica de DirectoryEntry

Seguir o padrao dos content controllers existentes:

```
1. Controller â€” src/controllers/publicDirectory.controller.ts
   - listEntries(req, res) â€” filtros, paginacao, sort
   - getBySlug(req, res) â€” detalhe + incrementViews
   - getFeatured(req, res) â€” entidades em destaque
   - getByVertical(req, res) â€” filtrado por vertical

2. Service â€” src/services/publicDirectory.service.ts
   - Queries com: status='published', isActive=true, showInDirectory=true
   - Projection segura (excluir metadata interna, createdBy detalhes)
   - Sort: featured first, then by rating/views

3. Routes â€” src/routes/directory.routes.ts
   - Publicas, sem auth
   - Rate limited para proteger de scraping
```

### Frontend â€” Paginas de recursos

```
1. Components
   - DirectoryCard.tsx â€” card de entidade (logo, nome, rating, badge)
   - DirectoryDetail.tsx â€” pagina de detalhe completa
   - DirectoryFilters.tsx â€” filtros laterais/top
   - VerifiedBadge.tsx â€” badge de verificacao

2. Hooks
   - useDirectories(filters) â€” listagem
   - useDirectoryDetail(slug) â€” detalhe
   - useFeaturedDirectories() â€” destaques

3. Service
   - directoryService.ts â€” calls ao backend
```

---

## 8. Diferenca entre marcas e criadores â€” resumo

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
- **DirectoryEntry** e um model robusto com ownership, claims, editorial, verificacao â€” boa base
- **Editorial CMS** permite curar a homepage e landing pages com entidades em destaque â€” ja funcional
- **Claims system** permite que marcas "reclamem" paginas criadas pelo admin â€” workflow ja implementado
- **Admin management** totalmente funcional (BrandsManagementPage 1060 linhas) â€” o admin ja consegue gerir
- **Ratings/Comments universais** â€” engagement nas entidades nao precisa de implementacao extra

### Riscos
- **Residuos do legado Brand**: ainda existem referencias internas a limpar apos migracoes aplicadas por ambiente
- **Governanca de acesso do portal**: falta role dedicada `brand_manager` com politica final de permissao/backoffice
- **Cobertura E2E do portal**: falta incorporar `/marcas/portal` no gate E2E critico/release
- **Validacoes live-only**: integracoes com chaves/ids reais continuam no trilho de pre-release T-1/T-0

