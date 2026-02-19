import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  bookService,
  CreateBookDTO,
  UpdateBookDTO,
  BookFilters,
} from '../services/book.service'

/**
 * Listar artigos (público)
 * GET /api/books
 */
export const listBooks = async (req: Request, res: Response) => {
  try {
    const filters: BookFilters = {
      category: req.query.category as string,
      isPremium: req.query.isPremium === 'true',
      isFeatured: req.query.isFeatured === 'true',
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await bookService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List books error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Obter artigo por slug (público)
 * GET /api/books/:slug
 */
export const getBookBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "")

    const book = await bookService.getBySlug(slug)

    // Incrementar views (async, não bloquear response)
    bookService.incrementViews(book.id).catch(console.error)

    return res.status(200).json(book)
  } catch (error: any) {
    console.error('Get book error:', error)
    return res.status(404).json({
      error: 'Artigo não encontrado',
      details: error.message,
    })
  }
}

/**
 * Criar artigo (protegido - creator/admin)
 * POST /api/books
 */
export const createBook = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const data: CreateBookDTO = req.body

    // Validar campos obrigatórios
    if (!data.title || !data.description || !data.content || !data.category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, description, content, category',
      })
    }

    const book = await bookService.create(req.user.id, data)

    return res.status(201).json(book)
  } catch (error: any) {
    console.error('Create book error:', error)
    return res.status(500).json({
      error: 'Erro ao criar artigo',
      details: error.message,
    })
  }
}

/**
 * Atualizar artigo (protegido - owner/admin)
 * PATCH /api/books/:id
 */
export const updateBook = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const data: UpdateBookDTO = req.body

    const book = await bookService.update(id, req.user.id, data)

    return res.status(200).json(book)
  } catch (error: any) {
    console.error('Update book error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar artigo',
      details: error.message,
    })
  }
}

/**
 * Eliminar artigo (protegido - owner/admin)
 * DELETE /api/books/:id
 */
export const deleteBook = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const isAdmin = req.user.role === 'admin'

    const result = await bookService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete book error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar artigo',
      details: error.message,
    })
  }
}

/**
 * Publicar artigo (protegido - owner/admin)
 * PATCH /api/books/:id/publish
 */
export const publishBook = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const book = await bookService.publish(id, req.user.id)

    return res.status(200).json(book)
  } catch (error: any) {
    console.error('Publish book error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao publicar artigo',
      details: error.message,
    })
  }
}

/**
 * Toggle like (protegido)
 * POST /api/books/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para like, false para unlike

    const book = await bookService.toggleLike(id, increment)

    return res.status(200).json(book)
  } catch (error: any) {
    console.error('Toggle like error:', error)
    return res.status(500).json({
      error: 'Erro ao processar like',
      details: error.message,
    })
  }
}

/**
 * Toggle favorite (protegido)
 * POST /api/books/:id/favorite
 */
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para favorite, false para unfavorite

    const book = await bookService.toggleFavorite(id, increment)

    return res.status(200).json(book)
  } catch (error: any) {
    console.error('Toggle favorite error:', error)
    return res.status(500).json({
      error: 'Erro ao processar favorito',
      details: error.message,
    })
  }
}

/**
 * Listar meus artigos (protegido - creator)
 * GET /api/books/my
 */
export const getMyBooks = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await bookService.getMyBooks(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my books error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Estatísticas dos meus artigos (protegido - creator)
 * GET /api/books/stats
 */
export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const stats = await bookService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
