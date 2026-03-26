# DPIA — Data Protection Impact Assessment
# Avaliação de Impacto sobre a Proteção de Dados

**Plataforma:** FinHub
**Data de elaboração:** 2026-03-25
**Versão:** 1.0
**Responsável:** Fundador / Responsável pelo Tratamento
**Revisão seguinte:** 2027-03-25 (anual) ou após alteração significativa ao tratamento
**Base legal:** RGPD Art. 35 — Avaliação de Impacto sobre a Proteção de Dados

---

## 1. Identificação e Contexto

### 1.1 Descrição da plataforma
A FinHub é uma plataforma portuguesa de educação financeira e ferramentas de gestão pessoal. Agrega conteúdo educativo (artigos, vídeos, podcasts, cursos, livros), ferramentas de simulação (FIRE, análise de stocks/ETFs/REITs), uma comunidade de utilizadores (posts, respostas, votos, gamificação XP) e um diretório de recursos financeiros.

### 1.2 Natureza do tratamento
| Dimensão | Detalhe |
|----------|---------|
| **Tipo de dados** | Identificação (nome, email, username), perfil opcional (bio, avatar, tópicos), conteúdo gerado (posts, artigos, comentários), dados de uso (eventos PostHog com consentimento), dados FIRE (portfolios, simulações) |
| **Categorias de titulares** | Utilizadores registados (consumidores de conteúdo, criadores de conteúdo, membros da comunidade) |
| **Volume estimado (beta)** | < 1.000 utilizadores |
| **Volume estimado (v1.0)** | < 10.000 utilizadores |
| **Jurisdições** | Portugal + União Europeia |
| **Tecnologia** | Node.js/Express + MongoDB, React/Vike SSR, PostHog (analytics), Cloudinary (imagens), JWT (autenticação) |

### 1.3 Obrigatoriedade da DPIA
O Art. 35 RGPD exige DPIA quando o tratamento for "suscetível de implicar um elevado risco". A FinHub preenche dois critérios indicativos das orientações WP29/EDPB:
- **Avaliação sistemática de pessoas físicas** (algoritmo de recomendação de conteúdo por tópicos)
- **Dados pessoais tratados em larga escala** (plataforma com utilizadores EU)

**Conclusão:** DPIA obrigatória. ✅

---

## 2. Descrição Detalhada do Tratamento

### 2.1 Dados recolhidos e finalidades

| Dados | Finalidade | Base Legal (RGPD) |
|-------|-----------|-------------------|
| Email, nome, password (hash bcrypt) | Autenticação e gestão de conta | Art. 6(1)(b) — execução de contrato |
| Nome de utilizador, bio, avatar | Perfil público, comunidade | Art. 6(1)(b) — execução de contrato |
| Tópicos de interesse | Personalização de conteúdo (feed "Para Ti") | Art. 6(1)(b) — execução de contrato |
| Posts, respostas, votos na comunidade | Serviço de comunidade | Art. 6(1)(b) — execução de contrato |
| Dados FIRE (rendimentos, despesas, objetivos) | Simulação FIRE pessoal | Art. 6(1)(b) — execução de contrato |
| Eventos de analytics (PostHog) | Melhoria do produto, métricas agregadas | Art. 6(1)(a) — consentimento |
| XP, badges, leaderboard | Gamificação e motivação | Art. 6(1)(b) — execução de contrato |
| Logs de moderação | Segurança e integridade da plataforma | Art. 6(1)(f) — interesse legítimo |
| IP / user-agent (logs de acesso) | Segurança, prevenção de abuso | Art. 6(1)(f) — interesse legítimo |

### 2.2 Fluxo de dados
```
Utilizador → HTTPS → API Express (Portugal/EU) → MongoDB (self-hosted ou Atlas)
                                                 → Cloudinary (avatares — CDN global)
                                                 → PostHog EU (analytics — consentimento)
```

### 2.3 Transferências internacionais
| Destinatário | País | Garantia |
|-------------|------|---------|
| Cloudinary | EUA | SCCs (Standard Contractual Clauses) — DPA disponível |
| PostHog (instância EU) | UE | Sem transferência internacional |

---

## 3. Avaliação de Necessidade e Proporcionalidade

### 3.1 Os dados são necessários?
- **Email:** Necessário para autenticação e comunicação. ✅
- **Nome/username:** Necessário para identificação pública na comunidade. ✅
- **Bio/avatar:** Opcional, fornecido voluntariamente. ✅
- **Tópicos:** Necessário para personalização (funcionalidade core). ✅
- **Analytics:** Consentimento explícito, opt-out disponível em `/conta/definicoes`. ✅
- **Dados FIRE:** Fornecidos voluntariamente para simulação. Não partilhados. ✅

### 3.2 Princípio da minimização
- Campos não essenciais são todos opcionais (bio, avatar, tópicos, redes sociais)
- Passwords nunca armazenadas em plaintext (bcrypt, `select: false`)
- Tokens de reset armazenados como hash (`select: false`)
- Analytics desativados por default para novos utilizadores que rejeitam o banner

### 3.3 Retenção proporcional
Ver documento `POLITICA_RETENCAO_DADOS.md` para prazos detalhados.

---

## 4. Identificação e Avaliação de Riscos

### 4.1 Metodologia
Probabilidade (1-3) × Impacto (1-3) = Risco (1-9)
- **1-3:** Baixo | **4-6:** Médio | **7-9:** Alto

### 4.2 Riscos identificados

| # | Risco | Probabilidade | Impacto | Score | Mitigação |
|---|-------|--------------|---------|-------|-----------|
| R1 | Acesso não autorizado à base de dados (breach) | 2 | 3 | **6** | JWT secrets em env vars, bcrypt, rate limiting, helmet.js, CORS whitelist |
| R2 | Exposição de dados de analytics sem consentimento | 1 | 3 | **3** | PostHog consent-gated (GDPR-01 ✅), CookieBanner com accept/reject, `allowAnalytics` flag |
| R3 | Perda de dados (MongoDB sem backup) | 2 | 3 | **6** | Backups automatizados necessários antes da release pública (ver TASKS.md) |
| R4 | Email em plaintext na BD (sem field-level encryption) | 2 | 2 | **4** | Recomendação: migrar para MongoDB Atlas (AES-256 at-rest) — ver ENCRYPTION_AUDIT.md |
| R5 | Conteúdo FIRE (dados financeiros) exposto | 1 | 3 | **3** | Dados ligados à conta autenticada, sem partilha, HTTPS |
| R6 | XSS via conteúdo gerado (posts markdown) | 2 | 2 | **4** | DOMPurify.sanitize() no frontend + SSR guard implementado |
| R7 | Perfis públicos com PII excessiva | 1 | 2 | **2** | Perfil público só mostra username, bio, avatar — não expõe email |
| R8 | Retenção indefinida de dados de utilizadores eliminados | 2 | 2 | **4** | Política de retenção em implementação — ver POLITICA_RETENCAO_DADOS.md |

### 4.3 Riscos residuais após mitigação
- **R1, R3:** Risco médio — aceitável, com monitorização ativa e plano de resposta (ver BREACH_RESPONSE_PLAN.md)
- **R4:** Risco médio — reduzido após migração para Atlas ou implementação de disk encryption
- **R6, R8:** Risco baixo após mitigações aplicadas

---

## 5. Medidas de Mitigação Implementadas

### 5.1 Técnicas
| Medida | Estado |
|--------|--------|
| HTTPS obrigatório (TLS 1.2+) | ✅ (a confirmar em prod — ver TASKS.md security gate) |
| JWT com secrets em variáveis de ambiente | ✅ — app falha no boot se ausentes |
| bcrypt para passwords (sem plaintext) | ✅ |
| `select: false` em campos sensíveis | ✅ — password, tokens |
| Rate limiting em endpoints críticos | ✅ — auth, perfil, comunidade |
| Helmet.js (CSP, HSTS, X-Frame-Options) | ✅ |
| CORS whitelist explícita | ✅ |
| Cookie banner com accept/reject | ✅ — GDPR-01 |
| PostHog consent-gated | ✅ — GDPR-01 |
| Analytics opt-out em `/conta/definicoes` | ✅ — GDPR-01 |
| Exportação de dados (Art. 20) | ✅ — GET /api/account/export |
| DOMPurify no conteúdo gerado | ✅ |
| MongoDB backups automatizados | ⏳ — pendente antes de release pública |
| Encryption at rest (MongoDB) | ⏳ — migração para Atlas recomendada |

### 5.2 Organizacionais
| Medida | Estado |
|--------|--------|
| Política de retenção de dados | ✅ — ver POLITICA_RETENCAO_DADOS.md |
| Breach Response Plan | ✅ — ver BREACH_RESPONSE_PLAN.md |
| Registo de atividades de tratamento | ✅ — este documento |
| Revisão anual da DPIA | ⏳ — próxima: 2027-03-25 |

---

## 6. Consulta ao Encarregado de Proteção de Dados (EPD)

### 6.1 É necessário EPD?
O Art. 37 RGPD exige EPD obrigatório em três casos:
1. Autoridade ou organismo público — **Não aplicável**
2. Tratamento em grande escala de categorias especiais de dados — **Não aplicável** (sem dados de saúde, origem racial, etc.)
3. Monitorização sistemática em grande escala — **Não aplicável** (analytics com consentimento, não monitorização sistemática)

**Conclusão:** EPD não obrigatório para a FinHub na fase atual. Recomendado rever quando utilizadores > 50.000 ou se introduzir processamento de dados financeiros sensíveis (ex: integração bancária).

### 6.2 Ponto de contacto para assuntos de privacidade
Na ausência de EPD formal, o Fundador/Responsável pelo Tratamento é o ponto de contacto:
- **Email:** [email do fundador — preencher antes de publicar]
- **Assunto RGPD:** indicar "RGPD - [Assunto]" no subject

---

## 7. Decisão Final

### 7.1 O tratamento pode prosseguir?

**SIM**, com as seguintes condições:
1. ✅ Cookie banner e consent-gating do PostHog validados (GDPR-01 concluído)
2. ✅ Exportação de dados implementada (V1.5 concluído)
3. ⚠️ Backups MongoDB automatizados devem ser ativados **antes** da release pública
4. ⚠️ Encryption at rest (MongoDB Atlas) recomendada antes da release pública
5. ⚠️ Política de privacidade e termos de serviço publicados na plataforma

### 7.2 Necessidade de consulta prévia à CNPD?
O Art. 36 RGPD exige consulta prévia à autoridade de controlo quando os riscos residuais são **elevados** e não podem ser mitigados pelo responsável. **Os riscos residuais da FinHub são médios** — consulta prévia não obrigatória.

---

## 8. Aprovação e Controlo

| Campo | Detalhe |
|-------|---------|
| **Elaborado por** | [Nome do fundador] |
| **Data** | 2026-03-25 |
| **Aprovado por** | [Nome do fundador — fundador = responsável pelo tratamento] |
| **Data de aprovação** | [preencher] |
| **Próxima revisão** | 2027-03-25 |
| **Versão** | 1.0 |

---

## 9. Registo de Alterações

| Versão | Data | Autor | Alterações |
|--------|------|-------|-----------|
| 1.0 | 2026-03-25 | Fundador | Versão inicial |
