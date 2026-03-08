# P6 - Data Index Baseline (T5)

Data: 2026-03-08
Status: ativo
Escopo: `API_finhub`

## Objetivo

Definir um baseline minimo de indices obrigatorios para rotas/fluxos com maior risco operacional, reduzindo regressao de performance em listagens admin e trilhos de moderacao.

## Indices obrigatorios (baseline)

1. `AdminAuditLogSchema.index({ actor: 1, createdAt: -1 })`
2. `ContentReportSchema.index({ status: 1, createdAt: -1 })`
3. `ContentReportSchema.index({ contentType: 1, contentId: 1, status: 1, createdAt: -1 })`
4. `ContentModerationEventSchema.index({ contentType: 1, contentId: 1, createdAt: -1 })`
5. `AdminContentJobSchema.index({ status: 1, leaseExpiresAt: 1 })`
6. `UserModerationEventSchema.index({ user: 1, createdAt: -1 })`
7. `NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 })`

## Validacao tecnica

```bash
npm run test:perf:indexes
```

Smoke implementado em `scripts/perf-index-smoke.js`.
