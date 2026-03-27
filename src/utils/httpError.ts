interface InternalErrorPayload {
  error: string
  details?: string
}

const isProductionEnvironment = (): boolean =>
  (process.env.NODE_ENV ?? 'development') === 'production'

export const resolveErrorDetails = (error: unknown): string | undefined => {
  if (isProductionEnvironment()) {
    return undefined
  }

  if (!(error instanceof Error)) {
    return undefined
  }

  const message = error.message.trim()
  return message.length > 0 ? message : undefined
}

export const buildInternalErrorPayload = (
  message: string,
  error: unknown
): InternalErrorPayload => {
  const details = resolveErrorDetails(error)
  return details ? { error: message, details } : { error: message }
}
