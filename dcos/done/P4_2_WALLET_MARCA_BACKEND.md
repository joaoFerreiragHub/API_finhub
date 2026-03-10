# P4.2 - Wallet de Marca (Backend)

## Objetivo

Fechar o backend de wallet para marcas com:

- leitura de saldo e historico no portal da marca;
- criacao de pedidos de top-up no portal;
- fila administrativa para aprovar/rejeitar/cancelar top-ups;
- contratos de request e rate limiting nas rotas wallet.

## Endpoints do brand portal

- `GET /api/brand-portal/wallets`
- `GET /api/brand-portal/wallets/:directoryEntryId`
- `GET /api/brand-portal/wallets/:directoryEntryId/transactions`
- `POST /api/brand-portal/wallets/:directoryEntryId/top-up-requests`

## Endpoints admin (monetization)

- `GET /api/admin/monetization/brand-wallets/top-up-requests`
- `POST /api/admin/monetization/brand-wallets/top-up-requests/:transactionId/approve`
- `POST /api/admin/monetization/brand-wallets/top-up-requests/:transactionId/reject`

## Garantias implementadas

### Ownership enforcement (portal)

Todas as operacoes no portal validam ownership por `DirectoryEntry.ownerUser`.

### Settlement administrativo

- aprovar top-up move transacao para `completed`, define `settledAt` e credita saldo (`balanceCents`) e creditos acumulados (`lifetimeCreditsCents`) na wallet;
- rejeitar/cancelar top-up define `status` (`failed` por default, `cancelled` opcional) e `settledAt`;
- decisoes guardam metadata administrativa (`reason`, `note`, `actorUserId`, `processedAt`, `force`).

### Listagem administrativa com filtros

`GET /monetization/brand-wallets/top-up-requests` suporta:

- `status`
- `ownerUserId`
- `directoryEntryId`
- `search`
- `page`, `limit`

Resposta inclui pagina, resumo por status e montantes agregados.

### Contratos de request e limiter

Contratos adicionados para todas as rotas wallet do portal e admin.

Limiter aplicado:

- portal wallet: `rateLimiter.api`
- admin listagem: `rateLimiter.adminMetricsDrilldown`
- admin approve/reject: `rateLimiter.adminModerationAction`

## Scopes admin usados

- leitura da fila: `admin.brands.read`
- approve/reject: `admin.brands.write`

## Erros operacionais relevantes

- `400` payload/query invalido (inclui `reason` obrigatorio no approve/reject)
- `403` sem ownership/permissao
- `404` transacao/wallet nao encontrada
- `409` conflito de estado no settlement (ex.: top-up ja concluido)

## Notas

- A fase P4.2 fecha wallet base + settlement admin.
- A correccao de duplicacao de indexes continua fora deste scope, conforme regra operacional em curso.
