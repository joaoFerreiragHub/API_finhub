# Especificação de projecto — Mission Control & Agent Brain Layer

## Objectivo
Construir uma plataforma interna para agentes que funcione como sistema-mãe de inteligência operacional. Esta plataforma deve ser separada do FinHub, mas integrável com ele.

### O que deve existir
- Mission Control próprio, acessível por VPN
- Brain Layer em MongoDB
- Policies, permissions, approvals, state machine e audit trail
- FinHub como primeiro projecto/tenant desta plataforma

## Resultado esperado
- Frontend em React + Vite + TypeScript + ShadCN/UI
- Backend em Node.js + Express + TypeScript
- MongoDB como base da Brain Layer
- Módulos separados para:
  - platform-core
  - brain-service
  - mission-control-web
  - admin-bridge

## Decisão arquitectural
### Platform Layer
Mission Control, Brain Layer, policies, approvals, autonomy, audit e observabilidade.

### Project Layer
FinHub e futuros projectos, com regras de negócio próprias e agentes de domínio.

### Admin Bridge
Vista filtrada no admin do FinHub sobre tasks, alerts, approvals e activity desse projecto.

## Stack e princípios
- React + Vite + TypeScript + Tailwind + ShadCN/UI
- Node.js + Express + TypeScript
- MongoDB
- Acesso por VPN/Tailscale
- Arquitectura modular, API-first e event-ready
- Não acoplar a lógica do cérebro à UI do FinHub

## Módulos obrigatórios
### platform-core
Control plane do sistema:
- agent registry
- tool registry
- policy engine
- approval engine
- autonomy engine
- task lifecycle

### brain-service
Camada de memória:
- tasks
- task_events
- agent_runs
- decisions
- errors
- patterns
- scorecards
- cost_events

### mission-control-web
Cockpit visual:
- overview
- agents
- tasks
- approvals
- activity/audit
- knowledge

### admin-bridge
Integração com o FinHub:
- endpoints/componentes para vista filtrada por projecto

## Brain Layer — collections mínimas
- agents
- projects
- tasks
- task_events
- agent_runs
- decisions
- errors
- patterns
- approvals
- agent_scorecards
- cost_events

## State machine mínima
- queued
- triaged
- spec_ready
- in_progress
- awaiting_validation
- validated
- awaiting_approval
- approved
- blocked
- failed
- archived

Cada transição deve criar um `task_event`.

## Permission model
### Ações
- read
- propose
- draft_write
- execute

### Recursos
- database
- github
- filesystem
- browser/tools
- external APIs
- deploy/infra

### Classes de risco
- Classe A — baixo risco
- Classe B — risco médio
- Classe C — risco alto
- Classe D — risco crítico

No MVP, classes C e D exigem approval humano.

## Mission Control — páginas MVP
- Overview
- Agents
- Tasks
- Approvals
- Knowledge
- Audit / Activity
- Filtro por projecto

## Integração com o FinHub
- O FinHub não é dono da plataforma
- O FinHub consome uma vista filtrada
- Não duplicar a lógica do cérebro nem das policies no FinHub
- Preparar uma futura tab tipo “AI Ops” ou “Agent Activity”

## APIs mínimas
- GET /agents
- GET /agents/:id
- GET /tasks
- POST /tasks
- GET /tasks/:id
- POST /tasks/:id/events
- GET /approvals
- POST /approvals/:id/approve
- POST /approvals/:id/reject
- GET /dashboard/overview
- GET /knowledge/decisions
- GET /knowledge/errors
- GET /knowledge/patterns

## Ordem de implementação
1. Setup do monorepo, auth, Mongo, schemas e layout base
2. Tasks, task_events, approvals e agent_runs
3. Policy engine simples e permission model
4. Scorecards, knowledge e cost events
5. Admin bridge para o FinHub

## Não-objectivos neste primeiro ciclo
- Fine-tuning de modelos
- Search semântica avançada se atrasar o MVP
- Misturar Mission Control com a UI principal do FinHub
- Computer-use como core do MVP
- Suportar todos os conectores logo de início

## Definition of done
- Plataforma separada do FinHub
- Brain Layer persistida em Mongo
- Mission Control navegável
- State machine funcional
- Approvals para risco alto/crítico
- Filtro por projecto
- README técnico claro

## Instrução final ao agente
Constrói primeiro a plataforma separada, não a integração visual no FinHub. Dá prioridade a tasks, approvals, state machine, Brain Layer e Mission Control. Se precisares de simplificar, simplifica conectores e features avançadas — nunca a separação entre platform layer e project layer.
