import mongoose, { Document, Schema } from "mongoose";

export interface IAppUsageLimit extends Document {
  code: string;
  name: string;
  description: string;
  unit: string;
  defaultValue: number; // e.g. -1 for unlimited
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const appUsageLimitSchema = new Schema<IAppUsageLimit>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    unit: {
      type: String,
      default: "",
      trim: true,
    },
    defaultValue: {
      type: Number,
      default: -1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

appUsageLimitSchema.index({ sortOrder: 1 });

export const AppUsageLimit = mongoose.model<IAppUsageLimit>(
  "AppUsageLimit",
  appUsageLimitSchema,
);
