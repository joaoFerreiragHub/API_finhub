# P8 Admin UI Pilot — Plano de Execução

*Data: 2026-03-14*

## Objetivo

Usar o painel de admin como piloto para testar a elevação visual descrita em P8_UI_UX_ELEVACAO.md. O admin é usado apenas pela equipa interna, o que elimina o risco de impacto em utilizadores finais.

**Critério de sucesso:** Se o resultado convencer a equipa → aplicar o mesmo padrão ao CreatorDashboard e depois à área pública. Caso contrário → reverter via git.

---

## Estado Atual do Admin

| Aspeto | Estado |
|--------|--------|
| Stack UI | shadcn/ui exclusivo (sem Mantine/PrimeReact) |
| Tipografia | System fonts, sem escala definida |
| Dark mode | Funcional mas fundo ~`#202840` (claro demais) |
| Tabelas | HTML simples, sem sorting/filtering nativo |
| Loading states | Spinner global ou nenhum |
| Formulários | Validação só no submit |
| Mobile | Tabelas com scroll horizontal forçado |
| Sidebar | 11 itens planos sem agrupamento lógico |

---

## Fase 1 — Fundações · ~1 dia

### 1.1 Tipografia: Inter
- Instalar `@fontsource/inter` (pesos 400, 500, 600, 700)
- Importar em `main.tsx` ou `index.css`
- Definir `--font-sans: 'Inter', system-ui, sans-serif` em `:root`
- Aplicar `font-variant-numeric: tabular-nums` a valores numéricos admin

**Ficheiros:** `FinHub-Vite/src/index.css`, `FinHub-Vite/src/main.tsx`

### 1.2 Dark mode mais profundo
Alterar em `index.css` seletor `.dark`:
```css
--background: 222 25% 8%;    /* era ~224 20% 12% */
--card:       222 20% 11%;
--border:     220 15% 18%;   /* bordas mais subtis */
```

**Ficheiros:** `FinHub-Vite/src/index.css`

### 1.3 Espaçamento AdminLayout
- Padding do conteúdo: `px-6 py-8` → `px-8 py-10 lg:px-10`
- Entre secções de página: `space-y-4` → `space-y-6`
- Sidebar: separar grupos com dividers e `py-2` entre grupos

**Ficheiros:** `FinHub-Vite/src/features/admin/layouts/AdminLayout.tsx`

---

## Fase 2 — Tabelas Inteligentes · ~2-3 dias

### 2.1 Componente DataTable reutilizável
- Instalar `@tanstack/react-table`
- Criar `features/admin/components/DataTable.tsx`:
  - Sorting clicável nas colunas
  - Search global
  - Paginação (10/25/50 por página)
  - Checkbox bulk selection integrado
- Piloto: `UsersManagementPage.tsx`
- Se ok → `ContentModerationPage.tsx`, `CreatorsRiskBoardPage.tsx`

### 2.2 Modo card em mobile
- Abaixo de `sm` breakpoint: cada row renderiza como Card
- Card: título/nome bold + 2-3 campos chave + badges + acções (`...`)
- Prop `mobileCard` render function no DataTable

---

## Fase 3 — Dashboard Visual · ~2 dias

### 3.1 KpiCard com sparkline
Criar `features/admin/components/KpiCard.tsx`:
- Valor principal: grande, bold, tabular-nums
- Delta `▲`/`▼` com cor verde/vermelho
- Mini sparkline Recharts (48×24px, últimos 7 dias)
- Aplicar em `AdminDashboardPage.tsx`

### 3.2 Recharts customizado
Para gráficos de actividade no dashboard:
- `linearGradient` fill
- `strokeWidth={2}`, sem grid lines verticais
- `CustomTooltip` com card/border/valor em bold

---

## Fase 4 — Polish UX · ~2 dias

### 4.1 Skeleton loading screens
- `AdminTableSkeleton.tsx` — imita layout de tabela
- `AdminCardSkeleton.tsx` — imita layout de KPI cards
- Substituir spinners por skeletons em todas as páginas admin

### 4.2 Validação inline de formulários
- `react-hook-form` + `zod` com `mode: 'onChange'`
- Erro inline abaixo de cada campo (não só no submit)
- Botão "Confirmar" disabled enquanto inválido

### 4.3 Badges de estado melhorados
Em `RiskSignals.tsx` e todas as páginas:
- `critical`: vermelho sólido
- `high`: laranja/amber
- `medium`: amarelo
- `low`: verde subtil
- Sempre: ícone + texto (não só cor)

---

## Fase 5 — Sidebar · ~0.5 dia

### 5.1 Grupos lógicos + active state
Agrupar 11 itens em 3 grupos com label `text-xs uppercase tracking-wider`:
- **Utilizadores** — Dashboard, Users, Creators
- **Conteúdo** — Content, Editorial, Brands
- **Operações** — Support, Monetization, Operations, Audit, Stats

Active state: `border-l-2 border-primary bg-primary/8` (mais evidente que o atual)

**Ficheiro:** `FinHub-Vite/src/features/admin/components/AdminSidebar.tsx`

---

## Rollout

1. Fase 1 primeiro (sem risco, impacto imediato)
2. Fase 2 piloto só em UsersManagementPage
3. Fases 3-5 em paralelo se possível
4. Checkpoint após Fases 1-3: avaliar se continua ou reverte

## Verificação

- Admin em `localhost:5173/admin` — dark mode e light mode
- DevTools: `font-family` deve mostrar `Inter`
- DevTools responsive 375px: tabela deve virar cards
- Formulário de edição: erro inline ao limpar campo obrigatório
- Dashboard: KPI cards com valores + sparklines visíveis
