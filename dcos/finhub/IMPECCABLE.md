# Impeccable — Design Anti-Slop para FinHub

> **Versão instalada:** 21 skills (2026-03-24)
> **Localização:** `~\Documents\GitHub\Riquinho\api\Front\.agents\skills\`
> **Repo:** https://github.com/pbakaus/impeccable
> **Para:** Claude Code e Codex (skills disponíveis em ambos via symlink/universal)

---

## O que é

Impeccable é um conjunto de 21 slash commands que injectam princípios de design no contexto do agente antes de qualquer trabalho de UI. O problema que resolve: sem contexto de design explícito, agentes AI produzem o que o autor chama de "AI slop" — o típico dashboard fintech com Inter font, gradiente purple-to-blue e nested cards que parece igual a toda a concorrência.

**Para o FinHub, isto é crítico.** Somos uma plataforma fintech portuguesa pré-launch onde a qualidade visual afecta directamente a confiança do utilizador e a conversão.

---

## Setup Obrigatório (Uma Vez)

```
/teach-impeccable
```

Este comando faz onboarding do projecto: lê o codebase, descobre padrões de design existentes, e depois faz perguntas sobre audiência, brand personality, e casos de uso. Grava o resultado em `.agents/` para persistência entre sessões.

**Fazer na próxima sessão de frontend.** Sem isto, todos os outros comandos produzem output genérico porque não têm contexto FinHub.

---

## Os 21 Comandos

### Diagnóstico e Avaliação

| Comando | Função | Quando Usar no FinHub |
|---------|--------|----------------------|
| `/audit` | Auditoria completa: a11y, performance, theming, responsivo. Gera relatório com severidade. | Antes de qualquer release. FIRE Simulator, Dashboard |
| `/critique` | Avaliação UX — hierarquia visual, arquitectura de informação, AI slop detection | Revisão de features novas. Stock Detail, Comunidade |
| `/extract` | Identifica padrões repetidos e consolida em componentes/tokens do design system | Após várias features — encontrar o que devia ser componente |

### Estrutura e Layout

| Comando | Função | Quando Usar no FinHub |
|---------|--------|----------------------|
| `/arrange` | Layout, spacing, visual rhythm. Corrige grids monótonos e hierarquia fraca | Qualquer página com múltiplos cards ou tabelas de dados |
| `/distill` | Remove complexidade desnecessária. Simplifica sem perder função | Páginas "pesadas" — detalhes de post da Comunidade, REITs toolkit |
| `/normalize` | Alinha com o design system existente — Shadcn/Radix tokens | Após adicionar componentes novos ou terceiros |
| `/adapt` | Adapta para diferentes ecrãs, dispositivos ou contextos | Mobile responsivo do Dashboard, modo impressão de relatórios |

### Texto e Tipografia

| Comando | Função | Quando Usar no FinHub |
|---------|--------|----------------------|
| `/typeset` | Corrige tipografia: font choices, hierarquia, peso, readability | Qualquer componente com muito texto: artigos, análises, posts |
| `/clarify` | Melhora UX copy, error messages, microcopy, labels | Forms de criação de post, mensagens de erro, empty states |

### Cor e Visual

| Comando | Função | Quando Usar no FinHub |
|---------|--------|----------------------|
| `/colorize` | Adiciona cor estratégica a designs muito cinzentos | **Prioritário:** badges de XP, leaderboard, FinHubScore radar |
| `/bolder` | Amplifica designs demasiado "safe" — aumenta impacto visual | Hero sections, CTAs, landing page |
| `/quieter` | Reduz intensidade em designs demasiado agressivos | Alertas, notificações, se algo ficar demasiado loud |

### Interacção e Movimento

| Comando | Função | Quando Usar no FinHub |
|---------|--------|----------------------|
| `/animate` | Adiciona micro-interactions e motion que melhoram usabilidade | Transições entre páginas, loading states, chart updates |
| `/delight` | Momentos de alegria e personalidade inesperados | Conquistas de XP, primeiro post, frame-work selection |
| `/overdrive` | Implementações tecnicamente ambiciosas — shaders, 60fps, spring physics | FIRE Simulator interactive chart, stock price animations |

### Robustez e Qualidade

| Comando | Função | Quando Usar no FinHub |
|---------|--------|----------------------|
| `/harden` | Error handling, i18n, text overflow, edge cases | **Crítico:** formulários de criação de post, campos de perfil |
| `/onboard` | Onboarding flows, empty states, first-time user experience | Redesign do OnboardingOverlay, empty states de features |
| `/optimize` | Performance: loading speed, rendering, bundle size, animations | Antes de release — LCP, CLS, bundle analysis |
| `/polish` | Final pass antes de ship: alignment, spacing, consistência | Último passo antes de qualquer PR de frontend |

### Meta

| Comando | Função | Quando Usar no FinHub |
|---------|--------|----------------------|
| `/teach-impeccable` | Setup inicial — faz uma vez | Próxima sessão de frontend |
| `/frontend-design` | Skill base com todos os princípios anti-slop — usado internamente pelos outros comandos | Raramente invocado directamente |

---

## Regras FinHub para Impeccable

Estas regras complementam o output do Impeccable com restrições específicas do produto:

### Invioláveis (definidas na P8)
1. **Verde/vermelho NUNCA como cor de UI** — exclusivo para performance financeira (gains/losses)
2. **Números financeiros sempre `tabular-nums`** — classe `.tabular-nums` em todos os valores monetários
3. **Dark mode como padrão profissional** — não optional
4. **Nenhuma animação sem propósito funcional** — especialmente importante com `/animate` e `/delight`

### Referências de Design (contexto para os comandos)
- **TradingView:** tooltips ricos, verde/vermelho como linguagem sagrada de mercado
- **Koyfin:** `data first` (número grande, label pequeno), background quase preto em dark
- **Simply Wall St:** FinHubScore radar proeminente, narrativa antes dos dados brutos
- **Robinhood:** gradient fill nos charts de preço

### Audiência
Utilizadores portugueses de classe média com literacia financeira intermédia. **Confiam mais em interfaces sérias do que em interfaces "modernas"**. Design que pareça de banca → mais credibilidade que design que pareça de startup.

---

## Workflow Recomendado

### Para features novas
```
1. /teach-impeccable  (apenas se não feito ainda)
2. Implementar feature
3. /critique  →  identificar problemas de UX e AI slop
4. /audit  →  a11y e robustez
5. /polish  →  final pass antes de PR
```

### Para redesign/melhoria de feature existente
```
/critique AREA=<feature>   →  diagnóstico
/arrange  →  layout
/typeset  →  tipografia
/colorize →  cor
/polish   →  final
```

### Para preparar release
```
/audit    →  relatório completo de issues
/harden   →  edge cases e error handling
/optimize →  performance
/polish   →  últimos detalhes
```

---

## Prioridades Imediatas

| Prioridade | Comando | Target | Justificação |
|-----------|---------|--------|-------------|
| 🔴 | `/teach-impeccable` | Projecto inteiro | Setup obrigatório — sem isto tudo é genérico |
| 🔴 | `/audit` | FIRE Simulator | A11y + responsivo antes da release |
| 🟡 | `/harden` | Forms de post/perfil | Error handling fintech-grade |
| 🟡 | `/distill` | Página de detalhes de post | Remove complexidade visual |
| 🟡 | `/onboard` | OnboardingOverlay | Redesign orientado por UX |
| 🟡 | `/colorize` | XP badges, leaderboard | Brand identity vs concorrência |

---

## Notas para Codex

Codex **pode invocar** estes comandos directamente via `/nome-do-comando` em sessões Claude Code ou Windsurf. As skills foram instaladas como "universal" (ficheiros Markdown em `.agents/skills/`) o que significa que funcionam em todos os agentes que suportam o formato.

Antes de qualquer sessão de frontend no FinHub, o Codex **deve verificar** se `.agents/skills/teach-impeccable/` existe e se o setup já foi feito (procurar por ficheiro de contexto gerado pelo `/teach-impeccable`). Se não feito, solicitar ao utilizador que corra `/teach-impeccable` primeiro.

**Ficheiros instalados em:** `C:\Users\User\Documents\GitHub\Riquinho\api\Front\.agents\skills\`
