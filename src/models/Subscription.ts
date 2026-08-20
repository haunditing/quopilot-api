import mongoose, { Document, Schema, Types } from "mongoose";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED";

export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface ISubscription extends Document {
  tenantId: Types.ObjectId;
  planKey: string;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },
    planKey: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "TRIAL",
        "ACTIVE",
        "PAST_DUE",
        "GRACE_PERIOD",
        "SUSPENDED",
        "CANCELLED",
        "EXPIRED",
      ],
      required: true,
      default: "TRIAL",
      index: true,
    },
    billingPeriod: {
      type: String,
      enum: ["MONTHLY", "YEARLY"],
      required: true,
      default: "MONTHLY",
    },
    currentPeriodStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    trialEndsAt: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    canceledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
