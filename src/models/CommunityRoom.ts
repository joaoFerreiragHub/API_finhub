import mongoose, { Document, Schema } from 'mongoose'
import { UserRole } from './User'

export type CommunityRoomCategory =
  | 'general'
  | 'budgeting'
  | 'investing'
  | 'real_estate'
  | 'fire'
  | 'credit'
  | 'expat'
  | 'beginners'
  | 'premium'

export interface ICommunityRoom extends Document {
  slug: string
  name: string
  description: string
  icon: string
  category: CommunityRoomCategory
  isPublic: boolean
  requiredRole: UserRole
  moderators: mongoose.Types.ObjectId[]
  postCount: number
  memberCount: number
  isPremium: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const COMMUNITY_ROOM_CATEGORIES: readonly CommunityRoomCategory[] = [
  'general',
  'budgeting',
  'investing',
  'real_estate',
  'fire',
  'credit',
  'expat',
  'beginners',
  'premium',
]

const USER_ROLES: readonly UserRole[] = [
  'visitor',
  'free',
  'premium',
  'creator',
  'brand_manager',
  'admin',
]

const CommunityRoomSchema = new Schema<ICommunityRoom>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalido'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    icon: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8,
    },
    category: {
      type: String,
      required: true,
      enum: COMMUNITY_ROOM_CATEGORIES,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    requiredRole: {
      type: String,
      enum: USER_ROLES,
      default: 'visitor',
      index: true,
    },
    moderators: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    postCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    memberCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

CommunityRoomSchema.index({ slug: 1 }, { unique: true })
CommunityRoomSchema.index({ isPublic: 1, sortOrder: 1 })

export const CommunityRoom = mongoose.model<ICommunityRoom>('CommunityRoom', CommunityRoomSchema)
