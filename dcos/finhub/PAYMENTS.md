# FinHub — Sistema de Pagamentos & Subscrições

> **Data:** 2026-03-23
> **Estado actual:** Gestão manual por admin. Stripe não activo (infra preparada).
> **Ficheiros chave:** `src/models/UserSubscription.ts`, `src/services/adminSubscription.service.ts`

---

## 1. Visão Geral

O sistema de subscrições da FinHub está estruturado para suportar múltiplas fontes de pagamento (Stripe, manual, importação) mas actualmente opera em modo **manual por admin**.

```
Utilizador paga (fora da plataforma)
    ↓
Admin cria/actualiza subscrição no painel
    ↓
Sistema atribui role 'premium' ao utilizador
    ↓
Utilizador acede a conteúdos premium
```

Quando o Stripe for activado, o fluxo passará por webhooks que actualizam a mesma `UserSubscription` via `source: 'stripe'`.

---

## 2. Modelo de Dados — UserSubscription

```
UserSubscription
├── user               ObjectId (unique — 1 subscrição por utilizador)
├── planCode           String (max 80) — identificador normalizado do plano (ex: 'premium_monthly')
├── planLabel          String (max 120) — nome display (ex: 'Premium Mensal')
├── billingCycle       'monthly' | 'annual' | 'lifetime' | 'custom'
├── status             'active' | 'trialing' | 'past_due' | 'canceled'
├── entitlementActive  Boolean — determina se o utilizador TEM acesso premium
├── currentPeriodStart Date | null
├── currentPeriodEnd   Date | null
├── trialEndsAt        Date | null
├── canceledAt         Date | null
├── cancelAtPeriodEnd  Boolean
├── source             'manual_admin' | 'internal' | 'stripe' | 'import'
├── externalSubscriptionId  String | null — ID da subscrição no Stripe
├── metadata           Mixed | null — dados extra (webhooks, notas)
├── version            Number — controlo de concorrência optimista
├── createdBy          ObjectId — admin que criou
├── updatedBy          ObjectId — último admin a actualizar
├── history            Array<SubscriptionHistoryEntry>
├── createdAt          Date
└── updatedAt          Date

Índices:
  { status: 1, updatedAt: -1 }
  { planCode: 1, status: 1, updatedAt: -1 }
  { entitlementActive: 1, status: 1, updatedAt: -1 }
  { currentPeriodEnd: -1, status: 1 }
```

---

## 3. Ciclo de Vida de uma Subscrição

### Transições de Estado
```
       [extend_trial]
           ↓
       trialing ──────────────────────────────────────┐
           │ (trial expirado, entitlement activo)      │
           ↓                                           │
        active ←── [reactivate]                        │ [canceled]
           │                                           │
           │ (período expirado, entitlement inactivo)  │
           ↓                                           ↓
        past_due                                   canceled
           │
           │ [revoke_entitlement]
           ↓
    role → 'free'
```

### Lógica de Status Derivado
O sistema calcula o status efectivo com base em:
1. `status` guardado
2. Flag `entitlementActive`
3. Comparação de datas (`trialEndsAt`, `currentPeriodEnd`)

---

## 4. Operações de Gestão (API Admin)

**Base URL:** `/api/admin/monetization/subscriptions`

### Listar Subscrições
```
GET /api/admin/monetization/subscriptions
    ?status=active|trialing|past_due|canceled
    ?planCode=premium_monthly
    ?periodFrom=2026-01-01&periodTo=2026-12-31
    ?search=nome_ou_email

Resposta: {
  subscriptions[],
  summary: { active, trialing, pastDue, canceled, entitlementActive },
  pagination
}
```

### Obter Subscrição por Utilizador
```
GET /api/admin/monetization/subscriptions/users/:userId
```
Auto-cria documento se não existir (source: 'bootstrap_read').

### Estender Trial
```
POST /api/admin/monetization/subscriptions/users/:userId/extend-trial
Body: {
  actorId: string,
  reason: string (obrigatório),
  note?: string,
  days?: number (default 7, max 365),
  trialEndsAt?: string (data explícita alternativa)
}
```
**Efeito:** status → `trialing`, `entitlementActive = true`, `user.role = 'premium'`

### Revogar Entitlement
```
POST /api/admin/monetization/subscriptions/users/:userId/revoke-entitlement
Body: {
  actorId, reason, note?,
  nextStatus: 'past_due' | 'canceled'
}
```
**Efeito:** `entitlementActive = false`, `user.role = 'free'`

### Reactivar Subscrição
```
POST /api/admin/monetization/subscriptions/users/:userId/reactivate
Body: {
  actorId, reason,
  periodDays?: number (default 30, max 3650),
  planCode?, planLabel?, billingCycle?
}
```
**Efeito:** status → `active`, `entitlementActive = true`, `user.role = 'premium'`

---

## 5. Sincronização com Role do Utilizador

A atribuição de acesso premium é sincronizada em dois campos do modelo `User`:
- `role: 'premium'` — quando `entitlementActive = true`
- `role: 'free'` — quando `entitlementActive = false`
- `subscriptionExpiry` — data de expiração do período premium

---

## 6. Histórico de Alterações

Cada operação regista uma entrada no array `history`:
```typescript
{
  version: number,
  action: 'created' | 'updated' | 'extend_trial' | 'revoke_entitlement' | 'reactivate' | 'status_change',
  reason: string (max 500),    // obrigatório
  note: string | null (max 2000),
  changedAt: Date,
  changedBy: ObjectId,
  snapshot: { ...estadoCompleto }   // snapshot do momento
}
```

---

## 7. Integração com Stripe (Futura)

O sistema está estruturalmente preparado para Stripe:

| Campo | Uso Stripe |
|-------|-----------|
| `externalSubscriptionId` | ID da subscription no Stripe (ex: `sub_xxx`) |
| `source: 'stripe'` | Identifica subscrições via Stripe |
| `metadata` | Dados do webhook (checkout session, invoice ID, etc.) |

**Quando o Stripe for activado:**
1. Configurar webhook endpoint: `POST /api/webhooks/stripe`
2. Eventos a tratar: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Cada evento actualiza `UserSubscription` via `adminSubscriptionService` com `source: 'stripe'`
4. Role do utilizador é sincronizado automaticamente

**Planos actuais (estáticos, página `/precos`):**
- Free: 0€/mês
- Premium: 9€/mês

---

## 8. Resumo de Estados por Cenário

| Cenário | status | entitlementActive | user.role |
|---------|--------|-------------------|-----------|
| Trial activo | trialing | true | premium |
| Subscrito activo | active | true | premium |
| Pagamento em falta | past_due | false | free |
| Cancelado | canceled | false | free |
| Manual admin activo | active | true | premium |

---

## Referências de Ficheiros

| Ficheiro | Propósito |
|---------|-----------|
| `src/models/UserSubscription.ts` | Schema de subscrição |
| `src/services/adminSubscription.service.ts` | Lógica de gestão |
| `src/controllers/adminSubscription.controller.ts` | Handlers HTTP admin |
| `src/routes/admin.routes.ts` | Rotas `/monetization/**` |
| `FinHub-Vite/src/pages/conta/plano/+Page.tsx` | UI "O meu plano" |
| `FinHub-Vite/src/pages/precos/+Page.tsx` | Página de preços pública |
