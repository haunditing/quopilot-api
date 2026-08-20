import mongoose, { Document, Schema } from "mongoose";

export interface IPlan extends Document {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  enabledFeatures: string[]; // Array of feature keys from AppFeature
  enabledCapabilities: string[]; // Optional fine-grained gate: capability codes (AppCapability). Empty = all capabilities of enabled features.
  sortOrder: number;
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

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export const Plan = mongoose.model("Plan", planSchema);