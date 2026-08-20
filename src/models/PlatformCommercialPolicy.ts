import mongoose, { Document, Schema } from "mongoose";

export interface IPlatformCommercialPolicy extends Document {
  trialDays: number;
  trialPlanKey: string;
  allowedBillingPeriods: string[]; // ["MONTHLY", "YEARLY"]
  gracePeriodDays: number;
  allowImmediateCancellation: boolean;
  cancelAtPeriodEndByDefault: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const platformCommercialPolicySchema = new Schema<IPlatformCommercialPolicy>(
  {
    trialDays: {
      type: Number,
      required: true,
      default: 14,
    },
    trialPlanKey: {
      type: String,
      required: true,
      default: "PRO",
      uppercase: true,
      trim: true,
    },
    allowedBillingPeriods: {
      type: [String],
      required: true,
      default: ["MONTHLY", "YEARLY"],
    },
    gracePeriodDays: {
      type: Number,
      required: true,
      default: 7,
    },
    allowImmediateCancellation: {
      type: Boolean,
      required: true,
      default: true,
    },
    cancelAtPeriodEndByDefault: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const PlatformCommercialPolicy = mongoose.model<IPlatformCommercialPolicy>(
  "PlatformCommercialPolicy",
  platformCommercialPolicySchema,
);
