import { Request, Response } from 'express'
import { CommentTargetType } from '../models/Comment'
import { commentService, CreateCommentDTO, UpdateCommentDTO } from '../services/comment.service'
import { surfaceControlService } from '../services/surfaceControl.service'
import { AuthRequest } from '../types/auth'

const buildDisabledPagination = (req: Request) => ({
  page: parseInt(req.query.page as string, 10) || 1,
  limit: parseInt(req.query.limit as string, 10) || 20,
  total: 0,
  pages: 1,
})

/**
 * Criar comentario ou resposta
 * POST /api/comments
 */
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('comments_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Comentarios temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const data: CreateCommentDTO = req.body

    if (!data.targetType || !data.targetId || !data.content) {
      return res.status(400).json({
        error: 'Campos obrigatorios: targetType, targetId, content',
      })
    }

    const comment = await commentService.create(req.user.id, data)

    return res.status(201).json(comment)
  } catch (error: any) {
    console.error('Create comment error:', error)

    if (error.message.includes('Profundidade maxima')) {
      return res.status(400).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao criar comentario',
      details: error.message,
    })
  }
}

/**
 * Listar comentarios de um target (apenas principais, depth 0)
 * GET /api/comments/:targetType/:targetId
 */
export const listComments = async (req: Request, res: Response) => {
  try {
    const targetType = String(req.params.targetType ?? '')
    const targetId = String(req.params.targetId ?? '')
    const surfaceControl = await surfaceControlService.getPublicControl('comments_read')

    if (!surfaceControl.enabled) {
      return res.status(200).json({
        comments: [],
        pagination: buildDisabledPagination(req),
        surfaceControl,
      })
    }

    const options = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      sort: req.query.sort as string,
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
      error: 'Erro ao listar comentarios',
      details: error.message,
    })
  }
}

/**
 * Obter arvore completa de comentarios (com respostas aninhadas)
 * GET /api/comments/:targetType/:targetId/tree
 */
export const getCommentTree = async (req: Request, res: Response) => {
  try {
    const targetType = String(req.params.targetType ?? '')
    const targetId = String(req.params.targetId ?? '')
    const surfaceControl = await surfaceControlService.getPublicControl('comments_read')

    if (!surfaceControl.enabled) {
      return res.status(200).json({
        comments: [],
        pagination: buildDisabledPagination(req),
        surfaceControl,
      })
    }

    const options = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
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
      error: 'Erro ao obter arvore de comentarios',
      details: error.message,
    })
  }
}

/**
 * Obter respostas de um comentario
 * GET /api/comments/:commentId/replies
 */
export const getReplies = async (req: Request, res: Response) => {
  try {
    const commentId = String(req.params.commentId ?? '')
    const surfaceControl = await surfaceControlService.getPublicControl('comments_read')

    if (!surfaceControl.enabled) {
      return res.status(200).json({
        replies: [],
        surfaceControl,
      })
    }

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
 * Atualizar comentario
 * PATCH /api/comments/:id
 */
export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('comments_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Comentarios temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const id = String(req.params.id ?? '')
    const data: UpdateCommentDTO = req.body

    if (!data.content) {
      return res.status(400).json({ error: 'Conteudo e obrigatorio' })
    }

    const isAdmin = req.user.role === 'admin'
    const comment = await commentService.update(id, req.user.id, data, isAdmin)

    return res.status(200).json(comment)
  } catch (error: any) {
    console.error('Update comment error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar comentario',
      details: error.message,
    })
  }
}

/**
 * Eliminar comentario
 * DELETE /api/comments/:id
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('comments_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Comentarios temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const id = String(req.params.id ?? '')
    const isAdmin = req.user.role === 'admin'

    const result = await commentService.delete(id, req.user.id, isAdmin)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete comment error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar comentario',
      details: error.message,
    })
  }
}

/**
 * Like/Unlike comentario
 * POST /api/comments/:id/like
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('comments_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Comentarios temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const id = String(req.params.id ?? '')

    const comment = await commentService.toggleLike(id, req.user.id)

    return res.status(200).json(comment)
  } catch (error: any) {
    console.error('Toggle like error:', error)

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao processar like',
      details: error.message,
    })
  }
}

/**
 * Pin/Unpin comentario
 * PATCH /api/comments/:id/pin
 */
export const togglePin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticacao necessaria' })
    }

    const surfaceControl = await surfaceControlService.getPublicControl('comments_write')
    if (!surfaceControl.enabled) {
      return res.status(503).json({
        error: surfaceControl.publicMessage || 'Comentarios temporariamente indisponiveis.',
        surfaceControl,
      })
    }

    const id = String(req.params.id ?? '')
    const isAdmin = req.user.role === 'admin'

    const comment = await commentService.togglePin(id, req.user.id, isAdmin)

    return res.status(200).json(comment)
  } catch (error: any) {
    console.error('Toggle pin error:', error)

    if (error.message.includes('permissao')) {
      return res.status(403).json({ error: error.message })
    }

    if (error.message.includes('nao encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao pin/unpin comentario',
      details: error.message,
    })
  }
}
