# P4.3 - Campanhas Self-Service (Backend)

## Objetivo

Fechar o backend de campanhas self-service para marcas com ownership enforcement, contratos de request e gate de orcamento por wallet.

## Endpoints do brand portal

- `GET /api/brand-portal/campaigns`
- `POST /api/brand-portal/campaigns`
- `GET /api/brand-portal/campaigns/:campaignId`
- `PATCH /api/brand-portal/campaigns/:campaignId`
- `POST /api/brand-portal/campaigns/:campaignId/submit-approval`
- `GET /api/brand-portal/campaigns/:campaignId/metrics`

## Garantias implementadas

### Ownership enforcement

Todas as operacoes usam validacao de ownership por `DirectoryEntry.ownerUser`:

- a campanha tem de pertencer a um `DirectoryEntry` owned pelo utilizador autenticado;
- mudanca de `directoryEntryId` no patch so e permitida para outro entry owned.

### Contratos de request

Foram adicionados contratos dedicados para:

- listagem (query de filtros/paginacao);
- criacao (payload completo);
- update (payload `patch` com campos permitidos);
- submit para aprovacao;
- leitura de metricas.

### Gate de orcamento por wallet

Antes de aceitar campanha com orcamento:

- em `create` e `update`, quando `estimatedMonthlyBudget` e enviado, valida cobertura na wallet;
- em `submit-approval`, `estimatedMonthlyBudget` passa a ser obrigatorio (> 0) e e validada cobertura na wallet.

Regra aplicada:

- `requiredCents = round(estimatedMonthlyBudget * 100)`
- `availableCents = wallet.balanceCents - wallet.reservedCents`
- se `availableCents < requiredCents`, resposta `409`.

## Rate limiting

As rotas de campanhas no brand portal usam `rateLimiter.api`.

Env vars:

- `RATE_LIMIT_API_WINDOW_MS`
- `RATE_LIMIT_API_MAX`

## Erros operacionais relevantes

- `400` payload invalido ou `estimatedMonthlyBudget` ausente/invalido no submit
- `403` campanha/directory sem ownership
- `404` campanha nao encontrada
- `409` saldo insuficiente da wallet para o orcamento mensal

## Notas

- O gate atual faz validacao de cobertura no momento da operacao.
- Reserva contabilistica (`reservedCents`) por campanha pode ser evolucao futura se for necessario lock de saldo por ciclo de aprovacao.
