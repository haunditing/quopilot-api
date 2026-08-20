import mongoose, { Document, Schema } from "mongoose";

export type AIExecutionLevel = "READ_ONLY" | "ASSISTED_DRAFT" | "FULL_AUTOMATION";

export type AIToolAction =
  | "consult"
  | "explain"
  | "create"
  | "modify"
  | "delete"
  | "execute";

export interface IAIAssistantTool extends Document {
  key: string;
  label: string;
  description: string;
  category: string;
  defaultExecutionLevel: AIExecutionLevel;
  availableActions: AIToolAction[];
  requiresConfirmation: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolPermission {
  toolKey: string;
  allowedActions: AIToolAction[];
  executionLevel: AIExecutionLevel;
  requiresConfirmation: boolean;
  conditions?: Record<string, unknown>;
}

const toolPermissionSchema = new Schema(
  {
    toolKey: {
      type: String,
      required: true,
      trim: true,
    },
    allowedActions: {
      type: [String],
      enum: ["consult", "explain", "create", "modify", "delete", "execute"],
      default: [],
    },
    executionLevel: {
      type: String,
      enum: ["READ_ONLY", "ASSISTED_DRAFT", "FULL_AUTOMATION"],
      default: "READ_ONLY",
    },
    requiresConfirmation: {
      type: Boolean,
      default: true,
    },
    conditions: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const aiAssistantToolSchema = new Schema(
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

    defaultExecutionLevel: {
      type: String,
      enum: ["READ_ONLY", "ASSISTED_DRAFT", "FULL_AUTOMATION"],
      default: "READ_ONLY",
    },

    availableActions: {
      type: [String],
      enum: ["consult", "explain", "create", "modify", "delete", "execute"],
      default: [],
    },

    requiresConfirmation: {
      type: Boolean,
      default: true,
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

aiAssistantToolSchema.index({ category: 1, sortOrder: 1 });
aiAssistantToolSchema.index({ isActive: 1, sortOrder: 1 });

export const AIAssistantTool = mongoose.model("AIAssistantTool", aiAssistantToolSchema);