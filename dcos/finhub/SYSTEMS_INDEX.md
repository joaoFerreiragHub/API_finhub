# FinHub — Índice de Sistemas

> **Data:** 2026-03-22
> **Propósito:** Ponto de entrada único para agentes e developers.
> Antes de trabalhar em qualquer área da plataforma, lê este documento.

---

## Como navegar esta documentação

```
dcos/finhub/
├── SYSTEMS_INDEX.md         ← COMEÇA AQUI
├── ARCHITECTURE.md          ← modelo mental HUB vs PRIVADO, roles, nav
├── TASKS.md                 ← release map, estado de fases, prioridades
├── PROMPTS_EXECUCAO.md      ← prompts Codex (não executar sem ler TASKS primeiro)
├── RECO_ENGINE.md           ← motor de recomendação "Para Ti"
├── SEO.md                   ← SEO técnico e de conteúdo
├── ANALYTICS.md             ← analytics de plataforma, criadores, ads, produto
└── AUDIT_FICHEIROS.md       ← auditoria de ficheiros — o que apagar / arquivar
```

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React + Vite + TypeScript, Vike (SSR), TanStack Query, Tailwind CSS |
| **Backend** | Node.js + Express + TypeScript, Prisma ORM, PostgreSQL |
| **Auth** | JWT (access + refresh tokens), Google OAuth, roles: VISITOR / FREE / PREMIUM / CREATOR / ADMIN |
| **Analytics** | PostHog (eventos + sessions), Sentry (errors + performance) |
| **Infra** | GA4/GTM/Meta Pixel (infraestrutura preparada, não activada) |

---

## Sistemas Core da Plataforma

### 1. Arquitectura de Produto (`ARCHITECTURE.md`)
A plataforma tem **duas zonas distintas**:
- **HUB** — espaço público e social: conteúdo, criadores, social, ads
- **PRIVADO** — espaço pessoal: portfolio, finanças pessoais, ferramentas
- **Ponte** — educação contextual: o PRIVADO puxa conteúdo relevante do HUB

**Problema de nav actual:** Mercados e Ferramentas (PRIVADO) estão no nav público. Task L1 resolve isto.

### 2. Motor de Recomendação (`RECO_ENGINE.md`)
Sistema "Para Ti" — feed personalizado baseado em:
- Taxonomia de 30 tags (Poupança, Investimento, FIRE, Imobiliário, etc.)
- Sinais de actividade (view, complete, favorite, not_interested, share, follow)
- Perfil de afinidades por tag (`UserPreferences.tagAffinities` — já existe no backend)
- Pesos: `not_interested: -2.0`, `share: +2.0`, `favorite: +1.5`, `complete: +1.0`

**Prompts de implementação:** R1–R5 em `RECO_ENGINE.md`

### 3. SEO (`SEO.md`)
Base sólida já existe (react-helmet-async, sitemap.xml, robots.txt, OG tags, Twitter Cards).
**Maior gap:** JSON-LD structured data e sitemap dinâmico com conteúdo de criadores.

**Tasks pendentes:** SEO-1 a SEO-8 (ver `SEO.md`)

### 4. Analytics (`ANALYTICS.md`)
Quatro audiências: Admin, Criadores, Ads, Produto.
PostHog e Sentry activos. GA4/GTM/Meta Pixel com infraestrutura mas não activados.

**Tasks pendentes:** AN-1 a AN-13 (ver `ANALYTICS.md`)

---

## Estado das Fases de Desenvolvimento

| Fase | Descrição | Estado |
|------|-----------|--------|
| P1–P7 | Core da plataforma (auth, conteúdo, social, admin) | ✅ Completo |
| P8 | Performance, SEO base, testes | ✅ Completo |
| P9.1 | Inline profile edit no UserProfilePage | ✅ Completo |
| P9.2 | Motor de recomendação base (beta MVP) | 🔲 Próximo Codex |
| P9.3 | Admin dashboard métricas de negócio (DAU, MRR, churn) | 🔲 Codex |
| P9.4 | `/conta` — UserAccountShell com sidebar de navegação | 🔲 Codex |
| P9.5 | Auditoria e fix do `/perfil` para todos os roles | 🔲 Codex |
| P9-GATE | Gate de qualidade pré-beta | 🔲 Após P9.5 |
| CLEANUP-02 | Limpeza de ficheiros pré-release | 🔲 Claude (após P9-GATE) |

---

## Regras para Agentes

### Antes de implementar qualquer coisa:
1. **Lê `ARCHITECTURE.md`** — entende as zonas HUB vs PRIVADO e o role system
2. **Lê o doc do sistema** específico onde vais trabalhar
3. **Verifica `AUDIT_FICHEIROS.md`** — não recriar ficheiros que foram intencionalmente apagados
4. **Consulta `TASKS.md`** — confirma que a task está no backlog e com a prioridade correcta

### Regras SSR (obrigatórias no frontend):
- **NUNCA** usar `window`, `document`, `localStorage` directamente no render
- **SEMPRE** usar `usePageContext()` em vez de `useParams()` (react-router não existe)
- **NUNCA** importar de `react-router-dom` — o projecto usa Vike SSR

### Regras de design:
- Usar componentes do `src/shared/components/ui/` (shadcn/ui)
- Não criar CSS custom — usar classes Tailwind
- Dark mode suportado via `dark:` prefix

### Executores:
- **Claude** executa: documentação, análise, limpeza de ficheiros, CLEANUP tasks
- **Codex** executa: todos os prompts em `PROMPTS_EXECUCAO.md` com label "Executor: Codex"
- **Nunca** executar prompts Codex sem ler o prompt completo primeiro

---

## Sistemas Documentados em Falta

Os seguintes sistemas existem na plataforma mas ainda não têm documento de especificação próprio:

| Sistema | Localização no código | Prioridade de documentar |
|---------|----------------------|--------------------------|
| **Autenticação & Roles** | `src/features/auth/` | 🔴 Alta |
| **Notificações em tempo real** | `src/features/notifications/` | 🟡 Média |
| **Sistema de Pagamentos** | `src/features/payments/` | 🟡 Média (quando activo) |
| **Moderação de Conteúdo** | `src/features/admin/` + `src/services/` | 🟡 Média |
| **Affiliate Tracking** | `src/services/affiliateTracking.service.ts` | 🟢 Baixa |
| **Cookie Consent & GDPR** | `src/features/auth/components/CookieConsentBanner.tsx` | 🟢 Baixa |
