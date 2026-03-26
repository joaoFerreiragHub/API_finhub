# RUNBOOK — Release Pré-Lançamento Público

**Data de reescrita:** 2026-03-26
**Escopo:** API_finhub + FinHub-Vite
**Estado actual:** Todas as features P1–P11 implementadas. Pendente: infra/deploy + acções humanas.

---

## 1. Objectivo

Lista de verificação completa antes de abrir o FinHub ao público geral. Cada gate tem um responsável claro e um critério de PASS/FAIL objectivo.

**Fontes de verdade actuais:**
- `dcos/finhub/TASKS.md` — backlog e estado das features
- `dcos/finhub/AI_CONTEXT.md` — contexto geral e estado
- `dcos/finhub/regras.md` — regras de workflow e checkpoint
- `dcos/finhub/legal/` — documentos RGPD
- `dcos/finhub/MASTER_CONTEXT.md` — lista completa de variáveis de ambiente e stack

---

## 2. GATE A — Acções Humanas Obrigatórias (João)

> Não são código. Nenhum agente pode fazer isto. Têm de estar completas antes de Go/No-Go.

| # | Item | Ficheiro | Estado |
|---|------|----------|--------|
| A1 | **Assinar DPIA** — preencher "Aprovado por" e "Data de aprovação" (secção 8) | `dcos/finhub/legal/DPIA.md` | ⏳ |
| A2 | **Preencher número de telemóvel de emergência** (secção 2 e contactos) | `dcos/finhub/legal/BREACH_RESPONSE_PLAN.md` | ⏳ |
| A3 | **Preencher `[email do fundador]`** em todos os ficheiros legais | `dcos/finhub/legal/DPIA.md` + `BREACH_RESPONSE_PLAN.md` + `POLITICA_RETENCAO_DADOS.md` | ⏳ |
| A4 | **Confirmar identidade legal** — nome completo e NIF para Termos de Serviço e Política de Privacidade | Já nos docs legais mas validar que estão correctos | ⏳ |

---

## 3. GATE B — Infra / Deploy

> Executar no servidor de produção. Confirmar cada item com evidência antes de Go/No-Go.

| # | Item | Como verificar | Estado |
|---|------|---------------|--------|
| B1 | **HTTPS enforced** — redirect HTTP → HTTPS em todas as rotas | `curl -I http://finhub.pt` deve devolver `301`/`302` para HTTPS | ⏳ |
| B2 | **HSTS activo** — `Strict-Transport-Security` no header | `curl -I https://finhub.pt` — verificar header `Strict-Transport-Security` | ⏳ |
| B3 | **MongoDB não exposto publicamente** — porta 27017 fechada externamente | `nmap -p 27017 <IP_servidor>` de máquina exterior → `filtered` | ⏳ |
| B4 | **Backups MongoDB automatizados** — snapshot policy activa | Confirmar schedule no painel MongoDB Atlas ou cron de backup | ⏳ |
| B5 | **Variáveis de ambiente em prod configuradas** — todas as env vars críticas presentes | Correr `npm run test:security:smoke` em prod + verificar lista em `MASTER_CONTEXT.md` | ⏳ |
| B6 | **Logs de erro sem stack traces ao cliente** — Express em prod devolve mensagem genérica | Em prod: fazer request inválido → resposta deve ser `{ "error": "Internal Server Error" }` sem `stack` | ⏳ |
| B7 | **Domínio final configurado** — DNS apontado, certificado TLS válido | Browser sem avisos SSL; `openssl s_client -connect finhub.pt:443` | ⏳ |

---

## 4. GATE C — Variáveis de Ambiente Críticas

> Ver lista completa em `dcos/finhub/FINHUB_DOCUMENTACAO_CRITICA.md`.
> Aqui estão as obrigatórias para o lançamento funcionar.

### Backend (API_finhub/.env)

```
NODE_ENV=production
MONGODB_URI=<uri atlas ou servidor prod>
JWT_SECRET=<string aleatória ≥ 64 chars>
JWT_REFRESH_SECRET=<string aleatória ≥ 64 chars>
ALLOWED_ORIGINS=https://finhub.pt,https://www.finhub.pt
PORT=3000

# Email transaccional (uma das duas)
EMAIL_PROVIDER=resend               # ou sendgrid
EMAIL_RESEND_API_KEY=<chave Resend>
EMAIL_FROM_ADDRESS=noreply@finhub.pt

# Upload de imagens (Cloudinary)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

# RGPD Analytics (PostHog — opcional, skip silencioso se ausente)
POSTHOG_PERSONAL_API_KEY=<personal_api_key>  # para AN-8 (forget-me)
POSTHOG_PROJECT_ID=<project_id>
```

### Frontend (FinHub-Vite — variáveis VITE_*)

```
VITE_API_URL=https://api.finhub.pt
VITE_POSTHOG_KEY=<project_api_key>
VITE_POSTHOG_HOST=https://eu.posthog.com
```

> **Regra:** nenhuma VITE_* deve conter secrets privados — são expostos no bundle. Só chaves públicas.

---

## 5. GATE D — Validações Técnicas (Comandos)

> Correr imediatamente antes do Go/No-Go. Todos devem passar.

### Backend (API_finhub)

```bash
cd API_finhub

# 1. TypeScript sem erros
npm run typecheck

# 2. Dependências sem vulnerabilidades
npm audit

# 3. Runtime security: Helmet, CORS, JWT, rate limiting, logs
npm run test:security:smoke

# 4. Suite técnica completa (scopes, contratos, indexes, perf)
npm run test:technical:smoke
```

### Frontend (FinHub-Vite)

```bash
cd FinHub-Vite

# 1. TypeScript (P1 — sem erros nos ficheiros core)
yarn typecheck:p1

# 2. Build de produção completo
yarn build

# 3. Dependências sem vulnerabilidades
yarn audit --level high

# 4. E2E flows críticos (requer servidor backend a correr)
yarn test:e2e:critical
```

**Critério PASS:** todos os comandos saem com código 0. Qualquer FAIL = NO-GO.

---

## 6. GATE E — Limpeza de Dados Mock e Pré-Launch

> Executar apenas uma vez, no dia de lançamento.

```bash
# Limpar utilizadores/criadores mock de teste visual de cards
cd API_finhub
npm run seed:cards:clean
```

> **Porquê:** 4 criadores `@mock-card-test.finhub` foram usados durante desenvolvimento. Não podem aparecer em produção.

Verificar também:
- [ ] Nenhum artigo/post de teste publicado em produção
- [ ] Salas da comunidade têm nomes/descrições definitivas
- [ ] Categorias de conteúdo correctamente configuradas
- [ ] Admin com credenciais de produção (não as de desenvolvimento)

---

## 7. GATE F — Validação Login / Registo em Produção

> B16 resolvido (2026-03-26 — dev auth opt-in via `VITE_DEV_AUTO_LOGIN`). B15 fix criado, requer validação em prod.

| Item | Descrição | Impacto | Estado |
|------|-----------|---------|--------|
| **B15** | `/login` e `/registar` — validar que páginas carregam correctamente em prod | Alto — fluxo de entrada da plataforma | ⏳ Validar em prod |
| **B16** | Dev mode auth opt-in — resolvido (B16-FIX 2026-03-26) | Só dev mode — não afecta prod | ✅ |

**Acção recomendada:** Após deploy, navegar directamente para `https://finhub.pt/login` e `https://finhub.pt/registar` para confirmar que páginas carregam sem erros.

---

## 8. GATE G — Smoke Tests Operacionais (dia de lançamento)

> Executar manualmente ou com utilizador de teste no ambiente de produção real.

| # | Fluxo | Como testar | Critério PASS |
|---|-------|-------------|--------------|
| G1 | **Registo de novo utilizador** | Ir a `/registar`, criar conta nova | Email de verificação chega; conta activa |
| G2 | **Login** | Ir a `/login` com conta criada | Redirect para homepage autenticada |
| G3 | **Análise rápida de stock** | `/hub/analise-rapida?ticker=AAPL` | FinHubScore e métricas carregam |
| G4 | **Hub de conteúdo** | `/hub/conteudos` | Artigos/vídeos/cursos visíveis |
| G5 | **Cookie banner** | Visitar como visitante | Banner aparece; "Aceitar" activa PostHog; "Recusar" não activa |
| G6 | **PostHog consent** | Aceitar cookies → navegar → PostHog dashboard | Eventos registados correctamente |
| G7 | **Comunidade** | `/comunidade` | Salas listadas; criar post funciona |
| G8 | **Perfil de criador** | `/creators/@username` | Perfil carrega com conteúdo |
| G9 | **FIRE Simulator** | `/ferramentas/fire` | Cálculos e gráficos correctos |
| G10 | **Admin dashboard** | `/admin` com conta admin | Métricas carregam; sem sidebar dupla |

---

## 9. Checklist Opcional (recomendado mas não bloqueante)

| Item | Estado | Prioridade |
|------|--------|------------|
| **CLEANUP-03** — scripts PS1 de fases obsoletas | ✅ Concluído 2026-03-25 — arquivados em `dcos/archive/scripts/` | — |
| **AN-8** — GDPR PostHog forget-me ao encerrar conta | ✅ Concluído 2026-03-25 — `src/lib/posthog.ts` | — |
| **CLEANUP-04** — ficheiros OpenClaw na raiz de `API_finhub/` | ⏳ Prompt em `PROMPTS_EXECUCAO.md` | Baixa |
| **V1.4** — upload Cloudinary real (avatar) | 🟡 Bloqueado — aguarda conta Cloudinary de João | Média |

---

## 10. Template de Evidência

Preencher para cada gate no dia de Go/No-Go:

```
Gate: [letra + número, ex: B3]
Item: [descrição]
Data/hora: [UTC]
Ambiente: [staging / produção]
Comando/acção executada: [exacto]
Resultado: PASS / FAIL
Evidência: [URL, screenshot, log snippet]
Responsável: [nome]
```

---

## 11. Critério Go / No-Go Final

**GO** apenas quando TODOS os itens abaixo estiverem ✅:

| Critério | Responsável | Estado |
|----------|-------------|--------|
| Gate A — Acções humanas (DPIA + contactos) completas | João | ⏳ |
| Gate B — Infra/deploy verificada | João / DevOps | ⏳ |
| Gate C — Variáveis de ambiente configuradas em prod | João | ⏳ |
| Gate D — Todos os comandos técnicos PASS | Claude/Codex | ⏳ |
| Gate E — Dados mock limpos | João | ⏳ |
| Gate F — B15/B16 validados em prod | Teste manual | ⏳ |
| Gate G — Smoke tests operacionais PASS | João | ⏳ |

**Qualquer gate em FAIL = NO-GO.** Resolver e re-verificar antes de abrir ao público.
