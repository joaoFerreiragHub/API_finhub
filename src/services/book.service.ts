import { socialEventBus } from '../events/socialEvents'
import { PublishStatus } from '../models/BaseContent'
import { Book } from '../models/Book'

/**
 * DTOs para Book
 */
export interface CreateBookDTO {
  title: string
  description: string
  content: string
  category: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface UpdateBookDTO {
  title?: string
  description?: string
  content?: string
  category?: string
  tags?: string[]
  coverImage?: string
  isPremium?: boolean
  status?: PublishStatus
}

export interface BookFilters {
  category?: string
  isPremium?: boolean
  isFeatured?: boolean
  status?: PublishStatus
  creator?: string
  tags?: string[]
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
}

/**
 * Service de Books
 */
export class BookService {
  /**
   * Listar livros (publico)
   */
  async list(filters: BookFilters = {}, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const query: Record<string, unknown> = {}
    if (!filters.status) {
      query.status = 'published'
    }

    if (filters.category) {
      query.category = filters.category
    }

    if (filters.isPremium !== undefined) {
      query.isPremium = filters.isPremium
    }

    if (filters.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured
    }

    if (filters.creator) {
      query.creator = filters.creator
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags }
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ]
    }

    let sort: Record<string, 1 | -1> = { publishedAt: -1 }
    if (options.sort === 'popular') {
      sort = { views: -1 }
    } else if (options.sort === 'rating') {
      sort = { averageRating: -1, ratingsCount: -1 }
    } else if (options.sort === 'title') {
      sort = { title: 1 }
    }

    const [books, total] = await Promise.all([
      Book.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'name username avatar')
        .lean(),
      Book.countDocuments(query),
    ])

    return {
      books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter livro por slug
   */
  async getBySlug(slug: string) {
    const book = await Book.findOne({ slug }).populate('creator', 'name username avatar bio')

    if (!book) {
      throw new Error('Livro nao encontrado')
    }

    return book
  }

  /**
   * Obter livro por ID
   */
  async getById(id: string) {
    const book = await Book.findById(id).populate('creator', 'name username avatar')

    if (!book) {
      throw new Error('Livro nao encontrado')
    }

    return book
  }

  /**
   * Criar livro
   */
  async create(creatorId: string, data: CreateBookDTO) {
    const book = await Book.create({
      ...data,
      creator: creatorId,
      contentType: 'book',
    })

    if (book.status === 'published') {
      this.emitContentPublishedEvent(creatorId, book.id, book.title)
    }

    return book
  }

  /**
   * Atualizar livro
   */
  async update(id: string, creatorId: string, data: UpdateBookDTO) {
    const book = await Book.findById(id)

    if (!book) {
      throw new Error('Livro nao encontrado')
    }

    if (book.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para editar este livro')
    }

    const wasPublished = book.status === 'published'
    Object.assign(book, data)
    await book.save()

    if (!wasPublished && book.status === 'published') {
      this.emitContentPublishedEvent(creatorId, book.id, book.title)
    }

    return book
  }

  /**
   * Eliminar livro
   */
  async delete(id: string, creatorId: string, isAdmin = false) {
    const book = await Book.findById(id)

    if (!book) {
      throw new Error('Livro nao encontrado')
    }

    if (!isAdmin && book.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para eliminar este livro')
    }

    await book.deleteOne()

    return { message: 'Livro eliminado com sucesso' }
  }

  /**
   * Publicar livro
   */
  async publish(id: string, creatorId: string) {
    const book = await Book.findById(id)

    if (!book) {
      throw new Error('Livro nao encontrado')
    }

    if (book.creator.toString() !== creatorId) {
      throw new Error('Nao tens permissao para publicar este livro')
    }

    const wasPublished = book.status === 'published'
    book.status = 'published'
    book.publishedAt = new Date()
    await book.save()

    if (!wasPublished) {
      this.emitContentPublishedEvent(creatorId, book.id, book.title)
    }

    return book
  }

  /**
   * Incrementar views
   */
  async incrementViews(id: string) {
    await Book.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  /**
   * Toggle like
   */
  async toggleLike(id: string, increment: boolean) {
    const update = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }
    const book = await Book.findByIdAndUpdate(id, update, { new: true })

    if (!book) {
      throw new Error('Livro nao encontrado')
    }

    return book
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(id: string, increment: boolean) {
    const update = increment ? { $inc: { favorites: 1 } } : { $inc: { favorites: -1 } }
    const book = await Book.findByIdAndUpdate(id, update, { new: true })

    if (!book) {
      throw new Error('Livro nao encontrado')
    }

    return book
  }

  /**
   * Listar livros do creator (dashboard)
   */
  async getMyBooks(creatorId: string, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    const query = { creator: creatorId }

    let sort: Record<string, 1 | -1> = { createdAt: -1 }
    if (options.sort === 'title') {
      sort = { title: 1 }
    } else if (options.sort === 'views') {
      sort = { views: -1 }
    }

    const [books, total] = await Promise.all([
      Book.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Book.countDocuments(query),
    ])

    return {
      books,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Estatisticas do creator
   */
  async getStats(creatorId: string) {
    const books = await Book.find({ creator: creatorId })

    const stats = {
      total: books.length,
      published: books.filter((item) => item.status === 'published').length,
      drafts: books.filter((item) => item.status === 'draft').length,
      totalViews: books.reduce((sum, item) => sum + item.views, 0),
      totalLikes: books.reduce((sum, item) => sum + item.likes, 0),
      averageRating: books.reduce((sum, item) => sum + item.averageRating, 0) / books.length || 0,
    }

    return stats
  }

  private emitContentPublishedEvent(creatorId: string, contentId: string, title?: string) {
    socialEventBus.publish({
      type: 'social.content.published',
      creatorId,
      contentType: 'book',
      contentId,
      title,
      occurredAt: new Date().toISOString(),
    })
  }
}

export const bookService = new BookService()
