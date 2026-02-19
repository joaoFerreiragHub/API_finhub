import { Router } from 'express'
import {
  createComment,
  listComments,
  getCommentTree,
  getReplies,
  updateComment,
  deleteComment,
  toggleLike,
  togglePin,
} from '../controllers/comment.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

/**
 * @route   POST /api/comments
 * @desc    Criar comentário ou resposta
 * @access  Private
 * @body    { targetType, targetId, content, parentCommentId? }
 */
router.post('/', authenticate, createComment)

/**
 * @route   GET /api/comments/:targetType/:targetId
 * @desc    Listar comentários principais (depth 0)
 * @access  Public
 * @query   ?page=1&limit=20&sort=recent|popular|oldest
 */
router.get('/:targetType/:targetId', listComments)

/**
 * @route   GET /api/comments/:targetType/:targetId/tree
 * @desc    Obter árvore completa de comentários (com respostas aninhadas)
 * @access  Public
 * @query   ?page=1&limit=20&sort=recent|popular|oldest
 */
router.get('/:targetType/:targetId/tree', getCommentTree)

/**
 * @route   GET /api/comments/:commentId/replies
 * @desc    Obter respostas de um comentário
 * @access  Public
 */
router.get('/:commentId/replies', getReplies)

/**
 * @route   PATCH /api/comments/:id
 * @desc    Atualizar comentário
 * @access  Private (Owner/Admin)
 * @body    { content }
 */
router.patch('/:id', authenticate, updateComment)

/**
 * @route   DELETE /api/comments/:id
 * @desc    Eliminar comentário (e todas as respostas)
 * @access  Private (Owner/Admin)
 */
router.delete('/:id', authenticate, deleteComment)

/**
 * @route   POST /api/comments/:id/like
 * @desc    Like/Unlike comentário
 * @access  Private
 */
router.post('/:id/like', authenticate, toggleLike)

/**
 * @route   PATCH /api/comments/:id/pin
 * @desc    Pin/Unpin comentário
 * @access  Private (Content Owner/Admin)
 */
router.patch('/:id/pin', authenticate, togglePin)

export default router
