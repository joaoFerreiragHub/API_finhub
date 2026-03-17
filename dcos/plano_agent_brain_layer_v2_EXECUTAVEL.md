# Plano Agent Brain Layer v2 - Execucao Operacional

Data: 2026-03-17  
Status: draft implementavel  
Base: `plano_agent_brain_layer_v2.docx`

## 1) Posicao executiva

Concordancia geral com o plano original: **sim**.  
Esta versao transforma a visao em regras operacionais com:

- criterios numericos para autonomia;
- politicas de seguranca e governacao;
- SLOs/SLAs e alertas;
- backlog 30/60/90 dias com Definition of Done.

## 2) Objetivo e escopo

Objetivo: evoluir o ecossistema para maior autonomia **sem perder criterio**.

Escopo desta versao:

- Brain Layer em MongoDB como memoria operativa;
- indice semantico para recuperacao de experiencia;
- scorecards por agente e por classe de risco;
- gates de seguranca obrigatorios para acao em risco alto.

Fora de escopo (nesta fase):

- fine-tuning custom;
- multi-cloud complexa;
- automacao irreversivel sem aprovacao humana.

## 3) Modelo operativo e principios obrigatorios

1. Autonomia sobe por evidencia, nao por percecao.
2. Risco manda no gate, nao no ego do agente.
3. Memoria promovivel so entra com repeticao + outcome.
4. Seguranca e auditabilidade sao hard requirements.
5. Custo otimiza depois de qualidade minima estabilizada.

## 4) Classes de risco e politicas de gate

| Classe | Tipo de tarefa | Execucao permitida | Gate |
|---|---|---|---|
| A | docs, tagging, indexacao, drafts | autonoma | revisao por amostragem (10%) |
| B | specs, analise, QA funcional | semi-autonoma | revisao posterior obrigatoria (100%) |
| C | codigo prod, scoring financeiro, migracoes | controlada | aprovacao tecnica antes de merge/deploy |
| D | arquitetura irreversivel, compliance sensivel, acesso critico | proposta apenas | aprovacao humana explicita antes de qualquer acao |

Regras hard-stop:

- classe C e D nunca executam deploy automatico;
- comandos destrutivos exigem aprovacao humana (`rm`, drop, truncate, delete bulk);
- qualquer tarefa com dados sensiveis sobe para gate humano.

## 5) Scorecard numerico por agente (0-100)

Janela de calculo:

- rolling 30 dias **ou** ultimas 50 tarefas (o que der mais amostra).

Score total:

`score = 0.30*success + 0.20*qa + 0.15*on_time + 0.15*cost_eff + 0.10*escalation + 0.10*stability`

Metricas normalizadas (0-100):

- `success`: taxa de sucesso util por classe de risco.
- `qa`: `100 - taxa_rejeicao_qa`.
- `on_time`: `% tarefas dentro do SLA`.
- `cost_eff`: custo medio vs baseline da tarefa.
- `escalation`: `% escalonamentos corretos`.
- `stability`: penaliza retries excessivos e incidentes.

Baselines iniciais:

- success minimo aceitavel: 75 (A/B), 85 (C), 90 (D proposta).
- rejeicao QA maxima: 10% (A), 8% (B), 5% (C), 2% (D proposta).
- retries medios maximos: 1.3 por tarefa.

## 6) Regras de autonomia (promocao e descida)

Niveis:

- L0: assistido (so propoe).
- L1: executa baixo risco com revisao posterior.
- L2: executa A/B com gates definidos.
- L3: especialista estavel (A/B autonoma; C controlada).

Promocao de nivel (todos obrigatorios):

1. `score >= 80` por 2 janelas consecutivas.
2. sem incidente Sev1 em 60 dias.
3. taxa de escalonamento correto >= 90%.
4. volume minimo: 30 tarefas na janela.

Descida de nivel (qualquer condicao):

1. incidente Sev1 confirmado.
2. rejeicao QA acima do limite por 2 semanas.
3. 2 falhas criticas seguidas na mesma classe de risco.
4. violacao de politica de seguranca.

## 7) Learn-on-Close com thresholds de promocao

Estados de conhecimento:

- Observacao: 1 ocorrencia.
- Padrao candidato: >= 2 ocorrencias em ate 21 dias.
- Regra recomendada: >= 3 ocorrencias com >= 80% sucesso.
- Playbook estavel: >= 5 ocorrencias com >= 90% sucesso e 0 regressao critica em 45 dias.

Sunset e higiene:

- regra sem uso por 90 dias vai para `stale`;
- playbook com regressao critica volta para `candidate`;
- deduplicacao semanal pelo Librarian.

## 8) Schema minimo (MongoDB) para producao

Collections core:

- `agents`
- `tasks`
- `agent_activity_logs`
- `decision_log`
- `error_log`
- `pattern_log`
- `knowledge_assets`
- `agent_scorecards`
- `autonomy_reviews`
- `audit_events` (nova, obrigatoria)

Campos obrigatorios de `tasks`:

- `taskId`, `agentId`, `riskClass`, `status`, `createdAt`, `closedAt`
- `actionSummary`, `resultSummary`, `qaOutcome`
- `costUsd`, `durationSec`, `retryCount`
- `decisionCaptured`, `errorCaptured`, `patternCaptured`
- `shouldPromoteToMemory`, `assetLinks[]`

Campos obrigatorios de `audit_events`:

- `eventId`, `eventType`, `taskId`, `agentId`
- `actorType` (`agent`|`human`|`system`)
- `actorId`, `timestamp`, `payloadHash`, `severity`

Indices minimos:

```javascript
db.tasks.createIndex({ agentId: 1, createdAt: -1 })
db.tasks.createIndex({ riskClass: 1, status: 1, createdAt: -1 })
db.agent_activity_logs.createIndex({ taskId: 1 }, { unique: true })
db.error_log.createIndex({ agentId: 1, rootCause: 1, createdAt: -1 })
db.pattern_log.createIndex({ status: 1, updatedAt: -1 })
db.agent_scorecards.createIndex({ agentId: 1, windowStart: -1 })
db.audit_events.createIndex({ timestamp: -1 })
db.audit_events.createIndex({ taskId: 1, timestamp: -1 })
```

## 9) Seguranca operacional (obrigatoria)

### 9.1 Identidade e acessos

- cada agente com service account propria;
- permissao minima por role (`reader`, `executor`, `reviewer`, `admin`);
- proibido partilhar token entre agentes;
- rotacao de secrets a cada 90 dias.

### 9.2 Secret management

- secrets fora do repo (env manager/vault);
- mascarar secrets em logs;
- bloquear startup se secret default/placeholder.

### 9.3 Guardrails de execucao

- allowlist de diretorios e ferramentas por agente;
- denylist de comandos destrutivos sem approval;
- classe C/D exige `humanApprovalId` valido antes de executar.

### 9.4 Protecao de dados

- tag de classificacao por registo: `public`, `internal`, `sensitive`;
- encriptacao em repouso e em transito;
- retention:
  - `agent_activity_logs`: 180 dias;
  - `audit_events`: 365 dias;
  - `decision_log`/`pattern_log`: sem prazo, com revisao anual.

### 9.5 Auditoria e resposta a incidente

- todos os gates humanos gravam `quem`, `quando`, `porque`;
- incidente Sev1 abre automaticamente `postmortem_required = true`;
- SLA de resposta:
  - Sev1: iniciar em <= 15 min;
  - Sev2: iniciar em <= 60 min;
  - Sev3: iniciar em <= 1 dia util.

## 10) SLOs, alertas e budget

SLOs iniciais:

- ingestion de task-close >= 99.0% por dia;
- latencia p95 do close pipeline <= 60s;
- rejeicao QA global <= 8%;
- escalonamento correto >= 90%;
- custo medio por tarefa: -15% em 90 dias sem piorar QA.

Alertas automaticos:

- queda de success > 10 pontos em 7 dias;
- rejeicao QA acima de limite por 3 dias seguidos;
- duplicacao de retries medio por 48h;
- aumento de custo > 25% vs baseline semanal.

## 11) Workflow de decisao (run-time)

1. Receber tarefa + classificar risco.
2. Carregar memoria relevante (decisao/erro/padrao) por similaridade.
3. Escolher modelo por politica de custo + historico da tarefa.
4. Executar com guardrails.
5. Fechar tarefa com schema unico.
6. Atualizar scorecards e gerar sinais de promocao/descida.
7. Enviar para Librarian (dedup + promocao semanal).

## 12) Roadmap implementavel 30/60/90

### 0-30 dias (fundacao)

Entregaveis:

1. collections core + indices minimos.
2. schema unico de fechamento (`tasks` + `agent_activity_logs`).
3. classificacao de risco por tipo de tarefa.
4. `audit_events` ativa para C/D.

Definition of Done:

- 100% das tarefas novas fecham com schema valido;
- dashboards basicos mostram success, QA, custo, tempo;
- 0 execucao C/D sem gate humano.

### 30-60 dias (aprendizagem mensuravel)

Entregaveis:

1. indice semantico ligado a `decision_log/error_log/pattern_log`.
2. scorecards automaticos por agente.
3. revisao semanal do Librarian com output escrito.

Definition of Done:

- consulta de memoria ocorre em >= 80% das tarefas A/B;
- pelo menos 10 padroes candidatos com dedup feita;
- relatorio semanal com promocoes/descidas de autonomia.

### 60-90 dias (autonomia controlada)

Entregaveis:

1. triggers automaticos para classe A.
2. roteamento de modelo por historico + risco.
3. gates humanos focados em C/D com trilha de auditoria completa.

Definition of Done:

- reducao de retrabalho >= 20%;
- custo medio -15% sem piorar rejeicao QA;
- zero incidente Sev1 por violacao de gate.

## 13) RACI minimo de governacao

- Orchestrator: roteamento e classificacao inicial.
- Librarian: dedup, promocao de memoria, higiene do conhecimento.
- QA Agent: validacao de qualidade por amostra e por risco.
- Human Owner: aprovacoes C/D, excecoes e incidentes.

## 14) Decisoes para aprovar agora

1. Aprovar schema e indices propostos.
2. Aprovar thresholds de score/autonomia desta versao.
3. Aprovar politica de seguranca (gate + audit_events).
4. Aprovar SLOs de 90 dias.

Sem estas 4 decisoes, o plano continua correto em teoria mas fraco em execucao.
