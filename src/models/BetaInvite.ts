import mongoose, { Document, Schema } from 'mongoose'

export interface IBetaInvite extends Document {
  email: string
  createdBy: mongoose.Types.ObjectId
  usedAt?: Date | null
  usedBy?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const BetaInviteSchema = new Schema<IBetaInvite>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalido'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

BetaInviteSchema.index({ email: 1 }, { unique: true })

export const BetaInvite = mongoose.model<IBetaInvite>('BetaInvite', BetaInviteSchema)
