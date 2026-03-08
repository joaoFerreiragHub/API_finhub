# Auditoria Final O3 (O3-08)

Data: 2026-03-08  
Escopo: `API_finhub` + `FinHub-Vite`

## 1) Objetivo

Fechar a auditoria final pre-release para:

1. mocks/ambientes de teste;
2. tipos/compilacao;
3. baseline de performance;
4. baseline de acessibilidade.

## 2) Backend - comando oficial

```bash
npm run audit:o3
```

Inclui:

1. `npm run typecheck`
2. `npm run build`
3. `npm run contract:openapi`
4. auditoria de `dev-*` em `src/`
5. sumario de `TODO|FIXME` em `src/`

Opcional (quando ambiente pronto):

```bash
powershell -ExecutionPolicy Bypass -File scripts/o3-final-audit.ps1 -IncludeReleaseE2E
```

## 3) Frontend - comando oficial

```bash
npm run audit:o3
```

Inclui:

1. `npm run typecheck:p1`
2. `npm run lint`
3. listagem da suite release (`npm run test:e2e:release -- --list`)
4. listagem da suite a11y (`npm run test:e2e:a11y -- --list`)

## 4) Resultado esperado (go/no-go tecnico)

1. typecheck verde backend/frontend;
2. contratos OpenAPI validados;
3. suites E2E release e a11y registadas;
4. sem `dev-*` no backend `src/`.

## 5) Riscos residuais

1. performance e a11y continuam com baseline de smoke e requerem monitorizacao continua em staging/producao;
2. execucao full da suite release real depende de credenciais/ambiente pre-release.
