# P5 — Comunidade: De one-to-many para many-to-many

## Visao

O FinHub tem uma camada social (follow, like, comment, rating). Mas e **one-to-many** — criadores publicam, seguidores consomem. Falta o **many-to-many** — utilizadores a interagir entre si, a trocar conhecimento, a ajudarem-se mutuamente.

O Reddit r/literaciafinanceira e o r/financaspessoais sao enormes em PT porque nao existe uma plataforma dedicada onde isto aconteca. O FinHub pode capturar esta comunidade e integra-la com as ferramentas, criadores e conteudo que ja tem.

---

## 1. Como cada ator ganha

| Ator | O que ganha |
|------|-----------|
| **Utilizador** | Respostas a duvidas, validacao de estrategia, pertenca a um grupo, motivacao para continuar |
| **Criador** | Visibilidade (responder a perguntas = autoridade), descoberta de novos seguidores, feedback direto da audiencia, ideias para conteudo |
| **Marca/Entidade** | Entender o que os utilizadores perguntam (market research), responder a duvidas sobre o seu produto, confianca (transparencia) |
| **Plataforma** | Retencao (razao para voltar), network effect (mais users = mais valor), conteudo gerado por utilizadores (SEO), reducao de dependencia de criadores |

---

## 2. O que construir

### 2.1 Discussions (threads tematicas)

Nao foruns classicos — threads modernas, tipo Reddit/Discord mas integradas na plataforma.

**Topicos sugeridos:**

| Topic | Descricao | Exemplo de thread |
|-------|-----------|------------------|
| `etfs-europeus` | Discussao sobre ETFs para investidores europeus | "VWCE vs IWDA vs SWRD — qual escolher?" |
| `fire-portugal` | Comunidade FIRE portuguesa | "Quanto precisam para FIRE em Lisboa?" |
| `acoes-dividendos` | Acoes de dividendos | "O cortou dividendo — o que fazer?" |
| `cripto` | Criptomoedas | "Bitcoin em 2026 — bull ou bear?" |
| `impostos` | Impostos sobre investimentos | "Como declarar mais-valias de cripto no IRS?" |
| `corretoras` | Experiencias com corretoras | "Mudei da Degiro para IBKR — review" |
| `reits` | REITs e imobiliario | "Realty Income vs STAG — qual preferem?" |
| `iniciantes` | Perguntas de quem esta a comecar | "Tenho €500 para investir pela primeira vez" |
| `portfolio-review` | Partilhar e receber feedback sobre carteira | "Roast my portfolio — 60% VWCE, 20% BTC, 20% O" |
| `geral` | Discussao livre sobre financas | "Quais sao os vossos objetivos para 2026?" |

**Model:**

```typescript
// src/models/Discussion.ts
interface IDiscussion {
  title: string                 // titulo da thread
  slug: string                  // URL-friendly
  content: string               // corpo (markdown)
  author: ObjectId              // quem criou
  topic: string                 // topico (enum)

  // Engagement
  upvotes: number
  downvotes: number
  votedBy: [{ user: ObjectId, vote: 'up' | 'down' }]
  commentsCount: number
  views: number

  // Status
  isPinned: boolean             // fixada pelo admin/moderador
  isLocked: boolean             // fechada para novos comments
  status: 'active' | 'hidden' | 'archived'

  // Moderacao (reutilizar padrao existente)
  moderationStatus: 'visible' | 'hidden' | 'restricted'
  moderationReason?: string
  moderatedBy?: ObjectId

  // Contexto (o que torna isto unico)
  linkedTickers?: string[]      // tickers mencionados → link para analise
  linkedTools?: string[]        // ferramentas referenciadas
  linkedContent?: ObjectId[]    // conteudo de criadores relacionado

  // Tags
  tags: string[]
  flair?: string                // badge tipo "Pergunta", "Analise", "Discussao", "Review"

  createdAt: Date
  updatedAt: Date
}
```

**Nota critica:** O sistema de comments universal ja existe (8 target types, threading depth 3, pins, likes, moderacao). Basta adicionar `'discussion'` como `CommentTargetType` e as discussions tem comments automaticamente — sem reimplementar nada.

**Endpoints:**
```
GET    /api/discussions                    — listar por topic, sort (hot/new/top)
GET    /api/discussions/:slug              — detalhe com comments
POST   /api/discussions                    — criar (auth required)
PATCH  /api/discussions/:id                — editar (author/admin)
DELETE /api/discussions/:id                — eliminar (author/admin)
POST   /api/discussions/:id/vote           — upvote/downvote
```

**Sorting:**
- **Hot:** score recente (upvotes - downvotes, com decay temporal)
- **New:** data de criacao
- **Top:** mais upvotes (periodo: dia/semana/mes/sempre)

---

### 2.2 Integracao com ferramentas

O que torna a comunidade do FinHub diferente do Reddit: **contexto integrado**.

Quando alguem menciona um ticker na discussao, a plataforma:
1. Auto-detecta o ticker (regex: `$AAPL`, `$VWCE.DE`)
2. Mostra inline card com preco atual, variacao 24h, FinHub Score
3. Link direto para analise completa
4. Se o leitor tem o ativo no portfolio, mostra badge "Tens este ativo"

```
Thread: "$O cortou dividendo 5% — o que fazer?"

┌─ Inline card ──────────────────────────┐
│ O (Realty Income)  $55.20  -2.3% 24h  │
│ FinHub Score: 68   Yield: 5.6%         │
│ [Analisar] [Adicionar ao portfolio]    │
│ 📌 Tens 200 acoes deste ativo          │
└────────────────────────────────────────┘

Resposta do @CriadorX (verificado):
"O corte de 5% e preocupante mas o payout ratio
ainda e 72%, dentro da media historica. Vejam a minha
analise completa: [link para artigo do criador]"
```

---

### 2.3 Roles e reputacao na comunidade

| Role | Quem | Pode fazer |
|------|------|-----------|
| **Utilizador** | Qualquer registado | Criar threads, comentar, votar |
| **Criador verificado** | Criadores da plataforma | Tudo acima + badge verificado, respostas destacadas |
| **Moderador comunitario** | Utilizadores de confianca (selecionados pelo admin) | Tudo acima + pin/lock threads, mover entre topics |
| **Admin** | Equipa | Tudo |

**Sistema de reputacao:**

```typescript
interface ICommunityReputation {
  user: ObjectId
  totalUpvotesReceived: number
  totalDownvotesReceived: number
  threadsCreated: number
  helpfulAnswers: number       // respostas marcadas como "util" pelo autor da thread
  reportedContent: number      // quantas vezes reportado (negativo)
  reputationScore: number      // calculado: upvotes - (downvotes × 2) + (helpful × 5)
  level: 'newcomer' | 'member' | 'contributor' | 'expert' | 'guru'
  badges: string[]             // "Melhor resposta ×10", "Thread da semana", etc.
}
```

**Thresholds:**
- newcomer: 0-10 rep
- member: 11-50 rep
- contributor: 51-200 rep
- expert: 201-500 rep
- guru: 500+ rep

Moderador comunitario: expert + nomeado pelo admin.

---

### 2.4 Q&A mode

Threads podem ser marcadas como "Pergunta" (flair). Nesse modo:
- O autor pode marcar UMA resposta como "Aceite" (tipo StackOverflow)
- Resposta aceite fica no topo
- Quem responde recebe rep bonus (+5 se aceite)
- Criadores que respondem ganham visibilidade ("@CriadorX respondeu a 47 perguntas")

---

### 2.5 Portfolio review

Topic especial onde utilizadores partilham a sua carteira (anonimizada ou nao) e pedem feedback.

**Template:**

```
Titulo: "Roast my portfolio"

Portfolio:
  VWCE: 60% (€15.000)
  O: 20% (€5.000)
  BTC: 10% (€2.500)
  Cash: 10% (€2.500)

Objetivo: FIRE em 15 anos
Contribuicao: €500/mes
Idade: 28

Perguntas:
  1. Demasiado concentrado em VWCE?
  2. BTC e muito ou pouco?
  3. Devo adicionar small caps?
```

**Integracao:** Se o utilizador tem portfolio no FIRE simulator, pode gerar esta partilha automaticamente (com opcao de anonimizar valores — mostrar so percentagens).

---

### 2.6 Moderacao (ja temos quase tudo)

O sistema de moderacao existente cobre:
- ✅ Auto-moderacao (spam, links suspeitos, flood)
- ✅ Content reports (8 categorias)
- ✅ Trust scoring para criadores
- ✅ Bulk moderation com audit trail
- ✅ Surface controls (feature flags)

**O que adicionar para comunidade:**
- Upvote/downvote abuse detection (mesmo user a votar sistematicamente)
- Rate limit de criacao de threads (max 3/dia por user)
- Auto-hide threads com score < -5
- Mod queue para threads reportadas

---

## 3. O que NAO construir

- **Chat privado / DMs** — complexidade de moderacao enorme, risco de scams, fora do scope
- **Grupos privados** — moderacao opaca, fragmentacao da comunidade
- **Forum classico** — sub-foruns hierarquicos sao confusos; topics flat e melhor
- **Real-time chat** — WebSocket heavy, moderacao impossivel; threads asincronas sao melhores

---

## 4. Roadmap

### Fase 1 — Discussions basicas

| # | Item | Esforco |
|---|------|---------|
| 1 | Model Discussion + CRUD + vote | Medio |
| 2 | Adicionar `'discussion'` ao CommentTargetType existente | Baixo |
| 3 | Pagina `/comunidade` com lista de topics | Medio |
| 4 | Pagina `/comunidade/:topic` com threads (hot/new/top) | Medio |
| 5 | Pagina `/comunidade/:topic/:slug` com thread + comments | Medio |
| 6 | Auto-detecao de tickers + inline cards | Medio |

### Fase 2 — Reputacao e qualidade

| # | Item | Esforco |
|---|------|---------|
| 7 | Sistema de reputacao + niveis | Medio |
| 8 | Q&A mode (resposta aceite) | Baixo |
| 9 | Portfolio review template + partilha anonimizada | Medio |
| 10 | Moderadores comunitarios (role + permissoes) | Baixo |
| 11 | Rate limits e abuse detection | Baixo |

### Fase 3 — Integracao profunda

| # | Item | Esforco |
|---|------|---------|
| 12 | "Trending discussions" no Markets Hub e homepage | Baixo |
| 13 | Criadores podem responder com badge verificado | Baixo |
| 14 | Marcas podem responder em threads sobre elas | Medio |
| 15 | Ligar discussions a learning paths e glossario | Baixo |
