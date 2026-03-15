# OpenClaw — Setup Log e Estado da Implementacao

*Ultima actualizacao: 2026-03-15*
*Proposito: registo completo de tudo o que foi feito, bloqueios encontrados e estado actual para qualquer agente continuar sem repetir esforco.*

---

## ESTADO ACTUAL (resumo rapido)

| Item | Estado | Notas |
|------|--------|-------|
| OpenClaw instalado | OK | v2026.3.13 |
| Gateway local | OK | `127.0.0.1:18789` (modo manual) |
| Arranque automatico | OK | bat em shell:startup |
| Workspace finhub-orchestrator | OK | 8 ficheiros preenchidos |
| Workspace finhub-cto | OK | 8 ficheiros preenchidos |
| Workspace finhub-product | OK | 8 ficheiros preenchidos |
| Workspace finhub-growth | OK | 8 ficheiros preenchidos |
| Workspace finhub-data-quality | OK | 8 ficheiros preenchidos |
| Skills finhub-* (4 skills) | OK | `ready` em `openclaw skills list` |
| Agentes registados em openclaw.json | OK | 5 agentes + main |
| Provider configurado | OK | Groq (llama-3.3-70b-versatile) default + Anthropic backup |
| Cron jobs diarios | OK | 4 jobs criados (08:00/08:15/08:30/18:00) |
| Dashboard OpenClaw | OK | http://127.0.0.1:18789/__openclaw__/canvas/ |
| Teste do Orchestrator | OK | Respondeu correctamente com contexto FinHub |
| ACP + Codex | OK | codex-acp v0.9.5 ligado via acpx 0.1.16 |
| Teste de delegacao | PENDENTE | Proximo passo |

---

## MAQUINA ACTUAL

- **OS:** Windows 10 Pro
- **User:** Admin (C:\Users\Admin\)
- **Node:** v24.8.0
- **npm:** 11.6.0
- **OpenClaw:** v2026.3.13 (instalado via `npm install -g openclaw`)

---

## ESTRUTURA EM DISCO

```
C:\Users\Admin\.openclaw\
  openclaw.json                    <-- config principal
  workspace/
    skills/
      finhub-company-context/
        SKILL.md                   <-- OK, sem BOM, frontmatter correcto
      finhub-compliance-boundaries/
        SKILL.md                   <-- OK
      finhub-brand-voice/
        SKILL.md                   <-- OK
      finhub-kpi-definitions/
        SKILL.md                   <-- OK
  workspaces/
    finhub-orchestrator/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md  MEMORY.md  BOOTSTRAP.md  HEARTBEAT.md
    finhub-cto/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md  MEMORY.md  BOOTSTRAP.md  HEARTBEAT.md
    finhub-product/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md  MEMORY.md  BOOTSTRAP.md  HEARTBEAT.md
    finhub-growth/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md  MEMORY.md  BOOTSTRAP.md  HEARTBEAT.md
    finhub-data-quality/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md  MEMORY.md  BOOTSTRAP.md  HEARTBEAT.md
  agents/
    finhub-orchestrator/sessions/
    finhub-cto/sessions/
    finhub-product/sessions/
    finhub-growth/sessions/
    finhub-data-quality/sessions/
    main/sessions/
```

**NOTA:** Skills em `workspace/skills/` (NAO em `skills/`). Esta foi a causa raiz do Blocker 2 na maquina anterior.

---

## OPENCLAW.JSON ACTUAL

```json
{
  "models": {
    "providers": {
      "anthropic": {
        "apiKey": "${ANTHROPIC_API_KEY}",
        "baseUrl": "https://api.anthropic.com/v1",
        "models": [
          { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6" },
          { "id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5" }
        ]
      },
      "groq": {
        "baseUrl": "https://api.groq.com/openai/v1",
        "apiKey": "${GROQ_API_KEY}",
        "models": [
          { "id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B" },
          { "id": "llama3-8b-8192", "name": "Llama 3 8B" }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "workspace": "C:\\Users\\Admin\\.openclaw\\workspace",
      "model": "anthropic/claude-haiku-4-5-20251001"
    },
    "list": [
      { "id": "main" },
      { "id": "finhub-orchestrator", "workspace": "...\\workspaces\\finhub-orchestrator", "agentDir": "...\\agents\\finhub-orchestrator" },
      { "id": "finhub-cto",          "workspace": "...\\workspaces\\finhub-cto",          "agentDir": "...\\agents\\finhub-cto" },
      { "id": "finhub-product",      "workspace": "...\\workspaces\\finhub-product",      "agentDir": "...\\agents\\finhub-product" },
      { "id": "finhub-growth",       "workspace": "...\\workspaces\\finhub-growth",       "agentDir": "...\\agents\\finhub-growth" },
      { "id": "finhub-data-quality", "workspace": "...\\workspaces\\finhub-data-quality", "agentDir": "...\\agents\\finhub-data-quality" }
    ]
  },
  "gateway": {
    "mode": "local",
    "auth": { "token": "71f8131a70d8368567e90785b7c3ff57a1d86cca0a7b394ca0970d59e88244fb" }
  }
}
```

**Para trocar para Anthropic quando pronto:**
Substituir o bloco `"groq"` por:
```json
"anthropic": {
  "apiKey": "${ANTHROPIC_API_KEY}",
  "baseUrl": "https://api.anthropic.com/v1",
  "models": [
    { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6" },
    { "id": "claude-opus-4-6", "name": "Claude Opus 4.6" },
    { "id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5" }
  ]
}
```
E definir `ANTHROPIC_API_KEY` via `setx ANTHROPIC_API_KEY "sk-ant-..."`.

---

## CRON JOBS CONFIGURADOS

| ID | Nome | Schedule | Agente |
|----|------|----------|--------|
| 56046cb6-... | finhub-morning-orchestrator | 0 8 * * * | finhub-orchestrator |
| d42bf047-... | finhub-morning-cto | 15 8 * * * | finhub-cto |
| 8b1a76d0-... | finhub-morning-product | 30 8 * * * | finhub-product |
| 72cc50ff-... | finhub-evening-orchestrator | 0 18 * * * | finhub-orchestrator |

Verificar: `openclaw cron list`

---

## DASHBOARD

- URL: `http://127.0.0.1:18789/`
- Token: ver `openclaw.json` -> `gateway.auth.token`

---

## ARRANCAR O GATEWAY (modo manual)

O gateway nao tem daemon instalado (requer permissoes de admin para schtasks).
Esta configurado para arrancar automaticamente via bat no shell:startup:

```
C:\Users\Admin\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\openclaw-gateway.bat
```

Conteudo do bat:
```bat
@echo off
start "" "openclaw" gateway
```

**Para arrancar manualmente (se necessario):**
```powershell
openclaw gateway
```
(A GROQ_API_KEY ja esta definida como variavel de utilizador via setx)

---

## BLOQUEIOS ENCONTRADOS E RESOLUCOES

### Blocker 1 — Daemon no Windows (CONTORNADO)
**Problema:** `openclaw onboard --install-daemon` falha com `schtasks create failed: ERROR: Acesso negado`

**Causa:** Requer permissoes de administrador para criar tarefas agendadas no Windows.

**Estado:** Contornado — arranque automatico via bat em shell:startup.

**Opcoes para resolver definitivamente:**
- Opcao A (recomendada): Abrir terminal como Administrador e correr `openclaw onboard --install-daemon`
- Opcao B: Criar tarefa manual no Task Scheduler do Windows com o comando `openclaw gateway`

---

### Blocker 2 — Skills nao descobertas (RESOLVIDO — maquina anterior)
**Problema:** `openclaw skills list` mostrava so skills built-in.

**Causa raiz 1:** Skills em path errado. Devem estar em `~/.openclaw/workspace/skills/` (NAO em `~/.openclaw/skills/`).

**Causa raiz 2:** Ficheiros criados com BOM (Byte Order Mark) no inicio, que quebra o parsing do YAML frontmatter.

**Resolucao aplicada nesta maquina:**
- Skills criadas directamente em `~/.openclaw/workspace/skills/finhub-*/SKILL.md` (sem BOM)
- Resultado: todas as 4 skills aparecem como `ready` em `openclaw skills list`

---

### Blocker 3 — GROQ_API_KEY nao carregada na sessao actual (RESOLVIDO)
**Problema:** `setx` define a variavel para sessoes futuras mas nao para a sessao actual.

**Sintoma:** Gateway arranca mas reporta `missing env var "GROQ_API_KEY"`.

**Resolucao:**
- Para a sessao actual: `$env:GROQ_API_KEY = "gsk_..."` (PowerShell) ou `export GROQ_API_KEY=...` (bash)
- Para sessoes futuras: `setx GROQ_API_KEY "gsk_..."` (ja feito)
- O bat de arranque automatico herda a variavel do ambiente do utilizador correctamente

---

### Blocker 4 — gateway restart falha no Windows (CONHECIDO)
**Problema:** `openclaw gateway restart` falha com `TypeError [ERR_UNKNOWN_SIGNAL]: Unknown signal: SIGUSR1`

**Causa:** SIGUSR1 e um sinal Unix, nao disponivel no Windows.

**Contorno:** Parar e arrancar manualmente o gateway quando e preciso recarregar config.

---

### Blocker 5 — ACP spawn codex falha no Windows (RESOLVIDO)
**Problema:** `/acp spawn codex` dava `ACP_SESSION_INIT_FAILED: acpx exited with code 1`

**Causa raiz 1:** O pacote `@zed-industries/codex-acp` e um binario nativo. A dependencia opcional `@zed-industries/codex-acp-win32-x64` nao foi instalada automaticamente pelo npm global install.

**Causa raiz 2:** A funcao `splitCommandLine` do acpx trata `\` (backslash) como caractere de escape. Paths Windows com backslashes ficam corrompidos.

**Resolucao aplicada:**
1. Instalacao manual do binario nativo:
   ```bash
   npm install -g @zed-industries/codex-acp@0.9.5
   npm install -g @zed-industries/codex-acp-win32-x64@0.9.5
   ```
2. Copia do exe para path limpo:
   ```bash
   cp ~/.local/share/npm/node_modules/@zed-industries/codex-acp-win32-x64/bin/codex-acp.exe ~/.openclaw/bin/codex-acp.exe
   ```
3. Config acpx com FORWARD SLASHES (critico):
   ```json
   // ~/.acpx/config.json
   {
     "agents": {
       "codex": {
         "command": "C:/Users/Admin/.openclaw/bin/codex-acp.exe"
       }
     }
   }
   ```
4. Config openclaw.json actualizada:
   ```json
   "acpx": {
     "config": {
       "permissionMode": "approve-all",
       "nonInteractivePermissions": "deny",
       "strictWindowsCmdWrapper": false
     }
   }
   ```

**REGRA CRITICA:** Nunca usar backslashes em paths no `~/.acpx/config.json`. Usar sempre forward slashes (`C:/Users/...`).

---

### Blocker 6 — Env vars nao carregadas no gateway (RESOLVIDO)
**Problema:** Gateway arranca sem ANTHROPIC_API_KEY e GROQ_API_KEY quando lancado de sessao bash nova.

**Causa:** `setx` define para sessoes futuras mas nao para a sessao actual.

**Resolucao:**
```bash
export ANTHROPIC_API_KEY=$(powershell.exe -Command '[System.Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY","User")' 2>/dev/null | tr -d '\r')
export GROQ_API_KEY=$(powershell.exe -Command '[System.Environment]::GetEnvironmentVariable("GROQ_API_KEY","User")' 2>/dev/null | tr -d '\r')
openclaw gateway
```

---

## ACP — CONFIGURACAO COMPLETA

### Ficheiros de config ACP

| Ficheiro | Conteudo |
|----------|----------|
| `~/.openclaw/openclaw.json` | `acp.enabled: true`, `acp.backend: "acpx"`, `acp.defaultAgent: "codex"` |
| `~/.acpx/config.json` | Override do comando codex com path absoluto (forward slashes) |
| `~/.openclaw/bin/codex-acp.exe` | Binario nativo do bridge ACP-Codex |

### Pacotes npm globais necessarios

```
@openai/codex@0.114.0          — Codex CLI (executor)
@zed-industries/codex-acp@0.9.5 — ACP bridge
@zed-industries/codex-acp-win32-x64@0.9.5 — Binario nativo Windows
```

### Autenticacao Codex

```bash
codex auth login   # abre browser, login com ChatGPT Plus
codex auth status  # verificar
```

### Comandos ACP no dashboard

```
/acp doctor                    — verificar estado
/acp spawn codex --mode persistent --cwd C:\Users\Admin\Documents\GitHub\API_finhub
/acp status                    — ver sessoes activas
/focus <session-key>           — ligar thread a sessao
/acp close <session-key>       — fechar sessao
```

---

## PROXIMOS PASSOS (por ordem)

1. ~~Testar o Orchestrator~~ — **FEITO** (respondeu correctamente com contexto FinHub)
2. **Testar delegacao** — Orchestrator -> CTO, Product, Growth, Data Quality
3. **Instalar daemon com admin** (opcional) — abrir PowerShell como Administrador e correr `openclaw onboard --install-daemon`
4. **Configurar cron semanal** — domingo (plano semanal) e sexta (retro)
5. **Ligar app de mensagens** — WhatsApp ou Telegram para aceder ao gateway fora do dashboard

---

## COMANDOS UTEIS

```powershell
# Ver estado do gateway
openclaw gateway status

# Listar skills (verificar se as 4 finhub aparecem como ready)
openclaw skills list

# Ver agentes registados
openclaw agents list

# Ver cron jobs
openclaw cron list

# Arrancar gateway (se nao estiver a correr)
openclaw gateway

# Validar config
openclaw doctor

# Dashboard web
# Abrir browser em http://127.0.0.1:18789/
# Token: ver openclaw.json -> gateway.auth.token
```

---

## FICHEIRO PRINCIPAL DE REFERENCIA

Todo o contexto da empresa, missoes dos agentes, templates e plano de execucao:
`dcos/FINHUB_OPERATING_SYSTEM.md`
