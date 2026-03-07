# Runbook Moderation Pre-Release (O1-08)

Data: 2026-03-07  
Escopo: backend `API_finhub` (`P4-MODERATION-HARDENING`)

## 1) Objetivo

Ter um procedimento unico para validar e operar moderacao antes do beta fechado, com:

1. sessao real JWT (sem `dev-*`);
2. fluxo critico de moderacao validado ponta a ponta;
3. acao rapida em incidente (hide-fast, rollback assistido, kill switch).

## 2) Preconditions obrigatorias

1. API a correr e com Mongo/Redis operacionais.
2. Conta admin real ativa com scopes admin necessarios.
3. Conta reporter real ativa.
4. Alvo real para teste (`targetType` + `targetId`) existente.
5. Sem bypass TLS de ambiente (`NODE_TLS_REJECT_UNAUTHORIZED=0` proibido).

## 3) Smoke de moderacao (JWT real)

Script oficial:

```bash
npm run test:moderation:pre-release
```

Variaveis necessarias (`.env` ou shell):

1. `MODERATION_SMOKE_ADMIN_EMAIL`
2. `MODERATION_SMOKE_ADMIN_PASSWORD`
3. `MODERATION_SMOKE_REPORTER_EMAIL`
4. `MODERATION_SMOKE_REPORTER_PASSWORD`
5. `MODERATION_SMOKE_TARGET_TYPE`
6. `MODERATION_SMOKE_TARGET_ID`
7. opcional: `MODERATION_SMOKE_REPORT_REASON`

Notas de resolucao de variaveis:

1. O script carrega automaticamente `.env` e `.env.local` na raiz do projeto.
2. Variaveis ja definidas no processo/shell têm precedencia sobre os ficheiros.
3. Em CI, preferir injetar via variaveis de ambiente seguras.

Fluxo validado pelo smoke:

1. login admin + reporter;
2. assert de token JWT real (nao `dev-*`);
3. report de conteudo;
4. queue admin flagged;
5. hide-fast;
6. rollback-review + rollback assistido;
7. leitura de worker-status + internal alerts.

## 4) Playbooks operacionais

### 4.1 Incidente de spam coordenado

1. abrir `/api/admin/content/queue?flaggedOnly=true`.
2. aplicar `hide-fast` nos alvos com prioridade alta/critica.
3. se incidente for transversal, ativar kill switch de superficie.
4. monitorizar `GET /api/admin/alerts/internal` e `GET /api/admin/metrics/overview`.
5. documentar acao e motivo no ticket/incidente.

### 4.2 Reversao segura (falso positivo)

1. consultar `rollback-review` com `eventId`.
2. confirmar `canRollback=true` e warnings/blockers.
3. executar rollback com `confirm=true` quando exigido.
4. marcar `markFalsePositive=true` quando aplicavel.
5. validar queue, reports e trust profile apos reversao.

### 4.3 Degradacao do worker de jobs

1. validar `GET /api/admin/content/jobs/worker-status`.
2. verificar backlog (`awaitingApproval`, `queued`, `running` stale).
3. se necessario, reiniciar processo worker dedicado.
4. confirmar heartbeat/lease a atualizar.

## 5) Criterios de aceite O1-08 (backend)

1. smoke `test:moderation:pre-release` verde com JWT real.
2. 0 dependencia de `dev-*` para validar rotas protegidas.
3. runbook atualizado e versionado em `dcos`.
4. evidencias de queue/reports/hide-fast/rollback/worker-status disponiveis.

## 6) Comandos de apoio

```bash
npm run typecheck
npm run test:admin:scopes
npm run test:moderation:pre-release
```
