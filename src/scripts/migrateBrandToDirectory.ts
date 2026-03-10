import '../config/env'
import mongoose from 'mongoose'
import { Brand, BrandType } from '../models/Brand'
import { DirectoryEntry, DirectoryVerticalType } from '../models/DirectoryEntry'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finhub'
const APPLY = process.argv.includes('--apply')

const getLimitArg = (): number | null => {
  const rawArg = process.argv.find((item) => item.startsWith('--limit='))
  if (!rawArg) return null
  const parsed = Number.parseInt(rawArg.slice('--limit='.length), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

const LIMIT = getLimitArg()

const mapBrandTypeToVertical = (brandType: BrandType): DirectoryVerticalType => {
  if (brandType === 'broker') return 'broker'
  if (brandType === 'exchange') return 'exchange'
  if (brandType === 'podcast') return 'podcast'
  if (brandType === 'platform' || brandType === 'website') return 'site'
  if (brandType === 'tool') return 'app'
  if (brandType === 'news-source') return 'newsletter'
  return 'other'
}

const toShortDescription = (value: string): string => value.trim().slice(0, 280)

const toUniqueTrimmedArray = (values: Array<string | null | undefined>): string[] => {
  const unique = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string') continue
    const normalized = value.trim()
    if (!normalized) continue
    unique.add(normalized)
  }
  return Array.from(unique)
}

const toMetadataObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

const log = (message: string) => {
  console.log(`[migrate:brands:directory] ${message}`)
}

const run = async () => {
  await mongoose.connect(MONGODB_URI)
  log(`Mongo ligado (${mongoose.connection.host})`)

  const query = Brand.find().sort({ createdAt: 1 })
  if (LIMIT) query.limit(LIMIT)
  const brands = await query.exec()

  log(`Marcas encontradas: ${brands.length}`)
  if (!APPLY) {
    log('Modo dry-run ativo (usa --apply para persistir alteracoes)')
  }

  let created = 0
  let updated = 0
  let skipped = 0
  let conflicts = 0

  for (const brand of brands) {
    const legacyBrandId = String(brand._id)
    const existingByLegacy = await DirectoryEntry.findOne({
      'metadata.legacyBrandId': legacyBrandId,
    })
    const existingBySlug = existingByLegacy
      ? null
      : await DirectoryEntry.findOne({
          slug: brand.slug,
        })

    if (existingBySlug && !existingByLegacy) {
      const existingMetadata = toMetadataObject(existingBySlug.metadata)
      const existingLegacyBrandId = existingMetadata.legacyBrandId
      if (existingLegacyBrandId !== legacyBrandId) {
        conflicts += 1
        log(
          `Conflito por slug "${brand.slug}" (brand=${legacyBrandId}, directory=${existingBySlug.id}) - ignorado.`
        )
        continue
      }
    }

    const target = existingByLegacy ?? existingBySlug
    const shortDescription = toShortDescription(brand.description || brand.name)
    const fullDescription = brand.description?.trim() || shortDescription
    const now = new Date()

    const nextMetadata = {
      ...toMetadataObject(target?.metadata),
      legacyBrandId,
      legacyBrandType: brand.brandType,
      legacyMigratedAt: now.toISOString(),
      legacyMigrationVersion: 1,
      legacyFounded: typeof brand.founded === 'number' ? brand.founded : null,
    }

    const payload = {
      name: brand.name.trim(),
      slug: brand.slug.trim().toLowerCase(),
      verticalType: mapBrandTypeToVertical(brand.brandType),
      shortDescription,
      description: fullDescription,
      logo: brand.logo ?? null,
      coverImage: brand.coverImage ?? null,
      website: brand.website ?? null,
      canonicalUrl: brand.website ?? null,
      country: brand.country ?? null,
      categories: toUniqueTrimmedArray([brand.category]),
      tags: toUniqueTrimmedArray(brand.tags),
      socialLinks: brand.socialLinks ?? null,
      status: brand.isActive ? 'published' : 'archived',
      verificationStatus: brand.isVerified ? 'verified' : 'unverified',
      isActive: brand.isActive,
      isFeatured: brand.isFeatured,
      averageRating: Number(brand.averageRating ?? 0),
      ratingsCount: Number(brand.ratingsCount ?? 0),
      commentsCount: Number(brand.commentsCount ?? 0),
      views: Number(brand.views ?? 0),
      showInHomeSection: brand.isFeatured,
      showInDirectory: true,
      landingEnabled: true,
      showAllEnabled: true,
      ownerType: 'admin_seeded',
      sourceType: 'internal',
      claimable: true,
      ownerUser: null,
      publishedAt: brand.isActive ? brand.createdAt ?? now : null,
      archivedAt: brand.isActive ? null : brand.updatedAt ?? now,
      updatedBy: brand.createdBy,
      metadata: nextMetadata,
    } as const

    if (!APPLY) {
      if (target) {
        updated += 1
      } else {
        created += 1
      }
      continue
    }

    if (target) {
      target.set(payload)
      await target.save()
      updated += 1
      continue
    }

    await DirectoryEntry.create({
      ...payload,
      createdBy: brand.createdBy,
    })
    created += 1
  }

  const totalProcessed = created + updated + skipped + conflicts
  log(
    `Resumo: processed=${totalProcessed} created=${created} updated=${updated} skipped=${skipped} conflicts=${conflicts}`
  )

  await mongoose.disconnect()
  log('Mongo desligado')
}

run().catch(async (error) => {
  console.error('[migrate:brands:directory] ERRO:', error)
  try {
    await mongoose.disconnect()
  } catch {
    // no-op
  }
  process.exitCode = 1
})
