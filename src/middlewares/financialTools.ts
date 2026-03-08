import { NextFunction, Response } from 'express'
import { AuthRequest } from '../types/auth'
import { FinancialToolKey } from '../models/FinancialToolControl'
import { adminFinancialToolsService } from '../services/adminFinancialTools.service'
import { logWarn } from '../utils/logger'

const collectSymbolsFromValue = (value: unknown, target: Set<string>) => {
  if (typeof value === 'string') {
    const parts = value.split(',')
    for (const part of parts) {
      const normalized = part.trim().toUpperCase()
      if (normalized) target.add(normalized)
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectSymbolsFromValue(item, target)
    }
  }
}

const countRequestedSymbols = (req: AuthRequest): number => {
  const symbols = new Set<string>()

  collectSymbolsFromValue(req.params?.symbol, symbols)
  collectSymbolsFromValue(req.query?.symbol, symbols)
  collectSymbolsFromValue(req.query?.symbols, symbols)
  collectSymbolsFromValue(req.query?.ticker, symbols)
  collectSymbolsFromValue(req.query?.tickers, symbols)
  collectSymbolsFromValue(req.query?.etf1, symbols)
  collectSymbolsFromValue(req.query?.etf2, symbols)

  return symbols.size > 0 ? symbols.size : 1
}

export const enforceFinancialToolAvailability =
  (tool: FinancialToolKey) => async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const runtimeControl = await adminFinancialToolsService.getRuntimeControl(tool)

      if (!runtimeControl.enabled) {
        return res.status(503).json({
          error: 'Ferramenta temporariamente indisponivel.',
          tool: runtimeControl.tool,
          environment: runtimeControl.environment,
          reason: 'disabled_by_admin',
        })
      }

      const requestedSymbols = countRequestedSymbols(req)
      if (requestedSymbols > runtimeControl.maxSymbolsPerRequest) {
        return res.status(400).json({
          error: `Numero maximo de simbolos excedido para ${runtimeControl.tool}.`,
          tool: runtimeControl.tool,
          requestedSymbols,
          maxSymbolsPerRequest: runtimeControl.maxSymbolsPerRequest,
        })
      }

      ;(res.locals as Record<string, unknown>).financialToolControl = runtimeControl
      return next()
    } catch (error: unknown) {
      logWarn('financial_tool_guard_failed_open', {
        tool,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      return next()
    }
  }

export const trackFinancialToolUsage =
  (tool: FinancialToolKey) => (req: AuthRequest, res: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint()
    const hasUser = Boolean(req.user?.id)

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - startedAt
      const durationMs = Number(durationNs) / 1_000_000

      void adminFinancialToolsService
        .recordUsageEvent({
          tool,
          statusCode: res.statusCode,
          durationMs,
          authenticated: hasUser,
        })
        .catch((error: unknown) => {
          logWarn('financial_tool_usage_record_failed', {
            tool,
            statusCode: res.statusCode,
            errorMessage: error instanceof Error ? error.message : String(error),
          })
        })
    })

    return next()
  }
