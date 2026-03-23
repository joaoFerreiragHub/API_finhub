# FinHub — Sistema de Comunidade

> **Data:** 2026-03-23
> **Estado:** 🟡 Planeado — a desenvolver antes do beta / full release
> **Conceito:** Mix Reddit (fóruns/threads) + Discord (salas) + Gamificação de literacia financeira

---

## 1. Visão Geral

A Comunidade é o terceiro pilar da FinHub, ao lado do **HUB** (conteúdo) e do **PRIVADO** (ferramentas pessoais).

Enquanto o HUB é para *descobrir e consumir* e o PRIVADO é para *gerir as tuas finanças*, a Comunidade é para **discutir, aprender com outros e crescer juntos**.

```
┌─────────────────────────────────────────────────────────┐
│  🌐  HUB  —  Conteúdo público, criadores, notícias      │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  💬  COMUNIDADE  —  Fóruns + Salas + Gamificação        │
│  (parte HUB: aberto) + (parte PRIVADO: premium)         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  🔒  PRIVADO  —  Portfolio, finanças, ferramentas       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura da Comunidade

### 2.1 Salas (inspiração Discord)
Espaços temáticos para discussão em tempo real ou assíncrona:

```
/comunidade
├── 📢 Geral
├── 💰 Poupança e Orçamento
├── 📈 Investimento e Bolsa
├── 🏠 Imobiliário
├── 🔥 FIRE — Independência Financeira
├── 💳 Crédito e Dívidas
├── 🌍 Finanças para Emigrantes
├── 🎓 Primeiros Passos (para iniciantes)
└── 🔐 [PREMIUM] Salas exclusivas premium
    ├── Análise de Carteiras
    ├── Oportunidades Avançadas
    └── Acesso Directo a Criadores
```

### 2.2 Fóruns / Threads (inspiração Reddit)
Dentro de cada sala, os utilizadores podem:
- Criar **posts** (texto, imagens, links)
- **Votar** (upvote/downvote)
- **Responder** em threads aninhadas
- **Partilhar** conteúdo do HUB (artigos, cursos, vídeos)

### 2.3 Zona HUB vs Zona PRIVADO

| Zona | Acesso | O que tem |
|------|--------|-----------|
| **Salas públicas** | Todos (FREE+) | Discussão geral, partilha, perguntas |
| **Salas premium** | PREMIUM+ | Análise de carteiras, oportunidades, acesso a criadores |
| **Sala de criadores** | CREATOR | Comunicação directa com a audiência |

---

## 3. Gamificação — XP e Níveis

O sistema de gamificação incentiva o **envolvimento activo** e a **aprendizagem contínua** sobre finanças pessoais.

### 3.1 Como Ganhar XP

| Acção | XP |
|-------|-----|
| Criar um post de qualidade (com upvotes) | +10–50 XP |
| Responder a uma pergunta | +5 XP |
| Receber upvote numa resposta | +2 XP/upvote |
| Completar um artigo do HUB | +15 XP |
| Completar um curso premium | +100 XP |
| Completar onboarding | +25 XP |
| Streak diário (login + actividade) | +5 XP/dia |
| Primeiro post numa sala nova | +20 XP |
| Receber badge de "Resposta Útil" | +30 XP |
| Partilhar conteúdo que outros guardam | +10 XP |
| Preencher perfil completo | +50 XP (único) |

### 3.2 Penalizações de XP
| Acção | XP |
|-------|-----|
| Post sinalizado por spam | -20 XP |
| Conteúdo ocultado por moderação | -50 XP |
| Conta banida temporariamente | Reset para nível anterior |

### 3.3 Tabela de Níveis

| Nível | Nome | XP necessário | Privilégios |
|-------|------|--------------|-------------|
| 1 | Novato Financeiro | 0 | Leitura + posts básicos |
| 2 | Poupador | 100 | Criar threads, votar |
| 3 | Investidor | 300 | Responder em salas avançadas |
| 4 | Estratega | 700 | Badge no perfil, acesso a salas especiais |
| 5 | Independente | 1.500 | Acesso a AMAs (Ask Me Anything) com criadores |
| 6 | FIRE Walker | 3.000 | Co-moderador de sala, destaque no leaderboard |
| 7 | Guru Financeiro | 7.000 | Badge exclusivo, menção na homepage |

### 3.4 Exibição do Nível

O nível e XP são visíveis:
- No perfil público (`/perfil/:username`)
- Junto ao nome em posts e comentários da comunidade
- Na sidebar da comunidade (leaderboard semanal)
- No `/conta` do utilizador

---

## 4. Badges & Conquistas

Além dos níveis, o sistema atribui **badges** por conquistas específicas:

| Badge | Condição |
|-------|---------|
| 🌱 Primeiros Passos | Completar onboarding |
| 📚 Leitor Dedicado | Completar 10 artigos |
| 🎓 Estudante | Completar 1 curso |
| 💬 Sociável | 50 respostas na comunidade |
| ⭐ Contribuidor | 10 respostas com upvotes |
| 🔥 Em Chama | Streak de 7 dias |
| 🏆 Top da Semana | Top 3 no leaderboard semanal |
| 💎 Premium | Assinante Premium activo |
| 👑 FIRE Master | Atingir nível 7 |

---

## 5. Leaderboard

### Semanal (público, HUB)
- Top 10 utilizadores com mais XP na semana
- Visível na sidebar da comunidade e na homepage
- Reset toda a segunda-feira

### All-Time (perfil)
- XP total acumulado
- Posição global

---

## 6. Integração com o Resto da Plataforma

### Com o HUB (Conteúdo)
- Posts da comunidade podem **linkar artigos/cursos** do HUB → autores ganham visibilidade
- Conteúdo viral na comunidade pode entrar no feed "Em Destaque"
- Criadores podem criar posts patrocinados na sala relevante

### Com o PRIVADO (Ferramentas)
- Simulações FIRE partilháveis (anónimas) na comunidade
- Perguntas contextuais: "Tenho X€, o que fazem?" → resposta da comunidade

### Com Notificações
- Notificação quando alguém responde ao teu post
- Notificação de novos posts nas salas que segues
- Notificação de badge desbloqueada

### Com Moderação
- Posts da comunidade são moderáveis (mesmo sistema de reportes)
- `contentType: 'community_post'` adicionado ao `ModeratableContentType`
- Moderadores das salas têm poderes limitados (nível 6+)

---

## 7. Arquitetura Técnica (Proposta)

### Novos Modelos Necessários

```
CommunityRoom
├── slug, name, description, icon
├── category (enum)
├── isPublic: Boolean
├── requiredRole: UserRole (min role para aceder)
├── moderators: ObjectId[]
├── postCount, memberCount

CommunityPost
├── room: ObjectId (ref: CommunityRoom)
├── author: ObjectId (ref: User)
├── title: String
├── content: String (markdown)
├── attachments: Array (imagens, links)
├── hubContentRef?: { contentType, contentId }
├── upvotes, downvotes, replyCount
├── isPinned, isLocked
├── moderationStatus (same as other content)
├── createdAt, updatedAt

CommunityReply
├── post: ObjectId
├── parentReply?: ObjectId (aninhamento)
├── author: ObjectId
├── content: String
├── upvotes, downvotes
├── isMarkedHelpful: Boolean
├── moderationStatus

UserXP
├── user: ObjectId (unique)
├── totalXp: Number
├── level: Number (calculado)
├── weeklyXp: Number (reset semanal)
├── badges: Array<{ id, unlockedAt }>
├── history: Array<{ action, xp, createdAt }>
```

### Endpoints Necessários
```
GET  /api/community/rooms                      — lista salas
GET  /api/community/rooms/:slug                — detalhe + posts recentes
GET  /api/community/rooms/:slug/posts          — posts com paginação
POST /api/community/rooms/:slug/posts          — criar post
GET  /api/community/posts/:id                  — detalhe post + replies
POST /api/community/posts/:id/replies          — responder
POST /api/community/posts/:id/vote             — votar
GET  /api/community/leaderboard                — top semanal
GET  /api/community/me/xp                      — XP + nível do utilizador
```

---

## 8. Scope e Prioridade

| Componente | Estado | Prioridade |
|-----------|--------|-----------|
| Salas (estrutura base) | ⏳ | 🟡 v1.0 — antes da full release |
| Posts e threads básicos | ⏳ | 🟡 v1.0 |
| Sistema de XP + Níveis | ⏳ | 🟡 v1.0 |
| Badges | ⏳ | 🟡 v1.0 |
| Leaderboard | ⏳ | 🟡 v1.0 |
| Salas premium | ⏳ | 🟡 v1.0 |
| Integração HUB ↔ Comunidade | ⏳ | 🟢 Pós-v1.0 |
| App móvel (Android/iOS) — Comunidade | ⏳ | 🟢 Pós-v1.0 |

> **Decisão de scope (2026-03-23):** A Comunidade é a **última feature grande** antes da full release pública. Após a sua implementação, entramos em **beta testing**, recolhemos feedback e só depois fazemos a full release.

---

## Notas de Implementação

- Prompts Codex a criar: **P11.1–P11.5** (quando chegar a altura)
- A gamificação deve ser **leve e não obrigatória** — nunca bloquear acesso a conteúdo por falta de XP (excepto salas premium que já requerem role PREMIUM)
- O sistema de XP é **acumulativo** — não há punição por inactividade (só bónus por actividade)
- As salas públicas são visíveis para `visitor` mas requerem autenticação para participar
