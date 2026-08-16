import mongoose, { Document, Schema, Types } from "mongoose";

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface IProduct extends Document {
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  sku?: string;
  unitPrice: number;
  currency: string;
  status: ProductStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },

    unitPrice: {
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
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

productSchema.index({
  tenantId: 1,
  sku: 1,
});

productSchema.index({
  tenantId: 1,
  status: 1,
});

export const Product = mongoose.model<IProduct>("Product", productSchema);
