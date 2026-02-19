// middlewares/validation.ts

import { Request, Response, NextFunction } from 'express'
import { ResponseBuilder, ErrorCodes } from '../types/responses'

const getParamValue = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '')

// FIXED: Return Promise<void> instead of Response
export const validateQuery = (allowedParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const queryKeys = Object.keys(req.query)
      const invalidParams = queryKeys.filter(key => !allowedParams.includes(key))
      
      if (invalidParams.length > 0) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            `Invalid query parameters: ${invalidParams.join(', ')}`,
            {
              allowedParams,
              receivedParams: queryKeys,
              invalidParams
            }
          )
        )
        return // FIXED: Use return without value
      }
      
      // Validações específicas
      if (req.query.limit && isNaN(Number(req.query.limit))) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Parameter "limit" must be a number'
          )
        )
        return // FIXED: Use return without value
      }
      
      if (req.query.offset && isNaN(Number(req.query.offset))) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Parameter "offset" must be a number'
          )
        )
        return // FIXED: Use return without value
      }
      
      // Validar categoria se presente
      if (req.query.category) {
        const validCategories = ['market', 'crypto', 'economy', 'earnings', 'general']
        if (!validCategories.includes(req.query.category as string)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              `Invalid category. Must be one of: ${validCategories.join(', ')}`
            )
          )
          return // FIXED: Use return without value
        }
      }
      
      // Validar sentimento se presente
      if (req.query.sentiment) {
        const validSentiments = ['positive', 'negative', 'neutral']
        if (!validSentiments.includes(req.query.sentiment as string)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              `Invalid sentiment. Must be one of: ${validSentiments.join(', ')}`
            )
          )
          return // FIXED: Use return without value
        }
      }
      
      // Validar datas se presentes
      if (req.query.from && isNaN(Date.parse(req.query.from as string))) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Parameter "from" must be a valid date'
          )
        )
        return // FIXED: Use return without value
      }
      
      if (req.query.to && isNaN(Date.parse(req.query.to as string))) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Parameter "to" must be a valid date'
          )
        )
        return // FIXED: Use return without value
      }
      
      // Validar sortBy se presente
      if (req.query.sortBy) {
        const validSortBy = ['publishedDate', 'views', 'relevance', 'title']
        if (!validSortBy.includes(req.query.sortBy as string)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              `Invalid sortBy. Must be one of: ${validSortBy.join(', ')}`
            )
          )
          return // FIXED: Use return without value
        }
      }
      
      // Validar sortOrder se presente
      if (req.query.sortOrder) {
        const validSortOrder = ['asc', 'desc']
        if (!validSortOrder.includes(req.query.sortOrder as string)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              `Invalid sortOrder. Must be one of: ${validSortOrder.join(', ')}`
            )
          )
          return // FIXED: Use return without value
        }
      }
      
      // Validar timeframe se presente
      if (req.query.timeframe) {
        const validTimeframes = ['1h', '6h', '24h', '7d', '30d']
        if (!validTimeframes.includes(req.query.timeframe as string)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
            )
          )
          return // FIXED: Use return without value
        }
      }
      
      next()
    } catch (error) {
      console.error('Validation middleware error:', error)
      res.status(500).json(
        ResponseBuilder.error(
          ErrorCodes.INTERNAL_ERROR,
          'Internal validation error'
        )
      )
    }
  }
}

// FIXED: Return Promise<void> instead of Response
export const validateParams = (requiredParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const missingParams = requiredParams.filter(param => !req.params[param])
      
      if (missingParams.length > 0) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            `Missing required parameters: ${missingParams.join(', ')}`,
            {
              requiredParams,
              receivedParams: Object.keys(req.params),
              missingParams
            }
          )
        )
        return // FIXED: Use return without value
      }
      
      // Validações específicas por parâmetro
      
      // Validar ID se presente
      const idParam = getParamValue(req.params.id)
      if (idParam && idParam.trim().length === 0) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Parameter "id" cannot be empty'
          )
        )
        return // FIXED: Use return without value
      }
      
      // Validar símbolo de ticker se presente
      if (req.params.symbol) {
        const symbol = getParamValue(req.params.symbol).toUpperCase()
        // Validar formato básico do ticker (2-5 letras)
        if (!/^[A-Z]{1,5}$/.test(symbol)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              'Parameter "symbol" must be a valid ticker symbol (1-5 letters)'
            )
          )
          return // FIXED: Use return without value
        }
        
        // Normalizar o símbolo
        req.params.symbol = symbol
      }
      
      // Validar categoria se presente nos parâmetros
      if (req.params.category) {
        const category = getParamValue(req.params.category)
        const validCategories = ['market', 'crypto', 'economy', 'earnings', 'general']
        if (!validCategories.includes(category)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              `Invalid category. Must be one of: ${validCategories.join(', ')}`
            )
          )
          return // FIXED: Use return without value
        }
      }
      
      // Validar sentimento se presente nos parâmetros
      if (req.params.sentiment) {
        const sentiment = getParamValue(req.params.sentiment)
        const validSentiments = ['positive', 'negative', 'neutral']
        if (!validSentiments.includes(sentiment)) {
          res.status(400).json(
            ResponseBuilder.error(
              ErrorCodes.VALIDATION_ERROR,
              `Invalid sentiment. Must be one of: ${validSentiments.join(', ')}`
            )
          )
          return // FIXED: Use return without value
        }
      }
      
      next()
    } catch (error) {
      console.error('Parameter validation middleware error:', error)
      res.status(500).json(
        ResponseBuilder.error(
          ErrorCodes.INTERNAL_ERROR,
          'Internal parameter validation error'
        )
      )
    }
  }
}

// FIXED: Additional validation middleware for request body
export const validateBody = (requiredFields: string[], optionalFields: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const allowedFields = [...requiredFields, ...optionalFields]
      const bodyKeys = Object.keys(req.body)
      
      // Verificar campos obrigatórios
      const missingFields = requiredFields.filter(field => !(field in req.body))
      if (missingFields.length > 0) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            `Missing required fields: ${missingFields.join(', ')}`,
            {
              requiredFields,
              receivedFields: bodyKeys,
              missingFields
            }
          )
        )
        return // FIXED: Use return without value
      }
      
      // Verificar campos não permitidos
      const invalidFields = bodyKeys.filter(field => !allowedFields.includes(field))
      if (invalidFields.length > 0) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            `Invalid fields: ${invalidFields.join(', ')}`,
            {
              allowedFields,
              receivedFields: bodyKeys,
              invalidFields
            }
          )
        )
        return // FIXED: Use return without value
      }
      
      // Validações específicas
      if (req.body.q && typeof req.body.q !== 'string') {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Field "q" must be a string'
          )
        )
        return // FIXED: Use return without value
      }
      
      if (req.body.limit && (isNaN(Number(req.body.limit)) || Number(req.body.limit) < 1)) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Field "limit" must be a positive number'
          )
        )
        return // FIXED: Use return without value
      }
      
      if (req.body.offset && (isNaN(Number(req.body.offset)) || Number(req.body.offset) < 0)) {
        res.status(400).json(
          ResponseBuilder.error(
            ErrorCodes.VALIDATION_ERROR,
            'Field "offset" must be a non-negative number'
          )
        )
        return // FIXED: Use return without value
      }
      
      next()
    } catch (error) {
      console.error('Body validation middleware error:', error)
      res.status(500).json(
        ResponseBuilder.error(
          ErrorCodes.INTERNAL_ERROR,
          'Internal body validation error'
        )
      )
    }
  }
}

// FIXED: Middleware for validating arrays in query parameters
export const validateArrayParams = (arrayParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const param of arrayParams) {
        if (req.query[param]) {
          // Se é string, converter para array
          if (typeof req.query[param] === 'string') {
            req.query[param] = [req.query[param] as string]
          }
          
          // Verificar se é array válido
          if (!Array.isArray(req.query[param])) {
            res.status(400).json(
              ResponseBuilder.error(
                ErrorCodes.VALIDATION_ERROR,
                `Parameter "${param}" must be an array or string`
              )
            )
            return // FIXED: Use return without value
          }
          
          // Validar elementos do array
          const arrayValue = req.query[param] as string[]
          if (arrayValue.some(item => typeof item !== 'string' || item.trim().length === 0)) {
            res.status(400).json(
              ResponseBuilder.error(
                ErrorCodes.VALIDATION_ERROR,
                `All items in parameter "${param}" must be non-empty strings`
              )
            )
            return // FIXED: Use return without value
          }
        }
      }
      
      next()
    } catch (error) {
      console.error('Array params validation middleware error:', error)
      res.status(500).json(
        ResponseBuilder.error(
          ErrorCodes.INTERNAL_ERROR,
          'Internal array validation error'
        )
      )
    }
  }
}
