import mongoose, { Document, Schema, Types } from "mongoose";

export type SupportConversationStatus = "OPEN" | "CLOSED";

export interface ISupportConversation extends Document {
  userId: Types.ObjectId;
  assistantId: string;
  status: SupportConversationStatus;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supportConversationSchema = new Schema<ISupportConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

supportConversationSchema.index({
  userId: 1,
  assistantId: 1,
  status: 1,
});

export const SupportConversation = mongoose.model<ISupportConversation>(
  "SupportConversation",
  supportConversationSchema,
);