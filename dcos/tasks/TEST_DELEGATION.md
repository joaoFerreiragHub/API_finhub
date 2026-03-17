# Teste de delegacao — 2 sub-tarefas

## Objectivo
Testar que o Orchestrator consegue delegar a sub-agentes correctamente.

---

## Sub-tarefa A — CTO (Anthropic/Sonnet, via ACP)

Pedir ao CTO para criar as pastas `activity-logs/` nos workspaces dos agentes (S0A-015).

### O que o CTO deve fazer:
1. Criar pasta `activity-logs/` dentro de cada workspace em `C:\Users\User\.openclaw\workspaces\`
2. Em cada pasta criada, adicionar um ficheiro `README.md` com:
```
# Activity Logs
Pasta para registar logs de actividade deste agente em formato JSON.
Formato: YYYY-MM-DD_TASK-ID.json
```
3. Reportar ao Orchestrator quais pastas foram criadas

### Workspaces que devem ter a pasta:
- finhub-orchestrator
- finhub-cto
- finhub-task-architect
- finhub-whatsapp

---

## Sub-tarefa B — Product-Release (Groq, sem ACP)

Pedir ao agente product-release para sugerir 3 metricas prioritarias para o dashboard de agentes.

### Contexto a enviar ao product-release (ele NAO tem ACP):
O FinHub tem 13 agentes AI que executam tarefas (specs, implementacao, QA, etc).
Estamos a construir um dashboard para monitorar a actividade deles.
Ja temos: schema MongoDB com campos agentId, taskId, action, status, durationMinutes, tokensUsed (input/output/cost), qualityGate (passedQA/rejections).

### O que o product-release deve responder:
- 3 metricas prioritarias para o MVP do dashboard
- Para cada metrica: nome, porque e importante, como calcular com os campos que temos
- Formato: texto simples, maximo 10 linhas

---

## Regras para o Orchestrator

1. Lanca a Sub-tarefa A (CTO) primeiro. Espera resultado.
2. Depois lanca a Sub-tarefa B (Product-Release). Espera resultado.
3. NAO lances as duas ao mesmo tempo — respeita o limite de 2 sessoes e 30s entre delegacoes.
4. Se o ACP falhar para o CTO, NAO executes tu proprio — reporta ao fundador no Telegram.
5. Quando AMBAS estiverem concluidas:
   - Actualiza STATUS.md (S0A-015 → DONE se Sub-tarefa A OK)
   - Actualiza MEMORY.md do WhatsApp com o estado completo
   - Envia mensagem no Telegram: "Teste de delegacao concluido. Estado actualizado — podes consultar pelo WhatsApp."
