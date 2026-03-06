# Roadmap Beta - Execucao Semanal

Data: 2026-03-06
Objetivo: executar o beta fechado em ordem controlada, com entrega e commit por ponto.
Base: `dcos/ROADMAP_BETA.md` + `dcos/P5_PRE_BETA_PLATAFORMA.md`.

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
