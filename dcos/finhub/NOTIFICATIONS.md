# FinHub — Sistema de Notificações

> **Data:** 2026-03-23
> **Estado actual:** Polling via React Query. WebSocket/push não implementado.
> **Ficheiros chave:** `src/models/Notification.ts`, `src/services/notification.service.ts`, `src/events/socialEvents.ts`

---

## 1. Tipos de Notificação

| Tipo (backend) | Tipo (frontend) | Descrição |
|----------------|-----------------|-----------|
| `follow` | `FOLLOW_NEW` | Alguém começou a seguir o utilizador |
| `comment` | `COMMENT_REPLY` | Comentário no conteúdo do utilizador |
| `reply` | `COMMENT_REPLY` | Resposta ao comentário do utilizador |
| `rating` | `RATING_RECEIVED` | Avaliação no conteúdo do utilizador |
| `like` | `LIKE_RECEIVED` | Like/favorito no conteúdo |
| `mention` | `SYSTEM` | Menção num comentário |
| `content_published` | `NEW_CONTENT` | Criador que o utilizador segue publicou |
| `content_moderated` | `CONTENT_MODERATED` | Conteúdo do utilizador entrou em moderação |

---

## 2. Schema da Notificação (MongoDB)

```
Notification
├── user           ObjectId (ref: User) — destinatário, indexed
├── type           String (enum acima)
├── triggeredBy    ObjectId (ref: User, nullable) — quem causou a notificação
├── targetType     String (article|video|course|live|podcast|book|comment|review, nullable)
├── targetId       ObjectId (nullable) — ID do conteúdo afectado
├── message        String (max 500, nullable) — mensagem customizada
├── metadata       Mixed (nullable) — dados extra (ex: motivo de moderação)
├── isRead         Boolean (default: false, indexed)
├── readAt         Date (nullable)
├── createdAt      Date (TTL index — auto-delete após 90 dias)
└── updatedAt      Date

Índices:
  { user: 1, isRead: 1, createdAt: -1 }   — queries principais
  { user: 1, type: 1 }                    — filtro por tipo
  { createdAt: 1, expireAfterSeconds: 7776000 }  — TTL 90 dias
```

**Populate de `triggeredBy`:** `name`, `username`, `avatar`

---

## 3. Mecanismo de Entrega

### Estado actual: **Polling via React Query**
- Frontend faz polling periódico a `/api/notifications`
- Zustand store (`useNotificationStore`) mantém estado client-side com persistência em localStorage
- **Sem WebSocket ou Server-Sent Events** — planeado para v1.0

### Arquitectura de Eventos (Backend)
```
Acção do utilizador
    ↓
Service (follow.service, comment.service, etc.)
    ↓ publica evento
socialEventBus
    ↓ handler registado
registerSocialEventHandlers()
    ↓ cria notificação
notification.service.create()
    ↓
MongoDB (Notification collection)
    ↓ polling
Frontend React Query
```

---

## 4. Eventos que Criam Notificações

| Evento (bus) | Publisher | Notificação criada |
|-------------|-----------|-------------------|
| `social.follow.created` | `follow.service.ts` | Follow notification para o seguido |
| `social.content.interaction` (comment) | `comment.service.ts` | Comment notification para o dono |
| `social.content.interaction` (reply) | `comment.service.ts` | Reply notification para o dono do comentário |
| `social.content.interaction` (rating) | `rating.service.ts` | Rating notification para o criador |
| `social.content.interaction` (favorite) | `favorite.service.ts` | Like notification para o criador |
| `social.content.published` | article/video/course/live services | Notificação para todos os seguidores (com check de preferências) |

---

## 5. Preferências de Notificação

### Sistema de dois níveis:

**1. Preferências globais** (`UserPreferences.notificationPreferences`):
```typescript
{
  follow: boolean,              // default: true
  comment: boolean,             // default: true
  reply: boolean,               // default: true
  rating: boolean,              // default: true
  like: boolean,                // default: true
  mention: boolean,             // default: true
  content_published: boolean,   // default: true
  content_moderated: boolean    // default: true
}
```
Geridas via `GET/PATCH /api/notifications/preferences`

**2. Subscrições por criador** (`CreatorNotificationSubscription`):
```
user: ObjectId
creator: ObjectId
eventType: 'content_published'
isEnabled: boolean
```
- Override da preferência global `content_published` para criadores específicos
- Só válido para criadores que o utilizador segue
- Gerido via `PUT/DELETE /api/notifications/subscriptions/:creatorId`

**Lógica de verificação:**
```
canReceiveNotification(userId, type)?
  → Verifica preferência global para o tipo
  → Se content_published: também verifica CreatorNotificationSubscription.isEnabled
```

---

## 6. API de Notificações

Todos os endpoints requerem autenticação.

```
GET    /api/notifications
       ?page=1&limit=20
       → { notifications[], unreadCount, pagination }

GET    /api/notifications/unread
       ?page=1&limit=20
       → { notifications[], pagination }

GET    /api/notifications/count
       → { unreadCount }

GET    /api/notifications/stats
       → { total, unread, byType: { follow: {total, unread}, ... } }

PATCH  /api/notifications/:id/read
       → Marca uma notificação como lida

PATCH  /api/notifications/read-all
       → Marca todas como lidas

DELETE /api/notifications/:id
       → Elimina uma notificação

DELETE /api/notifications/read
       → Elimina todas as notificações lidas

GET    /api/notifications/preferences
PATCH  /api/notifications/preferences

GET    /api/notifications/subscriptions
GET    /api/notifications/subscriptions/:creatorId
PUT    /api/notifications/subscriptions/:creatorId
DELETE /api/notifications/subscriptions/:creatorId
```

---

## 7. Componentes Frontend

**NotificationBell** (`features/social/components/NotificationBell.tsx`):
- Ícone de sino no header com badge de não lidas (máx. 99+)
- Popover com top 5 notificações
- Botão "Marcar todas como lidas"
- Link para a página completa `/notificacoes`

**NotificationList** (`features/social/components/NotificationList.tsx`):
- Ícones por tipo (Bell, MessageSquare, Heart, UserPlus, Star, ShieldAlert, Info)
- Color coding por tipo
- Avatar do actor ou ícone de fallback
- Tempo relativo (agora, 5m, 2h, 1d)
- Indicador de não lida (ponto colorido)

**NotificationsPage** (`features/social/pages/NotificationsPage.tsx`):
- Tabs: Todas | Não lidas | Conteúdo | Comentários | Sistema
- Painel esquerdo: preferências globais com switches
- Painel direito: subscrições por criador com toggle
- Lista completa com filtros

---

## 8. Store Frontend (Zustand)

**Ficheiro:** `features/social/stores/useNotificationStore.ts`

```typescript
{
  notifications: Notification[]
  unreadCount: number
  isOpen: boolean

  // Acções
  add(notification)
  markRead(id)
  markAllRead()
  remove(id)
  clear()
  setOpen(open)
  setNotifications(notifications[])
}
```

- Persistido em localStorage: key `notification-storage`
- Persiste: `notifications[]`, `unreadCount`

### Hooks React Query
```typescript
useNotifications(limit?)                    // Query + sync ao store
useMarkNotificationRead()                   // Mutation + store + invalidate
useMarkAllNotificationsRead()               // Mutation + store + invalidate
useNotificationPreferences()               // Preferências globais
useUpdateNotificationPreferences()         // Actualizar preferências
useCreatorSubscriptions(page, limit)        // Lista subscrições
useCreatorSubscriptionStatus(creatorId)     // Status de uma subscrição
useUpdateCreatorSubscription()             // Toggle subscrição
```

---

## 9. O que Falta (Roadmap)

| Funcionalidade | Estado | Prioridade |
|---------------|--------|-----------|
| WebSocket / Server-Sent Events | ⏳ | 🟡 v1.0 |
| Push notifications (browser / FCM) | ⏳ | 🟢 Pós-v1.0 |
| Notificações por email | ⏳ | 🟢 Pós-v1.0 |
| Toast imediato no browser | ⏳ | 🟡 v1.0 |
| Sons de alerta | ⏳ | 🟢 Pós-v1.0 |

---

## Referências de Ficheiros

| Ficheiro | Propósito |
|---------|-----------|
| `src/models/Notification.ts` | Schema MongoDB |
| `src/models/CreatorNotificationSubscription.ts` | Subscrições por criador |
| `src/models/UserPreferences.ts` | Preferências globais |
| `src/services/notification.service.ts` | Lógica de criação e query |
| `src/controllers/notification.controller.ts` | Handlers HTTP |
| `src/routes/notification.routes.ts` | Rotas |
| `src/events/socialEvents.ts` | Event bus |
| `src/events/registerSocialEventHandlers.ts` | Registo de handlers |
| `FinHub-Vite/src/features/social/components/NotificationBell.tsx` | Componente sino |
| `FinHub-Vite/src/features/social/components/NotificationList.tsx` | Lista de notificações |
| `FinHub-Vite/src/features/social/stores/useNotificationStore.ts` | Zustand store |
| `FinHub-Vite/src/features/social/hooks/useSocial.ts` | React Query hooks |
