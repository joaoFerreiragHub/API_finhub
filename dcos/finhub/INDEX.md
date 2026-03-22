# FinHub — Fonte de Verdade

> Esta pasta (`docs/finhub/`) é a **única fonte de verdade** do projeto.
> Os `dcos/` dentro de `API_finhub/` e `FinHub-Vite/` são arquivo histórico — não editar.

---

## Documentos

| Ficheiro | Conteúdo |
|----------|---------|
| [TASKS.md](./TASKS.md) | Backlog priorizado — o que fazer a seguir |
| [PROMPTS_EXECUCAO.md](./PROMPTS_EXECUCAO.md) | Prompts prontos a passar ao Codex, com relatório obrigatório |
| [ROADMAP.md](./ROADMAP.md) | Fases do projeto e estado de cada uma |
| [DESIGN.md](./DESIGN.md) | Direção visual, referências e plano de execução |
| [FINHUB_DOCUMENTACAO_CRITICA.md](./FINHUB_DOCUMENTACAO_CRITICA.md) | Arquitetura, stack, endpoints, modelos, env vars |
| [SSR_VIKE_FIXES.md](./SSR_VIKE_FIXES.md) | Problemas de SSR + Vike resolvidos: hydration, root singleton, React Router bridge, helmet interop |
| [LAYOUT_NAVIGATION_AUDIT.md](./LAYOUT_NAVIGATION_AUDIT.md) | Auditoria completa de layouts e navegação: inconsistências por tipo de user, headers duplos, sidebars divergentes, proposta de consolidação |

---

## Estado rápido (atualizar aqui)

| Fase | Estado | Nota |
|------|--------|------|
| P1 — Paridade de negócio | ✅ Fechado | |
| P2 — Admin MVP | ✅ Fechado | |
| P3 — Análise Rápida de stocks | ✅ Fechado | Gate PASS: lint 0 erros, 48 suites, smoke 3/3 |
| P4 — Editorial CMS + Moderation | ✅ Fechado | Gate PASS: 16/16 E2E admin + 3/3 smoke |
| P5 — Pré-beta funcional | ✅ Fechado | P5.1-P5.11 todos ✅ — /directory + BrandCard + BrandDetailPage SSR-safe |
| P8 — Elevação UI/UX | 🔄 Em curso | P8.1-P8.4 ✅, P8.7 ✅, P8.8 ✅, P8.9 ✅, P8.10 ✅ (cards+páginas+estados), P8.6 ✅ (FinHubScore snowflake), P8.5 ⏳ (Header redesign) |

**Bugs conhecidos abertos:** todos fechados ✅ — B9/B10/B11/B12/B13 resolvidos em B-FIX-01

**Sequência:** ✅ P4-GATE → P8.6 (em curso) → P5-FIRE → P8.5 → P5-OB → P5-PRICE → **BETA-GATE → beta**

**Última atualização:** 2026-03-22
