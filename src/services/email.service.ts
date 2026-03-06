import axios from 'axios'
import { logError, logInfo, logWarn } from '../utils/logger'

type EmailProvider = 'disabled' | 'console' | 'resend' | 'sendgrid'
type EmailCategory =
  | 'verification'
  | 'password_reset'
  | 'welcome'
  | 'moderation_alert'
  | 'operational_test'

interface EmailSendInput {
  toEmail: string
  toName?: string
  subject: string
  html: string
  text?: string
  category: EmailCategory
}

export interface EmailSendResult {
  accepted: boolean
  provider: EmailProvider
  skipped: boolean
  reason?: string
  messageId?: string
}

interface SendGridResponseHeaders {
  'x-message-id'?: string
}

const DEFAULT_APP_BASE_URL = 'http://localhost:5173'
const DEFAULT_EMAIL_PROVIDER: EmailProvider = 'disabled'
const DEFAULT_RESEND_BASE_URL = 'https://api.resend.com'
const DEFAULT_SENDGRID_BASE_URL = 'https://api.sendgrid.com'

const normalizeProvider = (rawProvider: string | undefined): EmailProvider => {
  const normalized = (rawProvider ?? '').trim().toLowerCase()

  if (normalized === 'console') return 'console'
  if (normalized === 'resend') return 'resend'
  if (normalized === 'sendgrid') return 'sendgrid'
  if (normalized === 'disabled') return 'disabled'

  return DEFAULT_EMAIL_PROVIDER
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const toPlainText = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

const buildActionTemplate = (
  recipientName: string,
  title: string,
  message: string,
  actionLabel?: string,
  actionUrl?: string
): string => {
  const safeName = escapeHtml(recipientName)
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)
  const safeActionLabel = actionLabel ? escapeHtml(actionLabel) : undefined
  const safeActionUrl = actionUrl ? escapeHtml(actionUrl) : undefined

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
      <p style="margin:0 0 12px">Ola ${safeName},</p>
      <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px">${safeTitle}</h1>
      <p style="line-height:1.6;margin:0 0 16px">${safeMessage}</p>
      ${
        safeActionLabel && safeActionUrl
          ? `<p style="margin:0 0 20px">
              <a href="${safeActionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px">
                ${safeActionLabel}
              </a>
            </p>`
          : ''
      }
      <p style="font-size:12px;color:#6b7280;margin:0">Equipe FinHub</p>
    </div>
  `
}

class EmailService {
  private readonly provider: EmailProvider
  private readonly fromAddress: string
  private readonly fromName: string
  private readonly resendApiKey: string
  private readonly sendGridApiKey: string
  private readonly resendBaseUrl: string
  private readonly sendGridBaseUrl: string
  private readonly appBaseUrl: string

  constructor() {
    this.provider = normalizeProvider(process.env.EMAIL_PROVIDER)
    this.fromAddress = (process.env.EMAIL_FROM_ADDRESS ?? '').trim()
    this.fromName = (process.env.EMAIL_FROM_NAME ?? 'FinHub').trim()
    this.resendApiKey = (process.env.EMAIL_RESEND_API_KEY ?? '').trim()
    this.sendGridApiKey = (process.env.EMAIL_SENDGRID_API_KEY ?? '').trim()
    this.resendBaseUrl = stripTrailingSlashes(
      (process.env.EMAIL_RESEND_BASE_URL ?? DEFAULT_RESEND_BASE_URL).trim()
    )
    this.sendGridBaseUrl = stripTrailingSlashes(
      (process.env.EMAIL_SENDGRID_BASE_URL ?? DEFAULT_SENDGRID_BASE_URL).trim()
    )
    this.appBaseUrl = stripTrailingSlashes(
      (
        process.env.EMAIL_APP_BASE_URL ??
        process.env.FRONTEND_URL ??
        DEFAULT_APP_BASE_URL
      ).trim()
    )

    logInfo('email_service_initialized', this.getRuntimeState())
  }

  getRuntimeState() {
    return {
      provider: this.provider,
      enabled: this.canSend().ok,
      fromConfigured: this.fromAddress.length > 0,
      resendConfigured: this.resendApiKey.length > 0,
      sendgridConfigured: this.sendGridApiKey.length > 0,
      appBaseUrl: this.appBaseUrl,
    }
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const runtimeValidation = this.canSend()
    if (!runtimeValidation.ok) {
      const reason = runtimeValidation.reason ?? 'email_provider_not_available'
      logWarn('email_send_skipped', {
        provider: this.provider,
        reason,
        category: input.category,
        toEmail: input.toEmail,
      })
      return {
        accepted: false,
        provider: this.provider,
        skipped: true,
        reason,
      }
    }

    if (this.provider === 'console') {
      logInfo('email_send_console', {
        category: input.category,
        toEmail: input.toEmail,
        subject: input.subject,
      })

      return {
        accepted: true,
        provider: this.provider,
        skipped: false,
        messageId: `console-${Date.now()}`,
      }
    }

    if (this.provider === 'resend') {
      return this.sendViaResend(input)
    }

    if (this.provider === 'sendgrid') {
      return this.sendViaSendGrid(input)
    }

    return {
      accepted: false,
      provider: this.provider,
      skipped: true,
      reason: 'unsupported_provider',
    }
  }

  async sendWelcomeEmail(params: {
    toEmail: string
    recipientName: string
  }): Promise<EmailSendResult> {
    const html = buildActionTemplate(
      params.recipientName,
      'Bem-vindo ao FinHub',
      'A tua conta foi criada com sucesso. Obrigado por te juntares a plataforma.',
      'Abrir FinHub',
      this.appBaseUrl
    )

    return this.send({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject: 'Bem-vindo ao FinHub',
      html,
      text: toPlainText(html),
      category: 'welcome',
    })
  }

  async sendVerificationEmail(params: {
    toEmail: string
    recipientName: string
    verificationToken: string
  }): Promise<EmailSendResult> {
    const verificationUrl = `${this.appBaseUrl}/verificar-email?token=${encodeURIComponent(
      params.verificationToken
    )}`
    const html = buildActionTemplate(
      params.recipientName,
      'Verifica o teu email',
      'Para continuares com acesso total, confirma o teu endereco de email.',
      'Verificar email',
      verificationUrl
    )

    return this.send({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject: 'Confirma o teu email - FinHub',
      html,
      text: toPlainText(html),
      category: 'verification',
    })
  }

  async sendPasswordResetEmail(params: {
    toEmail: string
    recipientName: string
    resetToken: string
    expiresInMinutes: number
  }): Promise<EmailSendResult> {
    const resetUrl = `${this.appBaseUrl}/reset-password?token=${encodeURIComponent(
      params.resetToken
    )}`
    const html = buildActionTemplate(
      params.recipientName,
      'Reset de password',
      `Recebemos um pedido para redefinir a tua password. Este link expira em ${params.expiresInMinutes} minutos.`,
      'Redefinir password',
      resetUrl
    )

    return this.send({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject: 'Reset de password - FinHub',
      html,
      text: toPlainText(html),
      category: 'password_reset',
    })
  }

  async sendModerationAlertEmail(params: {
    toEmail: string
    recipientName: string
    action: string
    reason: string
  }): Promise<EmailSendResult> {
    const html = buildActionTemplate(
      params.recipientName,
      'Atualizacao de moderacao',
      `A tua conta recebeu a acao "${params.action}". Motivo: ${params.reason}.`
    )

    return this.send({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject: 'Atualizacao de moderacao - FinHub',
      html,
      text: toPlainText(html),
      category: 'moderation_alert',
    })
  }

  async sendOperationalTestEmail(params: {
    toEmail: string
    recipientName: string
  }): Promise<EmailSendResult> {
    const html = buildActionTemplate(
      params.recipientName,
      'Email de teste operacional',
      'Este email confirma que o provider transacional esta configurado e operacional.'
    )

    return this.send({
      toEmail: params.toEmail,
      toName: params.recipientName,
      subject: 'FinHub - teste de email',
      html,
      text: toPlainText(html),
      category: 'operational_test',
    })
  }

  private buildFromAddressString(): string {
    if (!this.fromName) {
      return this.fromAddress
    }

    return `${this.fromName} <${this.fromAddress}>`
  }

  private canSend(): { ok: boolean; reason?: string } {
    if (this.provider === 'disabled') {
      return {
        ok: false,
        reason: 'provider_disabled',
      }
    }

    if (this.fromAddress.length === 0) {
      return {
        ok: false,
        reason: 'missing_from_address',
      }
    }

    if (this.provider === 'resend' && this.resendApiKey.length === 0) {
      return {
        ok: false,
        reason: 'missing_resend_api_key',
      }
    }

    if (this.provider === 'sendgrid' && this.sendGridApiKey.length === 0) {
      return {
        ok: false,
        reason: 'missing_sendgrid_api_key',
      }
    }

    return { ok: true }
  }

  private async sendViaResend(input: EmailSendInput): Promise<EmailSendResult> {
    try {
      const response = await axios.post<{ id?: string }>(
        `${this.resendBaseUrl}/emails`,
        {
          from: this.buildFromAddressString(),
          to: [input.toEmail],
          subject: input.subject,
          html: input.html,
          text: input.text ?? toPlainText(input.html),
          tags: [{ name: 'category', value: input.category }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }
      )

      return {
        accepted: true,
        provider: this.provider,
        skipped: false,
        messageId: response.data.id,
      }
    } catch (error) {
      logError('email_send_resend_failed', error, {
        category: input.category,
        toEmail: input.toEmail,
      })

      return {
        accepted: false,
        provider: this.provider,
        skipped: false,
        reason: 'provider_request_failed',
      }
    }
  }

  private async sendViaSendGrid(input: EmailSendInput): Promise<EmailSendResult> {
    try {
      const sendGridHeaders: Record<string, string> = {
        Authorization: `Bearer ${this.sendGridApiKey}`,
        'Content-Type': 'application/json',
      }

      const response = await axios.post<unknown>(
        `${this.sendGridBaseUrl}/v3/mail/send`,
        {
          personalizations: [
            {
              to: [{ email: input.toEmail, name: input.toName }],
              custom_args: {
                category: input.category,
              },
            },
          ],
          from: {
            email: this.fromAddress,
            name: this.fromName || undefined,
          },
          subject: input.subject,
          content: [
            {
              type: 'text/plain',
              value: input.text ?? toPlainText(input.html),
            },
            {
              type: 'text/html',
              value: input.html,
            },
          ],
        },
        {
          headers: sendGridHeaders,
          timeout: 7000,
          validateStatus: (status) => status >= 200 && status < 300,
        }
      )

      const headers = response.headers as SendGridResponseHeaders

      return {
        accepted: true,
        provider: this.provider,
        skipped: false,
        messageId: headers['x-message-id'],
      }
    } catch (error) {
      logError('email_send_sendgrid_failed', error, {
        category: input.category,
        toEmail: input.toEmail,
      })

      return {
        accepted: false,
        provider: this.provider,
        skipped: false,
        reason: 'provider_request_failed',
      }
    }
  }
}

export const emailService = new EmailService()

