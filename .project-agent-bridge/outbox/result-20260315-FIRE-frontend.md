Objectivo: Ligar os blocos whatIf e Monte Carlo ao frontend FIRE com comparacao visual no simulador.

O que foi feito:
- Frontend FinHub-Vite atualizado em `/ferramentas/fire/simulador` com comparacao visual baseline vs ajustado para whatIf (tempo ate FIRE, valor final e rendimento passivo com delta destacado).
- Painel Monte Carlo evoluido com destaque de probabilidade de sucesso, narrativa de horizonte, curva de probabilidade por anos (line chart) e percentis P10/P50/P90 (tempo e valor final).
- Documentacao atualizada em `dcos/P5_FIRE_PORTFOLIO_SIMULATOR.md`, `dcos/audiotira_04.md` e `dcos/regras.md` (Checkpoint de Retoma).

Resultado: review required

Riscos / pendencias:
- `npx tsc --noEmit --project tsconfig.app.json` no frontend continua a falhar por erros pre-existentes fora do escopo FIRE (admin/auth + includes de projeto), conforme limite conhecido do ciclo.
- O contrato atual do backend nao devolve delta de probabilidade baseline vs ajustado para whatIf; a UI mostra a probabilidade do cenario Monte Carlo com nota explicita.

Ficheiros afectados:
- C:\Users\Admin\finhub\nome-do-teu-projeto\src\features\fire\pages\FireSimulatorPage.tsx
- C:\Users\Admin\Documents\GitHub\API_finhub\dcos\P5_FIRE_PORTFOLIO_SIMULATOR.md
- C:\Users\Admin\Documents\GitHub\API_finhub\dcos\audiotira_04.md
- C:\Users\Admin\Documents\GitHub\API_finhub\dcos\regras.md
- C:\Users\Admin\Documents\GitHub\API_finhub\.project-agent-bridge\outbox\result-20260315-FIRE-frontend.md

Validacoes executadas:
- API_finhub: `npm run typecheck` (OK)
- API_finhub: `npm run test:docs:smoke` (OK)
- FinHub-Vite: `npx tsc --noEmit --project tsconfig.app.json` (falhou por erros pre-existentes fora do escopo FIRE; sem erros novos em `FireSimulatorPage.tsx`)

Commit hash:
- Frontend (FinHub-Vite): `241abc3`
- Backend/docs (API_finhub): `0cced85`

Proximo passo:
- Validar visualmente o simulador FIRE em light/dark com dados reais de portfolio e seguir para os 3 bugs criticos P2 apos aprovacao.
