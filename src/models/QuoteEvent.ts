import mongoose, { Document, Schema, Types } from "mongoose";

export type QuoteEventType =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED";

export interface IQuoteEvent extends Document {
  tenantId: Types.ObjectId;
  quoteId: Types.ObjectId;
  type: QuoteEventType;
  createdAt: Date;
}

const quoteEventSchema = new Schema<IQuoteEvent>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    quoteId: {
      type: Schema.Types.ObjectId,
      ref: "Quote",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["CREATED", "SENT", "VIEWED", "ACCEPTED", "REJECTED"],
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

quoteEventSchema.index({
  tenantId: 1,
  quoteId: 1,
  createdAt: 1,
});

export const QuoteEvent = mongoose.model<IQuoteEvent>(
  "QuoteEvent",
  quoteEventSchema,
);
