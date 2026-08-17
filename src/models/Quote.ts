import mongoose, { Document, Schema, Types } from "mongoose";

export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface IQuoteItem {
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

export interface IQuote extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  conversationId?: Types.ObjectId;

  documentType: "QUOTE";
  number: string;

  items: IQuoteItem[];

  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  currency: string;

  status: QuoteStatus;

  validUntil?: Date;

  notes?: string;
  terms?: string;

  sentAt?: Date;
  viewedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const quoteItemSchema = new Schema<IQuoteItem>(
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

const quoteSchema = new Schema<IQuote>(
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

    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
    },

    documentType: {
      type: String,
      enum: ["QUOTE"],
      default: "QUOTE",
      required: true,
    },

    number: {
      type: String,
      required: true,
      trim: true,
    },

    items: {
      type: [quoteItemSchema],
      required: true,
      validate: {
        validator: (items: IQuoteItem[]) => items.length > 0,
        message: "A quote must contain at least one item",
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
      enum: ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"],
      default: "DRAFT",
    },

    validUntil: {
      type: Date,
    },

    notes: {
      type: String,
      trim: true,
    },

    terms: {
      type: String,
      trim: true,
    },

    sentAt: {
      type: Date,
    },

    viewedAt: {
      type: Date,
    },

    acceptedAt: {
      type: Date,
    },

    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

quoteSchema.index(
  {
    tenantId: 1,
    number: 1,
  },
  {
    unique: true,
  },
);

quoteSchema.index({
  tenantId: 1,
  customerId: 1,
  createdAt: -1,
});

quoteSchema.index({
  tenantId: 1,
  status: 1,
});

export const Quote = mongoose.model<IQuote>("Quote", quoteSchema);
