# RUNBOOK - Moderation Control Plane

Data: 2026-03-20  
Escopo: operacao diaria de moderacao no FinHub (kill switch, rollback em massa e revisao de false positives).

## 1) Ativar/Desativar kill switch por superficie

### Quando usar
- incidente em superficie publica (spam, abuso, queda de integracao, risco legal);
- necessidade de conter exposicao enquanto a equipa investiga.

### Pre-requisitos
- admin autenticado com escopo `admin.platform.write` (escrita) e `admin.platform.read` (leitura);
- motivo operacional obrigatorio para qualquer alteracao.

### Procedimento
1. Ler estado atual:
   - `GET /api/admin/platform/surfaces`
2. Escolher `surfaceKey` alvo (ex: `editorial_home`, `creator_page`, `comments_write`).
3. Atualizar estado:
   - `POST /api/admin/platform/surfaces/:surfaceKey`
   - body:
```json
{
  "enabled": false,
  "reason": "Contencao operacional durante incidente",
  "note": "Ticket INC-123",
  "publicMessage": "Funcionalidade temporariamente indisponivel."
}
```
4. Verificar propagacao:
   - `GET /api/admin/platform/surfaces`
   - `GET /api/platform/surfaces/:surfaceKey` (canal publico)
5. Confirmar evidencias de auditoria:
   - `GET /api/admin/audit-logs?action=admin.platform.surfaces.update`

### Reverter (reativar superficie)
1. `POST /api/admin/platform/surfaces/:surfaceKey` com `enabled: true`.
2. Registar motivo de reativacao.
3. Validar no endpoint publico que a superficie voltou a `enabled=true`.

## 2) Rollback de moderacao em massa

### Quando usar
- lote de moderacao aplicado com impacto indevido;
- necessidade de restaurar visibilidade/estado anterior em multiplos alvos.

### Pre-requisitos
- admin com escopo `admin.content.moderate`;
- lista de itens com `contentType`, `contentId` e `eventId` do evento a reverter.

### Procedimento
1. Criar job de rollback:
   - `POST /api/admin/content/bulk-rollback/jobs`
```json
{
  "reason": "Rollback operacional por falso positivo em lote",
  "note": "INC-123",
  "confirm": true,
  "markFalsePositive": true,
  "items": [
    { "contentType": "article", "contentId": "id-1", "eventId": "evt-1" }
  ]
}
```
2. Submeter para revisao:
   - `POST /api/admin/content/jobs/:jobId/request-review`
3. Aprovar lote (quando aplicavel):
   - `POST /api/admin/content/jobs/:jobId/approve`
   - incluir `confirm`, `falsePositiveValidated` e amostra revista quando exigido.
4. Acompanhar execucao:
   - `GET /api/admin/content/jobs/:jobId`
   - `GET /api/admin/content/jobs/worker-status`
5. Confirmar resultado:
   - job em `completed` ou `completed_with_errors`;
   - revisar itens falhados e reexecutar apenas os pendentes/falhados.

### Rollback do rollback (se necessario)
1. Rever historico por alvo:
   - `GET /api/admin/content/:contentType/:contentId/history`
2. Gerar novo lote corretivo com os eventos apropriados.

## 3) Revisao de false positives

### Objetivo
Reduzir ruido de moderacao, corrigir alvos validos e alimentar qualidade de policy/trust.

### Procedimento
1. Identificar alvo suspeito:
   - `GET /api/admin/content/queue?flaggedOnly=true`
2. Rever contexto:
   - reports do alvo: `GET /api/admin/content/:contentType/:contentId/reports`
   - historico: `GET /api/admin/content/:contentType/:contentId/history`
   - pre-check de rollback: `GET /api/admin/content/:contentType/:contentId/rollback-review?eventId=...`
3. Aplicar correcao:
   - reativacao direta: `POST /api/admin/content/:contentType/:contentId/unhide` com `markFalsePositive=true`
   - ou rollback assistido: `POST /api/admin/content/:contentType/:contentId/rollback` com `markFalsePositive=true`
4. Validar resultado:
   - evento novo no historico com metadata `falsePositiveMarked=true`;
   - estado final coerente com o alvo (`visible`, `restricted`, etc.).
5. Fechar ciclo operacional:
   - confirmar registo em `GET /api/admin/audit-logs`;
   - monitorizar impacto em metricas/alertas internos para evitar recorrencia.

## Checklist rapida de incidente
- Kill switch aplicado na superficie correta.
- Auditoria administrativa confirmada.
- Job de rollback monitorizado ate estado terminal.
- False positives corrigidos e etiquetados.
- Evidencias anexadas ao ticket de incidente.
