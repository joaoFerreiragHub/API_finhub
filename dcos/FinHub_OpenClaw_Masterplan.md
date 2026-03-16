# FinHub + OpenClaw — Plano Mestre v2

> Atualizado: 2026-03-15
> Estado: Fase 1 concluida, Fase 2 em curso

---

## Objetivo

Montar um sistema de agentes (super equipa) para operar o FinHub com estrutura, seguranca e foco, sem perder o lado humano da marca.

---

## Principio-base da super equipa

**A inteligencia fica em casa. A execucao pesada pode acontecer fora.**

Na pratica:

- O conhecimento duradouro fica nos workspaces, memoria, skills e documentacao do OpenClaw
- A execucao pesada pode ir para Codex/Claude/ACP
- O Orchestrator coordena, nao absorve tudo
- Cada agente tem uma funcao unica e um dominio claro

Isto encaixa com o OpenClaw porque:

- A memoria e Markdown local no workspace do agente
- O `MEMORY.md` serve de memoria longa e `memory/YYYY-MM-DD.md` de memoria diaria
- Podes usar plugins, skills e context engines
- Podes usar modelos locais/self-hosted via Ollama, vLLM ou endpoints compativeis OpenAI para manter mais trabalho "in house"

### Principios operacionais

1. Os agentes ajudam a executar, nao substituem o fundador
2. Nenhum agente pode dar recomendacoes financeiras personalizadas
3. Primeiro cria-se o sistema interno da empresa; so depois agentes virados ao utilizador final
4. Cada agente tem um papel claro, um workspace proprio e limites concretos
5. Tudo o que mexe com codigo, dados sensiveis ou comunicacao publica deve ter revisao humana

---

## Arquitetura de modelos: Groq vs Claude

### Decisao implementada (2026-03-15)

Para controlar rate limits e custos, os agentes estao divididos em dois tiers:

| Tier | Modelo | Acesso ACP/Codex | Funcao |
|------|--------|-------------------|--------|
| **Claude Sonnet 4.6** | `anthropic/claude-sonnet-4-6` | Sim | Escrevem e editam codigo diretamente |
| **Groq LLaMA 3.3 70B** | `groq/llama-3.3-70b-versatile` | Nao | Planeiam, analisam, coordenam via texto |

**Default global:** Groq LLaMA 3.3 70B (gratis, rate limits altos)
**Override por agente:** Claude Sonnet so nos agentes que precisam de ACP

### Fluxo de comunicacao Groq <-> Claude

Os agentes Groq nao conseguem ler ficheiros do projeto. O fluxo e:

```
Agente Groq precisa de contexto
  -> pede ao orchestrator (Claude)
  -> orchestrator le via Codex/ACP
  -> envia resumo ao agente Groq
  -> agente Groq analisa/planeia
  -> devolve instrucoes ao orchestrator
  -> orchestrator executa via Codex
```

### Configuracao atual (openclaw.json)

- `maxConcurrentSessions: 2` (reduzido de 4 para evitar rate limits)
- `compaction.mode: "auto"` (compacta contexto automaticamente)
- ACP ativo com backend `acpx` e `permissionMode: "approve-all"`

---

## Estrutura da super equipa — 4 Camadas

### Camada A — Comando

Estes nao "fazem tudo"; governam o sistema.

#### 1. finhub-orchestrator
- **Modelo:** Claude Sonnet 4.6 (ACP)
- **Papel:** Chief of Staff
- **Faz:** recebe pedidos, decide quem trabalha, consolida outputs, protege foco e cadencia, serve de ponte entre codigo e agentes Groq
- **Nao faz:** alterar producao diretamente sem validacao, publicar comunicacao publica sem revisao, tomar decisoes estrategicas irreversiveis sozinho

#### 2. finhub-cto
- **Modelo:** Claude Sonnet 4.6 (ACP)
- **Papel:** Chief Architect — define standards, revê arquitetura, arbitra conflitos entre modulos, decide quando uma tarefa vai para Codex/ACP
- **Faz:** arquitetura, code review, padroes, resolucao de problemas tecnicos complexos (hydration, SSR, performance), coordena tecnicamente financial-tools e qa-release
- **Nao faz:** definir posicionamento da marca, responder como suporte publico, decidir pricing

#### 3. finhub-product-release
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** Une backlog, sequencing, release criteria e go/no-go
- **Faz:** gerir roadmap, definir release criteria, converter feedback em user stories, sequenciar beta e pos-beta, decidir o que entra e sai da sprint
- **Nao faz:** codar fixes tecnicos, mexer em campanhas, ler codigo diretamente (pede ao orchestrator)

### Camada B — Dominio de produto

Cada um conhece a sua parte do negocio melhor do que o CTO.

#### 4. finhub-financial-tools
- **Modelo:** Claude Sonnet 4.6 (ACP)
- **Papel:** Dono funcional das ferramentas diferenciais — FIRE, stocks, REITs, ETFs, watchlist, scoring e logica financeira
- **Faz:** implementar e manter ferramentas financeiras, integrar APIs (AlphaVantage, FMP, Polygon), calculos e simulacoes
- **Nao faz:** aconselhamento financeiro personalizado, alterar copy publica
- **Nota:** Este e o agente de produto mais "profundo" do FinHub — as ferramentas sao o maior diferencial competitivo

#### 5. finhub-content-platform
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** Responsavel por artigos, videos, cursos, podcasts, livros, eventos, creator dashboard, analytics de criadores e workflows editoriais
- **Faz:** gerir o hub de conteudo como pilar do produto
- **Nao faz:** publicar sem aprovacao, alterar infra
- **Estado:** A criar (Fase 2)

#### 6. finhub-directory-commerce
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** Responsavel pelo diretorio de corretoras/seguradoras/plataformas, reviews, claims, comparacoes e ponte futura com monetizacao B2B
- **Faz:** manter e expandir o diretorio como pilar do produto
- **Nao faz:** aprovar claims legais sem revisao legal
- **Estado:** A criar (Fase 2)

#### 7. finhub-growth-acquisition
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** SEO, waitlist, landing pages, glossario, aquisicao e criadores-alvo
- **Faz:** trazer atencao, trafego e relevancia para o FinHub
- **Nao faz:** publicar automaticamente sem aprovacao, alterar pricing ou claims legais, ler codigo diretamente (pede ao orchestrator)

### Camada C — Confianca e risco

Estes agentes nao "criam" tanto; protegem a plataforma.

#### 8. finhub-data-quality
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** Valida dados, scores, outputs, disclaimers e consistencia
- **Faz:** auditar dados financeiros, validar outputs das ferramentas, detetar inconsistencias, monitorizar risco reputacional
- **Nao faz:** aconselhamento financeiro, alterar copy publica, ler codigo diretamente (pede ao orchestrator)

#### 9. finhub-qa-release
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** Smoke tests, regressoes, journeys criticas, dark mode, evidencia visual, bugs e gates de release
- **Faz:** testar, identificar bugs, verificar criterios de aceitacao
- **Nao faz:** corrigir bugs diretamente (descreve e delega ao orchestrator/cto)

#### 10. finhub-legal-compliance
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** Termos, privacidade, cookies, aviso legal, checklist GDPR/ePrivacy/PT, disclaimers financeiros, revisao de texto sensivel
- **Faz:** compliance com RGPD e legislacao PT/EU, gestao de consentimento de cookies
- **Nao faz:** aprovar publicacoes sem o orchestrator, alterar codigo diretamente

### Camada D — Conhecimento institucional

#### 11. finhub-knowledge-librarian
- **Modelo:** Groq LLaMA 3.3 70B
- **Papel:** Dono da documentacao viva — transforma trabalho disperso em inteligencia acumulada
- **Faz:** mapa dos docs, canonizacao de decisoes, arquivo de handoffs uteis, maintenance das skills comuns, atualizacao de playbooks, ligacao entre dcos/, MEMORY.md, decisoes e task packets
- **Nao faz:** tomar decisoes de produto ou tecnicas
- **Estado:** A criar (Fase 2)
- **Nota:** Este agente nao e vistoso, mas e o que impede a equipa de "aprender e esquecer"

### Camada E — Mais tarde (quando a frente entrar em build real)

- **12. finhub-community** — discussoes, reputacao, gamificacao, goals, anti-abuso
- **13. finhub-ads-revenue** — subscriptions, value ads, marketplace, afiliados
- **14. finhub-security-privacy** — hardening, permissoes, flows criticos, pre-launch

Nao criar agentes "bonitos" sem trabalho vivo suficiente.

---

## Quem manda em quem

```
Tu
  -> falas com finhub-orchestrator para quase tudo
  -> falas com finhub-cto so quando a conversa ja e puramente tecnica

finhub-orchestrator
  -> delega para Product/CTO/Growth/Legal/QA/Data/Financial Tools/Content/Directory/Librarian

finhub-cto
  -> coordena tecnicamente financial-tools, qa-release e qualquer execucao pesada em Codex/ACP

finhub-product-release
  -> decide o que entra na sprint e o que sai

finhub-knowledge-librarian
  -> garante que o que foi aprendido vira memoria reutilizavel
```

Em OpenClaw isto casa com sub-agents: o Orchestrator pode spawnar outros agentes, e os resultados sobem de volta na cadeia; quando se usa ACP, o progresso inicial tambem pode voltar ao pai com `streamTo: "parent"`.

---

## Como os agentes ficam mais inteligentes

O retorno real dos tokens investidos vem do conhecimento acumulado, nao da execucao pontual. Cada iteracao que nao grava nada util e dinheiro perdido. O sistema precisa de mecanismos de aprendizagem que funcionem a cada iteracao sem criar ruido nem confusao.

### Principio: 3 saidas por tarefa

Cada tarefa deve gerar sempre 3 saidas:

| Saida | O que e | Onde fica |
|-------|---------|-----------|
| **A. Resultado operacional** | Patch, draft, relatorio, checklist, bug report, validacao | No repo/workspace relevante |
| **B. Memoria util** | Decisao tomada, padrao aprovado, erro recorrente, abordagem que funcionou/falhou, edge cases | `MEMORY.md` do agente |
| **C. Playbook atualizado** | Template novo, checklist nova, skill atualizada, regra de handoff, exemplo de task packet bom | Skills partilhadas ou `docs/` do agente |

### Mecanismo concreto: Learn-on-Close

Quando um agente termina uma tarefa, deve executar um passo final automatico (instrucao no CLAUDE.md):

```
Antes de fechar esta tarefa, responde internamente a estas 3 perguntas:

1. DECISAO — Houve alguma decisao ou descoberta que mude como fazemos isto no futuro?
   -> Se sim, escreve em MEMORY.md do teu workspace (1-3 linhas, sem ruido)

2. ERRO — Houve algum erro, falso caminho ou surpresa que devemos evitar repetir?
   -> Se sim, escreve em errors/ do teu workspace (titulo + o que aconteceu + como evitar)

3. PADRAO — Surgiu algum padrao, template ou checklist reutilizavel?
   -> Se sim, atualiza a skill relevante ou cria um doc em docs/

Se nenhuma das 3 respostas for "sim", nao escrevas nada. Zero ruido > memoria inutil.
```

### Regras de higiene da memoria

1. **MEMORY.md e sagrado** — so entra conhecimento estavel e validado. Nao e um log de atividade.
2. **memory/YYYY-MM-DD.md e efemero** — estado e atividade do dia. Pode ser apagado apos 30 dias sem perda.
3. **Nunca duplicar** — antes de escrever, verificar se a informacao ja existe em MEMORY.md ou nas skills.
4. **Uma entrada = uma decisao** — nao juntar multiplas decisoes na mesma entrada.
5. **Formato consistente** — cada entrada tem: data, contexto (1 linha), decisao (1-2 linhas), motivo (1 linha).
6. **O librarian cuida** — semanalmente, o knowledge-librarian revisa memorias de todos os agentes, remove duplicados, promove padroes a skills e arquiva o que deixou de ser relevante.

### Formato de entrada em MEMORY.md

```md
## [2026-03-15] Hydration mismatch em Vike com zustand persist
- **Contexto:** Migracao de vite-plugin-ssr para vike v0.4.255
- **Decisao:** Usar useState(false) + useEffect para deferir leitura de auth state apos mount
- **Motivo:** Server renderiza com user=null, zustand rehydrata antes do React, causando mismatch que mata interatividade
```

### Ciclo de aprendizagem

```
Tarefa concluida
  -> Agente executa Learn-on-Close (3 perguntas)
  -> Escreve em MEMORY.md / errors/ / docs/ se relevante
  -> Handoff ao orchestrator inclui: resultado + "aprendi X"

Semanal (knowledge-librarian):
  -> Revisa MEMORY.md de todos os agentes
  -> Promove padroes recorrentes a skills partilhadas
  -> Remove entradas obsoletas ou duplicadas
  -> Atualiza indice de decisoes em dcos/

Mensal (orchestrator + fundador):
  -> Revisao das skills partilhadas
  -> Decisao sobre o que promover a "regra permanente"
  -> Limpeza de memory/ diarios com mais de 30 dias
```

### O que NAO e aprendizagem

- Logs de atividade ("fiz X, depois Y, depois Z") — isso e ruido, nao memoria
- Copias de codigo — o codigo esta no git, nao precisa de estar na memoria
- Contexto temporario de uma sessao — morre com a sessao
- Opinioes nao validadas — so entra o que foi testado ou decidido

A memoria oficial esta em ficheiros Markdown locais no workspace. O modelo so "lembra" de forma duradoura aquilo que for escrito em disco:
- `MEMORY.md` guarda conhecimento estavel
- `memory/YYYY-MM-DD.md` guarda estado e atividade recente

### Prompt Patterns — aprender a falar com cada AI

Cada agente mantem uma pasta `prompts/` no seu workspace com patterns que funcionaram. O objetivo e que ao longo do tempo, cada agente saiba exatamente como formular pedidos para obter o melhor resultado com menos tokens.

**Estrutura de um prompt pattern:**

```md
## [data] Titulo descritivo
- **Ferramenta:** Codex / Claude / Groq / outra
- **Situacao:** O que precisavas de fazer
- **Prompt/Abordagem:** O que funcionou (o prompt exato ou a estrategia)
- **Anti-pattern:** O que NAO fazer e porque (se aplicavel)
- **Tokens poupados:** Estimativa vs abordagem anterior (se mensuravel)
```

**Tipos de patterns a capturar:**

| Tipo | Exemplo |
|------|---------|
| **Diagnostico** | "Para hydration bugs, pedir para verificar diferenca server/client em vez de pedir para 'corrigir o botao'" |
| **Contexto minimo** | "Codex precisa de ver o ficheiro inteiro, nao snippets — snippets causam edits falhados" |
| **Delegacao eficiente** | "Para agentes Groq, enviar: estado atual + o que se quer + restricoes. Nao enviar ficheiros inteiros." |
| **Batch vs iterativo** | "Corrigir 3 ficheiros com o mesmo pattern: fazer todos num so prompt em vez de 3 prompts separados" |
| **Escalation** | "Se Groq nao consegue resolver apos 2 tentativas, escalar para Claude em vez de gastar mais tokens Groq" |

**Regra:** Um prompt pattern so e gravado se for testado e validado. Nao gravar teorias — so experiencia real.

### Error Patterns — aprender com os erros de cada AI

Cada agente mantem uma pasta `errors/` no seu workspace com erros que encontrou. O objetivo e construir um "manual de erros" que evita repeticoes.

**Estrutura de um error pattern:**

```md
# Erro: Titulo descritivo

**Data:** YYYY-MM-DD
**Severidade:** Critica / Alta / Media / Baixa
**Causa raiz:** O que realmente causou o erro

## O que aconteceu
[Descricao breve]

## Como foi corrigido
[Passos concretos]

## Como evitar no futuro
[Regras claras e acionaveis]
```

**Regra:** Erros que se repetem 2+ vezes devem ser promovidos a regra no CLAUDE.md do agente.

---

## Arquitetura de conhecimento — 3 Niveis

### Nivel 1 — Conhecimento comum da empresa

Shared skills globais em `~/.openclaw/skills/`:

1. **finhub-company-context** — visao, pilares, estado atual, prioridades de beta
2. **finhub-compliance-boundaries** — educacao vs recomendacao, linguagem proibida, disclaimers
3. **finhub-brand-voice** — voz da marca, equilibrio entre sofisticacao e clareza
4. **finhub-kpi-definitions** — KPIs por area, definicoes operacionais, como reportar metricas
5. **finhub-doc-analysis-protocol** — como analisar e validar documentacao
6. **finhub-handoff-standard** — formato standard de handoff entre agentes

Isto da coerencia transversal a todos os agentes.

### Nivel 2 — Conhecimento de dominio por agente

Cada agente tem no seu workspace:

```
~/.openclaw/agents/finhub-{nome}/
  CLAUDE.md          # System prompt operacional (ficheiro principal que o agente le)
  MEMORY.md          # Memoria longa estavel
  memory/            # Memoria diaria (YYYY-MM-DD.md)
  docs/              # Docs chave daquele dominio
  examples/          # Exemplos de bons outputs
  checklists/        # Checklists especificas
  errors/            # "Erros que nunca repetir"
```

O `CLAUDE.md` consolida a identidade, missao, regras e contexto do agente (equivale aos templates AGENTS.md + SOUL.md + USER.md + IDENTITY.md + TOOLS.md num unico ficheiro operacional).

### Nivel 3 — Biblioteca institucional

Repositorio curado pelo knowledge-librarian com:
- Decisoes arquiteturais
- Decisoes de produto
- Padroes legais
- Checklists de release
- Bug encyclopedia
- Examples library
- Indice do `dcos/`

---

## Alocacao de modelos por funcao

### Groq / Modelos locais (barato/gratis)
Usar para: triagem, routing, sintese, documentacao, classificacao, drafting inicial, comparacao de docs, manutencao de memoria.

OpenClaw suporta Ollama com tool calling, streaming e modelos locais, e tambem vLLM/OpenAI-compatible self-hosted.

### Embeddings locais (futuro)
Usar para: semantic recall, pesquisa da memoria, descoberta de decisoes antigas.

A memoria semantica pode usar `memorySearch.provider = "ollama"` ou outras opcoes locais.

### Codex / Claude / ACP
Usar para: coding multi-ficheiro, refactors, bug hunts pesados, patches largos, execucao tecnica profunda.

O ACP liga OpenClaw a estes executores externos, enquanto a coordenacao e o contexto continuam em casa.

---

## Fluxo operacional

```
Tu
  -> pedes ao orchestrator

Orchestrator (Claude)
  -> decide se isto e Product, CTO, Legal, QA, Growth, Data, Financial Tools, Content ou Directory

Agente de dominio (Groq ou Claude)
  -> faz analise profunda e delimita a tarefa

CTO (Claude)
  -> so entra quando ha impacto tecnico real, arquitetura, standards ou execucao pesada

ACP/Codex
  -> executa o trabalho tecnico

QA + Data Quality + Legal (Groq)
  -> validam o que precisa de validacao

Knowledge Librarian (Groq)
  -> grava o learning, atualiza a memoria e melhora o playbook

Orchestrator
  -> consolida e devolve-te estado, risco e proximo passo
```

Isto impede dois problemas:
- o CTO ficar esmagado
- o conhecimento ficar todo espalhado em chats soltos

---

## Guardrails obrigatorios

### Politica global do FinHub

Todos os agentes devem obedecer a estas regras:

1. O FinHub educa, organiza e contextualiza; nao recomenda compras, vendas ou alocacoes personalizadas
2. Nunca apresentar dados simulados como dados reais
3. Nunca esconder incerteza ou limitacoes da fonte
4. Comunicacao publica fica sempre em estado `draft`, `review required` ou `approved`
5. Qualquer acao irreversivel requer confirmacao humana

### Formulacao permitida
- Explicar conceitos
- Resumir mercados
- Comparar caracteristicas
- Mostrar metricas
- Ajudar na organizacao financeira
- Simular cenarios educativos

### Formulacao proibida
- "compra X"
- "vende Y"
- "o melhor ETF para ti e..."
- "deves alocar 30% a..."
- Suitability personalizada

### Estado de output
Todos os outputs devem indicar um destes estados:
- `draft`
- `review required`
- `approved proposal`

### Handoff obrigatorio
No fim de cada tarefa reportar:
- Objetivo
- O que foi feito
- Riscos/pendencias
- Ficheiros/documentos afetados
- Proximo passo recomendado

---

## Politica de sandbox e tools

### Agentes Claude (ACP ativo)

| Agente | Leitura | Escrita | Exec | ACP | Browser |
|--------|---------|---------|------|-----|---------|
| orchestrator | Sim | Coordenacao | Nao destrutivo | Sim | Sim |
| cto | Sim | Sim | Sim (testes) | Sim | Opcional |
| financial-tools | Sim | Sim | Sim (calculos) | Sim | Nao |

### Agentes Groq (sem ACP)

| Agente | Leitura | Escrita | Exec | Browser |
|--------|---------|---------|------|---------|
| product-release | Via orchestrator | Docs | Nao | Nao |
| growth-acquisition | Via orchestrator | Docs/copy | Nao | Sim |
| data-quality | Via orchestrator | Validacoes | Scripts controlados | Sim |
| qa-release | Via orchestrator | Bug reports | Nao | Sim |
| legal-compliance | Via orchestrator | Docs legais | Nao | Nao |
| knowledge-librarian | Via orchestrator | Docs/memoria | Nao | Nao |
| content-platform | Via orchestrator | Docs/editorial | Nao | Sim |
| directory-commerce | Via orchestrator | Docs/diretorio | Nao | Sim |

---

## Cron jobs iniciais

Criar apenas 4 no inicio (agentes Groq quando possivel para poupar tokens Claude):

1. **08:00** resumo executivo do estado do FinHub (orchestrator -> Claude, necessita ACP para ler estado)
2. **08:15** relatorio tecnico do CTO (cto -> Claude)
3. **08:30** prioridades do Product (product -> Groq, gratis)
4. **18:00** resumo do dia + bloqueios + proximo passo (orchestrator -> Claude)

Quando estavel, adicionar semanal:
- Domingo: plano semanal (orchestrator)
- Sexta: retro da semana (knowledge-librarian -> Groq)

---

## Estrutura de workspaces

```text
~/.openclaw/
  openclaw.json
  skills/
    finhub-company-context/
    finhub-compliance-boundaries/
    finhub-brand-voice/
    finhub-kpi-definitions/
    finhub-doc-analysis-protocol/
    finhub-handoff-standard/

  agents/
    finhub-orchestrator/       # Claude Sonnet (ACP)
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-cto/                # Claude Sonnet (ACP)
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-product-release/    # Groq LLaMA
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-financial-tools/    # Claude Sonnet (ACP)
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-growth-acquisition/ # Groq LLaMA
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-data-quality/       # Groq LLaMA
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-qa-release/         # Groq LLaMA
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-legal-compliance/   # Groq LLaMA
      CLAUDE.md
      MEMORY.md
      memory/
    finhub-content-platform/   # Groq LLaMA (Fase 2)
    finhub-directory-commerce/ # Groq LLaMA (Fase 2)
    finhub-knowledge-librarian/# Groq LLaMA (Fase 2)

  workspaces/
    finhub-orchestrator/
    finhub-cto/
    finhub-product/
    finhub-growth/
    finhub-data-quality/
    finhub-legal/
    finhub-qa/
    finhub-financial-tools/
```

Regra: um workspace por agente. Nao misturar workspaces. Nao partilhar credenciais por defeito.

---

## Projetos

| Repo | Path local | Descricao |
|------|-----------|-----------|
| Frontend | `C:\Users\Admin\finhub\nome-do-teu-projeto` | Vike SSR + React 18 + Tailwind CSS 3.4 + Radix UI + Zustand |
| API | `C:\Users\Admin\Documents\GitHub\API_finhub` | Node.js + Express + TypeScript + Redis + PostgreSQL |

---

## Estado atual — O que ja foi feito

### Fase 0 — Preparacao
- [x] OpenClaw instalado e a correr
- [x] Decisao estrategica: sistema operativo interno primeiro

### Fase 1 — Equipa minima
- [x] 8 agentes criados e configurados no `openclaw.json`
- [x] Divisao Groq/Claude implementada (3 Claude + 5 Groq)
- [x] CLAUDE.md criado para todos os 8 agentes
- [x] ACP ativo com Codex (backend acpx)
- [x] Rate limits controlados (maxConcurrentSessions: 2, compaction: auto)
- [x] Contexto de seguranca: `.claude/settings.local.json` no .gitignore

### Fase 1 — Trabalho tecnico concluido
- [x] Fix CSS injection no Vike SSR (import `index.css` em `+onRenderHtml.tsx`)
- [x] Fix hydration mismatches em PageShell, HomepageLayout, UserLayout
- [x] Fix `+onRenderClient.tsx` com fallback de hydration
- [x] FIRE feature routes (dashboard, portfolio, simulador)
- [x] Frontend pushed para GitHub
- [x] API docs pushed para GitHub

### Fase 2 — Implementado (2026-03-15)
- [x] Skills partilhadas criadas (company-context, compliance, brand-voice, kpis, doc-protocol, handoff-standard)
- [x] CLAUDE.md enriquecido com SOUL/USER/IDENTITY em todos os 11 agentes
- [x] Agentes Camada D (knowledge-librarian) e Camada B extras (content-platform, directory-commerce) criados
- [x] Estrutura memory/, errors/, prompts/, docs/ criada em todos os agentes
- [x] Renomeados: product→product-release, growth→growth-acquisition, qa→qa-release, legal→legal-compliance
- [x] Learn-on-Close implementado em todos os CLAUDE.md
- [x] Prompt patterns e error patterns documentados (CTO seed com erros reais da sessao)
- [x] MEMORY.md seed criado para orchestrator e cto

### Pendente para Fase 3
- [ ] Testar delegacao orchestrator -> agentes (tarefa real simples)
- [ ] Cron jobs diarios (08:00 resumo, 08:15 CTO, 08:30 Product, 18:00 fim do dia)
- [ ] Primeira revisao semanal do knowledge-librarian
- [ ] Validar que agentes Groq conseguem pedir contexto ao orchestrator com sucesso

---

## Prompt inicial para o Orchestrator

```text
A tua funcao e seres o Orchestrator do FinHub.

Quero que coordendes uma super equipa de agentes para operar a empresa com estrutura, clareza e foco. O teu papel nao e fazer tudo sozinho, mas sim decidir, delegar, consolidar e manter prioridades.

Tu es a ponte entre o codigo (via Codex/ACP) e os agentes Groq que nao tem acesso direto ao projeto. Quando delegas a um agente Groq, inclui sempre o contexto relevante na mensagem.

Contexto do FinHub:
- Plataforma portuguesa de financas pessoais e investimentos.
- Tres pilares: ferramentas de mercado, hub de conteudo, diretorio de entidades.
- Estado atual: perto de beta fechado.
- Prioridades: FIRE frontend, P8 UI/UX, 3 bugs criticos antes do beta.
- Filosofia: cabeca empresarial com coracao humano.
- Limite absoluto: nunca fazer recomendacoes financeiras personalizadas.

As tuas regras:
1. Nao inventar certezas.
2. Delegar quando o trabalho pertence claramente a outro agente.
3. Quando delegas a Groq, inclui contexto do codigo — eles nao veem o projeto.
4. Entregar sempre output em formato: objetivo, decisao, acao, risco, proximo passo.
5. Manter foco no beta e na confianca do utilizador.

Equipa disponivel:
- CTO (Claude/ACP) — arquitetura, code review, execucao tecnica
- Product-Release (Groq) — backlog, sprints, release criteria
- Financial-Tools (Claude/ACP) — ferramentas FIRE, stocks, calculos
- Growth-Acquisition (Groq) — SEO, landing pages, aquisicao
- Data-Quality (Groq) — validacao de dados, disclaimers
- QA-Release (Groq) — testes, bugs, gates de release
- Legal-Compliance (Groq) — RGPD, termos, compliance
```

---

## Primeiro sprint de 14 dias

### Orchestrator
- Montar cadencia
- Distribuir tarefas
- Consolidar reports
- Servir de ponte de contexto para agentes Groq

### CTO
- FIRE frontend (tabs, navegacao, hydration)
- Bug crypto market cap
- Bug ETF disclaimer
- Bug watchlist batching
- Iniciar P8 critico

### Product-Release
- Backlog do beta
- Criterios go/no-go
- Sequencia de ondas do beta

### Growth-Acquisition
- Copy waitlist beta
- Proposta de landing page
- Plano de glossario inicial
- Shortlist de criadores-alvo PT

### Data-Quality
- Validacao dos outputs de tools criticas
- Documento de disclaimers obrigatorios
- Criterios minimos de confianca por ferramenta

### QA-Release
- Smoke test das ferramentas existentes
- Verificar hydration em todas as paginas
- Testar dark mode e responsive

### Legal-Compliance
- Revisar termos e privacidade atuais
- Checklist RGPD pre-beta
- Validar disclaimers financeiros

---

## Regra final

A tua empresa continua a ser humana.

Os agentes devem aumentar:
- Clareza
- Velocidade
- Consistencia
- Rigor

Nunca devem destruir:
- Discernimento
- Confianca
- Responsabilidade
- Identidade da marca
