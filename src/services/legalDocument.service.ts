export type LegalDocumentKey = 'terms' | 'privacy' | 'cookies' | 'financial-disclaimer'

export interface LegalDocument {
  key: LegalDocumentKey
  title: string
  version: string
  lastUpdatedAt: string
  requiredAtSignup: boolean
  routePath: string
  summary: string
  content: string
}

const LEGAL_VERSION = (process.env.LEGAL_VERSION ?? 'v1').trim() || 'v1'
const LEGAL_LAST_UPDATED =
  (process.env.LEGAL_LAST_UPDATED ?? new Date().toISOString()).trim() || new Date().toISOString()

const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    key: 'terms',
    title: 'Termos de Servico',
    version: LEGAL_VERSION,
    lastUpdatedAt: LEGAL_LAST_UPDATED,
    requiredAtSignup: true,
    routePath: '/termos',
    summary: 'Condicoes de utilizacao da plataforma e responsabilidades das partes.',
    content:
      'Ao criar conta no FinHub, aceitas cumprir os termos de uso, incluindo regras de conduta, conteudo permitido e responsabilidades de seguranca da tua conta.',
  },
  privacy: {
    key: 'privacy',
    title: 'Politica de Privacidade',
    version: LEGAL_VERSION,
    lastUpdatedAt: LEGAL_LAST_UPDATED,
    requiredAtSignup: true,
    routePath: '/privacidade',
    summary: 'Como recolhemos, tratamos e protegemos dados pessoais (RGPD).',
    content:
      'O FinHub recolhe apenas dados necessarios para operacao da plataforma. Tens direito a acesso, retificacao e eliminacao dos teus dados de acordo com RGPD.',
  },
  cookies: {
    key: 'cookies',
    title: 'Politica de Cookies',
    version: LEGAL_VERSION,
    lastUpdatedAt: LEGAL_LAST_UPDATED,
    requiredAtSignup: false,
    routePath: '/cookies',
    summary: 'Regras de uso de cookies essenciais e nao essenciais.',
    content:
      'Usamos cookies essenciais para autenticacao e seguranca. Cookies de analytics e preferencias so devem ser ativados com consentimento explicito.',
  },
  'financial-disclaimer': {
    key: 'financial-disclaimer',
    title: 'Aviso Legal Financeiro',
    version: LEGAL_VERSION,
    lastUpdatedAt: LEGAL_LAST_UPDATED,
    requiredAtSignup: true,
    routePath: '/aviso-legal',
    summary: 'Conteudo informativo, nao constitui aconselhamento financeiro.',
    content:
      'O conteudo do FinHub tem fins informativos e educacionais. Nao constitui recomendacao personalizada de investimento nem aconselhamento financeiro.',
  },
}

export const isLegalDocumentKey = (value: string): value is LegalDocumentKey =>
  value in legalDocuments

export const listLegalDocuments = (): LegalDocument[] =>
  Object.values(legalDocuments).map((document) => ({ ...document }))

export const getLegalDocument = (key: LegalDocumentKey): LegalDocument => ({
  ...legalDocuments[key],
})

