import mongoose, { Document, Schema } from "mongoose";

export interface PlanAppFeature {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface IPlan extends Document {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  features: PlanAppFeature[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const planAppFeatureSchema = new Schema<PlanAppFeature>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const planSchema = new Schema<IPlan>(
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

    features: {
      type: [planAppFeatureSchema],
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

planSchema.index({ isActive: 1, sortOrder: 1 });

export const Plan = mongoose.model<IPlan>("Plan", planSchema);