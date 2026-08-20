import mongoose, { Document, Schema } from "mongoose";

export interface IUsageLimits {
  maxCustomers?: number;
  maxProducts?: number;
  maxQuotesPerMonth?: number;
  maxSalesPerMonth?: number;
  maxActiveAgents?: number;
  maxChannels?: number;
  maxAiQueriesPerMonth?: number;
}

export interface IPlan extends Document {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  enabledFeatures: string[];
  enabledCapabilities: string[];
  usageLimits: IUsageLimits;
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

    usageLimits: {
      type: {
        maxCustomers: { type: Number, default: -1 },
        maxProducts: { type: Number, default: -1 },
        maxQuotesPerMonth: { type: Number, default: -1 },
        maxSalesPerMonth: { type: Number, default: -1 },
        maxActiveAgents: { type: Number, default: -1 },
        maxChannels: { type: Number, default: -1 },
        maxAiQueriesPerMonth: { type: Number, default: -1 },
      },
      default: () => ({
        maxCustomers: -1,
        maxProducts: -1,
        maxQuotesPerMonth: -1,
        maxSalesPerMonth: -1,
        maxActiveAgents: -1,
        maxChannels: -1,
        maxAiQueriesPerMonth: -1,
      }),
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