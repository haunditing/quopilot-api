import mongoose, { Document, Schema, Types } from "mongoose";

export type MessageDirection = "INBOUND" | "OUTBOUND";

export type MessageSenderType = "CUSTOMER" | "AI" | "AGENT" | "SYSTEM";

export type MessageStatus =
  | "RECEIVED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export interface IMessage extends Document {
  tenantId: Types.ObjectId;
  conversationId: Types.ObjectId;
  customerId: Types.ObjectId;
  direction: MessageDirection;
  senderType: MessageSenderType;
  content: string;
  externalMessageId?: string;
  status: MessageStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    direction: {
      type: String,
      enum: ["INBOUND", "OUTBOUND"],
      required: true,
    },

    senderType: {
      type: String,
      enum: ["CUSTOMER", "AI", "AGENT", "SYSTEM"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    externalMessageId: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["RECEIVED", "SENT", "DELIVERED", "READ", "FAILED"],
      default: "RECEIVED",
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({
  tenantId: 1,
  conversationId: 1,
  createdAt: 1,
});

messageSchema.index({
  tenantId: 1,
  externalMessageId: 1,
});

export const Message = mongoose.model<IMessage>("Message", messageSchema);
