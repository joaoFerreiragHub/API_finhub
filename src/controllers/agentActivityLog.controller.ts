// src/controllers/agentActivityLog.controller.ts
// Sprint 0A — S0A-006, 007, 008, 009
// Endpoints CRUD para agent activity logs (dashboard de metricas dos agentes)
import { Request, Response } from 'express'
import { AgentActivityLog } from '../models/AgentActivityLog'

// --- S0A-006: Criar log de actividade ---
export async function createAgentLog(req: Request, res: Response): Promise<void> {
  try {
    const {
      agentId, taskId, action, status,
      startedAt, completedAt, durationMinutes,
      summary, filesChanged, tokensUsed, qualityGate,
      deviations, learnings, triggeredBy, llmModel,
    } = req.body

    // Validacao de campos obrigatorios
    if (!agentId || !taskId || !action || !status || !startedAt || !completedAt ||
        durationMinutes === undefined || !summary || !tokensUsed || !qualityGate ||
        !triggeredBy || !llmModel) {
      res.status(400).json({
        error: 'Dados inválidos',
        details: ['Campos obrigatórios em falta: agentId, taskId, action, status, startedAt, completedAt, durationMinutes, summary, tokensUsed, qualityGate, triggeredBy, llmModel'],
      })
      return
    }

    // completedAt tem de ser posterior a startedAt
    if (new Date(completedAt) < new Date(startedAt)) {
      res.status(400).json({ error: 'completedAt não pode ser anterior a startedAt' })
      return
    }

    const log = await AgentActivityLog.create({
      agentId, taskId, action, status,
      startedAt: new Date(startedAt),
      completedAt: new Date(completedAt),
      durationMinutes,
      summary,
      filesChanged: filesChanged || [],
      tokensUsed,
      qualityGate,
      deviations: deviations || [],
      learnings,
      triggeredBy,
      llmModel,
    })

    res.status(201).json({ success: true, log })
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      res.status(400).json({ error: 'Dados inválidos', details: Object.values(err.errors).map((e: any) => e.message) })
      return
    }
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// --- S0A-007: Listar logs com filtros e paginacao ---
export async function listAgentLogs(req: Request, res: Response): Promise<void> {
  try {
    const {
      agentId, taskId, status,
      dateFrom, dateTo,
      page = '1', limit = '20',
      sort = 'startedAt_desc',
    } = req.query as Record<string, string>

    const filter: Record<string, any> = {}
    if (agentId) filter.agentId = agentId
    if (taskId) filter.taskId = taskId
    if (status) filter.status = status
    if (dateFrom || dateTo) {
      filter.startedAt = {}
      if (dateFrom) filter.startedAt.$gte = new Date(dateFrom)
      if (dateTo) filter.startedAt.$lte = new Date(dateTo)
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const skip = (pageNum - 1) * limitNum

    const sortOrder: Record<string, 1 | -1> = {}
    if (sort === 'startedAt_asc') sortOrder.startedAt = 1
    else sortOrder.startedAt = -1

    const [logs, total] = await Promise.all([
      AgentActivityLog.find(filter).sort(sortOrder).skip(skip).limit(limitNum).lean(),
      AgentActivityLog.countDocuments(filter),
    ])

    res.status(200).json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// --- S0A-008: Estatisticas agregadas (por agente, por sprint, global) ---
export async function getAgentLogStats(req: Request, res: Response): Promise<void> {
  try {
    const { agentId, sprintId, dateFrom, dateTo } = req.query as Record<string, string>

    const matchFilter: Record<string, any> = {}
    if (agentId) matchFilter.agentId = agentId
    if (sprintId) matchFilter.taskId = { $regex: `^${sprintId}` }
    if (dateFrom || dateTo) {
      matchFilter.startedAt = {}
      if (dateFrom) matchFilter.startedAt.$gte = new Date(dateFrom)
      if (dateTo) matchFilter.startedAt.$lte = new Date(dateTo)
    }

    // Agregacao por agente
    const byAgentPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$agentId',
          totalTasks: { $sum: 1 },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failureCount: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
          blockedCount: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          avgDurationMinutes: { $avg: '$durationMinutes' },
          totalCostUSD: { $sum: '$tokensUsed.cost' },
          totalRejections: { $sum: '$qualityGate.rejections' },
          tasksWithRejections: { $sum: { $cond: [{ $gt: ['$qualityGate.rejections', 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          agentId: '$_id',
          totalTasks: 1,
          successCount: 1,
          failureCount: 1,
          partialCount: 1,
          blockedCount: 1,
          successRate: { $cond: [{ $eq: ['$totalTasks', 0] }, 0, { $divide: ['$successCount', '$totalTasks'] }] },
          avgDurationMinutes: { $round: ['$avgDurationMinutes', 1] },
          totalCostUSD: { $round: ['$totalCostUSD', 4] },
          totalRejections: 1,
          qaRejectionRate: { $cond: [{ $eq: ['$totalTasks', 0] }, 0, { $divide: ['$tasksWithRejections', '$totalTasks'] }] },
        },
      },
      { $sort: { totalTasks: -1 as const } },
    ]

    // Agregacao por sprint (prefixo do taskId)
    const bySprintPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$taskId', regex: /^S0A-/ } }, then: 'S0A' },
                { case: { $regexMatch: { input: '$taskId', regex: /^S0-/ } }, then: 'S0' },
                { case: { $regexMatch: { input: '$taskId', regex: /^S1-/ } }, then: 'S1' },
                { case: { $regexMatch: { input: '$taskId', regex: /^S2-/ } }, then: 'S2' },
              ],
              default: 'other',
            },
          },
          doneTasks: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          totalCostUSD: { $sum: '$tokensUsed.cost' },
          totalLogs: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          sprintPrefix: '$_id',
          doneTasks: 1,
          totalCostUSD: { $round: ['$totalCostUSD', 4] },
          totalLogs: 1,
        },
      },
    ]

    // Stats globais
    const globalPipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          avgDurationMinutes: { $avg: '$durationMinutes' },
          totalCostUSD: { $sum: '$tokensUsed.cost' },
          tasksWithRejections: { $sum: { $cond: [{ $gt: ['$qualityGate.rejections', 0] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalLogs: 1,
          successRate: { $cond: [{ $eq: ['$totalLogs', 0] }, 0, { $divide: ['$successCount', '$totalLogs'] }] },
          avgDurationMinutes: { $round: ['$avgDurationMinutes', 1] },
          totalCostUSD: { $round: ['$totalCostUSD', 4] },
          qaRejectionRate: { $cond: [{ $eq: ['$totalLogs', 0] }, 0, { $divide: ['$tasksWithRejections', '$totalLogs'] }] },
        },
      },
    ]

    const [byAgentResult, bySprintResult, globalResult] = await Promise.all([
      AgentActivityLog.aggregate(byAgentPipeline),
      AgentActivityLog.aggregate(bySprintPipeline),
      AgentActivityLog.aggregate(globalPipeline),
    ])

    res.status(200).json({
      global: globalResult[0] || { totalLogs: 0, successRate: 0, avgDurationMinutes: 0, totalCostUSD: 0, qaRejectionRate: 0 },
      byAgent: byAgentResult,
      bySprint: bySprintResult,
    })
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// --- S0A-009: Historico de um agente especifico ---
export async function getAgentHistory(req: Request, res: Response): Promise<void> {
  try {
    const { agentId } = req.params
    const { status, dateFrom, dateTo, page = '1', limit = '50' } = req.query as Record<string, string>

    const filter: Record<string, any> = { agentId }
    if (status) filter.status = status
    if (dateFrom || dateTo) {
      filter.startedAt = {}
      if (dateFrom) filter.startedAt.$gte = new Date(dateFrom)
      if (dateTo) filter.startedAt.$lte = new Date(dateTo)
    }

    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)))
    const skip = (pageNum - 1) * limitNum

    const [logs, total] = await Promise.all([
      AgentActivityLog.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limitNum).lean(),
      AgentActivityLog.countDocuments(filter),
    ])

    // Summary global do agente (independente dos filtros de paginacao)
    const allLogs = await AgentActivityLog.find({ agentId }).lean()
    const successCount = allLogs.filter(l => l.status === 'success').length
    const totalCostUSD = allLogs.reduce((sum, l) => sum + (l.tokensUsed?.cost || 0), 0)
    const avgDuration = allLogs.length > 0
      ? allLogs.reduce((sum, l) => sum + l.durationMinutes, 0) / allLogs.length
      : 0

    res.status(200).json({
      agentId,
      summary: {
        totalTasks: allLogs.length,
        successRate: allLogs.length > 0 ? successCount / allLogs.length : 0,
        avgDurationMinutes: Math.round(avgDuration * 10) / 10,
        totalCostUSD: Math.round(totalCostUSD * 10000) / 10000,
        autonomyLevel: 0, // fase 1: sempre 0 — autonomia controlada
      },
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
