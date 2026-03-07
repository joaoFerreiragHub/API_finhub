# Roadmap Beta - Execucao Semanal

Data: 2026-03-06
Objetivo: executar o beta fechado em ordem controlada, com entrega e commit por ponto.
Base: `dcos/ROADMAP_BETA.md` + `dcos/P5_PRE_BETA_PLATAFORMA.md`.

## 0) Estado de Execucao

| ID | Estado | Data | Entrega |
|---|---|---|---|
| O1-01 | concluido | 2026-03-06 | Servico de email transacional com providers (`resend`, `sendgrid`, `console`, `disabled`), welcome email no registo e endpoint `POST /api/auth/email/test`. |
| O1-02 | concluido | 2026-03-06 | Fluxo de reset de password com `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`, token seguro com expiracao e invalidacao de sessoes apos reset. |
| O1-03 | concluido | 2026-03-06 | Verificacao de email com `GET /api/auth/verify-email`, `POST /api/auth/resend-verification`, token com expiracao e guard `requireVerifiedEmail` nas acoes criticas (criar/publicar conteudo e comentar). |
| O1-04 | em_curso (backend fechado) | 2026-03-06 | API publica de documentos legais (`/api/platform/legal/*`), aceite legal obrigatorio no registo e update de consentimento de cookies em `PATCH /api/auth/cookie-consent`. Pendente frontend (paginas e banner). |
| O1-05 | concluido | 2026-03-07 | Upload service com provider `local|s3`, envio para bucket S3 (com fallback local seguro), delete/list/stats compativeis com S3 e configuracao por env para endpoint S3 compativel. |
| O1-06 | concluido | 2026-03-07 | Integracao Sentry no backend (`SENTRY_*`), captura global de erros HTTP/processo com flush em shutdown e endpoint de monitorizacao publica `GET /api/platform/monitoring/status`. |
| O1-07 | concluido | 2026-03-07 | Dockerizacao backend (`Dockerfile`, `.dockerignore`, `docker-compose.yml`) + CI com smoke build da imagem e pipeline de publish para GHCR em `.github/workflows/deploy.yml`. |
| O1-08 | em_curso (fase backend) | 2026-03-07 | Hardening de moderacao pre-release com smoke JWT real (`scripts/moderation-pre-release-smoke.ps1` + `npm run test:moderation:pre-release`), carregamento automatico de `.env/.env.local`, variaveis de execucao em `.env.example` e runbook operacional `dcos/RUNBOOK_MODERATION_PRE_RELEASE.md`. |
| O1-09 | concluido | 2026-03-07 | Quick fixes tecnicos no backend concluidos: crypto market cap com CoinGecko, overlap ETF com disclaimer explicito de estimativa e endpoint batch watchlist `GET /api/stocks/batch-snapshot` (validado com `typecheck + build + contract:openapi`). |
| O2-04 | concluido | 2026-03-07 | Endpoint publico de creators entregue em `GET /api/creators` com filtros base (`search`, `minFollowers`, `minRating`, `emailVerified`, paginacao e sort por `followers|rating|newest|recent`), incluindo rating agregado por creator (validado com `typecheck + build + contract:openapi`). |

## 1) Gate de Beta

Go-live de beta fechado so e permitido quando os dois gates abaixo estiverem verdes:

1. Gate tecnico:
   - auth robusto (register/login/refresh/logout)
   - email transacional funcional
   - storage escalavel (S3 ou equivalente)
   - error tracking e monitoring ativos
   - rate limiter distribuido validado
2. Gate produto/legal:
   - termos, privacidade, cookies e aviso financeiro publicados
   - paginas publicas minimas funcionais
   - ciclo minimo de criador funcional

## 2) Sequencia Semanal (8 semanas)

### Semana 1-2 - Fundacao (Onda 1)

1. O1-01: servico de email transacional (Resend/SendGrid por env).
2. O1-02: forgot/reset password (endpoint + token + pages frontend).
3. O1-03: verificacao de email (token + guardas minimas).
4. O1-04: legal pages e cookie consent.
5. O1-05: S3/object storage para uploads.
6. O1-06: Sentry + monitorizacao externa basica.
7. O1-07: Docker + CI deploy basico.
8. O1-08: hardening moderacao pre-release (JWT real, runbooks, E2E criticos).
9. O1-09: quick fixes ferramentas (crypto market cap, ETF overlap disclaimer, watchlist batch).

### Semana 3-4 - Conteudo Publico (Onda 2 parcial)

1. O2-01: pagina explorar agregada.
2. O2-02: detalhe artigo/video/curso (MVP publico).
3. O2-03: listagem de criadores + perfil publico.
4. O2-04: endpoint publico `/api/creators` com filtros base.
5. O2-05: SEO base (meta, sitemap, robots).

### Semana 5-6 - Criador MVP (Onda 2)

1. O2-06: dashboard criador overview ligado a API.
2. O2-07: fluxo criar/editar/publicar artigo.
3. O2-08: fluxo criar/editar/publicar video.
4. O2-09: backend Reels CRUD.
5. O2-10: backend Playlists CRUD.
6. O2-11: backend Announcements CRUD.
7. O2-12: importacao URL externa (oEmbed MVP).

### Semana 7-8 - Polish + RC Beta

1. O3-01: OAuth Google.
2. O3-02: pesquisa global.
3. O3-03: centro de notificacoes.
4. O3-04: feed "a seguir" cronologico.
5. O3-05: CAPTCHA em auth.
6. O3-06: analytics real (PostHog) com consentimento.
7. O3-07: E2E fluxos obrigatorios de release.
8. O3-08: auditoria final (mocks, tipos, performance, a11y).

## 3) Ordem de Execucao "1 a 1" (imediata)

A partir de agora executar estritamente na ordem abaixo:

1. O1-01 Email transacional.
2. O1-02 Forgot/reset password.
3. O1-03 Verificacao de email.
4. O1-04 Legal pages + cookies.
5. O1-05 Storage S3.
6. O1-06 Sentry + monitoring.
7. O1-07 Docker + CI.
8. O1-08 Moderation hardening.
9. O1-09 Fixes ferramentas.

Nota: so avancar para o item seguinte quando o anterior estiver com commit e validacao minima concluida.

## 4) Definition of Done por ponto

Cada ponto so fecha quando tiver:

1. Implementacao backend/frontend necessaria.
2. Validacao tecnica minima (`npm run typecheck` e checks adicionais conforme impacto).
3. Atualizacao da documentacao em `dcos`.
4. Commit dedicado com referencia ao ponto (ex: `feat(auth): O1-01 email transacional`).
5. Working tree limpo para os ficheiros do ponto.

## 5) Criterios Go/No-Go do beta fechado

Antes de convidar users:

1. Verificacao + reset email testados em contas reais de teste.
2. 0 token `dev-*` em fluxos protegidos.
3. Sentry a capturar erro de teste em staging.
4. Paginas legais e disclaimer financeiro visiveis.
5. Fluxo E2E minimo verde: registo -> login -> consumir conteudo -> criador publicar -> admin moderar.
6. Paginas criticas carregam em SLA aceitavel (publicas <3s, ferramentas <5s em ambiente alvo).

