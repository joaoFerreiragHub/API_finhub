import mongoose, { Document, Schema } from 'mongoose'

export type AdminOperationalAlertStateValue = 'acknowledged' | 'dismissed'

export interface IAdminOperationalAlertState extends Document {
  alertId: string
  state: AdminOperationalAlertStateValue
  reason?: string
  changedBy: mongoose.Types.ObjectId
  changedAt: Date
  createdAt: Date
  updatedAt: Date
}

const AdminOperationalAlertStateSchema = new Schema<IAdminOperationalAlertState>(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      enum: ['acknowledged', 'dismissed'],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: null,
      maxlength: 500,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

AdminOperationalAlertStateSchema.index({ state: 1, changedAt: -1 })

export const AdminOperationalAlertState = mongoose.model<IAdminOperationalAlertState>(
  'AdminOperationalAlertState',
  AdminOperationalAlertStateSchema
)
