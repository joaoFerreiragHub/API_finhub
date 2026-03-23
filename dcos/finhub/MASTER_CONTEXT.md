# FinHub — Contexto Mestre do Projecto

> **Data:** 2026-03-23
> **Propósito:** Documento único de contexto completo. Qualquer pessoa (humana ou agente) que leia este ficheiro fica com o panorama completo do projecto, produto, stack e estado actual.

---

## 1. O que é a FinHub?

**FinHub** é uma plataforma portuguesa de **educação e comunidade em finanças pessoais**.

Missão: tornar a literacia financeira acessível a qualquer pessoa, independentemente do seu nível de conhecimento.

**Audiência principal:** Portugueses (e lusófonos) que querem melhorar a sua saúde financeira — desde quem está a começar até quem já investe e quer a independência financeira (FIRE).

---

## 2. Modelo de Produto

A plataforma organiza-se em **três zonas**:

```
┌─────────────────────────────────────────────────────────┐
│  🌐  HUB  —  espaço público, social e de descoberta     │
│  Conteúdo · Criadores · Notícias · Social · Ads         │
│  Acesso: todos (visitors + utilizadores)                │
└────────────────────┬────────────────────────────────────┘
                     │ ponte de educação contextual
┌────────────────────▼────────────────────────────────────┐
│  💬  COMUNIDADE  —  fóruns, salas, gamificação          │
│  Público: discussão geral (FREE+)                       │
│  Premium: análise de carteiras, acesso a criadores      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  🔒  PRIVADO  —  espaço pessoal e ferramentas           │
│  Portfolio · FIRE · Análise de stocks · /conta          │
│  Acesso: autenticados (FREE básico, PREMIUM completo)   │
└─────────────────────────────────────────────────────────┘
```

### Modelo de Negócio
- **Free:** acesso ao HUB público e ferramentas básicas do PRIVADO
- **Premium (9€/mês):** acesso a conteúdo exclusivo, ferramentas completas, salas premium da comunidade, sem anúncios
- **Creators:** criadores de conteúdo com dashboard próprio, partilha de receitas
- **Ads:** marcas e anunciantes publicam no HUB

---

## 3. Stack Técnica

### Backend
| Componente | Tecnologia |
|-----------|-----------|
| Runtime | Node.js + Express + TypeScript |
| ORM | Mongoose (MongoDB) |
| Autenticação | JWT (access 7d + refresh 30d) + Google OAuth |
| Email | Nodemailer (SMTP) |
| Rate Limiting | express-rate-limit (Redis ou memória) |
| Testes | Jest |

### Frontend
| Componente | Tecnologia |
|-----------|-----------|
| Framework | React + TypeScript + Vite |
| SSR | Vike (substitui Vite Plugin SSR) |
| Routing | Vike (baseado em ficheiros) — **sem react-router** |
| State | Zustand (persistido) + TanStack Query (server state) |
| UI | shadcn/ui + Tailwind CSS |
| Forms | React Hook Form + Zod |
| Analytics | PostHog + Sentry |
| SEO | react-helmet-async + OG tags |

### Infra & Externos
| Serviço | Estado |
|---------|--------|
| PostgreSQL → **MongoDB** | Base de dados (migrado) |
| PostHog | Analytics (activo) |
| Sentry | Error tracking (activo) |
| GA4 / GTM | Infraestrutura preparada, não activado |
| Meta Pixel | Infraestrutura preparada, não activado |
| Stripe | Planeado (infra preparada no backend, não activo) |
| S3 / Cloudinary | Planeado (hoje avatares são URL manual) |

---

## 4. Roles & Permissões (Resumo)

| Role | Quem é | Acesso |
|------|--------|--------|
| `visitor` | Não autenticado | HUB público (leitura) |
| `free` | Utilizador registado | HUB + PRIVADO básico + Comunidade pública |
| `premium` | Assinante 9€/mês | Tudo do free + conteúdo exclusivo + ferramentas completas + salas premium |
| `creator` | Criador de conteúdo | Tudo do premium + Creator Dashboard |
| `brand_manager` | Gestor de marca/anúncios | Brand Portal |
| `admin` | Equipa FinHub | Tudo |

---

## 5. Sistemas Documentados

| Sistema | Documento | Estado |
|---------|-----------|--------|
| Arquitectura de Produto | `ARCHITECTURE.md` | ✅ |
| Autenticação & Roles | `AUTH.md` | ✅ |
| Notificações | `NOTIFICATIONS.md` | ✅ |
| Pagamentos & Subscrições | `PAYMENTS.md` | ✅ |
| Moderação de Conteúdo | `MODERATION.md` | ✅ |
| Comunidade + Gamificação | `COMMUNITY.md` | ✅ |
| Motor de Recomendação | `RECO_ENGINE.md` | ✅ |
| SEO | `SEO.md` | ✅ |
| Analytics | `ANALYTICS.md` | ✅ |
| SSR/Vike — Regras e Fixes | `SSR_VIKE_FIXES.md` | ✅ |
| Design System | `DESIGN.md` | ✅ |
| Layout & Navegação (Auditoria) | `LAYOUT_NAVIGATION_AUDIT.md` | ✅ |

---

## 6. Estado das Fases de Desenvolvimento

| Fase | Descrição | Estado |
|------|-----------|--------|
| P1–P7 | Core da plataforma (auth, conteúdo, social, admin) | ✅ Completo |
| P8 | Performance, SEO base, testes E2E base | ✅ Completo |
| P9.1 | Inline profile edit no UserProfilePage | ✅ Completo |
| P9.2 | Homepage personalizada "Para Ti" | ✅ Completo |
| P9.3 | Admin métricas reais (DAU/utilizadores/conteúdo) | ✅ Completo |
| P9.4 | `/conta` — UserAccountShell com sidebar | ✅ Completo |
| P9.5 | Auditoria e fix `/perfil` para todos os roles | ✅ Completo |
| P9-GATE | Gate de qualidade + fix onboarding overlay + fix SSR null | ✅ Completo |
| CLEANUP-02 | Limpeza ficheiros/pastas obsoletos | ✅ Completo |
| **Documentação sistemas** | AUTH, NOTIFICATIONS, PAYMENTS, MODERATION, COMMUNITY | ✅ Completo |

---

## 7. Roadmap — Próximas Fases

### 🟡 P10.x — Polish e v1.0 (prompts Codex preparados)

| Prompt | Feature | Notas |
|--------|---------|-------|
| P10.1 | Nav fix: Mercados/Ferramentas → user menu; Feed → HUB nav | ARCHITECTURE.md L1+L2 |
| P10.2 | Perfil editável de criador (bio, redes, temas) | Creator tem dashboard mas não edita perfil público |
| P10.3 | SEO JSON-LD (artigos, criadores, cursos) | Google rich results |
| P10.4 | Analytics: eventos em falta | content_completed, onboarding, search |
| P10.5 | Motor de recomendação: foundation | R1+R2: tags obrigatórias + endpoint real |

### 🟡 P11.x — Comunidade + Gamificação (a planear quando P10 estiver completo)

| Prompt | Feature |
|--------|---------|
| P11.1 | Salas: modelos, API básica, listagem |
| P11.2 | Posts e threads: criar, votar, responder |
| P11.3 | Sistema XP: eventos, cálculo, persistência |
| P11.4 | Níveis e badges: display no perfil e posts |
| P11.5 | Leaderboard semanal + integração HUB |

### 🟡 Features v1.0 ainda por implementar (sem prompt Codex definido)

| Feature | Notas |
|---------|-------|
| Pagamentos Stripe | Bloqueado por infra externa |
| Upload de imagens real (S3/Cloudinary) | Avatar e covers são URL manual hoje |
| Notificações real-time (WebSocket) | Hoje é polling |
| Feed `/feed` validado | Hooks existem, validar com dados reais |
| Pesquisa global funcional | GlobalSearchBar pode não ter backend |
| SecurityTab wired à API real | Hoje usa mock para alterar password |
| Sitemap dinâmico (SEO-4) | Endpoint backend + conteúdo publicado |

---

## 8. SCOPE FREEZE — Decisão de 2026-03-23

> **⚠️ IMPORTANTE: O scope está CONGELADO até à full release pública.**

Não serão adicionadas novas features ou sistemas até à full release, **excepto se for crítico para o negócio**.

O foco é:
1. **Arredondar** o que já existe (polish, fix, UX)
2. **Implementar** as features já planeadas (P10.x e P11.x — Comunidade)
3. **Testar** com utilizadores reais (beta)
4. **Lançar** a full release

---

## 9. Fluxo de Release

```
AGORA
  │
  ▼
🔨 Desenvolver todas as features planeadas
   (P10.x: polish + P11.x: Comunidade + features v1.0)
  │
  ▼
🧪 Beta Testing (grupo fechado de utilizadores reais)
   — Recolher feedback
   — Corrigir bugs descobertos
   — Ajustar UX com base em dados reais
  │
  ▼
✨ Melhorias sugeridas pelo beta
   — Implementar feedback crítico
   — A/B testing de funcionalidades chave
  │
  ▼
🚀 Full Release Pública
   — Marketing
   — Abertura a todos os utilizadores
   — Activação de pagamentos (Stripe)
  │
  ▼
📱 Versão Android e iOS
   — React Native ou PWA avançada
   — Community-first (notificações push nativas)
   — Ferramentas PRIVADO mobile-optimized
```

---

## 10. Regras para Agentes (Resumo)

### Antes de qualquer implementação:
1. Ler `ARCHITECTURE.md` — zonas HUB/COMUNIDADE/PRIVADO e roles
2. Ler o doc do sistema específico onde se vai trabalhar
3. Verificar `TASKS.md` — confirmar que a task está no backlog
4. Verificar `AUDIT_FICHEIROS.md` — não recriar ficheiros apagados intencionalmente

### Regras SSR obrigatórias (frontend Vike):
- **NUNCA** usar `window`, `document`, `localStorage` directamente no render
- **SEMPRE** usar `usePageContext()` em vez de `useParams()`
- **NUNCA** importar de `react-router-dom` — o projecto usa Vike SSR

### Executores:
- **Codex** — implementação de código (todos os prompts P10.x, P11.x)
- **Claude** — documentação, análise, limpeza, review, planning

---

## 11. Directório de Documentação

```
dcos/finhub/                  ← FONTE DE VERDADE
│
│  CONTEXTO & PLANNING
├── MASTER_CONTEXT.md         ← ESTE FICHEIRO — panorama completo
├── SYSTEMS_INDEX.md          ← índice de sistemas e navegação
├── ARCHITECTURE.md           ← modelo HUB/COMUNIDADE/PRIVADO, roles, nav
├── TASKS.md                  ← backlog completo, release map, GDPR, prioridades
├── PROMPTS_EXECUCAO.md       ← prompts Codex para execução
├── ROADMAP.md                ← histórico de fases P0–P9
│
│  SISTEMAS
├── AUTH.md                   ← JWT, OAuth, roles, guards, refresh flow
├── NOTIFICATIONS.md          ← notificações, preferências, delivery
├── PAYMENTS.md               ← subscrições, Stripe (futuro), admin ops
├── MODERATION.md             ← reportes, auto-moderação, fila, apelos
├── COMMUNITY.md              ← fóruns, salas, gamificação, XP, níveis
├── RECO_ENGINE.md            ← motor "Para Ti", tags, afinidades
├── SEO.md                    ← structured data, sitemap, OG, técnico
├── ANALYTICS.md              ← PostHog, Sentry, GA4, eventos, criadores
│
│  REFERÊNCIA TÉCNICA
├── FINHUB_DOCUMENTACAO_CRITICA.md  ← stack, env vars, endpoints, modelos, deploy
├── DESIGN.md                 ← design system, shadcn/ui, Tailwind
├── SSR_VIKE_FIXES.md         ← regras SSR, fixes comuns, anti-patterns
├── LAYOUT_NAVIGATION_AUDIT.md ← auditoria de nav, problemas, fixes
├── AUDIT_FICHEIROS.md        ← o que apagar / arquivar
├── SEED_GUIDE.md             ← como fazer seed da base de dados
└── RSS_SETUP.md              ← configuração do feed RSS
│
│  RUNBOOKS & REGRAS
├── RUNBOOK_MODERATION_CONTROL_PLANE.md  ← kill switches, bulk rollback
├── RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO.md  ← gate checklist de release
├── FINHUB_OPERATING_SYSTEM.md  ← context empresa, missões de agentes
├── P6_LOG_EVENT_CATALOG.md   ← convenções de logging (domain_action_suffix)
├── P6_SECURITY_CHECKLIST.md  ← validações de segurança para deploy
└── regras.md                 ← regras de colaboração Claude/Codex

dcos/done/    ← arquivo histórico (P3–P8 planning, sprints, masterplans)
dcos/agents/  ← outputs de agentes (legal/GDPR, analytics, data-quality, etc.)
```
