# P4.1 - Portal de Marca (Backend)

## Objetivo

Fechar a base do portal de marca para owners de `DirectoryEntry`, com leitura consolidada de ownership e performance.

## Endpoints

- `GET /api/brand-portal/overview`
- `GET /api/brand-portal/directories`

## Garantias implementadas

### Ownership enforcement

As respostas do portal consideram apenas entradas de diretorio com `ownerUser` igual ao utilizador autenticado.

### Overview consolidado

`GET /overview` agrega:

- entradas owned (resumo de ownership);
- campanhas da marca por estado;
- campanhas live;
- totais de campanha (`impressions`, `clicks`, `conversions`, `ctr`);
- timeline de delivery por dia no intervalo solicitado.

Parametro suportado:

- `days` (opcional, inteiro positivo; janela efetiva limitada internamente).

### Contratos de request

Foram adicionados contratos dedicados para:

- `validateBrandPortalOverviewContract`;
- `validateBrandPortalDirectoriesContract`.

## Rate limiting

As duas rotas base do portal usam `rateLimiter.api`.

Env vars relevantes:

- `RATE_LIMIT_API_WINDOW_MS`
- `RATE_LIMIT_API_MAX`

## Erros operacionais relevantes

- `400` query invalida (ex.: `days` invalido)
- `401` autenticacao ausente
- `500` erro inesperado de backend

## Notas

- O P4.1 fecha a camada base do portal de marca.
- Fluxos de wallet, campanhas self-service, afiliacao e integracao seguem nas fases P4.2 a P4.5.
