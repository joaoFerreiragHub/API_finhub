# OpenClaw Gateway — Guia de Configuracao e Troubleshooting

**Data:** 2026-03-17
**Versao OpenClaw:** 2026.3.13

---

## 1. Ficheiro de configuracao

**Path:** `C:\Users\User\.openclaw\openclaw.json`

### Providers configurados

| Provider | Base URL | Custo | Uso |
|----------|----------|-------|-----|
| Anthropic | `https://api.anthropic.com/v1` | $3/$15 M tokens | CTO + Financial Tools (Codex) |
| Groq | `https://api.groq.com/openai/v1` | $0 (free tier) | Orchestrator, Task-Architect, WhatsApp, outros |
| Ollama | `http://127.0.0.1:11434/v1` | $0 (local) | Backup — nao usar como principal (ver notas) |

### Modelos por agente

| Agente | Modelo | Provider | Custo |
|--------|--------|----------|-------|
| finhub-orchestrator | `groq/llama-3.3-70b-versatile` | Groq | $0 |
| finhub-task-architect | `groq/llama-3.3-70b-versatile` | Groq | $0 |
| finhub-cto | `anthropic/claude-sonnet-4-6` | Anthropic | $3/$15 |
| finhub-financial-tools | `anthropic/claude-sonnet-4-6` | Anthropic | $3/$15 |
| finhub-whatsapp | `groq/llama-3.3-70b-versatile` | Groq | $0 |
| Outros 8 agentes | default (`anthropic/claude-sonnet-4-6`) | Anthropic | $3/$15 |

> **Nota:** Os 8 agentes Groq sem modelo explicito usam o default. Se precisarem de correr, definir modelo Groq explicito.

---

## 2. Canais

### Telegram
- **Bot:** @FinHubPT_bot
- **Routing:** Telegram -> finhub-orchestrator (via bindings)
- **Politica DM:** pairing
- **Allowed from:** `telegram:6266777614`

### WhatsApp
- **Numero:** +351912825849
- **Routing:** WhatsApp -> finhub-whatsapp
- **Politica DM:** pairing

---

## 3. Comandos de gestao do gateway

### Arrancar
```bash
cd C:\Users\User
npx openclaw gateway start
```
**IMPORTANTE:** Esperar 15-20 segundos apos start antes de verificar status. O Scheduled Task demora a arrancar.

### Parar
```bash
npx openclaw gateway stop
```

### Parar forcado (quando nao responde)
```bash
npx openclaw gateway stop --force
```

### Verificar estado
```bash
npx openclaw gateway status
```
- Deve mostrar `RPC probe: ok` e `Listening: 127.0.0.1:18789`
- Se mostrar `RPC probe: failed`, esperar mais 10 segundos e tentar novamente

### Restart completo (procedimento recomendado)
```bash
# 1. Parar
npx openclaw gateway stop --force

# 2. Limpar locks (CRITICO — locks bloqueiam sessoes)
# No Git Bash:
find C:/Users/User/.openclaw/agents -name "*.lock" -delete

# No PowerShell:
Get-ChildItem -Path "C:\Users\User\.openclaw\agents" -Recurse -Filter "*.lock" | Remove-Item

# 3. Esperar 3 segundos
# 4. Arrancar
npx openclaw gateway start

# 5. Esperar 15-20 segundos
# 6. Verificar
npx openclaw gateway status
```

---

## 4. Logs

**Path:** `C:\tmp\openclaw\openclaw-YYYY-MM-DD.log`

### Ver logs em tempo real (Git Bash)
```bash
tail -f "C:/tmp/openclaw/openclaw-2026-03-17.log"
```

### Procurar erros
```bash
tail -200 "C:/tmp/openclaw/openclaw-2026-03-17.log" | grep -i "error\|fail\|blocked"
```

---

## 5. Problemas conhecidos e solucoes

### 5.1 — Groq modelo "context window too small"
**Sintoma:** Log mostra `blocked model (context window too small): groq/llama3-70b-8192 ctx=8192 (min=16000)`
**Causa:** OpenClaw resolve `llama-3.3-70b-versatile` para o modelo errado `llama3-70b-8192` (8K contexto)
**Solucao:** Adicionar `contextWindow` e `maxTokens` explicitos na config do modelo Groq:
```json
{
  "id": "llama-3.3-70b-versatile",
  "name": "Llama 3.3 70B (default)",
  "contextWindow": 131072,
  "maxTokens": 32768
}
```

### 5.2 — Session file locked
**Sintoma:** `agent failed: session file locked`
**Causa:** Crash anterior deixou ficheiro .lock orfao
**Solucao:** Apagar todos os .lock files antes de arrancar:
```bash
find C:/Users/User/.openclaw/agents -name "*.lock" -delete
```

### 5.3 — Gateway nao arranca (state Ready, RPC failed)
**Sintoma:** `gateway status` mostra `state Ready` mas `RPC probe: failed`
**Causa:** O Scheduled Task demora a arrancar ou crashou
**Solucao:**
1. Esperar mais tempo (ate 30 segundos)
2. Se continuar, parar com `--force` e arrancar de novo
3. Verificar logs em `C:\tmp\openclaw\` para erros de JSON ou config

### 5.4 — Telegram nao recebe respostas
**Sintoma:** Envias mensagem ao bot mas nao responde
**Possiveis causas:**
1. Gateway nao esta a correr (verificar com `gateway status`)
2. Modelo bloqueado por contexto pequeno (ver 5.1)
3. Telegram polling stalled (restart gateway)
4. Session lock bloqueada (ver 5.2)

### 5.5 — Modelos Ollama locais (NAO RECOMENDADO para orchestrador)
**Testado e rejeitado:**
- `qwen3:14b` — nao consegue processar o system prompt do orchestrador (30K chars + 25 tools)
- `qwen3:32b` — funciona mas demora 8 minutos por resposta (20GB RAM)
- Ollama local so faz sentido para agentes com prompts simples
**Decisao:** Usar Groq (cloud gratis) em vez de Ollama para orchestracao

### 5.6 — Groq qwen3-32b output corrompido
**Testado e rejeitado:** `groq/qwen/qwen3-32b` produz output garbled/corrompido com o system prompt do orchestrador
**Decisao:** Usar `groq/llama-3.3-70b-versatile` — unico modelo Groq que funciona de forma fiavel

### 5.7 — Groq llama-3.3-70b-versatile tool calling failure (orchestrador)
**Testado 2026-03-17:** Modelo resolve correctamente (131K contexto), mas falha tool calling com 25 tools (~19K chars de schemas).
**Erro:** `"Failed to call a function. Please adjust your prompt. See 'failed_generation' for more details."`
**Causa:** LLaMA 3.3 70B nao consegue processar tool schemas complexos do orchestrador.
**Decisao:** Orchestrador DEVE usar `anthropic/claude-sonnet-4-6`. Nenhum modelo gratis aguenta 25 tools.

### 5.8 — sessions.json cache de modelo errado
**Sintoma:** Config diz `groq/llama-3.3-70b-versatile` mas logs mostram `llama3-70b-8192` (modelo deprecated/removido)
**Causa:** `agents/<id>/sessions/sessions.json` guarda `modelOverride` da sessao anterior. Se o modelo mudou, o cache antigo prevalece.
**Solucao:** Editar `sessions.json` e corrigir `modelOverride`, `model`, `modelProvider`, `contextTokens`. Ou apagar a sessao.
**Path:** `C:\Users\User\.openclaw\agents\finhub-orchestrator\sessions\sessions.json`

---

## 6. Checklist de verificacao (correr sempre apos mudancas)

- [ ] JSON valido? `node -e "JSON.parse(require('fs').readFileSync('C:/Users/User/.openclaw/openclaw.json','utf8'))"`
- [ ] Gateway a correr? `npx openclaw gateway status` -> `RPC probe: ok`
- [ ] Telegram a responder? Enviar "ola" ao @FinHubPT_bot
- [ ] WhatsApp a responder? Enviar mensagem ao +351912825849
- [ ] Sem locks orfaos? `find C:/Users/User/.openclaw/agents -name "*.lock"` (deve retornar vazio)
- [ ] Logs sem erros? `tail -50 "C:/tmp/openclaw/openclaw-YYYY-MM-DD.log" | grep -i error`

---

## 7. Arquitectura de custos (actualizada 2026-03-17)

```
GRATUITO ($0):
  Groq: task-architect, whatsapp
  Ollama: backup local (nao usado actualmente)

PAGO (Anthropic):
  claude-sonnet-4-6: Orchestrador, CTO (Codex), Financial Tools
  Orchestrador PRECISA de Sonnet (25 tools, nenhum modelo gratis aguenta)
  CTO precisa de Sonnet para qualidade de codigo via Codex
```

### Routing actual
- Telegram -> finhub-orchestrator (Sonnet)
- WhatsApp -> finhub-orchestrator (Sonnet) — alterado 2026-03-17, era finhub-whatsapp
