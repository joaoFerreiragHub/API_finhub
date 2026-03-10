# P4.4 - Sistema de Afiliacao (Backend)

## Objetivo

Fechar o backend de afiliacao com tracking de clique, gestao de links, overview admin e conversao automatica via postback.

## Endpoints existentes

### Publico

- `GET /api/affiliates/r/:code`
  - resolve o link por `code`
  - regista clique em `AffiliateClick`
  - faz redirect 302 para `destinationUrl`
  - adiciona query params tecnicos de tracking no redirect:
    - `fh_click_id`
    - `fh_aff_code`

- `POST /api/affiliates/postback/conversion`
  - endpoint para callback de parceiro externo
  - marca clique como convertido via `clickId`
  - idempotencia por `conversionReference`

### Brand portal (owner authenticated)

- `GET /api/brand-portal/affiliate-links`
- `POST /api/brand-portal/affiliate-links`
- `PATCH /api/brand-portal/affiliate-links/:linkId`
- `GET /api/brand-portal/affiliate-links/:linkId/clicks`

### Admin monetizacao

- `GET /api/admin/monetization/affiliates/overview`
- `GET /api/admin/monetization/affiliates/links`
- `POST /api/admin/monetization/affiliates/clicks/:clickId/convert`

## Seguranca do postback

`POST /api/affiliates/postback/conversion` exige segredo partilhado.

Header aceites:

- `x-affiliate-postback-secret: <secret>`
- `Authorization: Bearer <secret>`
- `Authorization: ApiKey <secret>`

Configuracao:

- `AFFILIATE_POSTBACK_SECRET`

Comportamento:

- sem segredo configurado: `503`
- segredo invalido/ausente: `401`

## Payload postback

Body JSON:

- `clickId` (obrigatorio)
- `valueCents` (opcional)
- `value` (opcional, convertido para centimos)
- `currency` (opcional)
- `reference` (opcional, usado para idempotencia)
- `provider` (opcional)
- `metadata` (opcional)
- `force` (opcional)

Resposta:

- `updated=true` quando marca conversao
- `updated=false` quando clique ja estava convertido e `force=false`

## Rate limiting e contratos

- rotas de afiliacao no brand portal usam `rateLimiter.api`
- postback usa `rateLimiter.api`
- endpoints admin de afiliacao usam limiter e contratos de request
- contratos de request aplicados em:
  - brand portal afiliacao
  - admin afiliacao
  - redirect publico
  - postback de conversao

## Exemplo postback

```bash
curl -X POST "http://localhost:5000/api/affiliates/postback/conversion" \
  -H "Content-Type: application/json" \
  -H "x-affiliate-postback-secret: <AFFILIATE_POSTBACK_SECRET>" \
  -d '{
    "clickId": "67d0a9ff4c6f4dbf8d73d1e1",
    "value": 32.5,
    "currency": "EUR",
    "reference": "provider-conv-123",
    "provider": "impact",
    "metadata": { "campaign": "spring-2026" }
  }'
```
