# P6 - Security Checklist Operacional (T6)

Data: 2026-03-08
Status: ativo
Escopo: `API_finhub`

## 1) Guardas de runtime

Implementado em `src/config/runtimeSecurity.ts` e ativado no bootstrap (`src/server.ts`):

1. valida presença de `JWT_SECRET` e `JWT_REFRESH_SECRET`;
2. valida formato de `HTTP_JSON_BODY_LIMIT`;
3. em `staging/production`, bloqueia:
- `CORS_ALLOW_ALL=true`;
- `FRONTEND_URL` vazio;
- secrets fracos/placeholder;
- body limit acima de `2mb`.

Falha de validação em runtime aborta startup com erro explícito.

## 2) Checklist por ambiente

### dev

1. `NODE_ENV=development`
2. `CORS_ALLOW_ALL=false`
3. `HTTP_JSON_BODY_LIMIT<=2mb`

### staging

1. `NODE_ENV=staging`
2. `FRONTEND_URL` definido
3. `CORS_ALLOW_ALL=false`
4. `JWT_SECRET` e `JWT_REFRESH_SECRET` >= 32 chars e sem placeholders
5. `HTTP_JSON_BODY_LIMIT<=2mb`

### prod

1. `NODE_ENV=production`
2. mesmos requisitos de `staging`
3. `SENTRY_DSN` recomendado

## 3) Evidencia automatizada (baseline)

```bash
npm run test:security:smoke
```

Smoke implementado em `scripts/security-config-smoke.js`:

1. valida chaves obrigatórias em `.env.example`;
2. valida defaults de CORS/body limit;
3. valida placeholders de secrets para evitar ambiguidade operacional.
