# Roadmap para BETA — FinHub

Data: 2026-03-06
Objetivo: chegar a um beta teste fechado com grupo pequeno de utilizadores reais.

---

## Principio

Construir em ondas. Cada onda e autonoma — pode-se lancar beta no fim de qualquer onda a partir da 2. Quanto mais ondas se completam, mais impressionante e o beta.

---

## Estado atual

O FinHub tem infraestrutura tecnica solida:
- 37 modelos MongoDB, auth JWT com refresh, admin com 22 scopes
- 5 ferramentas de mercado (Stocks, REITs, ETFs, Crypto, Watchlist)
- Sistema de conteudo (BaseContent + 6 tipos), comments universais, ratings, follows
- Moderacao completa (auto-mod, reports, trust scoring, bulk moderation, audit trail)
- Editorial CMS, claims, surface controls (feature flags)
- Frontend com 71 rotas definidas (80+ paginas placeholder)

Falta a **camada operacional** para utilizadores reais: email, legal, storage, paginas publicas funcionais, bugs criticos corrigidos.

---

## Onda 1 — Fundacao (sem isto, nao ha beta)

**Estimativa: ~20-25 dias**
**Fontes:** `P5-PRE-BETA` (60%) + `P4-MODERATION` (100%) + `P5-FERRAMENTAS` (15%)

### 1.1 Infraestrutura operacional (P5-PRE-BETA)

| # | Item | Tipo | Detalhe |
|---|------|------|---------|
| 1 | Servico de email transacional | Blocker | Resend/SendGrid — verificacao, reset, notificacoes |
| 2 | Password reset flow | Blocker | Token temporario + pagina de reset |
| 3 | Verificacao de email | Blocker | Enviar link, validar, bloquear acoes sem verificacao |
| 4 | Disclaimer financeiro | Blocker | Banner permanente: "Isto nao e aconselhamento financeiro" |
| 5 | Termos de servico | Blocker | Pagina estatica + aceite no registo |
| 6 | Politica de privacidade | Blocker | Pagina estatica conforme RGPD |
| 7 | Cookie consent | Blocker | Banner + gestao de preferencias |
| 8 | S3 / object storage | Blocker | Upload de imagens (avatares, conteudo) |
| 9 | Sentry (error tracking) | Blocker | Monitoring de erros em producao |
| 10 | Docker + CI basico | Blocker | Deploy reprodutivel |

### 1.2 Moderation hardening (P4-MODERATION)

| # | Item | Tipo | Detalhe |
|---|------|------|---------|
| 11 | Remover dev tokens | Blocker | Substituir `dev-*` por JWT real em todos os fluxos |
| 12 | E2E tests de moderacao | Blocker | Fluxos criticos: report → review → action → appeal |
| 13 | Rate limiter Redis validado | Blocker | Confirmar que rate limits funcionam em producao |
| 14 | Runbooks operacionais | Blocker | Procedimentos para incidentes de moderacao |

### 1.3 Bug fixes criticos (P5-FERRAMENTAS)

| # | Item | Bug | Impacto |
|---|------|-----|---------|
| 15 | Crypto market cap | Usa `quoteVolume` em vez de `price × circulatingSupply` | Dados errados visiveis |
| 16 | ETF overlap disclaimer | Dados de overlap sao simulados, nao reais | Utilizador pensa que sao reais |
| 17 | Watchlist batch API | N chamadas paralelas (1 por ticker) em vez de batch | Performance e rate limits FMP |

**Resultado da Onda 1:** Plataforma funcional, segura e legal. Utilizadores podem registar-se, verificar email, fazer reset password. Ferramentas sem bugs criticos. Moderacao pronta para producao.

---

## Onda 2 — Conteudo + Criadores (o supply side)

**Estimativa: ~12-15 dias**
**Fontes:** `P5-CRIADORES` Fase 1 (50%) + `P5-PRE-BETA` (25%)

### 2.1 Backend de criadores (P5-CRIADORES)

| # | Item | Detalhe |
|---|------|---------|
| 18 | Model + CRUD Reels | Conteudo curto (video <60s) — discriminator de BaseContent |
| 19 | Model + CRUD Playlists | Colecoes ordenadas de conteudo |
| 20 | Model + CRUD Announcements | Posts curtos sem ser artigo completo |
| 21 | Model CreatorFiles | Ficheiros para download (PDFs, spreadsheets) |
| 22 | Endpoint publico `/api/creators` | Listagem publica com filtros (categoria, seguidores, rating) |
| 23 | Campos User model | `contentVisibility`, `typeOfContent`, `specialties` |
| 24 | Import URL externo | oEmbed para YouTube/Spotify/outros — criadores trazem conteudo existente |

### 2.2 Paginas publicas minimas (P5-PRE-BETA)

| # | Item | Detalhe |
|---|------|---------|
| 25 | Pagina Explore / Discover | Conteudo organizado por tipo, trending, recente |
| 26 | Detalhe artigo/video/curso | Pagina publica com comments, rating, related |
| 27 | Listagem de criadores | Grid com filtros, search, ordenacao |
| 28 | Perfil publico do criador | Bio, conteudo, stats, follow |
| 29 | Creator dashboard MVP | Painel minimo: os meus conteudos, stats basicos, criar/editar |

**Resultado da Onda 2:** Criadores podem publicar conteudo, ter perfil publico. Utilizadores podem descobrir e consumir conteudo. O marketplace tem oferta e procura.

**BETA MINIMO VIAVEL = Onda 1 + Onda 2 (~35-40 dias)**

---

## Onda 3 — Diferenciacao (o que torna o FinHub unico)

**Estimativa: ~10-15 dias**
**Fontes:** `P5-FERRAMENTAS` (25%) + `P5-EDUCACAO` Fase 1 (30%) + `P5-MARCAS` Fase 1 (30%)

### 3.1 Quick wins nas ferramentas (P5-FERRAMENTAS)

| # | Item | Detalhe |
|---|------|---------|
| 30 | Calculadora juros compostos | Standalone, sem dependencias — alto valor percebido |
| 31 | 24h% em crypto e watchlist | Variacao 24h visivel (ja temos dados, falta mostrar) |
| 32 | Expense ratio em ETF | Mostrar custo anual do ETF (campo ja disponivel no FMP) |
| 33 | Sorting em watchlist/crypto | Ordenar por preco, variacao, nome |
| 34 | Data quality badge | Indicador de confianca dos dados em cada analise |

### 3.2 Camada educativa basica (P5-EDUCACAO)

| # | Item | Detalhe |
|---|------|---------|
| 35 | Glossario financeiro | ~100 termos essenciais com explicacao simples + avancada |
| 36 | Tooltips contextuais | Icone (?) nas metricas das ferramentas → explicacao inline |
| 37 | Micro-tips "Sabias que..." | Tips aleatorios em sidebars/loading states |

### 3.3 Directorio publico (P5-MARCAS)

| # | Item | Detalhe |
|---|------|---------|
| 38 | API publica DirectoryEntry | GET listagem + detalhe (sem auth) |
| 39 | Pagina index directorio | Lista de entidades por vertical (corretoras, seguradoras, etc.) |
| 40 | Pagina detalhe entidade | Info, reviews, ratings, comments |

**Resultado da Onda 3:** Ferramentas mais completas, plataforma educa, directorio contextualiza o ecossistema. Diferencia claramente do Reddit e foruns.

**BETA IDEAL = Onda 1 + 2 + 3 (~50-55 dias)**

---

## Onda 4 — Wow factor (se houver tempo)

**Estimativa: ~8-10 dias**
**Fonte:** `P5-FIRE` Fase 1 (40%)

| # | Item | Detalhe |
|---|------|---------|
| 41 | Model Portfolio + PortfolioHolding | CRUD de portfolio com holdings |
| 42 | Asset search via FMP | Pesquisar e adicionar ativos ao portfolio |
| 43 | Simulacao FIRE (3 cenarios) | Optimista/base/conservador com Monte Carlo simplificado |
| 44 | Graficos de projecao | Area chart com cenarios, composicao donut |
| 45 | Milestone tracker | "Ja tens X% do objetivo FIRE" |

**Resultado da Onda 4:** Feature flagship que nenhum concorrente PT tem. Forte para marketing e word-of-mouth.

**BETA IMPRESSIONANTE = Onda 1 + 2 + 3 + 4 (~60-65 dias)**

---

## Pos-BETA (so apos validar com utilizadores reais)

| P5 | Prioridade pos-beta | Razao para esperar |
|----|--------------------|--------------------|
| **P5-COMUNIDADE** | 1a (apos ter base de users) | Comunidade sem massa critica e um deserto. Lancar quando houver ~50+ users ativos |
| **P5-CONTEXTO** | 2a | Market Pulse e diferenciador mas nao blocker. Validar se users querem isto |
| **P5-ACCOUNTABILITY** | 3a | Gamificacao sem engagement base e decoracao. Adicionar quando loops core estiverem validados |
| **P5-CRIADORES** Fases 2-3 | Continuo | Onboarding, analytics, scheduling, wallet — iterar com feedback de criadores reais |
| **P5-MARCAS** Fases 2-4 | Quando houver revenue | Campanhas, self-service, affiliates — so com modelo de negocio validado |
| **P5-FERRAMENTAS** resto | Continuo | Screener, DCA calc, tax calc, broker comparator — priorizar por feedback |
| **P5-EDUCACAO** Fases 2-3 | 4a | Learning paths, quizzes — quando houver conteudo de criadores suficiente |
| **P4.3-4.5 BACKOFFICE** | Quando monetizar | Premium, subscricoes, analytics avancados — so com receita real |
| **P5-HUB-PESSOAL** | Ultima | Visao V2 — precisa de FIRE + ferramentas V1 + feedback real para desenhar bem |

---

## Dependencias entre ondas

```
Onda 1 (Fundacao)
  └─→ Onda 2 (Conteudo)     — precisa de email, S3, auth funcional
       └─→ Onda 3 (Diferenciacao) — precisa de paginas publicas
            └─→ Onda 4 (FIRE)     — standalone, so precisa de auth

Pos-beta:
  Comunidade ← precisa de base de users
  Contexto   ← standalone mas melhor com comunidade
  Account.   ← precisa de FIRE + educacao + comunidade
  Hub V2     ← precisa de tudo acima validado
```

---

## Criterios de go/no-go para BETA

Antes de convidar utilizadores, confirmar:

| Criterio | Validacao |
|----------|----------|
| Email funciona | Enviar verificacao + reset a 5 emails de teste |
| Auth robusto | Login, logout, refresh, token expiry — 0 falhas |
| Disclaimer legal | Visivel em todas as paginas de ferramentas |
| Termos + privacidade | Paginas acessiveis, aceite no registo |
| Moderacao | Report → review → action testado end-to-end |
| Dev tokens removidos | 0 tokens `dev-*` em producao |
| Dados corretos | Crypto marketcap correto, ETF disclaimer visivel |
| Error tracking | Sentry a capturar erros em staging |
| Performance | Paginas carregam em <3s, ferramentas em <5s |
| Mobile responsive | Layout funcional em mobile (nao precisa de ser perfeito) |

---

## Metricas de sucesso do BETA

| Metrica | Target | Como medir |
|---------|--------|-----------|
| Registos | 20-50 users | Count no DB |
| Retencao D7 | >40% | Users que voltam apos 7 dias |
| Ferramentas usadas | >3 analises/user | Logs de API |
| Conteudo consumido | >5 artigos lidos/user | Page views |
| NPS | >30 | Survey pos-beta |
| Bugs criticos | 0 | Sentry + feedback |
| Feedback qualitativo | "O que falta?" | Survey aberto |

---

## Notas finais

1. **As ondas sao sequenciais mas itens dentro de cada onda podem ser paralelos** — backend e frontend podem avancar em paralelo.
2. **Nao construir o que nao se vai testar** — se o beta nao vai ter criadores reais, reduzir Onda 2 ao minimo.
3. **Feedback > features** — melhor lancar beta com menos features e iterar do que lancar "completo" e descobrir que ninguem usa metade.
4. **Cada P5 tem fases internas** — so a Fase 1 de cada e relevante para beta. Fases 2+ sao pos-beta.
5. **Estimativas sao para 1 developer focado** — com equipa, dividir proporcionalmente.
