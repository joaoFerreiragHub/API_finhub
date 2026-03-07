import mongoose, { Document, Schema } from 'mongoose'
import { generateUniqueSlug, slugify } from '../utils/slugify'

export type PlaylistType = 'regular' | 'shorts' | 'podcast'
export type PlaylistPlatform = 'youtube' | 'spotify' | 'tiktok' | 'vimeo' | 'internal'
export type PlaylistStatus = 'active' | 'archived'

export interface IPlaylistItem {
  url: string
  title?: string
  duration?: number
  thumbnailUrl?: string
  order: number
  platform?: PlaylistPlatform
}

export interface IPlaylist extends Document {
  name: string
  slug: string
  creator: mongoose.Types.ObjectId
  description?: string
  type: PlaylistType
  topic?: string
  items: IPlaylistItem[]
  isPublic: boolean
  isMain: boolean
  coverImage?: string
  views: number
  status: PlaylistStatus
  createdAt: Date
  updatedAt: Date
}

const PlaylistItemSchema = new Schema<IPlaylistItem>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    duration: {
      type: Number,
      min: 0,
      max: 43200,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    platform: {
      type: String,
      enum: ['youtube', 'spotify', 'tiktok', 'vimeo', 'internal'],
      default: 'youtube',
    },
  },
  {
    _id: false,
  }
)

const PlaylistSchema = new Schema<IPlaylist>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    type: {
      type: String,
      enum: ['regular', 'shorts', 'podcast'],
      default: 'regular',
      index: true,
    },
    topic: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
      index: true,
    },
    items: {
      type: [PlaylistItemSchema],
      default: [],
      validate: {
        validator: function (items: IPlaylistItem[]) {
          return items.length <= 200
        },
        message: 'Uma playlist suporta no maximo 200 itens',
      },
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    isMain: {
      type: Boolean,
      default: false,
      index: true,
    },
    coverImage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

PlaylistSchema.index({ creator: 1, createdAt: -1 })
PlaylistSchema.index({ creator: 1, type: 1, status: 1 })
PlaylistSchema.index({ isPublic: 1, status: 1, views: -1 })
PlaylistSchema.index(
  { creator: 1, isMain: 1 },
  {
    unique: true,
    partialFilterExpression: { isMain: true },
  }
)

PlaylistSchema.pre('validate', async function (this: IPlaylist) {
  if (this.isNew || this.isModified('name')) {
    if (!this.slug) {
      const baseSlug = slugify(this.name)
      const checkExists = async (slug: string) => {
        const existing = await Playlist.findOne({ slug })
        return existing !== null
      }
      this.slug = await generateUniqueSlug(baseSlug, checkExists)
    }
  }

  if (Array.isArray(this.items) && this.items.length > 0) {
    this.items = this.items
      .filter((item) => typeof item.url === 'string' && item.url.trim().length > 0)
      .map((item, index) => ({
        ...item,
        url: item.url.trim(),
        order: index + 1,
      })) as unknown as IPlaylistItem[]
  }
})

export const Playlist = mongoose.model<IPlaylist>('Playlist', PlaylistSchema)
