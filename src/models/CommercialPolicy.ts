import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICommercialPolicy extends Document {
  tenantId: Types.ObjectId;
  paymentTerms?: string;
  discountPolicy?: string;
  shippingPolicy?: string;
  warrantyPolicy?: string;
  returnPolicy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const commercialPolicySchema = new Schema<ICommercialPolicy>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },

    paymentTerms: {
      type: String,
      trim: true,
    },

    discountPolicy: {
      type: String,
      trim: true,
    },

    shippingPolicy: {
      type: String,
      trim: true,
    },

    warrantyPolicy: {
      type: String,
      trim: true,
    },

    returnPolicy: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const CommercialPolicy = mongoose.model<ICommercialPolicy>(
  "CommercialPolicy",
  commercialPolicySchema,
);
