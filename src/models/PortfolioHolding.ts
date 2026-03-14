import mongoose, { Document, Schema } from 'mongoose'

export type PortfolioAssetType = 'stock' | 'etf' | 'reit' | 'crypto' | 'bond' | 'cash'

export interface IPortfolioHolding extends Document {
  portfolio: mongoose.Types.ObjectId
  ticker: string
  assetType: PortfolioAssetType
  name: string
  shares: number
  averageCost: number
  totalInvested: number
  monthlyAllocation: number
  allocationPercent: number
  currentPrice?: number
  dividendYield?: number
  dividendCAGR?: number
  totalReturnCAGR?: number
  sector?: string
  notes?: string
  addedAt: Date
  createdAt: Date
  updatedAt: Date
}

const PortfolioHoldingSchema = new Schema<IPortfolioHolding>(
  {
    portfolio: {
      type: Schema.Types.ObjectId,
      ref: 'Portfolio',
      required: true,
      index: true,
    },
    ticker: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 24,
    },
    assetType: {
      type: String,
      enum: ['stock', 'etf', 'reit', 'crypto', 'bond', 'cash'],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    shares: {
      type: Number,
      required: true,
      min: 0,
    },
    averageCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalInvested: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    monthlyAllocation: {
      type: Number,
      min: 0,
      default: 0,
    },
    allocationPercent: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    currentPrice: {
      type: Number,
      min: 0,
      default: undefined,
    },
    dividendYield: {
      type: Number,
      min: 0,
      max: 1,
      default: undefined,
    },
    dividendCAGR: {
      type: Number,
      min: 0,
      max: 1,
      default: undefined,
    },
    totalReturnCAGR: {
      type: Number,
      min: -1,
      max: 2,
      default: undefined,
    },
    sector: {
      type: String,
      trim: true,
      maxlength: 120,
      default: undefined,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: undefined,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

PortfolioHoldingSchema.index({ portfolio: 1, ticker: 1 }, { unique: true })
PortfolioHoldingSchema.index({ portfolio: 1, assetType: 1 })

PortfolioHoldingSchema.pre('validate', function (this: IPortfolioHolding, next) {
  this.totalInvested = Math.max(0, Number((this.shares * this.averageCost).toFixed(2)))
  if (!this.addedAt) {
    this.addedAt = new Date()
  }
  return next()
})

export const PortfolioHolding = mongoose.model<IPortfolioHolding>(
  'PortfolioHolding',
  PortfolioHoldingSchema
)
