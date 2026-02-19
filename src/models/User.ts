import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

export type UserRole = 'visitor' | 'free' | 'premium' | 'creator' | 'admin'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  username: string
  avatar?: string
  role: UserRole

  // Creator specific
  bio?: string
  socialLinks?: {
    website?: string
    twitter?: string
    linkedin?: string
    instagram?: string
  }

  // Premium
  subscriptionExpiry?: Date

  // Stats
  followers: number
  following: number

  // Timestamps
  createdAt: Date
  updatedAt: Date

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Não retornar password por default
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      match: [/^[a-z0-9_]+$/, 'Username só pode conter letras, números e underscores'],
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['visitor', 'free', 'premium', 'creator', 'admin'],
      default: 'free',
    },

    // Creator specific
    bio: {
      type: String,
      maxlength: 500,
    },
    socialLinks: {
      website: String,
      twitter: String,
      linkedin: String,
      instagram: String,
    },

    // Premium
    subscriptionExpiry: {
      type: Date,
      default: null,
    },

    // Stats
    followers: {
      type: Number,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
UserSchema.index({ email: 1 })
UserSchema.index({ username: 1 })
UserSchema.index({ role: 1 })

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    return false
  }
}

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

export const User = mongoose.model<IUser>('User', UserSchema)
