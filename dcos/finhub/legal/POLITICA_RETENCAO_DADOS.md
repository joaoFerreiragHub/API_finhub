# Política de Retenção de Dados — FinHub

**Versão:** 1.0
**Data:** 2026-03-25
**Base legal:** RGPD Art. 5(1)(e) — Limitação da Conservação
**Revisão seguinte:** 2027-03-25 (anual)

---

## 1. Objetivo e Âmbito

Esta política define os prazos máximos de conservação de dados pessoais tratados pela FinHub, em conformidade com o princípio da **limitação da conservação** (RGPD Art. 5(1)(e)): os dados pessoais devem ser conservados de forma a permitir a identificação dos titulares apenas durante o período necessário para as finalidades para que são tratados.

Aplica-se a todos os dados pessoais recolhidos e tratados pela plataforma FinHub, incluindo dados de utilizadores registados, conteúdo gerado, logs de sistema e dados de analytics.

---

## 2. Categorias de Dados e Prazos de Retenção

### 2.1 Dados de Conta e Perfil

| Dado | Prazo de Retenção | Fundamento | Eliminação |
|------|------------------|-----------|-----------|
| Email, nome, username, password hash | Duração da conta + **30 dias** após eliminação | Necessário para execução do contrato | Eliminação automática no processo de encerramento de conta |
| Bio, avatar, links sociais | Duração da conta + **30 dias** | Opcional, fornecido pelo utilizador | Eliminação automática |
| Tópicos de interesse | Duração da conta + **30 dias** | Personalização (contrato) | Eliminação automática |
| Histórico de sessões / JWT | **30 dias** após expiração do token | Segurança | Rotação automática por expiração |
| Token de reset de password | **1 hora** após geração | Segurança | Expiração automática (campo `passwordResetTokenExpiresAt`) |
| Token de verificação de email | **24 horas** após geração | Segurança | Expiração automática (campo `emailVerificationTokenExpiresAt`) |

### 2.2 Conteúdo Gerado pelo Utilizador

| Dado | Prazo de Retenção | Fundamento | Eliminação |
|------|------------------|-----------|-----------|
| Artigos, vídeos, cursos publicados | Duração da conta + **90 dias** | Integridade do conteúdo público | Manual/automatizada após encerramento |
| Posts e respostas na Comunidade | Duração da conta + **90 dias** | Integridade das discussões | Manual/automatizada |
| Votos na Comunidade | Duração da conta | Integridade do sistema de votos | Eliminação automática |
| XP e badges | Duração da conta | Gamificação (contrato) | Eliminação automática |
| Histórico do leaderboard semanal | **12 meses** (janela de visibilidade) | Gamificação | Eliminação automática após janela |

### 2.3 Dados de Ferramentas Financeiras

| Dado | Prazo de Retenção | Fundamento | Eliminação |
|------|------------------|-----------|-----------|
| Portfolios FIRE (rendimentos, despesas, objetivos) | Duração da conta + **30 dias** | Fornecido voluntariamente (contrato) | Eliminação automática |
| Watchlists de stocks/ETFs/REITs | Duração da conta + **30 dias** | Fornecido voluntariamente (contrato) | Eliminação automática |

### 2.4 Analytics e Telemetria

| Dado | Prazo de Retenção | Fundamento | Eliminação |
|------|------------------|-----------|-----------|
| Eventos PostHog (apenas com consentimento) | **12 meses** | Melhoria do produto (consentimento) | Configurar retenção no PostHog dashboard |
| Logs de eventos de analytics internos | **90 dias** | Diagnóstico técnico | Rotação automática de logs |

### 2.5 Logs de Segurança e Moderação

| Dado | Prazo de Retenção | Fundamento | Eliminação |
|------|------------------|-----------|-----------|
| Logs de acesso (IP, user-agent, endpoint) | **90 dias** | Segurança e prevenção de abuso (interesse legítimo) | Rotação automática de logs |
| Logs de moderação (ações de admin sobre conteúdo) | **2 anos** | Responsabilização e auditoria (interesse legítimo) | Eliminação manual ou automatizada |
| Logs de audit de admin (AdminAuditLog) | **2 anos** | Responsabilização interna | Eliminação manual ou automatizada |
| Eventos de moderação de conteúdo (ContentModerationEvent) | **1 ano** | Conformidade e auditoria | Eliminação manual |
| Reports de conteúdo (ContentReport) | **1 ano** após resolução | Integridade da plataforma | Eliminação manual |
| Apelaçoes de moderação (ModerationAppeal) | **1 ano** após resolução | Direito de recurso do utilizador | Eliminação manual |

### 2.6 Dados de Eliminação de Conta

| Dado | Prazo de Retenção | Fundamento |
|------|------------------|-----------|
| Registo mínimo de que conta existiu (ID anonimizado, data criação/eliminação) | **3 anos** | Prevenção de fraude, contabilidade |
| Dados pessoais identificáveis | **30 dias** após pedido de eliminação | Período de graça para reversão acidental |

---

## 3. Processo de Eliminação de Conta

Quando um utilizador solicita a eliminação da conta (via `DELETE /api/account/me`):

1. **Imediato:** Conta marcada como `accountStatus: 'deleted'`, acesso bloqueado
2. **30 dias:** Período de graça — utilizador pode reativar mediante contacto
3. **Após 30 dias:**
   - Dados pessoais identificáveis eliminados (`email`, `name`, `lastName`, `bio`, `avatar`, `socialLinks`)
   - Conteúdo público (artigos, posts) anonimizado ou eliminado conforme configuração
   - XP, badges, portfolios eliminados
4. **Registo residual anonimizado** (`_id`, `createdAt`, `deletedAt`) mantido 3 anos para integridade referencial e prevenção de fraude

---

## 4. Direito de Eliminação (Art. 17 RGPD — "Direito a ser Esquecido")

O utilizador pode solicitar eliminação dos seus dados a qualquer momento:
- **Método 1:** Via plataforma — botão "Eliminar Conta" em `/conta/definicoes`
- **Método 2:** Via email para [email do fundador] com assunto "RGPD — Eliminação de Dados"

**Prazo de resposta:** 30 dias (Art. 12 RGPD), extensível 2 meses em casos complexos.

**Exceções ao direito de eliminação:**
- Dados necessários para cumprimento de obrigações legais
- Dados necessários para exercício ou defesa de direitos em processos judiciais
- Logs de moderação relativos a violações graves das regras da plataforma (interesse legítimo de segurança)

---

## 5. Exportação de Dados (Art. 20 RGPD — Portabilidade)

O utilizador pode exportar todos os seus dados a qualquer momento:
- **Método:** Botão "Exportar os meus dados" em `/conta/definicoes`
- **Formato:** JSON estruturado
- **Rate limit:** 1 exportação por semana (proteção contra abuso)
- **Conteúdo:** perfil, artigos/vídeos criados, posts da comunidade, dados de analytics, data da exportação

---

## 6. Backups e Retenção em Backup

Os backups de base de dados podem conter dados além dos prazos acima. Política de backups:
- **Retenção de backups:** Máximo **30 dias** (backups diários, rotação automática)
- **Acesso a backups:** Restrito ao fundador/administrador técnico
- **Eliminação em backup:** Dados eliminados da BD principal são removidos dos backups após ciclo de rotação natural (máximo 30 dias)

> ⚠️ **Nota:** Backups automatizados ainda não configurados em produção (ver TASKS.md — security gate). Implementar antes da release pública.

---

## 7. Responsabilidades

| Responsável | Função |
|-------------|--------|
| Fundador | Responsável pelo tratamento; aprovação da política; decisões de eliminação manual |
| Codex/Claude (desenvolvimento) | Implementação técnica dos mecanismos de eliminação e retenção |
| CNPD | Autoridade de controlo — contactar em caso de dúvida ou incidente |

---

## 8. Registo de Alterações

| Versão | Data | Autor | Alterações |
|--------|------|-------|-----------|
| 1.0 | 2026-03-25 | Fundador | Versão inicial |
