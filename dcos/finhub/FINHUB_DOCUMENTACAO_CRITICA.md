# FinHub — Documentação Crítica do Projeto

> Última atualização: 2026-03-20
> Projeto composto por dois repositórios: `API_finhub` (backend) e `FinHub-Vite` (frontend)

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [Setup e Instalação](#4-setup-e-instalação)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [Autenticação e Autorização](#6-autenticação-e-autorização)
7. [API — Endpoints](#7-api--endpoints)
8. [Base de Dados — Modelos](#8-base-de-dados--modelos)
9. [Frontend — Rotas e Páginas](#9-frontend--rotas-e-páginas)
10. [Roles e Permissões](#10-roles-e-permissões)
11. [Fluxo de Dados](#11-fluxo-de-dados)
12. [Infraestrutura e Deploy](#12-infraestrutura-e-deploy)
13. [Monitorização e Observabilidade](#13-monitorização-e-observabilidade)

---

## 1. Visão Geral

**FinHub** é uma plataforma de literacia financeira que combina conteúdo educativo (artigos, vídeos, cursos, podcasts, livros, lives) com ferramentas de mercado financeiro (ações, cripto, ETFs, REITs) e features sociais (feed, follows, comentários, notificações).

### Utilizadores-alvo

| Perfil | Descrição |
|--------|-----------|
| Visitante | Acesso público limitado |
| Free | Conta gratuita, conteúdo básico |
| Premium | Acesso completo a ferramentas e conteúdo premium |
| Creator | Publica e gere conteúdo na plataforma |
| Brand Manager | Gere campanhas e presença de marca |
| Admin | Acesso total à plataforma e painel de administração |

---

## 2. Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTE                               │
│           FinHub-Vite (React 19 + Vike + Vite)              │
│                   localhost:5173 (dev)                       │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP/REST (Axios)
                          │ /api proxy → localhost:3000
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│              API_finhub (Express 5 + TypeScript)             │
│                   localhost:3000 (dev)                       │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Routes  │→ │Middlew. │→ │Controllers│→ │  Services   │  │
│  └─────────┘  └─────────┘  └──────────┘  └──────┬──────┘  │
│                                                   │          │
│              ┌─────────────────┐    ┌────────────┴──────┐  │
│              │     Redis       │    │     MongoDB        │  │
│              │  (Rate limit +  │    │  (62 modelos)      │  │
│              │   Cache)        │    │                    │  │
│              └─────────────────┘    └───────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                          │
               ┌──────────┴──────────┐
               │    Serviços Ext.     │
               ├──────────────────────┤
               │ AWS S3 (uploads)     │
               │ SendGrid/Resend (email│
               │ Yahoo Finance (dados) │
               │ FMP API (REITs)       │
               │ Sentry (erros)        │
               │ Prometheus (métricas) │
               └──────────────────────┘
```

---

## 3. Stack Tecnológica

### Backend — `API_finhub`

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Node.js | >=20, <23 |
| Framework | Express.js | 5.1.0 |
| Linguagem | TypeScript | 5.8.3 |
| Base de Dados | MongoDB + Mongoose | 8.15.1 |
| Cache | Redis | 5.11.0 |
| Autenticação | JWT (jsonwebtoken) | 9.0.3 |
| Passwords | bcryptjs | 3.0.3 |
| Uploads | Multer + AWS S3 | — |
| Rate Limiting | express-rate-limit + rate-limit-redis | — |
| Logs | morgan + logger próprio | — |
| Erros | Sentry | 10.42.0 |
| Métricas | Prometheus | — |
| HTTP Client | Axios | 1.9.0 |
| Dados Financeiros | yahoo-finance2 + FMP API | — |

### Frontend — `FinHub-Vite`

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | React | 19.0.0 |
| Build Tool | Vite + SWC | 6.4.1 |
| Meta-framework | Vike (file-based routing) | 0.4.255 |
| Linguagem | TypeScript | 5.8 |
| Styling | Tailwind CSS | 3.4.1 |
| Componentes UI | Radix UI + ShadCN | — |
| State (client) | Zustand | 5.0.3 |
| State (server) | TanStack React Query | 5.74.4 |
| HTTP Client | Axios | 1.13.6 |
| Routing | React Router v6 | 6.30.3 |
| Formulários | React Hook Form + Zod | — |
| Editor Rich Text | TipTap | 2.11.9 |
| Gráficos | Recharts | 2.15.3 |
| i18n | i18next | 24.2.3 |
| Analytics | GA + GTM + PostHog + FB Pixel | — |
| Erros | Sentry | 10.43.0 |
| Testes | Jest + RTL + Playwright | — |

---

## 4. Setup e Instalação

### Pré-requisitos

- Node.js >= 20
- MongoDB (local ou Atlas)
- Redis (local ou cloud)
- (Opcional) Docker + Docker Compose

### Backend (`API_finhub`)

```bash
cd API_finhub

# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as credenciais necessárias

# 3. Iniciar em desenvolvimento
npm run dev       # ts-node-dev com hot reload

# 4. Build para produção
npm run build     # compila para ./dist
npm start         # inicia a partir do build
```

### Frontend (`FinHub-Vite`)

```bash
cd FinHub-Vite

# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar com os valores corretos

# 3. Iniciar em desenvolvimento
npm run dev       # Vite dev server em localhost:5173

# 4. Build para produção
npm run build
npm run preview   # testar build localmente
```

### Docker (opção alternativa)

```bash
# Apenas infraestrutura (MongoDB + Redis)
docker-compose up -d

# Stack completa (API + MongoDB + Redis)
docker-compose -f docker-compose.fullstack.yml up -d
```

---

## 5. Variáveis de Ambiente

### Backend (`.env`)

```env
# Servidor
PORT=5000
NODE_ENV=development

# Base de Dados
MONGODB_URI=mongodb://localhost:27017/finhub

# JWT
JWT_SECRET=<min 32 chars>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<min 32 chars>
JWT_REFRESH_EXPIRES_IN=30d

# CORS
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_ALLOW_CREDENTIALS=true

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
GOOGLE_OAUTH_FRONTEND_CALLBACK_URL=http://localhost:5173/oauth/google/callback

# Email
EMAIL_PROVIDER=disabled|resend|sendgrid
EMAIL_FROM_ADDRESS=no-reply@finhub.app
EMAIL_RESEND_API_KEY=
EMAIL_SENDGRID_API_KEY=

# Uploads
UPLOAD_STORAGE_PROVIDER=local|s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=finhub-uploads

# Redis
REDIS_URL=redis://localhost:6379

# Sentry
SENTRY_DSN=
SENTRY_ENVIRONMENT=development

# APIs Externas
FMP_API_KEY=   # FinancialModelingPrep (REITs)

# CAPTCHA
CAPTCHA_PROVIDER=disabled|turnstile|hcaptcha
CAPTCHA_SECRET_KEY=

# Limites de Upload
MAX_FILE_SIZE_IMAGE=5242880    # 5MB
MAX_FILE_SIZE_VIDEO=104857600  # 100MB
MAX_FILE_SIZE_AUDIO=52428800   # 50MB
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_SITE_URL=http://localhost:5173

# Analytics (opcionais em dev)
VITE_GA_ID=
VITE_GTM_ID=
VITE_FB_PIXEL_ID=
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=

# Sentry
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development

# CAPTCHA
VITE_CAPTCHA_PROVIDER=disabled
VITE_CAPTCHA_SITE_KEY=

# Versões Legais
VITE_COOKIE_CONSENT_VERSION=v1
VITE_LEGAL_VERSION=v1

# Suporte
VITE_SUPPORT_EMAIL=suporte@finhub.app
```

> **Nota de segurança:** Em desenvolvimento, o frontend usa tokens mock (`dev-admin-access-token`, `dev-admin-refresh-token`) para simular roles sem necessidade do backend estar em execução.

---

## 6. Autenticação e Autorização

### Mecanismo

- **Tipo:** JWT Bearer Token
- **Armazenamento:** localStorage (frontend) / header `Authorization: Bearer <token>`
- **Access Token:** 7 dias de validade
- **Refresh Token:** 30 dias de validade

### Payload do Token

```typescript
{
  userId: string
  email: string
  role: UserRole       // 'visitor' | 'free' | 'premium' | 'creator' | 'brand_manager' | 'admin'
  tokenVersion: number // invalidar tokens antigos no logout
  assistedSession?: {  // presente quando admin opera em nome de utilizador
    sessionId: string
    targetUserId: string
    scopes: string[]
  }
}
```

### Middlewares de Autenticação

| Middleware | Localização | Uso |
|-----------|------------|-----|
| `authenticate` | `middlewares/auth.ts` | Rotas autenticadas obrigatórias |
| `optionalAuth` | `middlewares/auth.ts` | Rotas públicas com contexto de utilizador opcional |
| `requireRole(...roles)` | `middlewares/roleGuard.ts` | Restrição por role |
| `requireAdmin` | `middlewares/roleGuard.ts` | Apenas admins |
| `requireCreator` | `middlewares/roleGuard.ts` | Creators e admins |
| `requirePremium` | `middlewares/roleGuard.ts` | Premium, creators e admins |
| `requireAdminScope(scope)` | `admin/permissions.ts` | Scopes granulares de admin |
| `brandIntegrationAuth` | `middlewares/brandIntegrationAuth.ts` | API key para integrações de marca |

### Fluxo de Token Refresh (Frontend)

```
Request → 401 Unauthorized
    ↓
Interceptor Axios (client.ts)
    ↓
POST /auth/refresh (com refresh token)
    ↓
Atualizar tokens no AuthStore (Zustand)
    ↓
Retry do request original
```

Os requests em fila durante o refresh são processados após o novo token estar disponível (queue-based mechanism).

### Scopes de Admin (granulares)

Os admins podem ter scopes específicos delegados:

```
admin.audit.read
admin.content.moderate
admin.user.manage
admin.user.ban
admin.broadcast.send
admin.financial_tools.manage
admin.ads.manage
admin.appeals.manage
admin.subscriptions.manage
admin.analytics.read
admin.scope.delegate
...e mais de 40 scopes adicionais
```

### Assisted Sessions

Feature que permite a admins operar em nome de um utilizador com scopes limitados (read-only por defeito), com auditoria completa de todas as ações.

---

## 7. API — Endpoints

**Base URL (desenvolvimento):** `http://localhost:5000/api`
**Documentação OpenAPI:** `GET /openapi/*`

### Saúde do Sistema

```
GET /healthz          → Health check simples
GET /readyz           → Readiness check (DB + Redis)
GET /metrics          → Métricas Prometheus
GET /metrics.json     → Métricas em JSON
```

### Autenticação (`/api/auth`)

```
POST   /auth/register                     → Criar conta
POST   /auth/login                        → Login
POST   /auth/logout                       → Logout
POST   /auth/refresh                      → Refresh token
GET    /auth/me                           → Perfil do utilizador autenticado
POST   /auth/forgot-password              → Iniciar reset de password
POST   /auth/reset-password               → Completar reset de password
POST   /auth/change-password              → Alterar password
GET    /auth/verify-email                 → Verificar email
POST   /auth/resend-verification          → Reenviar verificação de email
GET    /auth/google/start                 → Iniciar OAuth Google
GET    /auth/google/callback              → Callback OAuth Google
PATCH  /auth/cookie-consent               → Atualizar consentimento de cookies
GET    /auth/assisted-sessions/pending    → Sessões assistidas pendentes
GET    /auth/assisted-sessions/active     → Sessões assistidas ativas
POST   /auth/assisted-sessions/:id/consent → Aprovar/rejeitar sessão
POST   /auth/assisted-sessions/:id/revoke  → Revogar sessão
```

### Conteúdo

Os seguintes tipos de conteúdo partilham o mesmo padrão de endpoints:
`articles`, `videos`, `courses`, `lives`, `podcasts`, `books`, `reels`, `playlists`, `announcements`

```
GET    /api/{tipo}           → Listar (público, paginado, filtros)
GET    /api/{tipo}/:slug     → Detalhe por slug
GET    /api/{tipo}/my        → Conteúdo do creator autenticado
POST   /api/{tipo}           → Criar [creator]
PATCH  /api/{tipo}/:id       → Atualizar [creator/owner]
DELETE /api/{tipo}/:id       → Eliminar [creator/owner]
POST   /api/{tipo}/:id/like      → Like / unlike
POST   /api/{tipo}/:id/favorite  → Favoritar / desfavoritar
```

### Mercados Financeiros

```
# Ações
GET /api/stocks/batch-snapshot          → Dados em lote de ações
GET /api/stocks/quick-analysis/:symbol  → Análise rápida de ação

# Cripto
GET /api/crypto                         → Dados de criptomoedas

# ETFs
GET /api/etfs                           → Dados de ETFs

# REITs
GET /api/reits/calculateDDM             → Dividend Discount Model
GET /api/reits/calculateFFO             → Funds From Operations
GET /api/reits/calculateNAV             → Net Asset Value
GET /api/reits/calculateMetrics         → Métricas consolidadas
GET /api/reits/calculateDebtRatios      → Rácios de dívida
GET /api/reits/occupancyRate            → Taxa de ocupação
```

### Social

```
GET    /api/feed                    → Feed personalizado [auth]
GET    /api/follow                  → Info de follows
POST   /api/follow                  → Seguir utilizador
DELETE /api/follow/:id              → Deixar de seguir
GET    /api/favorites               → Favoritos do utilizador
POST   /api/favorites               → Adicionar favorito
DELETE /api/favorites/:id           → Remover favorito
GET    /api/notifications           → Notificações
POST   /api/notifications/:id/read  → Marcar como lida
DELETE /api/notifications/:id       → Eliminar notificação
GET    /api/comments                → Comentários de conteúdo
POST   /api/comments                → Criar comentário
PATCH  /api/comments/:id            → Editar comentário
DELETE /api/comments/:id            → Eliminar comentário
GET    /api/ratings                 → Avaliações
POST   /api/ratings                 → Criar/atualizar avaliação
```

### Portfólio

```
POST   /api/portfolio                          → Criar portfólio
GET    /api/portfolio                          → Listar portfólios
GET    /api/portfolio/:id                      → Detalhe do portfólio
PATCH  /api/portfolio/:id                      → Atualizar portfólio
DELETE /api/portfolio/:id                      → Eliminar portfólio
POST   /api/portfolio/:id/holdings             → Adicionar ativo
PATCH  /api/portfolio/:id/holdings/:holdingId  → Atualizar ativo
DELETE /api/portfolio/:id/holdings/:holdingId  → Remover ativo
POST   /api/portfolio/:id/simulate             → Simular portfólio
```

### Uploads

```
POST   /api/upload/image     → Upload de imagem (max 5MB)
POST   /api/upload/video     → Upload de vídeo (max 100MB)
POST   /api/upload/audio     → Upload de áudio (max 50MB)
POST   /api/upload/document  → Upload de documento
DELETE /api/upload           → Eliminar ficheiro
GET    /api/upload/list      → Listar uploads do utilizador
```

### Pesquisa e Descoberta

```
GET /api/search          → Pesquisa global (rate limited)
GET /api/news            → Feed de notícias
GET /api/news/sources    → Fontes de notícias
GET /api/ml              → Recomendações ML
```

### Painel de Admin (`/api/admin`)

> Todos os endpoints requerem role `admin` e opcionalmente scopes granulares.

```
# Utilizadores
GET    /admin/users                                → Listar utilizadores
POST   /admin/users/:userId/ban                    → Banir
POST   /admin/users/:userId/unban                  → Desbanir
POST   /admin/users/:userId/suspend                → Suspender
POST   /admin/users/:userId/force-logout           → Forçar logout
PATCH  /admin/users/:userId/permissions            → Atualizar permissões
GET    /admin/users/:userId/moderation-history     → Histórico de moderação

# Conteúdo / Moderação
POST   /admin/content/:contentId/hide              → Ocultar conteúdo
POST   /admin/content/:contentId/unhide            → Mostrar conteúdo
POST   /admin/content/bulk-moderate                → Moderação em massa
GET    /admin/content/reports                      → Relatórios de conteúdo
GET    /admin/content/queue                        → Fila de jobs

# Audit
GET    /admin/audit-logs                           → Logs de auditoria
GET    /admin/audit-logs/export.csv                → Exportar CSV

# Broadcasts
POST   /admin/broadcasts                           → Criar comunicado
POST   /admin/broadcasts/:id/send                  → Enviar comunicado
POST   /admin/broadcasts/:id/approve               → Aprovar comunicado

# Métricas
GET    /admin/metrics/overview                     → Visão geral
GET    /admin/metrics/drilldown                    → Detalhe
GET    /admin/creator-analytics                    → Analytics de creators

# Subscriptions
PATCH  /admin/subscriptions/:userId/extend-trial   → Estender trial
POST   /admin/subscriptions/:userId/reactivate     → Reativar
POST   /admin/subscriptions/:userId/revoke-entitlement → Revogar

# Scopes / Delegações
POST   /admin/scope-delegations                    → Delegar scope
GET    /admin/scope-delegations                    → Listar delegações
POST   /admin/scope-delegations/:id/revoke         → Revogar delegação

# Outros
GET    /admin/alerts/internal                      → Alertas operacionais
GET    /admin/financial-tools/usage                → Uso das ferramentas financeiras
PATCH  /admin/financial-tools/:tool/config         → Configurar ferramenta
```

---

## 8. Base de Dados — Modelos

**Total: 62 modelos MongoDB**

### Utilizadores e Autenticação

| Modelo | Descrição |
|--------|-----------|
| `User` | Utilizador principal (roles, status, preferências) |
| `AssistedSession` | Sessões assistidas admin→utilizador |
| `AssistedSessionAuditLog` | Auditoria de sessões assistidas |
| `UserPreferences` | Preferências do utilizador |
| `UserSubscription` | Subscrições premium |
| `UserModerationEvent` | Histórico de moderação do utilizador |

### Conteúdo

| Modelo | Descrição |
|--------|-----------|
| `BaseContent` | Schema base partilhado por todos os conteúdos |
| `Article` | Artigos |
| `Video` | Vídeos |
| `Course` | Cursos |
| `LiveEvent` | Eventos ao vivo |
| `Podcast` | Podcasts |
| `Book` | Livros |
| `Reel` | Reels (conteúdo curto) |
| `Playlist` | Playlists |
| `Announcement` | Anúncios |
| `News` | Notícias |
| `NewsSource` | Fontes de notícias |

### Social

| Modelo | Descrição |
|--------|-----------|
| `Follow` | Relações de follow entre utilizadores |
| `Favorite` | Conteúdos favoritos |
| `Comment` | Comentários em conteúdos |
| `Rating` | Avaliações de conteúdo |
| `Notification` | Notificações de utilizador |
| `Feed` | Feed agregado |

### Mercados Financeiros

| Modelo | Descrição |
|--------|-----------|
| `Stock` | Dados de ações |
| `Crypto` | Dados de criptomoedas |
| `ETF` | Dados de ETFs |
| `REIT` | Dados de REITs |
| `Portfolio` | Portfólios de investimento |
| `PortfolioHolding` | Ativos dentro de um portfólio |
| `FinancialToolControl` | Controlo de acesso a ferramentas financeiras |
| `FinancialToolUsageDaily` | Uso diário de ferramentas |

### Admin e Moderação

| Modelo | Descrição |
|--------|-----------|
| `AdminAuditLog` | Log de todas as ações de admin |
| `AdminContentJob` | Jobs de processamento de conteúdo |
| `AdminBulkImportJob` | Jobs de importação em massa |
| `ContentModerationEvent` | Eventos de moderação de conteúdo |
| `ContentReport` | Relatórios de conteúdo por utilizadores |
| `ModerationAppeal` | Apelações a decisões de moderação |
| `AdminBroadcast` | Comunicados em massa |
| `AdminDashboardPreference` | Preferências do dashboard de admin |
| `AdminScopeDelegation` | Delegações de scopes entre admins |
| `AdminOperationalAlertState` | Estado de alertas operacionais |

### Marcas e Monetização

| Modelo | Descrição |
|--------|-----------|
| `Brand` | Marcas parceiras |
| `BrandIntegrationApiKey` | Chaves API de integração de marca |
| `BrandWallet` | Carteira de saldo da marca |
| `BrandWalletTransaction` | Transações da carteira |
| `AdCampaign` | Campanhas publicitárias |
| `AdSlotConfig` | Configuração de slots de anúncios |
| `AdDeliveryEvent` | Eventos de entrega de anúncios |
| `AffiliateLink` | Links de afiliados |
| `AffiliateClick` | Cliques em links de afiliados |

### Plataforma e Controlo

| Modelo | Descrição |
|--------|-----------|
| `PlatformSurfaceControl` | Controlo de superfícies da plataforma |
| `ContentAccessPolicy` | Políticas de acesso a conteúdo |
| `DirectoryEntry` | Entradas no diretório de recursos |
| `EditorialSection` | Secções editoriais |
| `ClaimRequest` | Pedidos de reivindicação de conteúdo |

---

## 9. Frontend — Rotas e Páginas

**Total: 113+ rotas** organizadas por domínio (Vike file-based routing em `/pages/`)

### Públicas

```
/                         → Home page
/feed                     → Feed personalizado
/pesquisar                → Pesquisa global
/noticias                 → Notícias financeiras
```

### Autenticação

```
/auth/login               → Login
/auth/register            → Registo
/auth/forgot-password     → Recuperar password
/auth/reset-password      → Definir nova password
/auth/verify-email        → Verificar email
/oauth/google/callback    → Callback OAuth Google
```

### Hub de Conteúdo (`/hub`)

```
/hub/articles             → Listagem de artigos
/hub/articles/:slug       → Detalhe de artigo
/hub/videos / /hub/videos/:slug
/hub/courses / /hub/courses/:slug
/hub/lives / /hub/lives/:slug
/hub/podcasts / /hub/podcasts/:slug
/hub/books / /hub/books/:slug
/hub/conteudos            → Todo o conteúdo
/hub/conteudos/artigos|cursos|eventos|lives|livros|podcasts|reels|videos
```

### Mercados (`/mercados`)

```
/mercados                 → Hub de mercados
/mercados/acoes           → Ações
/mercados/cripto          → Criptomoedas
/mercados/etfs            → ETFs
/mercados/reits           → REITs
/mercados/noticias        → Notícias de mercado
/mercados/watchlist       → Watchlist pessoal
/mercados/recursos        → Recursos de mercado
/mercados/recursos/:vertical → Vertical específico
```

### Ferramentas (`/ferramentas`)

```
/ferramentas              → Hub de ferramentas
/ferramentas/calculadoras → Calculadoras financeiras
/ferramentas/fire         → FIRE tool
/ferramentas/fire/dashboard   → Dashboard FIRE
/ferramentas/fire/portfolio   → Portfólio FIRE
/ferramentas/fire/simulador   → Simulador FIRE
/ferramentas/raio-x           → Análise Raio-X
```

### Recursos e Marcas (`/recursos`, `/marcas`)

```
/recursos                 → Diretório de recursos
/recursos/:slug           → Detalhe de recurso
/recursos/apps            → Aplicações
/recursos/corretoras      → Corretoras
/recursos/exchanges       → Exchanges
/recursos/livros          → Livros recomendados
/recursos/plataformas     → Plataformas
/recursos/podcasts        → Podcasts
/recursos/comparar        → Comparador
/marcas                   → Listagem de marcas
/marcas/portal            → Portal de marcas
```

### Creators (`/creators`)

```
/creators                 → Diretório de creators
/creators/:username       → Perfil público do creator
/creators/dashboard       → Dashboard do creator
/creators/dashboard/overview    → Visão geral
/creators/dashboard/articles    → Gestão de artigos
/creators/dashboard/articles/create        → Criar artigo
/creators/dashboard/articles/:id/edit      → Editar artigo
/creators/dashboard/books|courses|lives|videos|podcasts|reels|playlists
/creators/dashboard/files            → Gestor de ficheiros
/creators/dashboard/announcements    → Anúncios
/creators/definicoes      → Configurações do creator
/creators/estatisticas    → Estatísticas
/creators/progresso       → Progresso e gamificação
```

### Utilizador (`/perfil`)

```
/perfil               → Perfil próprio
/perfil/:username     → Perfil público
/favoritos            → Favoritos
/notificacoes         → Notificações
/seguindo             → Feed de seguidos
```

### Admin (`/admin`)

```
/admin                           → Dashboard de admin
/admin/users                     → Gestão de utilizadores
/admin/conteudo                  → Gestão de conteúdo
/admin/conteudo/apelacoes        → Apelações de conteúdo
/admin/creators                  → Gestão de creators
/admin/creators/analytics        → Analytics de creators
/admin/editorial                 → CMS Editorial
/admin/monetizacao               → Monetização
/admin/monetizacao/subscricoes   → Subscrições
/admin/operacoes                 → Operações
/admin/operacoes/anuncios        → Anúncios
/admin/operacoes/comunicacoes    → Broadcasts
/admin/operacoes/delegacoes      → Delegações de scopes
/admin/operacoes/integracoes     → Integrações de marca
/admin/apelacoes                 → Apelações gerais
/admin/recursos                  → Gestão de recursos
/admin/stats                     → Estatísticas da plataforma
/admin/stats/ferramentas-financeiras → Stats das ferramentas financeiras
/admin/suporte                   → Suporte
```

---

## 10. Roles e Permissões

### Hierarquia de Roles

```
admin
  └── brand_manager
  └── creator
        └── premium
              └── free
                    └── visitor (não autenticado)
```

### Permissões por Role

| Ação | Visitor | Free | Premium | Creator | Brand | Admin |
|------|:-------:|:----:|:-------:|:-------:|:-----:|:-----:|
| Ver conteúdo público | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver conteúdo premium | — | — | ✓ | ✓ | — | ✓ |
| Comentar / avaliar | — | ✓ | ✓ | ✓ | — | ✓ |
| Publicar conteúdo | — | — | — | ✓ | — | ✓ |
| Ferramentas financeiras | — | — | ✓ | ✓ | — | ✓ |
| Gerir marca / anúncios | — | — | — | — | ✓ | ✓ |
| Painel admin | — | — | — | — | — | ✓ |
| Moderar utilizadores | — | — | — | — | — | ✓ |

---

## 11. Fluxo de Dados

### Login e Autenticação

```
1. Frontend → POST /api/auth/login { email, password }
2. Backend valida credenciais + bcrypt
3. Gera accessToken (7d) + refreshToken (30d)
4. Frontend armazena tokens no Zustand (persistido em localStorage)
5. Axios interceptor injeta Bearer token em todos os requests
6. Quando 401 → interceptor faz POST /api/auth/refresh automaticamente
7. Novos tokens substituem os anteriores no store
```

### Publicação de Conteúdo (Creator)

```
1. Creator → Upload de ficheiros → POST /api/upload/{tipo}
2. Backend → Armazena em S3 (ou local) → retorna URL
3. Creator → POST /api/articles (ou outro tipo) com URLs de media
4. Backend valida role creator, valida payload, cria documento MongoDB
5. Conteúdo fica em estado draft
6. Creator → POST /api/articles/:id/publish → conteúdo publicado
7. Feed de seguidores é atualizado via sistema de eventos
```

### Moderação de Conteúdo (Admin)

```
1. Utilizador reporta conteúdo → POST /api/reports
2. Admin revê → POST /api/admin/content/:id/hide
3. Action registada em AdminAuditLog
4. Alerta criado se threshold de reports atingido
5. Creator pode apelar → POST /api/appeals
6. Admin decide apelação → PATCH /api/admin/appeals/:id/status
```

---

## 12. Infraestrutura e Deploy

### Ficheiros de Deploy

```
API_finhub/
├── Dockerfile                         → Imagem Docker multi-stage
├── docker-compose.yml                 → MongoDB + Redis
├── docker-compose.fullstack.yml       → API + MongoDB + Redis
└── .github/workflows/
    ├── ci.yml                         → Pipeline de CI
    ├── deploy.yml                     → Pipeline de deploy
    └── uptime-monitor.yml             → Monitor de uptime
```

### Variáveis Críticas de Produção

| Variável | Importância |
|----------|-------------|
| `JWT_SECRET` | Crítica — min 32 chars, nunca expor |
| `JWT_REFRESH_SECRET` | Crítica — diferente do JWT_SECRET |
| `MONGODB_URI` | Crítica — URI de produção com auth |
| `REDIS_URL` | Alta — sem Redis, rate limiting falha |
| `CORS_ALLOWED_ORIGINS` | Alta — restringir ao domínio de produção |
| `CORS_ALLOW_ALL` | Alta — deve ser `false` em produção |
| `NODE_ENV` | Alta — deve ser `production` |
| `SENTRY_DSN` | Média — para monitorização de erros |

---

## 13. Monitorização e Observabilidade

### Endpoints de Saúde

```
GET /healthz   → { status: 'ok' }
GET /readyz    → { status: 'ok', db: 'connected', redis: 'connected' }
```

### Métricas Prometheus

Disponíveis em `GET /metrics` e `GET /metrics.json`:
- Requests HTTP (total, duração, status codes)
- Conexões ativas
- Uso de memória Node.js
- Métricas customizadas da aplicação

### Sentry (Erros)

- **Backend:** `@sentry/node` com request tracking
- **Frontend:** `@sentry/react` com ErrorBoundary global
- Configurar `SENTRY_DSN` / `VITE_SENTRY_DSN` com o mesmo projeto ou projetos separados

### Analytics (Frontend)

| Ferramenta | Variável | Uso |
|-----------|---------|-----|
| Google Analytics | `VITE_GA_ID` | Pageviews e eventos |
| Google Tag Manager | `VITE_GTM_ID` | Gestão de tags |
| PostHog | `VITE_POSTHOG_KEY` | Product analytics e session recording |
| Facebook Pixel | `VITE_FB_PIXEL_ID` | Conversões de anúncios |

### Logs (Backend)

- Logs estruturados via logger próprio (`src/utils/logger.ts`)
- HTTP request logging via morgan
- Nível configurável via `LOG_LEVEL` env var
- Admin actions auditadas em `AdminAuditLog` (MongoDB)

---

*Documentação gerada com base na análise do código-fonte de `API_finhub` e `FinHub-Vite`.*
