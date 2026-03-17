# FinHub — Estado das Tarefas (ponto central)

*Ultima actualizacao: 2026-03-17 12:00*
*Actualizado por: Claude Code (CTO)*

Este ficheiro e o UNICO ponto de verdade sobre o estado das tarefas.
TODOS os agentes DEVEM actualizar este ficheiro quando concluem trabalho.
O Orchestrator DEVE copiar o resumo para o MEMORY.md do agente WhatsApp.

---

## Sprint Activo: S0A — Agent Dashboard & Metricas

### Fase A — Specs e preparacao
| ID | Titulo | Estado | Resultado |
|----|--------|--------|-----------|
| S0A-001 | Specs backend (schema + API) | DONE | specs/S0A-001_backend-specs.md |
| S0A-002 | Specs frontend (dashboard UI) | DONE | specs/S0A-002_frontend-specs.md |
| S0A-003 | Template JSON activity log | DONE | specs/S0A-003_activity-log-template.json |
| S0A-004 | Spec agente finhub-analytics | TODO | — |

### Fase B — Backend (CTO via Claude Code)
| ID | Titulo | Estado | Resultado |
|----|--------|--------|-----------|
| S0A-005 | Schema Mongoose agent_activity_logs | DONE | src/models/AgentActivityLog.ts |
| S0A-006 | POST /api/admin/agent-logs | DONE | src/controllers/agentActivityLog.controller.ts |
| S0A-007 | GET /api/admin/agent-logs (filtros) | DONE | src/controllers/agentActivityLog.controller.ts |
| S0A-008 | GET /api/admin/agent-logs/stats | DONE | src/controllers/agentActivityLog.controller.ts |
| S0A-009 | GET /api/admin/agent-logs/agent/:agentId | DONE | src/controllers/agentActivityLog.controller.ts |
| S0A-010 | Smoke tests endpoints | PENDENTE QA | Aguarda setup de testes |

### Fase C — Frontend + Logging
| ID | Titulo | Estado | Resultado |
|----|--------|--------|-----------|
| S0A-011 | Pagina /admin/agent-dashboard layout | TODO | — |
| S0A-012 | Vista Timeline | TODO | — |
| S0A-013 | Vista Scorecard | TODO | — |
| S0A-014 | Vista Burndown | TODO | — |
| S0A-015 | Pastas activity-logs/ nos workspaces | TODO | — |
| S0A-016 | CLAUDE.md com regra de logging | TODO | — |
| S0A-017 | Script importacao JSON → MongoDB | DONE | src/scripts/importAgentLogs.ts |

---

## Resumo rapido
- Fase A: 3/4 DONE
- Fase B: 5/6 DONE (S0A-010 pendente QA)
- Fase C: 0/7
- Proximo passo: Testar endpoints, depois Fase C (frontend dashboard)

## Notas tecnicas (Fase B)
- Campo `model` renomeado para `llmModel` — conflito com Mongoose Document.model()
- TypeScript compila sem erros (`npx tsc --noEmit` = 0 erros nos ficheiros novos)
- Rotas registadas em `/api/admin/agent-logs` com auth + requireAdmin
- Decisao: usar `requireAdmin` simples (sem scopes granulares por agora)
