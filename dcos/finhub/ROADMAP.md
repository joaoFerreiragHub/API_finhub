# FinHub — Roadmap

> Última atualização: 2026-03-20

---

## Visão do Produto

O FinHub é a plataforma portuguesa de literacia financeira e investimentos que combina:
1. **Ferramentas de mercado** — análise de ações (FinHubScore), REIT Toolkit, ETF Overlap, Cripto, Watchlist, FIRE Simulator
2. **Hub de conteúdo** — criadores publicam artigos, vídeos, cursos, podcasts, livros, eventos
3. **Diretório de entidades** — corretoras, seguradoras, plataformas com reviews e comparação

**Posicionamento:** Entre o Koyfin (ferramentas pro) e Simply Wall St (narrativa visual). Único em PT a combinar ferramentas + criadores + comunidade.

**Limite absoluto:** O FinHub educa, organiza e contextualiza. Nunca recomenda compra/venda nem faz suitability.

---

## Fases

### ✅ P0 — Fundações Técnicas
Contratos backend/frontend, limpeza de endpoints, homepage sem mocks, pipeline CI/CD, observabilidade.

### ✅ P1 — Paridade de Negócio
- Sistema de ratings/reviews completo (backend + frontend integrados)
- Sistema de notificações (preferências + subscrições por criador)
- Homepage com dados reais (artigos, cursos, livros, criadores, recursos)

### ✅ P2 — Admin MVP (Admin-first)
- P2.0 Governança e segurança (RBAC granular, audit log imutável, guardrails)
- P2.1 Gestão de utilizadores (listagem, suspensão, ban, force-logout, histórico)
- P2.2 Moderação de conteúdo (fila unificada, hide/unhide/restrict, enforcement público)
- P2.3 Acesso assistido com consentimento (sessão delegada, banner, revogação, auditoria)
- P2.4 Métricas admin (DAU/WAU/MAU, engagement, moderação, operação)
- P2.5 Painel admin unificado (navegação por escopos, guardrails UX)
- P2.6 Hardening operacional (E2E admin, alertas internos, runbook)

### 🔄 P3 — Análise Rápida de Stocks
- P3.1 Ingestão multi-fonte e normalização temporal ✅
- P3.2 Motor de cálculo para métricas ausentes (ROE, ROIC, PEG, EBITDA...) ✅
- P3.3 Regras setoriais e categorias dinâmicas ✅
- P3.4 UX com badges de estado por métrica ✅ (arranque)
- P3.5 Validação cruzada e gate de qualidade final ⏳

### 🔄 P4 — Editorial CMS + Moderation Control Plane
- P4.1 Admin Editorial CMS (backend + frontend) ✅ — hardening/E2E em falta
- P4.2 Moderation Control Plane (fast hide, bulk, policy engine, trust score) ✅ — runbook + E2E em falta
- P4.3 Back-office de negócio (monetização, subscrições, apelações, comunicações) ✅
- P4.4 Analytics de creators + ferramentas financeiras + anúncios ✅
- P4.5 Delegações de scopes + tema admin ✅

### ⏳ P5 — Pré-Beta Funcional
**Objetivo:** ciclo completo funcional antes do lançamento beta.

```
Semana 1-2: Páginas públicas de conteúdo
  ├─ Explore (listagem agregada)
  ├─ Detalhe de artigo, curso, vídeo
  ├─ Lista de criadores + perfil público
  └─ SEO básico (meta tags, sitemap)

Semana 3-4: Creator Dashboard MVP
  ├─ Overview com KPIs reais
  ├─ Criar/editar/publicar artigo
  ├─ Criar/editar/publicar vídeo
  └─ Páginas de marcas/entidades públicas

Semana 5-6: Polish + Lançamento Beta
  ├─ Onboarding de utilizador
  ├─ Pesquisa global
  ├─ Feed "a seguir"
  ├─ FIRE frontend completo
  ├─ Testes E2E fluxos críticos
  └─ Audit de mocks + tipos + performance
```

### ⏳ P8 — Elevação UI/UX
**Objetivo:** identidade visual forte, data density legível, micro-interações.
Pode correr em paralelo com P5 a partir das fundações.

```
Fase 1 — Fundações (sem breaking changes)
  ├─ Tipografia Inter + tabular-nums
  ├─ Dark mode mais escuro
  ├─ Chart colors semânticas
  └─ Market colors no Tailwind

Fase 2 — Componentes Críticos
  ├─ Header redesenhado
  ├─ Cards de conteúdo modernizados
  ├─ Charts com tooltips ricos + gradient fill
  └─ FinHubScore visual proeminente

Fase 3 — Páginas
  ├─ Homepage
  ├─ Quick Analysis (ação)
  ├─ Hub de conteúdo
  └─ Perfil de criador
```

### ⏳ P6 — Analytics de Negócio + Sponsorship
Instrumentação de eventos, product analytics, economia de conteúdo/criadores, sponsorship readiness, unit economics, BI executivo.

### ⏳ P7 — Mobile App
Planeado. Sem data.

---

## Checklist Pré-Beta

### 🔴 Bloqueadores (sem isto não se lança)
- [x] Email transacional (verificação, password reset, boas-vindas)
- [x] OAuth Google
- [x] CAPTCHA no registo/login
- [x] Páginas legais (termos, privacidade, aviso financeiro, cookies + banner RGPD)
- [x] Error tracking (Sentry)
- [x] Auth completo (JWT, refresh, change password, delete account, export GDPR)
- [x] Admin dashboard operacional
- [ ] Páginas públicas de conteúdo (explore + detalhe)
- [ ] Dashboard de criador MVP
- [ ] Perfil público de criador ativo
- [ ] Storage S3 (substituir disco local)
- [ ] Corrigir bug B1 (crypto market cap)
- [ ] Corrigir bug B2 (ETF disclaimer)

### 🟡 Importantes para Beta
- [x] Pesquisa global
- [x] Centro de notificações
- [x] Feed "a seguir"
- [x] Perfil de utilizador editável
- [x] SEO básico (meta tags)
- [x] Analytics real (PostHog configurado)
- [x] Docker + deploy pipeline
- [x] Testes E2E baseline
- [ ] FIRE frontend completo
- [ ] Onboarding de utilizador
- [ ] Página de preços/premium
- [ ] Metricas de negócio no admin

### 🟢 Desejável (pode vir durante o beta)
- [ ] Pagamentos/subscrições
- [ ] Recomendações básicas
- [ ] WebSocket para notificações real-time
- [ ] Newsletter/digest semanal
- [ ] Status page externa
- [ ] Lighthouse > 80
- [ ] i18n prep

---

## Princípio Orientador

Para beta, o objetivo não é ter tudo perfeito. É ter:
1. **Ciclo utilizador completo** — regista → descobre conteúdo → interage
2. **Ciclo criador completo** — regista → cria conteúdo → publica → vê feedback
3. **Segurança e legal mínimos** — email verificado, password reset, RGPD, disclaimer financeiro
4. **Infra que não cai** — S3, error tracking, monitoring, backups
