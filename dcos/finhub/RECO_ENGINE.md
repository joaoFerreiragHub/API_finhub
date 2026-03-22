# FinHub — Sistema de Recomendação & "Para Ti"

> **Data:** 2026-03-22
> **Scope:** motor de recomendação + feed "Para Ti" + Reels + controlo do utilizador
> **Referência:** ARCHITECTURE.md (zona HUB, ponte de Educação Contextual)

---

## Estado Actual — O que já existe

A análise ao código revelou que **a fundação já está construída** — o trabalho é completar e ligar as peças:

| Componente | Estado | Localização |
|-----------|--------|-------------|
| `tags[]` em todo o conteúdo | ✅ Existe (`BaseContent`) | `src/models/BaseContent.ts` |
| `category` obrigatório (12 opções) | ✅ Existe | `BaseContent` |
| `duration` / `readingTime` | ✅ Existe (varia por tipo) | Cada modelo de conteúdo |
| `difficulty` | ⚠️ Só em Course (`level`) | `src/models/Course.ts` |
| `UserPreferences.tagAffinities` | ✅ Existe `{ tag, score, updatedAt }[]` | `src/models/UserPreferences.ts` |
| `interactionSignals` | ✅ Existe (follow, favorite, rating, comment, reply) | `UserPreferences` |
| Evento de `view` | ❌ Não existe | — |
| Sinal `not_interested` | ❌ Não existe | — |
| Taxonomia de tags fixas | ❌ Tags são strings livres | — |
| Auto-tagging | ❌ Não existe | — |
| API `/recommendations/for-you` | ❌ Não existe | — |
| Reset do algoritmo | ❌ Não existe | — |

---

## Taxonomia de Tags (obrigatória)

### Problema actual
`tags[]` aceita qualquer string → "etf", "ETF", "ETFs", "fundo de índice" são tratados como tags diferentes.
Sem vocabulário controlado não há base para calcular afinidades correctamente.

### Taxonomia proposta — Tópicos FinHub

```
MERCADOS & ACTIVOS
  etfs              — ETFs e fundos de índice
  acoes             — Acções / Stocks individuais
  cripto            — Criptomoedas e blockchain
  obrigacoes        — Obrigações e renda fixa
  commodities       — Matérias-primas (ouro, petróleo, etc.)
  imobiliario       — Imobiliário e REITs
  forex             — Câmbios e moedas
  fundos            — Fundos de investimento activos

ESTRATÉGIA & ANÁLISE
  analise-tecnica   — Análise técnica, gráficos, indicadores
  analise-fundamental — Análise fundamentalista de empresas
  dividendos        — Estratégias de dividendos
  value-investing   — Value investing, Benjamin Graham, Buffett
  index-investing   — Investimento passivo em índices
  portfolio         — Construção e gestão de portfolio

FINANÇAS PESSOAIS
  financas-pessoais — Orçamento, poupança, dívida
  fire              — FIRE, independência financeira, reforma antecipada
  impostos          — Fiscalidade, IRS, mais-valias
  seguros           — Seguros de vida, saúde, habitação
  pensao            — Planeamento de reforma, PPR
  credito           — Crédito, hipoteca, leasing

MACRO & CONTEXTO
  macroeconomia     — Economia global, inflação, taxas
  mercados-pt       — Mercados portugueses (PSI, empresas PT)
  mercados-us       — Mercados americanos (S&P 500, Nasdaq)
  mercados-eu       — Mercados europeus
  bancos-centrais   — FED, BCE, política monetária

APRENDER
  iniciante         — Conteúdo para quem começa
  avancado          — Conteúdo para investidores experientes
  tutorial          — Guias passo-a-passo
  caso-pratico      — Exemplos e casos reais
```

### Regras de tagging
- Mínimo **1 tag**, máximo **8 tags** por conteúdo (reduzir o actual máximo de 10)
- Tags devem vir **desta lista** — strings livres ainda aceites mas sinalizadas como "não normalizadas"
- Um conteúdo pode ter tags de múltiplas categorias (ex: artigo sobre "ETFs de dividendos em Portugal" → `etfs` + `dividendos` + `mercados-pt`)
- `category` (campo actual) **mantém-se** para classificação primária; `tags[]` são para granularidade

---

## Auto-Tagging — Smart Suggestions

### Estratégia por tipo de conteúdo

| Tipo | Fontes de análise | Método |
|------|-----------------|--------|
| Artigo | Título + descrição + primeiros 800 chars do corpo | Keyword matching + AI |
| Vídeo | Título + descrição | Keyword matching |
| Podcast | Título + descrição + episódio + nome da série | Keyword matching |
| Curso | Título + descrição + nomes das lições | Keyword matching |
| Livro | Título + descrição + `keyPhrases[]` (já existe) | Keyword matching |
| Reel | Título + descrição | Keyword matching |
| Live | Título + descrição + agenda | Keyword matching |

### Método 1 — Keyword Matching (implementação imediata)

Mapa de palavras-chave portuguesas → tags da taxonomia:

```typescript
const KEYWORD_MAP: Record<string, string[]> = {
  'etfs':                ['etfs'],
  'etf':                 ['etfs'],
  'fundo de índice':     ['etfs', 'index-investing'],
  'bitcoin':             ['cripto'],
  'ethereum':            ['cripto'],
  'criptomoeda':         ['cripto'],
  'blockchain':          ['cripto'],
  'ações':               ['acoes'],
  'acções':              ['acoes'],
  'bolsa':               ['acoes', 'mercados-pt'],
  'dividendo':           ['dividendos'],
  'imóvel':              ['imobiliario'],
  'imobiliário':         ['imobiliario'],
  'reit':                ['imobiliario'],
  'arrendamento':        ['imobiliario'],
  'fire':                ['fire'],
  'reforma antecipada':  ['fire'],
  'independência financeira': ['fire'],
  'orçamento':           ['financas-pessoais'],
  'poupança':            ['financas-pessoais'],
  'dívida':              ['financas-pessoais'],
  'irs':                 ['impostos'],
  'mais-valias':         ['impostos'],
  'fiscalidade':         ['impostos'],
  'obrigações':          ['obrigacoes'],
  'renda fixa':          ['obrigacoes'],
  'inflação':            ['macroeconomia'],
  'taxa de juro':        ['macroeconomia', 'bancos-centrais'],
  'fed':                 ['bancos-centrais', 'mercados-us'],
  'bce':                 ['bancos-centrais', 'mercados-eu'],
  's&p 500':             ['mercados-us', 'index-investing'],
  'nasdaq':              ['mercados-us'],
  'psi':                 ['mercados-pt'],
  'análise técnica':     ['analise-tecnica'],
  'suporte':             ['analise-tecnica'],
  'resistência':         ['analise-tecnica'],
  'buffett':             ['value-investing', 'analise-fundamental'],
  'value investing':     ['value-investing'],
  'iniciante':           ['iniciante'],
  'beginners':           ['iniciante'],
  'tutorial':            ['tutorial'],
  // ... expandir conforme necessário
}
```

Algoritmo:
1. Texto em lowercase → procurar keywords no mapa
2. Keyword em título → peso 3x; em descrição → 2x; no corpo → 1x
3. Ordenar por peso → sugerir top 5 tags

### Método 2 — AI-assisted (via Anthropic API, para artigos)

```
Prompt ao Claude:
"O seguinte artigo é sobre finanças pessoais em Portugal.
Sugere até 5 tags da lista [lista da taxonomia] que melhor descrevem o conteúdo.
Título: {title}
Descrição: {description}
Excerto: {content.slice(0, 800)}

Responde apenas com as tags, separadas por vírgulas."
```

- Chamado assincronamente após criação do artigo
- Resultado apresentado ao criador como "sugestões" (pode aceitar ou editar)
- Não bloqueia a publicação
- Não se aplica a vídeos/reels (sem conteúdo textual analisável)

---

## Motor de Recomendação — Arquitectura Completa

### Modelo de sinais (o que tracking)

```typescript
// Adicionar a interactionSignals no UserPreferences:
type SignalType =
  | 'view'           // utilizador viu o conteúdo (novo)
  | 'view_partial'   // viu mas saiu antes de 30% (novo)
  | 'view_complete'  // completou >80% (novo)
  | 'favorite'       // guardou nos favoritos ✅ já existe
  | 'not_interested' // "não me interessa" (novo)
  | 'hide_topic'     // "ver menos disto" (novo)
  | 'boost_topic'    // "ver mais disto" (novo)
  | 'share'          // partilhou externamente (novo)
  | 'comment'        // comentou ✅ já existe
  | 'rating'         // avaliou ✅ já existe
  | 'follow'         // seguiu o criador ✅ já existe

// Pesos dos sinais na afinidade:
const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  not_interested: -2.0,  // sinal negativo forte
  hide_topic:     -1.0,  // reduzir afinidade com tópico
  view_partial:   +0.2,  // viu mas não ficou
  view:           +0.5,  // viu uma parte razoável
  view_complete:  +1.0,  // completou — interesse confirmado
  follow:         +1.5,  // seguiu o criador — forte sinal
  favorite:       +1.5,  // guardou — forte sinal
  comment:        +1.2,
  rating:         +1.0,
  share:          +2.0,  // sinal mais forte
  boost_topic:    +1.0,
}
```

### Computação de afinidade

Para cada sinal recebido, actualizar `tagAffinities` do utilizador:

```typescript
// Lógica de actualização (incremental, com decay temporal):
function updateAffinity(current: number, signal: number, daysSince: number): number {
  const decayFactor = Math.exp(-daysSince / 30) // decay ao longo de 30 dias
  return current * decayFactor + signal
}
```

- Affinidades decaem ao longo do tempo (interesses mudam)
- Uma interacção recente vale mais do que uma antiga
- Cold start: usar interesses do onboarding com score inicial 1.0

### API de recomendação — novos endpoints

```
GET  /api/recommendations/for-you
     ?limit=10&offset=0&contentType=all|article|video|reel|course
     → conteúdo misto ordenado por score de relevância

POST /api/recommendations/not-interested
     { contentId, contentType, reason?: 'topic'|'creator'|'seen_before' }
     → regista sinal negativo + remove da feed

POST /api/recommendations/boost
     { tag }
     → aumenta afinidade com tópico

POST /api/recommendations/reduce
     { tag }
     → reduz afinidade com tópico

POST /api/recommendations/reset
     → apaga todos os sinais + tagAffinities do utilizador
     → mantém apenas as preferências do onboarding (fresh start)

GET  /api/recommendations/why/:contentId
     → explica porque este conteúdo foi sugerido
     → { reasons: ['Segues {creatorName}', 'Baseado no teu interesse em ETFs', ...] }
```

### Algoritmo de geração do feed

```
1. CANDIDATOS — gerar pool de conteúdo elegível:
   a. De criadores que o utilizador segue (boost)
   b. Conteúdo com tags que batem com tagAffinities do user (score > 0.5)
   c. Trending global (últimas 48h, muitas views)
   d. Novo de criadores seguidos (últimas 24h)
   e. Excluir: já visto (view_complete), marcado "não interessa", publicado > 30 dias (excepto cursos/livros)

2. SCORING — pontuar cada candidato:
   score = Σ (afinidade[tag] × tagPesoNoConteúdo)
         + boost_criador_seguido (× 1.3)
         + boost_conteudo_novo (× 1.2 se < 48h)
         + boost_trending (× 1.1 se trending)
         - penalidade_tipo_repetido (se últimos 3 foram do mesmo tipo)

3. DIVERSIDADE — injectar variedade:
   - Máximo 3 conteúdos do mesmo tópico em 10 resultados
   - Máximo 2 conteúdos do mesmo criador em 10 resultados
   - Pelo menos 1 conteúdo "surpresa" (tópico com afinidade baixa mas trending)

4. COLD START (novo utilizador / após reset):
   - Usar interesses do onboarding como proxy de afinidade (score 1.0)
   - Após 10 interacções → começar a personalizar
   - Após 30 interacções → feed totalmente personalizado
```

---

## Controlos do Utilizador (UX)

### Em cada card do feed "Para Ti"

```
[Card de conteúdo]  ···  (menu de contexto)
                    ├── Não me interessa
                    ├── Ver menos de {tópico}
                    ├── Ver menos de {criador}
                    └── Porque me estás a mostrar isto?
```

### Página de preferências do feed

Em `/conta/preferencias` (ou sidebar do "Para Ti"):
- Lista de tópicos com slider de interesse (1-5 estrelas)
- Botão "Reset ao algoritmo" → modal de confirmação:
  > "Isto vai apagar o teu histórico de preferências. O teu feed voltará ao início baseado nos teus interesses iniciais. Tens a certeza?"
- Toggle "Mostrar conteúdo em inglês" (para conteúdo de criadores internacionais)

### Transparência — "Porque te mostramos isto"

Tooltip ou modal com frases explicativas:
- "Segues {nome do criador}"
- "Baseado no teu interesse em ETFs"
- "Popular entre utilizadores com perfil semelhante"
- "Novo artigo num tópico que favoritas frequentemente"
- "Tendência nas últimas 48h"

---

## Reels — UX dedicada

### O que é
- Vídeos curtos (1–90 segundos, já validado no modelo `Reel`)
- Feed vertical de scroll infinito
- Auto-play ao entrar no viewport
- Som desligado por defeito (toggle manual)

### Rota dedicada
`/reels` — página própria, diferente de `/hub/videos`

### Feed de Reels
- Mesmo motor de recomendação do "Para Ti" mas filtrado por `contentType=reel`
- Scroll vertical (cada reel ocupa 100vh)
- Interacções inline: like (heart), comentar, partilhar, seguir criador
- "Não me interessa" → swipe left ou botão longo

### Diferença para o "Para Ti" geral
| | Para Ti | Reels |
|--|---------|-------|
| Tipos | Todos (artigos, vídeos, cursos, podcasts...) | Só vídeos curtos (reels) |
| Layout | Grid / lista de cards | Scroll vertical full-screen |
| Interacção | Click para abrir | Inline, sem sair da página |
| Duração | Variável | 1–90 segundos |

---

## Plano de Implementação (Prompts)

Implementação dividida em **5 prompts** — este sistema não pode ser feito num só.

### R1-TAXONOMY — Taxonomia e campos de conteúdo
**Executor:** Codex | **Pré-requisito:** P9-GATE ✅

- Adicionar campo `difficulty: 'beginner' | 'intermediate' | 'advanced' | null` a `BaseContent`
- Definir lista de tags permitidas (taxonomia acima) como constante partilhada (`src/constants/tags.ts`)
- Migração: para conteúdo existente sem tags → aplicar auto-tagging (keyword matching) como dados iniciais
- Admin UI: página para gerir/rever tags de conteúdo existente em massa

### R2-TRACK — Tracking de actividade e sinais
**Executor:** Codex | **Pré-requisito:** R1-TAXONOMY ✅

- Adicionar `view`, `view_partial`, `view_complete`, `not_interested`, `hide_topic`, `boost_topic`, `share` a `interactionSignals`
- Endpoint `POST /api/activity/signal` — recebe `{ contentId, contentType, signal, metadata? }`
- Frontend: disparar `view` ao montar o card (> 3s), `view_complete` ao fechar após 80% do tempo estimado
- Rate limiting: máximo 1 sinal de `view` por (userId × contentId) por hora

### R3-SMART-TAG — Auto-sugestão de tags
**Executor:** Codex | **Pré-requisito:** R1-TAXONOMY ✅

- `src/services/autoTagging.service.ts` — keyword matching contra taxonomia
- Para artigos: chamar também Anthropic API (modelo haiku, baixo custo) para sugestões AI
- Integrar no fluxo de criação/edição: após save → `suggestedTags[]` devolvidos ao frontend
- Creator dashboard: UI "Tags sugeridas — aceitar / editar"
- Endpoint `POST /api/content/suggest-tags` → `{ title, description, contentExcerpt? }` → `{ suggestions: string[] }`

### R4-RECO-API — Motor de recomendação backend
**Executor:** Codex | **Pré-requisito:** R2-TRACK ✅ + R3-SMART-TAG ✅

- `src/services/recommendation.service.ts` — algoritmo de scoring descrito acima
- Todos os endpoints `/api/recommendations/*` listados neste documento
- Cron job: recalcular `tagAffinities` de utilizadores activos (últimas 24h) a cada hora
- Cold start: seed de afinidades a partir das preferências do onboarding
- Cache: TTL de 5 min por utilizador (Redis) para não recalcular a cada page load

### R5-UX-FEED — Frontend "Para Ti" + Reels + Controlos
**Executor:** Codex | **Pré-requisito:** R4-RECO-API ✅

- `/para-ti` — feed "Para Ti" com scroll infinito, cards mistos, menu de contexto por card
- `/reels` — feed vertical de reels com auto-play e interacções inline
- `/conta/preferencias` — painel de controlo de tópicos + botão de reset
- Componente `WhyAmISeeingThis` — tooltip/modal de transparência
- Integrar "Para Ti" na homepage (substituindo/evoluindo P9.2)

---

## Impacto no P9.2

O P9.2 planeado usa apenas localStorage do onboarding → demasiado simples para esta visão.

**Recomendação:**
- Executar P9.2 como planeado (MVP rápido para Beta) — dá um "Para Ti" funcional com base nos interesses declarados
- R1→R5 são o sistema real para v1.0 — mais pensado, mais capaz, com controlos para o utilizador
- P9.2 e R1-R5 coexistem: P9.2 é substituído gradualmente pelo feed do R5

---

## Referências de sistemas reais

| Sistema | O que replicamos |
|---------|-----------------|
| TikTok For You | Sinal `not_interested`, scroll vertical de reels, cold start rápido |
| Instagram Explore | Feed misto de tipos de conteúdo, "ver menos disto" |
| YouTube Recommended | `view_complete` como sinal forte, diversidade de tópicos, "não me interessa" |
| Spotify Discover Weekly | Decay temporal das afinidades, diversidade injectada |
| Netflix | "Porque te estamos a mostrar isto", reset de preferências |
