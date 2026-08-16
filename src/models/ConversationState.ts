import mongoose, { Document, Schema, Types } from "mongoose";

export type ConversationPendingAction =
  | "NONE"
  | "HANDOFF"
  | "CONFIRM_QUOTE";

export type ConversationTypingSender = "CUSTOMER" | "AGENT";

export interface IConversationState extends Document {
  tenantId: Types.ObjectId;
  conversationId: Types.ObjectId;
  summary: string;
  context: {
    customerId?: Types.ObjectId;
    quoteDraftId?: Types.ObjectId;
    pendingAction: ConversationPendingAction;
    typingBy?: ConversationTypingSender;
    typingAt?: Date;
  };
  messageCount: number;
  lastTurnAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationStateSchema = new Schema<IConversationState>(
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
      unique: true,
      index: true,
    },

    summary: {
      type: String,
      default: "",
    },

    context: {
      customerId: {
        type: Schema.Types.ObjectId,
        ref: "Customer",
      },

      quoteDraftId: {
        type: Schema.Types.ObjectId,
        ref: "Quote",
      },

      pendingAction: {
        type: String,
        enum: ["NONE", "HANDOFF", "CONFIRM_QUOTE"],
        default: "NONE",
      },

      typingBy: {
        type: String,
        enum: ["CUSTOMER", "AGENT"],
      },

      typingAt: {
        type: Date,
      },
    },

    messageCount: {
      type: Number,
      default: 0,
    },

    lastTurnAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

conversationStateSchema.index({
  tenantId: 1,
  conversationId: 1,
});

export const ConversationState = mongoose.model<IConversationState>(
  "ConversationState",
  conversationStateSchema,
);
