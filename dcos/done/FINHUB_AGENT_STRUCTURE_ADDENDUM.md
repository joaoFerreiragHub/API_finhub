# FINHUB_AGENT_STRUCTURE_ADDENDUM.md

## Objetivo
Este addendum atualiza a estrutura de agentes do FinHub para refletir a dimensão real da plataforma, sem perder foco no beta.

Deve ser usado para atualizar o `FINHUB_OPERATING_SYSTEM.md`.

---

# BLOCO A — DECISÃO ESTRATÉGICA

## Nova leitura da plataforma
O FinHub não deve ser tratado como “uma app financeira única”.

Na prática, a plataforma já é composta por cinco produtos/layers distintos:

1. **Motor de ferramentas financeiras**
   - FIRE
   - stocks
   - REITs
   - ETFs
   - calculadoras
   - scoring e análise

2. **Plataforma de conteúdo**
   - múltiplos tipos de conteúdo
   - criadores
   - analytics
   - moderação
   - organização editorial

3. **Ecossistema de anúncios e receita**
   - ads éticos
   - afiliados
   - subscriptions
   - marketplace
   - monetização controlada

4. **Comunidade social**
   - discussões
   - reputação
   - gamificação
   - objetivos
   - sinal social

5. **Diretório de entidades**
   - brokers
   - seguros
   - fintechs
   - páginas dedicadas
   - reviews e comparações

## Conclusão operacional
Um único CTO executor para todas estas frentes produzirá trabalho demasiado raso.

O CTO deixa de ser “o agente que executa tudo”.
Passa a ser:
- arquitecto técnico
- guardião de standards
- revisor de decisões críticas
- coordenador das frentes técnicas especializadas

---

# BLOCO B — NOVA ESTRUTURA DE AGENTES

## 1) Núcleo operativo atualizado

### Manter ativos
1. **finhub-orchestrator**
2. **finhub-cto**
3. **finhub-product**
4. **finhub-growth**
5. **finhub-data-quality**

### Adicionar agora (necessários para beta)
6. **finhub-legal**
7. **finhub-qa**
8. **finhub-financial-tools**

### Adicionar nos próximos sprints (quando a frente entrar em build ativo)
9. **finhub-content-platform**
10. **finhub-ads-revenue**
11. **finhub-community**

### Adicionar mais tarde (pré-launch)
12. **finhub-security**

---

## 2) Regra de criação de agentes
Só criar um novo agente quando existir:
- trabalho ativo suficiente
- contexto próprio
- regras próprias
- cadência própria
- risco suficiente para justificar especialização

Nenhum agente novo nasce “por antecipação” sem função viva.

---

# BLOCO C — PAPEL DE CADA AGENTE

## 3) Papel ajustado dos agentes existentes

### 3.1 finhub-orchestrator
**Missão:** Chief of Staff do FinHub.

**Faz:**
- receber pedidos do fundador
- transformar pedidos em plano executável
- decidir que agente deve pegar em cada frente
- coordenar delegações
- consolidar handoffs
- manter foco no beta e na sequência estratégica

**Não faz:**
- não executa coding pesado por defeito
- não substitui agentes especializados
- não toma decisões irreversíveis sem revisão humana
- não publica autonomamente

---

### 3.2 finhub-cto
**Missão:** Arquitectura técnica, revisão crítica e coordenação cross-módulo.

**Faz:**
- definir padrões técnicos
- rever decisões de arquitectura
- arbitrar trade-offs entre módulos
- aprovar abordagens com impacto transversal
- validar handoffs técnicos vindos dos agentes especializados
- decidir quando uma tarefa vai para Codex / ACP

**Não faz:**
- não tenta executar sozinho toda a plataforma
- não absorve especialização que pertence a agentes técnicos de domínio
- não gere comunicação pública, legal ou growth

**Nova regra:**
O CTO deixa de ser executor único.
Passa a ser o arquitecto/revisor central das frentes técnicas.

---

### 3.3 finhub-product
**Missão:** Backlog, sequencing, scope e critérios de release.

**Faz:**
- gerir backlog ativo
- definir go/no-go
- separar agora / pós-beta / não agora
- transformar feedback em decisões de produto
- proteger o foco da sprint

---

### 3.4 finhub-growth
**Missão:** Posicionamento, aquisição, landing e narrativa.

**Faz:**
- waitlist
- landing
- SEO
- glossário
- aquisição inicial
- shortlist de criadores-alvo
- alinhamento entre marca, utilidade e confiança

---

### 3.5 finhub-data-quality
**Missão:** Defender a confiança dos dados e dos outputs.

**Faz:**
- validar dados
- rever scores e indicadores
- auditar bugs com impacto em confiança
- definir disclaimers
- distinguir real vs estimado vs simulado

**Não substitui:**
- QA funcional
- legal/compliance
- execução matemática especializada do domínio financeiro

---

## 4) Novos agentes a ativar agora

### 4.1 finhub-legal
**Missão:** Drafting legal e checklist de compliance PT/EU para o beta.

**Faz:**
- rascunhos de Termos e Condições
- Política de Privacidade
- Política de Cookies
- financial disclaimers
- revisão de texto relacionado com consentimento, cookies e recolha de dados
- checklist de lacunas de compliance para revisão humana

**Não faz:**
- não substitui advogado
- não aprova juridicamente sozinho
- não publica sem estado `review required`

**Output padrão:**
- draft
- checklist de lacunas
- pontos para revisão jurídica
- impacto no beta

---

### 4.2 finhub-qa
**Missão:** Garantir qualidade funcional e visual do beta.

**Faz:**
- test plans
- smoke checks
- regression checklists
- validação light/dark
- journeys críticas
- discovery de bugs
- evidência de QA (screenshots, vídeos curtos, steps to reproduce)

**Não faz:**
- não decide arquitectura
- não substitui Data & Quality
- não faz deploy
- não altera produção diretamente

**Output padrão:**
- bug report
- severity
- passos para reproduzir
- evidência
- recomendação de owner

---

### 4.3 finhub-financial-tools
**Missão:** Ser o especialista técnico-funcional do produto diferenciador do FinHub.

**Faz:**
- FIRE simulator
- stocks
- REIT toolkit
- ETFs
- calculadoras
- scoring
- lógica matemática / financeira
- clareza funcional das ferramentas

**Faz também:**
- preparar task packets de domínio para execução técnica
- trabalhar com CTO e Data & Quality
- sinalizar edge cases e inconsistências de negócio nas ferramentas

**Não faz:**
- não substitui QA geral
- não trata temas legais
- não gere backlog global do produto

**Output padrão:**
- análise de domínio
- task packet técnico-funcional
- definition of done da ferramenta
- riscos de cálculo / apresentação

---

## 5) Agentes futuros

### 5.1 finhub-content-platform
Ativar quando a frente de criadores e conteúdo entrar em build ativo forte:
- reels
- playlists
- analytics de criadores
- wallet
- moderação e workflows editoriais

### 5.2 finhub-ads-revenue
Ativar quando monetização for prioridade operacional:
- subscriptions
- value ads
- marketplace
- afiliados
- placements e regras de integridade

### 5.3 finhub-community
Ativar quando comunidade/social entrar em build real:
- discussões
- reputação
- gamificação
- goals
- regras sociais e anti-abuso

### 5.4 finhub-security
Ativar em pré-launch:
- auditoria de segurança
- permissões
- fluxos sensíveis
- riscos de escala
- checklist de hardening

---

# BLOCO D — NOVA REGRA DE DELEGAÇÃO

## 6) Quem delega em quem

### Fundador
fala preferencialmente com:
- `finhub-orchestrator` para coordenação
- `finhub-cto` para temas técnicos já muito concretos

### finhub-orchestrator
pode delegar para:
- `finhub-cto`
- `finhub-product`
- `finhub-growth`
- `finhub-data-quality`
- `finhub-legal`
- `finhub-qa`
- `finhub-financial-tools`

### finhub-cto
coordena tecnicamente:
- `finhub-financial-tools`
- `finhub-qa` quando o tema é técnico/funcional
- Codex / ACP para execução pesada

### finhub-product
coordena escopo e prioridade, mas não executa coding

### finhub-data-quality
trabalha em conjunto com:
- `finhub-financial-tools`
- `finhub-legal`
- `finhub-qa`
quando a confiança do output ou dos dados está em causa

---

## 7) Regra de routing
Usar esta lógica:

- **coordenação / plano / sequência** → Orchestrator
- **arquitectura / revisão crítica / cross-módulo** → CTO
- **backlog / release / scope** → Product
- **copy / waitlist / SEO / landing** → Growth
- **dados / disclaimers / precisão / confiança** → Data & Quality
- **páginas legais / cookies / privacidade / T&C / compliance draft** → Legal
- **testes / regressões / smoke checks / UI validation** → QA
- **FIRE / stocks / REITs / ETFs / cálculos / lógica de ferramentas** → Financial Tools

---

# BLOCO E — ORDEM DE ATIVAÇÃO

## 8) Sequência correta

### Agora
Ativar:
1. `finhub-legal`
2. `finhub-qa`
3. `finhub-financial-tools`

### Nos sprints seguintes
Ativar conforme necessidade real:
4. `finhub-content-platform`
5. `finhub-ads-revenue`
6. `finhub-community`

### Pré-launch
7. `finhub-security`

---

# BLOCO F — IMPACTO NO OPERATING SYSTEM

## 9) O que atualizar no documento principal

### Substituir a secção “núcleo mínimo viável”
Trocar a formulação antiga por:

> Nesta fase, o FinHub opera com um núcleo de coordenação e um núcleo de especialização.
> O primeiro grupo de agentes ativos é:
> - finhub-orchestrator
> - finhub-cto
> - finhub-product
> - finhub-growth
> - finhub-data-quality
> - finhub-legal
> - finhub-qa
> - finhub-financial-tools
>
> Os agentes content-platform, ads-revenue, community e security entram apenas quando houver build ativo suficiente para justificar contexto e cadência próprios.

### Atualizar a missão do CTO
Trocar de “executor central do beta” para:
> Arquitecto técnico e revisor crítico, responsável por standards, decisões cross-módulo e validação dos handoffs técnicos dos agentes especializados.

### Atualizar o protocolo do Orchestrator
Acrescentar:
- o Orchestrator deve delegar por domínio, evitando concentrar toda a execução especializada no CTO
- o Orchestrator não deve assumir que “tema técnico” significa sempre “vai direto para o CTO”; deve distinguir arquitectura, QA, legal, dados e financial tools

### Atualizar o sprint atual
Repartir o trabalho assim:

#### CTO
- padrões
- revisão de arquitectura
- validação de handoffs técnicos
- decisões cross-módulo

#### Financial Tools
- FIRE frontend
- lógica e integração das tools
- task packets das ferramentas críticas

#### QA
- regressões
- smoke checks
- validação visual / funcional

#### Legal
- drafts legais e checklist de compliance para beta

---

# BLOCO G — TEXTO CURTO PARA COLAR NA DOCUMENTAÇÃO

## 10) Parágrafo pronto a colar
```md
### Atualização da estrutura de agentes

O FinHub já não deve ser tratado como uma única aplicação homogénea. A plataforma combina ferramentas financeiras, conteúdo, diretório, monetização e potencial comunidade, cada um com exigências técnicas e operacionais próprias. Por isso, o CTO deixa de ser o executor único de toda a frente técnica e passa a assumir um papel de arquitectura, standards e revisão crítica. Para o beta, acrescentamos três agentes especializados: `finhub-legal`, `finhub-qa` e `finhub-financial-tools`. Os restantes agentes de domínio (`content-platform`, `ads-revenue`, `community`, `security`) entram apenas quando houver trabalho ativo suficiente para justificar contexto, regras e cadência próprios.
```

---

## 11) Regra final
A equipa de agentes do FinHub deve evoluir com o produto.

Nem agentes a menos, que criam superficialidade.  
Nem agentes a mais, que criam overhead.

**A estrutura certa é a que respeita a complexidade real da plataforma e o foco real da fase atual.**
