import mongoose, { Document, Schema, Types } from "mongoose";

export type AssistantConversationStatus = "OPEN" | "CLOSED";

export interface IAssistantConversation extends Document {
  tenantId: Types.ObjectId;
  assistantId: string;
  status: AssistantConversationStatus;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assistantConversationSchema = new Schema<IAssistantConversation>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    assistantId: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },

    lastMessageAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

assistantConversationSchema.index({
  tenantId: 1,
  assistantId: 1,
  status: 1,
});

export const AssistantConversation = mongoose.model<IAssistantConversation>(
  "AssistantConversation",
  assistantConversationSchema,
);
