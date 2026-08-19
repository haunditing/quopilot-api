import mongoose, { Document, Schema, Types } from "mongoose";

export type SupportMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface SupportMessageMeta {
  intent?: string;
  module?: string;
  grounded?: boolean;
  sources?: string[];
  caseId?: string;
  docIds?: string[];
}

export interface ISupportMessage extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  conversationId: Types.ObjectId;
  role: SupportMessageRole;
  content: string;
  meta?: SupportMessageMeta;
  createdAt: Date;
  updatedAt: Date;
}

const supportMessageSchema = new Schema<ISupportMessage>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "SupportConversation",
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

    meta: {
      type: new Schema<SupportMessageMeta>(
        {
          intent: { type: String },
          module: { type: String },
          grounded: { type: Boolean },
          sources: { type: [String] },
          caseId: { type: String },
          docIds: { type: [String] },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

supportMessageSchema.index({
  tenantId: 1,
  userId: 1,
  conversationId: 1,
  createdAt: 1,
});

export const SupportMessage = mongoose.model<ISupportMessage>(
  "SupportMessage",
  supportMessageSchema,
);