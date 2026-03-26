# FinHub — Auditoria de Ficheiros e Pastas

> **Data:** 2026-03-22
> **Scope:** API_finhub (backend) + FinHub-Vite (frontend)
> **Objectivo:** identificar o que pode ser eliminado, arquivado, ou reorganizado sem risco.

**Legenda:** 🔴 Eliminar | 📦 Arquivar | 📁 Mover/Reorganizar | 🔍 Rever | ✅ Manter

---

## API_finhub (Backend)

### 🔴 ELIMINAR — Seguro, sem impacto

| Ficheiro | Porquê |
|----------|--------|
| `debug.log` | Log de crash do Chrome/Chromium (Windows "access denied"), 387 bytes. Artefacto de sistema, não do projecto. |
| `.tmp-p3-server.err.log` | Log temporário do dev server (Mar 20). Warnings de Sentry, Redis, Mongoose — estão resolvidos. |
| `.tmp-p3-server.out.log` | Stdout do dev server (Mar 20). Mensagens de startup. Estale. |

---

### 📦 ARQUIVAR — Mover para `dcos/archive/scripts/`

| Ficheiro | Porquê |
|----------|--------|
| `generate-content-types.js` | Script one-time para gerar ficheiros de serviço/controller/routes por substituição de string no template do Article. Já foi consumido (os ficheiros existem). Não está referenciado no `package.json`. Não é runtime. |
| `seed-http.js` | Seeding via HTTP (criar users, artigos, vídeos via API calls). 310 linhas. Foi substituído pelos scripts TypeScript em `src/scripts/` (seed.ts, seedCreatorCardsMock.ts, seedFireMock.ts) que são mais robustos. Só 1 commit no histórico. |

---

### 📁 MOVER — Para `dcos/finhub/`

| Ficheiro | Destino | Porquê |
|----------|---------|--------|
| `RSS_SETUP.md` | `dcos/finhub/RSS_SETUP.md` | Documentação de setup dos feeds RSS portugueses (InfoMoney, ECO, etc.). Feature activa mas o MD pertence à pasta de docs, não à raíz. |
| `SEED_GUIDE.md` | `dcos/finhub/SEED_GUIDE.md` | Guia de seeding da DB (102 linhas). Referencia seed-http.js que já está a ser arquivado — actualizar para apontar para seed.ts. |

---

### 🔍 REVER — Scripts provavelmente obsoletos (fase-específicos)

Estes scripts em `scripts/` estão no `package.json` mas parecem amarrados a fases já encerradas. Verificar se ainda fazem sentido:

| Script | Suspeita |
|--------|---------|
| `scripts/pre-p1-smoke.ps1` | "pre-p1" — sugere pré-Fase 1, que já terminou |
| `scripts/moderation-pre-release-smoke.ps1` | Smoke de pré-release de moderação (P4) — já foi concluída |
| `scripts/release-e2e-required-flows.ps1` | Flows de E2E de uma release específica |
| `scripts/o3-final-audit.ps1` | "o3-final-audit" — sugere auditoria de uma fase (O3?) já encerrada |

> **Acção sugerida:** confirmar se `npm run test:pre-p1`, `npm run test:moderation:pre-release`, etc. ainda passam e se fazem sentido no contexto actual. Se não → eliminar ou mover para `dcos/archive/scripts/`.

---

### ✅ MANTER — Ficheiros de infraestrutura de agentes

Estes ficheiros são usados pelo sistema OpenClaw/multi-agent e não devem ser tocados:

| Ficheiro/Pasta | Função |
|----------------|--------|
| `HEARTBEAT.md` | Template para tarefas periódicas de automação |
| `IDENTITY.md` | Persona "Boyo" — carregado por agentes no startup |
| `AGENTS.md` | Instruções master para agentes (213 linhas) |
| `SOUL.md` | Valores e limites do agente |
| `USER.md` | Perfil do utilizador (João Ferreira, timezone, contexto) |
| `TOOLS.md` | Config local de ambiente (câmeras, SSH, TTS) |
| `memory/` | Logs diários e memória de longo prazo dos agentes |
| `.project-agent-bridge/` | Sistema de passagem de mensagens entre agentes |

---

### ✅ MANTER — Ficheiros de projecto activos

| Ficheiro/Pasta | Função |
|----------------|--------|
| `docker-compose.yml` | Só backend (MongoDB + Redis + API) |
| `docker-compose.fullstack.yml` | Full stack com frontend |
| `openapi/openapi.json` | Contrato da API (40KB, gerado) |
| `scripts/validate-openapi.js` | Validação do contrato |
| `scripts/quick-metrics-sector-coverage.js` | Cobertura de sectores |
| `scripts/test-route-contracts.ts` | Contratos de rotas |
| `scripts/test-admin-scope-contract.ts` | Contratos de scopes admin |
| `scripts/security-config-smoke.js` | Smoke de segurança |
| `scripts/perf-index-smoke.js` | Smoke de performance |
| Restantes scripts activos | Ver package.json |

---

## FinHub-Vite (Frontend)

### 🔴 ELIMINAR — Seguro, sem impacto

#### Ficheiros de config duplicados/legacy

| Ficheiro | Porquê |
|----------|--------|
| `vite.config.js` | Duplicado do `vite.config.ts`. Falta configuração SSR (`noExternal`). O `.ts` é o correcto e activo. |
| `vite-plugin-ssr.config.js` | Config da versão legacy do plugin SSR. Substituído pelo `vike.config.js`. Deixar este ficheiro pode causar conflito. |

#### Logs de desenvolvimento (artefactos temporários)

Todos estes ficheiros são outputs de runs de dev/CI. Nenhum é código:

| Ficheiro |
|----------|
| `tmp_audit_out.log` |
| `tmp_audit_err.log` |
| `tmp_check_out.log` |
| `tmp_check_err.log` |
| `tmp_ssr_out.log` |
| `tmp_ssr_err.log` |
| `tmp_vike_dev_out.log` |
| `tmp_vike_dev_err.log` |
| `vite-articles-out.log` |
| `vite-articles-err.log` |
| `vite-dashboard-out.log` |
| `vite-dashboard-err.log` |

#### Pasta vazia

| Pasta | Porquê |
|-------|--------|
| `src/config/` | Pasta completamente vazia. Nunca foi populada. |

#### Ficheiros `.d.ts` órfãos (sem `.tsx` correspondente)

| Ficheiro | Situação |
|----------|----------|
| `src/features/creators/components/contentManagement/announcements/index.page.d.ts` | Sem `.tsx` correspondente |
| `src/features/hub/books/components/CommentSection/Comment.d.ts` | Sem `.tsx` correspondente |
| `src/features/hub/books/components/CommentSection/index.d.ts` | Sem `.tsx` correspondente |
| `src/features/hub/books/components/CommentSection/Reply.d.ts` | Sem `.tsx` correspondente |

---

### 📦 ARQUIVAR — Um-time utility

| Ficheiro | Porquê |
|----------|--------|
| `create-placeholder-pages.sh` | Script de scaffolding que criou páginas +Page.tsx em lote. Já foi usado. Não está referenciado no `package.json`. Não é runtime. |

---

### 🔍 REVER / DOCUMENTAR — Pastas vazias em features

Estas pastas existem mas estão completamente vazias. São provavelmente placeholders para features futuras:

| Pasta | Provável intenção |
|-------|-------------------|
| `src/features/social/chat/` | Chat entre utilizadores (pós-v1.0?) |
| `src/features/social/feed/` | Feed social (existe lógica mas não componentes?) |
| `src/features/social/forums/` | Fóruns de discussão (pós-v1.0?) |
| `src/features/tools/investments/` | Ferramentas de investimento (pós-v1.0?) |
| `src/features/tools/personal-finance/` | Ferramentas de finanças pessoais (pós-v1.0?) |
| `src/features/tools/portfolio/` | Gestor de portfolio (pós-v1.0?) |
| `src/features/home/components/` | Vai ser populado pelo P9.2 |
| `src/features/home/hooks/` | Vai ser populado pelo P9.2 |
| `src/features/home/pages/` | Vai ser populado pelo P9.2 |
| `src/features/learn/components/` | Componentes de aprendizagem |
| `src/features/learn/hooks/` | Hooks de aprendizagem |
| `src/features/content/components/` | Componentes de conteúdo |
| `src/features/content/hooks/` | Hooks de conteúdo |

> **Acção sugerida:** as pastas de `home/` ficarão populadas após P9.2. As restantes (social/chat, forums, tools) são features pós-v1.0 — ou documentar no TASKS.md ou eliminar as pastas vazias para manter o projecto limpo.

---

### 🔍 REVER — Features muito pequenas (possível fusão)

| Feature | Ficheiros | Situação |
|---------|-----------|----------|
| `src/features/pricing/` | 2 ficheiros (PricingPage.tsx + index.ts) | Poderia viver em `src/features/platform/` ou `src/features/home/` |
| `src/features/ads/` | 3 ficheiros (PublicAdSlot.tsx + usePublicAds.ts + publicAdsService.ts) | Poderia viver em `src/features/platform/` |

> Não é urgente — funcionam como estão. Mas se houver uma ronda de reorganização faz sentido consolidar.

---

### ✅ MANTER — Estratégia de TypeScript multi-tsconfig

O projecto usa uma abordagem intencional de tiered typecheck:

- `tsconfig.p1.json` → verifica apenas features prioritárias (hub, social, auth, components) — é o gate de CI
- `tsconfig.app.json` → typecheck completo
- `tsconfig.node.json` → config do Vite
- `tsconfig.jest.json` → testes

**Não tocar.** Esta estratégia é deliberada e mantém o CI rápido enquanto o typecheck completo pode ter erros conhecidos em áreas em desenvolvimento.

---

## Resumo de Acções — Por Prioridade

### Alta (seguro e imediato)
- [ ] Eliminar logs temporários: `debug.log`, `.tmp-*.log` em API_finhub (3 ficheiros)
- [ ] Eliminar logs de dev: todos os `tmp_*.log` e `vite-*.log` em FinHub-Vite (~12 ficheiros)
- [ ] Eliminar `vite.config.js` (duplicado do .ts)
- [ ] Eliminar `vite-plugin-ssr.config.js` (legacy)
- [ ] Eliminar `src/config/` (pasta vazia)

### Média (reorganização)
- [ ] Arquivar `generate-content-types.js` → `dcos/archive/scripts/`
- [ ] Arquivar `seed-http.js` → `dcos/archive/scripts/`
- [ ] Mover `RSS_SETUP.md` → `dcos/finhub/RSS_SETUP.md`
- [ ] Mover `SEED_GUIDE.md` → `dcos/finhub/SEED_GUIDE.md` (e actualizar referências)
- [ ] Arquivar `create-placeholder-pages.sh`
- [ ] Eliminar 4 ficheiros `.d.ts` órfãos

### Baixa (discussão / decisão de produto)
- [ ] Rever scripts PS1 fase-específicos em `scripts/` (pre-p1, moderation-pre-release, etc.)
- [ ] Decidir destino das pastas vazias de features futuras (documentar ou eliminar)
- [ ] Avaliar se `pricing/` e `ads/` devem ser consolidados noutra feature

---

> **Nota:** nenhuma acção desta lista afecta código de produção ou funcionalidade activa. São todos ficheiros periféricos, temporários ou legados.
