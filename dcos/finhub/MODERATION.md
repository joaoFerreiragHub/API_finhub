# FinHub — Sistema de Moderação de Conteúdo

> **Data:** 2026-03-23
> **Camadas:** Reportes de utilizadores → Detecção automática → Revisão admin → Apelos
> **Ficheiros chave:** `src/services/contentReport.service.ts`, `src/services/automatedModeration.service.ts`, `src/services/adminContent.service.ts`

---

## 1. Visão Geral

O sistema de moderação da FinHub tem **quatro camadas** que funcionam em conjunto:

```
1. REPORTES DE UTILIZADORES
   Qualquer utilizador pode reportar conteúdo suspeito
        ↓
2. MOTOR DE POLÍTICAS
   Avalia os reportes acumulados e calcula prioridade + acção recomendada
        ↓
3. ACÇÃO AUTOMÁTICA
   Se os thresholds forem atingidos, o sistema oculta o conteúdo automaticamente
        ↓
4. FILA DE ADMIN
   Moderadores revêem conteúdo sinalizado e tomam decisões finais
        ↓
5. SISTEMA DE APELOS
   Criadores podem contestar decisões de moderação
```

---

## 2. Tipos de Conteúdo Moderável

```typescript
type ModeratableContentType =
  'article' | 'video' | 'course' | 'live' |
  'podcast' | 'book' | 'comment' | 'review'
```

---

## 3. Reportes de Utilizadores

**Modelo:** `ContentReport`

```
ContentReport
├── reporter       ObjectId (user que reportou)
├── contentType    ModeratableContentType
├── contentId      String
├── reason         'spam' | 'abuse' | 'misinformation' | 'sexual' | 'violence' | 'hate' | 'scam' | 'copyright' | 'other'
├── note           String | null (max 1000)
├── status         'open' | 'reviewed' | 'dismissed'
├── reviewedBy     ObjectId | null
├── reviewedAt     Date | null
└── resolutionAction  'hide' | 'unhide' | 'restrict' | 'dismissed' | null

Constraint único: (reporter, contentType, contentId)
— cada utilizador só pode reportar o mesmo conteúdo uma vez (actualiza se já existe)
```

### Pesos de Risco por Motivo
| Motivo | Peso | Risco |
|--------|------|-------|
| `scam` | 5 | 🔴 Crítico |
| `sexual` | 4 | 🔴 Alto |
| `violence` | 4 | 🔴 Alto |
| `hate` | 4 | 🔴 Alto |
| `misinformation` | 3 | 🟡 Médio |
| `copyright` | 3 | 🟡 Médio |
| `abuse` | 3 | 🟡 Médio |
| `spam` | 2 | 🟢 Baixo |
| `other` | 1 | ⬜ Mínimo |

### Cálculo de Prioridade
O motor de políticas calcula a prioridade do conteúdo com base na combinação de:
- Número de reporters únicos
- Pesos dos motivos de reporte
- Resultado: `none` | `low` | `medium` | `high` | `critical`

---

## 4. Detecção Automática

**Modelo:** `AutomatedModerationSignal`

```
AutomatedModerationSignal
├── contentType        ModeratableContentType
├── contentId          String
├── actor              ObjectId (criador do conteúdo)
├── ownerUserId        ObjectId
├── status             'active' | 'reviewed' | 'cleared'
├── triggerSource      'create' | 'update' | 'publish'
├── score              Number (0-100+)
├── severity           'none' | 'low' | 'medium' | 'high' | 'critical'
├── recommendedAction  'none' | 'review' | 'restrict' | 'hide'
├── triggeredRules     Array<{ rule, score, ... }>
├── textSignals        { textLength, tokenCount, uniqueTokenRatio, urlCount, suspiciousUrlCount, ... }
├── activitySignals    { sameSurfaceLast10m, sameSurfaceLast60m, portfolioLast10m, ... }
└── automation         { enabled, eligible, attempted, executed, action, lastOutcome, ... }

Constraint único: (contentType, contentId)
```

### Regras de Detecção Automática
| Regra | Descrição |
|-------|-----------|
| `spam` | Conteúdo repetitivo, padrões de spam textual |
| `suspicious_link` | URLs suspeitos detectados no conteúdo |
| `flood` | Criação rápida na mesma superfície (limites: 10m / 60m) |
| `mass_creation` | Volume anormal de conteúdo do mesmo utilizador |

### Sinais de Texto
```
textLength, tokenCount, uniqueTokenRatio
urlCount, suspiciousUrlCount, duplicateUrlCount
repeatedTokenCount, duplicateLineCount
```

### Sinais de Actividade
```
sameSurfaceLast10m    — posts na mesma superfície nos últimos 10min
sameSurfaceLast60m    — posts na mesma superfície na última hora
portfolioLast10m      — updates de portfolio nos últimos 10min
portfolioLast60m      — updates de portfolio na última hora
```

---

## 5. Motor de Políticas

**Perfis de política por superfície:**
| Perfil | Aplicado a |
|--------|-----------|
| `multi_surface_discovery` | Artigos, vídeos, cursos, podcasts, livros, lives |
| `discussion_comments` | Comentários |
| `discussion_reviews` | Avaliações (reviews) |

**Output do motor:**
```typescript
{
  recommendedAction: 'none' | 'review' | 'restrict' | 'hide',
  escalation: 'none' | 'watch' | 'urgent' | 'critical',
  automationEligible: boolean,
  automationEnabled: boolean,
  automationBlockedReason: string | null,
  matchedReasons: string[],    // motivos de alto risco presentes
  profile: string,
  thresholds: { ... }
}
```

### Thresholds para Auto-Ocultação (defaults)
| Parâmetro | Valor |
|-----------|-------|
| `autoHideMinPriority` | `critical` |
| `autoHideMinUniqueReporters` | 3 reporters únicos |
| `autoHideAllowedReasons` | `scam`, `hate`, `sexual`, `violence` |

**Motivos de alto risco que activam auto-hide:** `scam`, `hate`, `sexual`, `violence`

---

## 6. Fluxo de Auto-Ocultação

```
Utilizador reporta conteúdo como "scam"
    ↓
contentReport.service cria/actualiza reporte
    ↓
moderationPolicy.service avalia:
    — 3 reporters únicos com reason: 'scam'
    — prioridade: 'critical'
    — recommendedAction: 'hide'
    — automationEligible: true
    ↓ (thresholds atingidos)
adminContent.service.fastHideContent()
    ↓
ContentModerationEvent criado com:
    — appliedBy: system
    — metadata: { policyAutoHide: true, policySignals, reportSignals }
    ↓
Audit log com action: 'admin.content.policy_auto_hide'
```

---

## 7. Fila de Admin — Operações

**Endpoint base:** `/api/admin/content`

### Listar Fila de Moderação
```
GET /api/admin/content
    ?moderationStatus=visible|hidden|restricted
    ?publishStatus=draft|published|archived
    ?contentType=article|video|...
    ?reportPriority=low|medium|high|critical
    ?flaggedOnly=true
    ?creatorId=userId
    ?search=texto
    ?page=1&limit=20
```

### Acções de Moderação
```
POST /api/admin/content/:contentType/:contentId/hide
     Body: { actorId, reason, note?, metadata? }
     → contentModerationStatus: 'hidden'

POST /api/admin/content/:contentType/:contentId/unhide
     Body: { actorId, reason, note? }
     → restaura visibilidade

POST /api/admin/content/:contentType/:contentId/restrict
     Body: { actorId, reason, note? }
     → contentModerationStatus: 'restricted' (alcance reduzido)

POST /api/admin/content/bulk-action
     Body: { items: [{contentType, contentId}], action, reason }
     → Acção em batch com rollback por item
```

---

## 8. Sistema de Apelos

**Modelo:** `ModerationAppeal`

```
ModerationAppeal
├── moderationEvent    ObjectId (ContentModerationEvent, único)
├── contentType        ModeratableContentType
├── contentId          String
├── appellant          ObjectId
├── status             'open' | 'under_review' | 'accepted' | 'rejected' | 'closed'
├── severity           'low' | 'medium' | 'high' | 'critical'
├── reasonCategory     'false_positive' | 'context_missing' | 'policy_dispute' | 'other'
├── reason             String (max 500)
├── note               String | null (max 2000)
├── slaHours           Number (1-168, default: 48)
├── openedAt           Date
├── firstResponseAt    Date | null
├── resolvedAt         Date | null
├── dueAt              Date (= openedAt + slaHours)
├── version            Number
└── history            Array<AppealHistoryEntry>
```

### Fluxo de Apelo
```
1. Criador submete apelo: POST /api/appeals/content
   Body: { moderationEventId, reasonCategory, reason, note? }

2. Apelo criado com status: 'open'

3. Admin vê na fila: GET /api/admin/content/appeals
   Filtra por status, severity, SLA

4. Admin actualiza: PATCH /api/admin/content/appeals/:id/status
   → 'accepted': conteúdo restaurado, decisão revertida
   → 'rejected': decisão mantida
   → 'closed': apelo arquivado

5. SLA tracking: alertas quando dueAt se aproxima
```

### API de Apelos

**Utilizador:**
```
POST /api/appeals/content          — criar apelo
GET  /api/appeals/me               — listar os meus apelos
GET  /api/appeals/:appealId        — detalhe de um apelo
```

**Admin:**
```
GET  /api/admin/content/appeals
GET  /api/admin/content/appeals/:appealId
PATCH /api/admin/content/appeals/:appealId/status
```

---

## 9. Audit Trail de Moderação

Todas as acções de moderação são registadas no sistema de audit:

```
{
  actorId, actorRole: 'admin',
  action: 'admin.content.hide' | 'admin.content.unhide' |
          'admin.content.restrict' | 'admin.content.policy_auto_hide',
  scope: 'admin.content.moderate',
  resourceType: 'content',
  resourceId: '{contentType}:{contentId}',
  reason: string,
  method: 'API' | 'SYSTEM',
  path: '/api/admin/...' | 'policy://...',
  statusCode: number,
  outcome: 'success' | 'error',
  metadata: { reportId?, policySignals?, automationInfo? },
  createdAt: Date
}
```

---

## 10. Templates de Moderação

**Modelo:** `AdminModerationTemplate`

Permite guardar respostas/decisões reutilizáveis para casos comuns de moderação, aumentando a consistência e velocidade da equipa de moderação.

---

## Referências de Ficheiros

| Ficheiro | Propósito |
|---------|-----------|
| `src/models/ContentReport.ts` | Schema de reportes |
| `src/models/AutomatedModerationSignal.ts` | Schema de sinais automáticos |
| `src/models/ModerationAppeal.ts` | Schema de apelos |
| `src/models/ContentModerationEvent.ts` | Registo de acções de moderação |
| `src/models/AdminModerationTemplate.ts` | Templates reutilizáveis |
| `src/services/contentReport.service.ts` | Lógica de reportes |
| `src/services/automatedModeration.service.ts` | Detecção automática |
| `src/services/moderationPolicy.service.ts` | Motor de políticas |
| `src/services/adminContent.service.ts` | Acções admin + fast-hide |
| `src/services/moderationAppeal.service.ts` | Gestão de apelos |
| `src/controllers/adminContent.controller.ts` | Handlers admin |
| `src/controllers/contentReport.controller.ts` | Endpoint de reporte |
| `src/controllers/moderationAppeal.controller.ts` | Endpoints de apelo |
| `src/routes/report.routes.ts` | Rotas de reporte |
| `src/routes/appeal.routes.ts` | Rotas de apelo |
