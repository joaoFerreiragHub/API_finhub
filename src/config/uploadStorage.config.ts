export type UploadStorageProvider = 'local' | 's3'

export interface UploadS3RuntimeConfig {
  bucket: string
  region: string
  endpoint: string
  publicBaseUrl: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

const parseBoolean = (rawValue: string | undefined, fallback: boolean): boolean => {
  if (rawValue === undefined) return fallback
  const normalized = rawValue.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

export const resolveRequestedUploadStorageProvider = (): UploadStorageProvider => {
  const rawProvider = (process.env.UPLOAD_STORAGE_PROVIDER ?? 'local').trim().toLowerCase()
  return rawProvider === 's3' ? 's3' : 'local'
}

export const resolveUploadS3RuntimeConfig = (): UploadS3RuntimeConfig => {
  const endpoint = stripTrailingSlashes((process.env.UPLOAD_S3_ENDPOINT ?? '').trim())
  return {
    bucket: (process.env.UPLOAD_S3_BUCKET ?? process.env.AWS_S3_BUCKET ?? '').trim(),
    region: (process.env.UPLOAD_S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1').trim(),
    endpoint,
    publicBaseUrl: stripTrailingSlashes((process.env.UPLOAD_S3_PUBLIC_BASE_URL ?? '').trim()),
    accessKeyId: (
      process.env.UPLOAD_S3_ACCESS_KEY_ID ??
      process.env.AWS_ACCESS_KEY_ID ??
      ''
    ).trim(),
    secretAccessKey: (
      process.env.UPLOAD_S3_SECRET_ACCESS_KEY ??
      process.env.AWS_SECRET_ACCESS_KEY ??
      ''
    ).trim(),
    forcePathStyle: parseBoolean(process.env.UPLOAD_S3_FORCE_PATH_STYLE, Boolean(endpoint)),
  }
}

export const isUploadS3ConfigReady = (config: UploadS3RuntimeConfig): boolean => {
  return (
    config.bucket.length > 0 &&
    config.accessKeyId.length > 0 &&
    config.secretAccessKey.length > 0
  )
}

export const resolveEffectiveUploadStorageProvider = (): UploadStorageProvider => {
  const requestedProvider = resolveRequestedUploadStorageProvider()
  if (requestedProvider !== 's3') return 'local'
  return isUploadS3ConfigReady(resolveUploadS3RuntimeConfig()) ? 's3' : 'local'
}
