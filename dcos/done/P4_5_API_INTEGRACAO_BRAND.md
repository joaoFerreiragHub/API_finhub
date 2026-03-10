# P4.5 - API de Integracao de Marcas (Backend)

## Objetivo

Este documento define o contrato tecnico da integracao externa para afiliacao de marcas.
O escopo atual cobre leitura de overview, links e cliques via API key gerida no brand portal.

## Base URLs

- Brand portal (gestao de keys): `/api/brand-portal/integrations/api-keys`
- Integracao externa (consumo por API key): `/api/integrations/brand`

## Autenticacao

A autenticacao da integracao externa usa API key por header.

- Header recomendado: `x-finhub-api-key: <apiKey>`
- Alternativo: `Authorization: ApiKey <apiKey>`
- Alternativo: `Authorization: Bearer <apiKey>`

As API keys aceitam scopes. Scope atual disponivel:

- `brand.affiliate.read`

## Endpoints - Brand Portal (owner authenticated)

### GET `/api/brand-portal/integrations/api-keys`

Lista API keys owned pelo utilizador autenticado.

Query params opcionais:

- `directoryEntryId`
- `isActive` (`true|false|1|0`)
- `page`
- `limit`

### POST `/api/brand-portal/integrations/api-keys`

Cria API key para um `DirectoryEntry` owned.

Body:

- `directoryEntryId` (obrigatorio)
- `label` (opcional)
- `scopes` (opcional, atual: `brand.affiliate.read`)
- `expiresAt` (opcional, data futura)
- `metadata` (opcional)

Resposta inclui `apiKey` completo apenas na criacao.

### POST `/api/brand-portal/integrations/api-keys/:keyId/revoke`

Revoga API key owned.

### GET `/api/brand-portal/integrations/api-keys/:keyId/usage`

Lista uso operacional da key.

Query params opcionais:

- `days`
- `method`
- `statusCodeFrom`
- `statusCodeTo`
- `page`
- `limit`

## Endpoints - Integracao Externa (API key)

Todos os endpoints abaixo exigem scope `brand.affiliate.read`.

### GET `/api/integrations/brand/affiliate/overview`

Query params opcionais:

- `days`

### GET `/api/integrations/brand/affiliate/links`

Query params opcionais:

- `isActive` (`true|false|1|0`)
- `search`
- `page`
- `limit`

### GET `/api/integrations/brand/affiliate/links/:linkId/clicks`

Query params opcionais:

- `converted` (`true|false|1|0`)
- `days`
- `from` (ISO date)
- `to` (ISO date)
- `page`
- `limit`

## Rate limiting

### Integracao externa

Aplicado limiter dedicado `rateLimiter.brandIntegration` com chave por API key (hash do prefix/token).

Defaults:

- janela: `60s`
- limite: `120 requests`

Env vars:

- `RATE_LIMIT_BRAND_INTEGRATION_WINDOW_MS`
- `RATE_LIMIT_BRAND_INTEGRATION_MAX`

### Brand portal

Gestao de API keys usa `rateLimiter.api` (chave por user autenticado ou IP fallback).

Env vars:

- `RATE_LIMIT_API_WINDOW_MS`
- `RATE_LIMIT_API_MAX`

## Logging de uso

Cada request autenticado na API de integracao gera registo em `BrandIntegrationApiUsage` com:

- key prefix
- scope
- method/path
- status code
- duration
- request id
- ip hash
- user agent

Retencao configuravel por env var:

- `BRAND_INTEGRATION_API_USAGE_RETENTION_DAYS` (default 120, min 7, max 365)

## Erros comuns

- `401` API key ausente/invalida/expirada
- `403` scope insuficiente
- `404` recurso nao encontrado no contexto da key
- `429` rate limit excedido

## Exemplos curl

```bash
curl -H "x-finhub-api-key: <API_KEY>" \
  "http://localhost:5000/api/integrations/brand/affiliate/overview?days=30"
```

```bash
curl -H "x-finhub-api-key: <API_KEY>" \
  "http://localhost:5000/api/integrations/brand/affiliate/links?page=1&limit=20"
```

```bash
curl -H "x-finhub-api-key: <API_KEY>" \
  "http://localhost:5000/api/integrations/brand/affiliate/links/<LINK_ID>/clicks?days=7"
```
