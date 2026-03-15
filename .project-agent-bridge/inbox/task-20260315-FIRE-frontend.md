# TASK PACKET — CTO → Codex
**ID:** task-20260315-FIRE-frontend
**Data:** 2026-03-15
**De:** Orchestrator
**Para:** CTO → Codex
**Estado:** created
**Prioridade:** 1 (máxima)

---

## ANTES DE COMEÇAR — OBRIGATÓRIO

1. Ler `dcos/regras.md` — Checkpoint de Retoma
2. Verificar `git status` em ambos os repos
3. Se existirem alterações locais sem commit (backend whatIf + Monte Carlo): commitar com mensagem `feat(p5-fire): add whatIf and Monte Carlo simulation to backend` antes de avançar

---

## Objectivo

Ligar no frontend FIRE os blocos `whatIf` e `monteCarlo` com comparação visual.
O backend já está completo e validado (commit `bbca1f5`). Falta apenas a camada de UI.

---

## Contexto

O `POST /api/portfolio/:id/simulate` já aceita e devolve:

**whatIf:**
```json
{
  "whatIf": {
    "contributionDelta": 200,
    "annualReturnShock": -0.02,
    "inflationShock": 0.01,
    "scenario": "base"
  }
}
```
Resposta inclui `whatIf.baseline`, `whatIf.adjusted`, `whatIf.delta`

**monteCarlo:**
```json
{
  "monteCarlo": {
    "enabled": true,
    "scenario": "base",
    "simulations": 1000
  }
}
```
Resposta inclui `monteCarlo.successProbabilityPct`, percentis (P10/P50/P90), curva anual de probabilidade por horizonte

---

## Ficheiros a ler primeiro

1. `dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md` — spec completa do simulador
2. `dcos/regras.md` — regras operacionais
3. `FinHub-Vite/src/features/tools/fire/` — estrutura frontend actual (perceber o que já existe)
4. Endpoint `POST /api/portfolio/:id/simulate` no backend — confirmar contrato de resposta actual

> ⚠️ CORRECÇÃO DE PATH: O repositório frontend **não** está em `C:\Users\Admin\Documents\GitHub\FinHub-Vite`.
> O caminho correcto é: **`C:\Users\Admin\hub2-vite`**
> Nome do package: `hub2-vite`
> Usar sempre este path para o frontend.

---

## O que entregar

### 1. Painel whatIf — Comparação visual baseline vs ajustado
- Controlos para ajustar: `contributionDelta` (slider ou input numérico), `annualReturnShock` (%), `inflationShock` (%)
- Mostrar lado a lado (ou em toggle): baseline vs cenário ajustado
- Mostrar delta claro: quanto muda o tempo até FIRE, valor final projetado, probabilidade

### 2. Painel Monte Carlo — Curva de probabilidade
- Gráfico de linha: eixo X = anos, eixo Y = probabilidade de atingir FIRE (%)
- Mostrar percentis P10 / P50 / P90 de tempo para FIRE e valor final
- `successProbabilityPct` em destaque (número grande, com contexto)
- Legenda explicativa: "X% de probabilidade de atingir FIRE em Y anos com este cenário"

### 3. Integração no fluxo existente
- Integrar no simulador existente em `/ferramentas/fire/simulador`
- Não quebrar o fluxo de cenários (optimistic/base/conservative/bear) já entregue
- Pode ser como tab adicional, secção expansível, ou botão "ver análise avançada"

---

## Restrições críticas

- Usar CSS variables do design system: `bg-card`, `border-border`, `text-muted-foreground`, `text-foreground`
- **Nunca** hardcodes: `bg-white`, `text-gray-900`, `border-gray-100`
- Tudo funciona em light E dark mode — referência visual: `FinHub-Vite/src/features/markets/pages/ReitsToolkitPage.tsx`
- Não alterar lógica de negócio do backend
- Não reverter trabalho existente
- **Não corrigir erros TypeScript fora do escopo desta tarefa** (existem 175 erros pré-existentes — ignorar)

---

## Definition of done

- [ ] UI whatIf renderiza comparação baseline vs ajustado com os 3 parâmetros de choque
- [ ] UI Monte Carlo renderiza curva de probabilidade por horizonte e percentis
- [ ] Ambos integrados no `/ferramentas/fire/simulador` sem quebrar cenários existentes
- [ ] Light mode e dark mode funcionais
- [ ] `npm run typecheck` (backend) sem novos erros
- [ ] `npx tsc --noEmit --project tsconfig.app.json` (frontend) sem novos erros introduzidos por esta tarefa
- [ ] `dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md` actualizado com o que foi entregue
- [ ] `dcos/regras.md` Checkpoint de Retoma actualizado com data, estado git, commit e próximo passo
- [ ] Commit: `feat(p5-fire): add whatIf and Monte Carlo visual to FIRE frontend`
- [ ] Push para ambos os repos

---

## Validações obrigatórias

```bash
# Backend (em API_finhub/)
npm run typecheck

# Frontend (em FinHub-Vite/)
npx tsc --noEmit --project tsconfig.app.json

# Documentação
npm run test:docs:smoke
```

---

## Formato de handoff de volta

Quando concluído, criar ficheiro em `.project-agent-bridge/outbox/result-20260315-FIRE-frontend.md` com:

```
Objectivo: [qual era]
O que foi feito: [resumo factual]
Resultado: [draft / review required / approved]
Riscos / pendências: [o que falta, o que pode falhar]
Ficheiros afectados: [lista]
Validações executadas: [typecheck, build, etc.]
Commit hash: [hash]
Próximo passo: [o que deve acontecer a seguir]
```

---

## Próximas tarefas (após este ciclo fechar)

**Prioridade 2 — 3 bugs críticos:**
1. Crypto market cap: `price × circulatingSupply` em vez de `quoteVolume`
2. ETF overlap: adicionar disclaimer "Dados simulados — não representam posições reais"
3. Watchlist batching: confirmar se frontend já usa `GET /api/stocks/batch-snapshot` ou ainda faz N chamadas paralelas

Task packets para estes 3 bugs serão enviados após handoff deste ciclo.
