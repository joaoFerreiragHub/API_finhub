# Breach Response Plan — Plano de Resposta a Violações de Dados

**Plataforma:** FinHub
**Versão:** 1.0
**Data:** 2026-03-25
**Base legal:** RGPD Art. 33 (notificação à CNPD), Art. 34 (notificação aos titulares)
**Revisão seguinte:** 2027-03-25 (anual) ou após incidente real

---

## ⚡ CARTÃO DE RESPOSTA RÁPIDA — ler primeiro em caso de incidente

```
1. DETETAR  → Confirmar e isolar o incidente (< 1h)
2. AVALIAR  → É notificável? (< 2h após deteção)
3. CONTER   → Minimizar dano imediato (< 4h)
4. NOTIFICAR CNPD → Se notificável: DENTRO DE 72H a partir do momento de conhecimento
5. NOTIFICAR UTILIZADORES → Se risco elevado: sem atraso injustificado
6. DOCUMENTAR → Registar tudo, mesmo não notificável
7. REMEDIAR → Corrigir causa raiz, rever processos
```

**Contactos de emergência:**
| Entidade | Contacto |
|----------|---------|
| **CNPD** (autoridade de controlo PT) | 📞 +351 213 928 400 |
| **CNPD email** | 📧 geral@cnpd.pt |
| **CNPD notificação online** | 🌐 https://www.cnpd.pt/formularios/ |
| **CNPD morada** | Av. D. Carlos I, 134, 1.º — 1200-651 Lisboa |
| **Fundador FinHub** | [preencher — número de telemóvel de emergência] |

---

## 1. Definições

**Violação de dados pessoais:** qualquer violação de segurança que provoque, de modo acidental ou ilícito, a destruição, a perda, a alteração, a divulgação ou o acesso não autorizado a dados pessoais transmitidos, conservados ou sujeitos a qualquer outro tipo de tratamento (RGPD Art. 4(12)).

**Tipos de violação:**
- **Confidencialidade:** acesso ou divulgação não autorizada (ex: base de dados exposta, breach de API)
- **Integridade:** alteração não autorizada (ex: dados de utilizadores modificados por atacante)
- **Disponibilidade:** perda ou destruição (ex: ransomware, corrupção de backup)

---

## 2. Deteção e Triagem

### 2.1 Fontes de deteção possíveis
- Alertas automáticos de monitorização (logs de servidor, MongoDB)
- Relatório de utilizador (email para [email do fundador])
- Descoberta interna durante desenvolvimento/manutenção
- Notificação de terceiro (ex: investigador de segurança, parceiro)
- Disclosure público (ex: publicação em fórum/rede social)

### 2.2 Classificação de severidade inicial

| Severidade | Descrição | Exemplos |
|-----------|-----------|---------|
| 🔴 **CRÍTICA** | Exposição confirmada de dados de muitos utilizadores | Base de dados MongoDB exposta publicamente, credenciais comprometidas em massa |
| 🟠 **ALTA** | Exposição provável ou acesso não autorizado confirmado | JWT secret comprometido, acesso indevido a dados de utilizador específico |
| 🟡 **MÉDIA** | Exposição possível mas não confirmada, impacto limitado | Tentativa de breach bloqueada, vulnerabilidade descoberta sem exploração confirmada |
| 🟢 **BAIXA** | Sem exposição de dados pessoais, incidente técnico interno | Log de erros com dados de diagnóstico, bug sem acesso externo |

---

## 3. Processo de Resposta Passo a Passo

### FASE 1 — Contenção Imediata (0-4 horas)

**Objetivo:** Parar o sangramento. Não destruir evidências.

- [ ] **Confirmar** se o incidente é real (não é falso positivo)
- [ ] **Isolar** o sistema afetado se possível (ex: revogar chaves API, colocar serviço em manutenção)
- [ ] **Não eliminar** logs ou dados comprometidos — são evidências
- [ ] **Revogar** tokens JWT suspeitos se aplicável (alterar `JWT_SECRET` em último recurso — invalida TODAS as sessões)
- [ ] **Bloquear** IP(s) suspeitos via firewall/rate limiter
- [ ] **Preservar** screenshots, logs, timestamps de tudo o que foi encontrado
- [ ] **Alertar** o fundador imediatamente (mesmo fora de horas)

**Ações técnicas específicas por cenário:**

| Cenário | Ação imediata |
|---------|--------------|
| MongoDB exposta publicamente | Fechar porta 27017, revogar credenciais, verificar dados acedidos nos logs |
| JWT_SECRET comprometido | Rodar secret → invalida todas as sessões → utilizadores fazem login novamente |
| Cloudinary comprometido | Revogar API keys no dashboard Cloudinary, alterar `CLOUDINARY_API_SECRET` |
| Credenciais de utilizador em plaintext expostas (não deve acontecer — passwords são hash) | Investigar como ocorreu, forçar reset de passwords |
| PostHog data breach | Contactar PostHog, verificar scope do acesso |

---

### FASE 2 — Avaliação (0-6 horas após contenção)

**Objetivo:** Determinar o que foi exposto, para quem, e se é notificável.

**Perguntas obrigatórias:**

1. **Que dados foram afetados?**
   - Apenas dados técnicos (logs sem PII)? → Provavelmente não notificável
   - Emails, nomes, bios, passwords hash? → Potencialmente notificável
   - Dados FIRE (portfolios financeiros)? → Notificável
   - Tokens de sessão válidos? → Notificável (risco de acesso à conta)

2. **Quantos utilizadores afetados?**
   - 1-10 utilizadores específicos → Severidade alta mas scope limitado
   - > 100 utilizadores → Notificação CNPD quase certa

3. **O incidente ainda está ativo ou foi contido?**

4. **Há risco elevado para os titulares?**
   - Risco elevado = provável prejuízo físico, material ou imaterial: discriminação, roubo de identidade, fraude financeira, danos de reputação, perda de controlo sobre os seus dados

### 2.1 Árvore de decisão de notificação

```
Houve violação de dados pessoais?
├── NÃO → Documentar internamente, sem notificação obrigatória
└── SIM → É suscetível de implicar risco para os direitos/liberdades dos titulares?
           ├── NÃO (ex: dados encriptados inacessíveis, backup redundante disponível)
           │     → Documentar internamente (registo de violações Art. 33(5))
           │       NÃO é necessário notificar CNPD
           └── SIM → NOTIFICAR CNPD em 72 horas (Art. 33)
                      O risco é elevado para os titulares?
                      ├── NÃO → Apenas CNPD
                      └── SIM → CNPD + TITULARES AFETADOS (Art. 34)
```

---

### FASE 3 — Notificação à CNPD (se aplicável — prazo: 72h)

**Base legal:** RGPD Art. 33 — O responsável pelo tratamento notifica a autoridade de controlo competente sem demora injustificada e, se possível, até 72 horas após ter tido conhecimento da violação.

> ⚠️ As 72 horas contam **a partir do momento em que o responsável teve conhecimento** do incidente — não a partir do momento em que ocorreu.

> ⚠️ Se não for possível notificar dentro das 72 horas, a notificação deve ser feita assim que possível **com justificação do atraso**.

#### 3.1 Canal de notificação CNPD
- **Preferencial:** Portal online — https://www.cnpd.pt/formularios/
- **Alternativa:** Email — geral@cnpd.pt com assunto "Notificação de Violação de Dados — [Nome da empresa]"
- **Urgência máxima:** Telefone — +351 213 928 400

#### 3.2 Conteúdo obrigatório da notificação (Art. 33(3))

Preencher o formulário da CNPD com:

```
a) NATUREZA DA VIOLAÇÃO
   - Tipo: confidencialidade / integridade / disponibilidade
   - Data e hora de início (estimada se desconhecida)
   - Data e hora de deteção
   - Fonte de deteção

b) DADOS E TITULARES AFETADOS (estimativa se não for possível precisar)
   - Categorias de dados pessoais: [ex: emails, nomes, passwords hash]
   - Número aproximado de titulares afetados: [ex: ~500]
   - Número aproximado de registos afetados: [ex: ~500]

c) CONSEQUÊNCIAS PROVÁVEIS
   - Riscos para os titulares: [ex: phishing direcionado, roubo de identidade]

d) MEDIDAS TOMADAS OU PROPOSTAS
   - Medidas de contenção: [ex: MongoDB isolada, JWT_SECRET rotado]
   - Medidas preventivas futuras: [ex: firewall regras, backups encriptados]

e) PONTO DE CONTACTO
   - Nome: [Nome do fundador]
   - Email: [email do fundador]
   - Telefone: [número do fundador]
```

#### 3.3 Template de email para CNPD (se usar email)

```
Assunto: NOTIFICAÇÃO URGENTE — Violação de Dados Pessoais — FinHub — [data]

Exma. CNPD,

Nos termos do Art. 33 do RGPD, vimos notificar V. Exa. de uma violação de dados pessoais
ocorrida na plataforma FinHub (finhub.pt).

[Preencher com os campos a) a e) acima]

Estamos disponíveis para prestar quaisquer informações adicionais.

Com os melhores cumprimentos,
[Nome do fundador]
Responsável pelo Tratamento — FinHub
[email] | [telefone]
```

---

### FASE 4 — Notificação aos Titulares (se risco elevado)

**Base legal:** RGPD Art. 34 — Se a violação for suscetível de implicar um elevado risco para os direitos e liberdades das pessoas singulares, o responsável pelo tratamento comunica a violação ao titular sem demora injustificada.

#### 4.1 Quando notificar os utilizadores?
- Passwords (mesmo hash) expostas → **SIM**
- Emails expostos em contexto de phishing provável → **SIM**
- Dados FIRE (portfolios financeiros) expostos → **SIM**
- Tokens de sessão válidos expostos → **SIM** (risco de acesso à conta)
- Apenas dados técnicos sem PII → **NÃO**

#### 4.2 Conteúdo da comunicação aos utilizadores (Art. 34(2))

A comunicação deve incluir:
- Natureza da violação (em linguagem clara, não técnica)
- Nome e contacto do ponto de contacto para mais informações
- Consequências prováveis da violação
- Medidas tomadas pelo responsável para remediar
- Medidas recomendadas ao utilizador para se proteger (ex: alterar password, ativar 2FA)

#### 4.3 Canal de comunicação
- **Email** para todos os utilizadores afetados (via serviço de email configurado no backend)
- **Notificação na plataforma** (banner no dashboard) se email não for suficiente

#### 4.4 Template de email para utilizadores

```
Assunto: [FinHub] Informação importante sobre a segurança da tua conta

Olá [nome],

Contactamo-te porque detetámos um incidente de segurança na plataforma FinHub que
pode ter afetado os teus dados.

O QUE ACONTECEU
[Descrição clara e simples: ex: "Uma configuração incorreta do servidor permitiu acesso
temporário à nossa base de dados entre [data] e [data]."]

QUE DADOS PODEM ESTAR AFETADOS
[ex: "O teu email e nome de utilizador."]

O QUE JÁ FIZEMOS
[ex: "Corrigimos imediatamente a configuração, revogámos todos os tokens de acesso
ativos e reforçámos as medidas de segurança."]

O QUE DEVES FAZER
[ex: "Recomendamos que alteres a tua password em /conta/definicoes. Se usas a mesma
password noutros serviços, altera-a também nesses serviços."]

Se tiveres dúvidas ou preocupações, contacta-nos em [email do fundador].

Pedimos desculpa pelo inconveniente.
[Nome do fundador]
FinHub
```

---

### FASE 5 — Remediação e Aprendizagem (após contenção)

- [ ] Identificar causa raiz (misconfiguration, vulnerabilidade de código, engenharia social, etc.)
- [ ] Corrigir a causa raiz com patch/hotfix
- [ ] Rever e atualizar security checklist (`P6_SECURITY_CHECKLIST.md`)
- [ ] Atualizar este plano se o processo revelou lacunas
- [ ] Realizar post-mortem interno documentado
- [ ] Considerar auditoria de segurança externa se incidente foi grave

---

## 4. Registo de Violações (Art. 33(5))

**Obrigatório mesmo para violações não notificáveis à CNPD.**

Manter registo em `dcos/finhub/legal/REGISTO_VIOLACOES.md` com:

| Campo | Detalhe |
|-------|---------|
| Data/hora de deteção | |
| Data/hora de início (estimada) | |
| Natureza da violação | |
| Dados afetados | |
| Número de titulares | |
| Consequências prováveis | |
| Medidas tomadas | |
| Notificação CNPD? (S/N + data) | |
| Notificação titulares? (S/N + data) | |
| Resolução | |

---

## 5. Prevenção — Medidas Atualmente Implementadas

| Medida | Estado |
|--------|--------|
| HTTPS obrigatório | ✅ (confirmar em prod) |
| Rate limiting em endpoints críticos | ✅ |
| Helmet.js (CSP, HSTS, X-Frame-Options) | ✅ |
| CORS whitelist | ✅ |
| JWT secrets em variáveis de ambiente | ✅ |
| Passwords em bcrypt hash | ✅ |
| `select: false` em campos sensíveis | ✅ |
| MongoDB não exposta publicamente | ⏳ confirmar em deploy |
| Backups automatizados | ⏳ implementar antes da release |
| Monitoring/alertas de erro em prod | ⏳ implementar (ex: Sentry) |
| Encryption at rest (MongoDB) | ⏳ migrar para Atlas |

---

## 6. Contactos e Escalada

| Situação | Contacto | Prazo |
|----------|---------|-------|
| Incidente detetado | Fundador — [telefone de emergência] | Imediato |
| Decisão de notificar CNPD | Fundador | < 48h após deteção |
| Notificação à CNPD | Portal CNPD ou geral@cnpd.pt | < 72h após conhecimento |
| Notificação a utilizadores | Email via plataforma | Sem demora injustificada (se risco elevado) |
| Suporte jurídico (se necessário) | [Advogado / consultora legal — preencher] | Caso a caso |

---

## 7. Registo de Alterações

| Versão | Data | Autor | Alterações |
|--------|------|-------|-----------|
| 1.0 | 2026-03-25 | Fundador | Versão inicial |
