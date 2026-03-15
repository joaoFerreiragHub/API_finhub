# OpenClaw — Setup Log e Estado da Implementacao

*Ultima actualizacao: 2026-03-15*
*Proposito: registo completo de tudo o que foi feito, bloqueios encontrados e estado actual para qualquer agente continuar sem repetir esforco.*

---

## ESTADO ACTUAL (resumo rapido)

| Item | Estado | Notas |
|------|--------|-------|
| OpenClaw instalado | OK | v2026.3.13 |
| Gateway local | OK | `127.0.0.1:18789` |
| Workspace finhub-orchestrator | OK | 5 ficheiros preenchidos |
| Workspace finhub-cto | OK | 5 ficheiros preenchidos |
| Workspace finhub-product | OK | 5 ficheiros preenchidos |
| Workspace finhub-growth | OK | 5 ficheiros preenchidos |
| Workspace finhub-data-quality | OK | 5 ficheiros preenchidos |
| Skills finhub-* (4 skills) | OK | `ready` em `openclaw skills list` |
| Agentes registados em openclaw.json | OK | 5 agentes + main |
| Provider configurado | OK (estrutura) | Groq configurado, falta GROQ_API_KEY env var |
| Daemon (arranque automatico) | BLOQUEADO | Ver Blocker 1 abaixo |
| Teste do Orchestrator | PENDENTE | Aguarda GROQ_API_KEY |
| Teste de delegacao | PENDENTE | Aguarda teste do Orchestrator |
| Cron jobs | PENDENTE | Aguarda sistema operacional |

---

## ESTRUTURA ACTUAL EM DISCO

```
~/.openclaw/
  openclaw.json                    <-- config principal (ver seccao abaixo)
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
      test-local-skill/
        SKILL.md                   <-- criado durante debug (pode apagar)
  workspaces/
    finhub-orchestrator/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md  HEARTBEAT.md  MEMORY.md  skills/
    finhub-cto/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md
    finhub-product/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md
    finhub-growth/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md
    finhub-data-quality/
      AGENTS.md  SOUL.md  TOOLS.md  USER.md  IDENTITY.md
  agents/
    finhub-orchestrator/sessions/
    finhub-cto/sessions/
    finhub-product/sessions/
    finhub-growth/sessions/
    finhub-data-quality/sessions/
    main/
  skills/
    finhub-*/skill.md              <-- PATH ERRADO (ver Blocker 2)
                                       estes sao os ficheiros originais com BOM
                                       as versoes correctas estao em workspace/skills/
```

---

## OPENCLAW.JSON ACTUAL

```json
{
  "agents": {
    "defaults": {
      "workspace": "C:\\Users\\User\\.openclaw\\workspace"
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
  "models": {
    "providers": {
      "groq": {
        "apiKey": "${GROQ_API_KEY}",
        "baseUrl": "https://api.groq.com/openai/v1",
        "models": [
          { "id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B" },
          { "id": "llama3-8b-8192", "name": "Llama 3 8B" }
        ]
      }
    }
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

---

## BLOQUEIOS ENCONTRADOS E RESOLUCOES

### Blocker 1 — Daemon no Windows (CONTORNADO)
**Problema:** `openclaw onboard --install-daemon` falha com `schtasks create failed: ERROR: Acesso negado`

**Causa:** Requer permissoes de administrador para criar tarefas agendadas no Windows.

**Estado:** Contornado — gateway funciona em modo manual.

**Opcoes para resolver:**
- Opção A (recomendada): Abrir terminal como Administrador e correr `openclaw onboard --install-daemon`
- Opção B: Criar tarefa manual no Task Scheduler do Windows com o comando `openclaw gateway start`
- Opção C (temporaria): Criar `openclaw-startup.bat` na pasta `shell:startup`:
  ```bat
  @echo off
  start "" "openclaw" gateway start
  ```
  Abre a pasta com Win+R → `shell:startup`

**Para arranque manual por enquanto:**
```powershell
$env:GROQ_API_KEY = "gsk_..."
openclaw gateway start
```

---

### Blocker 2 — Skills nao descobertas (RESOLVIDO)
**Problema:** `openclaw skills list` mostrava so skills built-in. `openclaw skills info finhub-company-context` -> `not found`.

**Causa raiz 1:** Skills em path errado. Estavam em `~/.openclaw/skills/` mas devem estar em `~/.openclaw/workspace/skills/`.

**Causa raiz 2:** Ficheiros criados com BOM (Byte Order Mark `\xEF\xBB\xBF`) no inicio, que quebra o parsing do YAML frontmatter pelo OpenClaw.

**Resolucao aplicada:**
- Criados novos ficheiros `SKILL.md` (sem BOM) em `~/.openclaw/workspace/skills/finhub-*/`
- Verificado com `xxd` que ficheiros começam com `2d2d2d` (`---`) e nao com `efbbbf` (BOM)
- Resultado: todas as 4 skills aparecem como `✓ ready` em `openclaw skills list`

**Ficheiros antigos (com BOM, path errado):**
- `~/.openclaw/skills/finhub-*/skill.md` — podem ser apagados (ja nao sao usados)

---

### Blocker 3 — No API key for provider (EM CURSO)
**Problema:** `No API key found for provider "anthropic"` / `"groq"`

**Causa:** API key nao definida como variavel de ambiente.

**Estado:** Config estruturalmente correcto. Aguarda o utilizador definir a env var.

**Proximos passos:**
1. Obter GROQ_API_KEY em [console.groq.com](https://console.groq.com) (free tier)
2. Definir antes de arrancar o gateway:
   ```powershell
   $env:GROQ_API_KEY = "gsk_..."
   openclaw gateway start
   ```
3. Testar com `openclaw skills list` e primeiro ping ao orchestrator
4. Quando confirmado a funcionar, trocar para Anthropic (ver seccao openclaw.json acima)

---

### Blocker 4 — gateway restart falha no Windows (CONHECIDO)
**Problema:** `openclaw gateway restart` falha com `TypeError [ERR_UNKNOWN_SIGNAL]: Unknown signal: SIGUSR1`

**Causa:** SIGUSR1 e um sinal Unix, nao disponivel no Windows.

**Contorno:** Parar e arrancar manualmente o gateway quando e preciso recarregar config.

---

### Problema menor — openclaw.json nao aceita comentarios
**Contexto:** JSON standard nao suporta comentarios (`//` ou `/* */`). Tentativa de documentar o bloco Anthropic como comentario dentro do ficheiro falhou.

**Resolucao:** Documentacao do bloco Anthropic esta neste ficheiro (seccao openclaw.json acima).

---

## CONTINUAR NOUTRO COMPUTADOR

Tudo o que foi feito esta em `~/.openclaw/` na maquina actual (Windows, User).
Para continuar noutro computador, tens duas opcoes:

### Opcao A — Copiar a pasta .openclaw (mais rapido)
1. Copiar `C:\Users\User\.openclaw\` para o mesmo caminho no novo computador
2. Instalar OpenClaw no novo computador (seguir docs)
3. Definir a env var e arrancar o gateway (ver Proximos Passos abaixo)

### Opcao B — Reinstalar do zero com este documento como guia
1. Instalar OpenClaw no novo computador
2. Criar a estrutura de diretorios:
```powershell
mkdir ~/.openclaw/workspace/skills/finhub-company-context
mkdir ~/.openclaw/workspace/skills/finhub-compliance-boundaries
mkdir ~/.openclaw/workspace/skills/finhub-brand-voice
mkdir ~/.openclaw/workspace/skills/finhub-kpi-definitions
mkdir ~/.openclaw/workspaces/finhub-orchestrator
mkdir ~/.openclaw/workspaces/finhub-cto
mkdir ~/.openclaw/workspaces/finhub-product
mkdir ~/.openclaw/workspaces/finhub-growth
mkdir ~/.openclaw/workspaces/finhub-data-quality
mkdir ~/.openclaw/agents/finhub-orchestrator/sessions
mkdir ~/.openclaw/agents/finhub-cto/sessions
mkdir ~/.openclaw/agents/finhub-product/sessions
mkdir ~/.openclaw/agents/finhub-growth/sessions
mkdir ~/.openclaw/agents/finhub-data-quality/sessions
```
3. Pedir ao agente Claude Code para recriar todos os ficheiros usando o `FINHUB_OPERATING_SYSTEM.md` como fonte e este log como guia de setup
4. Copiar o `openclaw.json` da seccao acima
5. Definir a env var e arrancar

---

## PROXIMOS PASSOS (por ordem)

1. **Obter GROQ_API_KEY** — [console.groq.com](https://console.groq.com) (gratuito, sem cartao)
2. **Definir env var e arrancar gateway:**
   ```powershell
   $env:GROQ_API_KEY = "gsk_..."
   openclaw gateway start
   ```
3. **Verificar skills:**
   ```
   openclaw skills list
   # deve mostrar as 4 skills finhub-* como ready
   ```
4. **Testar o Orchestrator** — enviar o prompt inicial (ver FINHUB_OPERATING_SYSTEM.md, seccao 17) via WhatsApp/Telegram/Discord ligado ao gateway
5. **Testar delegacao** — Orchestrator -> CTO, Product, Growth, Data Quality
6. **Configurar cron jobs diarios** (08:00, 08:15, 08:30, 18:00)
7. **Quando sistema estavel** — trocar GROQ_API_KEY por ANTHROPIC_API_KEY e actualizar openclaw.json

---

## COMANDOS UTEIS

```powershell
# Ver estado do gateway
openclaw gateway status

# Listar skills (verificar se as 4 finhub aparecem)
openclaw skills list

# Info de uma skill especifica
openclaw skills info finhub-company-context

# Validar config
openclaw doctor

# Ver agentes registados
openclaw agents list

# Arrancar gateway com API key
$env:GROQ_API_KEY = "gsk_..."
openclaw gateway start
```

---

## FICHEIRO PRINCIPAL DE REFERENCIA

Todo o contexto da empresa, missoes dos agentes, templates e plano de execucao:
`dcos/FINHUB_OPERATING_SYSTEM.md`
