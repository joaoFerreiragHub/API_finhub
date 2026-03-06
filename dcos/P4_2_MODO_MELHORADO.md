# P4.2 Modo Melhorado - Admin Front + Backend

Data: 2026-03-05
Estado: Fechado (P4.2 concluido tecnicamente)
Escopo: `API_finhub` + `FinHub-Vite`

## 1) Resultado da analise do ficheiro `propostas-melhorias-admin.md`

O ficheiro base esta bom como inventario inicial e cobre riscos reais de seguranca, operacao e UX.
Depois de cruzar com o codigo atual e com a revisao de prioridade, este e o backlog consolidado por severidade tecnica e prioridade de execucao.

### 1.1 Matriz consolidada (severidade x prioridade)

| ID | Tema | Severidade | Prioridade | Obrigatorio para fechar P4.2 | Observacao |
|---|---|---|---|---|---|
| P4.2-01 | Fallback de scopes vazios para acesso total | Alta | P0 | Sim | Hoje `adminScopes` vazio equivale a super-admin; precisa migracao para modelo fail-closed. |
| P4.2-02 | Inconsistencia de permissoes no modulo Recursos (directories vs brands) | Alta | P0 | Sim | Manter modulo unico "Recursos" com tabs internas por scope para reduzir churn em router/sidebar. |
| P4.2-03 | Rate limiter distribuido (Redis) | Alta | P0/P1 | Sim | P0 se multi-instancia imediata; P1 se ambiente atual for single-instancia. |
| P4.2-04 | Queue de moderacao sem paginacao de origem/cursor | Alta | P0 | Sim | Merge global + slice final tem risco de degradacao e inconsistencias. |
| P4.2-05 | Guardas de rota frontend por role (nao por scope) | Media | P1 | Sim | Necessario alinhar UX com autorizacao granular real. |
| P4.2-06 | Pagina de Audit Log no frontend | Media | P1 | Sim | Backend existe; falta superficie operacional de consulta. |
| P4.2-07 | Alertas operacionais sem acknowledge/dismiss | Media | P1 | Sim | Falta ciclo de vida de alerta para operacao diaria. |
| P4.2-08 | Alertas de hide spike incompletos | Media | P1 | Sim | Cobrir `hide-fast` e fluxos em lote. |
| P4.2-09 | Validacao centralizada de `reason`/`note` | Media | P2 | Sim | Uniformizar limites e mensagens antes do service/model. |
| P4.2-10 | Limite de tamanho para `metadata` de auditoria | Media | P2 | Sim | Evita payloads grandes e crescimento descontrolado. |
| P4.2-11 | Polling near-real-time nas views criticas | Media | P2 | Sim | Queue, jobs, worker-status e alertas devem atualizar automaticamente. |
| P4.2-12 | Cobertura de testes de regressao admin | Media | P2 | Sim | Reforcar testes de permissao, queue e alertas. |
| P4.2-13 | Modo card mobile para tabelas | Baixa | P3 | Nao | Impacta UX mobile, nao bloqueia fecho tecnico. |
| P4.2-14 | Validacao em tempo real de formularios | Baixa | P3 | Nao | Melhora UX, nao bloqueia seguranca/operacao. |
| P4.2-15 | Atalhos de teclado e command palette admin | Baixa | P3 | Nao | Ganho de produtividade para power users. |
| P4.2-16 | Layout ultrawide/adaptativo | Baixa | P3 | Nao | Melhora uso de espaco em ecras grandes. |
| P4.2-17 | Gestao de admins via UI (scopes/readOnly) | Media | P1 | Sim | Evita dependencia de DB para operar o modelo fail-closed. |
| P4.2-18 | Export CSV para auditoria/operacao | Media | P2 | Sim | Necessario para compliance e reporting offline. |

## 2) Objetivo do P4.2

Fechar o P4 com robustez de producao no painel Admin:

1. Permissoes consistentes e seguras (fail-closed).
2. Operacao escalavel (rate limit distribuido e queue eficiente).
3. Observabilidade completa (audit log UI + alertas com ciclo de vida).
4. UX operacional minima obrigatoria para triagem continua.

## 3) Plano de implementacao por fase

## Fase A - Seguranca e governanca de permissoes (P0)

### A.1 Remover fallback de super-admin implicito

Backend:
1. Alterar regra em `src/admin/permissions.ts` para negar quando `adminScopes` estiver vazio.
2. Introduzir flag de transicao (ex: `ADMIN_SCOPES_FAIL_CLOSED=true`) para rollout seguro.
3. Criar script de migracao para preencher scopes dos admins atuais por perfil (`super`, `ops`, `editor`, `publisher`, `claims`, `support`).
4. Registar no audit log quando um admin e bloqueado por scopes ausentes.

Frontend:
1. Ajustar `src/features/admin/lib/access.ts` para o mesmo comportamento fail-closed.
2. Mostrar estado explicito "perfil sem scopes atribuidos" em vez de fallback silencioso.

Testes:
1. Testes unitarios backend para `canAdminUseScope` com `adminScopes=[]`.
2. Testes frontend para `hasAdminScope/canReadAdminModule` com `adminScopes=[]`.

Criterio de aceite:
1. Admin sem scopes deixa de aceder endpoints e modulos.
2. Admin com scopes explicitos mantem comportamento esperado.

### A.2 Corrigir contrato de permissoes do modulo Recursos

Backend:
1. Definir matriz oficial por endpoint:
   - directories list/create/update: `admin.directory.manage`
   - directories publish/archive: `admin.directory.manage` (contrato unico do workspace Diretorios)
   - brands CRUD/toggles: `admin.brands.write`
2. Uniformizar mensagens de erro `403` por scope em falta.

Frontend:
1. Manter modulo unico "Recursos" e separar `Diretorios` e `Brands` em tabs internas.
2. Ajustar `readScopes/writeScopes` para nao misturar permissao de leitura de uma area com escrita noutra.
3. Mostrar/esconder tabs e botoes por capability real.

Testes:
1. Matriz de contratos FE/BE por scope.
2. E2E rapido com 3 perfis: `directory-only`, `brands-only`, `full-resources`.

Criterio de aceite:
1. Nao existe caso onde UI permita acao que backend reprova por desenho inconsistente.

## Fase B - Escalabilidade critica (P0/P1)

### B.1 Rate limiter distribuido

Backend:
1. Substituir store em memoria por store Redis para `express-rate-limit`.
2. Externalizar limites por endpoint em config/env.
3. Incluir fallback controlado para modo degradado (sem bypass silencioso).

Operacao:
1. Dashboard tecnico com metricas de bloqueio por chave.
2. Playbook para incidentes de burst.

Testes:
1. Teste de integracao com 2 instancias simuladas.

Criterio de aceite:
1. Limites consistentes entre instancias.

### B.2 Queue com paginacao de origem e cursor

Backend:
1. Mover ordenacao/priorizacao para query de origem (ou materialized queue index).
2. Implementar paginacao por cursor para queue mutavel, mantendo `page/limit` como compatibilidade temporaria.
3. Evitar merge global em memoria antes de paginar.
4. Rever `adminMetricsService.getDrilldown()` para nao depender de queue full-scan.

Frontend:
1. Atualizar `ContentModerationPage` para cursor pagination.
2. Preservar deep links com cursor e filtros.

Testes:
1. Testes de consistencia: sem duplicados/saltos entre paginas durante mutacao da queue.

Criterio de aceite:
1. P95 da queue estavel com dataset grande e sem duplicacoes.

## Fase C - Observabilidade e operacao (P1/P2)

### C.1 Pagina de Audit Log

Frontend:
1. Criar pagina `AdminAuditLogsPage` com filtros:
   - actor
   - action
   - resourceType
   - outcome
   - date range
2. Adicionar pagina ao sidebar/modulos com scope `admin.audit.read`.
3. Deep-link de filtros via query string.
4. Acao de `Export CSV` dos resultados filtrados.

Backend:
1. Garantir que endpoint suporta filtros e ordenacao esperados para UI.
2. Adicionar endpoint de exportacao CSV com os mesmos filtros da listagem.

Testes:
1. Testes de service + UI para filtros combinados.
2. Teste de export CSV com colunas e encoding validos.

Criterio de aceite:
1. Admin com `admin.audit.read` consegue auditar acoes fim-a-fim no UI.

### C.2 Ciclo de vida de alertas (ack/dismiss)

Backend:
1. Criar modelo/estado de alerta (`open`, `acknowledged`, `dismissed`).
2. Endpoint para acknowledge/dismiss com ator, motivo e timestamp.
3. Manter alertas historicos para compliance.

Frontend:
1. Acoes `Acknowledge` e `Dismiss` no dashboard/alert center.
2. Filtros por estado.

Testes:
1. Fluxo completo de alteracao de estado com auditoria.

Criterio de aceite:
1. Alertas deixam de ficar eternamente "ativos" sem contexto.

### C.3 Completar sinais de alerta de moderacao

Backend:
1. Expandir deteccao de spike para incluir:
   - `admin.content.hide_fast`
   - eventos de hide/restrict em jobs de lote
2. Recalibrar severidade com thresholds configuraveis por env.

Testes:
1. Testes de agregacao e severidade por tipo de evento.

### C.4 Gestao de admins via UI (scopes/readOnly)

Frontend:
1. Criar area de gestao de admins no modulo Utilizadores (ou secao dedicada).
2. Permitir editar `adminScopes`, `adminReadOnly` e perfil recomendado (`super`, `ops`, etc.).
3. Exibir diff de permissoes antes de confirmar alteracoes.

Backend:
1. Expor endpoint seguro para atualizar scopes/readOnly de admins.
2. Registrar alteracoes em audit log com before/after.
3. Bloquear auto-escalacao de privilegios sem scope apropriado.

Testes:
1. Casos allow/deny para alteracao de scopes.
2. Validacao de contrato para scopes invalidos ou vazios.

## Fase D - Robustez de validacao e contratos (P2)

### D.1 Validacao central de payloads operacionais

Backend:
1. Criar helper comum para `reason`, `note`, `publicMessage`, `metadata`.
2. Aplicar em controllers admin (users/content/surface controls).
3. Padronizar erros `400` com codigos e mensagens previsiveis.

### D.2 Limites de metadata de auditoria

Backend:
1. Definir limite maximo de tamanho/keys para `metadata`.
2. Sanitizar objetos antes de persistir.
3. Rejeitar payloads fora do contrato com erro explicito.

Testes:
1. Casos de borda para tamanhos e tipos invalidos.

## Fase E - UX operacional obrigatoria minima (P2)

### E.1 Atualizacao automatica de dados criticos

Frontend:
1. Polling dinamico para:
   - queue
   - jobs
   - worker-status
   - alertas
2. Regra recomendada:
   - tab focada: 10s
   - tab em background: pausa (`refetchIntervalInBackground=false`)
3. Indicador "ultima atualizacao" por widget.
4. Botao de refresh forcado sem perder filtros.

Criterio de aceite:
1. Operador nao depende de F5 para manter estado operacional.

### E.2 Cobertura de testes admin

Backend:
1. Criar suite minima de integracao para rotas admin criticas (permissoes, queue, jobs, alertas).
2. Meta objetiva: 100% das rotas admin criticas com teste `scope allowed` + `scope denied`.

Frontend:
1. Expandir testes fora do happy path para dialogs destrutivos, erros e autorizacao por scope.
2. E2E com perfis de permissao reduzida.

## 4) UI/UX impactante (nao obrigatoria para fecho P4.2)

Estas melhorias nao bloqueiam P4.2, mas tem alto impacto de produtividade:

1. Modo card em mobile para tabelas admin.
2. Validacao de formularios em tempo real (feedback inline).
3. Atalhos de teclado por contexto (queue, users, jobs).
4. Command palette global (`Ctrl/Cmd+K`) para navegar e executar acoes rapidas.
5. Dashboard personalizavel por admin (widgets, ordem, densidade).
6. Layout ultrawide com paineis side-by-side para triagem paralela.

## 5) Sequencia recomendada de entrega

Sprint 1:
1. Fase A (permissoes) + inicio da Fase B (rate limiter).

Sprint 2:
1. Fase B (queue cursor) + Fase C (audit log UI + export CSV).

Sprint 3:
1. Fase C (ack/dismiss + alertas completos + gestao de admins) + Fase D.

Sprint 4:
1. Fase E (polling + testes) + pacote UI/UX opcional prioritario.

## 6) Definition of Done do P4.2

1. Permissoes fail-closed ativas em backend e frontend.
2. Contrato de scopes consistente para todos os modulos admin.
3. Rate limiter distribuido ativo em ambiente multi-instancia.
4. Queue paginada por cursor, sem full-scan em request normal.
5. Audit Log consultavel no frontend com filtros operacionais.
6. Alertas com acknowledge/dismiss e historico auditavel.
7. Export CSV disponivel para auditoria operacional.
8. Gestao de admins (scopes/readOnly) disponivel via UI com trilha auditavel.
9. Testes de regressao para permissoes, queue, jobs e alertas.
10. Documentacao (`dcos`) atualizada com runbooks e matriz de scopes.

## 7) Progresso de implementacao (2026-03-05)

Concluido nesta iteracao (backend + frontend):

1. `P4.2-01` fail-closed com flag de transicao:
   - `ADMIN_SCOPES_FAIL_CLOSED` no backend (`API_finhub`).
   - `VITE_ADMIN_SCOPES_FAIL_CLOSED` no frontend (`FinHub-Vite`).
2. `P4.2-02` contrato de diretorios alinhado:
   - publish/archive agora exigem `admin.directory.manage`.
3. `P4.2-08` sinais de hide spike expandidos:
   - inclui `admin.content.hide_fast` e bulk hide (`admin.content.bulk_moderate` com `bulkAction=hide`).
4. `P4.2-11` polling dinamico em views criticas:
   - queue/jobs/worker-status/alertas com 10s em foco e pausa em background.
5. `P4.2-18` export CSV de audit log:
   - endpoint `/api/admin/audit-logs/export.csv` + acao de export no frontend.
6. `P4.2-06` pagina de Audit Log:
   - rota frontend `/admin/auditoria` com filtros, paginacao e export CSV.
7. `P4.2-07` ciclo de vida de alertas:
   - estado `open/acknowledged/dismissed` em backend.
   - endpoints de `acknowledge/dismiss`.
   - acoes no dashboard para operar estados.
8. `P4.2-04` cursor pagination da queue:
   - backend suporta `cursor` mantendo `page/limit` por compatibilidade.
   - resposta inclui metadados `cursor.current/next/hasMore`.
   - frontend da moderacao usa navegacao por cursor (next/prev) sem perder filtros.
9. `P4.2-17` gestao de admins via UI:
   - endpoint backend `POST /api/admin/users/:userId/admin-permissions` para atualizar `adminScopes` e `adminReadOnly`.
   - bloqueio de auto-escalacao (self-update) e validacao de profile/scopes.
   - auditoria inclui metadata `before/after` da alteracao.
   - frontend em `/admin/users` com dialogo de permissoes, selecao por perfil recomendado/custom e preview de diff antes de confirmar.
10. `P4.2-03` rate limiter distribuido Redis:
   - `src/middlewares/rateLimiter.ts` migrou de store local (`Map`) para `RedisStore` (`rate-limit-redis`) com chave por requester (`user:id` ou `ip`).
   - startup/shutdown explicitos em `src/server.ts` (`initializeRateLimiter` / `shutdownRateLimiter`).
   - fallback controlado de Redis para memory mode sem bypass silencioso:
     - se `RATE_LIMIT_REDIS_REQUIRED=true` (ou `RATE_LIMIT_STORE_MODE=redis`) e Redis falha, o servidor nao arranca;
     - caso contrario, entra em modo degradado com log estruturado e metrica de backend.
   - limites por endpoint externalizados por env (`RATE_LIMIT_<LIMITER>_WINDOW_MS` e `RATE_LIMIT_<LIMITER>_MAX`).
   - metricas tecnicas adicionadas:
     - `finhub_rate_limiter_backend_info`
     - `finhub_rate_limit_exceeded_total` (com `limiter`, `key_type`, `key_hash`).
11. `P4.2-12` cobertura de testes estruturada por rota/scope:
   - script automatizado `npm run test:admin:scopes`.
   - validacao AST de contrato em `src/routes/admin.routes.ts`:
     - 100% das rotas admin com `requireAdminScope(...)`;
     - escopos apenas dentro de `ADMIN_SCOPES`.
   - validacao allow/deny para todos os scopes usados em rota:
     - allow com scope explicito;
     - deny com scope diferente;
     - deny para role nao-admin;
     - comportamento read-only por tipo de scope;
     - middleware `requireAdminScope` com casos `401`, `403` e allow com `next()`.
   - execucao atual: `OK: 58 rotas admin com escopo e 11 scopes validados (allow/deny).`
12. `P4.2-05` guardas de rota frontend por scope:
   - frontend deixou de depender apenas de `role=admin` em `/admin/*`;
   - `requireAdmin` agora valida `pathname` com `canAccessAdminPath`;
   - wrappers SSR de `pages/admin/**` exigem `requiredAdminModule`;
   - cobertura frontend adicionada para contrato `path -> module` e loader `requireAdmin`.
13. `P4.2-14` validacao em tempo real de formularios admin:
   - helper frontend `formValidation` para regras partilhadas de `required`, `double-confirm` e `inteiro positivo`.
   - dialogs criticos em `/admin/users` passaram a mostrar erro inline e bloquear submit enquanto houver erro:
     - acoes admin;
     - creator controls;
     - permissoes admin.
   - dialogs criticos em `/admin/conteudo` passaram a mostrar erro inline e bloquear submit enquanto houver erro:
     - acao individual;
     - rollback assistido;
     - job de moderacao em lote.
   - cobertura frontend adicionada para o helper:
     - `src/__tests__/features/admin/adminFormValidation.test.ts`.
14. `P4.2-13` modo card mobile para tabelas admin:
   - `UsersManagementPage` com cards em mobile e tabela em desktop.
   - `ContentModerationPage` com cards em mobile para a queue (inclui selecao e acoes de moderacao).
   - `AdminAuditLogsPage` com cards em mobile e tabela completa em desktop.
   - cobertura frontend adicionada:
     - `src/__tests__/features/admin/AdminAuditLogsPage.test.tsx`.
15. hotfix `/admin` (SSR/client) - `ModuleCard`:
   - `ADMIN_MODULES` inclui modulo `creators`, mas o mapa `MODULE_ICONS` do dashboard nao tinha essa chave.
   - resultado: `Icon=undefined` e erro runtime/hydration em `ModuleCard`.
   - correcao aplicada no frontend:
     - chave `creators` adicionada em `MODULE_ICONS`;
     - fallback defensivo `MODULE_ICONS[key] ?? Shield`.
   - validacao executada: `npm run typecheck:p1` e `npm run build`.
16. `P4.2-15` atalhos de teclado e command palette admin:
   - trigger de command palette no `AdminLayout` com `Ctrl/Cmd+K`.
   - lista de modulos filtrada pelos scopes reais do admin.
   - navegacao rapida por teclado com `G + tecla` (scope-aware) para dashboard/users/creators/content/editorial/support/recursos/auditoria/stats.
   - guardrail de UX para nao disparar atalhos quando o foco esta em `input/textarea/select` ou `contenteditable`.
   - cobertura frontend adicionada:
     - `src/__tests__/features/admin/adminKeyboardShortcuts.test.ts`.

### 7.1 Configuracao operacional do P4.2-03

Flags principais:

1. `RATE_LIMIT_STORE_MODE=auto|memory|redis` (default: `auto`).
2. `RATE_LIMIT_REDIS_URL` (fallback para `REDIS_URL`).
3. `RATE_LIMIT_REDIS_REQUIRED=true|false` (default: `true` quando `RATE_LIMIT_STORE_MODE=redis`).
4. `RATE_LIMIT_ALLOW_MEMORY_FALLBACK=true|false` (default: `true`).
5. `RATE_LIMIT_REDIS_PREFIX` (default: `finhub:ratelimit:`).
6. `RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS` (fallback para `REDIS_CONNECT_TIMEOUT_MS`, default 5000ms).

Overrides por limiter:

1. `RATE_LIMIT_API_WINDOW_MS` / `RATE_LIMIT_API_MAX`
2. `RATE_LIMIT_NEWS_WINDOW_MS` / `RATE_LIMIT_NEWS_MAX`
3. `RATE_LIMIT_SEARCH_WINDOW_MS` / `RATE_LIMIT_SEARCH_MAX`
4. `RATE_LIMIT_STATS_WINDOW_MS` / `RATE_LIMIT_STATS_MAX`
5. `RATE_LIMIT_ADMIN_WINDOW_MS` / `RATE_LIMIT_ADMIN_MAX`
6. `RATE_LIMIT_ADMIN_MODERATION_ACTION_WINDOW_MS` / `RATE_LIMIT_ADMIN_MODERATION_ACTION_MAX`
7. `RATE_LIMIT_ADMIN_MODERATION_BULK_WINDOW_MS` / `RATE_LIMIT_ADMIN_MODERATION_BULK_MAX`
8. `RATE_LIMIT_ADMIN_METRICS_DRILLDOWN_WINDOW_MS` / `RATE_LIMIT_ADMIN_METRICS_DRILLDOWN_MAX`
9. `RATE_LIMIT_USER_REPORT_WINDOW_MS` / `RATE_LIMIT_USER_REPORT_MAX`
10. `RATE_LIMIT_GENERAL_WINDOW_MS` / `RATE_LIMIT_GENERAL_MAX`

Pendencias principais para fechar P4.2:

1. Nenhuma pendencia tecnica aberta no escopo P4.2.
