# P6 - SETUP TECNICO ESCALABILIDADE (CLEAN CODE + DRY)

Data: 2026-03-08  
Status: EM CURSO (baseline inicial + T1.1 + T1.2 core entregues)
Escopo: `API_finhub` + `FinHub-Vite`

## 1) Objetivo

Criar uma base tecnica mais escalavel e previsivel antes de continuar os blocos de auditoria funcional, com foco em:

1. consistencia de tooling;
2. higiene de repositorio;
3. padrao de validacao tecnica minima;
4. backlog tecnico executavel (DRY, clean code, operacao).

## 2) Diagnostico rapido (estado atual)

### 2.1 Frontend (`FinHub-Vite`)

- existia mistura de invocacao `yarn` dentro de scripts executados por `npm`;
- existia configuracao ESLint legacy redundante (`eslintrc.js`) com risco de deriva face ao `eslint.config.js`;
- existiam artefactos de documentacao sem referencia (`Untitled diagram*`, `Creator Access*`) e ficheiro vazio `yarn`.

### 2.2 Backend (`API_finhub`)

- existia ficheiro acidental `tatus` (dump de terminal) versionado;
- faltava comando unico de gate tecnico para validacao rapida local/CI.

## 3) Entregas deste ciclo

### 3.1 Limpeza de ficheiros desnecessarios

- backend:
  - removido: `tatus`
- frontend:
  - removido: `yarn` (ficheiro vazio)
  - removidos: `dcos/Untitled diagram-*` e `dcos/Creator Access and Content-2026-02-15-184343.svg` (sem referencias nos `.md`)

### 3.2 Hardening de setup

- frontend:
  - `package.json`: scripts `start`, `start:spa`, `start:ssr`, `postinstall`, `validate` migrados para `npm run ...` (sem dependencia implicita de `yarn`);
  - `package.json`: adicionado script `checking` (`typecheck:p1 + lint`);
  - removido `eslintrc.js` legacy para reduzir ambiguidade de configuracao.
- backend:
  - `package.json`: adicionado script `checking` (`typecheck + test:docs:smoke`).

### 3.3 T1.1 Logging/observability (entregue)

- `src/utils/logger.ts` evoluido para:
  - niveis `debug|info|warn|error` com controlo por `LOG_LEVEL`;
  - output JSON em `stdout/stderr` sem dependencia de `console.*`;
  - contexto assinc (`AsyncLocalStorage`) para propagar `requestId`;
  - bridge opcional de `console` para logger estruturado (`LOG_PATCH_CONSOLE=true|false`).
- `src/middlewares/requestContext.ts` passa a executar requests em `runWithLogContext({ requestId })`.
- `src/server.ts` ativa `patchConsoleWithStructuredLogger({ service: 'api' })`.
- `src/workers/adminContentJobs.worker.ts` ativa logging estruturado e remove `console.*` direto.
- `src/config/database.ts` passa a usar `logInfo/logError`.
- `.env.example` atualizado com `LOG_LEVEL` e `LOG_PATCH_CONSOLE`.

### 3.4 T1.2 Migracao de console para eventos de dominio (core entregue)

- criado utilitario `src/utils/domainLogger.ts` para padronizar eventos:
  - `logControllerError(domain, action, error, req, meta?)`
  - `logServiceError(domain, action, error, meta?)`
  - `logServiceInfo/domainWarn` para eventos nao-erro.
- controladores core migrados (admin/auth):
  - `adminContent`, `adminUser`, `adminEditorialCms`, `adminAssistedSession`, `authAssistedSession`,
    `adminAudit`, `adminMetrics`, `adminOperationalAlerts`, `adminSurfaceControl`, `auth`.
- servicos core migrados:
  - `adminContent.service` (falha de notificacao ao creator);
  - `newsService` (falhas por provider, getNews, eventos de metodos nao implementados e force refresh).
- resultado:
  - eventos com naming estavel por dominio/acao (`*_failed`, `*_info`, `*_warn`);
  - payload com `requestId/method/path` nos controladores migrados.

## 4) Backlog tecnico priorizado (proximo ciclo)

## T1) Logging e observability unificados (Alta)
- estado: EM CURSO (T1.1 e T1.2 core entregues, falta T1.3)
- objetivo: eliminar `console.*` em runtime critico e centralizar em logger estruturado;
- aceite: logs com contexto (requestId/userId/modulo), sem ruido debug em producao.
- pendente:
  - T1.3: definir catalogo de eventos por dominio + dashboard operacional minimo.
  - ampliar T1.2 para controladores/servicos nao-core remanescentes (conteudo publico, feeds externos, ML e utilitarios legados).

## T2) Contratos e validacao de fronteira (Alta)
- objetivo: validar payloads de entrada/saida de forma consistente (ex: zod/schema mapeado a OpenAPI);
- aceite: rotas criticas com validacao explicita + testes de contrato.

## T3) Estrutura modular e DRY de servicos (Alta)
- objetivo: reduzir duplicacao entre servicos de conteudo e admin (query builders, filtros, mapeamentos);
- aceite: utilitarios partilhados por dominio + reducao de codigo repetido.

## T4) Testes tecnicos de regressao (Alta)
- objetivo: complementar E2E com testes unitarios/integracao para camadas core;
- aceite: smoke tecnico estavel no CI com cobertura dos caminhos de risco.

## T5) Performance de dados (Media)
- objetivo: rever indices, paginacao e queries com maior custo;
- aceite: lista de indices obrigatorios por modulo + validacao de planos de query para rotas heavy.

## T6) Seguranca operacional (Media)
- objetivo: fortalecer politicas de CORS, limites de payload e variaveis obrigatorias por ambiente;
- aceite: checklist de seguranca por ambiente (dev/staging/prod) com evidencia.

## 5) Validacao minima deste ponto

1. backend: `npm run typecheck`
2. frontend: `npm run typecheck:p1`
3. frontend: `npm run lint` (ficheiros alterados)

## 6) Regra de continuidade

Antes de fechar cada sub-bloco tecnico (T1..T6), deve existir:

1. implementacao tecnica;
2. validacao executada;
3. atualizacao desta doc;
4. commit dedicado.
