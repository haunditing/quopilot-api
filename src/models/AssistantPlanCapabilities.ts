import mongoose, { Document, Schema } from "mongoose";

export type AssistantCapability =
  | "consult"
  | "explain"
  | "create"
  | "modify"
  | "delete"
  | "execute";

export interface FunctionalityCapabilities {
  functionalityKey: string;
  capabilities: Record<AssistantCapability, boolean>;
}

export interface IAssistantPlanCapabilities extends Document {
  planKey: string;
  functionalities: FunctionalityCapabilities[];
  createdAt: Date;
  updatedAt: Date;
}

const functionalityCapabilitiesSchema = new Schema<FunctionalityCapabilities>(
  {
    functionalityKey: {
      type: String,
      required: true,
      trim: true,
    },
    capabilities: {
      type: new Schema(
        {
          consult: { type: Boolean, default: false },
          explain: { type: Boolean, default: false },
          create: { type: Boolean, default: false },
          modify: { type: Boolean, default: false },
          delete: { type: Boolean, default: false },
          execute: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: {
        consult: false,
        explain: false,
        create: false,
        modify: false,
        delete: false,
        execute: false,
      },
    },
  },
  { _id: false },
);

const assistantPlanCapabilitiesSchema = new Schema<IAssistantPlanCapabilities>(
  {
    planKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    functionalities: {
      type: [functionalityCapabilitiesSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const AssistantPlanCapabilities = mongoose.model<IAssistantPlanCapabilities>(
  "AssistantPlanCapabilities",
  assistantPlanCapabilitiesSchema,
);