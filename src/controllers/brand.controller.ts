import { Request, Response } from 'express'
import { AuthRequest } from '../types/auth'
import {
  brandService,
  CreateBrandDTO,
  UpdateBrandDTO,
  BrandFilters,
} from '../services/brand.service'
import { BrandType } from '../models/Brand'

/**
 * Listar brands (público)
 * GET /api/brands
 */
export const listBrands = async (req: Request, res: Response) => {
  try {
    const filters: BrandFilters = {
      brandType: req.query.brandType as BrandType,
      isActive: req.query.isActive === 'true',
      isFeatured: req.query.isFeatured === 'true',
      isVerified: req.query.isVerified === 'true',
      category: req.query.category as string,
      country: req.query.country as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
    }

    const result = await brandService.list(filters, options)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('List brands error:', error)
    return res.status(500).json({
      error: 'Erro ao listar brands',
      details: error.message,
    })
  }
}

/**
 * Obter brand por slug (público)
 * GET /api/brands/:slug
 */
export const getBrandBySlug = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? "")

    const brand = await brandService.getBySlug(slug)

    // Incrementar views (async, não bloquear response)
    brandService.incrementViews(brand.id).catch(console.error)

    return res.status(200).json(brand)
  } catch (error: any) {
    console.error('Get brand error:', error)
    return res.status(404).json({
      error: 'Brand não encontrada',
      details: error.message,
    })
  }
}

/**
 * Obter brands em destaque (público)
 * GET /api/brands/featured
 */
export const getFeaturedBrands = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10

    const brands = await brandService.getFeatured(limit)

    return res.status(200).json(brands)
  } catch (error: any) {
    console.error('Get featured brands error:', error)
    return res.status(500).json({
      error: 'Erro ao obter brands em destaque',
      details: error.message,
    })
  }
}

/**
 * Obter brands por tipo (público)
 * GET /api/brands/type/:type
 */
export const getBrandsByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const limit = parseInt(req.query.limit as string) || 20

    const brands = await brandService.getByType(type as BrandType, limit)

    return res.status(200).json(brands)
  } catch (error: any) {
    console.error('Get brands by type error:', error)
    return res.status(500).json({
      error: 'Erro ao obter brands por tipo',
      details: error.message,
    })
  }
}

/**
 * Criar brand (protegido - admin only)
 * POST /api/brands
 */
export const createBrand = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem criar brands' })
    }

    const data: CreateBrandDTO = req.body

    // Validar campos obrigatórios
    if (!data.name || !data.description || !data.brandType) {
      return res.status(400).json({
        error: 'Campos obrigatórios: name, description, brandType',
      })
    }

    const brand = await brandService.create(req.user.id, data)

    return res.status(201).json(brand)
  } catch (error: any) {
    console.error('Create brand error:', error)
    return res.status(500).json({
      error: 'Erro ao criar brand',
      details: error.message,
    })
  }
}

/**
 * Atualizar brand (protegido - admin only)
 * PATCH /api/brands/:id
 */
export const updateBrand = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem atualizar brands' })
    }

    const id = String(req.params.id ?? "")
    const data: UpdateBrandDTO = req.body

    const brand = await brandService.update(id, data)

    return res.status(200).json(brand)
  } catch (error: any) {
    console.error('Update brand error:', error)

    if (error.message.includes('não encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao atualizar brand',
      details: error.message,
    })
  }
}

/**
 * Eliminar brand (protegido - admin only)
 * DELETE /api/brands/:id
 */
export const deleteBrand = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem eliminar brands' })
    }

    const id = String(req.params.id ?? "")

    const result = await brandService.delete(id)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Delete brand error:', error)

    if (error.message.includes('não encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao eliminar brand',
      details: error.message,
    })
  }
}

/**
 * Toggle active status (protegido - admin only)
 * PATCH /api/brands/:id/toggle-active
 */
export const toggleActive = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem alterar status' })
    }

    const id = String(req.params.id ?? "")

    const brand = await brandService.toggleActive(id)

    return res.status(200).json(brand)
  } catch (error: any) {
    console.error('Toggle active error:', error)

    if (error.message.includes('não encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao alterar status',
      details: error.message,
    })
  }
}

/**
 * Toggle featured status (protegido - admin only)
 * PATCH /api/brands/:id/toggle-featured
 */
export const toggleFeatured = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem destacar brands' })
    }

    const id = String(req.params.id ?? "")

    const brand = await brandService.toggleFeatured(id)

    return res.status(200).json(brand)
  } catch (error: any) {
    console.error('Toggle featured error:', error)

    if (error.message.includes('não encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao destacar brand',
      details: error.message,
    })
  }
}

/**
 * Toggle verified status (protegido - admin only)
 * PATCH /api/brands/:id/toggle-verified
 */
export const toggleVerified = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem verificar brands' })
    }

    const id = String(req.params.id ?? "")

    const brand = await brandService.toggleVerified(id)

    return res.status(200).json(brand)
  } catch (error: any) {
    console.error('Toggle verified error:', error)

    if (error.message.includes('não encontrada')) {
      return res.status(404).json({ error: error.message })
    }

    return res.status(500).json({
      error: 'Erro ao verificar brand',
      details: error.message,
    })
  }
}

/**
 * Obter estatísticas gerais (protegido - admin only)
 * GET /api/brands/stats
 */
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' })
    }

    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admins podem ver estatísticas' })
    }

    const stats = await brandService.getStats()

    return res.status(200).json(stats)
  } catch (error: any) {
    console.error('Get stats error:', error)
    return res.status(500).json({
      error: 'Erro ao obter estatísticas',
      details: error.message,
    })
  }
}
