# FinHub — Auditoria de Layouts e Navegação

> Data: 2026-03-23 | Auditoria por Claude
> Objectivo: identificar e documentar todas as inconsistências de layout e navegação por tipo de utilizador

---

## 1. Sistema Dual de Renderização

O projecto tem **dois sistemas de routing a coexistir**:

| Sistema | Ficheiro | Estado |
|---------|----------|--------|
| **Vike SSR** (activo) | `src/pages/**/+Page.tsx` via `PageShell.tsx` | O que serve as páginas |
| **React Router SPA** (legacy) | `src/router.tsx` com `createBrowserRouter` | Provavelmente dead code — não usado pelo pipeline Vike |

**Impacto:** layouts definidos no `router.tsx` (AdminLayout, MainLayout, AuthLayout) **NÃO são usados** pelas páginas Vike. Isto significa que o Admin e Auth não têm os seus layouts aplicados.

---

## 2. Layouts Existentes

### Usados por Vike (activos)

| Layout | Ficheiro | O que renderiza | Usado por |
|--------|----------|-----------------|-----------|
| **PageShell** | `src/renderer/PageShell.tsx` | Wrapper global. Se auth → `UserLayout`, senão → `PublicLayout` | TODAS as páginas |
| **PublicLayout** | `src/shared/layouts/PublicLayout.tsx` | Wrapper **quase vazio** (`min-h-screen bg-background`). Sem header, nav ou footer | Visitantes (via PageShell) |
| **UserLayout** | `src/shared/layouts/UserLayout.tsx` | `shared/Header` + barra nav user (Perfil/Feed/Favoritos/etc). Nav **escondida** para creator/admin | Users autenticados (via PageShell) |
| **HomepageLayout** | `src/components/home/HomepageLayout.tsx` | Header glassmorphism (nav completa) + footer + cookie banner | ~50 páginas públicas |
| **SidebarLayout** | `src/shared/layouts/SidebarLayout.tsx` | Sidebar colapsável com links públicos + role-based. Sem topbar | Hub detail pages, CreatorProfilePage |
| **DashboardLayout** | `src/shared/layouts/DashboardLayout.tsx` | Sidebar role-based + header + painel user | Creator dashboard (artigos, vídeos, cursos, etc.) |
| **CreatorSidebar** | `src/features/creators/components/sidebar/creatorSidebar.tsx` | Sidebar com links de creator. Layout ad-hoc `flex` | Creator overview, files, announcements, etc. |

### NÃO usados por Vike (orphans/legacy)

| Layout | Ficheiro | Nota |
|--------|----------|------|
| MainLayout | `src/layouts/MainLayout.tsx` | Usa `<Outlet>` (React Router) |
| AuthLayout (layouts) | `src/layouts/AuthLayout.tsx` | Usa `<Outlet>` (React Router) |
| AuthLayout (shared) | `src/shared/layouts/AuthLayout.tsx` | Não importado por nenhum +Page.tsx |
| DashboardLayout (features) | `src/features/dashboard/layouts/DashboardLayout.tsx` | Usa `<Outlet>` (React Router) |
| AdminLayout | `src/features/admin/layouts/AdminLayout.tsx` | Usa `<Outlet>` — admin Vike não o usa |
| MinimalLayout | `src/layouts/MinimalLayout.tsx` | Usa `<Outlet>` (React Router) |

### Headers (2 versões!)

| Header | Ficheiro | Usado por |
|--------|----------|-----------|
| `components/layout/Header` | `src/components/layout/Header.tsx` | React Router layouts (NÃO Vike) |
| `shared/layouts/Header` | `src/shared/layouts/Header.tsx` | UserLayout (Vike via PageShell) |
| HomepageLayout (interno) | Dentro de `HomepageLayout.tsx` | Auto-contido, header glassmorphism |

---

## 3. Páginas por Tipo de Utilizador

### 3A. Públicas (~55 páginas) — `HomepageLayout`

Consistentes ✅ — quase todas usam `HomepageLayout` com header glassmorphism + footer.

**Excepções:**
- `/ferramentas/fire` — **sem layout** (conteúdo bare)
- `/creators/@username` — usa `SidebarLayout` (diferente da lista que usa `HomepageLayout`)
- `/_error` — sem layout

### 3B. Hub Detail Pages (6 páginas) — `SidebarLayout`

Consistentes ✅ — todas usam `SidebarLayout` (sidebar colapsável).

### 3C. User Autenticado (~7 páginas) — `UserLayout` (via PageShell)

- `/perfil`, `/feed`, `/favoritos`, `/seguindo`, `/notificacoes`, `/pesquisar`
- Dependem inteiramente do `UserLayout` para header/nav
- **Problema:** `UserLayout` esconde a barra nav para roles creator/admin → creator que visite `/favoritos` não vê sub-navegação

### 3D. Creator Dashboard (~25 páginas) — INCONSISTENTE ❌

**Grupo A: `DashboardLayout` (shared)** — 19 páginas de gestão de conteúdo
- `/creators/dashboard/articles/*`, `/creators/dashboard/videos/*`, etc.
- Sidebar role-based via `getRoutesByRole()`, header com toggle

**Grupo B: `CreatorSidebar` ad-hoc** — 9 páginas legacy
- `/creators/dashboard/overview`, `/creators/dashboard/files`, `/creators/dashboard/announcements`
- `/creators/dashboard/playlists`, `/creators/dashboard/reels`, `/creators/dashboard/welcome-videos`
- `/creators/progresso`, `/creators/estatisticas`, `/creators/definicoes`
- Sidebar diferente, visual diferente, links diferentes

**Resultado:** O creator navega no dashboard e a sidebar **muda** entre páginas. Items que aparecem num grupo não aparecem no outro.

### 3E. Admin (~18 páginas) — SEM LAYOUT ADMIN ❌

- Todas as páginas admin Vike renderizam conteúdo dentro de `ProtectedRoute` + `div`
- **Não usam `AdminLayout`** (que tem sidebar + command palette) — esse só existe no `router.tsx` legacy
- Resultado: admin vê apenas o `UserLayout` header + conteúdo bare, sem sidebar admin

### 3F. Brand Portal (1 página)

- `/marcas/portal` — sem layout, sem navegação brand-specific

### 3G. FIRE Tool (4 páginas) — SEM LAYOUT ❌

- `/ferramentas/fire/*` — conteúdo bare, sem nav para voltar ao site

---

## 4. Inconsistências Críticas

### ❌ IC-1: HEADER DUPLO para Users Autenticados em Páginas Públicas

Quando um user autenticado visita `/mercados`, `/noticias`, `/hub/conteudos`, etc.:
1. `PageShell` aplica `UserLayout` → header com search + notificações + avatar
2. A página aplica `HomepageLayout` → header glassmorphism com nav + login/register

**Resultado: DOIS headers empilhados.**

### ❌ IC-2: Admin sem Sidebar (Vike)

As 18 páginas admin em Vike não usam `AdminLayout`. O `AdminLayout` com `AdminSidebar` e `AdminCommandPalette` só funciona via `router.tsx` (React Router) que não é usado pelo Vike.

### ❌ IC-3: Creator Dashboard com 2 Sidebars Diferentes

- Páginas de gestão de conteúdo → `DashboardLayout` (shared) com sidebar A
- Páginas legacy (overview, files, etc.) → `CreatorSidebar` com sidebar B
- Os links e o visual são **diferentes** entre os dois grupos

### ❌ IC-4: PublicLayout Vazio

Para visitantes em páginas sem `HomepageLayout` (ex: `/ferramentas/fire`, `/_error`), a shell exterior é um `div` vazio sem header, nav ou footer.

### ❌ IC-5: FIRE sem Navegação

As 4 páginas FIRE não têm layout. User fica "preso" sem forma de voltar ao site principal.

### ❌ IC-6: CreatorProfilePage vs CreatorsList Layout Diferente

- `/creators` (lista) → `HomepageLayout` (topbar glassmorphism)
- `/creators/@username` (perfil) → `SidebarLayout` (sidebar colapsável)
- Transição visual abrupta entre lista e perfil

---

## 5. Componentes Órfãos

| Componente | Ficheiro | Razão |
|------------|----------|-------|
| DashboardHeader | `src/features/dashboard/components/DashboardHeader.tsx` | Nunca importado |
| AdminHeader | `src/features/admin/components/AdminHeader.tsx` | Nunca importado |
| AuthLayout (shared) | `src/shared/layouts/AuthLayout.tsx` | Nunca importado por Vike |

---

## 6. Outros Problemas

- **Rota com typo:** `/hub/counteudos/+Page.tsx` (deveria ser `conteudos`)
- **`SidebarLayout` tem `console.log` em produção**
- **`router.tsx` é provavelmente dead code** — duplica todas as rotas mas não é usado pelo Vike
- **Dois `DashboardLayout`** em locais diferentes (`shared/layouts/` vs `features/dashboard/layouts/`)
- **Erro page `/_error` sem layout** — utilizador vê um ecrã bare sem forma de navegar

---

## 7. Proposta de Consolidação

### Arquitectura Alvo

```
PageShell.tsx
├── Visitante (não auth)
│   └── PublicShell (header público + footer)
│       ├── Páginas públicas (home, mercados, hub, recursos, legal...)
│       └── Hub detail pages (com sidebar opcional)
│
├── User Regular (auth, role=user)
│   └── UserShell (header user + nav bar)
│       ├── Feed, Favoritos, Seguindo, Notificações
│       └── Páginas públicas (reusa PublicShell interior, sem header duplo)
│
├── Creator (auth, role=creator)
│   └── CreatorShell (header creator + sidebar unificada)
│       ├── Dashboard (overview, artigos, vídeos, cursos, files, settings...)
│       └── Páginas públicas (reusa PublicShell interior, sem header duplo)
│
├── Admin (auth, role=admin)
│   └── AdminShell (header admin + sidebar admin + command palette)
│       ├── Todas as páginas /admin/*
│       └── Páginas públicas (reusa PublicShell interior, sem header duplo)
│
└── Brand Manager (auth, role=brand_manager)
    └── BrandShell (header brand + sidebar brand)
        └── /marcas/portal
```

### Regras
1. **1 header por ecrã** — nunca dois
2. **Sidebar unificada por role** — um creator vê sempre a mesma sidebar em todas as páginas do dashboard
3. **Páginas públicas para users auth** — não mostrar header público (login/register), mostrar header do user
4. **Admin com sidebar admin** — migrar `AdminLayout` de React Router para Vike
5. **Eliminar React Router** — `router.tsx` é dead code, remover ou migrar

### Prioridade de Fix
1. IC-1 (header duplo) — impacto visual imediato para todos os users auth
2. IC-3 (creator sidebar inconsistente) — confunde creators no dashboard
3. IC-2 (admin sem sidebar) — admin não tem navegação
4. IC-4/IC-5 (layouts vazios) — menor impacto, menos users afectados
