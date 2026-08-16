import mongoose, { Document, Schema, Types } from "mongoose";

export type AgentEventType =
  | "CONVERSATION_OPENED"
  | "MESSAGE_RECEIVED"
  | "MESSAGE_SENT"
  | "TOOL_EXECUTED"
  | "HANDOFF_REQUESTED"
  | "CONVERSATION_ASSIGNED"
  | "CONVERSATION_RELEASED"
  | "CONVERSATION_CLOSED"
  | "SUMMARY_REFRESHED"
  | "LLM_ERROR";

export interface IAgentEvent extends Document {
  tenantId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  type: AgentEventType;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const agentEventSchema = new Schema<IAgentEvent>(
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
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },

    type: {
      type: String,
      enum: [
        "CONVERSATION_OPENED",
        "MESSAGE_RECEIVED",
        "MESSAGE_SENT",
        "TOOL_EXECUTED",
        "HANDOFF_REQUESTED",
        "CONVERSATION_ASSIGNED",
        "CONVERSATION_RELEASED",
        "CONVERSATION_CLOSED",
        "SUMMARY_REFRESHED",
        "LLM_ERROR",
      ],
      required: true,
      index: true,
    },

    data: {
      type: Schema.Types.Mixed,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

agentEventSchema.index({
  tenantId: 1,
  conversationId: 1,
  createdAt: -1,
});

export const AgentEvent = mongoose.model<IAgentEvent>(
  "AgentEvent",
  agentEventSchema,
);
