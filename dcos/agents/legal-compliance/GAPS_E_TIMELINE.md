# GAPS E TIMELINE — Conformidade GDPR + Legal

**Data:** 17 de Março de 2026  
**Responsável:** finhub-legal  
**Status:** Draft — Requer Aprovação Fundador  

---

## SUMÁRIO EXECUTIVO

FinHub tem **8 gaps críticos** para conformidade GDPR/Legal. **5 são bloqueadores para beta público.** Timeline realista: **20-25 horas de esforço até beta, 35-45 horas até conformidade completa.**

### Quadro de Prioridades

| Prioridade | # Gaps | Esforço | Prazo | Bloqueador? |
|-----------|--------|--------|-------|-----------|
| 🔴 CRÍTICO | 5 | 20-25h | T-2 a T-0 (esta semana) | **SIM** |
| ⚠️ ALTA | 2 | 6-8h | Sprint 1 (próxima semana) | Não, mas recomendado |
| 📋 MÉDIA | 1 | 4-6h | Sprint 2 | Não |

---

## GAPS CRÍTICOS DETALHADOS

### GAP #1: Cookie Banner Não Testado em Produção

**Descrição:** Cookie consent banner existe (UI), mas comportamento em produção **não validado**. PostHog e Ad tracking podem estar ativos **sem consentimento do utilizador**.

**Impacto Legal:** 🔴 **VIOLAÇÃO GERAL** — RGPD Art 7, ePrivacy, LSSI-CE Art 22

**Quem Afeta:** Todos os utilizadores da beta (Portugal + EU)

**Achado:** Código sugere cookie control (`integrationControl`), mas:
- ✅ UI de banner existe (página /cookies)
- ❌ Comportamento real em produção **não documentado**
- ❌ PostHog pode estar ativo antes de consentimento
- ❌ Ad serving para DirectoryEntry **não verificado se respeita consentimento**

**Solução Required:**
```javascript
// src/utils/cookieConsent.ts (exemplo)

export const isCookieConsentGiven = () => {
  const consent = localStorage.getItem('cookie_consent');
  return consent === 'accepted';
};

// src/config/analytics.ts
if (isCookieConsentGiven()) {
  posthog.init(...);
  // Start tracking
}

// src/pages/Layout.tsx ou similar
<CookieBanner 
  onAccept={() => {
    localStorage.setItem('cookie_consent', 'accepted');
    posthog.init(...); // Lazy init
  }}
  onReject={() => {
    localStorage.setItem('cookie_consent', 'rejected');
  }}
/>
```

**Esforço:** 4-6 horas (CTO)
- 1h: Audit do código atual (garantir comportamento real)
- 2h: Implementar cookie banner lazy load + PostHog conditional
- 1h: Testar em staging (accept, reject, revoke)
- 1h: Validar em production
- 0.5h: Documentação

**Timeline:** Esta semana (T-2), antes de qualquer teste de beta público

**Validação:**
```
[ ] Cookie banner exibe no primeiro load
[ ] PostHog NOT initialized até "Accept" clicado
[ ] Consentimento persistido em localStorage
[ ] Rejeição persistida
[ ] Revogação funciona (link em conta)
[ ] Ad tracking respeta consentimento
```

---

### GAP #2: DPIA Não Executada

**Descrição:** Data Protection Impact Assessment obrigatório/recomendado não foi executado. Riscos não formalmente documentados.

**Impacto Legal:** ⚠️ **DEFICIÊNCIA PROCESSUAL** — RGPD Art 35, pode impedir registro em caso de auditoria

**Quem Afeta:** Fundador + operações legais

**Achado:** CONSOLIDADO não menciona DPIA. Avaliação técnica de riscos existe, mas **não formal**.

**Solução Required:** Documento DPIA mínimo (4-6 horas)

```markdown
# DPIA — FinHub

## 1. Descrição do Processamento
- Recolha: Email, nome, topics de interesse
- Armazenagem: MongoDB (EU)
- Processamento: Personalização, moderação, análise
- Destinatários: Fundador + admin, Sentry (errors), PostHog (analytics)

## 2. Necessidade e Legitimidade
- Necessário? SIM — operação de plataforma
- Legal? SIM — consentimento + interesse legítimo (moderação)
- Proporcional? SIM — dados mínimos

## 3. Riscos Identificados
- RISCO #1: Retenção indefinida de logs (mitigado: 2 anos proposto)
- RISCO #2: Análise sem opt-out (mitigado: toggle proposto)
- RISCO #3: Transferência para US (Sentry) (mitigado: SCC ou EU migration)
- RISCO #4: Cookie consent não validado (mitigado: GAP #1)

## 4. Salvaguardas Implementadas
- Encriptação em trânsito (HTTPS)
- Encriptação em repouso (S3, MongoDB)
- Access controls (JWT, rate limiting)
- Audit trail (moderação)
- Deleção de conta disponível

## 5. Consultas
- [PENDENTE] CTO review técnico
- [PENDENTE] Fundador aprovação

## Aprovação
- Legal: [assinado] Data
- CTO: [assinado] Data
- Fundador: [assinado] Data
```

**Responsável:** finhub-legal + CTO

**Timeline:** Esta semana (T-2), antes de beta público

**Validação:**
```
[ ] Documento DPIA criado (dcos/DPIA_FINHUB_2026.md)
[ ] CTO técnico review
[ ] Fundador aprovado
[ ] Assinado por ambos
```

---

### GAP #3: Política de Retenção Não Documentada

**Descrição:** Quanto tempo são retidos dados de utilizadores? Logs? Não há documento oficial. Alguns dados podem ser retidos indefinidamente.

**Impacto Legal:** 🔴 **VIOLAÇÃO RGPD Art 5(1)(e)** — Retenção excessiva

**Quem Afeta:** Todos os utilizadores (direito de deleção, esquecimento)

**Achado:**
- Logs de moderação: Retenção **indefinida** ⚠️
- Logs de acesso: **Não documentado** ⚠️
- Soft-delete: 90 dias, depois hard-delete? **Não garantido** ⚠️
- Analytics: 12 meses? Desconhecido

**Solução Required:** Documento + Implementação

**Fase 1 (Documentação — 2-3 horas):**
```markdown
# Política de Retenção de Dados — FinHub

| Tipo de Dado | Retenção | Justificativa | Elimação |
|---|---|---|---|
| Perfil de utilizador (ativo) | Indefinida | Conta ativa | Deleção manual |
| Perfil de utilizador (deletado) | 90 dias | Recuperação | Hard-delete automático |
| Email verificado | Até deleção | Autenticação | Com perfil |
| Password hash | Até deleção | Autenticação | Com perfil |
| Avatar/media | Até deleção | Armazenagem | Com perfil (S3 cleanup) |
| Portfolio (FIRE) | Até deleção | Utilizador | Com perfil |
| Watchlist | Até deleção | Utilizador | Com perfil |
| **Logs de moderação** | **2 anos** | Justa causa: dispute resolution, compliance | Anonimizar |
| **Logs de acesso (auth)** | **1 ano** | Security audit trail | Anonimizar |
| **Logs de erro (Sentry)** | **90 dias** | Troubleshooting | Automático |
| **Analytics (PostHog)** | **12 meses** | Analytics standard | Automático |
| **Criador artigos/vídeos** | Até deleção criador | Conteúdo | Anonimizar (atribuição) |
| **Comentários de utilizadores** | Até deleção utilizador | Contexto | Anonimizar |
```

**Fase 2 (Implementação — 3-4 horas, Sprint 1):**
- CTO: Criar cleanup jobs (cron) para logs
- CTO: Configurar Sentry/PostHog retenção automática
- CTO: Implementar hard-delete após 90 dias de soft-delete

**Documentação:**
- Atualizar Privacy Policy com secção "Retenção de Dados"
- Referenciar dcos/DATA_RETENTION_POLICY.md

**Timeline:** 
- Documentação: Esta semana (T-1)
- Implementação: Sprint 1 (próxima semana)

**Validação:**
```
[ ] Documento dcos/DATA_RETENTION_POLICY.md criado
[ ] Cleanup job para logs de moderação (2 anos)
[ ] Cleanup job para logs de acesso (1 ano)
[ ] Sentry retenção configurada (90 dias)
[ ] PostHog retenção configurada (12 meses)
[ ] Hard-delete job implementado (90 dias)
```

---

### GAP #4: Export de Dados Não Implementado

**Descrição:** Direito de Portabilidade (RGPD Art 20) não totalmente implementado. Utilizador não consegue exportar seus dados em formato estruturado.

**Impacto Legal:** 🔴 **VIOLAÇÃO RGPD Art 15/20** — Direito de acesso/portabilidade

**Quem Afeta:** Qualquer utilizador que queira sair

**Achado:**
- UI de acesso a dados existe (perfil)
- ❌ Exportação em JSON/CSV **não implementada**
- ❌ Dados históricos (artigos criados, comentários, portfolio) **não acessíveis**

**Solução Required:**

**Endpoint API:**
```
GET /api/account/export

Query params:
- ?format=json (default) ou csv
- ?include=all (default) ou profile,portfolio,watchlist,content,comments

Response:
{
  "profile": { email, name, bio, avatar, preferences },
  "portfolio": [{ id, holdings: [...], scenarios: [...] }],
  "watchlist": [{ symbol, type, added_at }],
  "content": [{ id, type, title, status, created_at }],
  "comments": [{ id, content, post_id, created_at }]
}

Rate limit: 1x per 7 days
Delivery: Email com ZIP download link (válido 7 dias)
```

**Implementação:**
```typescript
// src/routes/account.ts

router.get('/api/account/export', authenticateJWT, async (req, res) => {
  const user = req.user;
  const format = req.query.format || 'json'; // json or csv
  
  try {
    const profile = await User.findById(user.id);
    const portfolio = await Portfolio.find({ userId: user.id });
    const watchlist = await Watchlist.find({ userId: user.id });
    const content = await Content.find({ creatorId: user.id });
    const comments = await Comment.find({ authorId: user.id });
    
    const data = {
      profile: { ...profile, password: undefined },
      portfolio,
      watchlist,
      content,
      comments,
      exportedAt: new Date().toISOString()
    };
    
    if (format === 'json') {
      const zip = new JSZip();
      zip.file('finhub_export.json', JSON.stringify(data, null, 2));
      // Send email com link de download
      await sendExportEmail(user.email, zip);
    } else if (format === 'csv') {
      // CSV export por tabela
    }
    
    res.json({ status: 'export_requested', email: user.email });
  } catch (e) {
    res.status(500).json({ error: 'export_failed' });
  }
});
```

**Esforço:** 6-8 horas (CTO, Sprint 1)
- 2h: Design de endpoint + validação
- 2h: Implementação JSON export
- 1h: CSV export
- 1h: Email delivery + rate limiting
- 1h: Testes

**Timeline:** Sprint 1 (próxima semana)

**Validação:**
```
[ ] Endpoint implementado
[ ] JSON export contém todos os dados
[ ] CSV export estruturado
[ ] Rate limiting (1x/7 dias) implementado
[ ] Email delivery funcionando
[ ] ZIP link expira após 7 dias
[ ] Testes: export/import funciona
```

---

### GAP #5: Breach Response Plan Não Testado

**Descrição:** Plano de resposta a incidente de dados não documentado ou testado. Em caso de breach, FinHub não tem procedimento.

**Impacto Legal:** 🔴 **NÃO CUMPRE RGPD Art 33** — Notificação obrigatória em 72h

**Quem Afeta:** Fundador + utilizadores em caso de incidente

**Achado:**
- Sentry ativo para monitorização ✅
- Rate limiting implementado ✅
- ❌ Plano de resposta **não existe**
- ❌ Template de notificação **não existe**
- ❌ Contatos de autoridades **não documentados**
- ❌ Teste anual de resposta **não realizado**

**Solução Required:** (2-3 horas de documentação, 2-3h de teste/prep)

**Documento:**
```markdown
# Breach Response Plan — FinHub

## 1. Definição
Breach = Acceso não autorizado a dados pessoais

## 2. Detecção
- Sentry alerts (crit level)
- Uptime monitor falha
- Security audit ou report
- Responsável on-call: CTO

## 3. Contenção (IMEDIATO — 0-30 min)
1. Confirmar breach (Sentry logs, Git logs)
2. Desativar acesso do utilizador/admin comprometido
3. Kill sessions active
4. Se possível, isolate database
5. Notificar Fundador

## 4. Análise (0-4h)
1. Sentry: Qual dados foi acedido?
2. Git: Quando foi introduzido (commit)?
3. Scope: Quantos utilizadores?
4. Dados: Email? Password hash? Portfolio?
5. Relatório interno: Achados + causa raiz

## 5. Mitigação (0-24h)
1. Patch aplicado + deployed
2. Dados revertidos se necessário
3. Utilizadores notificados (email abaixo)
4. Password reset sugerido
5. 2FA ativado

## 6. Notificação Legal (0-72h)
**Autoridade:** CNPD (Portugal)
**Quando:** Se dados pessoais em risco alto
**Email:** geral@cnpd.pt
**Informação mínima:**
- Descrição do breach
- Dados afetados
- Número de utilizadores
- Medidas tomadas
- Contato para follow-up

## 7. Comunicação com Utilizadores

**Template Email:**

Subject: ⚠️ Notificação Importante de Segurança — FinHub

Caro [User],

Detectamos um incidente de segurança que pode ter afetado a sua conta FinHub.

**O Quê Aconteceu:**
[Descrição clara, sem jargão]

**O Quê Foi Afetado:**
- Email
- [Outros dados]

**O Que NÃO Foi Afetado:**
- Dados de portfolio (encriptados)
- Dados de terceiros

**O Que Fará FinHub:**
1. [Medidas técnicas]
2. [Medidas de segurança]
3. [Compensação se aplicável]

**O Que Deve Fazer:**
1. Fazer reset de password aqui: [link]
2. Ativar 2FA em [URL]
3. Monitorizar conta para atividade suspeita

**Apoio:**
Contacte support@finhub.io para questões.

Lamento o inconveniente,
FinHub Team

---

## 8. Pós-Incident (1-2 semanas)
1. Análise pós-mortem (Fundador + CTO)
2. Raiz causa identificada
3. Melhorias implementadas
4. Followup CNPD (se notificado)
5. Teste de remediação

## 9. Contatos Emergência
- CTO on-call: [phone]
- Fundador: [phone]
- CNPD: geral@cnpd.pt
- Lawyer: [TBD]

## 10. Teste Anual
- [TODO] Simular breach scenario
- Validar plano
- Atualizar contacts
```

**Responsável:** Legal + CTO

**Timeline:**
- Documentação: Esta semana (T-1) — 2-3 horas
- Teste de simulação: Sprint 2 — 2-3 horas

**Validação:**
```
[ ] Documento dcos/BREACH_RESPONSE_PLAN.md criado
[ ] Contatos CNPD + lawyer documentados
[ ] Template de email preparado
[ ] Simulação de breach realizada
  [ ] Breach detectado em <30 min
  [ ] Resposta iniciada
  [ ] Notificação enviada
  [ ] CNPD notificada (se necessário)
```

---

## GAPS ALTOS (Não-Bloqueadores, Mas Recomendados)

### GAP #6: Encriptação de Campos MongoDB Não Confirmada

**Descrição:** Documentação sugere encriptação disponível, mas não confirmado se **ativada por default**.

**Impacto:** ⚠️ **DEFICIÊNCIA SEGURANÇA** — RGPD Art 32

**Achado:**
- MongoDB Field Level Encryption disponível ✅
- Email, password hash, portfolio dados devem estar encriptados
- ❌ Não confirmado em `src/config/database.ts`

**Solução Required:**
- CTO: Audit de configuração MongoDB
- Se não ativado: Ativar + testar

**Esforço:** 2 horas (CTO, Sprint 1)

---

### GAP #7: Toggle de Opt-Out de Análise Ausente

**Descrição:** Utilizador não consegue recusar análise (PostHog). RGPD Art 21 permite oposição.

**Impacto:** ⚠️ **DEFICIÊNCIA DIREITOS** — RGPD Art 21

**Solução Required:**
- UI: Toggle em `/account/settings` → "Permitir análise de dados"
- Default: OFF (até consentimento)
- Backend: Flag `allowAnalytics` em User model

**Esforço:** 2-3 horas (CTO, Sprint 1)

---

## GAP MÉDIO (Não-Crítico)

### GAP #8: Disclaimers por Ferramenta Não Auditados

**Descrição:** Cada ferramenta (FIRE, Watchlist, REIT, ETF, Crypto) deve ter disclaimer. Não confirmado em UI.

**Impacto:** 📋 **DEFICIÊNCIA LEGAL** — Lei 34/88 (Aviso Financeiro)

**Achado:**
- Página `/aviso-legal` existe ✅
- ❌ Disclaimers por página/ferramenta **não auditados**

**Solução Required:**
- Data & Quality: Audit de cada ferramenta
- Adicionar disclaimers faltantes

**Esforço:** 3-4 horas (Data & Quality, Sprint 2)

---

## TIMELINE CONSOLIDADA

### 🔴 FASE 1 — URGENTE (T-2 a T-0, esta semana)

**Antes de qualquer teste de beta público = Esta semana**

| Gap | Task | Responsável | Esforço | Status |
|-----|------|-------------|--------|--------|
| #1 | Cookie banner testado + PostHog conditional | CTO | 4-6h | ⏳ |
| #2 | DPIA documento + aprovação | Legal + CTO | 4-6h | ⏳ |
| #3 | Política de retenção documentada | Legal | 2-3h | ⏳ |

**Total Fase 1:** 10-15 horas  
**Deadline:** Sexta-feira, 21 de Março, antes de "smoke test de beta público"  
**Bloqueia:** Go/No-Go decision para beta

---

### ⚠️ FASE 2 — SPRINT 1 (próxima semana, 22-28 de Março)

**Paralelo com desenvolvimento técnico (FIRE, P8, etc)**

| Gap | Task | Responsável | Esforço | Status |
|-----|------|-------------|--------|--------|
| #3 | Cleanup jobs implementados (retenção) | CTO | 3-4h | ⏳ |
| #4 | Export endpoint implementado | CTO | 6-8h | ⏳ |
| #5 | Breach response plan testado | Legal + CTO | 2-3h | ⏳ |
| #6 | MongoDB encryption audit + ativar | CTO | 2h | ⏳ |
| #7 | Analytics opt-out toggle | CTO | 2-3h | ⏳ |

**Total Fase 2:** 15-22 horas (Sprint 1, paralelo)

---

### 📋 FASE 3 — SPRINT 2 (semana seguinte, 29-31 de Março)

| Gap | Task | Responsável | Esforço | Status |
|-----|------|-------------|--------|--------|
| #8 | Disclaimers por ferramenta auditados | Data & Quality | 3-4h | ⏳ |

**Total Fase 3:** 3-4 horas

---

## ESFORÇO TOTAL

| Fase | Responsável | Esforço | Critério |
|------|-------------|--------|----------|
| **Fase 1** | CTO (6h) + Legal (6h) | 10-15h | Beta público não pode partir sem isto |
| **Fase 2** | CTO (13h) + Legal (2h) | 15-22h | Compliance completa Sprint 1 |
| **Fase 3** | Data & Quality (3h) | 3-4h | Finalização documentação |
| **TOTAL** | — | **28-41h** | — |

**Breakdown por pessoa:**
- **CTO:** 25-33 horas (Split com P8, FIRE, bugs)
- **Legal:** 8-12 horas
- **Data & Quality:** 3-4 horas

---

## VALIDAÇÕES MÍNIMAS POR FASE

### Fase 1 Checklist
```
[ ] Cookie banner testado em staging
[ ] PostHog NOT initialized sem consentimento
[ ] DPIA documento assinado (Fundador + Legal + CTO)
[ ] Política de retenção documentada em dcos/
[ ] Atualização Privacy Policy com:
    - Retenção de dados
    - Cookie usage
    - Direito de oposição
[ ] Sign-off: CTO + Legal + Fundador
```

### Fase 2 Checklist
```
[ ] Export endpoint testado (JSON + CSV)
[ ] Cleanup jobs implementados + testados
[ ] Breach response plan simulado
[ ] MongoDB encryption ativado
[ ] Analytics toggle em UI
[ ] Privacy Policy atualizada com todos os direitos
```

### Fase 3 Checklist
```
[ ] Disclaimers auditados por ferramenta
[ ] Adicionados onde faltam
[ ] Data & Quality sign-off
```

---

## RISCO E MITIGAÇÃO

### Risco #1: CTO não consegue completar Fase 1 em tempo

**Mitigation:**
- Priorizar: Cookie banner > DPIA > Retenção
- Considerar contractor GDPR specialist para DPIA?
- Paralelizar: Legal faz policy doc enquanto CTO faz código

### Risco #2: Descobrir novo gap durante testes

**Mitigation:**
- Ter "buffer week" antes de beta público
- Smoke test GDPR cada terça (weekly)

### Risco #3: CNPD contactar durante beta (sem compliance completa)

**Mitigation:**
- Documentação proativa (DPIA, retenção policy)
- Resposta rápida a qualquer comunicação

---

## RECOMENDAÇÕES FINAIS

1. **Não atrasar Fase 1** — beta público é go/no-go crítico
2. **Considerar contractor especializado em GDPR** se timeline está apertada (€1-2k para DPIA + audit)
3. **Designar DPO informal** (CTO + Legal fazem check-in trimestral)
4. **Automatizar retenção** — evitar dívida técnica
5. **Teste anual de breach** — colocar em calendar agora

---

## PRÓXIMA REVISÃO

Esta auditoria deve ser revisada após:
- Fase 1 completada (validar compliance)
- Cada novo feature introduzido (privacy impact assessment)
- Mudanças legais (RGPD updates, new PT laws)
- Anualmente (compliance check-in)

---

**Documento preparado por:** finhub-legal  
**Data:** 17 de Março de 2026  
**Próxima revisão:** Após Fase 1 (estimado 21 de Março)