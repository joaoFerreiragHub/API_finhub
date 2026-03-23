# FinHub — Sistema de Autenticação & Roles

> **Data:** 2026-03-23
> **Prioridade:** 🔴 Alta — transversal a todos os sistemas
> **Ficheiros chave:** `src/utils/jwt.ts`, `src/controllers/auth.controller.ts`, `src/middlewares/auth.ts`, `src/middlewares/roleGuard.ts`

---

## 1. Estratégia de Tokens JWT

### Tokens de Acesso (Access Token)
| Campo | Valor |
|-------|-------|
| TTL | 7 dias (env: `JWT_EXPIRES_IN`) |
| Secret | `JWT_SECRET` |
| Algoritmo | HS256 (jsonwebtoken) |
| Armazenamento | Zustand store → `auth-storage` (localStorage) |

### Tokens de Refresh
| Campo | Valor |
|-------|-------|
| TTL | 30 dias (env: `JWT_REFRESH_EXPIRES_IN`) |
| Secret | `JWT_REFRESH_SECRET` |
| Armazenamento | Mesmo que access token (persisted) |

### Payload JWT
```typescript
interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  tokenVersion: number          // para invalidação de sessões
  assistedSession?: {           // para sessões assistidas (admin)
    sessionId: string
    adminUserId: string
    targetUserId: string
    scope: 'read_only'
    expiresAt: string
  }
}
```

> **Nota:** Os refresh tokens **não são guardados em base de dados** — toda a informação necessária está no payload JWT. A invalidação é feita via `tokenVersion`.

---

## 2. Fluxo de Refresh de Token

**Endpoint:** `POST /api/auth/refresh`

1. Cliente envia `refreshToken` no body
2. Backend valida com `JWT_REFRESH_SECRET`
3. Verifica que o utilizador existe na BD
4. Valida `status === 'active'` (contas suspensas/banidas são rejeitadas)
5. Compara `tokenVersion` do payload com o valor actual na BD
6. **Token Rotation:** gera novos access + refresh tokens
7. Actualiza `lastActiveAt` do utilizador
8. Devolve ambos os tokens novos

**Invalidação de Sessões:**
- O modelo `User` tem campo `tokenVersion: number` (default: 0)
- Ao alterar password ou revogar sessões, `tokenVersion` é incrementado
- Tokens antigos com `tokenVersion` anterior são automaticamente rejeitados

---

## 3. Google OAuth

**Endpoints:**
- `GET /api/auth/google/start?redirectPath={path}` — inicia o fluxo
- `GET /api/auth/google/callback?code=...&state=...` — callback do Google

**Configuração:**
| Variável | Descrição |
|---------|-----------|
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID da Google Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client Secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | URI de callback no backend |
| `GOOGLE_OAUTH_FRONTEND_CALLBACK_URL` | URL de callback no frontend (`/oauth/google/callback`) |

**Fluxo:**
1. Frontend redireciona para `/api/auth/google/start`
2. Backend gera `state` aleatório (24 bytes crypto), guarda em Map em memória com TTL 10min
3. Redireciona para Google com scope `openid email profile`
4. Google chama o callback com `code` + `state`
5. Backend valida o state (deve existir e não estar expirado)
6. Troca `code` por access token com Google
7. Obtém user info via OpenID Connect (requer email verificado)
8. **Lógica de utilizador:**
   - Utilizador já existe → actualiza `lastLoginAt`, avatar, nome
   - Utilizador novo → cria com `role: 'free'`, email marcado como verificado
9. Gera JWT tokens e redireciona para frontend callback com tokens na URL

**Segurança do State:**
- Map em memória (não persistido entre restarts)
- Cleanup automático quando > 1000 entradas
- TTL configurável via `GOOGLE_OAUTH_STATE_TTL_SECONDS` (default: 600s)

---

## 4. Roles & Permissões

### Hierarquia de Roles
```typescript
// Backend (User model)
type UserRole = 'visitor' | 'free' | 'premium' | 'creator' | 'brand_manager' | 'admin'

// Frontend (enum)
enum UserRole {
  VISITOR = 'visitor',          // Nível 0 — sem conta
  FREE = 'free',                // Nível 1 — conta gratuita
  PREMIUM = 'premium',          // Nível 2 — subscrição premium
  CREATOR = 'creator',          // Nível 3 — criador de conteúdo
  BRAND_MANAGER = 'brand_manager', // Nível 4 — gestão de marca
  ADMIN = 'admin'               // Nível 5 — administrador
}
```

### O que cada role pode fazer
| Role | Conteúdo | Ferramentas PRIVADO | Creator Dashboard | Admin Panel | Premium Features |
|------|----------|---------------------|-------------------|-------------|-----------------|
| visitor | Público | ❌ | ❌ | ❌ | ❌ |
| free | Público | ✅ Básico | ❌ | ❌ | ❌ |
| premium | Público + Exclusivo | ✅ Completo | ❌ | ❌ | ✅ |
| creator | Público + Exclusivo | ✅ Completo | ✅ | ❌ | ✅ |
| brand_manager | Público | ✅ Básico | ❌ | 🔐 Brand Portal | ❌ |
| admin | Tudo | ✅ Completo | ✅ | ✅ Tudo | ✅ |

---

## 5. Middleware de Autenticação (Backend)

**Ficheiro:** `src/middlewares/auth.ts`

```typescript
authenticate()    // Bearer token obrigatório; valida tokenVersion; bloqueia contas suspensas/banidas
optionalAuth()    // Não falha se não houver token; popula req.user se houver
```

**Respostas de erro:**
- `401` — token inválido, expirado ou em falta
- `403 "Conta suspensa. Contacta o suporte."` — status: 'suspended'
- `403 "Conta banida. Contacta o suporte."` — status: 'banned'

---

## 6. Guards de Role (Backend)

**Ficheiro:** `src/middlewares/roleGuard.ts`

| Guard | Roles aceites |
|-------|---------------|
| `requireAdmin` | admin |
| `requireCreator` | creator, admin |
| `requirePremium` | premium, creator, admin |
| `requireVerifiedEmail` | qualquer role com email verificado |
| `requireRole(...roles)` | genérico, passa lista de roles |
| `requireAdminScope(scope)` | admin com scope específico |
| `requireBrandPortalRead` | brand_manager, admin |
| `requireBrandPortalWrite` | brand_manager, admin |

### Admin Scopes (delegação granular)
O sistema de admin suporta delegação de scopes específicos via `adminScopeDelegationService`.
- Flag `adminReadOnly` impede operações de escrita
- Scopes incluem: moderação, métricas, gestão de utilizadores, conteúdo editorial, etc.

---

## 7. Guards de Rota (Frontend)

**Ficheiro:** `src/lib/auth/guards.ts`

```typescript
requireAuth()                // Redireciona para /login se não autenticado
requireCreator()             // Verifica role creator ou admin
requireAdmin()               // Verifica role admin (com validação de scope por path)
requirePremium()             // Verifica premium, creator ou admin
redirectIfAuthenticated()    // Redireciona utilizadores autenticados (ex: /login, /registar)
```

---

## 8. Auth Store — Frontend (Zustand)

**Ficheiro:** `src/features/auth/stores/useAuthStore.ts`

### State
```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  hydrated: boolean           // true após rehydration do localStorage
}
```

### Persistência
- Key localStorage: `auth-storage`
- Persiste: `user`, `accessToken`, `refreshToken`, `isAuthenticated`
- **Não persiste:** `isLoading`

### Acções principais
```typescript
login(credentials)            // POST /auth/login
register(data)                // POST /auth/register
logout()                      // POST /auth/logout + clear state
refreshAccessToken()          // POST /auth/refresh (automático via axios interceptor)
updateUser(partial)           // Actualiza campos do utilizador no store
clearAuth()                   // Limpa tudo (logout forçado)
getRole()                     // Devolve role actual
```

### Auto-refresh
- Integrado no `apiClient` (axios interceptor)
- Em resposta `401`, tenta refresh automático
- Se refresh falhar → `clearAuth()` + redirect para `/login`

---

## 9. Fluxo de Reset de Password

### Forgot Password (`POST /api/auth/forgot-password`)
1. Aceita `email` no body
2. Responde sempre com 200 (não revela se o email existe — segurança)
3. Gera token aleatório (32 bytes)
4. Guarda **hash SHA256** do token na BD + expiração
5. TTL: 30 minutos (env: `PASSWORD_RESET_TOKEN_TTL_MINUTES`)
6. Envia email com o token em plain text

### Reset Password (`POST /api/auth/reset-password`)
1. Aceita `token` + `newPassword`
2. Faz hash SHA256 do token recebido
3. Compara com o hash guardado e valida expiração
4. Actualiza password (bcrypt)
5. **Incrementa `tokenVersion`** — invalida todas as sessões activas
6. Define `lastForcedLogoutAt`
7. Limpa os campos de reset da BD

### Change Password (autenticado) (`POST /api/auth/change-password`)
- Requer verificação da password actual
- Incrementa `tokenVersion` (invalida sessões noutros dispositivos)

---

## 10. Verificação de Email

### No Registo
1. Gera token de 32 bytes → hash SHA256 guardado na BD
2. TTL: 24 horas (env: `EMAIL_VERIFICATION_TOKEN_TTL_HOURS`)
3. Envia email de verificação assincronamente
4. Conta criada mesmo antes de verificar (acesso imediato)

### Verify Email (`GET /api/auth/verify-email?token=...`)
1. Hash do token comparado com BD
2. Valida expiração
3. `emailVerified = true`, limpa campos de verificação
4. Envia email de boas-vindas

### Resend Verification (`POST /api/auth/resend-verification`)
- Requer autenticação
- Gera novo token + reenvia email

---

## 11. Sessões Assistidas (Admin Impersonation)

Mecanismo que permite a um admin aceder à conta de um utilizador com scope **read-only**, mediante aprovação do utilizador.

**Endpoints:**
```
GET  /api/auth/assisted-sessions/pending      — lista pedidos pendentes (utilizador vê)
GET  /api/auth/assisted-sessions/active       — sessões activas
POST /api/auth/assisted-sessions/:id/consent  — utilizador aprova/rejeita
POST /api/auth/assisted-sessions/:id/revoke   — revoga sessão activa
```

**Restrições:**
- Admin fica limitado a métodos `GET`, `HEAD`, `OPTIONS`
- Todas as acções são auditadas automaticamente
- Expiração rastreada no payload JWT

---

## 12. Rate Limiting em Endpoints de Auth

**Ficheiro:** `src/middlewares/rateLimiter.ts`

| Endpoints | Janela | Limite |
|-----------|--------|--------|
| register, login, google/*, forgot-password, reset-password, verify-email, change-password, refresh, logout | 15 minutos | 1000 req/IP |

**Fallback:** Redis se disponível, caso contrário memória (`RATE_LIMIT_STORE_MODE: auto|memory|redis`).

---

## 13. Legal & Cookie Consent no Registo

### Aceitação Legal (obrigatória no registo)
```typescript
{
  termsAccepted: boolean           // Termos de Serviço
  privacyAccepted: boolean         // Política de Privacidade
  financialDisclaimerAccepted: boolean  // Aviso de risco financeiro
  version?: string                 // Versão dos termos aceites
}
```

### Cookie Consent (actualizável via PATCH)
```typescript
{
  analytics?: boolean     // PostHog, GA4
  marketing?: boolean     // Meta Pixel
  preferences?: boolean   // Personalização
  version?: string
}
```
- Cookies essenciais sempre activos
- Guardados com timestamp e versão
- Endpoint: `PATCH /api/auth/cookie-consent`

---

## Referências de Ficheiros

| Ficheiro | Propósito |
|---------|-----------|
| `src/utils/jwt.ts` | Geração e verificação de tokens |
| `src/types/auth.ts` | Tipos e DTOs de autenticação |
| `src/models/User.ts` | Schema do utilizador (role, tokenVersion, status) |
| `src/controllers/auth.controller.ts` | Toda a lógica de auth |
| `src/routes/auth.routes.ts` | Definição de rotas |
| `src/middlewares/auth.ts` | Middleware de verificação de token |
| `src/middlewares/roleGuard.ts` | Guards de role |
| `src/middlewares/rateLimiter.ts` | Rate limiting |
| `FinHub-Vite/src/features/auth/stores/useAuthStore.ts` | Store Zustand |
| `FinHub-Vite/src/features/auth/services/authService.ts` | Chamadas API |
| `FinHub-Vite/src/lib/auth/guards.ts` | Guards de rota (frontend) |
| `FinHub-Vite/src/features/auth/pages/GoogleOAuthCallbackPage.tsx` | Callback OAuth |
