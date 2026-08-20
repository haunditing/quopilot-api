import mongoose, { Document, Schema } from "mongoose";

export type SupportAssistantStatus = "ACTIVE" | "INACTIVE";

export interface ISupportAssistantConfig extends Document {
  status: SupportAssistantStatus;
  llm?: {
    provider?: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    timeoutMs?: number;
  };
  systemPrompt?: string;
  caseThreshold: number;
  ragMaxDocs: number;
  ragMinScore: number;
  memoryWindow: number;
  maxContextTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const supportAssistantConfigSchema = new Schema<ISupportAssistantConfig>(
  {
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    llm: {
      type: new Schema(
        {
          provider: { type: String },
          apiKey: { type: String },
          model: { type: String },
          baseUrl: { type: String },
          maxTokens: { type: Number },
          timeoutMs: { type: Number },
        },
        { _id: false },
      ),
      default: undefined,
    },

    systemPrompt: {
      type: String,
      default: "",
    },

    caseThreshold: {
      type: Number,
      default: 0.55,
      min: 0,
      max: 1,
    },

    ragMaxDocs: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },

    ragMinScore: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1,
    },

    memoryWindow: {
      type: Number,
      default: 8,
      min: 2,
      max: 30,
    },

    maxContextTokens: {
      type: Number,
      default: 6000,
      min: 500,
      max: 20000,
    },
  },
  {
    timestamps: true,
  },
);

export const SupportAssistantConfig = mongoose.model<ISupportAssistantConfig>(
  "SupportAssistantConfig",
  supportAssistantConfigSchema,
);