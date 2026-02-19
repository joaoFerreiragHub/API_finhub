/**
 * Script helper para gerar services, controllers e routes
 * para os tipos de conteúdo baseado no template de Article
 *
 * Usage: node generate-content-types.js
 */

const fs = require('fs')
const path = require('path')

// Definir os tipos a gerar
const contentTypes = [
  { singular: 'Video', plural: 'videos', model: 'Video' },
  { singular: 'Course', plural: 'courses', model: 'Course' },
  { singular: 'LiveEvent', plural: 'lives', model: 'LiveEvent', alias: 'Live' },
  { singular: 'Podcast', plural: 'podcasts', model: 'Podcast' },
  { singular: 'Book', plural: 'books', model: 'Book' },
]

// Ler templates de Article
const articleService = fs.readFileSync(path.join(__dirname, 'src/services/article.service.ts'), 'utf8')
const articleController = fs.readFileSync(path.join(__dirname, 'src/controllers/article.controller.ts'), 'utf8')
const articleRoutes = fs.readFileSync(path.join(__dirname, 'src/routes/article.routes.ts'), 'utf8')

// Função para substituir Article por outro tipo
function generateFiles(type) {
  const { singular, plural, model, alias } = type
  const lowerSingular = singular.toLowerCase()
  const displayName = alias || singular

  // Service
  let service = articleService
    .replace(/Article/g, model)
    .replace(/article/g, lowerSingular)
    .replace(/Article/g, model)
    .replace(/articles/g, plural)

  // Controller
  let controller = articleController
    .replace(/Article/g, displayName)
    .replace(/article/g, lowerSingular)
    .replace(/articles/g, plural)
    .replace(/articleService/g, `${lowerSingular}Service`)

  // Routes
  let routes = articleRoutes
    .replace(/Article/g, displayName)
    .replace(/article/g, lowerSingular)
    .replace(/articles/g, plural)

  // Escrever ficheiros
  fs.writeFileSync(
    path.join(__dirname, `src/services/${lowerSingular}.service.ts`),
    service
  )

  fs.writeFileSync(
    path.join(__dirname, `src/controllers/${lowerSingular}.controller.ts`),
    controller
  )

  fs.writeFileSync(
    path.join(__dirname, `src/routes/${lowerSingular}.routes.ts`),
    routes
  )

  console.log(`✅ Generated files for ${singular}`)
}

// Gerar para todos os tipos
contentTypes.forEach(generateFiles)

console.log('\n🎉 All content type files generated successfully!')
console.log('\nNext steps:')
console.log('1. Review generated files')
console.log('2. Update src/routes/index.ts to include new routes')
console.log('3. Test endpoints')
