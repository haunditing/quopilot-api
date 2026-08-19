import mongoose, { Document, Schema, Types } from "mongoose";

export type SaleStatus = "CONFIRMED" | "CANCELLED";

export interface ISaleItem {
  productId: Types.ObjectId;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalLine: number;
}

export interface ISale extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  quoteId?: Types.ObjectId;

  documentType: "SALE";
  number: string;

  items: ISaleItem[];

  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  currency: string;

  status: SaleStatus;

  notes?: string;
  terms?: string;

  soldAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPercent: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },

    taxRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalLine: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

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
      required: false,
      index: true,
    },

    documentType: {
      type: String,
      enum: ["SALE"],
      default: "SALE",
      required: true,
    },

    number: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items: ISaleItem[]) => items.length > 0,
        message: "A sale must contain at least one item",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    totalDiscount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    totalTax: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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

    notes: {
      type: String,
      trim: true,
    },

    terms: {
      type: String,
      trim: true,
    },

    soldAt: {
      type: Date,
      required: true,
      default: () => new Date(),
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
  createdAt: -1,
});

saleSchema.index({
  tenantId: 1,
  soldAt: -1,
});

saleSchema.index({
  tenantId: 1,
  status: 1,
});

export const Sale = mongoose.model<ISale>("Sale", saleSchema);
