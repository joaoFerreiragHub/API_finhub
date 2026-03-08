export interface PaginationInput {
  page?: number
  limit?: number
}

export interface PaginationConfig {
  defaultPage?: number
  defaultLimit: number
  maxLimit: number
}

export interface ResolvedPagination {
  page: number
  limit: number
  skip: number
}

const toPositiveIntegerOrUndefined = (value?: number): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined
  return Math.floor(value)
}

export const normalizePage = (
  value: number | undefined,
  defaultPage = 1
): number => {
  return toPositiveIntegerOrUndefined(value) ?? Math.max(1, Math.floor(defaultPage))
}

export const normalizeLimit = (
  value: number | undefined,
  config: Pick<PaginationConfig, 'defaultLimit' | 'maxLimit'>
): number => {
  const defaultLimit = Math.max(1, Math.floor(config.defaultLimit))
  const maxLimit = Math.max(defaultLimit, Math.floor(config.maxLimit))
  const normalized = toPositiveIntegerOrUndefined(value) ?? defaultLimit
  return Math.min(normalized, maxLimit)
}

export const resolvePagination = (
  input: PaginationInput | undefined,
  config: PaginationConfig
): ResolvedPagination => {
  const page = normalizePage(input?.page, config.defaultPage ?? 1)
  const limit = normalizeLimit(input?.limit, config)
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}
