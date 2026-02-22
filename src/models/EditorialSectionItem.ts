import mongoose, { Document, Schema } from 'mongoose'

export type EditorialSectionItemStatus = 'active' | 'inactive'
export type EditorialSectionItemTargetType =
  | 'article'
  | 'video'
  | 'course'
  | 'live'
  | 'podcast'
  | 'book'
  | 'directory_entry'
  | 'external_link'
  | 'custom'

export interface IEditorialSectionItem extends Document {
  sectionId: mongoose.Types.ObjectId
  targetType: EditorialSectionItemTargetType
  targetId: string
  titleOverride?: string
  descriptionOverride?: string
  imageOverride?: string
  urlOverride?: string
  badge?: string
  sortOrder: number
  isPinned: boolean
  status: EditorialSectionItemStatus
  startAt?: Date
  endAt?: Date
  metadata?: Record<string, unknown>
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const EditorialSectionItemSchema = new Schema<IEditorialSectionItem>(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'EditorialSection',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['article', 'video', 'course', 'live', 'podcast', 'book', 'directory_entry', 'external_link', 'custom'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    titleOverride: {
      type: String,
      default: null,
      trim: true,
      maxlength: 180,
    },
    descriptionOverride: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    imageOverride: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    urlOverride: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1200,
    },
    badge: {
      type: String,
      default: null,
      trim: true,
      maxlength: 60,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    startAt: {
      type: Date,
      default: null,
      index: true,
    },
    endAt: {
      type: Date,
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
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

EditorialSectionItemSchema.index({ sectionId: 1, sortOrder: 1 })
EditorialSectionItemSchema.index({ sectionId: 1, isPinned: -1, sortOrder: 1 })
EditorialSectionItemSchema.index({ sectionId: 1, targetType: 1, targetId: 1 }, { unique: true })
EditorialSectionItemSchema.index({ status: 1, startAt: 1, endAt: 1 })

export const EditorialSectionItem = mongoose.model<IEditorialSectionItem>(
  'EditorialSectionItem',
  EditorialSectionItemSchema
)
