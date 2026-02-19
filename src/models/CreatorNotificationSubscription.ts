import mongoose, { Document, Schema } from 'mongoose'

export type CreatorNotificationEventType = 'content_published'

export interface ICreatorNotificationSubscription extends Document {
  user: mongoose.Types.ObjectId
  creator: mongoose.Types.ObjectId
  eventType: CreatorNotificationEventType
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

const CreatorNotificationSubscriptionSchema = new Schema<ICreatorNotificationSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['content_published'],
      default: 'content_published',
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

CreatorNotificationSubscriptionSchema.index(
  { user: 1, creator: 1, eventType: 1 },
  { unique: true }
)
CreatorNotificationSubscriptionSchema.index({
  creator: 1,
  eventType: 1,
  isEnabled: 1,
})

export const CreatorNotificationSubscription = mongoose.model<ICreatorNotificationSubscription>(
  'CreatorNotificationSubscription',
  CreatorNotificationSubscriptionSchema
)
