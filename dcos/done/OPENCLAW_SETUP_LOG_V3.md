# OpenClaw — Setup Log V3 (Desktop)

*Ultima actualizacao: 2026-03-17*
*Maquina: DESKTOP-G8SS29P (Windows 10 Pro, User: User)*
*Proposito: registo completo da implementacao multi-agente para qualquer agente continuar sem repetir esforco.*

---

## ESTADO ACTUAL (resumo rapido)

| Item | Estado | Notas |
|------|--------|-------|
| OpenClaw instalado | OK | v2026.3.13 via nvm4w |
| Gateway local | OK | `127.0.0.1:18789` (schtasks service) |
| Arranque automatico | OK | Windows Scheduled Task "OpenClaw Gateway" |
| Agentes registados | OK | 12 agentes (11 finhub + main) |
| Skills finhub-* | OK | 6 skills em `~/.openclaw/skills/` + 4 em `workspace/skills/` |
| Provider Anthropic | OK | Claude Sonnet 4.6 (orchestrator, cto, financial-tools) |
| Provider Groq | OK | LLaMA 3.3 70B (restantes agentes) |
| Cron jobs diarios | OK | 4 jobs (08:00/08:15/08:30/18:00) — status: error (paths corrigidos, aguarda proximo ciclo) |
| Telegram bot | OK | @Boyo, token configurado, dmPolicy: pairing |
| ACP + acpx | OK | Plugin auto-descoberto via nvm path |
| Dashboard | OK | `http://127.0.0.1:18789/#token=...` |

---

## MAQUINAS

### Desktop (ACTUAL — DESKTOP-G8SS29P)
- **OS:** Windows 10 Pro 10.0.19045
- **User:** User (`C:\Users\User\`)
- **Node:** v24.14.0 (via nvm4w em `C:\nvm4w\nodejs\`)
- **OpenClaw:** v2026.3.13

### Portatil (ANTERIOR)
- **User:** Admin (`C:\Users\Admin\`)
- **Nota:** Config foi migrada para desktop em 2026-03-17. Todos os paths `C:\Users\Admin\` substituidos por `C:\Users\User\`.

---

## ESTRUTURA EM DISCO

```
C:\Users\User\.openclaw\
  openclaw.json                         <-- config principal (12 agentes, 2 providers)
  gateway.cmd                           <-- launcher do gateway service
  exec-approvals.json                   <-- aprovacoes de execucao

  skills/                               <-- skills partilhadas (descobertas automaticamente)
    finhub-company-context/skill.md
    finhub-compliance-boundaries/skill.md
    finhub-brand-voice/skill.md
    finhub-kpi-definitions/skill.md
    finhub-doc-analysis-protocol/skill.md
    finhub-handoff-standard/skill.md

  workspace/skills/                     <-- skills extendidas (tambem descobertas)
    finhub-company-context/SKILL.md
    finhub-compliance-boundaries/SKILL.md
    finhub-brand-voice/SKILL.md
    finhub-kpi-definitions/SKILL.md

  agents/                               <-- cada agente tem CLAUDE.md, MEMORY.md, models.json, sessions/
    main/
    finhub-orchestrator/
    finhub-cto/
    finhub-product-release/
    finhub-growth-acquisition/
    finhub-data-quality/
    finhub-legal-compliance/
    finhub-qa-release/
    finhub-financial-tools/
    finhub-knowledge-librarian/
    finhub-content-platform/
    finhub-directory-commerce/
    codex/

  workspaces/                           <-- cada workspace tem IDENTITY.md, AGENTS.md, SOUL.md, TOOLS.md, etc.
    finhub-orchestrator/
    finhub-cto/
    finhub-product/
    finhub-growth/
    finhub-data-quality/
    finhub-legal/
    finhub-qa/
    finhub-financial-tools/
    finhub-content-platform/
    finhub-directory-commerce/
    finhub-growth-acquisition/
    finhub-knowledge-librarian/
    finhub-legal-compliance/
    finhub-product-release/
    finhub-qa-release/

  cron/jobs.json                        <-- 4 cron jobs
  logs/                                 <-- audit logs
  devices/                              <-- paired devices
  canvas/                               <-- dashboard canvas
  memory/                               <-- memoria global
  identity/                             <-- identidade global
```

---

## ARQUITECTURA DE AGENTES (4 Camadas, 12 Agentes)

### Camada A — Command (Claude Sonnet 4.6 + ACP)

| Agente | Emoji | Modelo | Funcao |
|--------|-------|--------|--------|
| **finhub-orchestrator** | 🧭 | anthropic/claude-sonnet-4-6 | Chief of Staff. Recebe pedidos, delega a especialistas, le ficheiros via Codex/ACP, fornece contexto a agentes Groq, executa mudancas de codigo, mantem coerencia. Regra critica: `maxConcurrentSessions: 2` |
| **finhub-cto** | 🔧 | anthropic/claude-sonnet-4-6 | Chief Architect. Acesso directo a Codex/ACP. Arquitectura, code review, qualidade, problemas tecnicos complexos (hydration, SSR, performance). Conhece o stack completo. |
| **finhub-financial-tools** | 📊 | anthropic/claude-sonnet-4-6 | Implementa ferramentas FIRE (simulador, portfolio, dashboard, what-if, Monte Carlo), stocks, REITs, ETFs, calculadoras, integracao com APIs financeiras. |

### Camada B — Product Domain (Groq LLaMA 3.3 70B)

| Agente | Emoji | Modelo | Funcao |
|--------|-------|--------|--------|
| **finhub-product-release** | 📋 | groq/llama-3.3-70b | Product Manager. Backlog, priorizacao, user stories, roadmap, planeamento de releases. Delega ao orchestrator para contexto de codigo. |
| **finhub-content-platform** | — | groq/llama-3.3-70b | Gestor de conteudo. Artigos, videos, cursos, podcasts, livros, eventos, dashboard de criadores, workflows editoriais (draft -> review -> publish). Conteudo em PT-PT. |
| **finhub-directory-commerce** | — | groq/llama-3.3-70b | Gestor de directorio. Brokers, seguradoras, plataformas financeiras, reviews, comparacoes, verificacao de informacao factual. |
| **finhub-growth-acquisition** | 📈 | groq/llama-3.3-70b | Growth/Marketing. SEO, aquisicao, branding, conteudo social/blog, waitlist, landing pages. |

### Camada C — Trust & Risk (Groq LLaMA 3.3 70B)

| Agente | Emoji | Modelo | Funcao |
|--------|-------|--------|--------|
| **finhub-data-quality** | 🔍 | groq/llama-3.3-70b | Validacao de dados financeiros, monitoriza integridade de APIs (AlphaVantage 25/dia, FMP 250/dia, Polygon 1000/dia, NewsAPI 1000/dia), regras de validacao, deteccao de anomalias. |
| **finhub-qa-release** | 🧪 | groq/llama-3.3-70b | QA/Tester. Testes funcionais/regressao, validacao visual/UX, identificacao de bugs, criterios de aceitacao, smoke tests. |
| **finhub-legal-compliance** | ⚖️ | groq/llama-3.3-70b | Compliance. RGPD, termos de servico, politica de privacidade, disclaimers financeiros, consentimento de cookies. |

### Camada D — Institutional Knowledge (Groq LLaMA 3.3 70B)

| Agente | Emoji | Modelo | Funcao |
|--------|-------|--------|--------|
| **finhub-knowledge-librarian** | — | groq/llama-3.3-70b | Transforma trabalho disperso em inteligencia acumulada. Mantem indice de docs, canoniza decisoes, arquiva handoffs, mantem 6 skills partilhadas, actualiza playbooks. Ciclo semanal: recolhe MEMORY.md, identifica padroes recorrentes (2+ ocorrencias), promove a skills/regras. |

---

## SKILLS PARTILHADAS (6 + 4 Extendidas)

### Skills em `~/.openclaw/skills/` (globais)

| Skill | Descricao |
|-------|-----------|
| **finhub-company-context** | Contexto da empresa: 3 pilares (ferramentas, conteudo, directorio), stack, estado actual, prioridades de beta |
| **finhub-compliance-boundaries** | Guardrails: FinHub educa, organiza, contextualiza — NUNCA recomenda. Disclaimers obrigatorios. RGPD. |
| **finhub-brand-voice** | Tom da marca: humana, sobria, util, objectiva, fiavel. PT-PT com "tu" informal. |
| **finhub-kpi-definitions** | KPIs por area: Product (DAU, retencao D7 >30%), Content, Growth, Data Quality. Formato de reporte. |
| **finhub-doc-analysis-protocol** | Quando e como analisar docs: verificar recencia, consistencia, completude. Classificar: atual/desatualizado/conflito/obsoleto. |
| **finhub-handoff-standard** | Formato obrigatorio de handoff: titulo, de/para, objectivo, resultado, ficheiros, riscos, licoes, proximos passos. |

### Skills extendidas em `~/.openclaw/workspace/skills/`

Versoes mais detalhadas de company-context, compliance-boundaries, brand-voice e kpi-definitions com exemplos e regras adicionais.

---

## LEARN-ON-CLOSE (Padrao Obrigatorio)

Todos os agentes seguem o padrao Learn-on-Close ao terminar uma sessao:

1. **Registar decisoes** em `MEMORY.md` do agente
2. **Registar erros** na pasta `errors/` do agente
3. **Registar prompts uteis** na pasta `prompts/` do agente
4. Orchestrator **valida** learnings dos agentes e decide se sao transversais ou especificos
5. Knowledge Librarian **promove** padroes recorrentes (2+ ocorrencias) a skills/regras

---

## LIMITE ABSOLUTO (TODOS OS AGENTES)

> **FinHub educa, organiza, contextualiza, explora dados, simula cenarios.**
> **NAO recomenda, NAO sugere alocacoes, NAO faz suitability, NAO apresenta dados simulados como reais.**

Formulacoes permitidas: explicar conceitos, comparar features, mostrar metricas, resumir mercados, simular cenarios.
Formulacoes proibidas: "compra X", "vende Y", "melhor ETF para ti", suitability personalizada.

---

## CONFIGURACAO DE MODELOS

```
Providers:
  anthropic:
    - claude-sonnet-4-6 (orchestrator, cto, financial-tools)
    - claude-haiku-4-5-20251001 (disponivel como fallback)
  groq:
    - llama-3.3-70b-versatile (default para restantes agentes)
    - qwen/qwen3-32b (fallback custo-eficiencia)
    - llama-3.1-8b-instant (crons simples)
```

---

## CRON JOBS

| Nome | Schedule | Agente | Estado |
|------|----------|--------|--------|
| finhub-morning-orchestrator | 08:00 diario | finhub-orchestrator | error (paths corrigidos, aguarda ciclo) |
| finhub-morning-cto | 08:15 diario | finhub-cto | error (idem) |
| finhub-morning-product | 08:30 diario | finhub-product-release | error (idem) |
| finhub-evening-orchestrator | 18:00 diario | finhub-orchestrator | error (idem) |

---

## CANAIS

### Telegram
- **Bot:** @Boyo
- **dmPolicy:** pairing (requer pairing inicial)
- **groupPolicy:** allowlist (vazio — mensagens de grupo sao ignoradas)
- **streaming:** partial

### Dashboard Web
- **URL:** `http://127.0.0.1:18789/`
- **Autenticacao:** `http://127.0.0.1:18789/#token=<ver openclaw.json -> gateway.auth.token>`
- **Comando:** `openclaw dashboard`

---

## GATEWAY (Windows Service)

O gateway esta instalado como Windows Scheduled Task:

```powershell
# Ver estado
powershell -Command "schtasks /Query /TN 'OpenClaw Gateway'"

# Parar
powershell -Command "schtasks /End /TN 'OpenClaw Gateway'"

# Arrancar
powershell -Command "schtasks /Run /TN 'OpenClaw Gateway'"

# Logs
cat C:\tmp\openclaw\openclaw-2026-03-17.log
```

---

## ACP (Agent Communication Protocol)

- **Backend:** acpx (plugin auto-descoberto)
- **Plugin path:** `C:\Users\User\AppData\Local\nvm\v24.14.0\node_modules\openclaw\extensions\acpx\`
- **Default agent:** codex
- **maxConcurrentSessions:** 2
- **permissionMode:** approve-all

---

## STACK TECNICO DO FINHUB

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS 3.4 + shadcn/ui + Recharts + Zustand |
| Backend | Node.js + Express + TypeScript |
| Base de dados | MongoDB + Redis |
| SSR | Vike v0.4.255 |
| CI/CD | GitHub Actions + Docker |
| Monitoring | Sentry + PostHog |
| APIs financeiras | FMP (250/dia), AlphaVantage (25/dia), Polygon (1000/dia), NewsAPI (1000/dia) |

### Repos nesta maquina
- **API:** `C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub`
- **Frontend:** `C:\Users\User\Documents\GitHub\Riquinho\api\Front\FinHub-Vite`

---

## BLOQUEIOS CONHECIDOS E RESOLUCOES

### Blocker 1 — Paths `C:\Users\Admin` (RESOLVIDO — 2026-03-17)
**Problema:** Config e sessoes migraram do portatil (Admin) com paths errados.
**Resolucao:** Substituicao em massa de `C:\Users\Admin` -> `C:\Users\User` em:
- `openclaw.json` (agents, workspaces, plugins)
- `settings.local.json` (additionalDirectories)
- Todos os CLAUDE.md dos agentes
- Todos os sessions.json e .jsonl (1948+ ocorrencias)
- Skills md files

### Blocker 2 — Gateway install requer admin (RESOLVIDO)
**Problema:** `openclaw gateway install` falha com "Acesso negado".
**Resolucao:** `Start-Process powershell -Verb RunAs` para elevar permissoes.

### Blocker 3 — Gateway restart no Windows (CONHECIDO)
**Problema:** `openclaw gateway restart` falha com `ERR_UNKNOWN_SIGNAL: SIGUSR1`.
**Causa:** SIGUSR1 e sinal Unix, nao disponivel no Windows.
**Contorno:** Parar e arrancar via schtasks.

### Blocker 4 — Bedrock discovery (IGNORAVEL)
**Warning:** `UnrecognizedClientException: The security token included in the request is invalid.`
**Causa:** Nao temos AWS configurado. Pode ser ignorado — nao afecta Anthropic/Groq.

### Blocker 5 — Skills BOM (RESOLVIDO — maquina anterior)
**Problema:** Ficheiros criados com BOM quebravam parsing YAML frontmatter.
**Resolucao:** Skills recriadas sem BOM.

### Blocker 6 — `channels.telegram.model` (RESOLVIDO)
**Problema:** Chave nao reconhecida nesta versao do OpenClaw.
**Resolucao:** Removida do openclaw.json.

---

## COMANDOS UTEIS

```powershell
# Estado geral
openclaw doctor

# Listar agentes
openclaw agents list

# Listar skills
openclaw skills list

# Listar cron jobs
openclaw cron list

# Gateway
openclaw gateway status
powershell -Command "schtasks /Query /TN 'OpenClaw Gateway'"
powershell -Command "schtasks /End /TN 'OpenClaw Gateway'"
powershell -Command "schtasks /Run /TN 'OpenClaw Gateway'"

# Dashboard (abre browser com token)
openclaw dashboard

# Logs do gateway
# Ficheiro: C:\tmp\openclaw\openclaw-YYYY-MM-DD.log

# TypeScript check (backend)
cd C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub && npx tsc --noEmit

# TypeScript check (frontend)
cd C:\Users\User\Documents\GitHub\Riquinho\api\Front\FinHub-Vite && npx tsc --noEmit --project tsconfig.app.json
```

---

## FICHEIROS DE REFERENCIA

| Ficheiro | Descricao |
|---------|-----------|
| `dcos/FinHub_OpenClaw_Masterplan.md` | Masterplan completo da arquitectura multi-agente |
| `dcos/FINHUB_OPERATING_SYSTEM.md` | Sistema operativo: missao, cadencia diaria, guardrails, templates |
| `dcos/OPENCLAW_SETUP_LOG_V2.md` | Setup log V2 (estado do portatil) |
| `dcos/done/FINHUB_AGENT_STRUCTURE_ADDENDUM.md` | Addendum da estrutura de 11 agentes |
| `dcos/done/FINHUB_COMPANY_BRIEF_AGENTES.md` | Brief da empresa para contexto dos agentes |

---

## MIGRACAO PARA NOVA MAQUINA (Checklist)

Se precisares de migrar para outra maquina:

1. [ ] Instalar Node.js (v24+) e OpenClaw (`npm install -g openclaw`)
2. [ ] Copiar `~/.openclaw/` inteiro para a nova maquina
3. [ ] Substituir todos os paths do user antigo pelo novo (usar script python abaixo)
4. [ ] Definir env vars: `ANTHROPIC_API_KEY`, `GROQ_API_KEY` via `setx`
5. [ ] Instalar gateway: abrir PowerShell como Admin -> `openclaw gateway install`
6. [ ] Arrancar gateway: `openclaw gateway` ou via schtasks
7. [ ] Correr `openclaw doctor --fix`
8. [ ] Testar: `openclaw dashboard`

### Script de migracao de paths

```python
import os
old = 'Users' + chr(92) + chr(92) + 'OLD_USER'
new = 'Users' + chr(92) + chr(92) + 'NEW_USER'
base = os.path.expanduser('~/.openclaw')
for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith(('.json', '.jsonl', '.md')):
            fp = os.path.join(root, f)
            try:
                with open(fp, 'r', encoding='utf-8') as fh:
                    content = fh.read()
                count = content.count(old)
                if count > 0:
                    with open(fp, 'w', encoding='utf-8') as fh:
                        fh.write(content.replace(old, new))
                    print(f'{fp}: {count} replacements')
            except:
                pass
```
