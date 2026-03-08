# Estrategia de Revenue e Publicidade - FinHub

Data: 2026-03-07
Base: Auditoria 04 (diretriz 7.1), P4.3-4.5, AUDITORIA_05
Principio: Win-Win-Win (plataforma, anunciante, utilizador)

---

## FILOSOFIA CORE

A publicidade financeira tradicional e predadora: banners genericos, popups de brokers, clickbait de "ganhe dinheiro facil". O FinHub deve ser o oposto. Cada peca publicitaria deve:

1. **Dar valor ao user** - o anuncio ensina, resolve ou melhora a experiencia
2. **Dar resultados ao anunciante** - conversao real, nao impressoes vazias
3. **Gerar receita sustentavel** - sem destruir confianca

Regra de ouro: **Se o user nao consegue distinguir o anuncio de uma feature util, o anuncio esta bem feito.**

---

## TIPOLOGIA DE ANUNCIOS (alinhada com P4.4-03)

```
external_ads    → rede externa (adsense, etc.) - removido por premium
sponsored_ads   → campanhas de marcas/criadores dentro da plataforma
house_ads       → promocoes internas (upgrade, features, referral)
value_ads       → NOVO: anuncios que entregam valor funcional ao user
```

O `value_ads` e a inovacao. Nao e um banner. E uma feature patrocinada, um dado real, uma simulacao personalizada. O user QUER ver porque lhe da algo.

---

## 1) VALUE ADS - Publicidade que o User Quer Ver

### 1.1 - Insight Sponsorship ("Sabias que..." patrocinado)

**Conceito:** Em vez de um banner, a marca patrocina um facto financeiro educativo. O anuncio E o conteudo.

**Exemplo real:**
```
+---------------------------------------------------------------+
|  💡 Sabias que...                                              |
|  Um ETF europeu tem em media 0.20% de taxa de gestao,         |
|  enquanto um fundo tradicional cobra 1.5%?                    |
|  A diferenca num portfolio de 50K em 20 anos: ~18.000 EUR.    |
|                                                                |
|  Dados patrocinados por DEGIRO                    [Saber mais] |
+---------------------------------------------------------------+
```

**Porque funciona:**
- User: aprende algo util, nao se sente bombardeado
- Marca: associacao com conhecimento e confianca
- Plataforma: CPM premium porque engagement e altissimo

**Implementacao:**
```typescript
interface InsightAd {
  type: 'value_ads'
  subtype: 'insight_sponsorship'
  fact: string                   // o facto educativo
  source?: string                // fonte do dado
  calculation?: string           // calculo que prova o facto
  brandId: ObjectId
  brandName: string
  brandLogo: string
  ctaUrl: string
  ctaText: string                // "Saber mais", "Comparar", etc.
  contexts: string[]             // onde aparece: 'home_feed', 'tool_result', 'learning_path'
  rotationGroup: string          // para nao repetir o mesmo facto
}
```

**Regras:**
- Facto tem de ser verificavel e verdadeiro
- Maximo 1 por sessao
- Rotacao: user nao ve o mesmo facto 2x em 7 dias
- Admin aprova facto + fonte antes de ir ao ar

---

### 1.2 - Tool Data Sponsorship (dados reais fornecidos pela marca)

**Conceito:** A marca nao poe o logo ao lado da ferramenta. A marca MELHORA a ferramenta fornecendo dados que nao teriamos de outra forma.

**Exemplos:**
- **Comparador de brokers**: "Comissoes atualizadas a [data] fornecidas diretamente por [Broker]" - o broker fornece os proprios dados de comissoes. Precisao maxima, user confia mais, broker garante que os dados estao corretos.
- **Comparador de PPR**: "Rentabilidades fornecidas por [Gestora]" - a gestora envia dados atualizados. Melhor dados, melhor ferramenta, marca presente.
- **Calculadora de impostos**: "Regras fiscais validadas por [Consultora]" - consultora fiscal valida a logica. User confia mais, consultora ganha credibilidade.

**Implementacao:**
```typescript
interface DataSponsor {
  toolId: string                 // 'ppr_comparator', 'broker_comparator', 'tax_simulator'
  brandId: ObjectId
  dataType: string               // 'commission_rates', 'returns', 'tax_rules'
  lastUpdated: Date
  verifiedBy?: string            // nome de quem verificou
  displayText: string            // "Dados fornecidos por [X]"
  displayPosition: 'header' | 'footer' | 'data_source_badge'
  agreement: {
    startDate: Date
    endDate: Date
    updateFrequency: 'daily' | 'weekly' | 'monthly'
    revenue: number              // EUR/mes pelo sponsorship
  }
}
```

**Porque e inovador:** A marca paga para MELHORAR a ferramenta, nao para interromper. O incentivo esta alinhado: marca quer dados corretos, user quer dados corretos, plataforma quer ferramenta melhor.

---

### 1.3 - Decision Moment Ads (anuncios no momento de decisao)

**Conceito:** Nao mostrar ads aleatorios. Mostrar no UNICO momento em que o user quer: quando acabou de tomar uma decisao e precisa de agir.

**Exemplos:**

```
Momento: User fez analise de AAPL e o FinHub Score e 85/100
→ "Queres investir em AAPL? Compara os brokers disponiveis em Portugal"
→ [DEGIRO] [XTB] [Trading 212] (com comissoes reais)

Momento: User simulou FIRE e precisa de 800/mes em ETFs
→ "Para investir 800/mes em ETFs, estes brokers oferecem planos automaticos"
→ [Broker com plano automatico]

Momento: User calculou impostos e vai pagar 2800 de mais-valias
→ "Um PPR poderia reduzir o teu IRS em ate 400. Compara opcoes."
→ [Link para comparador PPR]

Momento: User viu que o seu fundo de emergencia so cobre 2 meses
→ "Contas poupanca com melhor taxa neste momento"
→ [Directorio de bancos filtrado]
```

**Porque e inovador:** O ad resolve um problema que o user acabou de descobrir. Nao interrompe - completa. O CTR sera 10-50x superior a um banner generico porque o contexto e perfeito.

**Implementacao:**
```typescript
interface DecisionMomentTrigger {
  trigger: string                // enum controlado
  condition: Record<string, any> // condicao para trigger
  adPool: string[]               // campanhas elegiveis
  displayFormat: 'inline_suggestion' | 'action_card' | 'comparison_strip'
  cooldown: number               // segundos antes de mostrar novamente
}

// Triggers definidos:
type TriggerEvent =
  | 'stock_analysis_complete'    // score alto → broker CTA
  | 'fire_simulation_complete'   // gap calculado → ETF broker CTA
  | 'tax_simulation_complete'    // imposto alto → PPR CTA
  | 'budget_surplus_calculated'  // surplus → investimento CTA
  | 'emergency_fund_gap'        // gap → conta poupanca CTA
  | 'net_worth_milestone'       // milestone → celebracao patrocinada
  | 'dividend_calendar_view'    // dividendos → broker com DRIP CTA
  | 'ppr_comparison_view'       // comparacao → PPR CTA
  | 'watchlist_add'             // interesse → broker CTA
```

**Regras:**
- Maximo 1 decision moment ad por sessao de ferramenta
- Sempre com label "Sugestao patrocinada"
- User pode fechar e dar feedback ("nao relevante")
- Se user diz "nao relevante" 3x no mesmo trigger, desativar para esse user

---

### 1.4 - Personalized Impact Ads (simulacao personalizada como anuncio)

**Conceito:** O anuncio nao diz "Abra conta no Broker X". O anuncio diz "Com o teu portfolio atual, se usasses o Broker X pouparias 127 EUR/ano em comissoes."

**Exemplo real:**
```
+---------------------------------------------------------------+
|  📊 Analise personalizada de comissoes                         |
|                                                                |
|  Baseado nos teus 15 trades/mes em acoes US:                   |
|                                                                |
|  Broker atual (estimativa):  ~180 EUR/ano em comissoes         |
|  Com DEGIRO:                 ~53 EUR/ano                       |
|  Com XTB:                    ~0 EUR/ano (acoes sem comissao)   |
|  Com Interactive Brokers:    ~72 EUR/ano                       |
|                                                                |
|  ⚠️ Estimativa baseada nas tuas ferramentas. Valores reais     |
|  podem variar. O FinHub recebe comissao de afiliado.           |
|                                         [Ver comparacao completa] |
+---------------------------------------------------------------+
```

**Porque e revolucionario:** Nenhuma plataforma financeira faz isto. O anuncio e uma analise personalizada. O user QUER ver porque lhe poupa dinheiro. A marca quer porque a conversao e altissima (o user ja viu o beneficio numerico). A plataforma cobra premium por este formato.

**Dados necessarios:**
- Do perfil P7.1: brokers usados, frequencia de trading
- Do portfolio (se existir): tipos de ativos, numero de posicoes
- Da marca: tabela de comissoes (fornecida pelo data sponsorship P1.2)

**Privacidade:**
- Calculo feito no servidor, dados nao partilhados com a marca
- Marca so recebe: "impressao servida" e "click sim/nao"
- User ve disclaimer: "Calculado com os teus dados. Nada e partilhado com o anunciante."

---

### 1.5 - Milestone Sponsorship (celebracao patrocinada)

**Conceito:** Quando o user atinge um marco importante, uma marca patrocina a celebracao. Associacao positiva pura.

**Exemplos:**
```
"Parabens! Atingiste 10.000 EUR em portfolio! 🎉"
"Este marco e celebrado com o apoio de [Marca]"
[Badge especial desbloqueado]

"Parabens! Completaste o Learning Path 'ETFs do Zero'! 🎓"
"Patrocinado por DEGIRO - Abre a tua primeira conta"
[Badge + CTA discreto]

"1 ano de investimento consistente! 🔥"
"Streak patrocinada por [Marca]"
```

**Porque funciona:** Momento emocional positivo. A marca fica associada a conquista, nao a interrupcao. User sente-se bem, nao incomodado.

**Implementacao:**
```typescript
interface MilestoneSponsor {
  milestoneType: string          // 'portfolio_10k', 'learning_complete', 'streak_365', 'first_investment', etc.
  brandId: ObjectId
  congratsMessage: string        // mensagem de parabens customizada
  brandMessage: string           // ex: "Celebrado com o apoio de [X]"
  reward?: {
    type: 'badge_variant' | 'premium_days' | 'feature_unlock'
    value: any
  }
  ctaUrl?: string
  ctaText?: string
  revenue: number                // EUR por milestone servido
}
```

**Regras:**
- Maximo 1 sponsor por milestone
- O milestone acontece de qualquer forma (com ou sem sponsor)
- Sponsor so adiciona branding, nao altera o milestone
- User nunca perde um milestone por falta de sponsor

---

## 2) SPONSORED TOOLS & EXPERIENCES

### 2.1 - Ferramentas Patrocinadas (nao branded, melhoradas)

**Conceito:** Uma marca paga para que uma ferramenta tenha mais features, nao para por o logo em cima.

**Exemplo:**
```
Calculadora de Juros Compostos (versao base):
- Capital, contribuicao, taxa, anos → resultado

Calculadora de Juros Compostos (patrocinada por [Banco]):
- Tudo acima +
- Comparacao com taxa real do [Banco] (dados fornecidos)
- Simulacao com PPR do [Banco] vs deposito a prazo
- Selo: "Dados e simulacao adicional fornecidos por [Banco]"
```

**Porque funciona:** A ferramenta fica MELHOR, nao pior. O user beneficia. A marca mostra o seu produto em contexto real. A plataforma cobra pela integracao.

**Implementacao:**
```typescript
interface ToolSponsorship {
  toolId: string
  brandId: ObjectId
  enhancements: {
    type: 'extra_comparison' | 'real_rates' | 'additional_scenario' | 'pdf_export'
    config: Record<string, any>
  }[]
  displayBadge: string           // "Experiencia melhorada por [X]"
  agreement: {
    startDate: Date
    endDate: Date
    monthlyFee: number
    exclusivity: boolean         // se sim, nenhum concorrente nesta tool
  }
}
```

---

### 2.2 - Learning Paths Patrocinados

**Conceito:** Uma marca patrocina um percurso educativo completo. O user aprende de graca (ou com bonus), a marca educa potenciais clientes.

**Exemplo:**
```
Learning Path: "ETFs do Zero ao Portfolio"
Patrocinado por DEGIRO

Modulo 1: O que e um ETF? (conteudo FinHub)
Modulo 2: Tipos de ETFs (conteudo FinHub + criador parceiro)
Modulo 3: Como escolher um ETF (ferramenta de screening)
Modulo 4: Abrir conta e comprar (tutorial generico + "com DEGIRO" opcional)
Modulo 5: Acompanhar e rebalancear (watchlist + alertas)

Recompensa por completar: 7 dias Premium gratis
Badge: "ETF Specialist" (patrocinado por DEGIRO)
```

**Porque funciona:**
- User: aprende de graca, ganha premium, ganha badge
- Marca: educa 100% do funnel, converte no modulo 4 naturalmente
- Plataforma: engagement altissimo, revenue do patrocinio, retencao pelo premium trial

**Pricing sugerido:** 500-2000 EUR/mes por learning path exclusivo, dependendo do volume de completions.

---

### 2.3 - Sponsored Challenges (desafios comunitarios patrocinados)

**Conceito:** Desafios temporarios com a marca. Nao e concurso de dinheiro - e desafio de habito.

**Exemplos:**
```
"Desafio Poupanca de Janeiro" patrocinado por [Banco]
- Meta: registar despesas durante 30 dias no Budget Planner
- Recompensa: badge "Financeiramente Consciente" + 14 dias premium
- Marca: visibilidade + leads (quem completa e um lead qualificado)

"Desafio FIRE 90 dias" patrocinado por [Broker]
- Meta: definir portfolio FIRE + contribuir 3 meses seguidos
- Recompensa: badge "FIRE Starter" + acesso a ferramenta premium
- Marca: o user precisa de broker para contribuir

"Desafio Literacia Cripto" patrocinado por [Exchange]
- Meta: completar 5 modulos + quiz com 80%+
- Recompensa: badge + feature unlock
- Marca: users educados = melhores clientes cripto
```

---

## 3) TRANSPARENT REVENUE (confianca como vantagem competitiva)

### 3.1 - Affiliate Transparency Total

**Conceito:** Mostrar ao user EXATAMENTE quanto a plataforma ganha quando ele clica num link de afiliado. Nenhuma plataforma financeira faz isto.

**Exemplo:**
```
+---------------------------------------------------------------+
|  DEGIRO - Abrir conta                              [Abrir →]  |
|  ⭐ 4.2/5 (347 avaliacoes na comunidade)                       |
|                                                                |
|  ℹ️ Se abrires conta por este link, o FinHub recebe ~25 EUR    |
|  de comissao. Isto ajuda-nos a manter as ferramentas gratis.   |
|  O preco para ti e exatamente o mesmo.                         |
+---------------------------------------------------------------+
```

**Porque e revolucionario:**
- Gera confianca massiva. O user sente que nao esta a ser enganado.
- Aumenta conversao: estudos mostram que transparencia aumenta willingness to click
- Diferenciador vs toda a concorrencia que esconde comissoes
- Proteção legal: antecipa regulacao futura de transparencia

**Implementacao:**
```typescript
// Extensao do AffiliateLink (AUDITORIA_05 P10.2)
estimatedCommission: {
  amount: number                 // EUR estimado
  type: string                   // "por conta aberta", "por deposito", "percentagem"
  displayText: string            // texto formatado para o user
}
transparencyEnabled: boolean     // default true, admin pode desativar por link
```

---

### 3.2 - Revenue Report Publico (trimestral)

**Conceito:** Publicar um report trimestral simplificado de como a plataforma ganha dinheiro. Transparencia total.

**Exemplo:**
```
FinHub - Como nos financiamos (Q1 2026)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subscricoes Premium:      45% da receita
Afiliados (brokers):      25% da receita
Patrocinios de marcas:    20% da receita
Publicidade contextual:   10% da receita

Total de anunciantes ativos: 12
Marcas com dados verificados: 8
Learning paths patrocinados: 3
Ferramentas melhoradas por marcas: 4

O que NAO fazemos:
❌ Nao vendemos dados pessoais
❌ Nao fazemos trading com base em dados de users
❌ Nao damos aconselhamento financeiro
❌ Nao priorizamos marcas que pagam mais nos rankings
```

**Porque funciona:**
- Diferenciador unico no mercado PT e possivelmente europeu
- Constroi comunidade de users que QUEREM apoiar a plataforma
- Antecipa escrutinio regulatorio
- Marketing gratuito (o report e partilhavel e gera PR)

---

### 3.3 - Community-Curated Rankings (rankings comunitarios, nao pagos)

**Conceito:** Os rankings de marcas/brokers no directorio sao determinados pela COMUNIDADE (ratings, reviews), nao por quem paga mais. Marcas que pagam nao sobem no ranking - ganham visibilidade em slots separados.

**Regra estrita:**
```
Ranking organico (por rating comunitario):
  1. XTB - 4.5/5 (523 reviews)
  2. DEGIRO - 4.2/5 (347 reviews)
  3. Trading 212 - 4.1/5 (289 reviews)
  4. Interactive Brokers - 4.0/5 (198 reviews)

Slot patrocinado (separado, abaixo ou ao lado):
  "Destaque: [Marca que paga] - Abre conta com 0 comissoes"
  (com label "Patrocinado")
```

**Nunca:**
- Marca que paga sobe no ranking organico
- Reviews negativas sao escondidas porque marca paga
- Marca que nao paga e penalizada no ranking

**Porque funciona:**
- Users confiam nos rankings porque sabem que nao sao comprados
- Marcas QUEREM bom rating porque afeta ranking REAL
- Incentiva marcas a melhorar servico (nao so a pagar mais)
- Modelo sustentavel: marcas pagam por visibilidade adicional, nao por manipulacao

---

## 4) MODELOS DE REVENUE INOVADORES

### 4.1 - "Paga com Atencao" (Premium por Engagement)

**Conceito:** Users que nao podem/querem pagar premium podem "pagar" completando acoes de valor para a plataforma e sponsors.

**Como funciona:**
```
Formas de ganhar Premium Days:
  - Completar um Learning Path patrocinado:        7 dias
  - Convidar amigo que se ativa (referral):         30 dias
  - Completar onboarding completo:                  3 dias
  - Deixar 5 reviews verificadas no directorio:     7 dias
  - Completar desafio mensal patrocinado:            14 dias
  - Responder survey de marca (max 5 perguntas):    1 dia
```

**Porque e inovador:**
- Alternativa etica a paywall duro
- Marca paga pelo engagement do user, user recebe premium, plataforma recebe de ambos
- User nunca se sente excluido por falta de dinheiro (alinhado com literacia financeira)
- Gera dados valiosos (surveys, reviews) que melhoram a plataforma

**Implementacao:**
```typescript
interface EarnPremiumAction {
  actionType: string             // enum das acoes acima
  premiumDaysReward: number
  sponsorId?: ObjectId           // marca que paga pelo engagement
  maxPerUser: number             // quantas vezes o user pode fazer isto
  maxPerPeriod: string           // 'once' | 'monthly' | 'quarterly'
  isActive: boolean
  requirements: Record<string, any>  // requisitos especificos
}

interface EarnPremiumLog {
  userId: ObjectId
  actionType: string
  premiumDaysGranted: number
  sponsorId?: ObjectId
  completedAt: Date
}
```

---

### 4.2 - Micro-Sponsorship Marketplace (mercado de patrocinios acessivel)

**Conceito:** Em vez de so grandes marcas pagarem campanhas de milhares de euros, permitir que qualquer entidade do directorio compre micro-sponsorships a partir de 50 EUR.

**Produtos disponiveis:**

| Produto | Preco sugerido | Duracao | O que inclui |
|---------|---------------|---------|--------------|
| Directory Highlight | 50 EUR | 7 dias | Badge "Destaque" no card + posicao preferencial na listagem |
| Insight Sponsorship | 100 EUR | 30 dias | 1 facto patrocinado na rotacao (1000-5000 impressoes) |
| Tool Footer Badge | 200 EUR | 30 dias | "Dados verificados por [X]" no footer de 1 ferramenta |
| Learning Path Patch | 300 EUR | 90 dias | Logo num modulo de learning path relevante |
| Comparison Feature | 150 EUR | 30 dias | Dados de comissoes/taxas atualizados pela marca no comparador |
| Community Challenge | 500 EUR | 30 dias | Desafio patrocinado com branding |
| Decision Moment | 250 EUR | 30 dias | Presenca no decision moment de 1 ferramenta |

**Porque e inovador:**
- Democratiza a publicidade: consultores financeiros, pequenas gestoras, fintechs locais podem participar
- Self-serve: marca compra e configura sozinha (como Meta Ads mas para fintech)
- Ticket medio baixo mas volume alto
- Nenhuma plataforma financeira PT oferece isto

**Implementacao: extensao do AdCampaign (AUDITORIA_05 P10.1)**

```typescript
// Adicionar ao AdCampaign:
tier: 'micro' | 'standard' | 'premium' | 'enterprise'
// micro: self-serve, ate 500 EUR, aprovacao automatica se conteudo safe
// standard: self-serve, 500-5000 EUR, aprovacao manual
// premium: gestao assistida, 5000+ EUR
// enterprise: custom, contacto directo
```

---

### 4.3 - Data Insights as a Service (B2B Revenue)

**Conceito:** Vender dados agregados e ANONIMIZADOS a institucoes. Nao dados pessoais - tendencias e insights de mercado.

**Produtos:**

```
1. "Sentiment Report" mensal:
   - Quais ativos estao a ser mais pesquisados/analisados pelos users
   - Tendencias de interesse: ETFs vs Crypto vs Acoes (sem dados pessoais)
   - Engagement com ferramentas (quais ferramentas crescem)
   - Publico: investidores institucionais, media financeira

2. "Retail Investor Pulse":
   - Distribuicao anonima de risk profiles
   - Goals mais comuns (FIRE, passive income, etc.)
   - Brokers mais usados (agregado)
   - Publico: brokers que querem entender o mercado PT

3. "Content Intelligence":
   - Quais topicos de conteudo financeiro tem mais engagement
   - Formatos preferidos (video vs artigo vs curso)
   - Publico: criadores de conteudo, media financeira
```

**Regras estritas:**
- Nunca dados individuais, sempre agregados (minimo N=100)
- RGPD compliance total (anonimizacao k-anonymity)
- User pode opt-out da contribuicao para dados agregados
- Transparencia: report publico menciona que vendemos insights agregados

**Pricing sugerido:** 500-2000 EUR/mes por subscricao de report.

---

### 4.4 - White-Label Tools (licenciamento B2B)

**Conceito:** Licenciar as ferramentas do FinHub (calculadoras, simuladores, comparadores) a bancos, consultores e media financeira para embed nos seus sites.

**Exemplo:**
```
Banco X quer ter uma calculadora de juros compostos no site:
  Opcao 1: Desenvolver do zero (5000-20000 EUR + manutencao)
  Opcao 2: Licenciar do FinHub (200 EUR/mes, embed pronto)

O embed inclui:
  - Widget responsivo com branding do banco
  - "Powered by FinHub" discreto (backlink + SEO)
  - Dados atualizados automaticamente
  - Customizacao de cores e logo
```

**Produtos licenciaveis:**
- Calculadora de juros compostos
- Simulador FIRE
- Comparador de PPR
- Calculadora de dividendos
- Simulador de impostos
- Widget de analise de acao (FinHub Score)

**Implementacao:**
```typescript
interface WhiteLabelLicense {
  clientId: ObjectId             // ref: DirectoryEntry ou novo modelo
  tools: string[]                // quais ferramentas licenciadas
  branding: {
    logo: string
    primaryColor: string
    companyName: string
  }
  embedDomains: string[]         // dominios autorizados para embed
  apiKey: string                 // para autenticar chamadas
  plan: 'basic' | 'pro' | 'enterprise'
  monthlyFee: number
  isActive: boolean
}
```

**Endpoint:**
```
GET /api/embed/:apiKey/:toolId → retorna widget HTML/JS auto-contido
```

---

### 4.5 - Creator Sponsorship Marketplace

**Conceito:** Plataforma intermediaria entre marcas e criadores. A marca quer patrocinar conteudo. O criador quer ser patrocinado. O FinHub facilita e fica com fee.

**Como funciona:**
```
Marca publica oportunidade:
  "Procuramos criador para fazer review do nosso ETF"
  Budget: 500 EUR
  Requisitos: min 1000 seguidores, experiencia em ETFs

Criadores aplicam-se.
Marca escolhe.
Conteudo publicado com label "Patrocinado por [X]".
FinHub retém 15% de fee da transacao.
```

**Implementacao:**
```typescript
interface SponsorshipOpportunity {
  brandId: ObjectId
  title: string
  description: string
  budget: number                 // EUR
  contentType: 'article' | 'video' | 'course' | 'review'
  requirements: {
    minFollowers: number
    categories?: string[]
    minRating?: number
  }
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  applications: {
    creatorId: ObjectId
    message: string
    appliedAt: Date
    status: 'pending' | 'accepted' | 'rejected'
  }[]
  assignedCreator?: ObjectId
  platformFee: number            // % (default 15%)
  createdAt: Date
}
```

**Porque e inovador:** YouTube tem AdSense. Instagram tem sponsorships directos. Nenhuma plataforma financeira tem marketplace de sponsorships para criadores de conteudo financeiro.

---

## 5) ANTI-PREDATORY RULES (regras anti-predatorias)

### 5.1 - O que NUNCA fazemos

```
❌ Popups ou interstitials (ja definido na diretriz 7.1)
❌ Countdown timers falsos ("Oferta expira em 5 minutos!")
❌ Dark patterns de subscricao (ex: botao de cancel escondido)
❌ Upsell no meio de operacoes criticas (ex: durante analise de acao)
❌ Anuncios de trading agressivo ("Ganha 500% com crypto!")
❌ Anuncios de credito predatorio ou emprestimos de alto risco
❌ Ads que se parecem com resultados de analise (sem label claro)
❌ Retargeting agressivo (perseguir user com ads fora da plataforma)
❌ Venda de email lists a terceiros
❌ Notificacoes push de anuncios (push so para alertas reais do user)
❌ Esconder o preco do premium ate ao checkout
❌ Free trial que cobra automaticamente sem aviso claro
❌ Mostrar ads quando user esta em stress financeiro (ex: portfolio em queda forte)
```

### 5.2 - Limites de Fadiga Publicitaria

```typescript
interface AdFatigueConfig {
  // Por sessao
  maxAdsPerSession: {
    free: 4,
    premium: 1         // so value_ads e house_ads
  }

  // Por tipo
  maxPerType: {
    external_ads: { free: 2, premium: 0 },
    sponsored_ads: { free: 2, premium: 1 },
    house_ads: { free: 1, premium: 1 },
    value_ads: { free: 2, premium: 1 }
  }

  // Cooldown entre ads
  minSecondsBetweenAds: 120      // 2 minutos minimo entre ads

  // Frequencia por anuncio unico
  maxSameAdPerWeek: 3            // user nao ve o mesmo ad mais de 3x/semana

  // Contexto
  noAdsInPages: [
    'settings',
    'privacy',
    'terms',
    'password_reset',
    'delete_account',
    'subscription_cancel'       // nunca ads durante cancelamento
  ]

  // Emocional
  noAdsWhenPortfolioDown: true   // se portfolio caiu >5% no dia, sem ads
}
```

### 5.3 - User Ad Preferences (controlo do user)

**Conceito:** O user controla que tipo de publicidade ve. Poder = confianca.

```
Rota: /settings/ad-preferences

Opcoes:
  ☑ Insights educativos patrocinados (value_ads)
  ☑ Sugestoes contextuais pos-analise (decision moment)
  ☑ Destaques de marcas no directorio (sponsored)
  ☐ Publicidade externa (external_ads) ← so free users
  ☑ Celebracoes de marcos patrocinadas (milestone)

  [Interesse em categorias:]
  ☑ Brokers e corretoras
  ☑ PPR e reforma
  ☐ Seguros
  ☑ Ferramentas financeiras
  ☐ Cripto exchanges
  ☑ Conteudo educativo

  [Feedback geral:]
  "Vejo demasiada publicidade" → reduz 50% por 30 dias
  "A publicidade nao e relevante" → reset de targeting
```

**Implementacao:**
```typescript
// Extensao de UserPreferences.ts
adPreferences: {
  categories: {
    value_ads: boolean           // default true
    decision_moment: boolean     // default true
    directory_highlights: boolean // default true
    external_ads: boolean        // default true (so free)
    milestone_sponsors: boolean  // default true
  }
  interests: string[]            // categorias de interesse
  reducedFrequency: boolean      // user pediu menos ads
  reducedUntil?: Date
}
```

---

## 6) MAPA DE SLOTS POR SUPERFICIE

### 6.1 - Inventario de slots

```
Home/Feed:
  [S1] Banner lateral direito (desktop only) - external_ads / sponsored
  [S2] Card nativo no feed (a cada 8 items) - sponsored / value_ads
  [S3] Insight banner (topo, 1x por sessao) - value_ads

Ferramentas (stock analysis, FIRE, calculadoras):
  [S4] Footer da ferramenta - data sponsorship badge
  [S5] Decision moment (pos-resultado) - value_ads
  [S6] Comparacao contextual (se aplicavel) - sponsored

Directorio/Marcas:
  [S7] Highlight card (topo da listagem, max 2) - sponsored
  [S8] Badge "Destaque" no card da marca - sponsored
  [S9] Comparison page CTA - affiliate

Conteudo (artigos, videos, cursos):
  [S10] Inline entre paragrafos (a cada 800 palavras) - external_ads (free only)
  [S11] Footer do artigo - sponsored / affiliate
  [S12] "Conteudo relacionado patrocinado" (1 card) - sponsored

Learning Paths:
  [S13] Header do path - learning path sponsor badge
  [S14] Completion reward - milestone sponsor

Comunidade:
  [S15] Sidebar de topico (desktop) - sponsored
  [S16] Entre posts (a cada 10) - sponsored / value_ads

Dashboard:
  [S17] Card de milestone (quando acontece) - milestone sponsor
  [S18] Tip/insight diario - value_ads
  [S19] House ad para upgrade (se free) - house_ads
```

### 6.2 - Regras por plano

```
Free:
  - Todos os slots ativos
  - Maximo 4 ads por sessao
  - External_ads nos slots S1, S2, S10
  - Respeitando fadiga e cooldown

Premium:
  - S1, S2, S10 VAZIOS (sem external_ads)
  - Slots de value_ads mantidos (S3, S5, S18) com frequencia reduzida
  - Slots de sponsored mantidos em S7, S8 (directorio) - relevancia do directorio
  - S19 removido (ja e premium)
  - Maximo 1 ad por sessao
```

### 6.3 - Modelo tecnico

```typescript
interface AdSlot {
  slotId: string                 // 'S1', 'S2', etc.
  surface: string                // 'home', 'tools', 'directory', 'content', 'learning', 'community', 'dashboard'
  position: string               // 'sidebar', 'inline', 'footer', 'banner', 'card'
  allowedTypes: string[]         // ['external_ads', 'sponsored', 'value_ads', 'house_ads']
  visibleTo: string[]            // ['free', 'premium', 'all']
  maxPerSession: number
  minContentBefore: number       // minimo de conteudo real antes deste slot (ex: 800 palavras)
  device: 'all' | 'desktop' | 'mobile'
  isActive: boolean
}
```

**Modelo: `AdSlotConfig` (admin)**

```typescript
interface IAdSlotConfig extends Document {
  slotId: string
  surface: string
  position: string
  allowedTypes: string[]
  visibleTo: string[]
  maxPerSession: number
  minContentBefore: number
  device: string
  isActive: boolean
  priority: number               // ordem de fill (slots prioritarios preenchidos primeiro)
  fallbackType?: string          // se nenhuma campanha, mostrar house_ad ou nada
  createdAt: Date
  updatedAt: Date
}
```

---

## 7) DASHBOARDS (3 perspetivas)

### 7.1 - Admin Ad Dashboard

```
Rota (backoffice): /dashboard/ads

Componentes:
  Revenue Overview:
    - Cards: Revenue Total | Revenue Hoje | eCPM medio | Fill Rate
    - Line chart: revenue por dia (ultimos 30 dias)
    - Stacked bar: revenue por tipo (external, sponsored, value, affiliate)

  Inventory Map:
    - Tabela visual: todos os slots, quais estao filled vs vazios
    - Fill rate por slot
    - Top performing slots (CTR)

  Campaign Queue:
    - Pendentes de aprovacao
    - Ativas (com performance)
    - Completadas (com report final)

  Compliance:
    - Ads rejeitados e motivo
    - User complaints sobre ads
    - Fadiga report: users que pediram menos ads
```

### 7.2 - Brand Ad Dashboard (portal marca)

```
Rota: /brand-portal/campaigns

Componentes:
  My Campaigns:
    - Lista de campanhas com status
    - Por campanha: impressoes, clicks, CTR, conversoes, gasto
    - Chart: performance por dia

  Create Campaign (wizard):
    Step 1: Tipo (micro-sponsorship menu com precos)
    Step 2: Conteudo (texto, imagem, CTA)
    Step 3: Targeting (contexto, interesses)
    Step 4: Budget e duracao
    Step 5: Preview + Submit

  Insights:
    - "As tuas campanhas vs media da plataforma"
    - "Melhor slot para o teu sector"
    - "Sugestoes de melhoria"

  Billing:
    - Historico de faturas
    - Saldo atual
    - Metodo de pagamento
```

### 7.3 - Creator Sponsorship Dashboard

```
Rota: /dashboard/sponsorships

Componentes:
  Oportunidades abertas:
    - Lista de SponsorshipOpportunity com filtros
    - Botao "Candidatar-me"

  Meus patrocinios:
    - Ativos, em progresso, concluidos
    - Revenue gerado

  Metricas de patrocinio:
    - Performance do conteudo patrocinado vs organico
    - Revenue total de sponsorships
    - Marcas com que trabalhei
```

---

## 8) PROJECAO DE REVENUE (cenario conservador, 12 meses)

Pressupostos: 10K users activos, 2% conversao premium, 50 marcas no directorio.

| Fonte | Revenue Mensal Estimado | % do Total |
|-------|------------------------|------------|
| Subscricoes Premium (200 users x 7.99 EUR) | 1.598 EUR | 35% |
| Affiliates (clicks + conversoes) | 800 EUR | 18% |
| Micro-sponsorships (15 marcas x avg 150 EUR) | 2.250 EUR | 49% |
| Value ads (insight + decision moment) | 0 EUR (incluido em micro-sponsorships) | - |
| Tips para criadores (15% fee) | ~50 EUR | ~1% |
| White-label (fase 2) | 0 EUR | 0% |
| Data insights (fase 3) | 0 EUR | 0% |
| **Total** | **~4.700 EUR/mes** | |

Cenario a 24 meses (50K users, 3% conversao, 150 marcas):

| Fonte | Revenue Mensal | % |
|-------|---------------|---|
| Subscricoes (1500 x 7.99) | 11.985 EUR | 40% |
| Affiliates | 3.000 EUR | 10% |
| Sponsorships e ads | 8.000 EUR | 27% |
| White-label (10 clientes x 300) | 3.000 EUR | 10% |
| Data insights (5 clientes x 1000) | 5.000 EUR | 17% |
| Creator marketplace fee | 500 EUR | 2% |
| **Total** | **~31.500 EUR/mes** | |

---

## 9) IMPLEMENTACAO TECNICA - RESUMO

### Novos modelos necessarios (alem dos da AUDITORIA_05):

| Modelo | Descricao |
|--------|-----------|
| AdSlotConfig | Configuracao de slots por superficie |
| DataSponsor | Acordo de dados fornecidos por marca |
| ToolSponsorship | Acordo de patrocinio de ferramenta |
| MilestoneSponsor | Patrocinio de milestone |
| SponsorshipOpportunity | Marketplace criador-marca |
| EarnPremiumAction | Configuracao de acoes para ganhar premium |
| EarnPremiumLog | Log de premium ganho por engagement |
| WhiteLabelLicense | Licenca de embed de ferramentas |
| AdFatigueState | Estado de fadiga por user (Redis, nao Mongo) |
| RevenueReport | Report de revenue gerado (trimestral) |

### Extensoes a modelos existentes:

| Modelo | Campo |
|--------|-------|
| UserPreferences | adPreferences { categories, interests, reducedFrequency } |
| AffiliateLink (AUDITORIA_05) | estimatedCommission, transparencyEnabled |
| AdCampaign (AUDITORIA_05) | tier ('micro'|'standard'|'premium'|'enterprise') |

### Services novos:

| Service | Responsabilidade |
|---------|-----------------|
| adSlot.service.ts | Gestao de slots, fill logic, inventory |
| adFatigue.service.ts | Tracking de fadiga por user (Redis) |
| valueAd.service.ts | Logica de insight ads, decision moment, milestone |
| sponsorshipMarketplace.service.ts | CRUD de oportunidades, matching, fee |
| whiteLabel.service.ts | Gestao de licencas, embed generation, auth |
| earnPremium.service.ts | Tracking de acoes, grant de premium days |
| revenueReport.service.ts | Agregacao de revenue por fonte |

### Componentes frontend novos:

| Componente | Onde |
|------------|------|
| InsightAdCard | Feed, ferramentas (value_ad) |
| DecisionMomentSuggestion | Pos-resultado de ferramentas |
| DataSponsorBadge | Footer de ferramentas |
| Milestonecelebration | Dashboard (quando milestone) |
| AdPreferencesPanel | Settings |
| SponsorshipMarketplace | Dashboard criador |
| CampaignWizard | Portal marca |
| EarnPremiumPanel | Dashboard user |
| WhiteLabelEmbed | Standalone (embed externo) |
| AdSlotRenderer | Wrapper generico que renderiza o slot correto |

---

## 10) ORDEM DE IMPLEMENTACAO RECOMENDADA

### Onda 1 - Foundation (antes de lancamento)
1. AdSlotConfig + mapa de slots
2. AdFatigue + regras de cooldown
3. Affiliate transparency (extensao)
4. User ad preferences
5. Anti-predatory rules (hardcoded)

### Onda 2 - First Revenue (primeiros 30 dias)
6. Micro-sponsorship marketplace (self-serve)
7. Decision moment ads (3 triggers iniciais)
8. Directory highlights (sponsored)
9. Earn premium by engagement (3 acoes iniciais)

### Onda 3 - Value Ads (30-90 dias)
10. Insight sponsorship
11. Data sponsorship (1-2 ferramentas)
12. Tool sponsorship
13. Milestone sponsorship
14. Learning path sponsorship

### Onda 4 - Scale (90-180 dias)
15. Creator sponsorship marketplace
16. White-label tools
17. Revenue report publico
18. Brand analytics avancado

### Onda 5 - B2B (180+ dias)
19. Data insights as a service
20. Enterprise ad packages

---

## HISTORICO

- 2026-03-07: criacao da estrategia de revenue e ads
- Base: diretriz 7.1 da auditoria 04, P4.4-03, analise gap AUDITORIA_05
