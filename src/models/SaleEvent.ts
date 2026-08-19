import mongoose, { Document, Schema, Types } from "mongoose";

export type SaleEventType =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export interface ISaleEvent extends Document {
  tenantId: Types.ObjectId;
  saleId: Types.ObjectId;
  type: SaleEventType;
  createdAt: Date;
}

const saleEventSchema = new Schema<ISaleEvent>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["CREATED", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "CANCELLED"],
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

saleEventSchema.index({
  tenantId: 1,
  saleId: 1,
  createdAt: 1,
});

export const SaleEvent = mongoose.model<ISaleEvent>(
  "SaleEvent",
  saleEventSchema,
);
