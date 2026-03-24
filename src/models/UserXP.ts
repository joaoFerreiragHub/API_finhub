import mongoose, { Document, Schema } from 'mongoose'

const XP_LEVEL_THRESHOLDS = [
  { level: 7, minXp: 7000 },
  { level: 6, minXp: 3000 },
  { level: 5, minXp: 1500 },
  { level: 4, minXp: 700 },
  { level: 3, minXp: 300 },
  { level: 2, minXp: 100 },
  { level: 1, minXp: 0 },
] as const

export interface IUserXpBadgeEntry {
  id: string
  unlockedAt: Date
}

export interface IUserXpHistoryEntry {
  action: string
  xp: number
  contentId?: string | null
  createdAt: Date
}

export interface IUserXP extends Document {
  user: mongoose.Types.ObjectId
  totalXp: number
  level: number
  weeklyXp: number
  weeklyResetAt: Date
  badges: IUserXpBadgeEntry[]
  history: IUserXpHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

export const calculateXpLevel = (totalXpRaw: number): number => {
  const totalXp = Number.isFinite(totalXpRaw) ? Math.max(0, Math.floor(totalXpRaw)) : 0
  const match = XP_LEVEL_THRESHOLDS.find((entry) => totalXp >= entry.minXp)
  return match?.level ?? 1
}

const UserXpBadgeSchema = new Schema<IUserXpBadgeEntry>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    unlockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
)

const UserXpHistorySchema = new Schema<IUserXpHistoryEntry>(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    xp: {
      type: Number,
      required: true,
    },
    contentId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 240,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
)

const MAX_HISTORY_ENTRIES = 100

const UserXPSchema = new Schema<IUserXP>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    weeklyXp: {
      type: Number,
      default: 0,
      min: 0,
    },
    weeklyResetAt: {
      type: Date,
      default: Date.now,
    },
    badges: {
      type: [UserXpBadgeSchema],
      default: [],
    },
    history: {
      type: [UserXpHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

UserXPSchema.pre('save', function (next) {
  const normalizedTotalXp = Number.isFinite(this.totalXp) ? Math.max(0, Math.floor(this.totalXp)) : 0
  const normalizedWeeklyXp = Number.isFinite(this.weeklyXp) ? Math.max(0, Math.floor(this.weeklyXp)) : 0

  this.totalXp = normalizedTotalXp
  this.weeklyXp = normalizedWeeklyXp
  this.level = calculateXpLevel(normalizedTotalXp)

  if (Array.isArray(this.history) && this.history.length > MAX_HISTORY_ENTRIES) {
    this.history = this.history.slice(-MAX_HISTORY_ENTRIES)
  }

  next()
})

export const UserXP = mongoose.model<IUserXP>('UserXP', UserXPSchema)
