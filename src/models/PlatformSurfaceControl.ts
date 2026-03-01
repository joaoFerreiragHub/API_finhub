import mongoose, { Document, Schema } from 'mongoose'

export type PlatformSurfaceKey =
  | 'editorial_home'
  | 'editorial_verticals'
  | 'comments_read'
  | 'comments_write'
  | 'reviews_read'
  | 'reviews_write'

export interface IPlatformSurfaceControl extends Document {
  key: PlatformSurfaceKey
  enabled: boolean
  reason?: string | null
  note?: string | null
  publicMessage?: string | null
  updatedBy?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const PlatformSurfaceControlSchema = new Schema<IPlatformSurfaceControl>(
  {
    key: {
      type: String,
      enum: [
        'editorial_home',
        'editorial_verticals',
        'comments_read',
        'comments_write',
        'reviews_read',
        'reviews_write',
      ],
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500,
      trim: true,
    },
    note: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    publicMessage: {
      type: String,
      default: null,
      maxlength: 500,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

PlatformSurfaceControlSchema.index({ enabled: 1, updatedAt: -1 })

export const PlatformSurfaceControl = mongoose.model<IPlatformSurfaceControl>(
  'PlatformSurfaceControl',
  PlatformSurfaceControlSchema
)
