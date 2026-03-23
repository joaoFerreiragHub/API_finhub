# FinHub — Índice de Sistemas

> **Data:** 2026-03-23
> **Propósito:** Ponto de entrada único para agentes e developers.
> Antes de trabalhar em qualquer área da plataforma, lê este documento.
> Para o panorama completo do projecto, consulta `MASTER_CONTEXT.md`.

---

## Como navegar esta documentação

```
dcos/finhub/
├── MASTER_CONTEXT.md        ← CONTEXTO COMPLETO (começa aqui para panorama geral)
├── SYSTEMS_INDEX.md         ← ÍNDICE DE SISTEMAS (este ficheiro)
├── ARCHITECTURE.md          ← modelo mental HUB vs PRIVADO, roles, nav
├── TASKS.md                 ← release map, estado de fases, prioridades
├── PROMPTS_EXECUCAO.md      ← prompts Codex (não executar sem ler TASKS primeiro)
│
├── AUTH.md                  ← JWT, OAuth, roles, guards, refresh flow
├── NOTIFICATIONS.md         ← notificações, eventos, preferências, delivery
├── PAYMENTS.md              ← subscrições, Stripe (futuro), operações admin
├── MODERATION.md            ← reportes, auto-moderação, fila admin, apelos
├── COMMUNITY.md             ← fóruns, salas, gamificação XP/níveis, roadmap
│
├── RECO_ENGINE.md           ← motor de recomendação "Para Ti"
├── SEO.md                   ← SEO técnico e de conteúdo
├── ANALYTICS.md             ← analytics de plataforma, criadores, ads, produto
│
├── DESIGN.md                ← design system, componentes, Tailwind
├── SSR_VIKE_FIXES.md        ← regras SSR obrigatórias, anti-patterns
├── LAYOUT_NAVIGATION_AUDIT.md ← auditoria de nav, problemas, tarefas
│
└── AUDIT_FICHEIROS.md       ← auditoria de ficheiros — o que apagar / arquivar
```

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React + Vite + TypeScript, Vike (SSR), TanStack Query, Tailwind CSS |
| **Backend** | Node.js + Express + TypeScript, Mongoose, MongoDB |
| **Auth** | JWT (access 7d + refresh 30d), Google OAuth, roles: VISITOR / FREE / PREMIUM / CREATOR / BRAND_MANAGER / ADMIN |
| **Analytics** | PostHog (eventos + sessions), Sentry (errors + performance) |
| **Infra** | GA4/GTM/Meta Pixel (infraestrutura preparada, não activada) |

---

## Sistemas Core da Plataforma

### 1. Arquitectura de Produto (`ARCHITECTURE.md`)
A plataforma tem **três zonas**:
- **HUB** — espaço público e social: conteúdo, criadores, social, ads
- **COMUNIDADE** — fóruns, salas, gamificação (nova zona — ver `COMMUNITY.md`)
- **PRIVADO** — espaço pessoal: portfolio, finanças pessoais, ferramentas
- **Ponte** — educação contextual: o PRIVADO puxa conteúdo relevante do HUB

**Problema de nav actual:** Mercados e Ferramentas (PRIVADO) estão no nav público. Task P10.1 resolve isto.

### 2. Autenticação & Roles (`AUTH.md`) 🔴
JWT + Google OAuth. Roles: visitor → free → premium → creator → brand_manager → admin.
Token rotation, email verification, password reset, admin impersonation (sessões assistidas).

### 3. Notificações (`NOTIFICATIONS.md`) 🟡
8 tipos. Entrega actual via polling (React Query). WebSocket planeado para v1.0.
Preferências globais + subscrições por criador. TTL automático de 90 dias.

### 4. Pagamentos & Subscrições (`PAYMENTS.md`) 🟡
Hoje: gestão manual por admin. Stripe preparado mas não activo.
UserSubscription model com histórico de alterações. Premium = `entitlementActive: true`.

### 5. Moderação de Conteúdo (`MODERATION.md`) 🟡
4 camadas: reportes → políticas → auto-hide → fila admin → apelos.
Auto-hide com 3 reporters únicos de alto risco (scam/hate/sexual/violence). SLA de 48h nos apelos.

### 6. Comunidade + Gamificação (`COMMUNITY.md`) 🟡
**Nova feature — a implementar antes da full release.**
Mix Reddit (threads) + Discord (salas). XP + 7 níveis + badges por literacia financeira.
Salas públicas (FREE) e salas premium. Integração com HUB e PRIVADO.

### 7. Motor de Recomendação (`RECO_ENGINE.md`)
Sistema "Para Ti" — 30 tags, sinais de actividade, afinidades por tag.
Prompts R1–R5 em `RECO_ENGINE.md`. Foundation a implementar em P10.5.

### 8. SEO (`SEO.md`)
Base sólida (react-helmet-async, sitemap.xml, robots.txt, OG tags, Twitter Cards).
Maior gap: JSON-LD structured data (P10.3) e sitemap dinâmico.

### 9. Analytics (`ANALYTICS.md`)
PostHog e Sentry activos. GA4/GTM/Meta Pixel preparados.
Eventos em falta a implementar em P10.4.

---

## Estado de Desenvolvimento

| Fase | Descrição | Estado |
|------|-----------|--------|
| P1–P8 | Core da plataforma + performance + SEO base | ✅ Completo |
| P9.1–P9.5 | Profile edit, homepage "Para Ti", admin métricas, /conta, /perfil | ✅ Completo |
| P9-GATE | Gate de qualidade + fixes overlay + SSR null | ✅ Completo |
| CLEANUP-02 | Limpeza de ficheiros/pastas obsoletos | ✅ Completo |
| Documentação sistemas | AUTH, NOTIFICATIONS, PAYMENTS, MODERATION, COMMUNITY | ✅ Completo |
| **P10.1–P10.5** | Nav fix, creator profile, SEO JSON-LD, analytics, reco engine | ⏳ Próximos |
| **P11.x** | Comunidade + Gamificação | ⏳ Após P10 |
| **Beta Testing** | Grupo fechado de utilizadores reais | ⏳ Após P11 |
| **Full Release** | Abertura pública + Stripe | ⏳ Após beta |
| **Android / iOS** | App móvel | ⏳ Pós-release |

---

## ⚠️ SCOPE FREEZE (2026-03-23)

> **Nenhuma nova feature será adicionada até à full release pública**, excepto se for crítica para o negócio.
> O foco é **arredondar** o que existe, **implementar** o planeado (P10+P11+Comunidade) e **lançar**.

---

## Regras para Agentes

### Antes de implementar qualquer coisa:
1. **Lê `MASTER_CONTEXT.md`** — panorama completo do projecto
2. **Lê `ARCHITECTURE.md`** — entende as zonas HUB/COMUNIDADE/PRIVADO e o role system
3. **Lê o doc do sistema** específico onde vais trabalhar
4. **Verifica `AUDIT_FICHEIROS.md`** — não recriar ficheiros que foram intencionalmente apagados
5. **Consulta `TASKS.md`** — confirma que a task está no backlog e com a prioridade correcta

### Regras SSR (obrigatórias no frontend):
- **NUNCA** usar `window`, `document`, `localStorage` directamente no render
- **SEMPRE** usar `usePageContext()` em vez de `useParams()` (react-router não existe)
- **NUNCA** importar de `react-router-dom` — o projecto usa Vike SSR

### Regras de design:
- Usar componentes do `src/shared/components/ui/` (shadcn/ui)
- Não criar CSS custom — usar classes Tailwind
- Dark mode suportado via `dark:` prefix

### Executores:
- **Claude** executa: documentação, análise, limpeza de ficheiros, CLEANUP tasks, planning
- **Codex** executa: todos os prompts em `PROMPTS_EXECUCAO.md` com label "Executor: Codex"
- **Nunca** executar prompts Codex sem ler o prompt completo primeiro
