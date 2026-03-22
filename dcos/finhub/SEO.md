# FinHub — Sistema de SEO

> **Data:** 2026-03-22
> **Scope:** SEO técnico + conteúdo + criadores + admin
> **Referência:** ARCHITECTURE.md (zona HUB — conteúdo partilhável e indexável)

---

## Estado Actual — O que já existe

A plataforma tem uma base de SEO sólida:

| Componente | Estado | Localização |
|-----------|--------|-------------|
| `react-helmet-async` (SSR-safe) | ✅ Activo | `src/lib/helmet.ts` |
| `<title>` + `meta[description]` | ✅ Activo | `src/lib/seo.tsx` |
| Open Graph (og:title, og:description, og:image, og:url) | ✅ Activo | `src/components/seo/PublicRouteSeo.tsx` |
| Twitter Cards (summary_large_image) | ✅ Activo | `src/components/seo/PublicRouteSeo.tsx` |
| Canonical URLs (`<link rel="canonical">`) | ✅ Activo | `PublicRouteSeo.tsx` |
| `meta[robots]` dinâmico (index/noindex por rota) | ✅ Activo | `PublicRouteSeo.tsx` |
| Sitemap.xml (gerado no build) | ✅ Activo | `scripts/generate-seo-assets.mjs` → `public/sitemap.xml` |
| robots.txt (gerado no build) | ✅ Activo | `scripts/generate-seo-assets.mjs` → `public/robots.txt` |
| SEO runtime config do backend | ✅ Activo | `platformRuntimeConfig.ts` → `seo: { siteName, siteUrl, noIndexPaths... }` |
| JSON-LD / Structured Data | ❌ Não existe | — |
| Sitemap dinâmico (conteúdo de criadores) | ❌ Não existe | — |
| SEO por página de conteúdo individual | ⚠️ Parcial | Helmet com título mas sem dados estruturados |
| SEO de criador (perfil público) | ⚠️ Parcial | Título dinâmico mas sem Person schema |

---

## Arquitectura de SEO

### Camada 1 — SEO de Plataforma (admin configura)

Configurado no backend via `platformRuntimeConfig`:
```typescript
seo: {
  siteName: string           // "FinHub"
  siteUrl: string            // "https://finhub.pt"
  defaultDescription: string // descrição global da plataforma
  defaultImage: string       // og:image default (logo FinHub)
  noIndexExactPaths: string[] // ['/login', '/registar', '/conta', ...]
  noIndexPrefixes: string[]   // ['/admin', '/dashboard', '/oauth', ...]
}
```

Robots.txt bloqueia automaticamente:
- `/admin/`, `/dashboard/`, `/conta`, `/notificacoes`, `/login`, `/registar`, `/oauth/`, `/verificar-email`

### Camada 2 — SEO de Conteúdo (criadores alimentam)

**Princípio:** o criador ao escrever o título, a descrição e as tags do conteúdo está a alimentar o SEO directamente — sem trabalho extra.

| Campo do criador | Mapeia para SEO |
|-----------------|-----------------|
| `title` | `<title>`, `og:title`, `<h1>` |
| `description` | `meta[description]`, `og:description` |
| `tags[]` | Keywords implícitas no conteúdo, texto de ancoragem |
| `category` | Classificação semântica do conteúdo |
| `coverImage` | `og:image`, `twitter:image` |
| `creatorName` | Atribuição de autor, `author` meta tag |
| `slug` | URL canónico limpo e legível |

**Exemplo — Artigo:**
```html
<title>Como Investir em ETFs em Portugal — FinHub</title>
<meta name="description" content="Guia completo para investir em ETFs no mercado português...">
<meta property="og:title" content="Como Investir em ETFs em Portugal">
<meta property="og:image" content="https://finhub.pt/covers/etfs-portugal.jpg">
<link rel="canonical" href="https://finhub.pt/hub/artigos/como-investir-etfs-portugal">
<meta name="author" content="João Ferreira">
```

### Camada 3 — Dados Estruturados / JSON-LD (a implementar)

O maior gap actual. Os motores de busca (Google) usam JSON-LD para rich results (estrelas de avaliação, duração de vídeo, breadcrumbs, etc.).

#### Schemas por tipo de conteúdo

**Artigo:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Como Investir em ETFs em Portugal",
  "description": "Guia completo...",
  "author": { "@type": "Person", "name": "João Ferreira", "url": "https://finhub.pt/creators/joaoferreira" },
  "publisher": { "@type": "Organization", "name": "FinHub", "logo": "https://finhub.pt/logo.png" },
  "datePublished": "2026-01-15",
  "dateModified": "2026-02-01",
  "image": "https://finhub.pt/covers/etfs.jpg",
  "keywords": "ETFs, fundos de índice, investimento, Portugal",
  "articleSection": "Investimentos",
  "wordCount": 1500,
  "timeRequired": "PT8M"
}
```

**Vídeo:**
```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "ETFs vs Fundos Activos — Qual o Melhor?",
  "description": "Comparação detalhada...",
  "thumbnailUrl": "https://finhub.pt/thumbnails/etfs-vs-fundos.jpg",
  "uploadDate": "2026-01-20",
  "duration": "PT15M30S",
  "author": { "@type": "Person", "name": "João Ferreira" }
}
```

**Curso:**
```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Investimento Passivo para Iniciantes",
  "description": "Aprende a construir um portfolio diversificado...",
  "provider": { "@type": "Organization", "name": "FinHub" },
  "instructor": { "@type": "Person", "name": "João Ferreira" },
  "courseMode": "online",
  "educationalLevel": "Beginner",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" }
}
```

**Perfil de Criador:**
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "João Ferreira",
  "url": "https://finhub.pt/creators/joaoferreira",
  "image": "https://finhub.pt/avatars/joaoferreira.jpg",
  "jobTitle": "Educator de Finanças Pessoais",
  "sameAs": ["https://twitter.com/...", "https://linkedin.com/in/..."]
}
```

**Organização (global, em todas as páginas):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "FinHub",
  "url": "https://finhub.pt",
  "logo": "https://finhub.pt/logo.png",
  "description": "Plataforma portuguesa de educação financeira",
  "sameAs": ["https://twitter.com/finhub_pt", "https://linkedin.com/company/finhub"]
}
```

**FAQ (para páginas de preços, landing pages):**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "O que é o FinHub?", "acceptedAnswer": { "@type": "Answer", "text": "..." } }
  ]
}
```

---

## Sitemap Dinâmico (a implementar)

O sitemap actual é **estático** — gerado no build com 51 rotas fixas.
Não inclui URLs dinâmicas de conteúdo de criadores.

**O que falta:**
```xml
<!-- Hoje: apenas rotas estáticas -->
<url><loc>https://finhub.pt/hub/conteudos</loc></url>

<!-- O que deve existir: conteúdo indexável de criadores -->
<url>
  <loc>https://finhub.pt/hub/artigos/como-investir-etfs-portugal</loc>
  <lastmod>2026-01-15</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://finhub.pt/creators/joaoferreira</loc>
  <lastmod>2026-02-01</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

**Solução proposta:**
- Endpoint backend: `GET /api/seo/sitemap` → devolve lista de URLs públicas indexáveis com `lastmod`
- Incluir: artigos publicados, vídeos, cursos, podcasts, livros, perfis de criadores públicos
- Excluir: conteúdo premium, rascunhos, perfis privados
- Actualizar automaticamente quando conteúdo é publicado/editado
- Sitemap gerado server-side (Vike SSR) ou via endpoint separado no deploy

---

## Indexabilidade — O que indexar e o que não indexar

| Rota | Indexar? | Razão |
|------|----------|-------|
| `/` | ✅ Sim | Homepage — prioridade máxima |
| `/creators` | ✅ Sim | Diretório de criadores |
| `/creators/:username` | ✅ Sim | Perfil público de criador |
| `/hub/conteudos` | ✅ Sim | Hub de conteúdo |
| `/hub/artigos/:slug` | ✅ Sim | Artigo individual |
| `/hub/videos/:slug` | ✅ Sim | Vídeo individual |
| `/hub/cursos/:slug` | ✅ Sim | Curso individual |
| `/hub/podcasts/:slug` | ✅ Sim | Podcast individual |
| `/hub/livros/:slug` | ✅ Sim | Livro individual |
| `/noticias` | ✅ Sim | Feed de notícias |
| `/precos` | ✅ Sim | Página de preços |
| `/mercados` | ⚠️ Condicional | Dados em tempo real — pouco valor para Google |
| `/perfil/:username` | ✅ Sim | Perfil público de utilizador |
| `/ferramentas` | ✅ Sim | Landing page das ferramentas |
| `/ferramentas/fire` | ✅ Sim | Landing do FIRE simulator |
| `/conta/*` | ❌ Não | Área privada |
| `/admin/*` | ❌ Não | Admin |
| `/dashboard/*` | ❌ Não | Dashboard criadores |
| `/login`, `/registar` | ❌ Não | Auth pages |

---

## Tasks de SEO Pendentes

### Alta prioridade (v1.0)
| Task | O que faz | Ficheiro alvo |
|------|-----------|---------------|
| **SEO-1** | JSON-LD para artigos, vídeos, cursos, podcasts, livros | `src/components/seo/` — novos componentes por tipo |
| **SEO-2** | JSON-LD para perfis de criadores (`Person` schema) | `src/features/creators/pages/CreatorProfilePage.tsx` |
| **SEO-3** | JSON-LD global — `Organization` schema em todas as páginas | `src/renderer/PageShell.tsx` |
| **SEO-4** | Sitemap dinâmico — endpoint backend + inclusão de conteúdo publicado | `API_finhub/src/routes/` + `scripts/generate-seo-assets.mjs` |

### Média prioridade (v1.0)
| Task | O que faz |
|------|-----------|
| **SEO-5** | FAQ schema na página `/precos` |
| **SEO-6** | BreadcrumbList schema em páginas de conteúdo |
| **SEO-7** | `meta[keywords]` com tags do conteúdo (menor impacto, mas completo) |
| **SEO-8** | `hreflang="pt-PT"` em todas as páginas |

### Core Web Vitals (pós-v1.0)
| Métrica | Objectivo | Acção |
|---------|-----------|-------|
| LCP (Largest Contentful Paint) | < 2.5s | CDN para imagens, lazy loading |
| FID / INP | < 100ms | Optimizar JS crítico |
| CLS | < 0.1 | Reservar espaço para imagens |
| Lighthouse score | > 80 | Auditoria completa |

---

## Ficheiros Chave

```
FinHub-Vite/src/lib/helmet.ts                          ← wrapper react-helmet-async
FinHub-Vite/src/lib/seo.tsx                            ← componente SEO base
FinHub-Vite/src/components/seo/PublicRouteSeo.tsx      ← SEO completo por rota (260 linhas)
FinHub-Vite/scripts/generate-seo-assets.mjs            ← gerador de sitemap + robots.txt
FinHub-Vite/src/features/platform/types/platformRuntimeConfig.ts ← config SEO do backend
API_finhub/src/routes/                                 ← adicionar /seo/sitemap
```
