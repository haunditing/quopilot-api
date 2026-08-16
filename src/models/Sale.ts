import mongoose, { Document, Schema, Types } from "mongoose";

export type SaleStatus = "CONFIRMED" | "CANCELLED";

export interface ISale extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  quoteId: Types.ObjectId;
  number: string;
  total: number;
  currency: string;
  status: SaleStatus;
  soldAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const saleSchema = new Schema<ISale>(
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

    quoteId: {
      type: Schema.Types.ObjectId,
      ref: "Quote",
      required: true,
      unique: true,
    },

    number: {
      type: String,
      required: true,
      trim: true,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "COP",
    },

    status: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED"],
      default: "CONFIRMED",
    },

    soldAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

saleSchema.index(
  {
    tenantId: 1,
    number: 1,
  },
  {
    unique: true,
  },
);

saleSchema.index({
  tenantId: 1,
  customerId: 1,
  soldAt: -1,
});

export const Sale = mongoose.model<ISale>("Sale", saleSchema);
