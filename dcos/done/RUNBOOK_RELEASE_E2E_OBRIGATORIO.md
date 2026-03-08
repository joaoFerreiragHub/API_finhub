# Runbook Release E2E Obrigatorio (O3-07)

Data: 2026-03-08  
Escopo: backend `API_finhub` + frontend `FinHub-Vite`

## 1) Objetivo

Validar o fluxo minimo de go/no-go do beta fechado:

1. registo;
2. login;
3. consumir conteudo;
4. creator publicar;
5. admin moderar.

## 2) Script oficial backend

Comando:

```bash
npm run test:release:e2e
```

Script: `scripts/release-e2e-required-flows.ps1`

## 3) Variaveis necessarias

Obrigatorias:

1. `RELEASE_E2E_CREATOR_EMAIL`
2. `RELEASE_E2E_CREATOR_PASSWORD`
3. `RELEASE_E2E_ADMIN_EMAIL`
4. `RELEASE_E2E_ADMIN_PASSWORD`

Opcional:

1. `RELEASE_E2E_CAPTCHA_TOKEN` (apenas quando CAPTCHA estiver ativo no backend)

## 4) Fluxo validado

1. `GET /healthz`
2. registo de consumidor (`POST /api/auth/register`)
3. login consumidor, creator e admin (`POST /api/auth/login`)
4. creator cria artigo draft + publica (`POST /api/articles`, `PATCH /api/articles/:id/publish`)
5. consumidor consome artigo + favorite + report (`GET /api/articles/:slug`, `POST /api/favorites`, `POST /api/reports/content`)
6. admin executa `hide-fast` e rollback assistido

## 5) Criterios de aceite

1. tokens de login validos em formato JWT (sem `dev-*`);
2. artigo publicado e visivel no endpoint publico;
3. hide-fast aplicado com evento em historico;
4. rollback com `canRollback=true` e resposta de sucesso.
