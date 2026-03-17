# OPENCLAW_SETUP_LOG_V2.md

# OpenClaw + FinHub — Setup Log, Estado Actual e Estratégia de Optimização de Recursos

*Última actualização: 2026-03-15*
*Propósito: registo do setup actual e, acima de tudo, definição da arquitectura recomendada para usar o OpenClaw com o menor desperdício possível de API, mantendo execução forte no projecto.*

---

## LEITURA OBRIGATÓRIA ANTES DE QUALQUER TAREFA

**Todos os agentes e executores devem ler antes de começar:**

```
dcos/regras.md
```

Este ficheiro contém as regras operacionais do projecto FinHub, incluindo:
- formato obrigatório de handoff
- política de commits e documentação
- validações técnicas mínimas (typecheck backend + frontend)
- gestão do checkpoint de retoma
- ciclo de vida dos ficheiros

**Regra central de documentação:**
Nenhum ciclo de trabalho fecha sem documentação actualizada.
Toda a decisão, bloqueio ou alteração deve ficar registada — seja em `dcos/regras.md`, nos logs de setup, ou nos ficheiros de workspace do agente responsável.

---

## 1) Decisão estratégica principal

### Arquitectura de dois níveis

```
NÍVEL 1 — CÉREBRO (OpenClaw)
  Orchestrator + Agentes → coordenam, delegam, consolidam
  Provider: Groq (barato por defeito)
  Anthropic API: reserva pontual, não default global
          ↓ task packet
NÍVEL 2 — MÃOS (Executores no VS Code)
  1º Codex (VS Code) → esgotar quota primeiro
  2º Claude Sonnet 4.6 (VS Code) → fallback quando Codex esgota
```

### Arquitectura final

```
OpenClaw (Groq barato)
  → Orchestrator coordena
  → CTO prepara task packet
          ↓
  Codex no VS Code executa primeiro
          ↓ (falha / bloqueia / quota esgotada)
  Claude Sonnet 4.6 executa
          ↓
  handoff volta ao OpenClaw
  → Orchestrator consolida e reporta:
    o que foi feito / o que falta / o que precisa da tua decisão
```

### Separação de papéis

| Quem | Papel | Custo |
|------|-------|-------|
| **OpenClaw (Groq)** | cérebro barato — coordena, prioriza, delega, consolida | mínimo |
| **Codex (VS Code)** | executor principal — 1ª prioridade sempre | já absorvido no plano |
| **Claude Sonnet 4.6 (VS Code)** | executor de backup / reforço — quando Codex falha ou esgota | já absorvido no plano |
| **Anthropic API** | excepção pontual para raciocínio crítico no OpenClaw — não é default | API credits ($) |

### Regra-base
**OpenClaw pensa, organiza, distribui, resume.
Codex / Sonnet executam com custo marginal mínimo ou já absorvido pelo plano, evitando gastar API directa do OpenClaw.
Anthropic API directa é excepção, não default.**

### As 3 regras fixas

1. **OpenClaw nunca programa tarefas pesadas por defeito** — só prepara, delega e valida.
2. **Toda a tarefa técnica sai em task packet** — nada de prompts soltos para os executores.
3. **O executor devolve sempre handoff estruturado** — o que fez / ficheiros tocados / validações / riscos / próximo passo.

### Fluxo de decisão do executor

```
Tarefa técnica identificada pelo CTO
        ↓
Tem task packet? → NÃO → preparar task packet primeiro
        ↓ SIM
Codex disponível e com quota? → SIM → Codex executa
        ↓ NÃO (falhou / bloqueou / quota esgotada)
Claude Sonnet 4.6 executa
        ↓
Sonnet também não resolve (raciocínio muito complexo)?
→ Anthropic API directa — decisão consciente, não automática
```

### O risco principal
Saltar o task packet e voltar ao modo "manda lá isto ao chat".
Se isso acontecer: perde-se contexto, gasta-se mais, os resultados ficam inconsistentes.

---

## 2) Objetivo operacional desta arquitectura

O objetivo não é apenas “ter agentes”.

O objetivo é este:

### Maximizar:
- foco operacional
- qualidade de execução
- reutilização do teu ecossistema actual
- controlo humano
- eficiência de custos

### Minimizar:
- consumo desnecessário de API keys caras
- repetição de contexto em cada pedido
- uso do Orchestrator para tarefas de coding que devem ir para executores externos
- caos entre chat, coding e decisão estratégica

---

## 3) Estado actual do sistema

## Infraestrutura
- OpenClaw instalado e funcional
- Gateway local a correr
- Dashboard acessível
- Arranque automático já contornado no Windows
- Workspaces dos 8 agentes já criados
- Skills partilhadas já prontas
- Cron diário já configurado
- ACP + Codex ligado e testado
- Protocolo de análise rigorosa adicionado ao Orchestrator e CTO

## Agentes activos
| Agente | Estado | Papel |
|--------|--------|-------|
| finhub-orchestrator | Activo | Chief of Staff — coordena todos |
| finhub-cto | Activo | Arquitecto técnico e revisor crítico |
| finhub-product | Activo | Backlog, scope, critérios de release |
| finhub-growth | Activo | SEO, landing, waitlist, aquisição |
| finhub-data-quality | Activo | Confiança nos dados, disclaimers |
| finhub-legal | Activo | Compliance PT/EU, T&C, privacidade |
| finhub-qa | Activo | Qualidade funcional e visual do beta |
| finhub-financial-tools | Activo | FIRE, stocks, REITs, ETFs, calculadoras |

## Agentes planeados (só quando houver build activo)
| Agente | Activar quando |
|--------|----------------|
| finhub-content-platform | Build activo de criadores/reels/playlists |
| finhub-ads-revenue | Monetização em sprint activo |
| finhub-community | Social/discussões/gamificação em build |
| finhub-security | Pré-launch — auditoria de hardening |

## Provider actual
- **anthropic/claude-sonnet-4-6** — modelo default (Sonnet 4.6, $3/$15 per M tokens)
- Haiku disponível como fallback barato
- Groq configurado mas não usado (tool calls não funcionam no OpenClaw)
- Codex via ACP — execução técnica grátis (plano ChatGPT Plus)

### Conclusão do estado actual
A base técnica está montada e operacional. Sistema em modo operativo com 8 agentes especializados.

---

## 4) Arquitectura recomendada para optimizar recursos

## Camada A — Coordenação e contexto
### Responsável
**OpenClaw Orchestrator**

### Função
- ler o contexto total do FinHub
- perceber o estado actual do beta
- partir os pedidos em tarefas
- decidir quem deve tratar cada frente
- montar task packets claros
- consolidar resultados
- manter o sistema focado

### Modelo recomendado
- manter aqui um modelo mais barato / mais leve por defeito
- **não gastar Anthropic premium aqui por sistema**

---

## Camada B — Especialização interna
### Responsáveis
- CTO
- Product
- Growth
- Data & Quality

### Função
- receber tarefas do Orchestrator
- clarificar scope
- preparar instruções e validações
- devolver handoff limpo

### Modelo recomendado
- manter leve por defeito
- só subir de custo quando uma tarefa o justificar

---

## Camada C — Execução técnica pesada
### Responsáveis (por ordem de prioridade)
1. **Codex no VS Code** — usar primeiro, esgotar quota antes de escalar
2. **Claude Sonnet 4.6 no VS Code** — fallback quando Codex não resolve ou quota esgotada
3. **ACP / ponte por ficheiros** — quando a task precisar de ciclos longos fora do IDE

### Função
- mexer em código real
- propor alterações
- aplicar patches
- correr validações
- devolver artefactos

### Regra crítica
O executor técnico não deve ser o cérebro do sistema.
O cérebro continua a ser o OpenClaw.
A Anthropic API não é um executor técnico — é uma reserva pontual.

---

## 5) Princípio de routing de recursos

## Modo 1 — Barato por defeito
Usar OpenClaw + provider leve para:
- resumir contexto
- decidir prioridades
- triagem
- reports
- handoffs
- planeamento
- análise de bloqueios
- decidir se uma tarefa precisa de coding externo

## Modo 2 — Execução externa preferencial
Usar Claude Code / Codex para:
- refactors
- fixes
- integração frontend/backend
- alterações em múltiplos ficheiros
- testes e iteração técnica

## Modo 3 — Premium só quando necessário
Usar provider premium via API apenas quando:
- o task packet está mal resolvido pelos executores disponíveis
- é preciso raciocínio técnico mais forte e pontual
- há bloqueio real e mensurável
- tu decides conscientemente pagar esse custo

### Regra de ouro
**Não trocar todo o sistema para Anthropic só porque “é melhor”.  
Só usar Anthropic premium quando o ganho superar claramente o custo.**

---

## 6) O que muda em relação ao setup anterior

### Antes
O documento deixava implícito:
- Groq agora
- Anthropic depois
- ACP mais tarde

### Agora
A decisão fica mais inteligente:

#### Mantém
- Groq como camada principal de coordenação nesta fase

#### Não fazer já
- trocar todo o OpenClaw globalmente para Anthropic

#### Fazer depois
- testar ACP apenas no `finhub-cto`
- ou, se ACP ainda não estiver maduro, criar uma ponte simples por ficheiros

### Nova leitura estratégica
O “upgrade” não é mudar o provider global.  
O verdadeiro upgrade é **ligar o OpenClaw aos teus executores técnicos actuais**.

---

## 7) Política operacional por agente

## 7.1 Orchestrator
### Papel
Chief of Staff do FinHub

### Faz
- lê contexto total
- percebe a missão actual
- organiza prioridades
- cria task packets
- decide delegação
- consolida outputs

### Não faz
- não programa tasks pesadas por defeito
- não substitui Claude Code/Codex em coding real
- não consome modelo caro para trabalho que pode ser encaminhado

### Regra de custo
Se a tarefa é principalmente:
- planeamento
- triagem
- resumo
- decisão de fluxo

então o Orchestrator resolve internamente.

Se a tarefa é principalmente:
- alterar código
- investigar bug profundo
- mexer em múltiplos módulos
- iterar tecnicamente

então o Orchestrator **encaminha**.

---

## 7.2 CTO
### Papel
Arquitecto técnico e revisor crítico — coordena frentes técnicas especializadas

### Faz
- define padrões técnicos para toda a plataforma
- revê decisões de arquitectura
- arbitra trade-offs entre módulos
- aprova abordagens com impacto transversal
- valida handoffs técnicos dos agentes especializados
- decide quando uma tarefa vai para Codex / ACP

### Não faz
- não tenta executar sozinho toda a plataforma
- não absorve especialização que pertence a agentes técnicos de domínio
- não gere comunicação pública, legal ou growth

### Regra nova
O CTO deixou de ser o executor único.
`finhub-financial-tools` prepara o task packet de domínio.
O CTO valida e executa via Codex (ACP).

---

## 7.3 Product
### Papel
Backlog, scope e critérios de release

### Regra
Não usar modelos caros para Product nesta fase.  
Product é uma camada de clareza, não uma camada de execução pesada.

---

## 7.4 Growth
### Papel
Waitlist, landing, glossário, criadores-alvo

### Regra
Usar modelos leves por defeito.  
Só subir se houver copy crítica de alto impacto e mesmo assim com revisão humana.

---

## 7.5 Data & Quality
### Papel
Defender confiança e consistência

### Faz
- validar dados
- rever scores e indicadores
- auditar bugs com impacto em confiança
- definir disclaimers
- distinguir real vs estimado vs simulado

### Não substitui
- QA funcional
- legal/compliance
- execução matemática especializada do domínio financeiro

---

## 7.6 Legal
### Papel
Drafting legal e checklist de compliance PT/EU para o beta

### Faz
- rascunhos de Termos e Condições
- Política de Privacidade
- Política de Cookies
- financial disclaimers
- revisão de texto relacionado com consentimento, cookies e recolha de dados
- checklist de lacunas de compliance para revisão humana

### Não faz
- não substitui advogado
- não aprova juridicamente sozinho
- não publica sem estado `review required`

### Output padrão
- draft
- checklist de lacunas
- pontos para revisão jurídica
- impacto no beta

---

## 7.7 QA
### Papel
Garantir qualidade funcional e visual do beta

### Faz
- test plans
- smoke checks
- regression checklists
- validação light/dark
- journeys críticas
- discovery de bugs
- evidência (steps to reproduce, screenshots)

### Não faz
- não decide arquitectura
- não substitui Data & Quality
- não faz deploy
- não altera produção directamente

### Output padrão
- bug report
- severity
- passos para reproduzir
- evidência
- recomendação de owner

---

## 7.8 Financial Tools
### Papel
Especialista técnico-funcional do produto diferenciador do FinHub

### Faz
- FIRE simulator
- stocks, REIT toolkit, ETFs, calculadoras, scoring
- lógica matemática e financeira
- preparar task packets de domínio para execução técnica
- sinalizar edge cases e inconsistências de negócio nas ferramentas
- trabalhar com CTO e Data & Quality

### Não faz
- não tem ACP directo — prepara o pacote, o CTO executa via Codex
- não substitui QA geral
- não trata temas legais
- não gere backlog global do produto

### Output padrão
- análise de domínio
- task packet técnico-funcional
- definition of done da ferramenta
- riscos de cálculo / apresentação

---

## 8) Task packet obrigatório para execução técnica

Sempre que o Orchestrator ou o CTO mandar trabalho para Claude Code, Codex, ACP ou ponte por ficheiros, deve enviar este formato:

```md
# TASK_PACKET

## Objetivo
[qual o problema concreto]

## Contexto
[onde isto encaixa no beta do FinHub]

## Ficheiros a ler primeiro
- [ficheiro 1]
- [ficheiro 2]
- [ficheiro 3]

## Restrições
- não alterar lógica de negócio sem necessidade
- não quebrar dark mode
- respeitar design tokens
- não fazer deploy
- não reverter trabalho do utilizador

## Definition of done
- [critério 1]
- [critério 2]
- [critério 3]

## Validações obrigatórias
- backend: npm run typecheck
- frontend: npm run typecheck:p1
- [outras se aplicável]

## Formato de resposta
- o que foi feito
- ficheiros alterados
- validações corridas
- riscos / pendências
- próximo passo
```

### Objetivo deste formato
Evitar:
- prompts soltos
- perda de contexto
- reexplicação constante
- desperdício de tokens
- trabalho desalinhado

---

## 9) Política de uso de Claude Code / Codex

## Ordem de execução técnica (prioridade)

| Ordem | Executor | Quando usar | Custo |
|-------|----------|-------------|-------|
| 1º | **Codex (VS Code)** | Sempre que possível — esgotar primeiro | Quota própria |
| 2º | **Claude Sonnet 4.6 (VS Code)** | Quando Codex não resolve ou quota esgotada | Plano Claude.ai |
| 3º | **Anthropic API (OpenClaw)** | Só em último recurso ou tarefas pontuais críticas | API credits ($) |

### Regra
Nunca saltar para Claude Sonnet 4.6 se o Codex ainda tem quota disponível.
Nunca usar Anthropic API para execução técnica rotineira — essa função pertence ao IDE.

## Usar executor técnico quando:
- a task exige mexer em código real
- há mais de 2-3 ficheiros envolvidos
- o trabalho vai gerar patch ou refactor
- a investigação técnica é longa
- queres aproveitar o contexto local do projecto

## Não usar executor técnico quando:
- a task é só priorização
- a task é só decidir escopo
- a task é só escrever relatório
- a task é só triagem
- a task é principalmente decisão tua

---

## 10) Estratégia recomendada de integração

## Opção A — Ideal progressiva
**OpenClaw Orchestrator → CTO → ACP → Claude Code/Codex**

Usar esta quando ACP estiver estável e controlado.

## Opção B — Mais robusta no curto prazo
**OpenClaw Orchestrator → CTO → task packet em ficheiro → executor local → result packet**

Usar esta se quiseres começar já, com mais previsibilidade.

### Recomendação
Começar por **Opção B** se quiseres velocidade e controlo.  
Passar para **Opção A** quando o sistema base estiver testado.

---

## 11) Ponte por ficheiros (fallback recomendado)

### Estrutura sugerida
```text
.project-agent-bridge/
  inbox/
  outbox/
  status/
  logs/
```

### Ficheiros principais
- `task-YYYYMMDD-HHMM.json`
- `result-YYYYMMDD-HHMM.json`
- `error-YYYYMMDD-HHMM.json`
- `approval-YYYYMMDD-HHMM.json`

### Estados
- `created`
- `queued`
- `in_progress`
- `needs_review`
- `done`
- `failed`

### Vantagem
Mesmo que mudes de executor no futuro, o protocolo mantém-se.

---

## 12) Recomendação sobre providers

## Agora
Manter:
- **Groq** como provider principal do OpenClaw

## Não fazer agora
- não migrar o sistema inteiro para Anthropic já

## Mais tarde
Adicionar Anthropic como opção secundária para casos específicos, não como default global.

### Critério para activação de Anthropic
Só activar quando houver:
- bloqueio técnico claro
- necessidade de qualidade superior em ponto crítico
- ou tarefa onde o retorno esperado justifica o custo

---

## 13) Próximos passos correctos

## Imediato
1. Testar o Orchestrator sozinho
2. Validar que lê bem o contexto do FinHub
3. Confirmar que responde no formato certo
4. Criar um primeiro task packet técnico para o CTO
5. Escolher se a primeira execução técnica vai por ACP ou ponte por ficheiros

## A seguir
6. Testar delegação Orchestrator → CTO
7. Testar um ciclo completo:
   - pedido teu
   - plano do Orchestrator
   - task packet
   - execução externa
   - handoff de volta
8. Só depois escalar para Product, Growth e Data & Quality em rotinas mais fortes

---

## 14) Teste operacional recomendado

### Prompt 1 — teste do Orchestrator
“Lê o contexto do FinHub e diz-me:
1. qual é a missão operacional actual
2. quais são as 5 prioridades críticas
3. o que deve ser resolvido por CTO
4. o que exige decisão do fundador”

### Prompt 2 — teste de task packet
“Transforma a prioridade ‘ligar o FIRE frontend aos blocos de what-if e Monte Carlo’ num task packet técnico para execução externa.”

### Prompt 3 — teste de custo
“Diz-me se esta tarefa deve ser resolvida internamente pelo OpenClaw ou enviada para Claude Code/Codex, e porquê.”

---

## 15) Regra final do sistema

### OpenClaw
pensa, coordena, resume, distribui, valida

### Claude Code / Codex
executam, iteram, alteram código, testam, devolvem artefactos

### Fundador
decide, aprova e mantém o rumo

---

## 16) Frase-mestra desta versão

**OpenClaw (Sonnet 4.6) = cérebro com rigor analítico.
Codex = executor principal (grátis, plano ChatGPT Plus).
Claude Sonnet no VS Code = executor de backup / reforço.
Haiku = fallback barato se custo for preocupação.**

O OpenClaw não existe para substituir os executores técnicos.
Existe para os coordenar com contexto, foco e o menor custo possível.
Tu decides. Sempre.

---

## 17) Setup operacional — máquina actual

### Máquina
- **OS:** Windows 10 Pro
- **User:** Admin (C:\Users\Admin\)
- **Node:** v24.8.0 | **npm:** 11.6.0
- **OpenClaw:** v2026.3.13

### Provider activo
- **anthropic/claude-sonnet-4-6** — modelo default para todos os agentes ($3/$15 per M tokens)
- Haiku disponível como fallback barato se necessário
- Groq configurado mas **não usado** (tool calls não funcionam no OpenClaw)
- Codex via ACP — execução técnica grátis (plano ChatGPT Plus)
- **Custo real:** Sonnet para coordenação (poucos dólares/mês em mensagens curtas) + Codex grátis para execução pesada

### ACP — Codex conectado

| Componente | Versão | Estado |
|-----------|--------|--------|
| acpx plugin | 0.1.16 | ready |
| codex-acp | 0.9.5 | ligado |
| codex-cli | 0.114.0 | autenticado (ChatGPT Plus) |

**Config ACP (`~/.acpx/config.json`):**
```json
{
  "agents": {
    "codex": {
      "command": "C:/Users/Admin/.openclaw/bin/codex-acp.exe"
    }
  }
}
```
**REGRA CRITICA:** Nunca usar backslashes em paths no `~/.acpx/config.json`. A função `splitCommandLine` do acpx trata `\` como escape.

### Arrancar o gateway

```bash
export ANTHROPIC_API_KEY=$(powershell.exe -Command '[System.Environment]::GetEnvironmentVariable("ANTHROPIC_API_KEY","User")' 2>/dev/null | tr -d '\r')
export GROQ_API_KEY=$(powershell.exe -Command '[System.Environment]::GetEnvironmentVariable("GROQ_API_KEY","User")' 2>/dev/null | tr -d '\r')
openclaw gateway
```

### Dashboard
- URL: `http://127.0.0.1:18789/__openclaw__/canvas/`
- Token: ver `openclaw.json` → `gateway.auth.token`

### Spawnar Codex no dashboard
```
/acp spawn codex --mode persistent --cwd C:\Users\Admin\Documents\GitHub\API_finhub
/focus codex
```

### Cron jobs
| Nome | Schedule | Agente |
|------|----------|--------|
| finhub-morning-orchestrator | 0 8 * * * | finhub-orchestrator |
| finhub-morning-cto | 15 8 * * * | finhub-cto |
| finhub-morning-product | 30 8 * * * | finhub-product |
| finhub-evening-orchestrator | 0 18 * * * | finhub-orchestrator |

### Bloqueios resolvidos no Windows
1. **Daemon** — contornado via bat em `shell:startup`
2. **Skills BOM** — criadas sem BOM, path correcto `workspace/skills/`
3. **Env vars** — `setx` + export manual em sessão bash
4. **Gateway restart** — SIGUSR1 não existe no Windows, parar+arrancar manual
5. **ACP spawn** — `splitCommandLine` trata `\` como escape, usar forward slashes
6. **codex-acp win32** — instalar `@zed-industries/codex-acp-win32-x64` manualmente
7. **Groq tool calls** — não funciona, migrado para Haiku → depois para Sonnet 4.6

### Protocolo de análise rigorosa (adicionado aos agentes)
O Orchestrator e o CTO têm agora regras operacionais nos seus AGENTS.md:
- **Orchestrator**: protocolo de análise com 5 fases (mapa documental → facto/inferência → confiança → gate handoff → gate delegação) + modo rápido para triagem
- **CTO**: gate de entrada (verificar qualidade do handoff recebido) + triagem obrigatória antes de spawnar Codex (task packet, nunca prompts soltos)

### Comandos úteis
```bash
openclaw gateway status       # estado do gateway
openclaw skills list          # verificar skills
openclaw agents list          # agentes registados
openclaw cron list            # cron jobs
openclaw doctor               # validar config
```

---

## 18) Estrutura de agentes — visão completa

### O FinHub como 5 produtos distintos

A plataforma não é uma app financeira única. É composta por:
1. **Motor de ferramentas financeiras** — FIRE, stocks, REITs, ETFs, calculadoras, scoring
2. **Plataforma de conteúdo** — 6 tipos, criadores, analytics, moderação editorial
3. **Ecossistema de anúncios e receita** — ads éticos, afiliados, subscriptions, marketplace
4. **Comunidade social** — discussões, reputação, gamificação, objetivos
5. **Directório de entidades** — brokers, seguros, fintechs, reviews e comparações

### Regra de criação de agentes
Só criar um novo agente quando existir:
- trabalho ativo suficiente
- contexto próprio
- regras próprias
- cadência própria
- risco suficiente para justificar especialização

Nenhum agente nasce "por antecipação" sem função viva.

### Tabela de routing
| Pedido | Agente certo |
|--------|-------------|
| coordenação / plano / sequência | Orchestrator |
| arquitectura / revisão crítica / cross-módulo | CTO |
| backlog / release / scope | Product |
| copy / waitlist / SEO / landing | Growth |
| dados / disclaimers / precisão / confiança | Data & Quality |
| páginas legais / cookies / privacidade / T&C | Legal |
| testes / regressões / smoke checks / UI validation | QA |
| FIRE / stocks / REITs / ETFs / cálculos / lógica de ferramentas | Financial Tools |

### Quem delega em quem
- **Fundador** → Orchestrator (coordenação) ou CTO (temas técnicos concretos)
- **Orchestrator** → todos os 7 agentes especializados
- **CTO** → Financial Tools (domínio), QA (técnico/funcional), Codex/ACP (execução)
- **Financial Tools** → prepara task packet, CTO executa via Codex (sem ACP directo)
- **Data & Quality** → trabalha com Financial Tools, Legal e QA quando confiança está em causa

### Agentes futuros (activar quando houver build activo)
| Agente | Activar quando |
|--------|----------------|
| finhub-content-platform | Reels, playlists, analytics criadores, wallet em sprint activo |
| finhub-ads-revenue | Monetização (subscriptions, value ads, marketplace) em sprint activo |
| finhub-community | Social/discussões/gamificação em build real |
| finhub-security | Pré-launch — auditoria de hardening, OWASP, permissões |

### Regra final
Nem agentes a menos (cria superficialidade) nem agentes a mais (cria overhead).
**A estrutura certa respeita a complexidade real da plataforma e o foco real da fase actual.**
