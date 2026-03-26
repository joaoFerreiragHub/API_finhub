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
    content: `<h2>1. Aceitação dos Termos</h2>
<p>Ao acederes à FinHub, aceitas ficar vinculado a estes Termos de Serviço e
à nossa Política de Privacidade. Se não concordares, não deves utilizar a plataforma.</p>

<h2>2. Descrição do Serviço</h2>
<p>A FinHub é uma plataforma de literacia financeira que disponibiliza conteúdo
educativo, ferramentas de simulação financeira e uma comunidade de utilizadores.
O conteúdo tem fins exclusivamente informativos e não constitui aconselhamento
financeiro.</p>

<h2>3. Conta de Utilizador</h2>
<p>Para acederes a funcionalidades completas é necessário criar uma conta. És
responsável por manter a confidencialidade das tuas credenciais e por todas as
actividades realizadas na tua conta.</p>

<h2>4. Regras de Conduta</h2>
<p>Comprometes-te a não publicar conteúdo ilegal, ofensivo, difamatório ou
enganoso. A FinHub reserva-se o direito de remover conteúdo e suspender contas
que violem estas regras.</p>

<h2>5. Propriedade Intelectual</h2>
<p>O conteúdo da plataforma (artigos, vídeos, análises) pertence aos respectivos
criadores. A FinHub concede-te uma licença limitada, não exclusiva e não
transferível para uso pessoal.</p>

<h2>6. Isenção de Responsabilidade</h2>
<p>A FinHub não garante a exactidão, completude ou actualidade do conteúdo. O uso
de ferramentas de simulação (FIRE calculator, análise de stocks) é da tua
exclusiva responsabilidade.</p>

<h2>7. Subscrições e Pagamentos</h2>
<p>Os planos pagos são processados de forma segura. Podes cancelar em qualquer
momento. O reembolso é avaliado caso a caso conforme a legislação aplicável.</p>

<h2>8. Protecção de Dados</h2>
<p>O tratamento dos teus dados pessoais é feito de acordo com o RGPD e com a
nossa Política de Privacidade, disponível em <a href="/legal/privacidade">
/legal/privacidade</a>.</p>

<h2>9. Alterações aos Termos</h2>
<p>Podemos actualizar estes termos. Serás notificado de alterações significativas.
A continuação do uso da plataforma após notificação implica aceitação.</p>

<h2>10. Lei Aplicável</h2>
<p>Estes Termos são regidos pela lei portuguesa. Qualquer litígio será submetido
aos tribunais competentes de Portugal.</p>`,
  },
  privacy: {
    key: 'privacy',
    title: 'Politica de Privacidade',
    version: LEGAL_VERSION,
    lastUpdatedAt: LEGAL_LAST_UPDATED,
    requiredAtSignup: true,
    routePath: '/privacidade',
    summary: 'Como recolhemos, tratamos e protegemos dados pessoais (RGPD).',
    content: `<h2>1. Responsável pelo Tratamento</h2>
<p>A FinHub é responsável pelo tratamento dos teus dados pessoais, nos termos do
Regulamento Geral sobre a Protecção de Dados (RGPD — Regulamento EU 2016/679).</p>

<h2>2. Dados que Recolhemos</h2>
<ul>
  <li><strong>Dados de conta:</strong> nome, endereço de email, palavra-passe (armazenada
  em hash bcrypt)</li>
  <li><strong>Dados de perfil:</strong> bio, avatar, tópicos de interesse, redes sociais
  (opcionais)</li>
  <li><strong>Dados de uso:</strong> páginas visitadas, conteúdo interagido, eventos de
  navegação (apenas com consentimento)</li>
  <li><strong>Dados técnicos:</strong> endereço IP, browser, sistema operativo (logs de
  segurança)</li>
</ul>

<h2>3. Finalidade e Base Legal</h2>
<ul>
  <li>Execução do contrato (Art. 6.1.b RGPD): prestação do serviço, autenticação,
  comunicações de conta</li>
  <li>Consentimento (Art. 6.1.a RGPD): analytics de navegação via PostHog</li>
  <li>Interesse legítimo (Art. 6.1.f RGPD): segurança, prevenção de fraude,
  melhoria do serviço</li>
</ul>

<h2>4. Retenção de Dados</h2>
<p>Os dados de conta são conservados enquanto a conta estiver activa. Após
encerramento, os dados são anonimizados ou eliminados no prazo máximo de 30 dias,
salvo obrigação legal em contrário. Logs de auditoria: 2 anos. Logs de moderação:
1 ano.</p>

<h2>5. Os Teus Direitos</h2>
<p>Nos termos do RGPD, tens direito a: acesso, rectificação, apagamento, portabilidade,
limitação do tratamento e oposição. Para exercer os teus direitos, contacta-nos
através da plataforma ou por email. A exportação de dados está disponível em
<a href="/conta/definicoes">/conta/definicoes</a>.</p>

<h2>6. Transferências Internacionais</h2>
<p>Os dados são tratados em servidores localizados na União Europeia. O PostHog é
utilizado na instância europeia (eu.posthog.com). Não transferimos dados para países
terceiros sem as salvaguardas adequadas.</p>

<h2>7. Cookies e Analytics</h2>
<p>Utilizamos cookies essenciais (necessários para o funcionamento) e cookies de
analytics (PostHog), apenas com o teu consentimento explícito. Podes gerir as tuas
preferências em <a href="/conta/definicoes">Definições da conta</a>.</p>

<h2>8. Contacto e Reclamações</h2>
<p>Para questões de privacidade: utiliza o formulário de contacto na plataforma.
Tens o direito de apresentar reclamação à autoridade de controlo (CNPD —
Comissão Nacional de Protecção de Dados, www.cnpd.pt).</p>`,
  },
  cookies: {
    key: 'cookies',
    title: 'Politica de Cookies',
    version: LEGAL_VERSION,
    lastUpdatedAt: LEGAL_LAST_UPDATED,
    requiredAtSignup: false,
    routePath: '/cookies',
    summary: 'Regras de uso de cookies essenciais e nao essenciais.',
    content: `<h2>1. O que são Cookies</h2>
<p>Cookies são pequenos ficheiros de texto guardados no teu dispositivo quando
visitas um website. Permitem que o site memorize as tuas preferências e melhore
a tua experiência.</p>

<h2>2. Cookies que Utilizamos</h2>
<h3>Cookies Essenciais (sem necessidade de consentimento)</h3>
<ul>
  <li><strong>Sessão de autenticação:</strong> JWT token para manteres sessão iniciada</li>
  <li><strong>Preferência de consentimento:</strong> registo da tua escolha sobre cookies</li>
</ul>
<h3>Cookies de Analytics (requerem consentimento)</h3>
<ul>
  <li><strong>PostHog:</strong> eventos de navegação e uso — apenas activado se aceitares.
  Podes revogar em <a href="/conta/definicoes">/conta/definicoes</a>.</li>
</ul>

<h2>3. Gestão de Consentimento</h2>
<p>Na primeira visita apresentamos um banner com as opções "Aceitar" e "Recusar".
A tua escolha é guardada e respeitada. Podes alterar a preferência em qualquer
momento em <a href="/conta/definicoes">Definições da conta</a>.</p>

<h2>4. Cookies de Terceiros</h2>
<p>Não utilizamos cookies de publicidade ou rastreamento de terceiros. O PostHog
é configurado na instância europeia e apenas activado com consentimento explícito.</p>

<h2>5. Como Recusar</h2>
<p>Podes recusar cookies não essenciais no banner ou nas definições da conta.
Podes também configurar o teu browser para bloquear cookies, o que pode afectar
algumas funcionalidades.</p>`,
  },
  'financial-disclaimer': {
    key: 'financial-disclaimer',
    title: 'Aviso Legal Financeiro',
    version: LEGAL_VERSION,
    lastUpdatedAt: LEGAL_LAST_UPDATED,
    requiredAtSignup: true,
    routePath: '/aviso-legal',
    summary: 'Conteudo informativo, nao constitui aconselhamento financeiro.',
    content: `<h2>Conteúdo Informativo e Educacional</h2>
<p>Todo o conteúdo da FinHub — artigos, vídeos, podcasts, cursos, análises de
activos, simulações FIRE e posts da comunidade — tem fins exclusivamente
informativos e educacionais.</p>

<h2>Não Constitui Aconselhamento Financeiro</h2>
<p>A FinHub não é uma instituição financeira nem um intermediário autorizado
pela CMVM. O conteúdo não constitui recomendação personalizada de investimento,
aconselhamento financeiro, fiscal ou jurídico, nem oferta de compra ou venda de
instrumentos financeiros.</p>

<h2>Risco de Investimento</h2>
<p>Investir envolve risco de perda, incluindo perda total do capital. O desempenho
passado não garante resultados futuros.</p>

<h2>Simulações e Ferramentas</h2>
<p>As ferramentas de simulação (FIRE calculator, análise de stocks) baseiam-se em
modelos matemáticos com pressupostos simplificados. Os resultados são estimativas
ilustrativas, não previsões.</p>

<h2>Consulta de Profissional</h2>
<p>Para decisões de investimento significativas, recomendamos consultar um consultor
financeiro independente certificado e registado na CMVM.</p>`,
  },
}

export const isLegalDocumentKey = (value: string): value is LegalDocumentKey =>
  value in legalDocuments

export const listLegalDocuments = (): LegalDocument[] =>
  Object.values(legalDocuments).map((document) => ({ ...document }))

export const getLegalDocument = (key: LegalDocumentKey): LegalDocument => ({
  ...legalDocuments[key],
})
