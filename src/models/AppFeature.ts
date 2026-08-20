import mongoose, { Document, Schema } from "mongoose";

export interface IAppFeature extends Document {
  key: string;
  label: string;
  description: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const appFeatureSchema = new Schema<IAppFeature>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
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

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

appFeatureSchema.index({ category: 1, sortOrder: 1 });
appFeatureSchema.index({ isActive: 1, sortOrder: 1 });

export const AppFeature = mongoose.model<IAppFeature>("AppFeature", appFeatureSchema);