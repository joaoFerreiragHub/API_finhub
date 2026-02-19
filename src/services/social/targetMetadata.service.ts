import { Article } from '../../models/Article'
import { Book } from '../../models/Book'
import { Brand } from '../../models/Brand'
import { Comment } from '../../models/Comment'
import { Course } from '../../models/Course'
import { LiveEvent } from '../../models/LiveEvent'
import { Podcast } from '../../models/Podcast'
import { Rating } from '../../models/Rating'
import { User } from '../../models/User'
import { Video } from '../../models/Video'

export interface TargetMetadata {
  ownerId: string | null
  tags: string[]
  title?: string
}

const getArrayTags = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : []

export const resolveTargetMetadata = async (
  targetType: string,
  targetId: string
): Promise<TargetMetadata> => {
  switch (targetType) {
    case 'article': {
      const doc = await Article.findById(targetId).select('creator tags title')
      return {
        ownerId: doc?.creator ? String(doc.creator) : null,
        tags: getArrayTags(doc?.tags),
        title: doc?.title,
      }
    }
    case 'video': {
      const doc = await Video.findById(targetId).select('creator tags title')
      return {
        ownerId: doc?.creator ? String(doc.creator) : null,
        tags: getArrayTags(doc?.tags),
        title: doc?.title,
      }
    }
    case 'course': {
      const doc = await Course.findById(targetId).select('creator tags title')
      return {
        ownerId: doc?.creator ? String(doc.creator) : null,
        tags: getArrayTags(doc?.tags),
        title: doc?.title,
      }
    }
    case 'live': {
      const doc = await LiveEvent.findById(targetId).select('creator tags title')
      return {
        ownerId: doc?.creator ? String(doc.creator) : null,
        tags: getArrayTags(doc?.tags),
        title: doc?.title,
      }
    }
    case 'podcast': {
      const doc = await Podcast.findById(targetId).select('creator tags title')
      return {
        ownerId: doc?.creator ? String(doc.creator) : null,
        tags: getArrayTags(doc?.tags),
        title: doc?.title,
      }
    }
    case 'book': {
      const doc = await Book.findById(targetId).select('creator tags title')
      return {
        ownerId: doc?.creator ? String(doc.creator) : null,
        tags: getArrayTags(doc?.tags),
        title: doc?.title,
      }
    }
    case 'comment': {
      const doc = await Comment.findById(targetId).select('user content')
      return {
        ownerId: doc?.user ? String(doc.user) : null,
        tags: [],
        title: doc?.content ? String(doc.content).slice(0, 100) : undefined,
      }
    }
    case 'rating': {
      const doc = await Rating.findById(targetId).select('user review rating')
      const fallbackTitle = doc?.rating ? `Review ${doc.rating}/5` : undefined
      return {
        ownerId: doc?.user ? String(doc.user) : null,
        tags: [],
        title: doc?.review ? String(doc.review).slice(0, 100) : fallbackTitle,
      }
    }
    case 'creator': {
      const doc = await User.findById(targetId).select('name')
      return {
        ownerId: doc ? String(doc.id) : null,
        tags: [],
        title: doc?.name,
      }
    }
    case 'brand': {
      const doc = await Brand.findById(targetId).select('createdBy name')
      const ownerId = doc?.createdBy ? String(doc.createdBy) : null
      return {
        ownerId,
        tags: [],
        title: doc?.name,
      }
    }
    default:
      return {
        ownerId: null,
        tags: [],
      }
  }
}
