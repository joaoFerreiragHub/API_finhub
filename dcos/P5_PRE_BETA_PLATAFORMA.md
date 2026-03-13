# P5 — Analise Pre-Beta: O que falta fechar

## Contexto

Esta analise complementa os documentos P5 de criadores e marcas. Foca-se em tudo o que falta alem dessas duas verticais para que a plataforma esteja pronta para uma fase de beta — com utilizadores reais, conteudo real e feedback real.

O FinHub e uma plataforma de literacia financeira e investimentos que agrega criadores de conteudo, entidades financeiras (corretoras, seguradoras, etc.) e ferramentas de mercado. O objetivo e escala — muitos utilizadores, muitos criadores, muitos conteudos.

Data desta avaliacao: 2026-03-06 (atualizado em 2026-03-13).

---

## 1. Panorama geral — o que funciona hoje

### 1.1 Areas totalmente funcionais

| Area | Estado | Notas |
|------|--------|-------|
| **Market tools** (Acoes, ETFs, REITs, Cripto) | ✅ Producao | Core diferenciador da plataforma, algoritmos robustos |
| **Admin dashboard** | ✅ Producao | Metricas, alertas, surface controls, command palette |
| **Moderacao de conteudo** | ✅ Producao | Queue, bulk actions, trust scoring, auto-moderacao |
| **Gestao de utilizadores** | ✅ Producao | Status, suspensoes, audit trail |
| **Editorial CMS** | ✅ Producao | Seccoes, items, time-based visibility |
| **Gestao de diretorios** | ✅ Producao | CRUD, publish/archive, claims |
| **Auth (login/registo)** | ✅ Funcional | JWT + refresh tokens, multi-role |
| **Homepage** | ✅ Funcional | Hero, content rows, responsive, dark mode |
| **Assisted sessions** | ✅ Funcional | Consent flow, banner, revoke |
| **Audit logs** | ✅ Funcional | Export CSV, filtros, paginacao |

### 1.2 Areas com base mas incompletas

| Area | Base | Falta |
|------|------|-------|
| **Criadores** | Backend completo (6 content types), frontend parcialmente mockado | Ver P5_CRIADORES_CONTEUDO.md |
| **Marcas/Entidades** | Backend + admin completos, 0 paginas publicas | Ver P5_MARCAS_ENTIDADES.md |
| **Dashboard de criador** | Layout + sidebar + rotas | MVP funcional (overview + criar + listar conteudo); evolucao analitica avancada pendente |
| **Hub de conteudos** | Estrutura de rotas, homepage integrada | MVP funcional nas paginas minimas de descoberta e detalhe |
| **Perfis publicos** | Componentes + tipos definidos | Ativos por defeito com kill switch via surfaceControl |

### 1.3 Areas a zero

| Area | Estado |
|------|--------|
| Email (verificacao, password reset, notificacoes) | Parcial: transacional de auth fechado (2026-03-13), digest/newsletter pendente |
| Pagamentos/Subscricoes | Inexistente |
| Paginas legais (termos, privacidade, cookies, aviso legal) | Fechado (2026-03-08) |
| PWA / offline | Inexistente |
| Testes E2E dos fluxos criticos | Config existe, testes nao |

---

## 2. BLOQUEADORES DE BETA — sem isto nao se lanca

Estes sao items que, se nao existirem, impedem um beta mesmo limitado.

### 2.1 Email transacional

**Estado:** FECHADO (2026-03-13) para email transacional de autenticacao.

**Entregue:**
- Servico `src/services/email.service.ts` com providers `console`, `resend` e `sendgrid`.
- Templates para verificacao, reset de password, boas-vindas, alerta de moderacao e teste operacional.
- Endpoints ligados ao fluxo:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
  - `GET /api/auth/verify-email`
  - `POST /api/auth/resend-verification`
- Links frontend ativos nos emails:
  - `/esqueci-password`
  - `/reset-password?token=...`
  - `/verificar-email?token=...`

**Pendencias fora deste bloco:** newsletter/digest e comunicacoes de produto.

---

### 2.2 Reset de password

**Estado:** FECHADO (2026-03-13).

**Entregue:**
- Endpoint `POST /api/auth/forgot-password` (resposta neutra para evitar enum de emails).
- Endpoint `POST /api/auth/reset-password` com validacao de token e invalidacao de sessoes ativas.
- Token seguro com expiracao (`PASSWORD_RESET_TOKEN_TTL_MINUTES`, default 30 min).
- Rate limiting aplicado via `rateLimiter.general`.
- Frontend com fluxo completo:
  - `/esqueci-password` (pedido de recuperacao)
  - `/reset-password?token=...` (definicao da nova password)
  - Link direto no login para iniciar recuperacao.

---

### 2.3 Verificacao de email

**Estado:** FECHADO (2026-03-13).

**Entregue:**
- Campo `emailVerified` no User model com token hash + expiracao.
- Email de verificacao enviado no registo com link dedicado.
- Endpoint `GET /api/auth/verify-email?token=...`.
- Endpoint `POST /api/auth/resend-verification` para reenvio autenticado.
- Guard ativo para acoes criticas (criar/publicar conteudo e comentar).
- UI entregue:
  - pagina `/verificar-email?token=...`
  - banner global para contas por verificar com acao de reenvio.

---

### 2.4 Paginas legais

**Estado:** FECHADO (2026-03-08). Frontend ligado a `/api/platform/legal/*` com paginas reais em `/termos`, `/privacidade`, `/cookies` e `/aviso-legal`, links no footer e banner RGPD de cookies com sync para `PATCH /api/auth/cookie-consent`.

**O que construir:**

| Pagina | Rota | Conteudo |
|--------|------|----------|
| **Termos de Servico** | `/termos` | Condicoes de utilizacao, direitos, deveres, responsabilidades |
| **Politica de Privacidade** | `/privacidade` | Dados recolhidos, finalidades, direitos RGPD, contacto DPO |
| **Politica de Cookies** | `/cookies` | Tipos de cookies, consentimento, como desativar |
| **Aviso Legal Financeiro** | `/aviso-legal` | **Critico para plataforma financeira**: "nao constitui aconselhamento financeiro", disclaimer de risco |

**Nota sobre o aviso financeiro:** Uma plataforma que mostra analises de acoes, REITs, ETFs e cripto TEM de ter um disclaimer financeiro claro. Sem isto ha risco legal real.

**Banner de cookies:** RGPD exige consentimento explicito para cookies nao-essenciais. PostHog (analytics) requer consentimento.

**Esforco:** Medio (conteudo legal + 4 paginas + banner de cookies).

---

### 2.5 Paginas de conteudo publicas (minimo viavel)

**Estado:** FECHADO (2026-03-13) no escopo minimo de beta.

Nao e preciso ter todas as 80 paginas placeholder prontas para beta. Mas e preciso que o utilizador consiga:
- Descobrir conteudo
- Ver detalhe de conteudo
- Interagir (rating, comment, favorito)

**Minimo para beta:**

| Pagina | Prioridade | Notas |
|--------|-----------|-------|
| `/explorar/tudo` | Obrigatorio | Listagem agregada de todos os content types |
| `/artigos/:slug` | Obrigatorio | Detalhe de artigo com comments e ratings |
| `/cursos/:slug` | Obrigatorio | Detalhe de curso com licoes e ratings |
| `/videos/:slug` | Obrigatorio | Player de video + engagement |
| `/criadores` | Obrigatorio | Lista de criadores (mesmo que poucos) |
| `/criadores/:username` | Obrigatorio | Perfil publico do criador |
| `/recursos` | Desejavel | Index do diretorio |
| `/recursos/:slug` | Desejavel | Detalhe de entidade |

**Entregue:**
- Rotas obrigatorias funcionais no frontend:
  - `/explorar/tudo`
  - `/artigos/:slug`
  - `/cursos/:slug`
  - `/videos/:slug`
  - `/criadores`
  - `/criadores/:username`
- Perfis/listagem de creators deixaram de estar em placeholder e passaram a usar dados publicos da API com fallback controlado.
- Compatibilidade adicional de links via alias `/creators/*` para nao quebrar navegacao legado.

---

### 2.6 Dashboard de criador (minimo viavel)

**Estado:** FECHADO (2026-03-13) no escopo minimo de beta.

O criador precisa de conseguir, no minimo:
- Ver o seu conteudo
- Criar conteudo novo
- Publicar conteudo
- Ver estatisticas basicas

**Paginas obrigatorias:**

| Pagina | Estado atual | O que falta |
|--------|-------------|-------------|
| `/creators/dashboard` | MVP funcional | Refinar KPIs e atalhos avancados |
| `/creators/dashboard/overview` | Integrado | Hardening de analytics avancada |
| `/creators/dashboard/articles/create` | Funcional | Melhorias UX incrementais |
| `/creators/dashboard/courses/create` | Funcional | Melhorias UX incrementais |
| `/creators/dashboard/articles` | Funcional | Otimizacoes de operacao e escala |

**Entregue:**
- Fluxo minimo operacional para creator coberto:
  - overview de dashboard
  - criacao de conteudo
  - listagem/gestao de conteudo
- Integracao base com backend funcional nas rotas minimas.

---

## 3. IMPORTANTES PARA BETA — deviam existir mas nao bloqueiam

### 3.1 OAuth / Social login

**Estado:** So existe login por email/password.

**Impacto:** Friccao no registo. Utilizadores esperam poder entrar com Google/Apple.

**O que construir:**
- Google OAuth (o mais importante para PT)
- Opcionalmente: Apple Sign-In
- Passport.js ou auth library com OAuth support
- Vincular conta social a user existente

**Esforco:** Medio (2-3 dias com Passport.js).

---

### 3.2 Notificacoes em tempo real

**Estado:** Notificacoes existem no backend (model + service completos) mas:
- Nao ha WebSocket / SSE para push em tempo real
- Frontend nao tem centro de notificacoes funcional
- Pagina `/notificacoes` e placeholder

**O que construir:**
- WebSocket server (Socket.io ou ws) para push notifications
- Centro de notificacoes no header (badge com count, dropdown com lista)
- Pagina `/notificacoes` com historico
- Endpoint ja existe: `GET /api/notifications`, `PATCH /api/notifications/:id/read`

**Esforco:** Medio (2-3 dias para WebSocket + UI).

---

### 3.3 Pesquisa global

**Estado:** Existe um `SearchBar` no frontend mas a funcionalidade de pesquisa cross-content nao esta clara.

**O que construir:**
- Endpoint: `GET /api/search?q=...&types=articles,videos,creators,brands`
- Pesquisa full-text em MongoDB (text indexes) ou Elasticsearch futuro
- Frontend: resultados agrupados por tipo, com previews
- Sugestoes em tempo real (debounced, top 5 resultados)

**Esforco:** Medio (2-3 dias para pesquisa basica, Elasticsearch e post-beta).

---

### 3.4 Feed personalizado

**Estado:** Rota `/a-seguir` existe mas desactivada via surfaceControl (`derived_feeds`).

**O que construir (MVP):**
- Endpoint: `GET /api/feed` — conteudos recentes dos criadores que o user segue
- Ordenacao cronologica (sem algoritmo, para ja)
- Paginacao infinita
- Frontend: cards de conteudo com info do criador

**Esforco:** Baixo-Medio (1-2 dias, os models ja existem).

---

### 3.5 Gestao de conta / RGPD

**Estado:** FECHADO (2026-03-13). Fluxo minimo de gestao de conta/RGPD entregue em API + frontend.

**Entregue:**
- Endpoint `PATCH /api/users/me` para edicao de perfil (nome, avatar, bio, social links).
- Form dedicado em `/conta` para edicao de perfil com persistencia em API.
- Endpoint `POST /api/auth/change-password` com validacao de password atual e rotacao de sessoes (`tokenVersion`).
- Form dedicado em `/conta` para alteracao de password com confirmacao e sign-out apos sucesso.
- Endpoint `GET /api/users/me/export` para export JSON dos dados essenciais da conta.
- Endpoint `DELETE /api/users/me` com confirmacao dupla + motivo (conta desativada e dados pessoais anonimizados).
- UI em `/conta` para export de dados (download JSON) e eliminacao de conta.

**Ainda em falta:**
- Sem pendencias no escopo minimo definido para P5.

**O que construir:**

| Feature | Endpoint | Frontend |
|---------|----------|----------|
| Editar perfil | `PATCH /api/users/me` | FECHADO (2026-03-13) |
| Alterar password | `POST /api/auth/change-password` | FECHADO (2026-03-13) |
| Eliminar conta | `DELETE /api/users/me` | FECHADO (2026-03-13) |
| Export de dados | `GET /api/users/me/export` | FECHADO (2026-03-13) |

**Nota RGPD:** O direito a eliminacao de dados e obrigatorio na UE. Para beta pode ser um processo manual (user contacta, admin elimina), mas deve existir o caminho.

**Esforco:** Medio (2-3 dias).

---

### 3.6 Paginas estaticas uteis

| Pagina | Rota | Para que serve |
|--------|------|---------------|
| **Sobre** | `/sobre` | O que e o FinHub, missao, equipa |
| **FAQ** | `/faq` | Perguntas frequentes (o que e, como funciona, para quem) |
| **Contacto** | `/contacto` | Formulario de contacto, email de suporte |
| **Precos** | `/precos` | Se existe premium, explicar o que inclui |

**Esforco:** Baixo (1-2 dias, sao paginas de conteudo estatico).

---

## 4. INFRAESTRUTURA — o que escalar precisa

### 4.1 Storage de ficheiros

**Estado:** FECHADO (2026-03-13) no escopo minimo de beta.

**Entregue:**
- Provider de storage em runtime (`UPLOAD_STORAGE_PROVIDER=local|s3`) com fallback seguro para `local` quando config S3 nao esta completa.
- Upload middleware adaptado por provider:
  - `local`: `multer.diskStorage()` com estrutura por tipo em `uploads/`
  - `s3`: `multer.memoryStorage()` sem dependencia de escrita persistente local
- `UploadService` preparado para S3 em todo o ciclo principal:
  - upload (`PutObject`)
  - delete por URL/chave (`DeleteObject`)
  - listagem e total de tamanho (`ListObjectsV2`)
- Compatibilidade com providers S3-compativeis via `UPLOAD_S3_ENDPOINT` e `UPLOAD_S3_PUBLIC_BASE_URL` (ex.: R2/Spaces).

**Pendencias fora deste bloco:** CDN dedicado e geracao automatica de thumbnails.

**Esforco:** Fechado no MVP de beta (iteracoes futuras opcionais).

---

### 4.2 Docker e deployment

**Estado:** Nao ha Dockerfile, docker-compose, nem scripts de deploy.

**O que construir:**
```
Dockerfile (backend)
Dockerfile (frontend)
docker-compose.yml (dev: backend + frontend + mongo + redis)
.github/workflows/deploy.yml (CI/CD para staging/producao)
```

**Esforco:** Medio (2 dias).

---

### 4.3 Error tracking

**Estado:** FECHADO (2026-03-13) no escopo minimo de beta.

**Entregue:**
- Backend com Sentry ativo por env:
  - init no bootstrap do servidor
  - `captureException` em erros de processo e erros HTTP 5xx
  - flush em shutdown para reduzir perda de eventos
- Frontend com Sentry ativo por env:
  - init no entrypoint React
  - `Sentry.ErrorBoundary` global para captura de crashes de UI
  - env typing dedicado para `VITE_SENTRY_*`
- Operacao fail-safe: sem DSN configurado, a app continua funcional sem envio de eventos.

**Pendencias fora deste bloco:** alertas de erros criticos para Slack/Discord webhook.

**Esforco:** Fechado no MVP de beta (iteracoes futuras opcionais).

---

### 4.4 Monitoring e alertas

**Estado:** Prometheus metrics existem (`/metrics`) mas nao ha dashboards nem alertas automaticos.

**O que construir:**
- Grafana dashboard (ou equivalente cloud)
- Alertas: API response time > 2s, error rate > 5%, DB connection lost
- Health check monitoring externo (UptimeRobot, Better Uptime)

**Esforco:** Baixo-Medio (1 dia).

---

### 4.5 Rate limiting em producao

**Estado:** Rate limiter existe mas usa memoria local (fallback de Redis). Em multi-instancia, os limites sao bypassed.

**O que garantir:**
- Redis obrigatorio para rate limiting em producao
- Configurar limites adequados para beta (mais permissivos que producao final)
- Rate limit especifico para endpoints de auth (brute force protection)

**Esforco:** Baixo (ja esta implementado, so precisa de Redis garantido).

---

## 5. QUALIDADE E POLISH

### 5.1 Testes dos fluxos criticos

**Estado:** Jest, Vitest e Playwright estao configurados. Poucos testes escritos.

**Testes minimos para beta:**

| Fluxo | Tipo | Prioridade |
|-------|------|-----------|
| Registo + login | E2E | Obrigatorio |
| Criar artigo (criador) | E2E | Obrigatorio |
| Publicar conteudo | E2E | Obrigatorio |
| Pesquisar acoes / REITs | E2E | Obrigatorio |
| Admin: moderar conteudo | E2E | Desejavel |
| Admin: suspender user | E2E | Desejavel |
| Rating + comment num conteudo | E2E | Desejavel |

**Esforco:** Medio (3-4 dias para os fluxos obrigatorios).

---

### 5.2 SEO

**Estado:**
- `seo.tsx` existe com React Helmet Async
- index.html tem titulo generico "Vite + React + TS"
- Nao ha sitemap.xml nem robots.txt
- SSR parcial com vite-plugin-ssr (nao totalmente leveraged)

**O que corrigir:**
- Titulo e meta description por pagina (Open Graph, Twitter Cards)
- sitemap.xml gerado automaticamente (rotas publicas + slugs de conteudo)
- robots.txt (permitir crawling de paginas publicas, bloquear admin/dashboard)
- Structured data (JSON-LD) para artigos, cursos, entidades — Google rich results
- index.html: titulo e description dinamicos

**Impacto:** Sem SEO, o conteudo nao aparece no Google. Para uma plataforma de conteudo, isto e critico para crescimento organico.

**Esforco:** Medio (2-3 dias).

---

### 5.3 Analytics real

**Estado:** PostHog instalado (v1.234.1) mas nao esta ligado (eventos vao para console.log).

**O que corrigir:**
- Configurar PostHog com project key real
- Tracking de eventos: page views, sign ups, content views, engagement
- Consent: so activar apos consentimento de cookies
- Funnels: registo → primeiro conteudo, visitante → premium

**Esforco:** Baixo (meio dia).

---

### 5.4 Performance frontend

**Estado:** Vite com code splitting, React Query para cache. Base boa.

**O que verificar antes de beta:**
- Lazy loading de paginas (ja parcial, verificar cobertura)
- Imagens: WebP format, responsive sizes, loading="lazy"
- Bundle size: verificar que nao ha imports pesados desnecessarios
- Lighthouse score: target 80+ em Performance, Accessibility, SEO

**Esforco:** Baixo (1 dia de audit + fixes).

---

## 6. COISAS QUE NAO CONSIDERAMOS — e deviam ser pensadas

### 6.1 Onboarding do utilizador regular (nao criador)

Falamos de onboarding de criadores no P5_CRIADORES. Mas o utilizador regular tambem precisa de orientacao:

**Fluxo sugerido:**
```
Registo
  └─ "O que te interessa?" — selecionar topics (acoes, ETFs, cripto, poupanca, etc.)
  └─ "Segue criadores" — sugerir 3-5 criadores populares por topic
  └─ "Explora ferramentas" — tour rapido pelas market tools
  └─ Dashboard personalizado com base nos topics escolhidos
```

**Impacto:** Sem onboarding, o utilizador regista e nao sabe o que fazer. A taxa de retencao dia 1 vai ser baixa.

---

### 6.2 Sistema de recomendacoes

Nao e preciso ML para comecar. Recomendacoes basicas:

| Tipo | Logica | Esforco |
|------|--------|---------|
| "Conteudo popular" | Top por views/likes na ultima semana | Baixo |
| "Porque segues X" | Conteudo recente dos criadores seguidos | Baixo |
| "Relacionado" | Mesmo criador, mesma categoria, mesmos tags | Baixo |
| "Criadores como X" | Mesmos topics | Baixo |

Nenhum destes requer ML — sao queries MongoDB com os dados que ja existem.

---

### 6.3 Internacionalizacao

**Estado:** i18next esta configurado mas nao ha traducoes. Toda a UI e em portugues hardcoded.

**Para beta PT:** Nao e bloqueante — beta pode ser so em PT.

**Para escala:** Se o objetivo e crescer para Brasil/CPLP/internacional, planear i18n cedo evita rewrite massivo depois. O setup ja existe, falta:
- Extrair strings para ficheiros de traducao
- Definir locale default (pt-PT) e suportados (pt-BR, en)
- Formatar numeros/datas por locale

**Recomendacao:** Para beta, manter PT hardcoded. Mas marcar strings com `t()` nos componentes novos para facilitar migracao futura.

---

### 6.4 Acessibilidade (a11y)

**Estado:** shadcn/ui (Radix) traz a11y basico por defeito. Mas:
- Navegacao por teclado precisa de validacao
- Leitores de ecra precisam de teste
- Contrastes de cor precisam de verificacao (especialmente em dark mode)
- Focus management em modais/dialogs precisa de validacao

**Para beta:** Fazer um audit basico com Lighthouse Accessibility. Target: 80+.

---

### 6.5 Abuse prevention e seguranca

Alem do rate limiting e moderacao que ja existem:

| Risco | Mitigacao | Estado |
|-------|-----------|--------|
| **Bot registration** | CAPTCHA (hCaptcha/Turnstile) no registo | Inexistente |
| **Credential stuffing** | Rate limit agressivo no login + lockout temporario | Parcial (rate limit existe) |
| **Content scraping** | Rate limit em endpoints publicos + User-Agent check | Parcial |
| **XSS em conteudo** | Sanitizar HTML de artigos antes de render | A verificar |
| **CSRF** | Token CSRF em mutations | A verificar |
| **Spam de comments** | Auto-moderacao existe, adicionar CAPTCHA se necessario | Parcial |

**Para beta:** CAPTCHA no registo e login e o minimo. Cloudflare Turnstile e gratuito e facil de implementar.

---

### 6.6 Backup e disaster recovery

**Estado:** Nao ha evidencia de backups automaticos de MongoDB nem de ficheiros.

**Para beta:**
- MongoDB Atlas (ou equivalente) com backups automaticos diarios
- Retencao: minimo 7 dias
- Testar restore pelo menos uma vez antes do beta
- Ficheiros em S3 com versionamento activado

---

### 6.7 Comunicacao com utilizadores

Para alem do email transacional, uma plataforma em beta precisa de comunicar com os utilizadores:

| Canal | Para que | Estado |
|-------|---------|--------|
| **In-app announcements** | Novidades, mudancas, downtime | Announcements system para criadores existe, falta para plataforma |
| **Email newsletter/digest** | Resumo semanal de conteudo | Inexistente |
| **Status page** | Comunicar downtime, incidentes | Inexistente (usar Statuspage.io ou Instatus) |
| **Feedback widget** | Utilizadores reportarem bugs/sugestoes | Inexistente (usar Canny, Intercom, ou form simples) |

---

### 6.8 Metricas de negocio para beta

O admin dashboard ja mostra metricas operacionais. Para beta, precisa-se de metricas de negocio:

| Metrica | Porque | Como |
|---------|--------|------|
| DAU / MAU | Quantos utilizadores activos | lastLoginAt no User model |
| Retencao D1/D7/D30 | Utilizadores que voltam | Cohort analysis por data de registo |
| Conteudo publicado/semana | Velocidade de crescimento | Count por publishedAt |
| Ratio criador/consumer | Saude do marketplace | Count por role |
| Engagement rate | Qualidade do conteudo | (likes+comments+views) / users |
| Time on site | Interesse | PostHog session duration |
| Conversion rate | Eficacia do onboarding | Registos / visitantes |

**Implementacao:** A maioria sao queries MongoDB. Dashboard de metricas de negocio no admin (ou PostHog dashboards).

---

## 7. Checklist pre-beta por prioridade

### 🔴 BLOQUEADORES (sem isto nao se lanca)

- [x] Email service (Resend/SendGrid) — transacional
- [x] Reset de password — endpoint + paginas
- [x] Verificacao de email — endpoint + banner
- [x] Aviso legal financeiro — pagina + footer link
- [x] Termos de servico — pagina com conteudo real
- [x] Politica de privacidade — pagina com conteudo real
- [x] Banner de consentimento de cookies — RGPD
- [x] Paginas de conteudo minimas (explorar, detalhe artigo/curso/video)
- [x] Dashboard de criador minimo (overview, criar, listar)
- [x] Perfil publico de criador activado
- [x] Storage S3 (ou equivalente) — substituir disco local
- [x] Error tracking (Sentry)

### 🟡 IMPORTANTES (deviam existir no beta)

- [ ] OAuth Google — reduz friccao de registo
- [ ] Pesquisa global — utilizador precisa de encontrar conteudo
- [ ] Centro de notificacoes — feedback de engagement
- [ ] Feed "a seguir" — razao para voltar
- [x] Pagina de perfil de utilizador editavel
- [x] Alteracao de password
- [ ] CAPTCHA no registo/login
- [ ] SEO basico (meta tags, sitemap, robots.txt)
- [ ] Analytics real (PostHog configurado)
- [ ] Docker + deploy pipeline
- [ ] Monitoring basico (health check externo)
- [ ] Testes E2E dos fluxos criticos
- [ ] Paginas estaticas (sobre, FAQ, contacto)

### 🟢 DESEJAVEL (pode vir durante o beta)

- [x] Eliminacao de conta / export RGPD
- [ ] Onboarding de utilizador regular
- [ ] Recomendacoes basicas (popular, relacionado)
- [ ] WebSocket para notificacoes real-time
- [ ] Pagina de precos/premium
- [ ] Status page externa
- [ ] Widget de feedback
- [ ] Newsletter digest semanal
- [ ] Metricas de negocio no admin
- [ ] Audit de acessibilidade
- [ ] Lighthouse performance > 80
- [ ] i18n prep (marcar strings com t())

---

## 8. Estimativa de esforco por bloco

| Bloco | Items | Esforco |
|-------|-------|---------|
| Email + auth flows | Reset password, verificacao, email service | 3-4 dias |
| Paginas legais + cookies | 4 paginas + banner RGPD | 2-3 dias |
| Paginas de conteudo publicas | Explore, detalhe artigo/curso/video, lista criadores, perfil | 5-7 dias |
| Dashboard criador minimo | Overview, criar, listar conteudo | 3-4 dias |
| Storage + infra | S3, Sentry, Docker, monitoring | 3-4 dias |
| Auth + seguranca | OAuth Google, CAPTCHA, change password | 2-3 dias |
| SEO + analytics | Meta tags, sitemap, PostHog real | 2-3 dias |
| Pesquisa + feed | Global search, feed "a seguir" | 2-3 dias |
| Testes E2E | Fluxos criticos (registo, criar, publicar, moderar) | 3-4 dias |
| Paginas estaticas | Sobre, FAQ, contacto, precos | 1-2 dias |

**Total estimado para bloqueadores:** ~15-20 dias de trabalho focado.
**Total com importantes:** ~30-35 dias.

---

## 9. Arquitectura — o que esta bem e o que ajustar

### 9.1 Pontos fortes

- **Separacao limpa** controller → service → model — facil de estender
- **TypeScript end-to-end** — type safety real
- **Audit trail robusto** — compliance e debugging facilitados
- **Feature flags (surfaceControl)** — rollout gradual possivel
- **Moderacao sofisticada** — trust scoring, auto-moderacao, guardrails
- **shadcn/ui + Tailwind** — UI consistente, dark mode built-in
- **React Query** — cache, invalidacao, loading/error states
- **Zustand** — state management simples e eficaz
- **37 models MongoDB** — schema rico e bem indexado

### 9.2 Divida tecnica a monitorizar

| Item | Risco | Quando tratar |
|------|-------|--------------|
| **Mock data disperso** | Mocks esquecidos em producao | Antes do beta — audit sistematico |
| **Tipos frontend ↔ backend desalinhados** | Runtime errors | Ao implementar cada feature — alinhar tipos |
| **2 models de marcas** (Brand + DirectoryEntry) | Confusao, dados duplicados | Fase 2 — unificar |
| **localStorage para ficheiros** | Dados perdidos ao limpar browser | Antes do beta — migrar para API |
| **console.log analytics** | Sem dados reais | Antes do beta — ligar PostHog |
| **index.html titulo generico** | SEO zero, ma primeira impressao | Antes do beta — meta tags |
| **Upload disco local** | Nao escala, dados perdidos em deploy | Antes do beta — S3 |
| **175 erros TS pre-existentes** | Build warnings, potenciais bugs | Gradual — isolar em admin/auth |

---

## 10. Recomendacao final

### Ordem de ataque sugerida

```
Semana 1-2: FUNDACOES
├─ Email service + reset password + verificacao
├─ S3 storage (substituir disco local)
├─ Sentry error tracking
├─ Docker + deploy basico
└─ Paginas legais (termos, privacidade, aviso financeiro, cookies)

Semana 3-4: CONTEUDO PUBLICO
├─ Pagina explore (listagem agregada)
├─ Pagina detalhe de artigo (com comments, ratings)
├─ Pagina detalhe de curso
├─ Pagina detalhe de video
├─ Lista de criadores + perfil publico
└─ SEO basico (meta tags, sitemap)

Semana 5-6: CRIADOR MVP
├─ Dashboard overview com KPIs
├─ Criar/editar/publicar artigo (flow completo)
├─ Criar/editar/publicar video (flow completo)
├─ Backend Reels + Playlists (P5_CRIADORES 1.1, 1.2)
├─ Backend Announcements (P5_CRIADORES 1.3)
└─ Endpoint /api/creators (listagem publica)

Semana 7-8: POLISH E LANCAMENTO
├─ OAuth Google
├─ Pesquisa global
├─ Notificacoes (centro + pagina)
├─ Feed "a seguir"
├─ CAPTCHA
├─ Analytics (PostHog real)
├─ Testes E2E dos fluxos criticos
├─ Paginas estaticas (sobre, FAQ, contacto)
└─ Audit final: mocks, tipos, performance, a11y
```

### Principio orientador

Para beta, o objetivo nao e ter tudo perfeito. E ter:
1. **Um ciclo completo funcional** — utilizador regista → descobre conteudo → interage
2. **Um ciclo de criador funcional** — criador regista → cria conteudo → publica → ve feedback
3. **Seguranca e legal minimos** — email verificado, password reset, RGPD, disclaimer financeiro
4. **Infra que nao cai** — S3, error tracking, monitoring, backups

Tudo o resto pode ser iterado durante o beta com feedback real.
