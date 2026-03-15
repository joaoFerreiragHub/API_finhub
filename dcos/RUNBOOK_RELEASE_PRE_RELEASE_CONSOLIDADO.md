# RUNBOOK_RELEASE_PRE_RELEASE_CONSOLIDADO

Data: 2026-03-14  
Escopo: API_finhub + FinHub-Vite

## 1) Objetivo

Centralizar num unico ficheiro tudo o que e gate de `release` e `pre-release` para evitar dispersao entre documentos.

Fontes de verdade que alimentam este runbook:

1. `dcos/audiotira_04.md` (estado macro + ordem de execucao)
2. `dcos/P4_MODERATION_CONTROL_PLANE.md` (hardening e trilho live-only de moderacao)
3. `dcos/P5_PRE_BETA_PLATAFORMA.md` (baseline tecnico pre-beta + pendencias live)
4. `dcos/regras.md` (regras de execucao e checkpoint de retoma)

## 2) Gate de release (bloqueante)

A release final so pode fechar quando os gates abaixo estiverem cumpridos.

### 2.1) Fecho dos blocos obrigatorios P4/P5

| Bloco | Estado atual (2026-03-14) | Gate release |
|---|---|---|
| P4.2 (`dcos/P4_MODERATION_CONTROL_PLANE.md`) | em_curso | Bloqueia |
| P4.3-4.5 (`dcos/done/P4_3_4_5_BACKOFFICE_NEGOCIO.md`) | concluido | OK |
| P5 pre-beta (`dcos/P5_PRE_BETA_PLATAFORMA.md`) | em_curso | Bloqueia |
| P5 marcas (`dcos/P5_MARCAS_ENTIDADES.md`) | em_curso | Bloqueia |
| P5 criadores/ferramentas/FIRE/hub/educacao/comunidade/contexto/accountability | proposto | Bloqueia |

### 2.2) Validacoes tecnicas de release

| Validacao | Comando | Estado atual |
|---|---|---|
| Smoke de docs | `npm run test:docs:smoke` | deve correr em cada ciclo |
| Gate estrito de docs | `npm run test:docs:release-gate` | so fecha no fim do ciclo total |
| E2E critico FE | `yarn test:e2e:critical` | baseline tecnico em green |
| E2E release FE | `yarn test:e2e:release` | baseline tecnico em green |
| E2E release API | `npm run test:release:e2e` | baseline tecnico pronto; evidencia live no T-1/T-0 |

## 3) Gate de pre-release (T-1/T-0, live-only)

Itens abaixo nao bloqueiam implementacao diaria, mas bloqueiam o Go/No-Go final se nao houver evidencia.

### 3.1) Moderation smoke obrigatorio (O1-08)

Executar:

```bash
npm run test:moderation:pre-release
```

Variaveis obrigatorias:

1. `MODERATION_SMOKE_ADMIN_EMAIL`
2. `MODERATION_SMOKE_ADMIN_PASSWORD`
3. `MODERATION_SMOKE_REPORTER_EMAIL`
4. `MODERATION_SMOKE_REPORTER_PASSWORD`
5. `MODERATION_SMOKE_TARGET_TYPE`
6. `MODERATION_SMOKE_TARGET_ID`
7. opcional: `MODERATION_SMOKE_REPORT_REASON`

Estado atual: `em_curso` (falta evidencia final em ambiente real).

### 3.2) Configuracoes live-only por integracao

| Integracao | Variaveis de pre-release | Evidencia minima |
|---|---|---|
| CAPTCHA | `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET_KEY`, `VITE_CAPTCHA_PROVIDER`, `VITE_CAPTCHA_SITE_KEY` | auth flow real e, se aplicavel, `RELEASE_E2E_CAPTCHA_TOKEN` |
| Pixels/analytics | `VITE_GA_ID`, `VITE_FB_PIXEL_ID`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | eventos reais com consentimento ativo |
| Sentry | `SENTRY_*`, `VITE_SENTRY_*` | evento de erro capturado em ambiente real |
| OAuth Google | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_FRONTEND_CALLBACK_URL` | login completo com callback do dominio final |
| Email transacional | `EMAIL_PROVIDER`, `EMAIL_RESEND_API_KEY`, `EMAIL_SENDGRID_API_KEY`, `EMAIL_FROM_ADDRESS` | envio real (verify/reset) com provider ativo |
| Upload S3 | `UPLOAD_STORAGE_PROVIDER`, `UPLOAD_S3_*` | upload/download real com bucket final |

Regra: segredos continuam em `env/secret manager`; painel admin so gere configuracao nao-secreta, estado, versao e rollback.

### 3.3) Operacao e observabilidade live

| Item | Estado atual | Acao no T-1/T-0 |
|---|---|---|
| Uptime monitor externo | ativo com modo pre-release nao bloqueante sem URL | definir `UPTIME_API_URL` real e recolher evidencia |
| Integrations control plane | health sintatico + rollback versionado ativos | validar conectividade real com providers e alertas operacionais |
| Analytics control plane | integracao tecnica FE/BE fechada | validar key/host reais em ambiente live |

### 3.4) Pendencia tecnica registada para janela pre-release

| Item | Estado atual | Acao no T-1/T-0 |
|---|---|---|
| TypeScript FE (`tsconfig.app.json`) | `cmd /c npx tsc --noEmit --pretty false -p tsconfig.app.json` com falhas pre-existentes fora do escopo FIRE | executar trilho dedicado de saneamento TS no frontend e anexar evidencia de execucao green antes do Go/No-Go |

## 4) Template de evidencia (usar no dia de pre-release)

Preencher para cada gate executado:

1. Data/hora (UTC)
2. Ambiente (staging/live-beta)
3. Comando executado
4. Resultado (`pass`/`fail`)
5. URL/ID da evidencia (Actions run, logs, screenshots, ticket)
6. Responsavel

## 5) Regra de Go/No-Go final

`GO` apenas quando:

1. todos os blocos obrigatorios P4/P5 estiverem concluidos e movidos para `dcos/done/`;
2. `npm run test:docs:release-gate` estiver verde;
3. gates live-only deste runbook tiverem evidencia completa no T-1/T-0.

Qualquer falta nestes tres blocos implica `NO-GO`.
