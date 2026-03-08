# P6 - MCP AI CONTEXTO AGENTES

Data: 2026-03-08
Escopo: API_finhub + FinHub-Vite
Estado: planeado
Release gate: Nao bloqueante para a release atual (P4/P5 primeiro)

## 1) Objetivo

Criar uma camada de AI readiness para que a plataforma possa:

- usar AI para contexto, explicacao e simulacoes hipoteticas;
- suportar agentes com acesso controlado a ferramentas da plataforma;
- evoluir progressivamente sem comprometer compliance, seguranca e foco funcional.

## 2) Limite legal e de produto (nao negociavel)

Permitido:

- explicacoes educativas;
- contexto de mercado e de portfolio;
- cenarios hipoteticos "what-if";
- comparacao de hipoteses com premissas explicitas.

Proibido:

- recomendacao financeira personalizada;
- call-to-action do tipo "compra/vende";
- instrucoes de timing de mercado;
- output que substitua aconselhamento regulado.

Resposta padrao quando pedido for proibido:

- recusar recomendacao;
- devolver contexto, riscos e cenarios alternativos.

## 3) Principios de arquitetura

1. MCP server como camada de orquestracao, nao como source of truth.
2. API_finhub permanece o backend canonico de dados e regras.
3. Tools com contratos versionados (schema input/output).
4. Politicas por acao: read, explain, simulate, draft.
5. Acoes sensiveis exigem aprovacao explicita do utilizador/admin.
6. Logs e auditoria de prompts, tool calls e decisao final.

## 4) Blocos P6 propostos

| Bloco | Objetivo | Estado | Prioridade |
|---|---|---|---|
| P6.1 | Fundacao MCP + registry de tools | planeado | Alta |
| P6.2 | Guardrails legais e policy engine | planeado | Alta |
| P6.3 | AI para dashboards de utilizador (contexto/simulacao) | planeado | Alta |
| P6.4 | AI para operacao admin (insights, moderacao assistida) | planeado | Media |
| P6.5 | AI para conteudo e metadata editorial | planeado | Media |
| P6.6 | Observability, custo, qualidade e safety evals | planeado | Alta |

## 5) Fases de entrega

Fase A (read-only):

- AI apenas com leitura de dados permitidos;
- sem qualquer acao que altere estado.

Fase B (draft assistido):

- gera rascunhos de plano, tags, relatorios e sugestoes de melhoria;
- sempre com confirmacao humana antes de aplicar.

Fase C (automacao controlada):

- jobs limitados com regras, quotas e rollback;
- monitorizacao e kill switch operacional.

## 6) Dados, seguranca e privacidade

1. Minimizacao de contexto enviado ao modelo.
2. Redacao de PII por defeito.
3. Separacao de permissoes entre utilizador normal e admin.
4. Registo de consentimento e escopo por sessao.
5. Encriptacao em transito e em repouso nos componentes AI.

## 7) Critérios de done por bloco P6

Um bloco P6 so fecha quando tiver:

1. implementacao tecnica backend/frontend;
2. testes de regressao e smoke do bloco;
3. validacao de guardrails legais (sem recomendacao financeira);
4. evidencia operacional (logs, metricas e alertas);
5. atualizacao da auditoria principal;
6. commit dedicado e movimento para `dcos/done/`.

## 8) Relacao com a release atual

1. P6 nao bloqueia o fecho da release atual.
2. Prioridade imediata continua em P4/P5.
3. P6 avanca em paralelo quando nao comprometer marcos funcionais em curso.

