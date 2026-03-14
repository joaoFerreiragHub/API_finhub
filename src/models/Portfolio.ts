import mongoose, { Document, Schema } from 'mongoose'

export type PortfolioCurrency = 'EUR' | 'USD' | 'GBP'
export type PortfolioFireTargetMethod = 'expenses' | 'passive_income' | 'target_amount'

export interface IPortfolioFireTarget {
  method: PortfolioFireTargetMethod
  monthlyExpenses?: number
  desiredMonthlyIncome?: number
  targetAmount?: number
  withdrawalRate: number
  inflationRate: number
}

export interface IPortfolio extends Document {
  user: mongoose.Types.ObjectId
  name: string
  currency: PortfolioCurrency
  fireTarget: IPortfolioFireTarget
  monthlyContribution: number
  contributionGrowthRate: number
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

const PortfolioFireTargetSchema = new Schema<IPortfolioFireTarget>(
  {
    method: {
      type: String,
      enum: ['expenses', 'passive_income', 'target_amount'],
      default: 'expenses',
      required: true,
    },
    monthlyExpenses: {
      type: Number,
      min: 0,
      default: undefined,
    },
    desiredMonthlyIncome: {
      type: Number,
      min: 0,
      default: undefined,
    },
    targetAmount: {
      type: Number,
      min: 0,
      default: undefined,
    },
    withdrawalRate: {
      type: Number,
      min: 0.01,
      max: 0.1,
      default: 0.04,
    },
    inflationRate: {
      type: Number,
      min: 0,
      max: 0.2,
      default: 0.02,
    },
  },
  {
    _id: false,
  }
)

const PortfolioSchema = new Schema<IPortfolio>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    currency: {
      type: String,
      enum: ['EUR', 'USD', 'GBP'],
      default: 'EUR',
      index: true,
    },
    fireTarget: {
      type: PortfolioFireTargetSchema,
      required: true,
      default: {
        method: 'expenses',
        withdrawalRate: 0.04,
        inflationRate: 0.02,
      },
    },
    monthlyContribution: {
      type: Number,
      min: 0,
      default: 0,
    },
    contributionGrowthRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

PortfolioSchema.index({ user: 1, createdAt: -1 })
PortfolioSchema.index({ user: 1, isDefault: 1 })

PortfolioSchema.pre('validate', function (this: IPortfolio, next) {
  const method = this.fireTarget?.method
  if (!method) {
    return next(new Error('fireTarget.method e obrigatorio'))
  }

  if (method === 'expenses') {
    if (typeof this.fireTarget.monthlyExpenses !== 'number' || this.fireTarget.monthlyExpenses < 0) {
      return next(new Error('fireTarget.monthlyExpenses e obrigatorio para method=expenses'))
    }
  }

  if (method === 'passive_income') {
    if (
      typeof this.fireTarget.desiredMonthlyIncome !== 'number' ||
      this.fireTarget.desiredMonthlyIncome < 0
    ) {
      return next(new Error('fireTarget.desiredMonthlyIncome e obrigatorio para method=passive_income'))
    }
  }

  if (method === 'target_amount') {
    if (typeof this.fireTarget.targetAmount !== 'number' || this.fireTarget.targetAmount < 0) {
      return next(new Error('fireTarget.targetAmount e obrigatorio para method=target_amount'))
    }
  }

  return next()
})

export const Portfolio = mongoose.model<IPortfolio>('Portfolio', PortfolioSchema)
