import { Article } from '../models/Article'
import { Book } from '../models/Book'
import { Course } from '../models/Course'
import { DirectoryEntry } from '../models/DirectoryEntry'
import { Podcast } from '../models/Podcast'
import { User } from '../models/User'
import { Video } from '../models/Video'

interface SitemapContentItem {
  slug: string
  updatedAt: string
}

interface SitemapCreatorItem {
  username: string
  updatedAt: string
}

export interface SitemapResponsePayload {
  articles: SitemapContentItem[]
  courses: SitemapContentItem[]
  videos: SitemapContentItem[]
  podcasts: SitemapContentItem[]
  books: SitemapContentItem[]
  creators: SitemapCreatorItem[]
  brands: SitemapContentItem[]
}

interface ContentProjection {
  slug?: string
  publishedAt?: Date | null
  updatedAt?: Date | null
  createdAt?: Date | null
}

interface CreatorProjection {
  username?: string
  updatedAt?: Date | null
  createdAt?: Date | null
}

const toIsoDateTime = (...values: Array<Date | null | undefined>): string => {
  for (const value of values) {
    if (!value) continue
    const timestamp = value.getTime()
    if (!Number.isFinite(timestamp)) continue
    return value.toISOString()
  }

  return new Date().toISOString()
}

const mapContentItems = (items: ContentProjection[]): SitemapContentItem[] => {
  const seenSlugs = new Set<string>()
  const mappedItems: SitemapContentItem[] = []

  for (const item of items) {
    const normalizedSlug = item.slug?.trim()
    if (!normalizedSlug || seenSlugs.has(normalizedSlug)) continue

    seenSlugs.add(normalizedSlug)
    mappedItems.push({
      slug: normalizedSlug,
      updatedAt: toIsoDateTime(item.updatedAt, item.publishedAt, item.createdAt),
    })
  }

  return mappedItems
}

const mapCreatorItems = (items: CreatorProjection[]): SitemapCreatorItem[] => {
  const seenUsernames = new Set<string>()
  const mappedItems: SitemapCreatorItem[] = []

  for (const item of items) {
    const normalizedUsername = item.username?.trim()
    if (!normalizedUsername || seenUsernames.has(normalizedUsername)) continue

    seenUsernames.add(normalizedUsername)
    mappedItems.push({
      username: normalizedUsername,
      updatedAt: toIsoDateTime(item.updatedAt, item.createdAt),
    })
  }

  return mappedItems
}

class SitemapService {
  async getSitemapData(): Promise<SitemapResponsePayload> {
    const [articles, courses, videos, podcasts, books, directories, creators] = await Promise.all([
      Article.find({
        status: 'published',
      })
        .select('slug publishedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean<ContentProjection[]>(),
      Course.find({
        status: 'published',
      })
        .select('slug publishedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean<ContentProjection[]>(),
      Video.find({
        status: 'published',
      })
        .select('slug publishedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean<ContentProjection[]>(),
      Podcast.find({
        status: 'published',
      })
        .select('slug publishedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean<ContentProjection[]>(),
      Book.find({
        status: 'published',
      })
        .select('slug publishedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean<ContentProjection[]>(),
      DirectoryEntry.find({
        status: 'published',
        isActive: true,
        showInDirectory: true,
      })
        .select('slug publishedAt updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean<ContentProjection[]>(),
      User.find({
        role: 'creator',
        accountStatus: 'active',
      })
        .select('username updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean<CreatorProjection[]>(),
    ])

    return {
      articles: mapContentItems(articles),
      courses: mapContentItems(courses),
      videos: mapContentItems(videos),
      podcasts: mapContentItems(podcasts),
      books: mapContentItems(books),
      creators: mapCreatorItems(creators),
      brands: mapContentItems(directories),
    }
  }
}

export const sitemapService = new SitemapService()
