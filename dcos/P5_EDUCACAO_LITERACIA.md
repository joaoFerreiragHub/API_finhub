# P5 — Camada Educacional: Literacia sem competir com criadores

## Visao

O FinHub quer promover literacia financeira. Mas os criadores de conteudo — que sao parceiros da plataforma — vendem cursos e vivem de conteudo educativo. A plataforma nao pode competir com eles.

A regra de ouro: **o FinHub educa o suficiente para criar fome, nao para saciar.** A educacao da plataforma e o appetizer que leva ao prato principal dos criadores.

Principio: se o conteudo educativo leva mais de 3 minutos a consumir, provavelmente devia ser conteudo de criador, nao da plataforma.

---

## 1. Como cada ator ganha

| Ator | O que ganha com a camada educacional |
|------|--------------------------------------|
| **Utilizador** | Aprende o basico gratis, sabe o que precisa de aprender a seguir, encontra o criador certo |
| **Criador** | A plataforma cria procura para os seus cursos/conteudo. Learning paths apontam para eles. Quizzes recomendam os seus cursos. |
| **Marca/Entidade** | Utilizadores educados sao melhores clientes. Corretora ganha utilizadores que ja sabem o que e uma acao. |
| **Plataforma** | Retencao (utilizadores voltam para aprender), SEO (glossario/guias indexaveis), diferenciacao |

---

## 2. Cinco pilares educacionais

### 2.1 Educacao contextual (dentro das ferramentas)

O pilar mais poderoso. Cada vez que uma ferramenta mostra uma metrica, e uma oportunidade de ensinar — **no momento em que o utilizador precisa**.

**Como funciona:**

Cada indicador nas ferramentas (Analise de Acoes, REIT Toolkit, FIRE Simulator) tem 3 niveis:

```
Nivel 1 — Inline label
  "ROE: 18%"

Nivel 2 — Tooltip (hover/tap no ?)
  "Return on Equity — quanto a empresa gera de lucro
   por cada €1 de capital. 18% esta acima da media (12%).
   Quer dizer que a empresa e eficiente a usar o dinheiro
   dos acionistas."

Nivel 3 — "Saber mais" (link no tooltip)
  → Micro-licao dedicada (200 palavras + grafico + exemplo)
  → No final: "Quer aprofundar? Cursos recomendados:"
     · @CriadorX: "Analise fundamental para iniciantes" [€29]
     · @CriadorY: Playlist gratis no YouTube
```

**Implementacao:**

```typescript
// Componente reutilizavel
interface EducationalMetric {
  label: string           // "ROE"
  value: string           // "18%"
  tooltipKey: string      // chave para o conteudo educativo
}

// Conteudo educativo (JSON ou MongoDB)
interface MetricEducation {
  key: string             // "roe"
  shortExplanation: string  // tooltip (1-2 frases)
  contextual: {
    good: string          // "Acima de 15% e considerado bom"
    bad: string           // "Abaixo de 8% e fraco"
    neutral: string       // "Entre 8-15% e razoavel"
  }
  microLesson?: {
    title: string
    content: string       // 200-300 palavras max
    chart?: string        // tipo de grafico ilustrativo
    example?: string      // exemplo com numeros reais
  }
  relatedContent?: {
    type: 'course' | 'article' | 'video' | 'playlist'
    contentId: string     // referencia ao conteudo do criador
  }[]
  relatedTools?: string[] // ["stock-analysis", "reit-toolkit"]
  level: 'beginner' | 'intermediate' | 'advanced'
}
```

**Metricas a cobrir (prioridade):**

| Grupo | Metricas | Nivel |
|-------|---------|-------|
| Valuation basica | P/E, P/B, Dividend Yield | Beginner |
| Profitability | ROE, ROIC, Margem operacional | Beginner-Intermediate |
| Debt | Debt/Equity, Interest Coverage | Intermediate |
| Growth | CAGR, Revenue Growth | Beginner |
| REIT specific | FFO, NAV, Cap Rate, Payout Ratio | Intermediate |
| FIRE concepts | SWR, Compound Interest, DRIP | Beginner |
| Risk | Altman Z, Piotroski F-Score | Advanced |
| ETF | TER, Tracking Error, Overlap | Beginner |

**Total: ~40-50 metricas a documentar.** Cada uma com tooltip + micro-licao.

**Impacto nos criadores:** Cada micro-licao termina com recomendacoes de conteudo aprofundado dos criadores. **A plataforma educa → cria curiosidade → canaliza para o criador.** O criador ganha trafego qualificado.

**Esforco:** Medio (3-4 dias de escrita + 1-2 dias de componentes).

---

### 2.2 Learning paths (curadoria, nao conteudo)

A plataforma nao cria cursos. Cria **percursos** — sequencias curadas que misturam conteudo da plataforma (gratis) com conteudo dos criadores (gratis ou pago).

**Percursos sugeridos:**

#### Percurso 1: "Comecar do zero"
```
Objetivo: Ir de "nao sei nada" a "fiz o meu primeiro investimento"
Duracao: 2-4 semanas
Publico: Iniciante absoluto

Modulo 1: Entender o basico (FinHub — gratis)
  ✅ Glossario: Acoes, ETFs, Obrigacoes, Fundos
  ✅ Quiz: "Qual e o teu nivel?"
  ✅ Micro-licao: "O poder dos juros compostos"
  ✅ Ferramenta: Calculadora de juros compostos

Modulo 2: Escolher onde investir (FinHub — gratis)
  ✅ Comparador de corretoras
  ✅ Micro-licao: "Como abrir conta numa corretora"
  ✅ Guia: "Corretora para iniciantes em Portugal"

Modulo 3: Aprender a analisar (Conteudo de criadores)
  📺 @CriadorA: "O que olhar antes de comprar uma acao" [gratis]
  🎓 @CriadorB: "Curso: Primeiros passos no investimento" [€19]
  📖 Livro: "O Investidor Inteligente" — resumo no hub

Modulo 4: Fazer o primeiro investimento (FinHub — gratis)
  ✅ Ferramenta: Analisar uma acao (Score + Radar)
  ✅ Ferramenta: Simulador DCA ("E se investires €100/mes?")
  ✅ Acao: Adicionar a watchlist / portfolio

Modulo 5: Acompanhar (FinHub — gratis)
  ✅ Watchlist configurada
  ✅ Dashboard ativo
```

#### Percurso 2: "FIRE em Portugal"
```
Objetivo: Definir e comecar a perseguir FIRE
Duracao: 1-2 semanas

Modulo 1: O que e FIRE (FinHub)
  ✅ Micro-licao: "A regra dos 4%"
  ✅ Calculadora de juros compostos
  ✅ Quiz: "Qual o teu tipo de FIRE?"

Modulo 2: Definir o teu numero (FinHub)
  ✅ FIRE Simulator — setup
  ✅ Perfil financeiro (V2)

Modulo 3: Estrategias (Criadores)
  📺 @CriadorC: "FIRE com ETFs — o plano simples" [gratis]
  🎓 @CriadorD: "Dividendos para independencia financeira" [€49]
  📺 @CriadorE: "REITs para rendimento passivo" [gratis]

Modulo 4: Montar a carteira (FinHub)
  ✅ Portfolio builder
  ✅ FIRE simulator com ativos reais
  ✅ Projecao personalizada
```

#### Percurso 3: "Dividendos e rendimento passivo"
#### Percurso 4: "Investir em REITs"
#### Percurso 5: "Cripto para investidores tradicionais"
#### Percurso 6: "Impostos sobre investimentos em Portugal"

**Implementacao:**

```typescript
// src/models/LearningPath.ts
interface ILearningPath {
  slug: string
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration: string  // "2-4 semanas"
  coverImage?: string

  modules: [{
    title: string
    items: [{
      type: 'micro_lesson' | 'tool' | 'quiz' | 'external_content' | 'action'
      title: string
      description: string

      // Se micro_lesson
      lessonKey?: string

      // Se tool
      toolPath?: string  // "/ferramentas/juros-compostos"

      // Se external_content (criador)
      contentType?: 'course' | 'video' | 'article' | 'book'
      contentId?: string   // ref ao BaseContent
      creatorId?: string   // ref ao User
      isPaid?: boolean
      price?: number
      externalUrl?: string // se e conteudo externo (YouTube, etc.)

      // Se quiz
      quizKey?: string

      // Se action
      actionDescription?: string
    }]
  }]

  // Curadoria
  curatedBy: 'platform' | ObjectId  // plataforma ou criador pode criar paths
  status: 'draft' | 'published'
  publishedAt?: Date

  // Engagement
  enrolledCount: number
  completionRate: number
  averageRating: number
}
```

```typescript
// src/models/UserLearningProgress.ts
interface IUserLearningProgress {
  user: ObjectId
  learningPath: ObjectId
  completedItems: string[]  // ids dos items concluidos
  currentModule: number
  startedAt: Date
  lastActivityAt: Date
  completed: boolean
  completedAt?: Date
}
```

**Endpoints:**
```
GET    /api/learning-paths              — listar percursos publicos
GET    /api/learning-paths/:slug        — detalhe de um percurso
GET    /api/learning-paths/my           — meus percursos em progresso
POST   /api/learning-paths/:id/enroll   — comecar percurso
PATCH  /api/learning-paths/:id/progress — marcar item como concluido
```

**Impacto nos criadores:** Criadores podem ser **convidados a curar percursos** ou a ter o seu conteudo incluido nos paths da plataforma. Isto gera trafego direto para os seus cursos/videos. A plataforma pode ate criar um programa: "Conteudo recomendado pelo FinHub" — selo de qualidade que beneficia o criador.

**Impacto nas marcas:** Os percursos de "Comecar do zero" naturalmente referenciam corretoras do diretorio. "Passo 2: Escolher corretora → Comparador FinHub". As marcas ganham exposicao contextual.

**Esforco:** Medio-Alto (model + CRUD + frontend + escrita de 6 percursos).

---

### 2.3 Glossario financeiro interativo

**Ja documentado em P5_FERRAMENTAS_AUDIT_E_NOVAS.md.** Resumo:

- ~150-200 termos financeiros em PT
- Cada termo: definicao simples + exemplo + link para ferramenta + nivel
- SEO excelente — cada termo e uma pagina indexavel
- Gateway para ferramentas e conteudo de criadores
- Rota `/aprender/glossario` ja existe (placeholder)

**Adicionalmente para o ecosistema:**

Cada termo no glossario pode ter:
- "Conteudo relacionado" — artigos/videos de criadores que explicam este conceito
- "Ferramenta para praticar" — link direto para a ferramenta relevante
- "Marcas relacionadas" — se o termo e "corretora", listar corretoras do diretorio

```
Termo: "Dividend Yield"

Definicao: A percentagem do preco de uma acao que recebes
           anualmente em dividendos...

Exemplo: AAPL paga $0.96/acao/ano. A $192, yield = 0.5%.
         O (Realty Income) paga $3.08/acao/ano. A $58, yield = 5.3%.

Pratica: [Analisar dividend yield de qualquer acao →]
         [Simular dividendos no FIRE simulator →]

Conteudo de criadores:
  📺 @CriadorX: "Como escolher acoes de dividendos" [gratis]
  🎓 @CriadorY: "Curso: Viver de dividendos" [€39]

Termos relacionados: Payout Ratio, DRIP, Ex-Dividend Date
```

**Esforco:** Baixo-Medio (2-3 dias tecnico + tempo de escrita).

---

### 2.4 Quizzes e auto-avaliacao

**Objetivo:** O utilizador descobre o que sabe e o que nao sabe. O quiz nao ensina — diagnostica e recomenda.

**Tipos de quiz:**

#### Quiz 1: "Qual e o teu nivel de literacia financeira?"
```
10 perguntas de escolha multipla
  Q1: "O que e um ETF?"
  Q2: "Se a inflacao e 3% e o teu retorno e 5%, qual e o retorno real?"
  Q3: "O que acontece quando a taxa de juro sobe e tens obrigacoes?"
  ...

Resultado: Iniciante / Intermedio / Avancado
  → Recomendacoes personalizadas:
    · Percurso sugerido
    · Ferramentas para comecar
    · Cursos de criadores por nivel
```

#### Quiz 2: "Qual e o teu perfil de investidor?"
```
Resultados: Conservador / Moderado / Agressivo
  → Afeta sugestoes no FIRE simulator (alocacao recomendada)
  → Afeta alertas de risco no portfolio
```

#### Quiz 3: "Testa o que aprendeste" (pos-percurso)
```
Associado a cada learning path
  → Valida se o utilizador absorveu o modulo
  → Badge/XP ao completar
  → Recomendacao do proximo passo
```

**Model:**

```typescript
interface IQuiz {
  slug: string
  title: string
  description: string
  type: 'assessment' | 'knowledge_check' | 'profile'
  questions: [{
    text: string
    options: [{
      text: string
      isCorrect?: boolean    // para knowledge_check
      profileWeight?: {      // para profile quiz
        conservative?: number
        moderate?: number
        aggressive?: number
      }
    }]
    explanation?: string     // mostrado apos responder
    relatedGlossaryTerm?: string
  }]
  outcomes: [{
    key: string             // "beginner", "intermediate", "advanced"
    title: string
    description: string
    recommendations: {
      learningPaths?: string[]
      tools?: string[]
      creatorContent?: string[]
    }
  }]
}
```

**Impacto nos criadores:** Os resultados dos quizzes recomendam **conteudo especifico de criadores** baseado nos gaps do utilizador. "Nao acertaste sobre analise de risco → curso do @CriadorZ sobre gestao de risco."

**Esforco:** Medio (2-3 dias).

---

### 2.5 "Sabias que..." — micro-educacao passiva

Micro-tips personalizados que aparecem no dashboard, no portfolio, e nas ferramentas.

**Fontes:**
- Baseado no portfolio do utilizador ("O teu REIT O paga dividendos mensais, sabia?")
- Baseado na epoca ("Em Portugal, tens ate 30 de Junho para entregar IRS com mais-valias")
- Baseado em eventos de mercado ("O BCE decidiu manter taxas — sabes como isso afeta REITs?")
- Genericos ("Sabias que a regra dos 4% assume um portfolio 60/40?")

**Model simples:**

```typescript
interface IFinancialTip {
  text: string
  category: 'portfolio' | 'market' | 'tax' | 'general' | 'seasonal'
  level: 'beginner' | 'intermediate' | 'advanced'
  relatedTickers?: string[]    // so mostrar se user tem estes ativos
  relatedTools?: string[]
  relatedContent?: string[]    // conteudo de criadores
  seasonalRange?: {            // so mostrar nesta epoca
    startMonth: number
    endMonth: number
  }
  linkUrl?: string
  linkText?: string
}
```

**Exibicao:** 1 tip por sessao, rotativo, nunca repetir o mesmo tip na mesma semana.

**Esforco:** Baixo (1 dia de componente + JSON de 50-100 tips).

---

## 3. Como criadores participam na educacao

### 3.1 Programa "Conteudo Recomendado"

A plataforma convida criadores a ter conteudo incluido nos learning paths e recomendacoes de quizzes. Beneficios para o criador:

- Badge "Recomendado pelo FinHub" no conteudo
- Posicao nos learning paths (trafego qualificado)
- Destaque nas recomendacoes pos-quiz
- Metricas de conversao (quantos users vieram do path)

### 3.2 Criadores podem criar learning paths

Um criador pode montar um percurso que mistura:
- Micro-licoes da plataforma (gratis) — como contexto
- O seu proprio conteudo (gratis ou pago) — como profundidade
- Ferramentas do FinHub — como pratica

Isto da ao criador uma forma de **estruturar o seu portfolio de conteudo** e de atrair novos alunos.

### 3.3 Artigos educativos (dos criadores, nao da plataforma)

A plataforma nao escreve artigos longos. Os criadores escrevem. Mas a plataforma pode:
- Curar artigos de criadores e ligar a metricas/ferramentas
- "Este artigo explica como analisar REITs → Experimenta no REIT Toolkit"
- Promover artigos educativos na homepage e nos learning paths

---

## 4. Fluxo educativo integrado com todas as camadas

```
Utilizador novo chega ao FinHub
  │
  ├─ Via SEO (glossario/guia) → aprende conceito → descobre ferramentas → regista
  ├─ Via recomendacao (criador menciona FinHub) → explora → regista
  ├─ Via pesquisa ("calculadora FIRE") → usa ferramenta → regista
  │
  └─ Apos registo:
      │
      ├─ Quiz de nivel → descobre gaps → percurso recomendado
      │     └─ Percurso mistura: FinHub (gratis) + Criadores (gratis/pago)
      │
      ├─ Usa ferramentas → educacao contextual (tooltips, micro-licoes)
      │     └─ "Saber mais" → conteudo do criador
      │
      ├─ Configura portfolio / FIRE → dashboard personalizado
      │     └─ "Sabias que..." tips personalizados
      │     └─ Alertas educativos ("BCE mudou taxas → impacto nos teus REITs")
      │
      ├─ Completa percurso → badge → recomendacao do proximo
      │     └─ XP + gamificacao (ja existe no frontend)
      │
      └─ Engaja com comunidade → Q&A → ajuda outros → ganha reputacao
            └─ Criadores respondem → visibilidade → novos seguidores
```

**Todos ganham:**
- Utilizador: aprende gratis, encontra o conteudo certo para aprofundar
- Criador: recebe trafego qualificado, tem plataforma para estruturar conteudo
- Marca: utilizadores educados sao melhores clientes
- Plataforma: retencao, SEO, diferenciacao

---

## 5. Roadmap

### Fase 1 — Base educativa (com ferramentas V1)

| # | Item | Esforco |
|---|------|---------|
| 1 | Educacao contextual — tooltips em 40 metricas das ferramentas | Medio |
| 2 | Glossario financeiro — 150 termos com links para ferramentas e criadores | Medio |
| 3 | "Sabias que..." — 50-100 tips com exibicao rotativa | Baixo |
| 4 | Quiz de nivel de literacia (1 quiz, 10 perguntas) | Baixo |

### Fase 2 — Learning paths (com criadores)

| # | Item | Esforco |
|---|------|---------|
| 5 | Model LearningPath + UserProgress + endpoints | Medio |
| 6 | 3 percursos iniciais (zero, FIRE, dividendos) | Medio (escrita) |
| 7 | Programa "Conteudo Recomendado" para criadores | Baixo (guidelines) |
| 8 | Quiz de perfil de investidor | Baixo |

### Fase 3 — Integracao profunda (com V2 hub pessoal)

| # | Item | Esforco |
|---|------|---------|
| 9 | Tips personalizados ao portfolio | Medio |
| 10 | Criadores a criar learning paths proprios | Medio |
| 11 | Recomendacoes pos-quiz ligadas a conteudo de criadores | Medio |
| 12 | Badges/XP por completar percursos (gamificacao existente) | Baixo |
