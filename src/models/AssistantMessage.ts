import mongoose, { Document, Schema, Types } from "mongoose";

export type AssistantMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface IAssistantMessage extends Document {
  tenantId: Types.ObjectId;
  conversationId: Types.ObjectId;
  role: AssistantMessageRole;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const assistantMessageSchema = new Schema<IAssistantMessage>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "AssistantConversation",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["USER", "ASSISTANT", "SYSTEM"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

assistantMessageSchema.index({
  tenantId: 1,
  conversationId: 1,
  createdAt: 1,
});

export const AssistantMessage = mongoose.model<IAssistantMessage>(
  "AssistantMessage",
  assistantMessageSchema,
);
