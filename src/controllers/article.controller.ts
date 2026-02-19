import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  articleService,
  CreateArticleDTO,
  UpdateArticleDTO,
  ArticleFilters,
} from '../services/article.service'

/**
 * Listar artigos (público)
 * GET /api/articles
 */
export const listArticles = async (req: Request, res: Response) => {
  try {
    const filters: ArticleFilters = {
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

    const result = await articleService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List articles error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Obter artigo por slug (público)
 * GET /api/articles/:slug
 */
export const getArticleBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "")

    const article = await articleService.getBySlug(slug)

    // Incrementar views (async, não bloquear response)
    articleService.incrementViews(article.id).catch(console.error)

    return res.status(200).json(article)
  } catch (error: any) {
    console.error('Get article error:', error)
    return res.status(404).json({
      error: 'Artigo não encontrado',
      details: error.message,
    })
  }
}

/**
 * Criar artigo (protegido - creator/admin)
 * POST /api/articles
 */
export const createArticle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const data: CreateArticleDTO = req.body

    // Validar campos obrigatórios
    if (!data.title || !data.description || !data.content || !data.category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, description, content, category',
      })
    }

    const article = await articleService.create(req.user.id, data)

    return res.status(201).json(article)
  } catch (error: any) {
    console.error('Create article error:', error)
    return res.status(500).json({
      error: 'Erro ao criar artigo',
      details: error.message,
    })
  }
}

/**
 * Atualizar artigo (protegido - owner/admin)
 * PATCH /api/articles/:id
 */
export const updateArticle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const data: UpdateArticleDTO = req.body

    const article = await articleService.update(id, req.user.id, data)

    return res.status(200).json(article)
  } catch (error: any) {
    console.error('Update article error:', error)

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
 * DELETE /api/articles/:id
 */
export const deleteArticle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const isAdmin = req.user.role === 'admin'

    const result = await articleService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete article error:', error)

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
 * PATCH /api/articles/:id/publish
 */
export const publishArticle = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const article = await articleService.publish(id, req.user.id)

    return res.status(200).json(article)
  } catch (error: any) {
    console.error('Publish article error:', error)

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
 * POST /api/articles/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para like, false para unlike

    const article = await articleService.toggleLike(id, increment)

    return res.status(200).json(article)
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
 * POST /api/articles/:id/favorite
 */
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const { increment } = req.body // true para favorite, false para unfavorite

    const article = await articleService.toggleFavorite(id, increment)

    return res.status(200).json(article)
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
 * GET /api/articles/my
 */
export const getMyArticles = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await articleService.getMyArticles(req.user.id, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get my articles error:', error)
    return res.status(500).json({
      error: 'Erro ao listar artigos',
      details: error.message,
    })
  }
}

/**
 * Estatísticas dos meus artigos (protegido - creator)
 * GET /api/articles/stats
 */
export const getMyStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const stats = await articleService.getStats(req.user.id)

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
