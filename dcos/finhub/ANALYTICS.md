# FinHub — Sistema de Analytics

> **Data:** 2026-03-22
> **Scope:** analytics de plataforma (admin) + criadores + ads + produto
> **Referência:** ARCHITECTURE.md, RECO_ENGINE.md (sinais de actividade alimentam ambos)

---

## Estado Actual — O que já existe

A plataforma tem mais analytics do que parece à primeira vista:

| Componente | Estado | Localização |
|-----------|--------|-------------|
| PostHog (tracking de eventos + sessões) | ✅ Activo | `src/lib/analyticsProviders.ts` |
| Sistema de eventos tipados (`trackEvent`, `trackPageView`, etc.) | ✅ Activo | `src/lib/analytics.ts` |
| Page tracker automático (view por rota) | ✅ Activo | `src/shared/providers/PageTracker.tsx` |
| Sentry (error tracking + performance) | ✅ Activo | `src/lib/sentry.ts` |
| Cookie consent + consent-gated analytics | ✅ Activo | `src/features/auth/components/CookieConsentBanner.tsx` |
| Admin: Creator analytics dashboard | ✅ Activo | `src/features/admin/pages/AdminCreatorsPositiveAnalyticsPage.tsx` |
| Admin: Stats page (conteúdo, moderação) | ✅ Activo | `src/features/admin/pages/StatsPage.tsx` |
| Creator: analytics components (stats, trends, engagement) | ✅ Activo | `src/features/creators/components/analytics/` + `stats/` |
| Affiliate tracking | ✅ Activo | `src/services/affiliateTracking.service.ts` |
| GA4 / GTM / Meta Pixel | ⚠️ Config existe | `platformRuntimeConfig.ts` — infraestrutura mas não wired |
| Admin: métricas de negócio (DAU, receita, churn) | ❌ Parcial | `AdminDashboardPage.tsx` — P9.3 por completar |
| Analytics de ads (impressões, CTR, receita) | ❌ Não existe | — |
| Funil de conversão (visitor → free → premium) | ❌ Não existe | — |
| Heatmaps / session recording | ⚠️ PostHog suporta | Config necessária |
| Relatórios exportáveis (criadores) | ⚠️ Parcial | CSV no admin creator analytics |

---

## Arquitectura de Analytics — 4 Audiências

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   ADMIN         │  │   CRIADORES     │  │   ADS           │  │   PRODUTO       │
│ Saúde global    │  │ Performance     │  │ Retorno do      │  │ UX e feature    │
│ da plataforma   │  │ dos seus        │  │ investimento    │  │ usage           │
│                 │  │ conteúdos       │  │ em anúncios     │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │                    │
         └────────────────────┴────────────────────┴────────────────────┘
                                        │
                              PostHog + Backend DB
                          (fonte única de verdade)
```

---

## 1. Analytics de Admin

### O que já existe
- **Creator analytics** — crescimento, engagement, followers, nível de confiança, filtros por status
- **Stats page** — contagens de conteúdo por tipo, moderação, regras automáticas

### O que falta — métricas de negócio (P9.3 + além)

#### Dashboard de Saúde da Plataforma (`/admin`)

```
UTILIZADORES
├── DAU (Daily Active Users) — gráfico 30 dias
├── MAU (Monthly Active Users)
├── Novos registos esta semana / este mês
├── Distribuição por role (Visitor / Free / Premium / Creator)
├── Taxa de conversão Free → Premium
└── Churn mensal (subscritores que cancelaram)

CONTEÚDO
├── Total de conteúdo publicado por tipo
├── Conteúdo publicado esta semana (por tipo)
├── Taxa de aprovação de moderação
├── Conteúdo em fila de moderação agora
└── Criadores activos este mês

ENGAGEMENT
├── Artigos mais lidos (últimos 7 dias)
├── Vídeos mais vistos
├── Criadores com mais crescimento de seguidores
└── Taxa de conclusão média por tipo de conteúdo

RECEITA (quando pagamentos activos)
├── MRR (Monthly Recurring Revenue)
├── ARR (Annual Recurring Revenue)
├── Novas subscriptions Premium este mês
├── Cancelamentos este mês
└── Receita por tipo de plano
```

#### Métricas de Produto (`/admin/stats`)

```
FUNNEL DE CONVERSÃO
  Visitantes únicos → Registos → Utilizadores activos → Premium
  (visualizar onde se perde o utilizador)

FEATURE USAGE
  Quais as ferramentas mais usadas (FIRE, Mercados, FinHubScore, etc.)
  Quais as páginas mais visitadas
  Taxa de utilização do onboarding (% que completa os 3 passos)
  Taxa de utilização do "Para Ti" feed

RETENÇÃO
  Cohort analysis: dos utilizadores registados em Janeiro, quantos ainda activos em Março?
  D1 / D7 / D30 retention rates
```

#### Funil de Conversão (novo — a implementar)

```
[Visitante anónimo]
        ↓ vê página de preços ou conteúdo premium
[Click em "Registar" / "Ver mais"]
        ↓
[Registo (Free)]
        ↓ recebe onboarding
[Utilizador activo (Free)]
        ↓ encontra conteúdo premium / ferramentas avançadas
[Click em "Upgrade"]
        ↓
[Premium]

Métricas por etapa:
- % que chega à página de preços
- % que regista após ver preços
- % que activa após registo (faz login 2ª vez)
- Tempo médio Free → Premium
- Trigger mais comum de upgrade (qual conteúdo/feature convence)
```

---

## 2. Analytics de Criadores

### O que já existe

**Componentes disponíveis:**
- `ContentStatsDashboard.tsx` — overview de performance
- `contentTrendsCard.tsx` — tendências ao longo do tempo
- `EngagementTrendsCard.tsx` — engagement (likes, comentários, ratings)
- `feedbackChartCard.tsx` — feedback e avaliações
- `ArticlesStats.tsx`, `CoursesStats.tsx` — stats por tipo de conteúdo

**Service backend:**
- `adminCreatorAnalytics.service.ts` — crescimento, engagement, followers, trust
- Suporta janela temporal: 1-180 dias
- Breakdown por tipo de conteúdo
- Export CSV

### O que falta — experiência completa para criadores

#### Dashboard de Criador (`/creators/dashboard/overview`) — target state

```
VISÃO GERAL (últimos 30 dias)
├── Total de views
├── Novos seguidores
├── Rating médio
└── Conteúdo mais popular (top 3)

POR CONTEÚDO
├── Tabela: conteúdo | views | completion rate | favoritos | rating
├── Filtros: tipo, período, status (publicado / rascunho)
└── Ordenar por: mais popular, mais recente, maior engagement

AUDIÊNCIA
├── Seguidores totais (gráfico de crescimento)
├── Seguidores activos este mês
├── Distribuição por role (Free vs Premium)
└── Tópicos de maior interesse da audiência

O QUE RESULTA
├── Tipos de conteúdo com maior engagement (artigo vs vídeo vs podcast)
├── Comprimento óptimo (artigos de X palavras têm Y% mais views)
├── Melhores dias/horas para publicar
└── Tags que geram mais descoberta orgânica
```

#### Métricas específicas por tipo

| Tipo | Métricas chave |
|------|---------------|
| Artigos | Views, leituras completas (>80%), tempo médio de leitura, partilhas |
| Vídeos | Views, % de conclusão, replays, comentários |
| Cursos | Inscritos, taxa de conclusão por lição, abandono por lição |
| Podcasts | Plays, % de conclusão, subscrições novas após episódio |
| Reels | Views, loop rate (quantos viram mais de 1 vez), follows após reel |

---

## 3. Analytics de Ads

### O que existe
- `affiliateTracking.service.ts` — tracking de cliques e conversões em links de afiliados
- `PublicAdSlot.tsx` — componente de anúncio público
- `usePublicAds.ts` + `publicAdsService.ts` — serviço de ads

### O que falta — métricas de ads completas

```
POR SLOT DE ANÚNCIO
├── Impressões (quantas vezes o ad foi visto)
├── Cliques (CTR — click-through rate)
├── Conversões (se tracking de afiliado activo)
└── CPM (custo por mil impressões — para pricing interno)

POR ANUNCIANTE / MARCA
├── Total de impressões compradas vs entregues
├── Performance por formato (banner, sidebar, in-feed)
├── Audiência alcançada (role distribution)
└── Conteúdo onde o ad performou melhor

INVENTORY
├── Fill rate (% de slots preenchidos vs slots disponíveis)
├── Receita de ads por página/rota
└── Estimativa de receita mensal por slot
```

---

## 4. Analytics de Produto (PostHog)

### Eventos já definidos e activos

```typescript
// Eventos tipados em src/lib/analytics.ts:
'page_view'        — cada navegação de página
'click_button'     — interacção com botão
'login_success'    — login (com método: password/google)
'sign_up_success'  — registo (com método)
'feature_used'     — uso de feature
'error_occurred'   — erro (com contexto)
'user_role_assigned' — mudança de role
'content_viewed'   — visualização de conteúdo (tipo + slug)
'upgrade_to_premium' — evento de upgrade (funil de conversão)
```

### Eventos que faltam adicionar

```typescript
// A adicionar ao sistema de eventos:
'content_completed'      — completou artigo/vídeo/curso
'content_favorited'      — adicionou aos favoritos
'content_shared'         — partilhou externamente
'not_interested'         — "não me interessa" no feed
'onboarding_step'        — passo X do onboarding concluído
'onboarding_completed'   — onboarding completo (3/3)
'onboarding_skipped'     — onboarding ignorado
'search_performed'       — pesquisa global (query + tipo)
'search_result_clicked'  — clicou em resultado de pesquisa
'creator_followed'       — seguiu um criador
'creator_unfollowed'     — deixou de seguir
'filter_applied'         — filtro aplicado num hub
'tool_used'              — FIRE / FinHubScore / Mercados / Raio-X
'fire_simulation_run'    — correu simulação FIRE
'upgrade_cta_clicked'    — clicou em "Upgrade" (sem converter)
'ad_impression'          — viu anúncio
'ad_clicked'             — clicou em anúncio
'algo_reset'             — reset do algoritmo de recomendação
```

### PostHog — features a activar

| Feature | Estado | Acção |
|---------|--------|-------|
| Session recording | ✅ Config existe | Verificar se DSN configurado em prod |
| Heatmaps | ⚠️ Disponível no PostHog | Activar em páginas prioritárias (homepage, preços, conteúdo) |
| Feature flags | ⚠️ Disponível | Usar para A/B testing de features novas |
| Funnels | ✅ Dados existem | Criar funnel: page_view → sign_up → content_viewed → upgrade |
| Cohort analysis | ✅ Dados existem | Criar cohort por data de registo |
| User paths | ✅ Dados existem | Visualizar fluxos de navegação |

### GA4 / GTM / Meta Pixel (a activar)

A infraestrutura já está preparada em `platformRuntimeConfig.ts`:

```typescript
googleAnalytics: { enabled: boolean, measurementId: string | null }
googleTagManager: { enabled: boolean, containerId: string | null }
metaPixel: { enabled: boolean, pixelId: string | null }
```

**Para activar:**
1. Admin configura os IDs na runtime config do backend
2. Frontend verifica `platformRuntimeConfig.googleAnalytics.enabled` e injeta o script
3. GTM pode depois gerir GA4 + Meta Pixel centralmente (recomendado)

**Ordem de prioridade:**
- GA4 (Google Search Console integração — essencial para SEO)
- GTM (gestão centralizada de todos os tags)
- Meta Pixel (para campanhas pagas futuras)

---

## Privacidade e Conformidade (GDPR)

O sistema já tem:
- `CookieConsentBanner.tsx` — banner de consentimento
- Analytics só activam após consentimento (`cookieConsent.analytics === true`)
- `COOKIE_CONSENT_UPDATED_EVENT` — sync em tempo real entre banner e PostHog
- `User.cookieConsent` — persistido na DB por utilizador

**O que falta:**
- Política de retenção de dados (quando apagar dados de analytics de utilizadores que cancelam)
- "Forget me" — endpoint para apagar dados PostHog de um utilizador específico (GDPR Art. 17)
- Log de consentimento com timestamp e versão da política aceite

---

## Sinergias com o Motor de Recomendação

Os sinais de analytics e os sinais do motor de recomendação **partilham a mesma fonte de dados** mas têm fins distintos:

| Sinal | Analytics usa para | Recomendação usa para |
|-------|-------------------|-----------------------|
| `content_viewed` | Contar views de conteúdo | Aumentar afinidade com tópico |
| `content_completed` | Taxa de conclusão | Forte sinal de interesse |
| `content_favorited` | Popular content | Forte sinal de afinidade |
| `not_interested` | Conteúdo a evitar | Sinal negativo de afinidade |
| `creator_followed` | Crescimento de criador | Boost em conteúdo do criador |
| `search_performed` | Conteúdo em falta | Explorar novos tópicos |

**Ver RECO_ENGINE.md** para detalhe do motor de recomendação.

---

## Ficheiros Chave

```
FinHub-Vite/src/lib/analytics.ts                      ← sistema de eventos tipados
FinHub-Vite/src/lib/analyticsProviders.ts              ← PostHog setup + consent gating
FinHub-Vite/src/lib/sentry.ts                          ← error + performance tracking
FinHub-Vite/src/shared/providers/AnalyticsProvider.tsx ← provider de analytics
FinHub-Vite/src/shared/providers/PageTracker.tsx       ← tracking automático de página
FinHub-Vite/src/features/admin/pages/AdminCreatorsPositiveAnalyticsPage.tsx
FinHub-Vite/src/features/admin/pages/StatsPage.tsx
FinHub-Vite/src/features/creators/components/analytics/
FinHub-Vite/src/features/creators/components/stats/
FinHub-Vite/src/features/platform/types/platformRuntimeConfig.ts ← GA4/GTM/MetaPixel config
API_finhub/src/services/adminCreatorAnalytics.service.ts
API_finhub/src/services/affiliateTracking.service.ts
```

---

## Tasks de Analytics Pendentes

### Alta prioridade (v1.0)
| Task | O que faz |
|------|-----------|
| **AN-1** | Adicionar eventos em falta ao `analytics.ts` (content_completed, search, onboarding_steps, etc.) |
| **AN-2** | Activar GA4 via runtime config (admin insere measurement ID) |
| **AN-3** | Activar GTM via runtime config (admin insere container ID) |
| **AN-4** | Funil de conversão no PostHog (visitor → free → premium) |
| **AN-5** | Admin dashboard: métricas de negócio reais (DAU, MRR, churn) — P9.3 |

### Média prioridade (v1.0)
| Task | O que faz |
|------|-----------|
| **AN-6** | Creator dashboard: completion rate + "o que resulta" insights |
| **AN-7** | Ads analytics: impressões + CTR por slot |
| **AN-8** | GDPR "forget me" — apagar dados PostHog do utilizador |
| **AN-9** | Activar heatmaps PostHog em páginas prioritárias |

### Pós-v1.0
| Task | O que faz |
|------|-----------|
| **AN-10** | Cohort analysis de retenção (D1/D7/D30) |
| **AN-11** | A/B testing com PostHog feature flags |
| **AN-12** | Meta Pixel para campanhas pagas |
| **AN-13** | Relatórios automáticos semanais para criadores (email digest) |
