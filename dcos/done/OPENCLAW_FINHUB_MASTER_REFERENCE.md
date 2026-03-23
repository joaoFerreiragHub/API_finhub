# OpenClaw + FinHub — Master Reference

*Ultima actualizacao: 2026-03-17*
*Versao: 3.0*
*Proposito: documento unico de referencia para qualquer agente, consultor ou humano entender a arquitectura completa, contribuir com melhorias ou continuar o trabalho sem perder contexto.*

---

# INDICE

1. [Visao e Filosofia](#parte-1--visao-e-filosofia)
2. [Arquitectura de Agentes](#parte-2--arquitectura-de-agentes)
3. [Perfil Detalhado de Cada Agente](#parte-3--perfil-detalhado-de-cada-agente)
4. [Infraestrutura](#parte-4--infraestrutura)
5. [Sistema de Conhecimento](#parte-5--sistema-de-conhecimento)
6. [Fluxo de Comunicacao e Delegacao](#parte-6--fluxo-de-comunicacao-e-delegacao)
7. [Custos e Modelos](#parte-7--custos-e-modelos)
8. [Seguranca e Limites](#parte-8--seguranca-e-limites)
9. [Evolucao e Roadmap da Estrutura](#parte-9--evolucao-e-roadmap-da-estrutura)
10. [Metricas e Autonomia](#parte-10--metricas-e-autonomia)
11. [Problemas Conhecidos e Licoes](#parte-11--problemas-conhecidos-e-licoes)
12. [Migracao e Continuidade](#parte-12--migracao-e-continuidade)

---

# PARTE 1 — VISAO E FILOSOFIA

## 1.1 O que e o FinHub

Plataforma portuguesa de literacia financeira. 3 pilares:
- **Ferramentas de mercado** — analise de stocks, REITs, ETFs, crypto, simulador FIRE
- **Hub de conteudo** — artigos, videos, cursos, criadores portugueses
- **Directorio** — brokers, seguradoras, plataformas (comparacao objectiva)

**Publico:** Investidores portugueses, iniciantes a intermedios.
**Lingua:** Portugues (PT-PT).
**Principio:** FinHub educa, organiza, contextualiza — **NUNCA recomenda**.

## 1.2 O que e o OpenClaw

Plataforma de orquestracao de agentes AI. Funciona como um "sistema operativo" para a equipa de agentes do FinHub:
- **Gateway** local (WebSocket em `127.0.0.1:18789`) — corre como Windows Scheduled Task
- **Agentes** com CLAUDE.md (system prompt), workspace (acesso a ficheiros), e modelo AI
- **Canais** de comunicacao (WhatsApp)
- **ACP/Codex** para execucao de codigo via Claude

## 1.3 Filosofia da equipa de agentes

> O FinHub nao precisa de um super-agente.
> Precisa de uma **super organizacao** de agentes que pensa em conjunto, executa por dominio e **aprende com tudo o que faz**.

**Principios:**
1. **Conhecimento acumula** — cada tarefa enriquece o brain colectivo, nao se perde
2. **Especializacao por dominio** — cada agente domina a sua area
3. **Documentacao obrigatoria** — sem ficheiro escrito, o trabalho nao existiu
4. **Fonte de verdade unica** — todos leem e escrevem no mesmo sitio (`dcos/agents/`)
5. **Melhoria continua** — modelos, infra, acessos e processos evoluem sempre
6. **Coracao humano** — agentes executam, o fundador decide. Autonomia e proporcional a confianca demonstrada

## 1.4 Objectivo de longo prazo

Construir um sistema onde:
- Agentes sao cada vez **mais inteligentes** (melhores modelos, mais contexto, mais memoria)
- A infraestrutura e cada vez **mais solida** (cloud, bases de dados, monitoring)
- O conhecimento e **captado, catalogado e reutilizado** automaticamente
- O fundador foca em **decisoes estrategicas**, nao em execucao repetitiva
- Qualquer novo agente ou humano pode entrar e ter **contexto total** em minutos

---

# PARTE 2 — ARQUITECTURA DE AGENTES

## 2.1 Visao geral — 3 camadas de modelo

| Camada | Modelo | Custo | Papel |
|--------|--------|-------|-------|
| **Cerebro** | Claude Sonnet 4.6 ($3/$15 por M tokens) | $$$ | Execucao de codigo, logica financeira complexa |
| **Critico** | Claude Haiku 4.5 ($0.80/$4 por M tokens) | $$ | Orquestracao, QA, compliance, specs tecnicas |
| **Operacional** | Groq LLaMA 3.3 70B (gratis) | $0 | Documentacao, roadmaps, SEO, conteudo, directorio |

**Logica de atribuicao:** O modelo mais caro so e usado quando ha codigo real para escrever ou logica financeira critica. Tudo o resto usa o modelo mais barato que cumpra a tarefa.

## 2.2 Mapa completo dos agentes (13 total)

### Sonnet 4.6 (Cerebro) — 2 agentes

| ID | Nome informal | Missao |
|----|---------------|--------|
| `finhub-cto` | CTO | Arquitectura, code review, implementacao via Codex 5.3. Gatekeeper tecnico. |
| `finhub-financial-tools` | Financial Tools | FIRE, stocks, REITs, ETFs, calculadoras, scoring, modelos financeiros. |

### Haiku 4.5 (Critico) — 5 agentes

| ID | Nome informal | Missao |
|----|---------------|--------|
| `finhub-orchestrator` | Boyo | Coordenacao central. Recebe ordens no WhatsApp, delega, consolida. NAO executa codigo. |
| `finhub-qa-release` | QA | Testes funcionais, regressao, validacao visual, UX, smoke tests. |
| `finhub-data-quality` | Data Quality | Validacao de dados financeiros, APIs externas, anomalias, integridade. |
| `finhub-legal-compliance` | Legal | RGPD, termos de servico, privacidade, cookies, disclaimers financeiros. |
| `finhub-task-architect` | Task Architect | Decomposicao de objectivos em tarefas atomicas com specs executaveis. |

### Groq LLaMA 3.3 70B (Operacional) — 5 agentes

| ID | Nome informal | Missao |
|----|---------------|--------|
| `finhub-product-release` | Product Manager | Backlog, priorizacao, roadmap, scope, go/no-go para releases. |
| `finhub-growth-acquisition` | Growth | SEO, marketing, aquisicao, landing pages, narrativa. |
| `finhub-knowledge-librarian` | Librarian | Curadoria de conhecimento, indices, canonizacao de decisoes. |
| `finhub-content-platform` | Content | Conteudo editorial, workflows de criadores, categorizacao. |
| `finhub-directory-commerce` | Directory | Directorio de brokers/seguradoras, reviews, comparacoes. |

### Agente auxiliar

| ID | Modelo | Missao |
|----|--------|--------|
| `finhub-whatsapp` | Groq | Agente de canal WhatsApp (minimal tools). |

## 2.3 Fluxo de trabalho principal

```
Fundador (WhatsApp)
  → Boyo (Haiku) — interpreta, decide routing
    → Agente de dominio — analisa, documenta, prepara
      → CTO (Sonnet → Codex 5.3) — se ha codigo para implementar
    → QA / Data Quality / Legal — validam resultado
    → Knowledge Librarian — captura learnings
  → Boyo — consolida e responde ao fundador no WhatsApp

Claude Code (VS Code) — o fundador usa directamente para:
  → Implementacao quando esta ao PC
  → QA tecnico (tsc, testes, code review)
  → Preparacao de task packets em dcos/tasks/
  → Actualizacao de documentacao
```

## 2.4 Regra de routing

| Tipo de trabalho | Agente |
|------------------|--------|
| Coordenacao, decisao de routing | orchestrator (Boyo) |
| Implementacao de codigo | cto (via Codex) |
| Logica financeira, calculos | financial-tools |
| Specs tecnicas, decomposicao | task-architect |
| Roadmap, priorizacao, scope | product-release |
| SEO, marketing, aquisicao | growth-acquisition |
| Conteudo editorial, criadores | content-platform |
| Directorio, comparacoes | directory-commerce |
| Qualidade de dados, APIs | data-quality |
| QA funcional, regressoes | qa-release |
| RGPD, termos, compliance | legal-compliance |
| Curadoria de conhecimento | knowledge-librarian |

---

# PARTE 3 — PERFIL DETALHADO DE CADA AGENTE

## 3.1 finhub-orchestrator (Boyo)

- **Modelo:** Haiku 4.5 ($0.80/$4)
- **Acesso:** Workspace do projecto (le e escreve ficheiros)
- **Canal:** WhatsApp (unico)
- **Papel:** Cerebro coordenador. Recebe pedidos, interpreta intencao, delega ao agente certo, consolida resultados, reporta ao fundador.
- **NAO faz:** Implementar codigo, fazer commits, correr testes
- **Regras criticas:**
  - Max 2 delegacoes concorrentes (maxConcurrentSessions: 2)
  - 30 segundos entre delegacoes (rate limit Anthropic)
  - Mensagens de delegacao curtas — detalhe fica em ficheiros
  - Ticket Pattern: detalhe em `dcos/tasks/`, delegacao so com path
- **Documentacao:** `dcos/agents/orchestrator/` (raro — coordena mais do que documenta)
- **Config:** `~/.openclaw/agents/finhub-orchestrator/CLAUDE.md`

## 3.2 finhub-cto

- **Modelo:** Sonnet 4.6 ($3/$15) — o mais caro, justificado por gerar codigo
- **Acesso:** Codex 5.3 (ACP) — le, edita, cria ficheiros, corre comandos
- **Papel:** Implementa codigo, define standards tecnicos, faz code review, resolve problemas complexos (hydration, SSR, performance)
- **Regras:** Sempre ler antes de editar, comentar funcoes e logica complexa, commit message com ID da tarefa
- **Stack:** Node.js + Express + TypeScript + MongoDB + Redis (backend), React + Vite + Vike SSR + Tailwind + shadcn/ui + Zustand (frontend)
- **Documentacao:** `dcos/agents/cto/`
- **Erros conhecidos:** Hydration mismatches Vike, zustand persist rehydration, CSS injection SSR

## 3.3 finhub-financial-tools

- **Modelo:** Sonnet 4.6 ($3/$15)
- **Acesso:** Codex 5.3 (ACP)
- **Papel:** Implementa toda a logica financeira — FIRE simulator, stocks analysis, REIT toolkit, ETF overlap, calculadoras
- **APIs externas:** AlphaVantage (25/dia), FMP (250/dia), Polygon (1000/dia)
- **Padroes criticos:** `plausibleOrNull()` para sentinel zero FMP, em-dash para valores em falta, indicadores via `data.indicadores['ROE']`
- **Documentacao:** `dcos/agents/financial-tools/`

## 3.4 finhub-task-architect

- **Modelo:** Haiku 4.5 ($0.80/$4)
- **Acesso:** Workspace do projecto (le ficheiros para context)
- **Papel:** Transforma objectivos vagos em tarefas atomicas. Cada tarefa tem: ficheiros exactos, criterios de aceitacao verificaveis, dependencias, estimativa de esforco.
- **Output:** Task packets em `dcos/agents/task-architect/` e `dcos/tasks/`
- **Formato:** TASK-XXX com objectivo, contexto, ficheiros, criterios, dependencias, estado
- **Qualidade testada:** 2026-03-17 — produziu 18 sub-tarefas atomicas para FIRE frontend (Haiku, 105KB)

## 3.5 finhub-product-release

- **Modelo:** Groq LLaMA 3.3 70B ($0)
- **Acesso:** Workspace do projecto (le e escreve ficheiros)
- **Papel:** Product Manager. Backlog, priorizacao, roadmap, scope, criterios go/no-go, releases.
- **NAO faz:** Codigo, testes, decisoes tecnicas
- **Qualidade testada:** 2026-03-17 — produziu roadmap beta com 56 features, 9 ficheiros, 106KB (Groq, $0)
- **Documentacao:** `dcos/agents/product-release/`

## 3.6 finhub-qa-release

- **Modelo:** Haiku 4.5 ($0.80/$4)
- **Acesso:** Workspace do projecto
- **Papel:** Validacao funcional, UX, regressoes, smoke tests, dark mode, responsive. NAO corre codigo — valida checklists e criterios.
- **QA tecnico (tsc, testes):** Feito pelo Claude Code (VS Code), NAO por este agente
- **Documentacao:** `dcos/agents/qa-release/`

## 3.7 finhub-data-quality

- **Modelo:** Haiku 4.5 ($0.80/$4)
- **Acesso:** Workspace do projecto
- **Papel:** Validacao e qualidade de dados financeiros. Monitorizacao de APIs externas. Regras de sanitizacao. Deteccao de anomalias.
- **Qualidade testada:** 2026-03-17 — produziu auditoria de APIs FMP/AlphaVantage com recomendacoes (Haiku, 23KB)
- **Documentacao:** `dcos/agents/data-quality/`

## 3.8 finhub-legal-compliance

- **Modelo:** Haiku 4.5 ($0.80/$4)
- **Acesso:** Workspace do projecto
- **Papel:** RGPD, termos de servico, politica de privacidade, cookie consent, disclaimer financeiro, compliance PT/EU
- **Qualidade testada:** 2026-03-17 — produziu auditoria GDPR completa com 14 seccoes, gaps e timeline (Haiku, 28KB)
- **Documentacao:** `dcos/agents/legal-compliance/`

## 3.9 finhub-growth-acquisition

- **Modelo:** Groq LLaMA 3.3 70B ($0)
- **Acesso:** Workspace do projecto
- **Papel:** SEO, marketing, aquisicao de utilizadores, landing pages, waitlist, conteudo para redes sociais, posicionamento
- **Contexto:** Mercado PT, literacia financeira, poucos concorrentes directos
- **Documentacao:** `dcos/agents/growth-acquisition/`

## 3.10 finhub-knowledge-librarian

- **Modelo:** Groq LLaMA 3.3 70B ($0)
- **Acesso:** Workspace do projecto
- **Papel:** Curador da fonte de verdade. Mantem indice de docs, identifica padroes recorrentes, promove decisoes a regras permanentes, limpa duplicados, actualiza playbooks.
- **Responsabilidade especial:** Manter `dcos/agents/README.md` actualizado
- **Ciclo semanal:** Ler todos os MEMORY.md, identificar padroes, promover a skills, limpar obsoletos
- **Documentacao:** `dcos/agents/knowledge-librarian/`

## 3.11 finhub-content-platform

- **Modelo:** Groq LLaMA 3.3 70B ($0)
- **Acesso:** Workspace do projecto
- **Papel:** Plataforma de conteudo — artigos, videos, cursos, podcasts, workflows editoriais, relacao com criadores PT
- **Estado:** STANDBY (activar quando content platform entrar em build)
- **Documentacao:** `dcos/agents/content-platform/`

## 3.12 finhub-directory-commerce

- **Modelo:** Groq LLaMA 3.3 70B ($0)
- **Acesso:** Workspace do projecto
- **Papel:** Directorio de brokers, seguradoras, plataformas financeiras. Reviews, comparacoes objectivas, claims verificaveis.
- **Estado:** STANDBY (activar quando directory for prioridade)
- **Documentacao:** `dcos/agents/directory-commerce/`

---

# PARTE 4 — INFRAESTRUTURA

## 4.1 Estado actual

| Item | Estado | Notas |
|------|--------|-------|
| OpenClaw | OK | v2026.3.13, nvm4w |
| Gateway | OK | `127.0.0.1:18789`, Windows Scheduled Task |
| Agentes | OK | 13 registados (12 finhub + main) |
| Anthropic | OK | Sonnet 4.6 + Haiku 4.5 |
| Groq | OK | LLaMA 3.3 70B (chave valida) |
| Ollama | CONFIGURADO | qwen3:14b e qwen3:32b (fallback local) |
| WhatsApp | OK | Canal unico, routing → orchestrator |
| Telegram | DESLIGADO | `enabled: false` |
| ACP + acpx | OK | Plugin Codex auto-descoberto |
| Dashboard | OK | `http://127.0.0.1:18789/` |

## 4.2 Maquina

- **OS:** Windows 10 Pro 10.0.19045
- **User:** User (`C:\Users\User\`)
- **Node:** v24.14.0 (nvm4w)
- **OpenClaw:** v2026.3.13
- **Hostname:** DESKTOP-G8SS29P
- **RAM:** 32GB

## 4.3 Repositorios

| Repo | Path | Stack |
|------|------|-------|
| API (backend) | `C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub` | Node.js, Express, TypeScript, MongoDB, Redis |
| Frontend | `C:\Users\User\Documents\GitHub\Riquinho\api\Front\FinHub-Vite` | React, Vite, Vike SSR, Tailwind, shadcn/ui, Zustand |

## 4.4 Caminhos criticos

```
C:\Users\User\.openclaw\
  openclaw.json              ← config principal (agentes, modelos, canais, bindings)
  agents/                    ← CLAUDE.md por agente (system prompts)
  skills/                    ← 6 skills partilhadas

C:\Users\User\Documents\GitHub\Riquinho\api\Front\API_finhub\
  dcos/                      ← documentacao central
  dcos/agents/               ← output de cada agente (11 pastas)
  dcos/tasks/                ← task packets para delegacao
  dcos/done/                 ← tarefas concluidas (arquivo)
  src/                       ← codigo backend
```

**REGRA:** Agentes escrevem SEMPRE em `dcos/agents/<nome>/`. NUNCA em `~/.openclaw/workspaces/`.

## 4.5 Modelos disponiveis

| Provider | Modelo | Custo | Usado por |
|----------|--------|-------|-----------|
| Anthropic | Claude Sonnet 4.6 | $3/$15 M tokens | cto, financial-tools |
| Anthropic | Claude Haiku 4.5 | $0.80/$4 M tokens | orchestrator, qa, data-quality, legal, task-architect |
| Groq | LLaMA 3.3 70B | $0 (free tier) | product, growth, librarian, content, directory |
| Groq | Qwen3 32B | $0 (fallback) | Disponivel como alternativa |
| Groq | LLaMA 3.1 8B | $0 (crons simples) | Disponivel para tarefas triviais |
| Ollama | qwen3:14b | $0 (local, ~9.3GB RAM) | Fallback offline para orchestrator |
| Ollama | qwen3:32b | $0 (local, ~20GB RAM) | Fallback offline pesado |

## 4.6 Comandos essenciais

```bash
# Gateway
npx openclaw gateway status          # ver estado
npx openclaw gateway start           # arrancar (Scheduled Task)
npx openclaw gateway restart         # reiniciar (pode demorar ~50s)

# Agentes
npx openclaw agents list
npx openclaw agents list --bindings

# Dashboard
# Abrir http://127.0.0.1:18789/ no browser
```

---

# PARTE 5 — SISTEMA DE CONHECIMENTO

## 5.1 Principio

Cada tarefa executada por um agente deve deixar **conhecimento persistido** — nao so o resultado operacional, mas tambem o que se aprendeu.

O brain do FinHub cresce com cada interaccao. Sem documentacao, o trabalho evapora.

## 5.2 Onde vive o conhecimento

```
dcos/agents/
  README.md                  ← indice geral (quem, modelo, responsabilidade)
  cto/                       ← decisoes tecnicas, code reviews
  financial-tools/           ← modelos financeiros, calculos
  qa-release/                ← test reports, checklists
  data-quality/              ← auditorias de dados, APIs
  legal-compliance/          ← GDPR, compliance, termos
  task-architect/            ← specs tecnicas, backlog
  product-release/           ← roadmap, priorizacao, releases
  growth-acquisition/        ← SEO, marketing
  knowledge-librarian/       ← indice de conhecimento, padroes
  content-platform/          ← conteudo editorial
  directory-commerce/        ← directorio, comparacoes
```

## 5.3 Regras de documentacao (TODOS os agentes)

1. **Escrever SEMPRE em ficheiro** na pasta propria (`dcos/agents/<nome>/`)
2. **Nome:** `YYYY-MM-DD_ASSUNTO.md` (ex: `2026-03-17_ROADMAP_BETA.md`)
3. **Nunca** responder so com texto — output DEVE ficar em ficheiro
4. **Nunca** escrever em `~/.openclaw/workspaces/` — nao e o projecto real
5. **Antes de trabalhar**, ler `dcos/agents/README.md` para saber o que ja existe
6. **Consultar** pastas de outros agentes para evitar trabalho sobreposto

## 5.4 Learn-on-Close (obrigatorio para todos)

No fim de CADA tarefa, cada agente avalia:
1. **Decisao** — houve uma decisao que deva ficar registada? → MEMORY.md
2. **Erro** — houve um erro ou falso caminho? → `errors/`
3. **Padrao reutilizavel** — surgiu um template, checklist ou prompt que funcione? → `docs/` ou `prompts/`
4. Se nenhuma resposta for "sim", nao escrever nada (zero ruido > memoria inutil)

## 5.5 Knowledge Librarian — curador

O knowledge-librarian tem responsabilidade extra:
- Manter `dcos/agents/README.md` actualizado
- Ciclo semanal: ler TODOS os MEMORY.md, identificar padroes
- Promover decisoes recorrentes (2+ vezes) a regras permanentes
- Comprimir entradas semelhantes (3→1), nunca apagar sem verificar
- Reportar: o que foi promovido, limpo, ou precisa de atencao humana

## 5.6 Estado actual do conhecimento (2026-03-17)

| Pasta | Ficheiros | KB | Notas |
|-------|-----------|-----|-------|
| product-release/ | 9 | 106 | Roadmap beta completo, testado |
| task-architect/ | 8 | 105 | Task packet FIRE, testado |
| legal-compliance/ | 4 | 68 | Auditoria GDPR + gaps + timeline |
| data-quality/ | 2 | 45 | Auditoria APIs FMP/AlphaVantage |
| cto/ | 0 | 0 | Por preencher |
| financial-tools/ | 0 | 0 | Por preencher |
| qa-release/ | 0 | 0 | Por preencher |
| growth-acquisition/ | 0 | 0 | Por preencher |
| knowledge-librarian/ | 0 | 0 | Por preencher |
| content-platform/ | 0 | 0 | STANDBY |
| directory-commerce/ | 0 | 0 | STANDBY |

---

# PARTE 6 — FLUXO DE COMUNICACAO E DELEGACAO

## 6.1 Canal unico: WhatsApp

- **WhatsApp** = canal unico de comunicacao com o fundador
- **Telegram** = DESLIGADO (`enabled: false`)
- Routing: todas as mensagens WhatsApp → `finhub-orchestrator`

## 6.2 Ticket Pattern (obrigatorio)

Para poupar tokens e evitar rate limits:
1. **Detalhe tecnico** fica em ficheiro em `dcos/tasks/`
2. **Delegacao** e mensagem curta: "Implementa o que esta em `dcos/tasks/FICHEIRO.md`"
3. **CTO** le o ficheiro via ACP e implementa sem contexto extra na mensagem
4. **Boyo** actualiza STATUS.md e responde ao fundador

## 6.3 Actores e papeis

| Actor | Canal | Papel |
|-------|-------|-------|
| Fundador | WhatsApp + VS Code | Decide prioridades, aprova resultados |
| Boyo (Orchestrator) | WhatsApp | Recebe ordens, delega, consolida, reporta |
| CTO | ACP/Codex | Implementa codigo |
| Claude Code (VS Code) | Local | QA tecnico, implementacao directa, preparacao de docs |
| Sub-agentes | Via Boyo | Documentam, analisam, validam (cada um na sua area) |

## 6.4 Quando usar Boyo vs Claude Code

| Situacao | Usar |
|----------|------|
| Fundador esta ao PC, tarefa simples | Claude Code directamente |
| Coordenacao entre agentes | Boyo |
| Fundador longe do PC | Boyo via WhatsApp |
| QA tecnico (tsc, testes) | Claude Code |
| Documentacao/research por agentes | Boyo delega |

## 6.5 Concorrencia e rate limits

- **maxConcurrentSessions:** 2 (max 2 sub-agentes em paralelo)
- **Rate limit Anthropic:** 50 req/min, 30K input tokens/min
- **Regra:** 30 segundos entre delegacoes, nunca mais que 2 em paralelo
- **Se rate limit:** Esperar 2 minutos, nao retentar imediatamente

---

# PARTE 7 — CUSTOS E MODELOS

## 7.1 Custo por tarefa tipica (estimado)

| Tipo de tarefa | Modelo | Custo estimado |
|----------------|--------|----------------|
| Coordenacao (Boyo recebe e delega) | Haiku | ~$0.01-0.03 |
| Documentacao/research (Groq) | Groq | $0.00 |
| Task packet (Task Architect) | Haiku | ~$0.02-0.05 |
| Auditoria/compliance (Legal/QA) | Haiku | ~$0.03-0.08 |
| Implementacao de codigo (CTO) | Sonnet | ~$0.10-0.50 |
| Logica financeira (Financial Tools) | Sonnet | ~$0.10-0.30 |

## 7.2 Optimizacao de custos

**Principio:** Sonnet ($3/$15) so entra quando ha codigo real para escrever. Tudo o resto usa Haiku ($0.80/$4) ou Groq ($0).

**Resultados do teste 2026-03-17:**
- Product-release (Groq): 106KB de documentacao por $0.00
- Task-architect (Haiku): 105KB de specs tecnicas por ~$0.05
- Legal (Haiku): 68KB de auditoria GDPR por ~$0.08

## 7.3 Fallbacks

| Prioridade | Modelo | Quando usar |
|------------|--------|-------------|
| 1 | Groq LLaMA 3.3 70B | Default para operacional |
| 2 | Groq Qwen3 32B | Se LLaMA falhar |
| 3 | Ollama qwen3:14b | Offline/sem internet |
| 4 | Ollama qwen3:32b | Offline, mais capaz |
| 5 | Anthropic Haiku | Quando Groq nao cumpre |
| 6 | Anthropic Sonnet | So para codigo/logica critica |

---

# PARTE 8 — SEGURANCA E LIMITES

## 8.1 Limites absolutos (TODOS os agentes)

- **PROIBIDO** aconselhamento financeiro personalizado
- **PROIBIDO** inventar certezas
- **PROIBIDO** marketing enganador
- **PROIBIDO** priorizar velocidade acima de confianca

## 8.2 Proteccoes de seguranca (BLOQUEIO TOTAL)

- **PROIBIDO** fazer compras, subscricoes, ou transaccoes financeiras
- **PROIBIDO** partilhar dados pessoais ou do projecto na internet
- **PROIBIDO** criar contas em servicos externos sem aprovacao
- **PROIBIDO** publicar codigo ou dados em repos publicos/pastebins
- **PROIBIDO** enviar emails ou mensagens para fora do sistema
- **PROIBIDO** instalar pacotes npm/pip nao verificados

**Se qualquer destas accoes for necessaria:** PARAR e escalar ao fundador.

## 8.3 Disclaimer financeiro

> FinHub educa, organiza, contextualiza, explora dados, simula cenarios.
> NAO recomenda, NAO sugere alocacoes, NAO faz suitability, NAO apresenta simulacoes como previsoes reais.

---

# PARTE 9 — EVOLUCAO E ROADMAP DA ESTRUTURA

Esta e a parte mais importante para o futuro. A estrutura actual funciona, mas deve evoluir continuamente.

## 9.1 Eixos de evolucao

### A — Modelos mais inteligentes

| Accao | Estado | Impacto |
|-------|--------|---------|
| Avaliar novos modelos Groq (qwen3, mistral) | CONTINUO | Melhor qualidade a custo zero |
| Testar Haiku para mais tarefas criticas | EM TESTE | Reduzir dependencia de Sonnet |
| Avaliar modelos locais (Ollama) para orquestracao | CONFIGURADO | Independencia de cloud, $0 |
| Monitorizar novos modelos Claude (Opus, novos Haiku) | CONTINUO | Upgrade quando custo/beneficio justificar |
| Fine-tuning futuro com dados do projecto | FUTURO | Agentes especializados no FinHub |

**Principio:** Sempre testar o modelo mais barato primeiro. So subir quando a qualidade nao cumpre.

### B — Infraestrutura mais solida

| Accao | Estado | Impacto |
|-------|--------|---------|
| Gateway como servico cloud (nao so local) | FUTURO | Disponibilidade 24/7, nao depende do PC |
| MongoDB Atlas (cloud) para logs de agentes | FUTURO | Persistencia, analytics, dashboards |
| Redis cloud para cache de sessoes | FUTURO | Performance, menos re-processamento |
| CI/CD com testes obrigatorios | FUTURO | Qualidade automatica a cada push |
| Staging environment | FUTURO | Testar antes de producao |
| Backup automatico de `dcos/` e config OpenClaw | FUTURO | Resiliencia |

### C — Acessos e integracao cloud

| Accao | Estado | Impacto |
|-------|--------|---------|
| Agentes com acesso a APIs de analytics (PostHog) | FUTURO | Decisoes baseadas em dados reais |
| Agentes com acesso a base de dados (read-only) | FUTURO | Validacao de dados sem intermediario |
| Webhooks para triggers automaticos | FUTURO | Agentes reagem a eventos (PRs, issues) |
| Integration com GitHub (issues, PRs) | FUTURO | Workflow end-to-end automatico |

### D — Captacao e catalogacao de informacao

| Accao | Estado | Impacto |
|-------|--------|---------|
| Base de dados de decisoes (nao so MEMORY.md) | FUTURO | Pesquisavel, versionavel, queryable |
| Indice semantico de conhecimento | FUTURO | Encontrar decisoes relevantes por contexto |
| Catalogacao automatica de learnings | FUTURO | Knowledge Librarian com ferramentas proprias |
| Historico de performance por agente | FUTURO | Dados para decidir upgrades de modelo |
| Dashboard visual de conhecimento acumulado | FUTURO | Ver gaps, areas fracas, tendencias |

### E — Autonomia progressiva

| Accao | Estado | Impacto |
|-------|--------|---------|
| Triggers automaticos (cron → Boyo pega tarefas) | PLANEADO | Fundador so prioriza backlog |
| Spec automatica (Task-Architect gera sem fundador) | PLANEADO | Specs geradas, fundador revisa |
| QA automatico (pipeline fecha sozinho) | PLANEADO | Menos intervencao manual |
| Docs automaticos (Librarian fecha ciclo) | PLANEADO | Documentacao sempre actualizada |
| Gate humano (WhatsApp approve/reject) | PLANEADO | Controlo final NUNCA removido |

**Fluxo autonomo alvo:**
```
TRIGGER (cron/backlog/webhook)
  → Boyo (Haiku, $0.01) — routing
    → Task-Architect (Haiku, $0.03) — spec
      → CTO (Sonnet → Codex) — implementa
        → QA (Haiku, $0.03) — valida
          ├─ FALHA → retry CTO (max 2x) → escala ao fundador
          └─ PASSA → Librarian (Groq, $0) — docs
            → WhatsApp report → Fundador aprova → merge
```

## 9.2 Prioridades de evolucao (proximo trimestre)

| Prioridade | Accao | Porque |
|------------|-------|--------|
| 1 | Completar brain de todos os agentes (documentacao) | Sem conhecimento, agentes repetem erros |
| 2 | Dashboard de actividade de agentes (MongoDB) | Visibilidade → confianca → autonomia |
| 3 | Testar modelos Groq mais recentes | Melhor qualidade a $0 |
| 4 | CI/CD basico com smoke tests | Qualidade automatica |
| 5 | Triggers automaticos (Boyo pega tarefas sozinho) | Reduzir intervencao manual |
| 6 | Integracao PostHog para feedback do mercado | Decisoes baseadas em dados |

---

# PARTE 10 — METRICAS E AUTONOMIA

## 10.1 Dashboard de actividade (proposto)

Base de dados: MongoDB — nova collection `agent_activity_logs`.

```javascript
{
  agentId: "finhub-cto",
  taskId: "S1-003",
  action: "implement",           // implement, review, research, validate
  status: "success",             // success, failure, partial, blocked
  startedAt: ISODate,
  completedAt: ISODate,
  durationMinutes: 15,
  summary: "Implementou SimuladorFIRE",
  filesChanged: ["path/file.tsx"],
  tokensUsed: { input: 12500, output: 3200, cost: 0.048 },
  qualityGate: { passedQA: true, rejections: 0 },
  model: "anthropic/claude-sonnet-4-6"
}
```

## 10.2 Niveis de autonomia

| Nivel | Criterio | Permissoes |
|-------|----------|------------|
| 0 — SUPERVISIONADO | Default | Propoe, fundador aprova, depois executa |
| 1 — SEMI-AUTONOMO | >20 tarefas, >85% sucesso, <15% rejeicao QA | Executa baixo risco, escala medio/alto |
| 2 — AUTONOMO | >50 tarefas, >90% sucesso, <10% rejeicao QA | Executa tudo excepto arquitectura/produto |
| 3 — TRUSTED | Decisao explicita do fundador | Autonomia total no dominio |

**Regra:** Nivel so sobe com evidencia no dashboard. Nunca por feeling.

## 10.3 Metricas chave

| Metrica | Calculo | Para que serve |
|---------|---------|----------------|
| Taxa sucesso | success / total | Fiabilidade |
| Tempo medio | avg(durationMinutes) | Eficiencia |
| Taxa rejeicao QA | rejections > 0 / total | Qualidade |
| Custo por tarefa | avg(cost) | Custo-eficiencia |
| Cycle time | completedAt - criacao | Velocidade end-to-end |

---

# PARTE 11 — PROBLEMAS CONHECIDOS E LICOES

## 11.1 Infraestrutura

| Problema | Estado | Solucao |
|----------|--------|---------|
| Gateway restart demora ~50s | CONHECIDO | Esperar, nao considerar falha |
| sessions.json cache modelo errado | RESOLVIDO | Apagar sessions.json + restart |
| Groq tool calling falha com 25+ tools | CONHECIDO | Groq so para agentes sem tools complexos |
| Rate limit Anthropic (429) | MITIGADO | 30s entre delegacoes, retry apos 2min |
| Agente escreve em workspace errado | RESOLVIDO | Todos os workspaces apontam para projecto Git |

## 11.2 Agentes

| Licao | Contexto |
|-------|----------|
| Groq nao serve como orchestrator | Tool calling falha com muitos tools |
| Haiku cumpre para orquestracao | Testado com sucesso, bom custo/performance |
| Groq escreve bons docs a custo zero | Testado: 106KB de roadmap sem custo |
| Haiku produz specs tecnicas de qualidade | Testado: 18 sub-tarefas atomicas para FIRE |
| Agentes precisam de caminhos explicitos | Sem paths no CLAUDE.md, escrevem no sitio errado |
| MEMORY.md textual perde-se em escala | Futuro: migrar para BD searchable |

## 11.3 Processo

| Licao | Contexto |
|-------|----------|
| Detalhe em ficheiro, delegacao curta | Ticket Pattern poupa tokens significativamente |
| QA tecnico deve ser local (Claude Code) | Agentes Groq nao conseguem correr tsc/testes |
| Documentacao obrigatoria funciona | Quando a regra esta no CLAUDE.md, agentes cumprem |
| Fonte de verdade unica previne duplicacao | Todos leem `dcos/agents/README.md` antes de trabalhar |

---

# PARTE 12 — MIGRACAO E CONTINUIDADE

## 12.1 Para continuar o trabalho (novo agente ou humano)

1. Ler este documento (visao completa)
2. Ler `dcos/agents/README.md` (indice de conhecimento)
3. Consultar pasta do agente relevante em `dcos/agents/<nome>/`
4. Ler o CLAUDE.md do agente em `~/.openclaw/agents/<id>/CLAUDE.md`
5. Ver `openclaw.json` para config actual

## 12.2 Para migrar para nova maquina

1. Instalar Node.js (v24+) e OpenClaw (`npm install -g openclaw`)
2. Copiar `~/.openclaw/` para nova maquina
3. Substituir paths do user antigo
4. Definir env vars: `ANTHROPIC_API_KEY`, Groq key
5. Instalar gateway: `openclaw gateway install`
6. Arrancar: `openclaw gateway start`
7. Testar: `openclaw gateway status` → RPC probe OK

## 12.3 Para debater melhorias com outro agente

Partilhar este documento e pedir analise critica de:
- Atribuicao de modelos por agente (esta optimizada?)
- Gaps no sistema de conhecimento (o que falta captar?)
- Fluxo de autonomia (como acelerar sem perder controlo?)
- Custos (onde poupar mais? onde investir?)
- Infraestrutura (o que migrar para cloud? quando?)
- Agentes em falta (que dominio nao esta coberto?)

---

# PARTE 13 — SKILLS PARTILHADAS

6 skills em `~/.openclaw/skills/` usadas por todos os agentes:

| Skill | Conteudo |
|-------|----------|
| `finhub-company-context` | O que e o FinHub, 3 pilares, stack, estado |
| `finhub-compliance-boundaries` | Limites legais, disclaimer, o que NAO fazer |
| `finhub-brand-voice` | Tom, estilo, lingua (PT-PT), personalidade |
| `finhub-kpi-definitions` | KPIs por area (DAU, retencao, features/sessao) |
| `finhub-doc-analysis-protocol` | Como avaliar docs antes de trabalhar |
| `finhub-handoff-standard` | Formato obrigatorio de handoff entre agentes |

---

# PARTE 14 — HISTORICO DE FICHEIROS

| Ficheiro | Estado | Notas |
|----------|--------|-------|
| `dcos/OPENCLAW_FINHUB_MASTER_REFERENCE.md` | ACTIVO | Este ficheiro — referencia unica V3 |
| `dcos/agents/README.md` | ACTIVO | Indice de agentes e documentacao |
| `dcos/OPENCLAW_GATEWAY_SETUP.md` | ACTIVO | Setup, troubleshooting, checklist |
| `dcos/done/` | ARQUIVO | Masterplans V1/V2, setup logs V1-V4 |

---

*Fim do documento. Qualquer agente ou humano que leia isto tem contexto completo para contribuir.*
