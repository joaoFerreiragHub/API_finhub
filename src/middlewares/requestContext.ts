import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'

export const withRequestContext = (req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = req.headers['x-request-id']
  const requestId =
    typeof incomingRequestId === 'string' && incomingRequestId.length > 0
      ? incomingRequestId
      : randomUUID()

  req.requestId = requestId
  req.requestStartTimeMs = Date.now()
  res.setHeader('x-request-id', requestId)
  next()
}
