import { Request, Response } from 'express'
import { sitemapService } from '../services/sitemap.service'

/**
 * GET /api/sitemap
 */
export const getSitemap = async (_req: Request, res: Response) => {
  try {
    const payload = await sitemapService.getSitemapData()
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    return res.status(200).json(payload)
  } catch (error: unknown) {
    console.error('Sitemap data error:', error)

    const details = error instanceof Error ? error.message : undefined
    return res.status(500).json({
      error: 'Erro ao obter dados de sitemap.',
      details,
    })
  }
}
