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
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IQuote extends Document {
  tenantId: Types.ObjectId;
  customerId: Types.ObjectId;
  conversationId?: Types.ObjectId;

  number: string;

  items: IQuoteItem[];

  subtotal: number;
  total: number;
  currency: string;

  status: QuoteStatus;

  validUntil?: Date;

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

    subtotal: {
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
