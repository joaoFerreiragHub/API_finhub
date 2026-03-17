# OPENCLAW_SETUP_LOG_V4_RECOMMENDED.md

# OpenClaw + FinHub — V4 Recommended
*Última atualização: 2026-03-17*  
*Objetivo: manter a visão de super equipa de agentes, mas com uma infraestrutura mais disciplinada, sincronizada e orientada a aprendizagem contínua.*

---

## 1) Decisão principal desta V4

O setup atual está forte, mas precisa de passar de:

**"muitos agentes registados e prontos"**

para:

**"super equipa coordenada, com estados claros, responsabilidades claras, e aprendizagem acumulada".**

A V4 não reduz a ambição.

A V4 faz 4 coisas:
1. mantém a super equipa
2. separa agentes ativos vs standby
3. reforça sincronização entre agentes
4. transforma trabalho em conhecimento institucional

---

## 2) Princípio-base da super equipa

### Regra central
**O conhecimento e a inteligência ficam do lado do FinHub.**
As ferramentas externas são braços de execução, não a memória principal da organização.

### Isto significa:
- o Orchestrator coordena
- os agentes de domínio pensam no seu domínio
- os executores externos programam ou produzem quando faz sentido
- os learnings voltam sempre para o sistema OpenClaw
- a equipa melhora com o tempo

---

## 3) O que manter do setup atual

### Manter sem mexer
- Gateway local
- Dashboard
- ACP + acpx
- providers separados por função
- skills partilhadas
- `finhub-knowledge-librarian`
- padrão Learn-on-Close
- Telegram / canais remotos
- estrutura por camadas (Command / Domain / Trust / Knowledge)

### Manter como visão
- super equipa de agentes
- memória institucional local
- execução técnica externa quando necessário
- crescimento da equipa por domínio

---

## 4) O que corrigir já

## 4.1 O Orchestrator está forte demais
### Problema
No setup atual, o Orchestrator aparece a:
- receber pedidos
- delegar
- ler ficheiros via Codex/ACP
- dar contexto aos outros
- e ainda “executar mudanças de código”

Isto cria sobreposição com:
- CTO
- Financial Tools
- QA

### Decisão V4
**O Orchestrator deixa de executar mudanças de código por defeito.**

### Papel correto do Orchestrator
- coordenar
- decidir routing
- consolidar
- pedir contexto
- validar se a frente certa foi ativada
- manter foco e prioridade
- gerar o plano seguinte

### Não faz
- coding pesado
- fixes técnicos profundos
- implementação direta por defeito
- absorver especialização que já existe noutros agentes

---

## 4.2 Estados dos agentes não estão claros
### Problema
Tens muitos agentes registados, mas falta distinguir:
- quem trabalha todos os dias
- quem está pronto mas em espera
- quem só entra noutra fase

### Decisão V4
Cada agente passa a ter um estado operacional:

- `ACTIVE`
- `STANDBY`
- `FUTURE`

---

## 5) Super equipa FinHub — modelo operacional V4

## Camada A — Command

### 1. finhub-orchestrator
**Estado:** ACTIVE  
**Missão:** Chief of Staff. Coordena toda a equipa.

**Responsável por:**
- receber pedidos do fundador
- partir objetivos em frentes de trabalho
- escolher agentes certos
- consolidar handoffs
- decidir quando ativar o CTO
- manter a visão global

---

### 2. finhub-cto
**Estado:** ACTIVE  
**Missão:** Chief Architect e technical gatekeeper.

**Responsável por:**
- standards técnicos
- revisão de arquitetura
- decisões cross-módulo
- validar handoffs técnicos
- decidir quando uma tarefa vai para Codex/ACP
- coordenar agentes técnicos especializados

**Nova regra V4:**
O CTO já não é executor único.
É o responsável pela coerência técnica da organização.

---

### 3. finhub-product-release
**Estado:** ACTIVE  
**Missão:** backlog, sequencing, critérios de beta e release.

---

## Camada B — Domain Agents

### 4. finhub-financial-tools
**Estado:** ACTIVE  
**Missão:** dono funcional das ferramentas financeiras.

**Responsável por:**
- FIRE
- stocks
- REITs
- ETFs
- watchlist
- scoring
- calculadoras
- lógica financeira
- critérios funcionais das tools

**Nota:**
Este agente deve ser o principal especialista do diferencial do FinHub.

---

### 5. finhub-growth-acquisition
**Estado:** ACTIVE  
**Missão:** waitlist, landing, SEO, narrativa e aquisição.

---

### 6. finhub-content-platform
**Estado:** STANDBY  
**Missão:** conteúdo, criadores, workflows editoriais, analytics de creators.

**Ativar quando:**
- os gaps desta frente entrarem em build ativo

---

### 7. finhub-directory-commerce
**Estado:** STANDBY  
**Missão:** diretório de entidades, listings, páginas dedicadas, lógica comercial futura.

**Ativar quando:**
- a frente diretório/reviews/claims passar a ser prioridade real da sprint

---

### 8. finhub-community
**Estado:** FUTURE  
**Missão:** discussões, reputação, gamificação, goals.

---

### 9. finhub-ads-revenue
**Estado:** FUTURE  
**Missão:** subscriptions, value ads, marketplace, afiliados.

---

## Camada C — Trust / Risk / Validation

### 10. finhub-data-quality
**Estado:** ACTIVE  
**Missão:** confiança dos dados, outputs e disclaimers.

---

### 11. finhub-qa-release
**Estado:** ACTIVE  
**Missão:** smoke tests, regressões, journeys críticas, UX validation.

---

### 12. finhub-legal-compliance
**Estado:** ACTIVE  
**Missão:** termos, privacidade, cookies, disclaimers e checklist legal do beta.

---

## Camada D — Institutional Knowledge

### 13. finhub-knowledge-librarian
**Estado:** ACTIVE  
**Missão:** transformar trabalho em inteligência acumulada.

**Responsável por:**
- recolher learnings
- manter índice de docs
- canonizar decisões
- atualizar skills
- criar playbooks
- promover padrões recorrentes

---

### 14. finhub-security
**Estado:** FUTURE  
**Missão:** auditoria de segurança, hardening, permissões e pré-launch safety.

---

## 6) Regra de ativação real

### ACTIVE
Agentes que trabalham de forma recorrente nesta fase:
- finhub-orchestrator
- finhub-cto
- finhub-product-release
- finhub-financial-tools
- finhub-growth-acquisition
- finhub-data-quality
- finhub-qa-release
- finhub-legal-compliance
- finhub-knowledge-librarian

### STANDBY
Agentes já definidos, mas não chamados todos os dias:
- finhub-content-platform
- finhub-directory-commerce

### FUTURE
Agentes que existem como desenho, mas ainda não entram:
- finhub-community
- finhub-ads-revenue
- finhub-security

---

## 7) Como os agentes trabalham em sincronia

## 7.1 Princípio
Nenhum agente trabalha “solto”.

Todo o trabalho passa por este ciclo:

### Ciclo oficial
1. **Objetivo**
2. **Delegação**
3. **Execução**
4. **Validação**
5. **Handoff**
6. **Aprendizagem**
7. **Consolidação**

---

## 7.2 Fluxo recomendado

### Exemplo genérico
**Fundador**
→ fala com `finhub-orchestrator`

**Orchestrator**
→ decide quais agentes entram

**Agente de domínio**
→ analisa e prepara a frente

**CTO**
→ entra se houver impacto técnico, arquitetura ou execução pesada

**Codex / ACP**
→ executa código quando necessário

**QA / Data Quality / Legal**
→ validam o que lhes compete

**Knowledge Librarian**
→ captura o learning

**Orchestrator**
→ devolve estado consolidado e próximo passo

---

## 8) Regra de delegação por tipo de trabalho

### Coordenação / decisão / sequência
→ `finhub-orchestrator`

### Arquitetura / standards / impacto transversal
→ `finhub-cto`

### Backlog / scope / go-no-go
→ `finhub-product-release`

### FIRE / stocks / REITs / ETFs / cálculo / critérios funcionais
→ `finhub-financial-tools`

### SEO / landing / waitlist / narrativa
→ `finhub-growth-acquisition`

### Qualidade de dados / confiança / disclaimers
→ `finhub-data-quality`

### QA funcional / regressões / journeys
→ `finhub-qa-release`

### Privacidade / termos / cookies / legal draft
→ `finhub-legal-compliance`

### Documentação viva / learnings / canonização
→ `finhub-knowledge-librarian`

---

## 9) Como garantir que a equipa aprende

## 9.1 Learn-on-Close continua obrigatório
No fim de cada tarefa:
1. registar decisão
2. registar erro
3. registar prompt ou task packet útil
4. registar lição aprendida
5. marcar se a lição é:
   - específica do agente
   - transversal à organização

---

## 9.2 Nova regra V4 — Learning Pipeline
Cada trabalho fechado gera 3 outputs:

### A. Output operacional
- patch
- draft
- relatório
- checklist
- bug report
- validação

### B. Output de memória
- o que aprendemos
- o que falhou
- o que nunca repetir
- o que se tornou padrão

### C. Output de sistema
- skill atualizada
- regra atualizada
- checklist melhorada
- template melhorado
- playbook novo

---

## 9.3 Papel do Knowledge Librarian
O `finhub-knowledge-librarian` passa a operar em 3 ritmos:

### Diário
- recolhe handoffs
- recolhe learnings
- atualiza índice leve

### Semanal
- deteta padrões recorrentes
- classifica lições repetidas
- identifica conflitos documentais

### Quinzenal
- promove padrões para skills
- atualiza playbooks
- limpa ruído e redundância

---

## 10) Como saber se está tudo a correr bem

## 10.1 Gates obrigatórios
Cada tarefa deve passar por:

### Gate 1 — Handoff
- objetivo
- o que foi feito
- riscos
- ficheiros afetados
- validações
- próximo passo

### Gate 2 — Validação de domínio
Feita pelo agente certo:
- técnico → CTO
- dados → Data Quality
- journeys/UI → QA
- legal/compliance → Legal

### Gate 3 — Consolidação
O Orchestrator resume:
- estado atual
- bloqueios
- decisões pendentes
- próximo passo

### Gate 4 — Aprendizagem
O Knowledge Librarian decide:
- fica em memória local?
- vira skill?
- vira checklist?
- vira playbook?

---

## 10.2 Indicadores de saúde da super equipa
A equipa está a funcionar bem se houver:

- menos repetição de contexto
- task packets melhores
- menos bugs repetidos
- menos decisões perdidas
- menos dependência da tua memória humana
- mais reutilização de learnings
- mais clareza sobre quem faz o quê
- CTO menos sobrecarregado
- Orchestrator menos interventivo em código

---

## 11) Relação com Codex / ACP

### Regra V4
Codex é um executor.
Não é memória institucional.
Não é source of truth.
Não substitui agentes do FinHub.

### Fluxo correto
- Orchestrator ou CTO decide
- Financial Tools ou outro agente prepara contexto
- CTO envia para Codex / ACP
- Codex executa
- resultado volta
- validação acontece
- learning é capturado no sistema FinHub

---

## 12) Cron e sincronização

## Decisão V4
Os cron jobs mantêm-se, mas só contam como “prontos” quando passarem em validação real.

### Cron atual
- resumo executivo do Orchestrator
- relatório técnico do CTO
- prioridades do Product
- fecho do dia do Orchestrator

### Acrescentar depois
- sync semanal do Knowledge Librarian
- revisão quinzenal de learnings
- auditoria de agentes STANDBY (para ver se devem ser ativados)

---

## 13) Simplificações obrigatórias

## 13.1 Naming
Eliminar variantes antigas ou redundantes.
Ficar com naming único e final por agente.

## 13.2 Workspaces
Cada agente mantém:
- identidade
- regras
- memória
- exemplos
- learnings
- playbooks do seu domínio

## 13.3 Orchestrator
Remover do seu papel:
- “executa mudanças de código”

Substituir por:
- “coordena execução técnica através do CTO e dos agentes especializados”

---

## 14) Roadmap de maturidade da super equipa

## Fase 1 — Beta disciplinado
Ativos:
- orchestrator
- cto
- product-release
- financial-tools
- growth-acquisition
- data-quality
- qa-release
- legal-compliance
- knowledge-librarian

Objetivo:
- fechar beta com profundidade e coordenação

## Fase 2 — Expansão modular
Ativar:
- content-platform
- directory-commerce

Objetivo:
- crescer sem partir a coerência

## Fase 3 — Escala comercial/social
Ativar:
- ads-revenue
- community

Objetivo:
- monetizar e socializar com boundaries claros

## Fase 4 — Pré-launch forte
Ativar:
- security

Objetivo:
- hardening final antes de escalar

---

## 15) Texto curto para colar no setup principal

```md
### Decisão V4 — Super Equipa FinHub

Mantemos a visão de super equipa de agentes, mas com disciplina operacional mais forte. Nem todos os agentes devem estar ativos ao mesmo tempo. A partir desta versão, cada agente passa a ter estado (`ACTIVE`, `STANDBY`, `FUTURE`), o Orchestrator deixa de executar código por defeito, o CTO assume o papel de arquitecto/revisor crítico, e o Knowledge Librarian passa a ser o centro de aprendizagem institucional. O objetivo não é ter muitos agentes por ter; é ter uma organização de agentes que trabalha em sincronia, aprende lições, acumula conhecimento localmente e usa executores externos apenas como braços especializados.
```

---

## 16) Frase final da V4

**O FinHub não precisa de um super-agente.  
Precisa de uma super organização de agentes que pensa em conjunto, executa por domínio e aprende com tudo o que faz.**
