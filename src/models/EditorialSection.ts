import mongoose, { Document, Schema } from 'mongoose'

export type EditorialSectionType = 'content' | 'directory' | 'mixed' | 'custom'
export type EditorialSectionStatus = 'active' | 'inactive'

export interface IEditorialSection extends Document {
  key: string
  title: string
  subtitle?: string
  description?: string
  sectionType: EditorialSectionType
  order: number
  maxItems: number
  status: EditorialSectionStatus
  showOnHome: boolean
  showOnLanding: boolean
  showOnShowAll: boolean
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const EditorialSectionSchema = new Schema<IEditorialSection>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    subtitle: {
      type: String,
      default: null,
      trim: true,
      maxlength: 220,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    sectionType: {
      type: String,
      enum: ['content', 'directory', 'mixed', 'custom'],
      default: 'mixed',
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    maxItems: {
      type: Number,
      default: 12,
      min: 1,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    showOnHome: {
      type: Boolean,
      default: true,
      index: true,
    },
    showOnLanding: {
      type: Boolean,
      default: true,
      index: true,
    },
    showOnShowAll: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

EditorialSectionSchema.index({ status: 1, order: 1 })
EditorialSectionSchema.index({ showOnHome: 1, status: 1, order: 1 })

export const EditorialSection = mongoose.model<IEditorialSection>(
  'EditorialSection',
  EditorialSectionSchema
)
