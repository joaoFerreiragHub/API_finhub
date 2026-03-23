/**
 * HTTP-based Seed Script
 * Popula a BD através da API
 *
 * IMPORTANTE: A API deve estar a correr em http://localhost:5000
 *
 * Run: node seed-http.js
 */

const API_URL = 'http://localhost:5000/api'

// Aguardar
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// ==========================================
// Dados de Teste
// ==========================================

const USERS_DATA = [
  {
    email: 'admin@finhub.com',
    password: 'admin123',
    name: 'Admin FinHub',
    username: 'admin_finhub',
    role: 'admin',
  },
  {
    email: 'creator1@finhub.com',
    password: 'creator123',
    name: 'Ricardo Santos',
    username: 'ricardo_trading',
    role: 'creator',
  },
  {
    email: 'creator2@finhub.com',
    password: 'creator123',
    name: 'Ana Costa',
    username: 'ana_crypto',
    role: 'creator',
  },
  {
    email: 'creator3@finhub.com',
    password: 'creator123',
    name: 'João Ferreira',
    username: 'joao_stocks',
    role: 'creator',
  },
  {
    email: 'user1@test.com',
    password: 'user123',
    name: 'Maria Silva',
    username: 'maria_silva',
    role: 'free',
  },
  {
    email: 'user2@test.com',
    password: 'user123',
    name: 'Pedro Alves',
    username: 'pedro_alves',
    role: 'premium',
  },
]

// ==========================================
// Helper Functions
// ==========================================

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed')
    }

    return data
  } catch (error) {
    console.error(`❌ API call failed: ${method} ${endpoint}`, error.message)
    throw error
  }
}

async function register(userData) {
  return await apiCall('/auth/register', 'POST', userData)
}

async function login(email, password) {
  return await apiCall('/auth/login', 'POST', { email, password })
}

// ==========================================
// Main Seed Function
// ==========================================

async function seed() {
  console.log('🌱 Starting HTTP-based seed...\n')

  try {
    // Test API connection
    console.log('📡 Testing API connection...')
    try {
      await fetch(API_URL.replace('/api', '/'))
      console.log('✅ API is reachable\n')
    } catch (e) {
      console.error('❌ Cannot reach API at', API_URL)
      console.error('   Make sure the API is running: npm run dev')
      process.exit(1)
    }

    // Register users
    console.log('🔹 Creating users...')
    const users = []
    const tokens = {}

    for (const userData of USERS_DATA) {
      try {
        const user = await register(userData)
        users.push({ ...user, password: userData.password, email: userData.email })
        console.log(`  ✅ Created ${user.role}: ${user.name}`)
        await sleep(100)
      } catch (e) {
        console.log(`  ⚠️  User ${userData.email} may already exist`)
      }
    }

    // Login all users to get tokens
    console.log('\n🔹 Logging in users to get tokens...')
    const allTokens = []
    for (const userData of USERS_DATA) {
      try {
        const loginResponse = await login(userData.email, userData.password)
        const { tokens: authTokens, user } = loginResponse
        const tokenData = {
          token: authTokens.accessToken,
          userId: user._id,
          role: user.role,
          name: user.name,
          email: userData.email,
        }
        allTokens.push(tokenData)
        tokens[user.role] = tokenData
        console.log(`  ✅ Logged in: ${user.name}`)
        await sleep(100)
      } catch (e) {
        console.error(`  ❌ Failed to login ${userData.email}`)
      }
    }

    // Get creator tokens
    const creator1 = allTokens.find(t => t.email === 'creator1@finhub.com')
    const creator2 = allTokens.find(t => t.email === 'creator2@finhub.com')
    const creator3 = allTokens.find(t => t.email === 'creator3@finhub.com')
    const adminToken = allTokens.find(t => t.role === 'admin')

    console.log('\n🔍 Debug - Found tokens:', {
      creator1: creator1 ? '✅' : '❌',
      creator2: creator2 ? '✅' : '❌',
      creator3: creator3 ? '✅' : '❌',
      admin: adminToken ? '✅' : '❌',
    })

    if (creator1) {
      console.log('Creator1 object:', { hasToken: !!creator1.token, keys: Object.keys(creator1) })
    }

    if (!creator1 || !creator2 || !creator3) {
      console.error('❌ Failed to get creator tokens')
      console.log('All tokens:', allTokens.map(t => ({ email: t.email, role: t.role, name: t.name })))
      process.exit(1)
    }

    // Create articles
    console.log('\n🔹 Creating articles...')

    const articles = [
      {
        title: 'Como Começar a Investir em 2026',
        description: 'Guia completo para iniciantes',
        content: '<h2>Introdução</h2><p>Investir pode parecer intimidante...</p>',
        category: 'investing',
        tags: ['iniciantes', 'investimento'],
        isPremium: false,
        status: 'published',
      },
      {
        title: 'Análise Técnica: Padrões de Candlestick',
        description: 'Aprenda os principais padrões',
        content: '<h2>Padrões de Candlestick</h2><p>Fundamentais para análise...</p>',
        category: 'trading',
        tags: ['análise técnica', 'trading'],
        isPremium: true,
        status: 'published',
      },
    ]

    console.log('Creator1 token:', creator1.token ? 'EXISTS' : 'MISSING')

    for (const article of articles) {
      try {
        const created = await apiCall('/articles', 'POST', article, creator1.token)
        await apiCall(`/articles/${created._id}/publish`, 'PATCH', {}, creator1.token)
        console.log(`  ✅ Created article: ${article.title}`)
        await sleep(200)
      } catch (e) {
        console.error(`  ❌ Failed to create article: ${article.title}`, e.message)
      }
    }

    // Create videos
    console.log('\n🔹 Creating videos...')

    const video = {
      title: 'Day Trading para Iniciantes - Aula Completa',
      description: 'Aprenda os fundamentos do day trading',
      content: '<p>Neste vídeo você vai aprender...</p>',
      category: 'trading',
      tags: ['day trading', 'aula'],
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      duration: 3600,
      quality: '1080p',
      isPremium: false,
      status: 'published',
    }

    try {
      const created = await apiCall('/videos', 'POST', video, creator2.token)
      await apiCall(`/videos/${created._id}/publish`, 'PATCH', {}, creator2.token)
      console.log(`  ✅ Created video: ${video.title}`)
    } catch (e) {
      console.error(`  ❌ Failed to create video`)
    }

    // Create brands (admin only)
    if (adminToken) {
      console.log('\n🔹 Creating brands...')

      const brands = [
        {
          name: 'XTB',
          description: 'Corretora líder em CFDs e Forex',
          brandType: 'broker',
          website: 'https://xtb.com',
          category: 'trading',
          isActive: true,
          isFeatured: true,
        },
        {
          name: 'Binance',
          description: 'A maior exchange de criptomoedas',
          brandType: 'exchange',
          website: 'https://binance.com',
          category: 'crypto',
          isActive: true,
          isFeatured: true,
        },
      ]

      for (const brand of brands) {
        try {
          await apiCall('/brands', 'POST', brand, adminToken.token)
          console.log(`  ✅ Created brand: ${brand.name}`)
          await sleep(200)
        } catch (e) {
          console.error(`  ❌ Failed to create brand: ${brand.name}`)
        }
      }
    }

    console.log('\n✅ Seed completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`  - Users created: ${USERS_DATA.length}`)
    console.log('\n🔑 Test Credentials:')
    console.log('  Admin: admin@finhub.com / admin123')
    console.log('  Creator 1: creator1@finhub.com / creator123')
    console.log('  Creator 2: creator2@finhub.com / creator123')
    console.log('  Creator 3: creator3@finhub.com / creator123')
    console.log('  User 1: user1@test.com / user123')
    console.log('  User 2: user2@test.com / user123')
    console.log('\n💡 Next steps:')
    console.log('  1. Test the API at http://localhost:5000/api')
    console.log('  2. Login with any credentials above')
    console.log('  3. Start building the frontend integration')

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message)
    process.exit(1)
  }
}

// Run seed
seed()
