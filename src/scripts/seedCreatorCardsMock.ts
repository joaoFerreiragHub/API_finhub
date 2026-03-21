/**
 * Seed Mock Creator Cards – dados de teste para validação visual
 *
 * Cria 4 criadores com diferentes níveis de preenchimento:
 *   A) Tudo preenchido  – welcomeVideo + todas as redes + cardConfig completo
 *   B) Parcial          – sem vídeo, social parcial, cardConfig selective
 *   C) Sem cardConfig   – apenas bio/avatar (testa retrocompatibilidade)
 *   D) Mínimo           – bio + só tab cursos activa
 *
 * Cada criador tem artigos e/ou cursos associados para popular featuredContentIds.
 *
 * Run:   npx ts-node src/scripts/seedCreatorCardsMock.ts
 * Clean: npx ts-node src/scripts/seedCreatorCardsMock.ts --clean
 */

import '../config/env'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

import { User } from '../models/User'
import { Article } from '../models/Article'
import { Course } from '../models/Course'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finhub'

// ── Identificadores para limpeza fácil ─────────────────────────────────────
const MOCK_TAG = '_MOCK_CARD_TEST'
const MOCK_EMAIL_SUFFIX = '@mock-card-test.finhub'
const MOCK_PASSWORD = 'Mock1234!'

// ── Imagens públicas (Unsplash – sem autenticação necessária) ───────────────
const IMG = {
  finance1: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  finance2: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80',
  finance3: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&q=80',
  stocks:   'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80',
  savings:  'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
  crypto:   'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80',
}

// Vídeo de exemplo público – "How to Invest for Beginners" (Andrei Jikh, YT)
const WELCOME_VIDEO_URL = 'https://www.youtube.com/watch?v=r6VUMi_JOKQ'

// ── Definição dos 4 criadores ───────────────────────────────────────────────

interface MockCreator {
  email: string
  name: string
  username: string
  bio: string
  avatar: string
  welcomeVideoUrl?: string
  socialLinks?: { website?: string; twitter?: string; linkedin?: string; instagram?: string }
  cardConfig?: {
    showWelcomeVideo?: boolean
    showBio?: boolean
    showCourses?: boolean
    showArticles?: boolean
    showProducts?: boolean
    showWebsite?: boolean
    showSocialLinks?: boolean
    showRatings?: boolean
  }
  followers: number
  articles: Array<{
    title: string
    description: string
    coverImage: string
    category: string
    tags: string[]
  }>
  courses: Array<{
    title: string
    description: string
    coverImage: string
    category: string
    tags: string[]
    price: number
    level: 'beginner' | 'intermediate' | 'advanced'
    duration: number
    lessonsCount: number
  }>
}

const MOCK_CREATORS: MockCreator[] = [
  // ── A) TUDO PREENCHIDO ────────────────────────────────────────────────────
  {
    email: `marta_rodrigues${MOCK_EMAIL_SUFFIX}`,
    name: 'Marta Rodrigues',
    username: 'marta_financas',
    bio: 'Economista e investidora há 12 anos. Especialista em finanças pessoais, ETFs e planeamento da reforma. Autora do livro "Poupe com Propósito". 🎯 Missão: tornar as finanças simples para todos.',
    avatar: 'https://i.pravatar.cc/300?img=47',
    welcomeVideoUrl: WELCOME_VIDEO_URL,
    socialLinks: {
      website:   'https://martarodrigues.pt',
      twitter:   'https://twitter.com/martafinancas',
      linkedin:  'https://linkedin.com/in/marta-rodrigues-financas',
      instagram: 'https://instagram.com/marta.financas',
    },
    cardConfig: {
      showWelcomeVideo: true,
      showBio:          true,
      showCourses:      true,
      showArticles:     true,
      showProducts:     false,
      showWebsite:      true,
      showSocialLinks:  true,
      showRatings:      true,
    },
    followers: 3420,
    articles: [
      {
        title:       'Os 5 ETFs Essenciais para a Carteira de Qualquer Português',
        description: 'Guia prático sobre os ETFs mais adequados para investidores portugueses, com análise de custos e diversificação.',
        coverImage:  IMG.finance1,
        category:    'investing',
        tags:        ['etf', 'portugal', 'carteira', MOCK_TAG],
      },
      {
        title:       'Reforma Antecipada: O Método FIRE Adaptado a Portugal',
        description: 'Como alcançar independência financeira em Portugal com o movimento FIRE (Financial Independence, Retire Early).',
        coverImage:  IMG.finance3,
        category:    'personal-finance',
        tags:        ['fire', 'reforma', 'poupanca', MOCK_TAG],
      },
    ],
    courses: [
      {
        title:        'Finanças Pessoais do Zero: O Método Marta',
        description:  'Aprende a controlar gastos, criar uma reserva de emergência e começar a investir com confiança.',
        coverImage:   IMG.finance2,
        category:     'personal-finance',
        tags:         ['financas-pessoais', 'poupanca', 'investimento', MOCK_TAG],
        price:        79,
        level:        'beginner',
        duration:     8,
        lessonsCount: 24,
      },
      {
        title:        'ETFs & Indexação: Carteira para a Vida',
        description:  'Constrói uma carteira passiva de ETFs eficiente, de baixo custo e optimizada para o longo prazo.',
        coverImage:   IMG.finance1,
        category:     'investing',
        tags:         ['etf', 'indexacao', 'carteira', MOCK_TAG],
        price:        129,
        level:        'intermediate',
        duration:     12,
        lessonsCount: 36,
      },
    ],
  },

  // ── B) PARCIAL – sem vídeo, social parcial ────────────────────────────────
  {
    email: `bruno_afonso${MOCK_EMAIL_SUFFIX}`,
    name: 'Bruno Afonso',
    username: 'bruno_investimentos',
    bio: 'Analista financeiro independente. Foco em acções portuguesas e europeias. Partilho análises semanais e oportunidades de mercado.',
    avatar: 'https://i.pravatar.cc/300?img=53',
    socialLinks: {
      twitter:  'https://twitter.com/brunoafonso_inv',
      linkedin: 'https://linkedin.com/in/brunoafonso',
    },
    cardConfig: {
      showWelcomeVideo: false,
      showBio:          true,
      showCourses:      true,
      showArticles:     false,
      showProducts:     false,
      showWebsite:      false,
      showSocialLinks:  true,
      showRatings:      true,
    },
    followers: 890,
    articles: [
      {
        title:       'PSI 20: As Melhores Acções para 2026',
        description: 'Análise fundamentalista das principais empresas cotadas na bolsa portuguesa.',
        coverImage:  IMG.stocks,
        category:    'investing',
        tags:        ['psi20', 'acoes', 'portugal', MOCK_TAG],
      },
    ],
    courses: [
      {
        title:        'Análise Fundamentalista de Empresas Europeias',
        description:  'Aprende a analisar balanços, demonstrações de resultados e a identificar empresas subavaliadas.',
        coverImage:   IMG.stocks,
        category:     'investing',
        tags:         ['analise-fundamentalista', 'europa', 'acoes', MOCK_TAG],
        price:        99,
        level:        'intermediate',
        duration:     10,
        lessonsCount: 28,
      },
    ],
  },

  // ── C) SEM CARDCONFIG – retrocompatibilidade (mostra tudo) ────────────────
  {
    email: `sofia_lopes${MOCK_EMAIL_SUFFIX}`,
    name: 'Sofia Lopes',
    username: 'sofia_poupanca',
    bio: 'Professora de finanças pessoais. Ajudo famílias a sair das dívidas e a poupar de forma consistente. Sem jargão, só resultados.',
    avatar: 'https://i.pravatar.cc/300?img=44',
    followers: 1200,
    articles: [
      {
        title:       'Como Sair das Dívidas em 12 Meses: O Meu Método',
        description: 'Estratégia passo a passo para eliminar dívidas de crédito e reconstruir a saúde financeira.',
        coverImage:  IMG.savings,
        category:    'personal-finance',
        tags:        ['dividas', 'poupanca', 'metodo', MOCK_TAG],
      },
    ],
    courses: [],
  },

  // ── D) MÍNIMO – só tab cursos, sem social nem vídeo ───────────────────────
  {
    email: `diogo_maia${MOCK_EMAIL_SUFFIX}`,
    name: 'Diogo Maia',
    username: 'diogo_crypto',
    bio: 'Entusiasta de crypto e DeFi. Partilho conteúdo sobre Web3, NFTs e protocolos descentralizados.',
    avatar: 'https://i.pravatar.cc/300?img=61',
    cardConfig: {
      showWelcomeVideo: false,
      showBio:          true,
      showCourses:      true,
      showArticles:     false,
      showProducts:     false,
      showWebsite:      false,
      showSocialLinks:  false,
      showRatings:      false,
    },
    followers: 150,
    articles: [],
    courses: [
      {
        title:        'Introdução ao DeFi: O Futuro das Finanças',
        description:  'O que é DeFi, como funciona e como participar de forma segura sem perder dinheiro.',
        coverImage:   IMG.crypto,
        category:     'crypto',
        tags:         ['defi', 'crypto', 'blockchain', MOCK_TAG],
        price:        49,
        level:        'beginner',
        duration:     5,
        lessonsCount: 15,
      },
    ],
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

async function createMockLesson(index: number) {
  return {
    title:    `Aula ${index + 1}`,
    duration: 20 + index * 5,
    videoUrl: WELCOME_VIDEO_URL,
    isFree:   index === 0,
    order:    index + 1,
  }
}

// ── Seed ────────────────────────────────────────────────────────────────────

async function seedMockCreators() {
  const passwordHash = await bcrypt.hash(MOCK_PASSWORD, 10)

  for (const data of MOCK_CREATORS) {
    console.log(`  → Upsert creator: ${data.username}`)

    const userDoc = await User.findOneAndUpdate(
      { email: data.email },
      {
        $set: {
          email:          data.email,
          emailVerified:  true,
          password:       passwordHash,
          name:           data.name,
          username:       data.username,
          role:           'creator',
          accountStatus:  'active',
          bio:            data.bio,
          avatar:         data.avatar,
          followers:      data.followers,
          ...(data.welcomeVideoUrl ? { welcomeVideoUrl: data.welcomeVideoUrl } : {}),
          ...(data.socialLinks    ? { socialLinks:     data.socialLinks }     : {}),
          ...(data.cardConfig     ? { cardConfig:      data.cardConfig }      : {}),
          creatorControls: {
            creationBlocked:  false,
            publishingBlocked: false,
          },
          adminReadOnly:   false,
          tokenVersion:    0,
          legalAcceptance: { acceptedAt: new Date(), version: '1.0' },
          cookieConsent:   { analytics: true, marketing: false, acceptedAt: new Date() },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    const creatorId = userDoc._id

    // Artigos
    for (const art of data.articles) {
      const exists = await Article.findOne({
        creator: creatorId,
        title: art.title,
        tags:  { $in: [MOCK_TAG] },
      })
      if (!exists) {
        await Article.create({
          ...art,
          content:     `<p>${art.description}</p><p>Conteúdo de teste para validação visual do cartão de criador.</p>`,
          contentType: 'article',
          status:      'published',
          isPremium:   false,
          isFeatured:  false,
          creator:     creatorId,
          ownerType:   'creator_owned',
          publishedAt: new Date(),
        })
      }
    }

    // Cursos
    for (const crs of data.courses) {
      const exists = await Course.findOne({
        creator: creatorId,
        title:   crs.title,
        tags:    { $in: [MOCK_TAG] },
      })
      if (!exists) {
        const lessons = await Promise.all(
          Array.from({ length: Math.min(crs.lessonsCount, 3) }, (_, i) => createMockLesson(i)),
        )
        await Course.create({
          ...crs,
          content:     `<p>${crs.description}</p><p>Conteúdo de teste para validação visual do cartão de criador.</p>`,
          contentType: 'course',
          status:      'published',
          isPremium:   true,
          isFeatured:  false,
          creator:     creatorId,
          ownerType:   'creator_owned',
          publishedAt: new Date(),
          lessons,
        })
      }
    }

    console.log(`    ✅ ${data.name} pronto (${data.articles.length} artigos, ${data.courses.length} cursos)`)
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanMockCreators() {
  console.log('🗑️  A remover criadores mock...')

  // Apagar utilizadores mock
  const users = await User.find({ email: { $regex: MOCK_EMAIL_SUFFIX + '$' } }, '_id email')
  const userIds = users.map(u => u._id)
  console.log(`  Encontrados ${users.length} utilizadores mock: ${users.map(u => u.email).join(', ')}`)

  // Apagar conteúdo associado (por criador ou por tag)
  const [deletedArticles, deletedCourses] = await Promise.all([
    Article.deleteMany({ $or: [{ creator: { $in: userIds } }, { tags: MOCK_TAG }] }),
    Course.deleteMany({  $or: [{ creator: { $in: userIds } }, { tags: MOCK_TAG }] }),
  ])

  await User.deleteMany({ email: { $regex: MOCK_EMAIL_SUFFIX + '$' } })

  console.log(`  ✅ Removidos ${users.length} utilizadores, ${deletedArticles.deletedCount} artigos, ${deletedCourses.deletedCount} cursos`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isClean = process.argv.includes('--clean')

  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Ligado ao MongoDB\n')

    if (isClean) {
      await cleanMockCreators()
    } else {
      console.log('🌱 A criar criadores mock para teste visual dos cards...\n')
      await seedMockCreators()
      console.log('\n✅ Criadores mock inseridos!\n')
      console.log('📋 Contas criadas (password: Mock1234!):')
      for (const c of MOCK_CREATORS) {
        const label = c.cardConfig === undefined
          ? '(sem cardConfig – retrocompat)'
          : c.welcomeVideoUrl
            ? '(tudo preenchido)'
            : Object.values(c.cardConfig).filter(Boolean).length >= 6
              ? '(parcial)'
              : '(mínimo)'
        console.log(`  ${c.email.padEnd(44)} → /creators/${c.username}  ${label}`)
      }
      console.log('\n⚠️  Limpar antes da beta: npx ts-node src/scripts/seedCreatorCardsMock.ts --clean')
    }
  } catch (err) {
    console.error('❌ Erro:', err)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

main()
