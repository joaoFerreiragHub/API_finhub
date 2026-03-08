# AUDITORIA_04 - Guia Unico de Execucao

Data: 2026-03-08
Escopo: API_finhub + FinHub-Vite

## 1) Objetivo

Este ficheiro passa a ser a fonte unica de estado e decisao operacional.
A partir daqui, o acompanhamento de progresso deve ser feito aqui.

## 2) Estado consolidado

### 2.1 Onda O1-O3 (release atual)

- O1-01 a O1-07: concluido.
- O1-08: em_curso (falta validacao final de moderation pre-release com ambiente real).
- O1-09: concluido.
- O2-01 a O2-12: concluido.
- O3-01 a O3-08: concluido.

### 2.2 Gate de release

- Frontend release E2E: verde.
- Backend release E2E: documentado como concluido.
- Bloqueio unico para fecho final da fase: O1-08.

## 3) Bloqueio atual (unico)

Executar com sucesso:

```bash
npm run test:moderation:pre-release
```

Variaveis obrigatorias em ambiente real:

1. MODERATION_SMOKE_ADMIN_EMAIL
2. MODERATION_SMOKE_ADMIN_PASSWORD
3. MODERATION_SMOKE_REPORTER_EMAIL
4. MODERATION_SMOKE_REPORTER_PASSWORD
5. MODERATION_SMOKE_TARGET_TYPE
6. MODERATION_SMOKE_TARGET_ID
7. opcional: MODERATION_SMOKE_REPORT_REASON

## 4) Plano imediato (ordem de execucao)

1. Preencher as variaveis MODERATION_SMOKE_* no backend.
2. Correr o smoke de moderation pre-release.
3. Guardar evidencias de execucao (output + timestamp).
4. Atualizar estado de O1-08 para concluido neste ficheiro.
5. Iniciar bloco seguinte (P4.3-4.5 e depois P5) com novo checkpoint aqui.

## 5) Backlog consolidado apos fecho O1-08

1. P4.3-4.5 BACKOFFICE (planeado).
2. P5 PRE-BETA / BETA-EXEC (em_curso).
3. P5 MARCAS, CRIADORES, FERRAMENTAS, FIRE, HUB-PESSOAL, EDUCACAO, COMUNIDADE, CONTEXTO, ACCOUNTABILITY (proposto).

## 6) Regra operacional daqui para a frente

1. Este ficheiro e o guia principal de execucao.
2. Quando um ponto fecha: atualizar este ficheiro + commit.
3. Ficheiros substituidos por esta consolidacao ficam arquivados em dcos/done.

## 7) Fontes consolidadas nesta auditoria

- dcos/done/LISTA_IMPLEMENTACOES_A_FAZER.md
- dcos/done/ROADMAP_BETA_EXECUCAO.md
- dcos/done/ROADMAP_BETA.md
- dcos/done/RUNBOOK_MODERATION_PRE_RELEASE.md

## 8) Historico

- 2026-03-08: criacao da AUDITORIA_04 e consolidacao de estado.

