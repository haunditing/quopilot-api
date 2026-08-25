import mongoose, { Document, Schema } from "mongoose";

export interface IPlanUsageLimitEntry {
  code: string;
  limit: number;
}

export interface IPlan extends Document {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  enabledFeatures: string[];
  enabledCapabilities: string[];
  usageLimits: IPlanUsageLimitEntry[];
  sortOrder: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
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

    isActive: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    enabledFeatures: {
      type: [String],
      default: [],
    },

    enabledCapabilities: {
      type: [String],
      default: [],
    },

    usageLimits: {
      type: [
        {
          code: { type: String, required: true, trim: true },
          limit: { type: Number, required: true, default: -1 },
        },
      ],
      default: [],
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Plan = mongoose.model("Plan", planSchema);