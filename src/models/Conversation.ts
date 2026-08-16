import mongoose, { Document, Schema, Types } from "mongoose";

export type ConversationStatus = "OPEN" | "CLOSED";

export type ConversationChannel =
  | "WHATSAPP"
  | "WEB_CHAT"
  | "INSTAGRAM";

export interface IConversation extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  channel: ConversationChannel;
  channelId?: Types.ObjectId;
  externalConversationId?: string;
  agentId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  status: ConversationStatus;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ["WHATSAPP", "WEB_CHAT", "INSTAGRAM"],
      required: true,
    },

    channelId: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
    },

    externalConversationId: {
      type: String,
      trim: true,
    },

    agentId: {
      type: Schema.Types.ObjectId,
      ref: "Agent",
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    assignedAt: {
      type: Date,
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

conversationSchema.index({
  tenantId: 1,
  customerId: 1,
  status: 1,
});

conversationSchema.index({
  tenantId: 1,
  externalConversationId: 1,
});

conversationSchema.index({
  tenantId: 1,
  channelId: 1,
  status: 1,
});

conversationSchema.index({
  tenantId: 1,
  channelId: 1,
  externalConversationId: 1,
  status: 1,
});

export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema,
);
