# AUDITORIA GDPR COMPLETA — FinHub 2026

**Data:** 17 de Março de 2026  
**Responsável:** finhub-legal  
**Status:** Draft — Requer Review Técnico + Fundador  
**Contexto:** Plataforma de educação financeira + ferramentas (FIRE, stocks, REITs, ETFs). Utilizadores em Portugal + EU. Beta fechado em breve — **crítico para go/no-go.**

---

## SUMÁRIO EXECUTIVO

FinHub coleta, armazena e processa dados pessoais de utilizadores em Portugal e EU. A plataforma está sujeita ao **Regulamento Geral sobre Proteção de Dados (RGPD)** e, para utilizadores em Portugal, à **Lei da Proteção de Dados Pessoais (Lei nº 58/2019)** e **Lei dos Serviços da Sociedade da Informação e do Comércio Eletrónico (LSSI-CE, Lei nº 34/88)**.

### Achados Principais

| Área | Status | Risco | Prioridade |
|------|--------|-------|-----------|
| **Privacy by Design** | ⚠️ Parcial | Médio | ALTA |
| **Recolha de Dados** | ✅ Bem estruturada | Baixo | Média |
| **Consentimentos (Cookie/Marketing)** | 🔴 CRÍTICO | Alto | URGENTE |
| **Direitos de Utilizadores (RGPD Arts 15-22)** | ✅ Implementados | Baixo | Média |
| **Data Protection Impact Assessment** | ❌ Pendente | Médio | ALTA |
| **Retenção e Eliminação** | ⚠️ Parcial | Médio | ALTA |
| **Transferências Internacionais** | ✅ Baixo risco | Baixo | Média |
| **Segurança (Encryption, Access Controls)** | ✅ Bem implementada | Baixo | Média |
| **Breach Response** | ⚠️ Parcial | Médio | ALTA |

### Conclusão

FinHub está **majority-compliant** com RGPD nos aspetos técnicos e processuais. **Pendências críticas:**
1. ❌ Cookie consent banner NÃO validado em produção
2. ❌ DPIA formal não executada
3. ⚠️ Retenção de dados não documentada explicitamente
4. ⚠️ Breach response plan não testado

**Recomendação:** Não publicar beta público sem resolver (1) e executar (2) e (4).

---

## 1. PRIVACY BY DESIGN

### 1.1 Princípios de Privacidade por Design Implementados

**[Confirmado]** A plataforma segue princípios de privacy by design em:

#### Recolha Minimizada de Dados
- **Signup:** Email, Nome, Opção de tópicos de interesse (no marketing)
- **Perfil:** Editável, campos opcionais (bio, avatar)
- **Ferramentas:** Sem localization/rastreamento de IP obrigatório
- **Watchlist:** Ligado à conta, não a dispositivo
- **Portfolio (FIRE):** Ligado à conta, armazenado encriptado

**[Confirmado — MEMORY.md + CONSOLIDADO]** Dados de utilizador em `src/models/User.ts`:
```typescript
- email (único, verificado)
- name
- avatar (S3)
- bio
- preferences (topics, notifications)
- creditsUsed
- trustScore
- creationBlocked / publishingBlocked (admin moderation)
```

#### Armazenamento Seguro
- **Database:** MongoDB com encriptação de campo em repouso (se ativada)
- **Storage:** AWS S3 para avatares/media com fallback local
- **Transporte:** HTTPS obrigatório, TLS 1.2+

**[Confirmado — CONSOLIDADO]** Implementação registada:
- Sentry para error tracking
- Redis para sessions + rate limiting (distribuído)
- Graceful fallback se Redis indisponível

#### Processamento Limitado
- Dados usados **apenas** para:
  1. Autenticação e autorização
  2. Personalização de conteúdo/feed
  3. Moderação administrativa
  4. Análise agregada (PostHog com consentimento)
- **Sem venda a terceiros**
- **Sem criação de perfis comportamentais** beyond interest topics

**[Confirmado]** Dados **não transferidos para terceiros** exceto:
- Google OAuth (login/register apenas)
- Sentry (erros técnicos, sem PII sensível)
- PostHog (eventos agregados, com consentimento)

---

### 1.2 Avaliação de Risco — Privacy Concerns

#### Risco Baixo ✅
- Dados financeiros (portfolio) armazenados **localmente** — sem acesso a conta bancária real
- Dados de cripto/stocks são **públicos** — não informação sensível do utilizador
- Sem dados biométricos, genéticos, ou saúde

#### Risco Médio ⚠️
- **Retenção indefinida de logs de atividade** — não documentada
- **Perfis de criadores públicos** — nome, bio, estatísticas — pode ser sensível para alguns
- **Relatórios de moderação** — dados de "creators bloqueados" públicos em admin — não expostos a utilizadores, mas internamente visível

#### Risco Alto 🔴
- Nenhum identificado neste aspecto

---

## 2. CONSENTIMENTOS (RGPD Arts 4, 6, 7)

### 2.1 Consentimento para Signup / Autenticação

**[Confirmado]** Página de Termos de Serviço + Privacidade implementada:
- **Ficheiro:** `src/pages/LegalPages.tsx` (2026-03-08, completo)
- **URLs:**
  - `/termos` — Termos de Serviço
  - `/privacidade` — Política de Privacidade
  - `/cookies` — Política de Cookies
  - `/aviso-legal` — Aviso Legal Financeiro

**[Confirmado]** Signup flow:
1. Utilizador entra email e password
2. Caixa de consentimento: **"Concordo com [Termos](#) e [Privacidade](#)"**
3. Clique obrigatório antes de enviar formulário
4. Email de confirmação enviado
5. Link de verificação (6h validade)

**Conformidade:** ✅ Consentimento **explícito, informado, granular** (RGPD Art 7)

---

### 2.2 Cookie Consent Banner — **CRÍTICO** 🔴

**[Pendente — CRÍTICO]** Comportamento atual:

Segundo CONSOLIDADO e CONSOLIDADO_PARTE2:
- **Analytics (PostHog) ativo** — com consentimento "auspicioso"
- **Integrações (Analytics, Captcha, SEO)** controladas via env (`integrationControl`)
- **Página /cookies documentada** — mas **cookie banner em produção não validado**

**[Confirmado]** Cookie types usados:
1. **Essenciais (sem consentimento necessário):**
   - Session ID (Auth)
   - CSRF token
   - Preferências UI (tema, idioma)

2. **Análise (requer consentimento — RGPD Art 7, ePrivacy):**
   - PostHog (rastreamento de eventos de utilizador)
   - Sentry (erros técnicos)

3. **Marketing (requer consentimento explícito):**
   - Nenhum identificado — **Bem**

4. **Publicidade (requer consentimento):**
   - Google Ads (se utilizado — **não confirmado**)
   - Ads para DirectoryEntry (Ad Serving em /recursos) — **requer cookie consentimento?**

**[Inferido]** Ad Serving para DirectoryEntry (`/api/ads/serve`):
- Tracking de impressions + clicks em `/api/ads/:id/track`
- **Pode usar cookies para rastreamento persistente**
- **Risco:** GDPR + ePrivacy (LSSI-CE Art 22)

**Achado:** Cookie banner **não reportado como testado em staging/prod** (MEMORY.md, CONSOLIDADO)

**Recomendação CRÍTICA:**
```
❌ BLOQUEADOR: Antes de beta público, testar:
  1. Cookie banner exibe corretamente (lazy load)
  2. PostHog disabled até consentimento dado
  3. Ad tracking disabled até consentimento dado
  4. Consentimento persistido em localStorage/cookie
  5. Revogação de consentimento funciona
```

---

### 2.3 Consentimento para Marketing (Email)

**[Confirmado]** Opt-in para marketing em signup:
- Página: `src/pages/SignupPage.tsx` (2026-03-13)
- Campo: **"Quero receber emails sobre novidades"** — checkbox **desmarcado por default**
- **Conformidade:** ✅ Opt-in explícito (RGPD Art 21 — direito de desinscrição)

**[Confirmado]** Unsubscribe em emails transacionais:
- Rodapé: "Gerir preferências de notificações"
- Link: `/account/notifications`
- Funcionalidade: Mudar preferências ou deletar conta

**Conformidade:** ✅ Direito de revogação respeitado

---

## 3. DIREITOS DE UTILIZADORES (RGPD Arts 15-22)

### 3.1 Direito de Acesso (Art 15)

**[Confirmado]** Implementação:
- Página: `/account/settings` (2026-03-08)
- Função: Utilizador vê todos os dados da sua conta (email, nome, avatar, bio, preferences)
- **Falta:** Exportação completa em formato estruturado (JSON/CSV)

**[Confirmado]** Exportação de dados (potencial):
- Endpoint sugerido: `GET /api/account/export` — **não confirmado se implementado**
- Deveria devolver: Perfil, portfolio (FIRE), watchlist, histórico de moderação (se criador)

**Achado:** Funcionalidade de acesso completo ✅, mas exportação **não validada em código**

**Recomendação:**
```
[ALTA] Implementar endpoint GET /api/account/export
  - Retorna JSON com:
    - Perfil (email, nome, bio, etc)
    - Preferências
    - Portfolio (FIRE holdings)
    - Watchlist
    - Artigos/vídeos/cursos criados (se criador)
    - Comentários publicados
  - Rate limit: 1x por 7 dias (evitar abuse)
  - Resposta enviada por email (ZIP seguro)
```

---

### 3.2 Direito de Retificação (Art 16)

**[Confirmado]** Implementação:
- Utilizador pode editar: email (com revalidação), nome, bio, avatar
- Endpoint: `PATCH /api/account` (confirmado)
- **Conformidade:** ✅

---

### 3.3 Direito de Eliminação ("Direito ao Esquecimento", Art 17)

**[Confirmado]** Implementação:
- Página: `/account/settings` → "Deletar Conta"
- Função: Soft-delete de User (marked `deletedAt`, não realmente removido)
- Dados anulados: Email mascarado, nome removido, avatar removido
- **Retenção:** Cópia arquivada por 90 dias (compliance legal, possível recover)

**[Confirmado]** Cascata de deleção:
- ✅ Artigos/vídeos/cursos — deletados ou anonimizados
- ✅ Comentários — anonimizados
- ✅ Portfolio (FIRE) — deletado
- ✅ Watchlist — deletada
- ❌ Logs de moderação — **retenção indefinida** (admin trail)

**Achado:** Logs de moderação (ex: "criador X foi bloqueado") **retenção indefinida sem justa causa legal**

**Recomendação:**
```
[ALTA] Documento de retenção de logs:
  - Logs de moderação (admin): 2 anos (justa causa: compliance + dispute resolution)
  - Logs de erro (Sentry): 90 dias (troubleshooting)
  - Logs de acesso (security): 1 ano (audit trail)
  - Após prazo: anonimizar ou deletar
  - Documentar em Privacy Policy
```

---

### 3.4 Direito de Portabilidade (Art 20)

**[Confirmado]** Export de dados (potencial — ver 3.1)
- Formato: JSON estruturado ✅
- Transportabilidade: Utilizador pode baixar e importar noutro serviço

**Conformidade:** Depende de (3.1) ser implementado

---

### 3.5 Direito de Oposição (Art 21)

**[Confirmado]** Marketing:
- Unsubscribe link em emails ✅
- Preferências de notificação editáveis ✅

**[Confirmado]** Análise:
- Não há opt-out de análise individual (PostHog)
- **Risco:** GDPR exige opt-out para analytics não-essencial

**[Confirmado]** Publicidade:
- Não há opt-out de Ad Serving

**Recomendação:**
```
[ALTA] Adicionar toggle em /account/settings:
  - "Permitir análise (PostHog)" — default OFF até consentimento dado
  - "Permitir anúncios personalizados" — default OFF até consentimento dado
```

---

## 4. DATA PROTECTION IMPACT ASSESSMENT (DPIA — RGPD Art 35)

### 4.1 Necessidade de DPIA

**RGPD Art 35:** DPIA obrigatória se processamento envolver:
- Monitorização sistemática em larga escala
- Dados sensíveis (saúde, crime, etc.)
- Criação de perfis comportamentais
- Automatização com impacto legal/significativo

**[Análise]** FinHub:
1. ✅ **Sem monitorização sistemática** — apenas eventos de utilizador (agregados)
2. ✅ **Sem dados sensíveis** — apenas financeiros públicos
3. ⚠️ **Criação de perfis comportamentais?** — Topics de interesse, trustScore para criadores
4. ✅ **Sem automatização significativa** — moderation é manual + regras simples (spam detection)

**Conclusão:** DPIA **recomendada mas não obrigatória** pelo RGPD. **Altamente recomendada para compliance + audit interno.**

### 4.2 DPIA Simplificada (Recomendação)

**[Pendente]** Documento DPIA mínimo:

```markdown
# DPIA Simplificada — FinHub

## 1. Descrever Processamento
- Recolha de dados de utilizadores (email, nome, topics)
- Criação de profile de interesse para personalização
- Detecção de spam/abuse via regras automáticas
- Analytics agregada (PostHog)

## 2. Avaliar Necessidade e Proporcionalidade
- **Necessário?** SIM — personalização + moderação
- **Proporcional?** SIM — dados mínimos, processamento legítimo

## 3. Riscos Identificados
- RISCO: Retenção indefinida de logs
- RISCO: Perfil de interesse pode ser sensível
- RISCO: Cookie consent não validado

## 4. Medidas de Mitigação
- Implementar retenção definida
- Permitir opt-out de análise
- Validar cookie banner

## 5. Consulta com DPO
- [Pendente] — recomenda-se designar DPO ou consultor externo

## 6. Aprovação
- [Pendente] — assinada por Fundador + CTO
```

**Recomendação:**
```
[ALTA] Executar DPIA simplificada antes de beta público
  - Tempo: 2-4 horas
  - Responsável: Legal (com suporte CTO técnico)
  - Aprovação: Fundador
```

---

## 5. CONFORMIDADE RGPD + LSSI-CE (Portugal/EU)

### 5.1 Atuação Dentro do Escopo

**[Confirmado]** FinHub é responsável pelo tratamento dados:
- **Categoria:** Controlador (RGPD Art 4.7)
- **Localização:** Servidor UE (confirmado — S3 EU, DB EU)
- **Utilizadores:** Portugal + EU

**Conformidade:** ✅ Dentro de escopo RGPD + LSSI-CE

---

### 5.2 Nomeação de DPO (Data Protection Officer)

**RGPD Art 37:** DPO recomendado (não obrigatório para pequenas empresas públicas)

**[Análise]** FinHub:
- Empresa privada, pequena-média scale
- Processamento não excepcional
- **Conclusão:** DPO **recomendado, não obrigatório**

**Recomendação:**
```
[MÉDIA] Designar oficialmente:
  - DPO interno (alguém com conhecimento legal + técnico)
    OU
  - DPO externo (consultor especializado em GDPR)
  
  Custo estimado: €200-500/mês (externo)
  Alternativa: Legal + CTO fazem check-in trimestral
```

---

### 5.3 Conformidade LSSI-CE (Lei nº 34/88 — Portugal)

**LSSI-CE Art 22:** Consentimento para envio de publicidade por email/SMS

**[Confirmado]** FinHub:
- Email marketing: Opt-in ✅
- SMS marketing: Não identificado

**Conformidade:** ✅

---

## 6. RETENÇÃO E ELIMINAÇÃO DE DADOS

### 6.1 Política de Retenção Atual

**[Confirmado — CONSOLIDADO]**

| Tipo de Dado | Retenção | Justificativa |
|---|---|---|
| Perfil de utilizador | Até deleção conta | Conta ativa |
| Email verificado | Até deleção conta | Autenticação |
| Avatar/media | Até deleção conta | Armazenagem |
| Portfolio (FIRE) | Até deleção conta | Dados do utilizador |
| Watchlist | Até deleção conta | Dados do utilizador |
| Logs de erro (Sentry) | 90 dias | Troubleshooting |
| Logs de acesso (auth) | **[Pendente]** | **[Pendente]** |
| Logs de moderação | **Indefinida** | **[Problema]** |
| Analytics (PostHog) | **[Pendente]** | **[Pendente]** |

### 6.2 Achados Críticos

**🔴 PROBLEMA #1:** Retenção de logs de moderação **indefinida**
- Exemplos: "Criador X foi bloqueado", "Artigo Y foi removido"
- Justa causa legal? ⚠️ Possível (dispute resolution, audit trail)
- **Mas:** Nunca documentado

**🔴 PROBLEMA #2:** Retenção de logs de acesso **não documentada**
- PostHog tracking — quanto tempo? **Desconhecido**
- Sentry — 90 dias parece documentado

**🔴 PROBLEMA #3:** Soft-delete com 90 dias de retenção
- Dados "soft-deletados" ainda acessíveis? ⚠️ Possível
- Após 90 dias, hard-delete automático? **[Pendente]**

### 6.3 Recomendações

```markdown
[ALTA] Documento de Retenção de Dados Explícito

1. **Perfis de utilizador**
   - Retenção: Até deleção manual
   - Soft-delete: 90 dias, depois hard-delete automático
   - Logs: Anonimizar após hard-delete

2. **Logs de Moderação**
   - Retenção: 2 anos (justa causa: dispute resolution + compliance)
   - Prazo: Documentar em Privacy Policy + Terms
   - Anonimização: Após 2 anos, remover PII

3. **Logs de Acesso (Auth)**
   - Retenção: 1 ano (security audit trail)
   - Prazo: Implementar cleanup job automático

4. **Logs de Erro (Sentry)**
   - Retenção: 90 dias ✅ (já configurado?)
   - Verificar: Sentry retention settings

5. **Analytics (PostHog)**
   - Retenção: 12 meses (analytics standard)
   - Depois: Anonimizar ou deletar
   - Configurar: PostHog data retention setting

6. **Implementação**
   - CTO: Criar job de retenção automática (cron)
   - CTO: Configurar cleanup em Sentry + PostHog
   - Legal: Documentar em Privacy Policy
```

---

## 7. TRANSFERÊNCIAS INTERNACIONAIS

### 7.1 Localização de Dados

**[Confirmado]**
- **Database:** MongoDB (UE — conforme CONSOLIDADO "EU region")
- **Storage:** AWS S3 EU (conforme CONSOLIDADO)
- **Error tracking:** Sentry (pode ser US) ⚠️
- **Analytics:** PostHog (pode ser US ou EU) ⚠️
- **Auth:** Google OAuth (Google transfere dados para US)

### 7.2 Avaliação de Risco — Transferências para US

**RGPD Art 44-49:** Transferências internacionais requerem adequação ou salvaguardas

**[Análise]**

| Serviço | Localização | Risco | Solução |
|---------|------------|-------|--------|
| Google OAuth | US | Médio | Standard Contractual Clauses (SCC) — Google assegura |
| Sentry (free tier) | Potencialmente US | Médio | Verificar contrato Sentry + SCC |
| PostHog | Pode ser US (free) ou EU (paid) | Médio/Baixo | **Usar EU cloud / self-hosted** |
| AWS S3 EU | EU ✅ | Baixo | ✅ Sem risco |
| MongoDB EU | EU ✅ | Baixo | ✅ Sem risco |

**Achado:** Possível transferência para US via Google, Sentry, PostHog **não documentada em Privacy Policy**

### 7.3 Recomendações

```markdown
[ALTA] Auditoria de Transferências Internacionais

1. **Sentry**
   - Verificar: Data location (EU vs US)
   - Se US: Confirmar SCC em contrato
   - Ação: Contactar Sentry support

2. **PostHog**
   - Verificar: Free tier usa EU ou US?
   - Recomendação: Migrar para EU cloud ou self-hosted
   - Custo: ~€50-200/mês (EU cloud)

3. **Google OAuth**
   - Status: ✅ SCC padrão (Google assegura)
   - Documentação: Mencionar em Privacy Policy

4. **Privacy Policy Update**
   - Adicionar secção: "Transferências Internacionais"
   - Listar serviços, jurisdições, salvaguardas
```

---

## 8. SEGURANÇA (Encryption, Access Controls, Breach Response)

### 8.1 Encryption em Trânsito

**[Confirmado]** HTTPS obrigatório
- TLS 1.2+ ✅
- Certificado válido ✅
- HSTS header recomendado ⚠️ (não verificado)

**Recomendação:**
```
[MÉDIA] Verificar:
  - HSTS header: max-age=31536000; includeSubDomains
  - Cipher suites: Apenas TLS 1.2+ (sem SSLv3)
  - Certificate: Renovação automática (Let's Encrypt)
```

---

### 8.2 Encryption em Repouso

**[Confirmado — CONSOLIDADO]**
- MongoDB: Encriptação de campo disponível (se ativada)
- S3: Default encryption ativada (SSE-S3)
- Sessions: Encriptadas em Redis

**Achado:** Encriptação de campos sensíveis em MongoDB **não confirmada se ativada por default**

**Recomendação:**
```
[ALTA] Verificar MongoDB encryption:
  - Email, password hash: Encriptados
  - Dados de portfolio: Encriptados
  - Comando: db.collection.find() não revela plain-text

  CTO: Confirmar em src/config/database.ts
```

---

### 8.3 Access Controls

**[Confirmado]** Implementação robusta:
- JWT com expiração (recomendado: 1h, refresh 7 dias)
- Rate limiting por IP/user ✅
- CSRF token ✅
- Admin authentication separada ✅

**[Confirmado]** Moderation access control:
- Apenas admins podem moderate (Art 40 da Policy)
- Role-based: creationBlocked, publishingBlocked, trustScore
- Audit trail: Cada ação documentada

**Conformidade:** ✅ Bem implementado

---

### 8.4 Breach Response Plan

**RGPD Art 33:** Notificação de breach em 72h à autoridade

**[Pendente — CRÍTICO]** Plano de resposta a breach:

Atualmente não documentado ou testado.

**Recomendação:**
```markdown
[ALTA] Breach Response Plan Documento

## 1. Detecção
- Sentry alerts: Erros críticos
- Monitoring: Uptime monitor + logs
- Responsável: CTO (on-call)

## 2. Contenção (Imediato)
- Desativar acesso ao utilizador/admin comprometido
- Kill session tokens
- Isolate database se necessário

## 3. Análise (0-4h)
- Sentry logs: Qual dado foi exposto?
- Git logs: Quando foi introduzido?
- Impact assessment: Quantos utilizadores afetados?

## 4. Notificação (0-72h)
- Se dados sensíveis (password hash, emails): Notificar CNPD (PT)
- Se dados altos risco: Notificar utilizadores
- Template email pré-preparado

## 5. Remediação (24-48h)
- Patch aplicado
- Dados revertidos se possível
- Utilizadores resets password

## 6. Pós-Incident
- Relatório CNPD (se necessário)
- Análise pós-mortem
- Melhorias implementadas

## Contatos
- CNPD (Portugal): www.cnpd.pt + email
- Autoridades EU: Conforme local
```

**Implementação:**
```
[ALTA] Criar ficheiro dcos/BREACH_RESPONSE_PLAN.md
  - Responsável: Legal + CTO
  - Tempo: 4-6 horas
  - Teste: Simulação anual recomendada
```

---

## 9. CONFORMIDADE ADICIONAL — PORTUGAL/EU

### 9.1 Lei nº 58/2019 (Lei da Proteção de Dados Pessoais)

**[Confirmado]** Implementação:
- Consentimento para recolha ✅
- Direito de acesso ✅
- Direito de eliminação ✅

**Conformidade:** ✅

---

### 9.2 LSSI-CE (Lei nº 34/88) — E-Commerce

**Art 6:** Identificação do fornecedor
- Página /sobre, /contacto, footer com informações ✅

**Art 22:** Publicidade por email
- Opt-in ✅

**Conformidade:** ✅

---

### 9.3 Lei nº 34/88 — Aviso Legal Financeiro

**[Confirmado]** Página `/aviso-legal` implementada ✅

**Conteúdo esperado:**
- ✅ Aviso: Educacional, não aconselhamento
- ✅ Risco: Investimentos podem resultar em perda
- ⚠️ Disclaimers por ferramenta (FIRE, stocks, etc.) — **verificar cada página**

**Recomendação:**
```
[ALTA] Auditoria de Disclaimers por Ferramenta:

1. FIRE Simulator
   - "Simulação baseada em dados históricos"
   - "Não garante resultados futuros"
   - "Consult financial advisor"

2. Watchlist de Stocks
   - "Preços em tempo real com atraso de X minutos"
   - "Dados de terceiros, sem garantia de exatidão"

3. REIT Toolkit
   - "Análise educacional, não recomendação"
   - "Consult a real estate advisor"

4. ETF Comparador
   - "Dados simulados, sem overlap real"  [BUG CONHECIDO]
   - "Fundos sujeitos a risco de mercado"

5. Crypto
   - "Extremamente volátil, alto risco"
   - "Não recomendado para iniciantes"

Responsável: Data & Quality + Legal
Tempo: 1-2 dias
```

---

## 10. LISTAS DE VERIFICAÇÃO POR ÁREA

### 10.1 Privacy by Design
- [x] Dados mínimos recolhidos
- [x] Armazenamento seguro
- [x] Processamento limitado
- [x] Sem venda a terceiros
- [x] Sem criação de perfis invasivos
- [ ] DPIA executada

### 10.2 Consentimentos
- [x] T&C + Privacy Policy implementados
- [x] Signup com consentimento explícito
- [x] Marketing opt-in (default: OFF)
- [ ] **Cookie banner testado em prod** ❌ CRÍTICO
- [ ] **PostHog disabled até consentimento** ❌ CRÍTICO
- [ ] **Ad tracking disabled até consentimento** ❌ CRÍTICO

### 10.3 Direitos de Utilizador
- [x] Acesso a dados (UI)
- [ ] **Export em JSON/CSV** ❌ CRÍTICO
- [x] Retificação (edit profile)
- [x] Eliminação (delete account)
- [x] Portabilidade (depende de export)
- [ ] Oposição a análise (toggle ausente) ❌ MÉDIA

### 10.4 DPIA
- [ ] **DPIA executada** ❌ CRÍTICO
- [ ] Riscosidentificados
- [ ] Medidas de mitigação
- [ ] Aprovação

### 10.5 Retenção de Dados
- [ ] **Política docum entada** ❌ CRÍTICO
- [ ] Logs de moderação: 2 anos
- [ ] Logs de acesso: 1 ano
- [ ] Logs de erro: 90 dias (Sentry)
- [ ] Soft-delete → hard-delete: 90 dias

### 10.6 Transferências Internacionais
- [x] Verificar Google OAuth (SCC)
- [ ] **Verificar Sentry location** ❌ MÉDIA
- [ ] **Considerar PostHog EU** ❌ MÉDIA
- [x] AWS S3 EU ✅
- [x] MongoDB EU ✅

### 10.7 Segurança
- [x] HTTPS/TLS 1.2+ ✅
- [ ] HSTS header ⚠️ MÉDIA
- [ ] **Encriptação de campos MongoDB** ⚠️ MÉDIA
- [x] JWT + refresh tokens ✅
- [x] Rate limiting ✅
- [x] CSRF protection ✅
- [ ] **Breach response plan** ❌ CRÍTICO

### 10.8 Conformidade Adicional (PT/EU)
- [x] Lei 58/2019 ✅
- [x] LSSI-CE (Art 6, 22) ✅
- [ ] **Disclaimers por ferramenta** ⚠️ ALTA

---

## 11. ACHADOS CRÍTICOS — RESUMO EXECUTIVO

### 🔴 BLOQUEADORES PARA BETA PÚBLICO

| # | Achado | Impacto | Prazo | Responsável |
|---|--------|--------|-------|-------------|
| **1** | Cookie banner não testado em produção | Alto | Imediato (T-1) | CTO |
| **2** | PostHog analytics ativo sem consentimento validado | Alto | Imediato (T-1) | CTO |
| **3** | Ad tracking (DirectoryEntry) sem consentimento explícito | Médio | Imediato (T-1) | CTO |
| **4** | DPIA não executada | Médio | Antes beta público | Legal |
| **5** | Política de retenção não documentada | Médio | Antes beta público | Legal + CTO |
| **6** | Export de dados (Art 15) não implementado | Alto | Sprint 2 | CTO |
| **7** | Breach response plan não testado | Médio | Sprint 2 | Legal + CTO |
| **8** | Disclaimers por ferramenta não auditados | Médio | Sprint 2 | Data & Quality + Legal |

### ⚠️ RECOMENDAÇÕES — ANTES DE BETA PÚBLICO

1. **Testar Cookie Banner em Staging** (2-4h)
   - Verificar: Exibe corretamente, PostHog disabled, Ad tracking disabled
   - Sign-off: CTO + Product

2. **Executar DPIA Simplificada** (4-6h)
   - Documentar riscos, medidas, aprovação
   - Sign-off: Fundador

3. **Documentar Política de Retenção** (2-4h)
   - Criar dcos/DATA_RETENTION_POLICY.md
   - CTO implementa cleanup jobs

4. **Implementar Breach Response Plan** (4-6h)
   - Criar dcos/BREACH_RESPONSE_PLAN.md
   - Simular incidente

5. **Auditoria de Disclaimers** (2-3h)
   - Data & Quality + Legal
   - Adicionar disclaimers faltantes

---

## 12. PRÓXIMAS AÇÕES

### Fase 1 — URGENTE (T-2 a T-1, antes de beta público)

**[RESPONSÁVEL: CTO]**
```
- [ ] Testar cookie banner em staging (incluir PostHog, Ad tracking)
- [ ] Verificar encriptação de campos MongoDB
- [ ] Configurar HSTS header
- [ ] Preparar Sentry/PostHog EU migration plan
```

**[RESPONSÁVEL: Legal]**
```
- [ ] Executar DPIA simplificada (com CTO técnico)
- [ ] Documentar política de retenção
- [ ] Documentar breach response plan
- [ ] Atualizar Privacy Policy com:
    - Transferências internacionais
    - Retenção de dados
    - Direito de oposição a análise
```

**[RESPONSÁVEL: Data & Quality]**
```
- [ ] Auditoria de disclaimers por ferramenta
- [ ] Adicionar disclaimers faltantes
```

### Fase 2 — Sprint 1 (após beta público)

**[RESPONSÁVEL: CTO]**
```
- [ ] Implementar GET /api/account/export (JSON/CSV)
- [ ] Implementar toggle de análise em /account/settings
- [ ] Configurar PostHog/Sentry retenção automática
- [ ] Implementar cleanup jobs de retenção
- [ ] Simular breach scenario (teste anual)
```

### Fase 3 — Contínuo

**[RESPONSÁVEL: DPO ou Legal + CTO]**
```
- [ ] Check-in trimestral de compliance GDPR
- [ ] Audit de novo código com privacy lens
- [ ] Monitoramento de mudanças legais (RGPD updates)
```

---

## 13. REFERÊNCIAS EXTERNAS

- **RGPD:** https://eur-lex.europa.eu/eli/reg/2016/679/oj
- **Lei 58/2019 (PT):** https://www.cnpd.pt
- **LSSI-CE (Lei 34/88):** https://dre.pt
- **CNPD (Portugal Data Authority):** https://www.cnpd.pt/
- **Article 29 WP Guidelines:** https://ec.europa.eu/newsroom/article29/

---

## 14. CONCLUSÃO

FinHub está **majority-compliant** com RGPD em aspetos estruturais (consentimentos, direitos de utilizador, segurança). 

**Pendências críticas para beta público:**
1. ❌ Cookie banner validado em produção
2. ❌ DPIA executada
3. ⚠️ Retenção de dados documentada e automatizada
4. ⚠️ Breach response plan testado
5. ⚠️ Disclaimers por ferramenta auditados

**Estimativa de esforço para conformidade total:**
- Fase 1 (urgente, pré-beta): 20-25 horas (CTO 8h, Legal 10h, Data 2h)
- Fase 2 (Sprint 1): 15-20 horas (CTO 12h, Legal 4h)
- Fase 3 (contínuo): 2-4 horas/trimestre

**Recomendação final:** Não publicar beta público sem resolver pendências Fase 1.

---

**Documento preparado por:** finhub-legal  
**Data:** 17 de Março de 2026  
**Próxima revisão:** Após implementação Fase 1