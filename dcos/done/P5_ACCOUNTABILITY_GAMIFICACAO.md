# P5 — Accountability e Gamificacao: Motivacao que gera retencao

## Visao

Ter ferramentas, conteudo e comunidade nao e suficiente se o utilizador nao **volta**. A maioria das apps financeiras tem um pico de uso nos primeiros dias e depois abandono. O problema nao e falta de funcionalidades — e falta de **razao emocional para voltar**.

A camada de Accountability resolve isto com 3 mecanismos:
1. **Objetivos pessoais** — o utilizador define metas e a plataforma acompanha
2. **Progresso visivel** — ver a evolucao cria motivacao intrinseca
3. **Reconhecimento social** — partilhar conquistas e ser reconhecido pela comunidade

A gamificacao nao e sobre pontos arbitrarios ou badges vazios. E sobre **tornar visivel o progresso real** e criar habitos saudaveis de investimento.

---

## 1. Como cada ator ganha

| Ator | O que ganha |
|------|-------------|
| **Utilizador** | Motivacao para continuar (ver progresso), disciplina (lembretes de contribuicao), sentido de conquista (milestones), comparacao saudavel com pares anonimizados, habitos financeiros melhores |
| **Criador** | Engagement (challenges ligados a conteudo), crescimento de audiencia (leaderboards de criadores), metricas de impacto ("47 utilizadores completaram o teu learning path"), retencao de seguidores |
| **Marca/Entidade** | Sponsorship de challenges ("Challenge DCA patrocinado por Corretora X"), dados de engagement (quantos users estao ativamente a investir), brand association positiva (associar marca a progresso financeiro) |
| **Plataforma** | Retencao (DAU/MAU), habito diario (streaks), dados de engagement, viral loop (partilha de conquistas), diferenciacao competitiva |

---

## 2. O que construir

### 2.1 Objetivos financeiros pessoais

O utilizador define metas concretas que a plataforma acompanha.

**Tipos de objetivo:**

| Tipo | Exemplo | Tracking |
|------|---------|----------|
| **Poupanca** | "Poupar €500/mes" | Input manual mensal ou ligacao a portfolio |
| **Investimento** | "Investir €300/mes em VWCE" | Tracking via portfolio |
| **Emergencia** | "Fundo de emergencia de €5,000" | Input manual |
| **FIRE** | "Atingir €300,000 em 15 anos" | Ligacao ao FIRE simulator |
| **Aprendizagem** | "Completar 1 learning path por mes" | Automatico |
| **Comunidade** | "Responder a 5 perguntas por semana" | Automatico |
| **Diversificacao** | "Ter pelo menos 5 setores no portfolio" | Tracking via portfolio |

**Model:**

```typescript
// src/models/FinancialGoal.ts
interface IFinancialGoal {
  user: ObjectId

  // Definicao
  type: 'savings' | 'investment' | 'emergency' | 'fire' | 'learning' | 'community' | 'diversification' | 'custom'
  title: string                   // "Poupar €500/mes" ou titulo custom
  description?: string

  // Target
  targetValue: number             // valor alvo (€5000, 5 setores, 1 path)
  targetUnit: 'currency' | 'percentage' | 'count'
  currentValue: number            // valor atual

  // Tempo
  deadline?: Date                 // opcional — alguns objetivos sao ongoing
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once'

  // Progresso
  progressHistory: [{
    date: Date
    value: number
    note?: string                 // "Recebi bonus, adicionei extra"
  }]

  // Estado
  status: 'active' | 'completed' | 'paused' | 'abandoned'
  completedAt?: Date

  // Visibilidade
  isPublic: boolean               // partilhar progresso na comunidade?
  isAnonymized: boolean           // mostrar % mas esconder valores absolutos?

  // Ligacoes
  linkedSimulation?: ObjectId     // FIRE simulation associada
  linkedPortfolio?: ObjectId      // portfolio associado
  linkedLearningPath?: ObjectId   // learning path associado

  createdAt: Date
  updatedAt: Date
}
```

**UI — Dashboard de objetivos:**

```
┌─ Os teus objetivos ────────────────────────────┐
│                                                │
│  🎯 Fundo de emergencia                        │
│  ████████████████░░░░ 80% (€4,000 / €5,000)    │
│  Ritmo atual: completas em 2 meses              │
│  [Atualizar progresso]                          │
│                                                │
│  📈 Investir €300/mes                           │
│  ✅ Mar ✅ Fev ✅ Jan ❌ Dez ✅ Nov              │
│  Streak: 3 meses consecutivos                  │
│  [Registar contribuicao de Marco]               │
│                                                │
│  🔥 FIRE — €300,000 em 15 anos                  │
│  ██░░░░░░░░░░░░░░░░░░ 8.3% (€25,000)           │
│  A frente do plano em 6 meses                   │
│  [Ver simulacao FIRE]                           │
│                                                │
│  📚 Learning — 1 path/mes                       │
│  Marco: "Analise Fundamental" — 60% completo    │
│  [Continuar learning path]                      │
│                                                │
│  [+ Adicionar objetivo]                         │
└────────────────────────────────────────────────┘
```

---

### 2.2 Streaks e habitos

Streaks simples que recompensam consistencia, nao quantidade.

**Tipos de streak:**

| Streak | Acao | Reset |
|--------|------|-------|
| **Contribuicao** | Registar investimento/poupanca mensal | Falha 1 mes |
| **Aprendizagem** | Completar acao educativa (quiz, path, glossario) | Falha 1 semana |
| **Comunidade** | Participar na comunidade (thread, comment, voto) | Falha 1 semana |
| **Plataforma** | Login e interacao com qualquer ferramenta | Falha 3 dias |

**Regras anti-gaming:**
- Streak de contribuicao: so conta se registar valor > 0
- Streak de aprendizagem: so conta acoes substantivas (nao clicar e fechar)
- Streak de comunidade: so conta contribuicoes com upvotes positivos (evitar spam)
- Sem "streak freeze" ou compras — o streak e real ou nao e

```typescript
// src/models/UserStreak.ts
interface IUserStreak {
  user: ObjectId
  type: 'contribution' | 'learning' | 'community' | 'platform'

  currentStreak: number           // dias/semanas/meses consecutivos
  longestStreak: number           // recorde pessoal
  lastActivity: Date              // ultima acao que contou

  history: [{
    period: string                // "2026-03", "2026-W10"
    completed: boolean
    activityCount: number
  }]
}
```

**UI — Streak widget:**

```
┌─ Streaks ──────────────────┐
│  💰 Contribuicao: 3 meses  │
│  📚 Aprendizagem: 5 semanas│
│  💬 Comunidade: 2 semanas  │
│  🔥 Plataforma: 12 dias    │
│                            │
│  Recorde: 7 meses (contr.) │
└────────────────────────────┘
```

---

### 2.3 Achievements (conquistas reais)

Conquistas baseadas em progresso real, nao em acoes arbitrarias. Cada achievement conta uma historia.

**Categorias:**

```typescript
// src/models/Achievement.ts
interface IAchievement {
  key: string                     // identificador unico
  category: 'investing' | 'learning' | 'community' | 'platform' | 'milestone'

  title: string                   // "Primeiro investimento"
  description: string             // "Registaste o teu primeiro investimento no FinHub"
  icon: string                    // emoji ou icone

  // Condicao
  condition: {
    type: string                  // 'portfolio_value', 'streak', 'goals_completed', etc.
    threshold: number             // valor necessario
    comparison: 'gte' | 'eq'     // >= ou ==
  }

  // Niveis (bronze/silver/gold quando aplicavel)
  tier?: 'bronze' | 'silver' | 'gold'

  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

interface IUserAchievement {
  user: ObjectId
  achievement: string             // key do achievement
  unlockedAt: Date
  progress: number                // 0-100%
  notified: boolean
}
```

**Lista de achievements:**

| Categoria | Achievement | Condicao | Raridade |
|-----------|------------|----------|----------|
| **Investing** | Primeiro investimento | Registar 1o investimento | Common |
| | Diversificado | 5+ setores no portfolio | Uncommon |
| | Consistente (Bronze) | 3 meses de contribuicao seguidos | Common |
| | Consistente (Prata) | 6 meses seguidos | Uncommon |
| | Consistente (Ouro) | 12 meses seguidos | Rare |
| | €10K club | Portfolio atinge €10,000 | Uncommon |
| | €50K club | Portfolio atinge €50,000 | Rare |
| | €100K club | Portfolio atinge €100,000 | Epic |
| **Learning** | Curioso | Completar 1 learning path | Common |
| | Estudioso | Completar 5 learning paths | Uncommon |
| | Mestre | Completar todos os learning paths | Rare |
| | Glossario vivo | Consultar 50 termos no glossario | Common |
| | Quiz ace | Score 100% num quiz | Uncommon |
| **Community** | Primeira resposta | Responder a 1 thread | Common |
| | Util | 5 respostas marcadas como "aceite" | Uncommon |
| | Guru da comunidade | 50 respostas aceites | Rare |
| | Mentor | Ajudar 10 "iniciantes" (tag) | Uncommon |
| | Thread da semana | Thread com mais upvotes na semana | Rare |
| **Milestone** | FIRE starter | Criar plano FIRE | Common |
| | A caminho | 25% do objetivo FIRE | Uncommon |
| | Meio caminho | 50% do objetivo FIRE | Rare |
| | Quase la | 75% do objetivo FIRE | Epic |
| | Financeiramente livre | 100% do objetivo FIRE | Legendary |
| **Platform** | Early adopter | Registar-se no primeiro ano | Rare |
| | Veterano | 1 ano de conta ativa | Uncommon |
| | Evangelista | Convidar 5 amigos que se registam | Rare |

---

### 2.4 Leaderboards (comparacao saudavel)

Leaderboards que motivam sem criar toxicidade. **Nunca mostrar valores absolutos de portfolio** — so metricas de engagement e progresso.

**Leaderboards disponiveis:**

| Leaderboard | Metrica | Quem aparece |
|-------------|---------|-------------|
| **Contribuidores** | Maior streak de contribuicao mensal | Todos (opt-in) |
| **Aprendizagem** | Learning paths completados | Todos |
| **Comunidade** | Reputacao (upvotes recebidos) | Todos |
| **Criadores** | Seguidores + engagement | Criadores |
| **Helpers** | Respostas aceites | Todos |

**Regras de seguranca:**
- Opt-in obrigatorio — ninguem aparece sem consentir
- Sem valores monetarios — nunca mostrar €
- Anonimizacao opcional — aparecer como "User #4521" se preferir
- Sem ranking negativo — so top performers, nao "piores"
- Reset mensal/trimestral para dar oportunidade a todos

```typescript
// src/models/LeaderboardEntry.ts
interface ILeaderboardEntry {
  user: ObjectId
  leaderboard: 'contribution_streak' | 'learning' | 'community_rep' | 'helpers' | 'creators'

  score: number
  rank: number

  period: 'weekly' | 'monthly' | 'all_time'
  periodKey: string               // "2026-W10", "2026-03", "all"

  // Display
  displayName: string             // username ou "User #XXXX"
  isAnonymized: boolean

  calculatedAt: Date
}
```

**UI:**

```
┌─ Leaderboard — Comunidade (Marco 2026) ────────┐
│                                                │
│  #1  @FinanceGuru     — 342 rep (+89 este mes) │
│  #2  @InvestidorPT    — 298 rep (+67 este mes) │
│  #3  @CriadorY ✓      — 251 rep (+54 este mes) │
│  ...                                           │
│  #47 Tu (@username)   — 23 rep (+12 este mes)  │
│                                                │
│  Top helpers (respostas aceites):               │
│  #1  @CriadorY ✓ — 18 respostas aceites        │
│  #2  @FinanceGuru — 12 respostas aceites       │
│  #3  User #7832  — 8 respostas aceites         │
│                                                │
└────────────────────────────────────────────────┘
```

---

### 2.5 Challenges (desafios temporarios)

Desafios com prazo que unem toda a comunidade.

**Tipos:**

| Tipo | Exemplo | Duracao | Quem cria |
|------|---------|---------|-----------|
| **Poupanca** | "Challenge: poupa €100 extra este mes" | 1 mes | Plataforma |
| **Aprendizagem** | "Semana da literacia: completa 3 quizzes" | 1 semana | Plataforma |
| **Comunidade** | "Ajuda um iniciante: responde a 3 threads tag 'iniciante'" | 2 semanas | Plataforma |
| **Criador** | "Challenge do @CriadorX: monta um portfolio de dividendos" | 1 mes | Criador |
| **Sponsored** | "Challenge DCA com Corretora X: investe €50/semana durante 1 mes" | 1 mes | Marca |

**Model:**

```typescript
// src/models/Challenge.ts
interface IChallenge {
  title: string
  description: string

  // Tipo
  type: 'savings' | 'learning' | 'community' | 'creator' | 'sponsored'
  createdBy: ObjectId             // admin, criador ou marca
  sponsor?: ObjectId              // marca patrocinadora (se sponsored)

  // Tempo
  startDate: Date
  endDate: Date

  // Objetivo
  goal: {
    type: string                  // 'complete_quizzes', 'answer_threads', 'save_amount'
    target: number                // 3 quizzes, 5 respostas, etc.
  }

  // Recompensa
  reward: {
    type: 'achievement' | 'badge' | 'reputation' | 'feature_unlock'
    value: string                 // key do achievement, nome do badge
    description: string           // "Badge exclusivo 'Challenge DCA Marco 2026'"
  }

  // Participacao
  participantCount: number
  completedCount: number

  // Estado
  status: 'upcoming' | 'active' | 'ended'

  // Visibilidade
  isPublic: boolean
  targetAudience?: 'all' | 'newcomers' | 'contributors' | 'creators'

  createdAt: Date
}

interface IChallengeParticipation {
  user: ObjectId
  challenge: ObjectId

  joinedAt: Date
  progress: number                // 0-100%
  currentValue: number            // progresso numerico
  completedAt?: Date

  // Registo de acoes
  activities: [{
    date: Date
    action: string
    value: number
  }]
}
```

**Integracao com marcas:**
- Marca patrocina challenge → logo aparece na pagina do challenge
- Marca pode oferecer premio real (ex: "1 mes de corretagem gratis para os primeiros 100")
- Metricas para a marca: participantes, completados, engagement rate
- Brand safety: challenge aprovado pela plataforma antes de ir live

---

### 2.6 Perfil publico com progresso

O perfil do utilizador mostra o seu percurso (se optar por isso).

```
┌─ Perfil de @InvestidorPT ──────────────────────┐
│                                                │
│  Membro desde Jan 2026 │ Level: Contributor     │
│                                                │
│  Streaks                                       │
│  💰 8 meses │ 📚 12 sem │ 💬 5 sem │ 🔥 34 dias│
│                                                │
│  Achievements (12/35)                          │
│  🏆 Consistente Ouro │ 📚 Estudioso │ 💬 Util  │
│  🎯 €10K Club │ 🔥 FIRE Starter │ ...          │
│  [Ver todos]                                   │
│                                                │
│  Comunidade                                    │
│  Rep: 142 │ Respostas aceites: 8 │ Threads: 23 │
│                                                │
│  Objetivos publicos                            │
│  🎯 Fundo emergencia — 80% ████████░░           │
│  🎯 FIRE 15 anos — 8% █░░░░░░░░░░              │
│                                                │
│  Challenges completados                        │
│  ✅ Challenge DCA Jan 2026                      │
│  ✅ Semana da Literacia Fev 2026                │
│                                                │
│  Atividade recente                             │
│  • Respondeu a "Como declarar cripto no IRS?"   │
│  • Completou quiz "Analise Fundamental"         │
│  • Atingiu streak de 8 meses de contribuicao    │
│                                                │
└────────────────────────────────────────────────┘
```

---

### 2.7 Notificacoes de motivacao

Notificacoes que celebram progresso e relembram objetivos.

| Tipo | Trigger | Mensagem |
|------|---------|---------|
| **Celebracao** | Achievement desbloqueado | "Desbloqueaste 'Consistente Prata'! 6 meses seguidos de contribuicao." |
| **Lembrete** | Fim do mes sem contribuicao registada | "Ainda nao registaste a contribuicao de Marco. O teu streak de 5 meses esta em risco!" |
| **Progresso** | Objetivo atinge marco (25/50/75%) | "O teu fundo de emergencia esta a 75%! Faltam €1,250." |
| **Social** | Alguem da comunidade atinge marco | "@FinanceGuru completou 1 ano de contribuicoes consecutivas!" |
| **Challenge** | Challenge a terminar | "O Challenge DCA termina em 3 dias. Estas a 80% — so falta 1 investimento!" |

**Frequencia:** Max 2 por dia. Prioridade: celebracao > lembrete > progresso > social.

---

## 3. Principios anti-dark-pattern

A gamificacao do FinHub segue regras estritas para nao se tornar manipulativa:

1. **Progresso real, nao artificial** — achievements baseados em acoes reais (investir, aprender, ajudar), nunca em metricas vanity (logins, cliques)
2. **Sem pressao financeira** — nunca incentivar a investir mais do que o utilizador definiu. Streaks de contribuicao contam "contribuiu", nao "contribuiu X euros"
3. **Opt-in total** — leaderboards, perfil publico, partilha de objetivos sao todos opt-in
4. **Sem monetizacao de urgencia** — sem "streak freeze" a venda, sem "boost" pago, sem loot boxes
5. **Comparacao saudavel** — nunca comparar valores monetarios entre utilizadores. So progresso e engagement
6. **Honestidade** — se o utilizador esta atras do plano FIRE, dizer isso claramente, sem suavizar com gamificacao falsa

---

## 4. Endpoints

```
# Objetivos
GET    /api/goals                       — listar objetivos do user
POST   /api/goals                       — criar objetivo
PATCH  /api/goals/:id                   — atualizar objetivo
DELETE /api/goals/:id                   — remover objetivo
POST   /api/goals/:id/progress          — registar progresso

# Streaks
GET    /api/streaks                     — streaks do user
GET    /api/streaks/history             — historico de streaks

# Achievements
GET    /api/achievements                — todos os achievements disponiveis
GET    /api/achievements/mine           — achievements do user
GET    /api/achievements/:key           — detalhe de achievement + progresso

# Leaderboards
GET    /api/leaderboards/:type          — leaderboard por tipo (weekly/monthly/all)
POST   /api/leaderboards/opt-in         — optar por aparecer
DELETE /api/leaderboards/opt-out        — optar por nao aparecer

# Challenges
GET    /api/challenges                  — challenges ativos e upcoming
GET    /api/challenges/:id              — detalhe do challenge
POST   /api/challenges/:id/join         — participar
GET    /api/challenges/:id/progress     — progresso do user no challenge
POST   /api/challenges                  — criar challenge (admin/criador/marca)

# Perfil publico
GET    /api/users/:username/profile     — perfil publico com progresso
PATCH  /api/users/profile/visibility    — configurar visibilidade
```

---

## 5. Integracao com as outras camadas

### 5.1 Accountability → Ferramentas
- Portfolio: tracking automatico de objetivos de investimento
- FIRE Simulator: ligacao direta a objetivo FIRE
- Stock/REIT/ETF: "Adicionaste $O ao portfolio — progresso no objetivo de diversificacao: 4/5 setores"

### 5.2 Accountability → Comunidade
- Partilha de achievements na comunidade ("@user desbloqueou Consistente Ouro!")
- Challenges comunitarios que geram threads de discussao
- Leaderboards como incentivo para participar

### 5.3 Accountability → Criadores
- Criadores podem criar challenges ligados ao seu conteudo
- Metricas de impacto: "47 utilizadores completaram o teu learning path"
- Badge "Mentor" para criadores que respondem a muitas perguntas

### 5.4 Accountability → Educacao
- Learning paths contam para streak de aprendizagem
- Quizzes completados contam para achievements
- Challenges de literacia incentivam completar paths

### 5.5 Accountability → Marcas
- Sponsored challenges com branding da marca
- Metricas de engagement para a marca (participantes, completion rate)
- Prizes reais opcionais (comissoes gratis, etc.)

### 5.6 Accountability → Mercado
- Contexto em milestones: "Atingiste €25K! O mercado subiu 12% YTD — +8% foram do teu esforco"
- Alertas motivacionais em quedas: "O mercado caiu 5% mas o teu streak de 8 meses mostra disciplina. Historicamente, quem mantem contribuicoes em quedas..."

---

## 6. Roadmap

### Fase 1 — Objetivos e streaks

| # | Item | Esforco |
|---|------|---------|
| 1 | Model FinancialGoal + CRUD | Medio |
| 2 | Dashboard de objetivos com progresso visual | Medio |
| 3 | Sistema de streaks (4 tipos) | Medio |
| 4 | Notificacoes de lembrete e celebracao | Baixo |
| 5 | Widget de streaks no perfil | Baixo |

### Fase 2 — Achievements e perfil

| # | Item | Esforco |
|---|------|---------|
| 6 | Model Achievement + engine de calculo | Alto |
| 7 | Definir 35 achievements iniciais com condicoes | Medio |
| 8 | Pagina de achievements do user | Medio |
| 9 | Perfil publico com progresso opt-in | Medio |
| 10 | Notificacoes de achievement desbloqueado | Baixo |

### Fase 3 — Social e competicao saudavel

| # | Item | Esforco |
|---|------|---------|
| 11 | Leaderboards (5 tipos) com opt-in | Medio |
| 12 | Challenges da plataforma (3 tipos iniciais) | Alto |
| 13 | Challenges de criadores | Medio |
| 14 | Partilha de conquistas na comunidade | Baixo |

### Fase 4 — Monetizacao e marcas

| # | Item | Esforco |
|---|------|---------|
| 15 | Sponsored challenges | Alto |
| 16 | Metricas de engagement para marcas | Medio |
| 17 | Prizes reais em challenges | Medio |
| 18 | Analytics de retencao (impacto da gamificacao) | Medio |
