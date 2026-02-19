import { IUser } from '../models/User'

export const ADMIN_SCOPES = [
  'admin.users.read',
  'admin.users.write',
  'admin.content.read',
  'admin.content.moderate',
  'admin.brands.read',
  'admin.brands.write',
  'admin.uploads.read',
  'admin.uploads.write',
  'admin.metrics.read',
  'admin.audit.read',
  'admin.support.session.assist',
] as const

export type AdminScope = (typeof ADMIN_SCOPES)[number]

export const ADMIN_SCOPE_PROFILES: Record<string, ReadonlyArray<AdminScope>> = {
  super: ADMIN_SCOPES,
  ops: [
    'admin.users.read',
    'admin.users.write',
    'admin.content.read',
    'admin.content.moderate',
    'admin.brands.read',
    'admin.brands.write',
    'admin.uploads.read',
    'admin.uploads.write',
    'admin.metrics.read',
    'admin.audit.read',
  ],
  support: [
    'admin.users.read',
    'admin.content.read',
    'admin.brands.read',
    'admin.uploads.read',
    'admin.metrics.read',
    'admin.audit.read',
    'admin.support.session.assist',
  ],
}

const ADMIN_WRITE_SCOPES = new Set<AdminScope>([
  'admin.users.write',
  'admin.content.moderate',
  'admin.brands.write',
  'admin.uploads.write',
  'admin.support.session.assist',
])

const VALID_ADMIN_SCOPE_SET = new Set<string>(ADMIN_SCOPES)

const normalizeAdminScopes = (scopes?: string[] | null): AdminScope[] => {
  if (!scopes || scopes.length === 0) return []

  const validScopes: AdminScope[] = []
  for (const scope of scopes) {
    if (VALID_ADMIN_SCOPE_SET.has(scope)) {
      validScopes.push(scope as AdminScope)
    }
  }

  return validScopes
}

export const getAdminScopesForUser = (user: Pick<IUser, 'role' | 'adminScopes'>): Set<AdminScope> => {
  if (user.role !== 'admin') {
    return new Set<AdminScope>()
  }

  const explicitScopes = normalizeAdminScopes(user.adminScopes)
  if (explicitScopes.length > 0) {
    return new Set<AdminScope>(explicitScopes)
  }

  // Backward compatibility: admin sem escopo explicito recebe permissao total.
  return new Set<AdminScope>(ADMIN_SCOPES)
}

export const isAdminWriteScope = (scope: AdminScope): boolean => ADMIN_WRITE_SCOPES.has(scope)

export const canAdminUseScope = (
  user: Pick<IUser, 'role' | 'adminScopes' | 'adminReadOnly'>,
  scope: AdminScope
): { allowed: boolean; reason?: string } => {
  if (user.role !== 'admin') {
    return { allowed: false, reason: 'Acesso negado. Permissoes insuficientes.' }
  }

  const scopeSet = getAdminScopesForUser(user)
  if (!scopeSet.has(scope)) {
    return {
      allowed: false,
      reason: `Permissao admin em falta para o escopo '${scope}'.`,
    }
  }

  if (user.adminReadOnly && isAdminWriteScope(scope)) {
    return {
      allowed: false,
      reason: 'Perfil admin em modo read-only nao pode executar acoes de escrita.',
    }
  }

  return { allowed: true }
}
