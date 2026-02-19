import { Brand, IBrand, BrandType } from '../models/Brand'
import { slugify, generateUniqueSlug } from '../utils/slugify'

/**
 * DTOs para Brand
 */
export interface CreateBrandDTO {
  name: string
  description: string
  brandType: BrandType
  logo?: string
  coverImage?: string
  images?: string[]
  website?: string
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    youtube?: string
    facebook?: string
  }
  category?: string
  tags?: string[]
  country?: string
  founded?: number
  isActive?: boolean
  isFeatured?: boolean
  isVerified?: boolean
}

export interface UpdateBrandDTO {
  name?: string
  description?: string
  brandType?: BrandType
  logo?: string
  coverImage?: string
  images?: string[]
  website?: string
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    youtube?: string
    facebook?: string
  }
  category?: string
  tags?: string[]
  country?: string
  founded?: number
  isActive?: boolean
  isFeatured?: boolean
  isVerified?: boolean
}

export interface BrandFilters {
  brandType?: BrandType
  isActive?: boolean
  isFeatured?: boolean
  isVerified?: boolean
  category?: string
  tags?: string[]
  country?: string
  search?: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sort?: string
}

/**
 * Service de Brands (Admin Only)
 */
export class BrandService {
  /**
   * Listar brands (público)
   */
  async list(filters: BrandFilters = {}, options: PaginationOptions = {}) {
    const page = options.page || 1
    const limit = options.limit || 20
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}

    // Apenas brands ativas para listagem pública
    if (filters.isActive === undefined) {
      query.isActive = true
    } else {
      query.isActive = filters.isActive
    }

    if (filters.brandType) {
      query.brandType = filters.brandType
    }

    if (filters.isFeatured !== undefined) {
      query.isFeatured = filters.isFeatured
    }

    if (filters.isVerified !== undefined) {
      query.isVerified = filters.isVerified
    }

    if (filters.category) {
      query.category = filters.category
    }

    if (filters.country) {
      query.country = filters.country
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags }
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ]
    }

    // Sort
    let sort: any = { createdAt: -1 } // Default: mais recentes
    if (options.sort === 'popular') {
      sort = { views: -1 }
    } else if (options.sort === 'rating') {
      sort = { averageRating: -1, ratingsCount: -1 }
    } else if (options.sort === 'name') {
      sort = { name: 1 }
    } else if (options.sort === 'featured') {
      sort = { isFeatured: -1, averageRating: -1 }
    }

    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name username')
        .lean(),
      Brand.countDocuments(query),
    ])

    return {
      brands,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obter brand por slug
   */
  async getBySlug(slug: string) {
    const brand = await Brand.findOne({ slug }).populate('createdBy', 'name username')

    if (!brand) {
      throw new Error('Brand não encontrada')
    }

    return brand
  }

  /**
   * Obter brand por ID
   */
  async getById(id: string) {
    const brand = await Brand.findById(id).populate('createdBy', 'name username')

    if (!brand) {
      throw new Error('Brand não encontrada')
    }

    return brand
  }

  /**
   * Criar brand (Admin Only)
   */
  async create(adminId: string, data: CreateBrandDTO) {
    // Gerar slug
    const baseSlug = slugify(data.name)
    const checkExists = async (slug: string) => {
      const existing = await Brand.findOne({ slug })
      return existing !== null
    }
    const slug = await generateUniqueSlug(baseSlug, checkExists)

    const brand = await Brand.create({
      ...data,
      slug,
      createdBy: adminId,
    })

    return brand
  }

  /**
   * Atualizar brand (Admin Only)
   */
  async update(id: string, data: UpdateBrandDTO) {
    const brand = await Brand.findById(id)

    if (!brand) {
      throw new Error('Brand não encontrada')
    }

    // Se mudar o nome, regenerar slug
    if (data.name && data.name !== brand.name) {
      const baseSlug = slugify(data.name)
      const checkExists = async (slug: string) => {
        const existing = await Brand.findOne({ slug, _id: { $ne: id } })
        return existing !== null
      }
      const newSlug = await generateUniqueSlug(baseSlug, checkExists)
      Object.assign(brand, data, { slug: newSlug })
    } else {
      Object.assign(brand, data)
    }

    await brand.save()

    return brand
  }

  /**
   * Eliminar brand (Admin Only)
   */
  async delete(id: string) {
    const brand = await Brand.findById(id)

    if (!brand) {
      throw new Error('Brand não encontrada')
    }

    await brand.deleteOne()

    return { message: 'Brand eliminada com sucesso' }
  }

  /**
   * Toggle active status (Admin Only)
   */
  async toggleActive(id: string) {
    const brand = await Brand.findById(id)

    if (!brand) {
      throw new Error('Brand não encontrada')
    }

    brand.isActive = !brand.isActive
    await brand.save()

    return brand
  }

  /**
   * Toggle featured status (Admin Only)
   */
  async toggleFeatured(id: string) {
    const brand = await Brand.findById(id)

    if (!brand) {
      throw new Error('Brand não encontrada')
    }

    brand.isFeatured = !brand.isFeatured
    await brand.save()

    return brand
  }

  /**
   * Toggle verified status (Admin Only)
   */
  async toggleVerified(id: string) {
    const brand = await Brand.findById(id)

    if (!brand) {
      throw new Error('Brand não encontrada')
    }

    brand.isVerified = !brand.isVerified
    await brand.save()

    return brand
  }

  /**
   * Incrementar views
   */
  async incrementViews(id: string) {
    await Brand.findByIdAndUpdate(id, { $inc: { views: 1 } })
  }

  /**
   * Obter estatísticas gerais
   */
  async getStats() {
    const brands = await Brand.find()

    const statsByType = await Brand.aggregate([
      {
        $group: {
          _id: '$brandType',
          count: { $sum: 1 },
          avgRating: { $avg: '$averageRating' },
          totalViews: { $sum: '$views' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    const stats = {
      total: brands.length,
      active: brands.filter((b) => b.isActive).length,
      featured: brands.filter((b) => b.isFeatured).length,
      verified: brands.filter((b) => b.isVerified).length,
      totalViews: brands.reduce((sum, b) => sum + b.views, 0),
      averageRating: brands.reduce((sum, b) => sum + b.averageRating, 0) / brands.length || 0,
      byType: statsByType,
    }

    return stats
  }

  /**
   * Obter brands em destaque
   */
  async getFeatured(limit = 10) {
    const brands = await Brand.find({ isActive: true, isFeatured: true })
      .sort({ averageRating: -1, ratingsCount: -1 })
      .limit(limit)
      .populate('createdBy', 'name username')
      .lean()

    return brands
  }

  /**
   * Obter brands por tipo
   */
  async getByType(brandType: BrandType, limit = 20) {
    const brands = await Brand.find({ isActive: true, brandType })
      .sort({ averageRating: -1, views: -1 })
      .limit(limit)
      .populate('createdBy', 'name username')
      .lean()

    return brands
  }
}

export const brandService = new BrandService()
