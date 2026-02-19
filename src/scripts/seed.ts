/**
 * Seed Script - Popular BD com dados de teste
 *
 * Run: npx ts-node src/scripts/seed.ts
 */

import '../config/env'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'
import { Article } from '../models/Article'
import { Video } from '../models/Video'
import { Course } from '../models/Course'
import { Podcast } from '../models/Podcast'
import { Brand } from '../models/Brand'
import { Rating } from '../models/Rating'
import { Comment } from '../models/Comment'
import { Follow } from '../models/Follow'
import { Favorite } from '../models/Favorite'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finhub'

// ==========================================
// Dados de Teste
// ==========================================

const USERS_DATA = [
  {
    email: 'admin@finhub.com',
    password: 'admin123',
    name: 'Admin FinHub',
    username: 'admin_finhub',
    role: 'admin' as const,
    bio: 'Administrador da plataforma FinHub',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  {
    email: 'creator1@finhub.com',
    password: 'creator123',
    name: 'Ricardo Santos',
    username: 'ricardo_trading',
    role: 'creator' as const,
    bio: 'Trader profissional com 10 anos de experiência em mercados financeiros. Especialista em análise técnica e day trading.',
    avatar: 'https://i.pravatar.cc/150?img=12',
  },
  {
    email: 'creator2@finhub.com',
    password: 'creator123',
    name: 'Ana Costa',
    username: 'ana_crypto',
    role: 'creator' as const,
    bio: 'Investidora em criptomoedas desde 2017. Fundadora de comunidade de educação financeira.',
    avatar: 'https://i.pravatar.cc/150?img=5',
  },
  {
    email: 'creator3@finhub.com',
    password: 'creator123',
    name: 'João Ferreira',
    username: 'joao_stocks',
    role: 'creator' as const,
    bio: 'Analista de ações e ETFs. Foco em investimento de longo prazo e dividendos.',
    avatar: 'https://i.pravatar.cc/150?img=8',
  },
  {
    email: 'user1@test.com',
    password: 'user123',
    name: 'Maria Silva',
    username: 'maria_silva',
    role: 'free' as const,
    bio: 'Apaixonada por finanças pessoais',
    avatar: 'https://i.pravatar.cc/150?img=23',
  },
  {
    email: 'user2@test.com',
    password: 'user123',
    name: 'Pedro Alves',
    username: 'pedro_alves',
    role: 'premium' as const,
    bio: 'Investidor iniciante aprendendo sobre o mercado',
    avatar: 'https://i.pravatar.cc/150?img=15',
  },
]

const ARTICLES_DATA = [
  {
    title: 'Como Começar a Investir em 2026',
    description: 'Guia completo para iniciantes que querem começar a investir no mercado financeiro',
    content: '<h2>Introdução ao Investimento</h2><p>Investir pode parecer intimidante no início, mas com conhecimento adequado, qualquer pessoa pode começar...</p><h3>Primeiros Passos</h3><p>1. Defina seus objetivos financeiros<br>2. Monte uma reserva de emergência<br>3. Estude sobre diferentes tipos de investimento</p>',
    category: 'investing',
    tags: ['iniciantes', 'investimento', 'finanças'],
    coverImage: 'https://picsum.photos/800/400?random=1',
    isPremium: false,
    isFeatured: true,
  },
  {
    title: 'Análise Técnica: Padrões de Candlestick',
    description: 'Aprenda os principais padrões de candlestick para melhorar suas operações',
    content: '<h2>Padrões de Candlestick</h2><p>Os padrões de candlestick são fundamentais para análise técnica...</p>',
    category: 'trading',
    tags: ['análise técnica', 'candlestick', 'trading'],
    coverImage: 'https://picsum.photos/800/400?random=2',
    isPremium: true,
  },
  {
    title: 'Bitcoin: Vale a Pena Investir Agora?',
    description: 'Análise detalhada sobre o momento atual do Bitcoin e perspectivas futuras',
    content: '<h2>Estado Atual do Bitcoin</h2><p>O Bitcoin tem mostrado grande volatilidade...</p>',
    category: 'crypto',
    tags: ['bitcoin', 'crypto', 'análise'],
    coverImage: 'https://picsum.photos/800/400?random=3',
    isPremium: false,
  },
]

const VIDEOS_DATA = [
  {
    title: 'Day Trading para Iniciantes - Aula Completa',
    description: 'Aprenda os fundamentos do day trading nesta aula completa',
    content: '<p>Neste vídeo você vai aprender tudo sobre day trading...</p>',
    category: 'trading',
    tags: ['day trading', 'aula', 'iniciantes'],
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 3600,
    quality: '1080p' as const,
    coverImage: 'https://picsum.photos/800/400?random=4',
    isPremium: false,
  },
  {
    title: 'Como Fazer Análise Fundamentalista',
    description: 'Guia completo de análise fundamentalista de empresas',
    content: '<p>Análise fundamentalista é essencial para investir em ações...</p>',
    category: 'stocks',
    tags: ['análise fundamentalista', 'ações', 'investimento'],
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 2400,
    quality: '1080p' as const,
    coverImage: 'https://picsum.photos/800/400?random=5',
    isPremium: true,
  },
]

const COURSES_DATA = [
  {
    title: 'Curso Completo de Trading',
    description: 'Do zero ao profissional em trading',
    content: '<p>Curso completo com mais de 50 aulas...</p>',
    category: 'trading',
    tags: ['curso', 'trading', 'completo'],
    price: 199.90,
    level: 'beginner' as const,
    duration: 40,
    lessonsCount: 52,
    coverImage: 'https://picsum.photos/800/400?random=6',
    isPremium: true,
    lessons: [
      { title: 'Introdução ao Trading', duration: 30, videoUrl: 'https://youtube.com/...', isFree: true, order: 1 },
      { title: 'Análise Técnica Básica', duration: 45, videoUrl: 'https://youtube.com/...', isFree: false, order: 2 },
      { title: 'Gerenciamento de Risco', duration: 40, videoUrl: 'https://youtube.com/...', isFree: false, order: 3 },
    ],
  },
]

const PODCASTS_DATA = [
  {
    title: 'FinHub Podcast #1 - O Futuro das Finanças',
    description: 'Primeiro episódio do nosso podcast sobre finanças',
    content: '<p>Neste episódio discutimos o futuro das finanças...</p>',
    category: 'podcast',
    tags: ['podcast', 'finanças', 'futuro'],
    audioUrl: 'https://soundcloud.com/...',
    duration: 3600,
    episodeNumber: 1,
    season: 1,
    coverImage: 'https://picsum.photos/800/400?random=7',
    isPremium: false,
  },
]

const BRANDS_DATA = [
  {
    name: 'XTB',
    description: 'Corretora líder em CFDs e Forex com plataforma premiada',
    brandType: 'broker' as const,
    logo: 'https://picsum.photos/200/200?random=10',
    website: 'https://xtb.com',
    category: 'trading',
    tags: ['forex', 'cfds', 'broker'],
    country: 'PT',
    founded: 2002,
    isActive: true,
    isFeatured: true,
    isVerified: true,
  },
  {
    name: 'Binance',
    description: 'A maior exchange de criptomoedas do mundo',
    brandType: 'exchange' as const,
    logo: 'https://picsum.photos/200/200?random=11',
    website: 'https://binance.com',
    category: 'crypto',
    tags: ['crypto', 'exchange', 'bitcoin'],
    founded: 2017,
    isActive: true,
    isFeatured: true,
    isVerified: true,
  },
  {
    name: 'TradingView',
    description: 'Plataforma de análise técnica e gráficos profissionais',
    brandType: 'platform' as const,
    logo: 'https://picsum.photos/200/200?random=12',
    website: 'https://tradingview.com',
    category: 'trading',
    tags: ['análise técnica', 'gráficos', 'plataforma'],
    founded: 2011,
    isActive: true,
    isFeatured: true,
    isVerified: true,
  },
]

// ==========================================
// Seed Functions
// ==========================================

async function seedUsers() {
  console.log('🔹 Seeding users...')

  const users = []
  for (const userData of USERS_DATA) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    const user = await User.create({
      ...userData,
      password: hashedPassword,
    })
    users.push(user)
    console.log(`  ✅ Created ${user.role}: ${user.name} (${user.email})`)
  }

  return users
}

async function seedContent(creators: any[]) {
  console.log('🔹 Seeding content...')

  const content = []

  // Articles - dividir entre creators
  for (let i = 0; i < ARTICLES_DATA.length; i++) {
    const creator = creators[i % creators.length]
    const article = await Article.create({
      ...ARTICLES_DATA[i],
      creator: creator._id,
      status: 'published',
      publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
    })
    content.push({ type: 'article', item: article })
    console.log(`  ✅ Created article: ${article.title}`)
  }

  // Videos
  for (let i = 0; i < VIDEOS_DATA.length; i++) {
    const creator = creators[i % creators.length]
    const video = await Video.create({
      ...VIDEOS_DATA[i],
      creator: creator._id,
      status: 'published',
      publishedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
    })
    content.push({ type: 'video', item: video })
    console.log(`  ✅ Created video: ${video.title}`)
  }

  // Courses
  for (let i = 0; i < COURSES_DATA.length; i++) {
    const creator = creators[i % creators.length]
    const course = await Course.create({
      ...COURSES_DATA[i],
      creator: creator._id,
      status: 'published',
      publishedAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
    })
    content.push({ type: 'course', item: course })
    console.log(`  ✅ Created course: ${course.title}`)
  }

  // Podcasts
  for (let i = 0; i < PODCASTS_DATA.length; i++) {
    const creator = creators[i % creators.length]
    const podcast = await Podcast.create({
      ...PODCASTS_DATA[i],
      creator: creator._id,
      status: 'published',
      publishedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000),
    })
    content.push({ type: 'podcast', item: podcast })
    console.log(`  ✅ Created podcast: ${podcast.title}`)
  }

  return content
}

async function seedBrands(admin: any) {
  console.log('🔹 Seeding brands...')

  const brands = []
  for (const brandData of BRANDS_DATA) {
    const brand = await Brand.create({
      ...brandData,
      createdBy: admin._id,
    })
    brands.push(brand)
    console.log(`  ✅ Created brand: ${brand.name}`)
  }

  return brands
}

async function seedRatingsAndComments(users: any[], content: any[]) {
  console.log('🔹 Seeding ratings and comments...')

  // Criar algumas avaliações
  for (let i = 0; i < 10; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)]
    const randomContent = content[Math.floor(Math.random() * content.length)]

    try {
      await Rating.create({
        user: randomUser._id,
        targetType: randomContent.type,
        targetId: randomContent.item._id,
        rating: Math.floor(Math.random() * 2) + 4, // 4 ou 5 estrelas
        review: ['Excelente conteúdo!', 'Muito útil!', 'Recomendo!', 'Adorei!'][Math.floor(Math.random() * 4)],
      })
    } catch (e) {
      // Ignorar duplicados
    }
  }
  console.log(`  ✅ Created ratings`)

  // Criar alguns comentários
  const comments = [
    'Ótimo conteúdo, aprendi muito!',
    'Poderia explicar melhor a parte X?',
    'Muito bom, quando sai a próxima parte?',
    'Excelente trabalho!',
    'Isso ajudou-me imenso, obrigado!',
  ]

  for (let i = 0; i < 15; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)]
    const randomContent = content[Math.floor(Math.random() * content.length)]

    await Comment.create({
      user: randomUser._id,
      targetType: randomContent.type,
      targetId: randomContent.item._id,
      content: comments[Math.floor(Math.random() * comments.length)],
    })
  }
  console.log(`  ✅ Created comments`)
}

async function seedFollows(users: any[]) {
  console.log('🔹 Seeding follows...')

  // Users normais seguem creators
  const normalUsers = users.filter(u => u.role === 'free' || u.role === 'premium')
  const creators = users.filter(u => u.role === 'creator')

  for (const user of normalUsers) {
    for (const creator of creators) {
      try {
        await Follow.create({
          follower: user._id,
          following: creator._id,
        })
        await User.findByIdAndUpdate(user._id, { $inc: { following: 1 } })
        await User.findByIdAndUpdate(creator._id, { $inc: { followers: 1 } })
      } catch (e) {
        // Ignorar duplicados
      }
    }
  }

  console.log(`  ✅ Created follows`)
}

async function seedFavorites(users: any[], content: any[]) {
  console.log('🔹 Seeding favorites...')

  for (let i = 0; i < 10; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)]
    const randomContent = content[Math.floor(Math.random() * content.length)]

    try {
      await Favorite.create({
        user: randomUser._id,
        targetType: randomContent.type,
        targetId: randomContent.item._id,
      })
    } catch (e) {
      // Ignorar duplicados
    }
  }

  console.log(`  ✅ Created favorites`)
}

// ==========================================
// Main Seed Function
// ==========================================

async function seed() {
  try {
    console.log('🌱 Starting seed...\n')

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB\n')

    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await Promise.all([
      User.deleteMany({}),
      Article.deleteMany({}),
      Video.deleteMany({}),
      Course.deleteMany({}),
      Podcast.deleteMany({}),
      Brand.deleteMany({}),
      Rating.deleteMany({}),
      Comment.deleteMany({}),
      Follow.deleteMany({}),
      Favorite.deleteMany({}),
    ])
    console.log('✅ Cleared all collections\n')

    // Seed data
    const users = await seedUsers()
    const admin = users.find(u => u.role === 'admin')
    const creators = users.filter(u => u.role === 'creator')

    console.log('')
    const content = await seedContent(creators)

    console.log('')
    const brands = await seedBrands(admin)

    console.log('')
    await seedRatingsAndComments(users, content)

    console.log('')
    await seedFollows(users)

    console.log('')
    await seedFavorites(users, content)

    console.log('\n✅ Seed completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`  - Users: ${users.length}`)
    console.log(`  - Creators: ${creators.length}`)
    console.log(`  - Content items: ${content.length}`)
    console.log(`  - Brands: ${brands.length}`)
    console.log('\n🔑 Test Credentials:')
    console.log('  Admin:')
    console.log('    Email: admin@finhub.com')
    console.log('    Password: admin123')
    console.log('\n  Creators:')
    console.log('    Email: creator1@finhub.com / Password: creator123')
    console.log('    Email: creator2@finhub.com / Password: creator123')
    console.log('    Email: creator3@finhub.com / Password: creator123')
    console.log('\n  Users:')
    console.log('    Email: user1@test.com / Password: user123')
    console.log('    Email: user2@test.com / Password: user123')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)
  }
}

// Run seed
seed()
