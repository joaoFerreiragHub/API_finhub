type CaptchaProvider = 'disabled' | 'turnstile' | 'hcaptcha'

interface CaptchaVerifySuccessResponse {
  success?: boolean
  challenge_ts?: string
  hostname?: string
  score?: number
  'error-codes'?: string[]
}

interface CaptchaVerificationResult {
  success: boolean
  score?: number
  errorCodes: string[]
  provider: CaptchaProvider
}

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const providerRaw = (process.env.CAPTCHA_PROVIDER ?? 'disabled').trim().toLowerCase()
const provider: CaptchaProvider =
  providerRaw === 'turnstile' || providerRaw === 'hcaptcha' ? providerRaw : 'disabled'
const secretKey = (process.env.CAPTCHA_SECRET_KEY ?? '').trim()
const verifyTimeoutMs = parseInteger(process.env.CAPTCHA_TIMEOUT_MS, 8000)
const minScore = Number.parseFloat(process.env.CAPTCHA_MIN_SCORE ?? '0')

const resolveVerifyUrl = (selectedProvider: CaptchaProvider): string | null => {
  if (selectedProvider === 'disabled') return null

  const override = (process.env.CAPTCHA_VERIFY_URL ?? '').trim()
  if (override) return override

  if (selectedProvider === 'turnstile') {
    return 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
  }

  return 'https://hcaptcha.com/siteverify'
}

const verifyUrl = resolveVerifyUrl(provider)

export class CaptchaServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.name = 'CaptchaServiceError'
  }
}

class CaptchaService {
  isEnabled(): boolean {
    return provider !== 'disabled'
  }

  getProvider(): CaptchaProvider {
    return provider
  }

  private ensureConfigured(): void {
    if (!this.isEnabled()) return

    if (!secretKey) {
      throw new CaptchaServiceError(
        'CAPTCHA ativo mas sem CAPTCHA_SECRET_KEY configurada.',
        503
      )
    }

    if (!verifyUrl) {
      throw new CaptchaServiceError('CAPTCHA ativo mas sem endpoint de verificacao.', 503)
    }
  }

  async verifyToken(token: string, remoteIp?: string): Promise<CaptchaVerificationResult> {
    this.ensureConfigured()

    if (!this.isEnabled()) {
      return {
        success: true,
        errorCodes: [],
        provider,
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), verifyTimeoutMs)

    try {
      const formData = new URLSearchParams()
      formData.set('secret', secretKey)
      formData.set('response', token)
      if (remoteIp) {
        formData.set('remoteip', remoteIp)
      }

      const response = await fetch(verifyUrl as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new CaptchaServiceError(
          `Falha na verificacao CAPTCHA (${response.status}).`,
          502
        )
      }

      const payload = (await response.json()) as CaptchaVerifySuccessResponse

      const errorCodes = Array.isArray(payload['error-codes'])
        ? payload['error-codes'].map((item) => String(item))
        : []

      const score = typeof payload.score === 'number' ? payload.score : undefined

      return {
        success: Boolean(payload.success),
        score,
        errorCodes,
        provider,
      }
    } catch (error: unknown) {
      if (error instanceof CaptchaServiceError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new CaptchaServiceError('Timeout na verificacao CAPTCHA.', 504)
      }

      throw new CaptchaServiceError('Erro ao validar CAPTCHA.', 502)
    } finally {
      clearTimeout(timeout)
    }
  }

  async assertToken(token: string | undefined, remoteIp?: string): Promise<void> {
    if (!this.isEnabled()) return

    const normalizedToken = token?.trim()
    if (!normalizedToken) {
      throw new CaptchaServiceError('Token CAPTCHA obrigatorio.', 400)
    }

    const result = await this.verifyToken(normalizedToken, remoteIp)
    if (!result.success) {
      throw new CaptchaServiceError('Falha na validacao CAPTCHA.', 400)
    }

    if (typeof result.score === 'number' && Number.isFinite(minScore) && result.score < minScore) {
      throw new CaptchaServiceError('Score CAPTCHA abaixo do limite minimo.', 400)
    }
  }
}

export const captchaService = new CaptchaService()
