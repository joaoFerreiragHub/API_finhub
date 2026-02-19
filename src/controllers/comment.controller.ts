import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import { commentService, CreateCommentDTO, UpdateCommentDTO } from '../services/comment.service'
import { CommentTargetType } from '../models/Comment'

/**
 * Criar comentário ou resposta
 * POST /api/comments
 */
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const data: CreateCommentDTO = req.body

    // Validar campos
    if (!data.targetType || !data.targetId || !data.content) {
      return res.status(400).json({
        error: 'Campos obrigatórios: targetType, targetId, content',
      })
    }

    const comment = await commentService.create(req.user.id, data)

    return res.status(201).json(comment)
  } catch (error: any) {
    console.error('Create comment error:', error)

    if (error.message.includes('Profundidade máxima')) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao criar comentário',
      details: error.message,
    })
  }
}

/**
 * Listar comentários de um target (apenas principais, depth 0)
 * GET /api/comments/:targetType/:targetId
 */
export const listComments = async (req: Request, res: Response) => {
  try {
    const targetType = String(req.params.targetType ?? "")
    const targetId = String(req.params.targetId ?? "")

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string, // recent | popular | oldest
    }

    const result = await commentService.listMainComments(
      targetType as CommentTargetType,
      targetId,
      options
    )

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List comments error:', error)
    return res.status(500).json({
      error: 'Erro ao listar comentários',
      details: error.message,
    })
  }
}

/**
 * Obter árvore completa de comentários (com respostas aninhadas)
 * GET /api/comments/:targetType/:targetId/tree
 */
export const getCommentTree = async (req: Request, res: Response) => {
  try {
    const targetType = String(req.params.targetType ?? "")
    const targetId = String(req.params.targetId ?? "")

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await commentService.getCommentTree(
      targetType as CommentTargetType,
      targetId,
      options
    )

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Get comment tree error:', error)
    return res.status(500).json({
      error: 'Erro ao obter árvore de comentários',
      details: error.message,
    })
  }
}

/**
 * Obter respostas de um comentário
 * GET /api/comments/:commentId/replies
 */
export const getReplies = async (req: Request, res: Response) => {
  try {
    const commentId = String(req.params.commentId ?? "")

    const replies = await commentService.getReplies(commentId)

    return res.status(200).json({ replies })
  } catch (error: any) {
    console.error('Get replies error:', error)
    return res.status(500).json({
      error: 'Erro ao obter respostas',
      details: error.message,
    })
  }
}

/**
 * Atualizar comentário
 * PATCH /api/comments/:id
 */
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const data: UpdateCommentDTO = req.body

    if (!data.content) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' })
    }

    const isAdmin = req.user.role === 'admin'
    const comment = await commentService.update(id, req.user.id, data, isAdmin)

    return res.status(200).json(comment)
  } catch (error: any) {
    console.error('Update comment error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar comentário',
      details: error.message,
    })
  }
}

/**
 * Eliminar comentário
 * DELETE /api/comments/:id
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const isAdmin = req.user.role === 'admin'

    const result = await commentService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete comment error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar comentário',
      details: error.message,
    })
  }
}

/**
 * Like/Unlike comentário
 * POST /api/comments/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")

    const comment = await commentService.toggleLike(id, req.user.id)

    return res.status(200).json(comment)
  } catch (error: any) {
    console.error('Toggle like error:', error)

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao processar like',
      details: error.message,
    })
  }
}

/**
 * Pin/Unpin comentário
 * PATCH /api/comments/:id/pin
 */
export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    const id = String(req.params.id ?? "")
    const isAdmin = req.user.role === 'admin'

    const comment = await commentService.togglePin(id, req.user.id, isAdmin)

    return res.status(200).json(comment)
  } catch (error: any) {
    console.error('Toggle pin error:', error)

    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao pin/unpin comentário',
      details: error.message,
    })
  }
}
