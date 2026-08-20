import mongoose, { Document, Schema } from "mongoose";
import { AIExecutionLevel, AIToolAction } from "./AIAssistantTool.js";

export type AssistantCapability =
  | "consult"
  | "explain"
  | "create"
  | "modify"
  | "delete"
  | "execute";

export interface ToolPermission {
  toolKey: string;
  allowedActions: AIToolAction[];
  executionLevel: AIExecutionLevel;
  requiresConfirmation: boolean;
  conditions?: Record<string, unknown>;
}

export interface IAssistantPlanCapabilities extends Document {
  planKey: string;
  toolPermissions: ToolPermission[];
  globalDefaults: {
    defaultExecutionLevel: AIExecutionLevel;
    requireConfirmationFor: AIToolAction[];
  };
  createdAt: Date;
  updatedAt: Date;
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

const assistantPlanCapabilitiesSchema = new Schema(
  {
    planKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    toolPermissions: {
      type: [toolPermissionSchema],
      default: [],
    },

    globalDefaults: {
      defaultExecutionLevel: {
        type: String,
        enum: ["READ_ONLY", "ASSISTED_DRAFT", "FULL_AUTOMATION"],
        default: "READ_ONLY",
      },
      requireConfirmationFor: {
        type: [String],
        enum: ["consult", "explain", "create", "modify", "delete", "execute"],
        default: ["create", "modify", "delete", "execute"],
      },
    },
  },
  {
    timestamps: true,
  },
);

export const AssistantPlanCapabilities = mongoose.model(
  "AssistantPlanCapabilities",
  assistantPlanCapabilitiesSchema,
);