# FinHub — Direção de Design (P8)

> Última atualização: 2026-03-20
> Referência de execução técnica: `API_finhub/dcos/P8_UI_UX_IMPLEMENTACAO_TECNICA.md` (arquivo)

---

## 1. Diagnóstico Atual

| Aspeto | Estado |
|--------|--------|
| Color system | CSS variables HSL, light + dark mode funcional |
| Tipografia | System fonts — sem personalidade, sem escala definida |
| Componentes | shadcn/ui sólido + alguns custom |
| Charts | Recharts out-of-the-box, sem customização visual |
| Animações | CSS puro + Tailwind, sem micro-interações |
| Dark mode | next-themes, persistência em localStorage |
| Responsive | Mobile-first, funcional |
| Bibliotecas UI | PrimeReact + Mantine + shadcn — conflito visual latente |
| Identidade visual | Nenhuma — podia ser qualquer SaaS |

### Problemas críticos
1. **Tipografia genérica** — sem hierarquia forte, sem personalidade
2. **Sem identidade própria** — zero brand personality
3. **Densidade de dados difícil de ler** — métricas financeiras sem clareza
4. **Charts básicos** — não comunicam história, sem tooltips ricos
5. **App estática** — sem micro-interações que dêem feedback ao utilizador
6. **Hierarquia de informação fraca** — o utilizador não sabe onde olhar primeiro
7. **Cor primária fraca** — não é distintiva nem memorável

---

## 2. Referências e o que Roubar

### TradingView — Rei da visualização financeira
- **Paleta:** `#1E1E2E` fundo | `#2962FF` azul elétrico | `#26A69A` verde bullish | `#EF5350` vermelho bearish
- **Tipografia:** Inter (legível em tamanhos pequenos, perfeita para números)
- **Filosofia:** verde/vermelho como linguagem de mercado — sacred, nunca usar para outra coisa
- **O que aplicar:** tooltips contextuais ricos nos charts em vez de tabelas densas

### Koyfin — Bloomberg para retail
- **Paleta:** `#0D1117` fundo | `#1C2333` cards | `#58A6FF` azul primário | `#E6EDF3` texto
- **Filosofia "data first":** número em grande, label pequeno
- **O que aplicar:** `font-variant-numeric: tabular-nums` em todos os valores financeiros; background quase preto no dark mode

### Simply Wall St — Storytelling visual
- **Radar/snowflake chart** como identidade visual das ações
- **Health score proeminente** — "X pontos fortes, Y riscos" antes dos números
- **Cards com gradientes subtis** — profundidade sem peso
- **O que aplicar:** FinHubScore com radar mais proeminente; narrativa antes dos dados brutos

### Robinhood — Democratização do design financeiro
- **Gradient fill** nos charts de preço (area chart sempre)
- **Verde/vermelho APENAS para performance financeira** — disciplina total
- **Celebração de momentos** — primeiro análise feita, primeira watchlist
- **O que aplicar:** gradient fill nos charts; disciplina de cor

### Revolut — Design system de classe mundial
- **Motion design com propósito** — tudo anima por razão, não decoração
- **Glassmorphism real** — background blur + transparência
- **Tipografia expressiva** — títulos grandes e bold, corpo limpo
- **O que aplicar:** glassmorphism nos cards de destaque; headings com mais peso

---

## 3. Decisões de Design

### Paleta de cores

```css
/* Dark mode — mais escuro e profissional */
--background: 222 25% 8%;    /* quase preto, Koyfin-style */
--card: 222 20% 11%;
--border: 220 15% 18%;

/* Mercado — sacred, nunca usar para outra coisa */
--market-bull: #22C55E;      /* verde positivo */
--market-bear: #EF4444;      /* vermelho negativo */
--market-neutral: #94A3B8;   /* cinzento neutro */

/* Charts semânticos */
--chart-1: hsl(217 91% 65%); /* azul */
--chart-2: hsl(160 72% 48%); /* verde */
--chart-3: hsl(38 92% 58%);  /* laranja */
--chart-4: hsl(0 84% 65%);   /* vermelho */
--chart-5: hsl(270 67% 70%); /* violeta */
```

### Tipografia

- **Fonte:** Inter (via `@fontsource/inter`) — pesos 400, 500, 600, 700, 800
- **Números financeiros:** sempre `font-variant-numeric: tabular-nums` (classe `.tabular-nums`)
- **Hierarquia:** headings bold e grandes, body limpo e pequeno

### Componentes principais

| Componente | Direção |
|-----------|---------|
| Header | Navigation limpa, search proeminente, avatar com menu |
| Cards de conteúdo | Gradient subtil no hover, shadow rica, informação densa mas legível |
| Charts | Gradient fill, tooltips ricos com contexto, cores semânticas |
| FinHubScore | Radar chart proeminente, score numérico grande, narrativa curta |
| MetricCard | Número grande + tabular-nums, badge de estado, label pequeno |
| Badges | Estados: `Direto` `Calculado` `N/A` `Sem dado` `Erro` — cores distintas |

---

## 4. Plano de Execução

### Fase 1 — Fundações (sem breaking changes, máximo impacto visual)

```bash
# 1. Instalar Inter
cd FinHub-Vite && npm install @fontsource/inter
```

**Ficheiros a alterar:**
- `src/main.tsx` — imports da fonte Inter
- `src/styles/globals.css` — `--font-sans`, `.tabular-nums`, dark mode mais escuro, chart colors
- `tailwind.config.ts` — `colors.market.*`

**Validação após Fase 1:**
```bash
npx tsc --noEmit --project tsconfig.app.json
npm run dev  # verificar em light + dark mode
```

### Fase 2 — Componentes Críticos

Ordem de prioridade:
1. `MetricCard` — tabular-nums + badge de estado
2. Charts (Recharts wrappers) — gradient fill + tooltips ricos
3. `ArticleCard`, `CourseCard` — gradient hover + shadow
4. `Header` — navegação limpa
5. FinHubScore radar — mais proeminente

### Fase 3 — Páginas (por ordem de impacto)

1. **Homepage** — primeiro impacto para novos utilizadores
2. **Quick Analysis (ação)** — core diferenciador do produto
3. **Hub de conteúdo** — descoberta
4. **Detalhe de artigo/curso** — consumo
5. **Perfil de criador** — confiança e follow
6. **FIRE Dashboard** — ferramenta de envolvimento

---

## 5. Regras Invioláveis

1. **Verde/vermelho só para performance financeira** — nunca para CTAs, estados de UI, validação de formulários
2. **Números financeiros sempre tabular-nums** — sem exceção
3. **Dark mode como padrão profissional** — é a experiência que traders e investidores esperam
4. **Remover progressivamente PrimeReact e Mantine** — consolidar tudo em shadcn/Radix
5. **Nenhuma animação sem propósito** — animar apenas onde dá feedback ao utilizador

---

## 6. Ferramentas para Gerar Layouts

Para explorar designs antes de implementar:
- **v0.dev** — gerar componentes React com Tailwind
- **Google Stitch** — prototipar interfaces rapidamente
- **Figma** — design system e handoff
- **shadcn/ui blocks** — blocos pré-construídos como ponto de partida

**Fluxo sugerido:** gerar no v0/Stitch → ajustar no Figma → implementar com referência ao spec técnico
